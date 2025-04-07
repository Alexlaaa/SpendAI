import * as fs from 'fs';
import * as crypto from 'crypto';

const FRONTEND_PRIVATE_KEY_PATH = '/app/keys/frontend_private.pem';
const BACKEND_PUBLIC_KEY_PATH = '/app/keys/backend_public.pem';

// Load keys once during initialization
let frontendPrivateKey: string;
let backendPublicKey: string;

try {
  frontendPrivateKey = fs.readFileSync(FRONTEND_PRIVATE_KEY_PATH, 'utf8');
  backendPublicKey = fs.readFileSync(BACKEND_PUBLIC_KEY_PATH, 'utf8');
} catch (error) {
  console.error('Error loading encryption keys:', error);
  throw new Error('Failed to load encryption keys');
}

export function encryptWithBackendPublicKey(data: string): string {
  try {
    console.log('[encryptWithBackendPublicKey] Input data length:', data.length);

    const buffer = Buffer.from(data, 'utf8');
    const encrypted = crypto.publicEncrypt(
      {
        key: backendPublicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      buffer
    );

    return encrypted.toString('base64');
  } catch (error : any) {
    console.error('[encryptWithBackendPublicKey] Encryption error:', error);
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

export function decryptWithFrontendPrivateKey(encryptedData: string): string {
  try {
    if (!encryptedData) {
      throw new Error('No encrypted data provided');
    }

    console.log('[decryptWithFrontendPrivateKey] Starting decryption');
    console.log('[decryptWithFrontendPrivateKey] Input length:', encryptedData.length);

    // Validate base64 input
    let buffer: Buffer;
    try {
      buffer = Buffer.from(encryptedData, 'base64');
      console.log('[decryptWithFrontendPrivateKey] Base64 decoded length:', buffer.length);
    } catch (error) {
      console.error('[decryptWithFrontendPrivateKey] Base64 decode error:', error);
      throw new Error('Invalid base64 input');
    }

    // Try different padding options if needed
    let decrypted: Buffer;
    try {
      decrypted = crypto.privateDecrypt(
        {
          key: frontendPrivateKey,
          padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        buffer
      );
    } catch (firstError) {
      console.log('[decryptWithFrontendPrivateKey] First attempt failed, trying OAEP padding');
      // Try with OAEP padding as fallback
      decrypted = crypto.privateDecrypt(
        {
          key: frontendPrivateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        buffer
      );
    }

    const result = decrypted.toString('utf8');
    console.log('[decryptWithFrontendPrivateKey] Decryption successful');
    console.log('[decryptWithFrontendPrivateKey] Decrypted length:', result.length);

    return result;
  } catch (error : any) {
    console.error('[decryptWithFrontendPrivateKey] Final decryption error:', error);
    console.error('[decryptWithFrontendPrivateKey] Error type:', error.code);
    throw error;
  }
}