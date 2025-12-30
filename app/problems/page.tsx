"use client";

import { useState } from "react";
import Link from "next/link";
import Container from "@/components/layout/Container";
import Button from "@/components/common/Button";
import { Search, Flame, CheckCircle, BookOpen } from "lucide-react";
import { categories } from "@/data/categories";
import { popularGuides } from "@/data/popular-guides";
import { errorFixes } from "@/data/all-problems";

// interface ErrorFix {
//   id: string
//   title: string
//   slug: string
//   description: string
//   category: string
//   tags: string[]
//   timeAgo: string
//   icon: string
// }

export default function ProblemsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredErrors = errorFixes.filter((error) => {
    const matchesSearch =
      error.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      error.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      error.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesCategory =
      selectedCategory === "all" || error.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero Section */}
      <section className="bg-white border-b border-gray-200 py-16">
        <Container>
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Solve Real Backend & Frontend Errors
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Fix development issues with working code.
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search errors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-16 py-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              />
              <button className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>
        </Container>
      </section>

      {/* Category Filter Tabs */}
      <section className="bg-white border-b border-gray-200 py-4 sticky top-16 z-40">
        <Container>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Flame className="w-6 h-6 text-orange-500" />
              <h2 className="text-xl font-bold text-gray-900">
                Latest Error Fixes
              </h2>
            </div>
            {/* <Link href="/blog">
              <Button variant="primary" size="sm">
                View All Problems
              </Button>
            </Link> */}
          </div>

          <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </Container>
      </section>

      {/* Main Content */}
      <section className="py-8">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Error Fixes List */}
            <div className="lg:col-span-2 space-y-4">
              {filteredErrors.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                  <p className="text-gray-600">
                    No problems found matching your search.
                  </p>
                </div>
              ) : (
                filteredErrors.map((error) => (
                  <Link
                    key={error.id}
                    href={`/problems/${error.slug}`}
                    className="block bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6"
                  >
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center text-2xl">
                          {error.icon}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h3 className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors">
                            {error.title}
                          </h3>
                          <span className="text-sm text-gray-500 whitespace-nowrap">
                            {error.timeAgo}
                          </span>
                        </div>

                        <p className="text-gray-600 mb-3">
                          {error.description}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {error.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Popular Guides */}
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

              {/* About DevFixPro */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900">
                    About DevFixPro
                  </h3>
                </div>
                <p className="text-gray-700 text-sm mb-4">
                  Helping developers fix real-world backend and frontend issues
                  with clear explanations and working code.
                </p>
                <Link href="/about">
                  <Button variant="secondary" size="sm" className="w-full">
                    Learn More →
                  </Button>
                </Link>
              </div>

              {/* Newsletter */}
              {/* <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  Stay Updated
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Get the latest error fixes and guides in your inbox.
                </p>
                <form className="space-y-3">
                  <input
                    type="email"
                    placeholder="Your email"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button variant="primary" className="w-full">
                    Subscribe
                  </Button>
                </form>
              </div> */}
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
