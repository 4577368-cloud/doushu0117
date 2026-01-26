import React, { useState, useMemo, useEffect } from 'react';
import { calculateChart } from '../ziwei/services/astrologyService';
import { generateRuleBasedAnalysis } from '../ziwei/services/interpretationService';
import { callDeepSeekAPI } from '../ziwei/services/aiService';
import { UserProfile } from '../types';
import { BrainCircuit, Activity, Sparkles, ClipboardCopy, Crown, HelpCircle, X } from 'lucide-react';
import { ZiweiChartView } from './ZiweiChartView'; 
import { SmartTextRenderer } from './ui/BaziUI';
import { ZIWEI_KNOWLEDGE } from '../services/knowledgeContent';

interface ZiweiViewProps {
  profile: UserProfile;
  onSaveReport: (report: string) => void;
  isVip: boolean;
}

const PALACE_NAMES = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'];

const ZiweiView: React.FC<ZiweiViewProps> = ({ profile, onSaveReport, isVip }) => {
  const [timeMode, setTimeMode] = useState<'natal' | 'year' | 'month' | 'day'>('natal');
  const [showKnowledge, setShowKnowledge] = useState(false);
  const now = new Date();
  
  // 时间状态
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number>(now.getDate());
  const [selectedHour, setSelectedHour] = useState<number>(now.getHours());

  // 辅助函数：解析出生日期
  const parseBirthDetails = () => {
    try {
      const birthStr = profile.birthDate || '';
      let birth: number[] = [];
      if (birthStr.includes('-')) {
        birth = birthStr.split('-').map(n => parseInt(n, 10));
      } else if (birthStr.length === 8) {
        birth = [
          parseInt(birthStr.slice(0,4), 10),
          parseInt(birthStr.slice(4,6), 10),
          parseInt(birthStr.slice(6,8), 10)
        ];
      }
      
      const timeStr = profile.birthTime || '';
      let bTime: number[] = [];
      if (timeStr.includes(':')) {
        bTime = timeStr.split(':').map(n => parseInt(n, 10));
      } else if (timeStr.length >= 1) {
        bTime = [parseInt(timeStr.slice(0,2), 10) || 0, 0];
      }

      const gender = profile.gender === 'male' ? 'male' : 'female';
      const lng = profile.longitude || 120;
      
      return { y: birth[0], m: birth[1], d: birth[2], h: bTime[0], gender, lng };
    } catch (e) {
      return null;
    }
  };

  // 1. 计算本命盘 (Base Chart)
  const baseChart = useMemo(() => {
    const details = parseBirthDetails();
    if (!details) return null;
    return calculateChart(details.y, details.m, details.d, details.h, details.gender, details.lng);
  }, [profile]);

  // 2. 计算显示盘 (Display Chart - 包含流运逻辑修复)
  const displayChart = useMemo(() => {
    const details = parseBirthDetails();
    if (!details) return null;

    // 获取本命盘
    const natal = calculateChart(details.y, details.m, details.d, details.h, details.gender, details.lng) || baseChart;
    if (!natal) return null;

    // 如果是本命模式，直接返回
    if (timeMode === 'natal') return natal;

    // 确定流运时间参数
    const y = selectedYear;
    // 只有在流月或流日模式下，月份才变动，否则保持本命月
    const m = (timeMode === 'month' || timeMode === 'day') ? selectedMonth : details.m;
    // 只有在流日模式下，日时才变动
    const d = (timeMode === 'day') ? selectedDay : details.d;
    const h = (timeMode === 'day') ? selectedHour : details.h;

    // 计算流运盘
    const flow = calculateChart(y, m, d, h, details.gender, details.lng);
    if (!flow) return natal;

    // --- 开始合并逻辑 (修复的核心) ---
    const merged = { ...natal };
    
    // 更新四化和天干为流运状态
    merged.siHuaDisplay = flow.siHuaDisplay;
    merged.yearGan = flow.yearGan;
    // 注意：通常不覆盖 patterns 和 baZi，因为依然是看本命的格局

    // 建立流运盘的地支映射 Map
    // 目的：不管流盘怎么旋转，我们要找到对应“寅”、“卯”等物理位置的星星
    const flowPalaceMap = new Map();
    flow.palaces.forEach((p: any) => {
      // 兼容不同的字段名：dizhi, earthlyBranch, 或直接按顺序 index (0=子)
      // 请确保 calculateChart 返回的 palace 对象里有 dizhi (0-11)
      const branch = p.dizhi !== undefined ? p.dizhi : (p.earthlyBranch !== undefined ? p.earthlyBranch : p.index);
      if (branch !== undefined) {
        flowPalaceMap.set(branch, p);
      }
    });

    // 遍历本命盘的每一个宫位，把流盘对应位置的星星加进去
    const newPalaces = merged.palaces.map((natalPalace: any) => {
      const currentBranch = natalPalace.dizhi !== undefined ? natalPalace.dizhi : (natalPalace.earthlyBranch !== undefined ? natalPalace.earthlyBranch : natalPalace.index);
      
      // 在流盘中找到同一个地支位置的宫位
      // 如果 map 为空（数据结构不支持），回退到 index (这也是之前的 bug 来源，但作为最后的 fallback)
      const flowPalace = flowPalaceMap.size > 0 ? flowPalaceMap.get(currentBranch) : flow.palaces[merged.palaces.indexOf(natalPalace)];
      
      const overlayMinor = flowPalace?.stars?.minor || [];
      const flowStarsMap: Record<string, any> = {};
      [...(flowPalace?.stars?.major||[]), ...(flowPalace?.stars?.minor||[])]
        .forEach((s:any)=>{ flowStarsMap[s.name] = s; });

      const baseNames = new Set([
        ...natalPalace.stars.major.map((s: any) => s.name),
        ...natalPalace.stars.minor.map((s: any) => s.name)
      ]);

      const starsToAdd = overlayMinor
        .filter((s: any) => !baseNames.has(s.name))
        .map((s:any)=>({ ...s, isFlow: true }));

      const updatedMajor = natalPalace.stars.major
        .map((s:any)=> ({ ...s, hua: flowStarsMap[s.name]?.hua || s.hua }));
      const updatedMinor = natalPalace.stars.minor
        .map((s:any)=> ({ ...s, hua: flowStarsMap[s.name]?.hua || s.hua }));

      return {
        ...natalPalace,
        stars: {
          major: updatedMajor,
          minor: [...updatedMinor, ...starsToAdd]
        }
      };
    });

    merged.palaces = newPalaces;

    return merged;
  }, [profile, timeMode, selectedYear, selectedMonth, selectedDay, selectedHour, baseChart]);

  const [persistedChart, setPersistedChart] = useState<any | null>(null);
  useEffect(() => { if (displayChart) setPersistedChart(displayChart); }, [displayChart]);
  
  const [activePalaceName, setActivePalaceName] = useState('命宫');
  const [deepSeekContent, setDeepSeekContent] = useState<string>('');
  const [isDeepSeekLoading, setIsDeepSeekLoading] = useState(false);
  const [apiKey] = useState(() => sessionStorage.getItem('ai_api_key') || ''); 
  const [analysisTab, setAnalysisTab] = useState<'rule' | 'ai'>('rule');

  const chartData = displayChart || persistedChart || baseChart;

  const handleAiAnalyze = async () => {
    if (!apiKey && !isVip) { 
        alert("请先在首页设置 API Key，或升级 VIP 解锁免 Key 特权"); 
        return; 
    }

    setIsDeepSeekLoading(true);
    setAnalysisTab('ai');
    
    try {
        const birthYear = parseInt(profile.birthDate.split('-')[0]);
        const age = new Date().getFullYear() - birthYear + 1;
        
        const text = await callDeepSeekAPI(apiKey, chartData, age, profile.gender === 'male' ? 'male' : 'female', new Date().getFullYear());
        setDeepSeekContent(text);
        onSaveReport(text);
    } catch (e: any) { 
        console.error(e);
        setDeepSeekContent(`分析失败: ${e.message || "请检查网络"}`); 
    } finally { 
        setIsDeepSeekLoading(false); 
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#f5f5f4] overflow-y-auto">
      {/* 顶部控制栏 */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-stone-200">
        <div className="px-3 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="flex shrink-0 gap-2">
            <button onClick={()=>setTimeMode('natal')} className={`px-3 py-1.5 text-[11px] rounded-lg font-bold border ${timeMode==='natal'?'bg-indigo-600 text-white border-indigo-600':'bg-white text-stone-500 border-stone-200'}`}>命盘</button>
            <button onClick={()=>setTimeMode('year')} className={`px-3 py-1.5 text-[11px] rounded-lg font-bold border ${timeMode==='year'?'bg-indigo-600 text-white border-indigo-600':'bg-white text-stone-500 border-stone-200'}`}>流年</button>
            <button onClick={()=>setTimeMode('month')} className={`px-3 py-1.5 text-[11px] rounded-lg font-bold border ${timeMode==='month'?'bg-indigo-600 text-white border-indigo-600':'bg-white text-stone-500 border-stone-200'}`}>流月</button>
            <button onClick={()=>{
                setTimeMode('day'); 
                const d=new Date(); 
                setSelectedYear(d.getFullYear()); 
                setSelectedMonth(d.getMonth()+1); 
                setSelectedDay(d.getDate()); 
                setSelectedHour(d.getHours());
            }} className={`px-3 py-1.5 text-[11px] rounded-lg font-bold border ${timeMode==='day'?'bg-indigo-600 text-white border-indigo-600':'bg-white text-stone-500 border-stone-200'}`}>流日</button>
            <button 
                onClick={() => setShowKnowledge(true)}
                className="p-1.5 hover:bg-stone-200 rounded-full transition-colors text-stone-400 hover:text-indigo-600"
            >
                <HelpCircle size={16} />
            </button>
          </div>

          <div className="ml-auto flex items-center gap-1.5 text-[11px] font-bold text-stone-600 shrink-0">
            {timeMode==='natal' && <span>出生日时：{profile.birthDate} {profile.birthTime}</span>}
            {timeMode!=='natal' && (
              <>
                <div className="flex items-center gap-1">
                  <button onClick={()=>setSelectedYear(y=>y-1)} className="px-2 py-1 rounded border border-stone-200 bg-white text-stone-600 hover:bg-stone-50">-</button>
                  <span>{selectedYear}年</span>
                  <button onClick={()=>setSelectedYear(y=>y+1)} className="px-2 py-1 rounded border border-stone-200 bg-white text-stone-600 hover:bg-stone-50">+</button>
                </div>
                {timeMode!=='year' && (
                  <div className="flex items-center gap-1">
                    <button onClick={()=>setSelectedMonth(m=>m>1?m-1:12)} className="px-2 py-1 rounded border border-stone-200 bg-white text-stone-600 hover:bg-stone-50">-</button>
                    <span>{selectedMonth}月</span>
                    <button onClick={()=>setSelectedMonth(m=>m<12?m+1:1)} className="px-2 py-1 rounded border border-stone-200 bg-white text-stone-600 hover:bg-stone-50">+</button>
                  </div>
                )}
                {timeMode==='day' && (
                  <div className="flex items-center gap-1">
                    <button onClick={()=>setSelectedDay(d=>d>1?d-1:d)} className="px-2 py-1 rounded border border-stone-200 bg-white text-stone-600 hover:bg-stone-50">-</button>
                    <span>{selectedDay}日</span>
                    <button onClick={()=>setSelectedDay(d=>d+1)} className="px-2 py-1 rounded border border-stone-200 bg-white text-stone-600 hover:bg-stone-50">+</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 星盘显示区 */}
      <ZiweiChartView 
        chartData={chartData}
        profile={profile}
        activePalaceName={activePalaceName}
        onPalaceClick={setActivePalaceName}
        onStarClick={() => {}}
      />

      {/* 分析面板 */}
      <div className="flex-1 p-4 pb-24">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="flex border-b border-stone-100 divide-x divide-stone-100">
                  <button onClick={()=>setAnalysisTab('rule')} className={`flex-1 py-3.5 text-xs font-bold transition-colors ${analysisTab==='rule'?'bg-indigo-600 text-white':'text-stone-400 bg-stone-50/50'}`}>宫位详推</button>
                  <button onClick={()=>setAnalysisTab('ai')} className={`flex-1 py-3.5 text-xs font-bold transition-colors flex items-center justify-center gap-1 ${analysisTab==='ai'?'bg-indigo-600 text-white':'text-stone-400 bg-stone-50/50'}`}>
                      {isVip && <Crown size={12} className="text-amber-400" />} AI 财富策略
                  </button>
              </div>
              
              <div className="p-5">
                  {analysisTab === 'rule' ? (
                      <div className="space-y-4">
                          <div className="flex flex-wrap gap-2 justify-center mb-6">
                              {PALACE_NAMES.map(n => (
                                  <button key={n} onClick={()=>setActivePalaceName(n)} className={`px-2.5 py-1.5 text-[10px] rounded-lg border transition-all ${activePalaceName===n?'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-110':'bg-white text-stone-500 border-stone-200 hover:border-indigo-300'}`}>{n}</button>
                              ))}
                          </div>
                          <div className="prose prose-stone prose-sm max-w-none font-serif leading-relaxed text-stone-700 text-xs" 
                               dangerouslySetInnerHTML={{ __html: chartData ? generateRuleBasedAnalysis(
                                 chartData,
                                 activePalaceName,
                                 timeMode==='natal'?new Date().getFullYear():selectedYear,
                                 (timeMode==='natal'?new Date().getFullYear():selectedYear) - parseInt(profile.birthDate.split('-')[0]) + 1
                               ) : '' }} />
                      </div>
                  ) : (
                      <div className="space-y-4">
                          {!deepSeekContent && !isDeepSeekLoading ? (
                              <div className="text-center py-16">
                                  <Sparkles className="mx-auto text-amber-400 mb-4 animate-pulse" size={42}/>
                                  <h3 className="font-bold text-stone-800 text-base mb-2">天机 AI 深度解盘</h3>
                                  <p className="text-xs text-stone-400 mb-8 max-w-[200px] mx-auto leading-relaxed">基于钦天四化与三合流派结合现代金融模型精准分析</p>
                                  <button onClick={handleAiAnalyze} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-xl text-xs active:transform active:scale-95 transition-all flex items-center gap-2 mx-auto">
                                      {isVip ? <Crown size={14} className="text-amber-300"/> : null}
                                      立即开启推演
                                  </button>
                              </div>
                          ) : isDeepSeekLoading ? (
                              <div className="text-center py-20 animate-pulse">
                                  <Activity className="mx-auto animate-spin text-indigo-600 mb-4" size={28} />
                                  <p className="font-serif text-stone-500 tracking-widest text-xs">正在通过星曜矩阵建立财富模型...</p>
                              </div>
                          ) : (
                              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                  <div className="flex justify-end mb-3">
                                    <button onClick={()=>{navigator.clipboard.writeText(deepSeekContent);alert('已复制');}} className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100"><ClipboardCopy size={12}/>一键复制报告</button>
                                  </div>
                                  <div className="text-xs leading-relaxed text-stone-700 bg-stone-50 p-5 rounded-2xl border border-stone-100 whitespace-pre-wrap font-serif shadow-inner">
                                      <SmartTextRenderer content={deepSeekContent} />
                                  </div>
                              </div>
                          )}
                      </div>
                  )}
              </div>
          </div>
      </div>
      {/* 知识总纲弹窗 */}
      {showKnowledge && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowKnowledge(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-white border-b border-stone-100 p-4 flex items-center justify-between z-10">
                    <h3 className="font-bold text-stone-800 flex items-center gap-2">
                        <HelpCircle size={18} className="text-indigo-600" />
                        {ZIWEI_KNOWLEDGE.title}
                    </h3>
                    <button onClick={() => setShowKnowledge(false)} className="p-1 hover:bg-stone-100 rounded-full text-stone-400">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-5 space-y-6">
                    {ZIWEI_KNOWLEDGE.sections.map((section, idx) => (
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

export default ZiweiView;
