/**
 * Extraction Validation Utilities
 * Comprehensive validation for extracted data
 */

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  score: number // 0-100
}

export interface ValidationError {
  field: string
  message: string
  severity: 'critical' | 'high' | 'medium'
}

export interface ValidationWarning {
  field: string
  message: string
  suggestion?: string
}

/**
 * Validate tender reference number format
 */
export function validateTenderReference(reference: string): ValidationError | null {
  if (!reference || reference.trim() === '') {
    return {
      field: 'reference',
      message: 'Tender reference number is required',
      severity: 'critical',
    }
  }

  // Check minimum length
  if (reference.length < 3) {
    return {
      field: 'reference',
      message: 'Tender reference number is too short',
      severity: 'high',
    }
  }

  // Check for suspicious patterns
  if (/^[0-9]+$/.test(reference) && reference.length < 5) {
    return {
      field: 'reference',
      message: 'Tender reference appears incomplete (only numbers)',
      severity: 'medium',
    }
  }

  return null
}

/**
 * Validate date format and reasonableness
 */
export function validateDate(
  dateString: string,
  fieldName: string
): ValidationError | null {
  if (!dateString || dateString.trim() === '') {
    return {
      field: fieldName,
      message: `${fieldName} is required`,
      severity: 'critical',
    }
  }

  // Try to parse date
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    return {
      field: fieldName,
      message: `${fieldName} is not a valid date`,
      severity: 'critical',
    }
  }

  // Check if date is in the past (for closing dates)
  if (fieldName.toLowerCase().includes('closing') || fieldName.toLowerCase().includes('deadline')) {
    const now = new Date()
    if (date < now) {
      return {
        field: fieldName,
        message: `${fieldName} is in the past`,
        severity: 'high',
      }
    }

    // Check if date is too far in the future (more than 2 years)
    const twoYearsFromNow = new Date()
    twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2)
    if (date > twoYearsFromNow) {
      return {
        field: fieldName,
        message: `${fieldName} is more than 2 years in the future`,
        severity: 'medium',
      }
    }
  }

  return null
}

/**
 * Validate items array
 */
export function validateItems(
  items: Array<{ itemDescription: string; quantity: number; unit: string }>
): ValidationError[] {
  const errors: ValidationError[] = []

  if (!items || items.length === 0) {
    errors.push({
      field: 'items',
      message: 'At least one item is required',
      severity: 'critical',
    })
    return errors
  }

  items.forEach((item, index) => {
    if (!item.itemDescription || item.itemDescription.trim() === '') {
      errors.push({
        field: `items[${index}].itemDescription`,
        message: `Item ${index + 1}: Description is required`,
        severity: 'high',
      })
    }

    if (!item.quantity || item.quantity <= 0) {
      errors.push({
        field: `items[${index}].quantity`,
        message: `Item ${index + 1}: Quantity must be greater than 0`,
        severity: 'high',
      })
    }

    if (!item.unit || item.unit.trim() === '') {
      errors.push({
        field: `items[${index}].unit`,
        message: `Item ${index + 1}: Unit is required`,
        severity: 'medium',
      })
    }
  })

  return errors
}

/**
 * Generate warnings based on confidence scores
 */
export function generateConfidenceWarnings(confidence: {
  overall: number
  reference: number
  title: number
  organization: number
  closingDate: number
  items: number
}): ValidationWarning[] {
  const warnings: ValidationWarning[] = []

  if (confidence.overall < 0.5) {
    warnings.push({
      field: 'overall',
      message: 'Overall extraction confidence is very low',
      suggestion: 'Consider re-uploading a clearer document or entering data manually',
    })
  }

  if (confidence.reference < 0.6) {
    warnings.push({
      field: 'reference',
      message: 'Tender reference number has low confidence',
      suggestion: 'Verify the reference number against the original document',
    })
  }

  if (confidence.title < 0.6) {
    warnings.push({
      field: 'title',
      message: 'Tender title has low confidence',
      suggestion: 'Check if the title is complete and accurate',
    })
  }

  if (confidence.organization < 0.6) {
    warnings.push({
      field: 'organization',
      message: 'Organization name has low confidence',
      suggestion: 'Verify the organization name is correct',
    })
  }

  if (confidence.closingDate < 0.6) {
    warnings.push({
      field: 'closingDate',
      message: 'Closing date has low confidence',
      suggestion: 'Double-check the closing date against the document',
    })
  }

  if (confidence.items < 0.5) {
    warnings.push({
      field: 'items',
      message: 'Items extraction has low confidence',
      suggestion: 'Review all items carefully for accuracy and completeness',
    })
  }

  return warnings
}

/**
 * Comprehensive validation of tender extraction
 */
export function validateTenderExtraction(data: {
  reference: string
  title: string
  organization: string
  closingDate: string
  items: Array<{ itemDescription: string; quantity: number; unit: string }>
  confidence?: {
    overall: number
    reference: number
    title: number
    organization: number
    closingDate: number
    items: number
  }
}): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Validate reference
  const refError = validateTenderReference(data.reference)
  if (refError) errors.push(refError)

  // Validate title
  if (!data.title || data.title.trim() === '') {
    errors.push({
      field: 'title',
      message: 'Tender title is required',
      severity: 'critical',
    })
  } else if (data.title.length < 10) {
    warnings.push({
      field: 'title',
      message: 'Tender title seems very short',
      suggestion: 'Verify the title is complete',
    })
  }

  // Validate organization
  if (!data.organization || data.organization.trim() === '') {
    errors.push({
      field: 'organization',
      message: 'Issuing organization is required',
      severity: 'critical',
    })
  }

  // Validate closing date
  const dateError = validateDate(data.closingDate, 'closingDate')
  if (dateError) errors.push(dateError)

  // Validate items
  const itemErrors = validateItems(data.items)
  errors.push(...itemErrors)

  // Generate confidence warnings
  if (data.confidence) {
    const confidenceWarnings = generateConfidenceWarnings(data.confidence)
    warnings.push(...confidenceWarnings)
  }

  // Calculate validation score
  let score = 100

  // Deduct for errors
  errors.forEach((error) => {
    switch (error.severity) {
      case 'critical':
        score -= 30
        break
      case 'high':
        score -= 15
        break
      case 'medium':
        score -= 5
        break
    }
  })

  // Deduct for warnings
  score -= warnings.length * 3

  // Factor in confidence
  if (data.confidence) {
    const confidencePenalty = (1 - data.confidence.overall) * 20
    score -= confidencePenalty
  }

  score = Math.max(0, Math.min(100, score))

  return {
    isValid: errors.filter((e) => e.severity === 'critical').length === 0,
    errors,
    warnings,
    score: Math.round(score),
  }
}

/**
 * Check if extraction requires human review
 */
export function requiresHumanReview(validationResult: ValidationResult): boolean {
  // Critical errors always require review
  if (validationResult.errors.some((e) => e.severity === 'critical')) {
    return true
  }

  // Low validation score requires review
  if (validationResult.score < 70) {
    return true
  }

  // Multiple high-severity errors require review
  const highSeverityCount = validationResult.errors.filter(
    (e) => e.severity === 'high'
  ).length
  if (highSeverityCount >= 2) {
    return true
  }

  // Many warnings require review
  if (validationResult.warnings.length >= 3) {
    return true
  }

  return false
}
