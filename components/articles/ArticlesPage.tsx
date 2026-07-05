import { useEffect, useMemo, useState, type ComponentType, type CSSProperties } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  Compass,
  FileText,
  MessageSquare,
  Sparkles,
  Tag,
  Target,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import { ArticleContent } from './ArticleContent';
import { ArticleCard } from './ArticleCard';
import { ArticlesList } from './ArticlesList';
import {
  getArticleIndex,
  getArticleBySlug,
  getRelatedArticles,
  getAllCategories,
  categoryColors,
  incrementArticleViews,
  type Article,
  type ArticleCategory,
  type ArticleIndexEntry,
} from '../../lib/articles/articles';

const PILLAR_ICON: Record<ArticleCategory, ComponentType<{ className?: string; style?: CSSProperties }>> = {
  'Resume Writing': FileText,
  'Interview Prep': MessageSquare,
  'Career Development': Compass,
  'Professional Development': TrendingUp,
  'Personality Development': Users,
};

const PILLAR_BLURB: Record<ArticleCategory, string> = {
  'Resume Writing': 'Templates, bullet rewrites, and ATS-safe formatting that actually pass the parser.',
  'Interview Prep': 'Behavioral frameworks, take-home teardowns, and the answers hiring managers want to hear.',
  'Career Development': 'Role transitions, compensation strategy, and long-horizon moves that compound.',
  'Professional Development': 'Skills, certifications, and learning rituals that get you promoted, not just busy.',
  'Personality Development': 'Communication, presence, and the soft signals that decide close calls.',
};

function pickFeatured(articles: ArticleIndexEntry[]): ArticleIndexEntry[] {
  const seen = new Set<string>();
  const out: ArticleIndexEntry[] = [];
  for (const cat of ['Resume Writing', 'Interview Prep', 'Career Development'] as const) {
    const pick = articles.find((a) => a.category === cat && !seen.has(a.id));
    if (pick) { out.push(pick); seen.add(pick.id); }
  }
  for (const a of articles) {
    if (out.length >= 3) break;
    if (!seen.has(a.id)) { out.push(a); seen.add(a.id); }
  }
  return out;
}

interface ArticlesPageProps {
  onBack: () => void;
  onStartBuilding?: () => void;
}

export function ArticlesPage({ onBack, onStartBuilding }: ArticlesPageProps) {
  const [articles, setArticles] = useState<ArticleIndexEntry[] | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getArticleIndex().then((index) => {
      if (!cancelled) setArticles(index);
    });
    return () => { cancelled = true; };
  }, []);

  if (!articles) {
    return (
      <div className="flex items-center justify-center py-32 text-sm" style={{ color: '#6b6b6b' }}>
        Loading articles…
      </div>
    );
  }

  if (selectedSlug) {
    return (
      <ArticleDetail
        slug={selectedSlug}
        onBack={() => setSelectedSlug(null)}
        onSelectArticle={setSelectedSlug}
        onBackToApp={onBack}
        onStartBuilding={onStartBuilding}
      />
    );
  }

  return (
    <ArticlesHome articles={articles} onSelectArticle={setSelectedSlug} />
  );
}

