import prisma from '../db';
import yahooFinance from '../lib/yahooFinance';
import { getNSEMarketStatus } from '../lib/marketHours';

const YAHOO_FETCH_TIMEOUT_MS = 7000;

// Map generic symbols to Yahoo Finance Indian exchange symbols
const symbolMap: Record<string, string> = {
  RELIANCE: 'RELIANCE.NS',
  TCS: 'TCS.NS',
  INFY: 'INFY.NS',
  HDFCBANK: 'HDFCBANK.NS',
  WIPRO: 'WIPRO.NS',
  ZOMATO: 'ZOMATO.NS',
};

/**
 * Fetches a Yahoo Finance quote with a hard timeout.
 * Returns null on timeout or error instead of hanging the event loop.
 */
async function fetchQuoteWithTimeout(symbol: string): Promise<any | null> {
  try {
    const result = await Promise.race([
      (yahooFinance as any).quote(symbol),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), YAHOO_FETCH_TIMEOUT_MS)
      ),
    ]);
    return result;
  } catch {
    return null;
  }
}

export async function ingestLiveMarketData() {
  const marketStatus = getNSEMarketStatus();
  const stocks = await prisma.stock.findMany();

  if (stocks.length === 0) {
    console.log('[MarketData] No stocks to update.');
    return;
  }

  if (!marketStatus.isOpen) {
    console.warn(`[MarketData] Market closed: ${marketStatus.reason}. Using last known prices.`);
    // Still create snapshots with correct dataStatus so the UI can show the badge
    await markSnapshotsStale(stocks, marketStatus.dataStatus);
    return;
  }

  // Fetch all stocks in parallel with individual timeouts
  const results = await Promise.allSettled(
    stocks.map(async (stock) => {
      const yahooSymbol = symbolMap[stock.symbol] ?? `${stock.symbol}.NS`;
      const quote = await fetchQuoteWithTimeout(yahooSymbol);

      if (quote && quote.regularMarketPrice) {
        await prisma.marketSnapshot.create({
          data: {
            stockId: stock.id,
            price: quote.regularMarketPrice,
            volume: quote.regularMarketVolume || 0,
            source: 'YAHOO_FINANCE',
            dataStatus: marketStatus.dataStatus,
          },
        });
        return { symbol: stock.symbol, ok: true };
      }
      return { symbol: stock.symbol, ok: false };
    })
  );

  const successes = results.filter(r => r.status === 'fulfilled' && (r.value as any)?.ok).length;
  const failures  = results.length - successes;

  console.log(`[MarketData] Live ingest complete: ${successes} succeeded, ${failures} failed.`);

  if (successes === 0) {
    console.warn('[MarketData] All Yahoo Finance calls failed. Falling back to mock data.');
    await ingestMockMarketData();
  }
}

/**
 * Creates a snapshot entry pointing to the most recent price but tagged with
 * the given dataStatus so the UI can display a "Market closed" badge.
 */
async function markSnapshotsStale(
  stocks: { id: string; symbol: string }[],
  dataStatus: string
) {
  await Promise.all(
    stocks.map(async (stock) => {
      const lastSnap = await prisma.marketSnapshot.findFirst({
        where: { stockId: stock.id },
        orderBy: { timestamp: 'desc' },
      });
      if (lastSnap) {
        await prisma.marketSnapshot.create({
          data: {
            stockId: stock.id,
            price: lastSnap.price,
            volume: lastSnap.volume,
            source: lastSnap.source,
            dataStatus,
          },
        });
      }
    })
  );
}

/**
 * Fallback: generates realistic price fluctuations based on the last known price.
 * Only used when Yahoo Finance is completely unreachable.
 */
export async function ingestMockMarketData() {
  const stocks = await prisma.stock.findMany();

  await Promise.all(
    stocks.map(async (stock) => {
      const lastSnap = await prisma.marketSnapshot.findFirst({
        where: { stockId: stock.id },
        orderBy: { timestamp: 'desc' },
      });

      const basePrice = lastSnap ? lastSnap.price : Math.random() * 2000 + 100;
      const fluctuation = (Math.random() - 0.5) * (basePrice * 0.06); // ±3%
      const newPrice = Number((basePrice + fluctuation).toFixed(2));
      const volume = Math.floor(Math.random() * 1_000_000) + 50_000;

      await prisma.marketSnapshot.create({
        data: {
          stockId: stock.id,
          price: newPrice,
          volume,
          source: 'MOCK_PROVIDER',
          dataStatus: 'DELAYED',
        },
      });
    })
  );

  console.log(`[MarketData] Mock fallback data ingested for ${stocks.length} stocks.`);
}

/**
 * Prune MarketSnapshot rows older than 30 days to prevent unbounded table growth.
 */
export async function pruneOldSnapshots() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await prisma.marketSnapshot.deleteMany({
    where: { timestamp: { lt: cutoff } },
  });
  console.log(`[MarketData] Pruned ${result.count} old snapshots.`);
}
