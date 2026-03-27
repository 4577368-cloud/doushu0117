import { UserProfile, HistoryItem } from '../types';
import { supabase, supabaseReady } from './supabase';

const LEGACY_KEY = 'bazi_archives';
const SYNC_META_KEY = 'bazi_sync_meta';

type SyncMeta = {
  lastSyncAt: number | null;
  lastError: string | null;
};

const readSyncMeta = (): SyncMeta => {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    if (!raw) return { lastSyncAt: null, lastError: null };
    const parsed = JSON.parse(raw);
    return {
      lastSyncAt: typeof parsed?.lastSyncAt === 'number' ? parsed.lastSyncAt : null,
      lastError: typeof parsed?.lastError === 'string' ? parsed.lastError : null
    };
  } catch {
    return { lastSyncAt: null, lastError: null };
  }
};

const writeSyncMeta = (patch: Partial<SyncMeta>) => {
  try {
    const current = readSyncMeta();
    const next: SyncMeta = {
      lastSyncAt: patch.lastSyncAt === undefined ? current.lastSyncAt : patch.lastSyncAt,
      lastError: patch.lastError === undefined ? current.lastError : patch.lastError
    };
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('archives-sync-meta-updated', { detail: next }));
  } catch {}
};

export const getSyncMeta = (): SyncMeta => {
  if (typeof window === 'undefined') return { lastSyncAt: null, lastError: null };
  return readSyncMeta();
};
const getStorageKey = async (userId?: string): Promise<string> => {
  try {
    if (userId) return `bazi_archives:${userId}`;
    
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
export const getArchives = async (userId?: string): Promise<UserProfile[]> => {
  if (typeof window === 'undefined') return [];
  // 迁移旧全局键到 guest 键
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      localStorage.setItem('bazi_archives:guest', legacy);
      localStorage.removeItem(LEGACY_KEY);
    }
  } catch {}
  try {
    const key = await getStorageKey(userId);
    console.log(`[Storage] Reading archives from key: ${key}`);
    const json = localStorage.getItem(key);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
};

// 2. 从云端同步
export const syncArchivesFromCloud = async (userId: string): Promise<UserProfile[]> => {
  if (!userId) {
    console.warn("⚠️ [Sync] 无效的 UserId，取消同步");
    writeSyncMeta({ lastError: '无效用户，已取消同步' });
    return getArchives(userId);
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
      writeSyncMeta({ lastError: error.message || '云端查询失败' });
      return getArchives(userId);
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
        aiReports: item.ai_reports || [] 
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
      const key = await getStorageKey(userId);
      
      // ⚠️ 策略：云端数据覆盖本地数据，但保留云端没有的本地数据（防止未同步的数据丢失）
      // 读取当前本地数据
      const localJson = localStorage.getItem(key);
      const localArchives: UserProfile[] = localJson ? JSON.parse(localJson) : [];
      
      const mergedMap = new Map<string, UserProfile>();
      sorted.forEach(a => {
          // 尝试从本地恢复 aiReports (如果云端没有)
          const local = localArchives.find(l => l.id === a.id);
          if (local && local.aiReports && local.aiReports.length > 0) {
              if (!a.aiReports || a.aiReports.length === 0) {
                  a.aiReports = local.aiReports;
              } else {
                  // 如果云端和本地都有，尝试合并 (以本地为准，因为可能刚生成了新报告)
                  // 简单的合并策略：ID 去重
                  const existingIds = new Set(a.aiReports.map(r => r.id));
                  local.aiReports.forEach(r => {
                      if (!existingIds.has(r.id)) {
                          a.aiReports?.unshift(r);
                      }
                  });
              }
          }
          mergedMap.set(a.id, a);
      });
      
      // 检查本地是否有“未同步”的数据（不在云端列表中）
      localArchives.forEach(local => {
          if (!mergedMap.has(local.id)) {
              console.log("⚠️ [Sync] 保留本地独有档案:", local.name, local.id);
              mergedMap.set(local.id, local);
          }
      });
      
      const finalArchives = Array.from(mergedMap.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      localStorage.setItem(key, JSON.stringify(finalArchives));
      writeSyncMeta({ lastSyncAt: Date.now(), lastError: null });
      return finalArchives;
    }
    writeSyncMeta({ lastError: '云端返回空数据' });
    return getArchives(userId);
  } catch (err: any) {
    console.error("❌ [Sync] 失败:", err.message);
    writeSyncMeta({ lastError: err?.message || '同步异常' });
    return getArchives(userId);
  }
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
        let userArchives = await getArchives(userId); // 此时已切换到 user key
        
        // 2. 遍历访客数据，去重并上传
        for (const guestArchive of guestArchives) {
            // 查重：简单的各项匹配
            const exists = userArchives.some(u => 
                u.name === guestArchive.name && 
                u.birthDate === guestArchive.birthDate && 
                u.birthTime === guestArchive.birthTime
            );
            
            if (!exists) {
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
      is_solar_time: finalProfile.isSolarTime,
      province: finalProfile.province,
      city: finalProfile.city,
      longitude: finalProfile.longitude,
      tags: finalProfile.tags,
      is_self: finalProfile.isSelf,
      avatar: finalProfile.avatar,
      ai_reports: finalProfile.aiReports,
      updated_at: new Date().toISOString()
    };

    if (finalProfile.id && isUuid(finalProfile.id)) {
        basePayload.id = finalProfile.id;
    }

    const { error } = await supabase.from('archives').upsert(basePayload);
    if (error) {
      console.error("Cloud save failed:", error);
      writeSyncMeta({ lastError: error.message || '云端保存失败' });
    } else {
      writeSyncMeta({ lastSyncAt: Date.now(), lastError: null });
    }
  }

  return archives;
};

export const saveArchiveFast = async (profile: UserProfile): Promise<UserProfile[]> => {
    return saveArchive(profile);
};

export const saveAiReportToArchive = async (id: string, content: string, type: string): Promise<UserProfile[]> => {
    const archives = await getArchives();
    const profile = archives.find(p => p.id === id);
    if (!profile) return archives;
    
    if (!profile.aiReports) profile.aiReports = [];
    const newReport = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        content,
        type
    };
    profile.aiReports.unshift(newReport);
    return saveArchive(profile);
};

