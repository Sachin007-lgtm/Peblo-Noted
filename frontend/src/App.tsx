import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { User } from './types';
import { useAuth } from './store/useStore';
import { NotesProvider, useNotesContext } from './context/NotesContext';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import MyNotesPage from './pages/MyNotesPage';
import EditorPage from './pages/EditorPage';
import InsightsPage from './pages/InsightsPage';
import SearchPage from './pages/SearchPage';
import SharedNotePage from './pages/SharedNotePage';
import Layout from './components/Layout';
import './index.css';

// ── Inner app — receives user from App so no second useAuth() call ──────────────
function AuthenticatedApp({ user, onLogout }: { user: User; onLogout: () => void }) {
  const notesStore = useNotesContext();

  const handleCreateNote = (): string => {
    const note = notesStore.createNote();
    return note.note_id;
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public shared note — no layout wrapper */}
        <Route path="/shared/:shareId" element={<SharedNotePage getSharedNote={notesStore.getSharedNote} />} />

        {/* Authenticated layout */}
        <Route element={<Layout user={user} onLogout={onLogout} onCreateNote={handleCreateNote} />}>
          <Route path="/"              element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"     element={<DashboardPage   user={user} notes={notesStore.notes} />} />
          <Route path="/notes"         element={<MyNotesPage     notes={notesStore.notes} onCreateNote={handleCreateNote} onDeleteNote={notesStore.deleteNote} onTogglePin={notesStore.togglePin} onArchiveNote={notesStore.archiveNote} />} />
          <Route path="/editor/:id"    element={<EditorPage />} />
          <Route path="/search"        element={<SearchPage      notes={notesStore.notes} />} />
          <Route path="/insights"      element={<InsightsPage    notes={notesStore.notes} aiUsageCount={notesStore.aiUsageCount} />} />
          <Route path="/settings"      element={<InsightsPage    notes={notesStore.notes} aiUsageCount={notesStore.aiUsageCount} />} />
          <Route path="/trash"         element={<MyNotesPage     notes={notesStore.notes.filter(n => n.archived)} onDeleteNote={notesStore.deleteNote} />} />
          <Route path="/notifications" element={<DashboardPage   user={user} notes={notesStore.notes} />} />
          <Route path="/tips"          element={<DashboardPage   user={user} notes={notesStore.notes} />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// ── Root app ────────────────────────────────────────────────────────────────────
function App() {
  const { user, login, signup, logout, loginWithOAuth, isAuthenticated, loading } = useAuth();

  // Loading spinner while Supabase resolves the session
  if (loading) {
    return (
      <div className="flex w-full h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <span
              className="material-symbols-outlined text-white text-[22px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              edit_note
            </span>
          </div>
          <div className="spinner-dark" style={{ width: 24, height: 24 }} />
        </div>
      </div>
    );
  }

  // Not logged in — show auth page
  if (!isAuthenticated || !user) {
    return <AuthPage onLogin={login} onSignup={signup} onOAuth={loginWithOAuth} />;
  }

  // Logged in — single NotesProvider wraps everything so all pages share one store
  return (
    <NotesProvider userId={user.id}>
      <AuthenticatedApp user={user} onLogout={logout} />
    </NotesProvider>
  );
}

export default App;
