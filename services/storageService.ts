import { UserProfile, HistoryItem } from '../types';
import { supabase, supabaseReady } from './supabase';

const STORAGE_KEY = 'bazi_archives';

// 模拟 ID 生成
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substr(2, 9);
};

const normalizeDate = (s: string | undefined): string => {
  if (!s) return '';
  const t = s.trim();
  if (!t) return '';
  const isValidDate = (y: number, m: number, d: number) => {
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
    if (y < 1000 || y > 3000) return false;
    if (m < 1 || m > 12) return false;
    const leap = (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0));
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return d >= 1 && d <= days[m - 1];
  };
  if (/^\d{4}[\/\.\-]\d{1,2}[\/\.\-]\d{1,2}$/.test(t)) {
    const [y, m, d] = t.split(/[\/\.\-]/).map(v => parseInt(v, 10));
    if (!isValidDate(y, m, d)) return '';
    return `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
  }
  if (/^\d{4}年\d{1,2}月\d{1,2}日$/.test(t)) {
    const nums = t.match(/\d+/g);
    if (nums && nums.length >= 3) {
      const y = parseInt(nums[0], 10), m = parseInt(nums[1], 10), d = parseInt(nums[2], 10);
      if (!isValidDate(y, m, d)) return '';
      return `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    }
  }
  const nums = t.match(/\d+/g);
  if (nums && nums.length >= 3) {
    const y = parseInt(nums[0], 10), m = parseInt(nums[1], 10), d = parseInt(nums[2], 10);
    if (!isValidDate(y, m, d)) return '';
    return `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
  }
  return '';
};

const normalizeTime = (s: string | undefined): string => {
  if (!s) return '00:00';
  const t = s.trim();
  const nums = t.match(/\d+/g);
  if (!nums || nums.length === 0) return '00:00';
  const h = Math.max(0, Math.min(23, parseInt(nums[0], 10)));
  const m = nums.length > 1 ? Math.max(0, Math.min(59, parseInt(nums[1], 10))) : 0;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// 1. 获取本地缓存
export const getArchives = async (): Promise<UserProfile[]> => {
  if (typeof window === 'undefined') return [];
  const json = localStorage.getItem(STORAGE_KEY);
  return json ? JSON.parse(json) : [];
};

// 2. 从云端同步
export const syncArchivesFromCloud = async (userId: string): Promise<UserProfile[]> => {
  if (!userId) {
    console.warn("⚠️ [Sync] 无效的 UserId，取消同步");
    return getArchives();
  }

  console.log("☁️ [Sync] 正在拉取云端档案...");
  try {
    const { data, error } = await supabase
      .from('archives')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    if (data) {
      // 字段映射：数据库下划线 -> 前端驼峰
      const cloudArchives: UserProfile[] = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        gender: item.gender,
        // ⚠️ 注意：您的数据库字段里没有 birth_date，如果 birth_time 存的是完整时间字符串则没问题
        // 如果 birth_time 只有 "12:00"，那么日期可能会丢失。建议检查数据库是否需要加 birth_date 字段
        birthDate: item.birth_date || '', 
        birthTime: item.birth_time,
        isSolarTime: item.is_solar_time,
        province: item.province,
        city: item.city,
        longitude: item.longitude,
        tags: item.tags || [],
        createdAt: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
        isSelf: item.is_self,
        avatar: item.avatar,
        // AI 报告如果没地方存，暂时给空数组，防止报错
        aiReports: [] 
      }));

      const localArchives = await getArchives();
      const mergedMap = new Map<string, UserProfile>();

      localArchives.forEach(p => mergedMap.set(p.id, p));
      cloudArchives.forEach(p => mergedMap.set(p.id, p));

      const mergedList = Array.from(mergedMap.values()).sort((a, b) => 
        (b.createdAt || 0) - (a.createdAt || 0)
      );

      localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedList));
      return mergedList;
    }
  } catch (err: any) {
    console.error("❌ [Sync] 失败:", err.message);
  }

  return getArchives();
};

// 3. 保存或更新档案
export const saveArchive = async (profile: UserProfile): Promise<UserProfile[]> => {
  let archives = await getArchives();
  const existingIndex = archives.findIndex(p => p.id === profile.id);
  let finalProfile = { ...profile };
  finalProfile.birthDate = normalizeDate(finalProfile.birthDate);
  finalProfile.birthTime = normalizeTime(finalProfile.birthTime);

  if (existingIndex > -1) {
    finalProfile = { ...archives[existingIndex], ...profile };
    archives[existingIndex] = finalProfile;
  } else {
    finalProfile.id = profile.id || generateId();
    finalProfile.createdAt = Date.now();
    archives.unshift(finalProfile);
  }

  // 先存本地
  localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));

  // 后存云端
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    if (!finalProfile.birthDate) {
      console.warn('⚠️ [Cloud Save] 缺少 birth_date，已仅保存本地');
      return archives;
    }
    const isUuid = (v: string | undefined) => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
    const basePayload: any = {
      user_id: session.user.id,
      name: finalProfile.name,
      gender: finalProfile.gender,
      birth_date: finalProfile.birthDate,
      birth_time: finalProfile.birthTime,
      is_solar_time: finalProfile.isSolarTime || false,
      province: finalProfile.province || '',
      city: finalProfile.city || '',
      longitude: finalProfile.longitude || 120,
      tags: finalProfile.tags || [],
      is_self: finalProfile.isSelf || false,
      avatar: finalProfile.avatar || '',
      updated_at: new Date().toISOString()
    };

    if (isUuid(finalProfile.id)) {
      const payload = { ...basePayload, id: finalProfile.id };
      const { error } = await supabase.from('archives').upsert(payload);
      if (error) {
        console.error("❌ [Cloud Save] 失败:", error.message);
        (archives as any)._cloudError = error.message;
      } else {
        console.log("✅ [Cloud Save] 成功");
      }
    } else {
      const { data: rows, error: selError } = await supabase
        .from('archives')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('birth_date', finalProfile.birthDate)
        .eq('birth_time', finalProfile.birthTime)
        .eq('name', finalProfile.name)
        .limit(1);
      if (selError) {
        console.error("❌ [Cloud Save] 查询失败:", selError.message);
        (archives as any)._cloudError = selError.message;
        return archives;
      }

      if (rows && rows.length > 0) {
        const existingId = rows[0].id;
        const { error: updError } = await supabase
          .from('archives')
          .update(basePayload)
          .eq('id', existingId)
          .eq('user_id', session.user.id);
        if (updError) {
          console.error("❌ [Cloud Save] 更新失败:", updError.message);
          (archives as any)._cloudError = updError.message;
        } else {
          const oldId = finalProfile.id;
          finalProfile.id = existingId;
          archives = archives.map(p => p === finalProfile ? { ...finalProfile } : (p.id === oldId ? { ...p, id: existingId } : p));
          const oldKey = `chat_history_${oldId}`;
          const newKey = `chat_history_${existingId}`;
          if (typeof window !== 'undefined') {
            const oldVal = localStorage.getItem(oldKey);
            if (oldVal && oldId !== existingId) {
              localStorage.setItem(newKey, oldVal);
              localStorage.removeItem(oldKey);
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));
          }
          console.log("✅ [Cloud Save] 已合并到现有记录，并完成本地迁移");
        }
      } else {
        const { data, error: insError } = await supabase
          .from('archives')
          .insert(basePayload)
          .select()
          .single();
        if (insError) {
          console.error("❌ [Cloud Save] 插入失败:", insError.message);
          (archives as any)._cloudError = insError.message;
        } else if (data && data.id) {
          const oldId = finalProfile.id;
          finalProfile.id = data.id;
          archives = archives.map(p => p === finalProfile ? { ...finalProfile } : (p.id === oldId ? { ...p, id: data.id } : p));
          const oldKey = `chat_history_${oldId}`;
          const newKey = `chat_history_${data.id}`;
          if (typeof window !== 'undefined') {
            const oldVal = localStorage.getItem(oldKey);
            if (oldVal && oldId !== data.id) {
              localStorage.setItem(newKey, oldVal);
              localStorage.removeItem(oldKey);
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));
          }
          console.log("✅ [Cloud Save] 成功，已生成云端 UUID 并本地迁移");
        }
      }
    }
  }

  return archives;
};

// 4. 设为本人
export const setArchiveAsSelf = async (id: string): Promise<UserProfile[]> => {
  let archives = await getArchives();
  
  // 1. 先在本地更新状态
  const oldSelf = archives.find(p => p.isSelf);
  archives = archives.map(p => ({ ...p, isSelf: p.id === id }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));

  // 2. 云端更新（使用 update 而不是 upsert，更安全且只更新必要字段）
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    try {
      // 先将该用户的其他所有档案取消本人标记
      await supabase
        .from('archives')
        .update({ is_self: false, updated_at: new Date().toISOString() })
        .eq('user_id', session.user.id)
        .neq('id', id);

      // 再将目标档案设为本人
      await supabase
        .from('archives')
        .update({ is_self: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', session.user.id);
      console.log("✅ [Self] 云端状态已更新");
    } catch (e: any) {
      console.error("❌ [Self] 云端更新失败", e);
    }
  }
  
  return archives;
};

// 5. 删除档案
export const deleteArchive = async (id: string): Promise<UserProfile[]> => {
  const archives = await getArchives();
  const newList = archives.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
  localStorage.removeItem(`chat_history_${id}`);

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    await supabase.from('archives').delete().eq('id', id);
  }
  return newList;
};

export const updateArchive = async (p: UserProfile) => saveArchive(p);

export const saveAiReportToArchive = async (pid: string, content: string, type: 'bazi'|'ziwei') => {
  const archives = await getArchives();
  const idx = archives.findIndex(p => p.id === pid);
  if (idx > -1) {
    const p = archives[idx];
    const newReport: HistoryItem = { id: generateId(), date: Date.now(), content, type };
    p.aiReports = [newReport, ...(p.aiReports || [])];
    return saveArchive(p);
  }
  return archives;
};

// VIP 状态管理
export const getVipStatus = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const meta = session.user.user_metadata as any;
      if (meta && typeof meta.is_vip_user !== 'undefined') {
        return !!meta.is_vip_user;
      }
      return false;
    }
  } catch {}
  return localStorage.getItem('is_vip_user') === 'true';
};

export const activateVipOnCloud = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;
    const { error } = await supabase.auth.updateUser({ data: { is_vip_user: true } });
    if (error) {
      console.error('激活VIP失败:', error.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.error('激活VIP异常:', e?.message || e);
    return false;
  }
};
