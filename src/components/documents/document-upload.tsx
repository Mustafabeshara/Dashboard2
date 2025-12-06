/**
 * Document Upload Component
 * Drag-and-drop file upload with progress and AI processing
 */

'use client'

import { useState, useCallback } from 'react'
import {
  Upload,
  X,
  File,
  FileText,
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface UploadedFile {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  documentId?: string
  error?: string
  extractedData?: Record<string, unknown>
}

interface DocumentUploadProps {
  moduleType: string
  moduleId?: string
  onUploadComplete?: (documents: UploadedFile[]) => void
  onExtractData?: (documentId: string, data: Record<string, unknown>) => void
  allowedTypes?: string[]
  maxFiles?: number
  autoProcess?: boolean
}

const FILE_ICONS: Record<string, typeof File> = {
  'application/pdf': FileText,
  'image/jpeg': ImageIcon,
  'image/png': ImageIcon,
  'image/webp': ImageIcon,
  default: File,
}

const DEFAULT_ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

export function DocumentUpload({
  moduleType,
  moduleId,
  onUploadComplete,
  onExtractData,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  maxFiles = 10,
  autoProcess = true,
}: DocumentUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [documentType, setDocumentType] = useState<string>('')
  const [tags, setTags] = useState<string>('')

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const droppedFiles = Array.from(e.dataTransfer.files)
      addFiles(droppedFiles)
    },
    [allowedTypes, maxFiles]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files)
        addFiles(selectedFiles)
      }
    },
    [allowedTypes, maxFiles]
  )

  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles
      .filter((file) => allowedTypes.includes(file.type))
      .slice(0, maxFiles - files.length)

    const uploadFiles: UploadedFile[] = validFiles.map((file) => ({
      id: Math.random().toString(36).slice(2),
      file,
      status: 'pending',
      progress: 0,
    }))

    setFiles((prev) => [...prev, ...uploadFiles])
    
    // Auto-upload files immediately if autoProcess is enabled
    if (autoProcess) {
      setTimeout(() => {
        uploadFiles.forEach(file => uploadFile(file))
      }, 100)
    }
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const uploadFile = async (uploadedFile: UploadedFile) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === uploadedFile.id ? { ...f, status: 'uploading', progress: 10 } : f
      )
    )

    try {
      const formData = new FormData()
      formData.append('file', uploadedFile.file)
      formData.append('moduleType', moduleType)
      if (moduleId) formData.append('moduleId', moduleId)
      if (documentType) formData.append('documentType', documentType)
      if (tags) formData.append('tags', tags)

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id
            ? { ...f, status: 'processing', progress: 50, documentId: data.document.id }
            : f
        )
      )

      // Auto-process with AI if enabled
      if (autoProcess && data.document.id) {
        await processDocument(uploadedFile.id, data.document.id)
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id ? { ...f, status: 'completed', progress: 100 } : f
          )
        )
      }
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id
            ? { ...f, status: 'error', error: 'Upload failed' }
            : f
        )
      )
    }
  }

  const processDocument = async (fileId: string, documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/process`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Processing failed')
      }

      const data = await response.json()

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: 'completed',
                progress: 100,
                extractedData: data.extraction?.extractedData,
              }
            : f
        )
      )

      if (data.extraction?.extractedData && onExtractData) {
        onExtractData(documentId, data.extraction.extractedData)
      }
    } catch {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, status: 'completed', progress: 100 } // Complete but without extraction
            : f
        )
      )
    }
  }

  const uploadAll = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending')
    for (const file of pendingFiles) {
      await uploadFile(file)
    }

    if (onUploadComplete) {
      onUploadComplete(files)
    }
  }

  const getFileIcon = (mimeType: string) => {
    const Icon = FILE_ICONS[mimeType] || FILE_ICONS.default
    return <Icon className="h-8 w-8" />
  }

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Options */}
      <div className="flex gap-4 flex-wrap">
        <Select value={documentType} onValueChange={setDocumentType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Document Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TENDER_DOCUMENT">Tender Document</SelectItem>
            <SelectItem value="TENDER_SPECS">Technical Specs</SelectItem>
            <SelectItem value="TENDER_BOQ">Bill of Quantities</SelectItem>
            <SelectItem value="INVOICE">Invoice</SelectItem>
            <SelectItem value="EXPENSE_RECEIPT">Expense Receipt</SelectItem>
            <SelectItem value="DELIVERY_NOTE">Delivery Note</SelectItem>
            <SelectItem value="CONTRACT">Contract</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Tags (comma-separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-64"
        />
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        )}
      >
        <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium mb-2">
          Drag & drop files here, or click to select
        </p>
        <p className="text-sm text-gray-500 mb-4">
          PDF, Images, Word, Excel files up to 10MB each
          <br />
          <span className="text-blue-600 font-medium">
            ✨ Files will be uploaded and processed automatically
          </span>
        </p>
        <input
          type="file"
          multiple
          accept={allowedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload">
          <Button variant="outline" asChild>
            <span>Select Files</span>
          </Button>
        </label>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Files ({files.length})</h4>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setFiles([])}
              >
                Clear All
              </Button>
              <Button
                size="sm"
                onClick={uploadAll}
                disabled={!files.some((f) => f.status === 'pending')}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Upload & Process
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {files.map((uploadedFile) => (
              <div
                key={uploadedFile.id}
                className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
              >
                <div className="text-gray-400">
                  {getFileIcon(uploadedFile.file.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{uploadedFile.file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(uploadedFile.file.size / 1024).toFixed(1)} KB
                  </p>
                  {uploadedFile.status !== 'pending' && (
                    <Progress
                      value={uploadedFile.progress}
                      className="h-1 mt-2"
                    />
                  )}
                  {uploadedFile.status === 'processing' && (
                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      AI processing document...
                    </p>
                  )}
                  {uploadedFile.extractedData && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Data extracted successfully
                    </p>
                  )}
                  {uploadedFile.error && (
                    <p className="text-xs text-red-600 mt-1">{uploadedFile.error}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(uploadedFile.status)}
                  {uploadedFile.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(uploadedFile.id)}
                      aria-label="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
