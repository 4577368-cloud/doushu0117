import { QM_Ju, QM_Pillar, QM_Palace, QM_ElementType, UserProfile } from '../types';
import { QM_ZHI_DATA, QM_PALACE_INFO, QM_GAN_ELEMENTS, QM_NAMES_MAP, QM_JIEQI_DATA, QM_CHINESE_TO_KEY } from './qimenConstants';
import { Solar, Lunar } from 'lunar-javascript';

const GANS = ['Jia', 'Yi', 'Bing', 'Ding', 'Wu', 'Ji', 'Geng', 'Xin', 'Ren', 'Gui'];
const ZHIS = ['Zi', 'Chou', 'Yin', 'Mao', 'Chen', 'Si', 'WuBranch', 'Wei', 'Shen', 'You', 'Xu', 'Hai'];

// --- 辅助函数：计算定局 ---
export const calculateJu = (date: Date): { juNumber: number; yinYang: '阴' | '阳'; jieQi: string; yuan: string } => {
  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar();
  
  // 1. 获取当前节气 (true表示如果当天是节气也算)
  const prevJieQi = lunar.getPrevJieQi(true);
  const jieQiName = prevJieQi.getName();
  const jieQiData = QM_JIEQI_DATA[jieQiName];

  // 默认容错：如果找不到节气数据（极少情况），默认阳遁1局
  if (!jieQiData) return { juNumber: 1, yinYang: '阳', jieQi: jieQiName, yuan: '上元' };

  // 2. 计算元遁 (拆补法 - 符头)
  const bazi = lunar.getEightChar();
  bazi.setSect(1); // 23:00 换日
  
  // 获取日干支索引 (0-9, 0-11)
  // lunar-javascript: Gan=Jia(0)..Gui(9), Zhi=Zi(0)..Hai(11)
  // 注意：lunar.javascript getDayGanIndex() 返回 0=甲, 1=乙...
  // getDayZhiIndex() 返回 0=子, 1=丑...
  // 让我们用文字转索引确保准确，或者直接查文档。
  // 查阅文档确认：getDayGanIndex() 0-9, getDayZhiIndex() 0-11.
  // 但是库里可能是 getDayGan() 返回中文。
  // 我们自己算索引比较稳妥。
  const ganMap: Record<string, number> = { '甲': 0, '乙': 1, '丙': 2, '丁': 3, '戊': 4, '己': 5, '庚': 6, '辛': 7, '壬': 8, '癸': 9 };
  const zhiMap: Record<string, number> = { '子': 0, '丑': 1, '寅': 2, '卯': 3, '辰': 4, '巳': 5, '午': 6, '未': 7, '申': 8, '酉': 9, '戌': 10, '亥': 11 };
  
  const dayGan = bazi.getDayGan();
  const dayZhi = bazi.getDayZhi();
  const ganIdx = ganMap[dayGan];
  const zhiIdx = zhiMap[dayZhi];

  // 符头：甲、己为符头
  // 如果日干是甲(0)-戊(4)，符头是甲(0)
  // 如果日干是己(5)-癸(9)，符头是己(5)
  const fuTouGanIdx = ganIdx < 5 ? 0 : 5;
  const diff = ganIdx - fuTouGanIdx;
  const fuTouZhiIdx = (zhiIdx - diff + 12) % 12;

  // 判断上中下元
  // 上元：子(0)、午(6)、卯(3)、酉(9)
  // 中元：寅(2)、申(8)、巳(5)、亥(11)
  // 下元：辰(4)、戌(10)、丑(1)、未(7)
  let yuanIdx = 0; // 0=上, 1=中, 2=下
  if ([0, 6, 3, 9].includes(fuTouZhiIdx)) yuanIdx = 0;
  else if ([2, 8, 5, 11].includes(fuTouZhiIdx)) yuanIdx = 1;
  else yuanIdx = 2;

  const yuanName = ['上元', '中元', '下元'][yuanIdx];
  const juNumber = jieQiData.ju[yuanIdx];

  return {
    juNumber,
    yinYang: jieQiData.type,
    jieQi: jieQiName,
    yuan: yuanName
  };
};

export const getYearGan = (year: number): string => {
  const offset = (year - 1984) % 10;
  const idx = offset < 0 ? offset + 10 : offset;
  return GANS[idx];
};

