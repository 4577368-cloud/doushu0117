import React, { useEffect, useState } from 'react';
import { X, Lock } from 'lucide-react';

interface QuotaLimitModalProps {
  onClose: () => void;
}

export const QuotaLimitModal: React.FC<QuotaLimitModalProps> = ({ onClose }) => {
  const [timeLeft, setTimeLeft] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-stone-900/95 backdrop-blur-md text-white w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-stone-800 ring-1 ring-white/10 animate-slide-up">
        {/* Top Left Countdown */}
        <div className="absolute top-3 left-3 flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-[10px] font-bold text-stone-300 font-mono">
          {timeLeft}s
        </div>

        {/* Top Right Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col items-center text-center mt-4">
          <div className="bg-amber-500/20 p-4 rounded-full mb-4">
            <Lock size={32} className="text-amber-400" />
          </div>
          
          <h4 className="font-bold text-xl mb-2 text-amber-50">排盘次数已耗尽</h4>
          
          <p className="text-sm text-stone-300 leading-relaxed mb-2">
            您今日的 3 次免费排盘机会已用完。
          </p>
          <p className="text-sm text-stone-400 leading-relaxed">
             升级 VIP 即可<span className="text-amber-400 font-bold">无限次排盘</span>，<br/>畅享更多专业功能！
          </p>
        </div>
      </div>
    </div>
  );
};
