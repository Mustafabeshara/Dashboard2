'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Save, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface SettingValue {
  [key: string]: string | number | boolean
}

export default function AdminSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // General settings
  const [generalSettings, setGeneralSettings] = useState({
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    defaultCurrency: 'KWD',
    fiscalYearStart: '01',
  })

  // Approval thresholds
  const [approvalSettings, setApprovalSettings] = useState({
    autoApproveThreshold: 1000,
    managerApproveThreshold: 10000,
    financeManagerThreshold: 50000,
    cfoApproveThreshold: 100000,
    budgetWarningThreshold: 80,
    budgetCriticalThreshold: 90,
  })

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    systemNotifications: true,
    budgetAlerts: true,
    approvalReminders: true,
    tenderDeadlineReminders: true,
    reminderDaysBefore: 7,
  })

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [session, status, router])

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings')
      if (response.ok) {
        const data = await response.json()
        // Map settings to state
        data.settings.forEach((setting: { key: string; value: SettingValue; category: string }) => {
          if (setting.category === 'general') {
            setGeneralSettings(prev => ({ ...prev, ...setting.value }))
          } else if (setting.category === 'approval') {
            setApprovalSettings(prev => ({ ...prev, ...setting.value }))
          } else if (setting.category === 'notification') {
            setNotificationSettings(prev => ({ ...prev, ...setting.value }))
          }
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: [
            { key: 'general', value: generalSettings, category: 'general' },
            { key: 'approval', value: approvalSettings, category: 'approval' },
            { key: 'notification', value: notificationSettings, category: 'notification' },
          ],
        }),
      })

      if (response.ok) {
        toast.success('Settings saved successfully')
      } else {
        toast.error('Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
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
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground">
            Configure system-wide settings and thresholds
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSettings} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="approval">Approval Thresholds</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                Basic company details used across the system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={generalSettings.companyName}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Beshara Group"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Company Email</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={generalSettings.companyEmail}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, companyEmail: e.target.value }))}
                    placeholder="info@besharagroup.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyPhone">Company Phone</Label>
                  <Input
                    id="companyPhone"
                    value={generalSettings.companyPhone}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, companyPhone: e.target.value }))}
                    placeholder="+965 XXXX XXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultCurrency">Default Currency</Label>
                  <Input
                    id="defaultCurrency"
                    value={generalSettings.defaultCurrency}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, defaultCurrency: e.target.value }))}
                    placeholder="KWD"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyAddress">Company Address</Label>
                <Input
                  id="companyAddress"
                  value={generalSettings.companyAddress}
                  onChange={(e) => setGeneralSettings(prev => ({ ...prev, companyAddress: e.target.value }))}
                  placeholder="Kuwait City, Kuwait"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approval">
          <Card>
            <CardHeader>
              <CardTitle>Approval Thresholds</CardTitle>
              <CardDescription>
                Configure amount thresholds for different approval levels (in KWD)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="autoApprove">Auto-Approve Threshold</Label>
                  <Input
                    id="autoApprove"
                    type="number"
                    value={approvalSettings.autoApproveThreshold}
                    onChange={(e) => setApprovalSettings(prev => ({ ...prev, autoApproveThreshold: Number(e.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground">Amounts below this are auto-approved</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="managerApprove">Manager Approval Threshold</Label>
                  <Input
                    id="managerApprove"
                    type="number"
                    value={approvalSettings.managerApproveThreshold}
                    onChange={(e) => setApprovalSettings(prev => ({ ...prev, managerApproveThreshold: Number(e.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground">Amounts up to this require manager approval</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="financeManagerApprove">Finance Manager Threshold</Label>
                  <Input
                    id="financeManagerApprove"
                    type="number"
                    value={approvalSettings.financeManagerThreshold}
                    onChange={(e) => setApprovalSettings(prev => ({ ...prev, financeManagerThreshold: Number(e.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground">Amounts up to this require finance manager approval</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cfoApprove">CFO Approval Threshold</Label>
                  <Input
                    id="cfoApprove"
                    type="number"
                    value={approvalSettings.cfoApproveThreshold}
                    onChange={(e) => setApprovalSettings(prev => ({ ...prev, cfoApproveThreshold: Number(e.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground">Amounts up to this require CFO approval</p>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-4">Budget Alert Thresholds</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budgetWarning">Warning Threshold (%)</Label>
                    <Input
                      id="budgetWarning"
                      type="number"
                      min="0"
                      max="100"
                      value={approvalSettings.budgetWarningThreshold}
                      onChange={(e) => setApprovalSettings(prev => ({ ...prev, budgetWarningThreshold: Number(e.target.value) }))}
                    />
                    <p className="text-xs text-muted-foreground">Alert when budget consumption exceeds this %</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budgetCritical">Critical Threshold (%)</Label>
                    <Input
                      id="budgetCritical"
                      type="number"
                      min="0"
                      max="100"
                      value={approvalSettings.budgetCriticalThreshold}
                      onChange={(e) => setApprovalSettings(prev => ({ ...prev, budgetCriticalThreshold: Number(e.target.value) }))}
                    />
                    <p className="text-xs text-muted-foreground">Critical alert when budget exceeds this %</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure system-wide notification settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Send notifications via email</p>
                </div>
                <Switch
                  checked={notificationSettings.emailNotifications}
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, emailNotifications: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>System Notifications</Label>
                  <p className="text-sm text-muted-foreground">Show in-app notifications</p>
                </div>
                <Switch
                  checked={notificationSettings.systemNotifications}
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, systemNotifications: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Budget Alerts</Label>
                  <p className="text-sm text-muted-foreground">Notify when budget thresholds are exceeded</p>
                </div>
                <Switch
                  checked={notificationSettings.budgetAlerts}
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, budgetAlerts: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Approval Reminders</Label>
                  <p className="text-sm text-muted-foreground">Remind approvers of pending items</p>
                </div>
                <Switch
                  checked={notificationSettings.approvalReminders}
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, approvalReminders: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Tender Deadline Reminders</Label>
                  <p className="text-sm text-muted-foreground">Remind before tender submission deadlines</p>
                </div>
                <Switch
                  checked={notificationSettings.tenderDeadlineReminders}
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, tenderDeadlineReminders: checked }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reminderDays">Reminder Days Before Deadline</Label>
                <Input
                  id="reminderDays"
                  type="number"
                  min="1"
                  max="30"
                  value={notificationSettings.reminderDaysBefore}
                  onChange={(e) => setNotificationSettings(prev => ({ ...prev, reminderDaysBefore: Number(e.target.value) }))}
                  className="w-24"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
