/**
 * Validation Script for Environment Variables
 * Run with: npm run validate:env
 */

import { validateEnv, getEnvironmentInfo, getEnabledProviders } from './src/lib/env-validator'
import { validateAIProviders } from './src/lib/ai/config'

console.log('🔍 Validating environment configuration...\n')

try {
  // Validate environment variables
  const env = validateEnv()
  console.log('✅ Environment variables validated successfully\n')

  // Show environment info
  console.log('📊 Environment Information:')
  const envInfo = getEnvironmentInfo()
  console.log(JSON.stringify(envInfo, null, 2))
  console.log()

  // Show enabled AI providers
  console.log('🤖 Enabled AI Providers:')
  const providers = getEnabledProviders()
  if (providers.length > 0) {
    providers.forEach((p) => console.log(`  ✓ ${p}`))
  } else {
    console.log('  ⚠️  No AI providers configured')
  }
  console.log()

  // Validate AI provider API keys
  console.log('🔑 AI Provider Validation:')
  const aiValidation = validateAIProviders()
  if (aiValidation.valid.length > 0) {
    console.log(`  ✅ Valid providers: ${aiValidation.valid.join(', ')}`)
  }
  if (aiValidation.invalid.length > 0) {
    console.log(`  ⚠️  Invalid providers: ${aiValidation.invalid.join(', ')}`)
  }
  console.log()

  console.log('✅ All validations passed!')
  process.exit(0)
} catch (error) {
  console.error('\n❌ Validation failed!')
  if (error instanceof Error) {
    console.error(error.message)
  }
  process.exit(1)
}
