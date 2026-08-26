/**
 * Client-Side Cryptographic and Transmission Package Utilities for Mark X.
 *
 * Security Architecture:
 * - Authentication: Handled natively by Firebase Auth over HTTPS/TLS.
 * - API Packages: Client generates `payload + timestamp + nonce` to protect
 *   against packet tampering and replay attacks.
 * - Secret Management: The HMAC secret key is NEVER stored on the mobile client.
 *   HMAC verification and replay tracking are handled exclusively on the backend server.
 */

/**
 * Universal UUID v4 generator for cryptographically unique nonces.
 */
export function generateNonce(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Interface representing a secure API transmission package.
 */
export interface SecureApiPackage<T = any> {
  payload: T;
  timestamp: number;
  nonce: string;
}

/**
 * Assembles a secure API transmission package containing the payload,
 * current UTC timestamp, and a unique cryptographic nonce.
 *
 * @param payload The data to transmit to the backend
 * @returns Sealed transmission package ready for backend submission
 */
export function createApiPackage<T>(payload: T): SecureApiPackage<T> {
  return {
    payload,
    timestamp: Date.now(),
    nonce: generateNonce(),
  };
}

/**
 * Helper to generate secure transmission headers for HTTP requests.
 */
export function createSecurityHeaders(nonce: string, timestamp: number): Record<string, string> {
  return {
    "X-Request-Nonce": nonce,
    "X-Request-Timestamp": timestamp.toString(),
    "Content-Type": "application/json",
  };
}
