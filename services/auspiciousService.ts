
import { Solar } from 'lunar-javascript';
import { generateQimenJu, generateQimenJuBySolar } from './qimenService.ts';
import { analyzeQimenState, QM_AnalysisResult } from './qimenAnalysis.ts';
import { QM_AFFAIR_SYMBOLS, QM_SymbolKey, QM_IndustryKey, QM_INDUSTRIES } from './qimenAffairs.ts';
import { generateUserAdvice, QM_AdviceResult } from './qimenAdvice.ts';
import { QM_Ju, QM_Palace } from '../types.ts';

export type QM_AffairKey = keyof typeof QM_AFFAIR_SYMBOLS;

export interface AuspiciousResult {
  score: number;
  time: {
    start: Date;
    end: Date; // +2 hours
    label: string; // "Today 13:00-15:00 (Wei)"
    solarTerm: string; // JieQi
  };
  direction: {
    name: string; // "East"
    palaceIndex: number;
  };
  details: {
    patternName: string;
    tone: 'positive' | 'neutral' | 'negative';
    advice: string;
    warnings: string[];
    stars: string[]; // Key symbols found
    tags: string[];
  };
  // Technical details for debugging/advanced view
  chart: {
    juName: string;
    duns: string; // Yin/Yang + Number
  }
}

// Helper: Get Direction Name
const PALACE_DIRECTION_MAP: Record<number, string> = {
  1: '正北', 8: '东北', 3: '正东', 4: '东南',
  9: '正南', 2: '西南', 7: '正西', 6: '西北', 5: '中宫'
};

// Helper: Get Branch Time Range
const BRANCH_TIME_MAP: Record<string, string> = {
  'Zi': '23:00-01:00', 'Chou': '01:00-03:00', 'Yin': '03:00-05:00', 'Mao': '05:00-07:00',
  'Chen': '07:00-09:00', 'Si': '09:00-11:00', 'WuBranch': '11:00-13:00', 'Wei': '13:00-15:00',
  'Shen': '15:00-17:00', 'You': '17:00-19:00', 'Xu': '19:00-21:00', 'Hai': '21:00-23:00'
};

const BRANCH_NAME_MAP: Record<string, string> = {
  'Zi': '子', 'Chou': '丑', 'Yin': '寅', 'Mao': '卯',
  'Chen': '辰', 'Si': '巳', 'WuBranch': '午', 'Wei': '未',
  'Shen': '申', 'You': '酉', 'Xu': '戌', 'Hai': '亥'
};

/**
 * Main Engine: Find Auspicious Times and Directions
 */
