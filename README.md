# WatchWise - Smart Market Watchlist - Groww CODE 2026

![Smart Market Watchlist](https://img.shields.io/badge/Groww-CODE_2026-00d09c?style=for-the-badge)
[![Vercel Deployment](https://img.shields.io/badge/Vercel-Live_Demo-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://watchwise-smart-watchlist.vercel.app/)

A smart watchlist feature enhancement designed for Groww users to instantly understand what has "meaningfully changed" since they last checked, focusing attention on what truly matters.

### Live Demo
**Try it live on Vercel:** [watchwise-smart-watchlist.vercel.app](https://watchwise-smart-watchlist.vercel.app)

---

## Why This Feature? (A Personal Perspective)

Having been an active **Groww user for almost 2 years**, Groww has been my primary platform for investing and tracking the stock market. Over time, one specific area where I always felt there was room for improvement was the **Watchlist** section. 

Traditional watchlists are mostly static they display current stock prices with standard green or red numbers, leaving the user to figure out whether a price change is normal daily noise or something that requires actual attention. Every time I opened the app, I found myself spending unnecessary time analyzing whether a move was company-specific or part of a broader sector trend.

Because of this, **I didn't want to build a completely separate, disconnected web app. Instead, I wanted to modify and enhance the existing Watchlist feature directly within Groww.** 

This project is a personal reflection of a feature I have genuinely wanted in the Groww app: turning the Watchlist into an intelligent market assistant that actively monitors stocks, filters out routine noise, provides sector-level context, and delivers a quick return digest when you re-open the app.

---

## Overview

The **WatchWise - Intelligent Market Watchlist** flips the traditional watchlist paradigm. Rather than forcing users to sift through raw numbers and figure out what happened:
- It acts as an intelligent assistant watching the market while you are away.
- It filters out the noise of normal trading activity and highlights anomalies and significant shifts.
- It contextualizes movements by analyzing sector correlation (distinguishing stock-specific drops from sector-wide moves).
- It connects stock volatility directly to your personal financial goals (identifying if a move affects short-term vs. long-term goals).
- It provides a seamless **Return Digest** summary whenever you check back in after time away.

## Core Features & Implementation

### 1. Return Digest Overlay
- **What I built:** A welcome summary popup that greets you when you return to the app after being away. It gives you a quick snapshot of key stock price changes and major market alerts that occurred while you were offline, so you don't have to check every stock manually.
- **How I made it:** Used a React `useEffect` hook to calculate the difference between the current time and the `lastSeenTimestamp` of the most recent alert. Managed state in `localStorage` (`lastDigestShown`) so it only triggers once per session.
- **Edge cases considered:** 
  - Prevents annoying the user on every tab switch by enforcing a 1-hour cooldown.
  - Ensures the digest *only* shows if there are actually items requiring attention (no empty, useless digests).
  - Added a slight mount delay to ensure smooth CSS transition animations without flashing on initial load.

### 2. Dynamic Sensitivity Engine
- **What I built:** A simple noise control filter (with Calm, Watchful, and Vigilant modes) that lets you choose how sensitive the app is to market moves. It allows you to decide whether you want alerts for only big, major shifts or for smaller price movements.
- **How I made it:** Built a deterministic scoring backend in `changeEngine.ts` that dynamically adjusts score multipliers and thresholds based on a `?sensitivity=` query parameter passed from the frontend.
- **Edge cases considered:** 
  - Different users have different risk appetites (day traders vs. long-term investors).
  - Ensured state persists across browser reloads via `localStorage`.
  - Backend gracefully handles invalid sensitivity values by falling back to the default "Watchful" mode.

### 3. Sector Correlation Context
- **What I built:** An informative card that compares a stock's movement with its industry peers. It tells you whether a stock's price drop is unique to that specific company or if the entire sector (like Tech or Banking) is dropping together.
- **How I made it:** Built a `GET /sector-context` endpoint that queries the database for all other watchlist stocks matching the target's `sector`. It calculates average sector movement to assign specific insight flags.
- **Edge cases considered:** 
  - What happens if a user only has one stock in a specific sector? The backend returns an empty peer array, and the UI handles this by simply not rendering the card rather than showing broken UI.
  - Handled missing sector metadata gracefully if the upstream API fails to provide it.

### 4. Personal Goal Impact Tracking
- **What I built:** A goal tracking module that connects stock price changes directly to your real-life financial goals (like buying a house, retirement, or an emergency fund). It tells you whether a stock drop puts your goal health at risk (`AT_RISK`, `NEEDS_REVIEW`, or `ON_TRACK`).
- **How I made it:** Built a `goalEngine.ts` service and Prisma schemas (`Goal`, `ChangeEvent`) with endpoints `POST /users/:userId/goals` and `GET /users/:userId/goals/impact`. It evaluates stock price volatility against target timelines and displays a **Goal Impact** card in the stock details drawer.
- **Edge cases considered:** 
  - Differentiates investment timelines: short-term goals (<1 year) flag market drops as high risk, whereas long-term goals (>5 years) treat short-term volatility as low risk or a potential buying opportunity.
  - Automatically seeds a default demo goal on first load so users see goal insights immediately without tedious setup.

### 5. Change History Timeline
- **What I built:** An organized timeline in the side panel that tracks past stock activity. It shows a clear history of when a stock triggered an alert, how significant the movement was, and why it was flagged over time.
- **How I made it:** Created a new SQLite table mapped via Prisma to store `ChangeHistoryEvent`. Exposed via a `GET /history` endpoint and rendered as a vertical timeline.
- **Edge cases considered:** 
  - Limited the backend payload to the 10 most recent events to prevent massive JSON payloads and UI lag.
  - Gracefully handles newly added stocks that have no history yet.

### 6. Live Stock Search Preview
- **What I built:** An instant search preview box that displays live stock prices and details as you type stock names in the search bar, allowing you to check stock info instantly before even pressing enter or adding it to your watchlist.
- **How I made it:** Implemented a 500ms debounced React `useEffect` that calls the `/live` Yahoo Finance wrapper endpoint while the user types.
- **Edge cases considered:** 
  - Throttling API calls via debouncing to prevent aggressive rate-limiting from the upstream market data provider.
  - Handled invalid ticker symbols gracefully by clearing the preview without throwing raw JavaScript errors to the user.

### 7. Hybrid AI & Deterministic Scoring
- **What I built:** An intelligent alert system that detects unusual price jumps and trading volumes, and then automatically uses AI to write short, simple explanations for why a stock is moving.
- **How I made it:** Calculates Z-scores deterministically. If a score exceeds the threshold, it triggers the Google Gemini 1.5 API to write a brief human-readable summary.
- **Edge cases considered:** 
  - AI APIs can timeout, fail, or run out of quota. Built a strict fallback mechanism where if Gemini fails (or if the API key is missing), the system instantly falls back to a deterministic string generator without breaking the UI or failing the request.

---

## Architecture

The application follows a **decoupled client-server architecture** with a modular backend.
<img width="6889" height="3433" alt="image" src="https://github.com/user-attachments/assets/db2d6f0f-c1d1-4e12-9ae3-1b7548d37879" />

  
## Tech Stack

### Frontend
- **Framework:** Next.js (App Router), React 18
- **Styling:** Tailwind CSS (Vanilla, highly customized design system)
- **Icons:** Lucide React
- **State Management:** React Hooks + LocalStorage for persistence

### Backend
- **Runtime:** Node.js + Express 5
- **Language:** TypeScript
- **Database:** PostgreSQL (via Prisma ORM) for scalable data persistence
- **External APIs:** Yahoo Finance (via `yahoo-finance2` for live market data)
- **AI Integration:** Google GenAI SDK (Gemini 1.5)

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### 1. Clone the repository
```bash
git clone https://github.com/Aayushi-raj/Smart-Watchlist-CodeByGroww.git
cd Smart-Watchlist-CodeByGroww
```

### 2. Backend Setup
```bash
cd backend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY (if available, otherwise it falls back to the deterministic engine)

# Initialize the SQLite database
npx prisma db push

# Start the backend server (runs on http://localhost:5000)
npm run dev
```

### 3. Frontend Setup
Open a new terminal window:
```bash
cd frontend
npm install

# Start the frontend server (runs on http://localhost:3000)
npm run dev
```

### OUTPUT
<img width="1260" height="589" alt="image" src="https://github.com/user-attachments/assets/036e220b-8c98-4b18-8bdc-c5dd7c885be6" />
<img width="1231" height="576" alt="image" src="https://github.com/user-attachments/assets/42cdc0e2-b6bb-4440-ba86-f0d9bf3bdd8f" />
<img width="1227" height="589" alt="image" src="https://github.com/user-attachments/assets/2e5fba93-aa51-4294-89db-0d87e312c600" />
<img width="1301" height="597" alt="image" src="https://github.com/user-attachments/assets/08dc9a8b-f3c6-4816-9ef8-5e9b37739884" />
<img width="1275" height="600" alt="image" src="https://github.com/user-attachments/assets/c40696c8-5183-4cc1-a454-9b4c0467bb57" />





---
*Built with ❤️ for Groww CODE 2026*
