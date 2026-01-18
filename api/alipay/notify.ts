import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import qs from 'querystring';
import { createClient } from '@supabase/supabase-js';

const verifySign = (params: Record<string, string>, alipayPublicKey: string) => {
  const sorted: Record<string, string> = {};
  Object.keys(params)
    .filter(k => k !== 'sign' && k !== 'sign_type')
    .sort()
    .forEach(k => { sorted[k] = params[k]; });
  const content = Object.keys(sorted).map(k => `${k}=${sorted[k]}`).join('&');
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(content, 'utf8');
  return verifier.verify(alipayPublicKey, params.sign, 'base64');
};

const readBodyText = (req: VercelRequest): Promise<string> => new Promise((resolve, reject) => {
  let data = '';
  req.on('data', (chunk: any) => { data += chunk; });
  req.on('end', () => resolve(data));
  req.on('error', reject);
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).send('success');
  }
  if (req.method === 'GET') {
    return res.status(200).send('ok');
  }
  const ct = String(req.headers['content-type'] || '');
  let bodyText = typeof req.body === 'string' ? req.body : '';
  if (!bodyText && ct.includes('application/x-www-form-urlencoded')) {
    bodyText = await readBodyText(req);
  }
  const params = typeof req.body === 'object' && req.body && !Array.isArray(req.body)
    ? (req.body as Record<string, string>)
    : (qs.parse(bodyText) as any as Record<string, string>);

  const alipayPublicKey = (process.env.ALIPAY_PUBLIC_KEY || '').replace(/\\n/g, '\n');
  const appId = process.env.ALIPAY_APP_ID || '';
  const vipAmount = process.env.VIP_AMOUNT || '39.9';

  if (!alipayPublicKey || !appId) {
    return res.status(500).send('fail');
  }

  try {
    const ok = verifySign(params, alipayPublicKey);
    if (!ok) {
      return res.status(400).send('fail');
    }
    if (params.app_id !== appId) {
      return res.status(400).send('fail');
    }
    if (params.trade_status !== 'TRADE_SUCCESS') {
      return res.status(200).send('success');
    }
    if (params.total_amount !== vipAmount) {
      return res.status(400).send('fail');
    }

    let user_id = '';
    try {
      const raw = decodeURIComponent(params.passback_params || '');
      const obj = JSON.parse(raw);
      user_id = obj.user_id || '';
    } catch {}

    if (!user_id) {
      return res.status(400).send('fail');
    }

    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !supabaseServiceKey) {
      // No admin access, but still ACK to avoid retries
      return res.status(200).send('success');
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    try {
      await supabase.from('alipay_orders')
        .update({
          status: 'success',
          paid_at: new Date().toISOString(),
          alipay_trade_no: params.trade_no || '',
          buyer_id: params.buyer_id || '',
          raw_notify: params
        })
        .eq('out_trade_no', params.out_trade_no);
    } catch {}
    try {
      await supabase.auth.admin.updateUserById(user_id, { user_metadata: { is_vip_user: true } });
    } catch {}

    return res.status(200).send('success');
  } catch (e) {
    return res.status(500).send('fail');
  }
}
