/**
 * Extraction Review Component
 * Review and validate AI-extracted data with confidence scores
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Save,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfidenceScores {
  overall: number
  reference: number
  title: number
  organization: number
  closingDate: number
  items: number
}

interface ExtractionData {
  reference: string
  title: string
  organization: string
  closingDate: string
  items: Array<{
    itemDescription: string
    quantity: number
    unit: string
  }>
  notes: string
  confidence?: ConfidenceScores
}

interface ExtractionReviewProps {
  data: ExtractionData
  onSave: (updatedData: ExtractionData) => void
  onReject: () => void
}

function ConfidenceBadge({ score }: { score: number }) {
  const percentage = Math.round(score * 100)
  let variant: 'default' | 'secondary' | 'destructive' = 'default'
  let icon = <Minus className="h-3 w-3" />

  if (percentage >= 80) {
    variant = 'default'
    icon = <TrendingUp className="h-3 w-3" />
  } else if (percentage >= 60) {
    variant = 'secondary'
    icon = <Minus className="h-3 w-3" />
  } else {
    variant = 'destructive'
    icon = <TrendingDown className="h-3 w-3" />
  }

  return (
    <Badge variant={variant} className="gap-1">
      {icon}
      {percentage}%
    </Badge>
  )
}

function FieldReview({
  label,
  value,
  confidence,
  onChange,
  multiline = false,
  required = false,
}: {
  label: string
  value: string
  confidence?: number
  onChange: (value: string) => void
  multiline?: boolean
  required?: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)

  const needsReview = confidence !== undefined && confidence < 0.7
  const isEmpty = !value || value.trim() === ''

  const handleSave = () => {
    onChange(editValue)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  return (
    <div
      className={cn(
        'border rounded-lg p-4 space-y-2',
        needsReview && 'border-amber-400 bg-amber-50',
        isEmpty && required && 'border-red-400 bg-red-50'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="font-semibold">{label}</Label>
          {required && <span className="text-red-500 text-xs">*</span>}
          {confidence !== undefined && <ConfidenceBadge score={confidence} />}
        </div>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-8"
          >
            <Edit3 className="h-3 w-3 mr-1" />
            Edit
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          {multiline ? (
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              rows={4}
              className="w-full"
            />
          ) : (
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full"
            />
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          {isEmpty ? (
            <span className="text-red-500 italic">No value extracted</span>
          ) : (
            <span className={cn(needsReview && 'font-medium text-amber-900')}>
              {value}
            </span>
          )}
        </div>
      )}

      {needsReview && !isEmpty && (
        <div className="flex items-start gap-2 text-xs text-amber-700 mt-2">
          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>Low confidence. Please verify this field is correct.</span>
        </div>
      )}

      {isEmpty && required && (
        <div className="flex items-start gap-2 text-xs text-red-700 mt-2">
          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>This field is required. Please enter a value.</span>
        </div>
      )}
    </div>
  )
}

export function ExtractionReview({ data, onSave, onReject }: ExtractionReviewProps) {
  const [formData, setFormData] = useState<ExtractionData>(data)

  const updateField = (field: keyof ExtractionData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...formData.items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    setFormData((prev) => ({ ...prev, items: updatedItems }))
  }

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
  }

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { itemDescription: '', quantity: 1, unit: 'pcs' },
      ],
    }))
  }

  const handleSave = () => {
    onSave(formData)
  }

  const overallConfidence = data.confidence?.overall || 0
  const needsReview = overallConfidence < 0.7

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Extraction Review</CardTitle>
              <CardDescription>
                Review and validate the AI-extracted data before creating the tender
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Overall Confidence:</span>
              <ConfidenceBadge score={overallConfidence} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {needsReview ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-900">Human Review Recommended</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    The extraction confidence is below 70%. Please carefully review all fields,
                    especially those highlighted in amber, before proceeding.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900">High Confidence Extraction</h4>
                  <p className="text-sm text-green-700 mt-1">
                    The extraction has high confidence. Please do a quick review before proceeding.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Basic Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldReview
            label="Tender Reference Number"
            value={formData.reference}
            confidence={data.confidence?.reference}
            onChange={(value) => updateField('reference', value)}
            required
          />

          <FieldReview
            label="Tender Title"
            value={formData.title}
            confidence={data.confidence?.title}
            onChange={(value) => updateField('title', value)}
            required
          />

          <FieldReview
            label="Issuing Organization"
            value={formData.organization}
            confidence={data.confidence?.organization}
            onChange={(value) => updateField('organization', value)}
            required
          />

          <FieldReview
            label="Closing Date"
            value={formData.closingDate}
            confidence={data.confidence?.closingDate}
            onChange={(value) => updateField('closingDate', value)}
            required
          />

          <FieldReview
            label="Additional Notes"
            value={formData.notes}
            onChange={(value) => updateField('notes', value)}
            multiline
          />
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Items ({formData.items.length})</CardTitle>
              {data.confidence?.items !== undefined && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground">Items Confidence:</span>
                  <ConfidenceBadge score={data.confidence.items} />
                </div>
              )}
            </div>
            <Button onClick={addItem} size="sm">
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No items extracted. Click "Add Item" to add items manually.</p>
            </div>
          ) : (
            formData.items.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Item {index + 1}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={item.itemDescription}
                    onChange={(e) =>
                      updateItem(index, 'itemDescription', e.target.value)
                    }
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, 'quantity', parseInt(e.target.value) || 1)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Input
                      value={item.unit}
                      onChange={(e) => updateItem(index, 'unit', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={onReject}>
          Reject & Re-extract
        </Button>
        <Button onClick={handleSave}>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Approve & Continue
        </Button>
      </div>
    </div>
  )
}
