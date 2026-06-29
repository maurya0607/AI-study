-- Supabase Database Schema for AI Study Assistant
-- Migration Name: 20260615000000_init

-- 1. Create Tables

-- users table
create table if not exists users (
  id uuid primary key,
  name text,
  email text unique not null,
  created_at timestamp with time zone default now()
);

-- documents table
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  file_name text not null,
  file_url text,
  extracted_text text,
  uploaded_at timestamp with time zone default now()
);

-- notes table
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade not null,
  generated_notes text not null,
  created_at timestamp with time zone default now()
);

-- quizzes table
create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade not null,
  quiz_data jsonb not null,
  created_at timestamp with time zone default now()
);

-- doubts table
create table if not exists doubts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  question text not null,
  answer text not null,
  created_at timestamp with time zone default now()
);

-- study_plans table
create table if not exists study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  plan_data jsonb not null,
  created_at timestamp with time zone default now()
);

-- 2. Enable Row Level Security (RLS)

alter table users enable row level security;
alter table documents enable row level security;
alter table notes enable row level security;
alter table quizzes enable row level security;
alter table doubts enable row level security;
alter table study_plans enable row level security;

-- 3. Create RLS Policies

-- Users policies
create policy "Users can view their own profile" on users
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on users
  for update using (auth.uid() = id);

create policy "Users can insert their own profile" on users
  for insert with check (auth.uid() = id);

-- Documents policies
create policy "Users can view own documents" on documents
  for select using (auth.uid() = user_id);

create policy "Users can insert own documents" on documents
  for insert with check (auth.uid() = user_id);

create policy "Users can update own documents" on documents
  for update using (auth.uid() = user_id);

create policy "Users can delete own documents" on documents
  for delete using (auth.uid() = user_id);

-- Notes policies
create policy "Users can view notes of own documents" on notes
  for select using (
    exists (
      select 1 from documents
      where documents.id = notes.document_id
      and documents.user_id = auth.uid()
    )
  );

create policy "Users can insert notes of own documents" on notes
  for insert with check (
    exists (
      select 1 from documents
      where documents.id = notes.document_id
      and documents.user_id = auth.uid()
    )
  );

create policy "Users can delete notes of own documents" on notes
  for delete using (
    exists (
      select 1 from documents
      where documents.id = notes.document_id
      and documents.user_id = auth.uid()
    )
  );

-- Quizzes policies
create policy "Users can view quizzes of own documents" on quizzes
  for select using (
    exists (
      select 1 from documents
      where documents.id = quizzes.document_id
      and documents.user_id = auth.uid()
    )
  );

create policy "Users can insert quizzes of own documents" on quizzes
  for insert with check (
    exists (
      select 1 from documents
      where documents.id = quizzes.document_id
      and documents.user_id = auth.uid()
    )
  );

create policy "Users can delete quizzes of own documents" on quizzes
  for delete using (
    exists (
      select 1 from documents
      where documents.id = quizzes.document_id
      and documents.user_id = auth.uid()
    )
  );

-- Doubts policies
create policy "Users can view own doubts" on doubts
  for select using (auth.uid() = user_id);

create policy "Users can insert own doubts" on doubts
  for insert with check (auth.uid() = user_id);

-- Study Plans policies
create policy "Users can view own study plans" on study_plans
  for select using (auth.uid() = user_id);

create policy "Users can insert own study plans" on study_plans
  for insert with check (auth.uid() = user_id);

create policy "Users can update own study plans" on study_plans
  for update using (auth.uid() = user_id);

create policy "Users can delete own study plans" on study_plans
  for delete using (auth.uid() = user_id);
