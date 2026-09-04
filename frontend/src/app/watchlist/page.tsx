"use client";

import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, ChevronRight, AlertCircle, Info, CheckCircle2, TrendingUp, TrendingDown, ArrowRight, X } from 'lucide-react';
import { getDashboardChanges, getGoalImpacts, createDemoGoal, getLiveWatchlist, addStockToWatchlist } from '@/services/api';

// Transform backend format to UI format
const transformData = (data: any) => {
  if (!data || !data.summary) return null;
  
  const allChanges = [...data.attention, ...data.worthKnowing].map((c: any) => ({
    id: c.stock.symbol.toLowerCase(),
    company: c.stock.companyName,
    symbol: c.stock.symbol,
    price: c.latestSnapshot.price,
    sinceLastCheck: Number(c.percentageChange.toFixed(2)),
    todayChange: Number((c.percentageChange * 0.8).toFixed(2)), // mock 1D as slightly less than since last check
    status: c.severity,
    reasons: [
      { label: 'Price movement', value: `${c.percentageChange < 0 ? '↓' : '↑'} ${Math.abs(c.percentageChange).toFixed(2)}%`, context: 'Anomalous' },
      { label: 'Trading volume', value: `${(c.latestSnapshot.volume / 500000).toFixed(1)}× average`, context: '' }
    ],
    aiBrief: `${c.stock.companyName} experienced a ${c.severity} event since your last check. The price moved by ${Math.abs(c.percentageChange).toFixed(2)}% which triggered our anomaly detection engine with a score of ${c.score}/100.`,
    watchFactors: ["Monitor trading volumes", "Check for corporate announcements"]
  }));

  return {
    lastChecked: 'Just now',
    summary: { 
      attention: data.summary.attentionCount, 
      worthKnowing: data.summary.worthKnowingCount, 
      normal: 12 - data.summary.totalChanges, 
      total: 12 
    },
    changes: allChanges
  };
};

const watchlistTableData = [
  { company: 'HDFC Bank', symbol: 'HDFCBANK', price: 1640, sinceLast: -0.1, dayChange: 0.1, vol: '1.0×', perf: 4, status: 'NORMAL' },
  { company: 'Wipro', symbol: 'WIPRO', price: 512, sinceLast: 0.4, dayChange: 0.5, vol: '0.8×', perf: -2, status: 'NORMAL' },
];

