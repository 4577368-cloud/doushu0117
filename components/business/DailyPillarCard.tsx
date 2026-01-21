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
    
    // Hidden Stems (Cang Gan)
    const zhiHideGan = LunarUtil.ZHI_HIDE_GAN[dayZhi] || [];
    
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
      kongWang
    };
  }, [chart]);

  return (
    <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden mb-3">
      {/* Header */}
      <div className="bg-stone-50/80 px-3 py-2 border-b border-stone-100 flex items-center justify-between">
         <div className="flex items-center gap-1.5">
            <Compass size={13} className="text-stone-500" />
            <span className="text-xs font-bold text-stone-700">今日气场 · {data.date}</span>
         </div>
         <div className="flex gap-2">
             <span className="text-[10px] text-stone-400 font-medium">
                {data.zhiXing}日
             </span>
         </div>
      </div>

      <div className="p-3 space-y-3">
         {/* Main Pillar - Black Gold Style like CoreInfoCard */}
         <div className="bg-[#1c1917] border border-amber-900/40 rounded-xl p-3 shadow-sm flex items-center justify-between relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute -right-4 -top-4 text-amber-900/10 rotate-12 select-none pointer-events-none">
                <Compass size={80} />
            </div>

            {/* Left: GanZhi */}
            <div className="flex items-baseline gap-2 z-10">
                <span className="text-3xl font-black text-amber-300 tracking-widest font-serif leading-none">
                    {data.ganZhi}
                </span>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-900/50">
                    {data.naYin}
                </span>
            </div>

            {/* Right: Hidden Stems */}
            <div className="flex flex-col items-end gap-1 z-10">
                <span className="text-[9px] text-amber-500/60 font-medium uppercase tracking-wider">
                    地支藏干
                </span>
                <div className="flex gap-1">
                    {data.zhiHideGan.map((gan: string, idx: number) => (
                        <span key={idx} className="text-[11px] font-bold text-amber-200/90">
                            {gan}
                        </span>
                    ))}
                </div>
            </div>
         </div>

         {/* Compact Details Row */}
         <div className="flex flex-col gap-2">
            {/* Shen Sha & Kong Wang */}
            <div className="flex items-start gap-2 text-[11px]">
                <div className="shrink-0 mt-0.5 text-stone-400">
                    <Sparkles size={12} />
                </div>
                <div className="flex-1 flex flex-wrap gap-1.5">
                    {data.shenSha.length > 0 ? (
                        data.shenSha.map((sha, idx) => (
                            <span key={idx} className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-medium border border-amber-100">
                                {sha}
                            </span>
                        ))
                    ) : (
                        <span className="text-stone-400 text-[10px]">今日无特殊神煞</span>
                    )}
                    {/* Kong Wang */}
                     <span className="text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded text-[10px] border border-stone-200">
                        空亡: {data.kongWang}
                    </span>
                </div>
            </div>

            {/* Star Luck */}
            <div className="flex items-center gap-2 text-[11px] border-t border-stone-50 pt-2 mt-1">
                <div className="shrink-0 text-stone-400">
                    <Star size={12} />
                </div>
                <div className="flex-1 flex justify-between items-center">
                    <span className="text-stone-600">
                        <span className="text-stone-400 mr-1">星宿:</span>
                        {data.xiu}
                    </span>
                    <span className="text-stone-600">
                        <span className="text-stone-400 mr-1">建除:</span>
                        {data.zhiXing}日
                    </span>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};
