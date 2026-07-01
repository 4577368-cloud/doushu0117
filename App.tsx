import React, { useState, useEffect } from 'react';
import { RotateCcw, Crown, Activity, Sparkles, Compass, CheckCircle, Lock as LockIcon, KeyRound, LayoutGrid, MessageCircle } from 'lucide-react';
import { supabase, safeSignOut, safeAuth, isAuthAbortError } from './services/supabase';
import { Auth } from './Auth';
import { AppTab, UserProfile, BaziChart, ModalData, BaziReport as AiBaziReport } from './types';
import { calculateBazi } from './services/baziService';
import { loadChartFromProfile } from './utils/chartLoader';
import { getChatHistoryKey } from './utils/chatHistory';
import { analyzeBaziStructured } from './services/geminiService';
import type { LlmPriority } from './utils/llmPriority';
import { 
  getArchives, 
  saveArchive, 
  saveArchiveFast,
  saveAiReportToArchive, 
  getVipStatus, 
  activateVipOnCloud, 
  syncArchivesFromCloud,
  mergeGuestArchives,
  getTrialUsage,
  useTrialMasterReport,
  useTrialChat,
  TrialUsage
} from './services/storageService';
import { applyReferralBonus } from './services/shareService';

import { BottomNav } from './components/Layout';
import { AppHeader } from './components/ui/AppHeader'; 
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { VipActivationModal } from './components/modals/VipActivationModal';
import { PayResultModal } from './components/modals/PayResultModal';
import { DetailModal } from './components/modals/DetailModal';
import { QuotaLimitModal } from './components/modals/QuotaLimitModal';

import { HomeView } from './views/HomeView';
import { ArchiveView } from './views/ArchiveView';
import { BaziInputView } from './views/BaziInputView';
import { BaziChartView } from './views/BaziChartView';
import { AiChatView } from './views/AiChatView';
import { LiuYaoView } from './views/LiuYaoView';
import { ProfileView } from './views/ProfileView';
import { ChatProfilePicker } from './views/ChatProfilePicker';
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

export type AnalysisType = 'bazi' | 'ziwei' | 'qimen';

