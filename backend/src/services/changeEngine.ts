import { Stock, MarketSnapshot } from '@prisma/client';
import prisma from '../db';

export type Sensitivity = 'CALM' | 'WATCHFUL' | 'VIGILANT';

/**
 * Score thresholds per sensitivity mode.
 * CALM     → fewer alerts, higher bar (long-term investors)
 * WATCHFUL → balanced defaults
 * VIGILANT → alerts on even small moves (active traders)
 */
const THRESHOLDS: Record<Sensitivity, { significant: number; attention: number; worthKnowing: number }> = {
  CALM:     { significant: 70, attention: 55, worthKnowing: 35 },
  WATCHFUL: { significant: 55, attention: 35, worthKnowing: 15 },
  VIGILANT: { significant: 35, attention: 20, worthKnowing: 8  },
};

export interface MeaningfulChangeResult {
  stock: Stock;
  percentageChange: number;
  absoluteChange: number;
  score: number;
  severity: 'NO_CHANGE' | 'WORTH_KNOWING' | 'ATTENTION' | 'SIGNIFICANT_CHANGE';
  latestSnapshot: MarketSnapshot;
  lastSeenPrice: number;
  lastSeenTimestamp: Date;
  changeEventId?: string;
}

/**
 * Computes meaningful changes for all stocks in a user's watchlist
 * by comparing the current market snapshot against the last-seen price.
 *
 * Also writes ChangeEvent records to the DB so the GoalEngine can consume them.
 *
 * Scoring rubric (0–100):
 *   A. Price movement vs last-seen price (0–40)
 *   B. Volume vs previous snapshot (0–30)
 *
 * No Math.random(). Results are deterministic and reproducible.
 */
export async function computeMeaningfulChange(
  userId: string,
  sensitivity: Sensitivity = 'WATCHFUL'
): Promise<MeaningfulChangeResult[]> {
  const thresholds = THRESHOLDS[sensitivity];

  // 1. Fetch all user's last-seen states
  const userStates = await prisma.userStockState.findMany({
    where: { userId },
    include: { stock: true },
  });

  if (userStates.length === 0) return [];

  const stockIds = userStates.map(s => s.stockId);

  // 2. Batch-fetch recent snapshots (no N+1)
  const recentSnapshots = await prisma.marketSnapshot.findMany({
    where: { stockId: { in: stockIds } },
    orderBy: { timestamp: 'desc' },
  });

  const latestSnapshotMap = new Map<string, MarketSnapshot>();
  const prevSnapshotMap   = new Map<string, MarketSnapshot>();

  for (const snap of recentSnapshots) {
    if (!latestSnapshotMap.has(snap.stockId)) {
      latestSnapshotMap.set(snap.stockId, snap);
    } else if (!prevSnapshotMap.has(snap.stockId)) {
      prevSnapshotMap.set(snap.stockId, snap);
    }
  }

  const changes: MeaningfulChangeResult[] = [];

  for (const state of userStates) {
    const latestSnapshot = latestSnapshotMap.get(state.stockId);
    if (!latestSnapshot) continue;

    // ── A. Price Movement Score (0–40) ────────────────────────────────────────
    const priceDiff        = latestSnapshot.price - state.lastSeenPrice;
    const percentageChange = state.lastSeenPrice > 0 ? (priceDiff / state.lastSeenPrice) * 100 : 0;
    const absChange        = Math.abs(percentageChange);

    let priceScore = 0;
    if (absChange >= 5)        priceScore = 40;
    else if (absChange >= 3)   priceScore = 28;
    else if (absChange >= 1.5) priceScore = 15;
    else if (absChange >= 0.5) priceScore = 6;

    // ── B. Volume Anomaly Score (0–30) ────────────────────────────────────────
    const prevSnapshot = prevSnapshotMap.get(state.stockId);
    let volumeScore = 0;
    if (latestSnapshot.volume > 0) {
      if (prevSnapshot && prevSnapshot.volume > 0) {
        const volumeRatio = latestSnapshot.volume / prevSnapshot.volume;
        if (volumeRatio >= 3.0)      volumeScore = 30;
        else if (volumeRatio >= 2.0) volumeScore = 20;
        else if (volumeRatio >= 1.5) volumeScore = 10;
      } else {
        if (latestSnapshot.volume >= 2_000_000)      volumeScore = 30;
        else if (latestSnapshot.volume >= 1_000_000) volumeScore = 15;
        else if (latestSnapshot.volume >= 500_000)   volumeScore = 5;
      }
    }

    const score = Math.min(100, priceScore + volumeScore);

    // ── Classification based on user's sensitivity ────────────────────────────
    let severity: MeaningfulChangeResult['severity'] = 'NO_CHANGE';
    if (score >= thresholds.significant)    severity = 'SIGNIFICANT_CHANGE';
    else if (score >= thresholds.attention) severity = 'ATTENTION';
    else if (score >= thresholds.worthKnowing) severity = 'WORTH_KNOWING';

    if (severity === 'NO_CHANGE') continue;

    // ── Write ChangeEvent to DB (feeds GoalEngine + History) ─────────────────
    const todayKey = new Date().toISOString().slice(0, 10);
    let changeEvent = await prisma.changeEvent.findFirst({
      where: {
        stockId: state.stockId,
        detectedAt: { gte: new Date(todayKey) },
        eventType: severity,
      },
    });

    if (!changeEvent) {
      changeEvent = await prisma.changeEvent.create({
        data: {
          stockId:   state.stockId,
          eventType: severity,
          severity,
          score,
          status:    'NEW',
        },
      });
    }

    changes.push({
      stock:              state.stock,
      percentageChange,
      absoluteChange:     priceDiff,
      score,
      severity,
      latestSnapshot,
      lastSeenPrice:      state.lastSeenPrice,
      lastSeenTimestamp:  state.lastSeenTimestamp,
      changeEventId:      changeEvent.id,
    });
  }

  return changes.sort((a, b) => b.score - a.score);
}