export default function WatchlistPage() {
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [dashboardState, setDashboardState] = useState<any>(null);
  const [goalImpacts, setGoalImpacts] = useState<any[]>([]);
  const [liveWatchlist, setLiveWatchlist] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [localDeletedStocks, setLocalDeletedStocks] = useState<Set<string>>(new Set());

  // Available stocks to add (Mocking real app search)
  const availableStocks = ['ITC', 'SBI', 'ICICIBANK', 'AXISBANK', 'HINDUNILVR'];

  useEffect(() => {
    async function loadData() {
      try {
        // Create demo goal if needed
        await createDemoGoal().catch(() => {});
        
        // Fetch changes first so ChangeEvents are generated in the DB
        const changes = await getDashboardChanges();
        
        // Then fetch the rest in parallel
        const [impacts, wl] = await Promise.all([
          getGoalImpacts(),
          getLiveWatchlist()
        ]);

        setDashboardState(transformData(changes));
        setGoalImpacts(impacts);
        setLiveWatchlist(wl);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }
    }
    loadData();
  }, []);

  const handleAddStock = async (symbol: string) => {
    setIsAddingStock(false);
    try {
      const res = await addStockToWatchlist(symbol);
      if (res.stock) {
        const wl = await getLiveWatchlist();
        setLiveWatchlist(wl);
      }
    } catch (e) {
      alert(`Failed to add ${symbol}`);
    }
  };

  const handleDeleteStock = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    setLocalDeletedStocks(prev => new Set(prev).add(symbol));
  };

  const StatusIcon = ({ status, className }: { status: string, className?: string }) => {
    if (status === 'ATTENTION' || status === 'SIGNIFICANT_CHANGE') return <AlertCircle className={`text-[#eb5b3c] ${className}`} />;
    if (status === 'WORTH_KNOWING') return <Info className={`text-[#eab308] ${className}`} />;
    return <CheckCircle2 className={`text-[#00d09c] ${className}`} />;
  };

  if (!dashboardState) {
    return <div className="p-8 text-center text-gray-500">Loading Smart Watchlist...</div>;
  }

  const selectedChange = dashboardState.changes.find((c: any) => c.id === selectedStock);
  const selectedLive = liveWatchlist.find((c: any) => c.id === selectedStock);
  const activeGoal = goalImpacts.length > 0 ? goalImpacts[0] : null;

  // Merge table data with active changes, handle local additions/deletions, and apply search filter
  const allTableData = liveWatchlist
   .filter(row => !localDeletedStocks.has(row.symbol))
   .filter(row => row.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || (row.companyName && row.companyName.toLowerCase().includes(searchQuery.toLowerCase())));

  return (
    <div className="w-full max-w-[1200px] mx-auto px-6 py-8 pb-24 flex gap-8 items-start relative">
      
      <div className="flex-1 flex flex-col gap-10">
        
        {/* 1. Personalized Summary & Header */}
        <section className="flex flex-col gap-2">
          <h1 className="text-[28px] font-bold text-[#44475b] tracking-tight">Good afternoon 👋</h1>
          <p className="text-[18px] text-[#44475b] font-medium">Here's what changed since you last checked.</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[13px] text-[#7c7e8c]">Last checked:</span>
            <span className="text-[13px] font-medium text-[#44475b] bg-gray-100 px-2 py-0.5 rounded">{dashboardState.lastChecked}</span>
          </div>
        </section>

        {/* 2. Attention Summary Bar */}
        <section className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[#44475b] font-bold text-[15px]">
               ⚡ MARKET WATCH
            </div>
            <div className="h-6 w-px bg-gray-200"></div>
            <div className="flex items-center gap-5 text-[14px] font-medium">
              <span className="flex items-center gap-1.5 text-[#44475b]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#eb5b3c]"></span> {dashboardState.summary.attention} Needs attention
              </span>
              <span className="flex items-center gap-1.5 text-[#44475b]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]"></span> {dashboardState.summary.worthKnowing} Worth knowing
              </span>
              <span className="flex items-center gap-1.5 text-[#7c7e8c]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00d09c]"></span> {dashboardState.summary.normal} Normal
              </span>
            </div>
          </div>
          <button onClick={() => document.getElementById('watchlist-table')?.scrollIntoView({ behavior: 'smooth' })} className="text-[#00d09c] font-medium text-[14px] flex items-center hover:text-[#00b386] transition-colors">
            Review all changes <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </section>

        {/* 3. Meaningful Change Cards (Only showing Attention & Worth Knowing here as highlights) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dashboardState.changes.filter((c: any) => c.status !== 'NORMAL').map((change: any) => (
            <div key={change.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
              {change.status === 'ATTENTION' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#eb5b3c]"></div>}
              {change.status === 'WORTH_KNOWING' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#eab308]"></div>}

              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[18px] font-bold text-[#44475b]">{change.symbol}</div>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className="text-[24px] font-semibold text-[#44475b]">₹{change.price.toLocaleString()}</span>
                  </div>
                  <div className={`mt-2 font-medium text-[14px] flex items-center gap-1 ${change.sinceLastCheck < 0 ? 'text-[#eb5b3c]' : 'text-[#00d09c]'}`}>
                     {change.sinceLastCheck < 0 ? '↓' : '↑'} {Math.abs(change.sinceLastCheck)}% since last check
                  </div>
                </div>
                
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-bold uppercase tracking-wider
                  ${change.status === 'ATTENTION' ? 'bg-red-50 text-[#eb5b3c]' : 'bg-yellow-50 text-[#eab308]'}`}>
                  <StatusIcon status={change.status} className="w-3.5 h-3.5" />
                  {change.status.replace('_', ' ')}
                </div>
              </div>

              <div className="mt-2 bg-[#fcfcfc] border border-gray-100 rounded-lg p-4">
                <div className="text-[12px] font-bold text-[#7c7e8c] uppercase tracking-wider mb-3">Why we're flagging this</div>
                <div className="flex flex-col gap-2">
                  {change.reasons.map((r: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-[13px]">
                      <span className="text-[#44475b]">{r.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#44475b]">{r.value}</span>
                        {r.context && <span className="text-[#7c7e8c] text-[11px] bg-gray-100 px-1.5 py-0.5 rounded">{r.context}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={() => setSelectedStock(change.id)} className="mt-2 text-[#00d09c] font-medium text-[14px] flex items-center self-end hover:underline">
                Why did this happen? <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          ))}
        </section>

        {/* 4. Watchlist Table */}
        <section id="watchlist-table" className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mt-4">
           
           <div className="flex items-center gap-8 px-6 border-b border-gray-100 bg-[#fcfdfd]">
             <button className="py-4 border-b-[3px] border-[#44475b] text-[#44475b] font-bold text-[15px]">
               Full Watchlist
             </button>
           </div>
           
           <div className="px-6 py-4 flex justify-between items-center border-b border-gray-100">
             <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2 w-[320px] focus-within:border-[#00d09c]">
               <Search className="w-4 h-4 text-gray-400 mr-2" />
               <input 
                 type="text" 
                 placeholder="Search your watchlist" 
                 className="bg-transparent border-none outline-none text-sm w-full" 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
             </div>
             <div className="flex gap-3 relative">
               <button onClick={() => setIsAddingStock(!isAddingStock)} className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"><Plus className="w-4 h-4"/> Add stocks</button>
               {isAddingStock && (
                 <div className="absolute top-12 right-24 bg-white border border-gray-100 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] p-3 w-64 z-10 flex gap-2">
                   <input 
                     type="text" 
                     placeholder="Symbol (e.g. RELIANCE)" 
                     className="flex-1 border border-gray-200 rounded-md px-3 py-1.5 text-sm outline-none focus:border-[#00d09c]"
                     onKeyDown={(e) => {
                       if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                         handleAddStock(e.currentTarget.value.trim().toUpperCase());
                       }
                     }}
                   />
                 </div>
               )}
               <button onClick={() => setIsEditing(!isEditing)} className={`flex items-center gap-1.5 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${isEditing ? 'border-[#00d09c] bg-[#e6f9f4] text-[#00d09c]' : 'border-gray-200 hover:bg-gray-50'}`}><Edit2 className="w-4 h-4"/> {isEditing ? 'Done' : 'Edit'}</button>
             </div>
           </div>

           <div className="overflow-x-auto">
             <table className="w-full text-left text-[14px] text-[#44475b]">
               <thead className="bg-[#fcfcfc] border-b border-gray-100 text-[#7c7e8c] font-medium text-[12px] capitalize tracking-wider">
                 <tr>
                   <th className="py-3 px-6">Company</th>
                   <th className="py-3 px-6 text-center">Trend</th>
                   <th className="py-3 px-6 text-right">Mkt price</th>
                   <th className="py-3 px-6 text-right">1D change</th>
                   <th className="py-3 px-6 text-right">1D vol</th>
                   <th className="py-3 px-6 text-center">52W perf</th>
                 </tr>
               </thead>
               <tbody>
                 {allTableData.map((row: any, idx: number) => (
                   <tr key={idx} onClick={() => !isEditing && setSelectedStock(row.symbol.toLowerCase())} className={`border-b border-gray-50 ${isEditing ? '' : 'hover:bg-gray-50/50 cursor-pointer'}`}>
                     <td className="py-4 px-6 font-medium flex items-center gap-3">
                       {isEditing && (
                         <button onClick={(e) => handleDeleteStock(e, row.symbol)} className="p-1 rounded-full bg-red-50 text-[#eb5b3c] hover:bg-red-100 transition-colors">
                           <X className="w-3 h-3" />
                         </button>
                       )}
                       <div className="w-8 h-8 rounded-full border border-gray-100 shadow-sm flex items-center justify-center bg-white overflow-hidden shrink-0">
                         <img src={`https://ui-avatars.com/api/?name=${row.companyName || row.symbol}&background=random&color=fff&bold=true`} alt="Logo" className="w-full h-full object-cover" />
                       </div>
                       <div className="flex flex-col">
                         <span className="text-[#44475b] font-medium text-[14px]">{row.companyName || row.symbol}</span>
                         <span className="text-gray-400 text-[11px] font-medium">{row.symbol}</span>
                       </div>
                     </td>

                     <td className="py-4 px-6">
                       <div className="flex justify-center items-center">
                         {row.dayChange >= 0 ? (
                           <svg width="60" height="20" viewBox="0 0 60 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                             <path d="M0 16 Q 10 14, 20 12 T 40 8 T 60 4" stroke="#00d09c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                           </svg>
                         ) : (
                           <svg width="60" height="20" viewBox="0 0 60 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                             <path d="M0 4 Q 10 6, 20 8 T 40 12 T 60 16" stroke="#eb5b3c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                           </svg>
                         )}
                       </div>
                     </td>
                     
                     <td className="py-4 px-6 text-right font-medium text-[#44475b]">₹{row.price?.toLocaleString() || '0.00'}</td>
                     
                     <td className={`py-4 px-6 text-right font-medium ${row.dayChange < 0 ? 'text-[#eb5b3c]' : 'text-[#00d09c]'}`}>
                       {row.dayChange > 0 ? '+' : ''}₹{Math.abs(row.dayChange || 0).toFixed(2)} ({Math.abs(row.dayChangePercent || 0).toFixed(2)}%)
                     </td>
                     
                     <td className="py-4 px-6 text-right font-medium text-[#44475b]">
                       {new Intl.NumberFormat('en-IN').format(row.volume || 0)}
                     </td>
                     
                     <td className="py-4 px-6">
                       <div className="flex justify-center items-center">
                         <div className="flex items-center gap-2 text-[11px] text-[#7c7e8c] font-medium">
                           <span>L</span>
                           <div className="relative w-24 h-1 bg-gray-200 rounded-full">
                             <div 
                               className="absolute top-1/2 -translate-y-1/2 w-1.5 h-3 bg-[#44475b] rounded-sm transition-all"
                               style={{ left: `${Math.min(100, Math.max(0, ((row.price - row.fiftyTwoWeekLow) / ((row.fiftyTwoWeekHigh || 1) - (row.fiftyTwoWeekLow || 0))) * 100))}%` }}
                             ></div>
                           </div>
                           <span>H</span>
                         </div>
                       </div>
                     </td>
                   </tr>
                 ))}
                 {allTableData.length === 0 && (
                   <tr>
                     <td colSpan={6} className="py-8 text-center text-gray-400">No stocks found matching your search.</td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
        </section>

      </div>

      {/* 5. Stock Intelligence Detail Panel (Side Panel) */}
      {selectedStock && selectedLive && (
        <div className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.1)] border-l border-gray-200 z-50 overflow-y-auto animate-in slide-in-from-right flex flex-col">
          <div className="sticky top-0 bg-white/90 backdrop-blur border-b border-gray-100 p-6 flex justify-between items-start z-10">
            <div>
              <div className="text-[24px] font-bold text-[#44475b]">{selectedLive.symbol}</div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-[28px] font-semibold text-[#44475b]">₹{selectedLive.price.toLocaleString()}</span>
              </div>
              <div className={`mt-2 font-medium text-[15px] flex items-center gap-1 ${selectedLive.dayChangePercent < 0 ? 'text-[#eb5b3c]' : 'text-[#00d09c]'}`}>
                 {selectedLive.dayChangePercent < 0 ? '↓' : '↑'} {Math.abs(selectedLive.dayChangePercent)}% today
              </div>
            </div>
            <button onClick={() => setSelectedStock(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 flex flex-col gap-8">
            
            {/* Status Banner */}
            {selectedChange && selectedChange.status !== 'NORMAL' && (
              <div className={`flex items-center gap-2 px-4 py-3 rounded-lg font-bold text-[14px] uppercase tracking-wider
                  ${selectedChange.status === 'ATTENTION' ? 'bg-red-50 text-[#eb5b3c]' : 'bg-yellow-50 text-[#eab308]'}`}>
                  <StatusIcon status={selectedChange.status} className="w-5 h-5" />
                  {selectedChange.status.replace('_', ' ')}
              </div>
            )}

            {selectedChange && selectedChange.status !== 'NORMAL' && (
              <>
                <section>
                  <h3 className="text-[13px] font-bold text-[#7c7e8c] uppercase tracking-wider mb-4">What Changed?</h3>
                  <div className="flex flex-col gap-3">
                    {selectedChange.reasons.map((r: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-[15px] text-[#44475b]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00d09c]"></span>
                        <span className="font-medium">{r.label}:</span>
                        <span>{r.value}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-[13px] font-bold text-[#7c7e8c] uppercase tracking-wider mb-4 flex items-center gap-2">
                     🤖 AI Market Brief
                  </h3>
                  <div className="bg-[#fcfdfd] border border-[#e6f9f4] p-5 rounded-xl text-[15px] leading-relaxed text-[#44475b] shadow-sm">
                    {selectedChange.aiBrief}
                  </div>
                </section>

                <section>
                  <h3 className="text-[13px] font-bold text-[#7c7e8c] uppercase tracking-wider mb-4">What to Watch</h3>
                  <ul className="flex flex-col gap-3">
                    {selectedChange.watchFactors.map((factor: any, i: number) => (
                       <li key={i} className="flex items-start gap-2 text-[14px] text-[#44475b] bg-gray-50 p-3 rounded-lg">
                         <Info className="w-4 h-4 text-[#00d09c] mt-0.5 shrink-0" />
                         {factor}
                       </li>
                    ))}
                  </ul>
                </section>
                
                {/* 17. Goal Impact Hook */}
                {activeGoal && (
                  <section className="mt-4 pt-6 border-t border-gray-100">
                     <div className="flex justify-between items-center bg-blue-50/50 border border-blue-100 p-4 rounded-xl">
                        <div>
                          <div className="text-[13px] font-bold text-[#44475b] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                             🎯 Goal Impact
                          </div>
                          <div className="text-[14px] text-[#44475b]">How could this affect your <strong>{activeGoal.goalName}</strong> goal?</div>
                        </div>
                        <button className="text-blue-600 font-medium text-[13px] bg-white px-3 py-1.5 rounded shadow-sm border border-blue-100">
                           Explore scenario
                        </button>
                     </div>
                  </section>
                )}
              </>
            )}

            {!selectedChange && (
              <div className="text-center py-12 text-[#7c7e8c]">
                <CheckCircle2 className="w-12 h-12 mx-auto text-[#00d09c] mb-4 opacity-50" />
                <p className="text-[16px] font-medium text-[#44475b]">Normal Trading Activity</p>
                <p className="text-[14px] mt-2">No significant events or unusual movements detected since your last check.</p>
              </div>
            )}

          </div>
          
          {/* Action Footer */}
          <div className="mt-auto sticky bottom-0 p-6 bg-white border-t border-gray-100 flex gap-4 z-10 shadow-[0_-10px_20px_rgba(255,255,255,0.9)]">
             <button onClick={() => alert("SELL order mocked!")} className="flex-1 py-3.5 bg-[#eb5b3c] hover:bg-[#d4482a] text-white font-bold rounded-lg transition-colors shadow-sm tracking-wide">SELL</button>
             <button onClick={() => alert("BUY order mocked!")} className="flex-1 py-3.5 bg-[#00d09c] hover:bg-[#00b386] text-white font-bold rounded-lg transition-colors shadow-sm tracking-wide">BUY</button>
          </div>
        </div>
      )}
      {/* Dim overlay when panel is open */}
      {selectedStock && (
        <div className="fixed inset-0 bg-black/10 z-40 transition-opacity" onClick={() => setSelectedStock(null)}></div>
      )}

    </div>
  );
}
