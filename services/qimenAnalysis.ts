import { QM_Ju, QM_Palace, QM_ElementType } from '../types';
import { QM_SymbolKey, QM_IndustryKey } from './qimenAffairs';
import { QM_GAN_ELEMENTS, QM_ZHI_DATA, QM_NAMES_MAP, QM_STATE_MAP } from './qimenConstants';
import { analyzePalacePatterns } from './qimenPatterns';

// --- Constants ---

const INDUSTRY_PRIORITY_MAP: Partial<Record<QM_IndustryKey, string[]>> = {
  '电商': ['JingMen', 'JingMen_Li', 'JingMen_Jing'],
  '跨境电商': ['JingMen', 'JingMen_Li', 'JingMen_Jing', 'KaiMen'],
  '物流': ['ShangMen', 'TianPeng'],
  '金融': ['KaiMen', 'Wu', 'ShengMen'],
  '政府公务': ['KaiMen', 'ZhiFu'],
};

// 1. Solar Term to Season Element Mapping
// Spring (Wood): LiChun ~ GuYu
// Summer (Fire): LiXia ~ DaShu
// Autumn (Metal): LiQiu ~ ShuangJiang
// Winter (Water): LiDong ~ DaHan
// Earth: Last 18 days of each season (Simplified: mapped to specific terms or handled by detailed logic)
// For Qimen, usually we use the season of the month/JieQi.
const JIEQI_ELEMENT_MAP: Record<string, QM_ElementType> = {
  '立春': '木', '雨水': '木', '惊蛰': '木', '春分': '木', '清明': '土', '谷雨': '土', // Spring
  '立夏': '火', '小满': '火', '芒种': '火', '夏至': '火', '小暑': '土', '大暑': '土', // Summer
  '立秋': '金', '处暑': '金', '白露': '金', '秋分': '金', '寒露': '土', '霜降': '土', // Autumn
  '立冬': '水', '小雪': '水', '大雪': '水', '冬至': '水', '小寒': '土', '大寒': '土', // Winter
};

// 2. 10 Stems Life Stages (Simplified for RuMu/Mu)
// Only need 'Mu' (Grave) for now, but good to have the logic.
// Order: ZhangSheng, MuYu, GuanDai, LinGuan, DiWang, Shuai, Bing, Si, Mu, Jue, Tai, Yang
// Branch Order: Zi(0) ... Hai(11)
const STEM_LIFE_STAGES: Record<string, number> = {
  'Jia': 11, // ZhangSheng at Hai(11)
  'Yi': 6,   // ZhangSheng at Wu(6)
  'Bing': 2, // ZhangSheng at Yin(2)
  'Ding': 9, // ZhangSheng at You(9)
  'Wu': 2,   // Same as Bing
  'Ji': 9,   // Same as Ding
  'Geng': 5, // ZhangSheng at Si(5)
  'Xin': 0,  // ZhangSheng at Zi(0)
  'Ren': 8,  // ZhangSheng at Shen(8)
  'Gui': 3,  // ZhangSheng at Mao(3)
};
const LIFE_STAGE_NAMES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];

// 3. Ji Xing (Punishment)
// JiaZiWu -> Zhen(3) (Zi Mao Xing)
// JiaXuJi -> Kun(2) (Xu Wei Xing)
// JiaShenGeng -> Gen(8) (Shen Yin Xing)
// JiaWuXin -> Li(9) (Wu Wu Xing)
// JiaChenRen -> Xun(4) (Chen Chen Xing)
// JiaYinGui -> Dui(7) (Yin Si Xing - actually Shen-Yin-Si)
// More commonly:
// Geng in Gen(8), Xin in Xun(4), Ren in Kun(2), Gui in Kan(1), Wu in Zhen(3), Ji in Kun(2)
// Let's use standard Qimen Ji Xing:
// Wu (JiaZi) -> Zhen (3) (Zi Mao)
// Geng (JiaShen) -> Gen (8) (Shen Yin)
// Ji (JiaXu) -> Kun (2) (Xu Wei)
// Gui (JiaYin) -> Xun (4) (Yin Si? No, Gui is JiaYin, usually at Xun 4 is Xing?) 
// Wait, strictly:
// Jia Zi (Wu) in Mao (Zhen 3)
// Jia Xu (Ji) in Wei (Kun 2)
// Jia Shen (Geng) in Yin (Gen 8)
// Jia Wu (Xin) in Wu (Li 9)
// Jia Chen (Ren) in Chen (Xun 4)
// Jia Yin (Gui) in Si (Xun 4) ?
// Let's stick to the mapping:
const JI_XING_MAP: Record<string, number[]> = {
  'Wu': [3], // Jia Zi Wu in Zhen(3)
  'Ji': [2], // Jia Xu Ji in Kun(2)
  'Geng': [8], // Jia Shen Geng in Gen(8)
  'Xin': [9], // Jia Wu Xin in Li(9)
  'Ren': [4], // Jia Chen Ren in Xun(4)
  'Gui': [4], // Jia Yin Gui in Xun(4) - note: standard might vary, using common
};

