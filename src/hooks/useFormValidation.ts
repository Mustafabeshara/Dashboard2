/**
 * Form Validation Hook
 * Comprehensive form validation with real-time feedback and error messages
 */
import { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';

export type ValidationRule = {
  required?: boolean | string;
  minLength?: number | { value: number; message: string };
  maxLength?: number | { value: number; message: string };
  min?: number | { value: number; message: string };
  max?: number | { value: number; message: string };
  pattern?: RegExp | { value: RegExp; message: string };
  email?: boolean | string;
  url?: boolean | string;
  phone?: boolean | string;
  custom?: (value: unknown, formValues: Record<string, unknown>) => string | null;
};

export type FieldConfig<T = unknown> = {
  initialValue: T;
  rules?: ValidationRule;
  transform?: (value: unknown) => T;
};

export type FormConfig = Record<string, FieldConfig>;

export type FormErrors = Record<string, string>;
export type FormTouched = Record<string, boolean>;
export type FormValues = Record<string, unknown>;

export interface UseFormValidationReturn<T extends FormConfig> {
  values: { [K in keyof T]: T[K]['initialValue'] };
  errors: FormErrors;
  touched: FormTouched;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
  setValue: (field: keyof T, value: unknown) => void;
  setValues: (values: Partial<{ [K in keyof T]: T[K]['initialValue'] }>) => void;
  setTouched: (field: keyof T, isTouched?: boolean) => void;
  setError: (field: keyof T, error: string) => void;
  clearError: (field: keyof T) => void;
  clearErrors: () => void;
  validateField: (field: keyof T) => string | null;
  validateForm: () => boolean;
  handleBlur: (field: keyof T) => () => void;
  handleChange: (field: keyof T) => (value: unknown) => void;
  handleInputChange: (field: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  reset: () => void;
  setSubmitting: (isSubmitting: boolean) => void;
  getFieldProps: (field: keyof T) => {
    value: unknown;
    onChange: (value: unknown) => void;
    onBlur: () => void;
    error: string | undefined;
    required: boolean;
    isValid: boolean;
  };
}

// Email regex pattern
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// URL regex pattern
const URL_PATTERN = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;

// Phone regex pattern (Kuwait and international)
const PHONE_PATTERN = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;

function getMinLengthValue(rule: ValidationRule['minLength']): number | undefined {
  if (typeof rule === 'number') return rule;
  if (typeof rule === 'object') return rule.value;
  return undefined;
}

function getMaxLengthValue(rule: ValidationRule['maxLength']): number | undefined {
  if (typeof rule === 'number') return rule;
  if (typeof rule === 'object') return rule.value;
  return undefined;
}

function getMinValue(rule: ValidationRule['min']): number | undefined {
  if (typeof rule === 'number') return rule;
  if (typeof rule === 'object') return rule.value;
  return undefined;
}

function getMaxValue(rule: ValidationRule['max']): number | undefined {
  if (typeof rule === 'number') return rule;
  if (typeof rule === 'object') return rule.value;
  return undefined;
}

function getPatternValue(rule: ValidationRule['pattern']): RegExp | undefined {
  if (rule instanceof RegExp) return rule;
  if (typeof rule === 'object' && 'value' in rule) return rule.value;
  return undefined;
}

function validateFieldValue(
  value: unknown,
  rules: ValidationRule,
  formValues: FormValues,
  fieldName: string
): string | null {
  const stringValue = value != null ? String(value) : '';
  const isEmpty = stringValue.trim() === '' || value === null || value === undefined;

  // Required check
  if (rules.required) {
    if (isEmpty) {
      const message = typeof rules.required === 'string'
        ? rules.required
        : `${formatFieldName(fieldName)} is required`;
      return message;
    }
  }

  // Skip other validations if empty and not required
  if (isEmpty) return null;

  // Email validation
  if (rules.email) {
    if (!EMAIL_PATTERN.test(stringValue)) {
      const message = typeof rules.email === 'string'
        ? rules.email
        : 'Please enter a valid email address';
      return message;
    }
  }

  // URL validation
  if (rules.url) {
    if (!URL_PATTERN.test(stringValue)) {
      const message = typeof rules.url === 'string'
        ? rules.url
        : 'Please enter a valid URL';
      return message;
    }
  }

  // Phone validation
  if (rules.phone) {
    if (!PHONE_PATTERN.test(stringValue.replace(/\s/g, ''))) {
      const message = typeof rules.phone === 'string'
        ? rules.phone
        : 'Please enter a valid phone number';
      return message;
    }
  }

  // Min length
  const minLength = getMinLengthValue(rules.minLength);
  if (minLength !== undefined && stringValue.length < minLength) {
    const message = typeof rules.minLength === 'object' && 'message' in rules.minLength
      ? rules.minLength.message
      : `${formatFieldName(fieldName)} must be at least ${minLength} characters`;
    return message;
  }

  // Max length
  const maxLength = getMaxLengthValue(rules.maxLength);
  if (maxLength !== undefined && stringValue.length > maxLength) {
    const message = typeof rules.maxLength === 'object' && 'message' in rules.maxLength
      ? rules.maxLength.message
      : `${formatFieldName(fieldName)} must be at most ${maxLength} characters`;
    return message;
  }

  // Numeric validations
  if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)))) {
    const numValue = Number(value);

    // Min value
    const minVal = getMinValue(rules.min);
    if (minVal !== undefined && numValue < minVal) {
      const message = typeof rules.min === 'object' && 'message' in rules.min
        ? rules.min.message
        : `${formatFieldName(fieldName)} must be at least ${minVal}`;
      return message;
    }

    // Max value
    const maxVal = getMaxValue(rules.max);
    if (maxVal !== undefined && numValue > maxVal) {
      const message = typeof rules.max === 'object' && 'message' in rules.max
        ? rules.max.message
        : `${formatFieldName(fieldName)} must be at most ${maxVal}`;
      return message;
    }
  }

  // Pattern validation
  const pattern = getPatternValue(rules.pattern);
  if (pattern && !pattern.test(stringValue)) {
    const message = typeof rules.pattern === 'object' && 'message' in rules.pattern
      ? rules.pattern.message
      : `${formatFieldName(fieldName)} has an invalid format`;
    return message;
  }

  // Custom validation
  if (rules.custom) {
    const customError = rules.custom(value, formValues);
    if (customError) return customError;
  }

  return null;
}