function ArticlesHome({
  articles,
  onSelectArticle,
}: {
  articles: ArticleIndexEntry[];
  onSelectArticle: (slug: string) => void;
}) {
  const categories = useMemo(() => getAllCategories(articles), [articles]);

  const counts = useMemo(() => articles.reduce(
    (acc, a) => {
      acc.All += 1;
      acc[a.category] = (acc[a.category] ?? 0) + 1;
      return acc;
    },
    {
      All: 0,
      'Resume Writing': 0,
      'Interview Prep': 0,
      'Career Development': 0,
      'Professional Development': 0,
      'Personality Development': 0,
    } as Record<ArticleCategory | 'All', number>,
  ), [articles]);

  const featured = useMemo(() => pickFeatured(articles), [articles]);
  const [heroFeature, ...sideFeatures] = featured;

  return (
    <div className="relative">
      {/* Editorial hero */}
      <section className="relative px-4 pt-10 pb-16 md:pt-16 md:pb-20">
        <svg
          className="pointer-events-none absolute right-[-40px] top-0 opacity-[0.08]"
          width="260" height="340" viewBox="0 0 220 280" fill="none" aria-hidden="true"
        >
          <path d="M110 10 C40 70 30 160 60 230 C80 268 110 278 110 278 C110 278 140 268 160 230 C190 160 180 70 110 10Z" fill="#415a4d"/>
          <path d="M110 20 L110 278" stroke="#b88655" strokeWidth="1.5" strokeDasharray="4 8"/>
          <path d="M70 90 Q110 110 150 90" stroke="#b88655" strokeWidth="1.2" fill="none"/>
          <path d="M62 150 Q110 175 158 150" stroke="#b88655" strokeWidth="1.2" fill="none"/>
        </svg>

        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-10 md:grid-cols-[1.15fr_1fr] md:items-end">
            <div>
              <div
                className="mb-5 inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{
                  background: 'rgba(184,134,85,0.12)',
                  color: '#b88655',
                  border: '1px solid rgba(184,134,85,0.25)',
                }}
              >
                <BookOpen className="h-3 w-3" /> Career Library
              </div>
              <h1
                className="font-serif-display"
                style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', color: '#415a4d', lineHeight: 1.02 }}
              >
                The playbooks behind a{' '}
                <em style={{ color: '#b88655', fontStyle: 'italic' }}>deliberate</em> career.
              </h1>
              <p className="mt-5 max-w-xl text-[16px] leading-relaxed" style={{ color: '#555' }}>
                {counts.All.toLocaleString()} long-form guides covering resumes, interviews, compensation,
                and the quiet habits that separate the top of the pack. Searchable, tagged, and curated
                — not a content farm.
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                {categories.map((c) => (
                  <span
                    key={c}
                    className="rounded-full px-3 py-1 text-[11px] font-semibold"
                    style={{
                      background: categoryColors[c].bgColor,
                      color: categoryColors[c].textColor,
                      border: `1px solid ${categoryColors[c].borderColor}`,
                    }}
                  >
                    {c} · {counts[c]}
                  </span>
                ))}
              </div>
            </div>

            {heroFeature && (
              <button
                type="button"
                onClick={() => onSelectArticle(heroFeature.slug)}
                className="group block text-left rounded-3xl p-1 transition-transform hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(140deg, rgba(184,134,85,0.45), rgba(65,90,77,0.45))' }}
              >
                <div
                  className="relative h-full overflow-hidden rounded-[20px] p-7"
                  style={{
                    background: 'rgba(255,255,255,0.72)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(65,90,77,0.10)',
                  }}
                >
                  <div className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]">
                    <Sparkles className="h-3 w-3" style={{ color: '#b88655' }} />
                    <span style={{ color: '#b88655' }}>Editor&apos;s pick</span>
                    <span style={{ color: '#999' }}>·</span>
                    <span style={{ color: '#415a4d' }}>{heroFeature.category}</span>
                  </div>
                  <h2
                    className="font-serif-display mb-3"
                    style={{ fontSize: 'clamp(1.5rem, 2.4vw, 2rem)', color: '#262626', lineHeight: 1.15 }}
                  >
                    {heroFeature.title}
                  </h2>
                  <p className="mb-6 text-[14px] leading-relaxed" style={{ color: '#555' }}>
                    {heroFeature.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
                        style={{ background: 'rgba(65,90,77,0.12)', color: '#415a4d' }}
                      >
                        {heroFeature.authorName.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                      </div>
                      <div className="text-xs">
                        <div className="font-semibold" style={{ color: '#262626' }}>{heroFeature.authorName}</div>
                        <div style={{ color: '#888' }}>{heroFeature.authorTitle}</div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#b88655' }}>
                      <Clock className="h-3 w-3" /> {heroFeature.readTime}
                    </span>
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>
      </section>

      {sideFeatures.length > 0 && (
        <section className="px-4 pb-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex items-end justify-between">
              <h2 className="font-serif-display" style={{ fontSize: '1.6rem', color: '#415a4d', lineHeight: 1.2 }}>
                Also reading this week
              </h2>
              <span className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#b88655' }}>
                Curated picks
              </span>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {sideFeatures.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onSelectArticle(a.slug)}
                  className="group block w-full text-left rounded-2xl p-6 transition-transform hover:-translate-y-0.5"
                  style={{
                    background: 'rgba(255,255,255,0.60)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(184,134,85,0.22)',
                    boxShadow: '0 2px 16px rgba(65,90,77,0.06)',
                  }}
                >
                  <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em]">
                    <span
                      className="rounded-full px-2 py-0.5"
                      style={{ background: categoryColors[a.category].bgColor, color: categoryColors[a.category].textColor }}
                    >
                      {a.category}
                    </span>
                    <span style={{ color: '#999' }}>·</span>
                    <span className="inline-flex items-center gap-1" style={{ color: '#888' }}>
                      <Clock className="h-3 w-3" /> {a.readTime}
                    </span>
                  </div>
                  <h3 className="font-serif-display mb-2 transition-colors" style={{ fontSize: '1.25rem', color: '#262626', lineHeight: 1.25 }}>
                    {a.title}
                  </h3>
                  <p className="line-clamp-2 text-[13px] leading-relaxed" style={{ color: '#666' }}>
                    {a.excerpt}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="px-4 pb-4">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <div
                className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]"
                style={{ background: 'rgba(65,90,77,0.08)', color: '#415a4d', border: '1px solid rgba(65,90,77,0.15)' }}
              >
                <Target className="h-3 w-3" /> Reading by topic
              </div>
              <h2 className="font-serif-display" style={{ fontSize: 'clamp(1.7rem, 3vw, 2.4rem)', color: '#415a4d', lineHeight: 1.15 }}>
                Pick a pillar, go deep.
              </h2>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => {
              const Icon = PILLAR_ICON[cat];
              const tint = categoryColors[cat];
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onSelectArticle(articles.find((a) => a.category === cat)?.slug ?? '')}
                  className="group block w-full text-left rounded-2xl p-6 transition-all hover:-translate-y-0.5"
                  style={{
                    background: 'rgba(255,255,255,0.55)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: `1px solid ${tint.borderColor}`,
                    boxShadow: '0 2px 14px rgba(65,90,77,0.05)',
                  }}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{ background: tint.bgColor, color: tint.textColor }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: tint.textColor }}>
                      {counts[cat]} guides
                    </span>
                  </div>
                  <h3 className="font-serif-display mb-2" style={{ fontSize: '1.25rem', color: '#262626', lineHeight: 1.2 }}>
                    {cat}
                  </h3>
                  <p className="mb-5 text-sm leading-relaxed" style={{ color: '#666' }}>
                    {PILLAR_BLURB[cat]}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#415a4d' }}>
                    Browse {cat.split(' ')[0].toLowerCase()} guides
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <ArticlesList
        articles={articles}
        categories={categories}
        counts={counts}
        total={articles.length}
        onSelectArticle={onSelectArticle}
        hideHero
      />
    </div>
  );
}

