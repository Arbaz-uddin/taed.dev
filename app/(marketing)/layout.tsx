// Force dynamic rendering to prevent build-time errors with Supabase
export const dynamic = 'force-dynamic'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
