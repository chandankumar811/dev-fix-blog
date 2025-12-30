import { notFound } from "next/navigation";
import Container from "@/components/layout/Container";
import { getBlogPost, getAllBlogPosts } from "@/lib/mdx";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { Clock, AlertCircle, ChevronRight, CheckCircle } from "lucide-react";
import Link from "next/link";
import Button from "@/components/common/Button";
import { popularGuides } from "@/data/popular-guides";
import { extractToc } from "@/lib/toc";

export async function generateStaticParams() {
  try {
    const posts = getAllBlogPosts();
    return posts.map((post) => ({
      slug: post.slug,
    }));
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    return {
      title: "Problem Not Found | DevFixPro",
    };
  }

  return {
    title: `${post.title} | DevFixPro`,
    description: post.description,
  };
}

export default async function ProblemDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

  // Table of contents items (you can extract these from the markdown headings)
  const tableOfContents = [
    {
      title: "Common Causes & Fixes",
      items: [
        "Missing or Wrong DTO Property",
        "Forgetting @Body() or @Param()",
        "Async Data Not Awaited",
        "Dependency Injection Issue",
        "MongoDB Document Not Found",
      ],
    },
    {
      title: "Best Practices to Avoid This Error",
      items: [],
    },
    {
      title: "Related Errors & Fixes",
      items: [],
    },
  ];

  // Related problems
  const relatedProblems = [
    {
      title: "Fix 401 Unauthorized Error in Axios",
      slug: "401-unauthorized-axios",
    },
    {
      title: "MongoDB Connection Timeout Error",
      slug: "mongodb-connection-timeout",
    },
    { title: "Fix CORS Error in React", slug: "cors-error-react" },
  ];

  const toc = extractToc(post.content);

  return (
    <div className="py-8 bg-gray-50 min-h-screen">
      <Container>
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600">
            <Link href="/" className="hover:text-blue-600">
              Home
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/problems" className="hover:text-blue-600">
              Problems
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900">{post.title}</span>
          </nav>

          {/* Header with Icon */}
          <div className="mb-8">
            <div className="flex gap-6 mb-6">
              {/* Error Icon */}
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-white" />
                </div>
              </div>

              {/* Title and Meta */}
              <div className="flex-1">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                  {post.title}
                </h1>
                <p className="text-xl text-gray-600 mb-4">{post.description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.tags &&
                    post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                </div>

                {/* Meta Info */}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Published:{" "}
                    {new Date(post.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  <span>5 min read</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content - 3 columns */}
            <div className="lg:col-span-3">
              {/* Introduction Box */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg mb-8">
                <div className="flex gap-3">
                  <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-gray-800 mb-2">
                      If you are working with NestJS and suddenly see this
                      error:
                    </p>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
                      <span className="text-red-400">TypeError:</span> Cannot
                      read properties of undefined
                    </div>
                    <p className="text-gray-800 mt-4 font-semibold">
                      You're not alone.
                    </p>
                    <p className="text-gray-700 mt-2">
                      This is one of the most common runtime errors in NestJS,
                      especially for beginners.
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Article Content */}
              <article className="bg-white rounded-lg shadow-sm p-8 md:p-12 mb-8">
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
              </article>

              {/* Related Problems */}
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Related Problems & Fixes
                </h3>
                <div className="space-y-3">
                  {relatedProblems.map((problem, index) => (
                    <Link
                      key={index}
                      href={`/problems/${problem.slug}`}
                      className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                    >
                      <span className="text-gray-900 font-medium group-hover:text-blue-600 flex items-center gap-2">
                        <ChevronRight className="w-4 h-4" />
                        {problem.title}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
               {/* Sidebar - 1 column */}
            <div className="lg:col-span-1">
              <div className="space-y-6 sticky">
                {/* Table of Contents */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 max-h-84 p-6 overflow-y-auto sticky">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Table of Contents
                  </h3>
                  <nav className="space-y-3">
                    {toc.map((item) => (
                      <li
                        key={item.id}
                        className={item.level === 3 ? "ml-4 text-gray-600" : ""}
                      >
                        <a href={`#${item.level}`}>{item.text}</a>
                      </li>
                    ))}
                  </nav>
                </div>

             

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-gray-900">
                      Popular Guides
                    </h3>
                  </div>
                  <ul className="space-y-3">
                    {popularGuides.map((guide, index) => (
                      <li key={index}>
                        <Link
                          href={`/guides/${guide.slug}`}
                          className="flex items-start gap-2 text-gray-700 hover:text-blue-600 transition-colors group"
                        >
                          <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span className="group-hover:underline">
                            {guide.title}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link href="/guides" className="block mt-4">
                    <Button variant="secondary" size="sm" className="w-full">
                      View All Guides →
                    </Button>
                  </Link>
                </div>

                {/* Help Card */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Still Stuck?
                  </h3>
                  <p className="text-sm text-gray-700 mb-4">
                    Browse more common problems and their solutions.
                  </p>
                  <Link href="/problems">
                    <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                      View All Problems
                    </button>
                  </Link>
                </div>

                {/* Newsletter */}
                {/* <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Get Updates
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Subscribe for weekly tips and fixes.
                  </p>
                  <input
                    type="email"
                    placeholder="Your email"
                    className="w-full px-4 py-2 mb-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm">
                    Subscribe
                  </button>
                </div> */}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
