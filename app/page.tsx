import Link from 'next/link'
import Container from '@/components/layout/Container'
import Button from '@/components/common/Button'
import { Flame, Settings, Code2 } from 'lucide-react'
import { title } from 'process'

export default function HomePage() {

  const commonErrors = [
    {
      title: "Cannot read property of undefined",
      slug: "fix-cannot-read-property-of-undefined-in-nestjs"
    },
    {
      title: "401 Unauthorized in Axios",
      slug: "fix-401-unauthorized-error-in-axios"
    },
    {
      title: "CORS Error in React",
      slug: "cors-error-react"
    },
    {
      title: "MongoDB Connection Timeout",
      slug: "mongodb-connection-timeout"
    }
  ]

  const setupGuides = [
    {
      title: "NestJS + MongoDB Setup",
      slug: "nestjs-mongodb-setup"
    },
    {
      title: "JWT Auth with Refresh Token",
      slug: "jwt-authentication-nestjs"
    },
    {
      title: "Deploying NestJS to VPS",
      slug: "deploy-nestjs-to-vps"
    },
    {
      title: "MERN Stack Structure",
      slug: "mern-stack-folder-structure"
    }
  ]

  const codeSnippets = [
    'NestJS Folder Structure',
    'Mongoose Schema Example',
    'Token Service for JWT'
  ]

  const featuredArticles = [
    {
      title: 'Fix: Cannot Read Property of Undefined in NestJS',
      description: 'How to solve the common "undefined" error in NestJS with real examples.',
      slug: "fix-cannot-read-property-of-undefined-in-nestjs"
    },
    {
      title: 'MongoDB Connection Timeout Error in Node.js',
      description: 'Common causes and solutions to fix MongoDB connection timeout in Node.js.',
      slug: "mongodb-connection-timeout"
    },
    {
      title: '401 Unauthorized Error in Axios: Complete Fix',
      description: 'Learn how to resolve 401 errors in Axios with JWT.',
      slug: "fix-401-unauthorized-error-in-axios"
    }
  ]

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gray-50 py-20">
        <Container>
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Solve Real Backend & Frontend Problems
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              Clear explanations. Working code. No fluff.
            </p>
            <p className="text-lg text-gray-500 mb-8">
              NestJS, MongoDB, React, Next.js & More
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/problems">
                <Button variant="primary" size="lg">
                  Browse Problems
                </Button>
              </Link>
              <Link href="/guides">
                <Button variant="secondary" size="lg">
                  Setup Guides
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Three Columns Section */}
      <section className="py-16">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Common Errors */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <Flame className="w-6 h-6 text-red-500" />
                <h2 className="text-xl font-bold text-gray-900">Common Errors</h2>
              </div>
              <ul className="space-y-3">
                {commonErrors.map((error, index) => (
                  <li key={index}>
                    <Link 
                      href={`/problems/${error.slug}`}
                      className="text-gray-700 hover:text-blue-600 transition-colors flex items-start gap-2"
                    >
                      <span className="text-red-500 mt-1">•</span>
                      <span>{error.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Setup Guides */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <Settings className="w-6 h-6 text-blue-500" />
                <h2 className="text-xl font-bold text-gray-900">Setup Guides</h2>
              </div>
              <ul className="space-y-3">
                {setupGuides.map((guide, index) => (
                  <li key={index}>
                    <Link 
                      href={`/guides/${guide.slug}`}
                      className="text-gray-700 hover:text-blue-600 transition-colors flex items-start gap-2"
                    >
                      <span className="text-blue-500 mt-1">•</span>
                      <span>{guide.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Code Snippets */}
            {/* <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <Code2 className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Code Snippets</h2>
              </div>
              <ul className="space-y-3">
                {codeSnippets.map((snippet, index) => (
                  <li key={index}>
                    <Link 
                      href={`/tools#${snippet.toLowerCase().replace(/\s+/g, '-')}`}
                      className="text-gray-700 hover:text-blue-600 transition-colors flex items-start gap-2"
                    >
                      <span className="text-blue-600 mt-1">•</span>
                      <span>{snippet}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div> */}
          </div>
        </Container>
      </section>

      {/* Featured Articles */}
      <section className="py-16 bg-gray-50">
        <Container>
          <h2 className="text-3xl font-bold text-center mb-12">Featured Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredArticles.map((article, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
                {/* <div className="h-48 bg-gradient-to-br from-blue-500 to-blue-700"></div> */}
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-gray-900">
                    {article.title}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {article.description}
                  </p>
                  <Link href={`/problems/${article.slug}`}>
                    <Button variant="secondary" size="sm">
                      Read More
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Newsletter Section */}
      {/* <section className="py-16">
        <Container>
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
            <p className="text-gray-600 mb-6">
              Get the latest tips & fixes in your inbox.
            </p>
            <form className="flex gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button variant="primary">Subscribe</Button>
            </form>
          </div>
        </Container>
      </section> */}
    </div>
  )
}