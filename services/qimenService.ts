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

export const initializeQM_Ju = (profile: UserProfile | null, timestamp: number): QM_Ju => {
  const date = new Date(timestamp);
  const hourSeed = Math.floor(timestamp / (2 * 3600 * 1000)); 
  const pillars = generateQM_Pillars(date);

  const stars = ['TianPeng', 'TianRui', 'TianChong', 'TianFu', 'TianQin', 'TianXin', 'TianZhu', 'TianRen', 'TianYing'];
  const doors = ['XiuMen', 'ShengMen', 'ShangMen', 'DuMen', 'JingMen_Li', 'SiMen', 'JingMen_Jing', 'KaiMen'];
  const deities = ['ZhiFu', 'TengShe', 'TaiYin', 'LiuHe', 'BaiHu', 'XuanWu', 'JiuDi', 'JiuTian'];
  const states = ['Wang', 'Xiang', 'Xiu', 'Qiu', 'SiState'];

  // 使用拆补法计算定局
  const { juNumber, yinYang, jieQi, yuan } = calculateJu(date);

  const palaces: QM_Palace[] = Array.from({ length: 9 }, (_, i) => {
    const idx = i + 1;
    const info = QM_PALACE_INFO[idx];
    const shift = (hourSeed + juNumber + idx) % 9;
    
    return {
      index: idx,
      name: info.name,
      element: info.element,
      heavenStem: GANS[(shift) % 10],
      earthStem: GANS[(shift + 5) % 10],
      star: {
        name: stars[shift % 9],
        element: (['水', '土', '木', '木', '土', '金', '金', '土', '火'] as QM_ElementType[])[shift % 9],
        originalPalace: idx,
        auspiciousness: (shift % 3 === 0) ? '吉' : '凶',
      },
      door: {
        name: doors[shift % 8],
        element: (['水', '土', '木', '木', '火', '土', '金', '金'] as QM_ElementType[])[shift % 8],
        originalPalace: idx,
        auspiciousness: (shift % 4 === 0) ? '吉' : '凶',
      },
      deity: {
        name: deities[shift % 8],
        element: (['水', '火', '木', '木', '金', '水', '土', '金'] as QM_ElementType[])[shift % 8],
        nature: shift % 2 === 0 ? '阳' : '阴',
      },
      state: states[shift % 5],
      isKongWang: false,
      isMaXing: false,
      cangGan: QM_ZHI_DATA[ZHIS[idx % 12]].cang
    };
  });

  return {
    juName: `时家奇门 (${jieQi}${yuan})`,
    yinYang,
    juNumber,
    pillars,
    dutyStarKey: stars[juNumber % 9],
    dutyDoorKey: doors[juNumber % 8],
    dutyStar: QM_NAMES_MAP[stars[juNumber % 9]] + '星',
    dutyDoor: QM_NAMES_MAP[doors[juNumber % 8]],
    xunShou: '甲子戊', // Simplified; real calculation logic needed if precise
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
