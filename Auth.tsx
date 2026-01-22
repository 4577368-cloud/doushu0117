import React, { useState } from 'react';
import { safeAuth, supabaseReady } from './services/supabase';
import { Mail, Lock, Loader2, ArrowLeft, KeyRound, Check } from 'lucide-react';
import { PolicyModal } from './components/modals/PolicyModals';

export const Auth: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login'); // 新增 forgot 模式
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [agreed, setAgreed] = useState(true);
  const [showPolicyModal, setShowPolicyModal] = useState<'user'|'privacy'|null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      console.log('Auth Action:', { mode, email, agreed });
      
      if (mode === 'forgot') {
        const { error } = await safeAuth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: '重置链接已发送至您的邮箱，请查收！' });
      } 
      else if (mode === 'login') {
        const { error } = await safeAuth.signInWithPassword({ email, password });
        if (error) throw error;
        onLoginSuccess();
      } 
      else {
        if (!agreed) {
            throw new Error('请先阅读并同意用户协议和隐私政策');
        }
        console.log('Starting sign up...');
        const { error } = await safeAuth.signUp({ email, password });
        if (error) {
            console.error('Sign up error details:', error);
            throw error;
        }
        console.log('Sign up successful, check email.');
        setMessage({ type: 'success', text: '注册确认邮件已发送，请查收！' });
      }
    } catch (error: any) {
      console.error('Auth Flow Error:', error);
      setMessage({ type: 'error', text: error.message || '操作失败，请重试' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm p-6 bg-white rounded-3xl shadow-xl border border-stone-100">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-serif font-black text-stone-900 mb-2">
          {mode === 'login' ? '欢迎回来' : mode === 'register' ? '创建账号' : '找回密码'}
        </h2>
        <p className="text-xs text-stone-400 font-medium uppercase tracking-widest">
          {mode === 'forgot' ? 'Reset Password' : 'Ancient Wisdom · AI Insights'}
        </p>
      </div>

      <form onSubmit={handleAuth} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-stone-500 mb-1 ml-1">邮箱地址</label>
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 text-stone-400" size={18} />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-stone-900 transition-colors font-bold text-stone-800" placeholder="name@example.com" required />
          </div>
        </div>

        {mode !== 'forgot' && (
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1 ml-1">密码</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-stone-400" size={18} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-stone-900 transition-colors font-bold text-stone-800" placeholder="••••••••" required />
            </div>
          </div>
        )}

        {message && (
          <div className={`p-3 rounded-xl text-xs font-bold ${message.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {message.text}
          </div>
        )}

        {mode === 'register' && (
          <div className="flex items-start gap-2 px-1">
             <div 
                onClick={() => setAgreed(!agreed)}
                className={`mt-0.5 w-4 h-4 shrink-0 rounded border flex items-center justify-center cursor-pointer transition-colors ${agreed ? 'bg-stone-900 border-stone-900' : 'border-stone-300 bg-white'}`}
             >
                {agreed && <Check size={10} className="text-white" strokeWidth={3} />}
             </div>
             <div className="text-xs text-stone-500 leading-tight">
                我已阅读并同意
                <button type="button" onClick={() => setShowPolicyModal('user')} className="text-stone-900 font-bold hover:underline mx-0.5">《用户协议》</button>
                和
                <button type="button" onClick={() => setShowPolicyModal('privacy')} className="text-stone-900 font-bold hover:underline mx-0.5">《隐私政策》</button>
             </div>
          </div>
        )}

        <button disabled={loading} className="w-full py-4 bg-stone-900 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
          {loading ? <Loader2 className="animate-spin" size={20} /> : mode === 'forgot' ? <KeyRound size={20}/> : <Lock size={20} />}
          {loading ? '处理中...' : mode === 'login' ? '立即登录' : mode === 'register' ? '注册账号' : '发送重置邮件'}
        </button>
      </form>

      <div className="mt-6 flex justify-between items-center text-xs font-bold text-stone-500 px-1">
        {mode === 'forgot' ? (
           <button onClick={() => {setMode('login'); setMessage(null);}} className="flex items-center gap-1 hover:text-stone-900"><ArrowLeft size={14}/> 返回登录</button>
        ) : (
           <>
             <button onClick={() => {setMode(mode === 'login' ? 'register' : 'login'); setMessage(null);}} className="hover:text-stone-900 underline decoration-stone-300 underline-offset-4">
               {mode === 'login' ? '没有账号？去注册' : '已有账号？去登录'}
             </button>
             {mode === 'login' && <button onClick={() => {setMode('forgot'); setMessage(null);}} className="hover:text-stone-900">忘记密码？</button>}
           </>
        )}
      </div>

      <PolicyModal type={showPolicyModal} onClose={() => setShowPolicyModal(null)} />
    </div>
  );
};
