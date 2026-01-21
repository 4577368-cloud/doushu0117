import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Activity, Home } from 'lucide-react';
import { supabase, supabaseReady } from '../../services/supabase';
import { activateVipOnCloud } from '../../services/storageService';

const readQuery = () => new URLSearchParams(window.location.search);

export const PayResultModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const params = readQuery();
  const outTradeNo = params.get('out_trade_no') || '';
  const tradeNo = params.get('trade_no') || '';
  const totalAmount = params.get('total_amount') || '';
  const appId = params.get('app_id') || '';

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'unknown'|'pending'|'success'|'failed'>('unknown');
  const [info, setInfo] = useState<{ subject?: string; amount?: string; paid_at?: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    let timer: any = null;
    let attempts = 0;
    const maxAttempts = 10; // Poll for ~20-30 seconds

    const checkStatus = async () => {
      if (!mounted) return;
      
      // 乐观更新：只要有单号和交易号，前端无条件信任为支付成功
      if (outTradeNo && tradeNo) {
        setStatus('success');
        setLoading(false);
        // 尝试获取详情仅用于展示，失败也不影响成功状态
        try {
            if (supabaseReady) {
                const { data } = await supabase
                  .from('alipay_orders')
                  .select('subject,amount,paid_at')
                  .eq('out_trade_no', outTradeNo)
                  .maybeSingle();
                if (mounted && data) {
                    setInfo({ subject: data.subject, amount: String(data.amount), paid_at: data.paid_at });
                }
            }
        } catch (e) {
            console.error('Fetch info error:', e);
        }
        return;
      }

      // Don't set loading true on subsequent polls to avoid flickering
      if (attempts === 0) setLoading(true);
      
      try {
        if (!supabaseReady || !outTradeNo) {
           if (mounted) {
             setStatus('unknown');
             setLoading(false);
           }
           return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
           if (mounted) {
             setStatus('unknown');
             setLoading(false);
           }
           return;
        }

        const { data, error } = await supabase
          .from('alipay_orders')
          .select('status,subject,amount,paid_at')
          .eq('out_trade_no', outTradeNo)
          .maybeSingle();

        if (mounted) {
          if (error) {
            // Only show error if we stopped polling or it's a critical error
            // But for now, let's just keep 'unknown' or current status
            console.error('Check status error:', error);
          } else if (data) {
            const newStatus = (data.status as any) || 'unknown';
            setStatus(newStatus);
            setInfo({ subject: data.subject, amount: String(data.amount), paid_at: data.paid_at });
            
            // If success, stop polling
            if (newStatus === 'success') {
               setLoading(false);
               return;
            }
          } else {
            // Data not found
            setStatus('unknown');
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted && attempts === 0) setLoading(false);
      }

      // Continue polling if not success and within limits
      attempts++;
      if (mounted && attempts < maxAttempts) {
        timer = setTimeout(checkStatus, 2000 + attempts * 500); // Backoff slightly
      }
    };

    checkStatus();

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [outTradeNo]);

  return (
    <div className="fixed inset-0 z-[2600] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-slide-up border border-white/20">
        <div className="p-6 text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center bg-stone-100">
            {loading ? <Activity className="text-stone-400 animate-spin" size={28} /> : (
              status === 'success' ? <CheckCircle2 className="text-emerald-500" size={28} /> : <AlertTriangle className="text-amber-500" size={28} />
            )}
          </div>
          <h3 className="text-lg font-black text-stone-900">
            {loading ? '查询中…' : status === 'success' ? '支付成功' : status === 'pending' ? '支付处理中' : '支付结果 确认中！'}
          </h3>
          <div className="text-xs text-stone-500">
            {outTradeNo && <div>订单号：<span className="font-mono font-bold text-stone-800">{outTradeNo}</span></div>}
            {tradeNo && <div>交易号：<span className="font-mono text-stone-700">{tradeNo}</span></div>}
            {totalAmount && <div>金额：<span className="font-bold">¥{totalAmount}</span></div>}
            {appId && <div>应用：<span className="font-mono">{appId}</span></div>}
            {info?.paid_at && <div>支付时间：<span className="font-mono">{new Date(info.paid_at).toLocaleString()}</span></div>}
            {info?.amount && !totalAmount && <div>金额：<span className="font-bold">¥{info.amount}</span></div>}
          </div>
          {error && <p className="text-xs text-rose-500 font-bold">{error}</p>}
          <div className="grid grid-cols-1 gap-2 pt-2">
            {status !== 'success' && (
                <button onClick={() => window.location.reload()} className="w-full py-3 bg-white border border-stone-200 text-stone-700 rounded-xl font-black text-sm shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2 hover:bg-stone-50">
                    <Activity size={16} /> 刷新状态
                </button>
            )}
            <button onClick={onClose} className="w-full py-3 bg-stone-900 text-white rounded-xl font-black text-sm shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
              <Home size={16} /> 返回首页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

