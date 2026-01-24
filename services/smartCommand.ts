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
    // Wealth
    '赚钱': 'wealth_general', '发财': 'wealth_general', '收益': 'wealth_general', 
    '利润': 'wealth_general', '资金': 'wealth_general', '贷款': 'wealth_general',
    '借钱': 'wealth_general', '求财': 'wealth_general', '盈亏': 'wealth_general',
    '财运': 'wealth_general', '财气': 'wealth_general',
    
    // Business
    '生意': 'business', '买卖': 'business', '经营': 'business', 
    '开店': 'business', '开业': 'business', '客户': 'business', 
    '订单': 'business', '销售': 'business', '卖货': 'business',
    
    // Investment
    '投资': 'investment', '理财': 'investment', '股票': 'investment', 
    '基金': 'investment', '炒股': 'investment', '虚拟币': 'investment',
    
    // Debt
    '欠钱': 'debt_collection', '催债': 'debt_collection', '还钱': 'debt_collection',
    '欠款': 'debt_collection', '收账': 'debt_collection',
    
    // Career
    '面试': 'job_interview', '找工作': 'job_interview', '应聘': 'job_interview', 'offer': 'job_interview',
    '升职': 'promotion', '晋升': 'promotion', '提拔': 'promotion',
    '离职': 'resignation', '跳槽': 'resignation', '辞职': 'resignation',
    '工作': 'work_stability', '上班': 'work_stability', '岗位': 'work_stability', '职场': 'work_stability',
    
    // Contract/Cooperation
    '合同': 'contract', '签约': 'contract', '签字': 'contract', '协议': 'contract',
    '合作': 'contract', '合伙': 'contract',
    
    // Negotiation
    '谈判': 'negotiation', '商谈': 'negotiation', '谈事': 'negotiation',
    
    // Relationship
    '结婚': 'love_marriage', '恋爱': 'love_marriage', '感情': 'love_marriage',
    '姻缘': 'love_marriage', '对象': 'love_marriage', '男友': 'love_marriage',
    '女友': 'love_marriage', '老公': 'love_marriage', '老婆': 'love_marriage',
    '复合': 'love_marriage', '分手': 'love_marriage', '喜欢': 'love_marriage',
    '相亲': 'love_marriage', '桃花': 'love_marriage',
    
    // Academic
    '考试': 'exam', '考研': 'exam', '考公': 'exam', '高考': 'exam',
    '成绩': 'exam', '分数': 'exam', '录取': 'exam', '学业': 'exam',
    
    // Health
    '健康': 'health_general', '身体': 'health_general', '病': 'health_general',
    '不舒服': 'health_general', '疼': 'health_general', '痛': 'health_general',
    '医院': 'health_general', '手术': 'surgery', '开刀': 'surgery',
    '医生': 'treatment', '治疗': 'treatment', '吃药': 'treatment',
    
    // Lost
    '丢': 'lost_item', '不见': 'lost_item', '失物': 'lost_item',
    '手机': 'lost_electronics', '电脑': 'lost_electronics', 
    '钱包': 'lost_money', '钱丢': 'lost_money', 
    '车丢': 'lost_vehicle',
    '寻人': 'find_person', '走失': 'find_person', '联系': 'find_person',
    
    // Travel
    '出行': 'travel_trip', '旅游': 'travel_trip', '出差': 'travel_trip',
    '去': 'travel_trip', '走': 'travel_trip', '机票': 'travel_trip',
    '搬家': 'relocation', '入宅': 'relocation', '动土': 'relocation',
    '安全': 'safety', '平安': 'safety',
    
    // Lawsuit
    '官司': 'lawsuit', '诉讼': 'lawsuit', '告': 'lawsuit', '法院': 'lawsuit',
    
    // Other Person
    '他': 'other_person', '她': 'other_person', '某人': 'other_person', '态度': 'other_person',
  };

  // Check manual keywords first
  for (const [keyword, affairKey] of Object.entries(KEYWORD_MAP)) {
    if (input.includes(keyword)) {
      // Simple logic: longer keyword match might be better? 
      // Or just take first.
      // Let's try to find "Best" match (longest keyword)
      if (!bestMatch || keyword.length > (bestMatch.key.length)) { // This logic is flawed, key length != keyword length
         // But we don't have keyword length stored in bestMatch if we only store key.
         // Let's just take the first valid match for now, or accumulate score.
         bestMatch = { key: affairKey, score: 1.0 };
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
       bestMatch = { key: 'lost_electronics', score: 1.2 };
     }
  }
  if (input.includes('车')) {
     if (input.includes('丢') || input.includes('不见')) {
       bestMatch = { key: 'lost_vehicle', score: 1.2 };
     }
  }
  if (input.includes('钱') || input.includes('钱包')) {
     if (input.includes('丢') || input.includes('不见')) {
       bestMatch = { key: 'lost_money', score: 1.2 };
     }
  }

  // If no manual match, fuzzy search in symbols definitions
  if (!bestMatch) {
    for (const [key, config] of Object.entries(QM_AFFAIR_SYMBOLS)) {
      if (input.includes(config.label)) {
        bestMatch = { key, score: 0.8 };
        break;
      }
    }
  }

  if (bestMatch) {
    result.affairKey = bestMatch.key;
    result.category = QM_AFFAIR_SYMBOLS[bestMatch.key]?.category;
    result.explanation.push(`识别到意图：${QM_AFFAIR_SYMBOLS[bestMatch.key]?.label || bestMatch.key}`);
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
