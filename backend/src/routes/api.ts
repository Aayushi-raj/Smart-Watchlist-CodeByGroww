import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { computeMeaningfulChange } from '../services/changeEngine';
import { ingestLiveMarketData } from '../services/marketData';
import { getUserGoalImpacts } from '../services/goalEngine';
import yahooFinanceModule from 'yahoo-finance2';

const YF = (yahooFinanceModule as any).default || yahooFinanceModule;
const yahooFinance = new YF();

const router = Router();
const prisma = new PrismaClient();

// ==============================
// AUTH / USERS (Mock for MVP)
// ==============================

router.post('/auth/login', async (req, res) => {
  const { email, name } = req.body;
  let user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    user = await prisma.user.create({ data: { email, name } });
  }
  
  res.json({ user, token: 'mock-jwt-token' });
});


// ==============================
// WATCHLISTS
// ==============================

// Create Watchlist
router.post('/watchlists', async (req, res) => {
  const { userId, name } = req.body;
  const watchlist = await prisma.watchlist.create({
    data: { userId, name }
  });
  res.json(watchlist);
});

// Get User Watchlists
router.get('/watchlists/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const watchlists = await prisma.watchlist.findMany({
    where: { userId },
    include: {
      stocks: { include: { stock: true } }
    }
  });
  res.json(watchlists);
});

// Get User Watchlist with LIVE data directly from Yahoo Finance
router.get('/users/:userId/watchlist/live', async (req, res) => {
  const { userId } = req.params;
  try {
    const watchlists = await prisma.watchlist.findMany({
      where: { userId },
      include: {
        stocks: { include: { stock: true } }
      }
    });

    if (watchlists.length === 0) {
      return res.json([]);
    }

    // Use the first watchlist
    const watchlist = watchlists[0];
    const liveStocks = [];

    for (const ws of watchlist.stocks) {
      const stock = ws.stock;
      let yahooSymbol = `${stock.symbol.toUpperCase().replace(/\s+/g, '')}.NS`;
      let quote: any = null;

      console.log(`[LIVE] Fetching quote for ${yahooSymbol}...`);
      try {
        quote = await yahooFinance.quote(yahooSymbol) as any;
      } catch (e) {
        // Ignored, fallback will handle it
      }

      if (quote && quote.regularMarketPrice) {
        console.log(`[LIVE] Found direct quote for ${yahooSymbol}`);
      } else {
        console.log(`[LIVE] Direct quote failed for ${yahooSymbol}, trying search fallback for "${stock.companyName || stock.symbol}"`);
        try {
          const searchRes = await yahooFinance.search(stock.companyName || stock.symbol);
          if (searchRes.quotes.length > 0) {
            yahooSymbol = searchRes.quotes[0].symbol;
            console.log(`[LIVE] Search found symbol: ${yahooSymbol}`);
            quote = await yahooFinance.quote(yahooSymbol) as any;
            if (quote && quote.regularMarketPrice) {
              console.log(`[LIVE] Search fallback quote succeeded for ${yahooSymbol}`);
            }
          } else {
            console.log(`[LIVE] Search found no quotes for ${stock.companyName || stock.symbol}`);
          }
        } catch(err) {
          console.error(`[LIVE] Search fallback error for ${stock.symbol}:`, err);
        }
      }

      if (quote) {
         liveStocks.push({
           id: stock.id,
           symbol: stock.symbol,
           companyName: stock.companyName,
           price: quote.regularMarketPrice || 0,
           dayChange: quote.regularMarketChange || 0,
           dayChangePercent: quote.regularMarketChangePercent || 0,
           volume: quote.regularMarketVolume || 0,
           fiftyTwoWeekLow: quote.fiftyTwoWeekLow || 0,
           fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || 0,
         });
      } else {
         console.log(`[LIVE] Fallback to 0s for ${stock.symbol} due to no quote`);
         liveStocks.push({
           id: stock.id,
           symbol: stock.symbol,
           companyName: stock.companyName,
           price: 0, dayChange: 0, dayChangePercent: 0, volume: 0, fiftyTwoWeekLow: 0, fiftyTwoWeekHigh: 0
         });
      }
    }

    res.json(liveStocks);
  } catch (error) {
    console.error("Failed to fetch live watchlist:", error);
    res.status(500).json({ error: "Failed to fetch live watchlist" });
  }
});

