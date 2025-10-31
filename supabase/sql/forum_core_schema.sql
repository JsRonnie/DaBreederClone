-- RLS
alter table public.threads enable row level security;
alter table public.comments enable row level security;
-- Policies (guarded by pg_policies checks)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='threads' AND policyname='threads_select_auth') THEN
    CREATE POLICY threads_select_auth ON public.threads FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='threads' AND policyname='threads_insert_own') THEN
    CREATE POLICY threads_insert_own ON public.threads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='threads' AND policyname='threads_delete_own') THEN
    CREATE POLICY threads_delete_own ON public.threads FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END$$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='comments' AND policyname='comments_select_auth') THEN
    CREATE POLICY comments_select_auth ON public.comments FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='comments' AND policyname='comments_insert_own') THEN
    CREATE POLICY comments_insert_own ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='comments' AND policyname='comments_delete_own') THEN
    CREATE POLICY comments_delete_own ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END$$;
-- Explicit grants (some projects lack default grants)
grant select, insert on public.threads to authenticated;
grant select, insert on public.comments to authenticated;
grant select, insert, update, delete on public.votes to authenticated;
-- Often needed for showing names
grant select on public.users to authenticated;
-- Also ensures required extension and grants for 'authenticated' role.

-- Required extension for gen_random_uuid()
create extension if not exists pgcrypto with schema public;

-- Threads
create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  title text,
  body text,
  user_id uuid,
  created_at timestamptz not null default now(),
  upvotes_count integer not null default 0,
  downvotes_count integer not null default 0
);

-- Columns (idempotent adds in case table already existed with fewer columns)
alter table public.threads add column if not exists title text;
alter table public.threads add column if not exists body text;
alter table public.threads add column if not exists user_id uuid;
alter table public.threads add column if not exists created_at timestamptz not null default now();
alter table public.threads add column if not exists upvotes_count integer not null default 0;
alter table public.threads add column if not exists downvotes_count integer not null default 0;

-- Optional FK to auth.users (guarded)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'threads_user_id_fkey'
  ) then
    alter table public.threads
      add constraint threads_user_id_fkey foreign key (user_id)
      references auth.users(id) on delete set null;
  end if;
end$$;

-- Optional one-time backfill to sync existing rows (safe to re-run)
do $$
begin
  update public.threads t set
    upvotes_count = coalesce((select count(*) from public.votes v where v.thread_id = t.id and v.value = 1), 0),
    downvotes_count = coalesce((select count(*) from public.votes v where v.thread_id = t.id and v.value = -1), 0);

  update public.comments c set
    upvotes_count = coalesce((select count(*) from public.votes v where v.comment_id = c.id and v.value = 1), 0),
    downvotes_count = coalesce((select count(*) from public.votes v where v.comment_id = c.id and v.value = -1), 0);
end$$;

-- =============================================================
-- Vote count maintenance (threads/comments) via triggers
-- Creates lightweight functions and a single trigger on public.votes
-- to refresh denormalized upvotes_count/downvotes_count columns.
-- Safe/idempotent: functions are CREATE OR REPLACE; trigger is guarded.
-- =============================================================

-- Ensure count columns exist (no-op if already created above)
alter table public.threads  add column if not exists upvotes_count integer not null default 0;
alter table public.threads  add column if not exists downvotes_count integer not null default 0;
alter table public.comments add column if not exists upvotes_count integer not null default 0;
alter table public.comments add column if not exists downvotes_count integer not null default 0;

-- Helper functions to recompute counts using count(*)
create or replace function public.refresh_thread_vote_counts(p_thread_id uuid)
returns void
language sql
as $$
  update public.threads t
     set upvotes_count   = (select count(*) from public.votes v where v.thread_id = p_thread_id and v.value = 1),
         downvotes_count = (select count(*) from public.votes v where v.thread_id = p_thread_id and v.value = -1)
   where t.id = p_thread_id;
$$;

create or replace function public.refresh_comment_vote_counts(p_comment_id uuid)
returns void
language sql
as $$
  update public.comments c
     set upvotes_count   = (select count(*) from public.votes v where v.comment_id = p_comment_id and v.value = 1),
         downvotes_count = (select count(*) from public.votes v where v.comment_id = p_comment_id and v.value = -1)
   where c.id = p_comment_id;
