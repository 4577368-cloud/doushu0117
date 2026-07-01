import React from 'react';
import type { LlmPriority } from '../../utils/llmPriority';

interface LlmPriorityBadgeProps {
  priority: LlmPriority | null;
  className?: string;
}

const LABELS: Record<LlmPriority, string> = {
  1: '线路 ①',
  2: '线路 ②',
  3: '线路 ③',
};

/** 极简 AI 线路指示：三个圆点 + 当前使用的模型序号（不展示具体模型名） */
export const LlmPriorityBadge: React.FC<LlmPriorityBadgeProps> = ({ priority, className = '' }) => {
  if (!priority) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-medium text-stone-400 ${className}`}
      title={`当前使用 ${LABELS[priority]}`}
    >
      <span className="inline-flex items-center gap-0.5" aria-hidden>
        {([1, 2, 3] as LlmPriority[]).map((n) => (
          <span
            key={n}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              n === priority ? 'bg-amber-500 scale-110' : 'bg-stone-300/80'
            }`}
          />
        ))}
      </span>
      <span className="text-stone-500">{LABELS[priority]}</span>
    </span>
  );
};