// --- Helpers ---

export const getSeasonElement = (jieQi: string): QM_ElementType => {
  return JIEQI_ELEMENT_MAP[jieQi] || '土';
};

/**
 * Calculate Wang/Xiang/Xiu/Qiu/Si
 * @param element Palace or Star/Door Element
 * @param seasonElement Current Season Element
 */
export const getElementState = (element: QM_ElementType, seasonElement: QM_ElementType): 'Wang' | 'Xiang' | 'Xiu' | 'Qiu' | 'SiState' => {
  if (element === seasonElement) return 'Wang';
  
  const genMap: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
  // Season generates Element -> Xiang (Wait, usually: Element generates Season = Xiu? No)
  // Standard:
  // Wang: Same
  // Xiang: Season generates Element (Mother -> Child? No, usually Child -> Mother is Xiang in Bazi, but in Qimen:
  // "Me generates Season" is Xiu.
  // "Season generates Me" is Xiang.
  // "Me overcomes Season" is Qiu.
  // "Season overcomes Me" is Si.
  // Let's verify:
  // Spring (Wood): Wood(Wang), Fire(Xiang - Wood gens Fire), Water(Xiu - Water gens Wood? No wait)
  // Let's re-verify Qimen standard.
  // Spring Wood: Wood Wang, Fire Xiang, Water Xiu, Earth Si, Metal Qiu.
  // Logic:
  // Same = Wang.
  // I generate = Xiang. (Wood generates Fire -> Fire is Xiang in Spring? No, Wood is Wang.)
  // Wait, "In Spring, Wood is Wang, Fire is Xiang". Yes. So Season generates Target? No, Season (Wood) generates Fire. So if Season generates Element, Element is Xiang.
  // "Water is Xiu". Water generates Wood (Season). So if Element generates Season, Element is Xiu.
  // "Earth is Si". Wood (Season) overcomes Earth. So if Season overcomes Element, Element is Si.
  // "Metal is Qiu". Metal overcomes Wood (Season). So if Element overcomes Season, Element is Qiu.
  
  if (genMap[seasonElement] === element) return 'Xiang'; // Season gens Element
  if (genMap[element] === seasonElement) return 'Xiu';   // Element gens Season
  
  const overMap: Record<string, string> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };
  if (overMap[seasonElement] === element) return 'SiState'; // Season overcomes Element
  if (overMap[element] === seasonElement) return 'Qiu';     // Element overcomes Season
  
  return 'Wang'; // Fallback
};

/**
 * Calculate 12 Life Stage
 * @param stem Heaven Stem
 * @param branchIndex Earth Branch Index (0=Zi, 1=Chou...)
 * @returns Stage Name
 */
export const getLifeStage = (stem: string, branchIndex: number): string => {
  if (!STEM_LIFE_STAGES.hasOwnProperty(stem)) return '';
  
  const startIdx = STEM_LIFE_STAGES[stem];
  // Yang Stems forward, Yin Stems backward?
  // Qimen usually uses "Yang forwarding" for all? Or strictly by Stem polarity?
  // Bazi uses Yin/Yang different directions. Qimen often simplifies to "Shi Gan Ke Yin" (Ten Stems restrain Yin) 
  // or uses standard Bazi 12 stages.
  // Let's use standard Bazi 12 stages with polarity.
  const isYang = ['Jia', 'Bing', 'Wu', 'Geng', 'Ren'].includes(stem);
  
  let stageIdx;
  if (isYang) {
    stageIdx = (branchIndex - startIdx + 12) % 12;
  } else {
    stageIdx = (startIdx - branchIndex + 12) % 12;
  }
  
  return LIFE_STAGE_NAMES[stageIdx];
};

/**
 * Check Kong Wang (Empty)
 * @param dayGan Day Stem
 * @param dayZhi Day Branch
 * @param palaceIndex Palace Index (1-9)
 */
