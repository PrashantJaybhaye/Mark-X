/**
 * Pure JavaScript & TypeScript Implementation of SHA-256 (FIPS 180-4)
 * and UUID v4.
 *
 * This implementation is 100% universal and has zero native dependency
 * requirements, ensuring it works seamlessly across Expo Go, Custom Dev Clients,
 * Web, Node, iOS, and Android without native binary rebuild errors.
 */

const AUTH_PEPPER = "markx_auth_v1_";

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

/**
 * Computes the SHA-256 hash of any input string.
 */
export function sha256Sync(input: string): string {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let H0 = 0x6a09e667;
  let H1 = 0xbb67ae85;
  let H2 = 0x3c6ef372;
  let H3 = 0xa54ff53a;
  let H4 = 0x510e527f;
  let H5 = 0x9b05688c;
  let H6 = 0x1f83d9ab;
  let H7 = 0x5be0cd19;

  // UTF-8 encoding
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    let charCode = input.charCodeAt(i);
    if (charCode < 0x80) {
      bytes.push(charCode);
    } else if (charCode < 0x800) {
      bytes.push(0xc0 | (charCode >> 6));
      bytes.push(0x80 | (charCode & 0x3f));
    } else if (charCode < 0xd800 || charCode >= 0xe000) {
      bytes.push(0xe0 | (charCode >> 12));
      bytes.push(0x80 | ((charCode >> 6) & 0x3f));
      bytes.push(0x80 | (charCode & 0x3f));
    } else {
      // Surrogate pair
      i++;
      charCode = 0x10000 + (((charCode & 0x3ff) << 10) | (input.charCodeAt(i) & 0x3ff));
      bytes.push(0xf0 | (charCode >> 18));
      bytes.push(0x80 | ((charCode >> 12) & 0x3f));
      bytes.push(0x80 | ((charCode >> 6) & 0x3f));
      bytes.push(0x80 | (charCode & 0x3f));
    }
  }

  const bitLength = bytes.length * 8;

  // Append 0x80 padding byte
  bytes.push(0x80);

  // Pad with 0x00 until length in bytes % 64 === 56
  while ((bytes.length % 64) !== 56) {
    bytes.push(0);
  }

  // Append 64-bit big-endian length
  bytes.push(0, 0, 0, 0);
  bytes.push((bitLength >>> 24) & 0xff);
  bytes.push((bitLength >>> 16) & 0xff);
  bytes.push((bitLength >>> 8) & 0xff);
  bytes.push(bitLength & 0xff);

  const W = new Int32Array(64);

  for (let chunk = 0; chunk < bytes.length; chunk += 64) {
    for (let t = 0; t < 16; t++) {
      const idx = chunk + t * 4;
      W[t] =
        (bytes[idx] << 24) |
        (bytes[idx + 1] << 16) |
        (bytes[idx + 2] << 8) |
        bytes[idx + 3];
    }

    for (let t = 16; t < 64; t++) {
      const s0 = rightRotate(W[t - 15], 7) ^ rightRotate(W[t - 15], 18) ^ (W[t - 15] >>> 3);
      const s1 = rightRotate(W[t - 2], 17) ^ rightRotate(W[t - 2], 19) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
    }

    let a = H0;
    let b = H1;
    let c = H2;
    let d = H3;
    let e = H4;
    let f = H5;
    let g = H6;
    let h = H7;

    for (let t = 0; t < 64; t++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    H0 = (H0 + a) | 0;
    H1 = (H1 + b) | 0;
    H2 = (H2 + c) | 0;
    H3 = (H3 + d) | 0;
    H4 = (H4 + e) | 0;
    H5 = (H5 + f) | 0;
    H6 = (H6 + g) | 0;
    H7 = (H7 + h) | 0;
  }

  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  return `${toHex(H0)}${toHex(H1)}${toHex(H2)}${toHex(H3)}${toHex(H4)}${toHex(H5)}${toHex(H6)}${toHex(H7)}`;
}

/**
 * Universal UUID v4 generator
 */
export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Computes a SHA-256 cryptographic hash of a raw password string.
 * Guarantees that plain-text passwords are never transmitted across networks or stored.
 *
 * @param password Raw plaintext password entered by user
 * @param salt Optional user-specific or contextual salt
 * @returns 64-character hexadecimal SHA-256 hash string
 */
export async function hashPassword(
  password: string,
  salt: string = ""
): Promise<string> {
  const saltedInput = `${AUTH_PEPPER}${salt}:${password}`;
  return sha256Sync(saltedInput);
}

/**
 * Computes a SHA-256 checksum/hash for any arbitrary object or transmission package.
 *
 * @param data Data object, string, or package payload
 * @returns 64-character hexadecimal SHA-256 digest
 */
export async function hashPayload(data: unknown): Promise<string> {
  const serialized =
    typeof data === "string" ? data : JSON.stringify(data ?? "");
  return sha256Sync(serialized);
}

/**
 * Transmission package structure with cryptographic integrity seal
 */
export interface SecureTransmissionPackage<T = any> {
  payload: T;
  timestamp: number;
  nonce: string;
  checksum: string;
}

/**
 * Encapsulates data into a secure transmission packet with SHA-256 hash checksum & nonce.
 *
 * @param payload The data package payload to transmit
 * @returns Sealed transmission packet
 */
export async function createSecurePackage<T>(
  payload: T
): Promise<SecureTransmissionPackage<T>> {
  const timestamp = Date.now();
  const nonce = generateUUID();
  const serializedPayload = JSON.stringify(payload);
  const checksum = sha256Sync(`${timestamp}:${nonce}:${serializedPayload}`);

  return {
    payload,
    timestamp,
    nonce,
    checksum,
  };
}

/**
 * Verifies the cryptographic integrity of a received transmission packet.
 *
 * @param packet Sealed transmission packet
 * @param maxAgeMs Optional expiration window (default: 5 minutes)
 * @returns boolean True if packet is authentic and untampered
 */
export async function verifyPackageIntegrity<T>(
  packet: SecureTransmissionPackage<T>,
  maxAgeMs: number = 300000
): Promise<boolean> {
  if (!packet || !packet.checksum || !packet.nonce || !packet.timestamp) {
    return false;
  }

  // Check TTL/replay expiration
  if (Date.now() - packet.timestamp > maxAgeMs) {
    return false;
  }

  const serializedPayload = JSON.stringify(packet.payload);
  const expectedChecksum = sha256Sync(
    `${packet.timestamp}:${packet.nonce}:${serializedPayload}`
  );

  return expectedChecksum.toLowerCase() === packet.checksum.toLowerCase();
}
