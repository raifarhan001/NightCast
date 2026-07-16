# Vidking: Premium Movie & TV Streaming Platform

An editorial, minimal, and premium movie and TV streaming experience built using Next.js 15, FastAPI, PostgreSQL (pgvector), and Redis. 

The styling borrows aesthetics from Apple, Nothing, Linear, and A24 to deliver a high-typography, dark-theme layout with custom cursor interactions, smooth GSAP parallax animations, and glassmorphic overlays.

---

## Technical Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion, GSAP, Zustand, TanStack React Query.
- **Backend**: FastAPI (Python 3.11), SQLAlchemy, PostgreSQL + pgvector, Redis, JWT Cookies.
- **Video Playback**: Dynamic iframe integration with Vidking player API.
- **AI Engine**: Local semantic vocabulary vector embedding (or OpenAI `text-embedding-3-small` if configured) with Postgres vector similarity math.

---

## Architectural Setup & Running Locally

The entire stack is containerized using Docker and Docker Compose. On startup, the backend automatically registers the `pgvector` extension in PostgreSQL, runs database migrations, and pre-populates the vector search database.

### 1. Configure Environment Variables
Create a `.env` file in the root workspace folder:

```env
# Mandatory for actual TMDB queries (falls back to mock databases automatically if omitted)
TMDB_API_KEY=your_tmdb_api_key_here

# Security
JWT_SECRET=supersecretjwtkey123!

# Optional (If omitted, system uses a local 384-dimensional vocabulary similarity model for semantic search)
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. Boot the Platform
Execute the compose command to compile images and run services:

```bash
docker-compose up --build
```

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Features Walkthrough

### 1. Watch Progress Resumption (PostgreSQL Sync)
The embedded Vidking Player uses the `postMessage` protocol to communicate with Next.js:
- As you stream, the player continuously emits progress payloads.
- The frontend registers message listeners, throttling requests, and updates the database every 10 seconds (or on pause/exit).
- When reopening a movie, the player reads progress records and starts the frame automatically using the `?progress={seconds}` parameters.

### 2. AI Semantic Search
- Switch to the **AI** search mode in the search console.
- Enter descriptive phrases (e.g. `"space movies like Interstellar"`, `"mind bending movies"`, `"horror with good ending"`).
- The engine maps query matrices against titles in the `semantic_metadata` database table using Postgres `pgvector` cosine similarity (`<=>`) and returns top scoring items.

### 3.curated Multi-Profiles
- Signed-in users can configure up to 4 unique profiles.
- Each profile tracks separate continue watching logs, favorite bookmarks, and custom settings (subtitles toggles, autoplay preferences, language choices).

---

## Live Player Verification IDs

If you run without a TMDB API Key, the application operates in **Mock Mode**, pre-populated with actual movies and TV shows to let you test all player events, continue watching, and bookmarks immediately.

Use these IDs to verify the integrated player:

- **Movie ID**: `1078605` (*The Creator*) or `157336` (*Interstellar*)
- **TV ID**: `119051` (*Wednesday* - Season 1, Episodes 1 to 8)
- **Alternative TV ID**: `85922` (*Succession*)
