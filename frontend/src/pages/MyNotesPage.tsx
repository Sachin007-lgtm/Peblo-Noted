import { useState, useMemo } from 'react';
import type { Note } from '../types';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';

interface Props {
  notes: Note[];
  onCreateNote?: () => string;
  onDeleteNote?: (id: string) => void;
  onTogglePin?: (id: string) => void;
  onArchiveNote?: (id: string) => void;
}

const CAT_COLORS: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  'To-Do':         { dot: 'bg-blue-400',   text: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200'   },
  'Project Plan':  { dot: 'bg-purple-400', text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  'Meeting Brief': { dot: 'bg-amber-400',  text: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200'  },
  'Work':          { dot: 'bg-green-400',  text: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200'  },
  'Drawing Note':  { dot: 'bg-pink-400',   text: 'text-pink-600',   bg: 'bg-pink-50',   border: 'border-pink-200'   },
  'General':       { dot: 'bg-gray-400',   text: 'text-gray-600',   bg: 'bg-gray-50',   border: 'border-gray-200'   },
};

const ACCENT_COLORS = ['#4caf50','#3b82f6','#8b5cf6','#f59e0b','#ec4899','#06b6d4'];

const CATEGORIES = ['All', 'To-Do', 'Project Plan', 'Meeting Brief', 'Work', 'Drawing Note', 'General'];

function timeSince(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

type SortKey = 'updated' | 'created' | 'title';
type FilterKey = 'all' | 'pinned' | 'shared' | 'ai';

export default function MyNotesPage({ notes, onCreateNote, onDeleteNote, onTogglePin, onArchiveNote }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [search, setSearch]   = useState('');
  const cat = searchParams.get('cat') || 'All';
  
  const setCat = (newCat: string) => {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      if (newCat === 'All') p.delete('cat');
      else p.set('cat', newCat);
      return p;
    });
  };

  const [filter, setFilter]   = useState<FilterKey>('all');
  const [sort, setSort]       = useState<SortKey>('updated');
  const [view, setView]       = useState<'grid' | 'list'>('grid');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const displayed = useMemo(() => {
    let list = location.pathname === '/trash' ? notes : notes.filter(n => !n.archived);

    // Category
    if (cat !== 'All') list = list.filter(n => n.category === cat);

    // Filter chip
    if (filter === 'pinned') list = list.filter(n => n.pinned);
    if (filter === 'shared')  list = list.filter(n => n.isPublic);
    if (filter === 'ai')      list = list.filter(n => !!n.aiSummary);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q)) ||
        n.category.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sort === 'updated') list = [...list].sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    if (sort === 'created') list = [...list].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (sort === 'title')   list = [...list].sort((a,b) => a.title.localeCompare(b.title));

    return list;
  }, [notes, cat, filter, search, sort]);

  const handleCreate = () => {
    if (onCreateNote) {
      const id = onCreateNote();
      navigate(`/editor/${id}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ── */}
      <div className="shrink-0 bg-card border-b border-border px-6 py-4 space-y-3">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[18px]">search</span>
            <input
              className="app-input pl-9"
              placeholder="Search notes, tags, categories..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Sort */}
          <select
            className="app-input w-auto text-[13px] cursor-pointer"
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
          >
            <option value="updated">Last Updated</option>
            <option value="created">Date Created</option>
            <option value="title">Title A–Z</option>
          </select>

          {/* View toggle */}
          <div className="flex items-center bg-surface rounded-lg border border-border p-0.5">
            <button
              onClick={() => setView('grid')}
              className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-white shadow-sm text-accent' : 'text-text-muted hover:text-text-secondary'}`}
            >
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-white shadow-sm text-accent' : 'text-text-muted hover:text-text-secondary'}`}
            >
              <span className="material-symbols-outlined text-[18px]">view_list</span>
            </button>
          </div>

          <button onClick={handleCreate} className="btn-primary shrink-0">
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Note
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all ${cat === c ? 'bg-accent text-white shadow-sm' : 'bg-surface text-text-secondary border border-border hover:border-accent/40'}`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-muted font-semibold uppercase tracking-wider">Filter:</span>
          {([['all','All'],['pinned','Pinned'],['shared','Shared Links'],['ai','AI Summarized']] as [FilterKey,string][]).map(([k,l]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`tag-pill transition-all ${filter === k ? '!bg-accent/10 !text-accent border border-accent/30' : 'hover:border-accent/30 border border-transparent'}`}
            >
              {l}
            </button>
          ))}
          <span className="ml-auto text-[12px] text-text-muted">{displayed.length} note{displayed.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ── Notes ── */}
      <div className="flex-1 overflow-y-auto p-6">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <span className="material-symbols-outlined text-[56px] text-text-muted mb-4">note_stack</span>
            <p className="text-[16px] font-semibold text-text-secondary">No notes found</p>
            <p className="text-[13px] text-text-muted mt-1 mb-6">
              {search ? `No results for "${search}"` : 'Create your first note to get started'}
            </p>
            {!search && (
              <button onClick={handleCreate} className="btn-primary">
                <span className="material-symbols-outlined text-[18px]">add</span>
                New Note
              </button>
            )}
            {search && (
              <button onClick={() => setSearch('')} className="btn-secondary">
                Clear search
              </button>
            )}
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-up">
            {displayed.map((note, idx) => <NoteCard key={note.note_id} note={note} idx={idx} onOpen={() => navigate(`/editor/${note.note_id}`)} onPin={onTogglePin} onDelete={onDeleteNote} onArchive={onArchiveNote} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />)}
          </div>
        ) : (
          <div className="space-y-2 animate-fade-up">
            {displayed.map((note, idx) => <NoteRow key={note.note_id} note={note} idx={idx} onOpen={() => navigate(`/editor/${note.note_id}`)} onPin={onTogglePin} onDelete={onDeleteNote} />)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Note Card ── */
function NoteCard({ note, idx, onOpen, onPin, onDelete, onArchive, menuOpen, setMenuOpen }: {
  note: Note; idx: number;
  onOpen: () => void;
  onPin?: (id: string) => void;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  menuOpen: string | null;
  setMenuOpen: (id: string | null) => void;
}) {
  const cat = CAT_COLORS[note.category] || CAT_COLORS['General'];
  const accent = ACCENT_COLORS[idx % ACCENT_COLORS.length];
  const isOpen = menuOpen === note.note_id;

  return (
    <div className="note-card group flex flex-col" onClick={onOpen}>
      <div className="note-card-accent" style={{ background: accent }} />
      <div className="pl-3 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${cat.dot}`} />
          <span className={`text-[11px] font-semibold ${cat.text} flex-1 truncate`}>{note.category}</span>
          {note.pinned    && <span className="material-symbols-outlined text-[14px] text-blue-400" style={{ fontVariationSettings:"'FILL' 1" }}>push_pin</span>}
          {note.isPublic  && <span className="material-symbols-outlined text-[14px] text-green-500" style={{ fontVariationSettings:"'FILL' 1" }}>link</span>}
          {/* Context menu */}
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-text-muted hover:text-text-primary transition-all"
              onClick={() => setMenuOpen(isOpen ? null : note.note_id)}
            >
              <span className="material-symbols-outlined text-[16px]">more_vert</span>
            </button>
            {isOpen && (
              <div className="absolute right-0 top-5 bg-white rounded-lg shadow-lg border border-border z-20 py-1 w-40">
                <button className="flex items-center gap-2 w-full px-3 py-2 text-[13px] hover:bg-surface text-text-primary" onClick={() => { onPin?.(note.note_id); setMenuOpen(null); }}>
                  <span className="material-symbols-outlined text-[16px]">push_pin</span>
                  {note.pinned ? 'Unpin' : 'Pin'}
                </button>
                {onArchive && (
                  <button className="flex items-center gap-2 w-full px-3 py-2 text-[13px] hover:bg-surface text-text-primary" onClick={() => { onArchive?.(note.note_id); setMenuOpen(null); }}>
                    <span className="material-symbols-outlined text-[16px]">{note.archived ? 'restore_from_trash' : 'archive'}</span>
                    {note.archived ? 'Restore' : 'Archive'}
                  </button>
                )}
                <div className="border-t border-border my-1" />
                {onDelete && (
                  <button className="flex items-center gap-2 w-full px-3 py-2 text-[13px] hover:bg-danger-light text-danger" onClick={() => { onDelete?.(note.note_id); setMenuOpen(null); }}>
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    {note.archived ? 'Delete Forever' : 'Delete'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <h4 className="font-semibold text-[14px] text-text-primary mb-1 line-clamp-2 group-hover:text-accent transition-colors">
          {note.title || 'Untitled'}
        </h4>

        <p className="text-[12px] text-text-secondary line-clamp-3 mb-3 flex-1">
          {note.content.replace(/<[^>]+>/g,' ').slice(0, 120) || 'Empty note…'}
        </p>

        {/* Tags */}
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {note.tags.slice(0,3).map(t => <span key={t} className="tag-pill">{t}</span>)}
            {note.tags.length > 3 && <span className="tag-pill text-text-muted">+{note.tags.length - 3}</span>}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border pt-2 mt-auto">
          <span className="text-[11px] text-text-muted">{timeSince(note.updatedAt)}</span>
          {note.aiSummary ? (
            <span className="flex items-center gap-1 text-[11px] text-purple-500 font-semibold">
              <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings:"'FILL' 1" }}>auto_awesome</span> AI
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ── Note Row (list view) ── */
function NoteRow({ note, idx, onOpen, onPin, onDelete }: {
  note: Note; idx: number;
  onOpen: () => void;
  onPin?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const cat = CAT_COLORS[note.category] || CAT_COLORS['General'];
  const accent = ACCENT_COLORS[idx % ACCENT_COLORS.length];

  return (
    <div
      className="bg-card rounded-xl border border-border px-4 py-3 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-accent/30 transition-all group"
      onClick={onOpen}
    >
      <div className="w-1 h-10 rounded-full shrink-0" style={{ background: accent }} />
      <div className={`w-2 h-2 rounded-full shrink-0 ${cat.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[14px] text-text-primary truncate group-hover:text-accent transition-colors">{note.title || 'Untitled'}</p>
        <p className="text-[12px] text-text-muted truncate">{note.content.replace(/<[^>]+>/g,' ').slice(0,80) || 'Empty note'}</p>
      </div>
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        {note.tags.slice(0,2).map(t => <span key={t} className="tag-pill">{t}</span>)}
      </div>
      <span className="text-[11px] text-text-muted shrink-0 w-20 text-right">{timeSince(note.updatedAt)}</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e=>e.stopPropagation()}>
        <button onClick={() => onPin?.(note.note_id)} className="p-1 rounded hover:bg-surface text-text-muted hover:text-blue-500 transition-colors">
          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: note.pinned ? "'FILL' 1" : "'FILL' 0" }}>push_pin</span>
        </button>
        <button onClick={() => onDelete?.(note.note_id)} className="p-1 rounded hover:bg-danger-light text-text-muted hover:text-danger transition-colors">
          <span className="material-symbols-outlined text-[16px]">delete</span>
        </button>
      </div>
    </div>
  );
}
