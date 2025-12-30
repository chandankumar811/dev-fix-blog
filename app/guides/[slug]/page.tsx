import { notFound } from "next/navigation";
import Container from "@/components/layout/Container";
import { getGuide, getAllGuides } from "@/lib/mdx";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { Calendar, BookOpen, ArrowLeft, CheckCircle, ChevronRight } from "lucide-react";
import Link from "next/link";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { extractToc } from "@/lib/toc";
import { popularGuides } from "@/data/popular-guides";
import Button from "@/components/common/Button";

export async function generateStaticParams() {
  try {
    const guides = getAllGuides();
    return guides.map((guide) => ({
      slug: guide.slug,
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
  const guide = getGuide(slug);

  console.log(guide);

  if (!guide) {
    return {
      title: "Guide Not Found | DevFixPro",
    };
  }

  return {
    title: `${guide.title} | DevFixPro Setup Guides`,
    description: `${guide.description}`,
  };
}

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuide(slug);

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

  if (!guide) {
    return (
      <div className="py-20 bg-gray-50 min-h-screen">
        <Container>
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Guide Not Found
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              The guide you're looking for doesn't exist or has been moved.
            </p>
            <Link href="/guides">
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Back to Guides
              </button>
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  const toc = extractToc(guide.content);
  console.log(toc);
  return (
    <div className="py-8 bg-gray-50 min-h-screen">
      <Container>
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <Link
            href="/guides"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Guides
          </Link>

          {/* Header */}
          <header className="mb-8">
            {/* <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                {guide.category}
              </span>
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(guide.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div> */}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {guide.title}
            </h1>
            <p className="text-xl text-gray-600">{guide.description}</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <article className="bg-white rounded-lg shadow-sm p-8 md:p-12">
                <div className=" prose prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:leading-7 prose-p:text-gray-700 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-code:text-pink-600 prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-4 prose-table:w-full prose-th:border prose-td:border prose-th:bg-gray-100 ">
                  <MDXRemote
                    source={guide.content}
                    options={{
                      mdxOptions: {
                        rehypePlugins: [
                          rehypeHighlight,
                          rehypeSlug,
                          rehypeAutolinkHeadings,
                        ],
                      },
                    }}
                  />
                </div>
              </article>

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

              {/* Share Section */}
              <div className="mt-8 bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  Found this guide helpful?
                </h3>
                <p className="text-gray-600 mb-4">
                  Share it with other developers who might benefit from it!
                </p>
                <div className="flex gap-3">
                  {/* <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                    Share on Twitter
                  </button> */}
                  <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
                    Copy Link
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
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

                {/* Help Section */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border  border-blue-200 p-6 mt-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Need Help?
                  </h3>
                  <p className="text-sm text-gray-700 mb-4">
                    If you're stuck or have questions, check out our problem
                    solutions.
                  </p>
                  <Link href="/problems">
                    <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                      View Problems
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
