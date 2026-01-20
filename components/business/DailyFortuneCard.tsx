import React, { useState } from 'react';
import { Calendar, RefreshCcw, Sparkles, TrendingUp, Heart, Briefcase, Smile, Lock, Wand2 } from 'lucide-react';

export interface DailyFortuneData {
  date: string; // YYYY-MM-DD
  ganZhi: string; // e.g., 甲辰年 丙寅月 戊午日
  auspiciousness: '大吉' | '中吉' | '小吉' | '平' | '凶';
  summary: string;
  scores: {
    wealth: number; // 0-100
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
  data: DailyFortuneData | null;
  loading: boolean;
  onGenerate: () => void;
  isVip: boolean;
}

export const DailyFortuneCard: React.FC<DailyFortuneCardProps> = ({ data, loading, onGenerate, isVip }) => {
  const [mode, setMode] = useState<'basic' | 'ai'>('basic');

  const getBgColor = (level: string) => {
    switch (level) {
      case '大吉': return 'bg-gradient-to-r from-rose-500 to-orange-500';
      case '中吉': return 'bg-gradient-to-r from-orange-400 to-amber-400';
      case '小吉': return 'bg-gradient-to-r from-emerald-400 to-teal-400';
      case '平': return 'bg-gradient-to-r from-blue-400 to-indigo-400';
      case '凶': return 'bg-gradient-to-r from-stone-500 to-stone-700';
      default: return 'bg-stone-800';
    }
  };

  const renderContent = () => {
    if (mode === 'ai' && !data?.isAiGenerated && !loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <div className="bg-indigo-50 p-4 rounded-full">
            <Sparkles size={32} className="text-indigo-500" />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-stone-800">AI 每日运势</h3>
            <p className="text-xs text-stone-500 max-w-[200px] mx-auto">
              结合您的八字命盘与今日流日，<br/>为您生成专属的精准运势解读。
            </p>
          </div>
          <button 
            onClick={onGenerate}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 text-amber-50 rounded-full text-xs font-bold shadow-lg active:scale-95 transition-transform"
          >
            {loading ? <RefreshCcw size={14} className="animate-spin"/> : <Wand2 size={14}/>}
            {loading ? 'AI 推演中...' : '立即生成'}
          </button>
        </div>
      );
    }
    
    if (loading) {
         return (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                 <RefreshCcw size={24} className="text-indigo-500 animate-spin" />
                 <p className="text-xs text-stone-400 font-medium">正在连接天机...</p>
            </div>
         )
    }

    if (!data) return null;

    // 如果是基础版，或者是AI版且已有数据
    return (
      <div className="animate-fade-in">
        {/* 顶部彩色卡片 */}
        <div className={`relative overflow-hidden rounded-t-2xl p-5 text-white shadow-sm ${getBgColor(data.auspiciousness)}`}>
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
                {/* 评分环 */}
                <div className="flex gap-2">
                    {/* 这里可以放一些小图标或者装饰 */}
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-sm font-medium leading-relaxed opacity-95 text-justify">
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
                            <div key={i} className={`w-6 h-1 rounded-full ${i < Math.round(data.scores.wealth/20) ? 'bg-amber-400' : 'bg-stone-100'}`} />
                        ))}
                    </div>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed pl-7 border-l-2 border-stone-100 whitespace-pre-wrap">
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
                            <div key={i} className={`w-6 h-1 rounded-full ${i < Math.round(data.scores.career/20) ? 'bg-indigo-400' : 'bg-stone-100'}`} />
                        ))}
                    </div>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed pl-7 border-l-2 border-stone-100 whitespace-pre-wrap">
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
                            <div key={i} className={`w-6 h-1 rounded-full ${i < Math.round(data.scores.emotion/20) ? 'bg-rose-400' : 'bg-stone-100'}`} />
                        ))}
                    </div>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed pl-7 border-l-2 border-stone-100 whitespace-pre-wrap">
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
                            <div key={i} className={`w-6 h-1 rounded-full ${i < Math.round(data.scores.health/20) ? 'bg-emerald-400' : 'bg-stone-100'}`} />
                        ))}
                    </div>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed pl-7 border-l-2 border-stone-100 whitespace-pre-wrap">
                     {data.advice.life}
                </p>
            </div>
            
            {mode === 'ai' && (
                <div className="pt-2 flex justify-end">
                    <span className="text-[10px] text-stone-400 flex items-center gap-1 bg-stone-50 px-2 py-1 rounded">
                        <Sparkles size={10} /> AI 生成于 {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                </div>
            )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* 切换 Tab */}
      <div className="flex p-1 bg-stone-100 rounded-xl mb-3 relative">
        <button 
          onClick={() => setMode('basic')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold rounded-lg transition-all z-10 ${mode === 'basic' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'}`}
        >
          <Calendar size={14} />
          今日运势-基础命理
        </button>
        <button 
          onClick={() => setMode('ai')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold rounded-lg transition-all z-10 ${mode === 'ai' ? 'bg-white text-indigo-600 shadow-sm' : 'text-stone-400'}`}
        >
            {isVip ? <Sparkles size={14} /> : <Lock size={12} />}
            今日运势-AI强化版
        </button>
      </div>

      {/* 内容区域 */}
      <div className="min-h-[200px]">
        {mode === 'basic' ? (
           <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 bg-white rounded-2xl border border-stone-200 border-dashed">
                <Calendar size={32} className="text-stone-300" />
                <p className="text-xs text-stone-400">基础日运模块开发中...</p>
           </div>
        ) : (
           renderContent()
        )}
      </div>
    </div>
  );
};
