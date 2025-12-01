/**
 * Desktop Dashboard
 * Main dashboard for the desktop application
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Brain,
  FileText,
  Database,
  Activity,
  TrendingUp,
  Calendar,
  Bell,
  Settings,
  Rocket,
  Zap,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DesktopDashboard() {
  const stats = [
    {
      title: "Total Documents",
      value: "1,248",
      change: "+12%",
      icon: FileText,
      color: "bg-blue-100 text-blue-600"
    },
    {
      title: "Processed Today",
      value: "42",
      change: "+8%",
      icon: Brain,
      color: "bg-green-100 text-green-600"
    },
    {
      title: "Pending Review",
      value: "7",
      change: "-2",
      icon: Clock,
      color: "bg-yellow-100 text-yellow-600"
    },
    {
      title: "AI Accuracy",
      value: "95.7%",
      change: "+1.2%",
      icon: CheckCircle,
      color: "bg-purple-100 text-purple-600"
    }
  ];

  const recentActivity = [
    {
      id: 1,
      title: "Tender Document Processed",
      description: "MOH_Tender_2024_001.pdf extracted successfully",
      time: "2 minutes ago",
      status: "completed",
      icon: Brain
    },
    {
      id: 2,
      title: "New Document Imported",
      description: "Scanned_Document.jpg added to queue",
      time: "15 minutes ago",
      status: "pending",
      icon: FileText
    },
    {
      id: 3,
      title: "Extraction Review Needed",
      description: "Low confidence extraction requires review",
      time: "1 hour ago",
      status: "warning",
      icon: AlertCircle
    },
    {
      id: 4,
      title: "Database Synced",
      description: "Local data synchronized with cloud",
      time: "2 hours ago",
      status: "completed",
      icon: Database
    }
  ];

  const quickActions = [
    {
      title: "Process Documents",
      description: "Start AI extraction for pending documents",
      icon: Zap,
      action: () => console.log("Process documents")
    },
    {
      id: 2,
      title: "Import Documents",
      description: "Add new documents to process",
      icon: FileText,
      action: () => console.log("Import documents")
    },
    {
      id: 3,
      title: "Review Extractions",
      description: "Check and approve pending extractions",
      icon: CheckCircle,
      action: () => console.log("Review extractions")
    },
    {
      id: 4,
      title: "View Reports",
      description: "Analyze processing performance",
      icon: TrendingUp,
      action: () => console.log("View reports")
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Desktop Dashboard</h1>
          <p className="text-gray-500">Welcome to your AI-powered medical distribution dashboard</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button>
            <Rocket className="h-4 w-4 mr-2" />
            Get Started
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={cn("p-2 rounded-lg", stat.color)}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full justify-start gap-3 h-auto py-4"
                    onClick={action.action}
                  >
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{action.title}</div>
                      <div className="text-xs text-gray-500">{action.description}</div>
                    </div>
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest events and processing updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={cn(
                        "p-2 rounded-full mt-0.5",
                        activity.status === "completed" && "bg-green-100 text-green-600",
                        activity.status === "pending" && "bg-blue-100 text-blue-600",
                        activity.status === "warning" && "bg-yellow-100 text-yellow-600"
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{activity.title}</p>
                        <p className="text-sm text-gray-500 truncate">{activity.description}</p>
                        <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <Badge variant={
                          activity.status === "completed" ? "default" :
                          activity.status === "warning" ? "destructive" : "secondary"
                        }>
                          {activity.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Features Overview
          </CardTitle>
          <CardDescription>
            Powerful AI capabilities available in your desktop application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">PDF Extraction</h3>
                  <p className="text-sm text-gray-500">99% accuracy</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">LLM Processing</h3>
                  <p className="text-sm text-gray-500">Multi-provider</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">Data Validation</h3>
                  <p className="text-sm text-gray-500">Zod schemas</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">Offline Storage</h3>
                  <p className="text-sm text-gray-500">SQLite database</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}