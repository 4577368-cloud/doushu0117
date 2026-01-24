import { QM_AFFAIR_SYMBOLS, QM_AFFAIR_CATEGORIES, QM_AffairCategory, QM_INDUSTRIES, QM_IndustryKey } from './qimenAffairs';

export interface SmartCommandResult {
  affairKey?: string;
  category?: QM_AffairCategory;
  timestamp?: number;
  industry?: QM_IndustryKey;
  confidence: number; // 0-1
  explanation: string[];
}

// Common time offsets (simplified)
const TIME_REGEXES = [
  { pattern: /明天|tmr|tomorrow/i, days: 1 },
  { pattern: /后天|day after tmr/i, days: 2 },
  { pattern: /大后天/i, days: 3 },
  { pattern: /昨天|yest/i, days: -1 },
  { pattern: /前天/i, days: -2 },
  { pattern: /今天|now|today/i, days: 0 },
];

const WEEKDAY_MAP: Record<string, number> = {
  '日': 0, '天': 0, '七': 0,
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6
};

/**
 * Parse natural language input for Qimen settings
 */
export const parseSmartCommand = (input: string): SmartCommandResult => {
  const result: SmartCommandResult = {
    confidence: 0,
    explanation: []
  };

  const now = new Date();
  let targetDate = new Date(now);
  let timeModified = false;

  // 1. Time Parsing
  
  // 1.1 Specific Date Keywords (Tomorrow, etc.)
  for (const { pattern, days } of TIME_REGEXES) {
    if (pattern.test(input)) {
      if (days !== 0) {
        targetDate.setDate(targetDate.getDate() + days);
        timeModified = true;
        result.explanation.push(`识别到时间关键词，已调整日期至 ${targetDate.toLocaleDateString()}`);
      } else {
        // "今天" or "now" -> explicitly reset to now
        timeModified = true; // Mark as modified so we enforce "Now"
        result.explanation.push(`识别到当前时间指令`);
      }
      break; 
    }
  }

  // 1.2 Weekdays (下周三, 周五)
  // Match "下周X" or "周X" or "星期X"
  const weekMatch = input.match(/(下{1,2})?(周|星期)([一二三四五六日天七])/);
  if (weekMatch) {
    const isNext = weekMatch[1] === '下'; // Next week
    // const isNextNext = weekMatch[1] === '下下'; // Next next week (rare but possible)
    const dayChar = weekMatch[3];
    const targetDay = WEEKDAY_MAP[dayChar];

    if (targetDay !== undefined) {
      const currentDay = now.getDay();
      
      // Calculate days to add
      let daysToAdd = 0;
      if (isNext) {
        // "Next Week X": Find this week's X, then add 7.
        // E.g. Today Mon(1), Target Wed(3). This week Wed is +2. Next week Wed is +9.
        // E.g. Today Thu(4), Target Wed(3). This week Wed is -1 (past). Next week Wed is +6.
        // Logic: (Target - Current + 7) % 7 gives days to *next* occurrence (or today).
        // Then add 7 if "Next Week" explicitly means "Week after current"? 
        // Usually "下周三" means "Wednesday of the next week".
        // Distance to next Monday (start of next week) + offset?
        // Let's stick to: "This week's X" + 7.
        const diffToThisWeekDay = targetDay - currentDay; // -6 to +6
        daysToAdd = diffToThisWeekDay + 7;
      } else {
        // "周X" or "星期X"
        // Usually implies the *upcoming* one.
        // If today is Mon, "周三" -> +2.
        // If today is Wed, "周三" -> +0 (Today) or +7 (Next)? Assume Today if not passed, or context? 
        // Let's assume upcoming (including today).
        let diff = targetDay - currentDay;
        if (diff < 0) diff += 7; // If target is past in this week, go to next week
        daysToAdd = diff;
      }

      targetDate.setDate(targetDate.getDate() + daysToAdd);
      timeModified = true;
      result.explanation.push(`识别到星期指令，已调整日期至 ${targetDate.toLocaleDateString()}`);
    }
  }

  // 1.3 Time of Day (上午/下午/晚上 + X点)
  // Match "下午3点", "晚上8点", "14点", "9:30"
  const timeMatch = input.match(/([上下]午|晚上|早晨|凌晨)?\s*(\d{1,2})(?:[:点](\d{2}))?/);
  if (timeMatch) {
    const period = timeMatch[1];
    let hour = parseInt(timeMatch[2]);
    const minute = parseInt(timeMatch[3] || '0');

    if (period) {
      if ((period === '下午' || period === '晚上') && hour < 12) {
        hour += 12;
      }
      if (period === '凌晨' && hour === 12) {
         hour = 0;
      }
    }
    
    // Validate
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      targetDate.setHours(hour, minute, 0, 0);
      timeModified = true;
      result.explanation.push(`识别到具体时间 ${hour}:${minute.toString().padStart(2, '0')}`);
    }
  }

  if (timeModified) {
    result.timestamp = targetDate.getTime();
    result.confidence += 0.4;
  }

  // 2. Industry Detection
  for (const [key, label] of Object.entries(QM_INDUSTRIES)) {
    if (input.includes(key) || input.includes(label)) {
      result.industry = key as QM_IndustryKey;
      result.explanation.push(`识别到行业场景：${label}`);
      result.confidence += 0.2;
      break;
    }
  }

  // 3. Affair/Intent Detection
  let bestMatch: { key: string, score: number } | null = null;

  // Expanded Keyword Mapping
  const KEYWORD_MAP: Record<string, string> = {
    // Investment (Stock, Crypto, Wealth management)
    '赚钱': 'investment', '发财': 'investment', '收益': 'investment', 
    '利润': 'investment', '资金': 'investment', '贷款': 'investment',
    '借钱': 'debt', '求财': 'business', '盈亏': 'investment',
    '财运': 'fortune', '财气': 'fortune', '运势': 'fortune',
    '股票': 'investment', '基金': 'investment', '炒股': 'investment', 
    '虚拟币': 'investment', '币圈': 'investment', '比特币': 'investment',
    '黄金': 'investment', '原油': 'investment', '期货': 'investment',
    '理财': 'investment', '借贷': 'investment', '杠杆': 'investment',
    '抄底': 'investment', '套牢': 'investment', '割肉': 'investment',
    '涨跌': 'investment', '行情': 'investment',
    
    // Business (Operation, Sales, Shop)
    '生意': 'business', '买卖': 'business', '经营': 'business', 
    '开店': 'business', '开业': 'business', '客户': 'business', 
    '订单': 'business', '销售': 'business', '卖货': 'business',
    '营业': 'business', '店铺': 'business', '档口': 'business',
    '摊位': 'business', '加盟': 'business', '代理': 'business',
    '批发': 'business', '零售': 'business', '进货': 'business',
    '囤货': 'business', '项目': 'business',
    
    // Debt (Borrowing, Lending, Collection)
    '欠钱': 'debt', '催债': 'debt', '还钱': 'debt',
    '欠款': 'debt', '收账': 'debt', '债务': 'debt',
    '赖账': 'debt', '跑路': 'debt', '借给': 'debt',
    
    // Job Search (Interview, Offer)
    '面试': 'job_search', '找工作': 'job_search', '应聘': 'job_search', 'offer': 'job_search',
    '离职': 'job_search', '跳槽': 'job_search', '辞职': 'job_search',
    '工作': 'job_search', '上班': 'job_search', '岗位': 'job_search',
    '简历': 'job_search', '招聘': 'job_search', '猎头': 'job_search',
    '入职': 'job_search', '转正': 'job_search', '失业': 'job_search',
    
    // Promotion (Career advancement)
    '升职': 'promotion', '晋升': 'promotion', '提拔': 'promotion',
    '竞聘': 'promotion', '职称': 'promotion', '评级': 'promotion',
    '升官': 'promotion', '掌权': 'promotion', '职场': 'promotion',
    '领导': 'promotion', '调动': 'promotion', '仕途': 'promotion',
    
    // Negotiation (Contract, Partnership)
    '合同': 'negotiation', '签约': 'negotiation', '签字': 'negotiation', '协议': 'negotiation',
    '合作': 'negotiation', '合伙': 'negotiation', '谈判': 'negotiation',
    '商谈': 'negotiation', '谈事': 'negotiation', '违约': 'negotiation',
    
    // Marriage (Wedding, Spouse)
    '结婚': 'marriage', '姻缘': 'marriage', '老公': 'marriage', '老婆': 'marriage',
    '丈夫': 'marriage', '妻子': 'marriage', '配偶': 'marriage',
    '领证': 'marriage', '婚礼': 'marriage', '婚事': 'marriage',
    '提亲': 'marriage', '订婚': 'marriage', '嫁娶': 'marriage',
    '求婚': 'marriage',
    
    // Relationship (Love, Dating)
    '恋爱': 'relationship', '感情': 'relationship', '对象': 'relationship',
    '男友': 'relationship', '女友': 'relationship', '复合': 'relationship',
    '分手': 'relationship', '喜欢': 'relationship', '暗恋': 'relationship',
    '追求': 'relationship', '表白': 'relationship', '桃花': 'relationship',
    '暧昧': 'relationship', '第三者': 'relationship', '出轨': 'relationship',
    '吵架': 'relationship', '冷战': 'relationship', '前任': 'relationship',
    
    // Exam (Academic)
    '考试': 'exam', '考研': 'exam', '考公': 'exam', '高考': 'exam',
    '成绩': 'exam', '分数': 'exam', '录取': 'exam', '学业': 'exam',
    '留学': 'exam', '答辩': 'exam', '证书': 'exam', '考级': 'exam',
    
    // Disease (Illness, Treatment)
    '病': 'disease', '不舒服': 'disease', '疼': 'disease', '痛': 'disease',
    '医院': 'disease', '手术': 'disease', '开刀': 'disease',
    '医生': 'disease', '治疗': 'disease', '吃药': 'disease',
    '诊断': 'disease', '检查': 'disease', '绝症': 'disease',
    '康复': 'disease', '感冒': 'disease', '发烧': 'disease',
    
    // Health Check
    '健康': 'health_check', '身体': 'health_check', '体检': 'health_check',
    '养生': 'health_check',
    
    // Travel
    '出行': 'travel', '旅游': 'travel', '出差': 'travel',
    '去': 'travel', '走': 'travel', '机票': 'travel',
    '搬家': 'travel', '入宅': 'travel', '动土': 'travel',
    '安全': 'travel', '平安': 'travel', '远行': 'travel',
    '火车票': 'travel', '签证': 'travel', '移民': 'travel',
    
    // Lost Item
    '丢': 'item', '不见': 'item', '失物': 'item',
    '寻物': 'item', '找东西': 'item',
    
    // Lawsuit
    '官司': 'general', '诉讼': 'general', '告': 'general', '法院': 'general',
    '律师': 'general', '判决': 'general', '坐牢': 'general',
    '刑拘': 'general', '报警': 'general', '立案': 'general', '是非': 'general',
    
    // Other Person
    '他': 'relationship', '她': 'relationship', '某人': 'relationship', '态度': 'relationship',
  };

  // Check manual keywords first
  let bestMatchKeywordLength = 0;
  for (const [keyword, affairKey] of Object.entries(KEYWORD_MAP)) {
    if (input.includes(keyword)) {
      // Prioritize longer keyword matches (more specific)
      if (!bestMatch || keyword.length > bestMatchKeywordLength) {
         bestMatch = { key: affairKey, score: 1.0 };
         bestMatchKeywordLength = keyword.length;
      }
    }
  }

  // Refined Logic for "Specific vs General"
  // Example: "Lost Phone" matches "Lost" (lost_item) and "Phone" (lost_electronics).
  // We want lost_electronics.
  // Order of check matters or Specificity.
  // Let's add specific checks for composite meanings.
  
  if (input.includes('手机') || input.includes('电脑') || input.includes('相机')) {
     if (input.includes('丢') || input.includes('不见')) {
       bestMatch = { key: 'item', score: 1.2 };
     }
  }
  if (input.includes('车')) {
     if (input.includes('丢') || input.includes('不见')) {
       bestMatch = { key: 'item', score: 1.2 };
     }
  }
  if (input.includes('钱') || input.includes('钱包')) {
     if (input.includes('丢') || input.includes('不见')) {
       bestMatch = { key: 'item', score: 1.2 };
     }
  }

  // If no manual match, fuzzy search in symbols definitions
  if (!bestMatch) {
    for (const [cat, affairs] of Object.entries(QM_AFFAIR_SYMBOLS)) {
      for (const [affairKey, config] of Object.entries(affairs)) {
        if (input.includes(config.label)) {
          bestMatch = { key: affairKey, score: 0.8 };
          break;
        }
      }
      if (bestMatch) break;
    }
  }

  if (bestMatch) {
    result.affairKey = bestMatch.key;
    
    // Find category for this affair key
    let foundCategory: QM_AffairCategory | undefined;
    let foundLabel: string | undefined;

    for (const [cat, affairs] of Object.entries(QM_AFFAIR_SYMBOLS)) {
       if (affairs[bestMatch.key]) {
         foundCategory = cat as QM_AffairCategory;
         foundLabel = affairs[bestMatch.key].label;
         break;
       }
    }

    result.category = foundCategory;
    result.explanation.push(`识别到意图：${foundLabel || bestMatch.key}`);
    result.confidence += bestMatch.score;
  }

  // 4. Default Time Handling
  // If we found an intent/industry but NO time specified, user likely means "Now" for this specific matter.
  if (!timeModified && (result.affairKey || result.industry)) {
    result.timestamp = now.getTime();
    result.explanation.push('未指定具体时间，默认按当前时间起局');
  }

  return result;
};
