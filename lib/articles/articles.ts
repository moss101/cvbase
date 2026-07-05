/**
 * Articles module public API. All data is served from Supabase
 * (see articles-db.ts) — there is no bundled static dataset.
 */

export type { Article, ArticleCategory, ArticleIndexEntry } from './articles-types';
export { categoryColors } from './articles-types';

import {
  fetchArticleIndex,
  fetchArticleBySlug,
  fetchRelatedArticles,
  incrementArticleViews,
} from './articles-db';
import type { Article, ArticleCategory, ArticleIndexEntry } from './articles-types';

export { incrementArticleViews };

/** All published articles, newest first, without the `content` body. */
export async function getArticleIndex(): Promise<ArticleIndexEntry[]> {
  return fetchArticleIndex();
}

/** Full article (with content) by slug, or null if not found/unpublished. */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  return fetchArticleBySlug(slug);
}

/** Related articles in the same category as `currentSlug`. */
export async function getRelatedArticles(
  currentSlug: string,
  category: ArticleCategory,
  limit = 3,
): Promise<ArticleIndexEntry[]> {
  return fetchRelatedArticles(currentSlug, category, limit);
}

/** Distinct categories present in the index. */
export function getAllCategories(index: ArticleIndexEntry[]): ArticleCategory[] {
  return Array.from(new Set(index.map((article) => article.category)));
}

/** Client-side search over an already-fetched index. */
export function searchArticles(index: ArticleIndexEntry[], query: string): ArticleIndexEntry[] {
  const lowerQuery = query.toLowerCase();
  return index.filter(
    (article) =>
      article.title.toLowerCase().includes(lowerQuery) ||
      article.excerpt.toLowerCase().includes(lowerQuery) ||
      article.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
  );
}
