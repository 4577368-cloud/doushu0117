import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const GATEWAY = (process.env.ALIPAY_USE_SANDBOX === 'true')
  ? 'https://openapi.alipaydev.com/gateway.do'
  : 'https://openapi.alipay.com/gateway.do';

const buildQuery = (params: Record<string, string>) => {
  const keys = Object.keys(params).sort();
  return keys.map(k => `${k}=${params[k]}`).join('&');
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const appId = process.env.ALIPAY_APP_ID || '';
  const privateKey = (process.env.ALIPAY_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const notifyUrl = process.env.ALIPAY_NOTIFY_URL || '';
  const returnUrl = process.env.ALIPAY_RETURN_URL || '';
  const subject = process.env.VIP_SUBJECT || '玄枢命理VIP开通';
  const amountStr = process.env.VIP_AMOUNT || '39.9';

  const { user_id } = (req.body || {}) as { user_id?: string };
  const missing: string[] = [];
  if (!appId) missing.push('ALIPAY_APP_ID');
  if (!privateKey) missing.push('ALIPAY_PRIVATE_KEY');
  if (!notifyUrl) missing.push('ALIPAY_NOTIFY_URL');
  if (!returnUrl) missing.push('ALIPAY_RETURN_URL');
  if (missing.length) {
    return res.status(500).json({ error: 'Missing ALIPAY env config', missing });
  }
  if (!user_id) {
    return res.status(400).json({ error: 'Missing user_id' });
  }

  const outTradeNo = `vip_${Date.now()}_${Math.floor(Math.random()*100000)}`;
  const timestamp = new Date().toISOString().slice(0,19).replace('T', ' ');

  const passback = encodeURIComponent(JSON.stringify({ user_id }));

  const bizContent = JSON.stringify({
    subject,
    out_trade_no: outTradeNo,
    total_amount: amountStr,
    product_code: 'QUICK_WAP_WAY'
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
    passback_params: passback
  };

  const signContent = buildQuery(commonParams);
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signContent, 'utf8');
  let sign: string;
  try {
    sign = signer.sign(privateKey, 'base64');
  } catch (e: any) {
    return res.status(500).json({ error: 'Sign error', detail: e?.message || String(e) });
  }

  const payUrl = `${GATEWAY}?${signContent}&sign=${encodeURIComponent(sign)}`;
  try {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase.from('alipay_orders').insert({
        out_trade_no: outTradeNo,
        user_id,
        amount: amountStr,
        subject,
        status: 'pending',
        pay_url: payUrl,
        created_at: new Date().toISOString()
      });
    }
  } catch {}
  return res.status(200).json({ payUrl, out_trade_no: outTradeNo });
}
