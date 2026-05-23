import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotesContext } from '../context/NotesContext';
import AIContentToolbar from '../components/AIContentToolbar';
import MeetingRecorder from '../components/MeetingRecorder';

const CATEGORIES = ['General', 'To-Do', 'Project Plan', 'Meeting Brief', 'Work', 'Drawing Note'];

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notesStore = useNotesContext(); // ← shared store, same instance as Dashboard


  const note = notesStore.notes.find(n => n.note_id === id);

  const [title,    setTitle]    = useState('');
  const [content,  setContent]  = useState('');
  const [tags,     setTags]     = useState<string[]>([]);
  const [category, setCategory] = useState('General');
  const [tagInput, setTagInput] = useState('');
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [isTagging, setIsTagging] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const writingAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setTags(note.tags);
      setCategory(note.category);
    }
  }, [note?.note_id]);

  // Auto-save
  const triggerSave = (newTitle: string, newContent: string, newTags: string[], newCat: string) => {
    clearTimeout(saveTimer.current);
    setSaved(false);
    setSaving(true);
    saveTimer.current = setTimeout(() => {
      notesStore.updateNote(id!, { title: newTitle, content: newContent, tags: newTags, category: newCat });
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 700);
  };

  const handleTitle   = (v: string) => { setTitle(v);    triggerSave(v, content, tags, category); };
  const handleContent = (v: string) => { setContent(v);  triggerSave(title, v, tags, category); };
  const handleCat     = (v: string) => { setCategory(v); triggerSave(title, content, tags, v); };
  const handleAddTag  = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const t = tagInput.trim().replace(/,$/, '');
      if (t && !tags.includes(t)) {
        const newTags = [...tags, t];
        setTags(newTags);
        triggerSave(title, content, newTags, category);
      }
      setTagInput('');
    }
  };
  const removeTag = (t: string) => {
    const newTags = tags.filter(x => x !== t);
    setTags(newTags);
    triggerSave(title, content, newTags, category);
  };

  const handleAI = async () => {
    if (!id) return;
    setAiLoading(true);
    await notesStore.generateAISummary(id);
    setAiLoading(false);
  };

  // AI Content Actions — replace selected text in the textarea
  const handleReplaceText = (original: string, replacement: string) => {
    const newContent = content.replace(original, replacement);
    setContent(newContent);
    triggerSave(title, newContent, tags, category);
  };

  const handleAutoTag = async () => {
    if (!title && !content) return;
    setIsTagging(true);
    setSuggestedTags([]);
    const generated = await notesStore.suggestAITags(title, content);
    // Filter out tags that are already added
    const newSuggestions = generated.filter(t => !tags.includes(t));
    setSuggestedTags(newSuggestions);
    setIsTagging(false);
  };

  const applySuggestedTag = (t: string) => {
    if (!tags.includes(t)) {
      const newTags = [...tags, t];
      setTags(newTags);
      triggerSave(title, content, newTags, category);
    }
    setSuggestedTags(prev => prev.filter(x => x !== t));
  };


  const handleShare = () => {
    if (!id) return;
    if (!note?.isPublic) {
      notesStore.generateShareLink(id);
    }
    setShareOpen(true);
  };

  if (!note) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        <p>Note not found.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Editor Area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="shrink-0 bg-card border-b border-border px-6 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/notes')} className="flex items-center gap-1.5 text-text-secondary hover:text-accent transition-colors text-[13px] font-medium">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back
          </button>
          <div className="h-4 w-px bg-border" />
          {/* Save status */}
          <div className="flex items-center gap-1.5 text-[12px]">
            {saving && <><span className="animate-spin material-symbols-outlined text-[14px] text-text-muted">progress_activity</span><span className="text-text-muted">Saving…</span></>}
            {saved  && <><span className="material-symbols-outlined text-[14px] text-accent" style={{ fontVariationSettings:"'FILL' 1" }}>check_circle</span><span className="text-accent font-medium">Saved</span></>}
            {!saving && !saved && <span className="text-text-muted">All changes saved</span>}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Pin */}
            <button
              onClick={() => notesStore.togglePin(id!)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors ${note.pinned ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-surface text-text-secondary border-border hover:border-blue-300'}`}
            >
              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: note.pinned ? "'FILL' 1" : "'FILL' 0" }}>push_pin</span>
              {note.pinned ? 'Pinned' : 'Pin'}
            </button>

            {/* Share */}
            <button onClick={handleShare} className="btn-secondary text-[13px] py-1.5">
              <span className="material-symbols-outlined text-[16px]">share</span>
              Share
            </button>

            {/* Meeting Recorder */}
            <MeetingRecorder />

            {/* Toggle Note Insights Panel */}
            <button
              onClick={() => setAiExpanded(!aiExpanded)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] font-semibold transition-colors ${aiExpanded ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-surface text-text-secondary border-border hover:border-purple-300 hover:text-purple-600'}`}
            >
              <span className="material-symbols-outlined text-[16px]">insights</span>
              {aiExpanded ? 'Close Insights' : 'Note Insights'}
            </button>
          </div>
        </div>

        {/* Metadata row */}
        <div className="shrink-0 bg-card border-b border-border px-6 py-2 flex items-center gap-3 flex-wrap">
          {/* Category */}
          <select
            value={category}
            onChange={e => handleCat(e.target.value)}
            className="text-[12px] font-semibold border border-border rounded-lg px-2 py-1 bg-surface text-text-primary outline-none focus:border-accent cursor-pointer"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Tags */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1 flex-wrap">
              {tags.map(t => (
                <span key={t} className="tag-pill flex items-center gap-1">
                  {t}
                  <button onClick={() => removeTag(t)} className="ml-0.5 text-text-muted hover:text-danger transition-colors">
                    <span className="material-symbols-outlined text-[12px]">close</span>
                  </button>
                </span>
              ))}
              <input
                className="text-[12px] border border-dashed border-border rounded-full px-2 py-0.5 w-28 outline-none focus:border-accent bg-transparent"
                placeholder="Add tag…"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
              />
              <button
                onClick={handleAutoTag}
                disabled={isTagging || (!title && !content)}
                className={`ml-1 px-2 py-0.5 text-[11px] font-semibold rounded-full border transition-all flex items-center gap-1 ${
                  isTagging ? 'bg-purple-50 text-purple-400 border-purple-200' : 'bg-surface text-purple-600 border-purple-200 hover:bg-purple-50'
                }`}
              >
                <span className={`material-symbols-outlined text-[13px] ${isTagging ? 'animate-spin' : ''}`}>
                  {isTagging ? 'progress_activity' : 'auto_awesome'}
                </span>
                {isTagging ? 'Tagging…' : 'Auto-Tag'}
              </button>
            </div>
            {/* Suggested Tags Row */}
            {suggestedTags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap animate-fade-in pl-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400 mr-1">Suggestions:</span>
                {suggestedTags.map(t => (
                  <button
                    key={t}
                    onClick={() => applySuggestedTag(t)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border border-dashed border-purple-300 text-purple-600 hover:bg-purple-50 hover:border-purple-400 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[12px]">add</span>
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Writing area */}
        <div className="flex-1 overflow-y-auto bg-surface" ref={writingAreaRef as React.RefObject<HTMLDivElement>}>
          <div className="max-w-4xl ml-8 lg:ml-16 px-4 py-8">
            <input
              className="w-full text-3xl font-bold text-text-primary bg-transparent border-none outline-none placeholder:text-text-muted mb-4 font-display"
              placeholder="Note title…"
              value={title}
              onChange={e => handleTitle(e.target.value)}
            />
            <textarea
              className="w-full min-h-[70vh] text-[15px] text-text-secondary leading-7 bg-transparent border-none outline-none resize-none placeholder:text-text-muted pb-12"
              placeholder="Start writing your thoughts here…"
              value={content}
              onChange={e => handleContent(e.target.value)}
            />
          </div>
        </div>

        {/* AI Content Toolbar — appears on text selection */}
        <AIContentToolbar
          containerRef={writingAreaRef as React.RefObject<HTMLElement>}
          onReplaceText={handleReplaceText}
        />
      </div>

      {/* ── Note Insights Panel ── */}
      {aiExpanded && (
        <aside className="w-96 shrink-0 bg-card border-l border-border flex flex-col overflow-hidden animate-fade-in">
          <div className="px-4 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-500 text-[20px]" style={{ fontVariationSettings:"'FILL' 1" }}>insights</span>
              <div>
                <h3 className="font-semibold text-[14px]">Note Insights</h3>
                <p className="text-[10px] text-text-muted">Summary, actions &amp; suggestions</p>
              </div>
            </div>
            <button onClick={() => setAiExpanded(false)} className="text-text-muted hover:text-text-primary transition-colors">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

        <div className="flex-1 overflow-y-auto p-4 pb-28 space-y-4">
          {/* AI Quick Actions */}
          <div className="space-y-2">
            <button
              onClick={handleAI}
              disabled={aiLoading}
              className="w-full flex flex-col items-start gap-1 p-3.5 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-sm hover:shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              <div className="flex items-center justify-between w-full">
                <span className="flex items-center gap-2 font-semibold text-[14px]">
                  <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                  Analyze Note
                </span>
                <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </div>
              <p className="text-[11px] text-purple-100 font-medium tracking-wide">Generates summary, action items & title</p>
            </button>
          </div>

          {/* AI Output */}
          {aiLoading && (
            <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-xl border border-purple-100">
              <span className="animate-spin material-symbols-outlined text-purple-500 text-[18px]">progress_activity</span>
              <span className="text-[12px] text-purple-600">Analysing your note…</span>
            </div>
          )}

          {note.aiSummary && !aiLoading && (
            <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-100 space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-500 text-[16px]" style={{ fontVariationSettings:"'FILL' 1" }}>auto_awesome</span>
                <span className="text-[12px] font-bold text-purple-700 uppercase tracking-wider">AI Summary</span>
              </div>
              <p className="text-[13px] text-text-secondary leading-relaxed italic">
                "{note.aiSummary.summary}"
              </p>

              {note.aiSummary.action_items.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">Action Items</p>
                  <ul className="space-y-1.5">
                    {note.aiSummary.action_items.map((a,i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] text-text-secondary">
                        <span className="text-accent mt-0.5 shrink-0">✓</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {note.aiSummary.suggested_title && (
                <div className="pt-2 border-t border-purple-100">
                  <p className="text-[11px] text-purple-500 font-semibold mb-1">Suggested Title</p>
                  <p className="text-[12px] text-text-primary font-medium">{note.aiSummary.suggested_title}</p>
                </div>
              )}
            </div>
          )}

          {!note.aiSummary && !aiLoading && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="material-symbols-outlined text-[36px] text-text-muted mb-2">auto_awesome</span>
              <p className="text-[12px] text-text-muted">Generate an AI summary to extract insights from your note</p>
            </div>
          )}
        </div>
      </aside>
      )}

      {/* ── Share Modal ── */}
      {shareOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[18px]">Share Note</h3>
              <button onClick={() => setShareOpen(false)} className="text-text-muted hover:text-text-primary transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="text-[13px] text-text-secondary mb-4">Anyone with this link can view your note in read-only mode.</p>
            <div className="flex items-center gap-2 bg-surface rounded-xl border border-border p-3 mb-4">
              <span className="material-symbols-outlined text-text-muted text-[18px]">link</span>
              <input
                readOnly
                className="flex-1 bg-transparent outline-none text-[13px] text-text-primary"
                value={note?.shareId ? `${window.location.origin}/shared/${note.shareId}` : 'Generating link…'}
              />
              <button
                onClick={() => navigator.clipboard.writeText(note?.shareId ? `${window.location.origin}/shared/${note.shareId}` : '')}
                className="btn-primary py-1.5 px-3 text-[12px]"
              >
                Copy
              </button>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-border">
              <span className="text-[13px] font-medium text-text-primary">Link Sharing On</span>
              <div className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${note.isPublic ? 'bg-accent' : 'bg-border'}`} onClick={() => note.isPublic && notesStore.updateNote(id!, { isPublic: false, shareId: undefined })}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${note.isPublic ? 'right-0.5' : 'left-0.5'}`} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
