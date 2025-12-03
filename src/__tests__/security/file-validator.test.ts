/**
 * Security Tests for File Validation
 * Tests file type detection, size validation, and security measures
 */

import {
  getFileHash,
  validateFileSize,
  validateMimeType,
  detectMimeType,
  sanitizeFilename,
  generateSecureFilename,
  validateFile,
} from '@/lib/security/file-validator';

describe('File Validator', () => {
  describe('getFileHash', () => {
    it('should return consistent hash for same content', () => {
      const buffer = Buffer.from('test content');
      const hash1 = getFileHash(buffer);
      const hash2 = getFileHash(buffer);
      expect(hash1).toBe(hash2);
    });

    it('should return different hash for different content', () => {
      const buffer1 = Buffer.from('content 1');
      const buffer2 = Buffer.from('content 2');
      expect(getFileHash(buffer1)).not.toBe(getFileHash(buffer2));
    });

    it('should return 64-character hex string (SHA-256)', () => {
      const buffer = Buffer.from('test');
      const hash = getFileHash(buffer);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('validateFileSize', () => {
    it('should accept files within size limit', () => {
      const buffer = Buffer.alloc(1024); // 1KB
      expect(() => validateFileSize(buffer, 1024 * 1024)).not.toThrow();
    });

    it('should reject files exceeding size limit', () => {
      const buffer = Buffer.alloc(2 * 1024 * 1024); // 2MB
      expect(() => validateFileSize(buffer, 1024 * 1024)).toThrow(/File too large/);
    });

    it('should include size information in error', () => {
      const buffer = Buffer.alloc(100 * 1024 * 1024); // 100MB
      expect(() => validateFileSize(buffer, 50 * 1024 * 1024)).toThrow(/100.00MB.*max.*50.00MB/);
    });
  });

  describe('validateMimeType', () => {
    it('should accept allowed MIME types', () => {
      expect(() => validateMimeType('image/png', ['image/png', 'image/jpeg'])).not.toThrow();
    });

    it('should reject disallowed MIME types', () => {
      expect(() => validateMimeType('application/javascript', ['image/png', 'image/jpeg'])).toThrow(
        /Unsupported file type/
      );
    });

    it('should list allowed types in error message', () => {
      expect(() => validateMimeType('text/html', ['application/pdf'])).toThrow(/application\/pdf/);
    });
  });

  describe('detectMimeType', () => {
    it('should detect PDF files', () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 test content');
      expect(detectMimeType(pdfBuffer)).toBe('application/pdf');
    });

    it('should detect JPEG files', () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      expect(detectMimeType(jpegBuffer)).toBe('image/jpeg');
    });

    it('should detect PNG files', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(detectMimeType(pngBuffer)).toBe('image/png');
    });

    it('should detect GIF files', () => {
      const gifBuffer = Buffer.from('GIF89a' + 'test');
      expect(detectMimeType(gifBuffer)).toBe('image/gif');
    });

    it('should return null for unknown types', () => {
      const unknownBuffer = Buffer.from('random content');
      expect(detectMimeType(unknownBuffer)).toBeNull();
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove path traversal attempts and replace slashes', () => {
      // '../../../etc/passwd' -> '' + '/' replaced with '_' -> '___etc_passwd'
      const result = sanitizeFilename('../../../etc/passwd');
      expect(result).toBe('___etc_passwd');
      expect(result).not.toContain('..');
      expect(result).not.toContain('/');
    });

    it('should remove special characters', () => {
      expect(sanitizeFilename('file<script>.txt')).toBe('file_script_.txt');
    });

    it('should preserve valid characters', () => {
      expect(sanitizeFilename('my-file_2024.pdf')).toBe('my-file_2024.pdf');
    });

    it('should limit filename length', () => {
      const longName = 'a'.repeat(300) + '.pdf';
      const sanitized = sanitizeFilename(longName);
      expect(sanitized.length).toBeLessThanOrEqual(255);
      expect(sanitized).toMatch(/\.pdf$/);
    });

    it('should handle filenames with multiple dots', () => {
      expect(sanitizeFilename('file.backup.tar.gz')).toBe('file.backup.tar.gz');
    });

    it('should replace spaces with underscores', () => {
      expect(sanitizeFilename('my file name.txt')).toBe('my_file_name.txt');
    });
  });

  describe('generateSecureFilename', () => {
    it('should generate unique filenames', () => {
      const name1 = generateSecureFilename('test.pdf');
      const name2 = generateSecureFilename('test.pdf');
      expect(name1).not.toBe(name2);
    });

    it('should preserve file extension', () => {
      const name = generateSecureFilename('document.pdf');
      expect(name).toMatch(/\.pdf$/);
    });

    it('should include timestamp', () => {
      const before = Date.now();
      const name = generateSecureFilename('test.txt');
      const after = Date.now();

      const timestamp = parseInt(name.split('-')[0]);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('should handle files without extension by using last segment', () => {
      // 'noextension'.split('.').pop() returns 'noextension'
      // So it becomes: timestamp-random.noextension
      const name = generateSecureFilename('noextension');
      expect(name).toMatch(/^\d+-[a-f0-9]+\.noextension$/);
    });

    it('should handle files with proper extension', () => {
      const name = generateSecureFilename('document.docx');
      expect(name).toMatch(/^\d+-[a-f0-9]+\.docx$/);
    });
  });

  describe('validateFile', () => {
    it('should return valid for files meeting all criteria', async () => {
      const buffer = Buffer.from('%PDF-1.4 test content');
      const result = await validateFile(buffer, {
        maxSize: 1024 * 1024,
        allowedMimeTypes: ['application/pdf'],
        detectMimeType: true,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.hash).toBeDefined();
      expect(result.detectedMimeType).toBe('application/pdf');
    });

    it('should collect multiple validation errors', async () => {
      const buffer = Buffer.alloc(100 * 1024 * 1024); // 100MB random data
      const result = await validateFile(buffer, {
        maxSize: 1024 * 1024, // 1MB
        allowedMimeTypes: ['application/pdf'],
        detectMimeType: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
    });

    it('should always return file hash', async () => {
      const buffer = Buffer.from('test');
      const result = await validateFile(buffer);

      expect(result.hash).toBeDefined();
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
