# Next.js 14 App Router Blog - Complete Setup Guide

## Initial Setup

### 1. Create Project
```bash
npx create-next-app@14 my-blog
cd my-blog
```

**Options:**
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- `src/` directory: Yes
- App Router: Yes
- Import alias: Yes (@/*)

### 2. Install Dependencies
```bash
npm install gray-matter remark remark-html date-fns
npm install -D @types/node
```

## Folder Structure
```
my-blog/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Home page (blog list)
│   │   ├── blog/
│   │   │   └── [slug]/
│   │   │       └── page.tsx     # Individual blog post
│   │   ├── about/
│   │   │   └── page.tsx         # About page
│   │   └── globals.css          # Global styles
│   ├── components/
│   │   ├── BlogCard.tsx         # Blog preview card
│   │   ├── Header.tsx           # Site header
│   │   └── Footer.tsx           # Site footer
│   ├── lib/
│   │   └── posts.ts             # Markdown processing utilities
│   └── types/
│       └── post.ts              # TypeScript types
├── posts/
│   ├── first-post.md            # Blog post 1
│   ├── second-post.md           # Blog post 2
│   └── third-post.md            # Blog post 3
├── public/
│   └── images/                  # Blog images
├── package.json
├── tsconfig.json
└── next.config.js
```

## Step-by-Step Implementation

### Step 1: Define Types (`src/types/post.ts`)
```typescript
export interface Post {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
  author?: string;
  tags?: string[];
}
```

### Step 2: Create Post Utilities (`src/lib/posts.ts`)
```typescript
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), 'posts');

export function getAllPosts() {
  const fileNames = fs.readdirSync(postsDirectory);
  const posts = fileNames.map((fileName) => {
    const slug = fileName.replace(/\.md$/, '');
    const fullPath = path.join(postsDirectory, fileName);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data } = matter(fileContents);

    return {
      slug,
      title: data.title,
      date: data.date,
      excerpt: data.excerpt,
      author: data.author,
      tags: data.tags,
    };
  });

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string) {
  const fullPath = path.join(postsDirectory, `${slug}.md`);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    slug,
    title: data.title,
    date: data.date,
    excerpt: data.excerpt,
    content,
    author: data.author,
    tags: data.tags,
  };
}
```

### Step 3: Create Markdown Posts (`posts/first-post.md`)
```markdown
---
title: "Getting Started with Next.js 14"
date: "2024-01-15"
excerpt: "Learn how to build modern web applications with Next.js 14 App Router"
author: "John Doe"
tags: ["nextjs", "react", "tutorial"]
---

# Getting Started with Next.js 14

Your blog content here...
```

### Step 4: Root Layout (`src/app/layout.tsx`)
```typescript
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'My Blog',
  description: 'A blog built with Next.js 14',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
```

### Step 5: Home Page (`src/app/page.tsx`)
```typescript
import { getAllPosts } from '@/lib/posts';
import BlogCard from '@/components/BlogCard';

export default function Home() {
  const posts = getAllPosts();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Latest Posts</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <BlogCard key={post.slug} post={post} />
        ))}
      </div>
    </div>
  );
}
```

### Step 6: Blog Post Page (`src/app/blog/[slug]/page.tsx`)
```typescript
import { getPostBySlug, getAllPosts } from '@/lib/posts';
import { remark } from 'remark';
import html from 'remark-html';
import { format } from 'date-fns';

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function BlogPost({ 
  params 
}: { 
  params: { slug: string } 
}) {
  const post = getPostBySlug(params.slug);
  const processedContent = await remark().use(html).process(post.content);
  const contentHtml = processedContent.toString();

  return (
    <article className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
      <p className="text-gray-600 mb-8">
        {format(new Date(post.date), 'MMMM dd, yyyy')} • {post.author}
      </p>
      <div 
        className="prose lg:prose-xl" 
        dangerouslySetInnerHTML={{ __html: contentHtml }} 
      />
    </article>
  );
}
```

### Step 7: Blog Card Component (`src/components/BlogCard.tsx`)
```typescript
import Link from 'next/link';
import { format } from 'date-fns';

export default function BlogCard({ post }: { post: any }) {
  return (
    <Link href={`/blog/${post.slug}`}>
      <div className="border rounded-lg p-6 hover:shadow-lg transition">
        <h2 className="text-2xl font-bold mb-2">{post.title}</h2>
        <p className="text-gray-600 text-sm mb-4">
          {format(new Date(post.date), 'MMMM dd, yyyy')}
        </p>
        <p className="text-gray-700">{post.excerpt}</p>
        {post.tags && (
          <div className="mt-4 flex gap-2">
            {post.tags.map((tag: string) => (
              <span key={tag} className="text-xs bg-gray-200 px-2 py-1 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
```

### Step 8: Header Component (`src/components/Header.tsx`)
```typescript
import Link from 'next/link';

export default function Header() {
  return (
    <header className="border-b">
      <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold">My Blog</Link>
        <div className="flex gap-6">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <Link href="/about" className="hover:text-blue-600">About</Link>
        </div>
      </nav>
    </header>
  );
}
```

### Step 9: Footer Component (`src/components/Footer.tsx`)
```typescript
export default function Footer() {
  return (
    <footer className="border-t mt-12">
      <div className="container mx-auto px-4 py-6 text-center text-gray-600">
        <p>© 2024 My Blog. All rights reserved.</p>
      </div>
    </footer>
  );
}
```

## Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000`

## Build for Production
```bash
npm run build
npm start
```

## Key Features

- **Static Generation**: Blog posts are pre-rendered at build time
- **Dynamic Routes**: `[slug]` for individual blog posts
- **Markdown Support**: Write posts in Markdown with frontmatter
- **Type Safety**: Full TypeScript support
- **SEO Friendly**: Metadata API for each page
- **Responsive**: Tailwind CSS for mobile-first design

## Next Steps

1. Add search functionality
2. Implement categories/tags filtering
3. Add RSS feed
4. Create pagination
5. Add MDX support for interactive content
6. Implement comments system
7. Add reading time calculation
8. Create sitemap generation