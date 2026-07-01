import React, { useMemo, useState } from 'react';
import { MessageCircle, Compass, Search, Calendar, Clock, ChevronRight, Plus, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';
import { ProfileAvatar } from '../components/chat/ProfileAvatar';

interface ChatProfilePickerProps {
    archives: UserProfile[];
    onSelect: (profile: UserProfile) => void;
    onNewChart: () => void;
}

export const ChatProfilePicker: React.FC<ChatProfilePickerProps> = ({ archives, onSelect, onNewChart }) => {
    const [search, setSearch] = useState('');

    const displayList = useMemo(() => {
        const q = search.trim();
        const list = q
            ? archives.filter(
                  (p) =>
                      p.name?.includes(q) ||
                      p.birthDate?.includes(q) ||
                      p.tags?.some((t) => t.includes(q))
              )
            : archives;
        return [...list].sort((a, b) => {
            if (!!a.isSelf !== !!b.isSelf) return b.isSelf ? 1 : -1;
            return (b.createdAt || 0) - (a.createdAt || 0);
        });
    }, [archives, search]);

    if (archives.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center bg-[#fafaf9] p-6 text-center">
                <div className="relative mb-6">
                    <div className="absolute inset-0 rounded-full bg-indigo-200/40 blur-xl" />
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-stone-200 bg-white shadow-sm">
                        <MessageCircle size={36} className="text-indigo-500" strokeWidth={1.5} />
                    </div>
                </div>
                <h3 className="font-serif text-xl font-bold text-stone-900">暂无命盘档案</h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-stone-500">
                    AI 对话需要命盘数据作为依据，请先新建排盘。
                </p>
                <button
                    onClick={onNewChart}
                    className="mt-8 flex items-center gap-2 rounded-2xl bg-stone-900 px-8 py-3.5 text-sm font-bold text-amber-400 shadow-lg shadow-stone-900/15 active:scale-[0.98] transition-transform"
                >
                    <Compass size={18} />
                    去排盘
                </button>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col bg-[#fafaf9]">
            {/* 头部 */}
            <div className="relative shrink-0 overflow-hidden border-b border-stone-200/60 bg-white px-5 pb-5 pt-6">
                <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-indigo-100/60 blur-2xl" />
                <div className="pointer-events-none absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-amber-100/50 blur-2xl" />
                <div className="relative text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 shadow-sm ring-1 ring-indigo-100">
                        <Sparkles size={24} className="text-indigo-600" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-serif text-xl font-bold tracking-wide text-stone-900">选择命盘</h3>
                    <p className="mt-1.5 text-xs text-stone-400">选定后 AI 将基于该命盘进行对话</p>
                </div>
            </div>

            {archives.length > 2 && (
                <div className="shrink-0 px-4 py-3">
                    <div className="relative mx-auto max-w-md">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="搜索姓名、日期或标签"
                            className="w-full rounded-xl border border-stone-200/80 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm outline-none transition-colors focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 pb-4 no-scrollbar">
                <div className="mx-auto max-w-md space-y-3">
                    {displayList.map((profile) => (
                        <button
                            key={profile.id}
                            type="button"
                            onClick={() => onSelect(profile)}
                            className={`group relative flex w-full items-center gap-3.5 overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition-all active:scale-[0.99] ${
                                profile.isSelf
                                    ? 'border-amber-200/80 bg-gradient-to-r from-amber-50/90 via-white to-white'
                                    : 'border-stone-200/70 bg-white hover:border-stone-300 hover:shadow-md'
                            }`}
                        >
                            {profile.isSelf && (
                                <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-amber-400 to-amber-600" />
                            )}
                            <ProfileAvatar profile={profile} />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="truncate text-[15px] font-bold text-stone-900">{profile.name}</span>
                                    {profile.isSelf && (
                                        <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                                            本人
                                        </span>
                                    )}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-500">
                                    <span className="flex items-center gap-1">
                                        <Calendar size={11} className="text-stone-400" />
                                        {profile.birthDate}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock size={11} className="text-stone-400" />
                                        {profile.birthTime}
                                    </span>
                                </div>
                                {profile.tags && profile.tags.length > 0 && (
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                        {profile.tags.slice(0, 3).map((tag) => (
                                            <span
                                                key={tag}
                                                className="rounded-md bg-stone-100 px-1.5 py-px text-[9px] font-medium text-stone-500"
                                            >
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-50 text-stone-300 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-400">
                                <ChevronRight size={16} />
                            </div>
                        </button>
                    ))}

                    {displayList.length === 0 && (
                        <p className="py-12 text-center text-sm text-stone-400">未找到匹配的档案</p>
                    )}
                </div>
            </div>

            <div className="shrink-0 border-t border-stone-200/60 bg-white/90 px-4 py-4 backdrop-blur-sm">
                <button
                    type="button"
                    onClick={onNewChart}
                    className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 bg-stone-50/50 py-3 text-sm font-bold text-stone-600 transition-colors active:bg-stone-100"
                >
                    <Plus size={16} />
                    新建排盘
                </button>
            </div>
        </div>
    );
};
