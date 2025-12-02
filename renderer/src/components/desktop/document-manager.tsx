/**
 * Desktop Document Manager
 * Manages document imports and processing in the desktop application
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Image as ImageIcon,
  Upload,
  FolderOpen,
  Play,
  Pause,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Download,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DesktopDocument {
  id: string;
  name: string;
  path: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  processed: boolean;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  confidence?: number;
}

export function DesktopDocumentManager() {
  const [documents, setDocuments] = useState<DesktopDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'pdf' | 'image' | 'processed' | 'pending'>('all');
  const [isImporting, setIsImporting] = useState(false);

  // Simulate loading documents
  useEffect(() => {
    // In a real app, this would fetch from the local database
    const mockDocuments: DesktopDocument[] = [
      {
        id: '1',
        name: 'MOH_Tender_2024_001.pdf',
        path: '/Users/user/Documents/MOH_Tender_2024_001.pdf',
        mimeType: 'application/pdf',
        size: 2456789,
        createdAt: new Date(Date.now() - 86400000),
        processed: true,
        processingStatus: 'completed',
        confidence: 85
      },
      {
        id: '2',
        name: 'Scanned_Document.jpg',
        path: '/Users/user/Documents/Scanned_Document.jpg',
        mimeType: 'image/jpeg',
        size: 1234567,
        createdAt: new Date(Date.now() - 172800000),
        processed: false,
        processingStatus: 'pending'
      },
      {
        id: '3',
        name: 'Equipment_Specs.pdf',
        path: '/Users/user/Documents/Equipment_Specs.pdf',
        mimeType: 'application/pdf',
        size: 5678901,
        createdAt: new Date(Date.now() - 259200000),
        processed: true,
        processingStatus: 'completed',
        confidence: 92
      },
      {
        id: '4',
        name: 'Failed_Extraction.pdf',
        path: '/Users/user/Documents/Failed_Extraction.pdf',
        mimeType: 'application/pdf',
        size: 3456789,
        createdAt: new Date(Date.now() - 345600000),
        processed: true,
        processingStatus: 'failed'
      }
    ];
    
    setDocuments(mockDocuments);
  }, []);

  const handleImportDocuments = () => {
    // In a real app: electronAPI.invoke('fs:select-files')
    setIsImporting(true);
    setTimeout(() => {
      setIsImporting(false);
      // Add new mock document
      const newDoc: DesktopDocument = {
        id: `${documents.length + 1}`,
        name: `New_Document_${documents.length + 1}.pdf`,
        path: `/Users/user/Documents/New_Document_${documents.length + 1}.pdf`,
        mimeType: 'application/pdf',
        size: Math.floor(Math.random() * 5000000),
        createdAt: new Date(),
        processed: false,
        processingStatus: 'pending'
      };
      setDocuments([...documents, newDoc]);
    }, 1500);
  };

  const handleProcessDocument = (documentId: string) => {
    // In a real app: electronAPI.invoke('ai:add-to-queue', { documentId, documentPath, mimeType })
    setDocuments(documents.map(doc => 
      doc.id === documentId 
        ? { ...doc, processingStatus: 'processing' } 
        : doc
    ));
    
    // Simulate processing completion
    setTimeout(() => {
      setDocuments(documents.map(doc => 
        doc.id === documentId 
          ? { 
              ...doc, 
              processingStatus: 'completed',
              processed: true,
              confidence: Math.floor(Math.random() * 40) + 60 // 60-99%
            } 
          : doc
      ));
    }, 3000);
  };

  const handleDeleteDocument = (documentId: string) => {
    setDocuments(documents.filter(doc => doc.id !== documentId));
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.path.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    switch (filterType) {
      case 'pdf': return doc.mimeType === 'application/pdf';
      case 'image': return doc.mimeType.startsWith('image/');
      case 'processed': return doc.processed;
      case 'pending': return !doc.processed;
      default: return true;
    }
  });

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5 text-blue-500" />;
    }
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const getStatusBadge = (status: DesktopDocument['processingStatus'], confidence?: number) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-700">Processing</Badge>;
      case 'completed':
        return (
          <div className="flex items-center gap-1">
            <Badge className="bg-green-100 text-green-700">Completed</Badge>
            {confidence && (
              <Badge variant="outline" className="text-xs">
                {confidence}%
              </Badge>
            )}
          </div>
        );
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Document Manager</h1>
          <p className="text-gray-500">Manage and process your documents locally</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleImportDocuments} disabled={isImporting}>
            {isImporting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import Documents
              </>
            )}
          </Button>
          <Button variant="outline">
            <FolderOpen className="h-4 w-4 mr-2" />
            Open Folder
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant={filterType === 'all' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilterType('all')}
              >
                All
              </Button>
              <Button 
                variant={filterType === 'pdf' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilterType('pdf')}
              >
                PDF
              </Button>
              <Button 
                variant={filterType === 'image' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilterType('image')}
              >
                Images
              </Button>
              <Button 
                variant={filterType === 'processed' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilterType('processed')}
              >
                Processed
              </Button>
              <Button 
                variant={filterType === 'pending' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilterType('pending')}
              >
                Pending
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                {filteredDocuments.length} of {documents.length} documents
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <p>No documents found</p>
              <p className="text-sm mt-1">Import documents to get started</p>
              <Button className="mt-4" onClick={handleImportDocuments}>
                <Upload className="h-4 w-4 mr-2" />
                Import Documents
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((doc) => (
                <div 
                  key={doc.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {getFileIcon(doc.mimeType)}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{formatFileSize(doc.size)}</span>
                        <span>•</span>
                        <span>{doc.createdAt.toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="truncate">{doc.path}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {getStatusBadge(doc.processingStatus, doc.confidence)}
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => handleProcessDocument(doc.id)}
                        disabled={doc.processingStatus === 'processing'}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteDocument(doc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}