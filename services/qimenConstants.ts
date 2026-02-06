import { QM_ElementType } from '../types';

export const QM_ELEMENT_COLORS: Record<QM_ElementType, string> = {
  '木': 'text-[#3E5C3E]',
  '火': 'text-[#963C3C]',
  '土': 'text-[#7D6B5D]',
  '金': 'text-[#4A5A6A]',
  '水': 'text-[#2B3E50]',
};

export const QM_ELEMENT_BG_MAP: Record<QM_ElementType, string> = {
  '木': 'bg-[#F7FAF7]',
  '火': 'bg-[#FAF7F7]',
  '土': 'bg-[#FAF9F7]',
  '金': 'bg-[#F7F8FA]',
  '水': 'bg-[#F7F9FA]',
};

export const QM_ELEMENT_TEXT_MAP: Record<QM_ElementType, string> = {
  '木': 'text-[#3E5C3E]',
  '火': 'text-[#963C3C]',
  '土': 'text-[#7D6B5D]',
  '金': 'text-[#4A5A6A]',
  '水': 'text-[#2B3E50]',
};

export const QM_GUA_LABELS: Record<string, string> = {
  'Kan': '坎', 'Kun': '坤', 'Zhen': '震', 'Xun': '巽', 'Zhong': '中',
  'Qian': '乾', 'Dui': '兑', 'Gen': '艮', 'Li': '离'
};

export const QM_GUA_TRIGRAMS: Record<string, string> = {
  '坎': '☵', '坤': '☷', '震': '☳', '巽': '☴', '中': '',
  '乾': '☰', '兑': '☱', '艮': '☶', '离': '☲'
};

export const QM_GAN_ELEMENTS: Record<string, QM_ElementType> = {
  Jia: '木', Yi: '木', Bing: '火', Ding: '火', 
  Wu: '土', Ji: '土', Geng: '金', Xin: '金', 
  Ren: '水', Gui: '水'
};

export const QM_ZHI_DATA: Record<string, { element: QM_ElementType, cang: string[] }> = {
  Zi: { element: '水', cang: ['Gui'] },
  Chou: { element: '土', cang: ['Ji', 'Gui', 'Xin'] },
  Yin: { element: '木', cang: ['Jia', 'Bing', 'Wu'] },
  Mao: { element: '木', cang: ['Yi'] },
  Chen: { element: '土', cang: ['Wu', 'Yi', 'Gui'] },
  Si: { element: '火', cang: ['Bing', 'Geng', 'Wu'] },
  WuBranch: { element: '火', cang: ['Ding', 'Ji'] },
  Wei: { element: '土', cang: ['Ji', 'Ding', 'Yi'] },
  Shen: { element: '金', cang: ['Geng', 'Ren', 'Wu'] },
  You: { element: '金', cang: ['Xin'] },
  Xu: { element: '土', cang: ['Wu', 'Xin', 'Ding'] },
  Hai: { element: '水', cang: ['Ren', 'Jia'] }
};

export const QM_PALACE_INFO: Record<number, { name: string, element: QM_ElementType, star: string, door: string }> = {
  1: { name: '坎', element: '水', star: 'TianPeng', door: 'XiuMen' },
  2: { name: '坤', element: '土', star: 'TianRui', door: 'SiMen' },
  3: { name: '震', element: '木', star: 'TianChong', door: 'ShangMen' },
  4: { name: '巽', element: '木', star: 'TianFu', door: 'DuMen' },
  5: { name: '中', element: '土', star: 'TianQin', door: 'SiMen' },
  6: { name: '乾', element: '金', star: 'TianXin', door: 'KaiMen' },
  7: { name: '兑', element: '金', star: 'TianZhu', door: 'JingMen_Jing' },
  8: { name: '艮', element: '土', star: 'TianRen', door: 'ShengMen' },
  9: { name: '离', element: '火', star: 'TianYing', door: 'JingMen_Li' }
};

