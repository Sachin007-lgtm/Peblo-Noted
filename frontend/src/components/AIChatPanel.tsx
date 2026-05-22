import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useNotesContext } from '../context/NotesContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  /** Raw full text including <suggestions> block */
  fullContent?: string;
  /** Parsed suggestions stripped from content */
  suggestions?: string[];
  isTyping?: boolean;
  id: string;
}

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_PROMPTS = [
  { icon: 'summarize',   label: 'Summarize this note',    text: 'Can you summarize the current note for me?' },
  { icon: 'task_alt',    label: 'Extract action items',   text: 'Extract all action items and tasks from this note as a numbered list.' },
  { icon: 'edit_note',   label: 'Improve my writing',     text: 'How can I improve the writing quality of this note? Give me specific suggestions.' },
  { icon: 'label',       label: 'Suggest tags',           text: 'What tags would you suggest for organizing this note?' },
  { icon: 'psychology',  label: 'Brainstorm ideas',       text: 'Based on this note, brainstorm 5 related ideas I could explore next.' },
];

const TYPING_SPEED = 8; // ms per tick

// ── Parse <suggestions> block out of AI response ─────────────────────────────
// Robust parser: tries multiple patterns, always strips tag remnants from mainText
function parseSuggestions(raw: string): { mainText: string; suggestions: string[] } {
  let suggestions: string[] = [];
  let mainText = raw;

  // Pattern 1: <suggestions>...</suggestions> (any casing, with or without newlines)
  const tagMatch = raw.match(/<suggestions?>([\s\S]*?)<\/suggestions?>/i);
  if (tagMatch) {
    mainText = raw.replace(/<suggestions?>[\s\S]*?<\/suggestions?>/gi, '');
    suggestions = tagMatch[1]
      .split('\n')
      .map(l => l.replace(/^[-•*\d.]+\s*/, '').trim())
      .filter(l => l.length > 3 && l.length < 120);
  }

  // Pattern 2: Fallback — last 3 lines that are short questions (if no tag found)
  if (suggestions.length === 0) {
    const lines = mainText.split('\n').map(l => l.trim()).filter(Boolean);
    const last3 = lines.slice(-3);
    const looksLikeSuggestions = last3.filter(
      l => l.endsWith('?') && l.length < 80 && !l.startsWith('#')
    );
    if (looksLikeSuggestions.length >= 2) {
      suggestions = looksLikeSuggestions;
      mainText = lines.slice(0, lines.length - looksLikeSuggestions.length).join('\n');
    }
  }

  // Final cleanup: strip any remaining raw <suggestions> tag text that leaked through
  mainText = mainText
    .replace(/<\/?suggestions?>/gi, '')
    .replace(/\s*<suggestions?\s*>/gi, '')
    .trim();

  return { mainText, suggestions };
}

