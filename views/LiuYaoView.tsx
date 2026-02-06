import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, HelpCircle } from 'lucide-react';
import { LiuYaoShakePanel } from '../components/liuyao/LiuYaoShakePanel';
import { LiuYaoHexagram } from '../components/liuyao/LiuYaoHexagram';
import { LiuYaoResult } from '../components/liuyao/LiuYaoResult';
import { YaoValue, LiuYaoResult as ResultData } from '../services/liuyaoService';

interface LiuYaoViewProps {
    onBack: () => void;
    isVip: boolean;
    onVipClick: () => void;
}

export const LiuYaoView: React.FC<LiuYaoViewProps> = ({ onBack, isVip, onVipClick }) => {
    const [step, setStep] = useState(0); // 0: Intro, 1-6: Shaking, 7: Result
    const [lines, setLines] = useState<YaoValue[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleStart = () => {
        setStep(1);
        setLines([]);
    };

    const handleShakeComplete = (val: number) => {
        setIsProcessing(true);
        // Add line (push to start or end? Index 0 is Bottom)
        // Usually we build from Bottom to Top.
        // Shake 1 -> Line 1 (Bottom) -> Index 0.
        const newLines = [...lines, val as YaoValue];
        setLines(newLines);
        
        setTimeout(() => {
            if (newLines.length < 6) {
                setStep(prev => prev + 1);
                setIsProcessing(false);
            } else {
                setStep(7);
                setIsProcessing(false);
            }
        }, 800);
    };

    const handleReset = () => {
        setStep(0);
        setLines([]);
    };

    return (
        <div className="flex flex-col h-full bg-[#FDFBF7] text-stone-800 relative overflow-hidden">
            {/* Background Animation - Eastern Cultural Vibe */}
            <div className="absolute inset-0 overflow-hidden flex items-center justify-center pointer-events-none select-none z-0">
                {/* Layer 1: Outer - Solid, Slow CW (Was CCW) */}
                <div className="absolute w-[140vw] h-[140vw] sm:w-[800px] sm:h-[800px] rounded-full border border-amber-800/10 opacity-40 animate-[spin_60s_linear_infinite]"></div>
                
                {/* Layer 2: Middle - Dashed, Slow CW */}
                <div className="absolute w-[100vw] h-[100vw] sm:w-[600px] sm:h-[600px] rounded-full border border-stone-400 border-dashed opacity-30 animate-[spin_45s_linear_infinite]"></div>
                
                {/* Layer 3: Core - Taiji, Medium CW */}
                <div className="absolute w-64 h-64 sm:w-96 sm:h-96 opacity-10 animate-[spin_20s_linear_infinite]">
                     <div className="w-full h-full rounded-full relative shadow-sm border border-blue-200"
                          style={{ background: 'linear-gradient(90deg, #fff 50%, #3b82f6 50%)' }}>
                         {/* Top Circle (White with Blue dot) */}
                         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1/2 bg-white rounded-full flex items-center justify-center">
                              <div className="w-1/4 h-1/4 bg-blue-500 rounded-full"></div>
                         </div>
                         {/* Bottom Circle (Blue with White dot) */}
                         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-1/2 bg-blue-500 rounded-full flex items-center justify-center">
                              <div className="w-1/4 h-1/4 bg-white rounded-full"></div>
                         </div>
                     </div>
                </div>
            </div>

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between p-4 bg-white/80 backdrop-blur-md border-b border-stone-200 shadow-sm">
                <button 
                    onClick={onBack}
                    className="p-2 -ml-2 hover:bg-stone-100 rounded-full text-stone-600 transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-lg font-serif font-bold text-amber-700">六爻卜卦</h1>
                <button 
                    onClick={handleReset}
                    className="p-2 -mr-2 hover:bg-stone-100 rounded-full text-stone-600 transition-colors"
                >
                    <RefreshCw size={18} />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-4 relative z-10">
                {step === 0 && (
                    <div className="flex flex-col items-center justify-center h-full space-y-10 animate-fade-in">
                        <div className="relative group">
                             <div className="absolute inset-0 bg-amber-200/50 blur-3xl rounded-full group-hover:bg-amber-300/50 transition-all duration-1000"></div>
                             <div 
                                onClick={handleStart}
                                className="w-40 h-40 rounded-full bg-gradient-to-br from-white to-stone-100 border border-stone-200 flex items-center justify-center shadow-2xl relative overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                             >
                                <div className="text-center">
                                    <div className="text-4xl font-serif text-stone-800 mb-1">起</div>
                                    <div className="text-sm text-stone-500">点击开始</div>
                                </div>
                             </div>
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold text-stone-800 font-serif">诚心求占</h2>
                            <p className="text-stone-500 text-sm max-w-xs mx-auto">
                                "无事不占，不动不占"<br/>
                                请集中精神默念心中所惑
                            </p>
                        </div>
                    </div>
                )}

                {step >= 1 && step <= 6 && (
                    <div className="flex flex-col items-center h-full justify-between pb-8">
                        <div className="flex-1 flex items-center w-full justify-center">
                            <LiuYaoShakePanel 
                                step={step} 
                                onShakeComplete={handleShakeComplete}
                                isProcessing={isProcessing}
                            />
                        </div>
                        
                        {/* Live Hexagram Build-up */}
                        <div className="w-full max-w-xs bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-stone-200 shadow-lg">
                            <div className="text-xs text-center text-stone-500 mb-2">卦象生成中...</div>
                            <LiuYaoHexagram 
                                lines={lines} 
                                animatingIndex={isProcessing ? lines.length : undefined} 
                            />
                        </div>
                    </div>
                )}

                {step === 7 && (
                    <div className="animate-fade-in">
                        <LiuYaoResult 
                            result={{
                                lines: lines,
                                baseHexagram: { binary: [], data: null, key: '' }, // Handled by component
                                changedHexagram: null,
                                timestamp: new Date()
                            }} 
                            onReset={handleReset} 
                            isVip={isVip}
                            onVipClick={onVipClick}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
