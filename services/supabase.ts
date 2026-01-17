import { createClient } from '@supabase/supabase-js';

// 🛡️ 辅助函数：安全获取环境变量
const getEnv = (key: string) => {
  // @ts-ignore: 防止某些环境类型检查报错
  return import.meta.env?.[key] || '';
};

const rawUrl = getEnv('VITE_SUPABASE_URL');
const rawKey = getEnv('VITE_SUPABASE_ANON_KEY');

// 🔍 调试日志：让你在控制台清楚看到到底读到了什么
console.log('Supabase Config Check:', {
  URL_Length: rawUrl ? rawUrl.length : 0,
  Key_Length: rawKey ? rawKey.length : 0,
  Has_URL: !!rawUrl,
  Has_Key: !!rawKey
});

if (!rawUrl || !rawKey) {
  console.error(
    "❌ [严重错误] 环境变量缺失！应用将无法连接数据库。\n" +
    "请确保根目录有 .env 文件，且包含 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。\n" +
    "修改 .env 后请务必重启终端 (npm run dev)！"
  );
}

// 🛡️ 防崩溃处理：
// 如果没有 URL，我们提供一个假的 URL，防止 createClient 直接报错导致白屏。
// 这样你至少能看到页面，虽然数据加载会失败。
const supabaseUrl = rawUrl || 'https://zceuxgvrykvdywdmyskh.supabase.co';
const supabaseAnonKey = rawKey || 'sb_publishable_rKuZgzvvue4yfXHT1ymEzw_0DdoCrgv';


export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseReady = !!rawUrl && !!rawKey;

export const safeSignOut = async () => {
  if (!supabaseReady) {
    try {
      localStorage.removeItem('bazi_archives');
    } catch {}
    return { error: null } as any;
  }
  return await supabase.auth.signOut();
};

export const safeAuth = {
  async signInWithPassword(payload: { email: string; password: string }) {
    if (!supabaseReady) {
      return { data: null, error: { message: '当前为离线模式，无法登录。请配置 .env 后重试。' } } as any;
    }
    return await supabase.auth.signInWithPassword(payload as any);
  },
  async signUp(payload: { email: string; password: string }) {
    if (!supabaseReady) {
      return { data: null, error: { message: '当前为离线模式，无法注册。请配置 .env 后重试。' } } as any;
    }
    return await supabase.auth.signUp(payload as any);
  },
  async resetPasswordForEmail(email: string, options?: any) {
    if (!supabaseReady) {
      return { data: null, error: { message: '当前为离线模式，无法发送重置邮件。' } } as any;
    }
    return await supabase.auth.resetPasswordForEmail(email, options);
  },
  async updateUser(payload: any) {
    if (!supabaseReady) {
      return { data: null, error: { message: '当前为离线模式，无法更新用户信息。' } } as any;
    }
    return await supabase.auth.updateUser(payload);
  }
};

export const uploadAvatar = async (userId: string, profileId: string, file: File) => {
  if (!supabaseReady) {
    return { url: null, error: { message: '离线模式无法上传头像' } } as any;
  }
  const ext = (file.type.split('/')[1] || 'png').toLowerCase();
  const path = `${userId}/${profileId}-${Date.now()}.${ext}`;
  const bucket = supabase.storage.from('avatars');
  const { error: uploadError } = await bucket.upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) {
    return { url: null, error: uploadError } as any;
  }
  const { data } = bucket.getPublicUrl(path);
  return { url: data.publicUrl, error: null } as any;
};
