import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = 'https://dev-fix-pro.vercel.app'

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
    },
    {
      url: `${siteUrl}/problems`,
      lastModified: new Date(),
    },
    {
      url: `${siteUrl}/guides`,
      lastModified: new Date(),
    },
  ]
}
