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
