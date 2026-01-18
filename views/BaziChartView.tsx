import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Crown, Eye, EyeOff, ShieldCheck, Activity, BrainCircuit, History, Maximize2, ClipboardCopy, Check, Cloud, Info, CheckCircle } from 'lucide-react';
import { UserProfile, BaziChart, ChartSubTab, BaziReport as AiBaziReport } from '../types';
import { getArchives, saveAiReportToArchive } from '../services/storageService';
import { SmartTextRenderer } from '../components/ui/BaziUI';
import { BalancePanel } from '../components/business/BalancePanel';
import { CoreInfoCard } from '../components/business/CoreInfoCard';
import { BaziAnalysisView } from '../components/BaziAnalysisView';
// ❌ 删除了 AiChatView 的引用，因为它现在是独立页面了
import { ReportHistoryModal } from '../components/modals/ReportHistoryModal';
import { BaziChartGrid } from '../components/business/BaziChartGrid';
import { getDayHourComboText } from '../services/baziComboService';
import { BRANCH_CLASHES, BRANCH_XING, BRANCH_HAI, EARTHLY_BRANCHES, BRANCH_COMBINES } from '../services/constants';
import { getGanZhiForMonth } from '../services/baziService';

export const BaziChartView: React.FC<{ profile: UserProfile; chart: BaziChart; onShowModal: any; onSaveReport: any; onAiAnalysis: any; loadingAi: boolean; aiReport: AiBaziReport | null; isVip: boolean; onManualSave: () => void; isSaving: boolean }> = ({ profile, chart, onShowModal, onSaveReport, onAiAnalysis, loadingAi, aiReport, isVip, onManualSave, isSaving }) => {
  const [activeSubTab, setActiveSubTab] = useState<ChartSubTab>(ChartSubTab.DETAIL);
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem('ai_api_key') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [archives, setArchives] = useState<UserProfile[]>([]);
  const [selectedHistoryReport, setSelectedHistoryReport] = useState<any | null>(null);
  const [copiedCombo, setCopiedCombo] = useState(false);

  useEffect(() => { 
      getArchives().then(setArchives); 
  }, [aiReport]);

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

  // 🔥 修改点：移除了 'AI 对话' 选项，现在它在底部导航栏
  const tabs = [
      { id: ChartSubTab.DETAIL, label: '流年大运' }, 
      { id: ChartSubTab.ANALYSIS, label: '整体建议' }
  ];

  const handleAiAnalysisWrapper = () => { 
      if (!isVip && !apiKey) { 
          alert("请先填写 API Key，或开通 VIP 解锁免 Key 特权"); 
          return; 
      } 
      onAiAnalysis(); 
  };

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
        {/* 手动保存按钮 */}
        <button onClick={onManualSave} disabled={isSaving} className={`ml-2 px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${isSaving ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
            {isSaving ? <Activity size={12} className="animate-spin"/> : <Cloud size={12}/>}
            {isSaving ? '同步中...' : '保存档案'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f9f9f8] p-4 pb-24">
         
         {activeSubTab === ChartSubTab.DETAIL && (
             <div className="animate-fade-in space-y-4">
                 <CoreInfoCard profile={profile} chart={chart} />
                 <BaziAnalysisView chart={chart} onShowModal={openDetailedModal} />
                <BalancePanel balance={chart.balance} wuxing={chart.wuxingCounts} dm={chart.dayMaster} />
                <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-indigo-100/50 bg-gradient-to-r from-indigo-50 to-white">
                    <div className="flex items-center gap-2"><Info size={16} className="text-indigo-500"/><h4 className="text-sm font-black text-stone-900">日时组合</h4></div>
                    <button onClick={() => { navigator.clipboard.writeText(getDayHourComboText(chart)); setCopiedCombo(true); setTimeout(() => setCopiedCombo(false), 2000); }} className={`p-2 rounded-full transition-colors ${copiedCombo ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-stone-200 text-stone-400 hover:text-stone-700'}`}>{copiedCombo ? <CheckCircle size={16}/> : <ClipboardCopy size={16}/>}</button>
                  </div>
                  <div className="p-5 text-xs text-stone-700 leading-relaxed whitespace-pre-wrap">
                    {getDayHourComboText(chart)}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">

                   <div className="bg-white border border-stone-200 p-5 rounded-2xl shadow-sm">
                     <div className="flex items-center gap-2 mb-2"><History size={16} className="text-rose-500"/><h4 className="text-sm font-black text-stone-900">岁运拐点与预警</h4></div>
                     {(() => {
                       const now = new Date();
                       const y = now.getFullYear();
                       const lp = chart.luckPillars || [];
                       const current = lp.find(p => y>=p.startYear && y<=p.endYear) || lp[0];
                       const currentIndex = current ? lp.indexOf(current) : 0;
                       const next = lp[currentIndex+1];
                       const tag = (() => {
                         const yr = chart.pillars.year.ganZhi;
                         if (current && yr) {
                           const ganMatch = current.ganZhi.gan === yr.gan ? '干并临' : '';
                           const zhiMatch = current.ganZhi.zhi === yr.zhi ? '支并临' : '';
                           const both = ganMatch && zhiMatch ? '岁运并临' : (ganMatch || zhiMatch);
                           return both || '平常';
                         }
                         return '未知';
                       })();
                       return (
                         <div className="space-y-2 text-[12px] text-stone-700">
                           <div className="flex items-center justify-between bg-stone-50 p-3 rounded-xl border border-stone-100">
                             <div>
                               <div className="font-black text-stone-900">当前大运 {current?.startYear} - {current?.endYear}</div>
                               <div className="text-[10px] text-stone-500">{current?.ganZhi.gan}{current?.ganZhi.zhi} · {tag}</div>
                             </div>
                             <span className={`text-[10px] px-2 py-0.5 rounded-full border ${tag.includes('并临') ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{tag}</span>
                           </div>
                           {next && (
                             <div className="flex items-center justify-between bg-stone-50 p-3 rounded-xl border border-stone-100">
                               <div>
                                 <div className="font-black text-stone-900">下一大运 {next.startYear} - {next.endYear}</div>
                                 <div className="text-[10px] text-stone-500">{next.ganZhi.gan}{next.ganZhi.zhi}</div>
                               </div>
                               <span className="text-[10px] px-2 py-0.5 rounded-full border bg-stone-100 text-stone-700 border-stone-200">提前准备</span>
                             </div>
                           )}
                           <div className="text-[11px] bg-rose-50 border border-rose-100 text-rose-800 rounded-xl p-3">并临时建议：缩杠杆、稳现金流、减高波动资产；重要决策避开本月本季高冲击窗口。</div>
                         </div>
                       );
                     })()}
                   </div>

                   <div className="bg-white border border-stone-200 p-5 rounded-2xl shadow-sm">
                     <div className="flex items-center gap-2 mb-2"><Sparkles size={16} className="text-emerald-600"/><h4 className="text-sm font-black text-stone-900">生财路径建议</h4></div>
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
                      const mk = ['ETF','行业龙头','现金流副业'];
                      const present = names.filter(n => (count[n]||0) > 0);
                      return (
                        <div className="space-y-2 text-[12px] text-stone-700">
                         <div className="flex flex-wrap gap-2">
                            {present.map(n => (
                              <span key={n} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 font-bold">{n} × {count[n]}</span>
                            ))}
                        </div>
                   <div className="bg-white border border-stone-200 p-5 rounded-2xl shadow-sm">
                     <div className="flex items-center gap-2 mb-2"><Check size={16} className="text-stone-700"/><h4 className="text-sm font-black text-stone-900">重大节点提醒清单</h4></div>
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
                   </div>
                </div>
                       );
                     })()}
                   </div>
                 </div>
                
             </div>
         )}

         {activeSubTab === ChartSubTab.ANALYSIS && (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-white border border-stone-300 p-5 rounded-2xl shadow-sm">
                    {isVip ? (
                        <div className="mb-4 bg-gradient-to-r from-stone-900 to-stone-700 text-amber-400 p-4 rounded-xl flex items-center justify-between shadow-lg">
                            <div className="flex items-center gap-2"><Crown size={20} fill="currentColor" /><span className="text-xs font-black tracking-wider">VIP 尊享通道已激活</span></div>
                            <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-white">免 Key 无限畅享</span>
                        </div>
                    ) : (
                        <div className="relative mb-4">
                            {!apiKey && <div className="mb-2 text-[10px] text-stone-400 flex items-center gap-1"><ShieldCheck size={12}/> 未检测到 Key，将尝试使用公共代理</div>}
                            <input type={showApiKey?"text":"password"} value={apiKey} onChange={e => {setApiKey(e.target.value); sessionStorage.setItem('ai_api_key', e.target.value);}} placeholder="填入 API Key (VIP用户无需填写)" className="w-full bg-stone-50 border border-stone-300 p-3 rounded-xl text-sm font-sans focus:border-stone-950 outline-none shadow-inner font-black text-stone-950"/>
                            <button onClick={()=>setShowApiKey(!showApiKey)} className="absolute right-3 top-9 text-stone-400">{showApiKey?<EyeOff size={18}/>:<Eye size={18}/>}</button>
                        </div>
                    )}
                    <button onClick={handleAiAnalysisWrapper} disabled={loadingAi} className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all ${loadingAi ? 'bg-stone-100 text-stone-400' : 'bg-stone-900 text-white active:scale-95 shadow-lg'}`}>
                      {loadingAi ? <Activity className="animate-spin" size={20}/> : <BrainCircuit size={20}/>} {loadingAi ? '正在深度推演...' : '生成大师解盘报告'}
                    </button>
                 </div>
                 {aiReport && (
                     <div className="bg-white border border-stone-300 p-6 rounded-3xl space-y-4 shadow-sm animate-slide-up">
                         <div className="flex items-center gap-2 text-emerald-600 font-black border-b border-stone-100 pb-3"><Sparkles size={18}/> <span>本次生成结果</span></div>
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
