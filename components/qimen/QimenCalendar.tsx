import React, { useState, useMemo, useEffect } from 'react';
import { Solar, Lunar } from 'lunar-javascript';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Clock } from 'lucide-react';
import { calculateJu } from '../../services/qimenService';

interface QimenCalendarProps {
  onSelectDate: (date: Date) => void;
}

export const QimenCalendar: React.FC<QimenCalendarProps> = ({ onSelectDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<any | null>(null); // For modal
  const [selectedTime, setSelectedTime] = useState<string>('00:00'); // HH:mm

  // Initialize time when modal opens
  useEffect(() => {
    if (selectedDay) {
      const now = new Date();
      // If selected day is today, use current time. Otherwise use current time as default (user preference) or 12:00?
      // User said "Default 00:00 is not right". Using current time is a safe bet.
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setSelectedTime(`${hours}:${minutes}`);
    }
  }, [selectedDay]);

  // Recalculate Modal Data based on Time
  const modalData = useMemo(() => {
    if (!selectedDay) return null;
    
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const date = new Date(selectedDay.date);
    date.setHours(hours || 0, minutes || 0);

    const ju = calculateJu(date);
    // Recalculate GanZhi just in case (Late Rat hour)
    const solar = Solar.fromDate(date);
    const lunar = solar.getLunar();
    const ganZhi = lunar.getEightChar().getDayGan() + lunar.getEightChar().getDayZhi();
    
    // Recalculate Yi/Ji based on the specific time? 
    // Lunar.getDayYi() is for the day. There is also getTimeYi() but usually Day Yi/Ji is what people want in calendar.
    // We stick to Day Yi/Ji from the selectedDay object (which is 00:00 based but usually fine for day activities).
    // Actually, late rat hour might change the day. Let's re-fetch lunar for safety if it changes day.
    
    return {
      ...selectedDay,
      date, // Updated date with time
      juName: `${ju.yinYang}${ju.juNumber}局`,
      jieQi: ju.jieQi,
      ganZhi, // Update GanZhi in case of late night
      lunarMonth: lunar.getMonthInChinese(),
      lunarDay: lunar.getDayInChinese(),
      yi: lunar.getDayYi(),
      ji: lunar.getDayJi(),
    };
  }, [selectedDay, selectedTime]);

  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth(); // 0-11
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the beginning of the week (Monday)
    // getDay(): 0(Sun), 1(Mon)...6(Sat)
    // We want Mon=0, Sun=6
    let startDayOfWeek = firstDay.getDay(); 
    if (startDayOfWeek === 0) startDayOfWeek = 7; // Sunday becomes 7 for calculation if we treat Mon as 1
    // Actually, usually calendars start on Sunday or Monday. Let's stick to standard Sunday start for simplicity or Monday?
    // Chinese calendars often start on Monday. Let's try Sunday start first as it's standard in JS.
    // If Sunday start: 0(Sun) - 6(Sat).
    
    const startDate = new Date(firstDay);
    startDate.setDate(1 - startDayOfWeek); // Adjust to previous Sunday

    const days = [];
    // 6 weeks * 7 days = 42 days to cover all possibilities
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      
      const solar = Solar.fromDate(d);
      const lunar = solar.getLunar();
      const ju = calculateJu(d);
      
      days.push({
        date: d,
        isCurrentMonth: d.getMonth() === month,
        isToday: new Date().toDateString() === d.toDateString(),
        day: d.getDate(),
        lunarDay: lunar.getDayInChinese(),
        lunarMonth: lunar.getMonthInChinese(),
        ganZhi: lunar.getEightChar().getDayGan() + lunar.getEightChar().getDayZhi(),
        juName: `${ju.yinYang}${ju.juNumber}局`,
        jieQi: ju.jieQi,
        yi: lunar.getDayYi(),
        ji: lunar.getDayJi()
      });
    }
    return days;
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-stone-50 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
            <CalendarIcon size={18} />
          </div>
          <span className="font-bold text-lg text-stone-800">
            {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
          </span>
        </div>
        <div className="flex gap-1">
          <button 
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-stone-500 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1.5 text-xs font-bold text-stone-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
          >
            回到今天
          </button>
          <button 
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-stone-500 transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Week Days */}
      <div className="grid grid-cols-7 border-b border-stone-100 bg-stone-50/50">
        {weekDays.map((day, i) => (
          <div key={i} className={`py-2 text-center text-xs font-bold ${i === 0 || i === 6 ? 'text-amber-600' : 'text-stone-500'}`}>
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7">
        {calendarData.map((day, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedDay(day)}
            className={`
              min-h-[80px] p-2 border-b border-r border-stone-50 text-left relative transition-all group
              ${day.isCurrentMonth ? 'bg-white' : 'bg-stone-50/30'}
              ${day.isToday ? 'bg-amber-50/30' : ''}
              hover:bg-amber-50
            `}
          >
            {/* Date Number */}
            <div className="flex justify-between items-start mb-1">
              <span className={`
                text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full
                ${day.isToday ? 'bg-amber-500 text-white shadow-sm' : (day.isCurrentMonth ? 'text-stone-700' : 'text-stone-300')}
              `}>
                {day.day}
              </span>
              {day.jieQi && (
                <span className="text-[9px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded-full border border-green-100">
                  {day.jieQi}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                 <span className={`text-[10px] ${day.isCurrentMonth ? 'text-stone-500' : 'text-stone-300'}`}>
                   {day.lunarMonth}{day.lunarDay}
                 </span>
                 <span className={`text-[10px] font-serif-zh ${day.isCurrentMonth ? 'text-stone-600' : 'text-stone-300'}`}>
                   {day.ganZhi}
                 </span>
              </div>
              
              <div className={`
                text-[10px] px-1.5 py-0.5 rounded border inline-block w-full text-center
                ${day.isCurrentMonth 
                  ? 'bg-stone-50 text-stone-600 border-stone-100 group-hover:bg-white group-hover:border-amber-200 group-hover:text-amber-700' 
                  : 'text-stone-300 border-transparent'}
              `}>
                {day.juName}
              </div>
              
              {day.isCurrentMonth && (
                <div className="flex flex-col gap-0.5 mt-1">
                  {day.yi.length > 0 && (
                     <div className="flex items-center gap-1 overflow-hidden">
                       <span className="text-[8px] text-green-600 font-bold shrink-0">宜</span>
                       <span className="text-[8px] text-stone-400 truncate">{day.yi.slice(0, 2).join(' ')}</span>
                     </div>
                  )}
                  {day.ji.length > 0 && (
                     <div className="flex items-center gap-1 overflow-hidden">
                       <span className="text-[8px] text-red-600 font-bold shrink-0">忌</span>
                       <span className="text-[8px] text-stone-400 truncate">{day.ji.slice(0, 2).join(' ')}</span>
                     </div>
                  )}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
      
      {/* Detail Modal */}
      {modalData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedDay(null)}>
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="relative bg-amber-500 p-4 text-white">
              <button onClick={() => setSelectedDay(null)} className="absolute right-4 top-4 p-1 rounded-full hover:bg-white/20 transition-colors">
                <X size={20} className="text-white" />
              </button>
              <div className="text-3xl font-black mb-1">{modalData.day}</div>
              <div className="text-sm font-bold opacity-90 flex items-center gap-2">
                <span>{modalData.date.getFullYear()}年{modalData.date.getMonth() + 1}月</span>
                <span className="w-1 h-1 bg-white rounded-full opacity-60"></span>
                <span>{modalData.lunarMonth}{modalData.lunarDay}</span>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-5">
              {/* Time Selector */}
              <div className="flex items-center gap-3 bg-stone-50 p-3 rounded-xl border border-stone-100">
                <div className="p-2 bg-white rounded-lg shadow-sm text-amber-500">
                  <Clock size={20} />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-stone-400 block mb-1">选择排盘时间</label>
                  <input 
                    type="time" 
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full bg-transparent font-bold text-stone-800 text-lg outline-none font-mono"
                  />
                </div>
              </div>

              {/* GanZhi & Ju */}
              <div className="flex items-center justify-between bg-stone-50 p-3 rounded-xl border border-stone-100">
                <div>
                  <div className="text-xs text-stone-400 mb-1">干支日柱</div>
                  <div className="text-lg font-serif-zh font-black text-stone-800">{modalData.ganZhi}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-stone-400 mb-1">奇门定局</div>
                  <div className="text-lg font-bold text-amber-600">{modalData.juName}</div>
                </div>
                {modalData.jieQi && (
                  <div className="text-right border-l border-stone-200 pl-3">
                     <div className="text-xs text-stone-400 mb-1">节气</div>
                     <div className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md">{modalData.jieQi}</div>
                  </div>
                )}
              </div>

              {/* Yi & Ji */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-green-50/50 rounded-xl p-3 border border-green-100/50 h-full">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-green-100">
                       <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-black text-xs">宜</div>
                       <span className="text-xs font-bold text-green-800">万事皆宜</span>
                    </div>
                    <div className="text-xs text-stone-600 leading-relaxed min-h-[60px]">
                      {modalData.yi && modalData.yi.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {modalData.yi.map((item: string, i: number) => (
                            <span key={i} className="bg-white border border-green-100 px-1.5 py-0.5 rounded text-green-700">{item}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-stone-400 italic">诸事不宜</span>
                      )}
                    </div>
                 </div>

                 <div className="bg-red-50/50 rounded-xl p-3 border border-red-100/50 h-full">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-red-100">
                       <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-xs">忌</div>
                       <span className="text-xs font-bold text-red-800">诸事不宜</span>
                    </div>
                    <div className="text-xs text-stone-600 leading-relaxed min-h-[60px]">
                      {modalData.ji && modalData.ji.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {modalData.ji.map((item: string, i: number) => (
                            <span key={i} className="bg-white border border-red-100 px-1.5 py-0.5 rounded text-red-700">{item}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-stone-400 italic">无</span>
                      )}
                    </div>
                 </div>
              </div>

              {/* Action Button */}
              <button 
                onClick={() => {
                  onSelectDate(modalData.date);
                  setSelectedDay(null);
                }}
                className="w-full bg-stone-900 text-amber-400 py-3 rounded-xl font-bold text-sm shadow-lg shadow-stone-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <CalendarIcon size={16} />
                进入当日排盘
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
