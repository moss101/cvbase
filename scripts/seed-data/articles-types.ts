/**
 * Types + small constants for the articles module.
 *
 * This file is safe to import from client components. The heavy article data
 * lives in `articles-data.ts` (1000 articles, ~28k LOC) and must not be
 * pulled into client bundles.
 */

export interface Article {
  id: string;
  title: string;
  slug: string;
  category: ArticleCategory;
  excerpt: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  tags: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  readTime: string;
  authorName: string;
  authorTitle: string;
  publishedAt: string;
  featuredImage?: string;
}

/**
 * Article shape without the large `content` body. Safe to send to
 * client components (search, listing, cards) — ~90% smaller per entry.
 */
export type ArticleIndexEntry = Omit<Article, 'content'>;

export type ArticleCategory =
  | 'Resume Writing'
  | 'Interview Prep'
  | 'Career Development'
  | 'Professional Development'
  | 'Personality Development';

export const categoryColors: Record<
  ArticleCategory,
  { bgColor: string; textColor: string; borderColor: string }
> = {
  'Resume Writing':           { bgColor: 'rgba(65,90,77,0.10)',   textColor: '#415a4d', borderColor: 'rgba(65,90,77,0.25)' },
  'Interview Prep':           { bgColor: 'rgba(184,134,85,0.10)', textColor: '#8a6030', borderColor: 'rgba(184,134,85,0.30)' },
  'Career Development':       { bgColor: 'rgba(58,125,68,0.10)',  textColor: '#2d6035', borderColor: 'rgba(58,125,68,0.25)' },
  'Professional Development': { bgColor: 'rgba(101,78,163,0.10)', textColor: '#5a3a8a', borderColor: 'rgba(101,78,163,0.25)' },
  'Personality Development':  { bgColor: 'rgba(180,60,80,0.10)',  textColor: '#8a2a3a', borderColor: 'rgba(180,60,80,0.25)' },
};
