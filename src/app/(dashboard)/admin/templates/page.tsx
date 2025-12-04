'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Edit, Trash2, Copy, FileText, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface ExtractionTemplate {
  id: string
  name: string
  type: string
  description: string | null
  promptTemplate: string
  outputSchema: object
  fieldMappings: object
  isActive: boolean
  isDefault: boolean
  version: number
  createdAt: string
}

const EXTRACTION_TYPES = [
  { value: 'TENDER_EXTRACTION', label: 'Tender Extraction' },
  { value: 'INVOICE_EXTRACTION', label: 'Invoice Extraction' },
  { value: 'EXPENSE_EXTRACTION', label: 'Expense Extraction' },
  { value: 'DELIVERY_EXTRACTION', label: 'Delivery Note Extraction' },
  { value: 'PRODUCT_EXTRACTION', label: 'Product Extraction' },
  { value: 'OCR_TEXT', label: 'OCR Text Extraction' },
  { value: 'SUMMARIZATION', label: 'Document Summarization' },
]

const DEFAULT_PROMPTS: Record<string, string> = {
  TENDER_EXTRACTION: `Extract the following information from this tender document:

1. Reference Number / Tender Number
2. Title of the tender
3. Issuing Organization/Ministry
4. Closing/Submission Date
5. Opening Date (if mentioned)
6. Estimated Value (if mentioned)
7. Required Documents
8. Technical Requirements
9. Items/Products list with quantities and specifications

Format the response as JSON with these fields:
{
  "referenceNumber": "",
  "title": "",
  "organization": "",
  "closingDate": "",
  "openingDate": "",
  "estimatedValue": "",
  "currency": "KWD",
  "requirements": [],
  "items": [{"name": "", "quantity": "", "unit": "", "specifications": ""}]
}`,
  INVOICE_EXTRACTION: `Extract the following from this invoice:

1. Invoice Number
2. Invoice Date
3. Due Date
4. Vendor/Supplier Name
5. Vendor Address
6. Customer Name
7. Line Items (description, quantity, unit price, total)
8. Subtotal
9. Tax Amount
10. Total Amount
11. Payment Terms

Return as JSON:
{
  "invoiceNumber": "",
  "invoiceDate": "",
  "dueDate": "",
  "vendor": {"name": "", "address": ""},
  "customer": {"name": ""},
  "items": [{"description": "", "quantity": 0, "unitPrice": 0, "total": 0}],
  "subtotal": 0,
  "taxAmount": 0,
  "totalAmount": 0,
  "paymentTerms": ""
}`,
  EXPENSE_EXTRACTION: `Extract expense details from this receipt/document:

1. Vendor Name
2. Date
3. Category
4. Items purchased
5. Total Amount
6. Payment Method

Return as JSON:
{
  "vendorName": "",
  "date": "",
  "category": "",
  "items": [{"description": "", "amount": 0}],
  "totalAmount": 0,
  "paymentMethod": ""
}`,
}

export default function AdminTemplatesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [templates, setTemplates] = useState<ExtractionTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ExtractionTemplate | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    type: 'TENDER_EXTRACTION',
    description: '',
    promptTemplate: DEFAULT_PROMPTS.TENDER_EXTRACTION,
    isActive: true,
    isDefault: false,
  })

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [session, status, router])

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/admin/templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('Failed to fetch templates')
    } finally {
      setLoading(false)
    }
  }

  const handleTypeChange = (type: string) => {
    setFormData(prev => ({
      ...prev,
      type,
      promptTemplate: DEFAULT_PROMPTS[type] || prev.promptTemplate,
    }))
  }

  const handleSave = async () => {
    if (!formData.name || !formData.promptTemplate) {
      toast.error('Name and prompt template are required')
      return
    }

    setSaving(true)
    try {
      const url = '/api/admin/templates'
      const method = editingTemplate ? 'PUT' : 'POST'
      const body = editingTemplate
        ? { id: editingTemplate.id, ...formData }
        : { ...formData, outputSchema: {}, fieldMappings: {} }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        toast.success(editingTemplate ? 'Template updated' : 'Template created')
        setDialogOpen(false)
        setEditingTemplate(null)
        resetForm()
        fetchTemplates()
      } else {
        toast.error('Failed to save template')
      }
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (template: ExtractionTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      type: template.type,
      description: template.description || '',
      promptTemplate: template.promptTemplate,
      isActive: template.isActive,
      isDefault: template.isDefault,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const response = await fetch(`/api/admin/templates?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Template deleted')
        fetchTemplates()
      } else {
        toast.error('Failed to delete template')
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('Failed to delete template')
    }
  }

  const handleDuplicate = (template: ExtractionTemplate) => {
    setEditingTemplate(null)
    setFormData({
      name: `${template.name} (Copy)`,
      type: template.type,
      description: template.description || '',
      promptTemplate: template.promptTemplate,
      isActive: true,
      isDefault: false,
    })
    setDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'TENDER_EXTRACTION',
      description: '',
      promptTemplate: DEFAULT_PROMPTS.TENDER_EXTRACTION,
      isActive: true,
      isDefault: false,
    })
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (session?.user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied. Admin role required.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Extraction Templates</h1>
          <p className="text-muted-foreground">
            Manage AI extraction templates for different document types
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTemplates}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) {
              setEditingTemplate(null)
              resetForm()
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create New Template'}</DialogTitle>
                <DialogDescription>
                  Configure the AI extraction prompt template
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="MOH Kuwait Tender Template"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Extraction Type</Label>
                    <Select value={formData.type} onValueChange={handleTypeChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXTRACTION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Template for extracting MOH Kuwait tender documents"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prompt">AI Prompt Template</Label>
                  <Textarea
                    id="prompt"
                    value={formData.promptTemplate}
                    onChange={(e) => setFormData(prev => ({ ...prev, promptTemplate: e.target.value }))}
                    rows={15}
                    className="font-mono text-sm"
                    placeholder="Enter the AI extraction prompt..."
                  />
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label>Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.isDefault}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDefault: checked }))}
                    />
                    <Label>Set as Default</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Template'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4">
        {templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No templates found</p>
              <p className="text-sm text-muted-foreground">Create your first extraction template to get started</p>
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {template.name}
                      {template.isDefault && <Badge variant="secondary">Default</Badge>}
                      {!template.isActive && <Badge variant="outline">Inactive</Badge>}
                    </CardTitle>
                    <CardDescription>
                      {EXTRACTION_TYPES.find(t => t.value === template.type)?.label || template.type}
                      {template.description && ` - ${template.description}`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleDuplicate(template)} aria-label="Duplicate template">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(template)} aria-label="Edit template">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)} aria-label="Delete template">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-32">
                  {template.promptTemplate.substring(0, 300)}...
                </pre>
                <p className="text-xs text-muted-foreground mt-2">
                  Version {template.version} - Last updated: {new Date(template.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
