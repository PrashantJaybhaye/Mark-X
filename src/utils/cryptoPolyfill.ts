import * as Crypto from 'expo-crypto';

// Polyfill global.crypto.getRandomValues for Expo Go
if (typeof global.crypto !== 'object') {
  // @ts-ignore
  global.crypto = {};
}

if (typeof global.crypto.getRandomValues !== 'function') {
  global.crypto.getRandomValues = function getRandomValues(array: any) {
    const bytes = Crypto.getRandomBytes(array.byteLength);
    for (let i = 0; i < array.length; i++) {
      array[i] = bytes[i];
    }
    return array;
  };
}
