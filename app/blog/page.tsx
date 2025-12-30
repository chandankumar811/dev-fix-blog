import Link from 'next/link'
import Container from '@/components/layout/Container'
import { getAllBlogPosts } from '@/lib/mdx'

export const metadata = {
  title: 'Blog - Common Development Problems & Solutions | DevFixPro',
  description: 'Browse solutions to common backend and frontend problems in NestJS, MongoDB, React, and more.',
}

export default function BlogPage() {
  const posts = getAllBlogPosts()

  return (
    <div className="py-12 bg-gray-50 min-h-screen">
      <Container>
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Common Problems & Solutions
          </h1>
          <p className="text-xl text-gray-600">
            Browse fixes for real backend and frontend issues
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-600 mb-4">No blog posts yet. Check back soon!</p>
            <p className="text-sm text-gray-500">
              Create markdown files in <code className="bg-gray-100 px-2 py-1 rounded">content/blog/</code> to add posts.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <div className="h-48 bg-gradient-to-br from-blue-500 to-blue-700"></div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {post.category}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(post.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold mb-2 text-gray-900 line-clamp-2">
                    {post.title}
                  </h2>
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {post.description}
                  </p>
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Container>
    </div>
  )
}