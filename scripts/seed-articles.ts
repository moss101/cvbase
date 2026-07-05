/**
 * One-off: seed the `articles` table from the bundled seed dataset.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-articles.ts
 *
 * Upserts by `slug`, so it's safe to re-run. Requires the service-role key
 * because inserts happen server-side, bypassing the "select published only"
 * RLS policy created in supabase/migrations/20260705130000_articles.sql.
 */
import { createClient } from '@supabase/supabase-js';
import { articles } from './seed-data/articles-data';
import type { Article } from './seed-data/articles-types';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Refusing to run: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function articleToRow(article: Article) {
  return {
    title: article.title,
    slug: article.slug,
    category: article.category,
    excerpt: article.excerpt,
    content: article.content,
    seo_title: article.seoTitle,
    seo_description: article.seoDescription,
    seo_keywords: article.seoKeywords,
    tags: article.tags,
    difficulty: article.difficulty,
    read_time: article.readTime,
    author_name: article.authorName,
    author_title: article.authorTitle,
    featured_image: article.featuredImage ?? null,
    published_at: new Date(article.publishedAt).toISOString(),
    is_published: true,
  };
}

const BATCH_SIZE = 100;

async function main() {
  const rows = articles.map(articleToRow);
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('articles').upsert(batch, { onConflict: 'slug' });
    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, error);
      process.exit(1);
    }
    inserted += batch.length;
    console.log(`Seeded ${inserted}/${rows.length} articles…`);
  }

  console.log(`Done. Seeded ${inserted} articles.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
