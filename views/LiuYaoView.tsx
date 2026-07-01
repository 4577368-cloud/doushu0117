import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, ScrollText } from 'lucide-react';
import { LiuYaoShakePanel } from '../components/liuyao/LiuYaoShakePanel';
import { LiuYaoHexagram } from '../components/liuyao/LiuYaoHexagram';
import { LiuYaoResult } from '../components/liuyao/LiuYaoResult';
import { YaoValue } from '../services/liuyaoService';

interface LiuYaoViewProps {
    onBack: () => void;
    isVip: boolean;
    onVipClick: () => void;
}

export const LiuYaoView: React.FC<LiuYaoViewProps> = ({ onBack, isVip, onVipClick }) => {
    const [step, setStep] = useState(0);
    const [lines, setLines] = useState<YaoValue[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleStart = () => {
        setStep(1);
        setLines([]);
    };

    const handleShakeComplete = (val: number) => {
        setIsProcessing(true);
        const newLines = [...lines, val as YaoValue];
        setLines(newLines);

        setTimeout(() => {
            if (newLines.length < 6) {
                setStep((prev) => prev + 1);
                setIsProcessing(false);
            } else {
                setStep(7);
                setIsProcessing(false);
            }
        }, 600);
    };

    const handleReset = () => {
        setStep(0);
        setLines([]);
        setIsProcessing(false);
    };

    return (
        <div className="flex h-full flex-col bg-[#fafaf9] text-stone-800">
            {/* 顶栏 */}
            <div className="flex shrink-0 items-center justify-between border-b border-stone-200/80 bg-white/90 px-4 py-3 backdrop-blur-md">
                <button
                    onClick={onBack}
                    className="-ml-1 rounded-full p-2 text-stone-500 transition-colors active:bg-stone-100"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="font-serif text-base font-bold text-stone-900">六爻卜卦</h1>
                <button
                    onClick={handleReset}
                    className="-mr-1 rounded-full p-2 text-stone-500 transition-colors active:bg-stone-100"
                >
                    <RefreshCw size={18} />
                </button>
            </div>

            <div className="relative flex-1 overflow-y-auto">
                {/* 起始页 */}
                {step === 0 && (
                    <div className="flex min-h-full flex-col items-center justify-center px-6 pb-16 pt-10 animate-in fade-in duration-500">
                        <div className="mb-10 flex h-20 w-20 items-center justify-center rounded-3xl border border-stone-200 bg-white shadow-sm">
                            <ScrollText size={36} className="text-sky-600" strokeWidth={1.5} />
                        </div>
                        <h2 className="font-serif text-2xl font-black tracking-wide text-stone-900">一事一占</h2>
                        <p className="mt-3 max-w-xs text-center text-sm leading-relaxed text-stone-500">
                            静心默念所问之事，连摇六次铜钱，由下而上成卦
                        </p>
                        <p className="mt-2 text-xs text-stone-400">「无事不占，不动不占」</p>

                        <button
                            onClick={handleStart}
                            className="mt-10 w-full max-w-xs rounded-2xl bg-stone-900 py-4 text-sm font-bold text-amber-400 shadow-lg shadow-stone-900/15 active:scale-[0.98] transition-transform"
                        >
                            开始起卦
                        </button>
                    </div>
                )}

                {/* 摇卦中 */}
                {step >= 1 && step <= 6 && (
                    <div className="flex min-h-full flex-col items-center px-4 pb-8 pt-6">
                        <LiuYaoShakePanel
                            step={step}
                            onShakeComplete={handleShakeComplete}
                            isProcessing={isProcessing}
                        />

                        {/* 实时卦象 */}
                        <div className="mt-6 w-full max-w-xs rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
                            <p className="mb-4 text-center text-xs font-medium text-stone-400">卦象生成中</p>
                            <LiuYaoHexagram
                                lines={lines}
                                animatingIndex={isProcessing ? lines.length : undefined}
                            />
                        </div>
                    </div>
                )}

                {/* 结果 */}
                {step === 7 && (
                    <div className="p-4 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <LiuYaoResult
                            result={{
                                lines,
                                baseHexagram: { binary: [], data: null, key: '' },
                                changedHexagram: null,
                                timestamp: new Date(),
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
