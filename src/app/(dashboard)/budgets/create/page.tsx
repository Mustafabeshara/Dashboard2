/**
 * Budget Creation Wizard - 4-Step Form
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Save,
  Send,
  Building2,
  Calendar,
  Wallet,
  Settings,
  FileText,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn, formatCurrency } from '@/lib/utils'
import type { BudgetType, CategoryType } from '@/types'

// Validation schema
const budgetSchema = z.object({
  name: z.string().min(3, 'Budget name must be at least 3 characters'),
  fiscalYear: z.number().min(2020).max(2030),
  type: z.enum(['MASTER', 'DEPARTMENT', 'PROJECT', 'TENDER']),
  department: z.string().optional(),
  totalAmount: z.number().min(1000, 'Total amount must be at least 1,000 KWD'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  currency: z.string(),
  notes: z.string().optional(),
  categories: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1, 'Category name is required'),
      code: z.string().min(1, 'Category code is required'),
      type: z.enum(['REVENUE', 'EXPENSE', 'CAPITAL']),
      allocatedAmount: z.number().min(0),
      parentId: z.string().optional(),
      varianceThreshold: z.number().min(0).max(100),
      requiresApprovalOver: z.number().optional(),
      notes: z.string().optional(),
    })
  ),
})

type BudgetFormData = z.infer<typeof budgetSchema>

const steps = [
  { id: 1, title: 'Basic Information', description: 'Budget name and period', icon: FileText },
  { id: 2, title: 'Categories', description: 'Define budget categories', icon: Building2 },
  { id: 3, title: 'Allocations', description: 'Assign amounts', icon: Wallet },
  { id: 4, title: 'Review & Submit', description: 'Review and finalize', icon: Check },
]

const departmentOptions = [
  'Sales',
  'Marketing',
  'Operations',
  'Finance',
  'Warehouse',
  'Administration',
  'IT',
  'HR',
]

const defaultCategories = [
  { name: 'Operating Expenses', code: 'OE-0001', type: 'EXPENSE' as CategoryType },
  { name: 'Salaries & Wages', code: 'SW-0001', type: 'EXPENSE' as CategoryType },
  { name: 'Marketing & Advertising', code: 'MA-0001', type: 'EXPENSE' as CategoryType },
  { name: 'Inventory Purchases', code: 'IP-0001', type: 'EXPENSE' as CategoryType },
  { name: 'Travel & Entertainment', code: 'TE-0001', type: 'EXPENSE' as CategoryType },
  { name: 'Professional Services', code: 'PS-0001', type: 'EXPENSE' as CategoryType },
  { name: 'Capital Expenditure', code: 'CE-0001', type: 'CAPITAL' as CategoryType },
  { name: 'Sales Revenue', code: 'SR-0001', type: 'REVENUE' as CategoryType },
]

export default function CreateBudgetPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      name: '',
      fiscalYear: new Date().getFullYear(),
      type: 'DEPARTMENT',
      totalAmount: 0,
      startDate: '',
      endDate: '',
      currency: 'KWD',
      notes: '',
      categories: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'categories',
  })

  const watchedValues = watch()
  const totalAllocated = fields.reduce((sum, _, index) => {
    const amount = watchedValues.categories?.[index]?.allocatedAmount || 0
    return sum + amount
  }, 0)

  const remaining = watchedValues.totalAmount - totalAllocated

  const addDefaultCategories = () => {
    defaultCategories.forEach((cat) => {
      append({
        name: cat.name,
        code: cat.code,
        type: cat.type,
        allocatedAmount: 0,
        varianceThreshold: 10,
      })
    })
  }

  const onSubmit = async (data: BudgetFormData) => {
    setIsSubmitting(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))
      toast.success('Budget created successfully!')
      router.push('/budgets')
    } catch (error) {
      toast.error('Failed to create budget. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const saveDraft = async () => {
    setIsSubmitting(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast.success('Draft saved successfully!')
    } catch (error) {
      toast.error('Failed to save draft.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Create Budget</h1>
          <p className="text-gray-500">Set up a new budget with categories and allocations</p>
        </div>
        <Button variant="outline" onClick={saveDraft} disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          Save Draft
        </Button>
      </div>

      {/* Step Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon
              const isCompleted = currentStep > step.id
              const isCurrent = currentStep === step.id

              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors',
                        isCompleted
                          ? 'bg-green-600 border-green-600 text-white'
                          : isCurrent
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-300 text-gray-400'
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <StepIcon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <p
                        className={cn(
                          'text-sm font-medium',
                          isCurrent ? 'text-blue-600' : 'text-gray-500'
                        )}
                      >
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-400 hidden sm:block">{step.description}</p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'w-16 md:w-24 h-0.5 mx-2',
                        isCompleted ? 'bg-green-600' : 'bg-gray-200'
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Form Steps */}
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Enter the budget details and period</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Budget Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., FY 2024 Sales Budget"
                    error={!!errors.name}
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fiscalYear">Fiscal Year *</Label>
                  <Select
                    value={watchedValues.fiscalYear?.toString()}
                    onValueChange={(v) => setValue('fiscalYear', parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {[2023, 2024, 2025, 2026].map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Budget Type *</Label>
                  <Select
                    value={watchedValues.type}
                    onValueChange={(v) => setValue('type', v as BudgetType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MASTER">Master Budget</SelectItem>
                      <SelectItem value="DEPARTMENT">Department Budget</SelectItem>
                      <SelectItem value="PROJECT">Project Budget</SelectItem>
                      <SelectItem value="TENDER">Tender Budget</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {watchedValues.type === 'DEPARTMENT' && (
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select
                      value={watchedValues.department}
                      onValueChange={(v) => setValue('department', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departmentOptions.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="totalAmount">Total Amount (KWD) *</Label>
                  <Input
                    id="totalAmount"
                    type="number"
                    placeholder="e.g., 500000"
                    error={!!errors.totalAmount}
                    {...register('totalAmount', { valueAsNumber: true })}
                  />
                  {errors.totalAmount && (
                    <p className="text-sm text-red-500">{errors.totalAmount.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={watchedValues.currency}
                    onValueChange={(v) => setValue('currency', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KWD">KWD - Kuwaiti Dinar</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    error={!!errors.startDate}
                    {...register('startDate')}
                  />
                  {errors.startDate && (
                    <p className="text-sm text-red-500">{errors.startDate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    error={!!errors.endDate}
                    {...register('endDate')}
                  />
                  {errors.endDate && (
                    <p className="text-sm text-red-500">{errors.endDate.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes about this budget..."
                  rows={3}
                  {...register('notes')}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Categories */}
        {currentStep === 2 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Budget Categories</CardTitle>
                <CardDescription>Define the categories for this budget</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addDefaultCategories}
                >
                  Add Default Categories
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      name: '',
                      code: '',
                      type: 'EXPENSE',
                      allocatedAmount: 0,
                      varianceThreshold: 10,
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Category
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {fields.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No categories added yet</p>
                  <p className="text-sm">Click &quot;Add Default Categories&quot; or add custom ones</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-12 gap-4 items-start p-4 border rounded-lg bg-gray-50"
                    >
                      <div className="col-span-4 space-y-2">
                        <Label>Name</Label>
                        <Input
                          placeholder="Category name"
                          {...register(`categories.${index}.name`)}
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label>Code</Label>
                        <Input
                          placeholder="XX-0000"
                          {...register(`categories.${index}.code`)}
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label>Type</Label>
                        <Select
                          value={watchedValues.categories?.[index]?.type}
                          onValueChange={(v) =>
                            setValue(`categories.${index}.type`, v as CategoryType)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EXPENSE">Expense</SelectItem>
                            <SelectItem value="REVENUE">Revenue</SelectItem>
                            <SelectItem value="CAPITAL">Capital</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3 space-y-2">
                        <Label>Variance Threshold (%)</Label>
                        <Input
                          type="number"
                          placeholder="10"
                          {...register(`categories.${index}.varianceThreshold`, {
                            valueAsNumber: true,
                          })}
                        />
                      </div>
                      <div className="col-span-1 flex items-end pb-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Allocations */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Budget Allocations</CardTitle>
              <CardDescription>Assign amounts to each category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Total Budget</span>
                  <span className="font-bold text-lg">
                    {formatCurrency(watchedValues.totalAmount || 0)}
                  </span>
                </div>
                <Progress
                  value={
                    watchedValues.totalAmount
                      ? (totalAllocated / watchedValues.totalAmount) * 100
                      : 0
                  }
                  className="h-3"
                  indicatorClassName={
                    totalAllocated > watchedValues.totalAmount ? 'bg-red-500' : 'bg-green-500'
                  }
                />
                <div className="flex items-center justify-between mt-2 text-sm">
                  <span>Allocated: {formatCurrency(totalAllocated)}</span>
                  <span
                    className={remaining < 0 ? 'text-red-600 font-medium' : 'text-gray-600'}
                  >
                    Remaining: {formatCurrency(remaining)}
                  </span>
                </div>
              </div>

              {fields.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No categories to allocate</p>
                  <p className="text-sm">Go back to Step 2 to add categories</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <Badge
                          variant={
                            watchedValues.categories?.[index]?.type === 'REVENUE'
                              ? 'success'
                              : watchedValues.categories?.[index]?.type === 'CAPITAL'
                              ? 'warning'
                              : 'secondary'
                          }
                        >
                          {watchedValues.categories?.[index]?.type}
                        </Badge>
                        <div>
                          <p className="font-medium">
                            {watchedValues.categories?.[index]?.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {watchedValues.categories?.[index]?.code}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">KWD</span>
                        <Input
                          type="number"
                          className="w-40 text-right"
                          placeholder="0"
                          {...register(`categories.${index}.allocatedAmount`, {
                            valueAsNumber: true,
                          })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Review & Submit</CardTitle>
              <CardDescription>Review the budget details before submitting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Budget Summary */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <h3 className="font-semibold">Budget Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <p className="font-medium">{watchedValues.name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <p className="font-medium">{watchedValues.type}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Fiscal Year:</span>
                    <p className="font-medium">{watchedValues.fiscalYear}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Department:</span>
                    <p className="font-medium">{watchedValues.department || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Period:</span>
                    <p className="font-medium">
                      {watchedValues.startDate} to {watchedValues.endDate}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Amount:</span>
                    <p className="font-medium text-lg text-blue-600">
                      {formatCurrency(watchedValues.totalAmount || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Categories Summary */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <h3 className="font-semibold">
                  Categories ({fields.length})
                </h3>
                {fields.length > 0 ? (
                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="flex items-center justify-between p-2 bg-white rounded border"
                      >
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">
                            {watchedValues.categories?.[index]?.type}
                          </Badge>
                          <span className="text-sm">
                            {watchedValues.categories?.[index]?.name}
                          </span>
                        </div>
                        <span className="font-medium text-sm">
                          {formatCurrency(
                            watchedValues.categories?.[index]?.allocatedAmount || 0
                          )}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="font-semibold">Total Allocated</span>
                      <span className="font-bold text-lg">
                        {formatCurrency(totalAllocated)}
                      </span>
                    </div>
                    {remaining !== 0 && (
                      <div
                        className={`flex items-center justify-between p-2 rounded ${
                          remaining < 0 ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
                        }`}
                      >
                        <span>Unallocated Amount</span>
                        <span className="font-medium">{formatCurrency(remaining)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No categories defined</p>
                )}
              </div>

              {/* Notes */}
              {watchedValues.notes && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-sm text-gray-600">{watchedValues.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex gap-2">
            {currentStep < 4 ? (
              <Button type="button" onClick={nextStep}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={saveDraft}>
                  <Save className="h-4 w-4 mr-2" />
                  Save as Draft
                </Button>
                <Button type="submit" disabled={isSubmitting} loading={isSubmitting}>
                  <Send className="h-4 w-4 mr-2" />
                  Submit for Approval
                </Button>
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
