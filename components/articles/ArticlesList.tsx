import { useState, useMemo, useEffect, type CSSProperties } from 'react';
import { Search, BookOpen, TrendingUp, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { ArticleCard } from './ArticleCard';
import { CategoryFilter } from './CategoryFilter';
import type { ArticleCategory, ArticleIndexEntry } from '../../lib/articles/articles-types';
import { useTranslation } from '../../services/translationService';

const ARTICLES_PER_PAGE = 12;

const INPUT: CSSProperties = {
  background: 'rgba(65,90,77,0.05)',
  border: '1px solid rgba(65,90,77,0.18)',
  color: '#262626',
  borderRadius: 12,
};

function PageBtn({ children, onClick, disabled, active }: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      style={active
        ? { background: 'linear-gradient(135deg, #b88655, #c9955f)', color: '#fff', boxShadow: '0 2px 8px rgba(184,134,85,0.30)' }
        : { background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(65,90,77,0.12)', color: '#415a4d' }
      }
    >
      {children}
    </button>
  );
}

function matchesQuery(article: ArticleIndexEntry, q: string): boolean {
  const lower = q.toLowerCase();
  return (
    article.title.toLowerCase().includes(lower) ||
    article.excerpt.toLowerCase().includes(lower) ||
    article.tags.some((tag) => tag.toLowerCase().includes(lower))
  );
}

export interface ArticlesListProps {
  articles: ArticleIndexEntry[];
  categories: ArticleCategory[];
  counts: Record<ArticleCategory | 'All', number>;
  total: number;
  onSelectArticle: (slug: string) => void;
  /** When true, skip the built-in hero + stats row (parent renders its own editorial chrome). */
  hideHero?: boolean;
}

export function ArticlesList({ articles, categories, counts, total, onSelectArticle, hideHero = false }: ArticlesListProps) {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<ArticleCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const filteredArticles = useMemo(() => {
    let result = articles;
    if (searchQuery && mounted) result = result.filter((a) => matchesQuery(a, searchQuery));
    if (selectedCategory !== 'All') result = result.filter((a) => a.category === selectedCategory);
    return result;
  }, [articles, selectedCategory, searchQuery, mounted]);

  const totalPages = Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE);
  const paginatedArticles = useMemo(() => {
    const start = (currentPage - 1) * ARTICLES_PER_PAGE;
    return filteredArticles.slice(start, start + ARTICLES_PER_PAGE);
  }, [filteredArticles, currentPage]);

  const handleCategoryChange = (category: ArticleCategory | 'All') => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {!hideHero && (<>
      <section className="text-center max-w-3xl mx-auto mb-12">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
          style={{
            background: 'rgba(184,134,85,0.10)',
            border: '1px solid rgba(184,134,85,0.25)',
          }}
        >
          <BookOpen className="w-4 h-4" style={{ color: '#b88655' }} />
          <span className="text-sm font-semibold" style={{ color: '#b88655' }}>
            {t('articles.list.hero.badge', 'Career Resources & Guides')}
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <span style={{ color: '#b88655' }}>{t('articles.list.hero.titleHighlight', 'Resources')}</span>{' '}
          <span style={{ color: '#262626' }}>{t('articles.list.hero.titleRest', 'to Accelerate Your Career')}</span>
        </h1>

        <p className="text-lg mb-8 leading-relaxed" style={{ color: '#5a5a5a' }}>
          {t('articles.list.hero.subtitle', "Expert guides, tips, and strategies to help you land your dream job. From resume writing to acing interviews, we've got you covered.")}
        </p>

        <div className="relative max-w-xl mx-auto">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'rgba(65,90,77,0.50)' }}
          />
          <input
            type="text"
            placeholder={t('articles.list.hero.searchPlaceholder', 'Search articles...')}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-11 pr-4 py-3 text-sm focus:outline-none transition-all"
            style={INPUT}
            onFocus={(e) => {
              e.currentTarget.style.border = '1px solid rgba(65,90,77,0.50)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(65,90,77,0.08)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = '1px solid rgba(65,90,77,0.18)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-12">
        {[
          { icon: BookOpen,   label: t('articles.list.stat.articles', 'Articles'),       value: total.toLocaleString() },
          { icon: TrendingUp, label: t('articles.list.stat.categories', 'Categories'),     value: categories.length },
          { icon: Sparkles,   label: t('articles.list.stat.weeklyUpdates', 'Weekly updates'), value: t('articles.list.stat.new', 'New') },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-5 rounded-xl text-center"
            style={{
              background: 'rgba(255,255,255,0.60)',
              border: '1px solid rgba(65,90,77,0.12)',
              boxShadow: '0 2px 12px rgba(65,90,77,0.06)',
            }}
          >
            <stat.icon className="w-5 h-5 mx-auto mb-2" style={{ color: '#415a4d' }} />
            <p className="text-2xl font-bold" style={{ color: '#262626' }}>{stat.value}</p>
            <p className="text-sm" style={{ color: '#6b6b6b' }}>{stat.label}</p>
          </div>
        ))}
      </section>
      </>)}

      {hideHero && (
        <section className="mb-10 mt-2">
          <div className="relative mx-auto max-w-2xl">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'rgba(65,90,77,0.50)' }}
            />
            <input
              type="text"
              placeholder={t('articles.list.searchAllPlaceholder', 'Search all articles…')}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-11 pr-4 py-3 text-sm focus:outline-none transition-all"
              style={INPUT}
              onFocus={(e) => {
                e.currentTarget.style.border = '1px solid rgba(65,90,77,0.50)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(65,90,77,0.08)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = '1px solid rgba(65,90,77,0.18)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
        </section>
      )}

      <section className="mb-8">
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelect={handleCategoryChange}
          articleCounts={counts}
        />
      </section>

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm" style={{ color: '#6b6b6b' }}>
          {t('articles.list.showingCount', 'Showing {shown} of {total} articles')
            .replace('{shown}', String(paginatedArticles.length))
            .replace('{total}', filteredArticles.length.toLocaleString())}
          {searchQuery && t('articles.list.showingForQuery', ' for "{query}"').replace('{query}', searchQuery)}
        </p>
        {totalPages > 1 && (
          <p className="text-sm" style={{ color: '#6b6b6b' }}>
            {t('articles.list.pageOf', 'Page {current} of {total}')
              .replace('{current}', String(currentPage))
              .replace('{total}', String(totalPages))}
          </p>
        )}
      </div>

      <section>
        {paginatedArticles.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedArticles.map((article, index) => (
              <ArticleCard
                key={article.id}
                article={article}
                featured={index === 0 && currentPage === 1 && selectedCategory === 'All' && !searchQuery}
                onSelect={onSelectArticle}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: '#415a4d' }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#262626' }}>
              {t('articles.list.empty.title', 'No articles found')}
            </h3>
            <p style={{ color: '#6b6b6b' }}>{t('articles.list.empty.subtitle', 'Try adjusting your search or filter criteria')}</p>
          </div>
        )}
      </section>

      {totalPages > 1 && (
        <section className="flex items-center justify-center gap-2 mt-12 flex-wrap">
          <PageBtn onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}>
            <ChevronLeft className="w-4 h-4" /> {t('articles.list.pagination.previous', 'Previous')}
          </PageBtn>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;
              return (
                <PageBtn key={pageNum} onClick={() => setCurrentPage(pageNum)} active={currentPage === pageNum}>
                  {pageNum}
                </PageBtn>
              );
            })}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <span className="px-2" style={{ color: '#888' }}>...</span>
                <PageBtn onClick={() => setCurrentPage(totalPages)}>{totalPages}</PageBtn>
              </>
            )}
          </div>

          <PageBtn onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
            {t('articles.list.pagination.next', 'Next')} <ChevronRight className="w-4 h-4" />
          </PageBtn>
        </section>
      )}

      <section
        className="mt-16 p-8 md:p-12 rounded-3xl text-center"
        style={{
          background: 'rgba(255,255,255,0.60)',
          border: '1px solid rgba(65,90,77,0.12)',
          boxShadow: '0 4px 24px rgba(65,90,77,0.08)',
        }}
      >
        <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: '#262626' }}>
          {t('articles.list.newsletter.title', 'Stay Ahead of the Competition')}
        </h2>
        <p className="mb-6 max-w-xl mx-auto" style={{ color: '#5a5a5a' }}>
          {t('articles.list.newsletter.subtitle', 'Get weekly career tips, job search strategies, and exclusive content delivered to your inbox.')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            placeholder={t('articles.list.newsletter.emailPlaceholder', 'Enter your email')}
            className="flex-1 px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
            style={INPUT}
            onFocus={(e) => {
              e.currentTarget.style.border = '1px solid rgba(65,90,77,0.50)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(65,90,77,0.08)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = '1px solid rgba(65,90,77,0.18)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <button
            className="px-6 py-3 rounded-xl font-semibold text-sm transition-all"
            style={{
              background: 'linear-gradient(135deg, #b88655, #c9955f)',
              color: '#fff',
              boxShadow: '0 4px 16px rgba(184,134,85,0.30)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
          >
            {t('articles.list.newsletter.subscribe', 'Subscribe')}
          </button>
        </div>
      </section>
    </div>
  );
}
