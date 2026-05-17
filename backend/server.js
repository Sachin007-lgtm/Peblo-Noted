import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

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
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'You are a helpful note-taking assistant. Always respond with valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 512,
      }),
    });

    if (!groqRes.ok) throw new Error(`Groq API error: ${groqRes.status}`);
    const data = await groqRes.json();
    const text = data.choices?.[0]?.message?.content ?? '';
    
    // Pass the raw text back to the frontend to parse
    res.json({ result: text });
  } catch (error) {
    console.error('Backend AI Error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
