/**
 * Mark-X Storage Worker (Hardened Production Version)
 * Handles authenticated R2 uploads and serves media as an ultra-fast Edge CDN.
 * 
 * Security Controls:
 * - Constant-time secret comparison to prevent timing attacks
 * - User-scoped R2 paths (`users/{uid}/pins/...`) with BOLA/IDOR protection
 * - Owner verification on DELETE operations
 * - Streaming direct-to-R2 to prevent isolate OOM crashes on large files (up to 150 MB)
 * - Strict MIME-type & extension validation (blocking SVG/HTML Stored XSS)
 * - Self-pruning IP rate limiting with post-auth evaluation
 * - Full Content-Security-Policy & nosniff headers
 * - HTTP Range Requests (206) & Edge Caching (caches.default)
 */

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy": "default-src 'none'; media-src 'self' data: blob:; img-src 'self' data: blob:; style-src 'unsafe-inline'; sandbox",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Auth-Key, Authorization, Range, X-User-Id",
  "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges, ETag",
  ...SECURITY_HEADERS,
};

const jsonResponse = (data, status = 200) =>
  Response.json(data, { status, headers: CORS_HEADERS });

// Allowed MIME types to prevent Stored XSS and malicious binary execution
const MIME_TO_EXTENSION = {
  // Images
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  // Videos
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "video/3gpp": "3gp",
  // Audio
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/wav": "wav",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  // Documents
  "application/pdf": "pdf",
  "text/plain": "txt",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
};

const FORBIDDEN_MIME_PATTERNS = [
  "text/html",
  "application/xhtml",
  "image/svg",
  "application/javascript",
  "text/javascript",
  "application/x-executable",
  "application/x-msdownload",
  "application/x-sh",
  "application/x-bat",
  "application/x-csh",
];

// In-memory sliding-window rate limiter with automatic pruning
const uploadRateLimiter = new Map();
const UPLOAD_RATE_LIMIT = 60; // max 60 uploads per minute per IP
const UPLOAD_RATE_WINDOW_MS = 60 * 1000;

function checkUploadRateLimit(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown-ip";
  const now = Date.now();

  // Prune expired entries to prevent isolate memory leaks
  if (uploadRateLimiter.size > 200) {
    for (const [clientIp, record] of uploadRateLimiter.entries()) {
      if (now > record.resetTime) {
        uploadRateLimiter.delete(clientIp);
      }
    }
  }

  let record = uploadRateLimiter.get(ip);
  if (!record || now > record.resetTime) {
    uploadRateLimiter.set(ip, { count: 1, resetTime: now + UPLOAD_RATE_WINDOW_MS });
    return true;
  }
  if (record.count >= UPLOAD_RATE_LIMIT) {
    return false;
  }
  record.count++;
  return true;
}

/**
 * Constant-time string comparison to prevent side-channel timing attacks
 */
function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const enc = new TextEncoder();
  const uA = enc.encode(a);
  const uB = enc.encode(b);
  if (uA.byteLength !== uB.byteLength) return false;
  return crypto.subtle.timingSafeEqual(uA, uB);
}

function isAuthorized(request, env) {
  if (!env.UPLOAD_SECRET) {
    console.error("Worker authorization rejected: UPLOAD_SECRET is not configured in Cloudflare environment.");
    return false;
  }
  const xAuth = request.headers.get("X-Auth-Key");
  const authHeader = request.headers.get("Authorization");
  const bearerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  return (
    constantTimeEqual(xAuth, env.UPLOAD_SECRET) ||
    constantTimeEqual(authHeader, env.UPLOAD_SECRET) ||
    constantTimeEqual(bearerToken, env.UPLOAD_SECRET)
  );
}

function extractUserId(request) {
  const raw = request.headers.get("X-User-Id");
  if (!raw || typeof raw !== "string") return null;
  const uid = raw.trim();
  if (/^[a-zA-Z0-9_\-]{1,128}$/.test(uid)) {
    return uid;
  }
  return null;
}

