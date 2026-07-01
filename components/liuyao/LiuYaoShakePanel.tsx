import React, { useState, useEffect, useRef } from 'react';
import { Coins } from 'lucide-react';
import { Coin } from './Coin';
import { playShakeSound, playCoinDropSound, playLineCompleteSound } from '../../utils/soundUtils';

interface LiuYaoShakePanelProps {
    onShakeComplete: (result: number) => void;
    step: number;
    isProcessing: boolean;
}

export const LiuYaoShakePanel: React.FC<LiuYaoShakePanelProps> = ({ onShakeComplete, step, isProcessing }) => {
    const [phase, setPhase] = useState<'idle' | 'shaking' | 'tossing' | 'result'>('idle');
    const [coins, setCoins] = useState<number[]>([0, 0, 0]);

    const shakeLock = useRef(false);
    const processingRef = useRef(false);
    const lastX = useRef(0);
    const lastY = useRef(0);
    const lastZ = useRef(0);
    const lastTime = useRef(0);

    useEffect(() => {
        shakeLock.current = false;
        processingRef.current = false;
        setPhase('idle');
    }, [step]);

    useEffect(() => {
        const SHAKE_THRESHOLD = 10;
        const STEADY_THRESHOLD = 30;
        const STEADY_DURATION = 100;

        let isFirst = true;
        let isReady = false;
        let steadyStart = 0;

        const handleMotion = (event: DeviceMotionEvent) => {
            if (isProcessing || processingRef.current || phase !== 'idle' || shakeLock.current) return;

            const current = event.accelerationIncludingGravity;
            if (!current) return;

            const now = Date.now();
            if (now - lastTime.current <= 100) return;
            const diffTime = now - lastTime.current;
            lastTime.current = now;

            if (isFirst) {
                lastX.current = current.x!;
                lastY.current = current.y!;
                lastZ.current = current.z!;
                isFirst = false;
                steadyStart = now;
                return;
            }

            const speed = Math.abs(current.x! + current.y! + current.z! - lastX.current - lastY.current - lastZ.current) / diffTime * 10000;

            if (!isReady) {
                if (speed < STEADY_THRESHOLD) {
                    if (steadyStart === 0) steadyStart = now;
                    else if (now - steadyStart > STEADY_DURATION) isReady = true;
                } else {
                    steadyStart = 0;
                }
            } else if (speed > SHAKE_THRESHOLD) {
                triggerShake();
            }

            lastX.current = current.x!;
            lastY.current = current.y!;
            lastZ.current = current.z!;
        };

        window.addEventListener('devicemotion', handleMotion);
        return () => window.removeEventListener('devicemotion', handleMotion);
    }, [isProcessing, phase, step]);

    const triggerShake = () => {
        if (shakeLock.current || processingRef.current || phase !== 'idle') return;

        shakeLock.current = true;
        processingRef.current = true;
        setPhase('shaking');
        playShakeSound();
        if (navigator.vibrate) navigator.vibrate(80);

        setTimeout(() => {
            setPhase('tossing');

            setTimeout(() => {
                const c1 = Math.random() < 0.5 ? 0 : 1;
                const c2 = Math.random() < 0.5 ? 0 : 1;
                const c3 = Math.random() < 0.5 ? 0 : 1;
                setCoins([c1, c2, c3]);
                setPhase('result');
                playCoinDropSound();

                const sum = c1 + c2 + c3;
                let val = 0;
                if (sum === 3) val = 9;
                else if (sum === 0) val = 6;
                else if (sum === 1) val = 7;
                else val = 8;

                setTimeout(() => {
                    playLineCompleteSound();
                    onShakeComplete(val);
                    setPhase('idle');
                }, 1400);
            }, 500);
        }, 600);
    };

    const requestPermissionAndShake = async () => {
        if (typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
            try {
                const state = await (DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
                if (state === 'granted') triggerShake();
                else triggerShake();
            } catch {
                triggerShake();
            }
        } else {
            triggerShake();
        }
    };

    const yaoLabels = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

    return (
        <div className="flex w-full max-w-sm flex-col items-center px-4">
            {/* 进度 */}
            <div className="mb-8 flex w-full items-center justify-between gap-1">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div key={n} className="flex flex-1 flex-col items-center gap-1">
                        <div
                            className={`h-1.5 w-full rounded-full transition-all duration-500 ${
                                n < step ? 'bg-amber-500' : n === step ? 'bg-amber-400 animate-pulse' : 'bg-stone-200'
                            }`}
                        />
                        <span className={`text-[9px] font-medium ${n === step ? 'text-amber-700' : 'text-stone-400'}`}>
                            {n < step ? '✓' : n}
                        </span>
                    </div>
                ))}
            </div>

            {/* 摇卦区 */}
            <button
                type="button"
                disabled={isProcessing || phase !== 'idle'}
                onClick={requestPermissionAndShake}
                className={`relative flex h-56 w-56 items-center justify-center rounded-full border transition-all duration-300 ${
                    phase === 'idle'
                        ? 'border-stone-200 bg-white shadow-lg shadow-stone-900/5 active:scale-95'
                        : 'border-transparent bg-transparent shadow-none'
                } ${isProcessing ? 'opacity-60' : ''}`}
            >
                {phase === 'shaking' && (
                    <div className="absolute inset-0 rounded-full border-2 border-amber-300/40 animate-ping" />
                )}

                {phase === 'tossing' && (
                    <div className="relative h-full w-full [perspective:800px]">
                        <div className="absolute left-1/2 top-4 -translate-x-1/2 animate-[liuyao-toss_0.5s_ease-in-out_infinite]">
                            <Coin side="yang" className="h-14 w-14" />
                        </div>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 animate-[liuyao-toss_0.5s_ease-in-out_infinite_0.1s]">
                            <Coin side="yin" className="h-12 w-12" />
                        </div>
                        <div className="absolute bottom-6 left-8 animate-[liuyao-toss_0.5s_ease-in-out_infinite_0.2s]">
                            <Coin side="yang" className="h-12 w-12" />
                        </div>
                    </div>
                )}

                {phase === 'result' && (
                    <div className="flex flex-col items-center gap-3 animate-in zoom-in-90 fade-in duration-300">
                        <div className="flex items-end justify-center gap-4">
                            {coins.map((c, i) => (
                                <Coin key={i} side={c === 1 ? 'yang' : 'yin'} className="h-[4.5rem] w-[4.5rem]" />
                            ))}
                        </div>
                        <p className="text-[11px] text-stone-400">
                            <span className="text-amber-700 font-medium">字</span> 为阳（字面）
                            <span className="mx-1.5 text-stone-300">·</span>
                            <span className="text-stone-600 font-medium">花</span> 为阴（背面）
                        </p>
                    </div>
                )}

                {phase === 'idle' && (
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100">
                            <Coins size={28} className="text-amber-600" strokeWidth={1.5} />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-stone-800">摇一摇起卦</p>
                            <p className="mt-1 text-xs text-stone-400">或点击此处</p>
                        </div>
                    </div>
                )}
            </button>

            <div className="mt-8 text-center">
                <p className="text-sm font-bold text-stone-800">
                    第 {step} 爻 · {yaoLabels[step - 1]}
                </p>
                <p className="mt-1 text-xs text-stone-400">
                    {phase === 'shaking' ? '铜钱摇动中…' : phase === 'tossing' ? '铜钱抛起…' : phase === 'result' ? '落卦定局…' : '默念所问之事'}
                </p>
            </div>
        </div>
    );
};
