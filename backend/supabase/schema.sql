-- ============================================
-- AI Study Assistant - Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Documents Table
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  file_name text not null,
  file_url text,
  extracted_text text,
  uploaded_at timestamptz default now()
);
alter table public.documents enable row level security;
create policy "Users can manage own documents"
  on public.documents for all
  using (auth.uid() = user_id);

-- 2. Notes Table
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete cascade,
  generated_notes text not null,
  created_at timestamptz default now()
);
alter table public.notes enable row level security;
create policy "Users can manage notes of own documents"
  on public.notes for all
  using (
    document_id in (
      select id from public.documents where user_id = auth.uid()
    )
  );

-- 3. Quizzes Table
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete cascade,
  quiz_data jsonb not null,
  created_at timestamptz default now()
);
alter table public.quizzes enable row level security;
create policy "Users can manage quizzes of own documents"
  on public.quizzes for all
  using (
    document_id in (
      select id from public.documents where user_id = auth.uid()
    )
  );

-- 4. Doubts Table
create table if not exists public.doubts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  question text not null,
  answer text not null,
  created_at timestamptz default now()
);
alter table public.doubts enable row level security;
create policy "Users can manage own doubts"
  on public.doubts for all
  using (auth.uid() = user_id);

-- 5. Study Plans Table
create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  plan_data jsonb not null,
  created_at timestamptz default now()
);
alter table public.study_plans enable row level security;
create policy "Users can manage own study plans"
  on public.study_plans for all
  using (auth.uid() = user_id);

-- 6. Flashcards Table
create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete cascade not null,
  cards jsonb not null,
  created_at timestamptz default now()
);
alter table public.flashcards enable row level security;
create policy "Users can manage flashcards of own documents"
  on public.flashcards for all
  using (
    document_id in (
      select id from public.documents where user_id = auth.uid()
    )
  );

-- 7. User Profiles Table (Gamification)
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  streak_days integer default 0,
  last_active_date date,
  badges jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);
alter table public.user_profiles enable row level security;
create policy "Users can manage own profile"
  on public.user_profiles for all
  using (auth.uid() = user_id);

-- 8. Quiz Attempts Table (Weakness Analysis)
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  document_id uuid references public.documents(id) on delete cascade not null,
  score integer not null,
  total integer not null,
  topics jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);
alter table public.quiz_attempts enable row level security;
create policy "Users can manage own quiz attempts"
  on public.quiz_attempts for all
  using (auth.uid() = user_id);

-- ============================================
-- Done! All 8 tables created with RLS enabled.
-- ============================================
