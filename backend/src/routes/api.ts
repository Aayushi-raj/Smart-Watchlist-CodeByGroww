import { Router, Request, Response } from 'express';
import prisma from '../db';
import yahooFinance from '../lib/yahooFinance';
import { getNSEMarketStatus } from '../lib/marketHours';
import { computeMeaningfulChange, Sensitivity } from '../services/changeEngine';
import { ingestLiveMarketData, pruneOldSnapshots } from '../services/marketData';
import { getUserGoalImpacts } from '../services/goalEngine';
import { generateInsightForEvent } from '../services/insightEngine';

const router = Router();

/** Express 5 types req.params values as string | string[]. This helper narrows to string. */
const p = (val: string | string[]): string => (Array.isArray(val) ? val[0] : val);

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────

/** Safely fetch a Yahoo Finance quote with timeout + search fallback */
async function resolveYahooQuote(rawSymbol: string, fallbackName?: string): Promise<any | null> {
  const TIMEOUT = 7000;

  const tryQuote = async (sym: string): Promise<any | null> => {
    try {
      const q = await Promise.race([
        (yahooFinance as any).quote(sym),
        new Promise<null>((_, r) => setTimeout(() => r(new Error('Timeout')), TIMEOUT)),
      ]) as any;
      return q?.regularMarketPrice ? q : null;
    } catch {
      return null;
    }
  };

  const trySearch = async (term: string): Promise<string | null> => {
    try {
      const res = await (yahooFinance as any).search(term);
      return res?.quotes?.[0]?.symbol ?? null;
    } catch {
      return null;
    }
  };

  // 1. Try direct NSE symbol
  const direct = `${rawSymbol.toUpperCase().replace(/\s+/g, '')}.NS`;
  let q = await tryQuote(direct);
  if (q) return q;

  // 2. Search fallback
  const searchTerm = fallbackName || rawSymbol;
  const foundSymbol = await trySearch(searchTerm);
  if (foundSymbol) {
    q = await tryQuote(foundSymbol);
    if (q) return q;
  }

  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// AUTH / USERS  (mock session — no real JWT for hackathon)
// ──────────────────────────────────────────────────────────────────────────────

router.post('/auth/login', async (req: Request, res: Response) => {
  const { email, name } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email is required' });
  }

  // Use upsert to avoid race condition between findUnique + create
  const user = await prisma.user.upsert({
    where: { email },
    update: { name: name || undefined },
    create: { email, name: name || 'User' },
  });

  res.json({ user, token: 'mock-jwt-token' });
});

// ──────────────────────────────────────────────────────────────────────────────
// WATCHLISTS
// ──────────────────────────────────────────────────────────────────────────────

router.post('/watchlists', async (req: Request, res: Response) => {
  const { userId, name } = req.body;
  if (!userId || !name) {
    return res.status(400).json({ error: 'userId and name are required' });
  }
  const watchlist = await prisma.watchlist.create({ data: { userId, name } });
  res.json(watchlist);
});

router.get('/watchlists/user/:userId', async (req: Request, res: Response) => {
  const userId = p(req.params.userId);
  const watchlists = await prisma.watchlist.findMany({
    where: { userId },
    include: { stocks: { include: { stock: true } } },
  });
  res.json(watchlists);
});

// ──────────────────────────────────────────────────────────────────────────────
// LIVE WATCHLIST FEED
// ──────────────────────────────────────────────────────────────────────────────

