import { BaziChart, BaziReport } from "../types";

/**
 * 使用 DeepSeek 生成结构化八字财富报告
 * 包含：详细提示词构建、JSON 模式请求、错误处理
 */
// 读取服务端流式响应
const readStreamResponse = async (response: Response): Promise<string> => {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder("utf-8");
  let fullText = "";
  let buffer = "";

  if (!reader) throw new Error("无法读取响应流");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    // 拼接缓冲区并按行分割
    const lines = (buffer + chunk).split('\n');
    // 最后一行可能不完整，保留到缓冲区
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.trim() === '') continue;
      if (line.startsWith('data: ')) {
        const jsonStr = line.slice(6);
        if (jsonStr.trim() === '[DONE]') continue;
        try {
          const json = JSON.parse(jsonStr);
          const content = json.choices?.[0]?.delta?.content || '';
          fullText += content;
        } catch {}
      }
    }
  }
  return fullText;
};

export const analyzeBaziStructured = async (
  chart: BaziChart,
  apiKey?: string,
  isVip: boolean = false
): Promise<BaziReport> => {

  // 3. 构建动态上下文数据
  const analysisYear = new Date().getFullYear();
  
  // 构建详细的命盘描述 (保留了你原始代码的丰富度)
  const chartDescription = `
【核心命盘参数】
推演基准年份：${analysisYear}年
四柱八字：${chart.pillars.year.ganZhi.gan}${chart.pillars.year.ganZhi.zhi} ${chart.pillars.month.ganZhi.gan}${chart.pillars.month.ganZhi.zhi} ${chart.pillars.day.ganZhi.gan}${chart.pillars.day.ganZhi.zhi} ${chart.pillars.hour.ganZhi.gan}${chart.pillars.hour.ganZhi.zhi}
日主：${chart.dayMaster} (${chart.dayMasterElement}), 身强弱: ${chart.balance.dayMasterStrength.level}
格局：${chart.pattern.name}
喜用神：${chart.balance.yongShen.join('、')}
忌神：${chart.balance.jiShen.join('、')}
五行分布：${JSON.stringify(chart.wuxingCounts)}
`;

  // 4. 构建系统提示词 (System Prompt) - 核心业务逻辑
  const systemPrompt = `你是一位精通子平八字命理分析与现代财富管理的顾问。
请基于提供的命盘信息，量身定制一份跨市场（美股、港股、A股）财富与投资策略报告。
输出必须严格遵循以下 JSON 格式。

JSON 结构规范：
{
  "sections": [
    { "id": "traits", "title": "1. 命主特质识别", "content": "详细分析命主的性格优势与理财盲点..." },
    { "id": "wealth", "title": "2. 财运格局深度解读", "content": "分析正财/偏财分布，一生财运起伏..." },
    { "id": "career", "title": "3. 事业运势与财官联动", "content": "适合的行业方向，职场晋升或创业机会..." },
    { "id": "cycle", "title": "4. 当前运势周期分析", "content": "结合${analysisYear}流年，分析今年的财富机遇..." },
    { "id": "strategy", "title": "5. 财富与投资策略", "content": "稳健/激进策略建议，资产配置比例..." },
    { "id": "markets", "title": "6. 行业与市场适配度", "content": "五行喜用对应的现代行业（如喜火看科技/能源）..." },
    { "id": "picks", "title": "7. 个股/ETF精选及择时", "content": "具体的标的类型建议（仅供参考）..." },
    { "id": "monthly", "title": "8. 未来流月投资详表", "content": "未来几家个月的月度操作建议..." }
  ]
}

要求：
1. 所有的分析必须严格基于 **${analysisYear}年** 及命盘喜忌。
2. content 字段必须为纯文本字符串，使用 \\n 换行，严禁嵌套任何 JSON 对象或数组。
3. 语气专业、客观、富有洞察力。
`;

  const userPrompt = `请基于以下命盘生成深度财富分析报告：\n${chartDescription}`;

  try {
    if (!isVip) {
      throw new Error("VIP 权限未激活 - 请升级 VIP 解锁深度分析");
    }

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: 'deepseek-chat',
        temperature: 1.0,
        response_format: { type: 'json_object' },
        stream: true
      })
    });

    if (!response.ok) throw new Error(`请求失败: ${response.status}`);

    let rawContent = await readStreamResponse(response);

    // 6. 解析 JSON 结果
    let parsed;
    try {
      // 清理可能存在的 markdown 标记
      let jsonContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
      
      // 尝试提取 JSON 部分 (处理 AI 可能输出的前导/后置文本)
      const jsonStart = jsonContent.indexOf('{');
      const jsonEnd = jsonContent.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        jsonContent = jsonContent.substring(jsonStart, jsonEnd + 1);
      }

      parsed = JSON.parse(jsonContent);
    } catch (e) {
      console.error("JSON Parse Error:", e, rawContent);
      throw new Error("报告生成格式异常，请重试");
    }

    // 7. 数据标准化 (防止 AI 漏字段)
    const processedSections = (parsed.sections || []).map((s: any) => ({
      id: s.id || String(Math.random()),
      title: s.title || "分析项",
      content: typeof s.content === 'string' ? s.content : JSON.stringify(s.content, null, 2),
      type: 'text' as const
    }));

    // 生成纯文本副本 (用于复制功能)
    const copyText = processedSections.map((s: any) => `【${s.title}】\n${s.content}`).join('\n\n');

    return {
      title: `${chart.dayMaster}日主·${analysisYear}年财富报告`,
      copyText,
      sections: processedSections
    };

  } catch (e: any) {
    console.error("DeepSeek Request Failed:", e);
    let msg = "生成失败";
    if (e.status === 401) msg = "API Key 无效或过期";
    if (e.status === 429) msg = "余额不足或请求过于频繁";
    if (e.status === 500) msg = "DeepSeek 服务器繁忙";
    throw new Error(`${msg}: ${e.message || e}`);
  }
};

