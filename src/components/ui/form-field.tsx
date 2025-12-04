/**
 * Form Field Component
 * Reusable form field with label, validation, error messages, and required indicator
 */
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

export interface FormFieldProps {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'datetime-local' | 'tel' | 'url' | 'textarea';
  value: string | number;
  onChange: (value: string | number) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  rows?: number;
  maxLength?: number;
  pattern?: string;
  autoComplete?: string;
  showSuccessIcon?: boolean;
  isValid?: boolean;
}

export function FormField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  error,
  hint,
  disabled = false,
  className,
  inputClassName,
  min,
  max,
  step,
  rows = 3,
  maxLength,
  pattern,
  autoComplete,
  showSuccessIcon = false,
  isValid,
}: FormFieldProps) {
  const hasError = Boolean(error);
  const showSuccess = showSuccessIcon && isValid && !hasError && value;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value;
    onChange(newValue);
  };

  const inputProps = {
    id,
    name: id,
    value: value ?? '',
    onChange: handleChange,
    onBlur,
    placeholder,
    disabled,
    required,
    'aria-invalid': hasError,
    'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
    className: cn(
      inputClassName,
      hasError && 'border-red-500 focus-visible:ring-red-500',
      showSuccess && 'border-green-500 focus-visible:ring-green-500'
    ),
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="flex items-center gap-1">
        {label}
        {required && (
          <span className="text-red-500 font-medium" aria-hidden="true">
            *
          </span>
        )}
      </Label>

      <div className="relative">
        {type === 'textarea' ? (
          <Textarea {...inputProps} rows={rows} maxLength={maxLength} />
        ) : (
          <Input
            {...inputProps}
            type={type}
            min={min}
            max={max}
            step={step}
            maxLength={maxLength}
            pattern={pattern}
            autoComplete={autoComplete}
          />
        )}

        {/* Status icons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {hasError && <AlertCircle className="h-4 w-4 text-red-500" />}
          {showSuccess && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        </div>
      </div>

      {/* Error message */}
      {hasError && (
        <p id={`${id}-error`} className="text-sm text-red-500 flex items-center gap-1" role="alert">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {error}
        </p>
      )}

      {/* Hint text */}
      {hint && !hasError && (
        <p id={`${id}-hint`} className="text-sm text-gray-500 flex items-center gap-1">
          <Info className="h-3 w-3 flex-shrink-0" />
          {hint}
        </p>
      )}
    </div>
  );
}

// Select Field Component
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  onBlur,
  options,
  placeholder = 'Select an option',
  required = false,
  error,
  hint,
  disabled = false,
  className,
}: SelectFieldProps) {
  const hasError = Boolean(error);

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="flex items-center gap-1">
        {label}
        {required && (
          <span className="text-red-500 font-medium" aria-hidden="true">
            *
          </span>
        )}
      </Label>

      <div className="relative">
        <select
          id={id}
          name={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          aria-invalid={hasError}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cn(
            'flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50',
            hasError && 'border-red-500 focus-visible:ring-red-500'
          )}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>

        {hasError && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
            <AlertCircle className="h-4 w-4 text-red-500" />
          </div>
        )}
      </div>

      {hasError && (
        <p id={`${id}-error`} className="text-sm text-red-500 flex items-center gap-1" role="alert">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {error}
        </p>
      )}

      {hint && !hasError && (
        <p id={`${id}-hint`} className="text-sm text-gray-500 flex items-center gap-1">
          <Info className="h-3 w-3 flex-shrink-0" />
          {hint}
        </p>
      )}
    </div>
  );
}

// Checkbox Field Component
export interface CheckboxFieldProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function CheckboxField({
  id,
  label,
  checked,
  onChange,
  description,
  error,
  disabled = false,
  className,
}: CheckboxFieldProps) {
  const hasError = Boolean(error);

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id={id}
          name={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          aria-invalid={hasError}
          className={cn(
            'h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50',
            hasError && 'border-red-500'
          )}
        />
        <div className="space-y-0.5">
          <Label htmlFor={id} className="cursor-pointer">
            {label}
          </Label>
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
      </div>

      {hasError && (
        <p className="text-sm text-red-500 flex items-center gap-1" role="alert">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

// Currency Input Field
export interface CurrencyFieldProps extends Omit<FormFieldProps, 'type'> {
  currency?: string;
}

export function CurrencyField({ currency = 'KWD', ...props }: CurrencyFieldProps) {
  return (
    <div className="relative">
      <FormField {...props} type="number" min={0} step={0.001} />
      <span className="absolute right-8 top-[2.1rem] text-sm text-gray-500 pointer-events-none">
        {currency}
      </span>
    </div>
  );
}

// Date Range Field
export interface DateRangeFieldProps {
  startId: string;
  endId: string;
  startLabel: string;
  endLabel: string;
  startValue: string;
  endValue: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  startRequired?: boolean;
  endRequired?: boolean;
  startError?: string;
  endError?: string;
  className?: string;
}

export function DateRangeField({
  startId,
  endId,
  startLabel,
  endLabel,
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  startRequired = false,
  endRequired = false,
  startError,
  endError,
  className,
}: DateRangeFieldProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-4', className)}>
      <FormField
        id={startId}
        label={startLabel}
        type="date"
        value={startValue}
        onChange={(v) => onStartChange(String(v))}
        required={startRequired}
        error={startError}
      />
      <FormField
        id={endId}
        label={endLabel}
        type="date"
        value={endValue}
        onChange={(v) => onEndChange(String(v))}
        required={endRequired}
        error={endError}
        min={startValue}
      />
    </div>
  );
}
