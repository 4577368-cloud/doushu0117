import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Crown, Eye, EyeOff, ShieldCheck, Activity, BrainCircuit, History, Maximize2, ClipboardCopy, Check, Cloud, Info, CheckCircle, ChevronDown, ChevronUp, Lock as LockIcon, BarChart3, Share2 } from 'lucide-react';
import { UserProfile, BaziChart, ChartSubTab, BaziReport as AiBaziReport } from '../types';
import { getArchives, saveAiReportToArchive } from '../services/storageService';
import { shareProfile } from '../services/shareService';
import { SmartTextRenderer } from '../components/ui/BaziUI';
import { BalancePanel } from '../components/business/BalancePanel';
import { CoreInfoCard } from '../components/business/CoreInfoCard';
import { BaziAnalysisView } from '../components/BaziAnalysisView';
// ❌ 删除了 AiChatView 的引用，因为它现在是独立页面了
import { ReportHistoryModal } from '../components/modals/ReportHistoryModal';
import { BaziChartGrid } from '../components/business/BaziChartGrid';
import { getDayHourComboText } from '../services/baziComboService';
import { DailyFortuneCard, DailyFortuneData } from '../components/business/DailyFortuneCard';
import { DailyPillarCard } from '../components/business/DailyPillarCard';
import { generateDailyFortuneAi } from '../services/dailyFortuneService';
import { calculateDailyFortuneBasic } from '../services/dailyFortune';
import { getFullDateGanZhi } from '../services/ganzhi';
import { BRANCH_CLASHES, BRANCH_XING, BRANCH_HAI, EARTHLY_BRANCHES, BRANCH_COMBINES } from '../services/constants';
import { getGanZhiForMonth } from '../services/baziService';
import { LlmPriorityBadge } from '../components/ui/LlmPriorityBadge';
import type { LlmPriority } from '../utils/llmPriority';

