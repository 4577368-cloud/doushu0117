import React, { useState } from 'react';
import { Crown, Sparkles } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { startAlipayVip } from '../../services/payService';

export const VipActivationModal: React.FC<{ onClose: () => void; onActivate: () => void }> = ({ onClose, onActivate }) => {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [paying, setPaying] = useState(false);

    const handleSubmit = () => {
        if (code === '202612345') {
            onActivate();
            onClose();
        } else {
            setError('密钥无效，请核对后重试');
        }
    };

    const handleAlipay = async () => {
        setError('');
        setPaying(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const uid = session?.user?.id;
            if (!uid) {
                setError('请先登录账号后再进行支付');
                setPaying(false);
                return;
            }
            const r = await startAlipayVip(uid);
            if (!r.ok) {
                setError(r.error || '支付创建失败');
            }
        } catch (e) {
            setError('支付创建失败，请稍后重试');
        } finally {
            setPaying(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-slide-up border border-white/20">
                <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-stone-950 p-7 text-center relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 opacity-10 rotate-12"><Crown size={140} color="white"/></div>
                    <h3 className="text-amber-500/80 text-[10px] font-black tracking-[0.3em] uppercase mb-1 relative z-10">VIP Premium Access</h3>
                    <div className="flex items-baseline justify-center gap-1 text-white relative z-10 my-2">
                        <span className="text-xl font-bold text-amber-500">¥</span>
                        <span className="text-6xl font-black tracking-tighter text-amber-400 drop-shadow-lg">39.9</span>
                        <span className="text-[10px] font-black bg-gradient-to-r from-amber-400 to-yellow-300 text-stone-900 px-2 py-0.5 rounded-full ml-2 shadow-sm transform -translate-y-4">永久解锁</span>
                    </div>
                    <p className="text-[11px] text-stone-400 relative z-10 font-medium">
                        <span className="line-through mr-2 opacity-60">原价 ¥299.0</span>
                        <span className="text-amber-200/80">解锁 AI 深度对话 & 无限排盘</span>
                    </p>
                </div>
                
                <div className="p-6 space-y-6 bg-white">
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-[11px] text-stone-500 text-center max-w-[260px] leading-relaxed">
                            支持支付宝在线开通或直接输入专属密钥激活
                        </p>
                    </div>
                    <div className="space-y-2">
                        <input type="text" value={code} onChange={(e) => { setCode(e.target.value); setError(''); }} placeholder="在此输入专属密钥激活" className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl px-4 py-4 font-mono font-bold text-center text-base focus:border-amber-400 focus:bg-white outline-none transition-all placeholder:font-sans placeholder:text-stone-300 text-stone-800 shadow-inner"/>
                        {error && <p className="text-xs text-rose-500 text-center font-bold animate-pulse">{error}</p>}
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        <button onClick={handleAlipay} disabled={paying} className={`w-full py-4 ${paying?'bg-stone-300 text-stone-500':'bg-[#1677FF] text-white hover:bg-[#1a7cff]'} rounded-xl font-black text-sm shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2`}>
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-white/10 ring-1 ring-white/30">
                              <span className="w-4 h-4 rounded-sm bg-white flex items-center justify-center text-[#1677FF] text-[10px] font-black">支</span>
                            </span>
                            使用支付宝支付开通
                        </button>
                        <button onClick={handleSubmit} className="w-full py-4 bg-[#1c1917] text-white rounded-xl font-black text-sm shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2 hover:bg-stone-800"><Sparkles size={16} className="text-amber-400" /> 我有密钥，立即激活</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
