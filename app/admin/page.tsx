'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  ArrowLeft, Shield, Users, FileText, Activity, Loader2, Plus, 
  UserPlus, Check, Search, BarChart3, Clock, CheckCircle2, XCircle,
  ChevronLeft, ChevronRight, Wallet, DollarSign, Library, Upload, Trash2, Eye
} from 'lucide-react'
import type { Profile, Team, SavedAPI, APIUsageLog, APICategory } from '@/lib/types/database'
import { Textarea } from '@/components/ui/textarea'
import { useIdleTimeout } from '@/hooks/use-idle-timeout'

interface UsageStats {
  totalExtractions: number
  successfulExtractions: number
  failedExtractions: number
  averageProcessingTime: number
}

interface TeamWithMembers extends Team {
  memberCount: number
  apiCount: number
}

export default function AdminPage() {
  // Enable idle timeout - logs out user after 10 minutes of inactivity
  useIdleTimeout()
  
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  
  // Data state
  const [users, setUsers] = useState<Profile[]>([])
  const [teams, setTeams] = useState<TeamWithMembers[]>([])
  const [apis, setApis] = useState<(SavedAPI & { owner_name: string; team_name: string | null })[]>([])
  const [usageLogs, setUsageLogs] = useState<(APIUsageLog & { user_email: string; api_name: string | null })[]>([])
  const [stats, setStats] = useState<UsageStats>({
    totalExtractions: 0,
    successfulExtractions: 0,
    failedExtractions: 0,
    averageProcessingTime: 0,
  })

  // UI state
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  // Create user state
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newUserRole, setNewUserRole] = useState<'user' | 'super_admin'>('user')

  // Add credit state
  const [showAddCredit, setShowAddCredit] = useState(false)
  const [creditUserId, setCreditUserId] = useState<string | null>(null)
  const [creditAmount, setCreditAmount] = useState('')
  const [creditNote, setCreditNote] = useState('')
  const [addingCredit, setAddingCredit] = useState(false)

  // Library state
  const [libraryAPIs, setLibraryAPIs] = useState<(SavedAPI & { usage_count: number; total_cost: number })[]>([])
  const [categories, setCategories] = useState<APICategory[]>([])
  const [showPushToLibrary, setShowPushToLibrary] = useState(false)
  const [pushApiId, setPushApiId] = useState<string | null>(null)
  const [pushDescription, setPushDescription] = useState('')
  const [pushCategory, setPushCategory] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [pushingToLibrary, setPushingToLibrary] = useState(false)
  const [showDeleteLibraryApi, setShowDeleteLibraryApi] = useState(false)
  const [deleteLibraryApiId, setDeleteLibraryApiId] = useState<string | null>(null)

  // Pagination
  const [usageLogsPage, setUsageLogsPage] = useState(0)
  const logsPerPage = 20

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    setLoading(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        router.push('/auth/login')
        return
      }

      setUser({ id: authUser.id, email: authUser.email || '' })

      // Load profile and check admin role
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (!profileData || profileData.role !== 'super_admin') {
        router.push('/')
        return
      }

      setProfile(profileData)
      await loadAllData()
    } catch (err) {
      console.error('Error checking admin access:', err)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const loadAllData = async () => {
    try {
      // Load all users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersData) {
        setUsers(usersData)
      }

      // Load all teams with member counts
      const { data: teamsData } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false })

      if (teamsData) {
        // Get member counts for each team
        const teamsWithCounts = await Promise.all(
          teamsData.map(async (team: Team) => {
            const { count: memberCount } = await supabase
              .from('profiles')
              .select('*', { count: 'exact', head: true })
              .eq('team_id', team.id)

            const { count: apiCount } = await supabase
              .from('saved_apis')
              .select('*', { count: 'exact', head: true })
              .eq('team_id', team.id)

            return {
              ...team,
              memberCount: memberCount || 0,
              apiCount: apiCount || 0,
            }
          })
        )
        setTeams(teamsWithCounts)
      }

      // Load all APIs with owner info
      const { data: apisData } = await supabase
        .from('saved_apis')
        .select('*, profiles!saved_apis_user_id_fkey(full_name, email), teams(name)')
        .order('created_at', { ascending: false })

      if (apisData) {
        setApis(apisData.map((api: SavedAPI & { profiles: { full_name: string | null; email: string } | null; teams: { name: string } | null }) => ({
          ...api,
          owner_name: api.profiles?.full_name || api.profiles?.email || 'Unknown',
          team_name: api.teams?.name || null,
        })))
      }

      // Load usage logs
      const { data: logsData } = await supabase
        .from('api_usage_logs')
        .select('*, profiles!api_usage_logs_user_id_fkey(email), saved_apis(name)')
        .order('created_at', { ascending: false })
        .limit(500)

      if (logsData) {
        setUsageLogs(logsData.map((log: APIUsageLog & { profiles: { email: string } | null; saved_apis: { name: string } | null }) => ({
          ...log,
          user_email: log.profiles?.email || 'Unknown',
          api_name: log.saved_apis?.name || null,
        })))

        // Calculate stats
        const successful = logsData.filter((l: APIUsageLog) => l.success).length
        const failed = logsData.filter((l: APIUsageLog) => !l.success).length
        const avgTime = logsData.length > 0
          ? logsData.reduce((sum: number, l: APIUsageLog) => sum + (l.processing_time_ms || 0), 0) / logsData.length
          : 0

        setStats({
          totalExtractions: logsData.length,
          successfulExtractions: successful,
          failedExtractions: failed,
          averageProcessingTime: Math.round(avgTime),
        })
      }

      // Load library APIs with usage stats
      const { data: libraryData } = await supabase
        .from('saved_apis')
        .select('*')
        .eq('is_library', true)
        .order('created_at', { ascending: false })

      if (libraryData) {
        // Get usage counts and total costs for each library API
        const libraryWithStats = await Promise.all(libraryData.map(async (api: SavedAPI) => {
          // Count clones
          const { count: cloneCount } = await supabase
            .from('saved_apis')
            .select('*', { count: 'exact', head: true })
            .eq('cloned_from', api.id)

          // Get total cost from usage logs where the API was used or its clones
          const { data: costData } = await supabase
            .from('api_usage_logs')
            .select('cost')
            .eq('api_id', api.id)

          const totalCost = costData?.reduce((sum: number, log: { cost: number | null }) => sum + (Number(log.cost) || 0), 0) || 0

          return {
            ...api,
            usage_count: cloneCount || 0,
            total_cost: totalCost,
          }
        }))

        setLibraryAPIs(libraryWithStats)
      }

      // Load categories
      const { data: categoriesData } = await supabase
        .from('api_categories')
        .select('*')
        .order('name', { ascending: true })

      if (categoriesData) {
        setCategories(categoriesData)
      }
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load admin data')
    }
  }

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserName) return

    setActionLoading(true)
    setError(null)

    try {
      // Create user via Supabase Auth Admin API (this would typically be done server-side)
      // For demo purposes, we'll use signUp which requires email confirmation
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          data: {
            full_name: newUserName,
            role: newUserRole,
          },
        },
      })

      if (authError) throw authError

      // Note: In production, you'd use the Admin API to create users without email confirmation
      // The profile will be created automatically by the trigger

      setShowCreateUser(false)
      setNewUserEmail('')
      setNewUserPassword('')
      setNewUserName('')
      setNewUserRole('user')
      setSuccess('User created successfully! They will need to confirm their email.')
      setTimeout(() => setSuccess(null), 5000)

      // Reload users
      await loadAllData()
    } catch (err) {
      console.error('Error creating user:', err)
      setError('Failed to create user')
    } finally {
      setActionLoading(false)
    }
  }

  const getUserInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
  }

  const handleAddCredit = async () => {
    if (!creditUserId || !creditAmount || !profile) return

    const amount = parseFloat(creditAmount)
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    setAddingCredit(true)
    setError(null)

    try {
      // Get user's current balance
      const { data: targetUser, error: fetchError } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', creditUserId)
        .single()

      if (fetchError) throw fetchError

      const newBalance = Number(targetUser.wallet_balance || 0) + amount

      // Update user's wallet balance
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', creditUserId)

      if (updateError) throw updateError

      // Record the transaction
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: creditUserId,
          amount: amount,
          type: 'admin_credit',
          description: creditNote || `Credit added by admin`,
          admin_id: profile.id,
          balance_after: newBalance,
        })

      if (txError) throw txError

      // Update local state
      setUsers(users.map(u => 
        u.id === creditUserId 
          ? { ...u, wallet_balance: newBalance } 
          : u
      ))

      setShowAddCredit(false)
      setCreditUserId(null)
      setCreditAmount('')
      setCreditNote('')
      setSuccess(`Successfully added $${amount.toFixed(2)} to user's wallet`)
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      console.error('Error adding credit:', err)
      setError('Failed to add credit')
    } finally {
      setAddingCredit(false)
    }
  }

  const openAddCreditDialog = (userId: string) => {
    setCreditUserId(userId)
    setCreditAmount('')
    setCreditNote('')
    setShowAddCredit(true)
  }

  const openPushToLibraryDialog = (apiId: string) => {
    setPushApiId(apiId)
    setPushDescription('')
    setPushCategory('')
    setNewCategory('')
    setShowPushToLibrary(true)
  }

  const handlePushToLibrary = async () => {
    if (!pushApiId || !pushDescription.trim()) return

    const categoryToUse = newCategory.trim() || pushCategory

    if (!categoryToUse) {
      setError('Please select or create a category')
      return
    }

    setPushingToLibrary(true)
    setError(null)

    try {
      // If new category, create it first
      if (newCategory.trim()) {
        const { error: catError } = await supabase
          .from('api_categories')
          .insert({ name: newCategory.trim(), created_by: profile?.id })

        if (catError && !catError.message.includes('duplicate')) {
          throw catError
        }
      }

      // Update the API to be a library API
      const { error: updateError } = await supabase
        .from('saved_apis')
        .update({
          is_library: true,
          description: pushDescription.trim(),
          category: categoryToUse,
        })
        .eq('id', pushApiId)

      if (updateError) throw updateError

      // Reload data
      await loadAllData()

      setShowPushToLibrary(false)
      setPushApiId(null)
      setSuccess('API pushed to library successfully!')
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      console.error('Error pushing to library:', err)
      setError('Failed to push API to library')
    } finally {
      setPushingToLibrary(false)
    }
  }

  const handleDeleteFromLibrary = async () => {
    if (!deleteLibraryApiId) return

    setActionLoading(true)
    setError(null)

    try {
      // Just remove from library (set is_library to false), don't delete
      const { error } = await supabase
        .from('saved_apis')
        .update({ is_library: false })
        .eq('id', deleteLibraryApiId)

      if (error) throw error

      setLibraryAPIs(libraryAPIs.filter(api => api.id !== deleteLibraryApiId))
      setShowDeleteLibraryApi(false)
      setDeleteLibraryApiId(null)
      setSuccess('API removed from library')
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      console.error('Error removing from library:', err)
      setError('Failed to remove API from library')
    } finally {
      setActionLoading(false)
    }
  }

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const paginatedLogs = usageLogs.slice(
    usageLogsPage * logsPerPage,
    (usageLogsPage + 1) * logsPerPage
  )

  const totalLogsPages = Math.ceil(usageLogs.length / logsPerPage)

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
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">Manage users, teams, and monitor usage</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-2xl grid-cols-5">
              <TabsTrigger value="overview" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="teams" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Teams</span>
              </TabsTrigger>
              <TabsTrigger value="library" className="gap-2">
                <Library className="h-4 w-4" />
                <span className="hidden sm:inline">Library</span>
              </TabsTrigger>
              <TabsTrigger value="logs" className="gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Logs</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Users</CardDescription>
                  <CardTitle className="text-3xl">{users.length}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {users.filter(u => u.role === 'super_admin').length} admins
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Teams</CardDescription>
                  <CardTitle className="text-3xl">{teams.length}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {teams.reduce((sum, t) => sum + t.memberCount, 0)} total members
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total APIs</CardDescription>
                  <CardTitle className="text-3xl">{apis.length}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Extraction configurations
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Extractions</CardDescription>
                  <CardTitle className="text-3xl">{stats.totalExtractions}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {stats.successfulExtractions} successful, {stats.failedExtractions} failed
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Usage Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
                <CardDescription>Performance metrics for the OCR extraction service</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="text-sm text-muted-foreground">Success Rate</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">
                      {stats.totalExtractions > 0
                        ? Math.round((stats.successfulExtractions / stats.totalExtractions) * 100)
                        : 0}%
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="text-sm text-muted-foreground">Failed Extractions</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">{stats.failedExtractions}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-500" />
                      <span className="text-sm text-muted-foreground">Avg Processing Time</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">{stats.averageProcessingTime}ms</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent APIs */}
            <Card>
              <CardHeader>
                <CardTitle>Recent APIs</CardTitle>
                <CardDescription>Latest extraction configurations created</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Fields</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apis.slice(0, 5).map((api) => (
                        <TableRow key={api.id}>
                          <TableCell className="font-medium">{api.name}</TableCell>
                          <TableCell className="text-muted-foreground">{api.owner_name}</TableCell>
                          <TableCell className="text-muted-foreground">{api.team_name || '-'}</TableCell>
                          <TableCell>{(api.fields as { name: string }[]).length} fields</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(api.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={() => setShowCreateUser(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Create User
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Wallet</TableHead>
                              <TableHead>Team</TableHead>
                              <TableHead>Created</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {getUserInitials(u.full_name, u.email)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground">
                                  {u.full_name || 'No name'}
                                </p>
                                <p className="text-xs text-muted-foreground">{u.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              u.role === 'super_admin'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {u.role === 'super_admin' && <Shield className="h-3 w-3" />}
                              {u.role === 'super_admin' ? 'Admin' : 'User'}
                              </span>
                              </TableCell>
                              <TableCell>
                              <span className={`font-mono text-sm ${Number(u.wallet_balance || 0) < 1 ? 'text-yellow-500' : 'text-foreground'}`}>
                                ${Number(u.wallet_balance || 0).toFixed(2)}
                              </span>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                              {teams.find(t => t.id === u.team_id)?.name || '-'}
                              </TableCell>
                          <TableCell className="text-muted-foreground">
                              {new Date(u.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() => openAddCreditDialog(u.id)}
                              >
                                <DollarSign className="h-3 w-3" />
                                Add Credit
                              </Button>
                              </TableCell>
                              </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Teams ({teams.length})</CardTitle>
                <CardDescription>Teams and their usage statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Team Name</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>APIs</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teams.map((team) => (
                        <TableRow key={team.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                                <Users className="h-4 w-4 text-primary" />
                              </div>
                              {team.name}
                            </div>
                          </TableCell>
                          <TableCell>{team.memberCount} members</TableCell>
                          <TableCell>{team.apiCount} APIs</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(team.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
              </TabsContent>

              {/* Library Tab */}
              <TabsContent value="library" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>API Library Management</CardTitle>
                        <CardDescription>
                          Manage public APIs available to all users
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {libraryAPIs.length === 0 ? (
                      <div className="py-8 text-center">
                        <Library className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                        <p className="text-muted-foreground">No APIs in the library yet</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Push APIs from the APIs tab to make them available to all users
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Users</TableHead>
                              <TableHead>Total Cost</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {libraryAPIs.map((api) => (
                              <TableRow key={api.id}>
                                <TableCell className="font-medium">{api.name}</TableCell>
                                <TableCell>
                                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                                    {api.category || 'Uncategorized'}
                                  </span>
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                                  {api.description || '-'}
                                </TableCell>
                                <TableCell>{api.usage_count}</TableCell>
                                <TableCell className="font-mono text-sm">
                                  ${api.total_cost.toFixed(4)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Link href="/library">
                                      <Button variant="outline" size="sm" className="gap-1">
                                        <Eye className="h-3 w-3" />
                                        View
                                      </Button>
                                    </Link>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-1 text-destructive hover:text-destructive"
                                      onClick={() => {
                                        setDeleteLibraryApiId(api.id)
                                        setShowDeleteLibraryApi(true)
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      Remove
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* My APIs to Push */}
                <Card>
                  <CardHeader>
                    <CardTitle>Your APIs</CardTitle>
                    <CardDescription>
                      Push your APIs to the library to make them available to all users
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {apis.filter(api => api.user_id === profile?.id && !api.is_library).length === 0 ? (
                      <div className="py-8 text-center">
                        <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                        <p className="text-muted-foreground">No APIs available to push</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Create APIs in the dashboard first
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Fields</TableHead>
                              <TableHead>Created</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {apis
                              .filter(api => api.user_id === profile?.id && !api.is_library)
                              .map((api) => (
                                <TableRow key={api.id}>
                                  <TableCell className="font-medium">{api.name}</TableCell>
                                  <TableCell>{api.fields.length} fields</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {new Date(api.created_at).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="gap-1"
                                      onClick={() => openPushToLibraryDialog(api.id)}
                                    >
                                      <Upload className="h-3 w-3" />
                                      Push to Library
                                    </Button>
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

              {/* Logs Tab */}
              <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Usage Logs ({usageLogs.length} total)</CardTitle>
                <CardDescription>API extraction activity log</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>API</TableHead>
                        <TableHead>File</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {log.success ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                <CheckCircle2 className="h-3 w-3" />
                                Success
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                <XCircle className="h-3 w-3" />
                                Failed
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{log.user_email}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.api_name || '-'}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate text-sm text-muted-foreground">
                            {log.file_name || '-'}
                          </TableCell>
                          <TableCell className="text-sm font-mono text-muted-foreground">
                            {log.cost ? `$${Number(log.cost).toFixed(4)}` : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.processing_time_ms ? `${log.processing_time_ms}ms` : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalLogsPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Page {usageLogsPage + 1} of {totalLogsPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUsageLogsPage(p => Math.max(0, p - 1))}
                        disabled={usageLogsPage === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUsageLogsPage(p => Math.min(totalLogsPages - 1, p + 1))}
                        disabled={usageLogsPage >= totalLogsPages - 1}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create User Dialog */}
      <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Create New User
            </DialogTitle>
            <DialogDescription>
              Create a new user account. They will receive a confirmation email.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-user-name">Full Name</Label>
              <Input
                id="new-user-name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-email">Email</Label>
              <Input
                id="new-user-email"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-password">Password</Label>
              <Input
                id="new-user-password"
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Create a strong password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-role">Role</Label>
              <Select value={newUserRole} onValueChange={(v: 'user' | 'super_admin') => setNewUserRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateUser(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateUser} 
              disabled={!newUserEmail || !newUserPassword || !newUserName || actionLoading}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Credit Dialog */}
      <Dialog open={showAddCredit} onOpenChange={setShowAddCredit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Add Credit to Wallet
            </DialogTitle>
            <DialogDescription>
              Add funds to the user&apos;s wallet balance.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="credit-amount">Amount ($)</Label>
              <Input
                id="credit-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="10.00"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="credit-note">Note (optional)</Label>
              <Input
                id="credit-note"
                placeholder="e.g., Promotional credit, Refund, etc."
                value={creditNote}
                onChange={(e) => setCreditNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCredit(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddCredit} 
              disabled={!creditAmount || addingCredit}
            >
              {addingCredit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Credit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Push to Library Dialog */}
      <Dialog open={showPushToLibrary} onOpenChange={setShowPushToLibrary}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Push API to Library
            </DialogTitle>
            <DialogDescription>
              Make this API available to all users in the public library.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="push-description">Description *</Label>
              <Textarea
                id="push-description"
                placeholder="Describe what this API extracts and when to use it..."
                value={pushDescription}
                onChange={(e) => setPushDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="push-category">Category *</Label>
              <Select value={pushCategory} onValueChange={setPushCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-category">Or create new category</Label>
              <Input
                id="new-category"
                placeholder="e.g., Finance, Healthcare, Legal..."
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPushToLibrary(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePushToLibrary}
              disabled={!pushDescription.trim() || (!pushCategory && !newCategory.trim()) || pushingToLibrary}
            >
              {pushingToLibrary && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Push to Library
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete from Library Dialog */}
      <Dialog open={showDeleteLibraryApi} onOpenChange={setShowDeleteLibraryApi}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from Library</DialogTitle>
            <DialogDescription>
              This will remove the API from the public library. Users who have already 
              cloned this API will keep their copies.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteLibraryApi(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteFromLibrary}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove from Library
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
