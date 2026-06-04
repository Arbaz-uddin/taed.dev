import { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.taed.dev'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/settings/', '/team/', '/app/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