/**
 * 六爻占卜 AI 深度解读
 */
export interface LiuYaoAiReport {
  summary: string; // 总体结论
  aspects: {
    wealth: string; // 求财
    career: string; // 事业/办事
    health: string; // 健康
    love: string;   // 感情
    suggestion: string; // 建议
  };
}

export const analyzeLiuYaoStructured = async (
  hexagramData: any,
  isVip: boolean = false
): Promise<LiuYaoAiReport> => {
  const systemPrompt = `你是一位精通六爻纳甲与《增删卜易》的占卜大师。
请基于用户提供的卦象（本卦、变卦、动爻），进行多维度的深度解读。
输出必须严格遵循以下 JSON 格式：
{
  "summary": "一句话核心结论（现代大白话，直击吉凶）",
  "aspects": {
    "wealth": "求财维度的详细解读...",
    "career": "事业/办事维度的详细解读...",
    "health": "健康/疾病维度的详细解读...",
    "love": "感情/婚姻维度的详细解读...",
    "suggestion": "综合趋吉避凶的建议..."
  }
}
要求：
1. 结论要明确（吉/凶/平）。
2. 语言通俗易懂，富有现代感，但要有易理支撑。
3. 篇幅适中，每个维度 50-100 字左右。
`;

  const userPrompt = `请解读以下卦象：\n${JSON.stringify(hexagramData, null, 2)}`;

  try {
    if (!isVip) throw new Error("VIP 权限未激活");

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: 'deepseek-chat',
        temperature: 1.0,
        response_format: { type: 'json_object' },
        stream: true
      })
    });

    if (!response.ok) throw new Error(`请求失败: ${response.status}`);

    const rawContent = await readStreamResponse(response);
    
    // 解析 JSON
    let jsonContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonStart = jsonContent.indexOf('{');
    const jsonEnd = jsonContent.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonContent = jsonContent.substring(jsonStart, jsonEnd + 1);
    }
    
    const parsed = JSON.parse(jsonContent);
    return parsed as LiuYaoAiReport;

  } catch (e: any) {
    console.error("LiuYao AI Request Failed:", e);
    throw e;
  }
};

/**
 * 奇门遁甲 AI 临机断事
 */
export interface QimenAiReport {
  overall: {
    result: "吉" | "凶" | "平"; 
    score: number; // 0-100
    summary: string;
  };
  analysis: {
    focus: string; // 用神/落宫分析
    pattern: string; // 吉凶格分析
    time: string; // 时令/旺衰分析
  };
  suggestion: string; // 决策建议
}

export const analyzeQimenStructured = async (
  chartData: any, // 简化的奇门局数据
  question: { category: string; affair: string; industry?: string },
  isVip: boolean = false
): Promise<QimenAiReport> => {
  const systemPrompt = `你是一位精通《奇门遁甲》的时空决策顾问。
请基于用户提供的奇门局（时家奇门拆补法）和具体问事事项，进行临机断事。

核心逻辑：
1. **取用神**：根据问事类别（${question.category} - ${question.affair}）锁定核心用神（如求财看生门/甲子戊，求职看开门/年干等）。
2. **辨旺衰**：结合时令（节气/月令）分析用神落宫的旺相休囚死。
3. **看格局**：分析星门神仪的吉凶组合（如青龙返首、天遁等）。
4. **定应期**：如果涉及时间，简要推断应期。

输出必须严格遵循以下 JSON 格式：
{
  "overall": {
    "result": "吉/凶/平",
    "score": 85,
    "summary": "一句话核心断语..."
  },
  "analysis": {
    "focus": "用神落宫及状态分析...",
    "pattern": "关键吉凶格局分析...",
    "time": "时空能量与旺衰分析..."
  },
  "suggestion": "针对性的行动建议..."
}

要求：
1. 必须结合“${question.industry || '通用'}”行业背景（如果有）。
2. 语言简练犀利，直指核心。
`;

  const userPrompt = `【问事】：${question.category} - ${question.affair}
【行业】：${question.industry || '无'}
【盘面数据】：
${JSON.stringify(chartData, null, 2)}`;

  try {
    if (!isVip) throw new Error("VIP 权限未激活");

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: 'deepseek-chat',
        temperature: 1.0,
        response_format: { type: 'json_object' },
        stream: true
      })
    });

    if (!response.ok) throw new Error(`请求失败: ${response.status}`);

    const rawContent = await readStreamResponse(response);
    
    // 解析 JSON
    let jsonContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonStart = jsonContent.indexOf('{');
    const jsonEnd = jsonContent.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonContent = jsonContent.substring(jsonStart, jsonEnd + 1);
    }
    
    const parsed = JSON.parse(jsonContent);
    return parsed as QimenAiReport;

  } catch (e: any) {
    console.error("Qimen AI Request Failed:", e);
    throw e;
  }
};
