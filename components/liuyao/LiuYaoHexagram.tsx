import React from 'react';
import { YaoValue } from '../../services/liuyaoService';

interface LiuYaoHexagramProps {
    lines: YaoValue[];
    animatingIndex?: number | null;
    showMoving?: boolean;
    compact?: boolean;
}

export const LiuYaoHexagram: React.FC<LiuYaoHexagramProps> = ({
    lines,
    animatingIndex,
    showMoving = true,
    compact = false,
}) => {
    const gap = compact ? 'gap-2' : 'gap-3';
    const lineH = compact ? 'h-2' : 'h-2.5';

    return (
        <div className={`flex flex-col ${gap} w-full max-w-[120px] mx-auto`}>
            {Array.from({ length: 6 }).map((_, i) => {
                const realIndex = 5 - i;
                const value = lines[realIndex];
                const isAnimating = animatingIndex === realIndex;
                const hasValue = value !== undefined;

                if (!hasValue && !isAnimating) {
                    return <div key={realIndex} className={`${lineH} w-full rounded-full bg-stone-200/60`} />;
                }

                if (isAnimating) {
                    return (
                        <div key={realIndex} className={`${lineH} w-full flex items-center justify-center`}>
                            <div className="h-3 w-3 animate-pulse rounded-full bg-amber-400/60" />
                        </div>
                    );
                }

                const isYang = value === 7 || value === 9;
                const isMoving = value === 6 || value === 9;
                const color = isMoving && showMoving ? 'bg-amber-400' : 'bg-stone-800';

                return (
                    <div key={realIndex} className={`relative flex h-2.5 w-full items-center justify-center animate-in fade-in duration-300`}>
                        {isYang ? (
                            <div className={`h-full w-full rounded-full ${color}`} />
                        ) : (
                            <div className="flex h-full w-full justify-between">
                                <div className={`w-[44%] rounded-full ${color}`} />
                                <div className={`w-[44%] rounded-full ${color}`} />
                            </div>
                        )}
                        {isMoving && showMoving && (
                            <span className="absolute -right-5 text-[9px] font-bold text-amber-600">
                                {value === 9 ? '○' : '×'}
                            </span>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