$$;

-- Trigger function invoked on changes to public.votes
create or replace function public.on_votes_change_refresh_counts()
returns trigger
language plpgsql
as $$
begin
  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
    if NEW.thread_id is not null then
      perform public.refresh_thread_vote_counts(NEW.thread_id);
    end if;
    if NEW.comment_id is not null then
      perform public.refresh_comment_vote_counts(NEW.comment_id);
    end if;
  end if;
  if (TG_OP = 'DELETE') then
    if OLD.thread_id is not null then
      perform public.refresh_thread_vote_counts(OLD.thread_id);
    end if;
    if OLD.comment_id is not null then
      perform public.refresh_comment_vote_counts(OLD.comment_id);
    end if;
  end if;
  return null; -- statement completed; nothing to return for row
end;
$$;

-- Create the trigger only if it doesn't already exist
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_votes_refresh_counts'
  ) then
    create trigger trg_votes_refresh_counts
    after insert or update or delete on public.votes
    for each row execute function public.on_votes_change_refresh_counts();
  end if;
end$$;

create index if not exists idx_threads_created_at on public.threads(created_at desc);

-- Comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  body text,
  user_id uuid,
  thread_id uuid,
  created_at timestamptz not null default now(),
  upvotes_count integer not null default 0,
  downvotes_count integer not null default 0
);

alter table public.comments add column if not exists body text;
alter table public.comments add column if not exists user_id uuid;
alter table public.comments add column if not exists thread_id uuid;
alter table public.comments add column if not exists created_at timestamptz not null default now();
alter table public.comments add column if not exists upvotes_count integer not null default 0;
alter table public.comments add column if not exists downvotes_count integer not null default 0;

-- FKs (guarded)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname='comments_user_id_fkey'
  ) then
    alter table public.comments
      add constraint comments_user_id_fkey foreign key (user_id)
      references auth.users(id) on delete set null;
  end if;
  if not exists (
    select 1 from pg_constraint where conname='comments_thread_id_fkey'
  ) then
    alter table public.comments
      add constraint comments_thread_id_fkey foreign key (thread_id)
      references public.threads(id) on delete cascade;
  end if;
end$$;

create index if not exists idx_comments_thread_id on public.comments(thread_id);
create index if not exists idx_comments_created_at on public.comments(created_at);

-- Votes
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  thread_id uuid,
  comment_id uuid,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now()
);

alter table public.votes add column if not exists user_id uuid not null;
alter table public.votes add column if not exists thread_id uuid;
alter table public.votes add column if not exists comment_id uuid;
alter table public.votes add column if not exists value smallint;
alter table public.votes add column if not exists created_at timestamptz not null default now();

-- Guarded FKs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='votes_user_id_fkey'
  ) THEN
    ALTER TABLE public.votes
      ADD CONSTRAINT votes_user_id_fkey FOREIGN KEY (user_id)
      REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='votes_thread_id_fkey'
  ) THEN
    ALTER TABLE public.votes
      ADD CONSTRAINT votes_thread_id_fkey FOREIGN KEY (thread_id)
      REFERENCES public.threads(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='votes_comment_id_fkey'
  ) THEN
    ALTER TABLE public.votes
      ADD CONSTRAINT votes_comment_id_fkey FOREIGN KEY (comment_id)
      REFERENCES public.comments(id) ON DELETE CASCADE;
  END IF;
END$$;

-- Prevent duplicate votes per user per item (partial unique indexes)
create unique index if not exists uq_votes_user_thread on public.votes(user_id, thread_id) where comment_id is null;
create unique index if not exists uq_votes_user_comment on public.votes(user_id, comment_id) where thread_id is null;
create index if not exists idx_votes_thread_id on public.votes(thread_id);
create index if not exists idx_votes_comment_id on public.votes(comment_id);

-- Explicit grants (some projects lack default grants)
grant select, insert on public.threads to authenticated;
grant select, insert on public.comments to authenticated;
grant select, insert, update, delete on public.votes to authenticated;

-- Legacy compatibility: some old projects created a `content` column on threads and made it NOT NULL.
-- Our app uses `body` (nullable). Make `content` nullable if it exists to avoid NOT NULL violations.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='threads' and column_name='content'
  ) then
    -- drop NOT NULL if present (safe if already nullable)
    begin
      alter table public.threads alter column content drop not null;
    exception when others then
      -- ignore if cannot drop (e.g., column already nullable or lacks privilege)
      null;
    end;
  end if;
