import React from 'react';
import { X, Lock, Crown, ChevronRight } from 'lucide-react';

interface QuotaLimitModalProps {
  onClose: () => void;
  onUpgrade?: () => void;
}

export const QuotaLimitModal: React.FC<QuotaLimitModalProps> = ({ onClose, onUpgrade }) => {
  const handleUpgrade = () => {
    onClose();
    onUpgrade?.();
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-stone-200 ring-1 ring-black/5 animate-slide-up">
        {/* Top Right Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-400 hover:text-stone-600 transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col items-center text-center mt-2">
          <div className="bg-amber-50 p-4 rounded-full mb-4 border border-amber-100">
            <Lock size={32} className="text-amber-500" />
          </div>

          <h4 className="font-bold text-lg mb-2 text-stone-900">今日排盘额度已用完</h4>

          <p className="text-sm text-stone-500 leading-relaxed mb-4">
            每位访客每日可免费排盘 3 次。<br/>
            您的今日额度已耗尽，升级 VIP 可无限次排盘。
          </p>

          <div className="w-full space-y-2 mb-5">
            <div className="flex items-center justify-between text-xs text-stone-600 bg-stone-50 rounded-lg px-3 py-2">
              <span>每日免费排盘</span>
              <span className="font-bold">3 次</span>
            </div>
            <div className="flex items-center justify-between text-xs text-stone-600 bg-stone-50 rounded-lg px-3 py-2">
              <span>VIP 权益</span>
              <span className="font-bold text-amber-600">无限次排盘</span>
            </div>
          </div>

          <div className="flex w-full gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-stone-600 hover:bg-stone-50 active:scale-95 transition-all"
            >
              稍后再说
            </button>
            <button
              onClick={handleUpgrade}
              className="flex-1 rounded-xl bg-stone-900 px-4 py-3 text-sm font-bold text-amber-400 hover:bg-stone-800 active:scale-95 transition-all flex items-center justify-center gap-1"
            >
              <Crown size={14} />
              升级 VIP
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
