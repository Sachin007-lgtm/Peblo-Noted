import React, { createContext, useContext } from 'react';
import { useNotes, useAuth } from '../store/useStore';

// ── Types ──────────────────────────────────────────────────────────────────────
type NotesStoreType = ReturnType<typeof useNotes>;
const NotesContext = createContext<NotesStoreType | null>(null);

// ── Provider: wrap around authenticated routes ─────────────────────────────────
export function NotesProvider({ children, userId }: { children: React.ReactNode; userId?: string }) {
  const store = useNotes(userId);
  return <NotesContext.Provider value={store}>{children}</NotesContext.Provider>;
}

// ── Hook: use anywhere inside NotesProvider ────────────────────────────────────
export function useNotesContext(): NotesStoreType {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error('useNotesContext must be used inside <NotesProvider>');
  return ctx;
}
