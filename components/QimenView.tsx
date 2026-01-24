import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, QM_Ju, QM_Palace } from '../types';
import { initializeQM_Ju, getYearGan } from '../services/qimenService';
import { QM_STACK_ORDER, QM_NAMES_MAP, QM_ELEMENT_TEXT_MAP, QM_STATE_MAP } from '../services/qimenConstants';
import { QM_AFFAIR_SYMBOLS, QM_AFFAIR_CATEGORIES, QM_SymbolKey, QM_AffairCategory, QM_INDUSTRIES, QM_IndustryKey, QM_INDUSTRY_DEFAULTS } from '../services/qimenAffairs';
import { analyzePalacePatterns } from '../services/qimenPatterns';
import { analyzeQimenState, QM_AnalysisResult } from '../services/qimenAnalysis';
import { generateUserAdvice } from '../services/qimenAdvice';
import { parseSmartCommand } from '../services/smartCommand';
import { AuspiciousView } from './qimen/AuspiciousView';
import { QimenPalaceItem } from './qimen/QimenPalaceItem';
import { QimenSpatialLayers } from './qimen/QimenSpatialLayers';
import { QimenCompass } from './qimen/QimenCompass';
import { QimenCalendar } from './qimen/QimenCalendar';
import {
  Zap,
  Compass,
  Mountain,
  BrainCircuit,
  ChevronRight,
  ChevronLeft,
  Search,
  Info,
  Briefcase,
  Sparkles,
  Activity,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

interface QimenViewProps {
  profile: UserProfile;
  onSaveReport?: (content: string) => Promise<void>;
  isVip?: boolean;
}

const QimenView: React.FC<QimenViewProps> = ({ profile, onSaveReport, isVip }) => {
  const [activeTab, setActiveTab] = useState<'paipan' | 'zeji' | 'calendar'>('paipan');
  const [view, setView] = useState<'平面' | '立体' | '罗盘'>('平面');
  const [timestamp, setTimestamp] = useState(Date.now());
  const ju = useMemo(() => initializeQM_Ju(profile, timestamp), [timestamp, profile]);
  
  // Divination State
  const [divinationState, setDivinationState] = useState<{
    isActive: boolean;
    category: QM_AffairCategory | null;
    affairKey: string | null;
    industry: QM_IndustryKey | '通用';
  }>({ isActive: false, category: null, affairKey: null, industry: '通用' });

  // Selected Palace for detail view (bottom panel)
  const [selectedPalaceIndex, setSelectedPalaceIndex] = useState<number | null>(null);

  // Smart Command State
  const [commandInput, setCommandInput] = useState('');
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);

  const handleSmartCommand = () => {
    if (!commandInput.trim()) return;
    
    const result = parseSmartCommand(commandInput);
    const feedbackParts: string[] = [];

    if (result.timestamp) {
      setTimestamp(result.timestamp);
      // feedbackParts.push(`时间已调整`); // Included in explanation
    }

    if (result.affairKey) {
      setDivinationState(prev => ({
        ...prev,
        isActive: true,
        category: result.category || null,
        affairKey: result.affairKey || null,
        industry: result.industry || prev.industry // Keep existing industry if not detected
      }));
    } else if (result.industry) {
       // Only industry detected
       setDivinationState(prev => ({
         ...prev,
         industry: result.industry!
       }));
    }

    if (result.explanation.length > 0) {
      setCommandFeedback(result.explanation.join(' · '));
      // Clear feedback after 5s
      setTimeout(() => setCommandFeedback(null), 5000);
    } else {
      setCommandFeedback('未识别到有效指令，请尝试包含"下周"、"合同"等关键词');
      setTimeout(() => setCommandFeedback(null), 3000);
    }
  };
  
  // Note: userYearGan is derived from profile birth date
  const userBirthYear = new Date(profile.birthDate).getFullYear();
  const userYearGan = getYearGan(userBirthYear);

  // Reset selected palace when affair changes
  useEffect(() => {
    setSelectedPalaceIndex(null);
  }, [divinationState.affairKey]);

  // Helper: Resolve dynamic symbols
  const resolveSymbol = (symbol: QM_SymbolKey, currentJu: QM_Ju): string => {
    if (symbol === 'RiGan') return currentJu.pillars[2].gan;
    if (symbol === 'ShiGan') return currentJu.pillars[3].gan;
    if (symbol === 'JingMen2') return 'JingMen_Jing';
    if (symbol === 'JingMen') return 'JingMen_Li';
    return symbol;
  };

  // Helper: Check if palace contains symbol
  const isSymbolInPalace = (palace: QM_Palace, symbol: QM_SymbolKey, currentJu: QM_Ju): boolean => {
    const resolved = resolveSymbol(symbol, currentJu);
    // Exact match checks
    if (palace.heavenStem === resolved || palace.earthStem === resolved) return true;
    if (palace.door.name === resolved) return true;
    if (palace.star.name === resolved) return true;
    if (palace.deity.name === resolved) return true;
    
    // Check if resolved symbol is mapped name (e.g. 'Yi' -> '乙')
    // Our palace data stores keys (e.g. 'Yi'), so direct comparison works if resolved is key.
    // But resolveSymbol returns key for RiGan/ShiGan (e.g. 'Yi').
    // So it should be fine.
    
    return false;
  };

  // Memoized active affair config
  const activeAffairConfig = useMemo(() => {
    if (!divinationState.affairKey || !divinationState.category) return null;
    
    const baseConfig = QM_AFFAIR_SYMBOLS[divinationState.category]?.[divinationState.affairKey];
    if (!baseConfig) return null;

    const industry = divinationState.industry;
    
    if (industry !== '通用' && baseConfig.industryAdaptation?.[industry as QM_IndustryKey]) {
      const override = baseConfig.industryAdaptation[industry as QM_IndustryKey]!;
      return {
        ...baseConfig,
        primary: override.primary || baseConfig.primary,
        secondary: override.secondary || baseConfig.secondary,
        note: override.emphasis || baseConfig.note, // Use emphasis as note for display
        originalNote: baseConfig.note
      };
    }
    return baseConfig;
  }, [divinationState.affairKey, divinationState.industry]);

  // Get primary palaces for highlighting
  const primaryPalaceIndices = useMemo(() => {
    if (!ju) return [];

    let symbols: QM_SymbolKey[] = [];
    if (activeAffairConfig) {
      symbols = activeAffairConfig.primary;
    } else if (divinationState.industry !== '通用') {
      symbols = QM_INDUSTRY_DEFAULTS[divinationState.industry] || [];
    }

    if (symbols.length === 0) return [];

    const indices: number[] = [];
    symbols.forEach(sym => {
      ju.palaces.forEach(p => {
        if (isSymbolInPalace(p, sym, ju)) {
          indices.push(p.index);
        }
      });
    });
    return [...new Set(indices)];
  }, [activeAffairConfig, ju, divinationState.industry]);

  // Helper: Element Relation
  const getElementRelation = (e1: string, e2: string) => {
    const genMap: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
    const overMap: Record<string, string> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };
    
    if (e1 === e2) {
      if (e1 === '金') return '比和-金金';
      if (e1 === '火') return '比和-火火';
      if (e1 === '木') return '比和-木木';
      if (e1 === '水') return '比和-水水';
      if (e1 === '土') return '比和-土土';
      return '比和';
    }
    if (genMap[e1] === e2) return '生'; // e1 generates e2
    if (genMap[e2] === e1) return '被生'; // e2 generates e1
    if (overMap[e1] === e2) return '克'; // e1 overcomes e2
    if (overMap[e2] === e1) return '被克'; // e2 overcomes e1
    return '未知';
  };

  if (!ju) return null;

  const renderDivinationPanel = () => {
    // 1. Category Selection
    if (!divinationState.category) {
      return (
        <div className="space-y-4">
           <div className="flex items-center gap-2 mb-4">
             <button onClick={() => setDivinationState({ isActive: false, category: null, affairKey: null, industry: '通用' })} className="p-1 hover:bg-gray-100 rounded-full">
               <ChevronLeft size={20} className="text-gray-500" />
             </button>
             <h3 className="text-sm font-black text-gray-900">选择问事类别</h3>
           </div>
           <div className="grid grid-cols-3 gap-2">
             {Object.entries(QM_AFFAIR_CATEGORIES).map(([key, label]) => (
               <button
                 key={key}
                 onClick={() => setDivinationState(prev => ({ ...prev, category: key as QM_AffairCategory }))}
                 className="p-3 rounded-xl bg-gray-50 hover:bg-amber-50 border border-gray-100 hover:border-amber-200 transition-all text-center group"
               >
                 <span className="text-xs font-bold text-gray-600 group-hover:text-amber-700">{label}</span>
               </button>
             ))}
           </div>
        </div>
      );
    }

    // 2. Affair Selection
    if (!divinationState.affairKey) {
      const affairs = divinationState.category ? Object.entries(QM_AFFAIR_SYMBOLS[divinationState.category] || {}) : [];
      return (
        <div className="space-y-4">
           <div className="flex items-center gap-2 mb-4">
             <button onClick={() => setDivinationState(prev => ({ ...prev, category: null }))} className="p-1 hover:bg-gray-100 rounded-full">
               <ChevronLeft size={20} className="text-gray-500" />
             </button>
             <h3 className="text-sm font-black text-gray-900">{QM_AFFAIR_CATEGORIES[divinationState.category]}</h3>
           </div>
           <div className="grid grid-cols-2 gap-3">
             {affairs.map(([key, config]) => (
               <button
                 key={key}
                 onClick={() => setDivinationState(prev => ({ ...prev, affairKey: key }))}
                 className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all text-left group"
               >
                 <div className="flex justify-between items-start mb-1">
                   <h4 className="text-sm font-black text-gray-800 group-hover:text-amber-700">{config.label}</h4>
                 </div>
                 <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">{config.note}</p>
               </button>
             ))}
           </div>
        </div>
      );
    }

    // 3. Analysis Result
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
         <div className="flex flex-col gap-3 mb-2">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
               <button onClick={() => setDivinationState(prev => ({ ...prev, affairKey: null }))} className="p-1 hover:bg-gray-100 rounded-full">
                 <ChevronLeft size={20} className="text-gray-500" />
               </button>
               <div>
                 <h3 className="text-sm font-black text-gray-900">{activeAffairConfig?.label}</h3>
                 <p className="text-[10px] text-gray-400">点击宫位查看详情</p>
               </div>
             </div>
             <span className="px-2 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-lg border border-amber-100">
               {QM_AFFAIR_CATEGORIES[divinationState.category]}
             </span>
           </div>

           {/* Industry Selector */}
           <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {Object.entries(QM_INDUSTRIES).map(([key, label]) => {
                const isActive = divinationState.industry === key;
                return (
                  <button
                    key={key}
                    onClick={() => setDivinationState(prev => ({ ...prev, industry: key as QM_IndustryKey }))}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                      isActive 
                        ? 'bg-stone-800 text-amber-400 border-stone-700' 
                        : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    {key}
                  </button>
                );
              })}
           </div>
         </div>

         {/* Use Gods/Symbols Info - Merged with Palace Selection */}
          <div className="bg-stone-900 rounded-xl p-4 text-stone-300">
             <div className="flex items-start gap-3 mb-3 pb-3 border-b border-stone-800">
                <Search size={16} className="text-amber-500 mt-0.5" />
                <div className="flex-1">
                   <p className="text-xs font-bold text-stone-400 mb-2 flex justify-between items-center">
                     <span>关键用神 & 落宫</span>
                     <span className="text-[9px] text-stone-600 font-normal">点击下方标签查看详情</span>
                   </p>
                   <div className="flex flex-wrap gap-2">
                     {activeAffairConfig?.primary.map(sym => {
                       const resolved = resolveSymbol(sym, ju!);
                       const label = sym === 'RiGan' ? '日干' : (sym === 'ShiGan' ? '时干' : (QM_NAMES_MAP[sym] || sym));
                       const resolvedLabel = QM_NAMES_MAP[resolved] || resolved;
                       
                       // Find the palace for this symbol
                       const palace = ju!.palaces.find(p => isSymbolInPalace(p, sym, ju!));
                       
                       return (
                          <button 
                            key={sym} 
                            onClick={() => palace && setSelectedPalaceIndex(palace.index)}
                            className={`
                              px-2.5 py-1.5 rounded-lg text-[11px] font-serif-zh border transition-all flex items-center gap-2
                              ${palace && selectedPalaceIndex === palace.index
                                ? 'bg-amber-500 text-stone-900 border-amber-500 shadow-md scale-105'
                                : 'bg-stone-800 text-amber-200 border-stone-700 hover:border-amber-500/50 hover:bg-stone-700'
                              }
                            `}
                          >
                            <span>{(sym === resolved || label === resolvedLabel) ? label : `${label} [${resolvedLabel}]`}</span>
                            {palace && (
                             <span className={`px-1 rounded text-[9px] font-black ${
                               selectedPalaceIndex === palace.index ? 'bg-stone-900/20 text-stone-900' : 'bg-stone-900 text-stone-500'
                             }`}>
                               {palace.name}
                             </span>
                           )}
                         </button>
                       );
                     })}
                   </div>
                </div>
             </div>
             <p className="text-[11px] leading-relaxed opacity-80">{activeAffairConfig?.note}</p>
          </div>

         {/* Selected Palace Detail or Prompt */}
         {selectedPalaceIndex ? (
            (() => {
              const p = ju!.palaces.find(x => x.index === selectedPalaceIndex)!;
              const isPrimary = primaryPalaceIndices.includes(p.index);
              
              return (
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                   <div className="flex justify-between items-center mb-3">
                      <h4 className="font-serif-zh font-black text-lg text-gray-900 flex items-center gap-2">
                        {p.name}宫 
                        {isPrimary && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] rounded font-sans">用神落宫</span>}
                      </h4>
                      <button onClick={() => setSelectedPalaceIndex(null)} className="text-gray-300 hover:text-gray-500 text-xs">关闭</button>
                   </div>
                   
                   <div className="grid grid-cols-3 gap-2 text-center mb-3">
                      <div className="bg-gray-50 rounded-lg p-2">
                         <span className="text-[9px] text-gray-400 block mb-1">八神</span>
                         <span className={`font-serif-zh font-bold ${QM_ELEMENT_TEXT_MAP[p.deity.element]}`}>{QM_NAMES_MAP[p.deity.name]}</span>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                         <span className="text-[9px] text-gray-400 block mb-1">九星 ({p.star.element})</span>
                         <span className={`font-serif-zh font-bold ${QM_ELEMENT_TEXT_MAP[p.star.element]}`}>{QM_NAMES_MAP[p.star.name]}</span>
                         {(() => {
                            const analysis = analyzeQimenState(
                              ju!, 
                              p, 
                              p.star.name as any, 
                              divinationState.industry === '通用' ? undefined : divinationState.industry
                            );
                            const wuxingState = analysis.state.wuxing;
                            return (
                              <span className={`text-[9px] ml-1 ${['Wang', 'Xiang'].includes(wuxingState) ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                                ({QM_STATE_MAP[wuxingState]?.label || wuxingState})
                              </span>
                            );
                         })()}
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                         <span className="text-[9px] text-gray-400 block mb-1">八门 ({p.door.element})</span>
                         <span className={`font-serif-zh font-bold ${p.door.auspiciousness === '吉' ? 'text-green-600' : 'text-red-600'}`}>{QM_NAMES_MAP[p.door.name]}</span>
                         {(() => {
                            const analysis = analyzeQimenState(
                              ju!, 
                              p, 
                              p.door.name as any, 
                              divinationState.industry === '通用' ? undefined : divinationState.industry
                            );
                            const wuxingState = analysis.state.wuxing;
                            return (
                              <span className={`text-[9px] ml-1 ${['Wang', 'Xiang'].includes(wuxingState) ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                                ({QM_STATE_MAP[wuxingState]?.label || wuxingState})
                              </span>
                            );
                         })()}
                      </div>
                   </div>

                   <div className="space-y-3">
                      {/* 0. AI Decision Advice (New) */}
                      {(() => {
                         const adviceSymbol = (activeAffairConfig?.primary?.[0] as any) || p.door.name as any;
                         const adviceAnalysis = analyzeQimenState(
                           ju!, 
                           p, 
                           adviceSymbol, 
                           divinationState.industry === '通用' ? undefined : divinationState.industry
                         );
                         const advice = generateUserAdvice(adviceAnalysis, ju!, p, adviceSymbol);
                         
                         return (
                           <div className={`rounded-xl p-4 border shadow-sm ${
                             advice.tone === 'positive' ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-100' :
                             advice.tone === 'negative' ? 'bg-gradient-to-br from-stone-100 to-gray-100 border-stone-200' :
                             'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-100'
                           }`}>
                              <div className="flex justify-between items-start mb-2">
                                 <h5 className={`font-black text-sm flex items-center gap-2 ${
                                   advice.tone === 'positive' ? 'text-red-800' :
                                   advice.tone === 'negative' ? 'text-stone-700' :
                                   'text-amber-800'
                                 }`}>
                                    <Sparkles size={14} className={advice.tone === 'positive' ? 'text-red-500' : 'text-amber-500'} />
                                    {advice.title}
                                 </h5>
                                 <div className="flex gap-1">
                                   {advice.tags.map((tag, i) => (
                                     <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/60 border border-black/5 text-black/60 font-bold">
                                       {tag}
                                     </span>
                                   ))}
                                 </div>
                              </div>
                              <p className={`text-xs leading-relaxed font-medium ${
                                advice.tone === 'positive' ? 'text-red-900/80' :
                                advice.tone === 'negative' ? 'text-stone-700/80' :
                                'text-amber-900/80'
                              }`}>
                                {advice.content}
                              </p>
                           </div>
                         );
                      })()}


                      {/* 2. Favorable Tendency Check */}
                      {isPrimary && activeAffairConfig?.favorableTendency && (
                        <div className="bg-stone-50 rounded-lg p-3 border border-stone-100">
                           <p className="text-[11px] font-bold text-stone-700 mb-2">吉凶格局扫描</p>
                           <div className="space-y-1.5">
                              <p className="text-[10px] text-stone-600 leading-relaxed">
                                 <span className="font-bold text-green-600">宜：</span> {activeAffairConfig.favorableTendency.prefers?.map(k => QM_NAMES_MAP[k] || k).join('、') || '无'}
                                 <span className="mx-2 text-gray-300">|</span>
                                 <span className="font-bold text-red-600">忌：</span> {activeAffairConfig.favorableTendency.avoids?.map(k => QM_NAMES_MAP[k] || k).join('、') || '无'}
                              </p>
                              {activeAffairConfig.favorableTendency.note && (
                                <p className="text-[10px] text-stone-400 mt-1 italic">{activeAffairConfig.favorableTendency.note}</p>
                              )}
                           </div>
                        </div>
                      )}

                      {/* 3. Pattern Recognition (GeJu) */}
                      {(() => {
                        const patterns = analyzePalacePatterns(p, ju!);
                        if (patterns.length === 0) return null;
                        
                        return (
                           <div className="bg-stone-50 rounded-lg p-3 border border-stone-100">
                              <p className="text-[11px] font-bold text-stone-700 mb-2 flex items-center gap-2">
                                <Zap size={12} className="text-amber-500" />
                                格局识别
                              </p>
                              <div className="space-y-2">
                                {patterns.map((pat, idx) => (
                                  <div key={idx} className={`p-2 rounded border ${
                                    pat.type === '吉' ? 'bg-red-50 border-red-100' :
                                    pat.type === '凶' ? 'bg-stone-200 border-stone-300' : 
                                    'bg-white border-gray-200'
                                  }`}>
                                     <div className="flex justify-between items-center mb-1">
                                       <span className={`text-[11px] font-bold ${
                                         pat.type === '吉' ? 'text-red-700' : 
                                         pat.type === '凶' ? 'text-stone-700' : 'text-gray-700'
                                       }`}>{pat.name}</span>
                                       <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                                          pat.type === '吉' ? 'bg-red-100 text-red-600' :
                                          pat.type === '凶' ? 'bg-stone-300 text-stone-600' :
                                          'bg-gray-100 text-gray-500'
                                       }`}>{pat.type}格</span>
                                     </div>
                                     <p className="text-[10px] text-gray-600 mb-1 leading-relaxed">{pat.desc}</p>
                                     {pat.advice && <p className="text-[10px] text-gray-400 italic">💡 {pat.advice}</p>}
                                     {/* Industry Note */}
                                     {divinationState.industry !== '通用' && pat.industryNote?.[divinationState.industry] && (
                                        <p className="text-[10px] text-amber-600 mt-1 font-bold border-t border-amber-100 pt-1">
                                          [{divinationState.industry}]: {pat.industryNote[divinationState.industry]}
                                        </p>
                                     )}
                                  </div>
                                ))}
                              </div>
                           </div>
                        );
                      })()}

                      {/* 3.5 State & Relationship Analysis (New) */}
                      {(() => {
                        const relevantSymbols = (activeAffairConfig?.primary || [])
                          .filter(s => isSymbolInPalace(p, s, ju));
                          
                        if (relevantSymbols.length === 0) return null;

                        return (
                          <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm mt-3">
                            <p className="text-[11px] font-bold text-gray-800 mb-2 flex items-center gap-2">
                              <Activity size={12} className="text-blue-500" />
                              状态与能量评估
                            </p>
                            
                            <div className="space-y-3">
                              {relevantSymbols.map(sym => {
                                 const analysis = analyzeQimenState(ju, p, sym, divinationState.industry === '通用' ? undefined : divinationState.industry);
                                 const resolvedName = resolveSymbol(sym, ju);
                                 const label = QM_NAMES_MAP[sym] || sym;
                                 const displayLabel = label === QM_NAMES_MAP[resolvedName] ? label : `${label} (${QM_NAMES_MAP[resolvedName] || resolvedName})`;
                                 
                                 return (
                                   <div key={sym} className="border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                                     <div className="flex justify-between items-center mb-1">
                                       <span className="text-[10px] font-bold text-gray-700">{displayLabel}</span>
                                       <div className="flex items-center gap-1">
                                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                                             analysis.scores.total >= 80 ? 'bg-red-50 text-red-600' :
                                             analysis.scores.total >= 50 ? 'bg-amber-50 text-amber-600' :
                                             'bg-gray-100 text-gray-500'
                                          }`}>
                                            总分 {analysis.scores.total}
                                          </span>
                                       </div>
                                     </div>
                                     
                                     {/* Badges */}
                                     <div className="flex flex-wrap gap-1 mb-1.5">
                                        <span className={`text-[9px] px-1 py-0.5 rounded border ${
                                          ['Wang', 'Xiang'].includes(analysis.state.wuxing) 
                                            ? 'bg-red-50 border-red-100 text-red-600' 
                                            : 'bg-gray-50 border-gray-100 text-gray-400'
                                        }`}>
                                          {QM_STATE_MAP[analysis.state.wuxing]?.label || analysis.state.wuxing}
                                        </span>
                                        
                                        {analysis.state.isKongWang && <span className="text-[9px] px-1 py-0.5 rounded border bg-stone-100 border-stone-200 text-stone-500">空亡</span>}
                                        {analysis.state.isRuMu && <span className="text-[9px] px-1 py-0.5 rounded border bg-stone-100 border-stone-200 text-stone-500">入墓</span>}
                                        {analysis.state.isJiXing && <span className="text-[9px] px-1 py-0.5 rounded border bg-red-50 border-red-100 text-red-500">击刑</span>}
                                        {analysis.state.lifeStage && <span className="text-[9px] px-1 py-0.5 rounded border bg-blue-50 border-blue-100 text-blue-500">{analysis.state.lifeStage}</span>}
                                     </div>
                                     
                                     {/* Relationship */}
                                     <div className="text-[10px] text-gray-600 flex items-start gap-1">
                                        <TrendingUp size={10} className="mt-0.5 text-gray-400" />
                                        <span>
                                          与日干({QM_NAMES_MAP[ju.pillars[2].gan]})关系：
                                          <span className={
                                            analysis.relationWithDay.type === 'Sheng' ? 'text-green-600 font-bold' :
                                            analysis.relationWithDay.type === 'Ke' ? 'text-red-600 font-bold' :
                                            'text-gray-600'
                                          }>
                                            {analysis.relationWithDay.description}
                                          </span>
                                        </span>
                                     </div>
                                   </div>
                                 );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* 4. Star-Door Combination */}
                      <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                         <p className="text-[11px] font-bold text-gray-800 mb-1">
                            {QM_NAMES_MAP[p.star.name]} + {QM_NAMES_MAP[p.door.name]} 分析
                         </p>
                         <p className="text-[10px] text-gray-500 leading-relaxed">
                            {(() => {
                              const rel = getElementRelation(p.star.element, p.door.element);
                              if (rel.startsWith('比和')) {
                                const biheMap: Record<string, string> = {
                                  '比和-金金': '星门皆金，刚硬过甚，恐有争执，宜防口舌。',
                                  '比和-木木': '星门皆木，双木成林，合作顺利，此时可进。',
                                  '比和-水水': '星门皆水，水多漂流，虽有助力，恐难安定。',
                                  '比和-火火': '星门皆火，势同燎原，虽有声势，需防过激。',
                                  '比和-土土': '星门皆土，厚重敦实，基础稳固，利于守成。'
                                };
                                return biheMap[rel] || '星门五行比和，主客相欢，事多顺遂，利于合作。';
                              }
                              if (rel === '生') return '星生门，主生客，为我方主动利于对方，付出有成。';
                              if (rel === '被生') return '门生星，客生主，为对方利于我方，坐享其成，吉。';
                              if (rel === '克') return '星克门，主克客，我方强势，对方受制，利于进攻。';
                              if (rel === '被克') return '门克星，客克主，对方强势，我方受制，宜防守。';
                              return '星门关系复杂，需结合具体格局分析。';
                           })()}
                            <br/>
                            <span className="text-gray-400 mt-1 block">
                              (传统解读：{QM_NAMES_MAP[p.star.name]}主天时/性格，{QM_NAMES_MAP[p.door.name]}主人事/行动。{p.door.auspiciousness === '吉' ? '门吉' : '门凶'}星{p.star.element === '火' || p.star.element === '金' ? '刚' : '柔'}，需审时度势。)
                            </span>
                         </p>
                      </div>

                      {/* 4. Non-Primary Hint */}
                      {!isPrimary && (
                         <div className="flex items-center gap-2 bg-stone-50 rounded-lg p-2 text-[10px] text-stone-600">
                            <Info size={12} className="shrink-0" />
                            <span>此宫为辅助参考，可看其与用神宫的生克关系。</span>
                         </div>
                      )}
                   </div>
                </div>
              );
            })()
         ) : (
           <div className="text-center py-6 text-gray-300 text-xs">
             点击上方九宫格查看具体宫位详情
           </div>
         )}
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Top Tab Switch */}
      <div className="flex justify-center pt-3 pb-2 bg-white border-b border-stone-100 z-40 shrink-0">
        <div className="flex bg-stone-100 rounded-lg p-1">
          <button 
             onClick={() => setActiveTab('paipan')}
             className={`px-6 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'paipan' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400'}`}
          >
            排盘决策
          </button>
          <button 
             onClick={() => setActiveTab('zeji')}
             className={`px-6 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'zeji' ? 'bg-white shadow-sm text-indigo-600' : 'text-stone-400'}`}
          >
            择吉择方
          </button>
          <button 
             onClick={() => setActiveTab('calendar')}
             className={`px-6 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'calendar' ? 'bg-white shadow-sm text-amber-600' : 'text-stone-400'}`}
          >
            奇门日历
          </button>
        </div>
      </div>

      {activeTab === 'zeji' ? (
        <div className="flex-1 overflow-hidden relative">
           <AuspiciousView />
        </div>
      ) : activeTab === 'calendar' ? (
        <div className="flex-1 overflow-y-auto p-4 pb-20 bg-stone-50">
           <QimenCalendar onSelectDate={(d) => {
             setTimestamp(d.getTime());
             setActiveTab('paipan');
           }} />
           
           <div className="mt-4 p-4 bg-white rounded-xl shadow-sm border border-stone-100">
             <h3 className="font-bold text-sm text-stone-800 mb-2">日历说明</h3>
             <p className="text-xs text-stone-500 leading-relaxed">
               • 点击日期可查看当天的奇门局。<br/>
               • 显示当日的定局信息（阴/阳遁、局数、节气）。<br/>
               • 包含农历日期与干支日柱。
             </p>
           </div>
        </div>
      ) : (
        <>
      <header className="flex flex-col border-b border-gray-50 bg-white/95 backdrop-blur-xl z-30">
        <div className="flex justify-between items-center px-4 py-2 border-b border-gray-50/50">
          <div className="flex flex-col">
             <div className="flex items-center gap-2">
                <span className="text-xs font-black text-gray-900 font-serif-zh">{userBirthYear}年人 · {QM_NAMES_MAP[userYearGan]}命</span>
                <span className="w-[1px] h-3 bg-gray-200"></span>
                <span className="text-xs font-black text-gray-900 font-serif-zh">{ju.yinYang}遁{ju.juNumber}局</span>
             </div>
             <div className="text-[9px] text-gray-400 font-bold mt-0.5 tracking-wide">
               {ju.juName} · {new Date(timestamp).toLocaleTimeString()}
             </div>
          </div>
        </div>

        {/* Smart Command Input */}
        <div className="px-4 py-2 border-b border-gray-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input 
               type="text" 
               value={commandInput}
               onChange={(e) => setCommandInput(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleSmartCommand()}
               placeholder=""
               className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-9 pr-12 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-gray-300 select-text"
            />
            <button 
              onClick={handleSmartCommand}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 text-white p-1 rounded-lg hover:bg-indigo-700 transition-colors select-none"
            >
              <Sparkles size={12} />
            </button>
          </div>
          {commandFeedback && (
            <div className="mt-1 text-[10px] text-indigo-600 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
              <Sparkles size={10} />
              {commandFeedback}
            </div>
          )}
        </div>
        
        <div className="flex justify-center py-2">
          <div className="flex bg-gray-50 p-1 rounded-xl ring-1 ring-gray-100">
            {(['平面', '罗盘', '立体'] as const).map(v => (
              <button 
                key={v} onClick={() => setView(v)}
                className={`px-6 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all ${view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-300'}`}
              >
                {v}视角
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 relative min-h-0 bg-white-pure overflow-y-auto">
        {view === '平面' && (
          <div className="min-h-full flex flex-col p-2 pb-20">
            {/* 九宫格区域 */}
            <div className="flex-1 grid grid-cols-3 gap-1 min-h-[400px]">
              {QM_STACK_ORDER.map(idx => {
                const p = ju.palaces.find(pal => pal.index === idx)!;
                const isHighlighted = primaryPalaceIndices.includes(idx);
                const isSelected = selectedPalaceIndex === idx;
                const patterns = analyzePalacePatterns(p, ju);
                
                return (
                  <div key={idx} className={`h-full w-full transition-all duration-300 ${isHighlighted ? 'ring-2 ring-amber-400 rounded-2xl z-10' : ''} ${isSelected ? 'ring-2 ring-indigo-500 rounded-2xl z-20' : ''}`}>
                    <QimenPalaceItem 
                      palace={p} 
                      patterns={patterns}
                      onClick={() => setSelectedPalaceIndex(idx)} 
                    />
                  </div>
                );
              })}
            </div>

            {/* 四柱信息 */}
            <div className="flex gap-1 mt-2 shrink-0">
              {ju.pillars.map(p => (
                <div key={p.label} className="flex-1 bg-white py-1 rounded-xl text-center border border-gray-100 shadow-sm">
                  <p className="text-[8px] text-gray-300 font-black mb-0.5">{p.label}</p>
                  <p className="text-xs font-black text-gray-800 font-serif-zh">{QM_NAMES_MAP[p.gan]}{QM_NAMES_MAP[p.zhi]}</p>
                </div>
              ))}
            </div>

            {/* 功能区 */}
            <div className="mt-6 px-2 min-h-[300px]">
               {divinationState.isActive ? (
                 renderDivinationPanel()
               ) : (
                 <>
                   <h3 className="text-xs font-black text-gray-400 mb-3 px-1">奇门应用</h3>
                   <div className="grid grid-cols-1 gap-3">
                      {/* 临机断事 - 优先开发 */}
                      <div 
                        onClick={() => setDivinationState({ isActive: true, category: null, affairKey: null, industry: '通用' })}
                        className="group relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-stone-900 to-stone-800 border border-stone-700 shadow-lg active:scale-[0.98] transition-all cursor-pointer"
                      >
                          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                          <div className="relative z-10">
                              <div className="flex justify-between items-start mb-3">
                                  <div className="w-8 h-8 rounded-full bg-stone-700/50 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                                      <Zap size={16} className="text-amber-400" />
                                  </div>
                                  <ChevronRight size={14} className="text-stone-600 group-hover:text-amber-500/50 transition-colors" />
                              </div>
                              <h4 className="text-sm font-black text-amber-100 mb-1">临机断事</h4>
                              <p className="text-[10px] text-stone-400 leading-relaxed">即时起局占测，洞察当前时空吉凶态势。</p>
                          </div>
                      </div>
                   </div>
                 </>
               )}
            </div>
          </div>
        )}

        {view === '立体' && <QimenSpatialLayers ju={ju} />}
        {view === '罗盘' && (
          <div className="min-h-full flex flex-col p-2 pb-20">
             <QimenCompass 
               ju={ju!} 
               onSelectPalace={setSelectedPalaceIndex}
               highlightedIndices={primaryPalaceIndices}
               className="my-8"
               onTimeChange={(date) => setTimestamp(date.getTime())}
               industry={divinationState.industry}
               onIndustryChange={(newIndustry) => setDivinationState(prev => ({ ...prev, industry: newIndustry }))}
             />
             
             {/* 功能区 (Reused from Plane view to allow Industry/Affair selection) */}
             <div className="mt-6 px-2 min-h-[300px]">
               {divinationState.isActive ? (
                 renderDivinationPanel()
               ) : (
                 <>
                   <h3 className="text-xs font-black text-gray-400 mb-3 px-1">奇门应用</h3>
                   <div className="grid grid-cols-1 gap-3">
                      {/* 临机断事 - 优先开发 */}
                      <div 
                        onClick={() => setDivinationState({ isActive: true, category: null, affairKey: null, industry: '通用' })}
                        className="group relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-stone-900 to-stone-800 border border-stone-700 shadow-lg active:scale-[0.98] transition-all cursor-pointer"
                      >
                          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                          <div className="relative z-10">
                              <div className="flex justify-between items-start mb-3">
                                  <div className="w-8 h-8 rounded-full bg-stone-700/50 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                                      <Zap size={16} className="text-amber-400" />
                                  </div>
                                  <ChevronRight size={14} className="text-stone-600 group-hover:text-amber-500/50 transition-colors" />
                              </div>
                              <h4 className="text-sm font-black text-amber-100 mb-1">临机断事</h4>
                              <p className="text-[10px] text-stone-400 leading-relaxed">即时起局占测，洞察当前时空吉凶态势。</p>
                          </div>
                      </div>
                   </div>
                 </>
               )}
            </div>
          </div>
        )}
      </main>
        </>
      )}
    </div>
  );
};

export { QimenView };
export default QimenView;