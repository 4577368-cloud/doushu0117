
import { QM_AnalysisResult, QM_Ju, QM_Palace } from '../types.ts';
import { QM_SymbolKey } from './qimenAffairs.ts';
import { QM_ZHI_DATA } from './qimenConstants.ts';

export interface QM_AdviceResult {
  title: string;
  content: string;
  tone: 'positive' | 'neutral' | 'negative';
  tags: string[];
}

// Helper to get palace direction name
const PALACE_DIRECTION_MAP: Record<number, string> = {
  1: '正北', 8: '东北', 3: '正东', 4: '东南',
  9: '正南', 2: '西南', 7: '正西', 6: '西北', 5: '中宫'
};

// Helper to get time range from Branch
const BRANCH_TIME_MAP: Record<string, string> = {
  'Zi': '23:00-01:00', 'Chou': '01:00-03:00', 'Yin': '03:00-05:00', 'Mao': '05:00-07:00',
  'Chen': '07:00-09:00', 'Si': '09:00-11:00', 'WuBranch': '11:00-13:00', 'Wei': '13:00-15:00',
  'Shen': '15:00-17:00', 'You': '17:00-19:00', 'Xu': '19:00-21:00', 'Hai': '21:00-23:00'
};

/**
 * Generate user-friendly advice based on technical analysis
 */
export const generateUserAdvice = (
  analysis: QM_AnalysisResult,
  ju: QM_Ju,
  palace: QM_Palace,
  symbol: QM_SymbolKey
): QM_AdviceResult => {
  const { total: score } = analysis.scores;
  const direction = PALACE_DIRECTION_MAP[palace.index] || '该方位';
  
  // 1. Determine Tone & Base Template
  let tone: 'positive' | 'neutral' | 'negative' = 'neutral';
  let title = '';
  let template = '';

  // 2. Extract Dynamic Variables
  
  // Pattern Name (if any)
  const patternName = analysis.scores.pattern !== 0 
    ? (score >= 80 ? '得力' : (score < 60 ? '受制' : '平稳')) // Simplified fallback
    : '平稳';
  
  // Time: Use the Chart's Hour Pillar Branch (Time of event)
  const hourBranch = ju.pillars[3].zhi;
  const timeRange = BRANCH_TIME_MAP[hourBranch] || '吉时';
  
  // Action: Based on Door (Action) or Symbol
  let action = '推进事项';
  const door = palace.door.name;
  if (door === 'KaiMen') action = '开展工作、拜访客户';
  if (door === 'XiuMen') action = '调整休整、谒见贵人';
  if (door === 'ShengMen') action = '求财获利、经营谋划';
  if (door === 'ShangMen') action = '追收欠款、刑侦讨债';
  if (door === 'DuMen') action = '保守秘密、钻研技术';
  if (door === 'JingMen') action = '策划游说、宣传推广';
  if (door === 'SiMen') action = '吊唁祭祀、终结旧事';
  if (door === 'JingMen_Jing') action = '惊门之事'; // Handle alias
  
  // Warning: Based on negative symbols (Gods/Stars)
  let warning = '';
  const deity = palace.deity.name;
  if (deity === 'BaiHu') warning = '突发状况或口舌争执（白虎同宫）';
  if (deity === 'TengShe') warning = '虚假信息或反复变化（螣蛇困扰）';
  if (deity === 'XuanWu') warning = '暗中损耗或欺骗隐瞒（玄武作祟）';
  if (palace.star.name === 'TianPeng') warning = '破财风险（天蓬星）';
  if (palace.star.name === 'TianRui') warning = '问题症结暴露（天芮星）';

  if (score >= 80) {
    tone = 'positive';
    title = '大吉 · 积极行动';
    // If there is a specific warning (like BaiHu), append it gently
    const warningClause = warning ? `但需留意${warning}，稳中求进。` : '';
    template = `当前格局{pattern}，{direction}气场旺盛。建议在{time}主动出击，{action}，有望取得突破性进展。${warningClause}`;
  } else if (score >= 60) {
    tone = 'neutral';
    title = '中平 · 稳健推进';
    const warningText = warning || '细节变数';
    template = `当前格局{pattern}，{direction}虽有助力，但仍需谨慎。建议在{time}尝试{action}，注意${warningText}。`;
  } else {
    tone = 'negative';
    title = '谨慎 · 防守为上';
    const warningText = warning || '意外风险';
    template = `当前格局{pattern}，{direction}气场受阻。建议暂缓{action}，尤其在{time}需防范${warningText}，以守代攻。`;
  }
  
  let content = template
    .replace('{pattern}', patternName === '得力' ? '呈祥' : (patternName === '受制' ? '受困' : '一般'))
    .replace('{direction}', direction)
    .replace('{time}', timeRange)
    .replace('{action}', action);

  return {
    title,
    content,
    tone,
    tags: [direction, timeRange, tone === 'positive' ? '利进攻' : '宜防守']
  };
};