function formatFieldName(fieldName: string): string {
  // Convert camelCase to Title Case with spaces
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export function useFormValidation<T extends FormConfig>(
  config: T
): UseFormValidationReturn<T> {
  // Initialize values from config
  const initialValues = useMemo(() => {
    const values: FormValues = {};
    for (const [key, fieldConfig] of Object.entries(config)) {
      values[key] = fieldConfig.initialValue;
    }
    return values as { [K in keyof T]: T[K]['initialValue'] };
  }, [config]);

  const [values, setValuesState] = useState<{ [K in keyof T]: T[K]['initialValue'] }>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouchedState] = useState<FormTouched>({});
  const [isSubmitting, setSubmitting] = useState(false);

  // Check if form is dirty
  const isDirty = useMemo(() => {
    return Object.keys(values).some(
      (key) => values[key as keyof T] !== initialValues[key as keyof T]
    );
  }, [values, initialValues]);

  // Validate a single field
  const validateField = useCallback(
    (field: keyof T): string | null => {
      const fieldConfig = config[field as string];
      if (!fieldConfig || !fieldConfig.rules) return null;

      return validateFieldValue(
        values[field],
        fieldConfig.rules,
        values as FormValues,
        String(field)
      );
    },
    [config, values]
  );

  // Validate entire form
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    const newTouched: FormTouched = {};
    let isValid = true;

    for (const field of Object.keys(config)) {
      newTouched[field] = true;
      const error = validateField(field as keyof T);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    setTouchedState(newTouched);
    return isValid;
  }, [config, validateField]);

  // Check if form is valid
  const isValid = useMemo(() => {
    for (const field of Object.keys(config)) {
      const error = validateField(field as keyof T);
      if (error) return false;
    }
    return true;
  }, [config, validateField]);

  // Set single value
  const setValue = useCallback(
    (field: keyof T, value: unknown) => {
      const fieldConfig = config[field as string];
      const transformedValue = fieldConfig?.transform ? fieldConfig.transform(value) : value;

      setValuesState((prev) => ({ ...prev, [field]: transformedValue }));

      // Clear error when user types
      if (errors[field as string]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field as string];
          return newErrors;
        });
      }
    },
    [config, errors]
  );

  // Set multiple values
  const setValues = useCallback(
    (newValues: Partial<{ [K in keyof T]: T[K]['initialValue'] }>) => {
      setValuesState((prev) => ({ ...prev, ...newValues }));
    },
    []
  );

  // Set touched state
  const setTouched = useCallback((field: keyof T, isTouched = true) => {
    setTouchedState((prev) => ({ ...prev, [field]: isTouched }));
  }, []);

  // Set error manually
  const setError = useCallback((field: keyof T, error: string) => {
    setErrors((prev) => ({ ...prev, [field]: error }));
  }, []);

  // Clear single error
  const clearError = useCallback((field: keyof T) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field as string];
      return newErrors;
    });
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Handle blur - validate on blur
  const handleBlur = useCallback(
    (field: keyof T) => () => {
      setTouched(field, true);
      const error = validateField(field);
      if (error) {
        setError(field, error);
      } else {
        clearError(field);
      }
    },
    [setTouched, validateField, setError, clearError]
  );

  // Handle change
  const handleChange = useCallback(
    (field: keyof T) => (value: unknown) => {
      setValue(field, value);
    },
    [setValue]
  );

  // Handle input change (from native events)
  const handleInputChange = useCallback(
    (field: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { type, value } = e.target;
      const checkbox = e.target as HTMLInputElement;

      let newValue: unknown;
      if (type === 'checkbox') {
        newValue = checkbox.checked;
      } else if (type === 'number') {
        newValue = value === '' ? '' : Number(value);
      } else {
        newValue = value;
      }

      setValue(field, newValue);
    },
    [setValue]
  );

  // Reset form
  const reset = useCallback(() => {
    setValuesState(initialValues);
    setErrors({});
    setTouchedState({});
    setSubmitting(false);
  }, [initialValues]);

  // Get field props for easy binding
  const getFieldProps = useCallback(
    (field: keyof T) => {
      const fieldConfig = config[field as string];
      const isRequired = Boolean(fieldConfig?.rules?.required);
      const error = touched[field as string] ? errors[field as string] : undefined;
      const fieldIsValid = touched[field as string] && !error && values[field] !== '' && values[field] != null;

      return {
        value: values[field],
        onChange: handleChange(field),
        onBlur: handleBlur(field),
        error,
        required: isRequired,
        isValid: fieldIsValid,
      };
    },
    [config, values, errors, touched, handleChange, handleBlur]
  );

  return {
    values,
    errors,
    touched,
    isValid,
    isSubmitting,
    isDirty,
    setValue,
    setValues,
    setTouched,
    setError,
    clearError,
    clearErrors,
    validateField,
    validateForm,
    handleBlur,
    handleChange,
    handleInputChange,
    reset,
    setSubmitting,
    getFieldProps,
  };
}