export const getVipStatus = async (session?: any): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  try {
    // 1. Check passed session first (fastest/freshest)
    if (session?.user) {
        const meta = session.user.user_metadata as any;
        console.log('[VIP Check] From passed session:', meta?.is_vip_user);
        if (meta && typeof meta.is_vip_user !== 'undefined') {
            return !!meta.is_vip_user;
        }
    }
    
    // 2. Check current session
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession?.user) {
      const meta = currentSession.user.user_metadata as any;
      console.log('[VIP Check] From current session:', meta?.is_vip_user);
      if (meta && typeof meta.is_vip_user !== 'undefined') {
        return !!meta.is_vip_user;
      }
      return false; // Logged in but not VIP
    }
  } catch (e) {
      console.error('[VIP Check] Error:', e);
  }
  // 3. Fallback to local storage (for guests or offline)
  return localStorage.getItem('is_vip_user') === 'true';
};

export const activateVipOnCloud = async (source: string): Promise<boolean> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return false;
        
        const { error } = await supabase.auth.updateUser({
            data: { is_vip_user: true, vip_source: source, vip_activated_at: new Date().toISOString() }
        });
        
        if (error) throw error;
        return true;
    } catch (e) {
        console.error("VIP Activation Failed:", e);
        return false;
    }
};

// --- Missing Functions Implementation ---

export const deleteArchive = async (id: string): Promise<UserProfile[]> => {
    let archives = await getArchives();
    const newArchives = archives.filter(a => a.id !== id);
    
    // Local save
    const key = await getStorageKey();
    localStorage.setItem(key, JSON.stringify(newArchives));

    // Cloud delete
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        await supabase.from('archives').delete().eq('id', id).eq('user_id', session.user.id);
    }
    
    return newArchives;
};

export const setArchiveAsSelf = async (id: string): Promise<void> => {
    let archives = await getArchives();
    
    // Local update
    archives = archives.map(a => ({
        ...a,
        isSelf: a.id === id
    }));
    const key = await getStorageKey();
    localStorage.setItem(key, JSON.stringify(archives));

    // Cloud update
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        // First set all to false
        await supabase.from('archives').update({ is_self: false }).eq('user_id', session.user.id);
        // Then set the target to true
        await supabase.from('archives').update({ is_self: true }).eq('id', id).eq('user_id', session.user.id);
    }
};

export const updateArchive = saveArchive; // Alias
