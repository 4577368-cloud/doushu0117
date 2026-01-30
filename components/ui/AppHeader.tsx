import React from 'react';
import { Crown } from 'lucide-react';

export const AppHeader: React.FC<{ title: string; rightAction?: React.ReactNode; isVip: boolean; guestUsage?: { count: number; limit: number } }> = ({ title, rightAction, isVip, guestUsage }) => (
  <header className={`sticky top-0 z-50 select-none pt-[env(safe-area-inset-top)] transition-all duration-500 ${isVip ? 'bg-[#1c1917] border-b border-amber-900/30 shadow-2xl' : 'bg-white/90 backdrop-blur-md border-b border-stone-200 text-stone-900'}`}>
    <div className="h-16 px-5 flex items-center justify-between">
      <h1 className={`text-lg font-serif font-black tracking-wider flex items-center gap-2.5 ${isVip ? 'text-amber-100' : 'text-stone-900'}`}>
        {isVip && (
            <div className="relative">
                <div className="absolute inset-0 bg-amber-400 blur-sm opacity-20 animate-pulse"></div>
                <Crown size={20} className="text-amber-400 fill-amber-400" />
            </div>
        )}
        <span className={isVip ? "bg-clip-text text-transparent bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100" : ""}>{title}</span>
      </h1>
      <div className="flex items-center gap-3">
        {guestUsage && !isVip && (
          <div className="flex items-center gap-2 bg-stone-100/80 px-3 py-1.5 rounded-full border border-stone-200/60 shadow-sm backdrop-blur-sm">
             <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wide">今日额度</span>
             <div className="h-3 w-[1px] bg-stone-300"></div>
             <span className={`text-xs font-black font-mono ${guestUsage.count >= guestUsage.limit ? 'text-rose-500' : 'text-stone-600'}`}>
                {Math.max(0, guestUsage.limit - guestUsage.count)}<span className="text-stone-300 mx-0.5">/</span>{guestUsage.limit}
             </span>
          </div>
        )}
        {rightAction}
      </div>
    </div>
  </header>
);
