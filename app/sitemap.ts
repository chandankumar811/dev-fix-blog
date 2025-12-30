import { getAllBlogPosts } from '@/lib/mdx'

export default function sitemap() {
  const posts = getAllBlogPosts()

  const urls = posts.map((post) => ({
    url: `https://dev-fix-pro.vercel.app/problems/${post.slug}`,
    lastModified: new Date(post.date),
  }))

  return [
    {
      url: 'https://dev-fix-pro.vercel.app/',
      lastModified: new Date(),
    },
    ...urls,
  ]
}
