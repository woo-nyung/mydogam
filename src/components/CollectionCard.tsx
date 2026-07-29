'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Pencil, Download, X } from 'lucide-react';
import { db } from '@/lib/db';
import { type Collection } from '@/lib/types';
import DeleteConfirmModal from './DeleteConfirmModal';
import EditCollectionModal from './EditCollectionModal';

interface Props {
  collection: Collection;
  onDelete: () => void;
}

// 손그림풍 SVG 원본 크기 (세 레이아웃 전부 동일한 두께)
const SPINE_WIDTH = 80;
const SPINE_HEIGHT = 225;

// 좌측 상단 "..." 설정 태그 위치 (세 SVG 전부 동일)
const TAG_BOX = { left: 41.7, top: 1.7, width: 32, height: 23 };

type LayoutId = 0 | 1 | 2;

interface SpineLayout {
  src: string;
  labelX: [number, number];
  labelY: [number, number];
}

// 3가지 책등 레이아웃: SVG 파일과 그 안 흰색 라벨 영역 좌표 (실측)
const LAYOUTS: Record<LayoutId, SpineLayout> = {
  0: { src: '/binder1.svg', labelX: [15, 64], labelY: [39, 209] }, // 알약형
  1: { src: '/binder2.svg', labelX: [4, 76], labelY: [44, 203] }, // 세로로 긴 라벨
  2: { src: '/binder3.svg', labelX: [15, 64], labelY: [42, 204] }, // 중간 길이 라벨
};

// 컬렉션 id 기준으로 레이아웃을 고정 배정 (같은 컬렉션은 항상 같은 모양)
function layoutIdFor(id: number | undefined): LayoutId {
  return ((id ?? 0) % 3) as LayoutId;
}

export default function CollectionCard({ collection, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function handleExport() {
    setMenuOpen(false);
    const items = await db.items.where('collectionId').equals(collection.id!).toArray();
    const exportData = {
      card_info: items.map((item) => ({
        id: item.itemId,
        name: item.name,
        ...item.metadata,
        count: item.count, // 마지막에 위치해서 metadata의 count 키에 덮어씌워지지 않도록
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${collection.name}_export.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const layout = LAYOUTS[layoutIdFor(collection.id)];
  const labelCenterX = (layout.labelX[0] + layout.labelX[1]) / 2;
  const labelCenterY = (layout.labelY[0] + layout.labelY[1]) / 2;
  const labelHeight = layout.labelY[1] - layout.labelY[0];

  return (
    <div className="relative flex-shrink-0" style={{ width: SPINE_WIDTH }}>
      <Link
        href={`/collections/${collection.id}`}
        className="relative block hover:-translate-y-0.5 transition-transform"
        style={{ width: SPINE_WIDTH, height: SPINE_HEIGHT }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local trusted SVG, next/image requires dangerouslyAllowSVG */}
        <img
          src={layout.src}
          alt=""
          width={SPINE_WIDTH}
          height={SPINE_HEIGHT}
          className="absolute inset-0 pointer-events-none select-none"
          draggable={false}
        />
        <span
          className="absolute text-xs font-bold text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis text-center"
          style={{
            left: labelCenterX,
            top: labelCenterY,
            width: labelHeight - 16,
            transform: 'translate(-50%, -50%) rotate(90deg)',
          }}
        >
          {collection.name}
        </span>
      </Link>

      {/* 좌측 상단 설정 태그 (그림에 이미 그려진 "..." 위에 클릭 영역만 얹음) */}
      <div className="absolute" style={{ left: TAG_BOX.left, top: TAG_BOX.top }} ref={menuRef}>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((v) => !v); }}
          aria-label="컬렉션 설정"
          style={{ width: TAG_BOX.width, height: TAG_BOX.height }}
        />

        {menuOpen && (
          <div className="absolute left-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 flex flex-col py-1">
            <button
              onClick={() => { setMenuOpen(false); setShowEditModal(true); }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-app-bg text-left"
            >
              <Pencil size={14} />
              컬렉션 수정
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-app-bg text-left"
            >
              <Download size={14} />
              내보내기
            </button>
            <button
              onClick={() => { setMenuOpen(false); setShowDeleteModal(true); }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-rose-500 hover:bg-rose-50 text-left"
            >
              <X size={14} />
              삭제
            </button>
          </div>
        )}
      </div>

      {showDeleteModal && (
        <DeleteConfirmModal
          title="컬렉션 삭제"
          description={
            <><span className="font-semibold text-gray-700">&quot;{collection.name}&quot;</span> 컬렉션을 삭제하면 모든 아이템과 보유 기록이 영구적으로 사라집니다. 정말 삭제할까요?</>
          }
          onConfirm={() => { setShowDeleteModal(false); onDelete(); }}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {showEditModal && (
        <EditCollectionModal
          collection={collection}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}
