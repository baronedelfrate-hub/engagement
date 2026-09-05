/**
 * Security Notice:
 * For a true secure environment, encryption keys should never be exposed to the client.
 * This utility uses a basic obfuscation/encoding method suitable for demonstration 
 * in a frontend-only context. In production, sensitive data like .pfx and passwords
 * should be encrypted server-side or using Web Crypto API with keys managed via KMS.
 */

// Simple base64 encoding with a basic shift for obfuscation
export const encryptData = (text) => {
  if (!text) return text;
  try {
    // Simple XOR cipher simulation
    const key = 'secret-key-123';
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(result);
  } catch (e) {
    console.error("Encryption error", e);
    return text; // fallback
  }
};

export const decryptData = (encodedText) => {
  if (!encodedText) return encodedText;
  try {
    const text = atob(encodedText);
    const key = 'secret-key-123';
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch (e) {
    console.error("Decryption error", e);
    return encodedText; // fallback
  }
};

export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};