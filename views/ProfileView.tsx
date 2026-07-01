import React, { useState, useEffect, useMemo } from 'react';
import { Crown, RefreshCw, LogOut, ShieldCheck, ChevronRight, Activity, Cloud, User, Sparkles, Lock, Mail, Database, Globe, Gift } from 'lucide-react';
import { getSyncMeta, syncArchivesFromCloud } from '../services/storageService';
import { inviteFriends } from '../services/shareService';
import { safeRefreshSession, isAuthAbortError } from '../services/supabase';
import { PolicyModal } from '../components/modals/PolicyModals';

interface ProfileViewProps {
    session: any;
    isVip: boolean;
    archivesCount: number;
    onVipClick: () => void;
    onLogin: () => void;
    onLogout: () => void;
}

const MENU_ITEMS = [
    { icon: Sparkles, label: 'VIP 会员', desc: '解锁无限 AI 解读与云备份', action: 'vip', color: 'text-amber-500' },
    { icon: Gift, label: '邀请好友得额度', desc: '每邀请 1 位好友 +5 次 AI 对话', action: 'invite', color: 'text-rose-500' },
    { icon: Cloud, label: '数据同步', desc: '同步档案到云端', action: 'sync', color: 'text-indigo-500' },
    { icon: ShieldCheck, label: '用户协议', action: 'user-policy', color: 'text-stone-500' },
    { icon: Lock, label: '隐私政策', action: 'privacy-policy', color: 'text-stone-500' },
];

