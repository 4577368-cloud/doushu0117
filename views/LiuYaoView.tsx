import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, HelpCircle } from 'lucide-react';
import { LiuYaoShakePanel } from '../components/liuyao/LiuYaoShakePanel';
import { LiuYaoHexagram } from '../components/liuyao/LiuYaoHexagram';
import { LiuYaoResult } from '../components/liuyao/LiuYaoResult';
import { YaoValue, LiuYaoResult as ResultData } from '../services/liuyaoService';

interface LiuYaoViewProps {
    onBack: () => void;
}

export const LiuYaoView: React.FC<LiuYaoViewProps> = ({ onBack }) => {
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
        <div className="flex flex-col h-full bg-stone-950 text-stone-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-stone-900 border-b border-stone-800">
                <button 
                    onClick={onBack}
                    className="p-2 -ml-2 hover:bg-stone-800 rounded-full text-stone-400 transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-lg font-serif font-bold text-amber-500">六爻卜卦</h1>
                <button 
                    onClick={handleReset}
                    className="p-2 -mr-2 hover:bg-stone-800 rounded-full text-stone-400 transition-colors"
                >
                    <RefreshCw size={18} />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {step === 0 && (
                    <div className="flex flex-col items-center justify-center h-full space-y-8 animate-fade-in">
                        <div className="w-32 h-32 rounded-full bg-stone-900 border-4 border-amber-900/30 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                            <span className="text-6xl">☯️</span>
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold text-stone-200">诚心求占</h2>
                            <p className="text-stone-500 text-sm max-w-xs mx-auto">
                                "无事不占，不动不占"<br/>
                                请集中精神默念心中所惑，然后开始起卦
                            </p>
                        </div>
                        <button 
                            onClick={handleStart}
                            className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-full shadow-lg shadow-amber-900/50 transition-all active:scale-95"
                        >
                            开始起卦
                        </button>
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
                        <div className="w-full max-w-xs bg-stone-900/50 p-4 rounded-xl border border-stone-800">
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
                                baseHexagram: { binary: [], data: null }, // Handled by component
                                changedHexagram: null,
                                timestamp: new Date()
                            }} 
                            onReset={handleReset} 
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
