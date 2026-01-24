
import React, { useState } from 'react';
import { findAuspiciousTimes, AuspiciousResult } from '../../services/auspiciousService';
import { QM_AffairKey } from '../../services/auspiciousService';
import { QM_AFFAIR_SYMBOLS } from '../../services/qimenAffairs';
import { Compass, Calendar, CheckCircle, AlertTriangle, ArrowRight, Sparkles, MapPin } from 'lucide-react';

// Common Affairs for Quick Selection
const COMMON_AFFAIRS: { key: QM_AffairKey; label: string; icon: string }[] = [
  { key: 'job_interview', label: '求职面试', icon: '💼' },
  { key: 'contract', label: '签约合作', icon: '📝' },
  { key: 'business', label: '开业启动', icon: '🚀' },
  { key: 'investment', label: '投资理财', icon: '💰' },
  { key: 'love_marriage', label: '约会表白', icon: '❤️' },
  { key: 'travel_trip', label: '出行远游', icon: '✈️' },
];

export const AuspiciousView: React.FC = () => {
  const [selectedAffair, setSelectedAffair] = useState<QM_AffairKey>('job_interview');
  const [timeRange, setTimeRange] = useState<'today' | 'three_days' | 'week'>('today');
  const [results, setResults] = useState<AuspiciousResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleCalculate = async () => {
    setLoading(true);
    setHasSearched(true);
    
    // Simulate slight delay for "Processing" feel
    setTimeout(() => {
      const res = findAuspiciousTimes(selectedAffair, timeRange);
      setResults(res);
      setLoading(false);
    }, 600);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-stone-500 bg-stone-50 border-stone-200';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">大吉 {score}</span>;
    if (score >= 60) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">中吉 {score}</span>;
    return <span className="px-2 py-0.5 rounded text-xs font-bold bg-stone-100 text-stone-600">平 {score}</span>;
  };

  return (
    <div className="flex flex-col h-full bg-stone-50 overflow-y-auto pb-32">
      {/* Header Area */}
      <div className="bg-white p-4 border-b border-stone-200 shadow-sm sticky top-0 z-10">
        <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
          <Compass className="w-5 h-5 text-indigo-600" />
          择吉择方
          <span className="text-xs font-normal text-stone-400 ml-auto">智能优选时空</span>
        </h2>
      </div>

      <div className="p-4 space-y-6">
        {/* Selection Area */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100 space-y-4">
          
          {/* 1. Affair Selection */}
          <div>
            <label className="text-xs font-bold text-stone-500 mb-2 block uppercase tracking-wider">我想去做</label>
            <div className="grid grid-cols-3 gap-2">
              {COMMON_AFFAIRS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setSelectedAffair(item.key)}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                    selectedAffair === item.key
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm ring-1 ring-indigo-500/20'
                      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <span className="text-xl mb-1">{item.icon}</span>
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Time Range Selection */}
          <div>
            <label className="text-xs font-bold text-stone-500 mb-2 block uppercase tracking-wider">时间范围</label>
            <div className="flex bg-stone-100 p-1 rounded-lg">
              {(['today', 'three_days', 'week'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                    timeRange === range
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  {range === 'today' && '今天 (24h)'}
                  {range === 'three_days' && '未来3天'}
                  {range === 'week' && '本周'}
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleCalculate}
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                正在推演全局...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                开始优选
              </>
            )}
          </button>
        </div>

        {/* Results Area */}
        {hasSearched && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-stone-700">推荐方案 (Top {results.length})</h3>
              <span className="text-xs text-stone-400">基于奇门遁甲全局演算</span>
            </div>

            {results.length === 0 && !loading ? (
              <div className="text-center py-10 bg-white rounded-xl border border-dashed border-stone-300">
                <p className="text-stone-400 text-sm">暂无符合高标准的推荐时间<br/>建议扩大时间范围或降低要求</p>
              </div>
            ) : (
              results.map((res, idx) => (
                <div key={idx} className="bg-white rounded-xl overflow-hidden shadow-sm border border-stone-200 transition-all hover:shadow-md">
                  {/* Card Header: Time & Score */}
                  <div className="flex items-stretch border-b border-stone-100">
                    <div className="flex-1 p-4 bg-gradient-to-br from-white to-stone-50">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        <span className="text-xs font-medium text-stone-500">{res.time.label.split(' ')[0]}</span>
                        <span className="text-xs text-stone-300">|</span>
                        <span className="text-xs text-stone-400">{res.time.solarTerm}</span>
                      </div>
                      <div className="text-lg font-bold text-stone-800 tracking-tight">
                        {res.time.label.split(' ').slice(1).join(' ')}
                      </div>
                    </div>
                    
                    <div className="w-24 flex flex-col items-center justify-center border-l border-stone-100 bg-stone-50/50">
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-stone-400 mb-1">面向</span>
                        <div className="flex items-center gap-1 text-indigo-700 font-bold text-lg">
                          <MapPin className="w-4 h-4" />
                          {res.direction.name}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Body: Advice */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex gap-2">
                        {getScoreBadge(res.score)}
                        <span className={`text-xs px-2 py-0.5 rounded border ${res.details.tone === 'positive' ? 'border-red-100 text-red-600' : 'border-stone-200 text-stone-500'}`}>
                          {res.details.patternName}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-stone-600 leading-relaxed mb-3">
                      {res.details.advice}
                    </p>

                    {/* Warnings/Tags */}
                    {(res.details.warnings.length > 0 || res.details.tags.length > 0) && (
                      <div className="flex flex-wrap gap-2 pt-3 border-t border-stone-100">
                        {res.details.warnings.map(w => (
                          <div key={w} className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                            <AlertTriangle className="w-3 h-3" />
                            {w}
                          </div>
                        ))}
                        {res.details.tags.slice(0, 2).map(t => (
                          <span key={t} className="text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
