const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

// ── Types ────────────────────────────────────────────────────────────────────

export type Sensitivity = 'CALM' | 'WATCHFUL' | 'VIGILANT';


export interface LiveStock {
  id: string;
  symbol: string;
  companyName: string;
  sector: string | null;
  price: number;
  dayChange: number;
  dayChangePercent: number;
  volume: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  dataStatus: 'LIVE' | 'DELAYED' | 'STALE';
  marketStatus: string;
}

export interface ChangeReason {
  label: string;
  value: string;
  context: string;
}

export interface Insight {
  id: string;
  changeEventId: string;
  summary: string;
  explanation: string;
  modelVersion: string | null;
  generatedAt: string;
}

export interface StockChange {
  stock: {
    id: string;
    symbol: string;
    companyName: string;
    sector: string | null;
  };
  percentageChange: number;
  absoluteChange: number;
  score: number;
  severity: 'WORTH_KNOWING' | 'ATTENTION' | 'SIGNIFICANT_CHANGE';
  latestSnapshot: {
    id: string;
    price: number;
    volume: number;
    source: string;
    dataStatus: string;
    timestamp: string;
  };
  lastSeenPrice: number;
  lastSeenTimestamp: string;
  changeEventId: string | null;
  insight: Insight | null;
}

export interface DashboardChanges {
  marketStatus: {
    isOpen: boolean;
    dataStatus: string;
    reason: string;
  };
  summary: {
    totalChanges: number;
    attentionCount: number;
    worthKnowingCount: number;
    normalCount: number;
    totalInWatchlist: number;
  };
  attention: StockChange[];
  worthKnowing: StockChange[];
}

export interface GoalImpactItem {
  eventId: string;
  stockId: string;
  stockSymbol: string;
  stockName: string;
  impactText: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
}

export interface GoalImpact {
  goalId: string;
  goalName: string;
  horizonDays: number;
  targetAmount: number;
  goalHealth: 'ON_TRACK' | 'NEEDS_REVIEW' | 'AT_RISK';
  impactAnalysis: GoalImpactItem[];
  totalRiskScore: number;
}

export interface ChangeHistoryEvent {
  id: string;
  stockId: string;
  eventType: string;
  severity: string;
  score: number;
  detectedAt: string;
  status: string;
  stock: {
    symbol: string;
    companyName: string;
  };
  insights: {
    summary: string;
    modelVersion: string | null;
  }[];
}

export interface SectorPeer {
  id: string;
  symbol: string;
  companyName: string;
  price: number;
  dayChangePct: number;
  dataStatus: string;
}

export interface SectorContext {
  sector: string | null;
  peers: SectorPeer[];
  isSectorWide: boolean;
  sectorSignal: 'SECTOR_WIDE_DECLINE' | 'SECTOR_WIDE_RALLY' | 'COMPANY_SPECIFIC';
}

export interface LiveQuotePreview {
  symbol: string;
  companyName: string;
  price: number;
  volume: number;
  dayChange: number;
  dayChangePercent: number;
}


// ── Session Management ───────────────────────────────────────────────────────

let _userId: string | null = null;

export async function getDemoUser(): Promise<string> {
  if (_userId) return _userId;

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@groww.in', name: 'Demo User' }),
  });

  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const data = await res.json();
  _userId = data.user.id;
  return _userId!;
}

// ── API Calls ────────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function getDashboardChanges(sensitivity: Sensitivity = 'WATCHFUL'): Promise<DashboardChanges> {
  const userId = await getDemoUser();
  return apiFetch<DashboardChanges>(`${API_BASE}/users/${userId}/dashboard/changes?sensitivity=${sensitivity}`);
}

export async function getLiveWatchlist(): Promise<LiveStock[]> {
  const userId = await getDemoUser();
  return apiFetch<LiveStock[]>(`${API_BASE}/users/${userId}/watchlist/live`);
}

export async function addStockToWatchlist(symbol: string) {
  const userId = await getDemoUser();
  return apiFetch<{ success: boolean; stock: any; alreadyExists: boolean }>(
    `${API_BASE}/users/${userId}/watchlist/stocks`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol }),
    }
  );
}

export async function deleteStockFromWatchlist(stockId: string): Promise<{ success: boolean }> {
  const userId = await getDemoUser();
  return apiFetch<{ success: boolean }>(
    `${API_BASE}/users/${userId}/watchlist/stocks/${stockId}`,
    { method: 'DELETE' }
  );
}

export async function getGoalImpacts(): Promise<GoalImpact[]> {
  const userId = await getDemoUser();
  return apiFetch<GoalImpact[]>(`${API_BASE}/users/${userId}/goals/impact`);
}

export async function createDemoGoal() {
  const userId = await getDemoUser();
  return apiFetch<{ success: boolean; goal: any }>(`${API_BASE}/users/${userId}/goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'House (2031)',
      horizonDays: 1825,
      targetAmount: 5000000,
    }),
  });
}

export async function triggerMarketTick() {
  return apiFetch<{ success: boolean; message: string; marketStatus: any }>(
    `${API_BASE}/debug/market-tick`,
    { method: 'POST' }
  );
}

export async function getMarketStatus() {
  return apiFetch<{ isOpen: boolean; dataStatus: string; reason: string }>(
    `${API_BASE}/market/status`
  );
}

export async function getChangeHistory(stockId: string): Promise<ChangeHistoryEvent[]> {
  const userId = await getDemoUser();
  return apiFetch<ChangeHistoryEvent[]>(`${API_BASE}/users/${userId}/stocks/${stockId}/history`);
}

export async function getSectorContext(stockId: string): Promise<SectorContext> {
  const userId = await getDemoUser();
  return apiFetch<SectorContext>(`${API_BASE}/users/${userId}/sector-context?stockId=${stockId}`);
}

export async function getLiveQuotePreview(symbol: string): Promise<LiveQuotePreview> {
  return apiFetch<LiveQuotePreview>(`${API_BASE}/stocks/${symbol}/live`);
}