// Pre-built validation schemas for common entities
export const customerValidation = {
  name: {
    initialValue: '',
    rules: {
      required: 'Customer name is required',
      minLength: { value: 2, message: 'Customer name must be at least 2 characters' },
      maxLength: { value: 200, message: 'Customer name must be at most 200 characters' },
    },
  },
  type: {
    initialValue: 'GOVERNMENT',
    rules: {
      required: 'Customer type is required',
    },
  },
  registrationNumber: {
    initialValue: '',
    rules: {
      maxLength: { value: 50, message: 'Registration number must be at most 50 characters' },
    },
  },
  taxId: {
    initialValue: '',
    rules: {
      maxLength: { value: 50, message: 'Tax ID must be at most 50 characters' },
    },
  },
  email: {
    initialValue: '',
    rules: {
      email: 'Please enter a valid email address',
      maxLength: { value: 100, message: 'Email must be at most 100 characters' },
    },
  },
  phone: {
    initialValue: '',
    rules: {
      phone: 'Please enter a valid phone number',
      maxLength: { value: 50, message: 'Phone number must be at most 50 characters' },
    },
  },
  address: {
    initialValue: '',
    rules: {
      maxLength: { value: 500, message: 'Address must be at most 500 characters' },
    },
  },
  city: {
    initialValue: '',
    rules: {
      maxLength: { value: 100, message: 'City must be at most 100 characters' },
    },
  },
  country: {
    initialValue: 'Kuwait',
    rules: {
      maxLength: { value: 100, message: 'Country must be at most 100 characters' },
    },
  },
  primaryContact: {
    initialValue: '',
    rules: {
      maxLength: { value: 100, message: 'Contact name must be at most 100 characters' },
    },
  },
  paymentTerms: {
    initialValue: '',
    rules: {
      maxLength: { value: 200, message: 'Payment terms must be at most 200 characters' },
    },
  },
  creditLimit: {
    initialValue: '',
    rules: {
      min: { value: 0, message: 'Credit limit cannot be negative' },
    },
    transform: (value: unknown) => (value === '' ? '' : Number(value)),
  },
} as const;

