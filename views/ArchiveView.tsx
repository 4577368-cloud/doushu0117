import React, { useState, useMemo } from 'react';
import { Trash2, Search, Clock, ChevronRight, Calendar, Edit3, X, Save, Plus, Tag, Loader2, ClipboardCopy } from 'lucide-react';
import { UserProfile, HistoryItem } from '../types';
import { deleteArchive, updateArchive, setArchiveAsSelf } from '../services/storageService';

interface ArchiveViewProps {
    archives: UserProfile[];
    setArchives: React.Dispatch<React.SetStateAction<UserProfile[]>>;
    onSelect: (profile: UserProfile) => void;
    onNewChart: () => void;
}

const PRESET_TAGS = ["客户", "朋友", "家人", "同事", "VIP", "重要", "案例"];

const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
    <div
        onClick={(e) => { e.stopPropagation(); onChange(); }}
        className={`relative w-10 h-5 rounded-full transition-colors duration-300 ease-in-out flex items-center px-0.5 cursor-pointer ${checked ? 'bg-amber-500' : 'bg-stone-300'}`}
    >
        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
);

export const ArchiveView: React.FC<ArchiveViewProps> = ({
    archives,
    setArchives,
    onSelect,
    onNewChart
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ name: string; tags: string; gender: 'male' | 'female'; birthDate: string; birthTime: string }>({ name: '', tags: '', gender: 'male', birthDate: '', birthTime: '00:00' });
    const [birthDateDigits, setBirthDateDigits] = useState<string>('');
    const [birthDateError, setBirthDateError] = useState<string | null>(null);
    const [editHour, setEditHour] = useState<string>('00');
    const [editMinute, setEditMinute] = useState<string>('00');
    const [savingEdit, setSavingEdit] = useState(false);

    const emojiForProfile = (p: UserProfile) => p.gender === 'female' ? '👩' : p.gender === 'male' ? '🧑' : '🙂';

    const displayList = useMemo(() => {
        const list = archives.filter(p =>
            (p.name && p.name.includes(searchTerm)) ||
            (p.birthDate && p.birthDate.includes(searchTerm)) ||
            (p.tags && p.tags.some(t => t.includes(searchTerm)))
        );
        return list.sort((a, b) => {
            const weightA = a.isSelf ? 1 : 0;
            const weightB = b.isSelf ? 1 : 0;
            if (weightA !== weightB) return weightB - weightA;
            return (b.createdAt || 0) - (a.createdAt || 0);
        });
    }, [archives, searchTerm]);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('确定要删除这条档案吗？')) {
            const newList = await deleteArchive(id);
            setArchives(newList);
        }
    };

    const handleSetSelf = async (id: string) => {
        const optimisticList = archives.map(p => ({ ...p, isSelf: p.id === id }));
        setArchives(optimisticList);
        try { await setArchiveAsSelf(id); } catch (e) { console.error(e); }
    };

    const startEdit = (e: React.MouseEvent, profile: UserProfile) => {
        e.stopPropagation();
        setEditingId(profile.id);
        setEditForm({ name: profile.name, tags: profile.tags?.join(' ') || '', gender: profile.gender, birthDate: profile.birthDate || '', birthTime: profile.birthTime || '00:00' });
        setBirthDateDigits((profile.birthDate || '').replace(/\D/g, '').slice(0, 8));
        const tm = (profile.birthTime || '00:00').split(':');
        setEditHour((tm[0] || '00').padStart(2, '0'));
        setEditMinute((tm[1] || '00').padStart(2, '0'));
    };

    const addTag = (e: React.MouseEvent, tag: string) => {
        e.preventDefault(); e.stopPropagation();
        const currentTags = editForm.tags.split(' ').map(t => t.trim()).filter(t => t);
        if (!currentTags.includes(tag)) {
            setEditForm(prev => ({ ...prev, tags: [...currentTags, tag].join(' ') }));
        }
    };

    const isBirthDateInvalid = birthDateDigits.length > 0 && (!!birthDateError || birthDateDigits.length !== 8);

    const saveEdit = async () => {
        const editingProfile = archives.find(p => p.id === editingId);
        if (!editingProfile) return;
        if (!editForm.name.trim()) return alert("姓名不能为空");
        setSavingEdit(true);
        try {
            const updatedProfile: UserProfile = {
                ...editingProfile,
                name: editForm.name,
                tags: editForm.tags.split(' ').map(t => t.trim()).filter(t => t !== ''),
                gender: editForm.gender,
                birthDate: editForm.birthDate,
                birthTime: editForm.birthTime
            };
            const newList = await updateArchive(updatedProfile);
            setArchives(newList);
            setEditingId(null);
        } finally {
            setSavingEdit(false);
        }
    };

    const [reportModalProfileId, setReportModalProfileId] = useState<string | null>(null);
    const [reportToView, setReportToView] = useState<HistoryItem | null>(null);

    return (
        <div className="h-full flex flex-col bg-[#f5f5f4] relative">
            {/* 顶部搜索与新建 */}
            <div className="bg-white border-b border-stone-200 p-4 sticky top-0 z-10">
                <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-lg font-serif font-black text-stone-900">历史档案</h2>
                    <span className="text-[10px] font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">{archives.length}</span>
                </div>
                <div className="relative mb-3">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="搜索姓名、日期或标签"
                        className="w-full bg-stone-100 border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-stone-400 transition-all"
                    />
                </div>
                <button
                    onClick={onNewChart}
                    className="w-full h-11 bg-stone-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-all shadow-md"
                >
                    <Plus size={18} /> 新建排盘
                </button>
            </div>

            {/* 列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {displayList.map((profile) => {
                    const isSelf = profile.isSelf;
                    return (
                        <div
                            key={profile.id}
                            onClick={() => onSelect(profile)}
                            className={`group relative border rounded-2xl p-4 shadow-sm active:scale-[0.99] transition-all duration-500 cursor-pointer overflow-hidden ${
                                isSelf
                                    ? 'bg-[#1c1917] border-amber-500/30 shadow-lg shadow-amber-900/20 ring-1 ring-amber-500/20'
                                    : (profile.gender === 'male'
                                        ? 'bg-indigo-50/70 border-indigo-200 hover:border-indigo-300 hover:shadow-md'
                                        : 'bg-rose-50/70 border-rose-200 hover:border-rose-300 hover:shadow-md')
                            }`}
                        >
                            {isSelf && <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>}

                            <div className="flex justify-between items-start relative z-10">
                                <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm ${isSelf ? 'bg-gradient-to-br from-amber-300 to-amber-600 text-[#1c1917]' : (profile.gender === 'male' ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800')}`}>
                                        {emojiForProfile(profile)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className={`font-black text-[15px] ${isSelf ? 'text-amber-50' : 'text-stone-800'}`}>{profile.name}</h3>
                                            {isSelf && (
                                                <span className="flex items-center gap-0.5 text-[9px] font-bold bg-amber-500 text-[#1c1917] px-1.5 py-0.5 rounded-full shadow-sm">
                                                    本人
                                                </span>
                                            )}
                                        </div>
                                        <div className={`flex items-center gap-3 text-xs mt-1 ${isSelf ? 'text-stone-400' : 'text-stone-500'}`}>
                                            <span className="flex items-center gap-1"><Calendar size={10} /> {profile.birthDate}</span>
                                            <span className="flex items-center gap-1"><Clock size={10} /> {profile.birthTime}</span>
                                        </div>
                                        {profile.tags && profile.tags.length > 0 && (
                                            <div className="flex gap-1 mt-2">
                                                {profile.tags.map((tag, i) => (
                                                    <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded-md ${isSelf ? 'bg-stone-800 text-stone-400 border border-stone-700' : (profile.gender === 'male' ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700')}`}>
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {profile.aiReports && profile.aiReports.length > 0 && (
                                            <div className="mt-2">
                                                <button onClick={(e) => { e.stopPropagation(); setReportModalProfileId(profile.id); setReportToView(null); }} className={`text-[10px] px-2 py-1 rounded-full border ${isSelf ? 'bg-stone-800 text-stone-300 border-stone-700 hover:text-amber-300' : (profile.gender === 'male' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:text-indigo-900' : 'bg-rose-50 text-rose-700 border-rose-200 hover:text-rose-900')} transition-colors`}>历史报告 {profile.aiReports.length}</button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-3">
                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                        <span className={`text-[9px] font-bold ${isSelf ? 'text-amber-500' : 'text-stone-300'}`}>{isSelf ? '当前账号' : '设为本人'}</span>
                                        <ToggleSwitch checked={!!isSelf} onChange={() => handleSetSelf(profile.id)} />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={(e) => startEdit(e, profile)} className={`p-1.5 rounded-full transition-colors ${isSelf ? 'text-amber-300 bg-stone-800 hover:bg-stone-700' : 'text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100'}`}>
                                            <Edit3 size={14} />
                                        </button>
                                        <button onClick={(e) => handleDelete(e, profile.id)} className={`p-1.5 rounded-full transition-colors ${isSelf ? 'text-rose-400 bg-stone-800 hover:bg-stone-700' : 'text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100'}`}>
                                            <Trash2 size={14} />
                                        </button>
                                        <ChevronRight size={16} className={isSelf ? 'text-stone-600' : 'text-stone-200'} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {displayList.length === 0 && (
                    <div className="text-center py-16 text-stone-400">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-stone-200 flex items-center justify-center text-3xl">📂</div>
                        <p className="text-sm font-medium">暂无档案</p>
                        <p className="text-xs mt-1">点击上方「新建排盘」开始探索</p>
                    </div>
                )}
            </div>

            {/* 编辑弹窗 */}
            {editingId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingId(null)}></div>
                    <div className="relative bg-[#1c1917] w-full max-w-sm rounded-[2rem] shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200 border border-stone-800 max-h-[85vh]" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center border-b border-stone-800 pb-3">
                            <h3 className="font-black text-stone-100 text-lg flex items-center gap-2"><Edit3 size={18} className="text-amber-500" /> 编辑档案</h3>
                            <button onClick={() => setEditingId(null)} className="p-2 text-stone-500 hover:text-stone-300"><X size={20} /></button>
                        </div>
                        <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-1">
                            <div>
                                <label className="text-xs font-bold text-stone-500 ml-1">姓名</label>
                                <input autoFocus value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full bg-stone-900/50 rounded-xl px-3.5 py-2.5 text-sm font-bold text-stone-200 outline-none border border-stone-800 focus:border-amber-500/50 transition-all" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-stone-500 ml-1">性别</label>
                                <div className="flex items-center gap-2 mt-2">
                                    <button onClick={() => setEditForm({ ...editForm, gender: 'male' })} className={`${editForm.gender === 'male' ? 'bg-amber-500 text-[#1c1917]' : 'bg-stone-800 text-stone-300'} px-3 py-2 rounded-lg text-xs font-bold border ${editForm.gender === 'male' ? 'border-amber-400' : 'border-stone-700'}`}>男</button>
                                    <button onClick={() => setEditForm({ ...editForm, gender: 'female' })} className={`${editForm.gender === 'female' ? 'bg-amber-500 text-[#1c1917]' : 'bg-stone-800 text-stone-300'} px-3 py-2 rounded-lg text-xs font-bold border ${editForm.gender === 'female' ? 'border-amber-400' : 'border-stone-700'}`}>女</button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-stone-500 ml-1">生日 (YYYYMMDD)</label>
                                <input
                                    value={birthDateDigits}
                                    onChange={e => {
                                        const v = e.target.value.replace(/\D/g, '').slice(0, 8);
                                        setBirthDateDigits(v);
                                        if (!v) { setBirthDateError(null); setEditForm(prev => ({ ...prev, birthDate: '' })); return; }
                                        if (v.length === 8) {
                                            const yNum = parseInt(v.slice(0, 4), 10), mNum = parseInt(v.slice(4, 6), 10), dNum = parseInt(v.slice(6, 8), 10);
                                            if (!Number.isFinite(yNum) || !Number.isFinite(mNum) || !Number.isFinite(dNum)) { setBirthDateError('请输入正确的数字日期'); return; }
                                            if (yNum < 1900 || yNum > 2100) { setBirthDateError('年份需在 1900-2100 之间'); return; }
                                            if (mNum < 1 || mNum > 12) { setBirthDateError('月份需在 1-12 之间'); return; }
                                            const maxDay = new Date(yNum, mNum, 0).getDate();
                                            if (dNum < 1 || dNum > maxDay) { setBirthDateError(`该月日期需在 1-${maxDay} 之间`); return; }
                                            setBirthDateError(null);
                                            setEditForm(prev => ({ ...prev, birthDate: `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` }));
                                        } else { setBirthDateError(null); }
                                    }}
                                    placeholder="19900101"
                                    inputMode="numeric"
                                    maxLength={8}
                                    className={`w-full bg-stone-900/50 rounded-xl px-3.5 py-2.5 text-sm text-stone-300 outline-none border transition-all ${birthDateError ? 'border-red-500 bg-red-900/40 focus:border-red-400' : 'border-stone-800 focus:border-amber-500/50'}`}
                                />
                                {birthDateError && <p className="mt-1 text-[11px] text-red-400">{birthDateError}</p>}
                            </div>
                            <div>
                                <label className="text-xs font-bold text-stone-500 ml-1">出生时间</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <select value={editHour} onChange={e => { const h = e.target.value.padStart(2, '0'); setEditHour(h); setEditForm(prev => ({ ...prev, birthTime: `${h}:${editMinute}` })); }} className="w-full bg-stone-900/50 border border-stone-800 rounded-xl px-3 py-2.5 outline-none text-sm text-white focus:border-amber-500/50">
                                        {Array.from({ length: 24 }).map((_, i) => (<option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')} 时</option>))}
                                    </select>
                                    <select value={editMinute} onChange={e => { const m = e.target.value.padStart(2, '0'); setEditMinute(m); setEditForm(prev => ({ ...prev, birthTime: `${editHour}:${m}` })); }} className="w-full bg-stone-900/50 border border-stone-800 rounded-xl px-3 py-2.5 outline-none text-sm text-white focus:border-amber-500/50">
                                        {Array.from({ length: 60 }).map((_, i) => (<option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')} 分</option>))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-stone-500 ml-1 flex items-center gap-1"><Tag size={12} /> 标签</label>
                                <input value={editForm.tags} onChange={e => setEditForm({ ...editForm, tags: e.target.value })} className="w-full bg-stone-900/50 rounded-xl px-3.5 py-2.5 text-sm text-stone-300 outline-none border border-stone-800 focus:border-amber-500/50 transition-all" />
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {PRESET_TAGS.map(tag => (
                                        <button key={tag} onClick={(e) => addTag(e, tag)} className="flex items-center gap-1 px-3 py-1.5 bg-stone-800 hover:bg-amber-500 hover:text-[#1c1917] border border-stone-700 hover:border-amber-400 rounded-lg text-xs text-stone-400 font-medium transition-all active:scale-95"><Plus size={10} /> {tag}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2 sticky bottom-0 left-0 bg-[#1c1917]">
                            <button onClick={() => setEditingId(null)} disabled={savingEdit} className="flex-1 py-3.5 rounded-xl text-sm font-bold text-stone-400 bg-stone-800 hover:bg-stone-700">取消</button>
                            <button onClick={saveEdit} disabled={savingEdit || isBirthDateInvalid} className={`flex-1 py-3.5 rounded-xl text-sm font-bold text-[#1c1917] bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-900/20 ${savingEdit || isBirthDateInvalid ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                {savingEdit ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> 保存中...</span> : '保存修改'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 报告弹窗 */}
            {reportModalProfileId && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setReportModalProfileId(null); setReportToView(null); }}></div>
                    <div className="relative bg-[#1c1917] w-full max-w-md rounded-[2rem] shadow-2xl p-6 space-y-4 border border-stone-800">
                        <div className="flex justify-between items-center border-b border-stone-800 pb-3">
                            <h3 className="font-black text-stone-100 text-base">历史AI报告</h3>
                            <button onClick={() => { setReportModalProfileId(null); setReportToView(null); }} className="p-2 text-stone-500 hover:text-stone-300"><X size={18} /></button>
                        </div>
                        {!reportToView ? (
                            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                                {(archives.find(p => p.id === reportModalProfileId)?.aiReports || []).map((it) => (
                                    <button key={it.id} onClick={() => setReportToView(it)} className="w-full text-left p-3 rounded-xl border border-stone-800 bg-stone-900/40 hover:bg-stone-900/60 transition-colors">
                                        <div className="flex justify-between items-center"><b className="text-stone-100 text-sm">{new Date(it.date).toLocaleString()}</b><span className={`text-[10px] px-2 py-0.5 rounded-full ${it.type === 'bazi' ? 'bg-indigo-600 text-white' : 'bg-rose-600 text-white'}`}>{it.type}</span></div>
                                        <p className="text-[11px] text-stone-400 mt-1 line-clamp-2">{it.content}</p>
                                    </button>
                                ))}
                                {!(archives.find(p => p.id === reportModalProfileId)?.aiReports || []).length && (
                                    <div className="text-center py-10 text-stone-500 text-sm">暂无报告</div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700">{new Date(reportToView.date).toLocaleString()}</span>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => { navigator.clipboard.writeText(reportToView.content); alert('报告内容已复制'); }} className="text-[10px] text-amber-500 hover:text-amber-400 flex items-center gap-1"><ClipboardCopy size={12} /> 复制</button>
                                        <button onClick={() => setReportToView(null)} className="text-[10px] text-stone-400 hover:text-stone-200">返回列表</button>
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl border border-stone-800 bg-stone-900/40 text-stone-200 text-sm whitespace-pre-wrap max-h-[60vh] overflow-y-auto custom-scrollbar">{reportToView.content}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
