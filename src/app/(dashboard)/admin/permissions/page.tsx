'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Shield, 
  Check, 
  X, 
  Eye, 
  Edit, 
  Trash2, 
  Plus, 
  CheckCircle,
  Users,
  FileText,
  DollarSign,
  Package,
  ClipboardList,
  BarChart3,
  Building,
  Settings
} from 'lucide-react'

// Define all modules and their permissions
const MODULES = [
  { key: 'users', name: 'Users', icon: Users, description: 'User account management' },
  { key: 'budgets', name: 'Budgets', icon: DollarSign, description: 'Budget planning and tracking' },
  { key: 'expenses', name: 'Expenses', icon: FileText, description: 'Expense management and approval' },
  { key: 'invoices', name: 'Invoices', icon: FileText, description: 'Invoice creation and tracking' },
  { key: 'tenders', name: 'Tenders', icon: ClipboardList, description: 'Tender/bid management' },
  { key: 'inventory', name: 'Inventory', icon: Package, description: 'Stock and inventory control' },
  { key: 'suppliers', name: 'Suppliers/Manufacturers', icon: Building, description: 'Vendor management' },
  { key: 'reports', name: 'Reports', icon: BarChart3, description: 'Business intelligence and reporting' },
  { key: 'settings', name: 'Settings', icon: Settings, description: 'System configuration' },
]

const ACTIONS = [
  { key: 'view', label: 'View', icon: Eye },
  { key: 'create', label: 'Create', icon: Plus },
  { key: 'edit', label: 'Edit', icon: Edit },
  { key: 'delete', label: 'Delete', icon: Trash2 },
  { key: 'approve', label: 'Approve', icon: CheckCircle },
]

// Role permissions matrix
const ROLE_PERMISSIONS: Record<string, Record<string, string[]>> = {
  ADMIN: {
    users: ['view', 'create', 'edit', 'delete'],
    budgets: ['view', 'create', 'edit', 'delete', 'approve'],
    expenses: ['view', 'create', 'edit', 'delete', 'approve'],
    invoices: ['view', 'create', 'edit', 'delete'],
    tenders: ['view', 'create', 'edit', 'delete'],
    inventory: ['view', 'create', 'edit', 'delete'],
    suppliers: ['view', 'create', 'edit', 'delete'],
    reports: ['view', 'create'],
    settings: ['view', 'edit'],
  },
  CEO: {
    users: ['view'],
    budgets: ['view', 'create', 'edit', 'approve'],
    expenses: ['view', 'approve'],
    invoices: ['view', 'create', 'edit'],
    tenders: ['view', 'create', 'edit', 'delete', 'approve'],
    inventory: ['view'],
    suppliers: ['view'],
    reports: ['view', 'create'],
    settings: ['view'],
  },
  CFO: {
    users: ['view'],
    budgets: ['view', 'create', 'edit', 'delete', 'approve'],
    expenses: ['view', 'create', 'edit', 'approve'],
    invoices: ['view', 'create', 'edit', 'delete'],
    tenders: ['view'],
    inventory: ['view'],
    suppliers: ['view', 'create', 'edit'],
    reports: ['view', 'create'],
    settings: ['view'],
  },
  FINANCE_MANAGER: {
    users: ['view'],
    budgets: ['view', 'edit', 'approve'],
    expenses: ['view', 'create', 'edit', 'approve'],
    invoices: ['view', 'create', 'edit'],
    tenders: ['view'],
    inventory: ['view'],
    suppliers: ['view', 'create'],
    reports: ['view'],
    settings: [],
  },
  MANAGER: {
    users: ['view'],
    budgets: ['view', 'create'],
    expenses: ['view', 'create', 'approve'],
    invoices: ['view'],
    tenders: ['view', 'create', 'edit'],
    inventory: ['view', 'edit'],
    suppliers: ['view'],
    reports: ['view'],
    settings: [],
  },
  SALES: {
    users: [],
    budgets: ['view'],
    expenses: ['view', 'create'],
    invoices: ['view', 'create'],
    tenders: ['view', 'create', 'edit'],
    inventory: ['view'],
    suppliers: ['view'],
    reports: ['view'],
    settings: [],
  },
  WAREHOUSE: {
    users: [],
    budgets: [],
    expenses: ['view', 'create'],
    invoices: ['view'],
    tenders: ['view'],
    inventory: ['view', 'create', 'edit', 'delete'],
    suppliers: ['view'],
    reports: [],
    settings: [],
  },
  FINANCE: {
    users: [],
    budgets: ['view'],
    expenses: ['view', 'create', 'edit'],
    invoices: ['view', 'create', 'edit'],
    tenders: ['view'],
    inventory: ['view'],
    suppliers: ['view'],
    reports: ['view'],
    settings: [],
  },
}

const ROLES = ['ADMIN', 'CEO', 'CFO', 'FINANCE_MANAGER', 'MANAGER', 'SALES', 'WAREHOUSE', 'FINANCE']

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800',
  CEO: 'bg-purple-100 text-purple-800',
  CFO: 'bg-blue-100 text-blue-800',
  FINANCE_MANAGER: 'bg-green-100 text-green-800',
  MANAGER: 'bg-yellow-100 text-yellow-800',
  SALES: 'bg-orange-100 text-orange-800',
  WAREHOUSE: 'bg-cyan-100 text-cyan-800',
  FINANCE: 'bg-indigo-100 text-indigo-800',
}

