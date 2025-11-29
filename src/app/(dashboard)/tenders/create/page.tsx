/**
 * Create Tender Page
 * AI-enhanced tender creation with document extraction
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  Upload,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  AlertCircle,
  Building2,
  Calendar,
  DollarSign,
  Package,
  FileCheck,
  Edit3,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DocumentUpload } from '@/components/documents/document-upload'
import { cn, formatCurrency } from '@/lib/utils'

interface TenderProduct {
  id: string
  name: string
  description?: string
  specifications?: string
  quantity: number
  unit: string
  estimatedPrice?: number
}

interface TenderFormData {
  // Basic Info
  tenderNumber: string
  title: string
  description: string
  department: string
  category: string

  // Customer
  customerId: string
  customerName: string

  // Dates
  submissionDeadline: string
  openingDate: string

  // Financial
  estimatedValue: number
  currency: string
  bondRequired: boolean
  bondAmount: number

  // Requirements
  technicalRequirements: string
  commercialRequirements: string

  // Products
  products: TenderProduct[]

  // Documents
  documentIds: string[]
}

const STEPS = [
  { id: 'upload', title: 'Upload Documents', icon: Upload, description: 'Upload tender documents for AI extraction' },
  { id: 'review', title: 'Review Extraction', icon: Sparkles, description: 'Review and edit AI-extracted data' },
  { id: 'details', title: 'Tender Details', icon: FileText, description: 'Complete tender information' },
  { id: 'products', title: 'Products', icon: Package, description: 'Add products and quantities' },
  { id: 'confirm', title: 'Confirm', icon: FileCheck, description: 'Review and submit tender' },
]

const DEPARTMENTS = [
  'Cardiac Surgery',
  'Radiology',
  'Laboratory',
  'ICU',
  'Emergency',
  'Orthopedics',
  'Neurology',
  'General Surgery',
  'Pharmacy',
  'Other',
]

const CATEGORIES = [
  'Medical Equipment',
  'Medical Supplies',
  'Laboratory Reagents',
  'Imaging Equipment',
  'Surgical Instruments',
  'Consumables',
  'IT Equipment',
  'Furniture',
  'Other',
]

export default function CreateTenderPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractionComplete, setExtractionComplete] = useState(false)
  const [extractionConfidence, setExtractionConfidence] = useState(0)
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([])

  const [formData, setFormData] = useState<TenderFormData>({
    tenderNumber: '',
    title: '',
    description: '',
    department: '',
    category: '',
    customerId: '',
    customerName: '',
    submissionDeadline: '',
    openingDate: '',
    estimatedValue: 0,
    currency: 'KWD',
    bondRequired: false,
    bondAmount: 0,
    technicalRequirements: '',
    commercialRequirements: '',
    products: [],
    documentIds: [],
  })

  const updateFormData = (field: keyof TenderFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleExtractData = (documentId: string, data: Record<string, unknown>) => {
    setUploadedDocs((prev) => [...prev, documentId])

    // Map extracted data to form
    if (data.tenderNumber) updateFormData('tenderNumber', data.tenderNumber)
    if (data.title) updateFormData('title', data.title)
    if (data.department) updateFormData('department', data.department)
    if (data.submissionDeadline) updateFormData('submissionDeadline', data.submissionDeadline)
    if (data.openingDate) updateFormData('openingDate', data.openingDate)
    if (data.estimatedValue) updateFormData('estimatedValue', Number(data.estimatedValue))
    if (data.currency) updateFormData('currency', String(data.currency))
    if (data.bondRequired !== undefined) updateFormData('bondRequired', Boolean(data.bondRequired))
    if (data.bondAmount) updateFormData('bondAmount', Number(data.bondAmount))

    // Handle arrays
    if (Array.isArray(data.technicalRequirements)) {
      updateFormData('technicalRequirements', data.technicalRequirements.join('\n'))
    }
    if (Array.isArray(data.commercialRequirements)) {
      updateFormData('commercialRequirements', data.commercialRequirements.join('\n'))
    }

    // Handle products
    if (Array.isArray(data.products)) {
      const products: TenderProduct[] = data.products.map((p: Record<string, unknown>, idx: number) => ({
        id: `product-${idx}`,
        name: String(p.name || ''),
        description: p.description ? String(p.description) : undefined,
        specifications: p.specifications ? String(p.specifications) : undefined,
        quantity: Number(p.quantity) || 1,
        unit: String(p.unit || 'pcs'),
        estimatedPrice: p.estimatedPrice ? Number(p.estimatedPrice) : undefined,
      }))
      updateFormData('products', products)
    }

    if (data.confidence) {
      setExtractionConfidence(Number(data.confidence))
    }

    setExtractionComplete(true)
  }

  const handleUploadComplete = () => {
    if (uploadedDocs.length > 0) {
      updateFormData('documentIds', uploadedDocs)
    }
  }

  const addProduct = () => {
    const newProduct: TenderProduct = {
      id: `product-${Date.now()}`,
      name: '',
      quantity: 1,
      unit: 'pcs',
    }
    updateFormData('products', [...formData.products, newProduct])
  }

  const updateProduct = (id: string, field: keyof TenderProduct, value: unknown) => {
    const updatedProducts = formData.products.map((p) =>
      p.id === id ? { ...p, [field]: value } : p
    )
    updateFormData('products', updatedProducts)
  }

  const removeProduct = (id: string) => {
    updateFormData('products', formData.products.filter((p) => p.id !== id))
  }

  const handleSubmit = async () => {
    setIsProcessing(true)

    try {
      const response = await fetch('/api/tenders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        router.push('/tenders')
      }
    } catch (error) {
      console.error('Error creating tender:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Upload
        return true // Can skip upload
      case 1: // Review extraction
        return true // Can proceed without extraction
      case 2: // Details
        return formData.tenderNumber && formData.title && formData.submissionDeadline
      case 3: // Products
        return true // Products are optional
      case 4: // Confirm
        return true
      default:
        return false
    }
  }

  const nextStep = () => {
    if (currentStep < STEPS.length - 1 && canProceed()) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-7 w-7" />
          Create New Tender
        </h1>
        <p className="text-gray-500">
          Upload tender documents and let AI extract the details
        </p>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon
              const isActive = index === currentStep
              const isComplete = index < currentStep

              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors',
                        isComplete
                          ? 'bg-green-500 border-green-500 text-white'
                          : isActive
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'border-gray-300 text-gray-400'
                      )}
                    >
                      {isComplete ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <StepIcon className="h-5 w-5" />
                      )}
                    </div>
                    <span
                      className={cn(
                        'mt-2 text-xs font-medium',
                        isActive ? 'text-blue-600' : 'text-gray-500'
                      )}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={cn(
                        'w-20 h-0.5 mx-2',
                        index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => {
              const StepIcon = STEPS[currentStep].icon
              return <StepIcon className="h-5 w-5" />
            })()}
            {STEPS[currentStep].title}
          </CardTitle>
          <CardDescription>{STEPS[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 0: Upload Documents */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">AI-Powered Extraction</h4>
                    <p className="text-sm text-blue-700">
                      Upload your tender documents (PDF, images, Word) and our AI will automatically
                      extract tender details, products, and requirements. This is especially optimized
                      for MOH Kuwait tenders.
                    </p>
                  </div>
                </div>
              </div>

              <DocumentUpload
                moduleType="TENDER"
                onExtractData={handleExtractData}
                onUploadComplete={handleUploadComplete}
              />

              {extractionComplete && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <div className="flex-1">
                      <h4 className="font-medium text-green-900">Extraction Complete</h4>
                      <p className="text-sm text-green-700">
                        AI has extracted data from your documents with {extractionConfidence}% confidence.
                        Click "Next" to review the extracted information.
                      </p>
                    </div>
                    <Badge variant="success">{extractionConfidence}%</Badge>
                  </div>
                </div>
              )}

              <div className="text-center text-sm text-gray-500">
                Or you can skip this step and enter tender details manually
              </div>
            </div>
          )}

          {/* Step 1: Review Extraction */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {extractionComplete ? (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Edit3 className="h-5 w-5 text-amber-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-amber-900">Review Extracted Data</h4>
                        <p className="text-sm text-amber-700">
                          Please review the AI-extracted information below. You can edit any field
                          before proceeding. Fields highlighted need your attention.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Tender Number</label>
                      <Input
                        value={formData.tenderNumber}
                        onChange={(e) => updateFormData('tenderNumber', e.target.value)}
                        className={cn(!formData.tenderNumber && 'border-amber-400')}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Title</label>
                      <Input
                        value={formData.title}
                        onChange={(e) => updateFormData('title', e.target.value)}
                        className={cn(!formData.title && 'border-amber-400')}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Department</label>
                      <Input
                        value={formData.department}
                        onChange={(e) => updateFormData('department', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Submission Deadline</label>
                      <Input
                        type="date"
                        value={formData.submissionDeadline ? formData.submissionDeadline.split('T')[0] : ''}
                        onChange={(e) => updateFormData('submissionDeadline', e.target.value)}
                        className={cn(!formData.submissionDeadline && 'border-amber-400')}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Estimated Value</label>
                      <Input
                        type="number"
                        value={formData.estimatedValue || ''}
                        onChange={(e) => updateFormData('estimatedValue', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Currency</label>
                      <Select
                        value={formData.currency}
                        onValueChange={(v) => updateFormData('currency', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="KWD">KWD</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.products.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Extracted Products ({formData.products.length})</h4>
                      <div className="border rounded-lg divide-y">
                        {formData.products.slice(0, 5).map((product) => (
                          <div key={product.id} className="p-3 flex justify-between items-center">
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-gray-500">
                                Qty: {product.quantity} {product.unit}
                              </p>
                            </div>
                            {product.estimatedPrice && (
                              <span className="text-sm font-medium">
                                {formatCurrency(product.estimatedPrice, formData.currency)}
                              </span>
                            )}
                          </div>
                        ))}
                        {formData.products.length > 5 && (
                          <div className="p-3 text-center text-sm text-gray-500">
                            +{formData.products.length - 5} more products
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No Extraction Data</h3>
                  <p className="text-gray-500 mt-2">
                    You didn't upload any documents for AI extraction.
                    You can proceed to enter tender details manually.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Tender Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Tender Number <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.tenderNumber}
                    onChange={(e) => updateFormData('tenderNumber', e.target.value)}
                    placeholder="e.g., MOH/2024/001"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => updateFormData('title', e.target.value)}
                    placeholder="Tender title"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    placeholder="Tender description"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Department</label>
                  <Select
                    value={formData.department}
                    onValueChange={(v) => updateFormData('department', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Category</label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => updateFormData('category', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Submission Deadline <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={formData.submissionDeadline}
                    onChange={(e) => updateFormData('submissionDeadline', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Opening Date</label>
                  <Input
                    type="date"
                    value={formData.openingDate}
                    onChange={(e) => updateFormData('openingDate', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Estimated Value</label>
                  <Input
                    type="number"
                    value={formData.estimatedValue || ''}
                    onChange={(e) => updateFormData('estimatedValue', Number(e.target.value))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Currency</label>
                  <Select
                    value={formData.currency}
                    onValueChange={(v) => updateFormData('currency', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KWD">KWD - Kuwaiti Dinar</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Bond Requirements</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="bondRequired"
                      checked={formData.bondRequired}
                      onChange={(e) => updateFormData('bondRequired', e.target.checked)}
                      className="h-4 w-4"
                    />
                    <label htmlFor="bondRequired" className="text-sm">
                      Bid Bond Required
                    </label>
                  </div>
                  {formData.bondRequired && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Bond Amount</label>
                      <Input
                        type="number"
                        value={formData.bondAmount || ''}
                        onChange={(e) => updateFormData('bondAmount', Number(e.target.value))}
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Requirements</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Technical Requirements
                    </label>
                    <Textarea
                      value={formData.technicalRequirements}
                      onChange={(e) => updateFormData('technicalRequirements', e.target.value)}
                      placeholder="Enter technical requirements (one per line)"
                      rows={4}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Commercial Requirements
                    </label>
                    <Textarea
                      value={formData.commercialRequirements}
                      onChange={(e) => updateFormData('commercialRequirements', e.target.value)}
                      placeholder="Enter commercial requirements (one per line)"
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Products */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Products ({formData.products.length})</h4>
                <Button onClick={addProduct}>
                  <Package className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </div>

              {formData.products.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No Products</h3>
                  <p className="text-gray-500 mt-2">
                    Add products required for this tender
                  </p>
                  <Button className="mt-4" onClick={addProduct}>
                    Add First Product
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.products.map((product, index) => (
                    <Card key={product.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-4">
                          <span className="text-sm font-medium text-gray-500">
                            Product #{index + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500"
                            onClick={() => removeProduct(product.id)}
                          >
                            Remove
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="col-span-2">
                            <label className="text-sm font-medium text-gray-700">Name</label>
                            <Input
                              value={product.name}
                              onChange={(e) =>
                                updateProduct(product.id, 'name', e.target.value)
                              }
                              placeholder="Product name"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Quantity</label>
                            <Input
                              type="number"
                              value={product.quantity}
                              onChange={(e) =>
                                updateProduct(product.id, 'quantity', Number(e.target.value))
                              }
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Unit</label>
                            <Select
                              value={product.unit}
                              onValueChange={(v) => updateProduct(product.id, 'unit', v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pcs">Pieces</SelectItem>
                                <SelectItem value="sets">Sets</SelectItem>
                                <SelectItem value="boxes">Boxes</SelectItem>
                                <SelectItem value="units">Units</SelectItem>
                                <SelectItem value="kits">Kits</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2">
                            <label className="text-sm font-medium text-gray-700">
                              Specifications
                            </label>
                            <Textarea
                              value={product.specifications || ''}
                              onChange={(e) =>
                                updateProduct(product.id, 'specifications', e.target.value)
                              }
                              placeholder="Technical specifications"
                              rows={2}
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-sm font-medium text-gray-700">
                              Estimated Price ({formData.currency})
                            </label>
                            <Input
                              type="number"
                              value={product.estimatedPrice || ''}
                              onChange={(e) =>
                                updateProduct(product.id, 'estimatedPrice', Number(e.target.value))
                              }
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Confirm */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-medium text-lg mb-4">Tender Summary</h4>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500">Tender Number</p>
                    <p className="font-medium">{formData.tenderNumber || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Title</p>
                    <p className="font-medium">{formData.title || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Department</p>
                    <p className="font-medium">{formData.department || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Category</p>
                    <p className="font-medium">{formData.category || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Submission Deadline</p>
                    <p className="font-medium">{formData.submissionDeadline || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Estimated Value</p>
                    <p className="font-medium">
                      {formData.estimatedValue
                        ? formatCurrency(formData.estimatedValue, formData.currency)
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Bond Required</p>
                    <p className="font-medium">
                      {formData.bondRequired
                        ? `Yes - ${formatCurrency(formData.bondAmount, formData.currency)}`
                        : 'No'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Products</p>
                    <p className="font-medium">{formData.products.length} items</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Documents</p>
                    <p className="font-medium">{formData.documentIds.length} attached</p>
                  </div>
                </div>
              </div>

              {formData.products.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Products</h4>
                  <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                    {formData.products.map((product) => (
                      <div key={product.id} className="p-3 flex justify-between items-center">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-500">
                            {product.quantity} {product.unit}
                          </p>
                        </div>
                        {product.estimatedPrice && (
                          <span className="font-medium">
                            {formatCurrency(product.estimatedPrice, formData.currency)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        {currentStep === STEPS.length - 1 ? (
          <Button onClick={handleSubmit} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Create Tender
              </>
            )}
          </Button>
        ) : (
          <Button onClick={nextStep} disabled={!canProceed()}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}
