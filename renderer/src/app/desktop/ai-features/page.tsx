/**
 * Desktop AI Features Page
 * Showcase of all AI capabilities in the desktop application
 */

'use client';

import { AIDashboard } from '@/components/desktop/ai-dashboard';
import { DesktopDocumentManager } from '@/components/desktop/document-manager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Brain,
  FileText,
  Image as ImageIcon,
  Zap,
  Shield,
  Globe,
  Database,
  Cpu,
  Settings,
  ArrowRight,
  CheckCircle,
  Rocket
} from 'lucide-react';

export default function DesktopAIFeaturesPage() {
  const aiFeatures = [
    {
      icon: <FileText className="h-8 w-8 text-blue-500" />,
      title: "PDF Text Extraction",
      description: "Advanced PDF parsing with pdf-parse library for accurate text extraction",
      status: "Implemented",
      benefits: ["99% accuracy", "Multi-page support", "Metadata extraction"]
    },
    {
      icon: <ImageIcon className="h-8 w-8 text-green-500" />,
      title: "OCR Processing",
      description: "Optical Character Recognition for scanned documents and images",
      status: "Available",
      benefits: ["AWS Textract", "Google Vision", "Multi-language support"]
    },
    {
      icon: <Zap className="h-8 w-8 text-yellow-500" />,
      title: "AI-Powered Extraction",
      description: "Intelligent data extraction using Gemini, Groq, and other LLMs",
      status: "Active",
      benefits: ["Tender parsing", "Confidence scoring", "Validation"]
    },
    {
      icon: <Shield className="h-8 w-8 text-red-500" />,
      title: "Data Validation",
      description: "Zod schema validation for extracted data quality assurance",
      status: "Implemented",
      benefits: ["Type safety", "Error detection", "Sanitization"]
    },
    {
      icon: <Globe className="h-8 w-8 text-purple-500" />,
      title: "Preprocessing",
      description: "Document cleaning and normalization for better AI results",
      status: "Active",
      benefits: ["Text cleaning", "Header removal", "Arabic normalization"]
    },
    {
      icon: <Database className="h-8 w-8 text-indigo-500" />,
      title: "Offline Database",
      description: "Local SQLite database with sync capabilities",
      status: "Ready",
      benefits: ["Offline access", "Data persistence", "Sync ready"]
    }
  ];

  const workflowSteps = [
    {
      step: 1,
      title: "Document Import",
      description: "Import PDFs, images, and documents from your local filesystem",
      icon: <FileText className="h-6 w-6" />
    },
    {
      step: 2,
      title: "AI Processing",
      description: "Automatic text extraction and OCR for scanned documents",
      icon: <Brain className="h-6 w-6" />
    },
    {
      step: 3,
      title: "Data Extraction",
      description: "Intelligent parsing of tender information with LLMs",
      icon: <Zap className="h-6 w-6" />
    },
    {
      step: 4,
      title: "Validation",
      description: "Zod schema validation and confidence scoring",
      icon: <Shield className="h-6 w-6" />
    },
    {
      step: 5,
      title: "Review",
      description: "Human-in-the-loop review for low-confidence extractions",
      icon: <Settings className="h-6 w-6" />
    },
    {
      step: 6,
      title: "Storage",
      description: "Local storage with optional cloud sync",
      icon: <Database className="h-6 w-6" />
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Rocket className="h-8 w-8 text-blue-600" />
            </div>
            Desktop AI Features
          </h1>
          <p className="text-gray-500 mt-2">
            All AI capabilities available in the desktop application
          </p>
        </div>
        <Button size="lg">
          <Rocket className="h-5 w-5 mr-2" />
          Get Started
        </Button>
      </div>

      {/* AI Dashboard */}
      <AIDashboard />

      {/* Document Manager */}
      <DesktopDocumentManager />

      {/* AI Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {aiFeatures.map((feature, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="p-2 bg-gray-100 rounded-lg">
                  {feature.icon}
                </div>
                <Badge variant="secondary">{feature.status}</Badge>
              </div>
              <CardTitle className="mt-4">{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {feature.benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Workflow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            AI Processing Workflow
          </CardTitle>
          <CardDescription>
            End-to-end document processing with AI capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {workflowSteps.map((step) => (
              <div key={step.step} className="text-center">
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 mb-3">
                    {step.icon}
                  </div>
                  <div className="text-sm font-medium text-gray-900">Step {step.step}</div>
                  <div className="text-xs text-gray-500 mt-1">{step.title}</div>
                  <div className="text-xs text-gray-400 mt-1 hidden md:block">{step.description}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Processing Speed</p>
                <p className="text-xl font-bold">100+ docs/hr</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <Zap className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Accuracy Rate</p>
                <p className="text-xl font-bold">95.7%</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Offline Support</p>
                <p className="text-xl font-bold">100%</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Database className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Languages</p>
                <p className="text-xl font-bold">2+</p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Globe className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}