// Budget approval thresholds
const APPROVAL_THRESHOLDS = [
  { role: 'Auto-Approve', minAmount: 0, maxAmount: 1000, description: 'Automatic approval for small transactions' },
  { role: 'MANAGER', minAmount: 1000, maxAmount: 10000, description: 'Department manager approval' },
  { role: 'FINANCE_MANAGER', minAmount: 10000, maxAmount: 50000, description: 'Finance manager approval' },
  { role: 'CFO', minAmount: 50000, maxAmount: 100000, description: 'Chief Financial Officer approval' },
  { role: 'CEO', minAmount: 100000, maxAmount: null, description: 'CEO approval for major expenditures' },
]

export default function RolePermissionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<string>('ADMIN')

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (session?.user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Access denied. Admin role required.</p>
        </div>
      </div>
    )
  }

  const hasPermission = (role: string, module: string, action: string) => {
    return ROLE_PERMISSIONS[role]?.[module]?.includes(action) || false
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Role Permissions
        </h1>
        <p className="text-muted-foreground">
          View and understand user roles and their access permissions across all modules
        </p>
      </div>

      <Tabs defaultValue="matrix" className="space-y-6">
        <TabsList>
          <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>
          <TabsTrigger value="by-role">By Role</TabsTrigger>
          <TabsTrigger value="approvals">Approval Thresholds</TabsTrigger>
        </TabsList>

        {/* Permission Matrix View */}
        <TabsContent value="matrix" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Full Permission Matrix</CardTitle>
              <CardDescription>
                Overview of all roles and their permissions across modules
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Module</TableHead>
                    {ROLES.map(role => (
                      <TableHead key={role} className="text-center min-w-[100px]">
                        <Badge className={ROLE_COLORS[role]}>{role.replace('_', ' ')}</Badge>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MODULES.map(module => (
                    <TableRow key={module.key}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <module.icon className="h-4 w-4 text-muted-foreground" />
                          {module.name}
                        </div>
                      </TableCell>
                      {ROLES.map(role => {
                        const perms = ROLE_PERMISSIONS[role]?.[module.key] || []
                        return (
                          <TableCell key={role} className="text-center">
                            <div className="flex flex-wrap gap-1 justify-center">
                              {perms.length === 0 ? (
                                <X className="h-4 w-4 text-gray-300" />
                              ) : perms.length >= 4 ? (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                  Full
                                </Badge>
                              ) : (
                                perms.map(p => (
                                  <Badge key={p} variant="outline" className="text-xs">
                                    {p.charAt(0).toUpperCase()}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span><strong>V</strong> = View</span>
                <span><strong>C</strong> = Create</span>
                <span><strong>E</strong> = Edit</span>
                <span><strong>D</strong> = Delete</span>
                <span><strong>A</strong> = Approve</span>
                <span><strong>Full</strong> = All permissions</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Role View */}
        <TabsContent value="by-role" className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {ROLES.map(role => (
              <Badge
                key={role}
                className={`cursor-pointer ${selectedRole === role ? ROLE_COLORS[role] : 'bg-gray-100 text-gray-600'}`}
                onClick={() => setSelectedRole(role)}
              >
                {role.replace('_', ' ')}
              </Badge>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge className={ROLE_COLORS[selectedRole]}>{selectedRole.replace('_', ' ')}</Badge>
                Permissions
              </CardTitle>
              <CardDescription>
                Detailed permissions for the {selectedRole.replace('_', ' ')} role
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {MODULES.map(module => {
                  const perms = ROLE_PERMISSIONS[selectedRole]?.[module.key] || []
                  return (
                    <Card key={module.key} className={perms.length === 0 ? 'opacity-50' : ''}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <module.icon className="h-4 w-4" />
                          {module.name}
                        </CardTitle>
                        <CardDescription className="text-xs">{module.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {perms.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No access</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {ACTIONS.map(action => {
                              const hasAction = perms.includes(action.key)
                              return (
                                <div
                                  key={action.key}
                                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                                    hasAction
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-gray-400'
                                  }`}
                                >
                                  {hasAction ? (
                                    <Check className="h-3 w-3" />
                                  ) : (
                                    <X className="h-3 w-3" />
                                  )}
                                  {action.label}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approval Thresholds View */}
        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget Approval Thresholds</CardTitle>
              <CardDescription>
                Transaction amounts and the required approval level based on value
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount Range (KWD)</TableHead>
                    <TableHead>Required Approver</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {APPROVAL_THRESHOLDS.map((threshold, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">
                        {threshold.maxAmount
                          ? `${threshold.minAmount.toLocaleString()} - ${threshold.maxAmount.toLocaleString()}`
                          : `${threshold.minAmount.toLocaleString()}+`
                        }
                      </TableCell>
                      <TableCell>
                        <Badge className={ROLE_COLORS[threshold.role] || 'bg-gray-100 text-gray-800'}>
                          {threshold.role.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {threshold.description}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approval Workflow</CardTitle>
              <CardDescription>
                How budget approvals work in the system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
                  <span className="font-medium">1. Submit</span>
                </div>
                <span className="text-muted-foreground">→</span>
                <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-lg">
                  <span className="font-medium">2. Review</span>
                </div>
                <span className="text-muted-foreground">→</span>
                <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg">
                  <span className="font-medium">3. Approve/Reject</span>
                </div>
                <span className="text-muted-foreground">→</span>
                <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-lg">
                  <span className="font-medium">4. Post to Budget</span>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg text-sm">
                <h4 className="font-medium mb-2">Multi-Level Approval</h4>
                <p className="text-muted-foreground">
                  For amounts exceeding KWD 100,000, transactions may require sequential approval 
                  from multiple levels (Manager → Finance Manager → CFO → CEO) based on company policy.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
