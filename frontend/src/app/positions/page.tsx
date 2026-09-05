"use client";

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, RefreshCw, AlertCircle, Filter, ChevronDown, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface Position {
  id: string;
  symbol: string;
  companyName: string;
  type: 'BUY' | 'SELL';
  product: 'INTRADAY' | 'MTF' | 'FNO';
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  dayChangePct: number;
  unrealizedPnl: number;
  realizedPnl: number;
}

const mockPositions: Position[] = [
  {
    id: 'pos-1',
    symbol: 'TATAMOTORS',
    companyName: 'Tata Motors Limited',
    type: 'BUY',
    product: 'INTRADAY',
    quantity: 25,
    avgPrice: 985.50,
    currentPrice: 1002.30,
    dayChangePct: 1.70,
    unrealizedPnl: 420.00,
    realizedPnl: 0,
  },
  {
    id: 'pos-2',
    symbol: 'INFY',
    companyName: 'Infosys Limited',
    type: 'BUY',
    product: 'MTF',
    quantity: 15,
    avgPrice: 1840.00,
    currentPrice: 1822.50,
    dayChangePct: -0.95,
    unrealizedPnl: -262.50,
    realizedPnl: 0,
  },
  {
    id: 'pos-3',
    symbol: 'NIFTY 24000 CE',
    companyName: 'NIFTY 26 SEP 24000 CALL',
    type: 'BUY',
    product: 'FNO',
    quantity: 75,
    avgPrice: 145.20,
    currentPrice: 168.80,
    dayChangePct: 16.25,
    unrealizedPnl: 1770.00,
    realizedPnl: 350.00,
  },
];

