# Pokémon: Smash or Pass

A community voting game. Every vote is shared across all visitors and persisted to disk.

## Quick start

```bash
npm install
cp data/votes.json.example data/votes.json
npm start
```

Open http://localhost:3000

## Deploying

Works on any Node.js host (Railway, Render, Fly.io, a VPS, etc.).

**Important:** `data/votes.json` is in `.gitignore` on purpose — it holds all community votes and must never be overwritten by a `git push`. On a fresh server:

```bash
cp data/votes.json.example data/votes.json
```

If you're redeploying to an existing server, leave `data/votes.json` alone.

## Project structure

```
├── public/
│   └── index.html       # Full game UI (vanilla HTML/CSS/JS)
├── data/
│   ├── votes.json        # ← gitignored, holds live vote data
│   └── votes.json.example
├── server.js             # Express API + static file server
├── package.json
└── .gitignore
```

## API

| Method | Endpoint     | Description                  |
|--------|-------------|------------------------------|
| GET    | /api/votes  | Returns all vote data (JSON) |
| POST   | /api/vote   | Submit a vote                |

POST body: `{ "id": 25, "choice": "smash", "name": "pikachu", "sprite": "https://..." }`

## Static / GitHub Pages mode

If you host only the `public/` folder (no Node server), the game still works — votes are stored in memory for that browser session but won't persist or be shared. The fetch calls to `/api/` fail silently.