export default function AIChatPanel({ isOpen, onClose }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const typingTimer    = useRef<ReturnType<typeof setInterval> | null>(null);
  const location       = useLocation();
  const notesStore     = useNotesContext();

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { scrollToBottom(); }, [messages]);
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 320);
  }, [isOpen]);

  // Derive active note from URL
  const noteContext = (() => {
    const match = location.pathname.match(/\/editor\/(.+)/);
    if (!match) return undefined;
    const note = notesStore.notes.find(n => n.note_id === match[1]);
    if (!note) return undefined;
    return { title: note.title, content: note.content };
  })();

  // ── Typewriter — animates mainText only, then reveals suggestions ────────────
  const animateTyping = useCallback((msgId: string, mainText: string, suggestions: string[]) => {
    let idx = 0;
    if (typingTimer.current) clearInterval(typingTimer.current);

    typingTimer.current = setInterval(() => {
      idx += 4;
      const displayed = mainText.slice(0, idx);
      const done = idx >= mainText.length;

      setMessages(prev =>
        prev.map(m =>
          m.id === msgId
            ? {
                ...m,
                content: displayed,
                isTyping: !done,
                // Only reveal suggestions once typing is done
                suggestions: done ? suggestions : [],
              }
            : m
        )
      );

      if (done) {
        clearInterval(typingTimer.current!);
        typingTimer.current = null;
        scrollToBottom();
      }
    }, TYPING_SPEED);
  }, []);

  // ── Send ────────────────────────────────────────────────────────────────────
  const sendMessage = async (text?: string) => {
    const userText = (text ?? input).trim();
    if (!userText || loading) return;

    const userMsg: Message = { role: 'user', content: userText, id: crypto.randomUUID() };
    const assistantId = crypto.randomUUID();
    const placeholder: Message = {
      role: 'assistant', content: '', fullContent: '', isTyping: true,
      suggestions: [], id: assistantId,
    };

    setMessages(prev => [...prev, userMsg, placeholder]);
    setInput('');
    setLoading(true);
    if (inputRef.current) inputRef.current.style.height = 'auto';

    try {
      // History without placeholder; pass clean text to backend (no suggestions markup)
      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.mainText ?? m.fullContent ?? m.content,
      }));

      const res = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, noteContext }),
      });
      const data = await res.json();
      const raw: string = data.reply ?? 'Sorry, I encountered an error. Please try again.';
      const { mainText, suggestions } = parseSuggestions(raw);

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, fullContent: raw, mainText, content: '', suggestions: [] }
            : m
        )
      );
      animateTyping(assistantId, mainText, suggestions);
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: 'Connection error. Make sure the backend is running.', isTyping: false }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = () => {
    if (typingTimer.current) clearInterval(typingTimer.current);
    setMessages([]);
  };

  if (!isOpen) return null;
  const isAnyTyping = messages.some(m => m.isTyping);

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={onClose} />

      <div
        id="ai-chat-panel"
        className="fixed top-0 right-0 h-full z-50 flex flex-col ai-chat-panel-enter"
        style={{
          width: '400px',
          background: '#0d0f14',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.4)',
        }}
      >
        {/* ── Header ── */}
        <div
          className="shrink-0 px-5 py-4 flex items-center gap-3"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            background: 'linear-gradient(180deg, #13151d 0%, #0d0f14 100%)',
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
          >
            <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-[15px] leading-tight tracking-tight">Peblo AI</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 4px #34d399' }} />
              <p className="text-white/40 text-[11px]">
                {noteContext ? `Reading: ${noteContext.title || 'Untitled Note'}` : 'Ready to help'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                title="Clear conversation"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white/25 hover:text-white/70 hover:bg-white/8 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/25 hover:text-white/70 hover:bg-white/8 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">

          {/* Empty / welcome */}
          {messages.length === 0 && (
            <div className="flex flex-col gap-4 animate-fade-up">
              <div className="text-center py-2">
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(79,70,229,0.15))',
                    border: '1px solid rgba(124,58,237,0.25)',
                  }}
                >
                  <span className="material-symbols-outlined text-[32px]" style={{ color: '#a78bfa', fontVariationSettings: "'FILL' 1" }}>
                    auto_awesome
                  </span>
                </div>
                <p className="text-white font-bold text-[17px] mb-1">What can I help with?</p>
                <p className="text-white/35 text-[12px] leading-relaxed max-w-[260px] mx-auto">
                  {noteContext
                    ? 'I have context from your open note. Ask me anything about it.'
                    : 'Ask me to summarize, organize, or improve your notes.'}
                </p>
              </div>
              <div className="space-y-1.5">
                {QUICK_PROMPTS.map((p, i) => (
                  <button
                    key={p.label}
                    onClick={() => sendMessage(p.text)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all group"
                    style={{
                      background: 'rgba(255,255,255,0.035)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      animationDelay: `${i * 60}ms`,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(124,58,237,0.1)';
                      e.currentTarget.style.borderColor = 'rgba(124,58,237,0.25)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.035)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                    }}
                  >
                    <span className="material-symbols-outlined text-[18px] shrink-0" style={{ color: '#7c6aef' }}>
                      {p.icon}
                    </span>
                    <span className="text-white/55 text-[13px] font-medium group-hover:text-white/90 transition-colors flex-1">
                      {p.label}
                    </span>
                    <span className="material-symbols-outlined text-[14px] text-white/15 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all">
                      arrow_forward
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 message-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* AI avatar */}
              {msg.role === 'assistant' && (
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                >
                  <span className="material-symbols-outlined text-white text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    auto_awesome
                  </span>
                </div>
              )}

              <div className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[88%]`}>

                {/* Bubble */}
                {msg.role === 'user' ? (
                  <div
                    className="px-4 py-2.5 rounded-2xl rounded-tr-md text-[13.5px] leading-relaxed"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', color: '#fff' }}
                  >
                    {msg.content}
                  </div>
                ) : (
                  <div
                    className="px-4 py-3.5 rounded-2xl rounded-tl-md w-full"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      color: 'rgba(255,255,255,0.82)',
                    }}
                  >
                    {msg.isTyping && !msg.content ? (
                      /* Waiting for first char */
                      <div className="flex items-center gap-1 py-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 typing-dot" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 typing-dot" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 typing-dot" style={{ animationDelay: '300ms' }} />
                      </div>
                    ) : (
                      <>
                        <RichMarkdown text={msg.content} />
                        {msg.isTyping && (
                          <span className="inline-block w-0.5 h-3.5 bg-violet-400 ml-0.5 align-middle typing-cursor" />
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* ── Suggestion chips ── */}
                {msg.role === 'assistant' && !msg.isTyping && msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="suggestions-fade-in w-full" style={{ marginTop: '2px' }}>
                    {/* Label */}
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      Follow-up
                    </p>
                    {/* Pills */}
                    <div className="flex flex-col gap-1.5">
                      {msg.suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(s)}
                          disabled={isAnyTyping || loading}
                          className="flex items-center gap-2.5 text-left transition-all disabled:opacity-30 group"
                          style={{
                            padding: '8px 14px 8px 12px',
                            borderRadius: '10px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            width: '100%',
                          }}
                          onMouseEnter={e => {
                            if (isAnyTyping || loading) return;
                            e.currentTarget.style.background = 'rgba(124,58,237,0.12)';
                            e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                          }}
                        >
                          {/* Turn icon */}
                          <span
                            className="material-symbols-outlined shrink-0"
                            style={{ fontSize: '14px', color: 'rgba(167,139,250,0.5)', transform: 'scaleX(-1)' }}
                          >
                            subdirectory_arrow_right
                          </span>
                          <span
                            className="text-[12.5px] font-medium leading-snug flex-1 group-hover:text-white transition-colors"
                            style={{ color: 'rgba(255,255,255,0.5)' }}
                          >
                            {s}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input ── */}
        <div className="shrink-0 px-4 pb-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div
            className="flex items-end gap-2 rounded-2xl px-4 py-3 transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
            onFocusCapture={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(124,58,237,0.5)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 3px rgba(124,58,237,0.08)';
            }}
            onBlurCapture={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.09)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
            }}
          >
            <textarea
              ref={inputRef}
              id="ai-chat-input"
              rows={1}
              placeholder="Message Peblo AI…"
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
              onKeyDown={handleKeyDown}
              disabled={loading || isAnyTyping}
              className="flex-1 bg-transparent outline-none resize-none text-[13.5px] leading-relaxed py-0.5"
              style={{ color: 'rgba(255,255,255,0.85)', maxHeight: '128px' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading || isAnyTyping}
              id="ai-chat-send"
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all"
              style={{
                background: input.trim() && !loading && !isAnyTyping
                  ? 'linear-gradient(135deg, #7c3aed, #4f46e5)'
                  : 'rgba(255,255,255,0.07)',
                opacity: !input.trim() || loading || isAnyTyping ? 0.45 : 1,
              }}
              onMouseEnter={e => {
                if (input.trim() && !loading)
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              }}
            >
              <span className="material-symbols-outlined text-white text-[16px]">send</span>
            </button>
          </div>
          <p className="text-white/20 text-[10px] text-center mt-2 tracking-wide">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  );
}

// ── Rich Markdown Renderer ───────────────────────────────────────────────────
function RichMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') { elements.push(<div key={i} className="h-1" />); i++; continue; }

    if (line.startsWith('# ')) {
      elements.push(<h2 key={i} className="text-[15px] font-bold text-white mt-2 mb-1">{renderInline(line.slice(2))}</h2>);
      i++; continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className="text-[13px] font-semibold text-white/90 mt-2 mb-0.5 uppercase tracking-wide">{renderInline(line.slice(3))}</h3>);
      i++; continue;
    }
    if (line.startsWith('### ')) {
      elements.push(<p key={i} className="text-[13px] font-semibold text-violet-300 mt-1">{renderInline(line.slice(4))}</p>);
      i++; continue;
    }
    if (line.trim() === '---') {
      elements.push(<hr key={i} className="border-white/10 my-2" />); i++; continue;
    }

    // Numbered list
    if (line.match(/^\d+\.\s+/)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        const m = lines[i].match(/^\d+\.\s+(.+)/);
        const num = items.length + 1;
        items.push(
          <li key={i} className="flex items-start gap-2.5">
            <span className="shrink-0 w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center mt-0.5" style={{ background: 'rgba(124,58,237,0.25)', color: '#a78bfa' }}>
              {num}
            </span>
            <span className="flex-1 leading-relaxed">{renderInline(m?.[1] ?? '')}</span>
          </li>
        );
        i++;
      }
      elements.push(<ol key={`ol-${i}`} className="space-y-1.5 my-1">{items}</ol>);
      continue;
    }

    // Bullet list
    if (line.match(/^[-•*]\s+/)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^[-•*]\s+/)) {
        const t = lines[i].replace(/^[-•*]\s+/, '');
        items.push(
          <li key={i} className="flex items-start gap-2.5">
            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 opacity-80" />
            <span className="flex-1 leading-relaxed">{renderInline(t)}</span>
          </li>
        );
        i++;
      }
      elements.push(<ul key={`ul-${i}`} className="space-y-1.5 my-1">{items}</ul>);
      continue;
    }

    elements.push(<p key={i} className="leading-relaxed">{renderInline(line)}</p>);
    i++;
  }

  return <div className="space-y-0.5 text-[13.5px]">{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2)
      return <em key={i} className="italic text-white/75">{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2)
      return <code key={i} className="px-1.5 py-0.5 rounded text-[12px] font-mono" style={{ background: 'rgba(255,255,255,0.1)', color: '#c4b5fd' }}>{part.slice(1, -1)}</code>;
    return part;
  });
}

// Augment Message type locally for mainText
declare module './AIChatPanel' {}
interface Message { mainText?: string; }
