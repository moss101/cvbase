import { Clock, BookOpen } from 'lucide-react';
import { cn } from './cn';
import type { ArticleIndexEntry } from '../../lib/articles/articles-types';

interface ArticleCardProps {
  article: ArticleIndexEntry;
  featured?: boolean;
  onSelect: (slug: string) => void;
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'Resume Writing':          { bg: 'rgba(65,90,77,0.10)',   text: '#415a4d', border: 'rgba(65,90,77,0.25)' },
  'Interview Prep':          { bg: 'rgba(184,134,85,0.10)', text: '#8a6030', border: 'rgba(184,134,85,0.30)' },
  'Career Development':      { bg: 'rgba(58,125,68,0.10)',  text: '#2d6035', border: 'rgba(58,125,68,0.25)' },
  'Professional Development':{ bg: 'rgba(101,78,163,0.10)', text: '#5a3a8a', border: 'rgba(101,78,163,0.25)' },
  'Personality Development': { bg: 'rgba(180,60,80,0.10)',  text: '#8a2a3a', border: 'rgba(180,60,80,0.25)' },
};

const DIFFICULTY_STYLES: Record<string, { bg: string; text: string }> = {
  'Beginner':     { bg: 'rgba(58,125,68,0.10)',  text: '#2d6035' },
  'Intermediate': { bg: 'rgba(184,134,85,0.12)', text: '#7a5020' },
  'Advanced':     { bg: 'rgba(192,57,43,0.10)',  text: '#8a2a1a' },
};

export function ArticleCard({ article, featured = false, onSelect }: ArticleCardProps) {
  const catStyle = CATEGORY_STYLES[article.category] ?? CATEGORY_STYLES['Resume Writing'];
  const diffStyle = DIFFICULTY_STYLES[article.difficulty] ?? DIFFICULTY_STYLES['Intermediate'];

  return (
    <button
      type="button"
      onClick={() => onSelect(article.slug)}
      className={cn(
        'group block w-full text-left rounded-2xl overflow-hidden transition-all duration-300',
        featured && 'md:col-span-2 md:row-span-2'
      )}
      style={{
        background: 'rgba(255,255,255,0.62)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(65,90,77,0.12)',
        boxShadow: '0 2px 12px rgba(65,90,77,0.06)',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.transform = 'translateY(-4px)';
        el.style.boxShadow = '0 12px 36px rgba(65,90,77,0.14)';
        el.style.borderColor = 'rgba(65,90,77,0.22)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = '0 2px 12px rgba(65,90,77,0.06)';
        el.style.borderColor = 'rgba(65,90,77,0.12)';
      }}
    >
      {/* Featured Image */}
      {article.featuredImage && (
        <div className={cn('relative overflow-hidden', featured ? 'h-48 md:h-64' : 'h-40')}>
          <img
            src={article.featuredImage}
            alt={article.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

          {/* Category Badge on Image */}
          <div className="absolute top-4 left-4">
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm"
              style={{
                background: 'rgba(255,255,255,0.88)',
                color: catStyle.text,
                border: `1px solid ${catStyle.border}`,
              }}
            >
              {article.category}
            </span>
          </div>
        </div>
      )}

      <div className={cn('p-5', featured && 'md:p-7')}>
        {/* Category + Difficulty row (no image) */}
        {!article.featuredImage && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: catStyle.bg,
                color: catStyle.text,
                border: `1px solid ${catStyle.border}`,
              }}
            >
              {article.category}
            </span>
            <span
              className="px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: diffStyle.bg, color: diffStyle.text }}
            >
              {article.difficulty}
            </span>
          </div>
        )}

        {/* Difficulty badge (with image) */}
        {article.featuredImage && (
          <div className="flex items-center gap-2 mb-3">
            <span
              className="px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: diffStyle.bg, color: diffStyle.text }}
            >
              {article.difficulty}
            </span>
          </div>
        )}

        {/* Title */}
        <h3
          className={cn(
            'font-bold line-clamp-2 mb-3 transition-colors',
            featured ? 'text-2xl md:text-3xl' : 'text-lg'
          )}
          style={{ color: '#262626' }}
        >
          {article.title}
        </h3>

        {/* Excerpt */}
        <p
          className={cn('line-clamp-3 mb-4 leading-relaxed', featured ? 'text-base' : 'text-sm')}
          style={{ color: '#5a5a5a' }}
        >
          {article.excerpt}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm" style={{ color: '#888' }}>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{article.readTime}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{article.authorName}</span>
          </div>
        </div>

        {/* Tags (featured only) */}
        {featured && article.tags.length > 0 && (
          <div
            className="flex flex-wrap gap-2 mt-4 pt-4"
            style={{ borderTop: '1px solid rgba(65,90,77,0.10)' }}
          >
            {article.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs rounded-md"
                style={{ background: 'rgba(65,90,77,0.06)', color: '#6b6b6b' }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
