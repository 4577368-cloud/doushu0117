import React, { useState, useMemo, useEffect, useRef } from 'react';
import { QM_Ju, QM_Palace } from '../../types';
import { QM_NAMES_MAP, QM_GUA_ANGLES, QM_ELEMENT_COLORS } from '../../services/qimenConstants';
import { QM_INDUSTRIES, QM_IndustryKey } from '../../services/qimenAffairs';
import { analyzeQimenState } from '../../services/qimenAnalysis';
import { generateUserAdvice } from '../../services/qimenAdvice';
import { analyzePalacePatterns } from '../../services/qimenPatterns';
import { Compass, RotateCw, Info, Calendar, Briefcase } from 'lucide-react';

interface QimenCompassProps {
  ju: QM_Ju;
  onSelectPalace?: (index: number) => void;
  highlightedIndices?: number[];
  className?: string;
  onTimeChange?: (date: Date) => void;
  industry?: QM_IndustryKey;
  onIndustryChange?: (industry: QM_IndustryKey) => void;
}

// Visual Constants
const LAYERS = {
  CENTER: { r: 0, width: 40 }, // Center circle radius
  STAR: { r: 50, width: 25 },
  DOOR: { r: 80, width: 25 },
  GOD: { r: 110, width: 25 },
  BAGUA: { r: 140, width: 25 },
  DEGREE: { r: 165, width: 15 },
};

// Auspiciousness Helpers
const AUSPICIOUS_STARS = ['TianXin', 'TianRen', 'TianFu', 'TianQin', 'TianChong'];
const INAUSPICIOUS_STARS = ['TianPeng', 'TianRui', 'TianZhu', 'TianYing'];

const AUSPICIOUS_DOORS = ['KaiMen', 'XiuMen', 'ShengMen'];
const NEUTRAL_DOORS = ['DuMen', 'JingMen_Li', 'JingMen']; // JingMen (View) is often neutral/good for documents
const INAUSPICIOUS_DOORS = ['SiMen', 'JingMen_Jing', 'JingMen2', 'ShangMen'];

const AUSPICIOUS_GODS = ['ZhiFu', 'TaiYin', 'LiuHe', 'JiuDi', 'JiuTian'];
const INAUSPICIOUS_GODS = ['BaiHu', 'XuanWu', 'TengShe'];

const GUA_MAP: Record<number, string> = {
  1: '坎', 8: '艮', 3: '震', 4: '巽',
  9: '离', 2: '坤', 7: '兑', 6: '乾'
};

const DIRECTION_MAP: Record<number, string> = {
  1: '正北', 8: '东北', 3: '正东', 4: '东南',
  9: '正南', 2: '西南', 7: '正西', 6: '西北'
};

