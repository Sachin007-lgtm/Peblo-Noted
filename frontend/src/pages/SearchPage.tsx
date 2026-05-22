import { useState, useMemo, useEffect } from 'react';
import type { Note } from '../types';
import { useNavigate } from 'react-router-dom';
import { useNotesContext } from '../context/NotesContext';

interface Props {
  notes: Note[];
}

const CAT_COLORS: Record<string, { dot: string; text: string }> = {
  'To-Do':         { dot: 'bg-blue-400',   text: 'text-blue-600'   },
  'Project Plan':  { dot: 'bg-purple-400', text: 'text-purple-600' },
  'Meeting Brief': { dot: 'bg-amber-400',  text: 'text-amber-600'  },
  'Drawing Note':  { dot: 'bg-pink-400',   text: 'text-pink-600'   },
  'General':       { dot: 'bg-gray-400',   text: 'text-gray-600'   },
};

function highlight(text: string, q: string) {
  if (!q.trim()) return text;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
  return text.replace(re, '<mark class="bg-accent/20 text-accent-dark rounded px-0.5">$1</mark>');
}

export default function SearchPage({ notes }: Props) {
  const navigate = useNavigate();
  const notesStore = useNotesContext();

  const [q, setQ] = useState('');
  const [searchMode, setSearchMode] = useState<'keyword' | 'semantic'>('keyword');
  const [semanticResults, setSemanticResults] = useState<(Note & { similarity: number })[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Debounced Semantic Search trigger ──
  useEffect(() => {
    if (searchMode !== 'semantic' || !q.trim()) {
      setSemanticResults([]);
      return;
    }

    setLoading(true);
    const delay = setTimeout(async () => {
      try {
        const results = await notesStore.semanticSearch(q);
        setSemanticResults(results);
      } catch (err) {
        console.error('Semantic search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 450);

    return () => clearTimeout(delay);
  }, [q, searchMode, notesStore]);

  // ── Local Keyword Search results ──
  const keywordResults = useMemo(() => {
    if (!q.trim()) return [];
    const lower = q.toLowerCase();
    return notes.filter(n =>
      !n.archived && (
        n.title.toLowerCase().includes(lower) ||
        n.content.toLowerCase().includes(lower) ||
        n.tags.some(t => t.toLowerCase().includes(lower)) ||
        n.category.toLowerCase().includes(lower)
      )
    );
  }, [notes, q]);

  // Determine active search results based on mode
  const activeResults = searchMode === 'keyword' ? keywordResults : semanticResults;

  // Group by category
  const grouped = useMemo(() => {
    const map: Record<string, typeof activeResults> = {};
    activeResults.forEach(n => {
      if (!map[n.category]) map[n.category] = [];
      map[n.category].push(n);
    });
    return map;
  }, [activeResults]);

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Search Header & Inputs */}
      <div className="shrink-0 px-6 py-5 bg-card border-b border-border">
        {/* Toggle Mode */}
        <div className="flex bg-[#16181f]/5 border border-border p-1 rounded-xl max-w-sm mb-4">
          <button
            onClick={() => setSearchMode('keyword')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
              searchMode === 'keyword'
                ? 'bg-white text-text-primary shadow-sm border border-border'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">search</span>
            Keyword Match
          </button>
          <button
            onClick={() => setSearchMode('semantic')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
              searchMode === 'semantic'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-sm border-none'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
            AI Semantic Search
          </button>
        </div>

        {/* Input Bar */}
        <div className="relative max-w-xl">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-[22px]">
            {searchMode === 'keyword' ? 'search' : 'auto_awesome'}
          </span>
          <input
            autoFocus
            className={`w-full bg-surface border rounded-xl py-3 pl-12 pr-4 text-[15px] text-text-primary outline-none transition-all ${
              searchMode === 'keyword'
                ? 'border-border-strong focus:border-accent focus:shadow-[0_0_0_3px_rgba(76,175,80,0.12)]'
                : 'border-purple-200 focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.12)]'
            }`}
            placeholder={
              searchMode === 'keyword'
                ? "Search notes, tags, categories..."
                : "Ask conceptually: 'recipe with lemon', 'login api notes'..."
            }
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
        </div>

        {q && !loading && (
          <p className="text-[12px] text-text-muted mt-2">
            {activeResults.length} result{activeResults.length !== 1 ? 's' : ''} found via {searchMode === 'keyword' ? 'keyword matching' : 'AI semantic concepts'}
          </p>
        )}
      </div>

      {/* Search Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Loading Spinner for Semantic Search */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="animate-spin material-symbols-outlined text-purple-500 text-[36px] mb-3">progress_activity</span>
            <p className="text-[14px] font-semibold text-text-secondary">Peblo AI is exploring your notes…</p>
            <p className="text-[12px] text-text-muted mt-1">Reading concept shapes and contexts</p>
          </div>
        )}

        {/* Empty State */}
        {!q && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <span className="material-symbols-outlined text-[56px] text-text-muted mb-4">
              {searchMode === 'keyword' ? 'search' : 'psychology'}
            </span>
            <p className="text-[16px] font-semibold text-text-secondary">
              {searchMode === 'keyword' ? 'Search your notes' : 'AI Conceptual Search'}
            </p>
            <p className="text-[13px] text-text-muted mt-1">
              {searchMode === 'keyword'
                ? 'Search by precise titles, content, tags, or categories'
                : 'Describe what you are looking for in natural language to search conceptually'}
            </p>
          </div>
        )}

        {/* No Results State */}
        {q && !loading && activeResults.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <span className="material-symbols-outlined text-[56px] text-text-muted mb-4">search_off</span>
            <p className="text-[16px] font-semibold text-text-secondary">No results found</p>
            <p className="text-[13px] text-text-muted mt-1">
              {searchMode === 'keyword'
                ? 'Try different keywords or check the spelling'
                : 'Try describing the concept differently (e.g. "dinner meal" instead of a specific recipe)'}
            </p>
          </div>
        )}

        {/* Results Grouped by Category */}
        {!loading && Object.entries(grouped).map(([cat, catNotes]) => {
          const style = CAT_COLORS[cat] || CAT_COLORS['General'];
          return (
            <div key={cat} className="mb-6 animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                <span className={`text-[12px] font-bold uppercase tracking-widest ${style.text}`}>{cat}</span>
                <span className="text-[11px] text-text-muted ml-1">({catNotes.length})</span>
              </div>
              <div className="space-y-2">
                {catNotes.map(note => {
                  const snippet = note.content.replace(/<[^>]+>/g, ' ').slice(0, 160);
                  const isSemantic = 'similarity' in note;
                  // @ts-ignore
                  const matchStrength = isSemantic ? Math.round(note.similarity * 100) : null;

                  return (
                    <div
                      key={note.note_id}
                      onClick={() => navigate(`/editor/${note.note_id}`)}
                      className="bg-card rounded-xl border border-border px-4 py-3.5 cursor-pointer hover:shadow-md hover:border-accent/30 transition-all group flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p
                          className="font-semibold text-[14.5px] text-text-primary group-hover:text-accent transition-colors"
                          dangerouslySetInnerHTML={{ __html: searchMode === 'keyword' ? highlight(note.title || 'Untitled', q) : (note.title || 'Untitled') }}
                        />
                        
                        {/* Similarity badge */}
                        {matchStrength !== null && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 flex items-center gap-1"
                            style={{
                              background: matchStrength > 80 ? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.02)',
                              color:      matchStrength > 80 ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                              borderColor: matchStrength > 80 ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.08)',
                            }}
                          >
                            <span className="material-symbols-outlined text-[11px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                            {matchStrength}% Match
                          </span>
                        )}
                      </div>

                      {snippet && (
                        <p
                          className="text-[12.5px] text-text-muted leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: searchMode === 'keyword' ? highlight(snippet, q) : snippet }}
                        />
                      )}
                      
                      <div className="flex items-center gap-3 mt-1">
                        {note.tags.map(t => (
                          <span
                            key={t}
                            className={`tag-pill ${
                              searchMode === 'keyword' && t.toLowerCase().includes(q.toLowerCase())
                                ? '!bg-accent/10 !text-accent-dark'
                                : ''
                            }`}
                          >
                            {t}
                          </span>
                        ))}
                        <span className="text-[11px] text-text-muted ml-auto">
                          {new Date(note.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
