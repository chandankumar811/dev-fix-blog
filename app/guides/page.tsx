"use client";

import { useState } from "react";
import Link from "next/link";
import Container from "@/components/layout/Container";
import { Search, BookOpen, ArrowRight } from "lucide-react";
import { guides } from "@/data/all-guides";

// interface Guide {
//   id: string
//   title: string
//   description: string
//   icon: string
//   iconBg: string
//   tags: string[]
//   slug: string
// }

export default function GuidesPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGuides = guides.filter((guide) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      guide.title.toLowerCase().includes(searchLower) ||
      guide.description.toLowerCase().includes(searchLower) ||
      guide.tags.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero Section */}
      <section className="bg-white border-b border-gray-200 py-16">
        <Container>
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Setup Guides
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Step-by-step guides to set up your backend & frontend projects.
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search setup guides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              />
              <button className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Search
              </button>
            </div>
          </div>
        </Container>
      </section>

      {/* Guides List */}
      <section className="py-12">
        <Container>
          {filteredGuides.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <p className="text-gray-600 mb-4">
                No guides found matching your search.
              </p>
              <p className="text-sm text-gray-500">
                Try searching for something else or browse all guides.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredGuides.map((guide) => (
                <Link
                  key={guide.id}
                  href={`/guides/${guide.slug}`}
                  className="block bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6 group"
                >
                  <div className="flex gap-6">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div
                        className={`w-16 h-16 bg-gradient-to-br ${guide.iconBg} rounded-lg flex items-center justify-center text-3xl`}
                      >
                        {guide.icon}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {guide.title}
                      </h2>
                      <p className="text-gray-600 mb-4">{guide.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {guide.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Read More Link */}
                    <div className="flex-shrink-0 flex items-center">
                      <div className="text-blue-600 font-medium flex items-center gap-2 group-hover:gap-3 transition-all">
                        <span className="hidden sm:inline">Read More</span>
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {filteredGuides.length > 0 && (
            <div className="flex justify-center items-center gap-2 mt-12">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Previous
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium">
                1
              </button>
              <button className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                2
              </button>
              <button className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                Next
              </button>
            </div>
          )}
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white border-t border-gray-200">
        <Container>
          <div className="max-w-3xl mx-auto text-center">
            <BookOpen className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Can't Find What You're Looking For?
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              Check out our problem solutions or browse code snippets for quick
              fixes.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/problems">
                <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  View Problems
                </button>
              </Link>
              <Link href="/tools">
                <button className="px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium">
                  Code Snippets
                </button>
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
