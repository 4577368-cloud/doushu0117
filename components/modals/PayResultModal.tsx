import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Activity, Home } from 'lucide-react';
import { supabase, supabaseReady } from '../../services/supabase';

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
    const run = async () => {
      setError('');
      if (!supabaseReady) {
        setStatus('unknown');
        return;
      }
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setStatus('unknown');
          return;
        }
        if (!outTradeNo) {
          setStatus('unknown');
          return;
        }
        const { data, error } = await supabase
          .from('alipay_orders')
          .select('status,subject,amount,paid_at')
          .eq('out_trade_no', outTradeNo)
          .maybeSingle();
        if (error) {
          setError('查询订单失败');
        } else if (data) {
          setStatus((data.status as any) || 'unknown');
          setInfo({ subject: data.subject, amount: String(data.amount), paid_at: data.paid_at });
        } else {
          setStatus('unknown');
        }
      } finally {
        setLoading(false);
      }
    };
    run();
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
            {loading ? '查询中…' : status === 'success' ? '支付成功' : status === 'pending' ? '支付处理中' : '支付结果未确认'}
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
            <button onClick={onClose} className="w-full py-3 bg-stone-900 text-white rounded-xl font-black text-sm shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
              <Home size={16} /> 返回首页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

