import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// 支付宝网关地址
const GATEWAY = (process.env.ALIPAY_USE_SANDBOX === 'true')
  ? 'https://openapi.alipaydev.com/gateway.do'
  : 'https://openapi.alipay.com/gateway.do';

// 辅助函数：构建待签名字符串
const buildQuery = (params: Record<string, string>) => {
  const keys = Object.keys(params).sort();
  // 过滤掉空值
  return keys.filter(k => params[k]).map(k => `${k}=${params[k]}`).join('&');
};

// 辅助函数：构建 URL 编码后的查询字符串
const buildEncodedQuery = (params: Record<string, string>) => {
  const keys = Object.keys(params).sort();
  return keys.filter(k => params[k]).map(k => `${k}=${encodeURIComponent(params[k])}`).join('&');
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // 2. 检查环境变量
  const appId = process.env.ALIPAY_APP_ID;
  const rawKey = process.env.ALIPAY_PRIVATE_KEY; // 这里拿到的是原始字符串
  const notifyUrl = process.env.ALIPAY_NOTIFY_URL;
  const returnUrl = process.env.ALIPAY_RETURN_URL;
  
  if (!appId || !rawKey || !notifyUrl || !returnUrl) {
    console.error('环境变量缺失');
    return res.status(500).json({ error: 'Missing ALIPAY env config' });
  }

  // 3. 【关键修复】处理私钥格式 (并确保变量 privateKey 在此处定义)
  let privateKey = ''; 
  const normalizedRaw = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;
  
  if (!normalizedRaw.includes('BEGIN PRIVATE KEY')) {
    // 如果没有头尾，尝试手动拼接
    // 移除所有空格和换行，重新按 64 字符切分
    const cleanKey = normalizedRaw.replace(/\s+/g, '');
    const wrapped = cleanKey.match(/.{1,64}/g)?.join('\n');
    privateKey = `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----`;
  } else {
    privateKey = normalizedRaw;
  }

  // 4. 获取请求参数
  const subject = process.env.VIP_SUBJECT || '玄枢命理VIP开通';
  const amountStr = process.env.VIP_AMOUNT || '39.9';
  const { user_id } = (req.body || {}) as { user_id?: string };

  if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

  const outTradeNo = `vip_${Date.now()}_${Math.floor(Math.random()*100000)}`;

  // 5. 生成北京时间戳 (UTC+8)
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const timestamp = beijingTime.toISOString().slice(0,19).replace('T', ' ');

  // 6. 组装业务参数
  // passback_params 建议进行简单的 JSON 序列化
  const passbackRaw = JSON.stringify({ user_id });

  const bizContent = JSON.stringify({
    subject,
    out_trade_no: outTradeNo,
    total_amount: amountStr,
    product_code: 'QUICK_WAP_WAY',
  });

  // 7. 组装公共参数
  const commonParams: Record<string, string> = {
    app_id: appId,
    method: 'alipay.trade.wap.pay',
    format: 'JSON',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp, // 使用修复后的北京时间
    version: '1.0',
    return_url: returnUrl,
    notify_url: notifyUrl,
    biz_content: bizContent,
    // 对 passback_params 编码，防止特殊字符破坏签名
    passback_params: encodeURIComponent(passbackRaw) 
  };

  try {
    // 8. 签名 (使用前面定义好的 privateKey)
    const signContent = buildQuery(commonParams);
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signContent, 'utf8');
    
    // 这里就是你报错的地方，现在 privateKey 一定有值了
    const sign = signer.sign(privateKey, 'base64');

    // 9. 生成最终 URL
    const requestQuery = buildEncodedQuery(commonParams);
    // 注意：sign 也必须编码
    const payUrl = `${GATEWAY}?${requestQuery}&sign=${encodeURIComponent(sign)}`;

    // 10. 写入数据库 (非阻塞)
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        // 不使用 await，让它异步执行，提高接口响应速度
        supabase.from('alipay_orders').insert({
          out_trade_no: outTradeNo,
          user_id,
          amount: amountStr,
          subject,
          status: 'pending',
          pay_url: payUrl,
          created_at: new Date().toISOString()
        }).then(({ error }) => {
            if (error) console.error('Supabase async insert error:', error);
        });
      }
    } catch (dbError) {
      console.error('Supabase setup error:', dbError);
    }

    // 11. 返回结果
    return res.status(200).json({ payUrl, out_trade_no: outTradeNo });

  } catch (e: any) {
    console.error('Sign Error Stack:', e);
    // 返回具体错误信息，方便调试
    return res.status(500).json({ error: 'Signing failed', details: e.message });
  }
}