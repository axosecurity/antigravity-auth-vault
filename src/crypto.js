/**
 * Universal Antigravity Auth Vault
 * Native AES-256-CBC PBKDF2 Zero-Knowledge Encryption Engine
 * 100% interoperable with OpenSSL format
 */

const crypto = require('crypto');

const MAGIC = 'Salted__';
const ITERATIONS = 100000;
const DIGEST = 'sha256';
const KEY_LEN = 32; // 256 bits
const IV_LEN = 16;  // 128 bits

/**
 * Encrypt a plaintext string using AES-256-CBC and PBKDF2
 * Output matches OpenSSL `enc -aes-256-cbc -pbkdf2 -iter 100000 -base64 -A`
 */
function encryptStr(plainText, passphrase) {
  if (!passphrase) {
    throw new Error('Encryption passphrase cannot be empty.');
  }

  const salt = crypto.randomBytes(8);
  const derived = crypto.pbkdf2Sync(passphrase, salt, ITERATIONS, KEY_LEN + IV_LEN, DIGEST);
  const key = derived.subarray(0, KEY_LEN);
  const iv = derived.subarray(KEY_LEN, KEY_LEN + IV_LEN);

  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);

  // OpenSSL binary layout: "Salted__" (8 bytes) + Salt (8 bytes) + Ciphertext
  const payload = Buffer.concat([Buffer.from(MAGIC, 'utf8'), salt, ciphertext]);
  return payload.toString('base64');
}

/**
 * Decrypt a base64 encoded string encrypted with OpenSSL AES-256-CBC PBKDF2
 */
function decryptStr(cipherTextB64, passphrase) {
  if (!passphrase) {
    throw new Error('Decryption passphrase cannot be empty.');
  }

  const buf = Buffer.from(cipherTextB64.trim(), 'base64');
  if (buf.length < 16) {
    throw new Error('Ciphertext payload is too short or corrupt.');
  }

  const magic = buf.subarray(0, 8).toString('utf8');
  if (magic !== MAGIC) {
    throw new Error('Invalid encryption envelope: missing Salted__ header.');
  }

  const salt = buf.subarray(8, 16);
  const ciphertext = buf.subarray(16);

  const derived = crypto.pbkdf2Sync(passphrase, salt, ITERATIONS, KEY_LEN + IV_LEN, DIGEST);
  const key = derived.subarray(0, KEY_LEN);
  const iv = derived.subarray(KEY_LEN, KEY_LEN + IV_LEN);

  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    throw new Error('Decryption failed: incorrect team passphrase or corrupted ciphertext.');
  }
}

module.exports = {
  encryptStr,
  decryptStr
};
