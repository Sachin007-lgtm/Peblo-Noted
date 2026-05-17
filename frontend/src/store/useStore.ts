import { useState, useEffect, useCallback } from 'react';
import type { Note, User, AISummary } from '../types';
import { supabase } from '../lib/supabase';

// ── Seed data ──────────────────────────────────────────────────────────────────
/* 
const SEED_NOTES: Note[] = [
  ...
];
*/

const SEED_USER: User = {
  id: 'USR_001',
  name: 'Alex Johnson',
  email: 'alex@example.com',
  createdAt: '2026-01-01T00:00:00Z',
};

// ── Storage helpers ────────────────────────────────────────────────────────────
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ── Groq AI service ────────────────────────────────────────────────────────────
export async function mockGenerateSummary(content: string, title: string): Promise<AISummary> {
  try {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    const res = await fetch(`${backendUrl}/api/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });

    if (!res.ok) throw new Error(`Backend error: ${res.status}`);
    const data = await res.json();
    const text: string = data.result ?? '';

    // Strip potential markdown code fences
    const cleaned = text.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      summary: String(parsed.summary || 'Summary not available.'),
      action_items: Array.isArray(parsed.action_items) 
        ? parsed.action_items.map((item: any) => {
            if (typeof item === 'string') return item;
            if (typeof item === 'object' && item !== null) {
              const str = Object.values(item).find(v => typeof v === 'string');
              if (str) return str as string;
              return JSON.stringify(item);
            }
            return String(item);
          }).slice(0, 5) 
        : [],
      suggested_title: String(parsed.suggested_title || title),
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn('Backend API failed, falling back to mock:', err);
  }

  // ── Fallback mock ──
  return new Promise((resolve) => {
    setTimeout(() => {
      const words = content.replace(/[#*`\n]/g, ' ').split(' ').filter(Boolean);
      const sentences = content.split(/[.!?\n]/).filter((s) => s.trim().length > 20).slice(0, 3);
      const summary = sentences.length > 0
        ? sentences.slice(0, 2).join('. ').trim() + '.'
        : words.slice(0, 25).join(' ') + '...';

      const actionKeywords = ['review', 'prepare', 'fix', 'update', 'implement', 'add', 'create', 'move', 'discuss', 'check'];
      const lines = content.split('\n').filter((l) => l.trim().length > 5);
      const action_items = lines
        .filter((l) => actionKeywords.some((k) => l.toLowerCase().includes(k)))
        .slice(0, 3)
        .map((l) => l.replace(/^[-*#\s]+/, '').trim())
        .filter((l) => l.length > 0);

      resolve({
        summary,
        action_items: action_items.length > 0
          ? action_items
          : ['Review the content thoroughly', 'Follow up on key points', 'Share with stakeholders'],
        suggested_title: title || words.slice(0, 4).join(' ') || 'Untitled Note',
        generatedAt: new Date().toISOString(),
      });
    }, 1200);
  });
}


