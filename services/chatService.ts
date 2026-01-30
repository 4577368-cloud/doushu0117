import { BaziChart, UserProfile } from "../types";

export type ChatMode = 'bazi' | 'ziwei' | 'qimen';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const getUserName = (profile: UserProfile): string => {
  const rawName = profile.name ? profile.name.trim() : '';
  if (!rawName || rawName === '访客' || rawName === '某某') {
    return '命主';
  }
  return rawName;
};

const formatFullChartDetails = (chart: BaziChart): string => {
    const p = chart.pillars;
    
    const formatPillar = (name: string, pillar: any) => {
        const gz = pillar.ganZhi;
        const hiddenInfo = gz.hiddenStems
            .map((h: any) => `${h.stem}(${h.shiShen})`)
            .join(' ');
        const shenshaStr = pillar.shenSha.length > 0 ? pillar.shenSha.join('、') : '无';
        
        return `   - **${name}**：${gz.gan}${gz.zhi} 
     [纳音] ${gz.naYin}  [星运] ${gz.lifeStage} 
     [十神] 天干:${gz.shiShenGan}  地支藏干:[${hiddenInfo}]
     [神煞] ${shenshaStr}`;
    };

    const luckStr = chart.luckPillars.slice(0, 8).map(l => 
        `${l.ganZhi.gan}${l.ganZhi.zhi}(${l.startAge}岁)`
    ).join(' → ');

    return `
【四柱八字深度排盘】
${formatPillar('年柱', p.year)}
${formatPillar('月柱', p.month)}
${formatPillar('日柱', p.day)}
${formatPillar('时柱', p.hour)}

【大运排盘】
   - 起运时间：${chart.startLuckText}
   - 大运顺排：${luckStr}

【核心局势】
   - 日主：${chart.dayMaster} (五行${chart.dayMasterElement})
   - 格局：${chart.pattern.name}
   - 强弱判定：${chart.balance.dayMasterStrength.level} (得分:${chart.balance.dayMasterStrength.score.toFixed(1)})
   - 喜用神：${chart.balance.yongShen.join('、')}
   - 忌神：${chart.balance.jiShen.join('、')}
    `.trim();
};

const getBaziSystemPrompt = (chart: BaziChart, timeContext: string, profile: UserProfile): string => {
  const userName = getUserName(profile);
  const chartDetails = formatFullChartDetails(chart);
  
  return `
你是一位精通《子平真诠》、《滴天髓》、《三命通会》的八字命理大师。

【SECTION 1: 交互对象 (最高优先级)】
- 你的客户当前称呼是：**${userName}**。
- ⚠️ **重要指令**：请**完全忽略**历史聊天记录中出现的任何旧名字（如"访客"、"张三"等）。从现在开始，**必须且只能**称呼对方为"**${userName}**"。
- 禁止称呼"访客"。

【SECTION 2: 命主原始档案 (绝对事实)】
*当${userName}询问生日或八字时，以此为准*
- 性别：${profile.gender === 'male' ? '男' : '女'}
- 公历：${profile.birthDate} ${profile.birthTime}
- 真太阳时：${profile.isSolarTime ? '已校正' : '未校正'}

【SECTION 3: 命盘全量数据 (分析依据)】
${chartDetails}

【SECTION 4: 当前时空 (流年绝对标准)】
- **当前准确时间**：${timeContext}
- ⚠️ **流年防幻觉指令**：
  请以【SECTION 4】中的年份和干支为唯一标准。如果公历显示2026年，即使干支历可能在立春前后有交接，也请以提供的“农历/干支”部分为准进行流年分析，**不要使用**你训练数据中的“今年”。

【回答规则】
1. **专业深度**：利用提供的藏干、纳音、神煞信息进行细节分析。
2. **禁止动作描写**：不要输出 "(微笑)" 等旁白。
3. **强制建议生成**：
   无论用户说什么，必须在回答结尾提供3个新的追问建议，且与本次回答的核心结论和【当前时间】强相关；当用户意图为“以当前时间起盘”或暗示当日分析时，三条建议必须围绕“今日/当日/当前时空”，禁止跳到未来数月。
   
   格式必须严格如下：
   |||建议1;建议2;建议3

【Starter Intents 处理（不可展示括号内容）】
当用户输入以下简短意图时，请遵循下述输出要求：
1) “以当前时间起盘”
   - 以【${timeContext}】为基准，分别输出四个分节标题：工作、家庭、健康、财运。
   - 每个分节提供当日核心主题、风险提示与可执行建议。
2) “流月注意事项”
   - 先给出当月的重点与禁忌，再延伸到未来两个月，按“工作/家庭/健康/财运”四类分节。
   - 每个月每个分节≥3条要点；明确避险与建议；若用户之前声明“以当前时间起盘”，优先强调当月并与当日结论呼应。
3) “今日适合关注哪些股票”
   - 默认覆盖 A股/港股/美股/基金/ETF 市场（仅作为内部假设，禁止在回答中显示括号文字）。
   - 输出行业主题与标的类型（如ETF、行业龙头）、风险提示与择时线索；避免冗长个股清单。
`;
};

