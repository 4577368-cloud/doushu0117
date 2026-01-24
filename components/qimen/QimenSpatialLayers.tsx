import React, { useState, useRef, useEffect } from 'react';
import { QM_Ju, QM_Palace } from '../../types';
import { QM_STACK_ORDER, QM_NAMES_MAP, QM_ELEMENT_TEXT_MAP, QM_PALACE_INFO } from '../../services/qimenConstants';
import { Layers, RotateCw, Minimize2, Maximize2, ChevronUp, ChevronDown, RefreshCw, Smartphone, Move } from 'lucide-react';

interface Props { ju: QM_Ju; }

// Helper to get Gua Name from Palace Index
const getGuaName = (idx: number) => QM_PALACE_INFO[idx]?.name || '';

const QimenSpatialLayers: React.FC<Props> = ({ ju }) => {
  const [spread, setSpread] = useState(true);
  const [rotationZ, setRotationZ] = useState(-30);
  const [rotationX, setRotationX] = useState(60);
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const [topLayerId, setTopLayerId] = useState('神');
  
  // Refs for Drag Interaction
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Standard 3x3 Grid Order for display
  const gridPositions = [4, 9, 2, 3, 5, 7, 8, 1, 6];
  const getPalace = (idx: number) => ju.palaces.find(p => p.index === idx)!;

  // Layer Configuration
  const LAYER_DEFS = [
    { 
      id: '神', 
      label: '神盘',
      fullLabel: '神盘 · 八神', 
      color: 'bg-indigo-50/30 border-indigo-200/50 text-indigo-800',
      icon: '✨'
    },
    { 
      id: '天', 
      label: '天盘',
      fullLabel: '天盘 · 九星', 
      color: 'bg-sky-50/30 border-sky-200/50 text-sky-800',
      icon: '⭐'
    },
    { 
      id: '人', 
      label: '人盘',
      fullLabel: '人盘 · 八门', 
      color: 'bg-rose-50/30 border-rose-200/50 text-rose-800',
      icon: '🚪'
    },
    { 
      id: '地', 
      label: '地盘',
      fullLabel: '地盘 · 九宫', 
      color: 'bg-stone-50/40 border-stone-200/50 text-stone-800',
      icon: '🌍'
    },
  ];

  const layers = React.useMemo(() => {
    const order = ['神', '天', '人', '地'];
    // Move topLayerId to start, keep others in relative order
    const reordered = [topLayerId, ...order.filter(id => id !== topLayerId)];
    
    return reordered.map((id, idx) => {
        const def = LAYER_DEFS.find(d => d.id === id)!;
        return { ...def, z: (3 - idx) * 100 };
    });
  }, [topLayerId]);

  // Drag Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (gyroEnabled) return; 
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || gyroEnabled) return;
    const deltaX = e.clientX - lastPos.current.x;
    const deltaY = e.clientY - lastPos.current.y;
    
    // Sensitivity factors
    setRotationZ(prev => prev - deltaX * 0.5); // Drag left -> Rotate CCW
    setRotationX(prev => Math.max(0, Math.min(90, prev + deltaY * 0.5))); // Drag down -> Tilt down (0-90)
    
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  // Gyroscope Logic
  const toggleGyro = async () => {
    if (gyroEnabled) {
      setGyroEnabled(false);
      return;
    }

    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === 'granted') {
          setGyroEnabled(true);
        } else {
          alert('需要陀螺仪权限才能使用动态视角');
        }
      } catch (error) {
        console.error(error);
      }
    } else {
      setGyroEnabled(true);
    }
  };

  useEffect(() => {
    if (!gyroEnabled) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
       const { beta, gamma } = event;
       if (beta === null || gamma === null) return;
       
       // Map device orientation to rotation
       // Beta (front-back tilt): -180 to 180. Flat is 0. Upright is 90.
       // Gamma (left-right tilt): -90 to 90.
       
       // Target: X (0-90), Z (any)
       // Logic: Holding phone like a window.
       // Tilt back (>0) -> Rotate X up.
       // Tilt left/right -> Rotate Z.
       
       const targetX = Math.max(0, Math.min(90, (beta || 0) + 30)); // Offset to make comfortable viewing angle
       const targetZ = -(gamma || 0) * 1.5; // Amplify slightly
       
       setRotationX(targetX);
       setRotationZ(targetZ);
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [gyroEnabled]);

  const resetView = () => {
    setRotationZ(-30);
    setRotationX(60);
    setSpread(true);
    setGyroEnabled(false);
    setTopLayerId('神');
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex flex-col items-center justify-center bg-stone-100 relative overflow-hidden perspective-1000 touch-none cursor-grab active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      
      {/* Controls */}
      <div className="absolute top-4 left-0 w-full flex justify-center z-50 pointer-events-none">
         <div className="bg-white/80 backdrop-blur-md p-2 rounded-xl shadow-lg border border-white/50 flex items-center gap-2 pointer-events-auto mx-4">
            <button 
              onClick={() => setSpread(!spread)} 
              className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-600 flex flex-col items-center gap-1 min-w-[32px]"
              title={spread ? "合并" : "展开"}
            >
              {spread ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            
            <div className="w-[1px] h-6 bg-stone-200"></div>

            <div className="flex gap-1 bg-stone-50 rounded-lg p-1">
               {LAYER_DEFS.map(l => (
                  <button
                     key={l.id}
                     onClick={() => setTopLayerId(l.id)}
                     className={`text-[10px] font-bold py-1 px-2 rounded-md transition-all ${topLayerId === l.id ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-indigo-100' : 'text-stone-500 hover:bg-white/50'}`}
                  >
                     {l.label}
                  </button>
               ))}
            </div>

            <div className="w-[1px] h-6 bg-stone-200"></div>

            <button 
              onClick={toggleGyro}
              className={`p-2 rounded-lg transition-colors flex flex-col items-center gap-1 min-w-[32px] ${gyroEnabled ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-stone-100 text-stone-600'}`}
              title="陀螺仪"
            >
              <Smartphone size={18} />
            </button>

            <button 
              onClick={resetView}
              className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-600 flex flex-col items-center gap-1 min-w-[32px]"
              title="重置"
            >
              <RefreshCw size={18} />
            </button>
         </div>
      </div>

      {/* 3D Scene Container */}
      <div 
        className="relative transition-all duration-[1.2s] ease-out transform-gpu" 
        style={{ 
          transform: `scale(0.8) rotateX(${rotationX}deg) rotateZ(${rotationZ}deg)`, 
          transformStyle: 'preserve-3d', 
          width: '320px', 
          height: '320px' 
        }}
      >
        {layers.map((layer, lIdx) => (
          <div 
            key={layer.id} 
            className="absolute inset-0 transition-transform duration-[1s] ease-in-out pointer-events-none" 
            style={{ 
              transform: `translateZ(${spread ? layer.z : lIdx * 10}px)`, 
              transformStyle: 'preserve-3d' 
            }}
          >
            {/* Layer Label (Floating) */}
            {spread && (
              <div 
                 className="absolute -left-20 top-0 text-xs font-black px-3 py-1 bg-white/90 backdrop-blur rounded-full shadow-sm border border-stone-100 flex items-center gap-1"
                 style={{ 
                   transform: `rotateZ(${-rotationZ}deg) rotateX(${-rotationX}deg)`, // Counter-rotate label to face user
                   color: layer.color.split(' ').find(c => c.startsWith('text-'))?.replace('text-', '') 
                 }}
              >
                 <span>{layer.icon}</span>
                 {layer.fullLabel}
              </div>
            )}

            {/* Grid Cells */}
            <div className={`w-full h-full grid grid-cols-3 gap-2 p-2 rounded-[2rem] border ${layer.color} backdrop-blur-[2px] shadow-sm`}>
              {gridPositions.map(idx => {
                const p = getPalace(idx);
                
                // Content Logic
                let mainContent = "";
                let subContent = "";
                let cornerContent = "";
                let colorClass = "";
                
                if (layer.id === '神') { 
                  mainContent = QM_NAMES_MAP[p.deity.name]; 
                  colorClass = QM_ELEMENT_TEXT_MAP[p.deity.element];
                }
                if (layer.id === '天') { 
                  mainContent = QM_NAMES_MAP[p.star.name]; 
                  subContent = QM_NAMES_MAP[p.heavenStem]; // 天盘干
                  colorClass = "text-sky-900"; 
                }
                if (layer.id === '人') { 
                  mainContent = QM_NAMES_MAP[p.door.name]; 
                  colorClass = p.door.auspiciousness === '吉' ? 'text-red-700' : p.door.auspiciousness === '凶' ? 'text-stone-600' : 'text-stone-800'; 
                }
                if (layer.id === '地') { 
                  mainContent = QM_NAMES_MAP[p.earthStem]; // 地盘干
                  cornerContent = getGuaName(idx); // 宫名 (坎、离...)
                  colorClass = "text-stone-600"; 
                }
                
                // Center Palace Handling (5)
                if (idx === 5) {
                   if (layer.id === '地') cornerContent = '中';
                }

                return (
                  <div 
                    key={`${layer.id}-${idx}`} 
                    className={`
                      relative flex items-center justify-center rounded-xl border border-white/20 shadow-inner
                      ${layer.id === '神' ? 'bg-indigo-100/10' : ''}
                      ${layer.id === '天' ? 'bg-sky-100/10' : ''}
                      ${layer.id === '人' ? 'bg-rose-100/10' : ''}
                      ${layer.id === '地' ? 'bg-stone-100/30' : ''}
                    `}
                  >
                    {/* Main Content (Big) */}
                    <span className={`text-lg font-black font-serif-zh ${colorClass} drop-shadow-sm`}>
                      {mainContent}
                    </span>

                    {/* Sub Content (Small Top-Right) - e.g. Heaven Stem */}
                    {subContent && (
                      <span className="absolute top-1 right-2 text-[10px] font-bold text-gray-500 font-serif-zh">
                        {subContent}
                      </span>
                    )}

                    {/* Corner Content (Small Bottom-Left) - e.g. Gua Name */}
                    {cornerContent && (
                      <span className="absolute bottom-1 left-2 text-[10px] font-bold text-stone-400/80 font-serif-zh">
                        {cornerContent}
                      </span>
                    )}

                    {/* Parasitic Stem for Center Palace (if needed) */}
                    {idx === 5 && layer.id === '地' && (
                       <span className="absolute top-1 right-2 text-[8px] text-stone-300">寄</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      <div className="absolute bottom-10 text-center pointer-events-none flex flex-col items-center gap-2">
         <p className="text-[10px] text-stone-500 font-medium bg-white/60 px-3 py-1 rounded-full backdrop-blur shadow-sm border border-white/20">
            {spread ? '天地人神 · 四层同参' : '九宫合一 · 全局概览'}
         </p>
         {!gyroEnabled && (
           <div className="flex items-center gap-1 text-[9px] text-stone-400 bg-white/30 px-2 py-0.5 rounded-full">
             <Move size={10} />
             <span>单指拖拽调整视角</span>
           </div>
         )}
      </div>
    </div>
  );
};

export { QimenSpatialLayers };
export default QimenSpatialLayers;
