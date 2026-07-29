'use client';

import { Minus, Plus } from 'lucide-react';

interface Props {
  count: number;
  onChange: (count: number) => void;
}

export default function CountControl({ count, onChange }: Props) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={(e) => { e.stopPropagation(); onChange(Math.max(0, count - 1)); }}
        disabled={count === 0}
        className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Minus size={18} strokeWidth={2.5} />
      </button>
      <span className="w-8 text-center text-base font-semibold text-gray-800 tabular-nums">
        {count}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onChange(count + 1); }}
        className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center hover:bg-primary-200 transition-colors"
      >
        <Plus size={18} strokeWidth={2.5} />
      </button>
    </div>
  );
}
