import * as Crypto from "expo-crypto";

/**
 * Generates a cryptographically secure random UUID v4.
 */
export const generateUUID = (): string => Crypto.randomUUID();

