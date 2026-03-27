import React, { useState, useEffect } from 'react';
import { RotateCcw, MessageCircle, Crown, Activity, Sparkles, Compass, CheckCircle, Lock as LockIcon, KeyRound, LayoutGrid } from 'lucide-react';
import { supabase, safeSignOut, supabaseReady, safeAuth } from './services/supabase';
import { Auth } from './Auth';
import { AppTab, UserProfile, BaziChart, ModalData, BaziReport as AiBaziReport } from './types';
import { calculateBazi } from './services/baziService';
import { analyzeBaziStructured } from './services/geminiService';
import { 
  getArchives, 
  saveArchive, 
  saveArchiveFast,
  saveAiReportToArchive, 
  getVipStatus, 
  activateVipOnCloud, 
  syncArchivesFromCloud,
  mergeGuestArchives // Add this
} from './services/storageService';

import { BottomNav } from './components/Layout';
import { AppHeader } from './components/ui/AppHeader'; 
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { VipActivationModal } from './components/modals/VipActivationModal';
import { PayResultModal } from './components/modals/PayResultModal';
import { DetailModal } from './components/modals/DetailModal';
import { QuotaLimitModal } from './components/modals/QuotaLimitModal';

import { HomeView } from './views/HomeView';
import { ArchiveView } from './views/ArchiveView';
import { BaziChartView } from './views/BaziChartView';
import { AiChatView } from './views/AiChatView';
import { LiuYaoView } from './views/LiuYaoView';
import ZiweiView from './components/ZiweiView'; 
import QimenView from './components/QimenView';

// --- 内联组件：密码重置弹窗 ---
const PasswordResetModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    
    const handleUpdate = async () => {
        if (!password.trim() || password.length < 6) {
            alert('密码长度不能少于6位');
            return;
        }
        setLoading(true);
        const { error } = await safeAuth.updateUser({ password: password });
        setLoading(false);
        if (error) {
            alert('密码修改失败: ' + error.message);
        } else { 
            alert('密码修改成功！请重新登录。'); 
            onClose(); 
        }
    };

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white w-full max-w-sm rounded-[2rem] p-6 space-y-4 animate-slide-up shadow-2xl">
                <div className="text-center">
                    <h3 className="text-lg font-black text-stone-900">设置新密码</h3>
                    <p className="text-xs text-stone-500">请输入您的新密码以完成重置</p>
                </div>
                <div className="relative">
                    <LockIcon className="absolute left-4 top-3.5 text-stone-400" size={18} />
                    <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 pl-12 pr-4 outline-none font-bold text-stone-800 focus:border-stone-400 transition-colors" 
                        placeholder="输入新密码" 
                    />
                </div>
                <button 
                    onClick={handleUpdate} 
                    disabled={loading} 
                    className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                    {loading ? <Activity size={18} className="animate-spin"/> : <KeyRound size={18}/>}
                    {loading ? '提交中...' : '确认修改'}
                </button>
            </div>
        </div>
    );
};

