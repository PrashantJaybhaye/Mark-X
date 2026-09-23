import CryptoJS from 'crypto-js';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

const MASTER_KEY_ALIAS = 'markx_master_key_v1';

/**
 * Retrieves or generates the master AES encryption key.
 * Stored securely in the device's hardware keystore.
 */
async function getMasterKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(MASTER_KEY_ALIAS);
  if (!key) {
    key = CryptoJS.lib.WordArray.random(32).toString();
    await SecureStore.setItemAsync(MASTER_KEY_ALIAS, key);
  }
  return key;
}

/**
 * Reads a raw local file, encrypts it using AES-256, and saves it to a new location.
 * @param sourceUri The URI of the unencrypted file
 * @param targetUri The URI where the encrypted file should be saved
 */
export async function encryptFile(sourceUri: string, targetUri: string): Promise<void> {
  try {
    const key = await getMasterKey();
    
    // Read the file as a base64 string
    const base64Data = await FileSystem.readAsStringAsync(sourceUri, { 
      encoding: FileSystem.EncodingType.Base64 
    });
    
    // Encrypt the base64 string
    // Note: For very large videos, this blocks the JS thread for a moment.
    const encrypted = CryptoJS.AES.encrypt(base64Data, key).toString();
    
    // Save the encrypted string as UTF-8
    await FileSystem.writeAsStringAsync(targetUri, encrypted, { 
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
    const key = await getMasterKey();
    
    // Read the encrypted UTF-8 string
    const encrypted = await FileSystem.readAsStringAsync(encryptedUri, { 
      encoding: FileSystem.EncodingType.UTF8 
    });
    
    // Decrypt back to base64
    const decryptedBytes = CryptoJS.AES.decrypt(encrypted, key);
    const decryptedBase64 = decryptedBytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedBase64) {
      throw new Error("Decryption resulted in empty data (wrong key or corrupted file)");
    }
    
    // Save the raw file
    await FileSystem.writeAsStringAsync(targetTempUri, decryptedBase64, { 
      encoding: FileSystem.EncodingType.Base64 
    });
    
  } catch (error) {
    console.error("[CryptoService] Decryption failed:", error);
    throw error;
  }
}
