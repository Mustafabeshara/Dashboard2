/**
 * OCR Integration
 * Extract text from scanned documents using AWS Textract or Google Vision
 */

import { logger } from './logger'

export enum OCRProvider {
  AWS_TEXTRACT = 'AWS_TEXTRACT',
  GOOGLE_VISION = 'GOOGLE_VISION',
}

interface OCRResult {
  text: string
  confidence: number
  blocks?: any[]
  metadata?: any
}

class OCRManager {
  private provider: OCRProvider

  constructor() {
    // Determine which provider to use based on environment variables
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.provider = OCRProvider.AWS_TEXTRACT
    } else if (process.env.GOOGLE_VISION_API_KEY) {
      this.provider = OCRProvider.GOOGLE_VISION
    } else {
      this.provider = OCRProvider.AWS_TEXTRACT // Default
      logger.warn('No OCR credentials configured, OCR will not work')
    }
  }

  async extractText(fileUrl: string, language: string = 'en'): Promise<OCRResult> {
    try {
      logger.info('Starting OCR extraction', {
        context: { fileUrl, provider: this.provider, language },
      })

      let result: OCRResult

      switch (this.provider) {
        case OCRProvider.AWS_TEXTRACT:
          result = await this.extractWithTextract(fileUrl)
          break
        
        case OCRProvider.GOOGLE_VISION:
          result = await this.extractWithVision(fileUrl, language)
          break
        
        default:
          throw new Error(`Unsupported OCR provider: ${this.provider}`)
      }

      logger.info('OCR extraction completed', {
        context: {
          fileUrl,
          provider: this.provider,
          textLength: result.text.length,
          confidence: result.confidence,
        },
      })

      return result
    } catch (error) {
      logger.error('OCR extraction failed', error as Error, { fileUrl })
      throw error
    }
  }

  private async extractWithTextract(fileUrl: string): Promise<OCRResult> {
    try {
      // Import AWS SDK dynamically
      const { TextractClient, DetectDocumentTextCommand } = await import('@aws-sdk/client-textract')
      
      const client = new TextractClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      })

      // Download file from S3 or URL
      const fileBuffer = await this.downloadFile(fileUrl)

      const command = new DetectDocumentTextCommand({
        Document: {
          Bytes: fileBuffer,
        },
      })

      const response = await client.send(command)

      // Extract text from blocks
      const textBlocks = response.Blocks?.filter(block => block.BlockType === 'LINE') || []
      const text = textBlocks.map(block => block.Text).join('\n')
      
      // Calculate average confidence
      const confidences = textBlocks.map(block => block.Confidence || 0)
      const avgConfidence = confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : 0

      return {
        text,
        confidence: avgConfidence / 100, // Convert to 0-1 scale
        blocks: response.Blocks,
        metadata: {
          provider: 'AWS_TEXTRACT',
          documentMetadata: response.DocumentMetadata,
        },
      }
    } catch (error) {
      logger.error('AWS Textract extraction failed', error as Error)
      throw new Error('OCR extraction failed with AWS Textract')
    }
  }

  private async extractWithVision(fileUrl: string, language: string): Promise<OCRResult> {
    try {
      // Use Google Vision API
      const apiKey = process.env.GOOGLE_VISION_API_KEY
      
      if (!apiKey) {
        throw new Error('Google Vision API key not configured')
      }

      // Download file
      const fileBuffer = await this.downloadFile(fileUrl)
      const base64Image = fileBuffer.toString('base64')

      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: base64Image,
                },
                features: [
                  {
                    type: 'DOCUMENT_TEXT_DETECTION',
                    maxResults: 1,
                  },
                ],
                imageContext: {
                  languageHints: [language],
                },
              },
            ],
          }),
        }
      )

      const data = await response.json()

      if (data.responses[0].error) {
        throw new Error(data.responses[0].error.message)
      }

      const fullTextAnnotation = data.responses[0].fullTextAnnotation

      return {
        text: fullTextAnnotation?.text || '',
        confidence: fullTextAnnotation?.pages?.[0]?.confidence || 0,
        blocks: fullTextAnnotation?.pages,
        metadata: {
          provider: 'GOOGLE_VISION',
          language,
        },
      }
    } catch (error) {
      logger.error('Google Vision extraction failed', error as Error)
      throw new Error('OCR extraction failed with Google Vision')
    }
  }

  private async downloadFile(url: string): Promise<Buffer> {
    if (url.startsWith('s3://')) {
      // Download from S3
      return await this.downloadFromS3(url)
    } else {
      // Download from HTTP URL
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    }
  }

  private async downloadFromS3(s3Url: string): Promise<Buffer> {
    try {
      const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3')
      
      const client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      })

      // Parse S3 URL (s3://bucket/key)
      const match = s3Url.match(/^s3:\/\/([^\/]+)\/(.+)$/)
      if (!match) {
        throw new Error('Invalid S3 URL format')
      }

      const [, bucket, key] = match

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })

      const response = await client.send(command)
      const chunks: Uint8Array[] = []
      
      for await (const chunk of response.Body as any) {
        chunks.push(chunk)
      }

      return Buffer.concat(chunks)
    } catch (error) {
      logger.error('S3 download failed', error as Error, { s3Url })
      throw error
    }
  }

  // Helper method to check if file needs OCR
  isScannedDocument(mimeType: string): boolean {
    // Images likely need OCR
    return mimeType.startsWith('image/')
  }
}

// Create singleton instance
export const ocr = new OCRManager()
