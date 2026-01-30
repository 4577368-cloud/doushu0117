
export type QM_SymbolKey = 
  | 'RiGan'      // 日干（自动由日柱决定） 
  | 'ShiGan'    // 时干（自动由时柱决定） 
  | 'Jia' | 'Yi' | 'Bing' | 'Ding' | 'Wu' | 'Ji' | 'Geng' | 'Xin' | 'Ren' | 'Gui' 
  | 'KaiMen' | 'ShengMen' | 'XiuMen' | 'ShangMen' | 'DuMen' | 'JingMen' | 'SiMen' | 'JingMen2' // 惊门 
  | 'TianPeng' | 'TianRui' | 'TianChong' | 'TianFu' | 'TianQin' | 'TianXin' | 'TianZhu' | 'TianRen' | 'TianYing' 
  | 'ZhiFu' | 'TengShe' | 'TaiYin' | 'LiuHe' | 'BaiHu' | 'XuanWu' | 'JiuDi' | 'JiuTian'
  | 'TianYi'; // 天乙（奇门中通常指值符落宫的地盘之星，或特定神煞，此处作为符号占位）

export type QM_StateKey = 'Wang' | 'Xiang' | 'Xiu' | 'Qiu' | 'SiState' | 'KongWang' | 'RuMu' | 'JiXing';

export const QM_INDUSTRIES = {
  '通用': '通用场景',
  '电商': '电商行业',
  '物流': '物流行业',
  '跨境电商': '跨境电商',
  '金融': '金融行业',
  '政府公务': '政府公务'
} as const;

export type QM_IndustryKey = keyof typeof QM_INDUSTRIES;

export const QM_INDUSTRY_DEFAULTS: Record<QM_IndustryKey, QM_SymbolKey[]> = {
  '通用': ['RiGan', 'ShiGan'],
  '电商': ['JingMen', 'ShengMen'],
  '物流': ['ShangMen', 'TianPeng'],
  '跨境电商': ['JingMen', 'ShengMen', 'Yi'], // 乙奇代表海外/弯曲/风
  '金融': ['Wu', 'ShengMen'], // 戊为资本
  '政府公务': ['KaiMen', 'ZhiFu'], // 开门为公门，值符为领导
};

export interface QM_FavorableTendency {
  prefers?: (QM_StateKey | QM_SymbolKey)[];
  avoids?: (QM_StateKey | QM_SymbolKey)[];
  note?: string;
}

export interface QM_IndustryConfig {
  primary?: QM_SymbolKey[];
  secondary?: QM_SymbolKey[];
  emphasis?: string;
}

export interface QMAffairSymbolConfig { 
  /** 主要用神（必看） */ 
  primary: QM_SymbolKey[]; 
  /** 辅助用神（增强判断） */ 
  secondary?: QM_SymbolKey[]; 
  /** 特殊说明（供调试或文案参考） */ 
  note?: string; 
  /** 事项名称 */
  label: string;
  /** 吉凶倾向（通用） */
  favorableTendency?: QM_FavorableTendency;
  /** 行业适配配置 */
  industryAdaptation?: Partial<Record<QM_IndustryKey, QM_IndustryConfig>>;
} 

export const QM_AFFAIR_CATEGORIES = {
  self: '自身状态',
  wealth: '求财经营',
  career: '职场事业',
  love: '情感婚姻',
  study: '学业考试',
  health: '健康疾病',
  travel_trip: '出行安危', // corrected key
  lost: '失物寻物',
  lawsuit: '官司诉讼',
  cooperation: '合作谈判'
} as const;

export type QM_AffairCategory = keyof typeof QM_AFFAIR_CATEGORIES;