export const QM_NAMES_MAP: Record<string, string> = {
  TianPeng: '天蓬', TianRui: '天芮', TianChong: '天冲', TianFu: '天辅',
  TianQin: '天禽', TianXin: '天心', TianZhu: '天柱', TianRen: '天任', TianYing: '天英',
  XiuMen: '休门', ShengMen: '生门', ShangMen: '伤门', DuMen: '杜门',
  JingMen_Li: '景门', SiMen: '死门', JingMen_Jing: '惊门', KaiMen: '开门',
  JingMen: '景门', JingMen2: '惊门',
  ZhiFu: '值符', TengShe: '腾蛇', TaiYin: '太阴', LiuHe: '六合',
  BaiHu: '白虎', XuanWu: '玄武', JiuDi: '九地', JiuTian: '九天', TianYi: '天乙',
  Jia: '甲', Yi: '乙', Bing: '丙', Ding: '丁', Wu: '戊',
  Ji: '己', Geng: '庚', Xin: '辛', Ren: '壬', Gui: '癸',
  Zi: '子', Chou: '丑', Yin: '寅', Mao: '卯', Chen: '辰', Si: '巳', 
  WuBranch: '午', Wei: '未', Shen: '申', You: '酉', Xu: '戌', Hai: '亥',
  Wang: '旺', Xiang: '相', Xiu: '休', Qiu: '囚', SiState: '死',
  KongWang: '空亡', RuMu: '入墓'
};

// Reverse map for Chinese -> Key
export const QM_CHINESE_TO_KEY: Record<string, string> = Object.entries(QM_NAMES_MAP).reduce((acc, [key, val]) => {
  acc[val] = key;
  return acc;
}, {} as Record<string, string>);

export const QM_STATE_MAP: Record<string, { label: string; score: number; color: string; desc: string }> = {
  Wang: { label: '旺', score: 100, color: '#963C3C', desc: '能量极盛，当前正值' },
  Xiang: { label: '相', score: 80, color: '#B8860B', desc: '相生有情，势头平稳' },
  Xiu: { label: '休', score: 50, color: '#4A5A6A', desc: '休养生息，不宜进取' },
  Qiu: { label: '囚', score: 25, color: '#7D6B5D', desc: '气场受阻，处处受限' },
  SiState: { label: '死', score: 5, color: '#1A1A1A', desc: '生机匮乏，宜静待变' },
};

export const QM_STACK_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6];
export const QM_GUA_ANGLES: Record<number, number> = { 1: 0, 8: 45, 3: 90, 4: 135, 9: 180, 2: 225, 7: 270, 6: 315 };

// --- 奇门定局数据 (节气 -> [上元, 中元, 下元]) ---
// 阳遁：冬至 ~ 芒种
// 阴遁：夏至 ~ 大雪
export const QM_JIEQI_DATA: Record<string, { type: '阳' | '阴', ju: [number, number, number] }> = {
  // 阳遁
  '冬至': { type: '阳', ju: [1, 7, 4] },
  '小寒': { type: '阳', ju: [2, 8, 5] },
  '大寒': { type: '阳', ju: [3, 9, 6] },
  '立春': { type: '阳', ju: [8, 5, 2] },
  '雨水': { type: '阳', ju: [9, 6, 3] },
  '惊蛰': { type: '阳', ju: [1, 7, 4] },
  '春分': { type: '阳', ju: [3, 9, 6] },
  '清明': { type: '阳', ju: [4, 1, 7] },
  '谷雨': { type: '阳', ju: [5, 2, 8] },
  '立夏': { type: '阳', ju: [4, 1, 7] },
  '小满': { type: '阳', ju: [5, 2, 8] },
  '芒种': { type: '阳', ju: [6, 3, 9] },
  // 阴遁
  '夏至': { type: '阴', ju: [9, 3, 6] },
  '小暑': { type: '阴', ju: [8, 2, 5] },
  '大暑': { type: '阴', ju: [7, 1, 4] },
  '立秋': { type: '阴', ju: [2, 5, 8] },
  '处暑': { type: '阴', ju: [1, 4, 7] },
  '白露': { type: '阴', ju: [9, 3, 6] },
  '秋分': { type: '阴', ju: [7, 1, 4] },
  '寒露': { type: '阴', ju: [6, 9, 3] },
  '霜降': { type: '阴', ju: [5, 8, 2] },
  '立冬': { type: '阴', ju: [6, 9, 3] },
  '小雪': { type: '阴', ju: [5, 8, 2] },
  '大雪': { type: '阴', ju: [4, 7, 1] }
};
