'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { 
  Search, Library, FileText, Plus, Loader2, Check, Filter, 
  ArrowRight, Lock, LogIn
} from 'lucide-react'
import type { Profile, SavedAPI, APICategory } from '@/lib/types/database'

export default function APILibraryPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [libraryAPIs, setLibraryAPIs] = useState<SavedAPI[]>([])
  const [categories, setCategories] = useState<APICategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [addingAPIId, setAddingAPIId] = useState<string | null>(null)
  const [addedAPIs, setAddedAPIs] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Check auth status
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser) {
        setUser(authUser)
        
        // Load profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()
        
        if (profileData) {
          setProfile(profileData)
        }

        // Load user's existing APIs to check which library APIs they've already added
        const { data: userAPIs } = await supabase
          .from('saved_apis')
          .select('cloned_from')
          .eq('user_id', authUser.id)
          .not('cloned_from', 'is', null)

        if (userAPIs) {
          const clonedIds = new Set(userAPIs.map(api => api.cloned_from).filter(Boolean) as string[])
          setAddedAPIs(clonedIds)
        }
      }

      // Load library APIs (visible to everyone)
      const { data: apis } = await supabase
        .from('saved_apis')
        .select('*')
        .eq('is_library', true)
        .order('created_at', { ascending: false })

      if (apis) {
        setLibraryAPIs(apis)
      }

      // Load categories
      const { data: cats } = await supabase
        .from('api_categories')
        .select('*')
        .order('name', { ascending: true })

      if (cats) {
        setCategories(cats)
      }
    } catch (err) {
      console.error('Error loading library:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToMyAPIs = async (libraryAPI: SavedAPI) => {
    if (!user || !profile) {
      router.push('/auth/login?redirect=/library')
      return
    }

    setAddingAPIId(libraryAPI.id)

    try {
      // Clone the API
      const { data: clonedAPI, error } = await supabase
        .from('saved_apis')
        .insert({
          user_id: user.id,
          team_id: profile.team_id,
          name: libraryAPI.name,
          fields: libraryAPI.fields,
          is_library: false,
          description: libraryAPI.description,
          category: libraryAPI.category,
          cloned_from: libraryAPI.id,
        })
        .select()
        .single()

      if (error) throw error

      setAddedAPIs(prev => new Set([...prev, libraryAPI.id]))
    } catch (err) {
      console.error('Error adding API:', err)
    } finally {
      setAddingAPIId(null)
    }
  }

  const filteredAPIs = libraryAPIs.filter(api => {
    const matchesSearch = api.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (api.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = selectedCategory === 'all' || api.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const uniqueCategories = [...new Set(libraryAPIs.map(api => api.category).filter(Boolean))]

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      <div className="mx-auto max-w-6xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Library className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">API Library</h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Browse pre-built extraction APIs created by our team. Add any API to your dashboard 
            to start extracting data from your documents instantly.
          </p>
        </div>

        {/* Auth Banner for non-logged in users */}
        {!user && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col items-center justify-between gap-4 p-4 sm:flex-row sm:p-6">
              <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Sign in to use these APIs</h3>
                  <p className="text-sm text-muted-foreground">
                    Create an account or sign in to add APIs to your dashboard
                  </p>
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Link href="/auth/login?redirect=/library">
                  <Button variant="outline" className="w-full gap-2 sm:w-auto">
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/sign-up?redirect=/library">
                  <Button className="w-full gap-2 sm:w-auto">
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search APIs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {uniqueCategories.map(cat => (
                <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* API Grid */}
        {filteredAPIs.length === 0 ? (
          <Card className="py-16 text-center">
            <CardContent>
              <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 text-lg font-medium text-foreground">No APIs Found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || selectedCategory !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'The API library is empty. Check back soon!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAPIs.map(api => {
              const isAdded = addedAPIs.has(api.id)
              const isAdding = addingAPIId === api.id

              return (
                <Card key={api.id} className="flex flex-col transition-shadow hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{api.name}</CardTitle>
                        {api.category && (
                          <Badge variant="secondary" className="mt-2">
                            {api.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {api.description && (
                      <CardDescription className="mt-2 line-clamp-2">
                        {api.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col justify-end pt-0">
                    <div className="mb-4">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Extraction Fields ({api.fields.length})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {api.fields.slice(0, 4).map((field, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {field.name}
                          </Badge>
                        ))}
                        {api.fields.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{api.fields.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    {user ? (
                      <Button
                        onClick={() => handleAddToMyAPIs(api)}
                        disabled={isAdded || isAdding}
                        variant={isAdded ? 'secondary' : 'default'}
                        className="w-full gap-2"
                      >
                        {isAdding ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Adding...
                          </>
                        ) : isAdded ? (
                          <>
                            <Check className="h-4 w-4" />
                            Added to My APIs
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            Add to My APIs
                          </>
                        )}
                      </Button>
                    ) : (
                      <Link href="/auth/login?redirect=/library" className="w-full">
                        <Button variant="outline" className="w-full gap-2">
                          <LogIn className="h-4 w-4" />
                          Sign in to Add
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Stats */}
        {filteredAPIs.length > 0 && (
          <div className="mt-8 text-center text-sm text-muted-foreground">
            Showing {filteredAPIs.length} of {libraryAPIs.length} APIs
          </div>
        )}
      </div>

      <Footer />
    </main>
  )
}
