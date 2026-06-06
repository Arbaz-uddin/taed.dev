import { updateSession } from '@/lib/supabase/proxy'
import { type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/app/:path*',
    '/settings/:path*',
    '/team/:path*',
    '/admin/:path*',
  ],
}
