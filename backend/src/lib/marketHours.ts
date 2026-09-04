/**
 * NSE Market Hours Utility
 * NSE trading session: Monday–Friday, 09:15–15:30 IST (UTC+5:30)
 */

export interface MarketStatus {
  isOpen: boolean;
  dataStatus: 'LIVE' | 'DELAYED' | 'STALE';
  reason: string;
}

export function getNSEMarketStatus(): MarketStatus {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60; // minutes
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const istMinutes = (utcMinutes + istOffset) % (24 * 60);
  const istDay = new Date(now.getTime() + istOffset * 60 * 1000).getUTCDay(); // 0=Sun, 6=Sat

  const marketOpenMinutes = 9 * 60 + 15;   // 09:15
  const marketCloseMinutes = 15 * 60 + 30; // 15:30

  const isWeekday = istDay >= 1 && istDay <= 5;
  const isDuringHours = istMinutes >= marketOpenMinutes && istMinutes <= marketCloseMinutes;

  if (!isWeekday) {
    return { isOpen: false, dataStatus: 'STALE', reason: 'Weekend — NSE closed' };
  }
  if (istMinutes < marketOpenMinutes) {
    return { isOpen: false, dataStatus: 'DELAYED', reason: 'Pre-market — NSE opens at 09:15 IST' };
  }
  if (istMinutes > marketCloseMinutes) {
    return { isOpen: false, dataStatus: 'STALE', reason: 'After-market — NSE closed at 15:30 IST' };
  }

  return { isOpen: true, dataStatus: 'LIVE', reason: 'NSE market is open' };
}
