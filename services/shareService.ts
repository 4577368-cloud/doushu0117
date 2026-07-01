import { UserProfile, BaziChart } from '../types';
import { getTrialUsage, useTrialChat } from './storageService';
import { supabase } from './supabase';

const REFERRAL_KEY = 'xuan_shu_referral';
const REFERRAL_BONUS = 5;

export type ShareResult = { ok: boolean; message: string };

export const generateProfileShareText = (profile: UserProfile, chart: BaziChart): string => {
    const p = chart.pillars;
    const lines = [
        `【${profile.name}的八字命盘】`,
        `出生：${profile.birthDate} ${profile.birthTime}`,
        `日主：${chart.dayMaster}（${chart.dayMasterElement}）`,
        `四柱：${p.year.ganZhi.gan}${p.year.ganZhi.zhi} ${p.month.ganZhi.gan}${p.month.ganZhi.zhi} ${p.day.ganZhi.gan}${p.day.ganZhi.zhi} ${p.hour.ganZhi.gan}${p.hour.ganZhi.zhi}`,
        `喜用：${chart.balance.xiShen.join('、') || '—'}`,
        ``,
        `我在玄枢命理排盘，AI 大师解读很准，快来试试 👉`,
        `${window.location.origin}${window.location.pathname}#chart`,
    ];
    return lines.join('\n');
};

export const generateReferralLink = async (): Promise<string> => {
    let code = 'GUEST';
    try {
        const { data: { session } } = await supabase.auth.getSession();
        code = session?.user?.id?.slice(0, 12).toUpperCase() || code;
    } catch {}
    return `${window.location.origin}${window.location.pathname}?ref=${code}#home`;
};

export const shareProfile = async (profile: UserProfile, chart: BaziChart): Promise<ShareResult> => {
    const text = generateProfileShareText(profile, chart);
    try {
        if (navigator.share) {
            await navigator.share({ title: `${profile.name}的八字命盘`, text });
            return { ok: true, message: '分享成功' };
        }
    } catch (e: any) {
        if (e?.name === 'AbortError') return { ok: false, message: '已取消分享' };
    }
    try {
        await navigator.clipboard.writeText(text);
        return { ok: true, message: '已复制分享文案' };
    } catch {
        return { ok: false, message: '复制失败，请手动截图分享' };
    }
};

export const inviteFriends = async (): Promise<ShareResult> => {
    const link = await generateReferralLink();
    const text = `我发现了一个很准的 AI 命理工具「玄枢」，新用户免费体验大师解读和 AI 对话。点击链接领取福利 👉 ${link}`;
    try {
        if (navigator.share) {
            await navigator.share({ title: '玄枢命理 · 邀请好友', text });
            return { ok: true, message: '邀请已发送' };
        }
    } catch (e: any) {
        if (e?.name === 'AbortError') return { ok: false, message: '已取消邀请' };
    }
    try {
        await navigator.clipboard.writeText(text);
        return { ok: true, message: '邀请链接已复制' };
    } catch {
        return { ok: false, message: '复制失败' };
    }
};

export const applyReferralBonus = async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    try {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        if (!ref) return false;

        const processedKey = `${REFERRAL_KEY}:processed`;
        if (localStorage.getItem(processedKey)) return false;

        // 简单防刷：只给通过链接进入的新访客/设备增加额度
        const usage = await getTrialUsage();
        if (usage.chatCount > 0) {
            localStorage.setItem(processedKey, 'true');
            return false;
        }

        for (let i = 0; i < REFERRAL_BONUS; i++) {
            await useTrialChat();
        }
        localStorage.setItem(processedKey, 'true');
        return true;
    } catch {
        return false;
    }
};
