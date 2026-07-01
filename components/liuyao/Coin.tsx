import React from 'react';

interface CoinProps {
    side: 'yang' | 'yin';
    className?: string;
}

/** 仿真清代方孔铜钱：字面（阳）= 金字汉文，背面（阴）= 绿锈满文 */
export const Coin: React.FC<CoinProps> = ({ side, className = '' }) => {
    const uid = React.useId().replace(/:/g, '');

    if (side === 'yang') {
        return (
            <div className={`relative aspect-square ${className}`} title="字面（阳）">
                <svg viewBox="0 0 100 100" className="h-full w-full" aria-label="字面">
                    <defs>
                        <radialGradient id={`yang-body-${uid}`} cx="36%" cy="30%" r="70%">
                            <stop offset="0%" stopColor="#fde68a" />
                            <stop offset="30%" stopColor="#d4a017" />
                            <stop offset="65%" stopColor="#a16207" />
                            <stop offset="100%" stopColor="#713f12" />
                        </radialGradient>
                        <linearGradient id={`yang-rim-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fff3c4" stopOpacity="0.95" />
                            <stop offset="45%" stopColor="#ca8a04" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#422006" stopOpacity="0.7" />
                        </linearGradient>
                        <linearGradient id={`yang-hole-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#1c0f04" />
                            <stop offset="100%" stopColor="#573a1a" />
                        </linearGradient>
                        <filter id={`yang-drop-${uid}`} x="-25%" y="-25%" width="150%" height="150%">
                            <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#000" floodOpacity="0.4" />
                        </filter>
                    </defs>

                    <circle cx="50" cy="50" r="47" fill={`url(#yang-body-${uid})`} filter={`url(#yang-drop-${uid})`} />
                    <circle cx="50" cy="50" r="47" fill="none" stroke={`url(#yang-rim-${uid})`} strokeWidth="3" />
                    <circle cx="50" cy="50" r="41.5" fill="none" stroke="rgba(255,230,150,0.3)" strokeWidth="1" />

                    <rect x="37.5" y="37.5" width="25" height="25" rx="2" fill={`url(#yang-hole-${uid})`} />
                    <rect x="37.5" y="37.5" width="25" height="25" rx="2" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="1.4" />
                    <rect x="39.5" y="39.5" width="21" height="21" rx="1.2" fill="none" stroke="rgba(255,220,130,0.25)" strokeWidth="0.7" />

                    <YangChar x={50} y={21} text="乾" />
                    <YangChar x={74} y={50} text="隆" />
                    <YangChar x={50} y={79} text="通" />
                    <YangChar x={26} y={50} text="宝" />
                </svg>
            </div>
        );
    }

    return (
        <div className={`relative aspect-square ${className}`} title="背面（阴）">
            <svg viewBox="0 0 100 100" className="h-full w-full" aria-label="背面">
                <defs>
                    <radialGradient id={`yin-body-${uid}`} cx="58%" cy="62%" r="72%">
                        <stop offset="0%" stopColor="#7d8f72" />
                        <stop offset="28%" stopColor="#4a5c44" />
                        <stop offset="60%" stopColor="#354030" />
                        <stop offset="100%" stopColor="#1e261c" />
                    </radialGradient>
                    <linearGradient id={`yin-rim-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#a8b89a" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#141a12" stopOpacity="0.75" />
                    </linearGradient>
                    <linearGradient id={`yin-hole-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0a0e08" />
                        <stop offset="100%" stopColor="#243020" />
                    </linearGradient>
                    <filter id={`yin-drop-${uid}`} x="-25%" y="-25%" width="150%" height="150%">
                        <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#000" floodOpacity="0.45" />
                    </filter>
                </defs>

                <circle cx="50" cy="50" r="47" fill={`url(#yin-body-${uid})`} filter={`url(#yin-drop-${uid})`} />
                <circle cx="50" cy="50" r="47" fill="none" stroke={`url(#yin-rim-${uid})`} strokeWidth="3" />

                {/* 绿锈斑驳 */}
                <ellipse cx="32" cy="35" rx="12" ry="8" fill="rgba(60,90,55,0.35)" transform="rotate(-20 32 35)" />
                <ellipse cx="68" cy="62" rx="10" ry="14" fill="rgba(50,75,48,0.3)" transform="rotate(15 68 62)" />

                <rect x="37.5" y="37.5" width="25" height="25" rx="2" fill={`url(#yin-hole-${uid})`} />
                <rect x="37.5" y="37.5" width="25" height="25" rx="2" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="1.4" />

                {/* 满文背文 */}
                <YinManchu x={28} y={50} flip />
                <YinManchu x={72} y={50} />

                <circle cx="50" cy="22" r="2.2" fill="rgba(190,205,175,0.55)" />
                <circle cx="50" cy="78" r="2.2" fill="rgba(190,205,175,0.55)" />
            </svg>
        </div>
    );
};

const YangChar: React.FC<{ x: number; y: number; text: string }> = ({ x, y, text }) => (
    <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="14"
        fontFamily="'Noto Serif SC', 'Songti SC', 'STSong', serif"
        fontWeight="800"
        fill="#2d1806"
        stroke="#f0c96a"
        strokeWidth="0.7"
        paintOrder="stroke"
    >
        {text}
    </text>
);

/** 满文竖排简化造型 */
const YinManchu: React.FC<{ x: number; y: number; flip?: boolean }> = ({ x, y, flip }) => (
    <g transform={`translate(${x} ${y}) ${flip ? 'scale(-1 1)' : ''}`}>
        <path
            d="M 0 -12 C 5 -10 6 -4 4 1 C 2 7 -1 11 -3 12 C -7 9 -6 2 -4 -3 C -2 -8 0 -12 0 -12 Z"
            fill="rgba(175,195,160,0.25)"
            stroke="rgba(215,230,200,0.75)"
            strokeWidth="1"
        />
        <path
            d="M 0 -9 L 2 -2 L -1 5 M 3 -6 L 5 0 L 2 7"
            fill="none"
            stroke="rgba(230,242,218,0.85)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M -2 2 Q 0 6 2 9"
            fill="none"
            stroke="rgba(200,218,188,0.6)"
            strokeWidth="1"
            strokeLinecap="round"
        />
    </g>
);
