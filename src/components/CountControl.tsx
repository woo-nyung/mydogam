'use client';

import { Minus, Plus } from 'lucide-react';

interface Props {
  count: number;
  onChange: (count: number) => void;
}

export default function CountControl({ count, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={(e) => { e.stopPropagation(); onChange(Math.max(0, count - 1)); }}
        disabled={count === 0}
        className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Minus size={14} strokeWidth={2.5} />
      </button>
      <span className="w-6 text-center text-sm font-semibold text-gray-800 tabular-nums">
        {count}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onChange(count + 1); }}
        className="w-7 h-7 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center hover:bg-primary-200 transition-colors"
      >
        <Plus size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}
