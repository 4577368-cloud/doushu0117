import React, { useState, useEffect, useRef } from 'react';
import { Smartphone } from 'lucide-react';
import { Coin } from './Coin';
import { playShakeSound, playCoinDropSound } from '../../utils/soundUtils';

interface LiuYaoShakePanelProps {
    onShakeComplete: (result: number) => void; // Returns 6,7,8,9
    step: number; // 1 to 6
    isProcessing: boolean;
}

export const LiuYaoShakePanel: React.FC<LiuYaoShakePanelProps> = ({ onShakeComplete, step, isProcessing }) => {
    const [isShaking, setIsShaking] = useState(false);
    const [isTossing, setIsTossing] = useState(false);
    const [coins, setCoins] = useState<number[]>([0, 0, 0]); // 0=Tail(Yin/Flower), 1=Head(Yang/Word)
    const [showCoins, setShowCoins] = useState(false);

    // Shake Detection
    const lastX = useRef(0);
    const lastY = useRef(0);
    const lastZ = useRef(0);
    const lastTime = useRef(0);

    useEffect(() => {
        const SHAKE_THRESHOLD = 15;
        const STEADY_THRESHOLD = 5;
        const STEADY_DURATION = 500; // ms

        let isFirst = true;
        let isReady = false;
        let steadyStart = 0;

        const handleMotion = (event: DeviceMotionEvent) => {
            if (isProcessing || isShaking || isTossing || showCoins) return;
            
            const current = event.accelerationIncludingGravity;
            if (!current) return;

            const now = Date.now();
            if ((now - lastTime.current) > 100) {
                const diffTime = now - lastTime.current;
                lastTime.current = now;

                if (isFirst) {
                    lastX.current = current.x!;
                    lastY.current = current.y!;
                    lastZ.current = current.z!;
                    isFirst = false;
                    steadyStart = now; // Start tracking steady state
                    return;
                }

                const speed = Math.abs(current.x! + current.y! + current.z! - lastX.current - lastY.current - lastZ.current) / diffTime * 10000;

                if (!isReady) {
                    if (speed < STEADY_THRESHOLD) {
                        if (steadyStart === 0) steadyStart = now;
                        else if (now - steadyStart > STEADY_DURATION) {
                            isReady = true;
                            // console.log("Ready to shake!");
                        }
                    } else {
                        steadyStart = 0; // Reset steady timer if moving too much
                    }
                } else {
                    if (speed > SHAKE_THRESHOLD) {
                        triggerShake();
                    }
                }

                lastX.current = current.x!;
                lastY.current = current.y!;
                lastZ.current = current.z!;
            }
        };

        window.addEventListener('devicemotion', handleMotion);
        return () => window.removeEventListener('devicemotion', handleMotion);
    }, [isProcessing, isShaking, isTossing, showCoins, step]);

    const triggerShake = () => {
        if (isShaking || isProcessing || isTossing || showCoins) return;
        
        // 1. Start Shaking
        setIsShaking(true);
        setShowCoins(false);
        playShakeSound();
        
        // Vibration if supported
        if (navigator.vibrate) navigator.vibrate(200);

        // 2. Simulate shake duration
        setTimeout(() => {
            setIsShaking(false);
            setIsTossing(true);

            // 3. Tossing Animation Phase
            setTimeout(() => {
                const c1 = Math.random() < 0.5 ? 0 : 1;
                const c2 = Math.random() < 0.5 ? 0 : 1;
                const c3 = Math.random() < 0.5 ? 0 : 1;
                setCoins([c1, c2, c3]);
                
                setIsTossing(false);
                setShowCoins(true);
                playCoinDropSound();

                // Calculate sum: 3 Heads(1+1+1=3) -> 9, 3 Tails(0) -> 6, etc.
                const sum = c1 + c2 + c3;
                let val = 0;
                if (sum === 3) val = 9; // Old Yang (Circle)
                else if (sum === 0) val = 6; // Old Yin (Cross)
                else if (sum === 1) val = 7; // Young Yang (1 Head, 2 Tails)
                else val = 8; // Young Yin (2 Heads, 1 Tail)
                
                // Wait a bit to show coins then complete
                setTimeout(() => {
                    onShakeComplete(val);
                    setShowCoins(false);
                }, 2000);
            }, 600); // Tossing duration
        }, 800); // Shake duration
    };

    const requestPermissionAndShake = async () => {
        if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
            try {
                const state = await (DeviceMotionEvent as any).requestPermission();
                if (state === 'granted') {
                    triggerShake();
                } else {
                    alert('需要动作传感器权限来检测摇一摇');
                    triggerShake(); // Fallback to click
                }
            } catch (e) {
                console.error(e);
                triggerShake();
            }
        } else {
            triggerShake();
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-8">
            <div className="relative w-64 h-64 flex items-center justify-center mb-6">
                {/* Shake Animation Circle - Only show when idle or shaking */}
                {!showCoins && !isTossing && (
                    <>
                        <div className={`absolute inset-0 rounded-full border-4 border-amber-500/20 ${isShaking ? 'animate-ping' : ''}`}></div>
                        <div className={`absolute inset-4 rounded-full border-4 border-amber-500/40 ${isShaking ? 'animate-pulse' : ''}`}></div>
                    </>
                )}
                
                {/* Interaction Area */}
                <div 
                    onClick={requestPermissionAndShake}
                    className={`relative z-10 w-48 h-48 flex flex-col items-center justify-center transition-all ${isProcessing ? 'opacity-50' : 'active:scale-95'}`}
                >
                    {isTossing ? (
                        // Tossing Animation
                        <div className="relative w-full h-full">
                            <div className="absolute top-0 left-10 animate-toss-1">
                                <Coin side="yang" className="w-12 h-12" />
                            </div>
                            <div className="absolute top-10 right-10 animate-toss-2">
                                <Coin side="yin" className="w-12 h-12" />
                            </div>
                            <div className="absolute bottom-10 left-16 animate-toss-3">
                                <Coin side="yang" className="w-12 h-12" />
                            </div>
                        </div>
                    ) : showCoins ? (
                        // Result Display
                        <div className="grid grid-cols-2 gap-4 p-4 animate-land">
                            {/* Arrange 3 coins in a triangle or row */}
                            <div className="col-span-2 flex justify-center">
                                <Coin side={coins[0] === 1 ? 'yang' : 'yin'} className="w-14 h-14" />
                            </div>
                            <div className="flex justify-end">
                                <Coin side={coins[1] === 1 ? 'yang' : 'yin'} className="w-14 h-14" />
                            </div>
                            <div className="flex justify-start">
                                <Coin side={coins[2] === 1 ? 'yang' : 'yin'} className="w-14 h-14" />
                            </div>
                        </div>
                    ) : (
                        // Idle / Shaking State
                        <button 
                            disabled={isProcessing}
                            className={`w-32 h-32 bg-stone-800 rounded-full flex flex-col items-center justify-center shadow-lg border-4 border-amber-500/50 ${isShaking ? 'animate-shake' : ''}`}
                        >
                            <Smartphone size={32} className={`text-amber-400 mb-2 ${isShaking ? 'animate-wiggle' : ''}`} />
                            <span className="text-xs text-amber-200 font-medium">
                                {isShaking ? '摇卦中...' : '点击或摇一摇'}
                            </span>
                        </button>
                    )}
                </div>
            </div>
            
            <div className="text-center">
                <p className="text-stone-400 text-sm mb-1">
                    第 <span className="text-amber-400 font-bold text-lg">{step}</span> / 6 爻
                </p>
                <p className="text-stone-500 text-xs">
                    请诚心默念所测之事
                </p>
            </div>

            <style>{`
                @keyframes shake {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-10deg); }
                    75% { transform: rotate(10deg); }
                }
                @keyframes wiggle {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-20deg); }
                    75% { transform: rotate(20deg); }
                }
                @keyframes toss-1 {
                    0% { transform: translateY(0) rotate(0); }
                    50% { transform: translateY(-40px) rotate(180deg); }
                    100% { transform: translateY(0) rotate(360deg); }
                }
                @keyframes toss-2 {
                    0% { transform: translateY(0) rotate(0); }
                    50% { transform: translateY(-30px) rotate(-180deg); }
                    100% { transform: translateY(0) rotate(-360deg); }
                }
                @keyframes toss-3 {
                    0% { transform: translateY(0) rotate(0); }
                    50% { transform: translateY(-50px) rotate(90deg); }
                    100% { transform: translateY(0) rotate(0); }
                }
                @keyframes land {
                    0% { transform: scale(1.1); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-shake { animation: shake 0.2s infinite; }
                .animate-wiggle { animation: wiggle 0.2s infinite; }
                .animate-toss-1 { animation: toss-1 0.6s ease-in-out infinite; }
                .animate-toss-2 { animation: toss-2 0.6s ease-in-out infinite; }
                .animate-toss-3 { animation: toss-3 0.6s ease-in-out infinite; }
                .animate-land { animation: land 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

