'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Upload, Plus, X, FileText, Loader2, Copy, Check, Lock, Unlock, Terminal, Save, Trash2, Play, ChevronDown, ChevronUp, FilePlus2, LogOut, Users, Settings, Shield, Info, Wallet, AlertTriangle, Library, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { ModelSelector } from '@/components/model-selector'
import { API_ERROR_CODES_SHORT } from '@/lib/api-error-codes'
import { useIdleTimeout } from '@/hooks/use-idle-timeout'
import type { Profile, SavedAPI, Team, ModelConfig } from '@/lib/types/database'

interface ExtractionField {
  id: string
  name: string
  description: string
}

interface FileMetadata {
  fileName: string
  fileSize: string
  fileSizeBytes: number
  fileType: string
  mimeType: string
  lastModified: string
  dimensions?: { width: number; height: number }
}

interface ExtractionResult {
  data: Record<string, string | null>
  fields: string[]
  metadata?: FileMetadata
}

interface LocalSavedAPI {
  id: string
  name: string
  fields: { name: string; description: string }[]
  description?: string | null
  createdAt: string
  userId?: string
  teamId?: string | null
  ownerName?: string
  clonedFrom?: string | null
}

function OCREngineContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Enable idle timeout - logs out user after 10 minutes of inactivity
  useIdleTimeout()
  
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [emailVerified, setEmailVerified] = useState(false)
  const [fields, setFields] = useState<ExtractionField[]>([
  { id: '1', name: '', description: '' },
  ])
  const [isExtracting, setIsExtracting] = useState(false)
  const [result, setResult] = useState<ExtractionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [curlCopied, setCurlCopied] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [showCurlDialog, setShowCurlDialog] = useState(false)
  const [includeMetadata, setIncludeMetadata] = useState(true)
  
  // Model configuration state
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    provider: 'OPENAI',
    model: 'gpt-4o-mini',
    isCustom: false,
  })
  
  // API management state
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [apiName, setApiName] = useState('')
  const [savedAPIs, setSavedAPIs] = useState<LocalSavedAPI[]>([])
  const [activeAPIId, setActiveAPIId] = useState<string | null>(null)
  const [showMyAPIs, setShowMyAPIs] = useState(true)
  const [loadingAPIs, setLoadingAPIs] = useState(true)
  
  // Edit API description state (admin only)
  const [editingAPIId, setEditingAPIId] = useState<string | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [savingDescription, setSavingDescription] = useState(false)

  // Auth state
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const router = useRouter()

  // Check auth and load user data
