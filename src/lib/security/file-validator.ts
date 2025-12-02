/**
 * File Security Utilities
 * Validates file types, sizes, and optionally scans for viruses
 */

import crypto from 'crypto'
import { logger } from '../logger'

/**
 * Calculate file hash for caching
 */
export function getFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

/**
 * Validate file size
 */
export function validateFileSize(buffer: Buffer, maxSizeBytes: number = 50 * 1024 * 1024): void {
  if (buffer.length > maxSizeBytes) {
    throw new Error(
      `File too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (max: ${(maxSizeBytes / 1024 / 1024).toFixed(2)}MB)`
    )
  }
}

/**
 * Validate MIME type
 */
export function validateMimeType(mimeType: string, allowedTypes: string[]): void {
  if (!allowedTypes.includes(mimeType)) {
    throw new Error(`Unsupported file type: ${mimeType}. Allowed types: ${allowedTypes.join(', ')}`)
  }
}

/**
 * Detect MIME type from buffer
 */
export function detectMimeType(buffer: Buffer): string | null {
  // Check magic bytes for common file types
  const magicBytes = buffer.slice(0, 12)

  // PDF
  if (magicBytes.toString('utf-8', 0, 4) === '%PDF') {
    return 'application/pdf'
  }

  // JPEG
  if (magicBytes[0] === 0xff && magicBytes[1] === 0xd8 && magicBytes[2] === 0xff) {
    return 'image/jpeg'
  }

  // PNG
  if (
    magicBytes[0] === 0x89 &&
    magicBytes[1] === 0x50 &&
    magicBytes[2] === 0x4e &&
    magicBytes[3] === 0x47
  ) {
    return 'image/png'
  }

  // GIF
  if (magicBytes.toString('utf-8', 0, 3) === 'GIF') {
    return 'image/gif'
  }

  // WebP
  if (magicBytes.toString('utf-8', 0, 4) === 'RIFF' && magicBytes.toString('utf-8', 8, 12) === 'WEBP') {
    return 'image/webp'
  }

  return null
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '')

  // Remove special characters except dots, dashes, and underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_')

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop()
    sanitized = sanitized.substring(0, 250) + (ext ? `.${ext}` : '')
  }

  return sanitized
}

/**
 * Generate secure random filename
 */
export function generateSecureFilename(originalFilename: string): string {
  const ext = originalFilename.split('.').pop()
  const timestamp = Date.now()
  const random = crypto.randomBytes(8).toString('hex')
  return `${timestamp}-${random}${ext ? `.${ext}` : ''}`
}

/**
 * Virus scanning interface (requires ClamAV)
 * This is a placeholder - implement actual scanning in production
 */
export async function scanFileForViruses(buffer: Buffer): Promise<{
  isInfected: boolean
  signature?: string
}> {
  try {
    // Check if ClamAV is configured
    if (!process.env.CLAMAV_HOST) {
      logger.warn('Virus scanning not configured - ClamAV host not set')
      return { isInfected: false }
    }

    // In production, integrate with ClamAV
    // const ClamScan = require('clamscan')
    // const clamscan = await new ClamScan().init({
    //   clamdscan: {
    //     host: process.env.CLAMAV_HOST,
    //     port: process.env.CLAMAV_PORT || 3310,
    //   }
    // })
    // const { isInfected, viruses } = await clamscan.scanBuffer(buffer)
    // return { isInfected, signature: viruses?.[0] }

    return { isInfected: false }
  } catch (error) {
    logger.error('Virus scan failed', error as Error)
    // Fail closed - reject file if scanning fails
    return { isInfected: true, signature: 'SCAN_ERROR' }
  }
}

/**
 * Comprehensive file validation
 */
export async function validateFile(
  buffer: Buffer,
  options: {
    maxSize?: number
    allowedMimeTypes?: string[]
    scanForViruses?: boolean
    detectMimeType?: boolean
  } = {}
): Promise<{
  valid: boolean
  hash: string
  detectedMimeType?: string
  errors: string[]
}> {
  const errors: string[] = []
  const hash = getFileHash(buffer)

  try {
    // Check file size
    if (options.maxSize) {
      try {
        validateFileSize(buffer, options.maxSize)
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'File size validation failed')
      }
    }

    // Detect MIME type
    let detectedMimeType: string | undefined
    if (options.detectMimeType) {
      detectedMimeType = detectMimeType(buffer) || undefined
    }

    // Validate MIME type
    if (options.allowedMimeTypes && detectedMimeType) {
      try {
        validateMimeType(detectedMimeType, options.allowedMimeTypes)
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'MIME type validation failed')
      }
    }

    // Scan for viruses
    if (options.scanForViruses) {
      const scanResult = await scanFileForViruses(buffer)
      if (scanResult.isInfected) {
        errors.push(`File infected with virus: ${scanResult.signature || 'unknown'}`)
      }
    }

    return {
      valid: errors.length === 0,
      hash,
      detectedMimeType,
      errors,
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'File validation failed')
    return {
      valid: false,
      hash,
      errors,
    }
  }
}
