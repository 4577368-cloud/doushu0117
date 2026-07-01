import React from 'react';
import { Home, ScrollText, User, Settings, MessageCircle } from 'lucide-react';
import { AppTab } from '../types';

interface BottomNavProps {
  currentTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
  const navItems = [
    { id: AppTab.HOME, label: '首页', icon: Home },
    { id: AppTab.CHART, label: '排盘', icon: ScrollText },
    { id: AppTab.CHAT, label: 'AI对话', icon: MessageCircle },
    { id: AppTab.ARCHIVE, label: '档案', icon: User },
    { id: AppTab.PROFILE, label: '我的', icon: Settings },
  ];

  return (
    <div className="bg-white border-t border-stone-200 flex items-start justify-around px-2 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))] relative z-50 select-none">
      {navItems.map((item) => {
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300 ${
              isActive 
                ? 'text-stone-900 scale-105' 
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            <div className={`p-1.5 rounded-2xl transition-all ${isActive ? 'bg-stone-100' : 'bg-transparent'}`}>
              <item.icon 
                size={isActive ? 24 : 22} 
                strokeWidth={isActive ? 2.5 : 2}
              />
            </div>
            <span className={`text-[10px] font-bold ${isActive ? 'opacity-100' : 'opacity-80'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
