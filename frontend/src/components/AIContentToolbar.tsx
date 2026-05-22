import { useState, useEffect, useRef, useLayoutEffect } from 'react';

const ACTIONS = [
  { id: 'shorten',          icon: 'compress',             label: 'Shorten' },
  { id: 'expand',           icon: 'expand',               label: 'Expand' },
  { id: 'fix_grammar',      icon: 'spellcheck',           label: 'Fix Grammar' },
  { id: 'bullet_points',    icon: 'format_list_bulleted', label: 'Bullets' },
  { id: 'continue_writing', icon: 'edit',                 label: 'Continue' },
  { id: 'tone_formal',      icon: 'business_center',      label: 'Formal' },
  { id: 'tone_casual',      icon: 'sentiment_satisfied',  label: 'Casual' },
  { id: 'translate',        icon: 'translate',            label: 'Translate' },
];

interface AIContentToolbarProps {
  containerRef: React.RefObject<HTMLElement>;
  onReplaceText: (original: string, replacement: string) => void;
}

// Helper to calculate exact character coordinates in a textarea
const getTextareaSelectionCoords = (textarea: HTMLTextAreaElement, position: number) => {
  const doc = textarea.ownerDocument || document;
  const win = doc.defaultView || window;
  
  // Create mirror div to replicate all styling that affects text wrapping
  const div = doc.createElement('div');
  const style = win.getComputedStyle(textarea);
  
  const properties = [
    'direction',
    'boxSizing',
    'width',
    'height',
    'overflowX',
    'overflowY',
    'borderWidth',
    'borderStyle',
    'borderColor',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'fontStyle',
    'fontVariant',
    'lineHeight',
    'textTransform',
    'wordSpacing',
    'letterSpacing',
    'whiteSpace',
    'wordBreak',
    'textAlign',
    'textIndent'
  ];
  
  properties.forEach(prop => {
    // @ts-ignore
    div.style[prop] = style[prop];
  });
  
  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordBreak = 'break-word';
  
  doc.body.appendChild(div);
  
  const value = textarea.value;
  div.textContent = value.substring(0, position);
  
  const span = doc.createElement('span');
  span.textContent = value.substring(position, position + 1) || '.';
  div.appendChild(span);
  
  const textareaRect = textarea.getBoundingClientRect();
  
  // Position mirror div exactly at same coordinates as textarea on page
  div.style.top = `${textareaRect.top + win.scrollY}px`;
  div.style.left = `${textareaRect.left + win.scrollX}px`;
  div.style.width = `${textareaRect.width}px`;
  div.style.height = `${textareaRect.height}px`;
  
  const spanRect = span.getBoundingClientRect();
  
  // Adjust for scroll offset of textarea
  const left = spanRect.left - textarea.scrollLeft;
  const top = spanRect.top - textarea.scrollTop;
  const height = spanRect.height;
  
  doc.body.removeChild(div);
  
  return { left, top, height };
};