export const QM_AFFAIR_SYMBOLS: Record<QM_AffairCategory, Record<string, QMAffairSymbolConfig>> = {
  self: {
    fortune: {
      label: '近期运势',
      primary: ['RiGan', 'ShiGan'],
      secondary: ['ZhiFu'],
      note: '日干代表求测人，时干代表当前状态。重点看日干落宫旺衰及与时干关系。',
      favorableTendency: {
        prefers: ['Wang', 'Xiang', 'ZhiFu', 'KaiMen', 'ShengMen', 'XiuMen'],
        avoids: ['KongWang', 'RuMu', 'JiXing', 'SiMen', 'JingMen2', 'BaiHu']
      }
    },
    health_check: {
      label: '健康状况',
      primary: ['TianRui', 'Yi'],
      secondary: ['RiGan'],
      note: '天芮星为病星，乙奇为名医/药物。',
      favorableTendency: {
         prefers: ['Yi', 'TianXin'], // TianXin is Doctor
         avoids: ['TianRui', 'SiMen', 'BaiHu']
      }
    }
  },
  wealth: {
    investment: {
      label: '投资求财',
      primary: ['Wu', 'ShengMen'],
      secondary: ['RiGan', 'ShiGan'],
      note: '戊为资本，生门为利润。生门生戊，必获倍利；戊生生门，需添资本；生门克戊，必赔本。',
      favorableTendency: {
        prefers: ['ShengMen', 'Wu', 'Wang', 'Xiang'],
        avoids: ['KongWang', 'JiXing', 'XuanWu'] // XuanWu = Fraud/Loss
      },
      industryAdaptation: {
        '电商': { primary: ['JingMen', 'ShengMen'], emphasis: '关注流量转化与平台政策' },
        '金融': { primary: ['Wu', 'ShengMen', 'TianFu'], emphasis: '关注政策风向（天辅）' }
      }
    },
    business: {
      label: '生意经营',
      primary: ['KaiMen', 'ShengMen'],
      secondary: ['RiGan'],
      note: '开门为店铺/公司，生门为利润。',
      favorableTendency: {
        prefers: ['KaiMen', 'ShengMen', 'ZhiFu'],
        avoids: ['DuMen', 'SiMen']
      }
    },
    debt: {
      label: '讨债追账',
      // Simplified: Debt is ShangMen? Or Value (Wu).
      // Standard: Lender (RiGan/ZhiFu), Borrower (TianYi/ShiGan).
      // Let's use generic symbols for now.
      primary: ['ShangMen', 'Wu'],
      note: '伤门为讨债人/能力，戊为钱财。',
      favorableTendency: {
        prefers: ['ShangMen'],
        avoids: ['KongWang']
      }
    }
  },
  career: {
    job_search: {
      label: '求职面试',
      primary: ['KaiMen', 'RiGan'],
      secondary: ['ShiGan'],
      note: '开门代表工作/单位，日干代表求测人。开门生日干，工作易得。',
      favorableTendency: {
        prefers: ['KaiMen', 'ZhiFu', 'TaiYin'],
        avoids: ['DuMen', 'SiMen', 'KongWang']
      }
    },
    promotion: {
      label: '升职晋升',
      primary: ['KaiMen', 'ZhiFu'],
      secondary: ['RiGan'],
      note: '开门为官职，值符为顶头上司。',
      favorableTendency: {
         prefers: ['KaiMen', 'ZhiFu', 'Wang'],
         avoids: ['Geng', 'SiMen']
      }
    }
  },
  love: {
    marriage: {
      label: '婚姻感情',
      primary: ['Yi', 'Geng', 'LiuHe'],
      note: '乙代表女方，庚代表男方，六合代表媒人/婚姻关系。乙庚相生比和，又临六合，婚姻可成。',
      favorableTendency: {
        prefers: ['LiuHe', 'Yi', 'Geng'],
        avoids: ['SiMen', 'JingMen2', 'KongWang']
      }
    },
    relationship: {
       label: '恋爱关系',
       primary: ['Yi', 'Geng'],
       note: '重点看乙庚落宫生克关系。',
       favorableTendency: {
         prefers: ['LiuHe', 'XiuMen'],
         avoids: ['SiMen', 'ShangMen']
       }
    }
  },
  study: {
    exam: {
      label: '考试升学',
      primary: ['TianFu', 'JingMen'],
      secondary: ['RiGan'],
      note: '天辅星为老师/监考，景门为试卷/文章。',
      favorableTendency: {
        prefers: ['TianFu', 'JingMen', 'ZhiFu'],
        avoids: ['DuMen', 'KongWang']
      }
    }
  },
  health: {
    disease: {
       label: '疾病诊断',
       primary: ['TianRui', 'Yi', 'SiMen'],
       note: '天芮为病，乙为医，死门为凶灾。',
       favorableTendency: {
         prefers: ['Yi', 'TianXin'],
         avoids: ['SiMen', 'BaiHu', 'TengShe']
       }
    }
  },
  travel_trip: {
    travel: {
       label: '外出旅行',
       primary: ['JingMen', 'RiGan'], // JingMen = Road? Usually JingMen is road.
       note: '景门为道路，日干为行人。',
       favorableTendency: {
         prefers: ['KaiMen', 'ShengMen'],
         avoids: ['ShangMen', 'JingMen2', 'SiMen']
       }
    }
  },
  lost: {
    item: {
       label: '寻物',
       primary: ['ShiGan', 'RiGan'],
       note: '时干代表失物。',
       favorableTendency: {
         prefers: ['ZhiFu', 'XuanWu'], // XuanWu is thief, sometimes good to find thief? No.
         avoids: ['KongWang']
       }
    }
  },
  lawsuit: {
    general: {
       label: '官司诉讼',
       primary: ['ZhiFu', 'TianYi', 'KaiMen', 'JingMen2'],
       note: '值符原告，天乙被告，开门法官，惊门律师。',
       favorableTendency: {
         prefers: ['ZhiFu', 'KaiMen'],
         avoids: ['JingMen2']
       }
    }
  },
  cooperation: {
    negotiation: {
      label: '商务谈判',
      primary: ['RiGan', 'ShiGan', 'KaiMen'],
      note: '日干我方，时干对方。',
      favorableTendency: {
        prefers: ['KaiMen', 'LiuHe'],
        avoids: ['ShangMen', 'JingMen2']
      }
    }
  }
};
