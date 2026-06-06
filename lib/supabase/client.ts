import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (client) return client

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // The default client coordinates token access with the Web Locks API
        // (navigator.locks). Inside sandboxed iframes (e.g. the preview) that
        // lock acquisition can hang forever, leaving auth calls like
        // getSession()/getUser() unresolved. Use a passthrough lock so auth
        // never blocks on the lock.
        lock: async (_name, _acquireTimeout, fn) => fn(),
      },
    },
  )

  return client
}
