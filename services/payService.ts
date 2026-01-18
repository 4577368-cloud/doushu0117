export const startAlipayVip = async (userId: string) => {
  try {
    const resp = await fetch('/api/alipay/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    const data = await resp.json();
    if (data?.payUrl) {
      window.location.href = data.payUrl;
      return;
    }
    alert('支付创建失败');
  } catch (e) {
    alert('网络异常，稍后再试');
  }
};

