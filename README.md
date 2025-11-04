# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Supabase Setup

Create a `.env` file in the project root (same level as `package.json`) and add:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Restart the dev server after adding these. Environment variables must be prefixed with `VITE_` to be exposed to the client bundle. The Supabase client is initialized in `src/lib/supabaseClient.js` and will warn in the console if these values are missing.

Buckets expected by current code:

- `dog-documents` (storage) for uploaded files

Database tables expected:

- `dogs`
- `dog_documents`

Make sure Row Level Security (RLS) policies allow the intended operations for authenticated users (and anonymous if you plan to permit it). The form currently requires an authenticated user; adjust the error handling in `useFormData.js` if you want to allow anonymous inserts.

## Forum + image posts (like Reddit)

To enable forum threads with optional images:

1. Configure database tables and policies

- In your Supabase project, run the SQL in `supabase/sql/forum_core_schema.sql` (SQL Editor or CLI). This creates the `threads`, `comments`, and `votes` tables, adds an `image_url` column to `threads`, and sets policies/triggers so vote counts stay in sync.

2. Create the storage bucket for thread images

- In your Supabase project, run the SQL in `supabase/sql/storage_thread_images.sql`.
- This creates a public bucket named `thread-images` and basic RLS policies so authenticated users can upload and anyone can read.

Bucket name to use: `thread-images` (must match exactly).

3. Use it in the app

- In the Forum page, click “Create Post”, choose the “Image” tab, select a file, and post. The image is uploaded to `thread-images/<userId>/<timestamp>_<filename>` and the public URL is stored in `threads.image_url`.
- Image posts render in the feed and on the thread page. Text posts still work as before.

Notes

- Default max file size in the SQL is 10 MB; adjust `file_size_limit` in `storage_thread_images.sql` if you need a different limit.
- The bucket is public so images display without auth. If you prefer private access, make the bucket private and serve images via signed URLs (you’ll need a small code change in `ForumPage.jsx`).
- If you see an error that `image_url` or the bucket is missing, ensure you’ve run the two SQL files above in Supabase.
