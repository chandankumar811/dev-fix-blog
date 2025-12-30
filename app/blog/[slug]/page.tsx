import { notFound } from 'next/navigation'
import Container from '@/components/layout/Container'
import { getBlogPost, getAllBlogPosts } from '@/lib/mdx'
import { MDXRemote } from 'next-mdx-remote/rsc'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'

export async function generateStaticParams() {
  const posts = getAllBlogPosts()
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = getBlogPost(params.slug)
  
  if (!post) {
    return {
      title: 'Post Not Found',
    }
  }
  
  return {
    title: `${post.title} | DevFixPro`,
    description: post.description,
  }
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getBlogPost(params.slug)
  
  if (!post) {
    notFound()
  }
  
  return (
    <div className="py-12 bg-gray-50 min-h-screen">
      <Container>
        <article className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded">
                {post.category}
              </span>
              <span className="text-sm text-gray-500">
                {new Date(post.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {post.title}
            </h1>
            <p className="text-xl text-gray-600 mb-4">
              {post.description}
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>By {post.author}</span>
            </div>
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </header>
          
          {/* Content */}
          <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
            <div className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-code:text-pink-600 prose-pre:bg-gray-900 prose-pre:text-gray-100">
              <MDXRemote 
                source={post.content}
                options={{
                  mdxOptions: {
                    rehypePlugins: [rehypeHighlight],
                  },
                }}
              />
            </div>
          </div>
        </article>
      </Container>
    </div>
  )
}