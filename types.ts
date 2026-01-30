export type Gender = 'male' | 'female';

export interface GanZhi {
  gan: string;
  zhi: string;
  ganElement: string;
  zhiElement: string;
  hiddenStems: { stem: string; type: string; powerPercentage: number; shiShen: string }[];
  naYin: string;
  shiShenGan: string;     // 天干十神
  lifeStage: string;      // 十二长生
  selfLifeStage?: string; // 自坐长生
}

export interface Pillar {
  name: string;
  ganZhi: GanZhi;
  shenSha: string[];
  kongWang?: boolean;
}

export interface LuckPillar {
  index: number;
  startAge: number;
  startYear: number;
  endYear: number;
  ganZhi: GanZhi;
}

export interface XiaoYun {
  age: number;
  year: number;
  ganZhi: GanZhi;
}

export interface BalanceAnalysis {
  dayMasterStrength: { score: number; level: string; description: string };
  yongShen: string[];
  xiShen: string[];
  jiShen: string[];
  method: string;
  advice: string;
}

export interface PatternAnalysis {
  name: string;
  type: string; // 正格/外格
  isEstablished: boolean;
  level: string; // 上/中/下等
  keyFactors: { beneficial: string[]; destructive: string[] };
  description: string;
}

export interface BaziChart {
  profileId: string;
  gender: Gender;
  dayMaster: string;
  dayMasterElement: string;
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar;
  };
  mingGong: string;
  shenGong: string;
  taiYuan: string;
  taiXi: string;
  wuxingCounts: Record<string, number>;
  luckPillars: LuckPillar[];
  xiaoYun: XiaoYun[];
  startLuckText: string;
  godStrength: any[]; // 暂简略
  shenShaInteractions: any[];
  balance: BalanceAnalysis;
  pattern: PatternAnalysis;
  originalTime?: string;
  mangPai?: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  gender: Gender;
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:mm
  isSolarTime: boolean;
  province?: string;
  city?: string;
  longitude?: number;
  latitude?: number;
  createdAt: number;
  avatar?: string;
  tags?: string[]; 
  isSelf?: boolean;
  aiReports?: HistoryItem[];
  vipStatus?: boolean;
  vipActivationMethod?: 'alipay' | 'key';
  vipExpiryDate?: string | null;
}

export interface ModalData {
  title: string;
  pillarName: string;
  ganZhi: GanZhi;
  shenSha: string[];
}

export enum AppTab {
  HOME = 'home',
  ARCHIVE = 'archive', // 对应 "我的"
  CHART = 'chart',     // 对应 "八字"
  ZIWEI = 'ziwei',     // 对应 "紫微"
  CHAT = 'chat',       // 对应 "AI"
  QIMEN = 'qimen',     // 对应 "奇门"
  LIUYAO = 'liuyao'    // 对应 "六爻"
}

export enum ChartSubTab {
  BASIC = 'basic',
  DETAIL = 'detail',
  ANALYSIS = 'analysis',
  CHAT = 'chat',
  DAILY = 'daily'
}

export interface AnnualFortune {
  year: number;
  ganZhi: GanZhi;
  rating: '吉' | '凶' | '平';
  reasons: string[];
  score: number;
}

export interface BaziReport {
  title: string;
  copyText: string;
  sections: {
    id: string;
    title: string;
    content: string;
    type: 'text';
  }[];
}

// 占位接口
export interface HiddenStem {
  stem: string;
  type: '主气' | '中气' | '余气';
}
export interface GodStrength {}
export interface TrendActivation {}
export interface ShenShaInteraction {}
export interface InterpretationResult {}
export interface PillarInterpretation {
    pillarName: string;
    coreSymbolism: string;
    hiddenDynamics: string;
    naYinInfluence: string;
    lifeStageEffect: string;
    shenShaEffects: string[];
    roleInDestiny: string;
    integratedSummary: string;
}

// Ziwei placeholder types to satisfy main App imports if needed
export interface HistoryItem {
  id: string;
  date: number;
  content: string;
  type: 'bazi' | 'ziwei' | 'qimen';
}

// --- Qimen Dunjia Types ---

export type QM_ElementType = '木' | '火' | '土' | '金' | '水';

export interface QM_Pillar {
  label: '年' | '月' | '日' | '时';
  gan: string;
  zhi: string;
  ganElement: QM_ElementType;
  zhiElement: QM_ElementType;
  cangGan: string[]; // 藏干
}

export interface QM_Star {
  name: string;
  element: QM_ElementType;
  originalPalace: number; // 原始宫位
  auspiciousness: '吉' | '凶' | '平';
}

export interface QM_Door {
  name: string;
  element: QM_ElementType;
  originalPalace: number;
  auspiciousness: '吉' | '凶' | '中';
}

export interface QM_Deity {
  name: string;
  element: QM_ElementType;
  nature: '阳' | '阴';
}

export interface QM_Palace {
  index: number; 
  name: string; // 卦名
  element: QM_ElementType;
  heavenStem: string;
  earthStem: string;
  star: QM_Star;
  door: QM_Door;
  deity: QM_Deity;
  state: string; 
  isKongWang: boolean;
  isMaXing: boolean;
  cangGan: string[]; // 随地支而来的藏干
}

export interface QM_Ju {
  juName: string;
  yinYang: '阴' | '阳';
  juNumber: number;
  pillars: QM_Pillar[];
  dutyStar: string;
  dutyStarKey?: string;
  dutyDoor: string;
  dutyDoorKey?: string;
  xunShou: string; // 旬首 (如: 甲子戊)
  palaces: QM_Palace[];
}
