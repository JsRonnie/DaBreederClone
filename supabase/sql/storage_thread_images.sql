-- Create a public storage bucket for thread images and set basic RLS policies
-- Run this against your Supabase project's database (SQL editor or CLI)

-- Some projects don't expose storage.create_bucket with named args. Use a portable INSERT instead.
do $$
begin
  if not exists (
    select 1 from storage.buckets where id = 'thread-images'
  ) then
    insert into storage.buckets (id, name, public)
    values ('thread-images', 'thread-images', true);
  end if;
  -- Try to set file_size_limit if the column exists (older schemas might not have it)
  begin
    update storage.buckets
       set file_size_limit = 10485760 -- 10 MB
     where id = 'thread-images';
  exception when undefined_column then
    -- ignore if file_size_limit column is not available
    null;
  end;
end$$;

-- Policies on storage.objects for this bucket
-- Note: storage.objects has RLS enabled by default in Supabase projects

-- Allow anyone to read files from this bucket
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Thread images are publicly readable'
  ) then
    create policy "Thread images are publicly readable"
      on storage.objects for select
      using (bucket_id = 'thread-images');
  end if;
end$$;

-- Allow authenticated users to upload files to this bucket.
-- We assume the client uploads to a path prefixed with their user id (e.g., auth.uid()/filename)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can upload thread images'
  ) then
    create policy "Authenticated users can upload thread images"
      on storage.objects for insert
      with check (
        bucket_id = 'thread-images'
        and auth.role() = 'authenticated'
      );
  end if;
end$$;

-- Allow authenticated users to update their own files in this bucket
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can update their own thread images'
  ) then
    create policy "Users can update their own thread images"
      on storage.objects for update
      using (
        bucket_id = 'thread-images'
        and auth.role() = 'authenticated'
        and owner = auth.uid()
      );
  end if;
end$$;

-- Allow authenticated users to delete their own files in this bucket
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can delete their own thread images'
  ) then
    create policy "Users can delete their own thread images"
      on storage.objects for delete
      using (
        bucket_id = 'thread-images'
        and auth.role() = 'authenticated'
        and owner = auth.uid()
      );
  end if;
end$$;
