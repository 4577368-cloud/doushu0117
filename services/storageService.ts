import { UserProfile, HistoryItem } from '../types';
import { supabase, supabaseReady } from './supabase';

const LEGACY_KEY = 'bazi_archives';
const getStorageKey = async (): Promise<string> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    return uid ? `bazi_archives:${uid}` : 'bazi_archives:guest';
  } catch {
    return 'bazi_archives:guest';
  }
};

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
  // 迁移旧全局键到 guest 键
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      localStorage.setItem('bazi_archives:guest', legacy);
      localStorage.removeItem(LEGACY_KEY);
    }
  } catch {}
  const key = await getStorageKey();
  const json = localStorage.getItem(key);
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

    if (error) {
      console.error("❌ [Sync] Supabase 查询错误:", error);
      throw error;
    }

    if (data) {
      console.log(`☁️ [Sync] 拉取到 ${data.length} 条云端档案`, data[0] ? Object.keys(data[0]) : '无数据');
      
      // 字段映射：数据库下划线 -> 前端驼峰
      const cloudArchives: UserProfile[] = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        gender: item.gender,
        // 兼容 birth_date 和 possible legacy fields
        birthDate: item.birth_date || item.birthday || '', 
        birthTime: item.birth_time || '',
        isSolarTime: item.is_solar_time,
        province: item.province,
        city: item.city,
        longitude: item.longitude,
        tags: item.tags || [],
        createdAt: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
        isSelf: item.is_self,
        avatar: item.avatar,
        aiReports: [] 
      }));

      // 过滤掉无效数据
      const validArchives = cloudArchives.filter(a => {
        if (!a.birthDate) {
           console.warn(`⚠️ [Sync] 忽略无效档案 (无日期): ID=${a.id}`);
           return false;
        }
        return true;
      });

      const sorted = validArchives.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      const key = `bazi_archives:${userId}`;
      
      // ⚠️ 策略：云端数据覆盖本地数据，但保留云端没有的本地数据（防止未同步的数据丢失）
      // 读取当前本地数据
      const localJson = localStorage.getItem(key);
      const localArchives: UserProfile[] = localJson ? JSON.parse(localJson) : [];
      
      // 合并逻辑：以 ID 为准。如果 ID 相同，用云端的。如果本地有但云端没有，保留本地的（假设是未同步的新建数据）。
      // 但这里有个风险：如果云端删除了，本地还有，会“复活”删除的数据。
      // 为了简单起见，目前我们假设云端是 source of truth，但为了保险，我们把本地有但云端没有的数据也加进去，
      // 除非我们能确定它是“已删除”的。
      // 更好的做法是：完全信任云端。因为“更换浏览器”场景下，本地是空的。
      // 只有在“同一浏览器登录”场景下，才需要考虑本地未同步数据。
      
      // 简化策略：直接使用云端数据。
      // 如果用户刚刚在本地创建了数据但没同步上去，覆盖会导致丢失。
      // 所以我们做一个简单的合并：
      const mergedMap = new Map<string, UserProfile>();
      sorted.forEach(a => mergedMap.set(a.id, a));
      
      // 检查本地是否有“未同步”的数据（不在云端列表中）
      // 注意：本地数据的 ID 可能是临时的（非 UUID），也可能是 UUID。
      localArchives.forEach(local => {
          if (!mergedMap.has(local.id)) {
              // 本地有，云端没有。可能是新创建未同步的，也可能是云端已删除的。
              // 我们保守保留，但标记一下
              console.log("⚠️ [Sync] 保留本地独有档案:", local.name, local.id);
              mergedMap.set(local.id, local);
              // 尝试补传？暂时不做，避免死循环
          }
      });
      
      const finalArchives = Array.from(mergedMap.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      localStorage.setItem(key, JSON.stringify(finalArchives));
      return finalArchives;
    }
  } catch (err: any) {
    console.error("❌ [Sync] 失败:", err.message);
  }

  return getArchives();
};