export const ProfileView: React.FC<ProfileViewProps> = ({
    session,
    isVip,
    archivesCount,
    onVipClick,
    onLogin,
    onLogout
}) => {
    const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [syncMeta, setSyncMeta] = useState(getSyncMeta());
    const [showPolicyModal, setShowPolicyModal] = useState<'user' | 'privacy' | null>(null);
    const [inviteStatus, setInviteStatus] = useState<'idle' | 'success' | 'error'>('idle');

    useEffect(() => {
        const refreshMeta = () => setSyncMeta(getSyncMeta());
        refreshMeta();
        window.addEventListener('archives-sync-meta-updated', refreshMeta as EventListener);
        return () => window.removeEventListener('archives-sync-meta-updated', refreshMeta as EventListener);
    }, []);

    const handleSync = async () => {
        if (!session?.user) return onLogin();
        setSyncStatus('loading');
        try {
            const { error } = await safeRefreshSession();
            if (error && !isAuthAbortError(error)) throw error;
            const newList = await syncArchivesFromCloud(session.user.id);
            setSyncStatus('success');
            setTimeout(() => setSyncStatus('idle'), 2000);
        } catch (e: any) {
            console.error("[Sync] failed:", e);
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 3000);
        }
    };

    const formatSyncTime = (ts: number | null) => {
        if (!ts) return '未同步';
        try {
            return new Date(ts).toLocaleString();
        } catch { return '未同步'; }
    };

    const userName = useMemo(() => {
        if (!session) return '访客';
        return session.user.user_metadata?.name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '命理师';
    }, [session]);

    const userEmail = session?.user?.email;

    const handleInvite = async () => {
        const result = await inviteFriends();
        setInviteStatus(result.ok ? 'success' : 'error');
        setTimeout(() => setInviteStatus('idle'), 2000);
    };

    const handleMenuClick = (action: string) => {
        if (action === 'vip') onVipClick();
        else if (action === 'invite') handleInvite();
        else if (action === 'sync') handleSync();
        else if (action === 'user-policy') setShowPolicyModal('user');
        else if (action === 'privacy-policy') setShowPolicyModal('privacy');
    };

    return (
        <div className="h-full flex flex-col bg-[#f5f5f4] overflow-y-auto">
            {/* 顶部用户信息卡 */}
            <div className="bg-[#1c1917] p-5 pb-6 shadow-2xl relative shrink-0">
                <div className="absolute top-[-50%] right-[-10%] w-[60%] h-[160%] bg-gradient-to-b from-amber-500/10 via-transparent to-transparent rotate-12 pointer-events-none blur-2xl"></div>

                <div className="relative z-10 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-amber-300 via-amber-500 to-amber-200 shadow-lg shadow-amber-900/50 shrink-0">
                        <div className="w-full h-full rounded-full bg-[#1c1917] flex items-center justify-center text-2xl">
                            {session ? '👤' : '🙂'}
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-stone-100 font-bold text-lg tracking-wide font-serif truncate">{userName}</h2>
                        {userEmail && <p className="text-xs text-stone-500 truncate">{userEmail}</p>}
                        <div className="flex items-center gap-2 mt-1.5">
                            {isVip ? (
                                <span className="flex items-center gap-1 bg-gradient-to-r from-amber-300 to-amber-500 text-[#1c1917] text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                                    <Crown size={10} fill="currentColor" /> VIP 会员
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold text-stone-500 bg-stone-800 px-2 py-0.5 rounded-full border border-stone-700">普通用户</span>
                            )}
                            <span className="text-[10px] text-stone-600">ID: {session ? session.user.id.slice(0, 8).toUpperCase() : 'GUEST'}</span>
                        </div>
                    </div>
                </div>

                {!session && (
                    <button
                        onClick={onLogin}
                        className="mt-5 w-full py-3 bg-amber-500 text-[#1c1917] rounded-xl font-black text-sm shadow-lg hover:bg-amber-400 active:scale-95 transition-all"
                    >
                        登录 / 注册
                    </button>
                )}
            </div>

            {/* 数据概览 */}
            <div className="mx-4 -mt-3 bg-white rounded-2xl shadow-lg border border-stone-100 p-4 grid grid-cols-3 gap-3 relative z-20">
                <div className="text-center">
                    <div className="text-xl font-black text-stone-900">{archivesCount}</div>
                    <div className="text-[10px] text-stone-400 font-bold">历史命盘</div>
                </div>
                <div className="text-center border-x border-stone-100">
                    <div className="text-xl font-black text-stone-900">{isVip ? '∞' : '3/日'}</div>
                    <div className="text-[10px] text-stone-400 font-bold">排盘额度</div>
                </div>
                <div className="text-center">
                    <div className="text-xl font-black text-stone-900">{isVip ? '5' : '4'}</div>
                    <div className="text-[10px] text-stone-400 font-bold">可用工具</div>
                </div>
            </div>

            {/* 功能菜单 */}
            <div className="p-4 space-y-3">
                {MENU_ITEMS.map(item => (
                    <button
                        key={item.action}
                        onClick={() => handleMenuClick(item.action)}
                        className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-md hover:border-stone-200 transition-all active:scale-[0.99]"
                    >
                        <div className={`p-2 rounded-xl bg-stone-50 ${item.color}`}>
                            <item.icon size={18} />
                        </div>
                        <div className="flex-1 text-left">
                            <div className="text-sm font-black text-stone-800">{item.label}</div>
                            {item.desc && <div className="text-[10px] text-stone-400 mt-0.5">{item.desc}</div>}
                        </div>
                        {item.action === 'invite' ? (
                            inviteStatus === 'success' ? (
                                <span className="text-[10px] font-bold text-emerald-600">已复制</span>
                            ) : inviteStatus === 'error' ? (
                                <span className="text-[10px] font-bold text-rose-600">失败</span>
                            ) : (
                                <ChevronRight size={16} className="text-stone-300" />
                            )
                        ) : (
                            <ChevronRight size={16} className="text-stone-300" />
                        )}
                    </button>
                ))}

                {session && (
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl border border-stone-100 shadow-sm hover:border-rose-200 hover:shadow-md transition-all active:scale-[0.99]"
                    >
                        <div className="p-2 rounded-xl bg-rose-50 text-rose-500">
                            <LogOut size={18} />
                        </div>
                        <div className="flex-1 text-left">
                            <div className="text-sm font-black text-stone-800">退出登录</div>
                            <div className="text-[10px] text-stone-400 mt-0.5">清除当前账号状态</div>
                        </div>
                        <ChevronRight size={16} className="text-stone-300" />
                    </button>
                )}
            </div>

            {/* 同步状态 */}
            <div className="px-4 pb-6">
                <div className="bg-stone-100 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] text-stone-500">
                        <Cloud size={14} />
                        <span>上次同步：{syncMeta.lastError ? <span className="text-rose-500">异常</span> : formatSyncTime(syncMeta.lastSyncAt)}</span>
                    </div>
                    {syncStatus === 'loading' && <Activity size={14} className="animate-spin text-indigo-500" />}
                    {syncStatus === 'success' && <span className="text-[10px] font-bold text-emerald-600">已同步</span>}
                    {syncStatus === 'error' && <span className="text-[10px] font-bold text-rose-600">失败</span>}
                </div>
            </div>

            <PolicyModal type={showPolicyModal} onClose={() => setShowPolicyModal(null)} />
        </div>
    );
};
