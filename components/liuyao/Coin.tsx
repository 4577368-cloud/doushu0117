import React from 'react';

interface CoinProps {
    side: 'yang' | 'yin'; // yang=字 (Head), yin=花 (Tail)
    className?: string;
}

export const Coin: React.FC<CoinProps> = ({ side, className = '' }) => {
    return (
        <div className={`relative w-16 h-16 ${className} drop-shadow-md`}>
            {/* Coin Body - SVG with Hole */}
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
                <defs>
                    {/* Realistic Antique Bronze Gradient */}
                    <linearGradient id="bronzeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#D97706" /> {/* amber-600 */}
                        <stop offset="30%" stopColor="#F59E0B" /> {/* amber-500 */}
                        <stop offset="60%" stopColor="#B45309" /> {/* amber-700 */}
                        <stop offset="100%" stopColor="#78350F" /> {/* amber-900 */}
                    </linearGradient>
                    
                    {/* Inner Shadow for depth */}
                    <radialGradient id="innerShadow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                        <stop offset="80%" stopColor="rgba(0,0,0,0)" />
                        <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
                    </radialGradient>

                    {/* Specular Highlight */}
                    <radialGradient id="specular" cx="30%" cy="30%" r="60%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                    </radialGradient>
                </defs>

                {/* Main Body */}
                <path 
                    d="M 50 0 A 50 50 0 1 0 50 100 A 50 50 0 1 0 50 0 Z M 36 36 L 64 36 L 64 64 L 36 64 Z" 
                    fill="url(#bronzeGradient)" 
                    fillRule="evenodd"
                />

                {/* Lighting Overlays */}
                <circle cx="50" cy="50" r="50" fill="url(#innerShadow)" className="pointer-events-none" />
                <circle cx="50" cy="50" r="50" fill="url(#specular)" className="pointer-events-none" />

                {/* Outer Rim (Raised) */}
                <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(251, 191, 36, 0.4)" strokeWidth="1.5" opacity="0.8" />
                <circle cx="50" cy="50" r="48.5" fill="none" stroke="rgba(120, 53, 15, 0.6)" strokeWidth="1" />

                {/* Inner Square Rim (Raised) */}
                <rect x="34" y="34" width="32" height="32" fill="none" stroke="rgba(251, 191, 36, 0.3)" strokeWidth="1" />
                <rect x="35.5" y="35.5" width="29" height="29" fill="none" stroke="rgba(120, 53, 15, 0.5)" strokeWidth="1" />

                {/* Decorative Dots on Rim (Optional, adds detail) */}
                {Array.from({ length: 12 }).map((_, i) => (
                    <circle 
                        key={i}
                        cx={50 + 44 * Math.cos(i * 30 * Math.PI / 180)} 
                        cy={50 + 44 * Math.sin(i * 30 * Math.PI / 180)} 
                        r="0.8" 
                        fill="rgba(251, 191, 36, 0.6)" 
                    />
                ))}
            </svg>

            {/* Content - Text/Symbols */}
            {side === 'yang' ? (
                // Yang Side - 4 Characters (Qian Long Tong Bao)
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    {/* Top: Qian */}
                    <div className="absolute top-[8%] text-[10px] font-bold text-[#451a03] transform scale-y-90 tracking-widest drop-shadow-sm" style={{ fontFamily: 'serif' }}>乾</div>
                    {/* Bottom: Long */}
                    <div className="absolute bottom-[8%] text-[10px] font-bold text-[#451a03] transform scale-y-90 tracking-widest drop-shadow-sm" style={{ fontFamily: 'serif' }}>隆</div>
                    {/* Right: Tong */}
                    <div className="absolute right-[8%] text-[10px] font-bold text-[#451a03] transform scale-y-90 tracking-widest drop-shadow-sm" style={{ fontFamily: 'serif' }}>通</div>
                    {/* Left: Bao */}
                    <div className="absolute left-[8%] text-[10px] font-bold text-[#451a03] transform scale-y-90 tracking-widest drop-shadow-sm" style={{ fontFamily: 'serif' }}>宝</div>
                </div>
            ) : (
                // Yin Side - Manchu Characters (Simulated with SVG Paths for cleaner look)
                <div className="absolute inset-0 pointer-events-none opacity-80">
                     <svg className="w-full h-full p-2" viewBox="0 0 100 100">
                        {/* Left Manchu (Simulated) */}
                        <path 
                            d="M25 45 Q 22 35 25 25 M 25 45 Q 28 55 25 65 M 25 45 L 18 45" 
                            fill="none" 
                            stroke="#451a03" 
                            strokeWidth="2.5" 
                            strokeLinecap="round"
                        />
                        {/* Right Manchu (Simulated) */}
                        <path 
                            d="M75 45 Q 72 35 75 25 M 75 45 Q 78 55 75 65 M 75 45 L 82 45" 
                            fill="none" 
                            stroke="#451a03" 
                            strokeWidth="2.5" 
                            strokeLinecap="round"
                        />
                     </svg>
                </div>
            )}
        </div>
    );
};