export const checkKongWang = (dayGan: string, dayZhi: string, palaceIndex: number): boolean => {
  // 1. Calculate Xun Shou (Head of 10-day week)
  const ganMap: Record<string, number> = { 'Jia': 0, 'Yi': 1, 'Bing': 2, 'Ding': 3, 'Wu': 4, 'Ji': 5, 'Geng': 6, 'Xin': 7, 'Ren': 8, 'Gui': 9 };
  const zhiMap: Record<string, number> = { 'Zi': 0, 'Chou': 1, 'Yin': 2, 'Mao': 3, 'Chen': 4, 'Si': 5, 'WuBranch': 6, 'Wei': 7, 'Shen': 8, 'You': 9, 'Xu': 10, 'Hai': 11 };
  
  const gIdx = ganMap[dayGan];
  const zIdx = zhiMap[dayZhi];
  
  // Xun Shou Zhi = (Zhi - Gan)
  const diff = (zIdx - gIdx + 12) % 12; // 0=Zi(JiaZi), 10=Xu(JiaXu), 8=Shen...
  
  // Empty Branches are the two before the Xun Shou
  // JiaZi(0) -> Xu(10), Hai(11)
  // JiaXu(10) -> Shen(8), You(9)
  // Formula: (diff - 2 + 12) % 12 and (diff - 1 + 12) % 12
  const empty1 = (diff - 2 + 12) % 12;
  const empty2 = (diff - 1 + 12) % 12;
  
  // 2. Check if Palace contains these branches
  // Palace Branches:
  // 1(Kan): Zi(0)
  // 8(Gen): Chou(1), Yin(2)
  // 3(Zhen): Mao(3)
  // 4(Xun): Chen(4), Si(5)
  // 9(Li): Wu(6)
  // 2(Kun): Wei(7), Shen(8)
  // 7(Dui): You(9)
  // 6(Qian): Xu(10), Hai(11)
  
  const palaceBranchesMap: Record<number, number[]> = {
    1: [0],
    8: [1, 2],
    3: [3],
    4: [4, 5],
    9: [6],
    2: [7, 8],
    7: [9],
    6: [10, 11]
  };
  
  const branches = palaceBranchesMap[palaceIndex] || [];
  return branches.includes(empty1) || branches.includes(empty2);
};

// --- Main Analysis Logic ---

export interface QM_AnalysisResult {
  state: {
    wuxing: 'Wang' | 'Xiang' | 'Xiu' | 'Qiu' | 'SiState';
    isKongWang: boolean;
    isRuMu: boolean;
    isJiXing: boolean;
    lifeStage: string;
  };
  relationWithDay: {
    type: 'Sheng' | 'Ke' | 'BiHe';
    direction: 'In' | 'Out' | 'None'; // In: Day gens Symbol (Good for support), Out: Day overcomes Symbol (Control)
    description: string;
  };
  scores: {
    total: number;
    pattern: number;
    state: number;
    relation: number;
  };
}