// 新增：合并访客数据到当前用户
export const mergeGuestArchives = async (userId: string) => {
    try {
        const guestKey = 'bazi_archives:guest';
        const guestJson = localStorage.getItem(guestKey);
        if (!guestJson) return;

        const guestArchives: UserProfile[] = JSON.parse(guestJson);
        if (guestArchives.length === 0) return;

        console.log(`🔄 [Merge] 发现 ${guestArchives.length} 条访客数据，正在合并到用户 ${userId}...`);

        // 1. 读取当前用户数据
        let userArchives = await getArchives(); // 此时已切换到 user key
        
        // 2. 遍历访客数据，去重并上传
        for (const guestArchive of guestArchives) {
            // 查重：简单的各项匹配
            const exists = userArchives.some(u => 
                u.name === guestArchive.name && 
                u.birthDate === guestArchive.birthDate && 
                u.birthTime === guestArchive.birthTime
            );
            
            if (!exists) {
                // 修改 ID 为新 ID（或者是 UUID），这里让 saveArchive 处理
                // 但 saveArchive 会更新本地 storage。
                // 我们直接调用 saveArchive，它会处理云端保存
                // 为了避免 ID 冲突，我们可以重置 ID
                const newProfile = { ...guestArchive, id: '' }; // 重置 ID 触发新建
                await saveArchive(newProfile);
            }
        }
        
        // 3. 清除访客数据
        localStorage.removeItem(guestKey);
        console.log("✅ [Merge] 访客数据合并完成");
        
    } catch (e) {
        console.error("❌ [Merge] 合并访客数据失败", e);
    }
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
    const dupIndex = archives.findIndex(p => 
      p.birthDate === finalProfile.birthDate && 
      p.birthTime === finalProfile.birthTime && 
      p.gender === finalProfile.gender
    );
    if (dupIndex > -1) {
      return archives;
    }
    finalProfile.id = profile.id || generateId();
    finalProfile.createdAt = Date.now();
    archives.unshift(finalProfile);
  }

  // 先存本地
  try {
    const key = await getStorageKey();
    localStorage.setItem(key, JSON.stringify(archives));
  } catch {}

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
        .eq('gender', finalProfile.gender)
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
            const k = await getStorageKey();
            localStorage.setItem(k, JSON.stringify(archives));
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
            const k = await getStorageKey();
            localStorage.setItem(k, JSON.stringify(archives));
          }
          console.log("✅ [Cloud Save] 成功，已生成云端 UUID 并本地迁移");
        }
      }
    }
  }

  return archives;
};

export const saveArchiveFast = async (profile: UserProfile): Promise<UserProfile[]> => {
  let archives = await getArchives();
  const existingIndex = archives.findIndex(p => p.id === profile.id);
  let finalProfile = { ...profile };
  finalProfile.birthDate = normalizeDate(finalProfile.birthDate);
  finalProfile.birthTime = normalizeTime(finalProfile.birthTime);

  if (existingIndex > -1) {
    finalProfile = { ...archives[existingIndex], ...profile };
    archives[existingIndex] = finalProfile;
  } else {
    const dupIndex = archives.findIndex(p => 
      p.birthDate === finalProfile.birthDate && 
      p.birthTime === finalProfile.birthTime && 
      p.gender === finalProfile.gender
    );
    if (dupIndex > -1) {
      return archives;
    }
    finalProfile.id = profile.id || generateId();
    finalProfile.createdAt = Date.now();
    archives.unshift(finalProfile);
  }

  try {
    const key = await getStorageKey();
    localStorage.setItem(key, JSON.stringify(archives));
  } catch {}

  (async () => { try { await saveArchive(finalProfile); } catch {} })();

  return archives;
};

// 4. 设为本人
export const setArchiveAsSelf = async (id: string): Promise<UserProfile[]> => {
  let archives = await getArchives();
  
  // 1. 先在本地更新状态
  const oldSelf = archives.find(p => p.isSelf);
  archives = archives.map(p => ({ ...p, isSelf: p.id === id }));
  try {
    const key = await getStorageKey();
    localStorage.setItem(key, JSON.stringify(archives));
  } catch {}

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
  try {
    const key = await getStorageKey();
    localStorage.setItem(key, JSON.stringify(newList));
  } catch {}
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
