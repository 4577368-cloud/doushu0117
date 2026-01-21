import React, { useMemo } from 'react';
import { Solar, LunarUtil } from 'lunar-javascript';
import { Compass, Sparkles, Layers, Star } from 'lucide-react';
import { BaziChart } from '../../types';
import { getShenShaForDynamicPillar } from '../../services/baziService';

const XIU_ANIMALS: Record<string, string> = {
  '角': '蛟', '亢': '龙', '氐': '貉', '房': '兔', '心': '狐', '尾': '虎', '箕': '豹',
  '斗': '獬', '牛': '牛', '女': '蝠', '虚': '鼠', '危': '燕', '室': '猪', '壁': '貐',
  '奎': '狼', '娄': '狗', '胃': '雉', '昴': '鸡', '毕': '乌', '觜': '猴', '参': '猿',
  '井': '犴', '鬼': '羊', '柳': '獐', '星': '马', '张': '鹿', '翼': '蛇', '轸': '蚓'
};

const GAN_ELEMENTS: Record<string, string> = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水'
};

const HIDDEN_STEMS_MAP: Record<string, { gan: string, type: string }[]> = {
  '子': [{ gan: '癸', type: '本气' }],
  '丑': [{ gan: '己', type: '本气' }, { gan: '癸', type: '中气' }, { gan: '辛', type: '余气' }],
  '寅': [{ gan: '甲', type: '本气' }, { gan: '丙', type: '中气' }, { gan: '戊', type: '余气' }],
  '卯': [{ gan: '乙', type: '本气' }],
  '辰': [{ gan: '戊', type: '本气' }, { gan: '乙', type: '中气' }, { gan: '癸', type: '余气' }],
  '巳': [{ gan: '丙', type: '本气' }, { gan: '庚', type: '中气' }, { gan: '戊', type: '余气' }],
  '午': [{ gan: '丁', type: '本气' }, { gan: '己', type: '中气' }],
  '未': [{ gan: '己', type: '本气' }, { gan: '丁', type: '中气' }, { gan: '乙', type: '余气' }],
  '申': [{ gan: '庚', type: '本气' }, { gan: '壬', type: '中气' }, { gan: '戊', type: '余气' }],
  '酉': [{ gan: '辛', type: '本气' }],
  '戌': [{ gan: '戊', type: '本气' }, { gan: '辛', type: '中气' }, { gan: '丁', type: '余气' }],
  '亥': [{ gan: '壬', type: '本气' }, { gan: '甲', type: '中气' }]
};

const STAGE_NAMES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
const LIFE_STAGES: Record<string, string[]> = {
  '甲': ['亥', '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌'],
  '乙': ['午', '巳', '辰', '卯', '寅', '丑', '子', '亥', '戌', '酉', '申', '未'],
  '丙': ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'],
  '丁': ['酉', '申', '未', '午', '巳', '辰', '卯', '寅', '丑', '子', '亥', '戌'],
  '戊': ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'],
  '己': ['酉', '申', '未', '午', '巳', '辰', '卯', '寅', '丑', '子', '亥', '戌'],
  '庚': ['巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑', '寅', '卯', '辰'],
  '辛': ['子', '亥', '戌', '酉', '申', '未', '午', '巳', '辰', '卯', '寅', '丑'],
  '壬': ['申', '酉', '戌', '亥', '子', '丑', '寅', '卯', '辰', '巳', '午', '未'],
  '癸': ['卯', '寅', '丑', '子', '亥', '戌', '酉', '申', '未', '午', '巳', '辰']
};

