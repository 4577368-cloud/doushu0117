import React from 'react';
import { YaoValue } from '../../services/liuyaoService';

interface LiuYaoHexagramProps {
    lines: YaoValue[]; // Index 0 is Bottom
    animatingIndex?: number | null; // Currently generating line index
    showMoving?: boolean; // Highlight moving lines
}

export const LiuYaoHexagram: React.FC<LiuYaoHexagramProps> = ({ lines, animatingIndex, showMoving = true }) => {
    // Render from Top (index 5) to Bottom (index 0)
    const displayLines = [...lines].reverse();

    return (
        <div className="flex flex-col gap-3 w-32 sm:w-40 mx-auto p-4 bg-white/50 rounded-xl border border-stone-200 shadow-sm">
            {/* Placeholders if lines are missing (during animation) */}
            {Array.from({ length: 6 }).map((_, i) => {
                const realIndex = 5 - i;
                const value = lines[realIndex];
                const isAnimating = animatingIndex === realIndex;
                const hasValue = value !== undefined;

                if (!hasValue && !isAnimating) {
                    return (
                        <div key={realIndex} className="h-3 w-full bg-stone-200 rounded opacity-50" />
                    );
                }

                if (isAnimating) {
                    return (
                        <div key={realIndex} className="h-3 w-full flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-500"></div>
                        </div>
                    );
                }

                const isYang = value === 7 || value === 9;
                const isMoving = value === 6 || value === 9;
                const isOld = isMoving && showMoving;

                return (
                    <div key={realIndex} className={`relative flex items-center justify-center h-3 w-full transition-all duration-500 ${isAnimating ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
                        {/* Line Visual */}
                        {isYang ? (
                            // Yang Line (Solid)
                            <div className={`w-full h-full rounded-sm ${isOld ? 'bg-amber-400 animate-pulse' : 'bg-amber-600'}`}></div>
                        ) : (
                            // Yin Line (Broken)
                            <div className="w-full h-full flex justify-between">
                                <div className={`w-[42%] h-full rounded-sm ${isOld ? 'bg-amber-400 animate-pulse' : 'bg-amber-600'}`}></div>
                                <div className={`w-[42%] h-full rounded-sm ${isOld ? 'bg-amber-400 animate-pulse' : 'bg-amber-600'}`}></div>
                            </div>
                        )}
                        
                        {/* Moving Indicator */}
                        {isOld && (
                            <div className="absolute -right-6 text-[10px] text-red-400 font-bold">
                                {value === 9 ? '○' : '✕'}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
