import { Lunar, Solar } from 'lunar-javascript';

export interface SolarTerm {
  name: string;
  date: Date; // The exact transition time
  formattedDate: string; // YYYY-MM-DD HH:mm:ss
  description: string;
  category: string; // e.g. "Seasonal", "Climate", "Phenology"
}

export const SOLAR_TERM_NAMES = [
  '小寒', '大寒', 
  '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', 
  '立夏', '小满', '芒种', '夏至', '小暑', '大暑', 
  '立秋', '处暑', '白露', '秋分', '寒露', '霜降', 
  '立冬', '小雪', '大雪', '冬至'
];

export const SOLAR_TERM_INFO: Record<string, { description: string, category: string }> = {
  '立春': { 
    description: '春季开始。万物复苏，阳气上升，是农历二十四节气之首。', 
    category: '季节' 
  },
  '雨水': { 
    description: '降雨开始，雨量渐增。空气湿润，适合万物生长。', 
    category: '气候' 
  },
  '惊蛰': { 
    description: '春雷乍动，惊醒蛰伏于地下冬眠的昆虫。气温回升，雨水增多。', 
    category: '物候' 
  },
  '春分': { 
    description: '昼夜平分。阳光直射赤道，此后北半球昼长夜短。', 
    category: '天文' 
  },
  '清明': { 
    description: '气清景明，万物皆显。气温变暖，草木萌动，是春耕春种的大好时节。', 
    category: '物候' 
  },
  '谷雨': { 
    description: '雨生百谷。降水明显增加，有利于谷物生长。', 
    category: '农事' 
  },
  '立夏': { 
    description: '夏季开始。万物生长，气温显著升高，雷雨增多。', 
    category: '季节' 
  },
  '小满': { 
    description: '夏熟作物的籽粒开始灌浆饱满，但未成熟，故称小满。', 
    category: '农事' 
  },
  '芒种': { 
    description: '有芒的麦子快收，有芒的稻子可种。农事繁忙之时。', 
    category: '农事' 
  },
  '夏至': { 
    description: '白昼最长，黑夜最短。阳光直射北回归线，盛夏来临。', 
    category: '天文' 
  },
  '小暑': { 
    description: '气候开始炎热，但还没到最热的时候。', 
    category: '气候' 
  },
  '大暑': { 
    description: '一年中最热的时候。高温酷热，雷雨频繁。', 
    category: '气候' 
  },
  '立秋': { 
    description: '秋季开始。暑去凉来，草木结果，万物开始萧条。', 
    category: '季节' 
  },
  '处暑': { 
    description: '“处”是终止的意思，表示炎热的暑天结束。气温开始下降。', 
    category: '气候' 
  },
  '白露': { 
    description: '天气转凉，夜间水汽凝结成露。昼夜温差拉大。', 
    category: '气候' 
  },
  '秋分': { 
    description: '昼夜平分。阳光再次直射赤道，此后北半球昼短夜长。', 
    category: '天文' 
  },
  '寒露': { 
    description: '露水已寒，将要结冰。气温更低，秋意渐浓。', 
    category: '气候' 
  },
  '霜降': { 
    description: '天气渐冷，开始有霜。是秋季的最后一个节气。', 
    category: '气候' 
  },
  '立冬': { 
    description: '冬季开始。万物收藏，规避寒冷。', 
    category: '季节' 
  },
  '小雪': { 
    description: '开始下雪，气温下降。但雪量不大。', 
    category: '气候' 
  },
  '大雪': { 
    description: '降雪量增多，地面可能积雪。气温显著下降。', 
    category: '气候' 
  },
  '冬至': { 
    description: '白昼最短，黑夜最长。阳光直射南回归线，数九寒天开始。', 
    category: '天文' 
  },
  '小寒': { 
    description: '气候开始寒冷。标志着进入一年中最寒冷的日子。', 
    category: '气候' 
  },
  '大寒': { 
    description: '一年中最冷的时候。寒潮频繁，冰天雪地。', 
    category: '气候' 
  }
};

/**
 * Get the 24 solar terms for a specific Gregorian year.
 * @param year Gregorian year (e.g. 2024)
 * @returns Array of SolarTerm objects sorted by date
 */
export function getSolarTerms(year: number): SolarTerm[] {
  const terms: SolarTerm[] = [];
  const seen = new Set<string>();

  // Use multiple Lunar years to cover the full Gregorian year
  // A Gregorian year often spans across two Lunar years, and JieQi tables might be offset
  const lunarDates = [
    new Date(year, 0, 1),    // Jan 1
    new Date(year, 6, 1),    // July 1
    new Date(year, 11, 31),  // Dec 31
    new Date(year + 1, 1, 1) // Feb 1 next year (to catch terms associated with next Lunar year)
  ];

  for (const date of lunarDates) {
    const lunar = Lunar.fromDate(date);
    const jieQiTable = lunar.getJieQiTable();
    
    for (const [name, solar] of Object.entries(jieQiTable)) {
      if (solar.getYear() === year && SOLAR_TERM_NAMES.includes(name)) {
        // Solar.toYmdHms() returns format "YYYY-MM-DD HH:mm:ss"
        const formattedDate = solar.toYmdHms();
        
        if (!seen.has(name)) {
          seen.add(name);
          terms.push({
            name,
            date: new Date(formattedDate.replace(/-/g, '/')), // Ensure compatibility
            formattedDate,
            description: SOLAR_TERM_INFO[name]?.description || '',
            category: SOLAR_TERM_INFO[name]?.category || '其他'
          });
        }
      }
    }
  }

  // Ensure we have all 24 terms (sometimes boundaries might be tricky)
  // If missing, we might need to check adjacent years, but the 3-point check above should cover it.
  // Actually, getJieQiTable returns the WHOLE lunar year's terms. 
  // Lunar year n covers most of Solar year n, but Solar year n start (Jan) is usually Lunar year n-1 end.
  // So checking Jan 1 (Lunar n-1) and Dec 31 (Lunar n) should cover all.
  
  return terms.sort((a, b) => a.date.getTime() - b.date.getTime());
}
