# 🌌 Nightcast — Amazon Prime Video Style Streaming Platform

<div align="center">

![Next.js 15](https://img.shields.io/badge/Next.js-15.0-black?style=for-the-badge&logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind_css)
![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python)

**A modern, state-of-the-art streaming web application featuring an authentic Amazon Prime Video aesthetic, 60 FPS GPU-accelerated motion animations, 3 high-speed streaming servers, direct downloads, and studio platform discovery.**

[Features](#-key-features) • [Tech Stack](#-tech-stack) • [Quick Start](#-quick-start) • [Streaming Servers](#-3-high-speed-streaming-servers) • [Project Structure](#-project-structure)

</div>

---

## ✨ Key Features

- **🎨 Authentic Amazon Prime Video Design System**:
  - Immersive `#0B1120` dark cinema canvas, `#192231` surface cards, `#00A8E1` signature Prime Cyan accents, and `#E5B800` gold IMDb rating tags.
  - Signature **Nightcast** brand logo featuring the Amazon Prime Video cyan smile curve.

- **⚡ 60 FPS GPU Hardware-Accelerated Motion**:
  - Hardware-accelerated 16:9 landscape cards (`transform-gpu`, `will-change-transform`, `cubic-bezier(0.2, 0, 0, 1)`).
  - Hover action controls (+ Watchlist, ThumbsUp, Play button pulse).
  - Staggered hero carousel slide transitions and smooth categories dropdown overlay.

- **📂 Interactive Categories Dropdown**:
  - Direct genre filter dropdown menu covering Action & Adventure, Comedy, Drama, Sci-Fi & Speculative, Thriller & Suspense, Horror, Animation, Documentary, and Romance.

- **⚡ 3 High-Performance Streaming Servers**:
  - **Server 1 (VidBolt)**: Primary ultra-fast 1080p full-HD multi-source stream with automatic subtitle loading.
  - **Server 2 (VidSrc)**: High-reliability backup full-HD 1080p embed player.
  - **Server 3 (Hindi Dubbed)**: Dedicated Bollywood, Hindi-dubbed Hollywood, and South Indian dubbed stream.

- **📥 Direct Offline Download Engine**:
  - Download Hub with one-click direct download links for Movies and TV Episodes across all servers.

- **🏆 Prime Video Top 10 Ranked Row**:
  - Outlined gold/cyan rank numbers (**`1` to `10`**) with 2:3 vertical posters and hover action triggers.

- **🎬 Channels & Studios Discovery**:
  - Interactive network discover filters for **Prime Video**, **Netflix**, **Apple TV+**, **Disney+**, **Hulu**, **HBO Max**, **Paramount+**, and **Marvel Studios**.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router, React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Amazon Prime Video Theme System
- **Animation**: Framer Motion & CSS GPU Hardware Acceleration
- **Icons**: Lucide React

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: SQLite (SQLAlchemy ORM)
- **Metadata**: TMDB v3 API Client with Proxying & Fallback Engine
- **Streaming**: Multi-server stream extractor & download link generator

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.17+ or v20+)
- [Python](https://www.python.org/) (v3.10+)
- [Git](https://git-scm.com/)

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/Nightcast.git
cd Nightcast
```

---

### 2. Backend Setup (FastAPI)

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Run FastAPI backend on port 8001
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

FastAPI API documentation: **[http://localhost:8001/docs](http://localhost:8001/docs)**

---

### 3. Frontend Setup (Next.js 15)

In a new terminal:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Next.js dev server on port 3000
npm run dev
```

Open your browser at: **[http://localhost:3000](http://localhost:3000)**

---

## 🔌 3 High-Speed Streaming Servers

Nightcast provides 3 dedicated streaming servers:

| Server Name | Identifier | Resolution | Audio | Description |
|---|---|---|---|---|
| **Server 1** | `vidbolt` | 1080p Full HD | Original (English) | Primary high-speed embed player |
| **Server 2** | `vidsrc` | 1080p Full HD | Original (English) | Fast fallback embed player |
| **Server 3** | `hindi` | 1080p / 720p HD | Hindi Dubbed | Dedicated Bollywood & Hindi dub stream |

---

## 📁 Project Structure

```
Nightcast/
├── backend/
│   ├── main.py                  # FastAPI entry point & CORS setup
│   ├── database.py              # SQLite engine setup
│   ├── models.py                # Database models
│   ├── routers/
│   │   ├── tmdb.py              # TMDB catalog & discover routes
│   │   ├── auth.py              # Auth & profile management routes
│   │   └── progress.py          # Watch progress sync endpoints
│   ├── services/
│   │   ├── tmdb_service.py      # TMDB API client with fallback
│   │   └── stream_extractor.py  # Server stream extractor & download engine
│   └── requirements.txt         # Python requirements
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # Home page (Hero, Top 10, Studios, Rows)
│   │   │   ├── search/page.tsx  # Catalog explore & category search
│   │   │   ├── movies/page.tsx  # Movies catalog page
│   │   │   ├── shows/page.tsx   # TV shows catalog page
│   │   │   ├── watch/[type]/[id]/page.tsx # Player page & download hub
│   │   │   └── profile/page.tsx # Profile management
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Header.tsx   # Brand logo, Categories dropdown, Nav
│   │   │   │   └── Footer.tsx   # Footer links & Nightcast logo
│   │   │   ├── home/
│   │   │   │   ├── HeroCarousel.tsx   # Amazon Prime Video hero carousel
│   │   │   │   ├── Top10RankedRow.tsx # Gold/cyan ranked top 10 row
│   │   │   │   └── StudiosRow.tsx     # Channel & Studios carousel
│   │   │   └── shared/
│   │   │       ├── MovieCard.tsx      # 16:9 Prime landscape card
│   │   │       └── MovieRow.tsx       # Horizontal scrolling row
│   │   ├── lib/
│   │   │   ├── api.ts           # API fetch client
│   │   │   └── ImageService.ts  # TMDB image optimizer
│   │   └── styles/
│   │       └── globals.css      # Amazon Prime Video design tokens & GPU keyframes
│   ├── package.json
│   └── tailwind.config.js
│
├── .gitignore                   # Clean git ignore rules
└── README.md                    # Project documentation
```

---

## 📄 License & Disclaimer

This project is created for educational and personal portfolio purposes. All media metadata and images belong to [The Movie Database (TMDB)](https://www.themoviedb.org/).
