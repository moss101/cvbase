import type { CSSProperties } from 'react';
import type { ArticleCategory } from '../../lib/articles/articles-types';
import { useTranslation } from '../../services/translationService';

interface CategoryFilterProps {
  categories: ArticleCategory[];
  selectedCategory: ArticleCategory | 'All';
  onSelect: (category: ArticleCategory | 'All') => void;
  articleCounts?: Record<ArticleCategory | 'All', number>;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelect,
  articleCounts,
}: CategoryFilterProps) {
  const { t } = useTranslation();
  const base: CSSProperties = {
    padding: '6px 16px',
    borderRadius: 24,
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    border: '1px solid rgba(184,134,85,0.28)',
    whiteSpace: 'nowrap',
  };

  const inactive: CSSProperties = {
    ...base,
    background: 'rgba(255,255,255,0.45)',
    color: '#415a4d',
  };

  const active: CSSProperties = {
    ...base,
    background: 'linear-gradient(135deg, #c99a68, #b88655)',
    borderColor: 'transparent',
    color: '#fff',
    boxShadow: '0 4px 12px rgba(184,134,85,0.30)',
  };

  return (
    <div className="flex flex-wrap gap-2 mb-8">
      <button
        onClick={() => onSelect('All')}
        style={selectedCategory === 'All' ? active : inactive}
        onMouseEnter={(e) => {
          if (selectedCategory !== 'All') e.currentTarget.style.background = 'rgba(255,255,255,0.70)';
        }}
        onMouseLeave={(e) => {
          if (selectedCategory !== 'All') e.currentTarget.style.background = 'rgba(255,255,255,0.45)';
        }}
      >
        {t('articles.filter.all', 'All')}
        {articleCounts && (
          <span style={{ marginLeft: 6, opacity: 0.65, fontWeight: 500 }}>
            ({articleCounts['All']})
          </span>
        )}
      </button>

      {categories.map((category) => {
        const isSelected = selectedCategory === category;
        return (
          <button
            key={category}
            onClick={() => onSelect(category)}
            style={isSelected ? active : inactive}
            onMouseEnter={(e) => {
              if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.70)';
            }}
            onMouseLeave={(e) => {
              if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.45)';
            }}
          >
            {category}
            {articleCounts && articleCounts[category] !== undefined && (
              <span style={{ marginLeft: 6, opacity: 0.65, fontWeight: 500 }}>
                ({articleCounts[category]})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