const PENGZU_EXPLANATIONS: Record<string, string> = {
  '甲': '宜守成待机，审慎理财，避免盲目扩张或大额投资。',
  '乙': '今日宜稳中求进，顺应时势，避免急于求成。',
  '丙': '宜安居静养，关注居家安全，避免大兴土木或变动环境。',
  '丁': '宜修身养性，内省自察，避免浮躁冲动或过度修饰。',
  '戊': '宜脚踏实地，夯实基础，避免置产交易或因贪失利。',
  '己': '宜诚信为本，恪守契约，避免签署重要文件或大额交易。',
  '庚': '宜循序渐进，梳理脉络，避免操之过急或处理复杂关系。',
  '辛': '宜调和身心，保持平和，避免过激反应或积郁成疾。',
  '壬': '宜顺势而为，疏堵结合，避免强行阻拦或激化矛盾。',
  '癸': '宜以和为贵，通过沟通解决，避免陷入争端或官非口舌。',
  '子': '宜自信自强，相信直觉，避免迷信盲从或优柔寡断。',
  '丑': '宜低调内敛，韬光养晦，避免张扬炫耀或强出风头。',
  '寅': '宜诚心正意，专注当下，避免心神不宁或形式主义。',
  '卯': '宜开源节流，保护资源，避免竭泽而渔或盲目开发。',
  '辰': '宜保持乐观，积极向上，避免情绪失控或悲观消极。',
  '巳': '宜安居乐业，立足当下，避免长途奔波或冒险远行。',
  '午': '宜居安思危，巩固现状，避免变动住所或草率行事。',
  '未': '宜自然疗愈，强身健体，避免滥用药物或过度依赖。',
  '申': '宜起居有序，调整作息，避免变动寝居或生活紊乱。',
  '酉': '宜独处静思，修身养性，避免无效社交或是非口舌。',
  '戌': '宜平和待人，心存慈悲，避免暴躁易怒或伤害他人。',
  '亥': '宜慎重情感，理智对待，避免草率结合或情感冲动。'
};

const getLifeStage = (gan: string, zhi: string): string => {
  const zhiList = LIFE_STAGES[gan];
  if (!zhiList) return '';
  const index = zhiList.indexOf(zhi);
  return index !== -1 ? STAGE_NAMES[index] : '';
};

interface DailyPillarCardProps {
  chart?: BaziChart;
}

