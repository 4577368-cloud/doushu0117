import { UserProfile } from '../types';
import { normalizeBirthDate } from './chartLoader';
import type { ChatMessage } from '../services/chatService';

/** 用生辰指纹作 key，避免 profile.id 在云端同步后变化导致历史丢失 */
export function getChatHistoryKey(profile: Pick<UserProfile, 'id' | 'gender' | 'birthDate' | 'birthTime'>): string {
    const date = normalizeBirthDate(profile.birthDate || '');
    const time = (profile.birthTime || '00:00').slice(0, 5);
    return `chat_v2_${profile.gender}_${date}_${time}`;
}

function legacyIdKey(profileId: string): string {
    return `chat_history_${profileId}`;
}

const memoryCache = new Map<string, ChatMessage[]>();

function sanitizeForSave(messages: ChatMessage[]): ChatMessage[] {
    return messages.filter((m, i) => {
        if (!m?.role) return false;
        const text = (m.content || '').trim();
        if (m.role === 'assistant' && !text && i === messages.length - 1) return false;
        return !!text;
    });
}

export function saveChatHistory(profile: UserProfile, messages: ChatMessage[]): void {
    const key = getChatHistoryKey(profile);
    const sanitized = sanitizeForSave(messages);
    memoryCache.set(key, sanitized);
    try {
        localStorage.setItem(key, JSON.stringify(sanitized));
    } catch { /* quota */ }
}

export function loadChatHistory(profile: UserProfile): ChatMessage[] | null {
    const key = getChatHistoryKey(profile);

    const cached = memoryCache.get(key);
    if (cached && cached.length > 0) return cached;

    const keysToTry = [key];
    if (profile.id) keysToTry.push(legacyIdKey(profile.id));

    for (const storageKey of keysToTry) {
        try {
            const raw = localStorage.getItem(storageKey);
            if (!raw) continue;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) continue;
            const messages = parsed.filter((m) => m?.role && (m.content || '').trim());
            if (messages.length === 0) continue;
            memoryCache.set(key, messages);
            if (storageKey !== key) {
                localStorage.setItem(key, JSON.stringify(messages));
            }
            return messages;
        } catch { /* ignore */ }
    }

    return null;
}

export function clearChatHistory(profile: UserProfile): void {
    const key = getChatHistoryKey(profile);
    memoryCache.delete(key);
    try {
        localStorage.removeItem(key);
        if (profile.id) localStorage.removeItem(legacyIdKey(profile.id));
    } catch { /* ignore */ }
}

export function buildWelcomeMessage(profileName: string, timeContext: string): ChatMessage {
    return {
        role: 'assistant',
        content: `您好，${profileName}！\n我是您的专属命理师，已研读您的命盘。\n\n当前时间：【${timeContext}】\n请问您今天想了解哪方面的运势？`,
    };
}
