import { PrismaClient } from '@prisma/client';
import yahooFinanceModule from 'yahoo-finance2';
const YF = (yahooFinanceModule as any).default || yahooFinanceModule;
const yahooFinance = new YF();

const prisma = new PrismaClient();

// Map generic symbols to Yahoo Finance Indian exchange symbols
const symbolMap: Record<string, string> = {
  'RELIANCE': 'RELIANCE.NS',
  'TCS': 'TCS.NS',
  'INFY': 'INFY.NS',
  'HDFCBANK': 'HDFCBANK.NS',
  'WIPRO': 'WIPRO.NS',
  'ZOMATO': 'ZOMATO.NS'
};

export async function ingestLiveMarketData() {
  const stocks = await prisma.stock.findMany();
  
  if (stocks.length === 0) {
      console.log('No stocks found to generate market data for.');
      return;
  }
  
  let successCount = 0;
  
  for (const stock of stocks) {
    const yahooSymbol = symbolMap[stock.symbol] || `${stock.symbol}.NS`;
    
    try {
      // Fetch live quote
      const quote = await yahooFinance.quote(yahooSymbol) as any;
      
      if (quote && quote.regularMarketPrice) {
        await prisma.marketSnapshot.create({
          data: {
            stockId: stock.id,
            price: quote.regularMarketPrice,
            volume: quote.regularMarketVolume || 500000,
            source: 'YAHOO_FINANCE',
            dataStatus: 'LIVE'
          }
        });
        successCount++;
      }
    } catch (error) {
      console.error(`Failed to fetch live data for ${stock.symbol}:`, error);
    }
  }
  
  // Graceful Fallback: If Yahoo Finance completely fails (rate limit, offline), use mock data
  if (successCount === 0) {
    console.warn('Yahoo Finance failed to fetch any data. Falling back to mock data engine.');
    await ingestMockMarketData();
  } else {
    console.log(`Ingested live market data for ${successCount} stocks.`);
  }
}

// Fallback Mock Service for the 72-hour hackathon MVP
export async function ingestMockMarketData() {
  const stocks = await prisma.stock.findMany();
  
  for (const stock of stocks) {
    // Generate some random fluctuation based on a hypothetical base price
    // But prefer the last known price if it exists
    const lastSnap = await prisma.marketSnapshot.findFirst({
        where: { stockId: stock.id },
        orderBy: { timestamp: 'desc' }
    });
    
    const basePrice = lastSnap ? lastSnap.price : (Math.random() * 2000 + 100);
    const fluctuation = (Math.random() - 0.5) * (basePrice * 0.1); // +/- 5% change
    const newPrice = Number((basePrice + fluctuation).toFixed(2));
    const volume = Math.floor(Math.random() * 1000000) + 50000;
    
    await prisma.marketSnapshot.create({
      data: {
        stockId: stock.id,
        price: newPrice,
        volume: volume,
        source: 'MOCK_PROVIDER',
        dataStatus: 'DELAYED'
      }
    });
  }
  console.log(`Ingested mock fallback data for ${stocks.length} stocks.`);
}