export const BaziChartView: React.FC<{
  profile: UserProfile;
  chart: BaziChart;
  onShowModal: any;
  onSaveReport: any;
  onAiAnalysis: any;
  loadingAi: boolean;
  llmPriority?: LlmPriority | null;
  aiReport: AiBaziReport | null;
  isVip: boolean;
  onVipClick: () => void;
  onManualSave: () => void;
  isSaving: boolean;
  archives: UserProfile[];
  trialUsage?: { masterReportUsed: boolean };
  onUseTrialMasterReport?: () => Promise<boolean>;
}> = ({ profile, chart, onShowModal, onSaveReport, onAiAnalysis, loadingAi, llmPriority, aiReport, isVip, onVipClick, onManualSave, isSaving, archives, trialUsage, onUseTrialMasterReport }) => {
  const [activeSubTab, setActiveSubTab] = useState<ChartSubTab>(ChartSubTab.DETAIL);
  const [selectedHistoryReport, setSelectedHistoryReport] = useState<any | null>(null);
  const [copiedCombo, setCopiedCombo] = useState(false);
  const [dailyFortune, setDailyFortune] = useState<DailyFortuneData | null>(null);
  const [loadingFortune, setLoadingFortune] = useState(false);
  const [fortuneLlmPriority, setFortuneLlmPriority] = useState<LlmPriority | null>(null);
  const [fortuneError, setFortuneError] = useState(false);
  const [autoGenAttempted, setAutoGenAttempted] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
      balance: false,
      dayHourCombo: false,
      wealthPath: false,
      milestones: false,
  });

  const toggleSection = (key: keyof typeof expandedSections) => {
      setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const allHistoryReports = useMemo(() => {
      const all: any[] = [];
      archives.forEach(user => { 
          if (user.aiReports) {
              user.aiReports.forEach(r => all.push({ ...r, userName: user.name }));
          }
      });
      return all.sort((a, b) => b.date - a.date);
  }, [archives]);

  const openDetailedModal = (title: string, gz: any, name: string, ss: string[]) => onShowModal({ title, pillarName: name, ganZhi: gz, shenSha: ss });

  // 可折叠区块组件
  const CollapseSection: React.FC<{
      title: string;
      icon: React.ReactNode;
      expanded: boolean;
      onToggle: () => void;
      children: React.ReactNode;
      priority?: 'high' | 'medium' | 'low';
  }> = ({ title, icon, expanded, onToggle, children, priority = 'medium' }) => {
      const priorityCls = {
          high: 'border-l-4 border-l-amber-500',
          medium: 'border-l-4 border-l-indigo-400',
          low: 'border-l-4 border-l-stone-300'
      }[priority];
      return (
          <div className={`bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden ${priorityCls}`}>
              <button
                  onClick={onToggle}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-stone-50 transition-colors"
              >
                  <div className="flex items-center gap-2">
                      {icon}
                      <h4 className="text-sm font-black text-stone-900">{title}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                      <span className="text-[10px] text-stone-400 font-medium">
                          {expanded ? '收起' : '展开'}
                      </span>
                      {expanded ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
                  </div>
              </button>
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="px-5 pb-5 border-t border-stone-100">
                      <div className="pt-4">
                          {children}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  // 🔥 修改点：移除了 'AI 对话' 选项，现在它在底部导航栏
  const tabs = [
      { id: ChartSubTab.DETAIL, label: '流年大运' }, 
      { id: ChartSubTab.DAILY, label: '今日运势' },
      { id: ChartSubTab.ANALYSIS, label: '大师解读' }
  ];

  const handleAiAnalysisWrapper = async () => { 
      if (!isVip) {
          if (trialUsage?.masterReportUsed) {
              onVipClick();
              return;
          }
          const ok = await onUseTrialMasterReport?.();
          if (!ok) {
              onVipClick();
              return;
          }
      }
      onAiAnalysis();
  };

  const handleShare = async () => {
      const result = await shareProfile(profile, chart);
      if (result.ok) {
          setShareCopied(true);
          setTimeout(() => setShareCopied(false), 2000);
      }
  };

  const handleGenerateFortune = async () => {
    if (!isVip) {
        onVipClick();
        return;
    }
    
    setLoadingFortune(true);
    setFortuneLlmPriority(null);
    setFortuneError(false);
    try {
        const apiKey = sessionStorage.getItem('ai_api_key') || undefined;
        const result = await generateDailyFortuneAi(profile, chart, apiKey, setFortuneLlmPriority);
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const fullData = {
            ...result,
            date: dateStr,
            ganZhi: getFullDateGanZhi(today),
            isAiGenerated: true
        };
        
        setDailyFortune(fullData);
        
        // Save to localStorage
        localStorage.setItem(`daily_fortune_data_${profile.id}_${dateStr}`, JSON.stringify(fullData));
        localStorage.setItem(`daily_fortune_last_date_${profile.id}`, dateStr);
        
    } catch (e) {
        console.error("Failed to generate fortune:", e);
        setFortuneError(true);
    } finally {
        setLoadingFortune(false);
    }
  };

  // 自动触发逻辑：进入今日运势 Tab 时，如果没有数据且今天未尝试过，则自动触发
  useEffect(() => {
    if (activeSubTab === ChartSubTab.DAILY) {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        
        // 如果已经有今天的 AI 数据，不需要重新生成
        if (dailyFortune && dailyFortune.date === dateStr && dailyFortune.isAiGenerated) {
            return;
        }

        // 检查是否具备生成条件
        if (!isVip) return;

        // 检查是否今天已经自动尝试过 (避免重复扣费或死循环)
        const lastAttemptKey = `daily_fortune_auto_attempt_${profile.id}_${dateStr}`;
        const hasAttempted = sessionStorage.getItem(lastAttemptKey);

        if (!hasAttempted && !autoGenAttempted) {
            setAutoGenAttempted(true);
            sessionStorage.setItem(lastAttemptKey, 'true');
            handleGenerateFortune();
        }
    }
  }, [activeSubTab, dailyFortune, isVip, profile.id, autoGenAttempted]);

  useEffect(() => {
    const loadSavedFortune = () => {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const storageKey = `daily_fortune_data_${profile.id}_${dateStr}`;
        const savedData = localStorage.getItem(storageKey);

        if (savedData) {
            try {
                setDailyFortune(JSON.parse(savedData));
            } catch (e) {
                console.error("Failed to parse saved fortune", e);
                localStorage.removeItem(storageKey);
            }
        }
    };
    
    if (chart && profile) {
        loadSavedFortune();
    }
  }, [profile?.id]);


  return (
    <div className="flex flex-col h-full bg-white">
      {/* 顶部操作栏 */}
      <div className="flex border-b border-stone-200 bg-white shadow-sm overflow-x-auto no-scrollbar justify-between items-center pr-2">
        <div className="flex flex-1">
            {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveSubTab(tab.id as ChartSubTab)} className={`flex-1 min-w-[70px] py-3 text-[11px] font-black border-b-2 transition-all ${activeSubTab === tab.id ? 'border-stone-950 text-stone-950' : 'border-transparent text-stone-500'}`}>
                {tab.label}
            </button>
            ))}
        </div>
        {/* 分享命盘按钮 */}
        <button onClick={handleShare} className={`ml-2 px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${shareCopied ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
            {shareCopied ? <Check size={12}/> : <Share2 size={12}/>}
            {shareCopied ? '已复制' : '分享命盘'}
        </button>

        {/* 手动保存按钮 */}
        <button onClick={onManualSave} disabled={isSaving} className={`ml-2 px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${isSaving ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
            {isSaving ? <Activity size={12} className="animate-spin"/> : <Cloud size={12}/>}
            {isSaving ? '同步中...' : '保存档案'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f9f9f8] p-4 pb-24">
         
         {activeSubTab === ChartSubTab.DAILY && (
            <div className="animate-fade-in space-y-4">
                <DailyPillarCard chart={chart} />
                <DailyFortuneCard 
                   chart={chart}
                    aiData={dailyFortune} 
                    loading={loadingFortune} 
                    onGenerate={handleGenerateFortune} 
                    isVip={isVip} 
                    aiError={fortuneError}
                    llmPriority={fortuneLlmPriority}
                 />
             </div>
         )}

         {activeSubTab === ChartSubTab.DETAIL && (
             <div className="animate-fade-in space-y-4">
                 {/* 高优先级：核心命盘 + 流年大运，默认完整展示 */}
                 <CoreInfoCard profile={profile} chart={chart} />
                 <BaziAnalysisView chart={chart} onShowModal={openDetailedModal} />

                 {/* 中优先级：默认折叠，减少首屏信息密度 */}
                 <CollapseSection
                     title="五行能量与喜用"
                     icon={<BarChart3 size={16} className="text-indigo-500" />}
                     expanded={expandedSections.balance}
                     onToggle={() => toggleSection('balance')}
                     priority="medium"
                 >
                     <BalancePanel balance={chart.balance} wuxing={chart.wuxingCounts} dm={chart.dayMaster} />
                 </CollapseSection>

                 <CollapseSection
                     title="日时组合详解"
                     icon={<Info size={16} className="text-indigo-500" />}
                     expanded={expandedSections.dayHourCombo}
                     onToggle={() => toggleSection('dayHourCombo')}
                     priority="medium"
                 >
                     <div className="flex items-center justify-end mb-3">
                         <button
                             onClick={() => { navigator.clipboard.writeText(getDayHourComboText(chart)); setCopiedCombo(true); setTimeout(() => setCopiedCombo(false), 2000); }}
                             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${copiedCombo ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                         >
                             {copiedCombo ? <CheckCircle size={12} /> : <ClipboardCopy size={12} />}
                             {copiedCombo ? '已复制' : '复制'}
                         </button>
                     </div>
                     <div className="text-xs text-stone-700 leading-relaxed whitespace-pre-wrap">
                         {getDayHourComboText(chart)}
                     </div>
                 </CollapseSection>

                 <CollapseSection
                     title="生财路径建议"
                     icon={<Sparkles size={16} className="text-emerald-500" />}
                     expanded={expandedSections.wealthPath}
                     onToggle={() => toggleSection('wealthPath')}
                     priority="medium"
                 >
                     {(() => {
                       const names = ['食神','伤官','正财','偏财','正官','七杀','正印','偏印','比肩','劫财'];
                       const count: Record<string, number> = {};
                       const pl = chart.pillars;
                       [pl.year, pl.month, pl.day, pl.hour].forEach(p => { const s = p.ganZhi.shiShenGan; if (s) count[s] = (count[s]||0)+1; });
                       const sx = (count['食神']||0)+(count['伤官']||0);
                       const cai = (count['正财']||0)+(count['偏财']||0);
                       const guan = (count['正官']||0)+(count['七杀']||0);
                       const yin = (count['正印']||0)+(count['偏印']||0);

                       const lines: string[] = [];
                       if (sx>=2 && cai>=1) lines.push('以输出与变现为主线（内容/技术/销售），结合现金流产品与小额复利');
                       if (cai>=2 && guan>=1) lines.push('稳中求财（龙头+ETF），兼顾合规路径与职业上行');
                       if (yin>=2) lines.push('先增能后求财（学习认证/工具升级/内功积累）');
                       if (sx===0 && cai===0) lines.push('避免高频试错，采用指数定投与多元现金流');

                       const present = names.filter(n => (count[n]||0) > 0);
                       return (
                        <div className="space-y-3 text-[12px] text-stone-700">
                          <div className="flex flex-wrap gap-2">
                            {present.map(n => (
                              <span key={n} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 font-bold">{n} × {count[n]}</span>
                            ))}
                          </div>
                          {lines.length > 0 && (
                            <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-stone-600 text-[11px] leading-relaxed">
                              {lines[0]}
                            </div>
                          )}
                        </div>
                       );
                     })()}
                 </CollapseSection>

                 {/* 低优先级：默认折叠 */}
                 <CollapseSection
                     title="重大节点提醒清单（未来6个月）"
                     icon={<Check size={16} className="text-stone-500" />}
                     expanded={expandedSections.milestones}
                     onToggle={() => toggleSection('milestones')}
                     priority="low"
                 >
                     {(() => {
                       const now = new Date();
                       const dayZhi = chart.pillars.day.ganZhi.zhi;
                       const monthBaseZhi = chart.pillars.month.ganZhi.zhi;
                       const yearBaseZhi = chart.pillars.year.ganZhi.zhi;
                       const items = Array.from({length:6}).map((_,i) => {
                         const d = new Date(now.getFullYear(), now.getMonth()+i, 1);
                         const gz = getGanZhiForMonth(d.getFullYear(), d.getMonth()+1, chart.dayMaster);
                         const m = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
                         const mz = gz.zhi;
                         const triggers: string[] = [];
                         const pushIf = (cond: boolean, t: string) => { if (cond) triggers.push(t); };
                         pushIf(BRANCH_CLASHES[mz] === dayZhi, '冲日支');
                         pushIf(BRANCH_CLASHES[mz] === monthBaseZhi, '冲月令');
                         pushIf(BRANCH_CLASHES[mz] === yearBaseZhi, '冲年支');
                         pushIf(mz === dayZhi, '伏吟日支');
                         pushIf(mz === monthBaseZhi, '伏吟月令');
                         pushIf(mz === yearBaseZhi, '伏吟年支');
                         pushIf(EARTHLY_BRANCHES.includes(mz) && EARTHLY_BRANCHES.includes(dayZhi) && BRANCH_XING[mz]?.includes(dayZhi), '刑日支');
                         pushIf(BRANCH_XING[mz]?.includes(monthBaseZhi), '刑月令');
                         pushIf(BRANCH_HAI[mz] === dayZhi, '害日支');
                         pushIf(BRANCH_HAI[mz] === monthBaseZhi, '害月令');
                         pushIf(BRANCH_COMBINES[mz] === dayZhi, '合日支');
                         pushIf(BRANCH_COMBINES[mz] === monthBaseZhi, '合月令');
                         pushIf(BRANCH_COMBINES[mz] === yearBaseZhi, '合年支');
                         const hasHe = triggers.some(t => t.includes('合'));
                         const hasChong = triggers.some(t => t.includes('冲'));
                         const hasXing = triggers.some(t => t.includes('刑'));
                         const hasHai = triggers.some(t => t.includes('害'));
                         const hasFuyin = triggers.some(t => t.includes('伏吟'));
                         const pwDay = 3, pwMonth = 2, pwYear = 1;
                         const twHe = 1, twChong = 3, twXing = 2, twHai = 2, twFuyin = 1;
                         let score = 0;
                         if (BRANCH_COMBINES[mz] === dayZhi) score += twHe + pwDay;
                         if (BRANCH_COMBINES[mz] === monthBaseZhi) score += twHe + pwMonth;
                         if (BRANCH_COMBINES[mz] === yearBaseZhi) score += twHe + pwYear;
                         if (BRANCH_CLASHES[mz] === dayZhi) score += twChong + pwDay;
                         if (BRANCH_CLASHES[mz] === monthBaseZhi) score += twChong + pwMonth;
                         if (BRANCH_CLASHES[mz] === yearBaseZhi) score += twChong + pwYear;
                         if (EARTHLY_BRANCHES.includes(mz) && EARTHLY_BRANCHES.includes(dayZhi) && BRANCH_XING[mz]?.includes(dayZhi)) score += twXing + pwDay;
                         if (BRANCH_XING[mz]?.includes(monthBaseZhi)) score += twXing + pwMonth;
                         if (BRANCH_HAI[mz] === dayZhi) score += twHai + pwDay;
                         if (BRANCH_HAI[mz] === monthBaseZhi) score += twHai + pwMonth;
                         if (mz === dayZhi) score += twFuyin + pwDay;
                         if (mz === monthBaseZhi) score += twFuyin + pwMonth;
                         if (mz === yearBaseZhi) score += twFuyin + pwYear;
                         const level = score >= 6 ? '强' : (score >= 3 ? '中' : '弱');
                         const levelCls = level === '强' ? 'bg-rose-50 text-rose-700 border-rose-200' : (level === '中' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-stone-100 text-stone-700 border-stone-200');
                         const baseAction = hasHe ? '促成合作/签约推进' : (hasChong ? '防守降杠杆' : ((hasXing || hasHai) ? '稳健推进/严控合规' : (hasFuyin ? '复盘巩固/按部就班' : '按计划推进')));
                         const avoidParts = [
                           hasChong ? '避免重决策' : null,
                           hasChong ? '避免扩杠杆' : null,
                           hasXing ? '避免刚性碰撞' : null,
                           hasHai ? '避免口舌纠纷' : null,
                           hasHe ? '避免单打独斗' : null
                         ].filter(Boolean) as string[];
                         const baseAvoid = (avoidParts.slice(0,2).join('、')) || '常规风险规避';
                         const prepareParts = [
                           hasChong ? '现金缓冲' : null,
                           hasChong ? '延期关键发布' : null,
                           (hasXing || hasHai) ? '合规审查/合同复核' : null,
                           hasFuyin ? '备份与冗余' : null,
                           hasFuyin ? '复盘与整理' : null,
                           hasHe ? '资料与方案准备' : null,
                           hasHe ? '对齐关键人' : null
                         ].filter(Boolean) as string[];
                         const basePrepare = (prepareParts.slice(0,2).join('、')) || '常规维护与复盘';
                         const strongAction = hasChong ? '止损与风控优先' : ((hasXing || hasHai) ? '严控合规/保守推进' : (hasHe ? '试探性合作/控制规模' : (hasFuyin ? '低速推进/聚焦稳态' : '降杠杆/防守为主')));
                         const strongAvoid = (['避免重决策','避免扩杠杆', hasXing?'避免刚性碰撞':null, hasHai?'避免口舌纠纷':null].filter(Boolean) as string[]).slice(0,2).join('、') || '避免重决策、避免扩杠杆';
                         const strongPrepare = '现金缓冲、风控预案';
                         const weakAction = hasHe ? '优化合作细节/按计划推进' : '优化迭代/按计划推进';
                         const weakAvoid = '避免过度投入';
                         const weakPrepare = '复盘与维护';
                         const action = level==='强' ? strongAction : (level==='弱' ? weakAction : baseAction);
                         const avoid = level==='强' ? strongAvoid : (level==='弱' ? weakAvoid : baseAvoid);
                         const prepare = level==='强' ? strongPrepare : (level==='弱' ? weakPrepare : basePrepare);
                         return { month: m, label: `${gz.gan}${gz.zhi}`, triggers, action, avoid, prepare, level, levelCls };
                       });
                       return (
                         <div className="space-y-2">
                           {items.map(it => (
                             <div key={it.month} className="bg-stone-50 border border-stone-100 rounded-xl p-3 text-[12px]">
                               <div className="flex items-center justify-between mb-1">
                                <div className="font-black text-stone-900">{it.month}</div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">{it.label}</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${it.levelCls}`}>{it.level}</span>
                                </div>
                               </div>
                               {it.triggers.length > 0 && (
                                 <div className="flex flex-wrap gap-1 mb-2">
                                   {it.triggers.map((t,idx)=>(<span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-800">{t}</span>))}
                                 </div>
                               )}
                               <div className="flex flex-wrap gap-2">
                                 <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">行动：{it.action}</span>
                                 <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">避免：{it.avoid}</span>
                                 <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">准备：{it.prepare}</span>
                               </div>
                             </div>
                           ))}
                         </div>
                       );
                     })()}
                 </CollapseSection>
             </div>
         )}

         {activeSubTab === ChartSubTab.ANALYSIS && (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-white border border-stone-300 p-5 rounded-2xl shadow-sm relative overflow-hidden">
                    {isVip || aiReport ? (
                        <>
                            <div className="mb-4 bg-gradient-to-r from-stone-900 to-stone-700 text-amber-400 p-4 rounded-xl flex items-center justify-between shadow-lg">
                                <div className="flex items-center gap-2"><Crown size={20} fill="currentColor" /><span className="text-xs font-black tracking-wider">{isVip ? 'VIP 尊享通道已激活' : '免费体验大师解读'}</span></div>
                                <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-white">{isVip ? '无限畅享' : '剩余 1 次'}</span>
                            </div>

                            <button onClick={handleAiAnalysisWrapper} disabled={loadingAi} className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all ${loadingAi ? 'bg-stone-100 text-stone-400' : 'bg-stone-900 text-amber-400 active:scale-95 shadow-lg'}`}>
                              {loadingAi ? <Activity className="animate-spin" size={20}/> : <BrainCircuit size={20}/>} {loadingAi ? '正在深度推演...' : (isVip ? '生成大师解盘报告' : '免费生成大师解盘报告')}
                            </button>
                            {(loadingAi || llmPriority) && (
                                <div className="mt-2 flex justify-center">
                                    <LlmPriorityBadge priority={loadingAi ? llmPriority ?? null : llmPriority ?? null} />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 bg-stone-50 rounded-2xl border border-stone-100">
                             <div className="w-12 h-12 bg-stone-900 rounded-full flex items-center justify-center shadow-xl mb-1">
                                <Crown className="text-amber-400" size={24} />
                             </div>
                             <div className="space-y-1">
                                <h3 className="font-bold text-stone-800">{trialUsage?.masterReportUsed ? 'VIP 尊享大师解读' : '免费体验大师解读'}</h3>
                                <p className="text-xs text-stone-500 max-w-[200px] mx-auto leading-relaxed">
                                    {trialUsage?.masterReportUsed
                                        ? '升级 VIP 解锁无限次 AI 深度八字分析，洞察人生真谛'
                                        : '新用户可免费体验 1 次大师解读，感受 AI 推演质量'}
                                </p>
                             </div>
                             <button onClick={trialUsage?.masterReportUsed ? onVipClick : handleAiAnalysisWrapper} className="bg-stone-900 text-amber-400 px-8 py-3 rounded-xl text-xs font-bold shadow-lg active:scale-95 transition-transform flex items-center gap-2">
                                {trialUsage?.masterReportUsed ? <><LockIcon size={14} /> 立即解锁</> : <><Sparkles size={14} /> 免费体验一次</>}
                             </button>
                         </div>
                    )}
                 </div>
                 {aiReport && (
                     <div className="bg-white border border-stone-300 p-6 rounded-3xl space-y-4 shadow-sm animate-slide-up">
                         <div className="flex items-center gap-2 text-emerald-600 font-black border-b border-stone-100 pb-3">
                            <Sparkles size={18}/> <span>本次生成结果</span>
                            <LlmPriorityBadge priority={llmPriority ?? null} className="ml-auto" />
                         </div>
                         <div className="bg-stone-50 p-4 rounded-xl text-sm leading-relaxed text-stone-700 max-h-[300px] overflow-y-auto custom-scrollbar"><SmartTextRenderer content={aiReport.copyText} /></div>
                         <button onClick={() => {navigator.clipboard.writeText(aiReport.copyText); alert("已复制");}} className="w-full bg-emerald-50 text-emerald-700 py-3 rounded-xl text-xs font-black border border-emerald-100 shadow-sm flex items-center justify-center gap-2"><ClipboardCopy size={14}/> 复制内容</button>
                     </div>
                 )}
                 <div className="space-y-3">
                     <div className="flex items-center gap-2 px-2"><History size={16} className="text-stone-400"/><h3 className="font-black text-stone-600 text-xs uppercase tracking-wider">全站解盘历史存档 ({allHistoryReports.length})</h3></div>
                     {allHistoryReports.length > 0 ? (
                         <div className="grid grid-cols-1 gap-3">
                             {allHistoryReports.map((report, idx) => (
                                 <div key={report.id || idx} className="bg-white border border-stone-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                                     <div className="flex justify-between items-start mb-2">
                                         <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs border border-indigo-100">{report.userName?.[0]}</div><div><div className="font-black text-stone-900 text-sm">{report.userName}</div><div className="text-[10px] text-stone-400">{new Date(report.date).toLocaleString()}</div></div></div>
                                         <span className="text-[10px] font-bold px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full">{report.type === 'ziwei' ? '紫微' : '八字'}</span>
                                     </div>
                                     <div className="text-xs text-stone-500 line-clamp-2 mb-3 leading-relaxed bg-stone-50/50 p-2 rounded-lg">{report.content.slice(0, 80)}...</div>
                                     <button onClick={() => setSelectedHistoryReport(report)} className="w-full mt-2 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 group-hover:bg-indigo-600 transition-colors"><Maximize2 size={12}/> 查看完整报告</button>
                                 </div>
                             ))}
                         </div>
                     ) : <div className="text-center py-10 text-stone-300 text-xs italic bg-stone-50 rounded-2xl border border-stone-100 border-dashed">暂无历史生成记录</div>}
                 </div>
            </div>
         )}
      </div>
      {selectedHistoryReport && <ReportHistoryModal report={selectedHistoryReport} onClose={() => setSelectedHistoryReport(null)} />}
    </div>
  );
};
