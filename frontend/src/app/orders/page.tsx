"use client";

import React, { useState } from 'react';
import { CheckCircle2, XCircle, Clock, Filter, AlertTriangle, ArrowUpRight, ArrowDownRight, Search } from 'lucide-react';

interface Order {
  id: string;
  symbol: string;
  companyName: string;
  type: 'BUY' | 'SELL';
  product: 'DELIVERY' | 'INTRADAY' | 'MTF' | 'GTT';
  quantity: number;
  filledQty: number;
  orderPrice: number;
  avgExecutedPrice: number;
  status: 'EXECUTED' | 'PENDING' | 'CANCELLED' | 'REJECTED';
  timestamp: string;
}

const mockOrders: Order[] = [
  {
    id: 'ord-101',
    symbol: 'RELIANCE',
    companyName: 'Reliance Industries Ltd.',
    type: 'BUY',
    product: 'DELIVERY',
    quantity: 10,
    filledQty: 10,
    orderPrice: 2980.00,
    avgExecutedPrice: 2978.50,
    status: 'EXECUTED',
    timestamp: '14:22:10 IST',
  },
  {
    id: 'ord-102',
    symbol: 'TCS',
    companyName: 'Tata Consultancy Services Ltd.',
    type: 'BUY',
    product: 'INTRADAY',
    quantity: 5,
    filledQty: 0,
    orderPrice: 4210.00,
    avgExecutedPrice: 0,
    status: 'PENDING',
    timestamp: '15:02:45 IST',
  },
  {
    id: 'ord-103',
    symbol: 'HDFCBANK',
    companyName: 'HDFC Bank Limited',
    type: 'SELL',
    product: 'DELIVERY',
    quantity: 20,
    filledQty: 20,
    orderPrice: 1640.00,
    avgExecutedPrice: 1642.10,
    status: 'EXECUTED',
    timestamp: '11:15:02 IST',
  },
  {
    id: 'ord-104',
    symbol: 'ZOMATO',
    companyName: 'Eternal (Zomato) Ltd.',
    type: 'BUY',
    product: 'GTT',
    quantity: 100,
    filledQty: 0,
    orderPrice: 240.00,
    avgExecutedPrice: 0,
    status: 'CANCELLED',
    timestamp: '09:45:18 IST',
  },
];

