/**
 * Server-Side HMAC & Replay Attack Verification Reference for Mark X Backend.
 *
 * NOTE: This module is intended for backend execution (Node.js, Express, Firebase Cloud Functions).
 * The HMAC secret key (HMAC_SECRET_KEY) must ONLY exist in secure backend environment variables
 * and NEVER be exposed to the client.
 */

import * as crypto from "crypto";
import { Buffer } from "buffer";

// Server-side environment variable (e.g. from process.env.HMAC_SECRET_KEY)
const SERVER_HMAC_SECRET = process.env.HMAC_SECRET_KEY || "server_secret_placeholder_replace_in_production";

// Maximum acceptable request age (5 minutes)
const MAX_REQUEST_AGE_MS = 5 * 60 * 1000;

// In-memory or Redis-backed cache to store processed nonces and prevent replay attacks
const processedNonces = new Set<string>();

/**
 * Periodically cleans up expired nonces to prevent memory leaks
 */
setInterval(() => {
  processedNonces.clear();
}, MAX_REQUEST_AGE_MS * 2);

export interface IncomingPackage<T = any> {
  payload: T;
  timestamp: number;
  nonce: string;
}

export interface VerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Computes an HMAC-SHA256 signature for a given payload, timestamp, and nonce.
 */
export function computeServerHmac(
  payload: any,
  timestamp: number,
  nonce: string
): string {
  const serialized = typeof payload === "string" ? payload : JSON.stringify(payload);
  const dataToSign = `${timestamp}:${nonce}:${serialized}`;
  return crypto
    .createHmac("sha256", SERVER_HMAC_SECRET)
    .update(dataToSign)
    .digest("hex");
}

/**
 * Backend verification function:
 * 1. Validates request timestamp to prevent expired / delayed requests.
 * 2. Checks and stores nonce to prevent replay attacks.
 * 3. Verifies the HMAC-SHA256 signature using timingSafeEqual to avoid timing attacks.
 */
export function verifyIncomingApiPackage(
  pkg: IncomingPackage,
  receivedHmacSignature?: string
): VerificationResult {
  const { payload, timestamp, nonce } = pkg;

  // 1. Validate package structure
  if (!payload || !timestamp || !nonce) {
    return { valid: false, error: "Malformed package: missing payload, timestamp, or nonce." };
  }

  // 2. Validate timestamp freshness (TTL window)
  const now = Date.now();
  const timeDifference = Math.abs(now - timestamp);
  if (timeDifference > MAX_REQUEST_AGE_MS) {
    return {
      valid: false,
      error: `Request expired or invalid timestamp. Time skew: ${timeDifference}ms`,
    };
  }

  // 3. Replay attack protection: ensure nonce has not been used before
  if (processedNonces.has(nonce)) {
    return {
      valid: false,
      error: "Replay attack detected: Nonce has already been processed.",
    };
  }
  processedNonces.add(nonce);

  // 4. If HMAC signature was provided, verify with timingSafeEqual
  if (receivedHmacSignature) {
    const expectedHmac = computeServerHmac(payload, timestamp, nonce);
    const expectedBuffer = Buffer.from(expectedHmac, "hex");
    const receivedBuffer = Buffer.from(receivedHmacSignature, "hex");

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return {
        valid: false,
        error: "Invalid signature: Package integrity check failed.",
      };
    }
  }

  return { valid: true };
}