export const DailyPillarCard: React.FC<DailyPillarCardProps> = ({ chart }) => {
  const data = useMemo(() => {
    const now = new Date();
    const solar = Solar.fromDate(now);
    const lunar = solar.getLunar();
    const bazi = lunar.getEightChar();
    bazi.setSect(1); // Standard Bazi

    const dayGan = bazi.getDayGan();
    const dayZhi = bazi.getDayZhi();
    const ganZhi = `${dayGan}${dayZhi}`;
    const naYin = bazi.getDayNaYin();
    
    // Hidden Stems (Cang Gan) - Detailed
    const zhiHideGan = (HIDDEN_STEMS_MAP[dayZhi] || []).map(item => ({
      ...item,
      element: GAN_ELEMENTS[item.gan] || ''
    }));
    
    // Shen Sha (Personalized if chart exists)
    let shenSha: string[] = [];
    if (chart) {
      try {
        shenSha = getShenShaForDynamicPillar(dayGan, dayZhi, chart);
      } catch (e) {
        console.error("Error calculating ShenSha:", e);
      }
    }

    // Star Luck (Xiu and Zhi Xing)
    const xiu = lunar.getXiu(); // 28 Mansions
    const xiuAnimal = XIU_ANIMALS[xiu] || '';
    const xiuLuck = lunar.getXiuLuck(); // Luck of the mansion
    const zhiXing = lunar.getZhiXing(); // 12 Duty Stars (Jian Chu)

    // Kong Wang (Day)
    const kongWang = bazi.getDayXunKong();

    // Peng Zu Bai Ji
    const pengZu = lunar.getPengZuGan();
    const pengZuKey = dayGan; // Usually based on Day Gan
    const pengZuExplanation = PENGZU_EXPLANATIONS[pengZuKey] || '';

    // God Positions
    const caiShen = lunar.getPositionCai();

    // Self Life Stage (if chart exists)
    let selfLifeStage = '';
    if (chart && chart.dayMaster) {
      selfLifeStage = getLifeStage(chart.dayMaster, dayZhi);
    }

    return {
      date: `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`,
      ganZhi,
      dayGan,
      dayZhi,
      naYin,
      zhiHideGan,
      shenSha,
      xiu: `${xiu}${xiuAnimal}${xiuLuck}`,
      zhiXing,
      kongWang,
      pengZu,
      pengZuExplanation,
      caiShen,
      selfLifeStage
    };
  }, [chart]);

  return (
    <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden mb-3">
      {/* Header - Extremely Compact */}
      <div className="bg-stone-50/80 px-3 py-1.5 border-b border-stone-100 flex items-center justify-between">
         <div className="flex items-center gap-1.5">
            <Compass size={12} className="text-stone-500" />
            <span className="text-[11px] font-bold text-stone-700">今日气场 · {data.date}</span>
         </div>
         <div className="flex items-center gap-2">
            <span className="text-[10px] text-amber-600 font-medium">
               财神{data.caiShen}
            </span>
            <span className="text-[10px] text-stone-400 font-medium bg-stone-100 px-1.5 rounded-sm">
               {data.zhiXing}日
            </span>
         </div>
      </div>

      <div className="p-2 space-y-2">
         {/* Main Pillar - Black Gold Style - Compressed */}
         <div className="bg-[#1c1917] border border-amber-900/40 rounded-lg px-3 py-2.5 shadow-sm flex items-center justify-between relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute -right-2 -top-4 text-amber-900/10 rotate-12 select-none pointer-events-none">
                <Compass size={60} />
            </div>

            {/* Left: GanZhi & NaYin */}
            <div className="flex items-center gap-2 z-10">
                <span className="text-2xl font-black text-amber-300 tracking-widest font-serif leading-none">
                    {data.ganZhi}
                </span>
                <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold text-amber-600 bg-amber-950/50 px-1 py-px rounded border border-amber-900/50 leading-none">
                        {data.naYin}
                    </span>
                    <span className="text-[9px] text-stone-500 text-center leading-none">
                       {data.kongWang}空
                    </span>
                </div>
            </div>

            {/* Right: Hidden Stems & Self Stage */}
             <div className="flex flex-col items-end gap-1 z-10">
                 {data.selfLifeStage && (
                     <span className="text-[10px] font-bold text-amber-100 bg-amber-800/40 px-1.5 py-0.5 rounded border border-amber-500/30">
                         日主{data.selfLifeStage}
                     </span>
                 )}
                 <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-amber-500/40 font-medium uppercase tracking-wider scale-90 shrink-0">
                          藏干
                      </span>
                     <div className="flex items-center gap-1">
                        {data.zhiHideGan.map((item: any, idx: number) => (
                            <span key={idx} className="text-[10px] font-medium text-amber-200/90 bg-amber-900/20 px-1.5 py-0.5 rounded-sm whitespace-nowrap">
                                {item.gan}{item.element} <span className="opacity-60 text-[9px] font-normal scale-90 inline-block">({item.type})</span>
                            </span>
                        ))}
                    </div>
                 </div>
             </div>
         </div>

         {/* Ultra Compact Details Row */}
         <div className="flex flex-col gap-1.5 px-0.5">
            <div className="flex items-center gap-2 text-[10px]">
                {/* Shen Sha */}
                <div className="flex-1 flex flex-wrap gap-1 items-center">
                    <div className="shrink-0 text-amber-500/80">
                        <Sparkles size={10} />
                    </div>
                    {data.shenSha.length > 0 ? (
                        data.shenSha.map((sha, idx) => (
                            <span key={idx} className="text-stone-600 font-medium">
                                {sha}
                            </span>
                        ))
                    ) : (
                        <span className="text-stone-300">无特殊神煞</span>
                    )}
                </div>

                {/* Vertical Divider */}
                <div className="w-px h-3 bg-stone-200 shrink-0"></div>

                {/* Star Luck */}
                <div className="flex items-center gap-1.5 shrink-0 text-stone-500">
                    <div className="flex items-center gap-1">
                        <Star size={10} className="text-stone-400" />
                        <span>{data.xiu}</span>
                    </div>
                </div>
            </div>
            
            {/* Peng Zu Bai Ji */}
             <div className="flex items-center gap-2 text-[9px] text-stone-400 border-t border-stone-100 pt-1.5">
                 <span className="shrink-0 bg-stone-100 text-stone-500 px-1 rounded">彭祖</span>
                 <span className="truncate">
                    {data.pengZu}
                    {data.pengZuExplanation && <span className="text-stone-300 ml-1">({data.pengZuExplanation})</span>}
                 </span>
             </div>
         </div>
      </div>
    </div>
  );
};
