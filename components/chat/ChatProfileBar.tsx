import React from 'react';
import { UserProfile } from '../../types';

interface ChatProfileBarProps {
    archives: UserProfile[];
    currentId: string;
    onSwitch: (profile: UserProfile) => void;
}

/** 对话顶栏：紧凑命盘胶囊，仅切换不跳转 */
export const ChatProfileBar: React.FC<ChatProfileBarProps> = ({ archives, currentId, onSwitch }) => {
    if (archives.length <= 1) return null;

    const sorted = [...archives].sort((a, b) => {
        if (!!a.isSelf !== !!b.isSelf) return b.isSelf ? 1 : -1;
        return (b.createdAt || 0) - (a.createdAt || 0);
    });

    return (
        <div className="shrink-0 border-b border-stone-200/50 bg-white/90 px-2 py-1.5 backdrop-blur-sm">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {sorted.map((p) => {
                    const active = p.id === currentId;
                    return (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                                if (!active) onSwitch(p);
                            }}
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold leading-none transition-all ${
                                active
                                    ? 'bg-stone-900 text-amber-300 shadow-sm'
                                    : 'bg-stone-100 text-stone-600 active:bg-stone-200'
                            }`}
                        >
                            {p.name}
                            {p.isSelf && !active && (
                                <span className="ml-0.5 text-[9px] text-amber-600">·</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