router.get('/users/:userId/watchlist/live', async (req: Request, res: Response) => {
  const userId = p(req.params.userId);
  const marketStatus = getNSEMarketStatus();

  try {
    const watchlists = await prisma.watchlist.findMany({
      where: { userId },
      include: { stocks: { include: { stock: true } } },
    });

    if (watchlists.length === 0) return res.json([]);

    const watchlist = watchlists[0];

    // Fetch all quotes in parallel
    const liveStocks = await Promise.all(
      watchlist.stocks.map(async (ws) => {
        const stock = ws.stock;
        const quote = await resolveYahooQuote(stock.symbol, stock.companyName);

        // Also get last snapshot for dataStatus context
        const lastSnap = await prisma.marketSnapshot.findFirst({
          where: { stockId: stock.id },
          orderBy: { timestamp: 'desc' },
        });

        const dataStatus = lastSnap?.dataStatus ?? marketStatus.dataStatus;

        if (quote) {
          return {
            id: stock.id,
            symbol: stock.symbol,
            companyName: stock.companyName,
            sector: stock.sector,
            price: quote.regularMarketPrice || 0,
            dayChange: quote.regularMarketChange || 0,
            dayChangePercent: quote.regularMarketChangePercent || 0,
            volume: quote.regularMarketVolume || 0,
            fiftyTwoWeekLow: quote.fiftyTwoWeekLow || 0,
            fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || 0,
            dataStatus,
            marketStatus: marketStatus.reason,
          };
        }

        // Fallback to last snapshot price if live fetch fails
        return {
          id: stock.id,
          symbol: stock.symbol,
          companyName: stock.companyName,
          sector: stock.sector,
          price: lastSnap?.price || 0,
          dayChange: 0,
          dayChangePercent: 0,
          volume: lastSnap?.volume || 0,
          fiftyTwoWeekLow: 0,
          fiftyTwoWeekHigh: 0,
          dataStatus: 'STALE',
          marketStatus: 'Data unavailable',
        };
      })
    );

    res.json(liveStocks);
  } catch (error) {
    console.error('[API] Failed to fetch live watchlist:', error);
    res.status(500).json({ error: 'Failed to fetch live watchlist' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// ADD STOCK TO WATCHLIST
// ──────────────────────────────────────────────────────────────────────────────

router.post('/users/:userId/watchlist/stocks', async (req: Request, res: Response) => {
  const userId = p(req.params.userId);
  const { symbol } = req.body;

  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({ error: 'symbol is required' });
  }

  const cleanInput = symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!cleanInput) {
    return res.status(400).json({ error: 'Invalid symbol' });
  }

  try {
    // Get or create watchlist
    let watchlists = await prisma.watchlist.findMany({ where: { userId } });
    if (watchlists.length === 0) {
      const wl = await prisma.watchlist.create({ data: { userId, name: 'My Watchlist' } });
      watchlists = [wl];
    }
    const watchlistId = watchlists[0].id;

    // Resolve quote
    const quote = await resolveYahooQuote(cleanInput);
    if (!quote) {
      return res.status(404).json({ error: `Could not find a valid quote for "${cleanInput}"` });
    }

    const resolvedSymbol = quote.symbol?.replace('.NS', '') || cleanInput;
    const marketStatus = getNSEMarketStatus();

    // Upsert stock record
    const stock = await prisma.stock.upsert({
      where: { symbol: resolvedSymbol },
      update: {},
      create: {
        symbol: resolvedSymbol,
        companyName: quote.longName || quote.shortName || resolvedSymbol,
        exchange: 'NSE',
        sector: quote.sector || 'Unknown',
      },
    });

    // Add to watchlist (idempotent)
    const existing = await prisma.watchlistStock.findUnique({
      where: { watchlistId_stockId: { watchlistId, stockId: stock.id } },
    });
    if (!existing) {
      await prisma.watchlistStock.create({ data: { watchlistId, stockId: stock.id } });
    }

    // Store initial snapshot
    const price = quote.regularMarketPrice;
    await prisma.marketSnapshot.create({
      data: {
        stockId: stock.id,
        price,
        volume: quote.regularMarketVolume || 0,
        source: 'YAHOO_FINANCE',
        dataStatus: marketStatus.dataStatus,
      },
    });

    // Set last-seen state to the current price (baseline)
    await prisma.userStockState.upsert({
      where: { userId_stockId: { userId, stockId: stock.id } },
      update: { lastSeenPrice: price, lastSeenTimestamp: new Date() },
      create: { userId, stockId: stock.id, lastSeenPrice: price, lastSeenTimestamp: new Date() },
    });

    res.json({ success: true, stock, alreadyExists: !!existing });
  } catch (error) {
    console.error(`[API] Failed to add stock "${cleanInput}":`, error);
    res.status(500).json({ error: 'Failed to add stock' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// DELETE STOCK FROM WATCHLIST
// ──────────────────────────────────────────────────────────────────────────────

router.delete('/users/:userId/watchlist/stocks/:stockId', async (req: Request, res: Response) => {
  const userId  = p(req.params.userId);
  const stockId = p(req.params.stockId);

  try {
    // Find the user's watchlist
    const watchlist = await prisma.watchlist.findFirst({ where: { userId } });
    if (!watchlist) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }

    await prisma.watchlistStock.deleteMany({
      where: { watchlistId: watchlist.id, stockId },
    });

    // Also clean up the last-seen state for this user-stock pair
    await prisma.userStockState.deleteMany({
      where: { userId, stockId },
    });

    res.json({ success: true });
  } catch (error) {
    console.error(`[API] Failed to delete stock ${stockId}:`, error);
    res.status(500).json({ error: 'Failed to remove stock' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// SMART WATCHLIST ENGINE — MEANINGFUL CHANGES DASHBOARD
// ──────────────────────────────────────────────────────────────────────────────

router.get('/users/:userId/dashboard/changes', async (req: Request, res: Response) => {
  const userId = p(req.params.userId);
  const sensitivity = (req.query.sensitivity as Sensitivity) || 'WATCHFUL';

  try {
    const changes = await computeMeaningfulChange(userId, sensitivity);
    const marketStatus = getNSEMarketStatus();

    const attention    = changes.filter(c => c.severity === 'ATTENTION' || c.severity === 'SIGNIFICANT_CHANGE');
    const worthKnowing = changes.filter(c => c.severity === 'WORTH_KNOWING');

    // Get the total count of stocks in this user's watchlist (for accurate "normal" count)
    const totalInWatchlist = await prisma.userStockState.count({ where: { userId } });

    // ── Generate AI insights for attention-level changes ──────────────────────
    const changesWithInsights = await Promise.all(
      changes.map(async (change) => {
        if (!change.changeEventId || change.severity === 'WORTH_KNOWING') {
          return { ...change, insight: null };
        }

        // Fetch the full ChangeEvent record to pass to insight engine
        const changeEvent = await prisma.changeEvent.findUnique({
          where: { id: change.changeEventId },
          include: { stock: true },
        });

        if (!changeEvent) return { ...change, insight: null };

        try {
          const insight = await generateInsightForEvent(changeEvent, {
            percentageChange: change.percentageChange,
            absoluteChange: change.absoluteChange,
            lastSeenTimestamp: change.lastSeenTimestamp,
            volume: change.latestSnapshot.volume,
            score: change.score,
          });
          return { ...change, insight };
        } catch {
          return { ...change, insight: null };
        }
      })
    );

    // ── Update last-seen state atomically for all changed stocks ─────────────
    if (changes.length > 0) {
      await prisma.$transaction(
        changes.map(change =>
          prisma.userStockState.update({
            where: { userId_stockId: { userId, stockId: change.stock.id } },
            data: {
              lastSeenPrice: change.latestSnapshot.price,
              lastSeenTimestamp: new Date(),
            },
          })
        )
      );
    }

    // Separate attention vs worthKnowing from changesWithInsights
    const attentionWithInsights    = changesWithInsights.filter(c => c.severity === 'ATTENTION' || c.severity === 'SIGNIFICANT_CHANGE');
    const worthKnowingWithInsights = changesWithInsights.filter(c => c.severity === 'WORTH_KNOWING');

    res.json({
      marketStatus,
      summary: {
        totalChanges:    changes.length,
        attentionCount:  attention.length,
        worthKnowingCount: worthKnowing.length,
        normalCount:     Math.max(0, totalInWatchlist - changes.length),
        totalInWatchlist,
      },
      attention:    attentionWithInsights,
      worthKnowing: worthKnowingWithInsights,
    });
  } catch (error) {
    console.error('[API] Failed to compute dashboard changes:', error);
    res.status(500).json({ error: 'Failed to compute changes' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GOALS
// ──────────────────────────────────────────────────────────────────────────────

router.post('/users/:userId/goals', async (req: Request, res: Response) => {
  const userId = p(req.params.userId);
  const { name, horizonDays, targetAmount } = req.body;

  if (!name || !horizonDays || !targetAmount) {
    return res.status(400).json({ error: 'name, horizonDays and targetAmount are required' });
  }

  const goal = await prisma.goal.upsert({
    where: { userId_name: { userId, name } } as any,
    update: {},
    create: { userId, name, horizonDays: Number(horizonDays), targetAmount: Number(targetAmount) },
  });

  res.json({ success: true, goal });
});

router.get('/users/:userId/goals/impact', async (req: Request, res: Response) => {
  const userId = p(req.params.userId);
  const impacts = await getUserGoalImpacts(userId);
  res.json(impacts);
});

// ──────────────────────────────────────────────────────────────────────────────
// CHANGE HISTORY — per-stock event timeline
// ──────────────────────────────────────────────────────────────────────────────

router.get('/users/:userId/stocks/:stockId/history', async (req: Request, res: Response) => {
  const stockId = p(req.params.stockId);

  try {
    const events = await prisma.changeEvent.findMany({
      where: { stockId },
      orderBy: { detectedAt: 'desc' },
      take: 10,
      include: {
        stock: { select: { symbol: true, companyName: true } },
        insights: { select: { summary: true, modelVersion: true } },
      },
    });

    res.json(events);
  } catch (error) {
    console.error('[API] Failed to fetch stock history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// SECTOR CORRELATION — other stocks in same sector from user's watchlist
// ──────────────────────────────────────────────────────────────────────────────

router.get('/users/:userId/sector-context', async (req: Request, res: Response) => {
  const userId  = p(req.params.userId);
  const stockId = req.query.stockId as string;

  if (!stockId) return res.status(400).json({ error: 'stockId query param required' });

  try {
    // Get the target stock's sector
    const targetStock = await prisma.stock.findUnique({ where: { id: stockId } });
    if (!targetStock) return res.status(404).json({ error: 'Stock not found' });

    if (!targetStock.sector || targetStock.sector === 'Unknown') {
      return res.json({ sector: null, peers: [] });
    }

    // Find all other stocks in the same sector within this user's watchlists
    const watchlist = await prisma.watchlist.findFirst({ where: { userId } });
    if (!watchlist) return res.json({ sector: targetStock.sector, peers: [] });

    const peerEntries = await prisma.watchlistStock.findMany({
      where: {
        watchlistId: watchlist.id,
        stock: { sector: targetStock.sector },
        stockId: { not: stockId }, // exclude the stock itself
      },
      include: {
        stock: {
          include: {
            snapshots: {
              orderBy: { timestamp: 'desc' },
              take: 2,
            },
          },
        },
      },
    });

    const peers = peerEntries.map(pe => {
      const snaps   = pe.stock.snapshots;
      const latest  = snaps[0];
      const prev    = snaps[1];
      const dayChangePct = latest && prev && prev.price > 0
        ? ((latest.price - prev.price) / prev.price) * 100
        : 0;
      return {
        id:          pe.stock.id,
        symbol:      pe.stock.symbol,
        companyName: pe.stock.companyName,
        price:       latest?.price ?? 0,
        dayChangePct,
        dataStatus:  latest?.dataStatus ?? 'STALE',
      };
    });

    // Determine if this is sector-wide or company-specific
    const movingDown  = peers.filter(p => p.dayChangePct < -0.5).length;
    const movingUp    = peers.filter(p => p.dayChangePct > 0.5).length;
    const isSectorWide = peers.length > 0 &&
      (movingDown >= Math.ceil(peers.length * 0.6) ||
       movingUp   >= Math.ceil(peers.length * 0.6));

    res.json({
      sector: targetStock.sector,
      peers,
      isSectorWide,
      sectorSignal: isSectorWide
        ? (movingDown > movingUp ? 'SECTOR_WIDE_DECLINE' : 'SECTOR_WIDE_RALLY')
        : 'COMPANY_SPECIFIC',
    });
  } catch (error) {
    console.error('[API] Failed to fetch sector context:', error);
    res.status(500).json({ error: 'Failed to fetch sector context' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// USER SETTINGS  (stored client-side via this lightweight endpoint for logging)
// ──────────────────────────────────────────────────────────────────────────────

router.get('/users/:userId/settings', async (req: Request, res: Response) => {
  // Settings are managed on the client (localStorage) for hackathon simplicity.
  // This endpoint exists as a stub for future server-side persistence.
  res.json({ sensitivity: 'WATCHFUL' });
});

// ──────────────────────────────────────────────────────────────────────────────
// MARKET OPERATIONS
// ──────────────────────────────────────────────────────────────────────────────

router.post('/debug/market-tick', async (req: Request, res: Response) => {
  await ingestLiveMarketData();
  res.json({ success: true, message: 'Market data updated.', marketStatus: getNSEMarketStatus() });
});

router.post('/debug/prune-snapshots', async (req: Request, res: Response) => {
  await pruneOldSnapshots();
  res.json({ success: true, message: 'Old snapshots pruned.' });
});

// Live quote for a single symbol (used by stock-search)
router.get('/stocks/:symbol/live', async (req: Request, res: Response) => {
  const symbol = p(req.params.symbol);
  try {
    const quote = await resolveYahooQuote(symbol);
    if (quote) {
      res.json({
        symbol: quote.symbol,
        companyName: quote.longName || quote.shortName || symbol,
        price: quote.regularMarketPrice,
        volume: quote.regularMarketVolume || 0,
        dayChange: quote.regularMarketChange || 0,
        dayChangePercent: quote.regularMarketChangePercent || 0,
      });
    } else {
      res.status(404).json({ error: 'Quote not found' });
    }
  } catch (error) {
    console.error(`[API] Live quote error for ${symbol}:`, error);
    res.status(500).json({ error: 'Failed to fetch live quote' });
  }
});

// Market status endpoint
router.get('/market/status', (_req: Request, res: Response) => {
  res.json(getNSEMarketStatus());
});

export default router;
