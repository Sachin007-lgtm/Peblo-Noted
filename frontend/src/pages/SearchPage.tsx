import { useState, useMemo } from 'react';
import type { Note } from '../types';
import { useNavigate } from 'react-router-dom';

interface Props { notes: Note[]; }

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
  const [q, setQ] = useState('');

  const results = useMemo(() => {
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

  // Group by category
  const grouped = useMemo(() => {
    const map: Record<string, Note[]> = {};
    results.forEach(n => {
      if (!map[n.category]) map[n.category] = [];
      map[n.category].push(n);
    });
    return map;
  }, [results]);

  return (
    <div className="flex flex-col h-full">
      {/* Search input */}
      <div className="shrink-0 px-6 py-5 bg-card border-b border-border">
        <div className="relative max-w-xl">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-[22px]">search</span>
          <input
            autoFocus
            className="w-full bg-surface border border-border-strong rounded-xl py-3 pl-12 pr-4 text-[15px] text-text-primary outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(76,175,80,0.12)] transition-all"
            placeholder="Search notes, tags, categories…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
        </div>
        {q && (
          <p className="text-[12px] text-text-muted mt-2">{results.length} result{results.length !== 1 ? 's' : ''} for "{q}"</p>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-6">
        {!q && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <span className="material-symbols-outlined text-[56px] text-text-muted mb-4">search</span>
            <p className="text-[16px] font-semibold text-text-secondary">Search your notes</p>
            <p className="text-[13px] text-text-muted mt-1">Search by title, content, tags, or category</p>
          </div>
        )}

        {q && results.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <span className="material-symbols-outlined text-[56px] text-text-muted mb-4">search_off</span>
            <p className="text-[16px] font-semibold text-text-secondary">No results found</p>
            <p className="text-[13px] text-text-muted mt-1">Try different keywords or check the spelling</p>
          </div>
        )}

        {Object.entries(grouped).map(([cat, catNotes]) => {
          const style = CAT_COLORS[cat] || CAT_COLORS['General'];
          return (
            <div key={cat} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                <span className={`text-[12px] font-bold uppercase tracking-widest ${style.text}`}>{cat}</span>
                <span className="text-[11px] text-text-muted ml-1">({catNotes.length})</span>
              </div>
              <div className="space-y-2">
                {catNotes.map(note => {
                  const snippet = note.content.replace(/<[^>]+>/g,' ').slice(0,120);
                  return (
                    <div
                      key={note.note_id}
                      onClick={() => navigate(`/editor/${note.note_id}`)}
                      className="bg-card rounded-xl border border-border px-4 py-3 cursor-pointer hover:shadow-md hover:border-accent/30 transition-all group"
                    >
                      <p
                        className="font-semibold text-[14px] text-text-primary group-hover:text-accent transition-colors"
                        dangerouslySetInnerHTML={{ __html: highlight(note.title || 'Untitled', q) }}
                      />
                      {snippet && (
                        <p
                          className="text-[12px] text-text-muted mt-1 line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: highlight(snippet, q) }}
                        />
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {note.tags.map(t => (
                          <span key={t} className={`tag-pill ${t.toLowerCase().includes(q.toLowerCase()) ? '!bg-accent/10 !text-accent-dark' : ''}`}>{t}</span>
                        ))}
                        <span className="text-[11px] text-text-muted ml-auto">{new Date(note.updatedAt).toLocaleDateString()}</span>
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