end$$;

-- Legacy compatibility for comments: handle old `content` and `author_id` columns
do $$
begin
  -- comments.content NOT NULL -> make nullable
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='comments' and column_name='content'
  ) then
    begin
      alter table public.comments alter column content drop not null;
    exception when others then null;
    end;
  end if;

  -- comments.author_id present -> drop NOT NULL and backfill user_id
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='comments' and column_name='author_id'
  ) then
    begin
      alter table public.comments alter column author_id drop not null;
    exception when others then null;
    end;

    update public.comments
      set author_id = coalesce(author_id, user_id),
          user_id   = coalesce(user_id, author_id)
    where (author_id is null and user_id is not null)
       or (user_id is null and author_id is not null);
  end if;
end$$;

-- Sync function for comments (harmless if author_id column doesn't exist)
create or replace function public.on_comments_sync_author_user()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
    if new.user_id is null and (select exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='comments' and column_name='author_id'
    )) and new.author_id is not null then
      new.user_id := new.author_id;
    end if;
    if (select exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='comments' and column_name='author_id'
    )) and new.author_id is null and new.user_id is not null then
      new.author_id := new.user_id;
    end if;
  end if;
  return new;
end;
$$;

do $$
begin
  if exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='comments' and column_name='author_id'
  ) then
    if not exists (
      select 1 from pg_trigger where tgname='trg_comments_sync_author_user' and tgrelid='public.comments'::regclass
    ) then
      create trigger trg_comments_sync_author_user
      before insert or update on public.comments
      for each row execute function public.on_comments_sync_author_user();
    end if;
  end if;
end$$;

-- RLS
alter table public.threads enable row level security;
alter table public.comments enable row level security;
alter table public.votes enable row level security;

-- Policies (guarded by pg_policies checks)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='threads' AND policyname='threads_select_auth') THEN
    CREATE POLICY threads_select_auth ON public.threads FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='threads' AND policyname='threads_insert_own') THEN
    CREATE POLICY threads_insert_own ON public.threads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='comments' AND policyname='comments_select_auth') THEN
    CREATE POLICY comments_select_auth ON public.comments FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='comments' AND policyname='comments_insert_own') THEN
    CREATE POLICY comments_insert_own ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='votes' AND policyname='votes_select_auth') THEN
    CREATE POLICY votes_select_auth ON public.votes FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='votes' AND policyname='votes_insert_own') THEN
    CREATE POLICY votes_insert_own ON public.votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='votes' AND policyname='votes_update_own') THEN
    CREATE POLICY votes_update_own ON public.votes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='votes' AND policyname='votes_delete_own') THEN
    CREATE POLICY votes_delete_own ON public.votes FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END$$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='threads' and column_name='author_id'
  ) then
    -- allow inserts that provide only user_id
    begin
      alter table public.threads alter column author_id drop not null;
    exception when others then null;
    end;

    -- Backfill both directions once
    update public.threads
      set author_id = coalesce(author_id, user_id),
          user_id   = coalesce(user_id, author_id)
    where (author_id is null and user_id is not null)
       or (user_id is null and author_id is not null);
  end if;
end$$;

-- Create sync function (harmless if author_id doesn't exist)
create or replace function public.on_threads_sync_author_user()
returns trigger
language plpgsql
as $$
begin
  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
    if new.user_id is null and (select exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='threads' and column_name='author_id'
    )) and new.author_id is not null then
      new.user_id := new.author_id;
    end if;
    if (select exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='threads' and column_name='author_id'
    )) and new.author_id is null and new.user_id is not null then
      new.author_id := new.user_id;
    end if;
  end if;
  return new;
end;
$$;

-- Create trigger only if author_id exists
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='threads' and column_name='author_id'
  ) then
    if not exists (
      select 1 from pg_trigger
      where tgname = 'trg_threads_sync_author_user'
        and tgrelid = 'public.threads'::regclass
    ) then
      create trigger trg_threads_sync_author_user
      before insert or update on public.threads
      for each row execute function public.on_threads_sync_author_user();
    end if;
  end if;
end$$;