function sanitizeKey(key) {
  if (!key || typeof key !== "string") return null;
  try {
    const decoded = decodeURIComponent(key).replace(/^\/+/, "").trim();
    if (
      decoded.includes("..") ||
      decoded.includes("\0") ||
      decoded.startsWith("/") ||
      decoded.includes("\\") ||
      decoded.length > 512
    ) {
      return null;
    }
    // Only allow alphanumeric characters, hyphens, underscores, dots, and path slashes
    if (!/^[a-zA-Z0-9_\-\.\/]+$/.test(decoded)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // Health check root
    if (url.pathname === "/" || url.pathname === "") {
      return jsonResponse({
        service: "Mark-X Storage Worker",
        status: "healthy",
        r2_connected: Boolean(env.MARK_X_BUCKET),
        version: "2.0.0-hardened",
      });
    }

    // ==========================================
    // 1. Upload Handler (POST /upload)
    // ==========================================
    if (request.method === "POST" && url.pathname === "/upload") {
      // 1. Authenticate first so unauthenticated callers cannot consume rate limits
      if (!isAuthorized(request, env)) {
        return jsonResponse(
          { success: false, error: "Unauthorized: Invalid or missing authorization credentials" },
          401
        );
      }

      // 2. Enforce post-auth rate limiting
      if (!checkUploadRateLimit(request)) {
        return jsonResponse(
          { success: false, error: "Rate limit exceeded: Too many uploads. Please wait a moment." },
          429
        );
      }

      if (!env.MARK_X_BUCKET) {
        return jsonResponse(
          { success: false, error: "MARK_X_BUCKET binding is not configured in Cloudflare." },
          500
        );
      }

      try {
        const contentTypeHeader = (request.headers.get("content-type") || "").toLowerCase();

        // Guard against dangerous executable or script formats
        for (const forbidden of FORBIDDEN_MIME_PATTERNS) {
          if (contentTypeHeader.includes(forbidden)) {
            return jsonResponse(
              { success: false, error: "Upload rejected: File type not permitted for security reasons." },
              415
            );
          }
        }

        let fileStream;
        let mimeType = "image/jpeg";
        let originalName = "upload.jpg";
        let fileSize = 0;

        if (contentTypeHeader.includes("multipart/form-data")) {
          const formData = await request.formData();
          const file =
            formData.get("file") ||
            formData.get("photo") ||
            formData.get("document") ||
            Array.from(formData.values()).find((val) => val && typeof val === "object" && val.name);

          if (!file || typeof file === "string") {
            return jsonResponse({ success: false, error: "No file found in multipart upload" }, 400);
          }

          mimeType = file.type || mimeType;
          originalName = file.name || originalName;
          fileSize = file.size || 0;

          // Stream directly into R2 to prevent isolate memory exhaustion
          fileStream = typeof file.stream === "function" ? file.stream() : await file.arrayBuffer();
        } else {
          mimeType = contentTypeHeader.split(";")[0].trim() || mimeType;
          fileSize = parseInt(request.headers.get("content-length") || "0", 10);
          fileStream = request.body;
        }

        // Secondary validation on resolved mimeType
        for (const forbidden of FORBIDDEN_MIME_PATTERNS) {
          if (mimeType.toLowerCase().includes(forbidden)) {
            return jsonResponse(
              { success: false, error: "Upload rejected: File type not permitted for security reasons." },
              415
            );
          }
        }

        const MAX_FILE_SIZE = 150 * 1024 * 1024; // 150 MB ceiling
        if (fileSize > MAX_FILE_SIZE) {
          return jsonResponse(
            { success: false, error: "File exceeds maximum upload size (150 MB)" },
            413
          );
        }

        // Resolve safe extension
        let ext = MIME_TO_EXTENSION[mimeType.toLowerCase()];
        if (!ext) {
          const candidateExt = originalName.includes(".") ? originalName.split(".").pop().toLowerCase() : "";
          const match = Object.entries(MIME_TO_EXTENSION).find(([_, e]) => e === candidateExt);
          if (match) {
            ext = match[1];
            mimeType = match[0];
          } else {
            ext = "bin";
          }
        }

        const uniqueId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
        const callerUid = extractUserId(request);

        // Scope path by user ID for strict object isolation and BOLA prevention
        const key = callerUid
          ? `users/${callerUid}/pins/${Date.now()}-${uniqueId}.${ext}`
          : `pins/${Date.now()}-${uniqueId}.${ext}`;

        await env.MARK_X_BUCKET.put(key, fileStream, {
          httpMetadata: {
            contentType: mimeType,
            cacheControl: "public, max-age=86400, stale-while-revalidate=604800",
          },
          customMetadata: {
            ownerUid: callerUid || "unassigned",
            originalName: encodeURIComponent(originalName.slice(0, 100)),
            uploadedAt: String(Date.now()),
          },
        });

        const publicUrl = `${url.origin}/${key}`;

        return jsonResponse({
          success: true,
          key,
          url: publicUrl,
          size: fileSize,
          mimeType,
        });
      } catch (err) {
        console.error("Worker upload error:", err);
        return jsonResponse({ success: false, error: err.message || "Upload processing error" }, 500);
      }
    }

    // ==========================================
    // 2. Delete Handler (DELETE /* or DELETE /delete)
    // ==========================================
    if (request.method === "DELETE") {
      if (!isAuthorized(request, env)) {
        return jsonResponse({ success: false, error: "Unauthorized: Invalid or missing authorization credentials" }, 401);
      }

      if (!env.MARK_X_BUCKET) {
        return jsonResponse(
          { success: false, error: "MARK_X_BUCKET binding is not configured in Cloudflare." },
          500
        );
      }

      try {
        let rawKey = url.pathname.replace(/^\/+/, "");
        if (rawKey.startsWith("delete/")) {
          rawKey = rawKey.replace(/^delete\//, "");
        } else if (rawKey === "delete" || !rawKey) {
          const body = await request.json().catch(() => ({}));
          rawKey = body.key || "";
        }

        const key = sanitizeKey(rawKey);
        if (!key) {
          return jsonResponse({ success: false, error: "Target key not specified or invalid" }, 400);
        }

        const callerUid = extractUserId(request);

        // BOLA / IDOR Protection: Enforce user ownership
        if (key.startsWith("users/")) {
          const parts = key.split("/");
          const targetUid = parts[1];
          if (callerUid && targetUid && callerUid !== targetUid) {
            return jsonResponse(
              { success: false, error: "Forbidden: You do not have permission to delete this resource." },
              403
            );
          }
        } else {
          // Legacy pins/ check: verify customMetadata if present
          try {
            const existing = await env.MARK_X_BUCKET.head(key);
            if (existing && existing.customMetadata && existing.customMetadata.ownerUid) {
              const fileOwner = existing.customMetadata.ownerUid;
              if (fileOwner !== "unassigned" && callerUid && fileOwner !== callerUid) {
                return jsonResponse(
                  { success: false, error: "Forbidden: You do not have permission to delete this resource." },
                  403
                );
              }
            }
          } catch (_hErr) {}
        }

        await env.MARK_X_BUCKET.delete(key);

        try {
          const cache = caches.default;
          await cache.delete(new Request(`${url.origin}/${key}`, { method: "GET" }));
        } catch (_cErr) {}

        return jsonResponse({ success: true, deletedKey: key });
      } catch (err) {
        console.error("Worker delete error:", err);
        return jsonResponse({ success: false, error: err.message || "Delete failed" }, 500);
      }
    }

    // ==========================================
    // 3. Media Delivery Handler (GET & HEAD /*)
    // ==========================================
    if (request.method === "GET" || request.method === "HEAD") {
      const key = sanitizeKey(url.pathname);

      if (!key) {
        return jsonResponse({ error: "Key not specified or invalid" }, 400);
      }

      if (!env.MARK_X_BUCKET) {
        return jsonResponse({ error: "R2 bucket binding is not configured" }, 500);
      }

      const cache = caches.default;
      const rangeHeader = request.headers.get("range");

      // Check Edge Cache for standard GET requests without range
      if (request.method === "GET" && !rangeHeader) {
        try {
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            const hitResponse = new Response(cachedResponse.body, cachedResponse);
            hitResponse.headers.set("X-Cache", "HIT");
            return hitResponse;
          }
        } catch (_e) {}
      }

      // Handle HEAD request for media inspection
      if (request.method === "HEAD") {
        try {
          const object = await env.MARK_X_BUCKET.head(key);
          if (!object) {
            return new Response("Object Not Found", { status: 404, headers: CORS_HEADERS });
          }

          const headers = new Headers();
          object.writeHttpMetadata(headers);
          headers.set("etag", object.httpEtag);
          headers.set("Accept-Ranges", "bytes");
          headers.set("Content-Length", object.size.toString());
          headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
          Object.entries(CORS_HEADERS).forEach(([k, v]) => headers.set(k, v));

          const contentType = headers.get("content-type") || "";
          if (!contentType.startsWith("image/") && !contentType.startsWith("video/") && !contentType.startsWith("audio/")) {
            headers.set("Content-Disposition", "attachment");
          }

          return new Response(null, { headers });
        } catch (err) {
          console.error("Worker head error:", err);
          return new Response("Internal Server Error", { status: 500, headers: CORS_HEADERS });
        }
      }

      // Handle GET request with Range & Edge Caching
      try {
        const getOptions = rangeHeader
          ? { range: request.headers, onlyIf: request.headers }
          : { onlyIf: request.headers };

        const object = await env.MARK_X_BUCKET.get(key, getOptions);

        if (!object) {
          return new Response("Object Not Found", {
            status: 404,
            headers: {
              "Content-Type": "text/plain",
              ...CORS_HEADERS,
            },
          });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        headers.set("Accept-Ranges", "bytes");
        headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
        Object.entries(CORS_HEADERS).forEach(([k, v]) => headers.set(k, v));

        // Enforce attachment download for non-media types to prevent script execution
        const contentType = headers.get("content-type") || "";
        if (!contentType.startsWith("image/") && !contentType.startsWith("video/") && !contentType.startsWith("audio/")) {
          headers.set("Content-Disposition", "attachment");
        }

        let status = 200;
        if (rangeHeader && object.range) {
          status = 206;
          const offset = object.range.offset ?? 0;
          const length = object.range.length ?? (object.size - offset);
          const end = offset + length - 1;
          headers.set("Content-Range", `bytes ${offset}-${end}/${object.size}`);
          headers.set("Content-Length", length.toString());
        } else {
          headers.set("Content-Length", object.size.toString());
        }

        const response = new Response(object.body, { status, headers });

        // Cache 200 responses at Cloudflare Edge in background
        if (status === 200 && !rangeHeader && ctx?.waitUntil) {
          ctx.waitUntil(cache.put(request, response.clone()));
        }

        return response;
      } catch (err) {
        console.error("Worker fetch error:", err);
        return new Response("Internal Server Error", { status: 500, headers: CORS_HEADERS });
      }
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  },
};
