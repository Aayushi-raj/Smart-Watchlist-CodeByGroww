# Smart Market Watchlist - Groww CODE 2026

![Smart Market Watchlist](https://img.shields.io/badge/Groww-CODE_2026-00d09c?style=for-the-badge)

A next-generation market tracking application designed to help users quickly understand what has "meaningfully changed" since they last checked, ensuring their attention is directed exactly where it matters most.

Built as a submission for the **Groww CODE 2026** competition.

## 🚀 The Vision

Traditional watchlists are static—they show you the current price and a red or green number, leaving the user to figure out if that number is actually important. 

**Smart Market Watchlist** flips this paradigm. It acts as an intelligent assistant that watches the market while you are away, filtering out the noise of normal trading activity and highlighting only the anomalies, significant shifts, and contextually relevant changes.

## ✨ Competition-Winning Features

1. **Return Digest Overlay**
   - **What it is:** A dynamic, full-screen summary that greets you when you return to the app after being away for more than an hour.
   - **Why it matters:** It instantly answers the question: "What happened while I was gone?" without making you scroll through a table.

2. **User Sensitivity Preferences**
   - **What it is:** A toggle to adjust the noise level of the platform:
     - 🟢 **Calm**: Only alerts on massive >5% moves (ideal for long-term investors).
     - 🟡 **Watchful**: The default, balanced mode (>3% moves).
     - 🔴 **Vigilant**: Alerts on minor >0.5% moves (ideal for active day-traders).
   - **Why it matters:** Different users have different risk appetites. The engine dynamically adjusts its threshold logic based on this state.

3. **Change History Timeline**
   - **What it is:** A dedicated timeline for each stock showing a history of when it was flagged, its anomaly score, and severity.
   - **Why it matters:** Proves the system tracks behavioral patterns over time, identifying recurring volatility rather than just a single day's drop.

4. **Sector Correlation Context**
   - **What it is:** Analyzes the stock's movement relative to its sector peers in your watchlist.
   - **Why it matters:** Automatically identifies if a price drop is a "Company-Specific Move" or a "Sector-Wide Decline," giving instant macroeconomic context to microeconomic movements.

5. **Live Stock Search Preview**
   - **What it is:** A highly polished, debounced search experience that provides a live quote card (real-time price and day change) before you even add a stock to your watchlist.

6. **Hybrid AI & Deterministic Engine**
   - **What it is:** Uses a deterministic scoring system (evaluating price, volume spikes, and 52-week ranges) paired with a fallback to Google's Gemini AI to generate human-readable insights for extreme anomalies.

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js (App Router), React 18
- **Styling:** Tailwind CSS (Vanilla, highly customized design system)
- **Icons:** Lucide React
- **State Management:** React Hooks + LocalStorage for persistence

### Backend
- **Runtime:** Node.js + Express 5
- **Language:** TypeScript
- **Database:** SQLite (via Prisma ORM) for localized, fast data persistence
- **External APIs:** Yahoo Finance (via `yahoo-finance2` for live market data)
- **AI Integration:** Google GenAI SDK (Gemini 1.5)

## ⚙️ Getting Started

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

## 📐 Architecture highlights
- **Centralized Database Instance:** Uses a singleton Prisma client to prevent connection exhaustion during hot-reloads.
- **Robust Error Handling:** Express 5's native promise rejection handling combined with custom error wrappers ensures the server never crashes on bad API data.
- **Stateless Scoring Engine:** The `changeEngine.ts` computes "Meaningful Change Scores" deterministically on the fly, ensuring fast response times without database bloat.

---
*Built with ❤️ for Groww CODE 2026*
