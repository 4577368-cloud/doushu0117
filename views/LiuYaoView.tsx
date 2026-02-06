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
                {/* Layer 1: Outer - Solid, CCW, Blue #002FA7, Opacity 0.2 */}
                <div className="absolute w-[140vw] h-[140vw] sm:w-[800px] sm:h-[800px] rounded-full border-2 border-[#002FA7] opacity-20 animate-[spin_10s_linear_infinite_reverse]"></div>
                
                {/* Layer 2: Middle - Dashed, CW, Blue #002FA7, Opacity 0.4 */}
                <div className="absolute w-[100vw] h-[100vw] sm:w-[600px] sm:h-[600px] rounded-full border border-dashed border-[#002FA7] opacity-40 animate-[spin_15s_linear_infinite]"></div>
                
                {/* Layer 3: Core - Taiji, CW, Blue #002FA7 */}
                <div className="absolute w-64 h-64 sm:w-96 sm:h-96 animate-[spin_4s_linear_infinite]">
                     <div className="w-full h-full rounded-full relative shadow-sm border-2 border-[#002FA7] overflow-hidden"
                          style={{ background: 'linear-gradient(90deg, #002FA7 50%, white 50%)' }}>
                         
                         {/* Top Circle (Blue Background, White Solid Dot) */}
                         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1/2 rounded-full bg-[#002FA7] flex items-center justify-center">
                              <div className="w-[25%] h-[25%] bg-white rounded-full"></div>
                         </div>

                         {/* Bottom Circle (White Background, Blue Solid Dot) */}
                         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-1/2 rounded-full bg-white flex items-center justify-center">
                              <div className="w-[25%] h-[25%] bg-[#002FA7] rounded-full"></div>
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
                <h1 className="text-lg font-serif font-bold text-[#002FA7]">六爻卜卦</h1>
                <button 
                    onClick={handleReset}
                    className="p-2 -mr-2 hover:bg-stone-100 rounded-full text-stone-600 transition-colors"
                >
                    <RefreshCw size={18} />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-4 relative z-10 flex flex-col">
                {step === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-10 animate-fade-in pb-20">
                        <div className="relative group">
                             {/* Removed the blur background to reduce obstruction */}
                             <div 
                                onClick={handleStart}
                                className="w-36 h-36 rounded-full bg-white/10 backdrop-blur-[2px] border border-white/30 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.3)] relative overflow-hidden cursor-pointer hover:scale-105 hover:bg-white/20 hover:border-white/50 transition-all duration-500 group-hover:shadow-[0_0_25px_rgba(255,255,255,0.5)]"
                             >
                                <div className="text-center">
                                    <div className="text-4xl font-serif text-[#002FA7] mb-1 drop-shadow-md">起</div>
                                    <div className="text-xs text-[#002FA7]/80 font-medium tracking-widest">点击开始</div>
                                </div>
                                
                                {/* Shine effect */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                             </div>
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className="text-xl font-bold text-[#002FA7] font-serif tracking-widest opacity-90">诚心求占</h2>
                            <p className="text-[#002FA7]/60 text-xs max-w-xs mx-auto font-medium">
                                "无事不占，不动不占"
                            </p>
                        </div>
                    </div>
                )}

                {step >= 1 && step <= 6 && (
                    <div className="flex-1 flex flex-col items-center justify-center pb-20 relative">
                        <div className="flex-1 flex items-center justify-center w-full">
                            <LiuYaoShakePanel 
                                step={step} 
                                onShakeComplete={handleShakeComplete}
                                isProcessing={isProcessing}
                            />
                        </div>
                        
                        {/* Live Hexagram Build-up - Absolute positioned to avoid layout shift */}
                        <div className="absolute bottom-0 w-full max-w-xs bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-stone-200 shadow-lg animate-in slide-in-from-bottom-10 fade-in duration-500">
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
