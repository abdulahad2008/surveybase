-- SurveyBank.uz — Phase 0 schema + RLS
-- Run this once in the Supabase SQL editor (or `supabase db push`) on a fresh project.

create extension if not exists pgcrypto;

-- ── Tables ──────────────────────────────────────────────────────────────

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  affiliation text,
  role text not null default 'user' check (role in ('user','depositor','moderator','admin')),
  created_at timestamptz not null default now()
);

create table datasets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  abstract text,
  country text not null default 'Uzbekistan',
  region text,
  topics text[] not null default '{}',
  collection_method text,
  sample_size int,
  target_population text,
  fieldwork_start date,
  fieldwork_end date,
  languages text[] not null default '{}',
  license text not null default 'CC-BY',
  status text not null default 'pending' check (status in ('draft','pending','published','rejected')),
  depositor_id uuid references profiles(id),
  download_count int not null default 0,
  created_at timestamptz not null default now()
);

create table files (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references datasets(id) on delete cascade,
  storage_path text not null,
  format text not null check (format in ('csv','xlsx','json','pdf')),
  is_codebook boolean not null default false,
  size_bytes bigint,
  checksum text
);

create table survey_columns (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references datasets(id) on delete cascade,
  question_text text not null,
  column_type text not null check (column_type in ('categorical','numeric','date','text')),
  summary_json jsonb
);

create table publications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  authors text,
  year int,
  doi_or_url text
);

create table dataset_publications (
  dataset_id uuid references datasets(id) on delete cascade,
  publication_id uuid references publications(id) on delete cascade,
  primary key (dataset_id, publication_id)
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references datasets(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  rating int check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (dataset_id, user_id)
);

create table download_log (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references datasets(id) on delete cascade,
  user_id uuid references profiles(id),
  format text not null,
  created_at timestamptz not null default now()
);

-- ── Auto-create a profile row on signup ────────────────────────────────

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, affiliation)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'affiliation'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Row-Level Security ──────────────────────────────────────────────────

alter table profiles enable row level security;
alter table datasets enable row level security;
alter table files enable row level security;
alter table survey_columns enable row level security;
alter table publications enable row level security;
alter table dataset_publications enable row level security;
alter table reviews enable row level security;
alter table download_log enable row level security;

create function public.is_moderator(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from profiles where id = uid and role in ('moderator', 'admin')
  );
$$;

-- profiles: readable by everyone, editable by the owner
create policy "Profiles are viewable by everyone" on profiles
  for select using (true);
create policy "Users can update their own profile" on profiles
  for update using (auth.uid() = id);

-- datasets: published rows are public; drafts/pending are visible to their
-- depositor and to moderators; only the depositor can create/update their own
create policy "Published datasets are viewable by everyone" on datasets
  for select using (
    status = 'published'
    or depositor_id = auth.uid()
    or public.is_moderator(auth.uid())
  );
create policy "Depositors can create their own datasets" on datasets
  for insert with check (depositor_id = auth.uid());
create policy "Depositors can edit their own draft or pending datasets" on datasets
  for update using (
    (depositor_id = auth.uid() and status in ('draft', 'pending'))
    or public.is_moderator(auth.uid())
  );

-- files: follow the visibility of their parent dataset
create policy "Files follow dataset visibility" on files
  for select using (
    exists (
      select 1 from datasets d where d.id = dataset_id
        and (d.status = 'published' or d.depositor_id = auth.uid() or public.is_moderator(auth.uid()))
    )
  );
create policy "Depositors add files to their own datasets" on files
  for insert with check (
    exists (select 1 from datasets d where d.id = dataset_id and d.depositor_id = auth.uid())
  );
create policy "Depositors delete files from their own datasets" on files
  for delete using (
    exists (select 1 from datasets d where d.id = dataset_id and d.depositor_id = auth.uid())
  );

-- survey_columns: same pattern as files
create policy "Survey columns follow dataset visibility" on survey_columns
  for select using (
    exists (
      select 1 from datasets d where d.id = dataset_id
        and (d.status = 'published' or d.depositor_id = auth.uid() or public.is_moderator(auth.uid()))
    )
  );
create policy "Depositors add columns to their own datasets" on survey_columns
  for insert with check (
    exists (select 1 from datasets d where d.id = dataset_id and d.depositor_id = auth.uid())
  );
create policy "Depositors delete columns from their own datasets" on survey_columns
  for delete using (
    exists (select 1 from datasets d where d.id = dataset_id and d.depositor_id = auth.uid())
  );

-- publications: readable by everyone; any authenticated user may add one
create policy "Publications are viewable by everyone" on publications
  for select using (true);
create policy "Authenticated users can add publications" on publications
  for insert with check (auth.uid() is not null);

-- dataset_publications: follow dataset visibility / ownership
create policy "Dataset-publication links follow dataset visibility" on dataset_publications
  for select using (
    exists (
      select 1 from datasets d where d.id = dataset_id
        and (d.status = 'published' or d.depositor_id = auth.uid() or public.is_moderator(auth.uid()))
    )
  );
create policy "Depositors link publications to their own datasets" on dataset_publications
  for insert with check (
    exists (select 1 from datasets d where d.id = dataset_id and d.depositor_id = auth.uid())
  );

-- reviews: readable by everyone; a user manages only their own review
create policy "Reviews are viewable by everyone" on reviews
  for select using (true);
create policy "Users can add their own review" on reviews
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own review" on reviews
  for update using (auth.uid() = user_id);
create policy "Users can delete their own review" on reviews
  for delete using (auth.uid() = user_id);

-- download_log: anyone may log a download; a user can see their own history
create policy "Anyone can log a download" on download_log
  for insert with check (true);
create policy "Users can view their own download history" on download_log
  for select using (auth.uid() = user_id or public.is_moderator(auth.uid()));
