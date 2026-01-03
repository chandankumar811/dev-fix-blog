import { MetadataRoute } from 'next'
import fs from 'fs'
import path from 'path'

const BASE_URL = 'https://dev-fix-pro.vercel.app'

function getSlugs(dir: string) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter(file => file.endsWith('.md'))
    .map(file => file.replace('.md', ''))
}

export default function sitemap(): MetadataRoute.Sitemap {
  const contentDir = path.join(process.cwd(), 'content')

  const problemSlugs = getSlugs(path.join(contentDir, 'blog'))
  const guideSlugs = getSlugs(path.join(contentDir, 'guides'))

  const staticPages = [
    { url: `${BASE_URL}/`, priority: 1 },
    { url: `${BASE_URL}/problems`, priority: 0.9 },
    { url: `${BASE_URL}/guides`, priority: 0.9 },
  ]

  const problemPages = problemSlugs.map(slug => ({
    url: `${BASE_URL}/problems/${slug}`,
    lastModified: new Date(),
    priority: 0.8,
  }))

  const guidePages = guideSlugs.map(slug => ({
    url: `${BASE_URL}/guides/${slug}`,
    lastModified: new Date(),
    priority: 0.7,
  }))

  return [
    ...staticPages.map(page => ({
      ...page,
      lastModified: new Date(),
    })),
    ...problemPages,
    ...guidePages,
  ]
}
