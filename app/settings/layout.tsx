// Force dynamic rendering to prevent build-time errors with Supabase
export const dynamic = 'force-dynamic'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