export const getYearZhi = (year: number): string => {
  const offset = (year - 1984) % 12;
  const idx = offset < 0 ? offset + 12 : offset;
  return ZHIS[idx];
};

export const generateQM_Pillars = (date: Date): QM_Pillar[] => {
  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();
  
  // Set boundary to 23:00 for late night Zi hour (standard Bazi/Qimen practice)
  eightChar.setSect(1);

  const createPillar = (l: string, gChinese: string, zChinese: string): QM_Pillar => {
    const g = QM_CHINESE_TO_KEY[gChinese] || gChinese;
    const z = QM_CHINESE_TO_KEY[zChinese] || zChinese;
    
    return {
      label: l, 
      gan: g, 
      zhi: z,
      ganElement: QM_GAN_ELEMENTS[g] || '',
      zhiElement: QM_ZHI_DATA[z]?.element || '',
      cangGan: QM_ZHI_DATA[z]?.cang || []
    };
  };

  return [
    createPillar('年', eightChar.getYearGan(), eightChar.getYearZhi()),
    createPillar('月', eightChar.getMonthGan(), eightChar.getMonthZhi()),
    createPillar('日', eightChar.getDayGan(), eightChar.getDayZhi()),
    createPillar('时', eightChar.getTimeGan(), eightChar.getTimeZhi()),
  ];
};

// --- Qimen Charting Logic ---

// 1. Earth Plate Sequence (Yang: Forward, Yin: Backward)
// Wu, Ji, Geng, Xin, Ren, Gui, Ding, Bing, Yi
const EARTH_PLATE_SEQ = ['Wu', 'Ji', 'Geng', 'Xin', 'Ren', 'Gui', 'Ding', 'Bing', 'Yi'];

// 2. Stars (Original Palace 1-9)
// 1:Peng, 2:Rui, 3:Chong, 4:Fu, 5:Qin, 6:Xin, 7:Zhu, 8:Ren, 9:Ying
const STAR_ORDER = [
  'TianPeng', 'TianRui', 'TianChong', 'TianFu', 'TianQin', 
  'TianXin', 'TianZhu', 'TianRen', 'TianYing'
];
// Map star name to original palace index (1-based)
const STAR_ORIGIN: Record<string, number> = {
  'TianPeng': 1, 'TianRui': 2, 'TianChong': 3, 'TianFu': 4, 'TianQin': 5,
  'TianXin': 6, 'TianZhu': 7, 'TianRen': 8, 'TianYing': 9
};

// 3. Doors (Original Palace)
// 1:Xiu, 2:Si, 3:Shang, 4:Du, 5:None, 6:Kai, 7:Jing(F), 8:Sheng, 9:Jing(S)
// Clockwise Ring: Kai(6)->Xiu(1)->Sheng(8)->Shang(3)->Du(4)->JingL(9)->Si(2)->JingJ(7)
const DOOR_RING = ['KaiMen', 'XiuMen', 'ShengMen', 'ShangMen', 'DuMen', 'JingMen_Li', 'SiMen', 'JingMen_Jing'];
// Original Palace for each door
const DOOR_ORIGIN: Record<string, number> = {
  'XiuMen': 1, 'SiMen': 2, 'ShangMen': 3, 'DuMen': 4, 
  'KaiMen': 6, 'JingMen_Jing': 7, 'ShengMen': 8, 'JingMen_Li': 9
};

// 4. Gods (Yang: Clockwise, Yin: Counter-Clockwise)
const GOD_SEQ = ['ZhiFu', 'TengShe', 'TaiYin', 'LiuHe', 'BaiHu', 'XuanWu', 'JiuDi', 'JiuTian'];

