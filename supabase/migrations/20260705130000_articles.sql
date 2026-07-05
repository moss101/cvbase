-- articles: career-library content (resume/interview/career guides).
-- Public read for published rows; writes are performed via the service-role
-- key only (seed script / admin tooling), so no insert/update/delete policies
-- are granted to anon/authenticated.
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  category text not null check (category in (
    'Resume Writing',
    'Interview Prep',
    'Career Development',
    'Professional Development',
    'Personality Development'
  )),
  excerpt text not null default '',
  content text not null,
  seo_title text not null default '',
  seo_description text not null default '',
  seo_keywords text[] not null default '{}',
  tags text[] not null default '{}',
  difficulty text not null default 'Beginner' check (difficulty in ('Beginner', 'Intermediate', 'Advanced')),
  read_time text not null default '5 min',
  author_name text not null default 'CVbase Team',
  author_title text not null default 'Career Development Specialist',
  featured_image text,
  is_published boolean not null default true,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz not null default now()
);

create index idx_articles_slug on public.articles(slug);
create index idx_articles_category on public.articles(category);
create index idx_articles_published on public.articles(is_published);
create index idx_articles_published_at on public.articles(published_at desc);
create index idx_articles_search on public.articles
  using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content, '')));

alter table public.articles enable row level security;

create policy "articles_select_published" on public.articles
  for select using (is_published = true);

create or replace function public.set_articles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger articles_updated_at
  before update on public.articles
  for each row
  execute function public.set_articles_updated_at();
