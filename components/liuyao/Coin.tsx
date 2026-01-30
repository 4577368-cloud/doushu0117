import React from 'react';

interface CoinProps {
    side: 'yang' | 'yin'; // yang=字 (Head), yin=花 (Tail)
    className?: string;
}

export const Coin: React.FC<CoinProps> = ({ side, className = '' }) => {
    return (
        <div className={`relative w-16 h-16 rounded-full shadow-lg ${className}`}>
            {/* Coin Body - Bronze Gradient */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-600 via-yellow-400 to-yellow-700 shadow-inner border-2 border-yellow-800/30"></div>
            
            {/* Inner Ring */}
            <div className="absolute inset-1 rounded-full border-2 border-yellow-800/20"></div>

            {/* Square Hole */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-stone-900 border border-yellow-800/50"></div>

            {/* Content */}
            {side === 'yang' ? (
                // Yang Side - 4 Characters (e.g., Qian Long Tong Bao)
                <>
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-yellow-900/80 transform scale-x-90">乾</div>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-yellow-900/80 transform scale-x-90">隆</div>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-yellow-900/80 transform scale-x-90">通</div>
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-yellow-900/80 transform scale-x-90">宝</div>
                </>
            ) : (
                // Yin Side - Manchu Characters (Simulated)
                <>
                     <svg className="absolute inset-0 w-full h-full p-3 opacity-60" viewBox="0 0 100 100">
                        {/* Left Manchu */}
                        <path d="M20 50 Q 25 30 30 50 T 20 70" fill="none" stroke="#713f12" strokeWidth="3" />
                        {/* Right Manchu */}
                        <path d="M80 50 Q 75 30 70 50 T 80 70" fill="none" stroke="#713f12" strokeWidth="3" />
                     </svg>
                </>
            )}

            {/* Shine Effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-50 pointer-events-none"></div>
        </div>
    );
};