export const initializeQM_Ju = (profile: UserProfile | null, timestamp: number): QM_Ju => {
  const date = new Date(timestamp);
  const pillars = generateQM_Pillars(date);
  
  // Calculate Ju (Chai Bu)
  const { juNumber, yinYang, jieQi, yuan } = calculateJu(date);
  const isYang = yinYang === '阳';

  // --- Step 1: Earth Plate ---
  // Map Palace Index (1-9) -> Gan (String Key)
  const earthPlateMap: Record<number, string> = {};
  
  // Sequence starts at Ju Number
  // Yang: 1..9, Yin: 9..1
  let currentPalace = juNumber;
  
  EARTH_PLATE_SEQ.forEach((gan) => {
    earthPlateMap[currentPalace] = gan;
    if (isYang) {
      currentPalace++;
      if (currentPalace > 9) currentPalace = 1;
    } else {
      currentPalace--;
      if (currentPalace < 1) currentPalace = 9;
    }
  });

  // Center (5) usually parasites on Kun (2)
  // But we store it in 5 for now, handle parasite logic when moving.

  // --- Step 2: Find Xun Shou (Leader) ---
  // Time Gan/Zhi
  const timeGanStr = pillars[3].gan; // Key
  const timeZhiStr = pillars[3].zhi; // Key
  
  const timeGanIdx = GANS.indexOf(timeGanStr);
  const timeZhiIdx = ZHIS.indexOf(timeZhiStr);
  
  // Xun Shou Logic: 
  // Xun Index = (GanIdx - ZhiIdx + 12) % 12 / 2 ? No, standard formula.
  // 60 Jia Zi lookup or calculation.
  // Formula: Xun Head Gan is always Jia. We need to know which Jia (Jia Zi, Jia Xu, etc.)
  // Determines the Lead Stem (Wu, Ji, Geng, Xin, Ren, Gui).
  // Jia Zi -> Wu
  // Jia Xu -> Ji
  // Jia Shen -> Geng
  // Jia Wu -> Xin
  // Jia Chen -> Ren
  // Jia Yin -> Gui
  
  // Calculate offset to nearest Jia
  // Gan - Zhi (mod 12)
  // Ex: Ding(3) You(9). 3-9 = -6. +12 = 6. 
  // 6 / 2 = 3. 
  // 0:Zi(Wu), 2:Xu(Ji), 4:Shen(Geng), 6:Wu(Xin), 8:Chen(Ren), 10:Yin(Gui)
  // Wait, let's trace carefully.
  // Ding You (34). 34 - 30 (Jia Wu) = 4. 
  // The logic is: Find the Jia-Stem that heads this decade.
  // (GanIdx - ZhiIdx) gives the relation.
  // Let's use a simpler map.
  const XUN_SHOU_MAP: Record<number, string> = {
    0: 'Wu',  // Jia Zi (Diff 0)
    10: 'Ji', // Jia Xu (Diff -2 -> 10)
    8: 'Geng',// Jia Shen (Diff -4 -> 8)
    6: 'Xin', // Jia Wu (Diff -6 -> 6)
    4: 'Ren', // Jia Chen (Diff -8 -> 4)
    2: 'Gui'  // Jia Yin (Diff -10 -> 2)
  };
  
  const diff = (timeGanIdx - timeZhiIdx + 12) % 12;
  let leaderStem = XUN_SHOU_MAP[diff];
  
  // Special case: If Time Gan is Jia, the Leader Stem is the Time Gan itself? 
  // No, if Time is Jia Zi, Leader is Wu (Jia Zi hides in Wu).
  // So the map works.

  // --- Step 3: Find Duty Star and Duty Door ---
  // Find where Leader Stem is on Earth Plate
  let leaderPalace = 0;
  Object.entries(earthPlateMap).forEach(([palace, gan]) => {
    if (gan === leaderStem) leaderPalace = parseInt(palace);
  });
  
  // If Leader is in 5, it acts as 2
  const originalLeaderPalace = leaderPalace;
  const activeLeaderPalace = leaderPalace === 5 ? 2 : leaderPalace;

  // Duty Star: Star at activeLeaderPalace
  // Duty Door: Door at activeLeaderPalace
  const dutyStarName = QM_PALACE_INFO[activeLeaderPalace].star;
  const dutyDoorName = QM_PALACE_INFO[activeLeaderPalace].door;

  // --- Step 4: Heaven Plate (Stars) ---
  // Duty Star moves to Time Stem position.
  // Find Time Stem on Earth Plate.
  const timeGanForSearch = timeGanStr === 'Jia' ? leaderStem : timeGanStr; // Jia hides in Leader
  let timeStemPalace = 0;
  Object.entries(earthPlateMap).forEach(([palace, gan]) => {
    if (gan === timeGanForSearch) timeStemPalace = parseInt(palace);
  });
  
  // If Time Stem is in 5, use 2
  const targetStarPalace = timeStemPalace === 5 ? 2 : timeStemPalace;

  // Calculate Shift
  // Original Palace of Duty Star: activeLeaderPalace
  // Target: targetStarPalace
  // Shift = Target - Original
  const starShift = targetStarPalace - activeLeaderPalace;

  const heavenPlateMap: Record<number, { star: string, stem: string }> = {};
  
  // Iterate 1-9 (excluding 5 for star positions logic, but standard 1-9 loop works with ring logic)
  // Better: Loop through the 8 outer palaces for rotation, handle 5 separately?
  // Stars rotate in their fixed order (1,8,3,4,9,2,7,6).
  // Let's use the sequence 1->8->3->4->9->2->7->6 (Clockwise).
  const PALACE_RING = [1, 8, 3, 4, 9, 2, 7, 6];
  
  // Find index of activeLeaderPalace in Ring
  const leaderRingIdx = PALACE_RING.indexOf(activeLeaderPalace);
  // Find index of targetStarPalace in Ring
  const targetRingIdx = PALACE_RING.indexOf(targetStarPalace);
  
  const ringShift = (targetRingIdx - leaderRingIdx + 8) % 8;
  
  // Place Stars
  PALACE_RING.forEach((pIdx, i) => {
    const originalStarName = QM_PALACE_INFO[pIdx].star;
    // Where does this star go?
    // It moves by ringShift
    const newPosIdx = (i + ringShift) % 8;
    const newPalace = PALACE_RING[newPosIdx];
    
    // What Stem travels with this Star?
    // The Earth Stem at the Star's ORIGINAL position.
    // Except if Original was 2, it carries 5's stem too (or 5 carries 2?).
    // Usually: Star carries the Earth Stem beneath it.
    // If Star is Tian Rui (2), it carries Earth Stem of 2 AND 5.
    let carriedStem = earthPlateMap[pIdx];
    
    // Assign to Heaven Map
    heavenPlateMap[newPalace] = { 
      star: originalStarName, 
      stem: carriedStem 
    };

    // Special handling for Tian Rui (2) carrying Tian Qin (5)
    if (pIdx === 2) {
      // If this is Tian Rui, check if we need to display Tian Qin or combine them
      // We will handle display logic in the UI or store both.
      // For now, let's store the "Main" star.
      // Tian Qin is usually attached to Tian Rui.
    }
  });
  
  // Center (5) Heaven Stem usually Empty or same as 2? 
  // In Time Qimen, Center has no Heaven Plate (it moved out).
  
  // --- Step 5: Human Plate (Doors) ---
  // Duty Door moves to Time Branch.
  // Calculate steps from Leader Xun (Time) to Current Time.
  // Xun Head Branch -> Time Branch.
  // Xun Head Branch: 
  // Wu(Zi), Ji(Xu), Geng(Shen), Xin(Wu), Ren(Chen), Gui(Yin).
  // Wait, Xun Head is always Jia-Something.
  // Leader Stem tells us the Xun.
  // Wu -> Jia Zi (Zi)
  // Ji -> Jia Xu (Xu)
  // Geng -> Jia Shen (Shen)
  // Xin -> Jia Wu (Wu)
  // Ren -> Jia Chen (Chen)
  // Gui -> Jia Yin (Yin)
  const XUN_HEAD_BRANCH_MAP: Record<string, string> = {
    'Wu': 'Zi', 'Ji': 'Xu', 'Geng': 'Shen', 'Xin': 'WuBranch', 'Ren': 'Chen', 'Gui': 'Yin'
  };
  const xunHeadBranch = XUN_HEAD_BRANCH_MAP[leaderStem];
  const xunHeadBranchIdx = ZHIS.indexOf(xunHeadBranch);
  
  // Steps = TimeZhiIdx - XunHeadBranchIdx (handle loop)
  let steps = (timeZhiIdx - xunHeadBranchIdx + 12) % 12;
  
  // Door Movement: Along 1-9 (Palace Numbers)
  // Yang: +steps, Yin: -steps
  let doorTargetPalace = activeLeaderPalace; // Start at Duty Door Original Palace
  if (isYang) {
    for (let k = 0; k < steps; k++) {
      doorTargetPalace++;
      if (doorTargetPalace > 9) doorTargetPalace = 1;
    }
  } else {
    for (let k = 0; k < steps; k++) {
      doorTargetPalace--;
      if (doorTargetPalace < 1) doorTargetPalace = 9;
    }
  }
  if (doorTargetPalace === 5) doorTargetPalace = 2;

  // Rotate Doors
  // Doors also on Ring [1, 8, 3, 4, 9, 2, 7, 6]
  const doorLeaderRingIdx = PALACE_RING.indexOf(activeLeaderPalace);
  const doorTargetRingIdx = PALACE_RING.indexOf(doorTargetPalace);
  const doorRingShift = (doorTargetRingIdx - doorLeaderRingIdx + 8) % 8;

  const humanPlateMap: Record<number, string> = {};
  PALACE_RING.forEach((pIdx, i) => {
    const originalDoorName = QM_PALACE_INFO[pIdx].door;
    const newPosIdx = (i + doorRingShift) % 8;
    const newPalace = PALACE_RING[newPosIdx];
    humanPlateMap[newPalace] = originalDoorName;
  });

  // --- Step 6: God Plate ---
  // Zhi Fu (God) aligns with Zhi Fu (Star) (which is at targetStarPalace)
  // Gods Ring: Clockwise (Yang) or Counter-Clockwise (Yin)
  // Sequence: ZhiFu, TengShe, TaiYin, LiuHe, BaiHu, XuanWu, JiuDi, JiuTian
  const godPlateMap: Record<number, string> = {};
  
  // Find where Zhi Fu (Star) is: targetStarPalace
  const starRingIdxForGod = PALACE_RING.indexOf(targetStarPalace);
  
  PALACE_RING.forEach((pIdx, i) => {
    // Distance from Star's Palace in the Ring
    // If Yang: God[k] is at Ring[StarIdx + k]
    // If Yin: God[k] is at Ring[StarIdx - k]
    // Wait, let's map God to Palace.
    
    // We iterate through Gods 0..7
    // God 0 (ZhiFu) goes to targetStarPalace (PALACE_RING[starRingIdxForGod])
    // God 1 (TengShe) goes to...
    // Yang: Clockwise -> Next Palace in Ring
    // Yin: Counter-Clockwise -> Prev Palace in Ring
  });
  
  GOD_SEQ.forEach((godName, k) => {
    let palaceIdxInRing;
    if (isYang) {
      palaceIdxInRing = (starRingIdxForGod + k) % 8;
    } else {
      palaceIdxInRing = (starRingIdxForGod - k + 8) % 8;
    }
    const pIdx = PALACE_RING[palaceIdxInRing];
    godPlateMap[pIdx] = godName;
  });

  // Element & Auspiciousness Maps
  const GOD_INFO: Record<string, { element: QM_ElementType }> = {
    'ZhiFu': { element: '土' }, 'TengShe': { element: '火' }, 
    'TaiYin': { element: '金' }, 'LiuHe': { element: '木' }, 
    'BaiHu': { element: '金' }, 'XuanWu': { element: '水' }, 
    'JiuDi': { element: '土' }, 'JiuTian': { element: '金' }
  };

  const STAR_AUSPICIOUSNESS: Record<string, '吉' | '凶' | '平'> = {
    'TianPeng': '凶', 'TianRui': '凶', 'TianChong': '吉', 
    'TianFu': '吉', 'TianQin': '吉', 'TianXin': '吉', 
    'TianZhu': '凶', 'TianRen': '吉', 'TianYing': '平'
  };

  const DOOR_AUSPICIOUSNESS: Record<string, '吉' | '凶' | '平'> = {
    'XiuMen': '吉', 'ShengMen': '吉', 'ShangMen': '凶', 
    'DuMen': '平', 'JingMen_Li': '平', 'SiMen': '凶', 
    'JingMen_Jing': '凶', 'KaiMen': '吉'
  };

  // --- Assemble Result ---
  const palaces: QM_Palace[] = Array.from({ length: 9 }, (_, i) => {
    const idx = i + 1;
    const info = QM_PALACE_INFO[idx];
    
    // Defaults
    let hStem = '';
    let starName = '';
    let starElement: QM_ElementType = '木';
    let doorName = '';
    let doorElement: QM_ElementType = '木';
    let godName = '';
    let godElement: QM_ElementType = '木';
    
    // Fill from Maps
    const earthStem = earthPlateMap[idx] || '';
    
    if (idx === 5) {
      // Center Palace Logic (Empty or Special)
      hStem = ''; 
      starName = ''; 
      doorName = ''; 
      godName = ''; 
    } else {
      // Heaven
      const hData = heavenPlateMap[idx];
      if (hData) {
        hStem = hData.stem;
        starName = hData.star;
        // Element from Original Palace
        const originIdx = STAR_ORIGIN[starName];
        starElement = QM_PALACE_INFO[originIdx]?.element || '木';
      }
      
      // Human
      doorName = humanPlateMap[idx] || '';
      if (doorName) {
        const originIdx = DOOR_ORIGIN[doorName];
        doorElement = QM_PALACE_INFO[originIdx]?.element || '木';
      }
      
      // God
      godName = godPlateMap[idx] || '';
      if (godName) {
        godElement = GOD_INFO[godName]?.element || '木';
      }
    }

    return {
      index: idx,
      name: info.name,
      element: info.element,
      heavenStem: hStem,
      earthStem: earthStem,
      star: {
        name: starName,
        element: starElement,
        originalPalace: STAR_ORIGIN[starName] || 0,
        auspiciousness: STAR_AUSPICIOUSNESS[starName] || '平',
      },
      door: {
        name: doorName,
        element: doorElement,
        originalPalace: DOOR_ORIGIN[doorName] || 0,
        auspiciousness: DOOR_AUSPICIOUSNESS[doorName] || '平',
      },
      deity: {
        name: godName,
        element: godElement,
        nature: '阳', // Simplified
      },
      state: 'Wang', // Placeholder
      isKongWang: false,
      isMaXing: false,
      cangGan: QM_ZHI_DATA[ZHIS[idx % 12]].cang
    };
  });

  // Handle Tian Qin (5) parasite on Tian Rui (2)
  // If Tian Rui is at Palace X, Tian Qin is also at Palace X.
  // We need to inject Tian Qin info into the palace where Tian Rui is.
  // Find Palace with Tian Rui
  const tianRuiPalace = palaces.find(p => p.star.name === 'TianRui');
  if (tianRuiPalace) {
    // Add Tian Qin info (maybe as a secondary star or just note it)
    // Also the Earth Stem of 5 (from EarthPlateMap[5]) should appear in Heaven Plate of this palace.
    const stem5 = earthPlateMap[5];
    // We can append it to heavenStem: "Yi/Geng"
    if (stem5) {
      tianRuiPalace.heavenStem = `${tianRuiPalace.heavenStem}${stem5}`;
    }
    // Note: This is a simplified display choice.
  }

  return {
    juName: `时家奇门 (${jieQi}${yuan})`,
    yinYang,
    juNumber,
    pillars,
    dutyStarKey: dutyStarName,
    dutyDoorKey: dutyDoorName,
    dutyStar: QM_NAMES_MAP[dutyStarName] + '星',
    dutyDoor: QM_NAMES_MAP[dutyDoorName],
    xunShou: leaderStem + xunHeadBranch, // e.g. XinWu
    palaces,
  };
};

