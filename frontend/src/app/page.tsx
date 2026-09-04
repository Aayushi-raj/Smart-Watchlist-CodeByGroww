import React from 'react';
import { ChevronRight, ChevronDown, Megaphone } from 'lucide-react';
import Link from 'next/link';

const mostBought = [
  { company: 'PC Jeweller', symbol: 'PCJ', price: 11.84, change: 1.32, pChange: 12.55, isUp: true },
  { company: 'IFCI', symbol: 'IFCI', price: 101.50, change: 5.59, pChange: 5.83, isUp: true },
  { company: 'Skipper', symbol: 'SKIPPER', price: 591.95, change: 45.05, pChange: 8.24, isUp: true },
  { company: 'Jain Irrigation Sys', symbol: 'JISLJALEQS', price: 30.68, change: 2.52, pChange: 8.95, isUp: true }
];

const topGainers = [
  { company: 'Power Finance Corpn.', symbol: 'PFC', icon: 'P' },
  { company: 'SBI Life Insurance', symbol: 'SBILIFE', icon: 'S' },
  { company: 'Tata Steel', symbol: 'TATASTEEL', icon: 'T' },
  { company: 'Hyundai Motor India', symbol: 'HYUNDAI', icon: 'H' },
  { company: 'Hindustan Aeronaut.', symbol: 'HAL', icon: 'H' }
];

export default function ExplorePage() {
  return (
    <div className="w-full max-w-[1200px] mx-auto px-6 py-6 pb-20 flex gap-8 items-start">
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-10">
        
        {/* Most Bought Section */}
        <section className="flex flex-col gap-4">
          <h2 className="text-[20px] font-bold text-[#44475b]">Most bought stocks on Groww</h2>
          <div className="grid grid-cols-4 gap-4">
            {mostBought.map((item, idx) => (
              <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[150px]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border border-gray-100 rounded-xl flex items-center justify-center text-[11px] font-bold text-gray-500 bg-gray-50">
                    {item.symbol.substring(0, 4)}
                  </div>
                </div>
                <div className="mt-3 text-[15px] font-medium text-[#44475b] leading-tight break-words line-clamp-2">{item.company}</div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <div className="font-semibold text-[16px] text-[#44475b]">₹{item.price.toFixed(2)}</div>
                  <div className="text-[13px] text-[#00d09c] font-medium">{item.change.toFixed(2)} ({item.pChange}%)</div>
                </div>
              </div>
            ))}
          </div>
          <button className="text-[#00d09c] font-medium text-[14px] self-start flex items-center mt-2 hover:text-[#00b386]">
            See more <ChevronRight className="w-4 h-4 ml-0.5" />
          </button>
        </section>

        {/* Top Movers Section */}
        <section className="flex flex-col gap-6">
          <h2 className="text-[20px] font-bold text-[#44475b]">Top movers today</h2>
          
          <div className="flex gap-3">
            <button className="px-4 py-2 border border-[#44475b] text-[#44475b] font-medium text-[13px] rounded-full">Gainers</button>
            <button className="px-4 py-2 border border-gray-200 text-[#7c7e8c] font-medium text-[13px] rounded-full hover:bg-gray-50">Losers</button>
            <button className="px-4 py-2 border border-gray-200 text-[#7c7e8c] font-medium text-[13px] rounded-full hover:bg-gray-50">Volume shockers</button>
            <button className="px-4 py-2 border border-gray-200 text-[#44475b] font-medium text-[13px] rounded-full flex items-center gap-1 hover:bg-gray-50">
              NIFTY 100 <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4">
             {/* decorative illustration placeholder */}
             <div className="w-full h-[180px] bg-gradient-to-r from-blue-50 to-[#e6f9f4] rounded-2xl flex items-center justify-center relative overflow-hidden mb-8 border border-gray-100">
                <div className="absolute left-1/4 bottom-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
                <div className="absolute right-1/4 top-0 w-32 h-32 bg-[#00d09c]/20 rounded-full blur-3xl"></div>
                <div className="text-center z-10">
                   <h3 className="text-2xl font-bold text-[#44475b]">No open positions</h3>
                   <p className="text-[#7c7e8c] mt-2">Equity intraday and MTF positions will appear here</p>
                </div>
             </div>

             <div className="flex justify-between items-center mb-4">
               <h3 className="text-[18px] font-bold text-[#44475b]">Top Gainers</h3>
               <button className="text-[#00d09c] font-medium text-[14px]">See more</button>
             </div>
             
             <div className="flex gap-2 mb-4">
                <button className="px-3 py-1 bg-[#e6f9f4] text-[#00d09c] text-[12px] font-medium rounded-full">Large</button>
                <button className="px-3 py-1 border border-gray-200 text-[#7c7e8c] text-[12px] font-medium rounded-full hover:bg-gray-50">Mid</button>
                <button className="px-3 py-1 border border-gray-200 text-[#7c7e8c] text-[12px] font-medium rounded-full hover:bg-gray-50">Small</button>
             </div>

             <div className="grid grid-cols-5 gap-4">
               {topGainers.map((item, idx) => (
                 <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-[120px]">
                   <div className="w-10 h-10 border border-gray-100 rounded-full flex items-center justify-center text-[12px] font-bold text-gray-400 bg-gray-50">
                     {item.icon}
                   </div>
                   <div className="mt-4 text-[13px] font-medium text-[#44475b] leading-tight">{item.company}</div>
                 </div>
               ))}
             </div>
          </div>
        </section>

      </div>

      {/* Right Sidebar */}
      <div className="w-[340px] flex flex-col gap-8">
        
        {/* Your Investments Widget */}
        <section>
          <h2 className="text-[18px] font-bold text-[#44475b] mb-4">Your investments</h2>
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="text-[13px] text-[#7c7e8c] mb-1">Current</div>
            <div className="text-[24px] font-bold text-[#44475b] mb-6">₹1,472</div>
            
            <div className="flex justify-between items-center mb-4 text-[14px]">
              <span className="text-[#7c7e8c]">1D returns</span>
              <span className="text-[#00d09c] font-medium">+₹12.24 (0.84%)</span>
            </div>
            
            <div className="flex justify-between items-center mb-4 text-[14px]">
              <span className="text-[#7c7e8c]">Total returns</span>
              <span className="text-[#eb5b3c] font-medium">-₹300.47 (16.95%)</span>
            </div>
            
            <div className="flex justify-between items-center text-[14px] pt-4 border-t border-gray-100">
              <span className="text-[#7c7e8c]">Invested</span>
              <span className="font-medium text-[#44475b]">₹1,773</span>
            </div>
          </div>
        </section>

        {/* Products & Tools */}
        <section>
          <h2 className="text-[18px] font-bold text-[#44475b] mb-4">Products & Tools</h2>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <Megaphone className="w-5 h-5 text-[#00d09c]" />
              <span className="font-medium text-[#44475b]">IPO</span>
            </div>
            <span className="text-[12px] font-medium text-[#00d09c] bg-[#e6f9f4] px-2 py-1 rounded">1 open</span>
          </div>
        </section>

      </div>

    </div>
  );
}
