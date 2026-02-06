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
            <div className="flex-1 overflow-y-auto p-4 relative">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center overflow-hidden">
                     <svg className="w-[150%] h-[150%] animate-[spin_60s_linear_infinite]" viewBox="0 0 100 100">
                        <path d="M50 50 m -40 0 a 40 40 0 1 0 80 0 a 40 40 0 1 0 -80 0" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="5 5" />
                        <path d="M50 50 m -30 0 a 30 30 0 1 0 60 0 a 30 30 0 1 0 -60 0" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                     </svg>
                </div>

                {step === 0 && (
                    <div className="flex flex-col items-center justify-center h-full space-y-10 animate-fade-in relative z-10">
                        <div className="relative group">
                             <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full group-hover:bg-amber-500/30 transition-all duration-1000"></div>
                             <div className="w-40 h-40 rounded-full bg-gradient-to-br from-stone-800 to-stone-950 border border-stone-700 flex items-center justify-center shadow-2xl relative overflow-hidden">
                                <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-900/40 via-transparent to-transparent"></div>
                                {/* Tai Chi SVG */}
                                <svg width="80" height="80" viewBox="0 0 1024 1024" className="opacity-90">
                                    <path d="M512 0C229.2 0 0 229.2 0 512s229.2 512 512 512 512-229.2 512-512S794.8 0 512 0z m0 960C264.6 960 64 759.4 64 512S264.6 64 512 64s448 200.6 448 448-200.6 448-448 448z" fill="#D6D3D1" fillOpacity="0.1"/>
                                    <path d="M512 64c-123.8 0-235.6 50.2-316.8 131.2C114 276.4 64 388.2 64 512s50.2 235.6 131.2 316.8c5.4 5.4 11 10.6 16.6 15.6 30-80 92.4-143.6 170.6-178.6 28-12.6 58.8-19.8 91.2-19.8 123.8 0 224-100.2 224-224S397.8 198 274 198c-32.4 0-63.2 7.2-91.2 19.8-1.2-1.4-2.4-2.6-3.6-4-3.4-3.8-6.8-7.6-10-11.4C251.4 120.6 376 64 512 64z" fill="#F59E0B"/>
                                    <path d="M512 960c123.8 0 235.6-50.2 316.8-131.2C910 747.6 960 635.8 960 512s-50.2-235.6-131.2-316.8c-5.4-5.4-11-10.6-16.6-15.6-30 80-92.4 143.6-170.6 178.6-28 12.6-58.8 19.8-91.2 19.8-123.8 0-224 100.2-224 224s300.2 224 424 224c32.4 0 63.2-7.2 91.2-19.8 1.2 1.4 2.4 2.6 3.6 4 3.4 3.8 6.8 7.6 10 11.4C772.6 903.4 648 960 512 960z" fill="#D6D3D1"/>
                                    <circle cx="274" cy="512" r="64" fill="#D6D3D1"/>
                                    <circle cx="750" cy="512" r="64" fill="#F59E0B"/>
                                </svg>
                             </div>
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
