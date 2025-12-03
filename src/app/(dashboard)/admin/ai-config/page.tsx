'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Edit, Trash2, Brain, RefreshCw, ArrowUp, ArrowDown, Check, X } from 'lucide-react'
import { toast } from 'sonner'

interface AIProvider {
  id: string
  provider: string
  name: string
  model: string
  priority: number
  isEnabled: boolean
  rateLimit: number | null
  dailyLimit: number | null
  usageCount: number
  lastUsed: string | null
  capabilities: string[] | null
  hasApiKey: boolean
}

const PROVIDER_OPTIONS = [
  { value: 'groq', label: 'Groq', models: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'] },
  { value: 'gemini', label: 'Google Gemini', models: ['gemini-2.0-flash', 'gemini-2.0-flash-exp'] },
  { value: 'google_ai', label: 'Google AI Studio', models: ['gemini-2.0-flash', 'gemini-2.0-flash-exp'] },
  { value: 'anthropic', label: 'Anthropic Claude', models: ['claude-3-haiku-20240307', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'] },
  { value: 'openai', label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
]

const CAPABILITY_OPTIONS = [
  'vision',
  'arabic',
  'extraction',
  'summarization',
  'translation',
  'complex_analysis',
]

export default function AdminAIConfigPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [providers, setProviders] = useState<AIProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    provider: 'groq',
    name: '',
    model: '',
    apiKey: '',
    priority: 1,
    isEnabled: true,
    rateLimit: 30,
    dailyLimit: 1000,
    capabilities: [] as string[],
  })

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [session, status, router])

  useEffect(() => {
    fetchProviders()
  }, [])

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/admin/ai-providers')
      if (response.ok) {
        const data = await response.json()
        setProviders(data.providers)
      }
    } catch (error) {
      console.error('Error fetching providers:', error)
      toast.error('Failed to fetch AI providers')
    } finally {
      setLoading(false)
    }
  }

  const handleProviderChange = (provider: string) => {
    const providerInfo = PROVIDER_OPTIONS.find(p => p.value === provider)
    setFormData(prev => ({
      ...prev,
      provider,
      name: providerInfo?.label || provider,
      model: providerInfo?.models[0] || '',
    }))
  }

  const handleSave = async () => {
    if (!formData.name || !formData.model) {
      toast.error('Name and model are required')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/admin/ai-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success(editingProvider ? 'Provider updated' : 'Provider created')
        setDialogOpen(false)
        setEditingProvider(null)
        resetForm()
        fetchProviders()
      } else {
        toast.error('Failed to save provider')
      }
    } catch (error) {
      console.error('Error saving provider:', error)
      toast.error('Failed to save provider')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (provider: AIProvider) => {
    setEditingProvider(provider)
    setFormData({
      provider: provider.provider,
      name: provider.name,
      model: provider.model,
      apiKey: '',
      priority: provider.priority,
      isEnabled: provider.isEnabled,
      rateLimit: provider.rateLimit || 30,
      dailyLimit: provider.dailyLimit || 1000,
      capabilities: provider.capabilities || [],
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this provider?')) return

    try {
      const response = await fetch(`/api/admin/ai-providers?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Provider deleted')
        fetchProviders()
      } else {
        toast.error('Failed to delete provider')
      }
    } catch (error) {
      console.error('Error deleting provider:', error)
      toast.error('Failed to delete provider')
    }
  }

  const toggleCapability = (cap: string) => {
    setFormData(prev => ({
      ...prev,
      capabilities: prev.capabilities.includes(cap)
        ? prev.capabilities.filter(c => c !== cap)
        : [...prev.capabilities, cap],
    }))
  }

  const resetForm = () => {
    setFormData({
      provider: 'groq',
      name: 'Groq',
      model: 'llama-3.1-70b-versatile',
      apiKey: '',
      priority: 1,
      isEnabled: true,
      rateLimit: 30,
      dailyLimit: 1000,
      capabilities: [],
    })
  }

  const getProviderModels = (provider: string) => {
    return PROVIDER_OPTIONS.find(p => p.value === provider)?.models || []
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
          <h1 className="text-3xl font-bold tracking-tight">AI Provider Configuration</h1>
          <p className="text-muted-foreground">
            Manage AI providers, API keys, and fallback priorities
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchProviders}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) {
              setEditingProvider(null)
              resetForm()
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Provider
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingProvider ? 'Edit Provider' : 'Add AI Provider'}</DialogTitle>
                <DialogDescription>
                  Configure an AI provider for document extraction
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select value={formData.provider} onValueChange={handleProviderChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDER_OPTIONS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Select value={formData.model} onValueChange={(m) => setFormData(prev => ({ ...prev, model: m }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getProviderModels(formData.provider).map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Groq (Primary)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder={editingProvider?.hasApiKey ? '••••••••' : 'Enter API key'}
                  />
                  {editingProvider?.hasApiKey && (
                    <p className="text-xs text-muted-foreground">Leave blank to keep existing key</p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: Number(e.target.value) }))}
                    />
                    <p className="text-xs text-muted-foreground">Lower = higher priority</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Rate Limit/min</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.rateLimit}
                      onChange={(e) => setFormData(prev => ({ ...prev, rateLimit: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Daily Limit</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.dailyLimit}
                      onChange={(e) => setFormData(prev => ({ ...prev, dailyLimit: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Capabilities</Label>
                  <div className="flex flex-wrap gap-2">
                    {CAPABILITY_OPTIONS.map((cap) => (
                      <Badge
                        key={cap}
                        variant={formData.capabilities.includes(cap) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleCapability(cap)}
                      >
                        {cap}
                        {formData.capabilities.includes(cap) && <Check className="h-3 w-3 ml-1" />}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.isEnabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isEnabled: checked }))}
                  />
                  <Label>Enabled</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Provider'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provider Fallback Chain</CardTitle>
          <CardDescription>
            Providers are used in order of priority. If one fails, the next is tried.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {providers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Brain className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No AI providers configured</p>
              <p className="text-sm text-muted-foreground">Add a provider to enable AI extraction</p>
            </div>
          ) : (
            <div className="space-y-3">
              {providers
                .sort((a, b) => a.priority - b.priority)
                .map((provider, index) => (
                  <div
                    key={provider.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      provider.isEnabled ? '' : 'opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center text-muted-foreground">
                        <span className="text-xs">Priority</span>
                        <span className="text-lg font-bold">{provider.priority}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{provider.name}</span>
                          {provider.isEnabled ? (
                            <Badge variant="secondary" className="text-green-600">
                              <Check className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              <X className="h-3 w-3 mr-1" />
                              Disabled
                            </Badge>
                          )}
                          {provider.hasApiKey ? (
                            <Badge variant="outline" className="text-green-600">API Key Set</Badge>
                          ) : (
                            <Badge variant="destructive">No API Key</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {provider.model} - {provider.rateLimit} req/min, {provider.dailyLimit}/day
                        </p>
                        {provider.capabilities && provider.capabilities.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {provider.capabilities.map((cap) => (
                              <Badge key={cap} variant="outline" className="text-xs">
                                {cap}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right text-sm text-muted-foreground mr-4">
                        <div>Usage: {provider.usageCount}</div>
                        {provider.lastUsed && (
                          <div>Last: {new Date(provider.lastUsed).toLocaleDateString()}</div>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(provider)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(provider.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Setup</CardTitle>
          <CardDescription>
            Set up common AI providers with default configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            To configure AI providers, you&apos;ll need API keys from:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <strong>Groq:</strong>
              <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                console.groq.com
              </a>
              <span className="text-muted-foreground">- Fastest, free tier available</span>
            </li>
            <li className="flex items-center gap-2">
              <strong>Google AI:</strong>
              <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                aistudio.google.com
              </a>
              <span className="text-muted-foreground">- Good for vision/documents</span>
            </li>
            <li className="flex items-center gap-2">
              <strong>Anthropic:</strong>
              <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                console.anthropic.com
              </a>
              <span className="text-muted-foreground">- Best for complex analysis</span>
            </li>
            <li className="flex items-center gap-2">
              <strong>OpenAI:</strong>
              <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                platform.openai.com
              </a>
              <span className="text-muted-foreground">- General purpose</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
