'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Pencil, X, ImageOff } from 'lucide-react';
import { type CollectionItem } from '@/lib/types';
import CountControl from './CountControl';

const RARITY_STYLES: Record<string, string> = {
  '이타다키 (하이)': 'bg-amber-400 text-amber-900',
  '슈퍼': 'bg-purple-500 text-white',
  '레어': 'bg-blue-500 text-white',
  '노멀': 'bg-gray-200 text-gray-600',
  '시크릿': 'bg-rose-500 text-white',
  '프로모': 'bg-emerald-500 text-white',
};

const TYPE_STYLES: Record<string, string> = {
  '캐릭터': 'bg-sky-100 text-sky-700',
  '액션': 'bg-orange-100 text-orange-700',
  '응원': 'bg-green-100 text-green-700',
  '사인': 'bg-pink-100 text-pink-700',
};

const KNOWN_META_KEYS = new Set(['img_src', 'rarity', 'type', 'detail']);

interface Props {
  item: CollectionItem;
  mode: 'view' | 'edit';
  onCountChange: (count: number) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ItemCard({ item, mode, onCountChange, onEdit, onDelete }: Props) {
  const [flipped, setFlipped] = useState(false);
  const meta = item.metadata;
  const imgSrc = typeof meta.img_src === 'string' ? meta.img_src : null;
  const rarity = typeof meta.rarity === 'string' ? meta.rarity : null;
  const type = typeof meta.type === 'string' ? meta.type : null;
  const detailRaw = meta.detail;
  const detailStr = typeof detailRaw === 'string' ? detailRaw : null;
  const detailEntries =
    typeof detailRaw === 'object' && detailRaw !== null && !Array.isArray(detailRaw)
      ? (Object.entries(detailRaw as Record<string, unknown>).map(([k, v]) => [k, String(v)] as [string, string]))
      : null;
  const owned = item.count > 0;
  const extraMeta = Object.entries(meta).filter(([k]) => !KNOWN_META_KEYS.has(k));

  const canFlip = mode === 'view';
  const isFlipped = canFlip && flipped;

  return (
    <div className="relative group">
      {/* 편집/삭제 버튼: 편집 모드일 때만 우측 상단에 표시 */}
      {mode === 'edit' && (
        <div className="absolute top-2 right-2 z-20 flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            title="수정"
            className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-gray-500 hover:text-primary-600 shadow-sm"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="삭제"
            className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-gray-500 hover:text-rose-500 shadow-sm"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* 카드: 앞면(이미지) / 뒷면(정보) 플립 */}
      <div className="[perspective:1200px]">
        <div
          onClick={() => canFlip && setFlipped((f) => !f)}
          className={`relative w-full aspect-[3/4] transition-transform duration-500 [transform-style:preserve-3d] ${canFlip ? 'cursor-pointer' : ''
            } ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
        >
          {/* 앞면 (opacity는 이 얼굴에만 적용: 회전 컨테이너에 걸면 backface-visibility가 깨짐) */}
          <div className={`absolute inset-0 rounded-xl border-2 border-gray-200 bg-gray-100 overflow-hidden [backface-visibility:hidden] ${owned ? '' : 'opacity-40'}`}>
            {imgSrc ? (
              <Image
                src={imgSrc}
                alt={item.name}
                fill
                className="object-contain"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                unoptimized
              />
            ) : (
              <div className="text-gray-300 flex items-center justify-center h-full">
                <ImageOff size={32} />
              </div>
            )}
          </div>

          {/* 뒷면: 카드 정보 */}
          <div className="absolute inset-0 rounded-xl border-2 border-gray-200 bg-white overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)] p-3 flex flex-col gap-1.5">
            <div className="flex flex-wrap gap-1 flex-shrink-0">
              {rarity && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${RARITY_STYLES[rarity] ?? 'bg-gray-200 text-gray-600'}`}>
                  {rarity}
                </span>
              )}
              {type && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_STYLES[type] ?? 'bg-gray-100 text-gray-600'}`}>
                  {type}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2 flex-shrink-0">
              {item.name}
            </p>
            {detailEntries && (
              <p className="text-[10px] text-gray-400 leading-snug line-clamp-2 flex-shrink-0">
                {detailEntries.map(([k, v]) => `${k}: ${v}`).join(' · ')}
              </p>
            )}
            {detailStr && (
              <p className="text-[10px] text-gray-400 leading-snug line-clamp-2 flex-shrink-0">{detailStr}</p>
            )}
            {extraMeta.map(([k, v]) => (
              <p key={k} className="text-[10px] text-gray-400 truncate flex-shrink-0">
                <span className="text-gray-300">{k}:</span> {String(v)}
              </p>
            ))}
            <p className="text-[10px] text-gray-300 font-mono truncate flex-shrink-0">{item.itemId}</p>
            <p className="mt-auto text-[10px] text-gray-400 flex-shrink-0">
              보유 수량: <span className="font-semibold text-gray-700">{item.count}</span>
            </p>
          </div>
        </div>
      </div>

      {/* count 컨트롤: 편집 모드, 카드 이미지 하단에 겹쳐서 표시 */}
      {mode === 'edit' && (
        <div className="absolute bottom-0 inset-x-0 z-10 flex justify-center py-2 bg-white/90 backdrop-blur-sm rounded-b-xl opacity-80">
          <CountControl count={item.count} onChange={onCountChange} />
        </div>
      )}
    </div>
  );
}
