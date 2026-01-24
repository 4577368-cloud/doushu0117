import React, { useState, useMemo } from 'react';
import { Solar, Lunar } from 'lunar-javascript';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { calculateJu } from '../../services/qimenService';

interface QimenCalendarProps {
  onSelectDate: (date: Date) => void;
}

export const QimenCalendar: React.FC<QimenCalendarProps> = ({ onSelectDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

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
            onClick={() => onSelectDate(day.date)}
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
    </div>
  );
};
