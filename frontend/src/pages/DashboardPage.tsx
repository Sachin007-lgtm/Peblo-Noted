import React, { useState } from 'react';
import type { User, Note } from '../types';
import { useNavigate } from 'react-router-dom';

interface Props {
  user: User;
  notes: Note[];
  aiUsageCount: number;
  onCreateNote?: () => string;
}

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&q=80',
  'https://images.unsplash.com/photo-1517842645767-c639042777db?w=1200&q=80',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80',
  'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1200&q=80',
  'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200&q=80',
];

const QUICK_TIPS = [
  { icon: 'photo_camera', title: 'Scan with your camera', desc: 'Turn old notes into digital ones instantly.', color: '#e8f5e9', iconColor: '#4caf50' },
  { icon: 'edit_note',    title: 'Draw your notes',       desc: 'Everything is about to be happening.', color: '#f3e8ff', iconColor: '#8b5cf6' },
  { icon: 'folder_open',  title: 'Plan your projects',    desc: 'Easier to plan your projects visually.', color: '#fff8e1', iconColor: '#f59e0b' },
];

const CAT_COLORS: Record<string, { dot: string; text: string; bg: string }> = {
  'To-Do':         { dot: 'bg-blue-400',   text: 'text-blue-600',   bg: 'bg-blue-50'   },
  'Project Plan':  { dot: 'bg-purple-400', text: 'text-purple-600', bg: 'bg-purple-50' },
  'Meeting Brief': { dot: 'bg-amber-400',  text: 'text-amber-600',  bg: 'bg-amber-50'  },
  'Drawing Note':  { dot: 'bg-pink-400',   text: 'text-pink-600',   bg: 'bg-pink-50'   },
  'General':       { dot: 'bg-gray-400',   text: 'text-gray-600',   bg: 'bg-gray-50'   },
};

const ACCENT_COLORS = ['#4caf50','#3b82f6','#8b5cf6','#f59e0b','#ec4899','#06b6d4'];

function timeSince(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)} mins ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)} hrs ago`;
  return `${Math.floor(diff/86400)} days ago`;
}

export default function DashboardPage({ user, notes, aiUsageCount, onCreateNote }: Props) {
  const navigate = useNavigate();
  const [imgIndex, setImgIndex] = useState(() => Math.floor(Math.random() * HERO_IMAGES.length));
  
  const recentNotes = [...notes]
    .filter(n => !n.archived)
    .sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);
  const pinnedNotes = notes.filter(n => n.pinned && !n.archived).slice(0, 3);
  const quickNote   = notes.find(n => n.pinned && !n.archived);

  return (
    <div className="p-6 space-y-6 animate-fade-up">
      {/* ── Hero ── */}
      <div 
        className="relative rounded-2xl overflow-hidden min-h-[320px] flex items-end p-6 shadow-sm border border-border transition-all duration-500 ease-in-out"
        style={{ 
          backgroundImage: `url('${HERO_IMAGES[imgIndex]}')`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center 40%' 
        }}
      >
        {/* gradient overlay to ensure text is readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
        
        <div className="relative z-10">
          <h2 className="text-white text-3xl font-bold font-display leading-tight drop-shadow-md">
            Good {getTimeOfDay()}, {user.name.split(' ')[0]}.
          </h2>
          <p className="text-white/80 text-[13px] mt-1.5 uppercase tracking-widest font-medium drop-shadow">
            {new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })}
          </p>
        </div>

        {/* Nav arrows */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button 
            onClick={() => setImgIndex((prev) => (prev + 1) % HERO_IMAGES.length)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            title="Next Cover Image"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>
      </div>



      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Notes',   val: notes.filter(n=>!n.archived).length, icon: 'description',   color: '#4caf50' },
          { label: 'Pinned',        val: notes.filter(n=>n.pinned).length,     icon: 'push_pin',      color: '#3b82f6' },
          { label: 'AI Summaries',  val: notes.filter(n=>n.aiSummary).length,  icon: 'auto_awesome',  color: '#8b5cf6' },
          { label: 'Shared',        val: notes.filter(n=>n.isPublic).length,   icon: 'public',        color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.color + '18' }}>
              <span className="material-symbols-outlined text-[20px]" style={{ color: s.color, fontVariationSettings:"'FILL' 1" }}>{s.icon}</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary leading-none">{s.val}</p>
              <p className="text-[11px] text-text-muted mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Recent Notes Grid ── */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-[15px]">NOTES ✏️</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/notes')} className="text-[12px] text-accent font-semibold hover:underline">View All</button>
            <button className="text-text-muted hover:text-text-secondary">
              <span className="material-symbols-outlined text-[18px]">more_horiz</span>
            </button>
          </div>
        </div>

        {/* Tab row */}
        <div className="flex gap-4 border-b border-border mb-4 pb-0">
          {['Recently','Suggested','Documents','Images'].map((tab, i) => (
            <button key={tab} className={`pb-3 text-[13px] font-medium transition-colors border-b-2 -mb-px ${i === 0 ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-secondary'}`}>
              {tab}
            </button>
          ))}
        </div>

        {recentNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-[48px] text-text-muted mb-3">note_stack</span>
            <p className="text-[14px] font-medium text-text-secondary">No notes yet</p>
            <p className="text-[12px] text-text-muted mt-1">Create your first note to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentNotes.map((note, idx) => {
              const cat = CAT_COLORS[note.category] || CAT_COLORS['General'];
              const accent = ACCENT_COLORS[idx % ACCENT_COLORS.length];
              return (
                <div
                  key={note.note_id}
                  className="note-card group"
                  onClick={() => navigate(`/editor/${note.note_id}`)}
                >
                  <div className="note-card-accent" style={{ background: accent }} />
                  <div className="pl-3">
                    {/* Category */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${cat.dot}`} />
                      <span className={`text-[11px] font-semibold ${cat.text} truncate`}>{note.category}</span>
                      {note.isPublic && <span className="ml-auto material-symbols-outlined text-[14px] text-accent">public</span>}
                      {note.pinned && <span className="material-symbols-outlined text-[14px] text-blue-400">push_pin</span>}
                    </div>

                    <h4 className="font-semibold text-[14px] text-text-primary mb-1 line-clamp-1 group-hover:text-accent transition-colors">
                      {note.title}
                    </h4>

                    <p className="text-[12px] text-text-secondary line-clamp-2 mb-3" dangerouslySetInnerHTML={{__html: note.content.replace(/<[^>]+>/g,' ') || 'Empty note'}} />

                    {/* Tags */}
                    {note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {note.tags.slice(0,3).map(t => (
                          <span key={t} className="tag-pill">{t}</span>
                        ))}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between text-[11px] text-text-muted border-t border-border pt-2 mt-auto">
                      <span>{timeSince(note.updatedAt)}</span>
                      {note.aiSummary && (
                        <span className="flex items-center gap-1 text-purple-500 font-semibold">
                          <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings:"'FILL' 1" }}>auto_awesome</span>
                          AI
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}
