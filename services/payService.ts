export const startAlipayVip = async (userId: string): Promise<{ ok: boolean; error?: string }> => {
  try {
    const base = (import.meta as any)?.env?.VITE_API_BASE || '';
    const endpoint = base ? `${base}/api/alipay/create` : '/api/alipay/create';
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    let data: any = {};
    try { data = await resp.json(); } catch {}
    if (data?.payUrl) {
      window.location.href = data.payUrl;
      return { ok: true };
    }
    const detail = data?.detail ? `（${data.detail}）` : '';
    return { ok: false, error: data?.error ? `支付创建失败：${data.error}${detail}` : '支付创建失败' };
  } catch (e) {
    return { ok: false, error: '网络异常，稍后再试' };
  }
};
