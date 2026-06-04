'use client'

import { useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import HCaptcha from '@hcaptcha/react-hcaptcha'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')
  const redirect = searchParams.get('redirect')
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const captchaRef = useRef<HCaptcha>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!captchaToken) {
      setError('Please complete the captcha verification')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          captchaToken,
        },
      })

      if (error) {
        setError(error.message)
        captchaRef.current?.resetCaptcha()
        setCaptchaToken(null)
        return
      }

      // Use hard redirect to ensure cookies are properly set before navigation
      window.location.href = redirect || '/app'
    } catch {
      setError('An unexpected error occurred')
      captchaRef.current?.resetCaptcha()
      setCaptchaToken(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="flex min-h-screen items-center justify-center bg-background p-4 pt-20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img src="/logo-dark.png" alt="TAED" className="mx-auto mb-4 h-10 w-auto dark:block hidden" />
            <img src="/logo-light.png" alt="TAED" className="mx-auto mb-4 h-10 w-auto dark:hidden" />
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your TAED account</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {reason === 'idle' && (
                <Alert>
                  <AlertDescription>
                    You were logged out due to inactivity. Please sign in again.
                  </AlertDescription>
                </Alert>
              )}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="flex justify-center pt-2">
                <HCaptcha
                  ref={captchaRef}
                  sitekey="515c16ce-dae6-4176-824e-d5988d1674fa"
                  onVerify={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                  size="compact"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-2">
              <Button type="submit" className="w-full" disabled={loading || !captchaToken}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link href="/auth/sign-up" className="text-primary hover:underline">
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </>
  )
}
