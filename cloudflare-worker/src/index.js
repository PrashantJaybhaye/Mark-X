/**
 * Mark-X Storage Worker
 * Handles direct R2 uploads and serves media as an ultra-fast CDN.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Auth-Key, Authorization",
};

const jsonResponse = (data, status = 200) =>
  Response.json(data, { status, headers: CORS_HEADERS });

export default {
  async fetch(request, env) {
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
      });
    }

    // ==========================================
    // 1. Upload Handler (POST /upload)
    // ==========================================
    if (request.method === "POST" && url.pathname === "/upload") {
      // Validate Auth Key if secret is configured
      if (env.UPLOAD_SECRET) {
        const authKey = request.headers.get("X-Auth-Key") || request.headers.get("Authorization");
        if (authKey !== env.UPLOAD_SECRET) {
          return jsonResponse({ success: false, error: "Unauthorized: Invalid upload key" }, 401);
        }
      }

      if (!env.MARK_X_BUCKET) {
        return jsonResponse(
          { success: false, error: "MARK_X_BUCKET binding is not configured in Cloudflare." },
          500
        );
      }

      try {
        const contentType = request.headers.get("content-type") || "";
        let fileData;
        let mimeType = "image/jpeg";
        let originalName = "upload.jpg";

        if (contentType.includes("multipart/form-data")) {
          const formData = await request.formData();
          // Find any uploaded file field
          const file =
            formData.get("file") ||
            formData.get("photo") ||
            formData.get("document") ||
            Array.from(formData.values()).find((val) => val && typeof val === "object" && val.name);

          if (!file || typeof file === "string") {
            return jsonResponse({ success: false, error: "No file found in multipart upload" }, 400);
          }

          fileData = await file.arrayBuffer();
          mimeType = file.type || mimeType;
          originalName = file.name || originalName;
        } else {
          // Direct binary stream
          fileData = await request.arrayBuffer();
          mimeType = contentType.split(";")[0].trim() || mimeType;
        }

        if (!fileData || fileData.byteLength === 0) {
          return jsonResponse({ success: false, error: "Uploaded file is empty" }, 400);
        }

        // Determine extension
        let ext = originalName.includes(".") ? originalName.split(".").pop().toLowerCase() : "";
        if (!ext) {
          if (mimeType.includes("png")) ext = "png";
          else if (mimeType.includes("webp")) ext = "webp";
          else if (mimeType.includes("gif")) ext = "gif";
          else if (mimeType.includes("mp4")) ext = "mp4";
          else if (mimeType.includes("quicktime") || mimeType.includes("mov")) ext = "mov";
          else if (mimeType.includes("webm")) ext = "webm";
          else if (mimeType.includes("video")) ext = "mp4";
          else ext = "jpg";
        }

        const uniqueId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
        const key = `pins/${Date.now()}-${uniqueId}.${ext}`;

        // Store into Cloudflare R2
        await env.MARK_X_BUCKET.put(key, fileData, {
          httpMetadata: {
            contentType: mimeType,
            cacheControl: "public, max-age=31536000, immutable",
          },
        });

        const publicUrl = `${url.origin}/${key}`;

        return jsonResponse({
          success: true,
          key,
          url: publicUrl,
          size: fileData.byteLength,
          mimeType,
        });
      } catch (err) {
        console.error("Worker upload error:", err);
        return jsonResponse({ success: false, error: err.message || "Upload processing error" }, 500);
      }
    }

    // ==========================================
    // 2. Media Delivery Handler (GET /*)
    // ==========================================
    if (request.method === "GET") {
      const key = decodeURIComponent(url.pathname.replace(/^\/+/, ""));

      if (!key) {
        return jsonResponse({ error: "Key not specified" }, 400);
      }

      if (!env.MARK_X_BUCKET) {
        return jsonResponse({ error: "R2 bucket binding is not configured" }, 500);
      }

      try {
        const object = await env.MARK_X_BUCKET.get(key);

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
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
        Object.entries(CORS_HEADERS).forEach(([k, v]) => headers.set(k, v));

        return new Response(object.body, { headers });
      } catch (err) {
        console.error("Worker fetch error:", err);
        return new Response("Internal Server Error", { status: 500, headers: CORS_HEADERS });
      }
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  },
};
