const API_BASE = 'http://localhost:5000/api';

// Simple mock user session management for the hackathon
let _userId: string | null = null;

export async function getDemoUser() {
  if (_userId) return _userId;
  
  // Register or Login a demo user
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@groww.in', name: 'Demo User' })
  });
  
  const data = await res.json();
  _userId = data.user.id;
  return _userId;
}

export async function getDashboardChanges() {
  const userId = await getDemoUser();
  const res = await fetch(`${API_BASE}/users/${userId}/dashboard/changes`);
  return res.json();
}

export async function getLiveWatchlist() {
  const userId = await getDemoUser();
  const res = await fetch(`${API_BASE}/users/${userId}/watchlist/live`);
  return res.json();
}

export async function addStockToWatchlist(symbol: string) {
  const userId = await getDemoUser();
  const res = await fetch(`${API_BASE}/users/${userId}/watchlist/stocks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol })
  });
  return res.json();
}

export async function getGoalImpacts() {
  const userId = await getDemoUser();
  const res = await fetch(`${API_BASE}/users/${userId}/goals/impact`);
  return res.json();
}

export async function createDemoGoal() {
  const userId = await getDemoUser();
  const res = await fetch(`${API_BASE}/users/${userId}/goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'House (2031)',
      horizonDays: 1825, // ~5 years
      targetAmount: 5000000 // 50L
    })
  });
  return res.json();
}

export async function triggerMarketTick() {
  const res = await fetch(`${API_BASE}/debug/market-tick`, { method: 'POST' });
  return res.json();
}
