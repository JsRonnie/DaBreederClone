-- Create a public storage bucket for thread images and set basic RLS policies
-- Run this against your Supabase project's database (SQL editor or CLI)

-- Create bucket (public so images can be viewed without auth)
select
  storage.create_bucket(
    bucket_name := 'thread-images',
    public := true,
    file_size_limit := 10485760 -- 10 MB; adjust as needed
  );

-- Policies on storage.objects for this bucket
-- Note: storage.objects has RLS enabled by default in Supabase projects

-- Allow anyone to read files from this bucket
create policy "Thread images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'thread-images');

-- Allow authenticated users to upload files to this bucket.
-- We assume the client uploads to a path prefixed with their user id (e.g., auth.uid()/filename)
create policy "Authenticated users can upload thread images"
  on storage.objects for insert
  with check (
    bucket_id = 'thread-images'
    and auth.role() = 'authenticated'
  );

-- Allow authenticated users to update their own files in this bucket
create policy "Users can update their own thread images"
  on storage.objects for update
  using (
    bucket_id = 'thread-images'
    and auth.role() = 'authenticated'
    and owner = auth.uid()
  );

-- Allow authenticated users to delete their own files in this bucket
create policy "Users can delete their own thread images"
  on storage.objects for delete
  using (
    bucket_id = 'thread-images'
    and auth.role() = 'authenticated'
    and owner = auth.uid()
  );
