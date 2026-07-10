'use client';

import Image from 'next/image';
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
  onCountChange: (count: number) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ItemCard({ item, onCountChange, onEdit, onDelete }: Props) {
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

  return (
    <div className="relative group">
      {/* Hover 툴팁 */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 z-50 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 pointer-events-none">
        <div className="bg-gray-900 text-white rounded-xl p-3 shadow-2xl flex flex-col gap-1.5">
          <p className="font-semibold text-xs leading-snug">{item.name}</p>
          <p className="text-gray-400 text-[10px] font-mono">{item.itemId}</p>
          {detailEntries && detailEntries.map(([k, v]) => (
            <div key={k} className="flex gap-1 text-[10px]">
              <span className="text-gray-400 flex-shrink-0">{k}:</span>
              <span className="text-gray-200">{v}</span>
            </div>
          ))}
          {detailStr && <p className="text-gray-300 text-[10px] leading-snug">{detailStr}</p>}
          <div className="flex flex-wrap gap-1 mt-0.5">
            {rarity && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${RARITY_STYLES[rarity] ?? 'bg-gray-600 text-white'}`}>
                {rarity}
              </span>
            )}
            {type && <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full">{type}</span>}
          </div>
          {extraMeta.map(([k, v]) => (
            <div key={k} className="flex gap-1 text-[10px]">
              <span className="text-gray-400 flex-shrink-0">{k}:</span>
              <span className="text-gray-200 truncate">{String(v)}</span>
            </div>
          ))}
          <div className="border-t border-white/10 pt-1.5 mt-0.5 text-[10px] text-gray-400">
            보유 수량: <span className="text-white font-semibold">{item.count}</span>
          </div>
        </div>
        <div className="mx-auto w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-gray-900" />
      </div>

      {/* 편집/삭제 버튼 (hover 시 표시) */}
      <div className="absolute top-2 left-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          title="수정"
          className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-gray-500 hover:text-indigo-600 shadow-sm"
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

      {/* 카드 본체: 고정 사이즈 */}
      <div
        className={`rounded-xl border-2 bg-white flex flex-col overflow-hidden transition-all duration-200 ${
          owned ? 'border-indigo-400 shadow-md shadow-indigo-100' : 'border-gray-200 opacity-60'
        }`}
      >
        {/* 보유 뱃지 */}
        {owned && (
          <div className="absolute top-2 right-2 z-10 bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            보유{item.count > 1 ? ` ×${item.count}` : ''}
          </div>
        )}

        {/* 이미지: 세로 기준 3:4 고정 비율 */}
        <div className="relative w-full aspect-[3/4] bg-gray-100 overflow-hidden flex-shrink-0">
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

        {/* 정보 영역: 고정 높이 */}
        <div className="flex flex-col p-3 gap-1.5 h-[148px] overflow-hidden">
          {/* 뱃지 */}
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
          {/* 이름: 최대 2줄 */}
          <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2 flex-shrink-0">
            {item.name}
          </p>
          {/* 세부 정보: 최대 1줄 */}
          {detailEntries && (
            <p className="text-[10px] text-gray-400 leading-snug line-clamp-1 flex-shrink-0">
              {detailEntries.map(([k, v]) => `${k}: ${v}`).join(' · ')}
            </p>
          )}
          {detailStr && (
            <p className="text-[10px] text-gray-400 leading-snug line-clamp-1 flex-shrink-0">{detailStr}</p>
          )}
          {/* ID */}
          <p className="text-[10px] text-gray-300 font-mono truncate flex-shrink-0">{item.itemId}</p>

          {/* count 컨트롤: 항상 하단 고정 */}
          <div className="mt-auto pt-1 border-t border-gray-100 flex justify-center flex-shrink-0">
            <CountControl count={item.count} onChange={onCountChange} />
          </div>
        </div>
      </div>
    </div>
  );
}
