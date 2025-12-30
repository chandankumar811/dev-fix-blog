import { getAllBlogPosts } from '@/lib/mdx'

export default function sitemap() {
  const posts = getAllBlogPosts()

  const urls = posts.map((post) => ({
    url: `http://localhost:3000/problem/${post.slug}`,
    lastModified: new Date(post.date),
  }))

  return [
    {
      url: 'http://localhost:3000',
      lastModified: new Date(),
    },
    ...urls,
  ]
}
