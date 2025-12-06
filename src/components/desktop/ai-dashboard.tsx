/**
 * Desktop AI Dashboard
 * Shows AI processing status and controls for the desktop application
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Activity,
  AlertCircle,
  Brain,
  CheckCircle,
  Clock,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Play,
  RotateCcw,
  Settings,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface AIQueueItem {
  id: string;
  documentId: string;
  documentPath: string;
  mimeType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  retryCount: number;
  errorMessage?: string;
}

export function AIDashboard() {
  const [queueStats, setQueueStats] = useState({
    queue: [] as AIQueueItem[],
    isProcessing: false,
    pendingCount: 0,
    processingCount: 0,
    completedCount: 0,
    failedCount: 0,
  });

  const [isMonitoring, setIsMonitoring] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<AIQueueItem | null>(null);

  // Simulate getting queue status from Electron
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      // In a real app, this would call electronAPI.invoke('ai:get-queue')
      // For demo, we'll simulate queue updates
      const mockQueue: AIQueueItem[] = [
        {
          id: '1',
          documentId: 'doc-1',
          documentPath: '/Users/user/Documents/tender1.pdf',
          mimeType: 'application/pdf',
          status: 'processing',
          createdAt: new Date(Date.now() - 5000),
          retryCount: 0,
        },
        {
          id: '2',
          documentId: 'doc-2',
          documentPath: '/Users/user/Documents/tender2.pdf',
          mimeType: 'application/pdf',
          status: 'pending',
          createdAt: new Date(Date.now() - 10000),
          retryCount: 0,
        },
        {
          id: '3',
          documentId: 'doc-3',
          documentPath: '/Users/user/Documents/scanned.jpg',
          mimeType: 'image/jpeg',
          status: 'completed',
          createdAt: new Date(Date.now() - 30000),
          retryCount: 0,
        },
      ];

      const pendingCount = mockQueue.filter(item => item.status === 'pending').length;
      const processingCount = mockQueue.filter(item => item.status === 'processing').length;
      const completedCount = mockQueue.filter(item => item.status === 'completed').length;
      const failedCount = mockQueue.filter(item => item.status === 'failed').length;

      setQueueStats({
        queue: mockQueue,
        isProcessing: processingCount > 0,
        pendingCount,
        processingCount,
        completedCount,
        failedCount,
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isMonitoring]);

  const handleProcessDocuments = () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.send('process-all-documents', {});
      console.log('Processing all documents...');
    } else {
      console.warn('Electron API not available');
    }
  };

  const handleClearQueue = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        await window.electronAPI.invoke('ai:clear-queue');
        console.log('Queue cleared successfully');
        // Refresh queue stats
        setQueueStats(prev => ({
          ...prev,
          queue: [],
          pendingCount: 0,
          processingCount: 0,
          completedCount: 0,
          failedCount: 0,
        }));
      } catch (error) {
        console.error('Failed to clear queue:', error);
      }
    } else {
      console.warn('Electron API not available');
    }
  };

  const handleImportDocuments = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const files = await window.electronAPI.invoke('fs:select-files') as string[] | null;
        if (files && files.length > 0) {
          console.log('Selected files:', files);
          // Add files to processing queue
          for (const file of files) {
            await window.electronAPI.invoke('ai:add-to-queue', {
              filePath: file,
              type: 'tender',
            });
          }
        }
      } catch (error) {
        console.error('Failed to import documents:', error);
      }
    } else {
      console.warn('Electron API not available');
    }
  };

  const getStatusIcon = (status: AIQueueItem['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-500" />;
      case 'processing':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: AIQueueItem['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-700';
      case 'processing':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4 text-blue-500" />;
    }
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  const totalItems =
    queueStats.pendingCount +
    queueStats.processingCount +
    queueStats.completedCount +
    queueStats.failedCount;
  const progress = totalItems > 0 ? Math.round((queueStats.completedCount / totalItems) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Brain className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Document Processing</h1>
            <p className="text-gray-500">Monitor and manage document AI extraction</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleImportDocuments}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearQueue}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear Queue
          </Button>
          <Button size="sm" onClick={handleProcessDocuments}>
            <Play className="h-4 w-4 mr-2" />
            Process All
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold">{queueStats.pendingCount}</p>
              </div>
              <div className="p-2 bg-gray-100 rounded-lg">
                <Clock className="h-5 w-5 text-gray-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Processing</p>
                <p className="text-2xl font-bold">{queueStats.processingCount}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold">{queueStats.completedCount}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Failed</p>
                <p className="text-2xl font-bold">{queueStats.failedCount}</p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Progress</p>
                <p className="text-2xl font-bold">{progress}%</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Settings className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Progress</CardTitle>
          <CardDescription>
            {queueStats.isProcessing ? 'AI extraction in progress...' : 'No active processing'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <div className="flex justify-between text-sm text-gray-500">
              <span>{totalItems} total documents</span>
              <span>{queueStats.completedCount} processed</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Processing Queue</CardTitle>
              <CardDescription>Documents waiting for or undergoing AI extraction</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={queueStats.isProcessing ? 'default' : 'secondary'}>
                {queueStats.isProcessing ? 'Processing' : 'Idle'}
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => setIsMonitoring(!isMonitoring)}>
                {isMonitoring ? 'Pause' : 'Resume'} Monitoring
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {queueStats.queue.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Brain className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <p>No documents in processing queue</p>
              <p className="text-sm mt-1">Import documents to start AI processing</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queueStats.queue.map(item => (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border',
                    selectedDocument?.id === item.id ? 'bg-blue-50 border-blue-200' : 'bg-white'
                  )}
                  onClick={() => setSelectedDocument(item)}
                >
                  <div className="flex items-center gap-3">
                    {getFileIcon(item.mimeType)}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{item.documentPath.split('/').pop()}</p>
                      <p className="text-sm text-gray-500 truncate">{item.documentPath}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item.status)}
                      <Badge className={getStatusColor(item.status)}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Badge>
                    </div>
                    {item.retryCount > 0 && (
                      <Badge variant="secondary">Retry {item.retryCount}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Details */}
      {selectedDocument && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Document Details</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDocument(null)}
                aria-label="Close document details"
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">File Information</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <span className="ml-2 font-medium">
                      {selectedDocument.documentPath.split('/').pop()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Path:</span>
                    <span className="ml-2 break-all">{selectedDocument.documentPath}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <span className="ml-2">{selectedDocument.mimeType}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className="ml-2">
                      <Badge className={getStatusColor(selectedDocument.status)}>
                        {selectedDocument.status.charAt(0).toUpperCase() +
                          selectedDocument.status.slice(1)}
                      </Badge>
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Processing Information</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Added:</span>
                    <span className="ml-2">{selectedDocument.createdAt.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Retries:</span>
                    <span className="ml-2">{selectedDocument.retryCount}</span>
                  </div>
                  {selectedDocument.errorMessage && (
                    <div>
                      <span className="text-gray-500">Error:</span>
                      <span className="ml-2 text-red-500">{selectedDocument.errorMessage}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
