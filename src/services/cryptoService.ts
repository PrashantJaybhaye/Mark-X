import { Buffer } from 'buffer';
import crypto from 'react-native-quick-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';

const MASTER_KEY_ALIAS = 'markx_master_key_v2';
const ALGORITHM = 'aes-256-cbc';

/**
 * Retrieves or generates the master AES encryption key.
 * Stored securely in the device's hardware keystore.
 * Returns a hex string representation of the 32-byte key.
 */
async function getMasterKey(): Promise<string> {
  let keyHex = await SecureStore.getItemAsync(MASTER_KEY_ALIAS);
  if (!keyHex) {
    keyHex = crypto.randomBytes(32).toString('hex');
    await SecureStore.setItemAsync(MASTER_KEY_ALIAS, keyHex);
  }
  return keyHex;
}

/**
 * Reads a raw local file, encrypts it using blazing fast native AES-256-CBC, and saves it.
 * @param sourceUri The URI of the unencrypted file
 * @param targetUri The URI where the encrypted file should be saved
 */
export async function encryptFile(sourceUri: string, targetUri: string): Promise<void> {
  try {
    const keyHex = await getMasterKey();
    const key = Buffer.from(keyHex, 'hex');
    const iv = crypto.randomBytes(16);
    
    // Read the file as a base64 string
    const base64Data = await FileSystem.readAsStringAsync(sourceUri, { 
      encoding: FileSystem.EncodingType.Base64 
    });
    
    // Encrypt the string natively in C++ via JSI
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encryptedBase64 = cipher.update(base64Data, 'base64', 'base64');
    encryptedBase64 += cipher.final('base64');
    
    // Prepend the IV (in hex) to the encrypted payload so we can decrypt it later
    const payload = iv.toString('hex') + ':' + encryptedBase64;
    
    // Save the payload
    await FileSystem.writeAsStringAsync(targetUri, payload, { 
      encoding: FileSystem.EncodingType.UTF8 
    });
    
  } catch (error) {
    console.error("[CryptoService] Encryption failed:", error);
    throw error;
  }
}

/**
 * Reads an AES-256 encrypted file, decrypts it, and saves it as a raw file.
 * @param encryptedUri The URI of the encrypted file
 * @param targetTempUri The URI where the temporary decrypted file should be saved
 */
export async function decryptFile(encryptedUri: string, targetTempUri: string): Promise<void> {
  try {
    const keyHex = await getMasterKey();
    const key = Buffer.from(keyHex, 'hex');
    
    // Read the payload
    const payload = await FileSystem.readAsStringAsync(encryptedUri, { 
      encoding: FileSystem.EncodingType.UTF8 
    });
    
    // Split the IV and the encrypted data
    const parts = payload.split(':');
    if (parts.length !== 2) {
      throw new Error("Invalid encrypted file format (missing IV)");
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedBase64 = parts[1];
    
    // Decrypt natively in C++ via JSI
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decryptedBase64 = decipher.update(encryptedBase64, 'base64', 'base64');
    decryptedBase64 += decipher.final('base64');
    
    // Save the raw file
    await FileSystem.writeAsStringAsync(targetTempUri, decryptedBase64, { 
      encoding: FileSystem.EncodingType.Base64 
    });
    
  } catch (error) {
    console.error("[CryptoService] Decryption failed:", error);
    throw error;
  }
}
