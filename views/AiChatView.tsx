import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { Send, Crown, HelpCircle, Activity, Sparkles, User, Copy, Check, Trash2, ArrowDown, Lightbulb, Grid3x3 } from 'lucide-react';
import { BaziChart, UserProfile } from '../types';
import { ChatMessage, sendChatMessage, ChatMode } from '../services/chatService';
import { LlmPriorityBadge } from '../components/ui/LlmPriorityBadge';
import type { LlmPriority } from '../utils/llmPriority';
import { SmartTextRenderer } from '../components/ui/BaziUI';
import { ChatProfileBar } from '../components/chat/ChatProfileBar';
import {
    loadChatHistory,
    saveChatHistory,
    clearChatHistory,
    buildWelcomeMessage,
} from '../utils/chatHistory';
import { calculateChart } from '../ziwei/services/astrologyService';
import { initializeQM_Ju, generateQimenString } from '../services/qimenService';
import { Solar } from 'lunar-javascript';

const CopyButton: React.FC<{ content: string }> = ({ content }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        const cleanContent = content.split('|||')[0];
        navigator.clipboard.writeText(cleanContent).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <button onClick={handleCopy} className="flex items-center gap-1 text-[10px] text-stone-400 hover:text-stone-600 transition-colors mt-2 ml-1 px-2 py-1 rounded-md hover:bg-stone-100" title="复制全文">
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            {copied ? <span className="text-emerald-500 font-medium">已复制</span> : <span>复制</span>}
        </button>
    );
};