const AnalysisSwitcher: React.FC<{
  current: AnalysisType;
  onChange: (type: AnalysisType) => void;
  isVip?: boolean;
}> = ({ current, onChange }) => {
  const items: { id: AnalysisType; label: string }[] = [
    { id: 'bazi', label: '八字' },
    { id: 'ziwei', label: '紫微' },
    { id: 'qimen', label: '奇门' },
  ];
  return (
    <div className="bg-white border-b border-stone-200 px-4 py-2 shrink-0">
      <div className="max-w-md mx-auto flex gap-2">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              current === item.id
                ? 'bg-stone-900 text-amber-400 shadow-md'
                : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const HASH_TO_TAB: Record<string, AppTab> = {
  '#home': AppTab.HOME,
  '#chart': AppTab.CHART,
  '#chat': AppTab.CHAT,
  '#archive': AppTab.ARCHIVE,
  '#profile': AppTab.PROFILE,
  '#liuyao': AppTab.LIUYAO,
};

const TAB_TO_HASH: Record<AppTab, string> = {
  [AppTab.HOME]: '#home',
  [AppTab.CHART]: '#chart',
  [AppTab.CHAT]: '#chat',
  [AppTab.ARCHIVE]: '#archive',
  [AppTab.PROFILE]: '#profile',
  [AppTab.ZIWEI]: '#chart',
  [AppTab.QIMEN]: '#chart',
  [AppTab.LIUYAO]: '#liuyao',
};

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<AppTab>(() => {
    const hash = window.location.hash || '#home';
    return HASH_TO_TAB[hash] || AppTab.HOME;
  });
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [baziChart, setBaziChart] = useState<BaziChart | null>(null);
  const [modalData, setModalData] = useState<ModalData | null>(null);
  const [targetAnalysis, setTargetAnalysis] = useState<AnalysisType | null>(null);
  
  const [archives, setArchives] = useState<UserProfile[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [llmPriority, setLlmPriority] = useState<LlmPriority | null>(null);
  const [aiReport, setAiReport] = useState<AiBaziReport | null>(null);
  
  const [session, setSession] = useState<any>(null);
  const [isVip, setIsVip] = useState(false);
  
  const [showVipModal, setShowVipModal] = useState(false);
  const [showPayResultModal, setShowPayResultModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [isGlobalSaving, setIsGlobalSaving] = useState(false);
  const [showLimitHint, setShowLimitHint] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [guestUsageCount, setGuestUsageCount] = useState(0);
  const [trialUsage, setTrialUsage] = useState<TrialUsage>({ masterReportUsed: false, chatCount: 0 });

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

  // --- hash 路由同步 ---
  useEffect(() => {
    const hash = TAB_TO_HASH[currentTab] || '#home';
    if (window.location.hash !== hash) {
      window.history.replaceState(null, '', hash);
    }
  }, [currentTab]);

  useEffect(() => {
    const onHashChange = () => {
      const tab = HASH_TO_TAB[window.location.hash] || AppTab.HOME;
      setCurrentTab(tab);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // --- 初始化数据加载与同步 ---
  useEffect(() => {
    updateGuestUsage();
    getTrialUsage().then(setTrialUsage).catch(console.error);
    applyReferralBonus().then((bonusApplied) => {
      if (bonusApplied) getTrialUsage().then(setTrialUsage).catch(console.error);
    }).catch(console.error);
    try {
        const today = new Date();
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('guest_limit_')) {
                const dateStr = key.replace('guest_limit_', '');
                const date = new Date(dateStr);
                const diffTime = today.getTime() - date.getTime();
                const diffDays = diffTime / (1000 * 3600 * 24);
                if (diffDays > 7) localStorage.removeItem(key);
            }
        });
    } catch (e) {}

    getArchives().then(data => setArchives(data));

    const hydrateAuthAndSync = async () => {
        try {
            const { data: { session: initialSession } } = await supabase.auth.getSession();
            setSession(initialSession);
            if (!initialSession?.user) return;

            const currentSession = initialSession;

            try { await mergeGuestArchives(currentSession.user.id); } catch (e) { console.error('Merge guest archives on startup failed:', e); }

            const data = await syncArchivesFromCloud(currentSession.user.id);
            if (data) setArchives(data);
        } catch (e) {
            if (!isAuthAbortError(e)) console.error('Startup auth/sync failed:', e);
        }
    };
    hydrateAuthAndSync();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        setSession(session);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session?.user) {
                const currentSession = session;
                getTrialUsage().then(setTrialUsage).catch(console.error);
                if (event === 'SIGNED_IN') {
                    try { await mergeGuestArchives(currentSession.user.id); } catch (e) { console.error('Merge guest archives failed:', e); }
                }
                syncArchivesFromCloud(currentSession.user.id).then(data => { if (data) setArchives(data); }).catch(e => {
                    if (!isAuthAbortError(e)) console.error('Sync archives failed:', e);
                });

                if (event === 'SIGNED_IN' && window.location.hash.includes('access_token') && !window.location.hash.includes('type=recovery')) {
                     setShowWelcomeModal(true);
                     window.history.replaceState(null, '', window.location.pathname);
                }
            }
        }
        if (event === 'PASSWORD_RECOVERY') setShowPasswordResetModal(true);
        if (event === 'SIGNED_OUT') {
            setArchives([]);
            setIsVip(false);
            setBaziChart(null);
            setCurrentProfile(null);
            setCurrentTab(AppTab.HOME);
            setTrialUsage({ masterReportUsed: false, chatCount: 0 });
            try { localStorage.removeItem('is_vip_user'); localStorage.removeItem('bazi_archives:guest'); } catch {}
        }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const outTradeNo = sp.get('out_trade_no');
    const tradeNo = sp.get('trade_no');
    if (outTradeNo || tradeNo) setShowPayResultModal(true);
    if (outTradeNo && tradeNo) {
        setIsVip(true);
        try { localStorage.setItem('is_vip_user', 'true'); } catch {}
        activateVipOnCloud('alipay').catch(console.error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
        if (session) {
            const vip = await getVipStatus(session);
            console.log('Set VIP status to:', vip);
            setIsVip(vip);
        }
    };
    loadData();
  }, [session]);

  const handleGenerate = (profile: UserProfile) => {
    if (!isVip) {
        try {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;
            const key = `guest_limit_${todayStr}`;
            const stored = localStorage.getItem(key);
            let usage = stored ? JSON.parse(stored) : { count: 0, hashes: [] };
            const profileHash = JSON.stringify({
                n: profile.name, g: profile.gender, d: profile.birthDate,
                t: profile.birthTime, c: profile.city || ''
            });
            if (!Array.isArray(usage.hashes)) usage.hashes = [];
            if (!usage.hashes.includes(profileHash)) {
                if (usage.count >= 3) {
                    setShowLimitHint(true);
                    return;
                }
                usage.count += 1;
                usage.hashes.push(profileHash);
                localStorage.setItem(key, JSON.stringify(usage));
                updateGuestUsage();
            }
        } catch (e) { console.error("Limit check failed", e); }
    }

    try {
        const newBazi = loadChartFromProfile(profile);
        setCurrentProfile(profile); 
        setBaziChart(newBazi); 
        setAiReport(null); 
        
        // 输入完成后按目标流派分流，未指定则默认八字
        const nextTab = targetAnalysis === 'ziwei' ? AppTab.ZIWEI 
                      : targetAnalysis === 'qimen' ? AppTab.QIMEN 
                      : AppTab.CHART;
        setCurrentTab(nextTab);
        
        setIsGlobalSaving(true);
        saveArchive(profile).then(updatedList => {
              setArchives(updatedList);
              const saved = updatedList.find(p => p.birthDate === profile.birthDate && p.birthTime === profile.birthTime && p.gender === profile.gender);
              if (saved) setCurrentProfile(saved);
        }).catch(err => console.error(err)).finally(() => setIsGlobalSaving(false));
    } catch (e) { 
        alert("排盘失败，请检查出生日期格式"); 
    }
  };

  const handleSelectProfileForChat = (profile: UserProfile) => {
    try {
      const chart = loadChartFromProfile(profile);
      setCurrentProfile(profile);
      setBaziChart(chart);
    } catch {
      alert('命盘加载失败，请检查档案信息');
    }
  };

  const handleManualSave = async () => {
      if (isGlobalSaving) return;
      if (!currentProfile) return alert('无数据');
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
          alert("VIP 激活成功！"); 
      }
  };

  const handleAiAnalysis = async () => {
    if (!baziChart) return;
    const key = sessionStorage.getItem('ai_api_key');
    setLoadingAi(true);
    setLlmPriority(null);
    try {
      const result = await analyzeBaziStructured(baziChart!, key || undefined, isVip, setLlmPriority);
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

  const handleLogout = async () => {
    setArchives([]); 
    setIsVip(false); 
    setBaziChart(null); 
    setCurrentProfile(null); 
    setCurrentTab(AppTab.HOME); 
    setSession(null); 
    try { 
        localStorage.removeItem('bazi_archives:guest'); 
        localStorage.removeItem('is_vip_user'); 
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-') && key.endsWith('-auth-token')) localStorage.removeItem(key);
        });
    } catch {} 
    try { await safeSignOut(); } catch (e) { console.error('SignOut warning:', e); }
  };

  const renderContent = () => {
      switch (currentTab) {
          case AppTab.HOME:
              return (
                  <HomeView
                      onSelectCapability={(type) => {
                          if (type === 'bazi' || type === 'ziwei' || type === 'qimen') {
                              setTargetAnalysis(type);
                              setCurrentTab(AppTab.CHART);
                          }
                      }}
                      onTabChange={setCurrentTab}
                      archives={archives}
                      isVip={isVip}
                      onVipClick={() => setShowVipModal(true)}
                      session={session}
                      onShowLogin={() => setShowAuthModal(true)}
                      currentProfile={currentProfile}
                      onContinueLast={(profile) => {
                          handleSelectProfileForChat(profile);
                          setCurrentTab(AppTab.CHART);
                      }}
                  />
              );

          case AppTab.CHART:
              if (!baziChart || !currentProfile) {
                  return (
                      <BaziInputView 
                          onGenerate={handleGenerate} 
                          archives={archives} 
                          guestUsage={isVip ? undefined : { count: guestUsageCount, limit: 3 }}
                          onOpenArchive={() => setCurrentTab(AppTab.ARCHIVE)}
                          targetAnalysis={targetAnalysis}
                      />
                  );
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
                          llmPriority={llmPriority} 
                          aiReport={aiReport} 
                          isVip={isVip} 
                          onVipClick={() => setShowVipModal(true)}
                          onManualSave={handleManualSave} 
                          isSaving={isGlobalSaving} 
                          archives={archives}
                          trialUsage={trialUsage}
                          onUseTrialMasterReport={async () => {
                              const ok = await useTrialMasterReport();
                              if (ok) setTrialUsage(prev => ({ ...prev, masterReportUsed: true }));
                              return ok;
                          }}
                      />
                  </ErrorBoundary>
              );
          
          case AppTab.CHAT:
              if (!isVip && trialUsage.chatCount >= 10) return (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#f5f5f4] space-y-4">
                      <div className="bg-stone-200 p-4 rounded-full"><Crown size={48} className="text-stone-400" /></div>
                      <h3 className="font-bold text-lg text-stone-700">AI 对话体验已用完</h3>
                      <p className="text-sm text-stone-500">您已用完 10 次免费 AI 对话体验。<br/>升级 VIP 解锁无限次深度对话。</p>
                      <button onClick={() => setShowVipModal(true)} className="px-6 py-3 bg-stone-900 text-amber-400 rounded-xl font-bold shadow-lg active:scale-95 transition-transform">立即解锁</button>
                  </div>
              );
              if (!baziChart || !currentProfile) return (
                  <ChatProfilePicker
                      archives={archives}
                      onSelect={handleSelectProfileForChat}
                      onNewChart={() => {
                          setBaziChart(null);
                          setCurrentProfile(null);
                          setTargetAnalysis(null);
                          setCurrentTab(AppTab.CHART);
                      }}
                  />
              );
              return (
                  <ErrorBoundary>
                      <AiChatView
                          key={getChatHistoryKey(currentProfile)}
                          chart={baziChart}
                          profile={currentProfile}
                          archives={archives}
                          onSwitchProfile={handleSelectProfileForChat}
                          isVip={isVip}
                          onVipClick={() => setShowVipModal(true)}
                          trialUsage={trialUsage}
                          chatRemaining={Math.max(0, 10 - trialUsage.chatCount)}
                          onUseTrialChat={async () => {
                              const ok = await useTrialChat();
                              if (ok) setTrialUsage(prev => ({ ...prev, chatCount: prev.chatCount + 1 }));
                              return ok;
                          }}
                      />
                  </ErrorBoundary>
              );
          
          case AppTab.ZIWEI:
              if (!currentProfile) return (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#f5f5f4] space-y-4">
                      <div className="bg-stone-200 p-4 rounded-full"><Sparkles size={48} className="text-stone-300" /></div>
                      <h3 className="font-bold text-lg text-stone-700">紫微斗数</h3>
                      <p className="text-sm text-stone-500 font-medium">请先在【排盘】输入生辰信息，<br/>即可生成紫微斗数命盘。</p>
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
                      <p className="text-sm text-stone-500 font-medium">请先在【排盘】输入生辰信息，<br/>即可生成奇门遁甲排盘。</p>
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
                    onNewChart={() => { setBaziChart(null); setCurrentTab(AppTab.CHART); }}
                />
              );

          case AppTab.PROFILE:
              return (
                  <ProfileView
                      session={session}
                      isVip={isVip}
                      archivesCount={archives.length}
                      onVipClick={() => setShowVipModal(true)}
                      onLogin={() => setShowAuthModal(true)}
                      onLogout={handleLogout}
                  />
              );

          case AppTab.LIUYAO:
              return (
                  <LiuYaoView 
                      onBack={() => setCurrentTab(AppTab.HOME)}
                      isVip={isVip}
                      onVipClick={() => setShowVipModal(true)}
                  />
              );
          
          default:
              return (
                  <HomeView
                      onSelectCapability={(type) => {
                          if (type === 'bazi' || type === 'ziwei' || type === 'qimen') {
                              setTargetAnalysis(type);
                              setCurrentTab(AppTab.CHART);
                          }
                      }}
                      onTabChange={setCurrentTab}
                      archives={archives}
                      isVip={isVip}
                      onVipClick={() => setShowVipModal(true)}
                      session={session}
                      onShowLogin={() => setShowAuthModal(true)}
                      currentProfile={currentProfile}
                      onContinueLast={(profile) => {
                          handleSelectProfileForChat(profile);
                          setCurrentTab(AppTab.CHART);
                      }}
                  />
              );
      }
  };

  const getHeaderTitle = () => {
      switch (currentTab) {
          case AppTab.HOME: return '玄枢命理';
          case AppTab.CHART: return baziChart && currentProfile ? currentProfile.name : '八字排盘';
          case AppTab.ARCHIVE: return '历史档案';
          case AppTab.PROFILE: return '我的';
          case AppTab.ZIWEI: return '紫微斗数';
          case AppTab.QIMEN: return '奇门遁甲';
          case AppTab.CHAT: return 'AI 命理对话';
          case AppTab.LIUYAO: return '六爻卜卦';
          default: return '玄枢命理';
      }
  };

  const currentAnalysisType: AnalysisType = currentTab === AppTab.ZIWEI ? 'ziwei' : currentTab === AppTab.QIMEN ? 'qimen' : 'bazi';
  const showAnalysisSwitcher = currentProfile && (currentTab === AppTab.CHART || currentTab === AppTab.ZIWEI || currentTab === AppTab.QIMEN);

  return (
    <div className={`flex flex-col h-[100dvh] overflow-hidden text-stone-950 font-sans transition-colors duration-700 ${isVip ? 'bg-[#181816]' : 'bg-[#f5f5f4]'}`}>
      {currentTab !== AppTab.HOME && (
          <AppHeader 
              title={getHeaderTitle()} 
              rightAction={
                  currentTab === AppTab.CHART && baziChart && currentProfile ? (
                      <button
                          onClick={() => { setCurrentProfile(null); setBaziChart(null); setAiReport(null); }}
                          className={`p-2 rounded-full transition-colors ${isVip ? 'hover:bg-white/10 text-stone-300' : 'hover:bg-stone-100 text-stone-700'}`}
                          title="重新排盘"
                      >
                          <RotateCcw size={18} />
                      </button>
                  ) : undefined
              }
              isVip={isVip} 
              guestUsage={{ count: guestUsageCount, limit: 3 }}
          />
      )}
      {showAnalysisSwitcher && (
          <AnalysisSwitcher
              current={currentAnalysisType}
              onChange={(type) => {
                  setTargetAnalysis(type);
                  setCurrentTab(type === 'ziwei' ? AppTab.ZIWEI : type === 'qimen' ? AppTab.QIMEN : AppTab.CHART);
              }}
              isVip={isVip}
          />
      )}
      <div className="flex-1 overflow-hidden relative">{renderContent()}</div>
      <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
      {modalData && <DetailModal data={modalData} chart={baziChart} onClose={() => setModalData(null)} />}
      {showVipModal && <VipActivationModal onClose={() => setShowVipModal(false)} onActivate={handleActivateVip} />}
      {showPayResultModal && <PayResultModal onClose={() => { setShowPayResultModal(false); try { window.history.replaceState(null, '', window.location.pathname); } catch {} }} />}
      {showWelcomeModal && <WelcomeModal onClose={() => setShowWelcomeModal(false)} />}
      {showPasswordResetModal && <PasswordResetModal onClose={() => setShowPasswordResetModal(false)} />}
      {showLimitHint && <QuotaLimitModal onClose={() => setShowLimitHint(false)} onUpgrade={() => setShowVipModal(true)} />}
      
      {showAuthModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-md" onClick={() => setShowAuthModal(false)} />
              <div className="relative z-10 animate-in zoom-in-95 duration-200">
                  <Auth onLoginSuccess={() => { setShowAuthModal(false); }} />
              </div>
          </div>
      )}
    </div>
  );
};

export default App;
