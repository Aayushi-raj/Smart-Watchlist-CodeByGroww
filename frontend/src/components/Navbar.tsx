"use client";
import React from 'react';
import { Search, Bell, User } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  const getTabClass = (path: string) => {
    // If the path is exact match, or we're at root and the path is /explore
    const isActive = pathname === path || (pathname === '/' && path === '/');
    return isActive 
      ? "text-[#44475b] h-full flex items-center border-b-[3px] border-[#44475b] pt-[3px]"
      : "hover:text-[#44475b] h-full flex items-center";
  };

  return (
    <div className="flex flex-col w-full bg-white border-b border-gray-100 sticky top-0 z-50">
      {/* Top Navbar */}
      <div className="max-w-[1200px] w-full mx-auto px-6 h-[72px] flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.jpg" alt="Groww Logo" width={40} height={40} className="rounded-full shadow-sm object-cover" />
          </Link>
          
          <div className="hidden md:flex gap-8 font-medium text-[15px] text-[#44475b]">
            <Link href="/" className="text-[#44475b] font-semibold">Stocks</Link>
            <Link href="#" className="hover:text-black transition-colors">F&O</Link>
            <Link href="#" className="hover:text-black transition-colors">Mutual Funds</Link>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center bg-[#f5f6f9] px-4 py-2.5 rounded-lg border border-transparent focus-within:border-[#00d09c] focus-within:bg-white transition-all w-[350px]">
            <Search className="w-[18px] h-[18px] text-[#7c7e8c] mr-3" />
            <input 
              type="text" 
              placeholder="Search Groww...." 
              className="bg-transparent border-none outline-none text-[14px] w-full text-[#44475b] placeholder:text-[#7c7e8c]"
            />
            <div className="text-[11px] text-[#7c7e8c] bg-white px-1.5 py-0.5 rounded shadow-sm border border-gray-200">
              Ctrl+K
            </div>
          </div>
          
          <button className="text-[#44475b] hover:text-black transition-colors relative">
            <Bell className="w-6 h-6" />
          </button>
          <button className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden border border-gray-200">
            {/* Profile placeholder */}
            <User className="w-full h-full text-gray-400 p-1 mt-1" />
          </button>
        </div>
      </div>

      {/* Sub Navbar */}
      <div className="max-w-[1200px] w-full mx-auto px-6 h-[48px] flex items-center justify-between text-[14px]">
        <div className="flex items-center gap-8 h-full text-[#7c7e8c] font-medium">
          <Link href="/" className={getTabClass('/')}>Explore</Link>
          <Link href="/holdings" className={getTabClass('/holdings')}>Holdings</Link>
          <Link href="/positions" className={getTabClass('/positions')}>Positions</Link>
          <Link href="/orders" className={getTabClass('/orders')}>Orders</Link>
          <Link href="/watchlist" className={getTabClass('/watchlist')}>Watchlist</Link>
        </div>
        
        <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded text-xs font-medium text-[#44475b] hover:bg-gray-50">
          <span className="font-mono text-[10px]">00</span> Terminal
        </button>
      </div>
      
      {/* Ticker Tape */}
      <div className="border-t border-gray-100 bg-white">
        <div className="max-w-[1200px] w-full mx-auto px-6 py-3 flex items-center gap-8 text-[13px] overflow-x-auto whitespace-nowrap hide-scrollbar">
          <div className="flex gap-2 items-center">
            <span className="text-[#44475b] font-medium">NIFTY</span>
            <span className="text-[#44475b]">23,936.15</span>
            <span className="text-[#00d09c]">62.70 (0.26%)</span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-[#44475b] font-medium">SENSEX</span>
            <span className="text-[#44475b]">76,655.84</span>
            <span className="text-[#00d09c]">502.98 (0.66%)</span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-[#44475b] font-medium">BANKNIFTY</span>
            <span className="text-[#44475b]">57,467.50</span>
            <span className="text-[#00d09c]">86.90 (0.15%)</span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-[#44475b] font-medium">MIDCPNIFTY</span>
            <span className="text-[#44475b]">14,727.05</span>
            <span className="text-[#eb5b3c]">-32.95 (0.22%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
