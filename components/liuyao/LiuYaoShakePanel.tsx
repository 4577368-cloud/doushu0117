import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, RotateCcw } from 'lucide-react';

interface LiuYaoShakePanelProps {
    onShakeComplete: (result: number) => void; // Returns 6,7,8,9
    step: number; // 1 to 6
    isProcessing: boolean;
}

export const LiuYaoShakePanel: React.FC<LiuYaoShakePanelProps> = ({ onShakeComplete, step, isProcessing }) => {
    const [isShaking, setIsShaking] = useState(false);
    const [coins, setCoins] = useState<number[]>([0, 0, 0]); // 0=Tail, 1=Head
    const [showCoins, setShowCoins] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Shake Detection
    useEffect(() => {
        let lastX = 0, lastY = 0, lastZ = 0;
        let lastTime = 0;
        const THRESHOLD = 15; // Sensitivity

        const handleMotion = (event: DeviceMotionEvent) => {
            if (isProcessing) return;
            
            const current = event.accelerationIncludingGravity;
            if (!current) return;

            const now = Date.now();
            if ((now - lastTime) > 100) {
                const diffTime = now - lastTime;
                lastTime = now;

                const speed = Math.abs(current.x! + current.y! + current.z! - lastX - lastY - lastZ) / diffTime * 10000;

                if (speed > THRESHOLD) {
                    triggerShake();
                }

                lastX = current.x!;
                lastY = current.y!;
                lastZ = current.z!;
            }
        };

        // Check for iOS permission requirement
        // Actually usually we just attach if allowed.
        // For iOS 13+, we need a button to request permission first. 
        // We will assume user taps "Start" button which requests permission.
        
        window.addEventListener('devicemotion', handleMotion);
        return () => window.removeEventListener('devicemotion', handleMotion);
    }, [isProcessing]);

    const triggerShake = () => {
        if (isShaking || isProcessing) return;
        setIsShaking(true);
        setShowCoins(false);
        
        // Vibration if supported
        if (navigator.vibrate) navigator.vibrate(200);

        // Simulate shake duration
        setTimeout(() => {
            const c1 = Math.random() < 0.5 ? 0 : 1;
            const c2 = Math.random() < 0.5 ? 0 : 1;
            const c3 = Math.random() < 0.5 ? 0 : 1;
            setCoins([c1, c2, c3]);
            setShowCoins(true);
            setIsShaking(false);

            // Calculate sum: 3 Heads(1+1+1=3) -> 9, 3 Tails(0) -> 6, etc.
            const sum = c1 + c2 + c3;
            let val = 0;
            if (sum === 3) val = 9; // Old Yang
            else if (sum === 0) val = 6; // Old Yin
            else if (sum === 1) val = 7; // Young Yang (1 Head, 2 Tails)
            else val = 8; // Young Yin (2 Heads, 1 Tail)
            
            // Wait a bit to show coins then complete
            setTimeout(() => {
                onShakeComplete(val);
                setShowCoins(false);
            }, 1500);
        }, 1000);
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
            <div className="relative w-48 h-48 flex items-center justify-center mb-6">
                {/* Shake Animation Circle */}
                <div className={`absolute inset-0 rounded-full border-4 border-amber-500/20 ${isShaking ? 'animate-ping' : ''}`}></div>
                <div className={`absolute inset-4 rounded-full border-4 border-amber-500/40 ${isShaking ? 'animate-pulse' : ''}`}></div>
                
                {/* Center Content */}
                <button 
                    onClick={requestPermissionAndShake}
                    disabled={isProcessing}
                    className={`relative z-10 w-32 h-32 bg-stone-800 rounded-full flex flex-col items-center justify-center shadow-lg border-4 border-amber-500/50 transition-all active:scale-95 ${isShaking ? 'animate-shake' : ''}`}
                >
                    {showCoins ? (
                        <div className="grid grid-cols-2 gap-1 p-2">
                            {coins.map((c, i) => (
                                <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${c === 1 ? 'bg-amber-100 border-amber-500 text-amber-800' : 'bg-stone-700 border-stone-500 text-stone-300'}`}>
                                    {c === 1 ? '字' : '花'}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            <Smartphone size={32} className={`text-amber-400 mb-2 ${isShaking ? 'animate-wiggle' : ''}`} />
                            <span className="text-xs text-amber-200 font-medium">
                                {isShaking ? '摇卦中...' : '点击或摇一摇'}
                            </span>
                        </>
                    )}
                </button>
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
                .animate-shake { animation: shake 0.2s infinite; }
                .animate-wiggle { animation: wiggle 0.2s infinite; }
            `}</style>
        </div>
    );
};
