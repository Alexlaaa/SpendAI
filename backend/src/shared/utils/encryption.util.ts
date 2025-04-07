import * as fs from 'fs';
import * as crypto from 'crypto';

// Define paths to the key files
const BACKEND_PRIVATE_KEY_PATH = '/app/keys/backend_private.pem';
const FRONTEND_PUBLIC_KEY_PATH = '/app/keys/frontend_public.pem';

// Read keys synchronously at startup
const backendPrivateKey = fs.readFileSync(BACKEND_PRIVATE_KEY_PATH, 'utf8');
const frontendPublicKey = fs.readFileSync(FRONTEND_PUBLIC_KEY_PATH, 'utf8');

/**
 * Encrypt data with Frontend's Public Key
 * @param data - string data to encrypt
 * @returns encrypted data in base64 format
 */
export function encryptWithFrontendPublicKey(data: string): string {
  const buffer = Buffer.from(data, 'utf8');
  const encrypted = crypto.publicEncrypt(
    {
      key: frontendPublicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    buffer,
  );
  return encrypted.toString('base64');
}

/**
 * Decrypt data with Backend's Private Key
 * @param encryptedData - base64 encoded encrypted data
 * @returns decrypted string data
 */
export function decryptWithBackendPrivateKey(encryptedData: string): string {
  console.log('In encryption.util.ts - Decrypting data:', encryptedData);

  try {
    const buffer = Buffer.from(encryptedData, 'base64');
    const decrypted = crypto.privateDecrypt(
      {
        key: backendPrivateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      buffer,
    );

    console.log(
      'In encryption.util.ts - Decrypted data:',
      decrypted.toString('utf8'),
    );
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption failed:', error.message);
    throw new Error('Decryption failed: ' + error.message);
  }
}
