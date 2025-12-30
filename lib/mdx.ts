import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { guides } from '@/data/all-guides'

const contentDirectory = path.join(process.cwd(), 'content')

export interface BlogPost {
  slug: string
  title: string
  description: string
  date: string
  author: string
  category: string
  tags: string[]
  content: string
}

export interface Guide {
  slug: string
  title: string
  description: string
  // date: string
  // category: string
  content: string
}

// Get all blog posts
export function getAllBlogPosts(): BlogPost[] {
  const blogDir = path.join(contentDirectory, 'blog')
  
  if (!fs.existsSync(blogDir)) {
    return []
  }
  
  const files = fs.readdirSync(blogDir)
  
  const posts = files
    .filter((file) => file.endsWith('.md') || file.endsWith('.mdx'))
    .map((file) => {
      const slug = file.replace(/\.mdx?$/, '')
      const fullPath = path.join(blogDir, file)
      const fileContents = fs.readFileSync(fullPath, 'utf8')
      const { data, content } = matter(fileContents)
      
      return {
        slug,
        title: data.title || '',
        description: data.description || '',
        date: data.date || '',
        author: data.author || 'DevFixPro',
        category: data.category || 'General',
        tags: data.tags || [],
        content,
      }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  return posts
}

// Get single blog post
export function getBlogPost(slug: string): BlogPost | null {
  try {
    const blogDir = path.join(contentDirectory, 'blog')
    const fullPath = path.join(blogDir, `${slug}.md`)
    
    if (!fs.existsSync(fullPath)) {
      return null
    }
    
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)
    
    return {
      slug,
      title: data.title || '',
      description: data.description || '',
      date: data.date || '',
      author: data.author || 'DevFixPro',
      category: data.category || 'General',
      tags: data.tags || [],
      content,
    }
  } catch (error) {
    return null
  }
}

// Get all guides
export function getAllGuides(): Guide[] {
  const guidesDir = path.join(contentDirectory, 'guides')
  
  if (!fs.existsSync(guidesDir)) {
    return []
  }
  
  const files = fs.readdirSync(guidesDir)
  
  const guides = files
    .filter((file) => file.endsWith('.md') || file.endsWith('.mdx'))
    .map((file) => {
      const slug = file.replace(/\.mdx?$/, '')
      const fullPath = path.join(guidesDir, file)
      const fileContents = fs.readFileSync(fullPath, 'utf8')
      const { data, content } = matter(fileContents)
      
      return {
        slug,
        title: data.title || '',
        description: data.description || '',
        date: data.date || '',
        category: data.category || 'Setup',
        content,
      }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  return guides
}

// Get single guide
export function getGuide(slug: string): Guide | null {
  try {
    const guideMeta = guides.find((g) => g.slug === slug)
    if (!guideMeta) return null

    const guidesDir = path.join(contentDirectory, 'guides')
    const fullPath = path.join(guidesDir, `${slug}.md`)
    
    
    if (!fs.existsSync(fullPath)) {
      return null
    }
    
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { content } = matter(fileContents)
    
    return {
      slug,
      title: guideMeta.title || '',
      description: guideMeta.description || '',
      // date: guideMeta.date || '',
      // category: guideMeta.category || 'Setup',
      content,
    }
  } catch (error) {
    return null
  }
}