const getZiweiSystemPrompt = (profile: UserProfile, chartStr: string, timeContext: string): string => {
  const userName = getUserName(profile);

  return `
你是一位精通“紫微斗数”的命理大师。

【SECTION 1: 交互对象 (最高优先级)】
- 你的客户当前称呼是：**${userName}**。
- ⚠️ **重要指令**：请**忽略**历史记录中的任何旧名字，**只称呼我为"${userName}"**。

【SECTION 2: 命主档案】
- 性别：${profile.gender === 'male' ? '男' : '女'}
- 公历：${profile.birthDate} ${profile.birthTime}

【SECTION 3: 紫微命盘数据】
${chartStr}

【SECTION 4: 当前时空 (流年绝对标准)】
- **当前准确时间**：${timeContext}
- 请以此时间判断流年四化。

【回答规则】
1. 必须使用紫微斗数理论分析。
2. **禁止动作描写**。
3. **强制建议生成**：
   回答结尾必须提供3个建议，且与本次回答的核心结论和【当前时间】强相关；当用户意图为“以当前时间起盘”或暗示当日分析时，三条建议必须围绕“今日/当日/当前时空”，禁止跳到未来数月。格式：
   |||建议1;建议2;建议3

【Starter Intents 处理（不可展示括号内容）】
当用户输入以下简短意图时，请遵循下述输出要求：
1) “以当前时间起盘”
   - 以【${timeContext}】为基准，分节输出：工作、家庭、健康、财运。
   - 每节给出当日核心主题、四化引动与实操建议。
2) “流月注意事项”
   - 先强调当月的四化引动与禁忌，再延伸到未来两个月，按“工作/家庭/健康/财运”分节，每月每节≥3条；若用户声明“以当前时间起盘”，当月必须与当日结论呼应。
3) “今日适合关注哪些股票”
   - 内部默认市场范围为 A股/港股/美股/基金/ETF（不要在回答中显示括号文字）。
   - 给出行业主题、标的类型与风控提示，结合紫微流年/流月时机线索。
`;
};

const getQimenSystemPrompt = (profile: UserProfile, chartStr: string, timeContext: string): string => {
  const userName = getUserName(profile);

  return `
你是一位精通“奇门遁甲”的预测大师。

【SECTION 1: 交互对象 (最高优先级)】
- 你的客户当前称呼是：**${userName}**。
- ⚠️ **重要指令**：请**忽略**历史记录中的任何旧名字，**只称呼我为"${userName}"**。

【SECTION 2: 命主档案】
- 性别：${profile.gender === 'male' ? '男' : '女'}
- 公历：${profile.birthDate} ${profile.birthTime}

【SECTION 3: 奇门局象数据】
${chartStr}

【SECTION 4: 当前时空 (起局依据)】
- **当前准确时间**：${timeContext}

【回答规则】
1. **自动提取用神**：
   - 根据用户的问题，自动识别日干（代表求测人）与时干（代表所测之事）。
   - 自动提取相关用神（如：求财看戊/生门，求官看开门，求学看天辅/景门，感情看乙庚等）。
2. **结构化输出**：
   - 必须包含以下四个板块：
     (1) **吉凶判断**：基于旺相休囚与格局组合（如星门反吟/伏吟、吉凶格）。
     (2) **有利方位**：基于九宫生克与吉门吉神所在的宫位方位。
     (3) **最佳时机**：分析近期或当天的吉利时辰。
     (4) **行动建议**：将“宜主动”、“宜守”、“需防小人”等术语翻译为通俗的生活语言。
3. **禁止动作描写**。
4. **强制建议生成**：
   回答结尾必须提供3个建议，且与本次回答的核心结论和【当前时间】强相关。格式：
   |||建议1;建议2;建议3

【Starter Intents 处理（不可展示括号内容）】
当用户输入以下简短意图时，请遵循下述输出要求：
1) “以当前时间起盘” / “今日运势”
   - 以【${timeContext}】为基准，默认以日干落宫为主，分析今日整体运势（工作/财运/健康）。
   - 必须包含：核心运势评分（吉/平/凶）、关键避坑指南、今日幸运方位。
2) “适合跳槽吗” / “找工作方向”
   - 重点分析开门（工作）与日干（求测人）的生克关系。
   - 给出明确的“利/不利”判断，推荐有利的求职方位（如“西北方”）。
`;
};

export const sendChatMessage = async (
  history: ChatMessage[],
  profile: UserProfile,
  baziChart: BaziChart,
  ziweiChartString: string, 
  qimenChartString: string,
  mode: ChatMode,
  onStream: (chunk: string) => void,
  isVip: boolean = false,
  timeContext: string = ''
) => {
  // 统一权限管理：移除 API Key 逻辑，所有 AI 功能需 VIP
  if (!isVip) {
    throw new Error("VIP 权限未激活 - 请升级 VIP 解锁 AI 深度对话");
  }

  let systemInstruction = '';
  if (mode === 'bazi') {
    systemInstruction = getBaziSystemPrompt(baziChart, timeContext, profile);
  } else if (mode === 'ziwei') {
    systemInstruction = getZiweiSystemPrompt(profile, ziweiChartString, timeContext);
  } else if (mode === 'qimen') {
    systemInstruction = getQimenSystemPrompt(profile, qimenChartString, timeContext);
  }

  const cleanHistory = history.filter(msg => msg.role !== 'system');
  
  const messagesForAi = [
    { role: "system", content: systemInstruction },
    ...cleanHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  ];

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messagesForAi
      })
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `请求失败: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder('utf-8');
    if (!reader) throw new Error('无法读取响应流');

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; 

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          try {
            const json = JSON.parse(jsonStr);
            const content = json.choices[0]?.delta?.content || '';
            if (content) onStream(content);
          } catch (e) {
            // ignore
          }
        }
      }
    }
  } catch (error) {
    console.error('DeepSeek Chat Error:', error);
    throw error;
  }
};