// --- 内联组件：欢迎弹窗 ---
const WelcomeModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 animate-in fade-in duration-300">
        <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 text-center space-y-4 animate-slide-up">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                <CheckCircle size={32} />
            </div>
            <h3 className="text-xl font-black text-stone-900">恭喜您，注册成功！</h3>
            <p className="text-sm text-stone-500 leading-relaxed font-medium">
                邮箱验证已通过。<br/>欢迎来到玄枢命理，开启您的探索之旅。
            </p>
            <button 
                onClick={onClose} 
                className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-transform hover:bg-stone-800"
            >
                开始体验
            </button>
        </div>
    </div>
);

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<AppTab>(AppTab.ARCHIVE);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [baziChart, setBaziChart] = useState<BaziChart | null>(null);
  const [modalData, setModalData] = useState<ModalData | null>(null);
  
  const [archives, setArchives] = useState<UserProfile[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiReport, setAiReport] = useState<AiBaziReport | null>(null);
  
  const [session, setSession] = useState<any>(null);
  const [isVip, setIsVip] = useState(false);
  const [hideChrome, setHideChrome] = useState(false);
  
  const [showVipModal, setShowVipModal] = useState(false);
  const [showPayResultModal, setShowPayResultModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [isGlobalSaving, setIsGlobalSaving] = useState(false);
  const [showLimitHint, setShowLimitHint] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [guestUsageCount, setGuestUsageCount] = useState(0);

  const updateGuestUsage = () => {
      try {
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const todayStr = `${year}-${month}-${day}`;
          const key = `guest_limit_${todayStr}`;
          const stored = localStorage.getItem(key);
          if (stored) {
              const u = JSON.parse(stored);
              setGuestUsageCount(u.count || 0);
          } else {
              setGuestUsageCount(0);
          }
      } catch { setGuestUsageCount(0); }
  };

  // --- 初始化数据加载与同步 ---
  useEffect(() => {
    updateGuestUsage();
    // 清理过期的访客排盘记录 (保留7天)
    try {
        const today = new Date();
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('guest_limit_')) {
                const dateStr = key.replace('guest_limit_', '');
                const date = new Date(dateStr);
                const diffTime = today.getTime() - date.getTime();
                const diffDays = diffTime / (1000 * 3600 * 24);
                if (diffDays > 7) {
                    localStorage.removeItem(key);
                }
            }
        });
    } catch (e) {}

    // A. 无论如何，先加载本地缓存，保证用户立马能看到东西
    getArchives().then(data => setArchives(data));

    // B. 处理登录同步（启动时做一次更稳妥的恢复）
    const hydrateAuthAndSync = async () => {
        try {
            const { data: { session: initialSession } } = await supabase.auth.getSession();
            setSession(initialSession);
            if (!initialSession?.user) return;

            // 启动时刷新一次会话，尽量避免“看起来已登录但状态过期”导致拉取失败
            let currentSession = initialSession;
            try {
                const { data } = await supabase.auth.refreshSession();
                if (data.session) {
                    currentSession = data.session;
                    setSession(data.session);
                }
            } catch (e) {
                console.warn('refreshSession on startup failed:', e);
            }

            // 启动时也尝试一次访客数据合并（有去重，不会重复写）
            try {
                await mergeGuestArchives(currentSession.user.id);
            } catch (e) {
                console.error('Merge guest archives on startup failed:', e);
            }

            const data = await syncArchivesFromCloud(currentSession.user.id);
            if (data) setArchives(data);
        } catch (e) {
            console.error('Startup auth/sync failed:', e);
        }
    };
    hydrateAuthAndSync();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        setSession(session);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session?.user) {
                // 1. 在登录时强制刷新 Session，确保获取最新的 VIP 状态
                let currentSession = session;
                if (event === 'SIGNED_IN') {
                    const { data } = await supabase.auth.refreshSession();
                    if (data.session) {
                        currentSession = data.session;
                        setSession(data.session);
                    }
                }

                // 2. 登录事件时合并访客数据（TOKEN_REFRESHED 不重复做）
                if (event === 'SIGNED_IN') {
                    try {
                        await mergeGuestArchives(currentSession.user.id);
                    } catch (e) {
                        console.error('Merge guest archives failed:', e);
                    }
                }
                
                // 3. 同步档案 (使用最新的 session 上下文)
                syncArchivesFromCloud(currentSession.user.id).then(data => {
                    if (data) setArchives(data); 
                });

                if (event === 'SIGNED_IN' && window.location.hash.includes('access_token') && !window.location.hash.includes('type=recovery')) {
                     setShowWelcomeModal(true);
                     window.history.replaceState(null, '', window.location.pathname);
                }
            }
        }
        if (event === 'PASSWORD_RECOVERY') {
            setShowPasswordResetModal(true);
        }
        if (event === 'SIGNED_OUT') {
            setArchives([]); 
            setIsVip(false); 
            setBaziChart(null); 
            setCurrentProfile(null);
            setCurrentTab(AppTab.ARCHIVE);
            try { localStorage.removeItem('is_vip_user'); localStorage.removeItem('bazi_archives:guest'); } catch {}
        }
    });
    return () => subscription.unsubscribe();
  }, []);

  // 显示支付结果页：当 URL 携带 out_trade_no/trade_no 时
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const outTradeNo = sp.get('out_trade_no');
    const tradeNo = sp.get('trade_no');
    
    if (outTradeNo || tradeNo) {
      setShowPayResultModal(true);
    }
    
    // 乐观激活：如果两者都有，说明支付成功返回，直接给予 VIP 权限
    if (outTradeNo && tradeNo) {
        setIsVip(true);
        try { localStorage.setItem('is_vip_user', 'true'); } catch {}
        activateVipOnCloud('alipay').catch(console.error);
    }
  }, []);

  // VIP 状态加载
  useEffect(() => {
    const loadData = async () => {
        if (session) {
            // Pass session explicitly to avoid async race condition
            const vip = await getVipStatus(session);
            console.log('Set VIP status to:', vip);
            setIsVip(vip);
        }
    };
    loadData();
  }, [session]);

  // --- 核心业务逻辑 ---

  // 排盘并自动保存
  const handleGenerate = (profile: UserProfile) => {
    // --- 1. 访客排盘限制检查 ---
    if (!isVip) {
        try {
            // 使用当地时间日期作为 Key，避免时区问题导致日期偏差
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;
            
            const key = `guest_limit_${todayStr}`;
            const stored = localStorage.getItem(key);
            let usage = stored ? JSON.parse(stored) : { count: 0, hashes: [] };
            
            // 生成排盘参数哈希 (用于识别是否重复查看)
            // 只取核心参数，忽略 ID 或 备注
            const profileHash = JSON.stringify({
                n: profile.name,
                g: profile.gender,
                d: profile.birthDate,
                t: profile.birthTime,
                c: profile.city || ''
            });

            // 如果 hashes 数组不存在 (旧数据兼容)，初始化它
            if (!Array.isArray(usage.hashes)) usage.hashes = [];

            if (!usage.hashes.includes(profileHash)) {
                // 如果不是重复查看，检查次数
                if (usage.count >= 3) {
                    setShowLimitHint(true);
                    setTimeout(() => {
                        setShowVipModal(true);
                    }, 800); // 0.8秒后弹出VIP
                    return;
                }
                // 没超限，增加计数并保存哈希
                usage.count += 1;
                usage.hashes.push(profileHash);
                localStorage.setItem(key, JSON.stringify(usage));
                updateGuestUsage();
            }
        } catch (e) { console.error("Limit check failed", e); }
    }

    try {
        let safeDate = profile.birthDate; 
        if (safeDate.length === 8 && !safeDate.includes('-')) {
            safeDate = `${safeDate.slice(0, 4)}-${safeDate.slice(4, 6)}-${safeDate.slice(6, 8)}`;
        }
        const newBazi = calculateBazi({ ...profile, birthDate: safeDate });
        setCurrentProfile(profile); 
        setBaziChart(newBazi); 
        setCurrentTab(AppTab.CHART); 
        setAiReport(null); 
        
        // 🔥🔥🔥 核心修改：无条件保存！
        // 无论是否登录，都调用 saveArchive。
        // service层会自动处理：访客->存本地；登录->存本地+存云端
        setIsGlobalSaving(true);
        saveArchive(profile).then(updatedList => {
              setArchives(updatedList);
              // 更新当前 profile 的 ID (如果是新生成的)
              const saved = updatedList.find(p => p.birthDate === profile.birthDate && p.birthTime === profile.birthTime && p.gender === profile.gender);
              if (saved) setCurrentProfile(saved);
        }).catch(err => console.error(err)).finally(() => setIsGlobalSaving(false));
        
    } catch (e) { 
        alert("排盘失败，请检查出生日期格式"); 
    }
  };

  // 手动保存 (通常用于更新备注或标签)
  const handleManualSave = async () => {
      if (isGlobalSaving) return;
      if (!currentProfile) return alert('无数据');
      // 如果未登录，依然允许保存到本地，但可以提示一下
      if (!session) {
          // 这里不做拦截，允许访客保存到本地
      }
      setIsGlobalSaving(true);
      try {
          const updatedList = await saveArchiveFast(currentProfile);
          setArchives(updatedList);
          const latest = updatedList.find(p => p.name === currentProfile.name && p.birthDate === currentProfile.birthDate);
          if (latest) setCurrentProfile(latest);
          alert("档案保存成功");
      } catch(e) { 
          alert("保存失败");
      } finally { 
          setIsGlobalSaving(false); 
      }
  };

  const handleActivateVip = async () => {
      if (!session) { alert("请先登录！"); return; }
      const success = await activateVipOnCloud('key'); 
      if (success) { 
          setIsVip(true); 
          setShowVipModal(false);
          alert("🎉 VIP 激活成功！"); 
      }
  };

  const handleAiAnalysis = async () => {
    if (!baziChart) return;
    const key = sessionStorage.getItem('ai_api_key');
    setLoadingAi(true);
    try {
      const result = await analyzeBaziStructured(baziChart!, key || undefined, isVip);
      setAiReport(result);
      if (currentProfile) {
        const updated = await saveAiReportToArchive(currentProfile.id, result.copyText, 'bazi');
        setArchives(updated);
      }
    } catch (e) { 
        alert(e instanceof Error ? e.message : '分析出错'); 
    } finally { 
        setLoadingAi(false); 
    }
  };

  const renderContent = () => {
      switch (currentTab) {
          case AppTab.HOME:
              return <HomeView onGenerate={handleGenerate} archives={archives} onChromeHiddenChange={setHideChrome} guestUsage={isVip ? undefined : { count: guestUsageCount, limit: 3 }} />;
          
          case AppTab.CHART:
              if (!baziChart || !currentProfile) {
                  return <HomeView onGenerate={handleGenerate} archives={archives} onChromeHiddenChange={setHideChrome} guestUsage={isVip ? undefined : { count: guestUsageCount, limit: 3 }} />;
              }
              return (
                  <ErrorBoundary>
                      <BaziChartView 
                          profile={currentProfile} 
                        chart={baziChart} 
                        onShowModal={setModalData} 
                        onSaveReport={async (r:string, t:'bazi'|'ziwei')=> { 
                            const updated = await saveAiReportToArchive(currentProfile.id, r, t); 
                            setArchives(updated); 
                        }} 
                        onAiAnalysis={handleAiAnalysis} 
                        loadingAi={loadingAi} 
                        aiReport={aiReport} 
                        isVip={isVip} 
                        onVipClick={() => setShowVipModal(true)}
                        onManualSave={handleManualSave} 
                        isSaving={isGlobalSaving} 
                        archives={archives}
                    />
                  </ErrorBoundary>
              );
          
          case AppTab.CHAT:
              if (!isVip) return (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#f5f5f4] space-y-4">
                      <div className="bg-stone-200 p-4 rounded-full"><Crown size={48} className="text-stone-400" /></div>
                      <h3 className="font-bold text-lg text-stone-700">VIP 尊享功能</h3>
                      <p className="text-sm text-stone-500">升级 VIP 解锁无限次 AI 深度对话，<br/>探索更多命理奥秘。</p>
                      <button onClick={() => setShowVipModal(true)} className="px-6 py-3 bg-stone-900 text-amber-400 rounded-xl font-bold shadow-lg active:scale-95 transition-transform">立即解锁</button>
                  </div>
              );
              if (!baziChart || !currentProfile) return (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#f5f5f4] space-y-4">
                      <div className="bg-stone-200 p-4 rounded-full"><MessageCircle size={48} className="text-stone-300" /></div>
                      <h3 className="font-bold text-lg text-stone-700">数据缺失</h3>
                      <p className="text-sm text-stone-500 font-medium">AI 需要命盘数据作为依据。<br/>请先进行排盘。</p>
                      <button onClick={() => setCurrentTab(AppTab.CHART)} className="px-6 py-3 bg-stone-900 text-amber-400 rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex items-center gap-2">
                          <Compass size={18} /> 去排盘
                      </button>
                  </div>
              );
              // 传递 isVip 给 AiChatView
              return (
                  <ErrorBoundary>
                      <AiChatView chart={baziChart} profile={currentProfile} isVip={isVip} onVipClick={() => setShowVipModal(true)} />
                  </ErrorBoundary>
              );
          
          case AppTab.ZIWEI:
              if (!currentProfile) return (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#f5f5f4] space-y-4">
                      <div className="bg-stone-200 p-4 rounded-full"><Sparkles size={48} className="text-stone-300" /></div>
                      <h3 className="font-bold text-lg text-stone-700">紫微斗数</h3>
                      <p className="text-sm text-stone-500 font-medium">请先在【首页】输入生辰信息，<br/>即可生成紫微斗数命盘。</p>
                      <button onClick={() => setCurrentTab(AppTab.CHART)} className="px-6 py-3 bg-stone-900 text-amber-400 rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex items-center gap-2">
                          <Compass size={18} /> 立即排盘
                      </button>
                  </div>
              );
              return (
                  <ZiweiView 
                        profile={currentProfile} 
                        onSaveReport={async (r) => { 
                            const updated = await saveAiReportToArchive(currentProfile.id, r, 'ziwei'); 
                            setArchives(updated); 
                        }} 
                        isVip={isVip} 
                        onVipClick={() => setShowVipModal(true)}
                    />
              );

          case AppTab.QIMEN:
              if (!currentProfile) return (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#f5f5f4] space-y-4">
                      <div className="bg-stone-200 p-4 rounded-full"><LayoutGrid size={48} className="text-stone-300" /></div>
                      <h3 className="font-bold text-lg text-stone-700">奇门遁甲</h3>
                      <p className="text-sm text-stone-500 font-medium">请先在【首页】输入生辰信息，<br/>即可生成奇门遁甲排盘。</p>
                      <button onClick={() => setCurrentTab(AppTab.CHART)} className="px-6 py-3 bg-stone-900 text-amber-400 rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex items-center gap-2">
                          <Compass size={18} /> 立即排盘
                      </button>
                  </div>
              );
              return (
                  <QimenView 
                    profile={currentProfile} 
                    onSaveReport={async (r) => { 
                        const updated = await saveAiReportToArchive(currentProfile.id, r, 'qimen'); 
                        setArchives(updated); 
                    }} 
                    isVip={isVip} 
                    onVipClick={() => setShowVipModal(true)}
                />
              );
          
          case AppTab.ARCHIVE:
              return (
                <ArchiveView 
                    archives={archives} 
                    setArchives={setArchives} 
                    onSelect={handleGenerate} 
                    isVip={isVip} 
                    onVipClick={() => setShowVipModal(true)} 
                    session={session} 
                    onLogout={async () => { 
                        // 1. 立即清理本地状态，给用户即时反馈
                        setArchives([]); 
                        setIsVip(false); 
                        setBaziChart(null); 
                        setCurrentProfile(null); 
                        setCurrentTab(AppTab.ARCHIVE); 
                        setSession(null); 
                        try { 
                            localStorage.removeItem('bazi_archives:guest'); 
                            localStorage.removeItem('is_vip_user'); 
                            // 清理 Supabase 认证 token
                            Object.keys(localStorage).forEach(key => {
                                if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                                    localStorage.removeItem(key);
                                }
                            });
                        } catch {} 

                        // 2. 后台尝试退出 Supabase (不阻塞 UI)
                        try { await safeSignOut(); } catch (e) { console.error('SignOut warning:', e); }
                    }} 
                    onLogin={() => setShowAuthModal(true)}
                    onNewChart={() => { setBaziChart(null); setCurrentTab(AppTab.CHART); }}
                    onLiuYao={() => setCurrentTab(AppTab.LIUYAO)}
                />
              );

          case AppTab.LIUYAO:
              return (
                  <LiuYaoView 
                      onBack={() => setCurrentTab(AppTab.ARCHIVE)}
                      isVip={isVip}
                      onVipClick={() => setShowVipModal(true)}
                  />
              );
          
          default:
              return <HomeView onGenerate={handleGenerate} archives={archives} onChromeHiddenChange={setHideChrome} />;
      }
  };

  return (
    <div className={`flex flex-col h-[100dvh] overflow-hidden text-stone-950 font-sans transition-colors duration-700 ${isVip ? 'bg-[#181816]' : 'bg-[#f5f5f4]'}`}>
      {!hideChrome && (
        <AppHeader 
            title={(currentTab === AppTab.CHART && !baziChart) ? '玄枢命理' : currentProfile?.name || '排盘'} 
            rightAction={(!((currentTab === AppTab.CHART && !baziChart)) && currentProfile) && (<button onClick={()=>{setCurrentProfile(null);setBaziChart(null);setCurrentTab(AppTab.CHART);setAiReport(null);}} className={`p-2 rounded-full transition-colors ${isVip ? 'hover:bg-white/10 text-stone-300' : 'hover:bg-stone-100 text-stone-700'}`} title="重新排盘"><RotateCcw size={18} /></button>)} 
            isVip={isVip} 
            guestUsage={{ count: guestUsageCount, limit: 3 }}
        />
      )}
      <div className="flex-1 overflow-hidden relative">{renderContent()}</div>
      {!hideChrome && <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />}
      {modalData && <DetailModal data={modalData} chart={baziChart} onClose={() => setModalData(null)} />}
      {showVipModal && <VipActivationModal onClose={() => setShowVipModal(false)} onActivate={handleActivateVip} />}
      {showPayResultModal && <PayResultModal onClose={() => { setShowPayResultModal(false); try { window.history.replaceState(null, '', window.location.pathname); } catch {} }} />}
      {showWelcomeModal && <WelcomeModal onClose={() => setShowWelcomeModal(false)} />}
      {showPasswordResetModal && <PasswordResetModal onClose={() => setShowPasswordResetModal(false)} />}
      {showLimitHint && <QuotaLimitModal onClose={() => setShowLimitHint(false)} />}
      
      {showAuthModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-md" onClick={() => setShowAuthModal(false)} />
              <div className="relative z-10 animate-in zoom-in-95 duration-200">
                  <Auth onLoginSuccess={() => { setShowAuthModal(false); }} />
                  <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600">
                      {/* Close button handled by Auth internal UI or backdrop */}
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;
