/**
 * Supabase-backed article service. All article content lives in the
 * `articles` table (see supabase/migrations/20260705130000_articles.sql) —
 * there is no static bundled dataset, so every list/detail read goes through
 * this module.
 */

import { supabase } from '../../services/supabase';
import type { Article, ArticleCategory, ArticleIndexEntry } from './articles-types';

export interface ArticleRow {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string | null;
  content: string;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  tags: string[] | null;
  difficulty: string | null;
  read_time: string;
  author_name: string;
  author_title: string;
  published_at: string;
  featured_image: string | null;
  is_published: boolean;
  view_count: number;
}

const INDEX_COLUMNS =
  'id, title, slug, category, excerpt, seo_title, seo_description, seo_keywords, tags, difficulty, read_time, author_name, author_title, published_at, featured_image';

function rowToArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category as ArticleCategory,
    excerpt: row.excerpt || '',
    content: row.content,
    seoTitle: row.seo_title || row.title,
    seoDescription: row.seo_description || row.excerpt || '',
    seoKeywords: row.seo_keywords || [],
    tags: row.tags || [],
    difficulty: (row.difficulty as Article['difficulty']) || 'Beginner',
    readTime: row.read_time,
    authorName: row.author_name,
    authorTitle: row.author_title,
    publishedAt: row.published_at.split('T')[0],
    featuredImage: row.featured_image || undefined,
  };
}

function rowToIndexEntry(row: Omit<ArticleRow, 'content'>): ArticleIndexEntry {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category as ArticleCategory,
    excerpt: row.excerpt || '',
    seoTitle: row.seo_title || row.title,
    seoDescription: row.seo_description || row.excerpt || '',
    seoKeywords: row.seo_keywords || [],
    tags: row.tags || [],
    difficulty: (row.difficulty as ArticleIndexEntry['difficulty']) || 'Beginner',
    readTime: row.read_time,
    authorName: row.author_name,
    authorTitle: row.author_title,
    publishedAt: row.published_at.split('T')[0],
    featuredImage: row.featured_image || undefined,
  };
}

/** Fetch all published articles without the `content` body (list/search view). */
export async function fetchArticleIndex(): Promise<ArticleIndexEntry[]> {
  const { data, error } = await supabase
    .from('articles')
    .select(INDEX_COLUMNS)
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Error fetching article index:', error);
    return [];
  }

  return (data || []).map((row) => rowToIndexEntry(row as Omit<ArticleRow, 'content'>));
}

/** Fetch a single published article (full body) by slug. */
export async function fetchArticleBySlug(slug: string): Promise<Article | null> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error || !data) return null;
  return rowToArticle(data as ArticleRow);
}

/** Fetch related articles by category, excluding the current slug. */
export async function fetchRelatedArticles(
  currentSlug: string,
  category: ArticleCategory,
  limit = 3,
): Promise<ArticleIndexEntry[]> {
  const { data, error } = await supabase
    .from('articles')
    .select(INDEX_COLUMNS)
    .eq('is_published', true)
    .eq('category', category)
    .neq('slug', currentSlug)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching related articles:', error);
    return [];
  }

  return (data || []).map((row) => rowToIndexEntry(row as Omit<ArticleRow, 'content'>));
}

/** Increment view count for an article (fire-and-forget). */
export async function incrementArticleViews(slug: string): Promise<void> {
  try {
    const { data } = await supabase
      .from('articles')
      .select('view_count')
      .eq('slug', slug)
      .single();

    if (data) {
      await supabase
        .from('articles')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('slug', slug);
    }
  } catch (err) {
    console.error('Error incrementing view count:', err);
  }
}
