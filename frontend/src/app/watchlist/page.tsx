"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, Edit2, AlertCircle, Info, CheckCircle2,
  ArrowRight, X, TrendingUp, TrendingDown, RefreshCw, Wifi, WifiOff, Clock
} from 'lucide-react';
import {
  getDashboardChanges,
  getGoalImpacts,
  createDemoGoal,
  getLiveWatchlist,
  addStockToWatchlist,
  deleteStockFromWatchlist,
  triggerMarketTick,
  DashboardChanges,
  LiveStock,
  StockChange,
  GoalImpact,
} from '@/services/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours   = Math.floor(diff / 3_600_000);
  const days    = Math.floor(diff / 86_400_000);

  if (days > 0)    return `${days}d ${hours % 24}h ago`;
  if (hours > 0)   return `${hours}h ${minutes % 60}m ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

function formatExplanation(text: string) {
  if (!text) return null;
  const sections = text.split(/\n(?=[A-Z\s]+\n)/);
  return sections.map((section, i) => {
    const lines = section.trim().split('\n');
    const header = lines[0];
    const body   = lines.slice(1).join('\n').trim();
    return (
      <div key={i} className="mb-4 last:mb-0">
        <div className="text-[11px] font-bold text-[#7c7e8c] uppercase tracking-wider mb-1">{header}</div>
        <div className="text-[14px] text-[#44475b] leading-relaxed">{body}</div>
      </div>
    );
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DataStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    LIVE:    { label: 'Live',    cls: 'bg-[#e6f9f4] text-[#00d09c]' },
    DELAYED: { label: 'Delayed', cls: 'bg-yellow-50 text-yellow-600' },
    STALE:   { label: 'Stale',   cls: 'bg-gray-100 text-gray-500' },
  };
  const { label, cls } = map[status] ?? map.STALE;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'LIVE' ? 'bg-[#00d09c] animate-pulse' : 'bg-current opacity-60'}`} />
      {label}
    </span>
  );
}

