import { BaziChart, UserProfile } from '../types';

export interface DailyFortuneResult {
  auspiciousness: '大吉' | '中吉' | '小吉' | '平' | '凶';
  summary: string;
  scores: {
    wealth: number;
    career: number;
    emotion: number;
    health: number;
  };
  advice: {
    wealth: string;
    career: string;
    emotion: string;
    life: string;
  };
}

// 简单的内存缓存，避免重复生成
const dailyFortuneCache: Record<string, DailyFortuneResult> = {};

// 读取服务端流式响应 helper
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

export const generateDailyFortuneAi = async (
  profile: UserProfile, 
  chart: BaziChart
): Promise<DailyFortuneResult> => {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const cacheKey = `${profile.id}_${dateStr}`;

  if (dailyFortuneCache[cacheKey]) {
    return dailyFortuneCache[cacheKey];
  }

  const systemPrompt = `你是一位精通子平八字与现代心理学的运势顾问。
请根据用户的八字命盘和今日日期，推演今日运势。
输出必须是合法的 JSON 格式，不包含 markdown 标记。

JSON 结构：
{
  "auspiciousness": "大吉" | "中吉" | "小吉" | "平" | "凶",
  "summary": "以日主为基准，深度解析今日天干地支与命局的生克制化关系（如天干透出什么、地支成什么局、核心在于什么力量的博弈等），并指出今日的核心能量特征。字数150字左右。",
  "scores": {
    "wealth": 0-100,
    "career": 0-100,
    "emotion": 0-100,
    "health": 0-100
  },
  "advice": {
    "wealth": "财运深度分析与建议。直接输出内容，不要包含“核心主题”、“风险提示”等小标题。分析今日财星与日主关系，并给出3条具体可执行建议（分点说明）。",
    "career": "工作深度分析与建议。直接输出内容，不要包含“核心主题”、“风险提示”等小标题。分析官杀与日主关系，并给出3条具体可执行建议（分点说明）。",
    "emotion": "家庭与感情深度分析与建议。直接输出内容，不要包含“核心主题”、“风险提示”等小标题。分析夫妻宫与流日关系，并给出3条具体可执行建议（分点说明）。",
    "life": "身心健康深度分析与建议。直接输出内容，不要包含“核心主题”、“风险提示”等小标题。分析五行平衡与身体部位，并给出3条具体可执行建议（分点说明）。"
  }
}

要求：
1. **深度专业**：分析必须基于正统子平八字逻辑（如：癸水日主见己土为七杀，午火为偏财，地支寅午半合等）。
2. **结构清晰**：建议部分包含深度分析 + 3条具体建议。
3. **不要使用小标题**：在 advice 的各个字段中，不要出现“核心主题”、“风险提示”、“可执行建议”这几个词，直接将这些内容自然融合在一段话或分点中。
4. **语气风格**：客观、专业、有洞察力，避免笼统的鸡汤。
5. **总字数**：每个板块的内容要详实，不要太短。
`;

  const userPrompt = `
用户信息：
性别：${profile.gender}
出生：${profile.birthDate} ${profile.birthTime}
八字：${chart.pillars.year.ganZhi.gan}${chart.pillars.year.ganZhi.zhi} ${chart.pillars.month.ganZhi.gan}${chart.pillars.month.ganZhi.zhi} ${chart.pillars.day.ganZhi.gan}${chart.pillars.day.ganZhi.zhi} ${chart.pillars.hour.ganZhi.gan}${chart.pillars.hour.ganZhi.zhi}
日主：${chart.dayMaster} (${chart.dayMasterElement})
喜用：${chart.balance.yongShen.join(',')}

今日日期：${dateStr}
`;

  try {
    const finalKey = apiKey || sessionStorage.getItem('ai_api_key') || '';
    // 注意：这里复用 /api/analyze 接口，但我们需要确保后端或者 geminiService 能处理非流式的简单 JSON 请求
    // 或者我们直接用 geminiService 的逻辑，这里简单模拟 fetch 调用
    
    // 由于 geminiService 中是 analyzeBaziStructured 且处理流式，我们这里可以直接调用 fetch
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
        temperature: 0.8,
        response_format: { type: 'json_object' },
        stream: true // 使用流式以兼容后端
      })
    });

    if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
    }

    // 使用流式读取 helper 获取完整内容
    let content = await readStreamResponse(response);
    
    // 清理 markdown
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // 确保提取有效的 JSON 部分
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
        content = content.substring(jsonStart, jsonEnd + 1);
    }
    
    const result = JSON.parse(content) as DailyFortuneResult;
    
    // 写入缓存
    dailyFortuneCache[cacheKey] = result;
    
    return result;

  } catch (e) {
    console.error("Daily Fortune AI Error:", e);
    throw e; // 让上层组件处理错误并显示重试按钮
  }
};