const InChatSuggestions: React.FC<{ rawContent: string; onSend: (text: string) => void }> = ({ rawContent, onSend }) => {
    const parts = rawContent.split('|||');
    if (parts.length < 2) return null;
    const suggestions = parts[1].split(/[;；]/).map((s) => s.trim()).filter(Boolean);
    if (suggestions.length === 0) return null;

    return (
        <div className="mt-3 flex flex-col gap-2 border-t border-stone-100 pt-3">
            <div className="flex items-center gap-1 text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                <Lightbulb size={10} />
                <span>相关追问</span>
            </div>
            <div className="flex flex-wrap gap-2">
                {suggestions.map((s, i) => (
                    <button
                        key={i}
                        onClick={() => onSend(s)}
                        className="text-left text-xs bg-stone-50 text-stone-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-stone-200 px-3 py-2 rounded-xl transition-all active:scale-95 leading-relaxed"
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>
    );
};

function getTimeContext(): string {
    try {
        const now = new Date();
        const solar = Solar.fromDate(now);
        const lunar = solar.getLunar();
        const eightChar = lunar.getEightChar();
        eightChar.setSect(1);
        const gregorianStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${now.getHours()}时`;
        const ganzhiStr = `${eightChar.getYearGan()}${eightChar.getYearZhi()}年 ${eightChar.getMonthGan()}${eightChar.getMonthZhi()}月 ${eightChar.getDayGan()}${eightChar.getDayZhi()}日 ${eightChar.getTimeGan()}${eightChar.getTimeZhi()}时`;
        return `公历${gregorianStr} (农历/干支：${ganzhiStr})`;
    } catch {
        return '时间获取失败';
    }
}

function loadInitialMessages(profile: UserProfile, timeContext: string): ChatMessage[] {
    return loadChatHistory(profile) ?? [buildWelcomeMessage(profile.name, timeContext)];
}

function generateZiweiString(p: UserProfile): string {
    try {
        if (!p.birthDate || !p.birthTime) return '（用户出生信息不完整）';
        const safeDate = p.birthDate.replace(/\//g, '-');
        const [year, month, day] = safeDate.split('-').map(Number);
        const hour = parseInt(p.birthTime.split(':')[0], 10);
        const genderKey = p.gender === 'male' ? 'male' : 'female';
        const lng = p.longitude || 120;
        const zwChart = calculateChart(year, month, day, hour, genderKey, lng);
        if (!zwChart?.palaces) return '（紫微排盘失败）';
        let desc = '【紫微命盘摘要】\n';
        desc += `五行局：${zwChart.bureau?.name || '未知'}\n`;
        const mingGong = zwChart.palaces.find((pal) => pal.isMing);
        if (mingGong) {
            desc += `命宫主星：${mingGong.stars?.major?.map((s) => s.name).join(', ') || '无'}\n`;
        }
        return desc;
    } catch {
        return '（紫微排盘计算异常）';
    }
}

export const AiChatView: React.FC<{
    chart: BaziChart;
    profile: UserProfile;
    archives?: UserProfile[];
    onSwitchProfile?: (profile: UserProfile) => void;
    isVip: boolean;
    onVipClick: () => void;
}> = ({ chart, profile, archives = [], onSwitchProfile, isVip, onVipClick }) => {
    const timeContext = useMemo(() => getTimeContext(), []);

    const [messages, setMessages] = useState<ChatMessage[]>(() =>
        loadInitialMessages(profile, timeContext)
    );
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<ChatMode>('bazi');
    const [llmPriority, setLlmPriority] = useState<LlmPriority | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const modeInitRef = useRef(true);
    const messagesRef = useRef(messages);
    messagesRef.current = messages;

    const activeSuggestions = useMemo(() => {
        if (loading) return [];
        if (mode === 'ziwei') return ['以当前时间起盘', '今日流日四化重点与禁忌', '今日财运与风控提示'];
        if (mode === 'qimen') return ['以当前时间起盘', '近期财运如何？', '事业发展建议'];
        return ['以当前时间起盘', '今日应避事项', '今日财运机会'];
    }, [loading, mode]);

    useLayoutEffect(() => {
        saveChatHistory(profile, messages);
    }, [messages, profile]);

    useEffect(() => {
        return () => {
            saveChatHistory(profile, messagesRef.current);
        };
    }, [profile]);

    useLayoutEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            requestAnimationFrame(() => setIsReady(true));
        }
    }, []);

    // 仅用户手动切换八字/紫微/奇门时重置对话，不在首次挂载时触发
    useEffect(() => {
        if (modeInitRef.current) {
            modeInitRef.current = false;
            return;
        }
        let content = `已切换为八字模式。当前时空【${timeContext}】。请问您今天想了解哪方面的运势？`;
        if (mode === 'ziwei') {
            content = `已切换为紫微斗数模式。当前时空【${timeContext}】。请问您今天想了解哪方面的星象？`;
        } else if (mode === 'qimen') {
            content = `已切换为奇门遁甲模式。当前时空【${timeContext}】。请告诉我您的问题，我将为您起局分析。`;
        }
        setMessages([{ role: 'assistant', content }]);
        setIsUserScrolledUp(false);
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [mode, timeContext]);

    useEffect(() => {
        if (isReady && !isUserScrolledUp) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isReady, isUserScrolledUp]);

    const handleScroll = () => {
        if (!chatContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        setIsUserScrolledUp(scrollHeight - scrollTop - clientHeight > 50);
    };

    const handleClearHistory = () => {
        if (!window.confirm('确定要清空当前对话记录吗？')) return;
        const defaultMsg: ChatMessage = {
            role: 'assistant',
            content: `对话已重置。\n我是您的专属命理师，当前时空【${timeContext}】，请问您现在想了解什么？`,
        };
        setMessages([defaultMsg]);
        clearChatHistory(profile);
        setIsUserScrolledUp(false);
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    };

    const handleSend = async (contentOverride?: string) => {
        const msgContent = contentOverride || input;
        if (!msgContent.trim() || loading) return;

        const userMsg: ChatMessage = { role: 'user', content: msgContent };
        const nextMessages = [...messagesRef.current, userMsg];
        setMessages(nextMessages);
        setInput('');
        setLoading(true);
        setLlmPriority(null);
        setIsUserScrolledUp(false);

        try {
            setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

            const freshBaziChart = chart;
            const freshZiweiString = generateZiweiString(profile);
            const freshQimenString = generateQimenString(initializeQM_Ju(profile, Date.now()));

            let fullText = '';
            await sendChatMessage(
                nextMessages,
                profile,
                freshBaziChart,
                freshZiweiString,
                freshQimenString,
                mode,
                (chunk) => {
                    fullText += chunk;
                    setMessages((prev) => {
                        const newMsgs = [...prev];
                        const last = newMsgs[newMsgs.length - 1];
                        if (last.role === 'assistant') last.content = fullText;
                        return newMsgs;
                    });
                },
                isVip,
                timeContext,
                setLlmPriority
            );
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : '未知错误';
            setMessages((prev) => {
                const newMsgs = [...prev];
                const last = newMsgs[newMsgs.length - 1];
                if (last.role === 'assistant' && !last.content) last.content = `😓 请求中断: ${msg}`;
                return newMsgs;
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8f8f7] relative">
            {onSwitchProfile && archives.length > 1 && (
                <ChatProfileBar
                    archives={archives}
                    currentId={profile.id}
                    onSwitch={onSwitchProfile}
                />
            )}

            <div className="bg-white/90 backdrop-blur-md border-b border-stone-200 p-1.5 flex justify-between items-center z-20 sticky top-0 shadow-sm px-3">
                <div className="w-7" />
                <div className="bg-stone-100 p-0.5 rounded-lg flex gap-0.5">
                    <button onClick={() => setMode('bazi')} className={`px-3 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${mode === 'bazi' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400'}`}><Activity size={12} /> 八字</button>
                    <button onClick={() => setMode('ziwei')} className={`px-3 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${mode === 'ziwei' ? 'bg-white shadow-sm text-indigo-600' : 'text-stone-400'}`}><Sparkles size={12} /> 紫微</button>
                    <button onClick={() => setMode('qimen')} className={`px-3 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${mode === 'qimen' ? 'bg-white shadow-sm text-emerald-600' : 'text-stone-400'}`}><Grid3x3 size={12} /> 奇门</button>
                </div>
                <button onClick={handleClearHistory} className="w-7 h-7 flex items-center justify-center text-stone-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"><Trash2 size={14} /></button>
            </div>

            <div
                ref={chatContainerRef}
                onScroll={handleScroll}
                className={`flex-1 overflow-y-auto p-4 space-y-6 pb-6 custom-scrollbar scroll-smooth transition-opacity duration-200 ${isReady ? 'opacity-100' : 'opacity-0'}`}
            >
                {messages.map((msg, idx) => (
                    <div key={`${profile.gender}-${profile.birthDate}-${idx}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start items-start'}`}>
                        {msg.role === 'assistant' && (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1 shadow-sm ${mode === 'ziwei' ? 'bg-indigo-900 text-white' : mode === 'qimen' ? 'bg-emerald-900 text-emerald-200' : 'bg-stone-900 text-amber-400'}`}>
                                {mode === 'ziwei' ? <Sparkles size={14} /> : mode === 'qimen' ? <Grid3x3 size={14} /> : <Crown size={14} fill="currentColor" />}
                            </div>
                        )}
                        <div className="flex flex-col max-w-[85%]">
                            <div className={`p-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm transition-all ${msg.role === 'user' ? 'bg-stone-900 text-white rounded-tr-none' : 'bg-white text-stone-800 rounded-tl-none border border-stone-100'}`}>
                                <div className="select-text cursor-text selection:bg-indigo-100 selection:text-indigo-900" style={{ WebkitUserSelect: 'text', userSelect: 'text', wordBreak: 'break-word' }}>
                                    <SmartTextRenderer content={msg.content.split('|||')[0]} className={msg.role === 'user' ? 'text-white' : 'text-stone-800'} />
                                </div>
                                {msg.role === 'assistant' && !loading && (
                                    <InChatSuggestions rawContent={msg.content} onSend={handleSend} />
                                )}
                            </div>
                            {msg.role === 'assistant' && msg.content && <CopyButton content={msg.content} />}
                        </div>
                        {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center shrink-0 ml-2 mt-1"><User size={16} className="text-stone-500" /></div>}
                    </div>
                ))}

                {loading && (
                    <div className="flex items-center gap-2 p-4 text-xs text-stone-400 animate-pulse">
                        <Activity size={14} className="animate-spin" />
                        <span>大师正在推演中…（{profile.name}）</span>
                        <LlmPriorityBadge priority={llmPriority} />
                    </div>
                )}
                <div ref={messagesEndRef} className="h-2" />
            </div>

            {isUserScrolledUp && loading && (
                <button
                    onClick={() => { setIsUserScrolledUp(false); messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
                    className="absolute bottom-24 right-4 bg-stone-900 text-white p-2 rounded-full shadow-lg z-30 animate-bounce"
                >
                    <ArrowDown size={16} />
                </button>
            )}

            <div className="p-3 bg-white border-t border-stone-200 z-20 pb-safe">
                {!loading && llmPriority && (
                    <div className="flex justify-end mb-2 px-1">
                        <LlmPriorityBadge priority={llmPriority} />
                    </div>
                )}
                {activeSuggestions.length > 0 && !loading && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3 px-1">
                        {activeSuggestions.map((s, i) => (
                            <button key={i} onClick={() => handleSend(s)} className="whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-full bg-stone-50 border border-stone-200 text-stone-600 hover:bg-stone-100 transition-colors flex items-center gap-1 active:scale-95">
                                <HelpCircle size={12} />{s}
                            </button>
                        ))}
                    </div>
                )}
                <div className="flex gap-2 items-end">
                    <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder={mode === 'bazi' ? `问问${profile.name}的八字运势…` : mode === 'ziwei' ? `问问${profile.name}的紫微星象…` : `问问${profile.name}的奇门…`} className="flex-1 bg-stone-100 rounded-2xl px-4 py-3 text-sm outline-none resize-none max-h-24 transition-colors focus:bg-white focus:ring-2 focus:ring-stone-200" rows={1} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
                    <button onClick={() => handleSend()} disabled={loading || !input.trim()} className={`p-3 rounded-full flex items-center justify-center transition-all ${loading || !input.trim() ? 'bg-stone-200 text-stone-400' : 'bg-stone-900 text-amber-400 shadow-lg active:scale-95'}`}>
                        {loading ? <Activity size={20} className="animate-spin" /> : <Send size={20} />}
                    </button>
                </div>
            </div>
        </div>
    );
};
