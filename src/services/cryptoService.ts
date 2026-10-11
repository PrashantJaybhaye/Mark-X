import { Buffer } from 'buffer';
import crypto from 'react-native-quick-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';

const MASTER_KEY_ALIAS = 'markx_master_key_v2';
const ALGORITHM = 'aes-256-cbc';

async function getMasterKey(): Promise<string> {
  let keyHex = await SecureStore.getItemAsync(MASTER_KEY_ALIAS);
  if (!keyHex) {
    keyHex = crypto.randomBytes(32).toString('hex');
    await SecureStore.setItemAsync(MASTER_KEY_ALIAS, keyHex);
  }
  return keyHex;
}

export async function encryptFile(sourceUri: string, targetUri: string): Promise<void> {
  try {
    const keyHex = await getMasterKey();
    const key = Buffer.from(keyHex, 'hex');
    const iv = crypto.randomBytes(16);

    const base64Data = await FileSystem.readAsStringAsync(sourceUri, {
      encoding: FileSystem.EncodingType.Base64
    });

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encryptedBase64 = cipher.update(base64Data, 'base64', 'base64');
    encryptedBase64 += cipher.final('base64');

    const payload = iv.toString('hex') + ':' + encryptedBase64;

    await FileSystem.writeAsStringAsync(targetUri, payload, {
      encoding: FileSystem.EncodingType.UTF8
    });

  } catch (error) {
    console.error("[CryptoService] Encryption failed:", error);
    throw error;
  }
}

export async function decryptFile(encryptedUri: string, targetTempUri: string): Promise<void> {
  try {
    const keyHex = await getMasterKey();
    const key = Buffer.from(keyHex, 'hex');

    const payload = await FileSystem.readAsStringAsync(encryptedUri, {
      encoding: FileSystem.EncodingType.UTF8
    });

    const parts = payload.split(':');
    if (parts.length !== 2) {
      throw new Error("Invalid encrypted file format (missing IV)");
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedBase64 = parts[1];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decryptedBase64 = decipher.update(encryptedBase64, 'base64', 'base64');
    decryptedBase64 += decipher.final('base64');

    await FileSystem.writeAsStringAsync(targetTempUri, decryptedBase64, {
      encoding: FileSystem.EncodingType.Base64
    });

  } catch (error) {
    console.error("[CryptoService] Decryption failed:", error);
    throw error;
  }
}
