import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotesContext } from '../context/NotesContext';
import type { AISummary } from '../types';

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip the data URL prefix "data:<mime>;base64,"
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── Types ──────────────────────────────────────────────────────────────────────
type RecordingState = 'idle' | 'recording' | 'processing' | 'done' | 'error';

interface TranscribeResult {
  transcript: string;
  suggested_title: string;
  summary: string;
  action_items: string[];
}

// ── Waveform Bars (CSS animated) ───────────────────────────────────────────────
function WaveformBars({ active }: { active: boolean }) {
  const heights = [3, 6, 10, 14, 18, 14, 20, 12, 16, 8, 12, 18, 10, 6, 4];
  return (
    <div className="flex items-center justify-center gap-[3px] h-10 w-full">
      {heights.map((h, i) => (
        <div
          key={i}
          className="rounded-full transition-all"
          style={{
            width: 3,
            height: active ? `${h + Math.random() * 6}px` : '4px',
            background: active
              ? `hsl(${270 + i * 5}, 70%, 65%)`
              : 'rgba(255,255,255,0.2)',
            animation: active ? `waveBar ${0.6 + (i % 4) * 0.15}s ease-in-out infinite alternate` : 'none',
            animationDelay: `${i * 0.06}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function MeetingRecorder() {
  const notesStore = useNotesContext();
  const navigate = useNavigate();

  const [state, setState] = useState<RecordingState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<TranscribeResult | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const streamRef = useRef<MediaStream | null>(null);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── Start Recording ──
  const startRecording = useCallback(async () => {
    setErrorMsg('');
    setResult(null);
    setElapsed(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Pick the best supported mimeType
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg']
        .find(m => MediaRecorder.isTypeSupported(m)) || '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(); // collect data when stopped
      setState('recording');
      setOverlayOpen(true);

      // Start timer
      timerRef.current = setInterval(() => {
        setElapsed(prev => {
          if (prev >= 599) { // 10 min max
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err: any) {
      setErrorMsg(err?.message?.includes('Permission')
        ? 'Microphone access denied. Please allow microphone access in your browser settings.'
        : 'Could not access microphone. Please check your device.'
      );
      setState('error');
      setOverlayOpen(true);
    }
  }, []);

  // ── Stop Recording & Transcribe ──
  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current);

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    recorder.onstop = async () => {
      // Stop mic tracks now that recorder has finished capturing
      streamRef.current?.getTracks().forEach(t => t.stop());
      
      setState('processing');
      try {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });

        // Bail early if no audio captured
        if (blob.size < 500) {
          setState('error');
          setErrorMsg('Recording was too short. Please record at least a few seconds.');
          return;
        }

        const base64 = await blobToBase64(blob);
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

        const res = await fetch(`${backendUrl}/api/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: base64, mimeType: mimeType.split(';')[0] }),
        });

        if (!res.ok) throw new Error(`Transcription failed: ${res.status}`);
        const data: TranscribeResult = await res.json();
        setResult(data);
        setState('done');

      } catch (err: any) {
        setState('error');
        setErrorMsg(err?.message || 'Transcription failed. Please try again.');
      }
    };

    recorder.stop();
  }, []);

  // ── Save as Note ──
  const saveAsNote = useCallback(() => {
    if (!result) return;

    const aiSummary: AISummary = {
      summary: result.summary,
      action_items: result.action_items,
      suggested_title: result.suggested_title,
      generatedAt: new Date().toISOString(),
    };

    const content = `## 🎙️ Meeting Transcript\n\n${result.transcript}\n\n---\n\n## 📋 AI Summary\n\n${result.summary}`;

    const note = notesStore.createNoteWithContent(
      result.suggested_title || 'Meeting Notes',
      content,
      'Meeting Brief',
      aiSummary,
      ['meeting', 'ai-transcribed']
    );

    setSuccessNote(note.note_id);
    setTimeout(() => {
      setOverlayOpen(false);
      setState('idle');
      setResult(null);
      setElapsed(0);
      navigate(`/editor/${note.note_id}`);
    }, 900);
  }, [result, notesStore, navigate]);

  // ── Discard ──
  const discard = useCallback(() => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    setState('idle');
    setOverlayOpen(false);
    setResult(null);
    setElapsed(0);
    setErrorMsg('');
    setSuccessNote(null);
  }, []);

  // ── Render Trigger Button ──
  const triggerButton = (
    <button
      onClick={() => {
        if (state === 'idle' || state === 'error') {
          startRecording();
        } else if (state === 'recording') {
          setOverlayOpen(true);
        } else {
          setOverlayOpen(true);
        }
      }}
      title="Record Meeting"
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] font-semibold transition-all ${
        state === 'recording'
          ? 'bg-red-50 text-red-600 border-red-300 animate-pulse'
          : 'bg-surface text-text-secondary border-border hover:border-red-300 hover:text-red-500'
      }`}
    >
      <span
        className="material-symbols-outlined text-[16px]"
        style={{ fontVariationSettings: state === 'recording' ? "'FILL' 1" : "'FILL' 0" }}
      >
        mic
      </span>
      {state === 'recording' ? `⏺ ${formatTime(elapsed)}` : 'Record'}
    </button>
  );

  // ── Overlay ──
  const overlay = overlayOpen && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(8,8,18,0.72)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && state !== 'recording') discard(); }}
    >
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(30,20,60,0.98) 0%, rgba(20,10,45,0.98) 100%)',
          border: '1px solid rgba(139,92,246,0.25)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.1) inset',
        }}
      >
        {/* Header gradient bar */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #7c3aed, #6366f1, #8b5cf6)' }} />

        <div className="p-7">
          {/* Title */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }}
              >
                <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  mic
                </span>
              </div>
              <div>
                <h3 className="font-bold text-[15px] text-white">Meeting Recorder</h3>
                <p className="text-[11px]" style={{ color: 'rgba(196,181,253,0.7)' }}>Powered by Groq Whisper</p>
              </div>
            </div>
            {state !== 'recording' && (
              <button onClick={discard} className="text-white/40 hover:text-white/80 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            )}
          </div>

          {/* ── STATE: Recording ── */}
          {state === 'recording' && (
            <div className="text-center">
              {/* Pulsing mic orb */}
              <div className="flex items-center justify-center mb-5">
                <div className="relative">
                  <div
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{ background: 'rgba(239,68,68,0.25)', animationDuration: '1.5s' }}
                  />
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center relative z-10"
                    style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}
                  >
                    <span className="material-symbols-outlined text-white text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      mic
                    </span>
                  </div>
                </div>
              </div>

              {/* Timer */}
              <p className="text-[32px] font-mono font-bold text-white mb-1">{formatTime(elapsed)}</p>
              <p className="text-[12px] mb-5" style={{ color: 'rgba(196,181,253,0.6)' }}>Recording in progress…</p>

              {/* Waveform */}
              <div className="mb-6 px-2">
                <WaveformBars active={true} />
              </div>

              {/* Stop button */}
              <button
                onClick={stopRecording}
                className="w-full py-3.5 rounded-2xl font-bold text-[14px] text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
              >
                <span className="material-symbols-outlined text-[18px] align-middle mr-1.5" style={{ fontVariationSettings: "'FILL' 1" }}>stop_circle</span>
                Stop & Transcribe
              </button>
              <p className="text-[11px] mt-3" style={{ color: 'rgba(196,181,253,0.4)' }}>Max 10 minutes</p>
            </div>
          )}

          {/* ── STATE: Processing ── */}
          {state === 'processing' && (
            <div className="text-center py-4">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 relative"
                style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(99,102,241,0.3))' }}
              >
                <span
                  className="material-symbols-outlined text-purple-400 text-[34px] animate-spin"
                  style={{ animationDuration: '1.5s' }}
                >
                  progress_activity
                </span>
              </div>
              <p className="text-[16px] font-bold text-white mb-2">Peblo AI is transcribing…</p>
              <p className="text-[12px]" style={{ color: 'rgba(196,181,253,0.6)' }}>
                Groq Whisper is processing your audio
              </p>
              <div className="mt-5 flex gap-1.5 justify-center">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{
                      background: 'rgba(139,92,246,0.7)',
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── STATE: Done ── */}
          {state === 'done' && result && !successNote && (
            <div>
              {/* Success check */}
              <div className="flex items-center gap-3 mb-5 p-3.5 rounded-2xl" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <span className="material-symbols-outlined text-emerald-400 text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <div>
                  <p className="text-[13px] font-bold text-emerald-300">Transcription complete!</p>
                  <p className="text-[11px]" style={{ color: 'rgba(167,243,208,0.6)' }}>
                    {result.transcript.split(' ').length} words captured
                  </p>
                </div>
              </div>

              {/* Preview */}
              <div
                className="rounded-2xl p-4 mb-4"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(196,181,253,0.5)' }}>
                  Suggested Title
                </p>
                <p className="text-[14px] font-bold text-white mb-3">{result.suggested_title}</p>

                <p className="text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(196,181,253,0.5)' }}>
                  Summary
                </p>
                <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  {result.summary.slice(0, 180)}{result.summary.length > 180 ? '…' : ''}
                </p>

                {result.action_items.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(196,181,253,0.5)' }}>
                      Action Items ({result.action_items.length})
                    </p>
                    <ul className="space-y-1">
                      {result.action_items.slice(0, 3).map((item, i) => (
                        <li key={i} className="text-[12px] flex items-start gap-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                          <span className="text-purple-400 mt-0.5 shrink-0">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* CTA Buttons */}
              <div className="flex gap-2.5">
                <button
                  onClick={discard}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Discard
                </button>
                <button
                  onClick={saveAsNote}
                  className="flex-[2] py-2.5 rounded-xl text-[13px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }}
                >
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>note_add</span>
                  Save as Note
                </button>
              </div>
            </div>
          )}

          {/* ── STATE: Saving (successNote set) ── */}
          {successNote && (
            <div className="text-center py-4">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(99,102,241,0.4))' }}
              >
                <span className="material-symbols-outlined text-purple-300 text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  note_add
                </span>
              </div>
              <p className="text-[15px] font-bold text-white mb-1">Opening your note…</p>
              <p className="text-[12px]" style={{ color: 'rgba(196,181,253,0.5)' }}>Meeting notes saved successfully!</p>
            </div>
          )}

          {/* ── STATE: Error ── */}
          {state === 'error' && (
            <div className="text-center py-2">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(239,68,68,0.15)' }}
              >
                <span className="material-symbols-outlined text-red-400 text-[28px]">mic_off</span>
              </div>
              <p className="text-[14px] font-bold text-white mb-2">Recording Failed</p>
              <p className="text-[12px] mb-5 px-2" style={{ color: 'rgba(252,165,165,0.8)' }}>{errorMsg}</p>
              <button
                onClick={discard}
                className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {triggerButton}
      {overlay}
    </>
  );
}
