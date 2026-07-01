import React, { useState } from 'react';
import {
    ScrollText, MessageCircle, MoonStar, Grid3x3, Layers,
    Crown, ChevronRight, User, X, History, Compass
} from 'lucide-react';
import { UserProfile, AppTab } from '../types';
import type { AnalysisType } from '../App';

interface HomeViewProps {
    onSelectCapability: (type: AnalysisType | 'liuyao' | 'chat') => void;
    onTabChange: (tab: AppTab) => void;
    archives: UserProfile[];
    isVip: boolean;
    onVipClick: () => void;
    session?: any;
    onShowLogin?: () => void;
    currentProfile?: UserProfile | null;
    onContinueLast?: (profile: UserProfile) => void;
}

const LOGO_URL = 'https://imgus.tangbuy.com/static/images/2026-01-10/631ac4d3602b4f508bb0cad516683714-176803435086117897846087613804795.png';

const TOOLS = [
    { id: 'bazi', type: 'bazi' as AnalysisType, title: '八字精批', subtitle: '四柱格局 · 大运流年', icon: ScrollText, iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
    { id: 'ziwei', type: 'ziwei' as AnalysisType, title: '紫微斗数', subtitle: '十二宫位 · 主星四化', icon: MoonStar, iconBg: 'bg-violet-50', iconColor: 'text-violet-600' },
    { id: 'qimen', type: 'qimen' as AnalysisType, title: '奇门遁甲', subtitle: '九宫排盘 · 择吉决策', icon: Grid3x3, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { id: 'liuyao', type: 'liuyao' as const, title: '六爻卜卦', subtitle: '一事一占 · 摇卦起爻', icon: Layers, iconBg: 'bg-sky-50', iconColor: 'text-sky-600' },
];

export const HomeView: React.FC<HomeViewProps> = ({
    onSelectCapability,
    onTabChange,
    archives,
    isVip,
    onVipClick,
    session,
    onShowLogin,
    currentProfile,
    onContinueLast
}) => {
    const recentArchives = archives.slice(0, 3);
    const isGuest = !session?.user;
    const [dismissLoginBanner, setDismissLoginBanner] = useState(false);
    const [showNeedChartToast, setShowNeedChartToast] = useState(false);

    const handleToolClick = (type: AnalysisType | 'liuyao') => {
        if (type === 'liuyao') {
            onTabChange(AppTab.LIUYAO);
            return;
        }
        onSelectCapability(type);
    };

    return (
        <div className="flex h-full flex-col bg-[#fafaf9]">
            {/* 可滚动主内容 */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="mx-auto max-w-md px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-24 space-y-6">

                    {/* ① 顶部 Logo + 文案 */}
                    <header className="text-center">
                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-stone-200 bg-white p-2 shadow-sm">
                            <img src={LOGO_URL} alt="玄枢" className="h-full w-full rounded-xl object-cover" />
                        </div>
                        <h2 className="font-serif text-xl font-black tracking-wide text-stone-900">
                            玄枢命理
                        </h2>
                        <p className="mt-1.5 text-xs leading-relaxed text-stone-500">
                            输入一次生辰，八字、紫微、奇门自由切换
                        </p>
                    </header>

                    {/* ② 四个命理工具 */}
                    <section>
                        <div className="grid grid-cols-2 gap-3">
                            {TOOLS.map((tool) => (
                                <button
                                    key={tool.id}
                                    onClick={() => handleToolClick(tool.type)}
                                    className="flex flex-col items-center rounded-xl border border-stone-200/80 bg-white px-3 py-3 text-center shadow-sm active:scale-[0.98] transition-transform"
                                >
                                    <div className={`mb-1.5 flex h-9 w-9 items-center justify-center rounded-lg ${tool.iconBg}`}>
                                        <tool.icon size={18} className={tool.iconColor} strokeWidth={1.75} />
                                    </div>
                                    <p className="text-[13px] font-bold text-stone-900">{tool.title}</p>
                                    <p className="mt-0.5 text-[10px] leading-tight text-stone-400">{tool.subtitle}</p>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* ③ AI 对话 */}
                    <section className="relative">
                        <button
                            onClick={() => {
                                if (!isVip) { onVipClick(); return; }
                                if (!currentProfile) {
                                    setShowNeedChartToast(true);
                                    setTimeout(() => setShowNeedChartToast(false), 2000);
                                    onTabChange(AppTab.CHART);
                                    return;
                                }
                                onTabChange(AppTab.CHAT);
                            }}
                            className="flex w-full items-center gap-3 rounded-xl border border-stone-200/80 bg-white px-4 py-3 text-left shadow-sm active:bg-stone-50 transition-colors"
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                                <MessageCircle size={20} className="text-indigo-600" strokeWidth={1.75} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-[13px] font-bold text-stone-900">AI 命理对话</p>
                                    {!isVip ? (
                                        <span className="flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                                            <Crown size={9} /> VIP
                                        </span>
                                    ) : !currentProfile ? (
                                        <span className="flex items-center gap-0.5 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                                            <Compass size={9} /> 需先排盘
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-0.5 text-[10px] text-stone-400">
                                    {!isVip
                                        ? '随问随答 · 事业财运感情健康'
                                        : !currentProfile
                                            ? '请先完成一次八字排盘，再开始 AI 对话'
                                            : `当前命盘：${currentProfile.name} · 随问随答`
                                    }
                                </p>
                            </div>
                            <ChevronRight size={16} className="shrink-0 text-stone-300" />
                        </button>

                        {/* 无命盘提示 */}
                        {showNeedChartToast && (
                            <div className="absolute -top-10 left-0 right-0 z-20 mx-auto w-max max-w-[90%] animate-fade-in">
                                <div className="flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-xs font-bold text-amber-50 shadow-lg">
                                    <Compass size={14} />
                                    请先排盘，再使用 AI 对话
                                </div>
                            </div>
                        )}
                    </section>

                    {/* ④ 历史档案 */}
                    {recentArchives.length > 0 && (
                        <section>
                            <div className="mb-2.5 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-stone-700">历史档案</h3>
                                <button
                                    onClick={() => onTabChange(AppTab.ARCHIVE)}
                                    className="flex items-center gap-0.5 text-xs font-medium text-stone-500"
                                >
                                    全部 <ChevronRight size={14} />
                                </button>
                            </div>
                            <div className="space-y-2">
                                {recentArchives.map((p, index) => {
                                    const isLast = index === 0;
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => {
                                                if (isLast && onContinueLast) {
                                                    onContinueLast(p);
                                                } else {
                                                    onSelectCapability('bazi');
                                                }
                                            }}
                                            className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left shadow-sm transition-colors ${
                                                isLast
                                                    ? 'border-indigo-100 bg-gradient-to-r from-indigo-50 to-white active:bg-indigo-100/50'
                                                    : 'border-stone-200/80 bg-white active:bg-stone-50'
                                            }`}
                                        >
                                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-base ${
                                                isLast ? 'bg-white shadow-sm' : 'bg-stone-100'
                                            }`}>
                                                {p.avatar
                                                    ? <img src={p.avatar} alt="" className="h-full w-full object-cover" />
                                                    : (p.gender === 'female' ? '👩' : '🧑')
                                                }
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="truncate text-sm font-bold text-stone-800">{p.name}</p>
                                                    {isLast && (
                                                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-indigo-600">
                                                            <History size={10} /> 上次
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-stone-400">{p.birthDate} · {p.birthTime}</p>
                                            </div>
                                            <ChevronRight size={14} className={`shrink-0 ${isLast ? 'text-indigo-300' : 'text-stone-300'}`} />
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                </div>
            </div>

            {/* ⑤ 登录条：紧贴底部导航上方 */}
            {isGuest && !dismissLoginBanner && (
                <div className="shrink-0 border-t border-stone-200/80 bg-white px-5 py-3">
                    <div className="mx-auto flex max-w-md items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100">
                            <User size={16} className="text-stone-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-stone-800">登录解锁完整体验</p>
                            <p className="text-xs text-stone-400">云端同步 · VIP 深度对话</p>
                        </div>
                        <button
                            onClick={onShowLogin}
                            className="shrink-0 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-amber-400 active:scale-95 transition-transform"
                        >
                            登录
                        </button>
                        <button
                            onClick={() => setDismissLoginBanner(true)}
                            className="shrink-0 p-1 text-stone-300 active:text-stone-500"
                            aria-label="关闭"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
