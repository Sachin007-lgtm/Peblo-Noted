import React from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Note } from '../types';

interface Props { getSharedNote: (shareId: string) => Promise<Note | undefined>; }

const CAT_COLORS: Record<string, { text: string; bg: string }> = {
  'To-Do':         { text: 'text-blue-600',   bg: 'bg-blue-50'   },
  'Project Plan':  { text: 'text-purple-600', bg: 'bg-purple-50' },
  'Meeting Brief': { text: 'text-amber-600',  bg: 'bg-amber-50'  },
  'Drawing Note':  { text: 'text-pink-600',   bg: 'bg-pink-50'   },
  'General':       { text: 'text-gray-600',   bg: 'bg-gray-50'   },
};

export default function SharedNotePage({ getSharedNote }: Props) {
  const { shareId } = useParams<{ shareId: string }>();
  const [note, setNote] = React.useState<Note | null>(null);

  React.useEffect(() => {
    if (shareId) {
      getSharedNote(shareId).then(n => {
        setNote(n || null);
      });
    }
  }, [shareId, getSharedNote]);

  return (
    <div className="min-h-screen bg-surface font-sans">
      {/* Top Banner */}
      <div className="w-full bg-[#1a1d23] text-white/60 text-[12px] py-2 px-6 flex items-center gap-2 justify-center">
        <span className="material-symbols-outlined text-[14px] text-accent">verified</span>
        Shared via <span className="text-white font-semibold ml-1">Peblo Sync</span> · Read-only view
      </div>

      {/* Header */}
      <header className="bg-white border-b border-border px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings:"'FILL' 1" }}>edit_note</span>
            </div>
            <div>
              <p className="font-bold text-[15px] text-text-primary font-display">Peblo Sync</p>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Shared Note</p>
            </div>
          </div>
          <Link to="/signup" className="btn-primary text-[13px] py-2">
            Join for free
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-10">
        {!note ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="material-symbols-outlined text-[56px] text-text-muted mb-4">lock</span>
            <h2 className="text-[22px] font-bold text-text-primary mb-2">Note Not Found</h2>
            <p className="text-[14px] text-text-muted">This note is private or the link is invalid.</p>
            <Link to="/" className="btn-primary mt-8">Return Home</Link>
          </div>
        ) : (
          <article className="animate-fade-up">
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {(() => { const c = CAT_COLORS[note.category] || CAT_COLORS['General']; return (
                <span className={`text-[12px] font-semibold px-3 py-1 rounded-full ${c.bg} ${c.text}`}>{note.category}</span>
              ); })()}
              {note.tags.map(t => <span key={t} className="tag-pill">{t}</span>)}
              <span className="ml-auto text-[12px] text-text-muted">Updated {new Date(note.updatedAt).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</span>
            </div>

            {/* Title */}
            <h1 className="text-[32px] font-bold text-text-primary mb-6 font-display leading-tight">{note.title || 'Untitled'}</h1>

            {/* AI Summary if present */}
            {note.aiSummary && (
              <div className="mb-8 p-5 bg-purple-50 border border-purple-100 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-purple-500 text-[18px]" style={{ fontVariationSettings:"'FILL' 1" }}>auto_awesome</span>
                  <span className="text-[12px] font-bold text-purple-600 uppercase tracking-wider">AI Summary</span>
                </div>
                <p className="text-[14px] text-text-secondary italic leading-relaxed">"{note.aiSummary.summary}"</p>
                {note.aiSummary.action_items?.length > 0 && (
                  <ul className="mt-4 space-y-1.5">
                    {note.aiSummary.action_items.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-text-secondary">
                        <span className="text-accent mt-0.5">✓</span>{a}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Body */}
            <div className="prose prose-gray max-w-none text-[15px] leading-8 text-text-secondary">
              {note.content.split('\n').map((line, i) => {
                if (line.startsWith('## '))  return <h2 key={i} className="text-[20px] font-bold text-text-primary mt-8 mb-3">{line.slice(3)}</h2>;
                if (line.startsWith('### ')) return <h3 key={i} className="text-[16px] font-semibold text-text-primary mt-6 mb-2">{line.slice(4)}</h3>;
                if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-5 mb-1">{line.slice(2)}</li>;
                if (line.trim() === '') return <div key={i} className="h-3" />;
                return <p key={i} className="mb-3">{line}</p>;
              })}
            </div>
          </article>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-border text-center text-[12px] text-text-muted">
        Created with <span className="font-bold text-text-primary">Peblo Sync</span> · AI Note-Taking
      </footer>
    </div>
  );
}
