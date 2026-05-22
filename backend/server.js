import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import 'dotenv/config';
import { pipeline } from '@xenova/transformers';

const app = express();
app.use(cors());
app.use(express.json());

// ── Helper: call Groq ─────────────────────────────────────────────────────────
async function callGroq({ messages, model = 'llama-3.3-70b-versatile', temperature = 0.7, max_tokens = 1024 }) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens }),
  });
  if (!res.ok) throw new Error(`Groq API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// ── POST /api/summarize ───────────────────────────────────────────────────────
app.post('/api/summarize', async (req, res) => {
  const { title, content } = req.body;

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured on the server.' });
  }

  const prompt = `Analyze this note and respond with ONLY a valid JSON object (no markdown, no extra text):
{
  "summary": "A detailed, well-thought-out summary...",
  "action_items": ["Detailed actionable point 1", "Detailed actionable point 2", "Detailed actionable point 3"],
  "suggested_title": "A concise improved title"
}

IMPORTANT INSTRUCTIONS:
1. Make the "summary" rich, descriptive, and verbose.
2. Ensure the "action_items" array contains clearly organized, actionable bullet points (like a to-do list). THIS MUST BE AN ARRAY OF SIMPLE STRINGS ONLY, NOT OBJECTS.
3. Only output valid JSON.

Note Title: ${title || 'Untitled Note'}
Note Content:
${(content || '').replace(/<[^>]+>/g, ' ').slice(0, 3000)}`;

  try {
    const text = await callGroq({
      model: 'llama-3.1-8b-instant',
      temperature: 0.3,
      max_tokens: 512,
      messages: [
        { role: 'system', content: 'You are a helpful note-taking assistant. Always respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
    });
    res.json({ result: text });
  } catch (error) {
    console.error('Backend AI Error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// ── POST /api/chat ────────────────────────────────────────────────────────────
// Body: { messages: [{role, content}], noteContext?: {title, content} }
app.post('/api/chat', async (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured.' });
  }

  const { messages = [], noteContext } = req.body;

  // Build system prompt
  let systemPrompt = `You are Peblo AI, an intelligent note-taking assistant built into the Peblo Sync app.
You help users manage, understand, and enhance their notes.

You can:
- Summarize, analyze, and improve note content
- Extract action items, todos, and key points
- Suggest tags, titles, and organization
- Generate content, outlines, bullet lists on demand
- Help with writing, editing, and brainstorming

RESPONSE FORMAT RULES (follow exactly every time):
1. Write your main response using markdown (bold, numbered lists, bullet points, headings).
2. Keep the main response concise and well-structured.
3. At the very end of EVERY response, append a suggestions block in this exact format:
<suggestions>
Short follow-up question or action 1?
Short follow-up question or action 2?
Short follow-up question or action 3?
</suggestions>
4. Each suggestion must be under 9 words and directly relevant to what was just discussed.
5. Make suggestions feel natural — like what a curious user would ask next.
6. Never skip the <suggestions> block. Never add anything after it.`;

  if (noteContext?.title || noteContext?.content) {
    const cleanContent = (noteContext.content || '').replace(/<[^>]+>/g, ' ').slice(0, 2000);
    systemPrompt += `\n\n## Currently Open Note
Title: ${noteContext.title || 'Untitled'}
Content: ${cleanContent || '(empty)'}

The user is currently viewing this note. Answer questions about it directly.`;
  }


  try {
    const reply = await callGroq({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    });
    res.json({ reply });
  } catch (error) {
    console.error('Chat AI Error:', error);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

// ── POST /api/content-action ──────────────────────────────────────────────────
// Body: { text: string, action: string }
// Actions: shorten | expand | fix_grammar | translate | bullet_points | continue_writing | tone_formal | tone_casual
app.post('/api/content-action', async (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured.' });
  }

  const { text, action } = req.body;
  if (!text || !action) {
    return res.status(400).json({ error: 'text and action are required' });
  }

  const actionPrompts = {
    shorten:          `Make this text significantly shorter while preserving the key meaning. Return ONLY the rewritten text, no explanations:\n\n${text}`,
    expand:           `Expand this text with more detail, examples, and depth. Return ONLY the rewritten text, no explanations:\n\n${text}`,
    fix_grammar:      `Fix all grammar, spelling, and punctuation errors in this text. Return ONLY the corrected text, no explanations:\n\n${text}`,
    translate:        `Translate this text to Spanish. Return ONLY the translated text, no explanations:\n\n${text}`,
    bullet_points:    `Convert this text into clear, concise bullet points. Return ONLY the bullet points, no explanations:\n\n${text}`,
    continue_writing: `Continue writing naturally from where this text ends. Add 2-3 more sentences. Return ONLY the additional text:\n\n${text}`,
    tone_formal:      `Rewrite this text in a formal, professional tone. Return ONLY the rewritten text:\n\n${text}`,
    tone_casual:      `Rewrite this text in a casual, friendly, conversational tone. Return ONLY the rewritten text:\n\n${text}`,
  };

  const prompt = actionPrompts[action];
  if (!prompt) {
    return res.status(400).json({ error: `Unknown action: ${action}` });
  }

  try {
    const result = await callGroq({
      model: 'llama-3.1-8b-instant',
      temperature: 0.5,
      max_tokens: 512,
      messages: [
        { role: 'system', content: 'You are a precise text editing assistant. Follow the instructions exactly and return only the requested output with no preamble.' },
        { role: 'user', content: prompt },
      ],
    });
    res.json({ result });
  } catch (error) {
    console.error('Content Action Error:', error);
    res.status(500).json({ error: 'Failed to process content action' });
  }
});

// ── Embeddings pipeline setup ──
let extractor = null;
async function getExtractor() {
  if (!extractor) {
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractor;
}

// ── POST /api/embeddings ──────────────────────────────────────────────────────
app.post('/api/embeddings', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }

  try {
    const extract = await getExtractor();
    const output = await extract(text, { pooling: 'mean', normalize: true });
    const embedding = Array.from(output.data);
    res.json({ embedding });
  } catch (error) {
    console.error('Embeddings generation failed:', error);
    res.status(500).json({ error: 'Failed to generate embedding' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