export const generateQimenString = (ju: QM_Ju): string => {
  const basicInfo = `【局象】：${ju.juName} ${ju.yinYang}遁${ju.juNumber}局
【值符】：${ju.dutyStar} 【值使】：${ju.dutyDoor}
【四柱】：
  年：${ju.pillars[0].gan}${ju.pillars[0].zhi}
  月：${ju.pillars[1].gan}${ju.pillars[1].zhi}
  日：${ju.pillars[2].gan}${ju.pillars[2].zhi}
  时：${ju.pillars[3].gan}${ju.pillars[3].zhi}`;

  const palaceInfo = ju.palaces.map(p => {
    return `[${p.name}宫] (五行${p.element})：
  神：${QM_NAMES_MAP[p.deity.name]} (${p.deity.element})
  星：${QM_NAMES_MAP[p.star.name]} (${p.star.element})
  门：${QM_NAMES_MAP[p.door.name]} (${p.door.element}) - ${p.door.auspiciousness}
  天盘：${QM_NAMES_MAP[p.heavenStem]}
  地盘：${QM_NAMES_MAP[p.earthStem]}`;
  }).join('\n');

  return `${basicInfo}\n\n【九宫详情】：\n${palaceInfo}`;
};

export const generateQimenJu = (date: Date): QM_Ju => {
  return initializeQM_Ju(null, date.getTime());
};

export const generateQimenJuBySolar = (solar: Solar): QM_Ju => {
  const y = solar.getYear();
  const m = solar.getMonth();
  const d = solar.getDay();
  const h = solar.getHour();
  const date = new Date(y, m - 1, d, h);
  return initializeQM_Ju(null, date.getTime());
};
