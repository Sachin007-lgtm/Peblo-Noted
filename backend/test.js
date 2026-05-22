const res = await fetch('http://localhost:3000/api/auto-tag', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Test Note', content: 'Test Content' })
});

console.log('Status:', res.status);
const data = await res.json();
console.log('Data:', data);
