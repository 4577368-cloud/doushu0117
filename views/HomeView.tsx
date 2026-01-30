import React, { useState } from 'react';
import { Compass, History, Sun, MapPin, Map, Calendar, Clock, X } from 'lucide-react';
import { UserProfile, Gender } from '../types';
import { CHINA_LOCATIONS } from '../services/constants';

export const HomeView: React.FC<{ 
    onGenerate: (profile: UserProfile) => void; 
    archives: UserProfile[]; 
    onChromeHiddenChange?: (hidden: boolean) => void;
    guestUsage?: { count: number; limit: number };
}> = ({ onGenerate, archives, onChromeHiddenChange, guestUsage }) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [dateInput, setDateInput] = useState(''); 
  const [timeInput, setTimeInput] = useState('12:00'); 
  const [isSolarTime, setIsSolarTime] = useState(false);
  const [province, setProvince] = useState('北京市');
  const [city, setCity] = useState('北京');
  const [longitude, setLongitude] = useState<number | undefined>(116.40);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const parseDateInput = (val: string) => {
    if (!val) return { parsed: null as null, error: null as string | null };
    if (val.length !== 8) return { parsed: null as null, error: null as string | null };
    const year = val.substring(0, 4), month = val.substring(4, 6), day = val.substring(6, 8);
    const y = parseInt(year, 10), m = parseInt(month, 10), d = parseInt(day, 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
      return { parsed: null, error: '请输入正确的数字日期' };
    }
    if (y < 1900 || y > 2100) {
      return { parsed: null, error: '年份需在 1900-2100 之间' };
    }
    if (m < 1 || m > 12) {
      return { parsed: null, error: '月份需在 1-12 之间' };
    }
    const maxDay = new Date(y, m, 0).getDate();
    if (d < 1 || d > maxDay) {
      return { parsed: null, error: `该月日期需在 1-${maxDay} 之间` };
    }
    return { parsed: { formattedDate: `${year}-${month}-${day}`, display: `${year}年${month}月${day}日` }, error: null };
  };

  const { parsed, error: dateError } = parseDateInput(dateInput);
   
  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => { 
    const provName = e.target.value; setProvince(provName); 
    const provData = CHINA_LOCATIONS.find(p => p.name === provName);
    if (provData && provData.cities.length > 0) { 
        setCity(provData.cities[0].name); 
        setLongitude(provData.cities[0].longitude); 
    }
  };
   
  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => { 
    const cityName = e.target.value; setCity(cityName); 
    const cityData = CHINA_LOCATIONS.find(p => p.name === province)?.cities.find(c => c.name === cityName); 
    if (cityData) setLongitude(cityData.longitude); 
  };
   
  const citiesForProvince = CHINA_LOCATIONS.find(p => p.name === province)?.cities || [];

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

  const pickDefaultEmoji = (g: Gender) => {
    const male = ['🧑','👨','🧑🏻','🧑🏽','🧑🏿'];
    const female = ['👩','👩🏻','👩🏽','👩🏿'];
    const pool = g === 'female' ? female : male;
    return pool[Math.floor(Math.random()*pool.length)];
  };

  const isLimitReached = guestUsage && guestUsage.count >= guestUsage.limit;

  return (
    <div className="flex flex-col h-full bg-[#fafaf9] overflow-y-auto no-scrollbar">
       <div className="min-h-full flex flex-col justify-center p-6 pb-10 max-w-md mx-auto w-full">
           <div className="text-center mb-8 mt-2">
             <div className="w-16 h-16 mx-auto mb-4 p-0.5 border border-stone-200 rounded-2xl shadow-lg bg-white flex items-center justify-center overflow-hidden">
                 <img src="https://imgus.tangbuy.com/static/images/2026-01-10/631ac4d3602b4f508bb0cad516683714-176803435086117897846087613804795.png" className="w-full h-full object-cover" alt="Logo" />
             </div>
             <h2 className="text-2xl font-serif font-black text-stone-950 tracking-wider">玄枢命理</h2>
             <p className="text-[10px] text-stone-400 mt-1 tracking-[0.25em] uppercase font-sans font-bold">Ancient Wisdom · AI Insights</p>
           </div>
           
           <form onSubmit={async e => { e.preventDefault(); if (!parsed) return; const emoji = pickDefaultEmoji(gender); const avatar = await makeEmojiAvatar(emoji); onGenerate({ id: Date.now().toString(), name: name || '访客', gender, birthDate: parsed.formattedDate, birthTime: timeInput, isSolarTime, province, city, longitude, createdAt: Date.now(), avatar }); }} className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">姓名</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none font-serif focus:border-stone-400 text-sm shadow-sm transition-all" placeholder="请输入姓名"/>
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
                     <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">生日 (YYYYMMDD)</label>
                     <div className="relative">
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
                         <Calendar size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-300" />
                     </div>
                     {dateError && (
                       <p className="mt-1 text-[11px] text-red-500">{dateError}</p>
                     )}
                 </div>
                 <div className="col-span-2 space-y-1.5">
                     <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">时辰</label>
                     <div className="space-y-2">
                       <input type="time" value={timeInput} onFocus={() => onChromeHiddenChange?.(true)} onBlur={() => onChromeHiddenChange?.(false)} onChange={e => setTimeInput(e.target.value)} className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none font-sans text-base focus:border-stone-400 shadow-sm" />
                     </div>
                 </div>
              </div>

              <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${isSolarTime ? 'bg-white border-stone-300 shadow-md' : 'bg-stone-50/50 border-stone-100'}`}>
                <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setIsSolarTime(!isSolarTime)}>
                  <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl transition-colors ${isSolarTime ? 'bg-amber-100 text-amber-600' : 'bg-amber-50 text-amber-500 border border-stone-200'}`}><Sun size={18} /></div>
                      <div className="flex flex-col"><span className={`text-[13px] font-bold ${isSolarTime ? 'text-stone-900' : 'text-stone-400'}`}>真太阳时校准</span><span className="text-[9px] text-stone-400 font-bold tracking-tight">根据出生地经度修正出生时间</span></div>
                  </div>
                  <div className={`w-10 h-5 rounded-full p-0.5 transition-colors relative ${isSolarTime ? 'bg-amber-500' : 'bg-stone-200'}`}><div className={`w-4 h-4 bg-white rounded-full transition-all shadow-sm ${isSolarTime ? 'translate-x-5' : 'translate-x-0'}`}></div></div>
                </div>
                {isSolarTime && (<div className="px-4 pb-5 pt-1 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300"><div className="space-y-1.5"><label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-1">省份</label><div className="relative"><select value={province} onChange={handleProvinceChange} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 outline-none font-sans text-sm focus:border-amber-400 appearance-none">{CHINA_LOCATIONS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}</select><MapPin size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" /></div></div><div className="space-y-1.5"><label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-1">城市</label><div className="relative"><select value={city} onChange={handleCityChange} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 outline-none font-sans text-sm focus:border-amber-400 appearance-none">{citiesForProvince.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}</select><Map size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" /></div></div></div>)}
              </div>
              <div className="space-y-3 pt-4">
                <button
                  type="submit"
                  disabled={!parsed}
                  className={`w-full h-14 bg-stone-950 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 group transition-all ${
                    (!parsed) ? 'opacity-40 cursor-not-allowed' : 'hover:bg-stone-800 active:scale-[0.98]'
                  }`}
                >
                  <Compass size={20} className={`transition-transform duration-700 ${(!parsed) ? '' : 'group-hover:rotate-180 text-amber-400'}`} />
                  <span className="text-base tracking-widest font-serif">{isLimitReached ? '今日额度不足 请明日再来' : '开启命运推演'}</span>
                </button>
                <button type="button" onClick={() => setShowHistoryModal(true)} className="w-full h-14 bg-white border-2 border-stone-200 text-stone-700 font-black rounded-2xl flex items-center justify-center gap-2 text-sm hover:border-stone-400 transition-all shadow-sm"><History size={18} className="text-indigo-600" /><span>历史命盘</span></button>
              </div>
           </form>
       </div>
       {showHistoryModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" onClick={() => setShowHistoryModal(false)} />
              <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl flex flex-col max-h-[75vh] animate-slide-up">
                  <div className="p-6 border-b border-stone-100 flex justify-between items-center"><h3 className="font-black text-stone-900 text-base flex items-center gap-2"><History size={20}/> 快速调取命盘</h3><X onClick={() => setShowHistoryModal(false)} size={22} className="text-stone-400 cursor-pointer"/></div>
                  <div className="overflow-y-auto p-3 space-y-2">
                    {archives.length > 0 ? archives.map(p => (<div key={p.id} onClick={() => {onGenerate(p); setShowHistoryModal(false);}} className="p-4 bg-stone-50 hover:bg-indigo-50 rounded-2xl cursor-pointer border border-stone-100 transition-all"><div className="flex justify-between items-center"><b className="text-stone-900 text-base">{p.name}</b><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.gender==='male'?'bg-indigo-100 text-indigo-700':'bg-rose-100 text-rose-700'}`}>{p.gender==='male'?'男':'女'}</span></div><p className="text-xs text-stone-500 mt-1 font-sans">{p.birthDate} {p.birthTime}</p></div>)) : <div className="text-center py-16 text-stone-300 text-sm italic font-serif">暂无历史缓存</div>}
                  </div>
              </div>
          </div>
       )}
    </div>
  );
};
