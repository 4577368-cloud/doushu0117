import React from 'react';
import { LiuYaoResult as ResultType, getYaoText, analyzeHexagram } from '../../services/liuyaoService';
import { LiuYaoHexagram } from './LiuYaoHexagram';

interface LiuYaoResultProps {
    result: ResultType;
    onReset: () => void;
}

export const LiuYaoResult: React.FC<LiuYaoResultProps> = ({ result, onReset }) => {
    const { base, changed, movingLines } = analyzeResult(result);

    // Check for Use Nine / Use Six
    // Qian (111-111) with all moving lines (all 9s -> movingLines.length === 6)
    const isQianAllMoving = base.key === "111-111" && movingLines.length === 6;
    // Kun (000-000) with all moving lines (all 6s -> movingLines.length === 6)
    const isKunAllMoving = base.key === "000-000" && movingLines.length === 6;

    return (
        <div className="bg-stone-900 text-stone-200 p-4 rounded-xl space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Header: Hexagrams */}
            <div className="flex justify-center items-start gap-4 sm:gap-8">
                <div className="flex flex-col items-center">
                    <span className="text-xs text-stone-500 mb-2">本卦</span>
                    <LiuYaoHexagram lines={result.lines} showMoving={true} />
                    <div className="mt-2 text-center">
                        <div className="text-xl font-bold text-amber-400">{base.info?.name}</div>
                        <div className="text-4xl text-stone-600 mt-1">{base.info?.symbol}</div>
                    </div>
                </div>

                {changed && (
                    <>
                        <div className="pt-12 text-stone-600">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-xs text-stone-500 mb-2">变卦</span>
                            {/* Construct changed lines visual: 6->7(Yang), 9->8(Yin) visually? 
                                Actually for Changed Hexagram, we just show the resulting static lines (7/8) 
                                derived from the change. 
                            */}
                            <LiuYaoHexagram lines={changed!.binary.map(b => b === 1 ? 7 : 8)} showMoving={false} />
                            <div className="mt-2 text-center">
                                <div className="text-xl font-bold text-amber-400">{changed.info?.name}</div>
                                <div className="text-4xl text-stone-600 mt-1">{changed.info?.symbol}</div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Interpretation */}
            <div className="bg-stone-800/50 rounded-lg p-4 border border-stone-700">
                <h3 className="text-amber-500 font-bold mb-3 flex items-center gap-2">
                    <span>📜</span> 卦辞详解
                </h3>
                
                <div className="space-y-4">
                    <div>
                        <div className="text-xs text-stone-500 mb-1">卦辞（本卦）</div>
                        <div className="text-lg font-serif text-stone-300 leading-relaxed">
                            {base.info?.description}
                        </div>
                    </div>
                    
                    <div className="border-t border-stone-700 pt-3">
                        <div className="text-xs text-stone-500 mb-1">白话解</div>
                        <div className="text-sm text-stone-400 leading-relaxed">
                            {base.info?.description_vernacular}
                        </div>
                    </div>

                    {/* Use Nine / Use Six Special Handling */}
                    {(isQianAllMoving || isKunAllMoving) && (
                        <div className="bg-amber-900/20 p-3 rounded border border-amber-900/30 mt-4">
                            <div className="text-xs text-amber-500 font-bold mb-2">
                                {isQianAllMoving ? '用九' : '用六'}
                            </div>
                            {(() => {
                                const specialText = getYaoText(base.key, 7);
                                if (!specialText) return null;
                                return (
                                    <div className="space-y-2">
                                        <div className="text-md font-serif text-stone-200">
                                            {specialText.text}
                                        </div>
                                        <div className="text-sm text-stone-400">
                                            {specialText.vernacular}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* Moving Lines */}
                    {!isQianAllMoving && !isKunAllMoving && movingLines.length > 0 && (
                        <div className="mt-6 space-y-4">
                             <div className="text-sm text-amber-500 font-bold border-b border-stone-700 pb-2">
                                动爻详解
                            </div>
                            {movingLines.map(pos => {
                                const yaoText = getYaoText(base.key, pos);
                                if (!yaoText) return null;
                                return (
                                    <div key={pos} className="bg-stone-900/50 p-3 rounded border border-stone-700/50">
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <span className="text-amber-400 font-bold text-sm">{yaoText.name}</span>
                                            <span className="text-xs text-stone-500">第{pos}爻</span>
                                        </div>
                                        <div className="text-md font-serif text-stone-200 mb-2">
                                            {yaoText.text}
                                        </div>
                                        <div className="text-sm text-stone-400 leading-relaxed">
                                            {yaoText.vernacular}
                                        </div>
                                    </div>
                                );
                            })}
                            <div className="text-xs text-stone-500 italic mt-2">
                                * 吉凶悔吝主要参考动爻，若多爻变动，请结合变卦综合判断。
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <button 
                onClick={onReset}
                className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-stone-400 rounded-lg transition-colors border border-stone-700"
            >
                重新起卦
            </button>
        </div>
    );
};

// Helper to bridge service types
const analyzeResult = (result: ResultType) => {
    return analyzeHexagram(result.lines);
};
