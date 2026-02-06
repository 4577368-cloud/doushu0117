import React, { useState } from 'react';
import { LiuYaoResult as ResultType, getYaoText, analyzeHexagram } from '../../services/liuyaoService';
import { analyzeLiuYaoStructured, LiuYaoAiReport } from '../../services/geminiService';
import { LiuYaoHexagram } from './LiuYaoHexagram';
import { Brain, Loader2, Lock, Sparkles, TrendingUp, Briefcase, Heart, Activity, AlertCircle } from 'lucide-react';

interface LiuYaoResultProps {
    result: ResultType;
    onReset: () => void;
    isVip?: boolean;
    onVipClick?: () => void;
}

export const LiuYaoResult: React.FC<LiuYaoResultProps> = ({ result, onReset, isVip = false, onVipClick }) => {
    const { base, changed, movingLines } = analyzeResult(result);
    const [loadingAi, setLoadingAi] = useState(false);
    const [aiReport, setAiReport] = useState<LiuYaoAiReport | null>(null);

    // Check for Use Nine / Use Six
    // Qian (111-111) with all moving lines (all 9s -> movingLines.length === 6)
    const isQianAllMoving = base.key === "111-111" && movingLines.length === 6;
    // Kun (000-000) with all moving lines (all 6s -> movingLines.length === 6)
    const isKunAllMoving = base.key === "000-000" && movingLines.length === 6;

    const handleAiAnalyze = async () => {
        if (!isVip) {
            onVipClick?.();
            return;
        }
        
        setLoadingAi(true);
        try {
            // Construct a comprehensive data object for AI
            const hexagramData = {
                base: {
                    name: base.info?.name,
                    symbol: base.info?.symbol,
                    nature: base.info?.nature
                },
                changed: changed ? {
                    name: changed.info?.name,
                    symbol: changed.info?.symbol,
                    nature: changed.info?.nature
                } : null,
                movingLines: movingLines.map(pos => {
                    const txt = getYaoText(base.key, pos);
                    return { position: pos, name: txt?.name, text: txt?.text };
                }),
                questionTime: result.timestamp
            };

            const report = await analyzeLiuYaoStructured(hexagramData, isVip);
            setAiReport(report);
        } catch (e) {
            alert(e instanceof Error ? e.message : '分析失败，请重试');
        } finally {
            setLoadingAi(false);
        }
    };

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

            {/* AI Deep Analysis Button */}
            {!aiReport && (
                <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 p-1 rounded-xl border border-indigo-500/30">
                    <button
                        onClick={handleAiAnalyze}
                        disabled={loadingAi}
                        className={`w-full relative overflow-hidden group py-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                            isVip 
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-900/50' 
                            : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                        }`}
                    >
                        {loadingAi ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                <span>大师推演中...</span>
                            </>
                        ) : (
                            <>
                                {isVip ? <Sparkles size={20} className="text-amber-300" /> : <Lock size={20} />}
                                <span>AI 深度多维解读</span>
                            </>
                        )}
                        {!isVip && (
                            <span className="absolute right-4 text-xs bg-amber-600 text-white px-2 py-0.5 rounded-full">VIP</span>
                        )}
                    </button>
                    <p className="text-xs text-center text-indigo-300/70 mt-2 mb-1">
                        包含：求财 · 事业 · 健康 · 感情 · 趋吉避凶建议
                    </p>
                </div>
            )}

            {/* AI Report Display */}
            {aiReport && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-4 shadow-lg shadow-indigo-900/20">
                        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-indigo-500/20">
                            <Brain className="text-indigo-400" size={20} />
                            <h3 className="font-bold text-indigo-100">大师深度解读</h3>
                        </div>
                        
                        <div className="mb-4 bg-indigo-900/30 p-3 rounded-lg border border-indigo-500/10">
                            <div className="text-xs text-indigo-300 mb-1 font-bold">核心断语</div>
                            <div className="text-md text-indigo-50 leading-relaxed font-medium">
                                {aiReport.summary}
                            </div>
                        </div>

                        <div className="grid gap-3">
                            <ReportItem 
                                icon={<TrendingUp size={16} />} 
                                title="求财运势" 
                                content={aiReport.aspects.wealth} 
                                color="text-emerald-400"
                                bg="bg-emerald-900/20"
                                border="border-emerald-500/20"
                            />
                            <ReportItem 
                                icon={<Briefcase size={16} />} 
                                title="事业/办事" 
                                content={aiReport.aspects.career} 
                                color="text-blue-400"
                                bg="bg-blue-900/20"
                                border="border-blue-500/20"
                            />
                            <ReportItem 
                                icon={<Heart size={16} />} 
                                title="感情姻缘" 
                                content={aiReport.aspects.love} 
                                color="text-rose-400"
                                bg="bg-rose-900/20"
                                border="border-rose-500/20"
                            />
                            <ReportItem 
                                icon={<Activity size={16} />} 
                                title="健康平安" 
                                content={aiReport.aspects.health} 
                                color="text-amber-400"
                                bg="bg-amber-900/20"
                                border="border-amber-500/20"
                            />
                             <ReportItem 
                                icon={<AlertCircle size={16} />} 
                                title="趋吉避凶" 
                                content={aiReport.aspects.suggestion} 
                                color="text-purple-400"
                                bg="bg-purple-900/20"
                                border="border-purple-500/20"
                            />
                        </div>
                    </div>
                </div>
            )}

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

const ReportItem: React.FC<{
    icon: React.ReactNode;
    title: string;
    content: string;
    color: string;
    bg: string;
    border: string;
}> = ({ icon, title, content, color, bg, border }) => (
    <div className={`p-3 rounded-lg border ${bg} ${border}`}>
        <div className={`flex items-center gap-2 mb-1 ${color} font-bold text-sm`}>
            {icon}
            <span>{title}</span>
        </div>
        <div className="text-sm text-stone-300 leading-relaxed">
            {content}
        </div>
    </div>
);
