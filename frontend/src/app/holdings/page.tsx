import React from 'react';
import { Eye, MoreVertical, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';

const holdingsData = [
  {
    company: 'JIO Financial Serv.',
    shares: 5,
    avg: 295.40,
    mktPrice: 239.75,
    dChange: 2.30,
    dpChange: 0.97,
    returns: -278.25,
    rpChange: -18.84,
    current: 1198.75,
    invested: 1477.00,
    isUp: true
  },
  {
    company: 'NIFTYBEES',
    shares: 1,
    avg: 295.59,
    mktPrice: 273.31,
    dChange: 9.88,
    dpChange: 3.75,
    returns: -22.28,
    rpChange: -7.53,
    current: 273.31,
    invested: 295.59,
    isUp: true
  }
];

export default function HoldingsPage() {
  return (
    <div className="w-full max-w-[1200px] mx-auto px-6 py-6 pb-20 flex gap-8 items-start">
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-6">
        
        {/* Holdings Summary Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[13px] font-bold text-[#44475b] flex items-center gap-1 cursor-pointer">
                HOLDINGS (2) <span className="text-[10px]">▼</span>
              </div>
              <div className="text-[32px] font-bold text-[#44475b] mt-1">₹1,472</div>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-[#44475b] hover:bg-gray-50 transition-colors">
                <BarChart2 className="w-4 h-4" /> Analyse
              </button>
              <button className="p-2 border border-gray-200 rounded-lg text-[#44475b] hover:bg-gray-50 transition-colors">
                <Eye className="w-4 h-4" />
              </button>
              <button className="p-2 border border-gray-200 rounded-lg text-[#44475b] hover:bg-gray-50 transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center pt-6 border-t border-gray-100 text-[#44475b]">
            <div>
              <div className="text-[13px] text-[#7c7e8c] mb-1">Invested value</div>
              <div className="font-medium text-lg">₹1,773</div>
            </div>
            <div className="text-center">
              <div className="text-[13px] text-[#7c7e8c] mb-1">1D returns</div>
              <div className="font-medium text-lg text-[#00d09c]">+₹12.18 (0.83%)</div>
            </div>
            <div className="text-right">
              <div className="text-[13px] text-[#7c7e8c] mb-1">Total returns</div>
              <div className="font-medium text-lg text-[#eb5b3c]">-₹300.53 (16.95%)</div>
            </div>
          </div>
        </div>

        {/* Holdings Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm text-[#44475b]">
            <thead className="bg-[#fcfcfc] border-b border-gray-100 text-[#7c7e8c] font-medium text-[13px]">
              <tr>
                <th className="py-4 px-6 font-medium">Company <span className="text-[10px]">▼</span></th>
                <th className="py-4 px-6 font-medium text-center">Trend</th>
                <th className="py-4 px-6 font-medium text-right">Market price (1D%) <span className="text-[10px]">▼</span></th>
                <th className="py-4 px-6 font-medium text-right">Returns (%) <span className="text-[10px]">▼</span></th>
                <th className="py-4 px-6 font-medium text-right">Current (Invested) <span className="text-[10px]">▼</span></th>
              </tr>
            </thead>
            <tbody>
              {holdingsData.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors cursor-pointer">
                  <td className="py-4 px-6">
                    <div className="font-medium text-[15px]">{row.company}</div>
                    <div className="text-[12px] text-[#7c7e8c] mt-1">{row.shares} shares • Avg. ₹{row.avg.toFixed(2)}</div>
                  </td>
                  <td className="py-4 px-6">
                    {/* Mock Sparkline */}
                    <div className="w-16 h-6 mx-auto flex items-center">
                       {row.isUp ? 
                         <svg viewBox="0 0 100 30" className="w-full h-full stroke-[#00d09c] stroke-2 fill-none stroke-linecap-round stroke-linejoin-round">
                           <path d="M0,20 L20,22 L40,18 L60,25 L80,5 L100,5" />
                         </svg> : 
                         <svg viewBox="0 0 100 30" className="w-full h-full stroke-[#eb5b3c] stroke-2 fill-none stroke-linecap-round stroke-linejoin-round">
                           <path d="M0,10 L20,8 L40,15 L60,5 L80,25 L100,22" />
                         </svg>
                       }
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="font-medium text-[15px]">₹{row.mktPrice.toFixed(2)}</div>
                    <div className="text-[#00d09c] text-[13px] mt-1">+{row.dChange.toFixed(2)} ({row.dpChange}%)</div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="font-medium text-[15px]">-{Math.abs(row.returns).toFixed(2)}</div>
                    <div className="text-[#eb5b3c] text-[13px] mt-1">{Math.abs(row.rpChange).toFixed(2)}%</div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="font-medium text-[15px]">₹{row.current.toFixed(2)}</div>
                    <div className="text-[#7c7e8c] text-[13px] mt-1">₹{row.invested.toFixed(2)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-[300px] hidden lg:block">
        <div className="bg-white border border-gray-200 rounded-xl p-6 h-[400px] shadow-sm flex items-center justify-center relative overflow-hidden">
          <div className="w-full h-32 absolute bottom-12 border-t border-b border-gray-100 flex items-center justify-center">
             <div className="w-32 h-8 bg-[#00d09c]/10 rounded cursor-pointer relative flex items-center justify-center group">
               <div className="absolute -right-6 -bottom-6 opacity-60 group-hover:opacity-100 transition-opacity">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M8 12L12 8M12 8L16 12M12 8V16" stroke="#44475b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                 </svg>
               </div>
             </div>
          </div>
        </div>
      </div>

    </div>
  );
}
