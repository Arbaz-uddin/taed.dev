'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Wallet, LayoutDashboard, Settings, LogOut } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface Profile {
  id: string
  full_name: string | null
  wallet_balance: number
}

interface UserMenuProps {
  showLoginButtons?: boolean
  loginLabel?: string
  getStartedLabel?: string
}

export function UserMenu({ 
  showLoginButtons = true, 
  loginLabel = 'Login',
  getStartedLabel = 'Get Started'
}: UserMenuProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const fetchUserAndProfile = useCallback(async () => {
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return
      
      setUser(user)

      // Fetch profile without blocking
      supabase
        .from('profiles')
        .select('id, full_name, wallet_balance')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data)
        })
    } catch {
      // Silent fail - show login buttons
    }
  }, [])

  useEffect(() => {
    fetchUserAndProfile()

    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, wallet_balance')
          .eq('id', session.user.id)
          .single()
        if (data) setProfile(data)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchUserAndProfile])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    router.push('/')
    router.refresh()
  }

  const getInitials = (name: string | null, email: string | undefined) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email?.slice(0, 2).toUpperCase() || 'U'
  }

  // Show login buttons immediately - no loading state
  if (!user) {
    if (!showLoginButtons) return null
    
    return (
      <div className="flex items-center gap-2">
        <Link href="/auth/login">
          <Button variant="ghost" size="sm">
            {loginLabel}
          </Button>
        </Link>
        <Link href="/auth/sign-up">
          <Button size="sm">{getStartedLabel}</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {/* Wallet Balance */}
      <Link href="/app" className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20 transition-colors">
        <Wallet className="h-4 w-4" />
        <span>${Number(profile?.wallet_balance || 0).toFixed(2)}</span>
      </Link>

      {/* User Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="relative h-9 w-9 rounded-full p-0">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                {getInitials(profile?.full_name ?? null, user.email)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="flex items-center gap-2 p-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {getInitials(profile?.full_name ?? null, user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-0.5">
              <p className="text-sm font-medium leading-none">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/app" className="flex items-center gap-2 cursor-pointer">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleSignOut}
            className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
