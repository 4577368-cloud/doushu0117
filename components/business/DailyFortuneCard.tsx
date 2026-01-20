import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, RefreshCcw, Sparkles, TrendingUp, Heart, Briefcase, Smile, Lock, Wand2 } from 'lucide-react';
import { BaziChart } from '../../types';
import { calculateDailyFortuneBasic } from '../../services/dailyFortune'; // 引入上一轮写的本地算法
import { getFullDateGanZhi } from '../../services/ganzhi';

// 定义 UI 所需的数据结构
export interface DailyFortuneData {
  date: string;
  ganZhi: string;
  auspiciousness: '大吉' | '吉' | '中吉' | '小吉' | '平' | '凶'; // 稍微扩充以兼容
  summary: string;
  scores: {
    wealth: number;
    career: number;
    emotion: number;
    health: number;
  };
  advice: {
    wealth: string;
    career: string;
    emotion: string;
    life: string;
  };
  isAiGenerated: boolean;
}

interface DailyFortuneCardProps {
  chart: BaziChart; // 新增：必须传入 chart 用于计算基础运势
  aiData: DailyFortuneData | null; // 改名：明确这是 AI 数据
  loading: boolean;
  onGenerate: () => void;
  isVip: boolean;
}

export const DailyFortuneCard: React.FC<DailyFortuneCardProps> = ({ chart, aiData, loading, onGenerate, isVip }) => {
  const [mode, setMode] = useState<'basic' | 'ai'>('basic');

  // 使用 useMemo 替代 useEffect + useState，避免首次渲染闪烁
  const basicData = useMemo<DailyFortuneData | null>(() => {
    if (!chart) return null;
    
    const raw = calculateDailyFortuneBasic(chart);
    return {
      date: new Date().toISOString().split('T')[0],
      ganZhi: getFullDateGanZhi(new Date()),
      auspiciousness: raw.auspiciousness as any, // 兼容类型差异
      summary: raw.summary.replace(/\*\*/g, ''),
      scores: raw.scores,
      advice: {
        wealth: raw.advice.wealth.replace(/\*\*/g, ''),
        career: raw.advice.career.replace(/\*\*/g, ''),
        emotion: raw.advice.emotion.replace(/\*\*/g, ''),
        life: raw.advice.life.replace(/\*\*/g, ''),
      },
      isAiGenerated: false
    };
  }, [chart]);

  // 自动切换模式：如果 AI 数据生成了，自动切到 AI Tab
  useEffect(() => {
    if (aiData) {
      setMode('ai');
    }
  }, [aiData]);

  const getBgColor = (level: string) => {
    if (level.includes('大吉')) return 'bg-gradient-to-r from-rose-500 to-orange-500';
    if (level.includes('吉')) return 'bg-gradient-to-r from-orange-400 to-amber-400'; // 涵盖 中吉/小吉/吉
    if (level === '平') return 'bg-gradient-to-r from-blue-400 to-indigo-400';
    return 'bg-gradient-to-r from-stone-500 to-stone-700'; // 凶
  };

  const renderCard = (data: DailyFortuneData) => (
      <div className="animate-fade-in">
        {/* 顶部彩色卡片 */}
        <div className={`relative overflow-hidden rounded-t-2xl p-5 text-white shadow-sm transition-all duration-500 ${getBgColor(data.auspiciousness)}`}>
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles size={80} />
            </div>
            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-3xl font-black tracking-tight">{data.auspiciousness}</span>
                        <span className="text-xs font-medium opacity-90 border border-white/30 px-1.5 py-0.5 rounded">{data.ganZhi}</span>
                    </div>
                    <div className="text-[10px] opacity-80 flex items-center gap-1">
                        <Calendar size={10} />
                        {data.date}
                    </div>
                </div>
                {data.isAiGenerated && (
                   <div className="bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold border border-white/20 flex items-center gap-1">
                      <Wand2 size={10} /> AI 定制
                   </div>
                )}
            </div>
            <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-sm font-medium leading-relaxed opacity-95 text-justify whitespace-pre-line">
                    {data.summary}
                </p>
            </div>
        </div>

        {/* 底部白色详情 */}
        <div className="bg-white p-5 rounded-b-2xl border-x border-b border-stone-100 shadow-sm space-y-5">
            {/* 财运 */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-600">
                        <div className="p-1 bg-amber-50 rounded-md"><TrendingUp size={14} /></div>
                        <h4 className="text-xs font-bold text-stone-800">财运机遇</h4>
                    </div>
                    <div className="flex gap-0.5">
                        {Array.from({length:5}).map((_,i) => (
                            <div key={i} className={`w-6 h-1 rounded-full transition-all duration-700 ${i < Math.round(data.scores.wealth/20) ? 'bg-amber-400' : 'bg-stone-100'}`} />
                        ))}
                    </div>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed pl-8 relative text-justify">
                    <span className="absolute left-0 top-0 text-amber-200 text-xs">❝</span>
                    {data.advice.wealth}
                </p>
            </div>

            {/* 工作 */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-600">
                         <div className="p-1 bg-indigo-50 rounded-md"><Briefcase size={14} /></div>
                        <h4 className="text-xs font-bold text-stone-800">事业工作</h4>
                    </div>
                     <div className="flex gap-0.5">
                        {Array.from({length:5}).map((_,i) => (
                            <div key={i} className={`w-6 h-1 rounded-full transition-all duration-700 delay-100 ${i < Math.round(data.scores.career/20) ? 'bg-indigo-400' : 'bg-stone-100'}`} />
                        ))}
                    </div>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed pl-8 relative text-justify">
                     <span className="absolute left-0 top-0 text-indigo-200 text-xs">❝</span>
                     {data.advice.career}
                </p>
            </div>

             {/* 感情 */}
             <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-rose-600">
                         <div className="p-1 bg-rose-50 rounded-md"><Heart size={14} /></div>
                        <h4 className="text-xs font-bold text-stone-800">感情家庭</h4>
                    </div>
                     <div className="flex gap-0.5">
                        {Array.from({length:5}).map((_,i) => (
                            <div key={i} className={`w-6 h-1 rounded-full transition-all duration-700 delay-200 ${i < Math.round(data.scores.emotion/20) ? 'bg-rose-400' : 'bg-stone-100'}`} />
                        ))}
                    </div>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed pl-8 relative text-justify">
                     <span className="absolute left-0 top-0 text-rose-200 text-xs">❝</span>
                     {data.advice.emotion}
                </p>
            </div>

            {/* 生活 */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-600">
                         <div className="p-1 bg-emerald-50 rounded-md"><Smile size={14} /></div>
                        <h4 className="text-xs font-bold text-stone-800">身心健康</h4>
                    </div>
                     <div className="flex gap-0.5">
                        {Array.from({length:5}).map((_,i) => (
                            <div key={i} className={`w-6 h-1 rounded-full transition-all duration-700 delay-300 ${i < Math.round(data.scores.health/20) ? 'bg-emerald-400' : 'bg-stone-100'}`} />
                        ))}
                    </div>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed pl-8 relative text-justify">
                     <span className="absolute left-0 top-0 text-emerald-200 text-xs">❝</span>
                     {data.advice.life}
                </p>
            </div>
            
            {data.isAiGenerated && (
                <div className="pt-4 mt-2 border-t border-dashed border-stone-100 flex justify-center items-center">
                    <span className="text-[10px] text-stone-300">仅供参考，请相信事在人为</span>
                </div>
            )}
        </div>
      </div>
  );

  const renderContent = () => {
    // 1. 基础模式
    if (mode === 'basic') {
      if (!basicData) return (
        <div className="flex flex-col items-center justify-center py-12">
            <RefreshCcw size={20} className="text-stone-300 animate-spin" />
        </div>
      );
      return renderCard(basicData);
    }

    // 2. AI 模式
    if (mode === 'ai') {
      // 正在加载
      if (loading) {
         return (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 bg-white rounded-2xl border border-stone-100 h-[300px]">
                 <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20"></div>
                    <RefreshCcw size={32} className="text-indigo-500 animate-spin relative z-10" />
                 </div>
                 <p className="text-xs text-stone-500 font-medium animate-pulse">正在连接天机，推演流日...</p>
            </div>
         );
      }

      // 未生成且未加载
      if (!aiData) {
        return (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-4 bg-white rounded-2xl border border-stone-100 shadow-sm min-h-[300px]">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-full shadow-inner">
              <Sparkles size={32} className="text-indigo-500" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-stone-800">AI 每日运势 · 深度版</h3>
              <p className="text-[10px] text-stone-400 max-w-[200px] mx-auto leading-relaxed">
                "结合八字格局与今日流日，<br/>为您生成比基础版更精准的 1000字 深度解读"
              </p>
            </div>
            <button 
              onClick={onGenerate}
              className="group flex items-center gap-2 px-8 py-3 bg-stone-900 text-amber-50 rounded-2xl text-xs font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-all hover:bg-stone-800 hover:-translate-y-0.5"
            >
              <Wand2 size={14} className="group-hover:rotate-12 transition-transform"/>
              立即生成 (消耗 1 Key)
            </button>
            {!isVip && <p className="text-[9px] text-stone-300">VIP 用户可无限次免费生成</p>}
          </div>
        );
      }

      // 已有数据
      if (aiData) {
        return renderCard(aiData);
      }
    }
    
    return null;
  };

  return (
    <div className="w-full">
      {/* 切换 Tab */}
      <div className="flex p-1 bg-stone-100 rounded-xl mb-3 relative">
        <button 
          onClick={() => setMode('basic')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold rounded-lg transition-all z-10 ${mode === 'basic' ? 'bg-white text-stone-900 shadow-sm ring-1 ring-black/5' : 'text-stone-400 hover:text-stone-600'}`}
        >
          <Calendar size={14} />
          今日运势 · 基础版
        </button>
        <button 
          onClick={() => setMode('ai')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold rounded-lg transition-all z-10 ${mode === 'ai' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-stone-400 hover:text-stone-600'}`}
        >
            {isVip ? <Sparkles size={14} /> : <Lock size={12} />}
            深度解读 · AI 版
        </button>
      </div>

      {/* 内容区域 */}
      <div className="min-h-[200px]">
        {renderContent()}
      </div>
    </div>
  );
};