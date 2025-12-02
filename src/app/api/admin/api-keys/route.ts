/**
 * API Keys Management Endpoint
 * Stores encrypted API keys in the database
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

// Encryption helpers using AES-256-GCM
const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || 'fallback-key-for-development-only'
const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  return scryptSync(ENCRYPTION_KEY, 'salt', 32)
}

function encrypt(text: string): string {
  const iv = randomBytes(16)
  const key = getKey()
  const cipher = createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  // Return iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

function decrypt(encryptedData: string): string {
  try {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':')
    
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const key = getKey()
    
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch {
    return ''
  }
}

// Mask API key for display (show first 4 and last 4 chars)
function maskKey(key: string): string {
  if (!key || key.length < 12) return '••••••••'
  return `${key.slice(0, 4)}${'•'.repeat(Math.min(key.length - 8, 20))}${key.slice(-4)}`
}

// Valid API key settings
const API_KEY_SETTINGS = [
  { key: 'GROQ_API_KEY', label: 'Groq API Key', description: 'Primary AI provider for fast extraction' },
  { key: 'GEMINI_API_KEY', label: 'Gemini API Key', description: 'Google Gemini for vision/PDF processing' },
  { key: 'OPENAI_API_KEY', label: 'OpenAI API Key', description: 'OpenAI fallback provider' },
  { key: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key', description: 'Claude AI fallback provider' },
  { key: 'AWS_ACCESS_KEY_ID', label: 'AWS Access Key ID', description: 'AWS Textract for OCR' },
  { key: 'AWS_SECRET_ACCESS_KEY', label: 'AWS Secret Key', description: 'AWS secret access key' },
  { key: 'AWS_REGION', label: 'AWS Region', description: 'AWS region (e.g., us-east-1)', isSecret: false },
]

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can view API keys
    if (!['ADMIN', 'CEO'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all API key settings from database
    const settings = await prisma.appSettings.findMany({
      where: {
        key: { in: API_KEY_SETTINGS.map(s => s.key) }
      }
    })

    // Build response with masked keys
    const response = API_KEY_SETTINGS.map(setting => {
      const dbSetting = settings.find(s => s.key === setting.key)
      const envValue = process.env[setting.key]
      
      let value = ''
      let source: 'database' | 'environment' | 'not_set' = 'not_set'
      let masked = ''
      
      if (dbSetting) {
        // Decrypt if encrypted
        value = dbSetting.isEncrypted ? decrypt(dbSetting.value) : dbSetting.value
        source = 'database'
        masked = setting.key === 'AWS_REGION' ? value : maskKey(value)
      } else if (envValue) {
        value = envValue
        source = 'environment'
        masked = setting.key === 'AWS_REGION' ? value : maskKey(value)
      }
      
      return {
        key: setting.key,
        label: setting.label,
        description: setting.description,
        isSet: !!value,
        source,
        maskedValue: masked,
        isSecret: setting.key !== 'AWS_REGION',
      }
    })

    return NextResponse.json({ settings: response })
  } catch (error) {
    console.error('Error fetching API keys:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can update API keys
    if (!['ADMIN', 'CEO'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { key, value } = body

    // Validate the key is allowed
    const settingConfig = API_KEY_SETTINGS.find(s => s.key === key)
    if (!settingConfig) {
      return NextResponse.json({ error: 'Invalid setting key' }, { status: 400 })
    }

    // Delete if value is empty
    if (!value || value.trim() === '') {
      await prisma.appSettings.deleteMany({ where: { key } })
      return NextResponse.json({ success: true, message: 'API key removed' })
    }

    // Encrypt sensitive values
    const isSecret = key !== 'AWS_REGION'
    const storedValue = isSecret ? encrypt(value) : value

    // Upsert the setting
    await prisma.appSettings.upsert({
      where: { key },
      create: {
        key,
        value: storedValue,
        isEncrypted: isSecret,
        description: settingConfig.description,
      },
      update: {
        value: storedValue,
        isEncrypted: isSecret,
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'API key saved',
      maskedValue: isSecret ? maskKey(value) : value
    })
  } catch (error) {
    console.error('Error saving API key:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['ADMIN', 'CEO'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key || !API_KEY_SETTINGS.find(s => s.key === key)) {
      return NextResponse.json({ error: 'Invalid key' }, { status: 400 })
    }

    await prisma.appSettings.deleteMany({ where: { key } })

    return NextResponse.json({ success: true, message: 'API key removed' })
  } catch (error) {
    console.error('Error deleting API key:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