export const supplierValidation = {
  name: {
    initialValue: '',
    rules: {
      required: 'Supplier name is required',
      minLength: { value: 2, message: 'Supplier name must be at least 2 characters' },
      maxLength: { value: 200, message: 'Supplier name must be at most 200 characters' },
    },
  },
  code: {
    initialValue: '',
    rules: {
      maxLength: { value: 50, message: 'Supplier code must be at most 50 characters' },
    },
  },
  category: {
    initialValue: '',
    rules: {
      maxLength: { value: 100, message: 'Category must be at most 100 characters' },
    },
  },
  contactPerson: {
    initialValue: '',
    rules: {
      maxLength: { value: 100, message: 'Contact name must be at most 100 characters' },
    },
  },
  email: {
    initialValue: '',
    rules: {
      email: 'Please enter a valid email address',
      maxLength: { value: 100, message: 'Email must be at most 100 characters' },
    },
  },
  phone: {
    initialValue: '',
    rules: {
      phone: 'Please enter a valid phone number',
      maxLength: { value: 50, message: 'Phone number must be at most 50 characters' },
    },
  },
  address: {
    initialValue: '',
    rules: {
      maxLength: { value: 500, message: 'Address must be at most 500 characters' },
    },
  },
  city: {
    initialValue: '',
    rules: {
      maxLength: { value: 100, message: 'City must be at most 100 characters' },
    },
  },
  country: {
    initialValue: 'Kuwait',
    rules: {
      maxLength: { value: 100, message: 'Country must be at most 100 characters' },
    },
  },
  website: {
    initialValue: '',
    rules: {
      url: 'Please enter a valid URL',
      maxLength: { value: 200, message: 'Website must be at most 200 characters' },
    },
  },
  taxId: {
    initialValue: '',
    rules: {
      maxLength: { value: 50, message: 'Tax ID must be at most 50 characters' },
    },
  },
  registrationNumber: {
    initialValue: '',
    rules: {
      maxLength: { value: 50, message: 'Registration number must be at most 50 characters' },
    },
  },
  paymentTerms: {
    initialValue: 'Net 30',
    rules: {
      maxLength: { value: 200, message: 'Payment terms must be at most 200 characters' },
    },
  },
  leadTime: {
    initialValue: '',
    rules: {
      min: { value: 0, message: 'Lead time cannot be negative' },
    },
    transform: (value: unknown) => (value === '' ? '' : Number(value)),
  },
  rating: {
    initialValue: '',
    rules: {
      min: { value: 0, message: 'Rating must be at least 0' },
      max: { value: 5, message: 'Rating must be at most 5' },
    },
    transform: (value: unknown) => (value === '' ? '' : Number(value)),
  },
  notes: {
    initialValue: '',
    rules: {
      maxLength: { value: 2000, message: 'Notes must be at most 2000 characters' },
    },
  },
} as const;

export const tenderValidation = {
  tenderNumber: {
    initialValue: '',
    rules: {
      required: 'Tender number is required',
      maxLength: { value: 50, message: 'Tender number must be at most 50 characters' },
    },
  },
  title: {
    initialValue: '',
    rules: {
      required: 'Tender title is required',
      minLength: { value: 5, message: 'Title must be at least 5 characters' },
      maxLength: { value: 300, message: 'Title must be at most 300 characters' },
    },
  },
  description: {
    initialValue: '',
    rules: {
      maxLength: { value: 5000, message: 'Description must be at most 5000 characters' },
    },
  },
  department: {
    initialValue: '',
    rules: {
      maxLength: { value: 100, message: 'Department must be at most 100 characters' },
    },
  },
  category: {
    initialValue: '',
    rules: {
      maxLength: { value: 100, message: 'Category must be at most 100 characters' },
    },
  },
  submissionDeadline: {
    initialValue: '',
    rules: {
      required: 'Submission deadline is required',
      custom: (value: unknown) => {
        if (!value) return null;
        const date = new Date(String(value));
        if (date < new Date()) {
          return 'Submission deadline must be in the future';
        }
        return null;
      },
    },
  },
  openingDate: {
    initialValue: '',
    rules: {
      custom: (value: unknown, formValues: Record<string, unknown>) => {
        if (!value) return null;
        const openingDate = new Date(String(value));
        const deadline = formValues.submissionDeadline ? new Date(String(formValues.submissionDeadline)) : null;
        if (deadline && openingDate < deadline) {
          return 'Opening date must be after submission deadline';
        }
        return null;
      },
    },
  },
  estimatedValue: {
    initialValue: 0,
    rules: {
      min: { value: 0, message: 'Estimated value cannot be negative' },
    },
    transform: (value: unknown) => (value === '' ? 0 : Number(value)),
  },
  currency: {
    initialValue: 'KWD',
    rules: {
      required: 'Currency is required',
    },
  },
  bondAmount: {
    initialValue: 0,
    rules: {
      min: { value: 0, message: 'Bond amount cannot be negative' },
    },
    transform: (value: unknown) => (value === '' ? 0 : Number(value)),
  },
} as const;

export default useFormValidation;
