# Peblo Sync – AI Notes Workspace

Peblo Sync is a modern, high-fidelity productivity workspace designed to seamlessly manage your notes, tasks, and ideas with the power of AI.

## 🏗 Architecture Overview

This project is built using a **Full-Stack Monorepo Architecture**, separating the presentation layer from secure API transactions while utilizing cloud-native services for data persistence.

### 1. Frontend (`/frontend`)
- **Framework**: React 19 + TypeScript + Vite.
- **Styling**: Tailwind CSS for a highly responsive, neo-brutalist aesthetic with smooth micro-animations.
- **Routing**: `react-router-dom` for client-side navigation.
- **State Management**: React Context (`NotesContext`) and custom hooks (`useStore.ts`) manage optimistic UI updates.
- **Role**: The frontend handles the entire user experience. It communicates directly with Supabase for user authentication and database queries, but relies on our custom Node.js backend to securely process AI tasks.

### 2. Backend (`/backend`)
- **Framework**: Node.js + Express.js.
- **Role**: The backend acts as a secure proxy and business logic layer. 
- **Security Concept**: By moving the Groq LLM logic to the backend, the `GROQ_API_KEY` is completely hidden from the user's web browser, preventing unauthorized API usage and credential scraping. The frontend simply sends the note text to the backend, and the backend securely orchestrates the prompt with the Groq API.

### 3. Database & Authentication (Supabase)
- **Database**: PostgreSQL (managed by Supabase).
- **Authentication**: Supabase Auth handles secure user sign-ups, logins, and session management.
- **Data Security**: We utilize PostgreSQL **Row Level Security (RLS)**. Even though the frontend queries the database directly, RLS policies enforce that users can strictly only SELECT, INSERT, UPDATE, or DELETE rows where the `user_id` matches their own secure authentication token.

## 🚀 2. Setup Instructions

### How to configure environment variables
1. Find the `.env.example` file in the root directory.
2. Duplicate it into the `/frontend` directory and rename it to `.env`. Fill in your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Duplicate it into the `/backend` directory and rename it to `.env`. Fill in your `GROQ_API_KEY`.

### How to install dependencies
You will need to install the Node.js packages for both the frontend and the backend separately.
Open your terminal and run:

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### How to run the frontend and backend
To run the application locally, you must run both the frontend React app and the backend Express server concurrently. Open two separate terminal windows:

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```
*(The backend will start on http://localhost:3000)*

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```
*(The frontend will start on http://localhost:5173)*

### How to test the application
1. Open your browser to `http://localhost:5173`.
2. **Authentication Test**: Sign up for a new account. You should be redirected to the dashboard.
3. **Database Security Test**: Create a new note and write some text. Refresh the page to ensure the note persists (verifying Supabase connection). Try logging in with a different account to ensure you cannot see the first account's notes (verifying RLS).
4. **Backend AI Test**: Click the "AI Summary" button on your note. Check the backend terminal (Terminal 1) to see the request being processed. The AI summary should successfully appear in the frontend sidebar, verifying that the backend is securely communicating with Groq.