export const findAuspiciousTimes = (
  affairKey: QM_AffairKey,
  rangeType: 'today' | 'three_days' | 'week' | 'custom',
  customDate?: Date,
  industry?: QM_IndustryKey
): AuspiciousResult[] => {
  const candidates: AuspiciousResult[] = [];
  
  // 1. Determine Time Range
  const now = new Date();
  let startDate = new Date(now);
  // Round to nearest even hour to align with Chinese hours (optional, but cleaner)
  // Actually, we should just start from "current hour" or "next hour".
  // Qimen changes every 2 hours (odd hours: 1, 3, 5...).
  // Let's iterate by checking every hour? No, charts are stable for 2 hours.
  // Better: Iterate by hours, convert to Solar -> generateQimenJu -> check unique charts.
  // Or simply iterate every 2 hours starting from specific anchor (e.g. 13:00).
  
  // Let's implement robust iteration:
  // Start from current time. Increment by 2 hours.
  
  let durationHours = 24;
  if (rangeType === 'three_days') durationHours = 24 * 3;
  if (rangeType === 'week') durationHours = 24 * 7;
  if (rangeType === 'custom' && customDate) {
    startDate = customDate;
    durationHours = 24; // Default to 1 day for custom date
  }

  const endTime = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);
  let currentTime = new Date(startDate);

  // Set to top of the hour to avoid minute drift
  currentTime.setMinutes(0, 0, 0);

  // We want to sample efficiently. Qimen charts change at odd hours (1, 3, 5...).
  // So if we sample at even hours (0, 2, 4...), we are safely in the middle of a double-hour.
  // Example: 13:00-15:00 is Wei. Sample at 14:00.
  // Adjust currentTime to next even hour if odd? 
  // Actually, standard Chinese time: Zi (23-1), Chou (1-3).
  // Change happens at 1, 3, 5, 7...
  // So 00:00 is Zi. 02:00 is Chou. 
  // If we increment by 2 hours starting from an EVEN hour, we get:
  // 00:00 (Zi), 02:00 (Chou), 04:00 (Yin)...
  // This covers all distinct charts.
  
  // If current time is 15:30 (Shen, 15-17). Next change at 17:00.
  // If we start at 15:30, we get Shen.
  // Then +2h = 17:30 (You).
  // This works.
  
  while (currentTime < endTime) {
    const solar = Solar.fromDate(currentTime);
    const ju = generateQimenJuBySolar(solar);
    
    // 2. Identify Use Spirit (Yong Shen)
    const affairConfig = QM_AFFAIR_SYMBOLS[affairKey];
    let symbols = affairConfig.primary;
    
    // Apply Industry Adaptation
    if (industry && affairConfig.industryAdaptation && affairConfig.industryAdaptation[industry]) {
       const adaptation = affairConfig.industryAdaptation[industry];
       if (adaptation.primary) {
         symbols = adaptation.primary;
       }
    }
    
    // We analyze the PRIMARY symbol. If multiple, we check all and pick the BEST one for this chart.
    // E.g. for "Investment", primary is ['Wu', 'ShengMen'].
    // We check both. If Wu is great (90) and ShengMen is bad (40), is the chart good?
    // Usually we want the *Structure* to be good.
    // Let's evaluate each symbol and take the MAX score as the potential of this chart.
    // Or average? Usually MAX is better (focus on the strongest aspect).
    
    for (const symbol of symbols) {
      // Find Palace
      const palace = findPalaceWithSymbol(ju, symbol as QM_SymbolKey);
      if (!palace) continue;

      // Analyze
      const analysis = analyzeQimenState(ju, palace, symbol as QM_SymbolKey, industry);
      
      // Filter Logic (Optimization)
      // 1. Minimum Score
      if (analysis.scores.total < 60) continue; 
      
      // 2. Critical Failures (Optional strict mode)
      // For "Optimization", we might want to hide bad results.
      // But maybe user wants "Best available even if bad".
      // Let's just rely on score sorting.
      
      // 3. Generate Advice/Details
      const advice = generateUserAdvice(analysis, ju, palace, symbol as QM_SymbolKey);
      
      // 4. Format Result
      const timeLabel = formatTimeLabel(currentTime, ju);
      
      // Check if we already have this time/direction combo (avoid duplicates if time step is small)
      // Our time step is 2h, so likely distinct.
      
      candidates.push({
        score: analysis.scores.total,
        time: {
          start: new Date(currentTime), // Snapshot
          end: new Date(currentTime.getTime() + 2 * 60 * 60 * 1000), // Approx
          label: timeLabel,
          solarTerm: ju.jieQi
        },
        direction: {
          name: PALACE_DIRECTION_MAP[palace.index],
          palaceIndex: palace.index
        },
        details: {
          patternName: analysis.scores.pattern > 10 ? '吉格' : '一般', // Simplified
          tone: advice.tone,
          advice: advice.content,
          warnings: extractWarnings(analysis, palace),
          stars: [symbol],
          tags: advice.tags
        },
        chart: {
          juName: ju.juName,
          duns: `${ju.yinYang}${ju.juNumber}局`
        }
      });
    }
    
    // Increment Time (2 Hours)
    currentTime = new Date(currentTime.getTime() + 2 * 60 * 60 * 1000);
  }
  
  // 3. Sort and Return Top N
  // Sort descending by score
  candidates.sort((a, b) => b.score - a.score);
  
  // Deduplicate: If same time period has multiple good symbols, keep the best one.
  // Use time label as key.
  const uniqueCandidates: AuspiciousResult[] = [];
  const seenTimes = new Set<string>();
  
  for (const cand of candidates) {
    if (!seenTimes.has(cand.time.label)) {
      uniqueCandidates.push(cand);
      seenTimes.add(cand.time.label);
    }
  }
  
  return uniqueCandidates.slice(0, 5); // Return Top 5
};

// --- Helpers ---

const findPalaceWithSymbol = (ju: QM_Ju, symbol: QM_SymbolKey): QM_Palace | undefined => {
  // Check special keys
  if (symbol === 'RiGan') {
    const dayGan = ju.pillars[2].gan;
    // Find palace where Heaven Stem is Day Gan
    return ju.palaces.find(p => p.heavenStem === dayGan);
  }
  if (symbol === 'ShiGan') {
    const timeGan = ju.pillars[3].gan;
    return ju.palaces.find(p => p.heavenStem === timeGan);
  }

  // Normal Symbols
  for (const p of ju.palaces) {
    if (p.heavenStem === symbol) return p; // Stem (Heaven)
    if (p.door.name === symbol) return p;
    if (p.star.name === symbol) return p;
    if (p.deity.name === symbol) return p;
    
    // Handle aliases like 'JingMen2', 'JingMen_Li'
    if (symbol.startsWith('JingMen') && p.door.name === 'JingMen') return p;
  }
  return undefined;
};

const formatTimeLabel = (date: Date, ju: QM_Ju): string => {
  const hourBranch = ju.pillars[3].zhi;
  const timeRange = BRANCH_TIME_MAP[hourBranch];
  const branchName = BRANCH_NAME_MAP[hourBranch] || hourBranch;
  
  // Format Date: "Today" or "MM-DD"
  const now = new Date();
  const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth();
  const dateStr = isToday ? '今天' : `${date.getMonth() + 1}月${date.getDate()}日`;
  
  return `${dateStr} ${timeRange} (${branchName}时)`;
};

const extractWarnings = (analysis: QM_AnalysisResult, palace: QM_Palace): string[] => {
  const warnings: string[] = [];
  if (analysis.state.isKongWang) warnings.push('空亡');
  if (analysis.state.isRuMu) warnings.push('入墓');
  if (analysis.state.isJiXing) warnings.push('击刑');
  if (palace.deity.name === 'BaiHu') warnings.push('白虎');
  if (palace.deity.name === 'XuanWu') warnings.push('玄武');
  return warnings;
};
