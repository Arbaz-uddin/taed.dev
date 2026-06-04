import { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.taed.dev'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static public pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/library`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/auth/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/auth/sign-up`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  // Dynamic pages - fetch from database if needed
  // For example, public library APIs could be added here
  let dynamicPages: MetadataRoute.Sitemap = []

  try {
    // Fetch public library APIs from Supabase
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: libraryAPIs } = await supabase
      .from('saved_apis')
      .select('id, updated_at')
      .eq('is_library', true)
      .order('updated_at', { ascending: false })

    if (libraryAPIs && libraryAPIs.length > 0) {
      dynamicPages = libraryAPIs.map((api) => ({
        url: `${BASE_URL}/library?api=${api.id}`,
        lastModified: new Date(api.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
    }
  } catch (error) {
    // If database fetch fails, continue with static pages only
    console.error('Sitemap: Failed to fetch dynamic pages:', error)
  }

  return [...staticPages, ...dynamicPages]
}
