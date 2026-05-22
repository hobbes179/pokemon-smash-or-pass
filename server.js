const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'votes.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readVotes() {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.error('Error reading votes.json:', e.message);
    return {};
  }
}

function writeVotes(votes) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(votes, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing votes.json:', e.message);
  }
}

// GET all votes (for loading leaderboard on page open)
app.get('/api/votes', (req, res) => {
  res.json(readVotes());
});

// POST a single vote
app.post('/api/vote', (req, res) => {
  const { id, choice, name, sprite } = req.body;
  if (!id || !['smash', 'pass'].includes(choice)) {
    return res.status(400).json({ error: 'Invalid vote' });
  }

  const votes = readVotes();
  if (!votes[id]) votes[id] = { smash: 0, pass: 0, name: '', sprite: '' };
  votes[id][choice]++;
  votes[id].name = name || votes[id].name;
  votes[id].sprite = sprite || votes[id].sprite;

  writeVotes(votes);
  res.json({ ok: true, votes: votes[id] });
});

// Catch-all: serve index.html for any unknown route (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Pokémon Smash or Pass running at http://localhost:${PORT}`);
});