useEffect(() => {
  // Check for email verification success
  if (searchParams.get('verified') === 'true') {
    setEmailVerified(true)
    // Remove the query param from URL
    window.history.replaceState({}, '', '/app')
    // Auto-hide after 5 seconds
    setTimeout(() => setEmailVerified(false), 5000)
  }
  
  const supabase = createClient()
  
  const checkAuth = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        
        if (!authUser) {
          router.push('/auth/login')
          return
        }

        setUser({ id: authUser.id, email: authUser.email || '' })

        // Load profile, team, and APIs all in parallel for faster loading
        const profilePromise = supabase.from('profiles').select('*').eq('id', authUser.id).single()
        const apisPromise = supabase.from('saved_apis').select('*').order('created_at', { ascending: false })

        const [profileResult, apisResult] = await Promise.all([profilePromise, apisPromise])

        if (profileResult.data) {
          setProfile(profileResult.data)

          // Load team in background if user has one (non-blocking)
          if (profileResult.data.team_id) {
            supabase
              .from('teams')
              .select('*')
              .eq('id', profileResult.data.team_id)
              .single()
              .then(({ data: teamData }) => {
                if (teamData) setTeam(teamData)
              })
          }
        }

        if (apisResult.data) {
          setSavedAPIs(apisResult.data.map((api: SavedAPI) => ({
            id: api.id,
            name: api.name,
            fields: api.fields as { name: string; description: string }[],
            description: api.description,
            createdAt: api.created_at,
            userId: api.user_id,
            teamId: api.team_id,
            ownerName: api.user_id === authUser.id ? 'Me' : 'Team Member',
            clonedFrom: api.cloned_from,
          })))
          setLoadingAPIs(false)
        }
      } catch (err) {
        console.error('Auth error:', err)
        router.push('/auth/login')
      } finally {
        setAuthLoading(false)
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/auth/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router, searchParams])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile)
    setResult(null)
    setError(null)

    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result as string)
      reader.readAsDataURL(selectedFile)
    } else if (selectedFile.type === 'application/pdf') {
      setPreview(null)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) {
        handleFileSelect(droppedFile)
      }
    },
    [handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const addField = () => {
    if (isLocked) return
    setFields([
      ...fields,
      { id: Date.now().toString(), name: '', description: '' },
    ])
  }

  const removeField = (id: string) => {
    if (isLocked) return
    setFields(fields.filter((f) => f.id !== id))
  }

  const updateField = (id: string, key: 'name' | 'description', value: string) => {
    if (isLocked) return
    setFields(
      fields.map((f) => (f.id === id ? { ...f, [key]: value } : f))
    )
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getImageDimensions = (file: File): Promise<{ width: number; height: number } | undefined> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(undefined)
        return
      }
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        resolve({ width: img.width, height: img.height })
        URL.revokeObjectURL(img.src)
      }
      img.onerror = () => resolve(undefined)
      img.src = URL.createObjectURL(file)
    })
  }

  const extractFileMetadata = async (file: File): Promise<FileMetadata> => {
    const dimensions = await getImageDimensions(file)
    return {
      fileName: file.name,
      fileSize: formatFileSize(file.size),
      fileSizeBytes: file.size,
      fileType: file.name.split('.').pop()?.toUpperCase() || 'Unknown',
      mimeType: file.type || 'application/octet-stream',
      lastModified: new Date(file.lastModified).toISOString(),
      ...(dimensions && { dimensions }),
    }
  }

  // Estimate extraction cost based on file size and fields
  // Gemini 2.0 Flash pricing: ~$0.075/1M input tokens, ~$0.30/1M output tokens
  const estimateCost = (fileSize: number, fieldCount: number): { min: number; max: number } => {
    // Estimate input tokens: ~1 token per 4 bytes for images, ~1 token per 4 chars for text
    const isImage = file?.type.startsWith('image/')
    const baseInputTokens = isImage 
      ? Math.ceil(fileSize / 3) // Images are more token-dense
      : Math.ceil(fileSize / 4)
    
    // Add overhead for prompt (~500 tokens) and field descriptions (~50 tokens per field)
    const promptTokens = 500 + (fieldCount * 50)
    const totalInputTokens = baseInputTokens + promptTokens
    
    // Estimate output tokens: ~50-100 tokens per field for extracted values
    const minOutputTokens = fieldCount * 50
    const maxOutputTokens = fieldCount * 150
    
    // Calculate cost in dollars
    const inputCostPer1M = 0.075
    const outputCostPer1M = 0.30
    
    const inputCost = (totalInputTokens / 1_000_000) * inputCostPer1M
    const minOutputCost = (minOutputTokens / 1_000_000) * outputCostPer1M
    const maxOutputCost = (maxOutputTokens / 1_000_000) * outputCostPer1M
    
    // Add 50% margin
    const margin = 1.5
    const minTotal = (inputCost + minOutputCost) * margin
    const maxTotal = (inputCost + maxOutputCost) * margin
    
    return { min: minTotal, max: maxTotal }
  }

  const formatCost = (cost: number): string => {
    if (cost < 0.001) return '<$0.001'
    if (cost < 0.01) return `$${cost.toFixed(4)}`
    return `$${cost.toFixed(3)}`
  }

  const handleExtract = async () => {
    if (!file || !user) return

    const validFields = fields.filter((f) => f.name.trim() && f.description.trim())
    if (validFields.length === 0) {
      setError('Please add at least one field with name and description')
      return
    }

    setIsExtracting(true)
    setError(null)
    setResult(null)

    const startTime = Date.now()

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append(
        'fields',
        JSON.stringify(validFields.map((f) => ({ name: f.name, description: f.description })))
      )
      
      // Add model configuration
      formData.append('provider', modelConfig.provider)
      formData.append('model', modelConfig.model)
      formData.append('isCustom', String(modelConfig.isCustom))
      if (modelConfig.customEndpointUrl) {
        formData.append('customEndpointUrl', modelConfig.customEndpointUrl)
      }
      if (modelConfig.customModelAuthKeyEnvVar) {
        formData.append('customAuthKeyEnvVar', modelConfig.customModelAuthKeyEnvVar)
      }

      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      const processingTime = Date.now() - startTime

      // Log usage (non-blocking)
      createClient().from('api_usage_logs').insert({
        user_id: user.id,
        api_id: activeAPIId,
        team_id: profile?.team_id,
        file_name: file.name,
        file_type: file.type,
        success: response.ok,
        error_message: !response.ok ? data.error : null,
        processing_time_ms: processingTime,
      })

      if (!response.ok) {
        throw new Error(data.error || 'Extraction failed')
      }

      // Extract metadata if enabled
      let metadata: FileMetadata | undefined
      if (includeMetadata) {
        metadata = await extractFileMetadata(file)
      }

      setResult({ ...data, metadata })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsExtracting(false)
    }
  }

  const copyToClipboard = async () => {
    if (!result) return
    const jsonData = result.metadata 
      ? { data: result.data, metadata: result.metadata }
      : result.data
    await navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleApproveAndSave = () => {
    const validFields = fields.filter((f) => f.name.trim() && f.description.trim())
    if (validFields.length === 0) {
      setError('Please add at least one valid field before saving')
      return
    }
    setShowSaveDialog(true)
  }

  const handleSaveAPI = async () => {
    if (!apiName.trim() || !user) return
    
    const validFields = fields.filter((f) => f.name.trim() && f.description.trim())
    
    // Auto-generate description with error codes
    const autoDescription = `Extraction API for ${apiName.trim()}. Fields: ${validFields.map(f => f.name).join(', ')}. ${API_ERROR_CODES_SHORT}`
    
    try {
      const supabase = createClient()
      const { data: newAPI, error: insertError } = await supabase
        .from('saved_apis')
        .insert({
          user_id: user.id,
          team_id: profile?.team_id || null,
          name: apiName.trim(),
          fields: validFields.map((f) => ({ name: f.name, description: f.description })),
          description: autoDescription,
        })
        .select()
        .single()
      
      if (insertError) {
        throw insertError
      }

      const localAPI: LocalSavedAPI = {
        id: newAPI.id,
        name: newAPI.name,
        fields: newAPI.fields as { name: string; description: string }[],
        description: newAPI.description,
        createdAt: newAPI.created_at,
        userId: newAPI.user_id,
        teamId: newAPI.team_id,
        ownerName: profile?.full_name || user.email || 'Me',
      }

      setSavedAPIs([localAPI, ...savedAPIs])
      setActiveAPIId(newAPI.id)
      setIsLocked(true)
      setShowSaveDialog(false)
      setShowCurlDialog(true)
      setApiName('')
    } catch (err) {
      console.error('Error saving API:', err)
      setError('Failed to save API')
    }
  }

  const handleLoadAPI = (api: LocalSavedAPI) => {
    setFields(api.fields.map((f, idx) => ({ id: `loaded-${idx}`, ...f })))
    setActiveAPIId(api.id)
    setIsLocked(true)
    setResult(null)
    setError(null)
  }

  const handleDeleteAPI = async (id: string) => {
    const apiToDelete = savedAPIs.find(api => api.id === id)
    if (!apiToDelete || apiToDelete.userId !== user?.id) {
      setError('You can only delete your own APIs')
      return
    }

    try {
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('saved_apis')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      setSavedAPIs(savedAPIs.filter((api) => api.id !== id))
      if (activeAPIId === id) {
        setActiveAPIId(null)
        setIsLocked(false)
      }
    } catch (err) {
      console.error('Error deleting API:', err)
      setError('Failed to delete API')
    }
  }

  // Admin only: Save API description
  const handleSaveDescription = async (apiId: string) => {
    if (profile?.role !== 'super_admin') {
      setError('Only admins can edit API descriptions')
      return
    }

    setSavingDescription(true)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('saved_apis')
        .update({ description: editDescription })
        .eq('id', apiId)

      if (updateError) throw updateError

      setSavedAPIs(savedAPIs.map(api => 
        api.id === apiId ? { ...api, description: editDescription } : api
      ))
      setEditingAPIId(null)
      setEditDescription('')
    } catch (err) {
      console.error('Error updating description:', err)
      setError('Failed to update description')
    } finally {
      setSavingDescription(false)
    }
  }

  const handleUnlock = () => {
    setIsLocked(false)
    setActiveAPIId(null)
    setShowCurlDialog(false)
  }

  const handleCreateNewAPI = () => {
    setFields([{ id: Date.now().toString(), name: '', description: '' }])
    setFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
    setIsLocked(false)
    setActiveAPIId(null)
    setShowCurlDialog(false)
  }

  const generateCurlCommand = (apiIdOverride?: string) => {
    const apiId = apiIdOverride || activeAPIId || 'YOUR_API_ID'
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'
    
    return `curl -X POST "${baseUrl}/api/v1/extract" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -F "api_id=${apiId}" \\
  -F "file=@/path/to/your/document.pdf"`
  }

  const copyCurlCommand = async () => {
    await navigator.clipboard.writeText(generateCurlCommand(activeAPIId ?? undefined))
    setCurlCopied(true)
    setTimeout(() => setCurlCopied(false), 2000)
  }

  const getActiveAPIName = () => {
    if (!activeAPIId) return null
    return savedAPIs.find((api) => api.id === activeAPIId)?.name
  }

  const getUserInitials = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return user?.email?.slice(0, 2).toUpperCase() || 'U'
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