export default function AIContentToolbar({ containerRef, onReplaceText }: AIContentToolbarProps) {
  const [visible, setVisible]           = useState(false);
  const [rawLeft, setRawLeft]           = useState(0);
  const [rawTop, setRawTop]             = useState(0);
  const [adjustedLeft, setAdjustedLeft] = useState(0);
  const [caretLeft, setCaretLeft]       = useState('50%');
  const [selectionHeight, setSelectionHeight] = useState(20);
  const [selectedText, setSelectedText] = useState('');
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [result, setResult]             = useState('');
  const [loading, setLoading]           = useState(false);
  const [showResult, setShowResult]     = useState(false);

  const toolbarRef       = useRef<HTMLDivElement>(null);
  const skipNextMouseUp  = useRef(false);

  // ── Clamp toolbar horizontally & position caret arrow dynamically ───────────
  useLayoutEffect(() => {
    if (!visible || !toolbarRef.current || !containerRef.current) return;

    const tRect = toolbarRef.current.getBoundingClientRect();
    const cRect = containerRef.current.getBoundingClientRect();
    const halfW = tRect.width / 2;
    const PAD   = 16;

    const leftBound  = cRect.left  + PAD;
    const rightBound = cRect.right - PAD;

    let clamped = rawLeft;
    if (clamped - halfW < leftBound)  clamped = leftBound  + halfW;
    if (clamped + halfW > rightBound) clamped = rightBound - halfW;

    setAdjustedLeft(clamped);

    // Slide caret horizontally to point exactly to rawLeft selection end point
    let caretPos = rawLeft - clamped + halfW;
    const minCaret = 16;
    const maxCaret = tRect.width - 16;
    if (caretPos < minCaret) caretPos = minCaret;
    if (caretPos > maxCaret) caretPos = maxCaret;
    setCaretLeft(`${caretPos}px`);
  }, [visible, showResult, rawLeft, containerRef]);

  // ── Detect selection and position at selection-end ─────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onMouseUp = (e: MouseEvent) => {
      if (skipNextMouseUp.current) {
        skipNextMouseUp.current = false;
        return;
      }
      if (toolbarRef.current?.contains(e.target as Node)) return;

      const target = e.target as HTMLElement;

      // ── Textarea selection ──
      if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
        const start = target.selectionStart ?? 0;
        const end   = target.selectionEnd   ?? 0;
        const text  = target.value.slice(start, end).trim();

        if (text.length < 2) { setVisible(false); return; }

        const coords = getTextareaSelectionCoords(target as HTMLTextAreaElement, end);
        setRawLeft(coords.left);
        setAdjustedLeft(coords.left);
        setRawTop(coords.top);
        setSelectionHeight(coords.height || 20);
        setSelectedText(text);
        setShowResult(false);
        setResult('');
        setActiveAction(null);
        setVisible(true);
        return;
      }

      // ── DOM Range / Contenteditable selection ──
      const sel  = window.getSelection();
      const text = sel?.toString().trim() ?? '';
      if (text.length < 2 || !sel?.rangeCount) { setVisible(false); return; }

      const range = sel.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) return;

      // Collapse copy to end of range to get coordinates of the exact ending point
      const tempRange = range.cloneRange();
      tempRange.collapse(false);
      const r = tempRange.getBoundingClientRect();

      setRawLeft(r.left);
      setAdjustedLeft(r.left);
      setRawTop(r.top);
      setSelectionHeight(r.height || 20);
      setSelectedText(text);
      setShowResult(false);
      setResult('');
      setActiveAction(null);
      setVisible(true);
    };

    container.addEventListener('mouseup', onMouseUp);
    return () => container.removeEventListener('mouseup', onMouseUp);
  }, [containerRef]);

  // ── Dismiss on mousedown outside ──────────────────────────────────────────
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (toolbarRef.current?.contains(e.target as Node)) return;
      if (visible) skipNextMouseUp.current = true;
      setVisible(false);
      setShowResult(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [visible]);

  // ── Dismiss on container scroll (Notion-style clean dismiss) ────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !visible) return;

    const handleScroll = () => {
      setVisible(false);
      setShowResult(false);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef, visible]);

  // ── AI call ───────────────────────────────────────────────────────────────
  const runAction = async (actionId: string) => {
    if (!selectedText || loading) return;
    setActiveAction(actionId);
    setLoading(true);
    setShowResult(false);
    setResult('');
    try {
      const res = await fetch('http://localhost:3000/api/content-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selectedText, action: actionId }),
      });
      const data = await res.json();
      setResult(data.result ?? 'No result returned.');
      setShowResult(true);
    } catch {
      setResult('Could not connect to AI backend.');
      setShowResult(true);
    } finally {
      setLoading(false);
    }
  };

  const applyResult = () => {
    onReplaceText(selectedText, result);
    setVisible(false);
    setShowResult(false);
  };

  if (!visible) return null;

  // Auto-flip: position toolbar below text if there's no room above
  const requiredHeight = showResult ? 240 : 80;
  const showBelow = containerRef.current
    ? (rawTop - requiredHeight < containerRef.current.getBoundingClientRect().top)
    : false;

  return (
    <div
      ref={toolbarRef}
      id="ai-content-toolbar"
      onMouseDown={e => e.preventDefault()} // Keeps textarea selection alive on clicks
      className="ai-toolbar-fade"
      style={{
        position:   'fixed',
        top:        showBelow ? `${rawTop + selectionHeight + 8}px` : `${rawTop - 8}px`,
        left:       `${adjustedLeft}px`,
        zIndex:     9999,
        transition: 'left 0.08s ease',
        '--y-trans': showBelow ? '0%' : '-100%',
      } as React.CSSProperties}
    >
      {/* ── Action bar: Sleek single-row of icons ── */}
      {!showResult && (
        <div
          className="flex items-center gap-0.5 p-1 rounded-full shadow-2xl"
          style={{
            background: 'rgba(22, 24, 31, 0.9)',
            backdropFilter: 'blur(12px)',
            border:     '1px solid rgba(255,255,255,0.08)',
            boxShadow:  '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          {/* Spark AI branding */}
          <div className="flex items-center justify-center pl-2.5 pr-1.5 text-purple-400">
            <span className="material-symbols-outlined text-[16px] animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
          </div>

          <div className="w-[1px] h-4 bg-white/10 mx-0.5 self-center" />

          {/* Action Row */}
          <div className="flex items-center gap-0.5">
            {ACTIONS.map(action => {
              const isActive = activeAction === action.id;
              return (
                <button
                  key={action.id}
                  onClick={() => runAction(action.id)}
                  disabled={loading}
                  title={action.label}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-40 active:scale-95 text-white/60 hover:text-white"
                  style={{
                    background: isActive ? 'rgba(124,58,237,0.22)' : 'transparent',
                    color:      isActive ? '#c4b5fd' : undefined,
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                      e.currentTarget.style.boxShadow = '0 0 8px rgba(167,139,250,0.2)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  {loading && isActive ? (
                    <span className="shrink-0 rounded-full border-2 animate-spin" style={{ width: 12, height: 12, borderColor: 'rgba(167,139,250,0.25)', borderTopColor: '#a78bfa' }} />
                  ) : (
                    <span className="material-symbols-outlined text-[16px] shrink-0">{action.icon}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Result panel ── */}
      {showResult && (
        <div
          className="rounded-2xl shadow-2xl overflow-hidden"
          style={{
            width:     320,
            background: 'rgba(22, 24, 31, 0.95)',
            backdropFilter: 'blur(16px)',
            border:    '1px solid rgba(124,58,237,0.25)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          }}
        >
          <div
            className="flex items-center gap-2 px-3 py-2.5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(124,58,237,0.07)' }}
          >
            <span
              className="material-symbols-outlined text-[14px]"
              style={{ color: '#a78bfa', fontVariationSettings: "'FILL' 1" }}
            >
              auto_awesome
            </span>
            <span
              className="text-[11px] font-bold uppercase tracking-wider flex-1 text-purple-300"
            >
              {ACTIONS.find(a => a.id === activeAction)?.label}
            </span>
            <button
              onClick={() => { setShowResult(false); setActiveAction(null); }}
              title="Back"
              className="text-white/40 hover:text-white/80 transition-colors mr-1"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            </button>
            <button
              onClick={() => { setVisible(false); setShowResult(false); }}
              title="Close"
              className="text-white/40 hover:text-white/80 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

          <div className="px-4 py-3 max-h-48 overflow-y-auto">
            <p className="text-[13px] leading-relaxed text-white/85">
              {result}
            </p>
          </div>

          <div className="px-3 pb-3 flex gap-2">
            <button
              onClick={applyResult}
              id="ai-toolbar-apply"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold text-white hover:opacity-95 active:scale-[0.98] transition-all"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
            >
              <span className="material-symbols-outlined text-[14px]">check</span>
              Replace Selection
            </button>
            <button
              onClick={() => runAction(activeAction!)}
              title="Regenerate"
              className="px-3 py-2 rounded-xl transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Dynamic Caret Arrow pointing at selection end ── */}
      <div
        style={{
          width: 0, height: 0,
          borderLeft:  '5px solid transparent',
          borderRight: '5px solid transparent',
          position:    'absolute',
          left:        caretLeft,
          transform:   'translateX(-50%)',
          ...(showBelow ? {
            top: '-5px',
            borderBottom: '5px solid rgba(22, 24, 31, 0.9)',
          } : {
            bottom: '-5px',
            borderTop: showResult ? '5px solid rgba(22, 24, 31, 0.95)' : '5px solid rgba(22, 24, 31, 0.9)',
          }),
        }}
      />
    </div>
  );
}
