import { BaziChart } from "../types";

// 定义报告结构接口
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

/**
 * 使用 DeepSeek 生成结构化八字财富报告
 * 包含：详细提示词构建、JSON 模式请求、错误处理
 */
// 读取服务端流式响应
const readStreamResponse = async (response: Response): Promise<string> => {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder("utf-8");
  let fullText = "";

  if (!reader) throw new Error("无法读取响应流");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');
    for (const line of lines) {
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
    const finalKey = apiKey || sessionStorage.getItem('ai_api_key') || '';
    if (!finalKey && !isVip) {
      throw new Error("API Key 未设置，请先在设置中输入 DeepSeek API Key");
    }

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: finalKey,
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
      parsed = JSON.parse(rawContent);
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
