import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const GATEWAY = (process.env.ALIPAY_USE_SANDBOX === 'true')
  ? 'https://openapi.alipaydev.com/gateway.do'
  : 'https://openapi.alipay.com/gateway.do';

// 辅助函数：构建待签名字符串
const buildQuery = (params: Record<string, string>) => {
  const keys = Object.keys(params).sort();
  return keys.filter(k => params[k]).map(k => `${k}=${params[k]}`).join('&');
};

const buildEncodedQuery = (params: Record<string, string>) => {
  const keys = Object.keys(params).sort();
  return keys.filter(k => params[k]).map(k => `${k}=${encodeURIComponent(params[k])}`).join('&');
};

/**
 * 核心诊断与修复函数
 */
function formatAndCheckKey(rawKey: string) {
  if (!rawKey) throw new Error('错误：环境变量 ALIPAY_PRIVATE_KEY 为空');

  // 1. 暴力清洗：只保留 Base64 字符
  // 去掉头尾、去掉空格、去掉换行、去掉转义符
  const cleanBody = rawKey
    .replace(/(-+BEGIN.*?-+)/g, '')
    .replace(/(-+END.*?-+)/g, '')
    .replace(/\\n/g, '')
    .replace(/\s+/g, '');

  // 2. 诊断：长度检查
  console.log(`[Key Debug] 清洗后密钥长度: ${cleanBody.length} 字符`);
  
  if (cleanBody.length < 1000) {
    // RSA 2048位私钥通常在 1600 字符左右。公钥只有 200-400 字符。
    throw new Error(`[致命错误] 密钥太短 (${cleanBody.length}字符)！你是不是填成了【公钥】？请务必检查使用的是【应用私钥 (App Private Key)】`);
  }

  // 3. 重建 PEM 格式
  const formattedBody = cleanBody.match(/.{1,64}/g)?.join('\n');
  
  // 4. 返回两种尝试格式
  return {
    pkcs8: `-----BEGIN PRIVATE KEY-----\n${formattedBody}\n-----END PRIVATE KEY-----`,
    pkcs1: `-----BEGIN RSA PRIVATE KEY-----\n${formattedBody}\n-----END RSA PRIVATE KEY-----`
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    // 1. 环境变量与基础检查
    const appId = process.env.ALIPAY_APP_ID;
    const rawKey = process.env.ALIPAY_PRIVATE_KEY;
    const notifyUrl = process.env.ALIPAY_NOTIFY_URL;
    const returnUrl = process.env.ALIPAY_RETURN_URL;
    
    if (!appId || !rawKey || !notifyUrl || !returnUrl) {
      return res.status(500).json({ error: 'Missing ALIPAY env config' });
    }

    // 2. 准备私钥 (带诊断)
    let keyPair;
    try {
      keyPair = formatAndCheckKey(rawKey);
    } catch (e: any) {
      console.error(e.message);
      return res.status(500).json({ error: '私钥配置错误', details: e.message });
    }

    // 3. 准备订单参数
    const subject = process.env.VIP_SUBJECT || '玄枢命理VIP开通';
    const amountStr = process.env.VIP_AMOUNT || '39.9';
    const { user_id } = (req.body || {}) as { user_id?: string };

    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

    const outTradeNo = `vip_${Date.now()}_${Math.floor(Math.random()*100000)}`;

    // 时间戳修正 (UTC+8)
    const now = new Date();
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const timestamp = beijingTime.toISOString().slice(0,19).replace('T', ' ');

    const passbackRaw = JSON.stringify({ user_id });
    const bizContent = JSON.stringify({
      subject,
      out_trade_no: outTradeNo,
      total_amount: amountStr,
      product_code: 'QUICK_WAP_WAY',
    });

    const commonParams: Record<string, string> = {
      app_id: appId,
      method: 'alipay.trade.wap.pay',
      format: 'JSON',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp,
      version: '1.0',
      return_url: returnUrl,
      notify_url: notifyUrl,
      biz_content: bizContent,
      passback_params: passbackRaw
    };

    // 4. 尝试签名
    const signContent = buildQuery(commonParams);
    let sign = '';
    let signErrorDetails = '';

    // 尝试 PKCS#8 (Java格式)
    try {
      const keyObj8 = crypto.createPrivateKey({ key: keyPair.pkcs8, format: 'pem' });
      const signer8 = crypto.createSign('RSA-SHA256');
      signer8.update(signContent, 'utf8');
      sign = signer8.sign({ key: keyObj8, padding: (crypto as any).constants.RSA_PKCS1_PADDING }, 'base64');
    } catch (e1: any) {
      try {
        const keyObj1 = crypto.createPrivateKey({ key: keyPair.pkcs1, format: 'pem' });
        const signer1 = crypto.createSign('RSA-SHA256');
        signer1.update(signContent, 'utf8');
        sign = signer1.sign({ key: keyObj1, padding: (crypto as any).constants.RSA_PKCS1_PADDING }, 'base64');
      } catch (e2: any) {
        signErrorDetails = `OpenSSL Error: ${e2.message}`;
      }
    }

    if (!sign) {
      // 如果还失败，抛出详细错误给前端
      return res.status(500).json({ 
        error: '签名计算失败', 
        tips: '请检查 Vercel 后台日志查看[Key Debug]信息。通常是因为填成了支付宝公钥，或者私钥格式损坏。',
        debug_info: signErrorDetails
      });
    }

    // 5. 生成支付链接
    const requestQuery = buildEncodedQuery(commonParams);
    const payUrl = `${GATEWAY}?${requestQuery}&sign=${encodeURIComponent(sign)}`;

    // 6. 存库 (异步)
    try {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        supabase.from('alipay_orders').insert({
          out_trade_no: outTradeNo,
          user_id,
          amount: amountStr,
          subject,
          status: 'pending',
          pay_url: payUrl,
          created_at: new Date().toISOString()
        }).then(({ error }) => {
            if (error) console.error('Supabase Error:', error);
        });
      }
    } catch (err) {}

    return res.status(200).json({ payUrl, out_trade_no: outTradeNo });

  } catch (e: any) {
    console.error('Fatal Error:', e);
    return res.status(500).json({ error: 'Server Error', message: e.message });
  }
}
