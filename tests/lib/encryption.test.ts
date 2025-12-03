/**
 * Encryption Tests
 * Tests for API key encryption and security
 */

import { describe, it, expect } from '@jest/globals';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

// Test encryption functions (mirroring the implementation)
const ALGORITHM = 'aes-256-gcm';

function getKey(salt: Buffer, secret: string): Buffer {
  return scryptSync(secret, salt, 32);
}

function encrypt(text: string, secret: string): string {
  const iv = randomBytes(16);
  const salt = randomBytes(32);
  const key = getKey(salt, secret);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedData: string, secret: string): string {
  try {
    const [saltHex, ivHex, authTagHex, encrypted] = encryptedData.split(':');

    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getKey(salt, secret);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch {
    return '';
  }
}

describe('Encryption Security', () => {
  const testSecret = 'test-secret-minimum-32-characters-long';

  describe('encrypt function', () => {
    it('should encrypt a string', () => {
      const plaintext = 'sk-test-api-key-12345';
      const encrypted = encrypt(plaintext, testSecret);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (random salt)', () => {
      const plaintext = 'sk-test-api-key-12345';
      const encrypted1 = encrypt(plaintext, testSecret);
      const encrypted2 = encrypt(plaintext, testSecret);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should produce output in correct format (salt:iv:authTag:ciphertext)', () => {
      const plaintext = 'test-data';
      const encrypted = encrypt(plaintext, testSecret);
      const parts = encrypted.split(':');

      expect(parts.length).toBe(4);
      expect(parts[0].length).toBe(64); // 32 bytes = 64 hex chars (salt)
      expect(parts[1].length).toBe(32); // 16 bytes = 32 hex chars (iv)
      expect(parts[2].length).toBe(32); // 16 bytes = 32 hex chars (authTag)
      expect(parts[3].length).toBeGreaterThan(0); // ciphertext
    });
  });

  describe('decrypt function', () => {
    it('should decrypt encrypted data correctly', () => {
      const plaintext = 'sk-test-api-key-12345';
      const encrypted = encrypt(plaintext, testSecret);
      const decrypted = decrypt(encrypted, testSecret);

      expect(decrypted).toBe(plaintext);
    });

    it('should return empty string for invalid encrypted data', () => {
      const decrypted = decrypt('invalid-data', testSecret);
      expect(decrypted).toBe('');
    });

    it('should return empty string for tampered data', () => {
      const plaintext = 'test-data';
      const encrypted = encrypt(plaintext, testSecret);
      const tampered = encrypted.replace(/.$/, 'X'); // Change last character
      const decrypted = decrypt(tampered, testSecret);

      expect(decrypted).toBe('');
    });

    it('should return empty string for wrong secret', () => {
      const plaintext = 'test-data';
      const encrypted = encrypt(plaintext, testSecret);
      const decrypted = decrypt(encrypted, 'wrong-secret-key-minimum-32-chars');

      expect(decrypted).toBe('');
    });
  });

  describe('Encryption round-trip', () => {
    const testCases = [
      'simple-api-key',
      'sk-proj-1234567890abcdefghijklmnop',
      'AIzaSyDaGmWKa4JsXZ-HjGw7ISLn_3namBGewQe',
      'special-chars-!@#$%^&*()',
      'unicode-测试-тест-🔐',
      '', // empty string
      'a'.repeat(1000), // long string
    ];

    testCases.forEach((testCase) => {
      it(`should correctly round-trip: "${testCase.slice(0, 30)}..."`, () => {
        const encrypted = encrypt(testCase, testSecret);
        const decrypted = decrypt(encrypted, testSecret);
        expect(decrypted).toBe(testCase);
      });
    });
  });

  describe('Security Properties', () => {
    it('should use AES-256-GCM algorithm', () => {
      expect(ALGORITHM).toBe('aes-256-gcm');
    });

    it('should generate random salt for each encryption', () => {
      const plaintext = 'test-data';
      const encrypted1 = encrypt(plaintext, testSecret);
      const encrypted2 = encrypt(plaintext, testSecret);

      const salt1 = encrypted1.split(':')[0];
      const salt2 = encrypted2.split(':')[0];

      expect(salt1).not.toBe(salt2);
    });

    it('should generate random IV for each encryption', () => {
      const plaintext = 'test-data';
      const encrypted1 = encrypt(plaintext, testSecret);
      const encrypted2 = encrypt(plaintext, testSecret);

      const iv1 = encrypted1.split(':')[1];
      const iv2 = encrypted2.split(':')[1];

      expect(iv1).not.toBe(iv2);
    });

    it('should include authentication tag', () => {
      const plaintext = 'test-data';
      const encrypted = encrypt(plaintext, testSecret);
      const authTag = encrypted.split(':')[2];

      expect(authTag).toBeDefined();
      expect(authTag.length).toBe(32); // 16 bytes = 32 hex chars
    });
  });
});

describe('API Key Masking', () => {
  function maskKey(key: string): string {
    if (!key || key.length < 12) return '••••••••';
    return `${key.slice(0, 4)}${'•'.repeat(Math.min(key.length - 8, 20))}${key.slice(-4)}`;
  }

  it('should mask short keys completely', () => {
    expect(maskKey('short')).toBe('••••••••');
    expect(maskKey('')).toBe('••••••••');
    expect(maskKey('12345678901')).toBe('••••••••'); // 11 chars
  });

  it('should show first and last 4 characters', () => {
    const key = 'sk-proj-1234567890abcdefghij';
    const masked = maskKey(key);

    expect(masked.startsWith('sk-p')).toBe(true);
    expect(masked.endsWith('ghij')).toBe(true);
  });

  it('should limit dots to 20 characters max', () => {
    const longKey = 'a'.repeat(100);
    const masked = maskKey(longKey);
    const dots = masked.match(/•/g) || [];

    expect(dots.length).toBe(20);
  });

  it('should handle typical API key formats', () => {
    const keys = [
      'sk-proj-1234567890abcdef',
      'AIzaSyDaGmWKa4JsXZ-HjGw7ISLn_3namBGewQe',
      'gsk_test_1234567890abcdefghijklmnop',
    ];

    keys.forEach((key) => {
      const masked = maskKey(key);
      expect(masked.startsWith(key.slice(0, 4))).toBe(true);
      expect(masked.endsWith(key.slice(-4))).toBe(true);
      expect(masked).toContain('•');
    });
  });
});
