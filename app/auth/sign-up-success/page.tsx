'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, FileText, ArrowRight, Loader2 } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { createClient } from '@/lib/supabase/client'

export default function SignUpSuccessPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Check initial auth state
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email_confirmed_at) {
        setIsAuthenticated(true)
      }
      setChecking(false)
    }

    checkAuth()

    // Listen for auth state changes (when user verifies email in another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
        setIsAuthenticated(true)
      }
    })

    // Poll for auth state changes every 3 seconds (in case user verifies in same browser)
    const interval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email_confirmed_at) {
        setIsAuthenticated(true)
        clearInterval(interval)
      }
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearInterval(interval)
    }
  }, [])

  const handleGoToDashboard = () => {
    router.push('/app')
  }

  return (
    <>
      <Navbar />
      <div className="flex min-h-screen items-center justify-center bg-background p-4 pt-20">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription>We&apos;ve sent you a verification link</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-sm text-muted-foreground">
              Please check your email inbox and click the verification link to activate your account.
              The link will expire in 24 hours.
            </p>
            {isAuthenticated && (
              <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3">
                <p className="text-sm font-medium text-green-600">
                  Email verified successfully! You can now access your dashboard.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button 
              onClick={handleGoToDashboard}
              disabled={!isAuthenticated || checking}
              className="w-full gap-2"
            >
              {checking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking verification...
                </>
              ) : isAuthenticated ? (
                <>
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                'Waiting for verification...'
              )}
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/auth/login">Back to Sign In</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  )
}
