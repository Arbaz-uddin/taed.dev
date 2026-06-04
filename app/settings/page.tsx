'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ArrowLeft, Settings, CreditCard, User, Loader2, Plus, Trash2, Check, Star, Key, Eye, EyeOff, RefreshCw, Copy, BarChart3, Wallet, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import type { Profile, PaymentMethod } from '@/lib/types/database'
import { useIdleTimeout } from '@/hooks/use-idle-timeout'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface UsageLog {
  id: string
  api_id: string | null
  file_name: string | null
  success: boolean
  processing_time_ms: number | null
  created_at: string
}

interface SavedAPI {
  id: string
  name: string
}

interface WalletTransaction {
  id: string
  amount: number
  type: 'credit' | 'debit' | 'signup_bonus' | 'admin_credit'
  description: string | null
  balance_after: number
  created_at: string
}

export default function SettingsPage() {
  // Enable idle timeout - logs out user after 10 minutes of inactivity
  useIdleTimeout()
  
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [profile, setProfile] = useState<(Profile & { api_key?: string | null }) | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([])
  const [savedAPIs, setSavedAPIs] = useState<SavedAPI[]>([])
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([])
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Profile edit state
  const [fullName, setFullName] = useState('')

  // API Key state
  const [showApiKey, setShowApiKey] = useState(false)
  const [generatingKey, setGeneratingKey] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)

  // Payment method state
  const [showAddCard, setShowAddCard] = useState(false)
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvc, setCardCvc] = useState('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        window.location.href = '/auth/login'
        return
      }

      setUser({ id: authUser.id, email: authUser.email || '' })

      // Load all data in parallel for faster loading
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const [profileResult, paymentsResult, logsResult, apisResult, transactionsResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', authUser.id).single(),
        supabase.from('payment_methods').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false }),
        supabase.from('api_usage_logs').select('id, api_id, file_name, success, processing_time_ms, created_at').eq('user_id', authUser.id).gte('created_at', thirtyDaysAgo.toISOString()).order('created_at', { ascending: false }),
        supabase.from('saved_apis').select('id, name').eq('user_id', authUser.id),
        supabase.from('wallet_transactions').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false }).limit(50)
      ])

      if (profileResult.data) {
        setProfile(profileResult.data)
        setFullName(profileResult.data.full_name || '')
      }
      if (paymentsResult.data) setPaymentMethods(paymentsResult.data)
      if (logsResult.data) setUsageLogs(logsResult.data)
      if (apisResult.data) setSavedAPIs(apisResult.data)
      if (transactionsResult.data) setWalletTransactions(transactionsResult.data)
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Generate API key
  const generateApiKey = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let key = 'taed_sk_'
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return key
  }

  const handleGenerateApiKey = async () => {
    if (!user) return

    setGeneratingKey(true)
    setError(null)

    try {
      const newKey = generateApiKey()
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ api_key: newKey, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      if (updateError) throw updateError

      setProfile(prev => prev ? { ...prev, api_key: newKey } : null)
      setShowApiKey(true)
      setShowResetConfirm(false)
      setSuccess('API key generated successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error generating API key:', err)
      setError('Failed to generate API key')
    } finally {
      setGeneratingKey(false)
    }
  }

  const handleResetApiKey = async () => {
    await handleGenerateApiKey()
  }

  const copyApiKey = async () => {
    if (!profile?.api_key) return
    await navigator.clipboard.writeText(profile.api_key)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  const handleUpdateProfile = async () => {
    if (!user) return

    setSaving(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), updated_at: new Date().toISOString() })
        .eq('id', user.id)

      if (updateError) throw updateError

      setProfile(prev => prev ? { ...prev, full_name: fullName.trim() } : null)
      setSuccess('Profile updated successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error updating profile:', err)
      setError('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleAddPaymentMethod = async () => {
    if (!user || !cardNumber || !cardExpiry) return

    setSaving(true)
    setError(null)

    try {
      const lastFour = cardNumber.replace(/\s/g, '').slice(-4)
      const [expMonth, expYear] = cardExpiry.split('/').map(s => parseInt(s.trim()))
      
      const cleanNumber = cardNumber.replace(/\s/g, '')
      let brand = 'Unknown'
      if (cleanNumber.startsWith('4')) brand = 'Visa'
      else if (cleanNumber.startsWith('5')) brand = 'Mastercard'
      else if (cleanNumber.startsWith('3')) brand = 'Amex'

      const isFirstCard = paymentMethods.length === 0

      const { data: newPayment, error: insertError } = await supabase
        .from('payment_methods')
        .insert({
          user_id: user.id,
          card_last_four: lastFour,
          card_brand: brand,
          exp_month: expMonth,
          exp_year: 2000 + expYear,
          is_default: isFirstCard,
        })
        .select()
        .single()

      if (insertError) throw insertError

      setPaymentMethods([newPayment, ...paymentMethods])
      setShowAddCard(false)
      setCardNumber('')
      setCardExpiry('')
      setCardCvc('')
      setSuccess('Payment method added successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error adding payment method:', err)
      setError('Failed to add payment method')
    } finally {
      setSaving(false)
    }
  }

  const handleSetDefaultCard = async (paymentId: string) => {
    if (!user) return

    setSaving(true)
    setError(null)

    try {
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id)

      const { error: updateError } = await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', paymentId)

      if (updateError) throw updateError

      setPaymentMethods(paymentMethods.map(pm => ({
        ...pm,
        is_default: pm.id === paymentId
      })))
      setSuccess('Default payment method updated!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error setting default card:', err)
      setError('Failed to set default card')
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePaymentMethod = async (paymentId: string) => {
    setSaving(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', paymentId)

      if (deleteError) throw deleteError

      setPaymentMethods(paymentMethods.filter(pm => pm.id !== paymentId))
      setSuccess('Payment method removed!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error deleting payment method:', err)
      setError('Failed to remove payment method')
    } finally {
      setSaving(false)
    }
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    return parts.length ? parts.join(' ') : value
  }

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    if (v.length >= 2) {
      return v.slice(0, 2) + '/' + v.slice(2, 4)
    }
    return v
  }

  // Usage analytics
  const dailyUsageData = useMemo(() => {
    const last7Days: { date: string; count: number; success: number; failed: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const dayLogs = usageLogs.filter(l => l.created_at.startsWith(dateStr))
      last7Days.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        count: dayLogs.length,
        success: dayLogs.filter(l => l.success).length,
        failed: dayLogs.filter(l => !l.success).length,
      })
    }
    return last7Days
  }, [usageLogs])

  const apiBreakdownData = useMemo(() => {
    const breakdown: Record<string, number> = {}
    usageLogs.forEach(log => {
      const apiName = savedAPIs.find(a => a.id === log.api_id)?.name || 'Unknown API'
      breakdown[apiName] = (breakdown[apiName] || 0) + 1
    })
    return Object.entries(breakdown).map(([name, value]) => ({ name, value }))
  }, [usageLogs, savedAPIs])

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  const totalRequests = usageLogs.length
  const successRate = totalRequests > 0 
    ? Math.round((usageLogs.filter(l => l.success).length / totalRequests) * 100) 
    : 0
  const avgProcessingTime = totalRequests > 0
    ? Math.round(usageLogs.reduce((sum, l) => sum + (l.processing_time_ms || 0), 0) / totalRequests)
    : 0

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/app">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <img src="/logo-dark.png" alt="TAED" className="h-8 w-auto hidden dark:block" />
            <img src="/logo-light.png" alt="TAED" className="h-8 w-auto dark:hidden" />
            <div>
              <h1 className="font-semibold text-foreground">Settings</h1>
              <p className="text-xs text-muted-foreground">Manage your account, API keys, and billing</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-500/50 bg-green-500/10">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">{success}</AlertDescription>
          </Alert>
        )}

              <Tabs defaultValue="wallet" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="wallet" className="gap-2">
                  <Wallet className="h-4 w-4" />
                  Wallet
                </TabsTrigger>
                <TabsTrigger value="api-key" className="gap-2">
                  <Key className="h-4 w-4" />
                  API Key
                </TabsTrigger>
                <TabsTrigger value="usage" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Usage
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Billing
            </TabsTrigger>
          </TabsList>

          {/* API Key Tab */}
              {/* Wallet Tab */}
              <TabsContent value="wallet" className="space-y-6">
                {/* Balance Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      Wallet Balance
                    </CardTitle>
                    <CardDescription>
                      Your current wallet balance for API usage
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-6">
                      <div>
                        <p className="text-sm text-muted-foreground">Available Balance</p>
                        <p className="text-4xl font-bold text-primary">
                          ${Number(profile?.wallet_balance || 0).toFixed(2)}
                        </p>
                      </div>
                      <Link href="/contact">
                        <Button variant="outline" className="gap-2">
                          <Plus className="h-4 w-4" />
                          Add Funds
                        </Button>
                      </Link>
                    </div>

                    {Number(profile?.wallet_balance || 0) < 1 && (
                      <Alert className="mt-4 border-yellow-500/50 bg-yellow-500/10">
                        <AlertDescription className="text-yellow-600 dark:text-yellow-400">
                          Your balance is low. Contact sales to add more funds.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                {/* Transaction History */}
                <Card>
                  <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>
                      Recent wallet transactions and API usage costs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {walletTransactions.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        No transactions yet
                      </p>
                    ) : (
                      <div className="rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Type</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead className="text-right">Balance</TableHead>
                              <TableHead className="text-right">Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {walletTransactions.map((tx) => (
                              <TableRow key={tx.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {tx.amount >= 0 ? (
                                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/10">
                                        <ArrowDownLeft className="h-3 w-3 text-green-500" />
                                      </div>
                                    ) : (
                                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/10">
                                        <ArrowUpRight className="h-3 w-3 text-red-500" />
                                      </div>
                                    )}
                                    <span className="text-xs capitalize">
                                      {tx.type.replace('_', ' ')}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate text-sm">
                                  {tx.description || '-'}
                                </TableCell>
                                <TableCell className={`text-right font-mono text-sm ${tx.amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {tx.amount >= 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(4)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  ${Number(tx.balance_after).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right text-xs text-muted-foreground">
                                  {new Date(tx.created_at).toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* API Key Tab */}
              <TabsContent value="api-key" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Authentication Key
                </CardTitle>
                <CardDescription>
                  Use this key to authenticate API requests. Keep it secret and never share it publicly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!profile?.api_key ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 py-8">
                    <Key className="h-10 w-10 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">No API key generated yet</p>
                    <p className="text-xs text-muted-foreground/70 mb-4">
                      Generate a key to start using the TAED API
                    </p>
                    <Button onClick={handleGenerateApiKey} disabled={generatingKey}>
                      {generatingKey && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Generate API Key
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Your API Key</Label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Input
                            value={showApiKey ? profile.api_key : '•'.repeat(profile.api_key.length)}
                            readOnly
                            className="font-mono pr-20 bg-muted"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setShowApiKey(!showApiKey)}
                            >
                              {showApiKey ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={copyApiKey}
                            >
                              {copiedKey ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => setShowResetConfirm(true)}
                          className="gap-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Reset Key
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Use this key in your API requests with the <code className="bg-muted px-1 rounded">X-API-Key</code> header
                      </p>
                    </div>

                    <div className="rounded-lg border bg-muted/50 p-4">
                      <p className="text-sm font-medium mb-2">Example CURL Request:</p>
                      <pre className="text-xs bg-background p-3 rounded-md overflow-x-auto">
{`curl -X POST https://your-domain.com/api/v1/extract \\
  -H "X-API-Key: ${showApiKey ? profile.api_key : 'your_api_key'}" \\
  -F "api_id=YOUR_API_ID" \\
  -F "file=@/path/to/document.pdf"`}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-6">
            {/* Usage Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Requests (30 days)</CardDescription>
                  <CardTitle className="text-3xl">{totalRequests}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Success Rate</CardDescription>
                  <CardTitle className="text-3xl">{successRate}%</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Avg. Processing Time</CardDescription>
                  <CardTitle className="text-3xl">{avgProcessingTime}ms</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Daily Usage Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Usage (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                {totalRequests === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <BarChart3 className="h-10 w-10 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">No usage data yet</p>
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyUsageData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                        <Bar dataKey="success" fill="#10b981" name="Success" stackId="a" />
                        <Bar dataKey="failed" fill="#ef4444" name="Failed" stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* API Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Usage by API</CardTitle>
                <CardDescription>Breakdown of requests per API configuration</CardDescription>
              </CardHeader>
              <CardContent>
                {apiBreakdownData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <BarChart3 className="h-10 w-10 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">No API usage data yet</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={apiBreakdownData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {apiBreakdownData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                      {apiBreakdownData.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-3 w-3 rounded-full" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-sm font-medium">{item.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{item.value} requests</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Logs */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {usageLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <p className="text-sm text-muted-foreground">No recent requests</p>
                  </div>
                ) : (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>File</TableHead>
                          <TableHead>API</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usageLogs.slice(0, 10).map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-xs">
                              {log.file_name || 'N/A'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {savedAPIs.find(a => a.id === log.api_id)?.name || 'Unknown'}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                log.success 
                                  ? 'bg-green-500/10 text-green-600' 
                                  : 'bg-red-500/10 text-red-600'
                              }`}>
                                {log.success ? 'Success' : 'Failed'}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {log.processing_time_ms}ms
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(log.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile
                </CardTitle>
                <CardDescription>
                  Update your personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <Button onClick={handleUpdateProfile} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <div className="space-y-2">
                  <p><span className="font-medium text-foreground">Account Type:</span> {profile?.role === 'super_admin' ? 'Super Admin' : 'User'}</p>
                  <p><span className="font-medium text-foreground">Member Since:</span> {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Payment Methods
                    </CardTitle>
                    <CardDescription>
                      Manage your saved payment methods
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowAddCard(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Card
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {paymentMethods.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 py-8">
                    <CreditCard className="h-10 w-10 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">No payment methods saved</p>
                    <p className="text-xs text-muted-foreground/70">
                      Add a card to enable billing features
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentMethods.map((payment) => (
                      <div
                        key={payment.id}
                        className={`flex items-center justify-between rounded-lg border p-4 ${
                          payment.is_default ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-14 items-center justify-center rounded bg-muted text-xs font-medium">
                            {payment.card_brand}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              **** **** **** {payment.card_last_four}
                              {payment.is_default && (
                                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                  <Star className="h-3 w-3" />
                                  Default
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Expires {payment.exp_month.toString().padStart(2, '0')}/{payment.exp_year}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!payment.is_default && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetDefaultCard(payment.id)}
                              disabled={saving}
                            >
                              Set Default
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeletePaymentMethod(payment.id)}
                            disabled={saving}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Reset API Key Confirmation Dialog */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Reset API Key?
            </DialogTitle>
            <DialogDescription>
              This will invalidate your current API key. Any applications using the old key will stop working.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleResetApiKey} disabled={generatingKey}>
              {generatingKey && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Card Dialog */}
      <Dialog open={showAddCard} onOpenChange={setShowAddCard}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Add Payment Method
            </DialogTitle>
            <DialogDescription>
              Enter your card details to add a new payment method.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="card-number">Card Number</Label>
              <Input
                id="card-number"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="card-expiry">Expiry Date</Label>
                <Input
                  id="card-expiry"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY"
                  maxLength={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-cvc">CVC</Label>
                <Input
                  id="card-cvc"
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="123"
                  maxLength={4}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              This is a demo. In production, card details would be handled securely via Stripe.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCard(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddPaymentMethod} 
              disabled={!cardNumber || !cardExpiry || saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
