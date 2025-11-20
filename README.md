# DaBreederVercel

A modern dog breeding and community platform built with React, Vite, Supabase, and TailwindCSS.

## Features

- Dog profile management (add, edit, view)
- Document uploads for dogs (health, pedigree, etc.)
- Matchmaking system for breeders
- Community forum with image posts
- Reporting and banning system for moderation
- Authentication and user management
- Admin dashboard for analytics and user control

## Tech Stack

- Frontend: React 19, Vite, TailwindCSS, Radix UI, React Router
- Backend: Supabase (Postgres, Auth, Storage)
- State/Data: React Context, TanStack Query
- Testing: Vitest, Testing Library
- Lint/Format: ESLint, Prettier, Husky

## Getting Started

1. Clone the repo:

   ```sh
   git clone https://github.com/Ezekiel-Cruz/DaBreederVercel.git
   cd dabreeder
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

3. Configure Supabase:
   - Create a `.env.local` file in the root:

     ```
     VITE_SUPABASE_URL=your-supabase-url
     VITE_SUPABASE_ANON_KEY=your-anon-key
     ```

   - See `src/lib/supabaseClient.js` for client setup.

4. Run locally:

   ```sh
   npm run dev
   ```

5. Build for production:

   ```sh
   npm run build
   ```

## Supabase Setup

- Buckets: `dog-documents`, `thread-images`
- Tables: `dogs`, `dog_documents`, `threads`, `comments`, `votes`
- Policies: Enable Row Level Security (RLS) for intended access.
- SQL Setup: See `supabase/sql/` for schema and bucket setup.

## Folder Structure

- `src/components/` – UI components
- `src/pages/` – Route pages
- `src/context/` – React context providers
- `src/hooks/` – Custom hooks
- `src/lib/` – Supabase and utility libraries
- `src/utils/` – Utility functions

## Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/foo`)
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT
