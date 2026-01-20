import { BaziChart } from '../types';
import { DailyFortuneResult } from './dailyFortuneService';
import { 
  getGanZhiForDate, 
  getStemIndex,
  BRANCH_COMBINATIONS
} from './baziService';
import { 
  FIVE_ELEMENTS, 
  EARTHLY_BRANCHES, 
  HEAVENLY_STEMS,
  LIFE_STAGES_TABLE,
  TIAN_YI_MAP, WEN_CHANG_MAP, LU_SHEN_MAP, YANG_REN_MAP,
  YI_MA_MAP, HUA_GAI_MAP, JIANG_XING_MAP, XIAN_CHI_MAP,
  HONG_LUAN_MAP, JIN_YU_MAP, BRANCH_CLASHES,
  NA_YIN_DESCRIPTIONS,
  BRANCH_XING, BRANCH_HAI, BRANCH_PO
} from './constants';

// ==========================================
// 🏗️ 语义积木库 (Semantic Building Blocks)
// ==========================================

// 1. 十神侧写库 (区分 喜用 / 忌神 / 平运)
// 结构：[喜用描述, 忌神描述, 平运描述]
const TEN_GOD_PROFILE: Record<string, [string[], string[], string[]]> = {
  '正官': [
    ['贵气加身', '威望提升', '秩序井然', '利于考核', '大局在握'],
    ['压力束缚', '墨守成规', '刻板焦虑', '易犯官非', '处处受掣'],
    ['按部就班', '循规蹈矩', '公事公办', '平稳履职']
  ],
  '七杀': [
    ['雷厉风行', '破局重生', '大刀阔斧', '权柄在握', '勇往直前'],
    ['危机四伏', '小人作祟', '身心透支', '突发压力', '意外频生'],
    ['接受挑战', '直面困难', '处理急务', '保持警惕']
  ],
  '正印': [
    ['如沐春风', '贵人提携', '思维从容', '名誉加分', '心境祥和'],
    ['依赖懒散', '思维迟钝', '死要面子', '错失良机', '反应迟缓'],
    ['学习充电', '休养生息', '规划未来', '寻求建议']
  ],
  '偏印': [
    ['独辟蹊径', '灵感爆棚', '洞察敏锐', '利于偏门', '艺术感知'],
    ['孤芳自赏', '钻牛角尖', '人际冷淡', '多疑敏感', '胡思乱想'],
    ['深度思考', '研究玄学', '独自钻研', '另类视角']
  ],
  '正财': [
    ['勤劳致富', '稳健增值', '现实务实', '收获满满', '踏实肯干'],
    ['为钱奔波', '斤斤计较', '因小失大', '守财奴', '入不敷出'],
    ['收支平衡', '处理账务', '理性消费', '关注现实']
  ],
  '偏财': [
    ['八方来财', '慷慨豪爽', '意外之喜', '商业敏锐', '长袖善舞'],
    ['财来财去', '挥霍无度', '贪小便宜', '浮华虚荣', '投资失利'],
    ['寻找商机', '社交应酬', '尝试投资', '灵活变通']
  ],
  '食神': [
    ['安逸享乐', '口福颇佳', '温和宽厚', '才华流露', '心情舒畅'],
    ['不思进取', '言多必失', '慵懒无为', '肠胃不适', '过度放纵'],
    ['享受生活', '品尝美食', '放松身心', '展现才艺']
  ],
  '伤官': [
    ['才华横溢', '打破常规', '激情澎湃', '魅力四射', '创新突破'],
    ['恃才傲物', '口舌是非', '情绪失控', '顶撞上司', '惹是生非'],
    ['发挥创意', '表达观点', '寻求变革', '展示自我']
  ],
  '比肩': [
    ['兄弟同心', '意志坚定', '合作共赢', '自信满满', '并肩作战'],
    ['固执己见', '盲目竞争', '互不相让', '一意孤行', '排斥他人'],
    ['在此坚守', '寻求合作', '保持自我', '平等待人']
  ],
  '劫财': [
    ['人脉变现', '整合资源', '借力打力', '执行力强', '雷厉风行'],
    ['冲动破财', '遇人不淑', '盲目跟风', '争强好胜', '遭受掠夺'],
    ['拓展人脉', '积极竞争', '处理复杂', '忙碌奔波']
  ]
};

// 2. 地支互动描述 (Action)
const BRANCH_ACTION: Record<string, string[]> = {
  '冲': ['气场激荡，计划易变，犹如逆水行舟，需稳住阵脚。', '动荡之象，事多反复，要有两手准备。', '冲击力强，旧的不去新的不来，利于破局。'],
  '合': ['气场融合，左右逢源，犹如顺水推舟，利于结盟。', '和谐之象，多得助力，适合沟通与合作。', '情投意合，阻力减小，办事效率倍增。'],
  '刑': ['气场纠结，易生郁闷，犹如陷入泥沼，需调整心态。', '内心矛盾，进退两难，不如暂时放下。', '彼此折磨，沟通不畅，需多一份包容。'],
  '害': ['气场互斥，易犯小人，犹如暗箭难防，需低调行事。', '不仅不合，反而相害，防人之心不可无。', '易受拖累，亲近之人可能帮倒忙。'],
  '破': ['气场破耗，易有损坏，犹如器物出现裂痕，需小心维护。', '内部消耗，效率降低，注意细节问题。'],
  '无': ['气场平稳，波澜不惊，犹如风和日丽，宜按部就班。', '无风无浪，正是积蓄力量的好时机。', '岁月静好，适合处理日常事务。']
};

// 3. 长生能量描述 (Energy)
const LIFE_STAGE_DESC: Record<string, string> = {
  '长生': '生机勃勃，如旭日东升', '沐浴': '起伏不定，如桃花绽放',
  '冠带': '意气风发，如穿戴整齐', '临官': '从容不迫，如壮年得志',
  '帝旺': '气势如虹，如日中天',   '衰':   '盛极而衰，需守成',
  '病':   '能量低回，需养护',     '死':   '静如止水，宜修心',
  '墓':   '韬光养晦，宜积淀',     '绝':   '否极泰来，寻转机',
  '胎':   '运势萌芽，正在酝酿',   '养':   '休养生息，积蓄力量'
};

// 4. 神煞文案生成器 (Special Effects)
const SHEN_SHA_TEXT = {
  general: (s: string) => ({
    '天乙贵人': '🌟 逢天乙贵人，属于上等吉日，遇事自有解围。',
    '驿马': '🐎 驿马奔腾，多有奔波走动或远行之象。',
    '桃花': '🌸 桃花入命，社交魅力无法阻挡，人缘极佳。',
    '文昌': '📜 文昌点窍，灵感智慧源源不断。',
    '羊刃': '⚔️ 羊刃刚烈，行事需防刚愎自用。'
  }[s] || ''),
  
  wealth: (s: string) => ({
    '禄神': '💰 **禄神得财**：正财运稳健，努力终有回报，适合谈薪或收账。',
    '金舆': '🚗 **金舆送宝**：易有意外物质享受，或在车辆、资产上获益。',
    '羊刃': '💸 **羊刃劫财**：(忌神时) 需捂紧钱包！易有突发大额支出，切忌担保。',
    '劫煞': '📉 **劫煞干扰**：财运易受突发事件干扰，投资需极其谨慎。'
  }[s] || ''),

  work: (s: string) => ({
    '文昌': '📜 **文昌助力**：文思泉涌，利于写作、考证、签约，复杂工作也能条理清晰。',
    '将星': '♟️ **将星掌权**：领导力提升，利于统筹全局，说话有分量。',
    '华盖': '🎨 **华盖显才**：灵感独特，利于策划设计或独自钻研，但略显孤僻。',
    '驿马': '✈️ **马星奔波**：动中求成，利于出差、外勤或开拓新市场。'
  }[s] || ''),

  love: (s: string) => ({
    '红鸾': '💍 **红鸾星动**：大吉！单身者易遇正缘，有伴者感情升温，利婚嫁表白。',
    '天喜': '🎉 **天喜临门**：感情生活充满喜悦，易有开心事发生。',
    '红艳': '💋 **红艳迷人**：异性缘爆棚，魅力四射，但需防多情惹扰。',
    '咸池': '🌸 **桃花泛滥**：社交活跃，但需注意分辨烂桃花，避免暧昧不清。'
  }[s] || ''),

  life: (s: string) => ({
    '驿马': '🚗 **出行之象**：心在远方，适合旅行兜风，但需注意交通安全。',
    '羊刃': '⚠️ **防范未然**：气场刚烈，易有磕碰。今日不宜剧烈运动，操作利器需留神。',
    '孤辰': '🧘 **独处修心**：略感孤独，不如享受一个人的时光，阅读或冥想。',
    '寡宿': '🏠 **深居简出**：社交兴致缺缺，适合宅家整理，陪伴家人。'
  }[s] || '')
};

// ==========================================
// 🛠️ 辅助函数
// ==========================================

/**
 * 随机选择器：基于日期做伪随机，保证同一天给出的文案固定，但不同天不同
 */
const pickOne = (list: string[], dateSeed: number): string => {
  if (!list || list.length === 0) return '';
  return list[dateSeed % list.length];
};

/**
 * 判断相刑/相害/相破
 */
const checkRelations = (todayZhi: string, userDayZhi: string) => {
  const isXing = BRANCH_XING[todayZhi]?.includes(userDayZhi) || false;
  const isHai = BRANCH_HAI[todayZhi] === userDayZhi;
  const isPo = BRANCH_PO[todayZhi] === userDayZhi;
  return { isXing, isHai, isPo };
};

// ==========================================
// 🔥 核心逻辑：全能运势生成器
// ==========================================

export const calculateDailyFortuneBasic = (chart: BaziChart, date: Date = new Date()): DailyFortuneResult => {
  const todayGz = getGanZhiForDate(date, chart.dayMaster);
  const dm = chart.dayMaster;
  const todayGan = todayGz.gan;
  const todayZhi = todayGz.zhi;
  const userDayZhi = chart.pillars.day.ganZhi.zhi;
  const userYearZhi = chart.pillars.year.ganZhi.zhi;
  const tenGod = todayGz.shiShenGan;

  // 生成一个基于日期的随机种子 (0-999)
  const dateSeed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();

  // 1. 基础关系
  const isYongShen = chart.balance.yongShen.includes(todayGz.ganElement);
  const isJiShen = chart.balance.jiShen.includes(todayGz.ganElement);
  const isChong = BRANCH_CLASHES[todayZhi] === userDayZhi;
  const isHe = BRANCH_COMBINATIONS[todayZhi] === userDayZhi;
  const { isXing, isHai, isPo } = checkRelations(todayZhi, userDayZhi);
  
  // 天克地冲判断
  const isGanClash = (g1: string, g2: string) => {
      const map: Record<string, string> = {'甲':'戊','乙':'己','丙':'庚','丁':'辛','戊':'壬','己':'癸','庚':'甲','辛':'乙','壬':'丙','癸':'丁'};
      return map[g1] === g2 || map[g2] === g1;
  };
  const isTianKeDiChong = isGanClash(todayGan, chart.pillars.day.ganZhi.gan) && isChong;

  // 2. 长生状态
  const stemIdx = HEAVENLY_STEMS.indexOf(dm);
  const zhiIdx = EARTHLY_BRANCHES.indexOf(todayZhi);
  const lifeStage = LIFE_STAGES_TABLE[stemIdx][zhiIdx];

  // 3. 收集神煞 (Tags)
  const tags: string[] = [];
  if (TIAN_YI_MAP[dm]?.includes(todayZhi)) tags.push('天乙贵人');
  if (WEN_CHANG_MAP[dm] === todayZhi) tags.push('文昌');
  if (YI_MA_MAP[userDayZhi] === todayZhi || YI_MA_MAP[userYearZhi] === todayZhi) tags.push('驿马');
  if (XIAN_CHI_MAP[userDayZhi] === todayZhi || XIAN_CHI_MAP[userYearZhi] === todayZhi) tags.push('桃花'); // 咸池
  if (HONG_LUAN_MAP[userYearZhi] === todayZhi) tags.push('红鸾');
  if (YANG_REN_MAP[dm] === todayZhi) tags.push('羊刃');
  if (LU_SHEN_MAP[dm] === todayZhi) tags.push('禄神');
  if (JIN_YU_MAP[dm] === todayZhi) tags.push('金舆');
  if (HUA_GAI_MAP[userDayZhi] === todayZhi) tags.push('华盖');
  if (JIANG_XING_MAP[todayZhi]) tags.push('将星');

  // ==========================================
  // 🌟 板块一：总纲 (General Outline)
  // ==========================================
  
  // [A] 标题 (Headline)
  let headline = "";
  if (isTianKeDiChong) headline = "⚠️ 天克地冲，静守安康";
  else if (isChong && tags.includes('天乙贵人')) headline = "🌟 冲中逢贵，险中求胜";
  else if (isChong && tags.includes('驿马')) headline = "🐎 马奔财乡，动中求变";
  else if (isChong) headline = "🌪️ 岁运相冲，以静制动";
  else if (isXing) headline = "😖 刑伤之日，放平心态";
  else if (isHai) headline = "⚠️ 六害临身，防备小人";
  else if (isPo) headline = "💔 运势破损，小心理财";
  else if (isHe && tags.includes('桃花')) headline = "🌸 花好月圆，人缘极佳";
  else if (isHe) headline = "🤝 天地人和，左右逢源";
  else if (tags.includes('天乙贵人')) headline = "🌟 贵人登门，诸事顺遂";
  else if (isYongShen) headline = `🚀 ${tenGod}得地，顺风顺水`;
  else if (isJiShen) headline = `🛑 ${tenGod}攻身，谨慎前行`;
  else headline = `📅 ${tenGod}主事，平稳有序`;

  // [B] 十神特写 (Character)
  const profileSet = TEN_GOD_PROFILE[tenGod] || TEN_GOD_PROFILE['比肩'];
  // 0=喜, 1=忌, 2=平。根据喜忌选择对应的词库
  const profileIndex = isYongShen ? 0 : (isJiShen ? 1 : 2);
  const charDesc = pickOne(profileSet[profileIndex], dateSeed);

  // [C] 动态交互 (Action)
  let actionKey = '无';
  if (isChong) actionKey = '冲';
  else if (isHe) actionKey = '合';
  else if (isXing) actionKey = '刑';
  else if (isHai) actionKey = '害';
  else if (isPo) actionKey = '破';
  const actionDesc = pickOne(BRANCH_ACTION[actionKey], dateSeed);

  // [D] 能量 (Energy)
  const energyStr = LIFE_STAGE_DESC[lifeStage] || `行至${lifeStage}地`;

  // [E] 神煞点缀 (Tags)
  let shenShaText = "";
  if (tags.length > 0) {
    const mainTag = tags[0]; // 取第一个主要神煞做描述
    shenShaText = SHEN_SHA_TEXT.general(mainTag);
    if (tags.length > 1) shenShaText += ` 且逢${tags.slice(1).join('、')}入命。`;
  }

  // 组装总纲
  const general = `
    **${headline}**
    今日${tenGod}当值，主“${charDesc}”。
    ${energyStr}，${actionDesc}
    ${shenShaText}
    (纳音：${todayGz.naYin}，${NA_YIN_DESCRIPTIONS[todayGz.naYin] || '意象独特'})
  `.trim();

  // ==========================================
  // 🌟 板块二：财运 (Wealth)
  // ==========================================
  let wealthText = "";
  // 1. 神煞优先
  if (tags.includes('禄神')) wealthText = SHEN_SHA_TEXT.wealth('禄神');
  else if (tags.includes('金舆')) wealthText = SHEN_SHA_TEXT.wealth('金舆');
  else if (tags.includes('羊刃') && isJiShen) wealthText = SHEN_SHA_TEXT.wealth('羊刃');
  // 2. 十神判断
  else if (['比肩', '劫财'].includes(tenGod)) {
      wealthText = isJiShen 
        ? "💸 **群比争财**：捂紧钱包！今日易有人情破费或冲动投资，切忌盲目跟风。" 
        : "🤝 **合作生财**：利于人脉变现，适合谈合作，但亲兄弟也要明算账。";
  } else if (['正财', '偏财'].includes(tenGod)) {
      wealthText = isYongShen
        ? "📈 **财星高照**：对商业机会嗅觉灵敏，理财易有斩获，付出有回报。"
        : "💳 **财多身弱**：看见的肉多，吃进嘴的少。注意控制消费欲，避免透支。";
  } else if (['食神', '伤官'].includes(tenGod)) {
      wealthText = "💡 **技艺生财**：你的专业技能或创意是今日财富源泉，多动脑少动手。";
  } else {
      wealthText = isChong 
        ? "⚡ **动中求财**：财运波动较大，今日不宜死守，不如主动出击或寻找变现机会。"
        : "🛡️ **收支平衡**：财运平稳，与其关注收益，不如规划一下长期的理财方案。";
  }

  // ==========================================
  // 🌟 板块三：工作 (Work)
  // ==========================================
  let workText = "";
  if (tags.includes('文昌')) workText = SHEN_SHA_TEXT.work('文昌');
  else if (tags.includes('将星')) workText = SHEN_SHA_TEXT.work('将星');
  else if (tags.includes('华盖')) workText = SHEN_SHA_TEXT.work('华盖');
  else if (tags.includes('驿马')) workText = SHEN_SHA_TEXT.work('驿马');
  else if (['正官', '七杀'].includes(tenGod)) {
      workText = isYongShen
        ? "🚀 **事业上升**：易得领导赏识，或接手重要项目。宜高调做事，展现实力。"
        : "🏋️ **压力测试**：任务繁重，或面临严格考核。建议做好时间管理，避免忙中出错。";
  } else if (['伤官'].includes(tenGod)) {
      workText = "🎨 **创意无限**：利于设计、策划类工作。但需收敛锋芒，避免顶撞上级。";
  } else if (['正印', '偏印'].includes(tenGod)) {
      workText = "📚 **充电时刻**：思维清晰，利于做规划或学习新技能，遇难题不妨请教前辈。";
  } else {
      if (isXing || isHai) {
        workText = "😖 **人际摩擦**：职场沟通易生误会，建议少说话多做事，用邮件留痕，避免口舌。";
      } else if (isPo) {
        workText = "💔 **细节疏漏**：工作易出纰漏或被内部消耗，需仔细核对文档，注意细节。";
      } else {
        workText = "📂 **稳步推进**：工作按部就班，虽无大风浪，但积累的每一步都算数。";
      }
  }

  // ==========================================
  // 🌟 板块四：生活 (Life)
  // ==========================================
  let lifeText = "";
  if (tags.includes('驿马')) lifeText = SHEN_SHA_TEXT.life('驿马');
  else if (tags.includes('羊刃')) lifeText = SHEN_SHA_TEXT.life('羊刃');
  else if (['死', '墓', '绝', '病'].includes(lifeStage)) {
      lifeText = "💤 **养精蓄锐**：身体能量处于低谷，易感疲惫。今日最好的养生是早睡早起，拒绝无效社交。";
  } else if (['食神'].includes(tenGod)) {
      lifeText = "🍵 **乐享生活**：口福不浅，适合打卡美食、烹饪或享受一场SPA。保持心情愉悦是今日最好的养生。";
  } else if (isChong) {
      lifeText = "⚡ **情绪管理**：日支逢冲，容易莫名烦躁。建议做些冥想，或者整理房间，恢复内心平静。";
  } else {
      lifeText = "☀️ **平淡是真**：状态平稳，适合陪伴家人、阅读好书或侍弄花草，感受生活的烟火气。";
  }

  // ==========================================
  // 🌟 板块五：感情 (Love)
  // ==========================================
  let loveText = "";
  if (tags.includes('红鸾') || tags.includes('天喜')) loveText = SHEN_SHA_TEXT.love('红鸾'); // 红鸾天喜同解
  else if (tags.includes('红艳')) loveText = SHEN_SHA_TEXT.love('红艳');
  else if (tags.includes('桃花')) loveText = SHEN_SHA_TEXT.love('咸池');
  else if (isHe) {
      loveText = "💞 **默契满分**：日支六合，与伴侣心意相通，适合深度沟通或解决之前的误会。";
  } else if (isChong) {
      loveText = "💔 **冷静处理**：夫妻宫逢冲，最忌翻旧账。遇到争执请先冷处理，给彼此空间。";
  } else {
      const isMale = chart.gender === 'male';
      const isLoveStar = (isMale && ['正财', '偏财'].includes(tenGod)) || (!isMale && ['正官', '七杀'].includes(tenGod));
      if (isLoveStar) {
         loveText = `💘 **缘分靠近**：${isMale?'财星':'官星'}透出，机会就在身边。不妨主动一点，约喜欢的人吃饭。`;
      } else {
         loveText = "🕊️ **岁月静好**：感情生活波澜不惊，享受独处的自在，或与伴侣像老友一样相处。";
      }
  }

  // ==========================================
  // 📊 综合评级
  // ==========================================
  let score = 60;
  if (isYongShen) score += 10;
  if (isJiShen) score -= 10;
  if (isChong) score -= 15;
  if (isHe) score += 10;
  if (isXing) score -= 10;
  if (isHai) score -= 10;
  if (isPo) score -= 5;
  if (tags.includes('天乙贵人')) score += 20;
  if (tags.includes('禄神')) score += 10;
  if (isTianKeDiChong) score -= 20;
  if (['帝旺', '临官'].includes(lifeStage)) score += 5;
  
  // 限制分数范围 0-100
  score = Math.max(0, Math.min(100, score));

  let rating: DailyFortuneResult['auspiciousness'] = '平';
  if (score >= 85) rating = '大吉';
  else if (score >= 70) rating = '中吉'; // Mapped '吉' to '中吉'
  else if (score >= 60) rating = '小吉';
  else if (score <= 40) rating = '凶';
  else if (score <= 55) rating = '平'; // '小凶' map to 平 or 凶? Let's say 平 for 45-55

  // Refine rating logic
  if (score >= 85) rating = '大吉';
  else if (score >= 75) rating = '中吉';
  else if (score >= 60) rating = '小吉';
  else if (score >= 45) rating = '平';
  else rating = '凶';

  return {
    auspiciousness: rating,
    summary: general,
    scores: {
      wealth: score,
      career: score,
      emotion: score,
      health: score
    },
    advice: {
      wealth: wealthText,
      career: workText,
      emotion: loveText,
      life: lifeText
    }
  };
};
