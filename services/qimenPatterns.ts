import { QM_Ju, QM_Palace } from '../types';

export type QM_PatternType = '吉' | '凶' | '中' | '特殊';

export interface QMPattern {
  /** 格局名称（中文） */
  name: string;
  
  /** 吉凶类型 */
  type: QM_PatternType;
  
  /** 详细描述（用于生成建议） */
  desc: string;
  
  /** 行动建议（可选） */
  advice?: string;
  
  /** 适用事项（可选，用于过滤） */
  applicableTo?: string[]; // 如 ['wealth', 'investment']
  
  /** 行业备注（可选） */
  industryNote?: Record<string, string>;
}

export const QM_PATTERNS: Record<string, QMPattern> = {
  // ———————— 三奇六仪 + 八门 ————————
  
  // 【吉格】
  'Wu_Bing': {
    name: '青龙返首',
    type: '吉',
    desc: '戊+丙，大利求财、签约、启动项目，事半功倍',
    advice: '宜主动推进，把握时机',
    applicableTo: ['wealth', 'business', 'contract']
  },
  'Bing_Wu': {
    name: '飞鸟跌穴',
    type: '吉',
    desc: '丙+戊，贵人提携，计划顺利落地',
    advice: '可寻求上级或权威支持',
    applicableTo: ['jobInterview', 'careerPromotion']
  },
  'Ding_Ji': {
    name: '朱雀投江',
    type: '凶',
    desc: '丁+己，计划落空，文书无效，表白被拒',
    advice: '暂缓行动，检查细节',
    applicableTo: ['contract', 'communication', 'relationship']
  },
  'Ji_Ding': {
    name: '朱雀入狱',
    type: '凶',
    desc: '己+丁，阴谋暗藏，合同有陷阱',
    advice: '谨防欺骗，勿轻信口头承诺',
    applicableTo: ['contract', 'investment']
  },
  'Ren_Ding': {
    name: '干合蛇刑',
    type: '中',
    desc: '壬+丁，表面合作，暗藏纠纷；感情纠缠',
    advice: '需明确条款，避免模糊约定',
    applicableTo: ['relationship', 'contract'],
    industryNote: {
      '金融': '注意对赌条款',
      '跨境电商': '警惕汇率对冲陷阱'
    }
  },
  'Ding_Ren': {
    name: '干合蛇刑（反）',
    type: '中',
    desc: '丁+壬，合作意愿强，但执行力弱',
    advice: '需设定明确时间节点',
    applicableTo: ['business', 'communication']
  },

  // 【凶格】
  'Geng_Bing': {
    name: '贼必来',
    type: '凶',
    desc: '庚+丙，冲突爆发，诈骗、官司、口舌',
    advice: '避免争执，保留证据',
    applicableTo: ['lawsuit', 'competitor', 'safety']
  },
  'Bing_Geng': {
    name: '贼必来（反格）',
    type: '凶',
    desc: '丙+庚，主动惹祸，冲动决策导致损失',
    advice: '三思后行，勿情绪化',
    applicableTo: ['investment', 'resignation']
  },
  'Gui_Ding': {
    name: '腾蛇夭矫',
    type: '凶',
    desc: '癸+丁，文书错误，虚诈不实，系统故障',
    advice: '反复核对，避免电子操作失误',
    applicableTo: ['contract', 'exam', 'lostElectronics'],
    industryNote: {
      '电商': '订单系统可能出错',
      '金融': '交易指令可能失败'
    }
  },
  'Ding_Gui': {
    name: '朱雀投江（变格）',
    type: '凶',
    desc: '丁+癸，希望破灭，计划流产',
    advice: '及时止损，调整方向',
    applicableTo: ['business', 'investment']
  },
  'Yi_Geng': {
    name: '龙逃走',
    type: '凶',
    desc: '乙+庚，合作破裂，人财两空，感情分手',
    advice: '不宜强求，及早抽身',
    applicableTo: ['relationship', 'business']
  },
  'Geng_Yi': {
    name: '虎猖狂',
    type: '凶',
    desc: '庚+乙，主动受损，被对方牵制',
    advice: '守势为佳，避免主动出击',
    applicableTo: ['competitor', 'lawsuit']
  },

  // ———————— 三奇六仪 + 九星 ————————
  
  // 三奇相关
  'Yi_TianFu': {
    name: '日奇被辅',
    type: '吉',
    desc: '乙+天辅，文书得力，考试顺利，教育合作佳',
    advice: '宜签约、学习、提交申请',
    applicableTo: ['exam', 'contract', 'education']
  },
  'Ding_TianXin': {
    name: '玉女守门',
    type: '吉',
    desc: '丁+天心，医药有效，医生得力，技术方案可行',
    advice: '宜就医、手术、技术评审',
    applicableTo: ['treatment', 'health', 'techProject']
  },
  'Bing_TianYing': {
    name: '荧入白',
    type: '凶',
    desc: '丙+天英，火克金，急躁冒进，计划易败',
    advice: '避免高调宣传，谨防口舌',
    applicableTo: ['promotion', 'marketing', 'investment']
  },

  // 六仪相关
  'Wu_TianRen': {
    name: '青龙伏首',
    type: '吉',
    desc: '戊+天任，地产、农业、稳定收益项目顺利',
    advice: '宜投资不动产、长期项目',
    applicableTo: ['business', 'investment'],
    industryNote: {
      '政府公务': '土地审批顺利',
      '物流': '仓储基地建设有利'
    }
  },
  'Ji_TianRui': {
    name: '地户逢鬼',
    type: '凶',
    desc: '己+天芮，隐疾加重，内部管理混乱，账目不清',
    advice: '全面体检或审计，排查隐患',
    applicableTo: ['health', 'internalAudit']
  },
  'Geng_TianXin': {
    name: '白入荧',
    type: '吉',
    desc: '庚+天心，以刚制柔，官司胜诉，技术破局',
    advice: '可据理力争，准备充分证据',
    applicableTo: ['lawsuit', 'debtCollection', 'techDispute']
  },
  'Xin_TianZhu': {
    name: '白虎猖狂',
    type: '凶',
    desc: '辛+天柱，口舌官非，通信故障，团队冲突',
    advice: '暂停重要沟通，修复关系',
    applicableTo: ['relationship', 'communication']
  },

  // ———————— 三奇六仪 + 八神 ————————
  
  // 值符（贵人/政策）
  'Wu_ZhiFu': {
    name: '青龙值符',
    type: '吉',
    desc: '戊+值符，官方拨款、政策支持、大额资金到位',
    advice: '宜申报项目、申请贷款',
    applicableTo: ['governmentAffairs', 'business'],
    industryNote: {
      '政府公务': '财政拨款顺利',
      '金融': '监管审批通过'
    }
  },
  'Ding_ZhiFu': {
    name: '玉女值符',
    type: '吉',
    desc: '丁+值符，贵人提携，面试成功，合同获批',
    advice: '主动联系上级或关键人',
    applicableTo: ['jobInterview', 'contract']
  },
  'Gui_ZhiFu': {
    name: '天网四张',
    type: '凶',
    desc: '癸+值符，政策突变，审批受阻，流程卡顿',
    advice: '暂缓申报，等待窗口期',
    applicableTo: ['governmentAffairs', 'relocation']
  },

  // 螣蛇（虚惊/反复）
  'Bing_TengShe': {
    name: '荧蛇相缠',
    type: '凶',
    desc: '丙+螣蛇，计划反复，系统故障，情绪焦虑',
    advice: '备份方案，避免依赖单一路径',
    applicableTo: ['techLaunch', 'exam']
  },
  'Wu_TengShe': {
    name: '青龙缠绕',
    type: '中',
    desc: '戊+螣蛇，资金到账但附带条件，合同条款复杂',
    advice: '仔细阅读细则，勿轻信口头承诺',
    applicableTo: ['contract', 'investment']
  },

  // 太阴（暗助/女性）
  'Yi_TaiYin': {
    name: '日奇入阴',
    type: '吉',
    desc: '乙+太阴，私下合作成功，女性资源助力',
    advice: '可通过私下渠道推进',
    applicableTo: ['relationship', 'businessNegotiation']
  },
  'Ding_TaiYin': {
    name: '玉女守阴',
    type: '吉',
    desc: '丁+太阴，秘密计划成功，低调签约有利',
    advice: '宜保密操作，避免公开',
    applicableTo: ['contract', 'merger']
  },
  'YuNuShouMen': {
    name: '玉女守门',
    type: '吉',
    desc: '值使门+丁奇，百事大吉，利于婚恋、宴请、公关',
    advice: '宜主动出击，利用人际关系',
    applicableTo: ['relationship', 'social', 'business']
  },

  // 六合（合作/中介）
  'Wu_LiuHe': {
    name: '青龙合会',
    type: '吉',
    desc: '戊+六合，合作得财，交易顺利，平台活动成功',
    advice: '宜签合同、谈分成、上活动',
    applicableTo: ['business', 'contract'],
    industryNote: {
      '电商': '大促报名成功，流量扶持',
      '物流': '运力合作达成，价格优惠'
    }
  },
  'Ji_LiuHe': {
    name: '地户合会',
    type: '吉',
    desc: '己+六合，小额资金合作，灵活结算',
    advice: '适合短期、灵活项目',
    applicableTo: ['freelance', 'smallDeal']
  },
  'Geng_LiuHe': {
    name: '白虎合会',
    type: '中',
    desc: '庚+六合，表面合作，实则竞争，需防条款陷阱',
    advice: '法律审核必做，明确退出机制',
    applicableTo: ['jointVenture', 'strategicPartnership']
  },

  // 白虎（风险/强硬）
  'Geng_BaiHu': {
    name: '白虎猖狂',
    type: '凶',
    desc: '庚+白虎，冲突升级，暴力、事故、强压',
    advice: '避免正面冲突，优先保安全',
    applicableTo: ['safety', 'lawsuit', 'logistics']
  },
  'Wu_BaiHu': {
    name: '青龙遭伤',
    type: '凶',
    desc: '戊+白虎，资金损失，投资失败，罚款风险',
    advice: '控制仓位，设置止损',
    applicableTo: ['investment', 'finance']
  },
  'Bing_BaiHu': {
    name: '荧入虎口',
    type: '凶',
    desc: '丙+白虎，突发火灾、系统崩溃、声誉危机',
    advice: '启动应急预案，控制舆情',
    applicableTo: ['crisisManagement', 'ITSystem']
  },

  // 玄武（欺骗/暗昧）
  'Wu_XuanWu': {
    name: '青龙盗宝',
    type: '凶',
    desc: '戊+玄武，钱财被骗，账目不清，数据造假',
    advice: '核对流水，加强风控',
    applicableTo: ['debtCollection', 'audit'],
    industryNote: {
      '金融': '警惕信贷欺诈',
      '电商': '防刷单套现',
      '跨境电商': '防PayPal争议退款'
    }
  },
  'Ding_XuanWu': {
    name: '朱雀入狱',
    type: '凶',
    desc: '丁+玄武，合同藏诈，电子签名被篡改',
    advice: '使用区块链存证，保留原始记录',
    applicableTo: ['contract', 'digitalSignature']
  },

  // 九地（稳定/长期）
  'Wu_JiuDi': {
    name: '青龙伏地',
    type: '吉',
    desc: '戊+九地，长期稳定收益，不动产增值',
    advice: '宜持有，不宜短期套现',
    applicableTo: ['realEstate', 'longTermInvestment']
  },
  'KaiMen_JiuDi': {
    name: '开门伏地',
    type: '吉',
    desc: '开门+九地，职位稳定，编制落实，政策延续',
    advice: '安心留任，积累资历',
    applicableTo: ['governmentAffairs', 'careerStability']
  },

  // 九天（扩张/高远）
  'Wu_JiuTian': {
    name: '青龙飞天',
    type: '吉',
    desc: '戊+九天，跨境资金、风投融资、高增长机会',
    advice: '大胆拓展，争取资源',
    applicableTo: ['crossBorderBusiness', 'startup']
  },
  'KaiMen_JiuTian': {
    name: '开门登天',
    type: '吉',
    desc: '开门+九天，海外机会、高层认可、战略升级',
    advice: '可提出高阶方案，争取支持',
    applicableTo: ['promotion', 'internationalExpansion']
  },

  // ———————— 特殊状态 ————————
  'RiGan_KongWang': {
    name: '日干空亡',
    type: '特殊',
    desc: '求测人能量不足，事难成，心不定',
    advice: '推迟决策，养精蓄锐',
    applicableTo: ['self', 'jobInterview', 'relationship']
  },
  'ShiGan_KongWang': {
    name: '时干空亡',
    type: '特殊',
    desc: '所问之事无果，对方无诚意',
    advice: '不必强求，另寻机会',
    applicableTo: ['otherPerson', 'debtCollection']
  },
  'Men_FuYin': {
    name: '伏吟',
    type: '特殊',
    desc: '八门回原宫，事情重复、拖延、内耗',
    advice: '需主动打破僵局',
    applicableTo: ['business', 'relationship']
  },
  'Men_FanYin': {
    name: '反吟',
    type: '特殊',
    desc: '八门对冲，变动剧烈，反复无常',
    advice: '稳守为佳，避免重大决定',
    applicableTo: ['travel', 'resignation']
  }
};

