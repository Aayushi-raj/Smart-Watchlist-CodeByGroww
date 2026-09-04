import { PrismaClient, Stock, MarketSnapshot } from '@prisma/client';

const prisma = new PrismaClient();

export interface MeaningfulChangeResult {
  stock: Stock;
  percentageChange: number;
  score: number;
  severity: 'NO_CHANGE' | 'WORTH_KNOWING' | 'ATTENTION' | 'SIGNIFICANT_CHANGE';
  latestSnapshot: MarketSnapshot;
}

export async function computeMeaningfulChange(userId: string): Promise<MeaningfulChangeResult[]> {
  // Fetch user's last seen states for stocks in their watchlists
  const userStates = await prisma.userStockState.findMany({
    where: { userId },
    include: { stock: true }
  });

  const changes: MeaningfulChangeResult[] = [];

  for (const state of userStates) {
    // Get the most recent market data snapshot for this stock
    const latestSnapshot = await prisma.marketSnapshot.findFirst({
      where: { stockId: state.stockId },
      orderBy: { timestamp: 'desc' }
    });

    if (!latestSnapshot) continue;

    // 1. Calculate Price Movement
    const priceDiff = latestSnapshot.price - state.lastSeenPrice;
    const percentageChange = (priceDiff / state.lastSeenPrice) * 100;
    const absChange = Math.abs(percentageChange);

    // 2. Core Meaningful Change Engine Scoring (0-100)
    let score = 0;
    
    // A. Price anomaly (0-25)
    if (absChange > 5) score += 25;
    else if (absChange > 3) score += 15;
    else if (absChange > 1) score += 5;

    // B. Volume anomaly (0-20)
    // (Simulated logic: in reality we'd compare to a 30-day moving average volume)
    if (latestSnapshot.volume > 800000) score += 20;
    else if (latestSnapshot.volume > 500000) score += 10;

    // C. Simulated Corporate Event / News relevance (0-30)
    // We can randomize this for the hackathon MVP to simulate events happening while away
    const hasSimulatedEvent = Math.random() > 0.8; 
    if (hasSimulatedEvent) {
        score += 25; 
    }

    // 3. Classification based on configurable thresholds
    let severity: MeaningfulChangeResult['severity'] = 'NO_CHANGE';
    
    if (score >= 80) {
        severity = 'SIGNIFICANT_CHANGE';
    } else if (score >= 60) {
        severity = 'ATTENTION';
    } else if (score >= 30) {
        severity = 'WORTH_KNOWING';
    }
    
    // Only return stocks that have meaningful changes
    if (severity !== 'NO_CHANGE') {
        changes.push({
            stock: state.stock,
            percentageChange,
            score,
            severity,
            latestSnapshot
        });
    }
  }

  // Sort by score descending (most important first)
  return changes.sort((a, b) => b.score - a.score);
}