export const QimenCompass: React.FC<QimenCompassProps> = ({ 
  ju, 
  onSelectPalace, 
  highlightedIndices = [],
  className = '',
  onTimeChange,
  industry,
  onIndustryChange
}) => {
  // Safety check for null ju
  if (!ju) return null;

  const [rotation, setRotation] = useState(0);
  const [showLegend, setShowLegend] = useState(false);
  const [showIndustryMenu, setShowIndustryMenu] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [hoveredPalaceIndex, setHoveredPalaceIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startAngle, setStartAngle] = useState(0);
  const [startRotation, setStartRotation] = useState(0);
  const compassRef = useRef<HTMLDivElement>(null);

  const [isAbsolute, setIsAbsolute] = useState(true);

  const handleOrientation = React.useCallback((e: DeviceOrientationEvent) => {
    if (e.alpha !== null) {
      let heading = e.alpha;
      
      // iOS specific property for True North
      if ((e as any).webkitCompassHeading) {
        heading = (e as any).webkitCompassHeading;
        setRotation(-heading);
        setIsAbsolute(true);
      } else {
        // Android/Standard
        if ('absolute' in e) {
           setIsAbsolute((e as any).absolute);
        }
        // alpha is CCW degrees from North (0=N, 90=W, 180=S, 270=E)
        // We apply it as CW rotation to the compass container
        // If alpha=90 (West), container rotates 90deg CW -> Top moves to Right -> Correct
        setRotation(heading);
      }
    }
  }, []);

  // Handle Compass Toggle
  const toggleCompass = async () => {
    if (isAutoMode) {
      setIsAutoMode(false);
      window.removeEventListener('deviceorientation', handleOrientation);
      if ('ondeviceorientationabsolute' in window) {
        window.removeEventListener('deviceorientationabsolute' as any, handleOrientation);
      }
      return;
    }

    // Request Permission (iOS 13+)
    if ((DeviceOrientationEvent as any).requestPermission) {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          setIsAutoMode(true);
          window.addEventListener('deviceorientation', handleOrientation, true);
        } else {
          alert('需要罗盘权限才能自动旋转');
        }
      } catch (e) {
        console.error(e);
        // Fallback for non-iOS or if permission api fails but event works
        setIsAutoMode(true);
        window.addEventListener('deviceorientation', handleOrientation, true);
      }
    } else {
      // Android / Old iOS
      setIsAutoMode(true);
      // Prefer absolute orientation on Android for accurate Compass
      if ('ondeviceorientationabsolute' in window) {
        window.addEventListener('deviceorientationabsolute' as any, handleOrientation, true);
      } else {
        window.addEventListener('deviceorientation', handleOrientation, true);
      }
    }
  };

  // Drag Rotation Logic
  const getAngle = (clientX: number, clientY: number) => {
    if (!compassRef.current) return 0;
    const rect = compassRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isAutoMode) return; // Disable manual drag in auto mode
    setIsDragging(true);
    setStartAngle(getAngle(e.clientX, e.clientY));
    setStartRotation(rotation);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const currentAngle = getAngle(e.clientX, e.clientY);
    const delta = currentAngle - startAngle;
    setRotation(startRotation + delta);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      if ('ondeviceorientationabsolute' in window) {
        window.removeEventListener('deviceorientationabsolute' as any, handleOrientation);
      }
    };
  }, [handleOrientation]);

  // Center Palace (5)
  const centerPalace = ju.palaces.find(p => p.index === 5);

  // Ordered directional palaces (Clockwise starting from North? No, standard Qimen order or specific angle order)
  // We render segments based on angles.
  const directionalPalaces = useMemo(() => {
    return [1, 8, 3, 4, 9, 2, 7, 6].map(idx => {
      return ju.palaces.find(p => p.index === idx)!;
    });
  }, [ju]);

  const getSegmentPath = (index: number, innerR: number, width: number) => {
    const angleStart = (index * 45) - 22.5 - 90; // -90 to start from top (if 0 is top? No SVG 0 is right)
    // SVG: 0 is Right (East). North is -90.
    // We want North (1) at Top.
    // QM_GUA_ANGLES: 1:0, 8:45...
    // If 0 is North, then in SVG coords (where 0 is East), North is -90.
    // So SVG Angle = QimenAngle - 90.
    
    // However, we are iterating 8 segments.
    // Let's assume segment 0 is North (Index 1).
    // Segment 1 is NE (Index 8).
    
    // For a segment i (0-7):
    // Start Angle = i * 45 - 22.5 (Centered on i*45)
    // Convert to Radians.
    
    const startDeg = (index * 45) - 22.5 - 90;
    const endDeg = (index * 45) + 22.5 - 90;
    
    const outerR = innerR + width;
    
    const startRad = (startDeg * Math.PI) / 180;
    const endRad = (endDeg * Math.PI) / 180;
    
    const x1 = Math.cos(startRad) * innerR;
    const y1 = Math.sin(startRad) * innerR;
    const x2 = Math.cos(endRad) * innerR;
    const y2 = Math.sin(endRad) * innerR;
    
    const x3 = Math.cos(endRad) * outerR;
    const y3 = Math.sin(endRad) * outerR;
    const x4 = Math.cos(startRad) * outerR;
    const y4 = Math.sin(startRad) * outerR;
    
    return `M ${x1} ${y1} A ${innerR} ${innerR} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${outerR} ${outerR} 0 0 1 ${x4} ${y4} Z`;
  };

  const getSegmentColor = (type: 'star' | 'door' | 'god', value: string, isHighlighted: boolean) => {
    if (isHighlighted) return '#FCD34D'; // Amber-300 highlight
    
    if (type === 'star') {
      if (AUSPICIOUS_STARS.includes(value)) return '#ECFDF5'; // Green-50
      if (INAUSPICIOUS_STARS.includes(value)) return '#FEF2F2'; // Red-50
      return '#F9FAFB'; // Gray-50
    }
    if (type === 'door') {
      if (AUSPICIOUS_DOORS.includes(value)) return '#FFFBEB'; // Yellow-50 (Gold)
      if (INAUSPICIOUS_DOORS.includes(value)) return '#FEF2F2'; // Red-50
      return '#F3F4F6'; // Gray-100
    }
    if (type === 'god') {
      if (AUSPICIOUS_GODS.includes(value)) return '#EEF2FF'; // Indigo-50
      if (INAUSPICIOUS_GODS.includes(value)) return '#F9FAFB'; // Gray-50 (Bad ones often dark in text, light bg)
      return '#F9FAFB';
    }
    return '#FFFFFF';
  };
  
  const getTextColor = (type: 'star' | 'door' | 'god', value: string) => {
    if (type === 'star') {
      if (AUSPICIOUS_STARS.includes(value)) return '#059669'; // Green-600
      if (INAUSPICIOUS_STARS.includes(value)) return '#DC2626'; // Red-600
      return '#4B5563'; // Gray-600
    }
    if (type === 'door') {
      if (AUSPICIOUS_DOORS.includes(value)) return '#D97706'; // Amber-600
      if (INAUSPICIOUS_DOORS.includes(value)) return '#DC2626'; // Red-600
      return '#4B5563'; // Gray-600
    }
    if (type === 'god') {
      if (AUSPICIOUS_GODS.includes(value)) return '#4F46E5'; // Indigo-600
      if (INAUSPICIOUS_GODS.includes(value)) return '#1F2937'; // Gray-800
      return '#4B5563';
    }
    return '#000';
  };

  // Helper to map 0-7 index back to Palace Index (1, 8, 3...)
  // Order: N(1), NE(8), E(3), SE(4), S(9), SW(2), W(7), NW(6)
  const RING_ORDER = [1, 8, 3, 4, 9, 2, 7, 6];

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      {/* Time Controls */}
      {onTimeChange && (
        <div className="flex items-center gap-2 mb-8 bg-gray-50 p-1 rounded-xl border border-gray-100 shadow-sm z-30">
          <button 
            onClick={() => onTimeChange(new Date())}
            className="px-3 py-1.5 text-[10px] font-bold text-gray-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
          >
            今日
          </button>
          <div className="w-[1px] h-3 bg-gray-200"></div>
          <button 
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() + 1);
              onTimeChange(d);
            }}
             className="px-3 py-1.5 text-[10px] font-bold text-gray-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
          >
            明日
          </button>
          <div className="w-[1px] h-3 bg-gray-200"></div>
          <button 
             onClick={() => {
               // Open native picker or custom? Native for now.
               const input = document.getElementById('compass-date-picker') as HTMLInputElement;
               input?.showPicker();
             }}
             className="px-3 py-1.5 text-[10px] font-bold text-gray-600 hover:bg-white hover:shadow-sm rounded-lg transition-all flex items-center gap-1"
          >
            <Calendar size={10} />
            自定义
          </button>
          <input 
            id="compass-date-picker"
            type="datetime-local" 
            className="w-0 h-0 opacity-0 absolute"
            onChange={(e) => {
              if (e.target.value) {
                onTimeChange(new Date(e.target.value));
              }
            }}
          />
        </div>
      )}

      {/* Controls */}
      <div className="absolute top-12 right-4 z-10 flex flex-col gap-2">
         {onIndustryChange && (
           <div className="relative">
             <button 
               onClick={() => setShowIndustryMenu(!showIndustryMenu)}
               className={`p-2 rounded-full shadow-sm border transition-colors ${industry && industry !== '通用' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-stone-200 text-stone-600'}`}
             >
               <Briefcase size={16} />
             </button>
             {showIndustryMenu && (
                <div className="absolute right-10 top-0 bg-white p-2 rounded-xl shadow-xl border border-stone-100 w-32 z-50 max-h-60 overflow-y-auto">
                  {Object.entries(QM_INDUSTRIES).map(([key, label]) => (
                    <div 
                      key={key}
                      onClick={() => {
                        onIndustryChange?.(key as QM_IndustryKey);
                        setShowIndustryMenu(false);
                      }}
                      className={`px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors ${industry === key ? 'bg-amber-50 text-amber-700 font-bold' : 'hover:bg-gray-50 text-stone-600'}`}
                    >
                      {label}
                    </div>
                  ))}
                </div>
             )}
           </div>
         )}

         <button 
           onClick={toggleCompass}
           title={isAutoMode && !isAbsolute ? "当前为相对方向 (非真北)" : "自动罗盘"}
           className={`relative p-2 rounded-full shadow-sm border transition-colors ${isAutoMode ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-stone-200 text-stone-600'}`}
         >
           <Compass size={16} className={isAutoMode ? "animate-spin-slow" : ""} />
           {isAutoMode && !isAbsolute && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
           )}
         </button>
         <button 
           onClick={() => {
             setIsAutoMode(false);
             window.removeEventListener('deviceorientation', handleOrientation);
             setRotation(r => r + 45);
           }}
           className="p-2 bg-white rounded-full shadow-sm border border-stone-200 text-stone-600 hover:bg-stone-50"
         >
           <RotateCw size={16} />
         </button>
         <button 
           onClick={() => setShowLegend(!showLegend)}
           className={`p-2 rounded-full shadow-sm border transition-colors ${showLegend ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-stone-200 text-stone-600'}`}
         >
           <Info size={16} />
         </button>
      </div>

      {/* Legend Overlay */}
      {showLegend && (
        <div className="absolute top-12 left-4 z-20 bg-white/95 backdrop-blur p-4 rounded-xl border border-stone-200 shadow-lg text-[10px] w-48">
          <h4 className="font-bold mb-2 text-stone-800">图例说明</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
               <span className="text-stone-600">吉星 (天心/天任等)</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 bg-red-50 border border-red-100 rounded"></div>
               <span className="text-stone-600">凶星/凶门 (天蓬/死门等)</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 bg-amber-50 border border-amber-100 rounded"></div>
               <span className="text-stone-600">吉门 (开/休/生)</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 bg-indigo-50 border border-indigo-100 rounded"></div>
               <span className="text-stone-600">吉神 (值符/太阴等)</span>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip Overlay */}
      {hoveredPalaceIndex !== null && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
           <div className="bg-stone-900/90 text-white px-4 py-3 rounded-xl shadow-xl backdrop-blur-sm min-w-[160px] text-center">
             {(() => {
                const p = ju.palaces.find(x => x.index === hoveredPalaceIndex);
                if (!p) return null;
                
                const subject = p.door.name; 
                const analysis = analyzeQimenState(ju, p, subject, industry);
                const patterns = analyzePalacePatterns(p, ju);
                const advice = generateUserAdvice(analysis, ju, p, subject);

                return (
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-black text-amber-400 mb-1 border-b border-white/10 pb-1">
                      {p.name}宫 · {QM_NAMES_MAP[p.door.name]}
                    </div>
                    
                    {/* Structure */}
                    {patterns.length > 0 && (
                      <div className="text-[10px] text-stone-300 mb-1">
                        {patterns.map(pat => pat.name).join(' ')}
                      </div>
                    )}
                    
                    {/* State */}
                    <div className="flex items-center justify-center gap-2 text-[10px]">
                       <span className={analysis.state.wuxing === 'Wang' || analysis.state.wuxing === 'Xiang' ? 'text-red-400' : 'text-stone-400'}>
                         {analysis.state.wuxing === 'Wang' ? '旺' : analysis.state.wuxing === 'Xiang' ? '相' : '休囚'}
                       </span>
                       {analysis.state.isKongWang && <span className="text-stone-500">空亡</span>}
                       {analysis.state.isRuMu && <span className="text-stone-500">入墓</span>}
                    </div>

                    {/* Advice */}
                    <div className="text-[10px] text-stone-200 mt-1 leading-relaxed max-w-[180px] whitespace-normal">
                      {advice.content}
                    </div>
                  </div>
                );
             })()}
           </div>
        </div>
      )}

      {/* Compass SVG */}
      <div 
        ref={compassRef}
        className="relative transition-transform duration-100 ease-out touch-none" 
        style={{ width: '360px', height: '360px', transform: `rotate(${rotation}deg)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <svg viewBox="-200 -200 400 400" className="w-full h-full drop-shadow-xl select-none">
          {/* Background */}
          <circle r="190" fill="#FBFBF9" stroke="#E5E7EB" strokeWidth="1" />
          
          {/* Layer 5: Directions & Bagua (Outer) */}
          <g>
            {RING_ORDER.map((palaceIdx, i) => {
              const path = getSegmentPath(i, LAYERS.BAGUA.r, LAYERS.BAGUA.width);
              return (
                <g 
                  key={`bagua-${i}`} 
                  onClick={() => onSelectPalace?.(palaceIdx)}
                  onMouseEnter={() => setHoveredPalaceIndex(palaceIdx)}
                  onMouseLeave={() => setHoveredPalaceIndex(null)}
                >
                  <path d={path} fill="#FFFFFF" stroke="#E7E5E4" strokeWidth="1" className="hover:fill-stone-50 cursor-pointer" />
                  {/* Text */}
                  {(() => {
                    const angle = (i * 45) - 90;
                    const rad = (angle * Math.PI) / 180;
                    const r = LAYERS.BAGUA.r + LAYERS.BAGUA.width / 2;
                    const x = Math.cos(rad) * r;
                    const y = Math.sin(rad) * r;
                    return (
                      <g transform={`translate(${x}, ${y})`}>
                        <text 
                           y="-4" 
                           textAnchor="middle" 
                           className="text-[8px] font-black fill-stone-400 select-none" 
                           transform={`rotate(${angle + 90})`}
                        >
                          {DIRECTION_MAP[palaceIdx]}
                        </text>
                        <text 
                           y="6" 
                           textAnchor="middle" 
                           className="text-[10px] font-serif-zh font-black fill-stone-800 select-none" 
                           transform={`rotate(${angle + 90})`}
                        >
                          {GUA_MAP[palaceIdx]}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              );
            })}
          </g>

          {/* Layer 4: Gods */}
          <g>
            {RING_ORDER.map((palaceIdx, i) => {
              const p = ju.palaces.find(pal => pal.index === palaceIdx);
              if (!p) return null;
              
              const isHighlighted = highlightedIndices.includes(palaceIdx);
              const path = getSegmentPath(i, LAYERS.GOD.r, LAYERS.GOD.width);
              const color = getSegmentColor('god', p.deity.name, isHighlighted);
              const textColor = getTextColor('god', p.deity.name);
              
              return (
                <g 
                  key={`god-${i}`} 
                  onClick={() => onSelectPalace?.(palaceIdx)}
                  onMouseEnter={() => setHoveredPalaceIndex(palaceIdx)}
                  onMouseLeave={() => setHoveredPalaceIndex(null)}
                >
                  <path d={path} fill={color} stroke="#E5E7EB" strokeWidth="1" className="cursor-pointer transition-colors" />
                  {(() => {
                    const angle = (i * 45) - 90;
                    const rad = (angle * Math.PI) / 180;
                    const r = LAYERS.GOD.r + LAYERS.GOD.width / 2;
                    const x = Math.cos(rad) * r;
                    const y = Math.sin(rad) * r;
                    return (
                      <text 
                        x={x} y={y} dy="0.35em"
                        textAnchor="middle" 
                        className="text-[9px] font-black select-none"
                        fill={textColor}
                        transform={`rotate(${angle + 90}, ${x}, ${y})`}
                      >
                        {QM_NAMES_MAP[p.deity.name]}
                      </text>
                    );
                  })()}
                </g>
              );
            })}
          </g>

          {/* Layer 3: Doors */}
          <g>
            {RING_ORDER.map((palaceIdx, i) => {
              const p = ju.palaces.find(pal => pal.index === palaceIdx);
              if (!p) return null;

              const isHighlighted = highlightedIndices.includes(palaceIdx);
              const path = getSegmentPath(i, LAYERS.DOOR.r, LAYERS.DOOR.width);
              const color = getSegmentColor('door', p.door.name, isHighlighted);
              const textColor = getTextColor('door', p.door.name);

              return (
                <g 
                  key={`door-${i}`} 
                  onClick={() => onSelectPalace?.(palaceIdx)}
                  onMouseEnter={() => setHoveredPalaceIndex(palaceIdx)}
                  onMouseLeave={() => setHoveredPalaceIndex(null)}
                >
                  <path d={path} fill={color} stroke="#E5E7EB" strokeWidth="1" className="cursor-pointer transition-colors" />
                  {(() => {
                    const angle = (i * 45) - 90;
                    const rad = (angle * Math.PI) / 180;
                    const r = LAYERS.DOOR.r + LAYERS.DOOR.width / 2;
                    const x = Math.cos(rad) * r;
                    const y = Math.sin(rad) * r;
                    return (
                      <text 
                        x={x} y={y} dy="0.35em"
                        textAnchor="middle" 
                        className="text-[10px] font-black font-serif-zh select-none"
                        fill={textColor}
                        transform={`rotate(${angle + 90}, ${x}, ${y})`}
                      >
                        {QM_NAMES_MAP[p.door.name]}
                      </text>
                    );
                  })()}
                </g>
              );
            })}
          </g>

          {/* Layer 2: Stars */}
          <g>
            {RING_ORDER.map((palaceIdx, i) => {
              const p = ju.palaces.find(pal => pal.index === palaceIdx);
              if (!p) return null;

              const isHighlighted = highlightedIndices.includes(palaceIdx);
              const path = getSegmentPath(i, LAYERS.STAR.r, LAYERS.STAR.width);
              const color = getSegmentColor('star', p.star.name, isHighlighted);
              const textColor = getTextColor('star', p.star.name);

              return (
                <g 
                  key={`star-${i}`} 
                  onClick={() => onSelectPalace?.(palaceIdx)}
                  onMouseEnter={() => setHoveredPalaceIndex(palaceIdx)}
                  onMouseLeave={() => setHoveredPalaceIndex(null)}
                >
                  <path d={path} fill={color} stroke="#E5E7EB" strokeWidth="1" className="cursor-pointer transition-colors" />
                  {(() => {
                    const angle = (i * 45) - 90;
                    const rad = (angle * Math.PI) / 180;
                    const r = LAYERS.STAR.r + LAYERS.STAR.width / 2;
                    const x = Math.cos(rad) * r;
                    const y = Math.sin(rad) * r;
                    return (
                      <text 
                        x={x} y={y} dy="0.35em"
                        textAnchor="middle" 
                        className="text-[9px] font-bold select-none"
                        fill={textColor}
                        transform={`rotate(${angle + 90}, ${x}, ${y})`}
                      >
                        {QM_NAMES_MAP[p.star.name]}
                      </text>
                    );
                  })()}
                </g>
              );
            })}
          </g>

          {/* Layer 1: Center */}
          <circle r={LAYERS.STAR.r} fill="#FFF" stroke="#E5E7EB" strokeWidth="1" />
          <g>
             <circle r={LAYERS.CENTER.width} fill="#F5F5F4" className="opacity-50" />
             <text y="-8" textAnchor="middle" className="text-[10px] font-black fill-stone-400 select-none">中宫</text>
             <text y="8" textAnchor="middle" className="text-xl font-serif-zh font-black fill-stone-800 select-none">
               {centerPalace ? QM_NAMES_MAP[centerPalace.gan] || '5' : '5'}
             </text>
             {/* Show parasitic star/door if needed, usually just simplified */}
             <text y="20" textAnchor="middle" className="text-[8px] fill-stone-400 select-none">
               (寄{QM_NAMES_MAP[ju.palaces.find(p => p.index === 2)?.gan || '']})
             </text>
          </g>

        </svg>

        {/* Pointer (North) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-4 text-red-500 font-bold text-xs flex flex-col items-center">
           <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-red-500"></div>
           <span className="text-[10px] mt-1 tracking-widest select-none">N</span>
        </div>
      </div>
      
      <p className="mt-8 text-[10px] text-stone-400 text-center max-w-xs">
        * 可拖动盘面旋转，点击宫位查看详情
      </p>
    </div>
  );
};
