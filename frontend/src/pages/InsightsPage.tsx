
import { useInsights } from '../store/useStore';
import type { Note } from '../types';
import { useNavigate } from 'react-router-dom';

interface Props { notes: Note[]; aiUsageCount: number; }

const CAT_COLORS: Record<string, string> = {
  'To-Do': '#3b82f6', 'Project Plan': '#8b5cf6',
  'Meeting Brief': '#f59e0b', 'Drawing Note': '#ec4899', 'General': '#6b7280',
};

export default function InsightsPage({ notes, aiUsageCount }: Props) {
  const { totalNotes, archivedNotes, mostUsedTags, weeklyActivity, recentlyEdited } = useInsights(notes, aiUsageCount);
  const navigate = useNavigate();
  const maxAct = Math.max(...weeklyActivity.map(d => d.count), 1);
  const notesWithAI = notes.filter(n => n.aiSummary).length;
  const shared = notes.filter(n => n.isPublic).length;

  // Category breakdown
  const catMap: Record<string, number> = {};
  notes.forEach(n => { catMap[n.category] = (catMap[n.category] || 0) + 1; });
  const catList = Object.entries(catMap).sort((a,b) => b[1]-a[1]);

  return (
    <div className="p-6 space-y-6 animate-fade-up max-w-5xl mx-auto">
      <div>
        <h1 className="text-[22px] font-bold text-text-primary font-display">Productivity Insights</h1>
        <p className="text-[13px] text-text-muted mt-1">Track your note-taking habits and AI usage over time.</p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Total Notes',    val: totalNotes,   icon:'description',  color:'#4caf50' },
          { label:'AI Summaries',   val: notesWithAI,  icon:'auto_awesome', color:'#8b5cf6' },
          { label:'Shared Notes',   val: shared,       icon:'public',       color:'#3b82f6' },
          { label:'Archived',       val: archivedNotes,icon:'archive',      color:'#f59e0b' },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.color + '18' }}>
                <span className="material-symbols-outlined text-[18px]" style={{ color: s.color, fontVariationSettings:"'FILL' 1" }}>{s.icon}</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-text-primary">{s.val}</p>
            <p className="text-[12px] text-text-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Weekly Activity ── */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold text-[14px] mb-5">Weekly Activity</h3>
        <div className="flex items-end gap-3 h-36">
          {weeklyActivity.map(({ day, count }) => {
            const pct = Math.max((count / maxAct) * 100, count > 0 ? 8 : 2);
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-[11px] text-text-muted font-medium">{count > 0 ? count : ''}</span>
                <div className="w-full rounded-t-lg transition-all" style={{ height: `${pct}%`, background: count > 0 ? '#4caf50' : '#e5e7eb' }} title={`${count} notes`} />
                <span className="text-[11px] text-text-muted">{day}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Categories ── */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-[14px] mb-4">Notes by Category</h3>
          {catList.length === 0 ? (
            <p className="text-[13px] text-text-muted">No notes yet.</p>
          ) : (
            <div className="space-y-3">
              {catList.map(([cat, count]) => {
                const pct = Math.round((count / (totalNotes || 1)) * 100);
                const color = CAT_COLORS[cat] || '#6b7280';
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-medium text-text-primary flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                        {cat}
                      </span>
                      <span className="text-[12px] text-text-muted">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Top Tags ── */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-[14px] mb-4">Top Tags</h3>
          {mostUsedTags.length === 0 ? (
            <p className="text-[13px] text-text-muted">No tags yet. Add tags to your notes.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {mostUsedTags.map(({ tag, count }, i) => {
                const size = i === 0 ? 'text-[15px] px-4 py-2' : i < 3 ? 'text-[13px] px-3 py-1.5' : 'text-[11px] px-2 py-1';
                return (
                  <span key={tag} className={`rounded-full font-semibold ${size} flex items-center gap-1.5`}
                    style={{ background: '#4caf50' + (i === 0 ? '22' : '12'), color: '#2e7d32' }}>
                    #{tag}
                    <span className="bg-accent/20 text-accent rounded-full text-[10px] px-1.5 py-0.5 font-bold">{count}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── AI Usage ── */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-purple-500 text-[22px]" style={{ fontVariationSettings:"'FILL' 1" }}>auto_awesome</span>
          </div>
          <div>
            <h3 className="font-semibold text-[14px]">AI Intelligence</h3>
            <p className="text-[12px] text-text-muted">{aiUsageCount} total AI operations performed</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Summaries generated', val: notesWithAI },
            { label: 'AI actions total',    val: aiUsageCount },
            { label: 'Notes without AI',    val: Math.max(0, totalNotes - notesWithAI) },
          ].map(s => (
            <div key={s.label} className="bg-white/60 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-purple-700">{s.val}</p>
              <p className="text-[11px] text-text-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent Notes ── */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[14px]">Recently Edited</h3>
          <button onClick={() => navigate('/notes')} className="text-[12px] text-accent font-semibold hover:underline">View All</button>
        </div>
        {recentlyEdited.length === 0 ? (
          <p className="text-[13px] text-text-muted">No recent notes.</p>
        ) : (
          <div className="space-y-2">
            {recentlyEdited.map(n => (
              <div key={n.note_id} onClick={() => navigate(`/editor/${n.note_id}`)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface cursor-pointer transition-colors group">
                <span className="material-symbols-outlined text-text-muted text-[20px]">description</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-text-primary group-hover:text-accent transition-colors truncate">{n.title || 'Untitled'}</p>
                  <p className="text-[11px] text-text-muted">{n.category} · {new Date(n.updatedAt).toLocaleDateString()}</p>
                </div>
                {n.aiSummary && <span className="text-[11px] text-purple-500 font-semibold shrink-0">AI ✦</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
