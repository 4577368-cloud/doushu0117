import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Compass, History, Sun, MapPin, Calendar, Clock, X, Search, ChevronDown, Sparkles, ScrollText, MoonStar, Grid3x3 } from 'lucide-react';
import { UserProfile, Gender } from '../types';
import { CHINA_LOCATIONS } from '../services/constants';
import type { AnalysisType } from '../App';

interface BaziInputViewProps {
    onGenerate: (profile: UserProfile) => void;
    archives: UserProfile[];
    guestUsage?: { count: number; limit: number };
    onOpenArchive?: () => void;
    targetAnalysis?: AnalysisType | null;
}

const FORM_CACHE_KEY = 'bazi_input_cache_v1';

// 平铺所有城市，便于搜索
const ALL_CITIES = CHINA_LOCATIONS.flatMap(prov =>
    prov.cities.map(city => ({
        province: prov.name,
        name: city.name,
        longitude: city.longitude
    }))
);

const formatDateForInput = (dateStr: string): string => {
    if (!dateStr) return '';
    const normalized = dateStr.replace(/\//g, '-');
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
    return '';
};

const TARGET_META: Record<AnalysisType, { label: string; icon: React.ElementType; color: string; desc: string }> = {
    bazi: { label: '八字精批', icon: ScrollText, color: 'text-amber-600', desc: '输入后将生成八字命盘' },
    ziwei: { label: '紫微斗数', icon: MoonStar, color: 'text-violet-600', desc: '输入后将生成紫微斗数命盘' },
    qimen: { label: '奇门遁甲', icon: Grid3x3, color: 'text-emerald-600', desc: '输入后将生成奇门遁甲排盘' },
};

export const BaziInputView: React.FC<BaziInputViewProps> = ({
    onGenerate,
    archives,
    guestUsage,
    onOpenArchive,
    targetAnalysis
}) => {
    const [name, setName] = useState('');
    const [gender, setGender] = useState<Gender>('male');
    const [dateInput, setDateInput] = useState('');
    const [timeInput, setTimeInput] = useState('12:00');
    const [isSolarTime, setIsSolarTime] = useState(false);
    const [city, setCity] = useState('北京');
    const [longitude, setLongitude] = useState<number | undefined>(116.40);
    const [province, setProvince] = useState('北京市');
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [dateMode, setDateMode] = useState<'picker' | 'digits'>('picker');
    const [cityQuery, setCityQuery] = useState('');
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const cityDropdownRef = useRef<HTMLDivElement>(null);

    // 加载缓存
    useEffect(() => {
        try {
            const cached = localStorage.getItem(FORM_CACHE_KEY);
            if (cached) {
                const data = JSON.parse(cached);
                if (data.name) setName(data.name);
                if (data.gender) setGender(data.gender);
                if (data.dateInput) setDateInput(data.dateInput);
                if (data.timeInput) setTimeInput(data.timeInput);
                if (typeof data.isSolarTime === 'boolean') setIsSolarTime(data.isSolarTime);
                if (data.city) {
                    setCity(data.city);
                    const found = ALL_CITIES.find(c => c.name === data.city);
                    if (found) {
                        setLongitude(found.longitude);
                        setProvince(found.province);
                    }
                }
            }
        } catch {}
    }, []);

    // 缓存表单
    useEffect(() => {
        try {
            localStorage.setItem(FORM_CACHE_KEY, JSON.stringify({
                name, gender, dateInput, timeInput, isSolarTime, city
            }));
        } catch {}
    }, [name, gender, dateInput, timeInput, isSolarTime, city]);

    // 点击外部关闭城市下拉
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) {
                setShowCityDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const parseDateInput = (val: string): { parsed: string | null; error: string | null } => {
        if (!val) return { parsed: null, error: null };
        const digits = val.replace(/\D/g, '');
        if (digits.length !== 8) return { parsed: null, error: null };
        const year = digits.substring(0, 4), month = digits.substring(4, 6), day = digits.substring(6, 8);
        const y = parseInt(year, 10), m = parseInt(month, 10), d = parseInt(day, 10);
        if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
            return { parsed: null, error: '请输入正确的数字日期' };
        }
        if (y < 1900 || y > 2100) return { parsed: null, error: '年份需在 1900-2100 之间' };
        if (m < 1 || m > 12) return { parsed: null, error: '月份需在 1-12 之间' };
        const maxDay = new Date(y, m, 0).getDate();
        if (d < 1 || d > maxDay) return { parsed: null, error: `该月日期需在 1-${maxDay} 之间` };
        return { parsed: `${year}-${month}-${day}`, error: null };
    };

    const { parsed: digitsParsed, error: digitsError } = useMemo(() =>
        dateMode === 'digits' ? parseDateInput(dateInput) : { parsed: dateInput, error: null },
        [dateInput, dateMode]
    );

    const isDateValid = dateMode === 'picker'
        ? /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
        : !!digitsParsed;

    const dateError = dateMode === 'digits' ? digitsError : null;

    const filteredCities = useMemo(() => {
        const q = cityQuery.trim();
        if (!q) return ALL_CITIES.slice(0, 8);
        return ALL_CITIES.filter(c =>
            c.name.includes(q) || c.province.includes(q)
        ).slice(0, 20);
    }, [cityQuery]);

    const selectCity = (provinceName: string, cityName: string, lng: number) => {
        setProvince(provinceName);
        setCity(cityName);
        setLongitude(lng);
        setCityQuery('');
        setShowCityDropdown(false);
    };

    const makeEmojiAvatar = async (emoji: string, size = 96) => {
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';
        ctx.clearRect(0, 0, size, size);
        ctx.font = `${Math.floor(size * 0.7)}px system-ui, Apple Color Emoji, Segoe UI Emoji`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(emoji, size / 2, size / 2);
        return canvas.toDataURL('image/png');
    };

    const pickDefaultEmoji = (g: Gender) => {
        const male = ['🧑', '👨', '🧑🏻', '🧑🏽', '🧑🏿'];
        const female = ['👩', '👩🏻', '👩🏽', '👩🏿'];
        const pool = g === 'female' ? female : male;
        return pool[Math.floor(Math.random() * pool.length)];
    };

    const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDateInput(e.target.value);
    };

    const isLimitReached = guestUsage && guestUsage.count >= guestUsage.limit;

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const finalDate = dateMode === 'digits' ? digitsParsed : dateInput;
        if (!finalDate) return;
        const emoji = pickDefaultEmoji(gender);
        const avatar = await makeEmojiAvatar(emoji);
        onGenerate({
            id: Date.now().toString(),
            name: name || '访客',
            gender,
            birthDate: finalDate,
            birthTime: timeInput,
            isSolarTime,
            province,
            city,
            longitude,
            createdAt: Date.now(),
            avatar
        });
    };

    const recentArchives = archives.slice(0, 5);
    const targetMeta = targetAnalysis ? TARGET_META[targetAnalysis] : null;

    return (
        <div className="flex flex-col h-full bg-[#fafaf9] overflow-y-auto no-scrollbar">
            <div className="min-h-full flex flex-col justify-center p-6 pb-10 max-w-md mx-auto w-full">
                <div className="text-center mb-6 mt-2">
                    <div className="w-14 h-14 mx-auto mb-3 p-0.5 border border-stone-200 rounded-2xl shadow-lg bg-white flex items-center justify-center overflow-hidden">
                        {targetMeta ? <targetMeta.icon className={`w-7 h-7 ${targetMeta.color}`} /> : <ScrollText className="w-7 h-7 text-stone-800" />}
                    </div>
                    <h2 className="text-2xl font-serif font-black text-stone-950 tracking-wider">{targetMeta?.label || '八字排盘'}</h2>
                    <p className="text-[11px] text-stone-400 mt-1 tracking-wide font-sans font-medium">{targetMeta?.desc || '输入生辰，推演命盘格局'}</p>
                </div>

                {/* 快捷历史 */}
                {recentArchives.length > 0 && (
                    <div className="mb-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">最近命盘</span>
                            <button onClick={onOpenArchive} className="text-[10px] font-bold text-indigo-600 flex items-center gap-0.5">全部 <ChevronDown size={12} className="-rotate-90" /></button>
                        </div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            {recentArchives.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => onGenerate(p)}
                                    className="shrink-0 flex items-center gap-2 px-3 py-2 bg-white border border-stone-200 rounded-xl shadow-sm hover:border-indigo-300 transition-all"
                                >
                                    <span className="text-base">{p.avatar ? <img src={p.avatar} alt="" className="w-5 h-5 rounded-full" /> : (p.gender === 'female' ? '👩' : '🧑')}</span>
                                    <span className="text-xs font-bold text-stone-700 whitespace-nowrap">{p.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-1.5">
                            <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">姓名</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none font-serif focus:border-stone-400 text-sm shadow-sm transition-all"
                                placeholder="请输入姓名"
                            />
                        </div>
                        <div className="w-28 space-y-1.5">
                            <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">性别</label>
                            <div className="flex bg-white border border-stone-200 p-1 rounded-xl shadow-sm h-[46px]">
                                <button type="button" onClick={() => setGender('male')} className={`flex-1 rounded-lg text-[11px] font-black transition-all ${gender === 'male' ? 'bg-indigo-600 text-white shadow-md' : 'text-stone-400'}`}>男</button>
                                <button type="button" onClick={() => setGender('female')} className={`flex-1 rounded-lg text-[11px] font-black transition-all ${gender === 'female' ? 'bg-rose-600 text-white shadow-md' : 'text-stone-400'}`}>女</button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-5 gap-4">
                        <div className="col-span-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">生日</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (dateMode === 'picker') {
                                            setDateMode('digits');
                                            setDateInput(dateInput.replace(/\D/g, ''));
                                        } else {
                                            setDateMode('picker');
                                            const parsed = parseDateInput(dateInput);
                                            setDateInput(parsed.parsed || '');
                                        }
                                    }}
                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700"
                                >
                                    {dateMode === 'picker' ? '切换数字输入' : '切换日历'}
                                </button>
                            </div>
                            <div className="relative">
                                {dateMode === 'picker' ? (
                                    <input
                                        type="date"
                                        value={formatDateForInput(dateInput)}
                                        onChange={handleDatePickerChange}
                                        className="w-full bg-white rounded-xl px-4 py-3 outline-none font-sans text-sm shadow-sm border border-stone-200 focus:border-stone-400 transition-all"
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={8}
                                        value={dateInput}
                                        onChange={e => setDateInput(e.target.value.replace(/\D/g, ''))}
                                        className={`w-full bg-white rounded-xl px-4 py-3 outline-none font-sans text-base tracking-widest shadow-sm border transition-all ${
                                            dateError ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-stone-200 focus:border-stone-400'
                                        }`}
                                        placeholder="19900101"
                                    />
                                )}
                                <Calendar size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-300 pointer-events-none" />
                            </div>
                            {dateError && <p className="text-[11px] text-red-500">{dateError}</p>}
                        </div>
                        <div className="col-span-2 space-y-1.5">
                            <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">时辰</label>
                            <input
                                type="time"
                                value={timeInput}
                                onChange={e => setTimeInput(e.target.value)}
                                className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none font-sans text-base focus:border-stone-400 shadow-sm"
                            />
                        </div>
                    </div>

                    <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${isSolarTime ? 'bg-white border-stone-300 shadow-md' : 'bg-stone-50/50 border-stone-100'}`}>
                        <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setIsSolarTime(!isSolarTime)}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl transition-colors ${isSolarTime ? 'bg-amber-100 text-amber-600' : 'bg-amber-50 text-amber-500 border border-stone-200'}`}><Sun size={18} /></div>
                                <div className="flex flex-col">
                                    <span className={`text-[13px] font-bold ${isSolarTime ? 'text-stone-900' : 'text-stone-500'}`}>真太阳时校准</span>
                                    <span className="text-[9px] text-stone-400 font-bold tracking-tight">根据出生地经度修正出生时间</span>
                                </div>
                            </div>
                            <div className={`w-10 h-5 rounded-full p-0.5 transition-colors relative ${isSolarTime ? 'bg-amber-500' : 'bg-stone-200'}`}><div className={`w-4 h-4 bg-white rounded-full transition-all shadow-sm ${isSolarTime ? 'translate-x-5' : 'translate-x-0'}`} /></div>
                        </div>
                        {isSolarTime && (
                            <div className="px-4 pb-5 pt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="bg-amber-50/50 rounded-xl p-3 mb-3 border border-amber-100">
                                    <p className="text-[11px] text-stone-600 leading-relaxed">真太阳时会根据您出生地的经度，将北京时间换算为当地真实太阳时。如果您不确定，可保持关闭。</p>
                                </div>
                                <div className="space-y-1.5 relative" ref={cityDropdownRef}>
                                    <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-1 flex items-center gap-1"><MapPin size={10} /> 出生地</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={showCityDropdown ? cityQuery : `${province} · ${city}`}
                                            onChange={e => { setCityQuery(e.target.value); setShowCityDropdown(true); }}
                                            onFocus={() => { setCityQuery(''); setShowCityDropdown(true); }}
                                            placeholder="搜索城市"
                                            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 outline-none font-sans text-sm focus:border-amber-400 transition-all"
                                        />
                                        <Search size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                                    </div>
                                    {showCityDropdown && (
                                        <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-stone-200 rounded-xl shadow-xl">
                                            {filteredCities.length > 0 ? filteredCities.map(c => (
                                                <button
                                                    key={`${c.province}-${c.name}`}
                                                    type="button"
                                                    onClick={() => selectCity(c.province, c.name, c.longitude)}
                                                    className="w-full text-left px-3 py-2.5 hover:bg-amber-50 transition-colors border-b border-stone-50 last:border-0"
                                                >
                                                    <div className="text-xs font-bold text-stone-700">{c.name}</div>
                                                    <div className="text-[10px] text-stone-400">{c.province} · 经度 {c.longitude}°</div>
                                                </button>
                                            )) : (
                                                <div className="px-3 py-3 text-xs text-stone-400 text-center">未找到城市</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3 pt-4">
                        <button
                            type="submit"
                            disabled={!isDateValid}
                            className={`w-full h-14 bg-stone-950 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 group transition-all ${
                                !isDateValid ? 'opacity-40 cursor-not-allowed' : 'hover:bg-stone-800 active:scale-[0.98]'
                            }`}
                        >
                            <Compass size={20} className={`transition-transform duration-700 ${!isDateValid ? '' : 'group-hover:rotate-180 text-amber-400'}`} />
                            <span className="text-base tracking-widest font-serif">{isLimitReached ? '今日额度不足，升级解锁' : '开启命运推演'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowHistoryModal(true)}
                            className="w-full h-14 bg-white border-2 border-stone-200 text-stone-700 font-black rounded-2xl flex items-center justify-center gap-2 text-sm hover:border-stone-400 transition-all shadow-sm"
                        >
                            <History size={18} className="text-indigo-600" />
                            <span>历史命盘</span>
                        </button>
                    </div>
                </form>
            </div>

            {showHistoryModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" onClick={() => setShowHistoryModal(false)} />
                    <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl flex flex-col max-h-[75vh] animate-slide-up">
                        <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                            <h3 className="font-black text-stone-900 text-base flex items-center gap-2"><History size={20} /> 快速调取命盘</h3>
                            <X onClick={() => setShowHistoryModal(false)} size={22} className="text-stone-400 cursor-pointer" />
                        </div>
                        <div className="overflow-y-auto p-3 space-y-2">
                            {archives.length > 0 ? archives.map(p => (
                                <div key={p.id} onClick={() => { onGenerate(p); setShowHistoryModal(false); }} className="p-4 bg-stone-50 hover:bg-indigo-50 rounded-2xl cursor-pointer border border-stone-100 transition-all">
                                    <div className="flex justify-between items-center">
                                        <b className="text-stone-900 text-base">{p.name}</b>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.gender === 'male' ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'}`}>{p.gender === 'male' ? '男' : '女'}</span>
                                    </div>
                                    <p className="text-xs text-stone-500 mt-1 font-sans">{p.birthDate} {p.birthTime}</p>
                                </div>
                            )) : <div className="text-center py-16 text-stone-300 text-sm italic font-serif">暂无历史缓存</div>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
