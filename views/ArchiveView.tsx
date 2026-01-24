import React, { useState, useMemo } from 'react';
import { Trash2, Search, User, Clock, ChevronRight, Calendar, Cloud, RefreshCw, LogOut, Crown, Edit3, X, Save, Fingerprint, Plus, Tag, Layers, Loader2, ClipboardCopy, ShieldCheck } from 'lucide-react';
import { UserProfile, HistoryItem } from '../types';
import { deleteArchive, syncArchivesFromCloud, setArchiveAsSelf, updateArchive } from '../services/storageService';
import { uploadAvatar } from '../services/supabase';
import { PolicyModal } from '../components/modals/PolicyModals';

interface ArchiveViewProps {
    archives: UserProfile[];
    setArchives: React.Dispatch<React.SetStateAction<UserProfile[]>>;
    onSelect: (profile: UserProfile) => void;
    isVip: boolean;
    onVipClick: () => void;
    session: any; 
    onLogout: () => void;
    onNewChart: () => void;
}

const PRESET_TAGS = ["客户", "朋友", "家人", "同事", "VIP", "重要", "案例"];

// --- 优化的开关组件 ---
const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void; disabled?: boolean; isDark?: boolean }> = ({ checked, onChange, disabled, isDark }) => (
    <div 
        onClick={(e) => { 
            e.stopPropagation(); 
            if(!disabled) onChange(); 
        }}
        className={`
            relative w-10 h-5 rounded-full transition-colors duration-300 ease-in-out flex items-center px-0.5 cursor-pointer z-20
            ${checked ? 'bg-amber-500' : (isDark ? 'bg-stone-700' : 'bg-stone-300')} 
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
    >
        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
);

export const ArchiveView: React.FC<ArchiveViewProps> = ({ 
    archives, 
    setArchives, 
    onSelect, 
    isVip, 
    onVipClick,
    session,
    onLogout,
    onNewChart
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [syncStatus, setSyncStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ name: string; tags: string; gender: 'male'|'female'; birthDate: string; birthTime: string }>({ name: '', tags: '', gender: 'male', birthDate: '', birthTime: '00:00' });
    const [birthDateDigits, setBirthDateDigits] = useState<string>('');
    const [editHour, setEditHour] = useState<string>('00');
    const [editMinute, setEditMinute] = useState<string>('00');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string>('');
    const selfProfile = useMemo(() => archives.find(p => p.isSelf), [archives]);
    const [savingEdit, setSavingEdit] = useState(false);
    const emojiForProfile = (p: UserProfile) => p.gender === 'female' ? '👩' : p.gender === 'male' ? '🧑' : '🙂';
    const [avatarGenerated, setAvatarGenerated] = useState<string>('');
    const ZODIAC = ['🐭','🐮','🐯','🐰','🐲','🐍','🐴','🐑','🐵','🐔','🐶','🐷'];
    const zodiacFromYear = (y: number) => ZODIAC[(y - 4) % 12];
    const makeEmojiAvatar = async (emoji: string, size = 96) => {
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';
        ctx.clearRect(0, 0, size, size);
        ctx.font = `${Math.floor(size*0.7)}px system-ui, Apple Color Emoji, Segoe UI Emoji`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(emoji, size/2, size/2);
        return canvas.toDataURL('image/png');
    };

    // 1. 动态计算顶部标签统计
    const tagStats = useMemo(() => {
        const stats: Record<string, number> = {};
        archives.forEach(p => {
            if (p.tags && p.tags.length > 0) {
                p.tags.forEach(t => {
                    if(t) stats[t] = (stats[t] || 0) + 1;
                });
            }
        });
        return Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 3);
    }, [archives]);

    const uniqueTagsCount = useMemo(() => {
        const s = new Set<string>();
        archives.forEach(p => p.tags?.forEach(t => { if (t) s.add(t); }));
        return s.size;
    }, [archives]);

    // 🔥 2. 核心优化：过滤 + 置顶排序
    const displayList = useMemo(() => {
        // 第一步：先过滤
        const list = archives.filter(p => 
            (p.name && p.name.includes(searchTerm)) || 
            (p.birthDate && p.birthDate.includes(searchTerm)) ||
            (p.tags && p.tags.some(t => t.includes(searchTerm)))
        );
        
        // 第二步：再排序 (本人置顶 > 创建时间倒序)
        return list.sort((a, b) => {
            // 权重：本人(1) > 非本人(0)
            const weightA = a.isSelf ? 1 : 0;
            const weightB = b.isSelf ? 1 : 0;
            
            if (weightA !== weightB) {
                return weightB - weightA; // 权重大的排前面
            }
            
            // 权重相同时，按创建时间倒序 (新创建的在前面)
            return (b.createdAt || 0) - (a.createdAt || 0);
        });
    }, [archives, searchTerm]);

    // 操作逻辑
    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('确定要删除这条档案吗？')) {
            const newList = await deleteArchive(id);
            setArchives(newList);
        }
    };

    const handleSetSelf = async (id: string) => {
        // 乐观更新 UI (立即看到效果)
        const optimisticList = archives.map(p => ({
            ...p,
            isSelf: p.id === id
        }));
        setArchives(optimisticList);

        // 后台保存
        try {
            await setArchiveAsSelf(id);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSync = async () => {
        if (!session?.user) return alert("请先登录");
        setSyncStatus('loading');
        try {
            const newList = await syncArchivesFromCloud(session.user.id);
            setArchives(newList);
            setSyncStatus('success');
            console.log(`[Sync] 手动同步完成，共 ${newList.length} 条`);
            setTimeout(() => setSyncStatus('idle'), 2000); 
        } catch (e: any) {
            console.error("[Sync] 手动同步失败:", e);
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 3000);
            alert(`同步失败: ${e.message || '请检查网络'}`);
        }
    };

    // 编辑逻辑...
    const startEdit = (e: React.MouseEvent, profile: UserProfile) => {
        e.stopPropagation();
        setEditingId(profile.id);
        setEditForm({ name: profile.name, tags: profile.tags?.join(' ') || '', gender: profile.gender, birthDate: profile.birthDate || '', birthTime: profile.birthTime || '00:00' });
        setBirthDateDigits((profile.birthDate || '').replace(/\D/g, '').slice(0,8));
        const tm = (profile.birthTime || '00:00').split(':');
        const h = (tm[0] || '00').padStart(2, '0');
        const m = (tm[1] || '00').padStart(2, '0');
        setEditHour(h);
        setEditMinute(m);
        setAvatarPreview(profile.avatar || '');
        setAvatarFile(null);
        setAvatarGenerated('');
    };

    const addTag = (e: React.MouseEvent, tag: string) => {
        e.preventDefault(); e.stopPropagation();
        const currentTags = editForm.tags.split(' ').map(t => t.trim()).filter(t => t);
        if (!currentTags.includes(tag)) {
            setEditForm(prev => ({ ...prev, tags: [...currentTags, tag].join(' ') }));
        }
    };

    const saveEdit = async () => {
        const editingProfile = archives.find(p => p.id === editingId);
        if (!editingProfile) return;
        if (!editForm.name.trim()) return alert("姓名不能为空");
        if (birthDateDigits.length === 8) {
            const y = birthDateDigits.slice(0,4);
            const m = birthDateDigits.slice(4,6);
            const d = birthDateDigits.slice(6,8);
            setEditForm(prev => ({ ...prev, birthDate: `${y}-${m}-${d}` }));
        }
        setSavingEdit(true);
        try {
            let updatedProfile: UserProfile = {
                ...editingProfile,
                name: editForm.name,
                tags: editForm.tags.split(' ').map(t => t.trim()).filter(t => t !== ''),
                gender: editForm.gender,
                birthDate: editForm.birthDate,
                birthTime: editForm.birthTime,
                isSolarTime: editingProfile.isSolarTime
            };

            if (avatarFile && session?.user) {
                const res = await uploadAvatar(session.user.id, editingProfile.id, avatarFile);
                if (res.url) {
                    updatedProfile = { ...updatedProfile, avatar: res.url } as UserProfile;
                } else {
                    alert('头像上传失败: ' + (res.error?.message || '未知错误'));
                }
            } else if (avatarGenerated) {
                updatedProfile = { ...updatedProfile, avatar: avatarGenerated } as UserProfile;
            } else if (!editingProfile.avatar) {
                let emoji = emojiForProfile(editingProfile);
                const y = parseInt((editingProfile.birthDate || '').slice(0,4), 10);
                if (Number.isFinite(y)) {
                    try { emoji = zodiacFromYear(y); } catch {}
                }
                const url = await makeEmojiAvatar(emoji);
                if (url) updatedProfile = { ...updatedProfile, avatar: url } as UserProfile;
            }

            const newList = await updateArchive(updatedProfile);
            setArchives(newList);
            setEditingId(null);
            setAvatarFile(null);
            setAvatarPreview('');
            setAvatarGenerated('');
        } catch (e) {
        } finally {
            setSavingEdit(false);
        }
    };

    const [reportModalProfileId, setReportModalProfileId] = useState<string | null>(null);
    const [reportToView, setReportToView] = useState<HistoryItem | null>(null);

    const [showPolicyModal, setShowPolicyModal] = useState<'user'|'privacy'|null>(null);

    return (
        <div className="h-full flex flex-col bg-[#f5f5f4] relative">
            
            {/* 顶部黑金会员卡 */}
            <div className="bg-[#1c1917] p-4 pb-4 shadow-2xl relative shrink-0 z-10">
                <div className="absolute top-[-50%] right-[-10%] w-[60%] h-[160%] bg-gradient-to-b from-amber-500/10 via-transparent to-transparent rotate-12 pointer-events-none blur-2xl"></div>
                
                {/* 头部用户信息 */}
                <div className="relative flex justify-between items-start z-10">
                    <div className="flex items-center gap-3">
                        {selfProfile?.avatar ? (
                          <img src={selfProfile.avatar} alt="avatar" className="w-12 h-12 rounded-full object-cover border border-amber-500/40 shadow-lg" />
                        ) : (
                          <div className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-amber-300 via-amber-500 to-amber-200 shadow-lg shadow-amber-900/50">
                            <div className="w-full h-full rounded-full bg-[#1c1917] flex items-center justify-center text-xl">
                                {selfProfile ? emojiForProfile(selfProfile) : '🙂'}
                            </div>
                          </div>
                        )}
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-stone-100 font-bold text-lg tracking-wide font-serif">
                                {selfProfile ? selfProfile.name : (session ? (session.user.user_metadata?.name || session.user.email?.split('@')[0] || '命理师') : '访客')}
                            </h2>
                                {isVip ? (
                                    <span className="flex items-center gap-1 bg-gradient-to-r from-amber-300 to-amber-500 text-[#1c1917] text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                                        <Crown size={10} fill="currentColor"/> VIP
                                    </span>
                                ) : (
                                    <span onClick={onVipClick} className="flex items-center gap-1 bg-stone-800 text-stone-500 border border-stone-700 text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer hover:text-stone-300">
                                        普通用户
                                    </span>
                                )}
                            </div>
                            <div className="hidden sm:flex items-center gap-2 mt-1 text-xs font-medium tracking-wide">
                                <span className="text-stone-500">{session ? `ID: ${session.user.id.slice(0,8).toUpperCase()}` : '离线模式'}</span>
                            </div>
                        </div>
                    </div>
                    {session ? (
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={handleSync}
                                disabled={syncStatus === 'loading' || syncStatus === 'success'}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${syncStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-stone-200 active:scale-95'}`}
                            >
                                <RefreshCw size={13} className={syncStatus === 'loading' ? 'animate-spin' : ''} />
                                {syncStatus === 'loading' ? '同步中' : syncStatus === 'success' ? '已同步' : '同步'}
                            </button>
                            <button onClick={onLogout} className="text-xs text-stone-500 hover:text-rose-400 flex items-center gap-1.5 px-3 py-1.5 bg-stone-800/50 border border-stone-700/50 rounded-full active:scale-95 transition-all"><LogOut size={13}/> 退出</button>
                    </div>
                ) : (
                    <button className="text-xs bg-amber-500 text-[#1c1917] px-4 py-1 rounded-full font-bold">登录</button>
                )}
            </div>
            
            <div className="flex justify-end gap-3 px-1 pb-1 z-10 relative mt-2 mr-1">
                <button onClick={() => setShowPolicyModal('user')} className="text-[9px] text-stone-500 hover:text-stone-300 flex items-center gap-1"><ShieldCheck size={9}/> 用户协议</button>
                <button onClick={() => setShowPolicyModal('privacy')} className="text-[9px] text-stone-500 hover:text-stone-300 flex items-center gap-1"><ShieldCheck size={9}/> 隐私政策</button>
            </div>

            
        </div>

            {!isVip && session && (
                <div className="px-4 mt-2 z-20">
                    <div className="rounded-2xl p-4 bg-[#1c1917] border border-amber-700/30 shadow-xl">
                        <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-amber-300 via-amber-500 to-amber-200 flex items-center justify-center shadow-md">
                                <Crown size={18} className="text-[#1c1917]" />
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-black text-amber-200">升级 VIP 解锁更多能力</div>
                                <div className="text-xs text-stone-400">无限次 AI 深度分析、更多报告与云备份</div>
                            </div>
                            <button onClick={onVipClick} className="px-4 py-2 rounded-full text-xs font-bold border border-amber-400 text-amber-300 hover:bg-amber-500/10 hover:border-amber-300 transition-colors">立即解锁</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 列表内容区 */}
            <div className="flex-1 overflow-y-auto p-4 pt-3 space-y-3 custom-scrollbar">
                
                {/* 新建排盘卡片 - Redesigned */}
                <div 
                    onClick={onNewChart}
                    className="group relative overflow-hidden rounded-2xl p-5 cursor-pointer transition-all duration-300 active:scale-[0.98] shadow-lg hover:shadow-xl border border-amber-500/30 bg-gradient-to-br from-stone-900 to-[#1c1917]"
                >
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-amber-500/20 transition-all duration-500"></div>
                    
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-900/40 group-hover:scale-110 transition-transform duration-300">
                                <Plus size={24} className="text-[#1c1917]" strokeWidth={3} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-amber-100 group-hover:text-white transition-colors">新建排盘</h3>
                                <p className="text-xs text-amber-500/60 font-medium mt-0.5 group-hover:text-amber-400/80 transition-colors">开启新的命理探索</p>
                            </div>
                        </div>
                        
                        <div className="w-8 h-8 rounded-full bg-stone-800/50 flex items-center justify-center border border-stone-700/50 group-hover:bg-amber-500/20 group-hover:border-amber-500/30 transition-all">
                            <ChevronRight size={16} className="text-stone-500 group-hover:text-amber-400" />
                        </div>
                    </div>
                </div>

                {displayList.map((profile, index) => {
                    const isSelf = profile.isSelf;
                    return (
                        <div 
                            key={profile.id} 
                            onClick={() => onSelect(profile)}
                            className={`
                                group relative border rounded-2xl p-4 shadow-sm active:scale-[0.99] transition-all duration-500 cursor-pointer overflow-hidden
                                ${isSelf 
                                    ? 'bg-[#1c1917] border-amber-500/30 shadow-lg shadow-amber-900/20 ring-1 ring-amber-500/20 order-first'
                                    : (profile.gender === 'male' 
                                        ? 'bg-indigo-50/70 border-indigo-200 hover:border-indigo-300 hover:shadow-md'
                                        : 'bg-rose-50/70 border-rose-200 hover:border-rose-300 hover:shadow-md')
                                }
                            `}
                            // 为置顶添加动画效果
                            style={isSelf ? { animation: 'fade-in 0.5s ease-out' } : {}}
                        >
                            {isSelf && (
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                            )}

                            <div className="flex justify-between items-start relative z-10">
                                <div className="flex items-start gap-3">
                                    {profile.avatar ? (
                                        <img src={profile.avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover shadow-sm" />
                                    ) : (
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm ${isSelf ? 'bg-gradient-to-br from-amber-300 to-amber-600 text-[#1c1917]' : (profile.gender==='male' ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800')}`}>
                                            {emojiForProfile(profile)}
                                        </div>
                                    )}
                                    
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className={`font-black text-[15px] ${isSelf ? 'text-amber-50' : 'text-stone-800'}`}>{profile.name}</h3>
                                            {isSelf && (
                                                <span className="flex items-center gap-0.5 text-[9px] font-bold bg-amber-500 text-[#1c1917] px-1.5 py-0.5 rounded-full shadow-sm">
                                                    <Crown size={9} fill="currentColor"/> 本人
                                                </span>
                                            )}
                                        </div>
                                        <div className={`flex items-center gap-3 text-xs mt-1 ${isSelf ? 'text-stone-400' : 'text-stone-500'}`}>
                                            <span className="flex items-center gap-1"><Calendar size={10}/> {profile.birthDate}</span>
                                            <span className="flex items-center gap-1"><Clock size={10}/> {profile.birthTime}</span>
                                        </div>
                                        
                                        {profile.tags && profile.tags.length > 0 && (
                                            <div className="flex gap-1 mt-2">
                                                {profile.tags.map((tag, i) => (
                                                    <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded-md ${isSelf ? 'bg-stone-800 text-stone-400 border border-stone-700' : (profile.gender==='male' ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700')}`}>
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {profile.aiReports && profile.aiReports.length > 0 && (
                                            <div className="mt-2">
                                                <button onClick={(e)=>{ e.stopPropagation(); setReportModalProfileId(profile.id); setReportToView(null); }} className={`text-[10px] px-2 py-1 rounded-full border ${isSelf ? 'bg-stone-800 text-stone-300 border-stone-700 hover:text-amber-300' : (profile.gender==='male' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:text-indigo-900' : 'bg-rose-50 text-rose-700 border-rose-200 hover:text-rose-900')} transition-colors`}>历史报告 {profile.aiReports.length}</button>
                                            </div>
                                        )}
                                        </div>
                                    </div>

                                <div className="flex flex-col items-end gap-3">
                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                        <span className={`text-[9px] font-bold ${isSelf ? 'text-amber-500' : 'text-stone-300'}`}>
                                            {isSelf ? '当前账号' : '设为本人'}
                                        </span>
                                        <ToggleSwitch 
                                            checked={!!isSelf} 
                                            onChange={() => handleSetSelf(profile.id)} 
                                            isDark={isSelf} 
                                        />
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={(e) => startEdit(e, profile)}
                                            className={`p-1.5 rounded-full transition-colors ${isSelf ? 'text-amber-300 bg-stone-800 hover:bg-stone-700' : 'text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100'}`}
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        <button 
                                            onClick={(e) => handleDelete(e, profile.id)}
                                            className={`p-1.5 rounded-full transition-colors ${isSelf ? 'text-rose-400 bg-stone-800 hover:bg-stone-700' : 'text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100'}`}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <ChevronRight size={16} className={isSelf ? 'text-stone-600' : 'text-stone-200'} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 全局编辑弹窗 */}
            {editingId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingId(null)}></div>
                    <div className="relative bg-[#1c1917] w-full max-w-sm rounded-[2rem] shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200 border border-stone-800 max-h-[85vh]" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center border-b border-stone-800 pb-3">
                            <h3 className="font-black text-stone-100 text-lg flex items-center gap-2"><Edit3 size={18} className="text-amber-500"/> 编辑档案</h3>
                            <button onClick={() => setEditingId(null)} className="p-2 text-stone-500 hover:text-stone-300"><X size={20}/></button>
                        </div>
                            <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-1">
                                <div>
                                    <label className="text-xs font-bold text-stone-500 ml-1">姓名</label>
                                    <input autoFocus value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-stone-900/50 rounded-xl px-3.5 py-2.5 text-sm font-bold text-stone-200 outline-none border border-stone-800 focus:border-amber-500/50 transition-all"/>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-stone-500 ml-1">头像</label>
                                    <div className="flex items-center gap-3 mt-2">
                                        {avatarPreview ? (
                                            <img src={avatarPreview} alt="preview" className="w-12 h-12 rounded-full object-cover border border-stone-700" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-stone-800 border border-stone-700" />
                                        )}
                                        <label htmlFor="avatar_input" className="px-3 py-2 rounded-lg text-xs font-bold bg-amber-500 text-[#1c1917] hover:bg-amber-400 shadow-lg shadow-amber-900/20 cursor-pointer">选择头像</label>
                                        <input id="avatar_input" type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0] || null; setAvatarGenerated(''); setAvatarFile(f); setAvatarPreview(f ? URL.createObjectURL(f) : avatarPreview); }} />
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        <button onClick={async()=>{ const url = await makeEmojiAvatar('👩'); setAvatarGenerated(url); setAvatarFile(null); setAvatarPreview(url); }} className="px-2 py-1 rounded-md text-xs bg-stone-800 text-stone-300 border border-stone-700">女性头像</button>
                                        <button onClick={async()=>{ const url = await makeEmojiAvatar('🧑'); setAvatarGenerated(url); setAvatarFile(null); setAvatarPreview(url); }} className="px-2 py-1 rounded-md text-xs bg-stone-800 text-stone-300 border border-stone-700">男性头像</button>
                                        {ZODIAC.map((z, i) => (
                                            <button key={i} onClick={async()=>{ const url = await makeEmojiAvatar(z); setAvatarGenerated(url); setAvatarFile(null); setAvatarPreview(url); }} className="px-2 py-1 rounded-md text-xs bg-stone-800 text-stone-300 border border-stone-700">{z}</button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-stone-500 ml-1">性别</label>
                                    <div className="flex items-center gap-2 mt-2">
                                        <button onClick={()=>setEditForm({...editForm, gender: 'male'})} className={`${editForm.gender==='male'?'bg-amber-500 text-[#1c1917]':'bg-stone-800 text-stone-300'} px-3 py-2 rounded-lg text-xs font-bold border ${editForm.gender==='male'?'border-amber-400':'border-stone-700'}`}>男</button>
                                        <button onClick={()=>setEditForm({...editForm, gender: 'female'})} className={`${editForm.gender==='female'?'bg-amber-500 text-[#1c1917]':'bg-stone-800 text-stone-300'} px-3 py-2 rounded-lg text-xs font-bold border ${editForm.gender==='female'?'border-amber-400':'border-stone-700'}`}>女</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-stone-500 ml-1">生诞 (YYYYMMDD)</label>
                                    <input value={birthDateDigits} onChange={e => { const v = e.target.value.replace(/\D/g,'').slice(0,8); setBirthDateDigits(v); if (v.length === 8) { const y=v.slice(0,4), m=v.slice(4,6), d=v.slice(6,8); setEditForm(prev => ({...prev, birthDate: `${y}-${m}-${d}`})); } }} placeholder="19900101" inputMode="numeric" maxLength={8} className="w-full bg-stone-900/50 rounded-xl px-3.5 py-2.5 text-sm text-stone-300 outline-none border border-stone-800 focus:border-amber-500/50 transition-all"/>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-stone-500 ml-1">出生时间</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <select value={editHour} onChange={e => { const h = e.target.value.padStart(2,'0'); setEditHour(h); setEditForm(prev => ({...prev, birthTime: `${h}:${editMinute}`})); }} className="w-full bg-stone-900/50 border border-stone-800 rounded-xl px-3 py-2.5 outline-none text-sm text-white focus:border-amber-500/50">
                                            {Array.from({length:24}).map((_, i) => (<option key={i} value={i.toString().padStart(2,'0')}>{i.toString().padStart(2,'0')} 时</option>))}
                                        </select>
                                        <select value={editMinute} onChange={e => { const m = e.target.value.padStart(2,'0'); setEditMinute(m); setEditForm(prev => ({...prev, birthTime: `${editHour}:${m}`})); }} className="w-full bg-stone-900/50 border border-stone-800 rounded-xl px-3 py-2.5 outline-none text-sm text-white focus:border-amber-500/50">
                                            {Array.from({length:60}).map((_, i) => (<option key={i} value={i.toString().padStart(2,'0')}>{i.toString().padStart(2,'0')} 分</option>))}
                                        </select>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="text-xs font-bold text-stone-500 ml-1 flex items-center gap-1"><Tag size={12}/> 标签</label>
                                    <input value={editForm.tags} onChange={e => setEditForm({...editForm, tags: e.target.value})} className="w-full bg-stone-900/50 rounded-xl px-3.5 py-2.5 text-sm text-stone-300 outline-none border border-stone-800 focus:border-amber-500/50 transition-all"/>
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {PRESET_TAGS.map(tag => (
                                            <button key={tag} onClick={(e) => addTag(e, tag)} className="flex items-center gap-1 px-3 py-1.5 bg-stone-800 hover:bg-amber-500 hover:text-[#1c1917] border border-stone-700 hover:border-amber-400 rounded-lg text-xs text-stone-400 font-medium transition-all active:scale-95"><Plus size={10}/> {tag}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        <div className="flex gap-3 pt-2 sticky bottom-0 left-0 bg-[#1c1917]">
                            <button onClick={() => setEditingId(null)} disabled={savingEdit} className={`flex-1 py-3.5 rounded-xl text-sm font-bold ${savingEdit?'opacity-60 cursor-not-allowed':''} text-stone-400 bg-stone-800 hover:bg-stone-700`}>取消</button>
                            <button onClick={saveEdit} disabled={savingEdit} className={`flex-1 py-3.5 rounded-xl text-sm font-bold text-[#1c1917] bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-900/20 ${savingEdit?'opacity-60 cursor-not-allowed':''}`}>
                                {savingEdit ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin"/> 保存中...</span> : '保存修改'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {reportModalProfileId && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={()=>{ setReportModalProfileId(null); setReportToView(null); }}></div>
                    <div className="relative bg-[#1c1917] w-full max-w-md rounded-[2rem] shadow-2xl p-6 space-y-4 border border-stone-800">
                        <div className="flex justify-between items-center border-b border-stone-800 pb-3">
                            <h3 className="font-black text-stone-100 text-base">历史AI报告</h3>
                            <button onClick={()=>{ setReportModalProfileId(null); setReportToView(null); }} className="p-2 text-stone-500 hover:text-stone-300"><X size={18}/></button>
                        </div>
                        {!reportToView ? (
                            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                                {(archives.find(p=>p.id===reportModalProfileId)?.aiReports || []).map((it) => (
                                    <button key={it.id} onClick={()=>setReportToView(it)} className="w-full text-left p-3 rounded-xl border border-stone-800 bg-stone-900/40 hover:bg-stone-900/60 transition-colors">
                                        <div className="flex justify-between items-center"><b className="text-stone-100 text-sm">{new Date(it.date).toLocaleString()}</b><span className={`text-[10px] px-2 py-0.5 rounded-full ${it.type==='bazi'?'bg-indigo-600 text-white':'bg-rose-600 text-white'}`}>{it.type}</span></div>
                                        <p className="text-[11px] text-stone-400 mt-1 line-clamp-2">{it.content}</p>
                                    </button>
                                ))}
                                {!(archives.find(p=>p.id===reportModalProfileId)?.aiReports||[]).length && (
                                    <div className="text-center py-10 text-stone-500 text-sm">暂无报告</div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700">{new Date(reportToView.date).toLocaleString()}</span>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => { navigator.clipboard.writeText(reportToView.content); alert('报告内容已复制'); }} className="text-[10px] text-amber-500 hover:text-amber-400 flex items-center gap-1"><ClipboardCopy size={12}/> 复制</button>
                                        <button onClick={()=>setReportToView(null)} className="text-[10px] text-stone-400 hover:text-stone-200">返回列表</button>
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl border border-stone-800 bg-stone-900/40 text-stone-200 text-sm whitespace-pre-wrap max-h-[60vh] overflow-y-auto custom-scrollbar">{reportToView.content}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* 协议弹窗 */}
            <PolicyModal type={showPolicyModal} onClose={() => setShowPolicyModal(null)} />
        </div>
    );
};