/**
 * 识别宫位中的格局
 * @param palace 宫位对象
 * @param ju 奇门局对象（用于获取日干/时干等全局信息）
 */
export function analyzePalacePatterns(palace: QM_Palace, ju: QM_Ju): QMPattern[] {
  const patterns: QMPattern[] = [];

  // Helper to add if exists
  const check = (key: string) => {
    if (QM_PATTERNS[key]) {
      patterns.push(QM_PATTERNS[key]);
    }
  };

  // 1. Stem-Stem (Heaven + Earth)
  // Key format: Heaven_Earth (e.g., 'Wu_Bing')
  // Note: We need to use the Key (e.g. 'Wu'), not the Label (e.g. '戊').
  // The QM_Palace interface stores keys like 'Wu', 'Bing' in heavenStem/earthStem?
  // Let's verify in qimenService.ts. 
  // Yes, GANS = ['Jia', 'Yi', ...]. heavenStem gets one of these.
  check(`${palace.heavenStem}_${palace.earthStem}`);

  // 2. Stem-Star (Heaven + Star)
  // Key format: Heaven_Star (e.g., 'Ding_TianXin')
  // palace.star.name is like 'TianPeng'.
  check(`${palace.heavenStem}_${palace.star.name}`);

  // 3. Stem-Deity (Heaven + Deity)
  // Key format: Heaven_Deity (e.g., 'Wu_LiuHe')
  // palace.deity.name is like 'ZhiFu'.
  check(`${palace.heavenStem}_${palace.deity.name}`);

  // 4. Special Patterns
  
  // YuNuShouMen: Duty Door + Earth Ding
  if (palace.door.name === ju.dutyDoorKey && palace.earthStem === 'Ding') {
    check('YuNuShouMen');
  }

  // Door + Deity (New Check)
  check(`${palace.door.name}_${palace.deity.name}`);
  
  // RiGan_KongWang: If RiGan falls in this palace AND this palace is KongWang
  // ju.pillars[2] is Day Pillar.
  const dayGan = ju.pillars[2].gan;
  // We need to match dayGan (e.g. 'Jia') with palace.heavenStem? 
  // Usually RiGan KongWang refers to the palace where RiGan resides on the Heaven Plate (or Earth Plate?).
  // Usually Heaven Plate is the "Subject".
  if (palace.isKongWang && palace.heavenStem === dayGan) {
     check('RiGan_KongWang');
  }

  // ShiGan_KongWang
  const hourGan = ju.pillars[3].gan;
  if (palace.isKongWang && palace.heavenStem === hourGan) {
     check('ShiGan_KongWang');
  }

  // Men_FuYin: Door in original palace
  // palace.door.originalPalace is a number (1-9).
  if (palace.door.originalPalace === palace.index) {
    check('Men_FuYin');
  }

  // Men_FanYin: Door in opposite palace
  // Opposite means sum of indices is 10 (1+9, 2+8, 3+7, 4+6). Center 5 has no opposite usually in this context or stays 5.
  if (palace.index !== 5 && (palace.index + palace.door.originalPalace === 10)) {
    check('Men_FanYin');
  }

  return patterns;
}
