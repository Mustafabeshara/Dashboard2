'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  Bell,
  Building,
  CheckCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Mail,
  Monitor,
  Moon,
  Palette,
  Save,
  Scan,
  Sun,
  Trash2,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface ApiKeySetting {
  key: string;
  label: string;
  description: string;
  isSet: boolean;
  source: 'database' | 'environment' | 'not_set';
  maskedValue: string;
  isSecret: boolean;
  category?: 'ai' | 'ocr' | 'email' | 'other';
}

interface NotificationPreferences {
  email: boolean;
  system: boolean;
  budgetAlerts: boolean;
  tenderUpdates: boolean;
  inventoryAlerts: boolean;
  approvalRequests: boolean;
  weeklyDigest: boolean;
}

interface AppearancePreferences {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  compactMode: boolean;
  colorScheme: 'default' | 'blue' | 'green' | 'purple';
}

interface CompanyProfile {
  name: string;
  taxId: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  registrationNumber: string;
  currency: string;
}

function ApiKeyInput({
  setting,
  onSave,
  onDelete,
  saving,
}: {
  setting: ApiKeySetting;
  onSave: (key: string, value: string) => Promise<boolean>;
  onDelete: (key: string) => Promise<void>;
  saving: string | null;
}) {
  const [value, setValue] = useState('');
  const [showValue, setShowValue] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSave = async () => {
    setLocalError(null);
    const success = await onSave(setting.key, value);
    if (success) {
      setValue('');
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Remove ${setting.label}?`)) {
      await onDelete(setting.key);
    }
  };

  const isSaving = saving === setting.key;

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Label className="font-medium">{setting.label}</Label>
            {setting.isSet && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  setting.source === 'environment'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {setting.source === 'environment' ? 'From ENV' : 'Saved'}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{setting.description}</p>
        </div>
        {setting.isSet && <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <div className="relative">
            <Input
              type={showValue ? 'text' : 'password'}
              value={value}
              onChange={e => setValue(e.target.value)}
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
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setValue('');
              }}
            >
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
              {setting.source === 'environment' ? (
                <span className="text-xs text-blue-600 font-medium">Edit in Railway/Vercel</span>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                    Change
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDelete}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
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
  );
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeySetting[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Company Profile state
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({
    name: '',
    taxId: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    registrationNumber: '',
    currency: 'KWD',
  });
  const [savingCompany, setSavingCompany] = useState(false);

  // Notification Preferences state
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    email: true,
    system: true,
    budgetAlerts: true,
    tenderUpdates: true,
    inventoryAlerts: true,
    approvalRequests: true,
    weeklyDigest: false,
  });
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Appearance state
  const [appearance, setAppearance] = useState<AppearancePreferences>({
    theme: 'system',
    sidebarCollapsed: false,
    compactMode: false,
    colorScheme: 'default',
  });
  const [savingAppearance, setSavingAppearance] = useState(false);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/admin/api-keys');
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 403) {
          setError(data.error || 'API Key management requires a management role');
          return;
        }
        if (response.status === 401) {
          setError('Please log in to manage API keys');
          return;
        }
        throw new Error(data.error || 'Failed to load API keys');
      }
      const data = await response.json();
      setApiKeys(data.settings);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('API keys fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    }
  };

  const fetchCompanyProfile = async () => {
    try {
      const response = await fetch('/api/company/profile');
      if (response.ok) {
        const data = await response.json();
        setCompanyProfile(data);
      }
    } catch (err) {
      console.error('Company profile fetch error:', err);
    }
  };

  const fetchUserPreferences = async () => {
    try {
      const response = await fetch('/api/user/preferences');
      if (response.ok) {
        const data = await response.json();
        if (data.notifications) setNotifications(data.notifications);
        if (data.appearance) setAppearance(data.appearance);
      }
    } catch (err) {
      console.error('User preferences fetch error:', err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchApiKeys(), fetchCompanyProfile(), fetchUserPreferences()]);
      setLoading(false);
    };
    loadAll();
  }, []);

  const handleSave = async (key: string, value: string): Promise<boolean> => {
    setSaving(key);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || `Failed to save API key (${response.status})`);
        return false;
      }

      setSuccess('API key saved successfully');
      await fetchApiKeys();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      return false;
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (key: string) => {
    setSaving(key);
    setError(null);

    try {
      const response = await fetch(`/api/admin/api-keys?key=${key}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove API key');
      }

      setSuccess('API key removed');
      await fetchApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveCompanyProfile = async () => {
    setSavingCompany(true);
    setError(null);

    try {
      const response = await fetch('/api/company/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyProfile),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save company profile');
      }

      setSuccess('Company profile saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSavingNotifications(true);
    setError(null);

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications }),
      });

      if (!response.ok) {
        throw new Error('Failed to save notification preferences');
      }

      setSuccess('Notification preferences saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleSaveAppearance = async () => {
    setSavingAppearance(true);
    setError(null);

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appearance }),
      });

      if (!response.ok) {
        throw new Error('Failed to save appearance preferences');
      }

      // Apply theme immediately
      applyTheme(appearance.theme);

      setSuccess('Appearance preferences saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingAppearance(false);
    }
  };

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  // Clear messages after 3 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  return (
    <div className="container mx-auto py-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your system configuration and preferences</p>
      </div>

      {/* Global Messages */}
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

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList>
          <TabsTrigger value="company">
            <Building className="mr-2 h-4 w-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Key className="mr-2 h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="mr-2 h-4 w-4" />
            Appearance
          </TabsTrigger>
        </TabsList>

        {/* Company Profile Tab */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Profile</CardTitle>
              <CardDescription>
                Update your company information used in reports and documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={companyProfile.name}
                    onChange={e => setCompanyProfile({ ...companyProfile, name: e.target.value })}
                    placeholder="Your Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID / VAT Number</Label>
                  <Input
                    id="taxId"
                    value={companyProfile.taxId}
                    onChange={e => setCompanyProfile({ ...companyProfile, taxId: e.target.value })}
                    placeholder="Tax identification number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Company Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={companyProfile.email}
                    onChange={e => setCompanyProfile({ ...companyProfile, email: e.target.value })}
                    placeholder="company@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={companyProfile.phone}
                    onChange={e => setCompanyProfile({ ...companyProfile, phone: e.target.value })}
                    placeholder="+965 XXXX XXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={companyProfile.website}
                    onChange={e =>
                      setCompanyProfile({ ...companyProfile, website: e.target.value })
                    }
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">Registration Number</Label>
                  <Input
                    id="registrationNumber"
                    value={companyProfile.registrationNumber}
                    onChange={e =>
                      setCompanyProfile({ ...companyProfile, registrationNumber: e.target.value })
                    }
                    placeholder="Company registration number"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={companyProfile.address}
                  onChange={e => setCompanyProfile({ ...companyProfile, address: e.target.value })}
                  placeholder="Company address"
                />
              </div>
              <Button onClick={handleSaveCompanyProfile} disabled={savingCompany}>
                {savingCompany ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <div className="space-y-6">
            {/* API Diagnostics Link */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">API Diagnostics</p>
                    <p className="text-sm text-blue-700">
                      Test connectivity to AI providers and services
                    </p>
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
                  Configure API keys for AI-powered document extraction.
                  <strong className="text-blue-600">
                    {' '}
                    Tip: Use environment variables (Railway/Vercel) for production.
                  </strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {apiKeys.some(k => k.source === 'environment') && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">Using Environment Variables</span>
                    </div>
                    <p className="text-green-700 mt-1 text-xs">
                      {apiKeys.filter(k => k.source === 'environment').length} API key(s) loaded
                      from Railway/Vercel environment. These cannot be edited here - update them in
                      your hosting platform's dashboard.
                    </p>
                  </div>
                )}
                {apiKeys.length > 0 ? (
                  <div className="space-y-4">
                    {/* AI Providers */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-blue-600" />
                        <h4 className="text-sm font-medium text-gray-700">AI Providers</h4>
                      </div>
                      {apiKeys
                        .filter(k => k.category === 'ai')
                        .map(setting => (
                          <ApiKeyInput
                            key={setting.key}
                            setting={setting}
                            onSave={handleSave}
                            onDelete={handleDelete}
                            saving={saving}
                          />
                        ))}
                    </div>

                    {/* OCR Providers */}
                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <Scan className="w-4 h-4 text-purple-600" />
                        <h4 className="text-sm font-medium text-gray-700">OCR Providers (for scanned documents)</h4>
                      </div>
                      {apiKeys
                        .filter(k => k.category === 'ocr')
                        .map(setting => (
                          <ApiKeyInput
                            key={setting.key}
                            setting={setting}
                            onSave={handleSave}
                            onDelete={handleDelete}
                            saving={saving}
                          />
                        ))}
                    </div>

                    {/* Email Configuration */}
                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-green-600" />
                        <h4 className="text-sm font-medium text-gray-700">Email Configuration (SMTP)</h4>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm mb-3">
                        <p className="text-amber-800">
                          <strong>Yahoo Mail Setup:</strong> Use <code>smtp.mail.yahoo.com</code> as host, port <code>587</code>,
                          and generate an App Password in Yahoo Account Security settings.
                        </p>
                      </div>
                      {apiKeys
                        .filter(k => k.category === 'email')
                        .map(setting => (
                          <ApiKeyInput
                            key={setting.key}
                            setting={setting}
                            onSave={handleSave}
                            onDelete={handleDelete}
                            saving={saving}
                          />
                        ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    API key management requires admin privileges
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Environment Variables (Recommended for Production)</CardTitle>
                <CardDescription>
                  For Railway/Vercel deployment, set API keys as environment variables for better
                  security
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                  <p className="text-blue-900 font-medium mb-2">✨ Recommended Approach:</p>
                  <p className="text-blue-800 mb-3">
                    Set API keys as environment variables on Railway/Vercel instead of storing them
                    in the database.
                  </p>
                  <p className="text-blue-700 mb-2">Priority order (highest to lowest):</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-800 ml-2">
                    <li>
                      <strong>Environment Variables</strong> - Set on Railway/Vercel dashboard (most
                      secure)
                    </li>
                    <li>
                      <strong>Database</strong> - Keys saved through this settings page (fallback
                      for local/desktop)
                    </li>
                  </ol>
                  <p className="text-blue-600 mt-3 text-xs">
                    💡 Environment variables are more secure and don't require database encryption.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how and when you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700">Delivery Methods</h4>
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <Label className="font-medium">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={notifications.email}
                    onCheckedChange={checked =>
                      setNotifications({ ...notifications, email: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <Label className="font-medium">In-App Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show notifications within the application
                    </p>
                  </div>
                  <Switch
                    checked={notifications.system}
                    onCheckedChange={checked =>
                      setNotifications({ ...notifications, system: checked })
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700">Notification Types</h4>
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <Label className="font-medium">Budget Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifications when budget thresholds are reached
                    </p>
                  </div>
                  <Switch
                    checked={notifications.budgetAlerts}
                    onCheckedChange={checked =>
                      setNotifications({ ...notifications, budgetAlerts: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <Label className="font-medium">Tender Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifications for tender status changes
                    </p>
                  </div>
                  <Switch
                    checked={notifications.tenderUpdates}
                    onCheckedChange={checked =>
                      setNotifications({ ...notifications, tenderUpdates: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <Label className="font-medium">Inventory Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Low stock and reorder notifications
                    </p>
                  </div>
                  <Switch
                    checked={notifications.inventoryAlerts}
                    onCheckedChange={checked =>
                      setNotifications({ ...notifications, inventoryAlerts: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <Label className="font-medium">Approval Requests</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifications when approvals are needed
                    </p>
                  </div>
                  <Switch
                    checked={notifications.approvalRequests}
                    onCheckedChange={checked =>
                      setNotifications({ ...notifications, approvalRequests: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label className="font-medium">Weekly Digest</Label>
                    <p className="text-sm text-muted-foreground">
                      Weekly summary of activities and reports
                    </p>
                  </div>
                  <Switch
                    checked={notifications.weeklyDigest}
                    onCheckedChange={checked =>
                      setNotifications({ ...notifications, weeklyDigest: checked })
                    }
                  />
                </div>
              </div>

              <Button onClick={handleSaveNotifications} disabled={savingNotifications}>
                {savingNotifications ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the look and feel of the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700">Theme</h4>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                      appearance.theme === 'light'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setAppearance({ ...appearance, theme: 'light' })}
                  >
                    <Sun className="w-6 h-6" />
                    <span className="text-sm font-medium">Light</span>
                  </button>
                  <button
                    className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                      appearance.theme === 'dark'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setAppearance({ ...appearance, theme: 'dark' })}
                  >
                    <Moon className="w-6 h-6" />
                    <span className="text-sm font-medium">Dark</span>
                  </button>
                  <button
                    className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                      appearance.theme === 'system'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setAppearance({ ...appearance, theme: 'system' })}
                  >
                    <Monitor className="w-6 h-6" />
                    <span className="text-sm font-medium">System</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700">Color Scheme</h4>
                <div className="flex gap-3">
                  {[
                    { id: 'default', color: 'bg-blue-500', label: 'Default' },
                    { id: 'blue', color: 'bg-sky-500', label: 'Blue' },
                    { id: 'green', color: 'bg-emerald-500', label: 'Green' },
                    { id: 'purple', color: 'bg-violet-500', label: 'Purple' },
                  ].map(scheme => (
                    <button
                      key={scheme.id}
                      className={`flex items-center gap-2 px-4 py-2 border-2 rounded-lg transition-colors ${
                        appearance.colorScheme === scheme.id
                          ? 'border-gray-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() =>
                        setAppearance({
                          ...appearance,
                          colorScheme: scheme.id as AppearancePreferences['colorScheme'],
                        })
                      }
                    >
                      <div className={`w-4 h-4 rounded-full ${scheme.color}`} />
                      <span className="text-sm">{scheme.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700">Layout Options</h4>
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <Label className="font-medium">Collapsed Sidebar</Label>
                    <p className="text-sm text-muted-foreground">
                      Start with sidebar collapsed by default
                    </p>
                  </div>
                  <Switch
                    checked={appearance.sidebarCollapsed}
                    onCheckedChange={checked =>
                      setAppearance({ ...appearance, sidebarCollapsed: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label className="font-medium">Compact Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Reduce spacing for more content on screen
                    </p>
                  </div>
                  <Switch
                    checked={appearance.compactMode}
                    onCheckedChange={checked =>
                      setAppearance({ ...appearance, compactMode: checked })
                    }
                  />
                </div>
              </div>

              <Button onClick={handleSaveAppearance} disabled={savingAppearance}>
                {savingAppearance ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Appearance
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