function StatusBadge({ severity }: { severity: string }) {
  if (severity === 'ATTENTION' || severity === 'SIGNIFICANT_CHANGE') {
    return (
      <span className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider bg-red-50 text-[#eb5b3c]">
        <AlertCircle className="w-3 h-3" /> {severity === 'SIGNIFICANT_CHANGE' ? 'Significant' : 'Attention'}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider bg-yellow-50 text-[#eab308]">
      <Info className="w-3 h-3" /> Worth Knowing
    </span>
  );
}

function MiniSparkline({ isUp }: { isUp: boolean }) {
  return isUp ? (
    <svg width="60" height="20" viewBox="0 0 60 20" fill="none">
      <path d="M0 16 Q 15 13, 30 10 T 60 3" stroke="#00d09c" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ) : (
    <svg width="60" height="20" viewBox="0 0 60 20" fill="none">
      <path d="M0 3 Q 15 7, 30 10 T 60 17" stroke="#eb5b3c" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function WatchlistPage() {
  const [dashboard, setDashboard]           = useState<DashboardChanges | null>(null);
  const [goalImpacts, setGoalImpacts]       = useState<GoalImpact[]>([]);
  const [liveWatchlist, setLiveWatchlist]   = useState<LiveStock[]>([]);
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery]       = useState('');
  const [isEditing, setIsEditing]           = useState(false);
  const [isAddingStock, setIsAddingStock]   = useState(false);
  const [addSymbolInput, setAddSymbolInput] = useState('');
  const [addingInProgress, setAddingInProgress] = useState(false);
  const [addError, setAddError]             = useState('');
  const [isRefreshing, setIsRefreshing]     = useState(false);
  const [lastLoadedAt, setLastLoadedAt]     = useState<Date | null>(null);
  const [loadError, setLoadError]           = useState('');

  // earliest lastSeenTimestamp across all changes — represents "when user last checked"
  const lastSeenTimestamp: string | null =
    dashboard && [...dashboard.attention, ...dashboard.worthKnowing].length > 0
      ? [...dashboard.attention, ...dashboard.worthKnowing].reduce((earliest, c) =>
          c.lastSeenTimestamp < earliest ? c.lastSeenTimestamp : earliest,
          dashboard.attention[0]?.lastSeenTimestamp ?? dashboard.worthKnowing[0]?.lastSeenTimestamp
        )
      : null;

  const loadAll = useCallback(async (showRefreshSpin = false) => {
    if (showRefreshSpin) setIsRefreshing(true);
    setLoadError('');
    try {
      await createDemoGoal().catch(() => {});
      const [changes, impacts, wl] = await Promise.all([
        getDashboardChanges(),
        getGoalImpacts(),
        getLiveWatchlist(),
      ]);
      setDashboard(changes);
      setGoalImpacts(impacts);
      setLiveWatchlist(wl);
      setLastLoadedAt(new Date());
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      setLoadError('Could not connect to server. Make sure the backend is running on port 5000.');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await triggerMarketTick();
    } catch {
      /* market tick is best-effort */
    }
    await loadAll(false);
    setIsRefreshing(false);
  };

  const handleAddStock = async () => {
    const sym = addSymbolInput.trim().toUpperCase();
    if (!sym) return;
    setAddingInProgress(true);
    setAddError('');
    try {
      await addStockToWatchlist(sym);
      setAddSymbolInput('');
      setIsAddingStock(false);
      await loadAll();
    } catch (e: any) {
      setAddError(e.message || `Could not add "${sym}". Check the symbol and try again.`);
    } finally {
      setAddingInProgress(false);
    }
  };

  const handleDeleteStock = async (e: React.MouseEvent, stockId: string) => {
    e.stopPropagation();
    try {
      await deleteStockFromWatchlist(stockId);
      setLiveWatchlist(prev => prev.filter(s => s.id !== stockId));
      if (selectedStockId === stockId) setSelectedStockId(null);
    } catch (err: any) {
      alert(`Failed to remove stock: ${err.message}`);
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const allChanges = dashboard ? [...dashboard.attention, ...dashboard.worthKnowing] : [];

  const selectedLive   = liveWatchlist.find(s => s.id === selectedStockId) ?? null;
  const selectedChange = allChanges.find(c => c.stock.id === selectedStockId) ?? null;
  const activeGoal     = goalImpacts.length > 0 ? goalImpacts[0] : null;

  const filteredWatchlist = liveWatchlist.filter(row =>
    row.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (row.companyName && row.companyName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // ── Loading / Error states ────────────────────────────────────────────────

  if (!dashboard && !loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-[#7c7e8c]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#00d09c]" />
        <p className="text-[15px] font-medium">Loading Smart Watchlist…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <WifiOff className="w-10 h-10 text-[#eb5b3c]" />
        <p className="text-[16px] font-semibold text-[#44475b]">Backend not reachable</p>
        <p className="text-[14px] text-[#7c7e8c] text-center max-w-sm">{loadError}</p>
        <button onClick={() => loadAll()} className="mt-2 px-4 py-2 bg-[#00d09c] text-white rounded-lg font-medium text-sm hover:bg-[#00b386] transition-colors">
          Retry
        </button>
      </div>
    );
  }

  const { summary, marketStatus } = dashboard!;

  return (
    <div className="w-full max-w-[1200px] mx-auto px-6 py-8 pb-24 flex gap-8 items-start relative">

      <div className="flex-1 flex flex-col gap-8">

        {/* ── 1. HEADER: "You were away for X" ──────────────────────────── */}
        <section className="flex flex-col gap-1">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[28px] font-bold text-[#44475b] tracking-tight">
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'} 👋
              </h1>
              {allChanges.length > 0 && lastSeenTimestamp ? (
                <p className="text-[18px] text-[#44475b] font-medium mt-1">
                  You were away for <span className="text-[#00d09c] font-bold">{formatTimeAgo(lastSeenTimestamp)}</span>.
                  Here's what changed.
                </p>
              ) : (
                <p className="text-[18px] text-[#44475b] font-medium mt-1">
                  Everything looks normal since you last checked.
                </p>
              )}
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-[13px] font-medium text-[#44475b] hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {/* Last checked + Market status */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {lastLoadedAt && (
              <div className="flex items-center gap-1.5 text-[12px] text-[#7c7e8c]">
                <Clock className="w-3.5 h-3.5" />
                <span>Last refreshed {formatTimeAgo(lastLoadedAt.toISOString())}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-[12px] text-[#7c7e8c]">
              {marketStatus.isOpen
                ? <Wifi className="w-3.5 h-3.5 text-[#00d09c]" />
                : <WifiOff className="w-3.5 h-3.5 text-[#eb5b3c]" />}
              <span>{marketStatus.reason}</span>
            </div>
          </div>
        </section>

        {/* ── 2. ATTENTION SUMMARY BAR ──────────────────────────────────── */}
        <section className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[#44475b] font-bold text-[15px]">
              ⚡ MARKET WATCH
            </div>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-5 text-[14px] font-medium">
              <span className="flex items-center gap-1.5 text-[#44475b]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#eb5b3c]" />
                {summary.attentionCount} Needs attention
              </span>
              <span className="flex items-center gap-1.5 text-[#44475b]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
                {summary.worthKnowingCount} Worth knowing
              </span>
              <span className="flex items-center gap-1.5 text-[#7c7e8c]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00d09c]" />
                {summary.normalCount} Normal
              </span>
            </div>
          </div>
          <button
            onClick={() => document.getElementById('watchlist-table')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-[#00d09c] font-medium text-[14px] flex items-center hover:text-[#00b386] transition-colors"
          >
            Review all <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </section>

        {/* ── 3. MEANINGFUL CHANGE CARDS ────────────────────────────────── */}
        {allChanges.length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {allChanges.map(change => (
              <div
                key={change.stock.id}
                className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col gap-4 relative overflow-hidden group cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedStockId(change.stock.id)}
              >
                {/* Severity stripe */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  change.severity === 'SIGNIFICANT_CHANGE' || change.severity === 'ATTENTION'
                    ? 'bg-[#eb5b3c]'
                    : 'bg-[#eab308]'
                }`} />

                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[18px] font-bold text-[#44475b]">{change.stock.symbol}</div>
                    <div className="text-[12px] text-[#7c7e8c] font-medium mt-0.5">{change.stock.companyName}</div>
                    <div className="flex items-baseline gap-3 mt-2">
                      <span className="text-[22px] font-semibold text-[#44475b]">
                        ₹{change.latestSnapshot.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <DataStatusBadge status={change.latestSnapshot.dataStatus} />
                    </div>
                    <div className={`mt-1 font-medium text-[13px] flex items-center gap-1 ${change.percentageChange < 0 ? 'text-[#eb5b3c]' : 'text-[#00d09c]'}`}>
                      {change.percentageChange < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                      {change.percentageChange > 0 ? '+' : ''}{change.percentageChange.toFixed(2)}% since your last check
                    </div>
                    <div className="text-[11px] text-[#7c7e8c] mt-0.5">
                      Last seen {formatTimeAgo(change.lastSeenTimestamp)} at ₹{change.lastSeenPrice.toFixed(2)}
                    </div>
                  </div>
                  <StatusBadge severity={change.severity} />
                </div>

                {/* Why flagged section */}
                <div className="bg-[#fcfcfc] border border-gray-100 rounded-lg p-4">
                  <div className="text-[11px] font-bold text-[#7c7e8c] uppercase tracking-wider mb-2">Why we're flagging this</div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-[#44475b]">Price movement</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#44475b]">
                          {change.percentageChange > 0 ? '↑' : '↓'} {Math.abs(change.percentageChange).toFixed(2)}%
                        </span>
                        <span className="text-[#7c7e8c] text-[11px] bg-gray-100 px-1.5 py-0.5 rounded">Anomalous</span>
                      </div>
                    </div>
                    {change.latestSnapshot.volume > 0 && (
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-[#44475b]">Trading volume</span>
                        <span className="font-medium text-[#44475b]">
                          {(change.latestSnapshot.volume / 1_000_000).toFixed(2)}M shares
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-[#44475b]">Anomaly score</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${change.score >= 55 ? 'bg-[#eb5b3c]' : change.score >= 35 ? 'bg-[#eab308]' : 'bg-[#00d09c]'}`}
                            style={{ width: `${change.score}%` }}
                          />
                        </div>
                        <span className="font-medium text-[#44475b] text-[12px]">{change.score}/100</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button className="text-[#00d09c] font-medium text-[13px] flex items-center self-end hover:underline">
                  Why did this happen? <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            ))}
          </section>
        )}

        {/* Empty state when no changes */}
        {allChanges.length === 0 && liveWatchlist.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-xl p-12 text-center shadow-sm">
            <CheckCircle2 className="w-12 h-12 text-[#00d09c] mx-auto mb-3 opacity-70" />
            <p className="text-[16px] font-semibold text-[#44475b]">All clear — nothing unusual since your last check</p>
            <p className="text-[13px] text-[#7c7e8c] mt-1">
              {liveWatchlist.length} stock{liveWatchlist.length !== 1 ? 's' : ''} in your watchlist, all within normal range.
            </p>
          </div>
        )}

        {/* ── 4. FULL WATCHLIST TABLE ───────────────────────────────────── */}
        <section id="watchlist-table" className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mt-2">

          <div className="flex items-center gap-8 px-6 border-b border-gray-100 bg-[#fcfdfd]">
            <button className="py-4 border-b-[3px] border-[#44475b] text-[#44475b] font-bold text-[15px]">
              Full Watchlist
            </button>
          </div>

          <div className="px-6 py-4 flex justify-between items-center border-b border-gray-100">
            <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2 w-[280px] focus-within:border-[#00d09c] transition-colors">
              <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Search your watchlist"
                className="bg-transparent border-none outline-none text-sm w-full"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-3 relative">
              {/* Add stock dropdown */}
              <div className="relative">
                <button
                  onClick={() => { setIsAddingStock(v => !v); setAddError(''); }}
                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add stocks
                </button>

                {isAddingStock && (
                  <div className="absolute top-12 right-0 bg-white border border-gray-100 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] p-4 w-72 z-20">
                    <p className="text-[12px] font-bold text-[#7c7e8c] uppercase tracking-wider mb-2">Add by NSE symbol</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. RELIANCE, TCS"
                        value={addSymbolInput}
                        onChange={e => setAddSymbolInput(e.target.value.toUpperCase())}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddStock(); }}
                        className="flex-1 border border-gray-200 rounded-md px-3 py-1.5 text-sm outline-none focus:border-[#00d09c] transition-colors"
                        autoFocus
                      />
                      <button
                        onClick={handleAddStock}
                        disabled={addingInProgress || !addSymbolInput.trim()}
                        className="px-3 py-1.5 bg-[#00d09c] text-white text-sm font-medium rounded-md hover:bg-[#00b386] transition-colors disabled:opacity-50"
                      >
                        {addingInProgress ? '…' : 'Add'}
                      </button>
                    </div>
                    {addError && (
                      <p className="text-[11px] text-[#eb5b3c] mt-2">{addError}</p>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsEditing(v => !v)}
                className={`flex items-center gap-1.5 px-4 py-2 border rounded-lg text-sm font-medium transition-colors
                  ${isEditing ? 'border-[#00d09c] bg-[#e6f9f4] text-[#00d09c]' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <Edit2 className="w-4 h-4" /> {isEditing ? 'Done' : 'Edit'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px] text-[#44475b]">
              <thead className="bg-[#fcfcfc] border-b border-gray-100 text-[#7c7e8c] font-medium text-[12px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6">Company</th>
                  <th className="py-3 px-6 text-center">Trend</th>
                  <th className="py-3 px-6 text-right">Price</th>
                  <th className="py-3 px-6 text-right">1D Change</th>
                  <th className="py-3 px-6 text-right">Volume</th>
                  <th className="py-3 px-6 text-center">52W Range</th>
                  <th className="py-3 px-6 text-center">Data</th>
                </tr>
              </thead>
              <tbody>
                {filteredWatchlist.map(row => {
                  const hasChange = allChanges.some(c => c.stock.id === row.id);
                  return (
                    <tr
                      key={row.id}
                      onClick={() => !isEditing && setSelectedStockId(row.id)}
                      className={`border-b border-gray-50 transition-colors
                        ${hasChange ? 'bg-orange-50/30 hover:bg-orange-50/50' : 'hover:bg-gray-50/50'}
                        ${!isEditing ? 'cursor-pointer' : ''}`}
                    >
                      <td className="py-4 px-6 font-medium">
                        <div className="flex items-center gap-3">
                          {isEditing && (
                            <button
                              onClick={e => handleDeleteStock(e, row.id)}
                              className="p-1 rounded-full bg-red-50 text-[#eb5b3c] hover:bg-red-100 transition-colors shrink-0"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                          <div className="w-8 h-8 rounded-full border border-gray-100 shadow-sm flex items-center justify-center bg-white overflow-hidden shrink-0">
                            <img
                              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(row.companyName || row.symbol)}&background=random&color=fff&bold=true`}
                              alt={row.symbol}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[#44475b] font-medium text-[14px] flex items-center gap-2">
                              {row.companyName || row.symbol}
                              {hasChange && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#eb5b3c] animate-pulse" title="Meaningful change detected" />
                              )}
                            </span>
                            <span className="text-gray-400 text-[11px] font-medium">{row.symbol}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex justify-center">
                          <MiniSparkline isUp={row.dayChange >= 0} />
                        </div>
                      </td>

                      <td className="py-4 px-6 text-right font-medium text-[#44475b]">
                        ₹{row.price > 0 ? row.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                      </td>

                      <td className={`py-4 px-6 text-right font-medium ${row.dayChange < 0 ? 'text-[#eb5b3c]' : 'text-[#00d09c]'}`}>
                        {row.dayChange !== 0 ? (
                          <>
                            {row.dayChange > 0 ? '+' : ''}₹{Math.abs(row.dayChange).toFixed(2)}
                            <span className="text-[12px] ml-1">({Math.abs(row.dayChangePercent).toFixed(2)}%)</span>
                          </>
                        ) : '—'}
                      </td>

                      <td className="py-4 px-6 text-right font-medium text-[#44475b]">
                        {row.volume > 0 ? new Intl.NumberFormat('en-IN').format(row.volume) : '—'}
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex justify-center items-center">
                          {row.fiftyTwoWeekHigh > 0 ? (
                            <div className="flex items-center gap-2 text-[11px] text-[#7c7e8c] font-medium">
                              <span>L</span>
                              <div className="relative w-20 h-1.5 bg-gray-200 rounded-full">
                                <div
                                  className="absolute top-1/2 -translate-y-1/2 w-1.5 h-3 bg-[#44475b] rounded-sm"
                                  style={{
                                    left: `${Math.min(100, Math.max(0,
                                      ((row.price - row.fiftyTwoWeekLow) /
                                       Math.max(1, row.fiftyTwoWeekHigh - row.fiftyTwoWeekLow)) * 100
                                    ))}%`
                                  }}
                                />
                              </div>
                              <span>H</span>
                            </div>
                          ) : <span className="text-[11px] text-gray-300">—</span>}
                        </div>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <DataStatusBadge status={row.dataStatus} />
                      </td>
                    </tr>
                  );
                })}

                {filteredWatchlist.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      {liveWatchlist.length === 0 ? (
                        <div className="flex flex-col items-center gap-3">
                          <Plus className="w-8 h-8 text-gray-300" />
                          <p className="text-gray-400 font-medium">Your watchlist is empty</p>
                          <p className="text-[13px] text-gray-300">Add stocks using the button above</p>
                        </div>
                      ) : (
                        <p className="text-gray-400">No stocks matching "{searchQuery}"</p>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ── 5. STOCK INTELLIGENCE SIDE PANEL ─────────────────────────────── */}
      {selectedStockId && selectedLive && (
        <>
          {/* Dim overlay */}
          <div
            className="fixed inset-0 bg-black/10 z-40 transition-opacity"
            onClick={() => setSelectedStockId(null)}
          />

          <div className="fixed inset-y-0 right-0 w-[460px] bg-white shadow-[-10px_0_40px_rgba(0,0,0,0.12)] border-l border-gray-200 z-50 overflow-y-auto flex flex-col">

            {/* Panel header */}
            <div className="sticky top-0 bg-white/90 backdrop-blur border-b border-gray-100 p-6 flex justify-between items-start z-10">
              <div>
                <div className="text-[22px] font-bold text-[#44475b]">{selectedLive.symbol}</div>
                <div className="text-[13px] text-[#7c7e8c] mt-0.5">{selectedLive.companyName}</div>
                <div className="flex items-baseline gap-3 mt-2">
                  <span className="text-[28px] font-semibold text-[#44475b]">
                    ₹{selectedLive.price > 0
                      ? selectedLive.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : '—'}
                  </span>
                  <DataStatusBadge status={selectedLive.dataStatus} />
                </div>
                <div className={`mt-1 font-medium text-[14px] flex items-center gap-1 ${selectedLive.dayChange < 0 ? 'text-[#eb5b3c]' : 'text-[#00d09c]'}`}>
                  {selectedLive.dayChange < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                  {selectedLive.dayChange > 0 ? '+' : ''}₹{Math.abs(selectedLive.dayChange).toFixed(2)} ({Math.abs(selectedLive.dayChangePercent).toFixed(2)}%) today
                </div>
              </div>
              <button
                onClick={() => setSelectedStockId(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-8">

              {selectedChange ? (
                <>
                  {/* Status banner */}
                  <div className={`flex items-center gap-2 px-4 py-3 rounded-lg font-bold text-[13px] uppercase tracking-wider
                    ${selectedChange.severity === 'ATTENTION' || selectedChange.severity === 'SIGNIFICANT_CHANGE'
                      ? 'bg-red-50 text-[#eb5b3c]'
                      : 'bg-yellow-50 text-[#eab308]'}`}
                  >
                    {selectedChange.severity === 'WORTH_KNOWING'
                      ? <Info className="w-4 h-4" />
                      : <AlertCircle className="w-4 h-4" />}
                    {selectedChange.severity.replace('_', ' ')}
                    <span className="ml-auto text-[11px] opacity-60 normal-case font-medium">Score: {selectedChange.score}/100</span>
                  </div>

                  {/* What changed */}
                  <section>
                    <h3 className="text-[12px] font-bold text-[#7c7e8c] uppercase tracking-wider mb-3">What changed since your last check</h3>
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 text-[13px]">
                        <span className="text-[#44475b] font-medium">Price when you left</span>
                        <span className="font-semibold">₹{selectedChange.lastSeenPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 text-[13px]">
                        <span className="text-[#44475b] font-medium">Price now</span>
                        <span className="font-semibold">₹{selectedChange.latestSnapshot.price.toFixed(2)}</span>
                      </div>
                      <div className={`flex items-center justify-between rounded-lg p-3 text-[13px] font-bold
                        ${selectedChange.percentageChange < 0 ? 'bg-red-50 text-[#eb5b3c]' : 'bg-[#e6f9f4] text-[#00d09c]'}`}>
                        <span>Change since last check</span>
                        <span>
                          {selectedChange.percentageChange > 0 ? '+' : ''}
                          {selectedChange.percentageChange.toFixed(2)}%
                          &nbsp;(₹{Math.abs(selectedChange.absoluteChange).toFixed(2)})
                        </span>
                      </div>
                      <div className="text-[11px] text-[#7c7e8c] pl-1">
                        You last checked {formatTimeAgo(selectedChange.lastSeenTimestamp)}
                      </div>
                    </div>
                  </section>

                  {/* AI Brief */}
                  <section>
                    <h3 className="text-[12px] font-bold text-[#7c7e8c] uppercase tracking-wider mb-3 flex items-center gap-2">
                      🤖 AI Market Brief
                      {selectedChange.insight?.modelVersion === 'deterministic-fallback-v2' && (
                        <span className="text-[10px] normal-case font-medium bg-gray-100 px-2 py-0.5 rounded text-gray-400">
                          AI offline — structured fallback
                        </span>
                      )}
                      {selectedChange.insight?.modelVersion?.includes('gemini') && (
                        <span className="text-[10px] normal-case font-medium bg-[#e6f9f4] px-2 py-0.5 rounded text-[#00d09c]">
                          Gemini
                        </span>
                      )}
                    </h3>
                    <div className="bg-[#fcfdfd] border border-[#e8f5f2] rounded-xl p-5 shadow-sm">
                      {selectedChange.insight
                        ? formatExplanation(selectedChange.insight.explanation)
                        : (
                          <div className="text-[13px] text-[#7c7e8c] italic">
                            AI brief not available for this severity level.
                          </div>
                        )
                      }
                    </div>
                  </section>

                  {/* Goal impact */}
                  {activeGoal && (
                    <section className="border-t border-gray-100 pt-6">
                      <h3 className="text-[12px] font-bold text-[#7c7e8c] uppercase tracking-wider mb-3">🎯 Goal Impact</h3>
                      <div className={`p-4 rounded-xl border ${
                        activeGoal.goalHealth === 'AT_RISK'      ? 'bg-red-50 border-red-100' :
                        activeGoal.goalHealth === 'NEEDS_REVIEW' ? 'bg-yellow-50 border-yellow-100' :
                        'bg-blue-50/50 border-blue-100'
                      }`}>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="text-[13px] font-bold text-[#44475b]">{activeGoal.goalName}</div>
                            <div className="text-[11px] text-[#7c7e8c] mt-0.5">
                              Target: ₹{(activeGoal.targetAmount / 100_000).toFixed(0)}L •{' '}
                              {Math.round(activeGoal.horizonDays / 365)}yr horizon
                            </div>
                          </div>
                          <span className={`text-[11px] font-bold px-2 py-1 rounded uppercase tracking-wider
                            ${activeGoal.goalHealth === 'AT_RISK'      ? 'bg-red-100 text-[#eb5b3c]' :
                              activeGoal.goalHealth === 'NEEDS_REVIEW' ? 'bg-yellow-100 text-yellow-600' :
                              'bg-[#e6f9f4] text-[#00d09c]'}`}
                          >
                            {activeGoal.goalHealth.replace('_', ' ')}
                          </span>
                        </div>
                        {activeGoal.impactAnalysis
                          .filter(ia => ia.stockId === selectedChange.stock.id)
                          .map((ia, i) => (
                            <p key={i} className="text-[13px] text-[#44475b]">{ia.impactText}</p>
                          ))
                        }
                        {activeGoal.impactAnalysis.filter(ia => ia.stockId === selectedChange.stock.id).length === 0 && (
                          <p className="text-[13px] text-[#7c7e8c]">
                            No direct impact analysis found for this stock and goal combination yet.
                          </p>
                        )}
                      </div>
                    </section>
                  )}
                </>
              ) : (
                /* Normal stock — no meaningful change */
                <div className="text-center py-12 text-[#7c7e8c]">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-[#00d09c] mb-4 opacity-50" />
                  <p className="text-[16px] font-medium text-[#44475b]">Normal Trading Activity</p>
                  <p className="text-[13px] mt-2 text-[#7c7e8c]">
                    No significant events or unusual price movements detected since your last check.
                  </p>
                  {selectedLive.dataStatus !== 'LIVE' && (
                    <div className="mt-4 bg-gray-50 rounded-lg p-3 text-[12px]">
                      <DataStatusBadge status={selectedLive.dataStatus} />
                      <span className="ml-2 text-[#7c7e8c]">{selectedLive.marketStatus}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Panel footer — set alert instead of mocked BUY/SELL */}
            <div className="mt-auto sticky bottom-0 p-6 bg-white border-t border-gray-100 flex gap-4 z-10 shadow-[0_-10px_20px_rgba(255,255,255,0.9)]">
              <button
                onClick={() => alert(`Alert for ${selectedLive.symbol} would be configured here.\n\nIn a full implementation, this would let you set a price/% alert and receive a push notification.`)}
                className="flex-1 py-3 border-2 border-[#00d09c] text-[#00d09c] font-bold rounded-lg transition-colors hover:bg-[#e6f9f4] tracking-wide text-[14px]"
              >
                🔔 Set Alert
              </button>
              <button
                onClick={() => alert(`To place a real order for ${selectedLive.symbol}, the app would integrate with a broker API (Zerodha, Groww, etc.)`)}
                className="flex-1 py-3 bg-[#00d09c] hover:bg-[#00b386] text-white font-bold rounded-lg transition-colors shadow-sm tracking-wide text-[14px]"
              >
                Trade
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
