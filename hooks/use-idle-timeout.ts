'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// 10 minutes in milliseconds
const IDLE_TIMEOUT = 10 * 60 * 1000

export function useIdleTimeout() {
  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/auth/login?reason=idle')
  }, [supabase, router])

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(handleLogout, IDLE_TIMEOUT)
  }, [handleLogout])

  useEffect(() => {
    // Events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ]

    // Start the timer
    resetTimer()

    // Reset timer on any activity
    const handleActivity = () => {
      resetTimer()
    }

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [resetTimer])

  return { resetTimer }
}
