# 🌌 NightCast — Cinematic Movie & TV Streaming Platform

<div align="center">

![Next.js 15](https://img.shields.io/badge/Next.js-15.0-black?style=for-the-badge&logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind_css)
![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python)

**A modern, state-of-the-art streaming web application featuring Google TV aesthetics, high-speed multi-server streaming, direct offline downloads, and studio platform catalog discovery.**

[Features](#-key-features) • [Tech Stack](#-tech-stack) • [Quick Start](#-quick-start) • [Streaming Servers](#-3-high-speed-streaming-servers) • [Screenshots](#-preview)

</div>

---

## ✨ Key Features

- **🎨 Deep Ocean Design System**:
  - Immersive `#011425` midnight ocean theme with `#081E30` elevated surfaces and `#1F4959` / `#5C7C89` cyan-slate accents.
  - Ambient backlight hero carousel with high-visibility backdrops and glassmorphism overlays.

- **⚡ 3 High-Performance Streaming Servers**:
  - **Server 1 (VidBolt)**: Primary ultra-fast 1080p full-HD multi-source stream with automatic subtitle loading.
  - **Server 2 (VidSrc)**: High-reliability backup full-HD 1080p embed player.
  - **Server 3 (Hindi Dubbed)**: Dedicated Bollywood, Hindi-dubbed Hollywood, and South Indian dubbed stream with Hindi audio track by default.

- **📥 Direct Offline Download Engine**:
  - Download Hub with one-click direct download links for **Server 1 (VidBolt 1080p)**, **Server 2 (VidSrc 1080p)**, and **Server 3 (Hindi Dubbed 1080p/720p)**.
  - Supports both Movies and TV Episodes (with Season & Episode selector).

- **🏆 Authentic Netflix Top 10 Ranked Row**:
  - Giant hollow outlined rank numbers (**`1` to `10`**) crafted with crisp SVG typography.
  - Overlapping 2:3 vertical posters with smooth zoom, play trigger, and live ratings.

- **🎬 Studios & Platforms Interactive Discovery**:
  - Direct network & provider discover filters for **Netflix**, **Amazon Prime Video**, **Apple TV+**, **Disney+**, **Hulu**, **HBO Max**, **Crunchyroll**, **Paramount+**, **MGM+**, and **Marvel Studios**.
  - Dynamic **Platform Badges** rendered on all movie and show posters.

- **🏎️ F1 Live Racing Hub**:
  - 2026 Formula 1 season countdown, race schedule, driver & constructor standings, and weekend live telemetry tracker.

- **👥 Multi-Profile Support & Local Progress Sync**:
  - Switch between up to 4 custom user profiles with personalized continue-watching logs and bookmarks.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router, React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Custom CSS Design System, Glassmorphism
- **State & Query**: Zustand, TanStack React Query v5
- **Icons**: Lucide React

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: SQLite (SQLAlchemy ORM) / PostgreSQL compatible
- **Metadata**: TMDB v3 API Client with intelligent fallback mocking
- **Extraction**: Direct stream extractor & download link generator

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.17+ or v20+)
- [Python](https://www.python.org/) (v3.10+)
- [Git](https://git-scm.com/)

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/NightCast.git
cd NightCast
```

---

### 2. Backend Setup (FastAPI)

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env from example (optional for custom TMDB API key)
copy .env.example .env

# Run FastAPI server (runs on port 8001)
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

FastAPI interactive documentation will be available at: **[http://localhost:8001/docs](http://localhost:8001/docs)**

---

### 3. Frontend Setup (Next.js 15)

In a new terminal window:

```bash
# Navigate to frontend
cd frontend

# Install npm dependencies
npm install

# Run Next.js dev server (runs on port 3000)
npm run dev
```

Open your browser at: **[http://localhost:3000](http://localhost:3000)**

---

## 🔌 Streaming Servers

NightCast is configured strictly with 3 servers:

| Server Name | Identifier | Resolution | Audio | Description |
|---|---|---|---|---|
| **Server 1** | `vidbolt` | 1080p Full HD | Original (English) | Primary high-speed embed player |
| **Server 2** | `vidsrc` | 1080p Full HD | Original (English) | Fast fallback embed player |
| **Server 3** | `hindi` | 1080p / 720p HD | Hindi Dubbed | Bollywood & Hollywood Hindi dub stream |

---

## 📁 Project Structure

```
NightCast/
├── backend/
│   ├── main.py                  # FastAPI entry point & CORS configuration
│   ├── database.py              # SQLite / PostgreSQL engine setup
│   ├── models.py                # User, Profile, and Progress database models
│   ├── routers/
│   │   ├── tmdb.py              # TMDB catalog, search, and discover routes
│   │   ├── auth.py              # User authentication & profile routes
│   │   └── progress.py          # Watch progress sync endpoints
│   ├── services/
│   │   ├── tmdb_service.py      # TMDB API client with mock fallback
│   │   └── stream_extractor.py  # Server stream extractor & download engine
│   ├── requirements.txt         # Python dependencies
│   └── .env.example             # Backend environment template
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # Home page (Hero, Top 10, Studios, Rows)
│   │   │   ├── search/page.tsx  # Catalog explore & studio platform search
│   │   │   ├── movies/page.tsx  # Movies catalog page
│   │   │   ├── shows/page.tsx   # TV shows catalog page
│   │   │   ├── f1/page.tsx      # Formula 1 racing hub
│   │   │   ├── watch/[type]/[id]/page.tsx # Cinematic player & download modal
│   │   │   └── profile/page.tsx # Profile management
│   │   ├── components/
│   │   │   ├── home/
│   │   │   │   ├── HeroCarousel.tsx   # Ambient backlight hero carousel
│   │   │   │   ├── Top10RankedRow.tsx # Netflix-style Top 10 hollow row
│   │   │   │   └── StudiosRow.tsx     # Studios & streaming brands carousel
│   │   │   ├── shared/
│   │   │   │   ├── MovieCard.tsx      # 16:9 card with platform badges
│   │   │   │   └── PlatformBadge.tsx  # Netflix/Prime/Disney/Apple badges
│   │   │   └── player/
│   │   │       └── NightCastPlayer.tsx# Multi-server streaming player
│   │   ├── lib/
│   │   │   ├── api.ts           # API client and type interfaces
│   │   │   ├── ImageService.ts  # TMDB image optimizer & fallback
│   │   │   └── progress.ts      # LocalStorage progress manager
│   │   └── styles/
│   │       └── globals.css      # Deep Ocean design tokens and CSS rules
│   ├── package.json
│   ├── tailwind.config.js
│   └── .env.example             # Frontend environment template
│
├── .gitignore                   # Clean Git ignore rules
└── README.md                    # Project documentation
```

---

## 🔒 Environment Variables

### Backend (`backend/.env`)
```env
TMDB_API_KEY=your_tmdb_api_key
DATABASE_URL=sqlite:///./nightcast.db
SECRET_KEY=your_jwt_secret_key
PORT=8001
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8001/api/v1
NEXT_PUBLIC_APP_NAME=NightCast
```

---

## 📄 License & Disclaimer

This project is open-source and intended for educational and personal portfolio purposes. All media metadata and images are provided by [The Movie Database (TMDB)](https://www.themoviedb.org/).