function ArticleDetail({
  slug,
  onBack,
  onSelectArticle,
  onBackToApp,
  onStartBuilding,
}: {
  slug: string;
  onBack: () => void;
  onSelectArticle: (slug: string) => void;
  onBackToApp: () => void;
  onStartBuilding?: () => void;
}) {
  const [article, setArticle] = useState<Article | null | undefined>(undefined);
  const [related, setRelated] = useState<ArticleIndexEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    setArticle(undefined);
    getArticleBySlug(slug).then((a) => {
      if (cancelled) return;
      setArticle(a);
      if (a) {
        incrementArticleViews(slug);
        getRelatedArticles(slug, a.category, 3).then((r) => { if (!cancelled) setRelated(r); });
      }
    });
    return () => { cancelled = true; };
  }, [slug]);

  if (article === undefined) {
    return (
      <div className="flex items-center justify-center py-32 text-sm" style={{ color: '#6b6b6b' }}>
        Loading article…
      </div>
    );
  }

  if (article === null) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p style={{ color: '#262626' }}>Article not found.</p>
        <button onClick={onBack} className="mt-4 underline" style={{ color: '#415a4d' }}>
          Back to Resources
        </button>
      </div>
    );
  }

  const colors = categoryColors[article.category];

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 transition-colors mb-8"
        style={{ color: '#6b6b6b' }}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Resources</span>
      </button>

      <article className="max-w-4xl mx-auto">
        {article.featuredImage && (
          <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden mb-8">
            <img
              src={article.featuredImage}
              alt={article.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(38,38,38,0.75) 0%, rgba(38,38,38,0.15) 50%, transparent 100%)' }}
            />
            <div className="absolute bottom-6 left-6 flex items-center gap-3">
              <span
                className="px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm"
                style={{ background: 'rgba(255,255,255,0.88)', color: colors.textColor, border: `1px solid ${colors.borderColor}` }}
              >
                {article.category}
              </span>
              <span
                className="px-3 py-2 rounded-full text-xs font-medium backdrop-blur-sm"
                style={
                  article.difficulty === 'Beginner'
                    ? { background: 'rgba(58,125,68,0.20)', color: '#2d6035' }
                    : article.difficulty === 'Intermediate'
                    ? { background: 'rgba(184,134,85,0.20)', color: '#7a5020' }
                    : { background: 'rgba(192,57,43,0.20)', color: '#8a2a1a' }
                }
              >
                {article.difficulty}
              </span>
            </div>
          </div>
        )}

        <header className="mb-8">
          {!article.featuredImage && (
            <div className="flex items-center gap-3 mb-4">
              <span
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{ background: colors.bgColor, color: colors.textColor, border: `1px solid ${colors.borderColor}` }}
              >
                {article.category}
              </span>
              <span
                className="px-2 py-1 rounded-full text-xs font-medium"
                style={
                  article.difficulty === 'Beginner'
                    ? { background: 'rgba(58,125,68,0.10)', color: '#2d6035' }
                    : article.difficulty === 'Intermediate'
                    ? { background: 'rgba(184,134,85,0.12)', color: '#7a5020' }
                    : { background: 'rgba(192,57,43,0.10)', color: '#8a2a1a' }
                }
              >
                {article.difficulty}
              </span>
            </div>
          )}

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight" style={{ color: '#262626' }}>
            {article.title}
          </h1>

          <p className="text-lg mb-6" style={{ color: '#5a5a5a' }}>
            {article.excerpt}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-sm pb-6 border-b border-[rgba(65,90,77,0.12)]" style={{ color: '#6b6b6b' }}>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="font-medium" style={{ color: '#262626' }}>{article.authorName}</span>
              <span>·</span>
              <span>{article.authorTitle}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{article.readTime} read</span>
            </div>
          </div>
        </header>

        <div
          className="rounded-2xl p-6 md:p-10 mb-8"
          style={{
            background: 'rgba(255,255,255,0.70)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(65,90,77,0.12)',
            boxShadow: '0 4px 24px rgba(65,90,77,0.08)',
          }}
        >
          <ArticleContent content={article.content} />
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-12">
          <Tag className="w-4 h-4" style={{ color: '#6b6b6b' }} />
          {article.tags.map((tag) => (
            <span key={tag} className="px-3 py-1 text-sm rounded-full bg-[rgba(65,90,77,0.05)] text-foreground-muted hover:bg-[rgba(65,90,77,0.08)] transition-colors">
              #{tag}
            </span>
          ))}
        </div>

        <div
          className="rounded-2xl p-6 mb-12"
          style={{
            background: 'rgba(255,255,255,0.70)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(65,90,77,0.12)',
            boxShadow: '0 4px 24px rgba(65,90,77,0.08)',
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #415a4d, #b88655)' }}
            >
              {article.authorName.split(' ').map((n) => n[0]).join('')}
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1" style={{ color: '#262626' }}>{article.authorName}</h3>
              <p className="mb-2 text-sm" style={{ color: '#6b6b6b' }}>{article.authorTitle}</p>
              <p className="text-sm" style={{ color: '#6b6b6b' }}>
                Expert contributor at CVbase, helping job seekers accelerate their careers.
              </p>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6" style={{ color: '#262626' }}>Related Articles</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {related.map((r) => (
                <ArticleCard key={r.id} article={r} onSelect={onSelectArticle} />
              ))}
            </div>
          </section>
        )}
      </article>

      <section
        className="max-w-2xl mx-auto mt-16 p-8 rounded-3xl text-center"
        style={{
          background: 'rgba(255,255,255,0.70)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(65,90,77,0.12)',
          boxShadow: '0 4px 24px rgba(65,90,77,0.08)',
        }}
      >
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#262626' }}>Ready to Put This Into Practice?</h2>
        <p className="mb-6" style={{ color: '#5a5a5a' }}>
          Use CVbase&apos;s AI-powered tools to optimize your resume, practice interviews, and land your dream job.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => (onStartBuilding ? onStartBuilding() : onBackToApp())}
            className="px-6 py-3 rounded-xl font-medium transition-all"
            style={{ background: 'linear-gradient(135deg, #415a4d, #5a7a6a)', color: '#fff', boxShadow: '0 4px 16px rgba(65,90,77,0.25)' }}
          >
            Get Started Free
          </button>
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 rounded-xl font-medium transition-all"
            style={{ border: '1px solid rgba(65,90,77,0.18)', color: '#415a4d', background: 'rgba(255,255,255,0.50)' }}
          >
            Browse More Articles
          </button>
        </div>
      </section>
    </div>
  );
}