export const analyzeQimenState = (
  ju: QM_Ju,
  palace: QM_Palace,
  symbol: QM_SymbolKey,
  industry?: QM_IndustryKey
): QM_AnalysisResult => {
  // 1. Basic Info
  const seasonEl = getSeasonElement(ju.juName.split('(')[1]?.slice(0, 2) || '冬至'); // Hacky parse, usually passed in
  const palaceEl = palace.element;
  const dayGan = ju.pillars[2].gan;
  const dayZhi = ju.pillars[2].zhi; // Key (e.g. 'Zi')
  
  // 2. State Evaluation
  
  // Resolve Target Element for Wuxing State
  // If symbol is Door/Star, use its element.
  // If symbol is Stem, use its element.
  let targetElementForState = palaceEl; // Default to Palace Element if not found
  
  if (QM_GAN_ELEMENTS[symbol]) {
    targetElementForState = QM_GAN_ELEMENTS[symbol];
  } else if (symbol === palace.door.name) {
    targetElementForState = palace.door.element;
  } else if (symbol === palace.star.name) {
    targetElementForState = palace.star.element;
  } else if (symbol === palace.deity.name) {
    targetElementForState = palace.deity.element;
  }

  // Wuxing State (Wang Xiang...)
  // Note: For Stems, we usually use 12 Life Stages.
  // For Doors/Stars/Palaces, we use Wang Xiang.
  // We calculate Wang Xiang for the *Target Element* vs Season.
  const wuxingState = getElementState(targetElementForState, seasonEl);
  
  // Kong Wang
  const isKW = checkKongWang(dayGan, dayZhi, palace.index);
  
  // Life Stage & Ru Mu
  // Need to find which Stem we are evaluating. 
  // If symbol is a Stem (e.g. 'Yi'), use it.
  // If symbol is a Door/Star, use the Palace Heaven Stem? Or the Element?
  // Usually Life Stage is for STEMS.
  // If analyzing a Door, we look at its Attribute Element vs Palace Branch?
  // Let's focus on Stem for RuMu. If symbol is not stem, use Heaven Stem of palace.
  const targetStem = ['Jia', 'Yi', 'Bing', 'Ding', 'Wu', 'Ji', 'Geng', 'Xin', 'Ren', 'Gui'].includes(symbol) 
    ? symbol 
    : palace.heavenStem;
    
  // Get Palace Branches (for Life Stage)
  // Simplified: Use the first branch of the palace or main Qi
  const palaceBranchIdx = {
    1: 0, // Zi
    8: 2, // Yin (Main?) or Chou? Gen is Earth. Let's use the one that causes RuMu/ZhangSheng.
          // Actually, check ALL branches in palace.
    3: 3, // Mao
    4: 5, // Si (Main?) or Chen?
    9: 6, // Wu
    2: 8, // Shen (Main?) or Wei?
    7: 9, // You
    6: 10 // Xu (Main?) or Hai?
  }[palace.index] || 0;
  
  // Better: Check if ANY branch in palace causes RuMu
  const palaceBranchesMap: Record<number, number[]> = {
    1: [0], 8: [1, 2], 3: [3], 4: [4, 5], 9: [6], 2: [7, 8], 7: [9], 6: [10, 11]
  };
  const pBranches = palaceBranchesMap[palace.index] || [];
  
  let lifeStage = '';
  let isRuMu = false;
  
  // Check each branch, if any is Mu, set RuMu
  for (const bIdx of pBranches) {
    const stage = getLifeStage(targetStem, bIdx);
    if (stage === '墓') isRuMu = true;
    // Keep the "strongest" or first stage for display? 
    // Let's just use the first one for label unless Mu found.
    if (!lifeStage) lifeStage = stage;
    if (stage === '墓') lifeStage = '墓'; 
  }
  
  // Ji Xing
  const isJiXing = JI_XING_MAP[targetStem]?.includes(palace.index) || false;
  
  // 3. Relation with Day Stem
  const dayEl = QM_GAN_ELEMENTS[dayGan];
  const targetEl = targetElementForState; // Use the resolved element
  
  let relationType: 'Sheng' | 'Ke' | 'BiHe' = 'BiHe';
  let direction: 'In' | 'Out' | 'None' = 'None';
  let relDesc = '';
  
  const genMap: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
  const overMap: Record<string, string> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };
  
  if (dayEl === targetEl) {
    relationType = 'BiHe';
    relDesc = '比和 (同气连枝)';
  } else if (genMap[dayEl] === targetEl) {
    relationType = 'Sheng';
    direction = 'Out'; // Day generates Target
    relDesc = '我生之 (需付出)';
  } else if (genMap[targetEl] === dayEl) {
    relationType = 'Sheng';
    direction = 'In'; // Target generates Day
    relDesc = '生我 (得助力)';
  } else if (overMap[dayEl] === targetEl) {
    relationType = 'Ke';
    direction = 'Out'; // Day overcomes Target
    relDesc = '我克之 (可掌控)';
  } else if (overMap[targetEl] === dayEl) {
    relationType = 'Ke';
    direction = 'In'; // Target overcomes Day
    relDesc = '克我 (压力大)';
  }
  
  // 4. Scoring
  let scoreState = QM_STATE_MAP[wuxingState]?.score || 50;
  if (isKW) scoreState -= 25;
  if (isRuMu) scoreState -= 20;
  if (isJiXing) scoreState -= 15;

  // Industry Bonus
  let scoreIndustry = 0;
  if (industry && INDUSTRY_PRIORITY_MAP[industry]?.includes(symbol)) {
    scoreIndustry = 20; // Bonus for industry-relevant symbol
  }
  
  let scoreRel = 0;
  if (relationType === 'Sheng' && direction === 'In') scoreRel = 20; // Best: Target helps me
  if (relationType === 'BiHe') scoreRel = 10;
  if (relationType === 'Ke' && direction === 'Out') scoreRel = 5; // I control it
  if (relationType === 'Sheng' && direction === 'Out') scoreRel = -5; // I feed it (tired)
  if (relationType === 'Ke' && direction === 'In') scoreRel = -20; // It hits me (bad)
  
  // Pattern Score
  const patterns = analyzePalacePatterns(palace, ju);
  let scorePattern = 0;
  patterns.forEach(pat => {
    if (pat.type === '吉') scorePattern += 30;
    if (pat.type === '凶') scorePattern -= 40;
    // Neutral or Special might be 0
  });
  
  return {
    state: {
      wuxing: wuxingState,
      isKongWang: isKW,
      isRuMu,
      isJiXing,
      lifeStage
    },
    relationWithDay: {
      type: relationType,
      direction,
      description: relDesc
    },
    scores: {
      total: scoreState + scoreRel + scorePattern + scoreIndustry,
      pattern: scorePattern,
      state: scoreState,
      relation: scoreRel
    }
  };
};