export default function OrdersPage() {
  const [filter, setFilter] = useState<'ALL' | 'EXECUTED' | 'PENDING' | 'CANCELLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const filteredOrders = orders.filter(o => {
    const matchesFilter = filter === 'ALL' || o.status === filter;
    const matchesSearch = o.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          o.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const executedCount = orders.filter(o => o.status === 'EXECUTED').length;
  const pendingCount  = orders.filter(o => o.status === 'PENDING').length;
  const cancelledCount = orders.filter(o => o.status === 'CANCELLED').length;

  const handleCancelOrder = (id: string, symbol: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'CANCELLED' } : o));
    setActionNotice(`Order for ${symbol} cancelled.`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'EXECUTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#e6f9f4] text-[#00d09c]">
            <CheckCircle2 className="w-3 h-3" /> Executed
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-yellow-50 text-yellow-600">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-500">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-red-50 text-[#eb5b3c]">
            <AlertTriangle className="w-3 h-3" /> Rejected
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto px-6 py-6 pb-20 flex gap-8 items-start">
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-6">

        {actionNotice && (
          <div className="bg-[#e6f9f4] border border-[#00d09c]/30 text-[#00b386] px-4 py-3 rounded-xl flex items-center justify-between text-sm font-medium animate-fadeIn">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#00d09c]" /> {actionNotice}
            </span>
            <button onClick={() => setActionNotice(null)} className="hover:opacity-75">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* Orders Header Summary */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-[#44475b]">Order Book</h1>
            <p className="text-xs text-[#7c7e8c] mt-0.5">Real-time status of your trade orders today</p>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex flex-col items-center px-4 py-2 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-[11px] font-bold text-[#7c7e8c] uppercase">Executed</span>
              <span className="text-lg font-bold text-[#00d09c]">{executedCount}</span>
            </div>
            <div className="flex flex-col items-center px-4 py-2 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-[11px] font-bold text-[#7c7e8c] uppercase">Pending</span>
              <span className="text-lg font-bold text-yellow-600">{pendingCount}</span>
            </div>
            <div className="flex flex-col items-center px-4 py-2 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-[11px] font-bold text-[#7c7e8c] uppercase">Cancelled</span>
              <span className="text-lg font-bold text-gray-500">{cancelledCount}</span>
            </div>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex justify-between items-center bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === 'ALL' ? 'bg-[#44475b] text-white' : 'bg-gray-100 text-[#7c7e8c] hover:bg-gray-200'}`}
            >
              All Orders ({orders.length})
            </button>
            <button
              onClick={() => setFilter('PENDING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === 'PENDING' ? 'bg-[#44475b] text-white' : 'bg-gray-100 text-[#7c7e8c] hover:bg-gray-200'}`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('EXECUTED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === 'EXECUTED' ? 'bg-[#44475b] text-white' : 'bg-gray-100 text-[#7c7e8c] hover:bg-gray-200'}`}
            >
              Executed ({executedCount})
            </button>
            <button
              onClick={() => setFilter('CANCELLED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === 'CANCELLED' ? 'bg-[#44475b] text-white' : 'bg-gray-100 text-[#7c7e8c] hover:bg-gray-200'}`}
            >
              Cancelled ({cancelledCount})
            </button>
          </div>

          <div className="flex items-center bg-[#f5f6f9] border border-transparent focus-within:border-[#00d09c] focus-within:bg-white rounded-lg px-3 py-1.5 w-[220px] transition-colors">
            <Search className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search order..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-full text-[#44475b]"
            />
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {filteredOrders.length > 0 ? (
            <table className="w-full text-left text-sm text-[#44475b]">
              <thead className="bg-[#fcfcfc] border-b border-gray-100 text-[#7c7e8c] font-medium text-[13px]">
                <tr>
                  <th className="py-4 px-6 font-medium">Time & Instrument</th>
                  <th className="py-4 px-6 font-medium text-center">Type & Product</th>
                  <th className="py-4 px-6 font-medium text-right">Qty (Filled)</th>
                  <th className="py-4 px-6 font-medium text-right">Order / Avg Price</th>
                  <th className="py-4 px-6 font-medium text-center">Status</th>
                  <th className="py-4 px-6 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
                    <td className="py-4 px-6">
                      <div className="text-[11px] text-[#7c7e8c] font-mono">{row.timestamp}</div>
                      <div className="font-bold text-[15px] text-[#44475b] mt-0.5">{row.symbol}</div>
                      <div className="text-[12px] text-[#7c7e8c]">{row.companyName}</div>
                    </td>

                    <td className="py-4 px-6 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.type === 'BUY' ? 'bg-emerald-50 text-[#00d09c]' : 'bg-red-50 text-[#eb5b3c]'}`}>
                          {row.type}
                        </span>
                        <span className="text-[11px] text-[#7c7e8c] font-medium">{row.product}</span>
                      </div>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="font-semibold text-[#44475b]">{row.quantity} shares</div>
                      <div className="text-[12px] text-[#7c7e8c] mt-0.5">Filled: {row.filledQty}/{row.quantity}</div>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="font-semibold text-[#44475b]">₹{row.orderPrice.toFixed(2)}</div>
                      <div className="text-[12px] text-[#7c7e8c] mt-0.5">
                        {row.avgExecutedPrice > 0 ? `Avg: ₹${row.avgExecutedPrice.toFixed(2)}` : 'Limit Order'}
                      </div>
                    </td>

                    <td className="py-4 px-6 text-center">
                      {getStatusBadge(row.status)}
                    </td>

                    <td className="py-4 px-6 text-center">
                      {row.status === 'PENDING' ? (
                        <button
                          onClick={() => handleCancelOrder(row.id, row.symbol)}
                          className="px-3 py-1 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded text-xs font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-[#7c7e8c]">
              <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <div className="text-[16px] font-semibold text-[#44475b]">No Orders Found</div>
              <div className="text-sm text-[#7c7e8c] mt-1">Orders placed during trading hours will appear here.</div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
