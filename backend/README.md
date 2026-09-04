# Smart Market Watchlist — Groww CODE 2026

> **Core idea:** Instead of just showing live prices, this app answers *"what has meaningfully changed since YOU last checked — and why does it matter for you?"*

---

## Architecture

```
frontend/   Next.js 16 (App Router) + TypeScript + Tailwind v4
backend/    Express 5 + TypeScript + Prisma ORM + PostgreSQL
AI          Google Gemini 1.5 Flash (graceful fallback if no key)
Data        Yahoo Finance 2 (live NSE quotes, search fallback, 7s timeout)
```

```
LAST-SEEN STATE → MEANINGFUL CHANGE ENGINE → AI EXPLANATION → GOAL CONTEXT → USER DECIDES
```

---

## Prerequisites

- Node.js ≥ 18
- PostgreSQL running locally
- (Optional) Google Gemini API key

---

## Setup

### 1. Database

```bash
# Create a PostgreSQL database
createdb groww_watchlist
```

### 2. Backend

```bash
cd backend

# Install dependencies
npm install

# Copy and fill environment variables
cp .env.example .env
# Edit .env — set DATABASE_URL and optionally GEMINI_API_KEY

# Push schema to database
npx prisma db push

# Seed initial stocks (RELIANCE, TCS, INFY, etc.)
npm run seed

# Start dev server (port 5000)
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev   # runs on port 3000
```

Open http://localhost:3000/watchlist

---

## Environment Variables

### `backend/.env`

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/groww_watchlist?schema=public"

# Optional — if omitted, structured deterministic fallback is used
GEMINI_API_KEY="your-gemini-api-key-here"

NODE_ENV=development
PORT=5000
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login / register demo user |
| GET | `/api/users/:id/watchlist/live` | Live prices for all watchlist stocks |
| POST | `/api/users/:id/watchlist/stocks` | Add stock by NSE symbol |
| DELETE | `/api/users/:id/watchlist/stocks/:stockId` | Remove stock (persists to DB) |
| GET | `/api/users/:id/dashboard/changes` | Meaningful changes + AI insights |
| POST | `/api/users/:id/goals` | Create/get user goal |
| GET | `/api/users/:id/goals/impact` | Goal health vs recent change events |
| GET | `/api/market/status` | NSE market open/closed status |
| POST | `/api/debug/market-tick` | Manually trigger market data refresh |
| POST | `/api/debug/prune-snapshots` | Delete snapshots older than 30 days |

---

## How the Meaningful Change Engine Works

**No `Math.random()`. Results are deterministic and reproducible.**

```
Score = Price Movement Score (0–40) + Volume Anomaly Score (0–30)
                                     max cap: 100

Score ≥ 55  → SIGNIFICANT_CHANGE  (red alert)
Score ≥ 35  → ATTENTION           (orange alert)
Score ≥ 15  → WORTH_KNOWING       (yellow notice)
< 15        → NO_CHANGE           (filtered out)
```

- **Price score**: based on % change from the user's last-seen price (not today's open)
- **Volume score**: current volume ratio vs previous snapshot; absolute threshold as fallback
- **Last-seen timestamp**: stored per-user per-stock in `UserStockState`, updated atomically when the user views the dashboard

---

## Market Hours

NSE trading hours are Monday–Friday, 09:15–15:30 IST.

All market snapshots are tagged with:
- `LIVE` — during market hours, from Yahoo Finance
- `DELAYED` — pre-market, data from Yahoo Finance but market closed
- `STALE` — after-market or weekend, showing last known price
- `MOCK_PROVIDER` — Yahoo Finance completely unreachable, using simulated fluctuations

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Anchor change % to *last-seen* price, not today's open | Users care about "what moved since I was here", not arbitrary 1D windows |
| Write `ChangeEvent` records to DB | Enables the GoalEngine to consume events asynchronously |
| Gemini prompt is fact-constrained | "ONLY use the facts provided" prevents hallucination; no buy/sell advice |
| Deterministic fallback for AI | If Gemini is unavailable, a structured template (not null) is shown |
| `Promise.allSettled` for Yahoo Finance | Individual stock failures don't block the rest |
| Singleton `PrismaClient` | One connection pool shared across all service files |
| Atomic `$transaction` for last-seen update | Prevents partial updates if server crashes mid-loop |
| `@@unique([userId, name])` on Goal | Idempotent goal creation — safe to call on every page load |

---

## Running in Production

```bash
# Backend
cd backend && npm run build && node dist/index.js

# Frontend
cd frontend && npm run build && npm start
```

---

## Project Structure

```
backend/src/
  db.ts                     ← Singleton PrismaClient
  index.ts                  ← Express app entry point
  lib/
    yahooFinance.ts          ← Singleton Yahoo Finance client
    marketHours.ts           ← NSE open/closed detection (IST)
  routes/
    api.ts                   ← All HTTP routes
  services/
    changeEngine.ts          ← Meaningful change computation (deterministic)
    goalEngine.ts            ← Goal health vs change events
    insightEngine.ts         ← Gemini AI brief generation + caching + fallback
    marketData.ts            ← Yahoo Finance ingestion + mock fallback + pruning

frontend/src/
  app/
    watchlist/page.tsx       ← Main smart watchlist UI
    holdings/page.tsx        ← Holdings page
    page.tsx                 ← Explore page
  components/
    Navbar.tsx               ← Navigation
  services/
    api.ts                   ← Typed API client with error handling
```
