'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Save, 
  Building, 
  Key, 
  Bell, 
  Palette, 
  Activity, 
  ExternalLink, 
  Eye, 
  EyeOff,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2
} from 'lucide-react'

interface ApiKeySetting {
  key: string
  label: string
  description: string
  isSet: boolean
  source: 'database' | 'environment' | 'not_set'
  maskedValue: string
  isSecret: boolean
}

function ApiKeyInput({ 
  setting, 
  onSave, 
  onDelete,
  saving 
}: { 
  setting: ApiKeySetting
  onSave: (key: string, value: string) => Promise<void>
  onDelete: (key: string) => Promise<void>
  saving: string | null
}) {
  const [value, setValue] = useState('')
  const [showValue, setShowValue] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const handleSave = async () => {
    await onSave(setting.key, value)
    setValue('')
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (confirm(`Remove ${setting.label}?`)) {
      await onDelete(setting.key)
    }
  }

  const isSaving = saving === setting.key

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Label className="font-medium">{setting.label}</Label>
            {setting.isSet && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                setting.source === 'environment' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                {setting.source === 'environment' ? 'From ENV' : 'Saved'}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{setting.description}</p>
        </div>
        {setting.isSet && (
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <div className="relative">
            <Input
              type={showValue ? 'text' : 'password'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={setting.isSet ? 'Enter new value to replace' : 'Enter API key'}
              className="pr-10"
            />
            {setting.isSecret && (
              <button
                type="button"
                onClick={() => setShowValue(!showValue)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={!value || isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setIsEditing(false); setValue(''); }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {setting.isSet ? (
            <>
              <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm font-mono">
                {setting.maskedValue}
              </code>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                Change
              </Button>
              {setting.source === 'database' && (
                <Button size="sm" variant="ghost" onClick={handleDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </>
          ) : (
            <>
              <span className="flex-1 text-sm text-muted-foreground italic">Not configured</span>
              <Button size="sm" onClick={() => setIsEditing(true)}>
                <Key className="w-4 h-4 mr-1" />
                Add Key
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [apiKeys, setApiKeys] = useState<ApiKeySetting[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/admin/api-keys')
      if (!response.ok) {
        if (response.status === 403) {
          setError('You need admin privileges to manage API keys')
          return
        }
        throw new Error('Failed to load API keys')
      }
      const data = await response.json()
      setApiKeys(data.settings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const handleSave = async (key: string, value: string) => {
    setSaving(key)
    setError(null)
    setSuccess(null)
    
    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save API key')
      }
      
      setSuccess('API key saved successfully')
      await fetchApiKeys()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(null)
    }
  }

  const handleDelete = async (key: string) => {
    setSaving(key)
    setError(null)
    
    try {
      const response = await fetch(`/api/admin/api-keys?key=${key}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to remove API key')
      }
      
      setSuccess('API key removed')
      await fetchApiKeys()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove')
    } finally {
      setSaving(null)
    }
  }

  // Clear messages after 3 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null)
        setError(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [success, error])

  return (
    <div className="container mx-auto py-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your system configuration and preferences</p>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList>
          <TabsTrigger value="company"><Building className="mr-2 h-4 w-4" />Company</TabsTrigger>
          <TabsTrigger value="integrations"><Key className="mr-2 h-4 w-4" />Integrations</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="mr-2 h-4 w-4" />Notifications</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="mr-2 h-4 w-4" />Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Profile</CardTitle>
              <CardDescription>Update your company information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" placeholder="Your Company Name" defaultValue="Beshara Group" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID</Label>
                  <Input id="taxId" placeholder="Tax identification number" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="company@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" placeholder="+965 XXXX XXXX" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="Company address" />
              </div>
              <Button><Save className="mr-2 h-4 w-4" />Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="space-y-6">
            {/* Status Messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-800">{error}</span>
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-green-800">{success}</span>
              </div>
            )}

            {/* API Diagnostics Link */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">API Diagnostics</p>
                    <p className="text-sm text-blue-700">Test connectivity to AI providers and services</p>
                  </div>
                </div>
                <Link href="/settings/diagnostics">
                  <Button variant="outline" size="sm">
                    Open Diagnostics <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>AI Provider API Keys</CardTitle>
                <CardDescription>
                  Configure API keys for AI-powered document extraction. Keys are encrypted and stored securely.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-500">Loading API keys...</span>
                  </div>
                ) : apiKeys.length > 0 ? (
                  <div className="space-y-4">
                    {/* Group AI providers */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700">AI Providers</h4>
                      {apiKeys
                        .filter(k => ['GROQ_API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY'].includes(k.key))
                        .map(setting => (
                          <ApiKeyInput
                            key={setting.key}
                            setting={setting}
                            onSave={handleSave}
                            onDelete={handleDelete}
                            saving={saving}
                          />
                        ))
                      }
                    </div>

                    {/* AWS credentials */}
                    <div className="space-y-3 pt-4 border-t">
                      <h4 className="text-sm font-medium text-gray-700">AWS (for OCR/Textract)</h4>
                      {apiKeys
                        .filter(k => k.key.startsWith('AWS_'))
                        .map(setting => (
                          <ApiKeyInput
                            key={setting.key}
                            setting={setting}
                            onSave={handleSave}
                            onDelete={handleDelete}
                            saving={saving}
                          />
                        ))
                      }
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Unable to load API key settings
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Environment Variables</CardTitle>
                <CardDescription>
                  API keys can also be set via environment variables on your hosting platform (Railway, Vercel, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-4 text-sm">
                  <p className="text-gray-600 mb-2">Priority order for API keys:</p>
                  <ol className="list-decimal list-inside space-y-1 text-gray-700">
                    <li><strong>Database</strong> - Keys saved through this settings page</li>
                    <li><strong>Environment</strong> - Variables set on your hosting platform</li>
                  </ol>
                  <p className="text-gray-500 mt-3 text-xs">
                    Keys saved here override environment variables for the same setting.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Notification settings - Implementation in progress</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the look and feel</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Appearance settings - Implementation in progress</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