// Add Stock to Watchlist by Symbol
router.post('/users/:userId/watchlist/stocks', async (req, res) => {
  const { userId } = req.params;
  const { symbol } = req.body;

  try {
    // 1. Get or create user watchlist
    let watchlists = await prisma.watchlist.findMany({ where: { userId } });
    if (watchlists.length === 0) {
      const newWl = await prisma.watchlist.create({ data: { userId, name: "My Watchlist" } });
      watchlists = [newWl];
    }
    const watchlistId = watchlists[0].id;

    // 2. Fetch from Yahoo Finance to verify and get company name
    let yahooSymbol = `${symbol.toUpperCase().replace(/\s+/g, '')}.NS`;
    let quote: any = null;
    
    if (symbol.includes(' ')) {
      const searchRes = await yahooFinance.search(symbol);
      if (searchRes.quotes.length > 0) {
        yahooSymbol = searchRes.quotes[0].symbol;
      }
    }

    try {
      quote = await yahooFinance.quote(yahooSymbol) as any;
    } catch (e) {
    }

    if (!quote || !quote.regularMarketPrice) {
      const searchRes = await yahooFinance.search(symbol);
      if (searchRes.quotes.length > 0) {
        yahooSymbol = searchRes.quotes[0].symbol;
        quote = await yahooFinance.quote(yahooSymbol) as any;
      }
    }

    if (!quote || !quote.regularMarketPrice) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const cleanSymbol = quote.shortName || symbol.toUpperCase();

    // 3. Upsert Stock in DB
    const stock = await prisma.stock.upsert({
      where: { symbol: cleanSymbol },
      update: {},
      create: {
        symbol: cleanSymbol,
        companyName: quote.longName || cleanSymbol,
        exchange: 'NSE',
        sector: quote.sector || 'Unknown'
      }
    });

    // 4. Add to WatchlistStock mapping (ignore if already added)
    const existingEntry = await prisma.watchlistStock.findUnique({
      where: { watchlistId_stockId: { watchlistId, stockId: stock.id } }
    });
    
    let added = existingEntry;
    if (!existingEntry) {
      added = await prisma.watchlistStock.create({
        data: { watchlistId, stockId: stock.id }
      });
    }

    // 5. Store current market price as initial snapshot
    const price = quote.regularMarketPrice;
    await prisma.marketSnapshot.create({
      data: {
        stockId: stock.id,
        price,
        volume: quote.regularMarketVolume || 0,
        source: 'YAHOO_FINANCE',
        dataStatus: 'LIVE'
      }
    });

    // 6. Update or Create the Last Seen State
    await prisma.userStockState.upsert({
      where: { userId_stockId: { userId, stockId: stock.id } },
      update: { lastSeenPrice: price, lastSeenTimestamp: new Date() },
      create: { userId, stockId: stock.id, lastSeenPrice: price, lastSeenTimestamp: new Date() }
    });

    res.json({ success: true, stock, added });
  } catch (error) {
    console.error(`Failed to add stock ${symbol}:`, error);
    res.status(500).json({ error: "Failed to add stock" });
  }
});

// ==============================
// SMART WATCHLIST ENGINE
// ==============================

// Trigger Market Movement (Live or Fallback)
router.post('/debug/market-tick', async (req, res) => {
  await ingestLiveMarketData();
  res.json({ success: true, message: 'Market data updated.' });
});

// Create a Goal (or get existing if name matches)
router.post('/users/:userId/goals', async (req, res) => {
  const { userId } = req.params;
  const { name, horizonDays, targetAmount } = req.body;
  
  let goal = await prisma.goal.findFirst({
    where: { userId, name }
  });

  if (!goal) {
    goal = await prisma.goal.create({
      data: { userId, name, horizonDays, targetAmount }
    });
  }
  
  res.json({ success: true, goal });
});

// Get Goal Impacts
router.get('/users/:userId/goals/impact', async (req, res) => {
  const { userId } = req.params;
  const impacts = await getUserGoalImpacts(userId);
  res.json(impacts);
});

// Get Meaningful Changes for User Dashboard
router.get('/users/:userId/dashboard/changes', async (req, res) => {
  const { userId } = req.params;
  const changes = await computeMeaningfulChange(userId);
  
  // Categorize changes
  const attention = changes.filter(c => c.severity === 'ATTENTION' || c.severity === 'SIGNIFICANT_CHANGE');
  const worthKnowing = changes.filter(c => c.severity === 'WORTH_KNOWING');

  // Update user's last seen state since they are checking the dashboard now
  for (const change of changes) {
      await prisma.userStockState.update({
          where: { userId_stockId: { userId: userId, stockId: change.stock.id } },
          data: {
              lastSeenPrice: change.latestSnapshot.price,
              lastSeenTimestamp: new Date()
          }
      });
  }

  res.json({
    summary: {
      totalChanges: attention.length + worthKnowing.length,
      attentionCount: attention.length,
      worthKnowingCount: worthKnowing.length
    },
    attention,
    worthKnowing,
  });
});

// Get Live Quote for a specific symbol on demand (for frontend additions)
router.get('/stocks/:symbol/live', async (req, res) => {
  const { symbol } = req.params;
  try {
    let yahooSymbol = `${symbol.toUpperCase().replace(/\s+/g, '')}.NS`; // Try NSE first

    // If there are spaces, or as a fallback, we can use search
    if (symbol.includes(' ')) {
      const searchRes = await yahooFinance.search(symbol);
      if (searchRes.quotes.length > 0) {
        yahooSymbol = searchRes.quotes[0].symbol;
      }
    }

    let quote = null;
    try {
      quote = await yahooFinance.quote(yahooSymbol) as any;
    } catch (e) {
      // If direct NSE fetch fails, do a search fallback
      const searchRes = await yahooFinance.search(symbol);
      if (searchRes.quotes.length > 0) {
        yahooSymbol = searchRes.quotes[0].symbol;
        quote = await yahooFinance.quote(yahooSymbol) as any;
      }
    }
    
    if (quote && quote.regularMarketPrice) {
      res.json({
        symbol: quote.shortName || symbol.toUpperCase(),
        price: quote.regularMarketPrice,
        volume: quote.regularMarketVolume || 'Unknown'
      });
    } else {
      res.status(404).json({ error: 'Quote not found' });
    }
  } catch (error) {
    console.error(`Failed to fetch live quote for ${symbol}:`, error);
    res.status(500).json({ error: 'Failed to fetch live quote' });
  }
});

export default router;
