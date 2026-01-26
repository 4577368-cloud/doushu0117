import React, { useState, useEffect } from 'react';
import { Info, HelpCircle, X } from 'lucide-react';
import { BAZI_KNOWLEDGE } from '../../services/knowledgeContent';
import { UserProfile, BaziChart } from '../../types';
import { Solar } from 'lunar-javascript';

export const CoreInfoCard: React.FC<{ profile: UserProfile; chart: BaziChart }> = ({ profile, chart }) => {
    const [currentGanZhi, setCurrentGanZhi] = useState({
        year: '', month: '', day: '', hour: ''
    });
    const [showKnowledge, setShowKnowledge] = useState(false);

    useEffect(() => {
        const now = new Date();
        const solar = Solar.fromDate(now);
        const lunar = solar.getLunar();
        const eightChar = lunar.getEightChar();
        eightChar.setSect(1);

        setCurrentGanZhi({
            year: `${eightChar.getYearGan()}${eightChar.getYearZhi()}`,
            month: `${eightChar.getMonthGan()}${eightChar.getMonthZhi()}`,
            day: `${eightChar.getDayGan()}${eightChar.getDayZhi()}`,
            hour: `${eightChar.getTimeGan()}${eightChar.getTimeZhi()}`
        });
    }, []);

    return (
        <div className="bg-white border border-stone-300 rounded-2xl overflow-hidden shadow-sm">
            {/* 顶部标题栏 */}
            <div className="bg-stone-100 border-b border-stone-300 px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Info size={14} className="text-stone-600" />
                    <span className="font-black text-[10px] text-stone-700 uppercase tracking-wider">命盘整体</span>
                    <button 
                        onClick={() => setShowKnowledge(true)}
                        className="p-0.5 hover:bg-stone-200 rounded-full transition-colors text-stone-400 hover:text-stone-600"
                    >
                        <HelpCircle size={12} />
                    </button>
                </div>
                <div className="text-[9px] font-black text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                    {profile.birthDate}
                </div>
            </div>

            <div className="p-4 text-xs text-stone-800 space-y-3">
                {/* 🔥 极简黑金版：完全单行 + 全亮琥珀金 */}
                <div className="bg-[#1c1917] border border-amber-900/40 rounded-xl py-3.5 px-2 shadow-sm flex justify-around items-center">
                    
                    {/* 年 */}
                    <span className="text-[15px] font-black text-amber-300 tracking-wide font-serif leading-none">
                        {currentGanZhi.year || '--'}年
                    </span>
                    
                    {/* 金色分隔线 */}
                    <div className="h-3 w-px bg-amber-700/50"></div>

                    {/* 月 */}
                    <span className="text-[15px] font-black text-amber-300 tracking-wide font-serif leading-none">
                        {currentGanZhi.month || '--'}月
                    </span>

                    {/* 金色分隔线 */}
                    <div className="h-3 w-px bg-amber-700/50"></div>

                    {/* 日 */}
                    <span className="text-[15px] font-black text-amber-300 tracking-wide font-serif leading-none">
                        {currentGanZhi.day || '--'}日
                    </span>

                    {/* 金色分隔线 */}
                    <div className="h-3 w-px bg-amber-700/50"></div>

                    {/* 时 */}
                    <span className="text-[15px] font-black text-amber-300 tracking-wide font-serif leading-none">
                        {currentGanZhi.hour || '--'}时
                    </span>
                </div>

                {/* 核心参数网格 */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col items-center gap-0.5 bg-stone-50 p-2 rounded-xl border border-stone-200">
                        <span className="text-[8px] text-stone-500 font-black">命宫</span>
                        <span className="font-black text-indigo-950 text-sm">{chart.mingGong}</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 bg-stone-50 p-2 rounded-xl border border-stone-200">
                        <span className="text-[8px] text-stone-500 font-black">身宫</span>
                        <span className="font-black text-teal-950 text-sm">{chart.shenGong}</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 bg-stone-50 p-2 rounded-xl border border-stone-200">
                        <span className="text-[8px] text-stone-500 font-black">胎元</span>
                        <span className="font-black text-rose-950 text-sm">{chart.taiYuan}</span>
                    </div>
                </div>

                {/* 起运信息 */}
                <div className="bg-amber-50/50 p-2 rounded-xl border border-amber-200 text-amber-950 font-black text-center text-[11px] tracking-wide">
                    {chart.startLuckText}
                </div>
            </div>

            {/* 知识总纲弹窗 */}
            {showKnowledge && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowKnowledge(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white border-b border-stone-100 p-4 flex items-center justify-between z-10">
                            <h3 className="font-bold text-stone-800 flex items-center gap-2">
                                <HelpCircle size={18} className="text-indigo-600" />
                                {BAZI_KNOWLEDGE.title}
                            </h3>
                            <button onClick={() => setShowKnowledge(false)} className="p-1 hover:bg-stone-100 rounded-full text-stone-400">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5 space-y-6">
                            {BAZI_KNOWLEDGE.sections.map((section, idx) => (
                                <div key={idx} className="space-y-2">
                                    <h4 className="font-bold text-stone-700 text-sm border-l-4 border-indigo-500 pl-2">{section.title}</h4>
                                    <div className="text-xs text-stone-600 leading-relaxed space-y-1.5 pl-3">
                                        {section.content.map((p, i) => (
                                            <p key={i}>{p}</p>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