export default function PositionsPage() {
  const [filter, setFilter] = useState<'ALL' | 'INTRADAY' | 'MTF' | 'FNO'>('ALL');
  const [positions, setPositions] = useState<Position[]>(mockPositions);
  const [closedNotice, setClosedNotice] = useState<string | null>(null);

  const filteredPositions = positions.filter(p => filter === 'ALL' || p.product === filter);

  const totalUnrealizedPnl = positions.reduce((acc, p) => acc + p.unrealizedPnl, 0);
  const totalRealizedPnl   = positions.reduce((acc, p) => acc + p.realizedPnl, 0);
  const totalInvested      = positions.reduce((acc, p) => acc + p.avgPrice * p.quantity, 0);
  const totalCurrentValue  = positions.reduce((acc, p) => acc + p.currentPrice * p.quantity, 0);

  const handleExitPosition = (id: string, symbol: string) => {
    setPositions(prev => prev.filter(p => p.id !== id));
    setClosedNotice(`Position in ${symbol} exited successfully.`);
    setTimeout(() => setClosedNotice(null), 4000);
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto px-6 py-6 pb-20 flex gap-8 items-start">
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-6">

        {closedNotice && (
          <div className="bg-[#e6f9f4] border border-[#00d09c]/30 text-[#00b386] px-4 py-3 rounded-xl flex items-center justify-between text-sm font-medium animate-fadeIn">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#00d09c]" /> {closedNotice}
            </span>
            <button onClick={() => setClosedNotice(null)} className="hover:opacity-75">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* Positions Summary Header Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[13px] font-bold text-[#7c7e8c] uppercase tracking-wider">
                Positions Summary ({positions.length} Active)
              </div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className={`text-[32px] font-bold ${totalUnrealizedPnl >= 0 ? 'text-[#00d09c]' : 'text-[#eb5b3c]'}`}>
                  {totalUnrealizedPnl >= 0 ? '+' : ''}₹{totalUnrealizedPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-sm font-semibold text-[#7c7e8c]">
                  Unrealized P&L
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === 'ALL' ? 'bg-[#44475b] text-white' : 'bg-gray-100 text-[#7c7e8c] hover:bg-gray-200'}`}
              >
                All
              </button>
              <button 
                onClick={() => setFilter('INTRADAY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === 'INTRADAY' ? 'bg-[#44475b] text-white' : 'bg-gray-100 text-[#7c7e8c] hover:bg-gray-200'}`}
              >
                Intraday
              </button>
              <button 
                onClick={() => setFilter('MTF')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === 'MTF' ? 'bg-[#44475b] text-white' : 'bg-gray-100 text-[#7c7e8c] hover:bg-gray-200'}`}
              >
                MTF
              </button>
              <button 
                onClick={() => setFilter('FNO')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === 'FNO' ? 'bg-[#44475b] text-white' : 'bg-gray-100 text-[#7c7e8c] hover:bg-gray-200'}`}
              >
                F&O
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-100 text-[#44475b]">
            <div>
              <div className="text-[13px] text-[#7c7e8c] mb-1">Total Position Value</div>
              <div className="font-semibold text-lg">₹{totalCurrentValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="text-center">
              <div className="text-[13px] text-[#7c7e8c] mb-1">Realized P&L Today</div>
              <div className={`font-semibold text-lg ${totalRealizedPnl >= 0 ? 'text-[#00d09c]' : 'text-[#eb5b3c]'}`}>
                {totalRealizedPnl >= 0 ? '+' : ''}₹{totalRealizedPnl.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[13px] text-[#7c7e8c] mb-1">Margin Blocked</div>
              <div className="font-semibold text-lg text-[#44475b]">₹{(totalInvested * 0.25).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            </div>
          </div>
        </div>

        {/* Positions Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {filteredPositions.length > 0 ? (
            <table className="w-full text-left text-sm text-[#44475b]">
              <thead className="bg-[#fcfcfc] border-b border-gray-100 text-[#7c7e8c] font-medium text-[13px]">
                <tr>
                  <th className="py-4 px-6 font-medium">Instrument</th>
                  <th className="py-4 px-6 font-medium text-center">Product</th>
                  <th className="py-4 px-6 font-medium text-right">Qty & Avg</th>
                  <th className="py-4 px-6 font-medium text-right">LTP (1D%)</th>
                  <th className="py-4 px-6 font-medium text-right">P&L (₹)</th>
                  <th className="py-4 px-6 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPositions.map((row) => {
                  const isProfit = row.unrealizedPnl >= 0;
                  return (
                    <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${row.type === 'BUY' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                            {row.type}
                          </span>
                          <span className="font-bold text-[15px] text-[#44475b]">{row.symbol}</span>
                        </div>
                        <div className="text-[12px] text-[#7c7e8c] mt-0.5">{row.companyName}</div>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <span className="px-2 py-0.5 bg-gray-100 text-[#7c7e8c] rounded text-[11px] font-semibold">
                          {row.product}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="font-semibold text-[#44475b]">{row.quantity} Qty</div>
                        <div className="text-[12px] text-[#7c7e8c] mt-0.5">Avg: ₹{row.avgPrice.toFixed(2)}</div>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="font-semibold text-[#44475b]">₹{row.currentPrice.toFixed(2)}</div>
                        <div className={`text-[12px] font-medium mt-0.5 flex items-center justify-end gap-0.5 ${row.dayChangePct >= 0 ? 'text-[#00d09c]' : 'text-[#eb5b3c]'}`}>
                          {row.dayChangePct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {row.dayChangePct >= 0 ? '+' : ''}{row.dayChangePct.toFixed(2)}%
                        </div>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className={`font-bold text-[15px] ${isProfit ? 'text-[#00d09c]' : 'text-[#eb5b3c]'}`}>
                          {isProfit ? '+' : ''}₹{row.unrealizedPnl.toFixed(2)}
                        </div>
                        <div className={`text-[11px] font-medium mt-0.5 ${isProfit ? 'text-[#00d09c]' : 'text-[#eb5b3c]'}`}>
                          {((row.unrealizedPnl / (row.avgPrice * row.quantity)) * 100).toFixed(2)}%
                        </div>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => handleExitPosition(row.id, row.symbol)}
                          className="px-3 py-1.5 border border-[#eb5b3c] text-[#eb5b3c] hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Exit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-[#7c7e8c]">
              <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <div className="text-[16px] font-semibold text-[#44475b]">No Open Positions</div>
              <div className="text-sm text-[#7c7e8c] mt-1">Intraday, MTF, and F&O positions will appear here once executed.</div>
            </div>
          )}
        </div>

      </div>

      {/* Right Sidebar */}
      <div className="w-[320px] flex flex-col gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
          <h3 className="font-bold text-[16px] text-[#44475b]">Position Rules & Limits</h3>
          
          <div className="flex flex-col gap-3 text-xs text-[#7c7e8c]">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex flex-col gap-1">
              <span className="font-bold text-[#44475b]">Auto Square-off Time</span>
              <span>Intraday MIS positions will be squared off automatically at 3:15 PM IST.</span>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex flex-col gap-1">
              <span className="font-bold text-[#44475b]">MTF Margin Requirement</span>
              <span>Maintain minimum 25% margin to prevent automated liquidations.</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
