# DaBreederVercel


A modern dog breeding and community platform built with React, Vite, Supabase, and TailwindCSS.

## Features

### Dog Profile Management
- Add, edit, and view detailed dog profiles with breed, gender, and images
- Track health certifications, pedigree, DNA results, and more

### Document Uploads
- Upload and manage health records, pedigree certificates, DNA test results, and additional health tests
- Supports images and documents (PDF, DOCX, etc.) with validation and preview

### Matchmaking System
- Instantly discover compatible breeding partners for your dogs
- Real-time compatibility scores and match requests
- Accept, decline, or cancel match requests with status tracking

### Community Forum
- Post text or image threads, comment, and vote
- Live updates for threads and comments
- Sort by best, hot, new, or old
- Featured dog posts with verified success rates

### Messaging & Safe Connections
- Secure messaging between breeders
- Share photos and arrange meetings through the platform

### Reporting & Moderation
- Report dog profiles, messages, threads, and comments for review
- Multiple report categories (fake profile, harassment, explicit content, etc.)
- Banning system with user notification and support contact

### Authentication & User Management
- Email/password authentication via Supabase
- Password reset and change flows
- Role-based access (admin, user)

### Admin Dashboard
- Analytics and user control panel
- Manage users, dog profiles, forum posts, messages, and reports
- Real-time counters for pending messages and reports
- Admin-only access and secure sign-out

### Additional Features
- Responsive UI with TailwindCSS and Radix UI
- Toast notifications and modals for feedback
- File validation and error handling
- Support center and help modal

---

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
