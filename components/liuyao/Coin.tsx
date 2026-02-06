import React from 'react';

interface CoinProps {
    side: 'yang' | 'yin'; // yang=字 (Head), yin=花 (Tail)
    className?: string;
}

export const Coin: React.FC<CoinProps> = ({ side, className = '' }) => {
    return (
        <div className={`relative w-16 h-16 ${className}`}>
            {/* Coin Body - SVG with Hole */}
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full drop-shadow-lg">
                <defs>
                    <linearGradient id="bronzeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#CA8A04" /> {/* yellow-600 */}
                        <stop offset="50%" stopColor="#FACC15" /> {/* yellow-400 */}
                        <stop offset="100%" stopColor="#A16207" /> {/* yellow-700 */}
                    </linearGradient>
                </defs>
                {/* Circle with Square Hole (using fill-rule="evenodd") */}
                <path 
                    d="M 50 0 A 50 50 0 1 0 50 100 A 50 50 0 1 0 50 0 Z M 36 36 L 64 36 L 64 64 L 36 64 Z" 
                    fill="url(#bronzeGradient)" 
                    fillRule="evenodd"
                    stroke="rgba(113, 63, 18, 0.3)" 
                    strokeWidth="1"
                />
                {/* Inner Ring Circle */}
                <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(113, 63, 18, 0.2)" strokeWidth="2" />
                {/* Square Hole Border */}
                <rect x="36" y="36" width="28" height="28" fill="none" stroke="rgba(113, 63, 18, 0.5)" strokeWidth="1" />
            </svg>

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
                     <svg className="absolute inset-0 w-full h-full p-3 opacity-60 pointer-events-none" viewBox="0 0 100 100">
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