// ── Hook: useAuth ──────────────────────────────────────────────────────────────
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          createdAt: session.user.created_at,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          createdAt: session.user.created_at,
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean, error?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Login error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string): Promise<{ success: boolean, error?: string }> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) {
      console.error('Signup error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  }, []);

  const loginWithOAuth = useCallback(async (provider: 'google' | 'github') => {
    const { error } = await supabase.auth.signInWithOAuth({ provider });
    if (error) {
      console.error(`${provider} login error:`, error.message);
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { user, login, signup, logout, loginWithOAuth, isAuthenticated: !!user, loading };
}

// ── Hook: useNotes ─────────────────────────────────────────────────────────────
export function useNotes(userId: string | undefined) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiUsageCount, setAiUsageCount] = useState<number>(() =>
    loadFromStorage<number>('peblo_ai_count', 3)
  );

  useEffect(() => {
    if (!userId) {
      setNotes([]);
      return;
    }
    const fetchNotes = async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('updatedAt', { ascending: false });
      
      if (error) {
        console.error('Error fetching notes:', error);
      } else if (data) {
        setNotes(data as Note[]);
      }
    };
    fetchNotes();
  }, [userId]);

  const createNote = useCallback((): Note => {
    if (!userId) throw new Error('Not logged in');
    const note: Note = {
      note_id: `NOTE_${Date.now()}`,
      userId,
      title: 'Untitled Note',
      content: '',
      tags: [],
      category: 'General',
      archived: false,
      pinned: false,
      isPublic: false,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    
    setNotes((prev) => [note, ...prev]);

    supabase.from('notes').insert(note).then(({ error }) => {
      if (error) console.error('Error creating note:', error);
    });

    return note;
  }, [userId]);

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    const updatedFields = { ...updates, updatedAt: new Date().toISOString() };
    
    setNotes((prev) =>
      prev.map((n) => (n.note_id === id ? { ...n, ...updatedFields } : n))
    );

    supabase.from('notes').update(updatedFields).eq('note_id', id).then(({ error }) => {
      if (error) console.error('Error updating note:', error);
    });
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => {
      const note = prev.find(n => n.note_id === id);
      if (note?.archived) {
        supabase.from('notes').delete().eq('note_id', id).then(({ error }) => {
          if (error) console.error('Error deleting note:', error);
        });
        return prev.filter(n => n.note_id !== id);
      }
      
      const updatedFields = { archived: true, updatedAt: new Date().toISOString() };
      supabase.from('notes').update(updatedFields).eq('note_id', id).then(({ error }) => {
        if (error) console.error('Error moving note to trash:', error);
      });
      return prev.map(n => n.note_id === id ? { ...n, ...updatedFields } : n);
    });
  }, []);

  const archiveNote = useCallback((id: string) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.note_id === id) {
          const newArchived = !n.archived;
          const updatedFields = { archived: newArchived, updatedAt: new Date().toISOString() };
          supabase.from('notes').update(updatedFields).eq('note_id', id).then(({ error }) => {
             if (error) console.error('Error changing archive status:', error);
          });
          return { ...n, ...updatedFields };
        }
        return n;
      })
    );
  }, []);

  const togglePin = useCallback((id: string) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.note_id === id) {
          const newPinned = !n.pinned;
          const updatedFields = { pinned: newPinned, updatedAt: new Date().toISOString() };
          supabase.from('notes').update(updatedFields).eq('note_id', id).then(({ error }) => {
             if (error) console.error('Error pinning note:', error);
          });
          return { ...n, ...updatedFields };
        }
        return n;
      })
    );
  }, []);

  const generateShareLink = useCallback((id: string): string => {
    const shareId = `share_${Math.random().toString(36).slice(2, 10)}`;
    const updatedFields = { isPublic: true, shareId, updatedAt: new Date().toISOString() };
    
    setNotes((prev) =>
      prev.map((n) => (n.note_id === id ? { ...n, ...updatedFields } : n))
    );

    supabase.from('notes').update(updatedFields).eq('note_id', id).then(({ error }) => {
      if (error) console.error('Error sharing note:', error);
    });

    return shareId;
  }, []);

  const generateAISummary = useCallback(async (id: string) => {
    const note = notes.find((n) => n.note_id === id);
    if (!note) return;
    setAiLoading(id);
    try {
      const summary = await mockGenerateSummary(note.content, note.title);
      const updatedFields = { aiSummary: summary, updatedAt: new Date().toISOString() };
      
      setNotes((prev) =>
        prev.map((n) => (n.note_id === id ? { ...n, ...updatedFields } : n))
      );

      supabase.from('notes').update(updatedFields).eq('note_id', id).then(({ error }) => {
        if (error) console.error('Error saving AI summary:', error);
      });

      const newCount = aiUsageCount + 1;
      setAiUsageCount(newCount);
      saveToStorage('peblo_ai_count', newCount);
    } finally {
      setAiLoading(null);
    }
  }, [notes, aiUsageCount]);

  const getSharedNote = useCallback(async (shareId: string): Promise<Note | undefined> => {
    const localNote = notes.find((n) => n.shareId === shareId && n.isPublic);
    if (localNote) return localNote;
    
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('shareId', shareId)
      .eq('isPublic', true)
      .single();
      
    if (error) {
      console.error('Error fetching shared note:', error);
      return undefined;
    }
    return data as Note;
  }, [notes]);

  return {
    notes,
    aiLoading,
    aiUsageCount,
    createNote,
    updateNote,
    deleteNote,
    archiveNote,
    togglePin,
    generateShareLink,
    generateAISummary,
    getSharedNote,
  };
}

// ── Hook: useInsights ──────────────────────────────────────────────────────────
export function useInsights(notes: Note[], aiUsageCount: number) {
  const totalNotes = notes.filter((n) => !n.archived).length;
  const archivedNotes = notes.filter((n) => n.archived).length;

  const tagCounts: Record<string, number> = {};
  notes.forEach((n) => n.tags.forEach((t) => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
  const mostUsedTags = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const recentlyEdited = [...notes]
    .filter((n) => !n.archived)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  // Weekly activity — last 7 days
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const dayStr = days[d.getDay()];
    const dateStr = d.toISOString().split('T')[0];
    const count = notes.filter((n) => n.updatedAt.startsWith(dateStr)).length;
    return { day: dayStr, count };
  });

  return { totalNotes, archivedNotes, aiUsageCount, mostUsedTags, weeklyActivity, recentlyEdited };
}

// ── Seed user export ───────────────────────────────────────────────────────────
export { SEED_USER };
