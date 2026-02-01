import React from 'react';
import { QM_Palace } from '../../types';
import { QMPattern } from '../../services/qimenPatterns';
import { QM_NAMES_MAP, QM_ELEMENT_TEXT_MAP, QM_STATE_MAP, QM_GAN_ELEMENTS } from '../../services/qimenConstants';

interface Props {
  palace: QM_Palace;
  patterns?: QMPattern[];
  onClick?: () => void;
}

const QimenPalaceItem: React.FC<Props> = ({ palace, patterns = [], onClick }) => {
  const { deity, star, door, heavenStem, earthStem, name, state, element, index } = palace;
  const isJi = palace.door.auspiciousness === '吉';
  const stateInfo = QM_STATE_MAP[state] || QM_STATE_MAP['Xiu'];

  return (
    <div 
      onClick={onClick}
      className={`relative h-full w-full bg-white border border-gray-100 rounded-2xl p-2 flex flex-col justify-between 
        transition-all duration-300 shadow-sm group overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-xl hover:-translate-y-1' : ''}`}
    >
      <div className="flex justify-between items-start">
        {/* Left Top: God */}
        <div className="flex flex-col">
          <span className={`text-[10px] font-bold font-serif-zh ${QM_ELEMENT_TEXT_MAP[deity.element]}`}>
            {QM_NAMES_MAP[deity.name]}
          </span>
          {/* Heaven Stem (User Expectation: Gui at top left/center) - Moved to prominent left side under God or similar */}
        </div>

        {/* Right Top: Nine Star */}
        <div className="flex flex-col items-end">
           <span className={`text-[10px] font-bold font-serif-zh ${QM_ELEMENT_TEXT_MAP[star.element]}`}>
            {QM_NAMES_MAP[star.name]}
          </span>
        </div>
      </div>

      {/* Center: Heaven Stem & Earth Stem */}
      <div className="flex flex-col items-center justify-center -my-1 relative z-10">
        <div className="flex items-center gap-2">
           {/* Heaven Stem (Prominent) */}
           <div className={`text-xl font-serif-zh font-black transition-transform group-hover:scale-110 ${QM_ELEMENT_TEXT_MAP[QM_GAN_ELEMENTS[heavenStem] || '土']}`}>
            {QM_NAMES_MAP[heavenStem]}
          </div>
        </div>
        
        {/* Patterns Display */}
        {patterns.length > 0 && (
          <div className="flex flex-wrap justify-center gap-0.5 my-0.5 max-w-full px-1">
            {patterns.slice(0, 2).map((p, i) => (
              <span 
                key={i} 
                className={`text-[8px] px-1 rounded-sm transform scale-[0.85] whitespace-nowrap ${
                  p.type === '吉' ? 'bg-red-50 text-red-600' : 
                  p.type === '凶' ? 'bg-stone-100 text-stone-500' : 
                  'bg-blue-50 text-blue-600'
                }`}
              >
                {p.name}
              </span>
            ))}
            {patterns.length > 2 && (
               <span className="text-[8px] text-gray-300 transform scale-[0.8]">+</span>
            )}
          </div>
        )}

        {/* Earth Stem */}
        <div className={`text-sm font-serif-zh font-bold mt-1 ${QM_ELEMENT_TEXT_MAP[QM_GAN_ELEMENTS[earthStem] || '土']}`}>
          {QM_NAMES_MAP[earthStem]}
        </div>
      </div>

      <div className="flex justify-between items-end pt-1 border-t border-gray-50">
        {/* Door */}
        <div className="flex items-center gap-1">
          <span className={`text-[10px] font-black ${isJi ? 'text-[#3E5C3E]' : 'text-[#963C3C]'}`}>
            {QM_NAMES_MAP[door.name]}
          </span>
        </div>
        
        {/* Palace Name & Trigram (New Rich Display) */}
        <div className="flex flex-col items-end opacity-40">
           <div className="text-[14px] leading-none font-serif-zh font-bold text-gray-400">
             {QM_GUA_TRIGRAMS[name] || ''}
           </div>
           <div className="text-[8px] font-bold text-gray-400">
             {name}
           </div>
        </div>
      </div>

      {/* Large Background Trigram */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.02] text-6xl select-none">
        {QM_GUA_TRIGRAMS[name] || ''}
      </div>
    </div>
  );
};

export { QimenPalaceItem };
export default QimenPalaceItem;