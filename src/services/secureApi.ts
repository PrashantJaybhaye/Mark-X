import { auth } from "./firebase";
import { createApiPackage, SecureApiPackage } from "../utils/crypto";

/**
 * Sends a secure API request to the backend with Firebase ID token authentication,
 * timestamp, and unique nonce to prevent tampering and replay attacks.
 *
 * @param endpoint URL of the backend API endpoint
 * @param payload Data payload for the request
 * @returns Parsed JSON response from the server
 */
export async function sendSecureApiRequest<TResponse = any, TPayload = any>(
  endpoint: string,
  payload: TPayload
): Promise<TResponse> {
  const currentUser = auth.currentUser;
  const idToken = currentUser ? await currentUser.getIdToken() : null;

  // Assemble package with payload, timestamp, and unique nonce
  const securePackage: SecureApiPackage<TPayload> = createApiPackage(payload);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Request-Nonce": securePackage.nonce,
    "X-Request-Timestamp": securePackage.timestamp.toString(),
  };

  if (idToken) {
    headers["Authorization"] = `Bearer ${idToken}`;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(securePackage),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Request failed with status ${response.status}`
    );
  }

  return response.json();
}
