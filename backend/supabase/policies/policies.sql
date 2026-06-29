-- Reference file for Supabase Row Level Security (RLS) Policies

-- Users
alter table users enable row level security;
create policy "Users can view own profile" on users for select using (auth.uid() = id);
create policy "Users can update own profile" on users for update using (auth.uid() = id);
create policy "Users can insert own profile" on users for insert with check (auth.uid() = id);

-- Documents
alter table documents enable row level security;
create policy "Users can view own documents" on documents for select using (auth.uid() = user_id);
create policy "Users can insert own documents" on documents for insert with check (auth.uid() = user_id);
create policy "Users can update own documents" on documents for update using (auth.uid() = user_id);
create policy "Users can delete own documents" on documents for delete using (auth.uid() = user_id);

-- Notes
alter table notes enable row level security;
create policy "Users can view notes of own documents" on notes for select using (exists (select 1 from documents where documents.id = notes.document_id and documents.user_id = auth.uid()));
create policy "Users can insert notes of own documents" on notes for insert with check (exists (select 1 from documents where documents.id = notes.document_id and documents.user_id = auth.uid()));
create policy "Users can delete notes of own documents" on notes for delete using (exists (select 1 from documents where documents.id = notes.document_id and documents.user_id = auth.uid()));

-- Quizzes
alter table quizzes enable row level security;
create policy "Users can view quizzes of own documents" on quizzes for select using (exists (select 1 from documents where documents.id = quizzes.document_id and documents.user_id = auth.uid()));
create policy "Users can insert quizzes of own documents" on quizzes for insert with check (exists (select 1 from documents where documents.id = quizzes.document_id and documents.user_id = auth.uid()));
create policy "Users can delete quizzes of own documents" on quizzes for delete using (exists (select 1 from documents where documents.id = quizzes.document_id and documents.user_id = auth.uid()));

-- Doubts
alter table doubts enable row level security;
create policy "Users can view own doubts" on doubts for select using (auth.uid() = user_id);
create policy "Users can insert own doubts" on doubts for insert with check (auth.uid() = user_id);

-- Study Plans
alter table study_plans enable row level security;
create policy "Users can view own study plans" on study_plans for select using (auth.uid() = user_id);
create policy "Users can insert own study plans" on study_plans for insert with check (auth.uid() = user_id);
create policy "Users can update own study plans" on study_plans for update using (auth.uid() = user_id);
create policy "Users can delete own study plans" on study_plans for delete using (auth.uid() = user_id);