return (
  <main className="min-h-screen bg-background">
  {/* Email Verified Toast */}
  {emailVerified && (
  <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
    <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 shadow-lg backdrop-blur-sm">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
        <Check className="h-4 w-4 text-green-500" />
      </div>
      <div>
        <p className="font-medium text-green-500">Email Verified</p>
        <p className="text-sm text-muted-foreground">Your account is now active</p>
      </div>
      <button 
        onClick={() => setEmailVerified(false)}
        className="ml-2 rounded-md p-1 hover:bg-green-500/10"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  </div>
  )}
  {/* Header */}
  <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo-dark.png" alt="TAED" className="h-8 w-auto hidden dark:block" />
            <img src="/logo-light.png" alt="TAED" className="h-8 w-auto dark:hidden" />
            {team && (
              <span className="text-xs text-muted-foreground border-l border-border pl-3">Team: {team.name}</span>
            )}
          </Link>

          <div className="flex items-center gap-2">
            {/* Wallet Balance Display */}
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                ${Number(profile?.wallet_balance || 0).toFixed(2)}
              </span>
            </div>

            <Button variant="ghost" size="sm" onClick={() => router.push('/team')} className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Team</span>
            </Button>
            
            {profile?.role === 'super_admin' && (
              <Button variant="ghost" size="sm" onClick={() => router.push('/admin')} className="gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm sm:inline">{profile?.full_name || user?.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Low Balance Warning */}
        {profile && Number(profile.wallet_balance) < 1 && Number(profile.wallet_balance) > 0 && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Low Wallet Balance</p>
              <p className="text-xs text-muted-foreground">Your balance is ${Number(profile.wallet_balance).toFixed(2)}. Add funds to continue using the API.</p>
            </div>
            <Link href="/contact">
              <Button variant="outline" size="sm">Contact Sales</Button>
            </Link>
          </div>
        )}

        {/* Zero Balance Warning */}
        {profile && Number(profile.wallet_balance) <= 0 && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Insufficient Balance</p>
              <p className="text-xs text-muted-foreground">Your wallet balance is $0.00. Please add funds to continue extracting data.</p>
            </div>
            <Link href="/contact">
              <Button variant="default" size="sm">Talk to Sales</Button>
            </Link>
          </div>
        )}

        {/* My APIs Section */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle 
                className="flex cursor-pointer items-center gap-2 text-lg"
                onClick={() => setShowMyAPIs(!showMyAPIs)}
              >
                <Save className="h-5 w-5" />
                My APIs
                {savedAPIs.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {savedAPIs.length}
                  </span>
                )}
                {showMyAPIs ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
              <Link href="/library">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Library className="h-4 w-4" />
                  Browse Library
                </Button>
              </Link>
              <Button
                variant="default"
                size="sm"
                onClick={handleCreateNewAPI}
                className="gap-2"
              >
                <FilePlus2 className="h-4 w-4" />
                Create New API
              </Button>
              </div>
            </div>
          </CardHeader>
          {showMyAPIs && (
            <CardContent className="pt-0">
              {loadingAPIs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : savedAPIs.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 py-8">
                  <FileText className="h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">No saved APIs yet</p>
                  <p className="text-xs text-muted-foreground/70">
                    Extract data from a document and save your first API
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {savedAPIs.map((api) => (
                    <div
                      key={api.id}
                      className={`group relative rounded-lg border p-4 transition-all ${
                        activeAPIId === api.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="mb-2 flex items-start justify-between">
  <div>
  <h3 className="font-medium text-foreground">{api.name}</h3>
  <p className="text-xs text-muted-foreground">
  {api.fields.length} field{api.fields.length !== 1 ? 's' : ''} &bull;{' '}
  {new Date(api.createdAt).toLocaleDateString()}
  </p>
  <div className="mt-1 flex flex-wrap gap-1">
  {api.clonedFrom && (
  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
  <Library className="h-3 w-3" />
  Cloned from Library
  </span>
  )}
  {api.userId !== user?.id && (
  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-500">
  <Users className="h-3 w-3" />
  {api.ownerName}
  </span>
  )}
  </div>
  </div>
                        <div className="flex gap-1">
                          {profile?.role === 'super_admin' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={() => {
                                setEditingAPIId(api.id)
                                setEditDescription(api.description || '')
                              }}
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                            </Button>
                          )}
                          {api.userId === user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={() => handleDeleteAPI(api.id)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Description display or edit */}
                      {editingAPIId === api.id ? (
                        <div className="mb-3 space-y-2">
                          <Textarea
                            placeholder="Enter API description..."
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="min-h-[60px] text-xs"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveDescription(api.id)}
                              disabled={savingDescription}
                            >
                              {savingDescription ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              <span className="ml-1">Save</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingAPIId(null)
                                setEditDescription('')
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : api.description ? (
                        <p className="mb-3 text-xs text-muted-foreground line-clamp-2">{api.description}</p>
                      ) : null}
                      
                      <div className="mb-3 flex flex-wrap gap-1">
                        {api.fields.slice(0, 3).map((field, idx) => (
                          <span
                            key={idx}
                            className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                          >
                            {field.name}
                          </span>
                        ))}
                        {api.fields.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{api.fields.length - 3} more
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant={activeAPIId === api.id ? 'secondary' : 'outline'}
                          size="sm"
                          className="flex-1"
                          onClick={() => handleLoadAPI(api)}
                        >
                          <Play className="mr-1 h-3 w-3" />
                          {activeAPIId === api.id ? 'Active' : 'Use'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActiveAPIId(api.id)
                            setShowCurlDialog(true)
                          }}
                        >
                          <Terminal className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Locked Status Banner */}
        {isLocked && (
          <div className="mb-6 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">
                  {getActiveAPIName() ? `Using: ${getActiveAPIName()}` : 'Fields Locked'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Your extraction schema is locked. Use the CURL command for batch processing.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowCurlDialog(true)}>
                <Terminal className="mr-2 h-4 w-4" />
                View CURL
              </Button>
              <Button variant="ghost" size="sm" onClick={handleUnlock}>
                <Unlock className="mr-2 h-4 w-4" />
                Unlock
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Upload & Fields */}
          <div className="space-y-6">
            {/* Upload Area */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Document
                </CardTitle>
                <CardDescription>
                  Drag and drop or click to upload an image or PDF
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => document.getElementById('file-input')?.click()}
                  className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                    isDragging
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0]
                      if (selectedFile) handleFileSelect(selectedFile)
                    }}
                    className="hidden"
                  />

                  {preview ? (
                    <div className="p-4">
                      <img
                        src={preview}
                        alt="Document preview"
                        className="max-h-[180px] rounded-md object-contain"
                      />
                      <p className="mt-2 text-center text-sm text-muted-foreground">
                        {file?.name}
                      </p>
                    </div>
                  ) : file ? (
                    <div className="flex flex-col items-center gap-2 p-4">
                      <FileText className="h-12 w-12 text-muted-foreground" />
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-4">
                      <Upload className="h-10 w-10 text-muted-foreground" />
                      <p className="text-sm font-medium">
                        Drop your file here or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supports images (PNG, JPG, WEBP) and PDF
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Extraction Fields */}
            <Card className={isLocked ? 'border-primary/30' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {isLocked ? (
                      <Lock className="h-5 w-5 text-primary" />
                    ) : (
                      <FileText className="h-5 w-5" />
                    )}
                    Extraction Fields
                    {isLocked && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Locked
                      </span>
                    )}
                  </span>
                  {!isLocked && (
                    <Button variant="outline" size="sm" onClick={addField}>
                      <Plus className="mr-1 h-4 w-4" />
                      Add Field
                    </Button>
                  )}
                </CardTitle>
                <CardDescription>
                  {isLocked
                    ? 'Fields are locked. Unlock to make changes.'
                    : 'Define what information you want to extract from the document'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field) => (
                  <div
                    key={field.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 ${
                      isLocked
                        ? 'border-primary/20 bg-primary/5'
                        : 'border-border bg-muted/30'
                    }`}
                  >
                    <div className="flex-1 space-y-3">
                      <div>
                        <Label htmlFor={`name-${field.id}`} className="text-xs">
                          Field Name
                        </Label>
                        <Input
                          id={`name-${field.id}`}
                          value={field.name}
                          onChange={(e) => updateField(field.id, 'name', e.target.value)}
                          placeholder="e.g., invoice_number"
                          className="mt-1"
                          disabled={isLocked}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`desc-${field.id}`} className="text-xs">
                          Description
                        </Label>
                        <Input
                          id={`desc-${field.id}`}
                          value={field.description}
                          onChange={(e) => updateField(field.id, 'description', e.target.value)}
                          placeholder="e.g., The invoice or document number"
                          className="mt-1"
                          disabled={isLocked}
                        />
                      </div>
                    </div>
                    {!isLocked && fields.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeField(field.id)}
                        className="mt-5 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}

                {/* Metadata Toggle */}
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label htmlFor="metadata-toggle" className="text-sm font-medium cursor-pointer">
                        Extract File Metadata
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Include file name, size, type, and dimensions
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="metadata-toggle"
                    checked={includeMetadata}
                    onCheckedChange={setIncludeMetadata}
                  />
                </div>

                {/* Model Configuration */}
                <ModelSelector
                  value={modelConfig}
                  onChange={setModelConfig}
                  fileSizeBytes={file?.size || 0}
                  fieldCount={fields.filter(f => f.name.trim()).length}
                  disabled={isLocked}
                />

                {/* Estimated Cost Display */}
                {file && fields.filter(f => f.name.trim()).length > 0 && (
                  <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-sm font-semibold text-primary">$</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Estimated Cost</p>
                        <p className="text-xs text-muted-foreground">Based on file size & fields</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-primary">
                        {(() => {
                          const cost = estimateCost(file.size, fields.filter(f => f.name.trim()).length)
                          return `${formatCost(cost.min)} - ${formatCost(cost.max)}`
                        })()}
                      </p>
                      <p className="text-xs text-muted-foreground">per extraction</p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleExtract}
                  disabled={!file || isExtracting || Number(profile?.wallet_balance || 0) <= 0}
                  className="w-full"
                  size="lg"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Extracting...
                    </>
                  ) : Number(profile?.wallet_balance || 0) <= 0 ? (
                    <>
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Insufficient Balance
                    </>
                  ) : (
                    'Extract Data'
                  )}
                </Button>
                
                {/* Data Privacy Notice */}
                <p className="mt-3 text-xs text-muted-foreground text-center leading-relaxed">
                  All models pre-integrated in Taed.dev operate on a No Data Sharing policy and your data is not stored anywhere. All data is purged once the operation is completed.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Results */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Extraction Results</span>
                  {result && !isLocked && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleApproveAndSave}
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Approve & Save API
                    </Button>
                  )}
                </CardTitle>
                <CardDescription>
                  {result
                    ? isLocked
                      ? 'Schema locked. Ready for batch processing.'
                      : 'Review the results and save as an API when ready.'
                    : 'Results will appear here after extraction'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                    {error}
                  </div>
                )}

                {!result && !error && (
                  <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed border-muted-foreground/25">
                    <div className="text-center text-muted-foreground">
                      <FileText className="mx-auto h-12 w-12 opacity-50" />
                      <p className="mt-2 text-sm">No data extracted yet</p>
                      <p className="text-xs">Upload a document and click Extract</p>
                    </div>
                  </div>
                )}

                {result && (
                  <Tabs defaultValue="table" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="table">Extracted Data</TabsTrigger>
                      <TabsTrigger value="metadata" disabled={!result.metadata}>Metadata</TabsTrigger>
                      <TabsTrigger value="json">JSON</TabsTrigger>
                    </TabsList>

                    <TabsContent value="table" className="mt-4">
                      <div className="rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="font-semibold">Field</TableHead>
                              <TableHead className="font-semibold">Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {result.fields.map((fieldName) => (
                              <TableRow key={fieldName}>
                                <TableCell className="font-medium text-muted-foreground">
                                  {fieldName}
                                </TableCell>
                                <TableCell>
                                  {result.data[fieldName] ?? (
                                    <span className="text-muted-foreground/50 italic">
                                      Not found
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    <TabsContent value="metadata" className="mt-4">
                      {result.metadata && (
                        <div className="rounded-lg border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="font-semibold">Property</TableHead>
                                <TableHead className="font-semibold">Value</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell className="font-medium text-muted-foreground">File Name</TableCell>
                                <TableCell>{result.metadata.fileName}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium text-muted-foreground">File Size</TableCell>
                                <TableCell>{result.metadata.fileSize}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium text-muted-foreground">File Type</TableCell>
                                <TableCell>{result.metadata.fileType}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium text-muted-foreground">MIME Type</TableCell>
                                <TableCell className="font-mono text-xs">{result.metadata.mimeType}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium text-muted-foreground">Last Modified</TableCell>
                                <TableCell>{new Date(result.metadata.lastModified).toLocaleString()}</TableCell>
                              </TableRow>
                              {result.metadata.dimensions && (
                                <TableRow>
                                  <TableCell className="font-medium text-muted-foreground">Dimensions</TableCell>
                                  <TableCell>{result.metadata.dimensions.width} x {result.metadata.dimensions.height} px</TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="json" className="mt-4">
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={copyToClipboard}
                          className="absolute right-2 top-2"
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <pre className="max-h-[400px] overflow-auto rounded-lg bg-muted p-4 text-sm">
                          <code>{JSON.stringify(
                            result.metadata 
                              ? { data: result.data, metadata: result.metadata }
                              : result.data, 
                            null, 2
                          )}</code>
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Save API Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Save API Configuration
            </DialogTitle>
            <DialogDescription>
              Give your API a name to save it for later use. You can reuse this configuration for batch processing.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="api-name">API Name</Label>
              <Input
                id="api-name"
                value={apiName}
                onChange={(e) => setApiName(e.target.value)}
                placeholder="e.g., Invoice Extractor, Receipt Scanner"
                autoFocus
              />
            </div>
            
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <p className="mb-2 text-sm font-medium text-foreground">Fields to save:</p>
              <div className="flex flex-wrap gap-1.5">
                {fields
                  .filter((f) => f.name.trim() && f.description.trim())
                  .map((field) => (
                    <span
                      key={field.id}
                      className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary"
                    >
                      {field.name}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAPI} disabled={!apiName.trim()}>
              <Save className="mr-2 h-4 w-4" />
              Save & Lock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CURL Command Dialog */}
      <Dialog open={showCurlDialog} onOpenChange={setShowCurlDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              API Command
              {getActiveAPIName() && (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-sm font-normal text-primary">
                  {getActiveAPIName()}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Use this authenticated API endpoint to process documents programmatically.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={copyCurlCommand}
                className="absolute right-2 top-2 gap-2"
              >
                {curlCopied ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
              <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 pr-24 text-sm text-zinc-100">
                <code className="whitespace-pre-wrap break-all">
                  {generateCurlCommand(activeAPIId ?? undefined)}
                </code>
              </pre>
            </div>

            <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
              <h4 className="font-medium text-foreground">Required Parameters:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <code className="bg-background px-2 py-0.5 rounded text-xs font-mono">X-API-Key</code>
                  <span className="text-muted-foreground">Your API authentication key from <Link href="/settings" className="text-primary hover:underline">Settings</Link></span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-background px-2 py-0.5 rounded text-xs font-mono">api_id</code>
                  <span className="text-muted-foreground">The unique ID of your saved API configuration</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-background px-2 py-0.5 rounded text-xs font-mono">file</code>
                  <span className="text-muted-foreground">Path to the document you want to process</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <h4 className="mb-2 font-medium text-foreground">
                {getActiveAPIName() ? `Fields in "${getActiveAPIName()}":` : 'Extraction Fields:'}
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {(activeAPIId
                  ? savedAPIs.find((api) => api.id === activeAPIId)?.fields || []
                  : fields.filter((f) => f.name.trim() && f.description.trim())
                ).map((field, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-mono text-primary">{field.name}</span>
                    <span className="text-muted-foreground">- {field.description}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <h4 className="mb-1 font-medium text-amber-600">Usage Notes:</h4>
              <ul className="list-inside list-disc space-y-1 text-sm text-amber-600/80">
                <li>Replace <code className="rounded bg-amber-500/20 px-1">/path/to/your/document.pdf</code> with your actual file path</li>
                <li>The API accepts images (PNG, JPG, WEBP) and PDF files</li>
                <li>Response will be JSON with the extracted data</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}

export default function OCREngine() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <OCREngineContent />
    </Suspense>
  )
}
