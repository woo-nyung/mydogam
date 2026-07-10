'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Pencil, Download, X, ChevronRight, MoreVertical } from 'lucide-react';
import { db } from '@/lib/db';
import { type Collection } from '@/lib/types';
import DeleteConfirmModal from './DeleteConfirmModal';
import EditCollectionModal from './EditCollectionModal';

interface Props {
  collection: Collection;
  ownedCount: number;
  onDelete: () => void;
}

export default function CollectionCard({ collection, ownedCount, onDelete }: Props) {
  const total = collection.totalItems;
  const pct = total > 0 ? Math.round((ownedCount / total) * 100) : 0;

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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

  // JSON 내보내기 (feature 4)
  async function handleExport() {
    setMenuOpen(false);
    const items = await db.items.where('collectionId').equals(collection.id!).toArray();
    const exportData = {
      ...(collection.coverImage ? { coverimage_src: collection.coverImage } : {}),
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

  return (
    <>
      <div className="bg-gray-50 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4 pl-8 flex flex-col justify-between aspect-square min-w-[140px]">
        <div className="relative flex flex-col w-full justify-between h-full p-3 border border-gray-200 rounded-xl overflow-hidden">
          {/* 배경 레이어: 채도를 살짝 낮추고 blur를 줘서 위 콘텐츠가 잘 읽히도록 함 */}
          <div
            className={`absolute -inset-2 bg-cover bg-center saturate-85 blur-xs ${collection.coverImage ? '' : 'bg-gradient-to-br from-gray-100 to-gray-300'
              }`}
            style={collection.coverImage ? { backgroundImage: `url(${collection.coverImage})` } : undefined}
          />
          <div className="relative bg-white border border-gray-200 rounded-xl p-3 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 group/name">
                  <h2 className="font-bold text-gray-800 text-base leading-snug line-clamp-2 break-all">
                    {collection.name}
                  </h2>
                </div>
              </div>

              {/* 액션 메뉴 */}
              <div className="relative flex-shrink-0" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <MoreVertical size={18} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-40 bg-surface rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 flex flex-col py-1">
                    {/* 파일 이름 표시 영역 */}
                    <div className="px-3 py-2 border-b border-gray-50 mb-1 cursor-default">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Source File</p>
                      <p className="text-xs text-gray-600 truncate" title={collection.fileName}>
                        {collection.fileName}
                      </p>
                    </div>

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
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="relative w-full bg-gray-100 rounded-full h-5 flex items-center justify-center overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-primary-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
                <span className="relative z-10 text-[11px] font-bold text-white drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.6)]">
                  {pct}%
                </span>
              </div>
            </div>
          </div>

          <Link
            href={`/collections/${collection.id}`}
            className="relative flex items-center justify-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-xl py-2 transition-colors"
          >
            {ownedCount} / {total} 보유
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      {showDeleteModal && (
        <DeleteConfirmModal
          title="컬렉션 삭제"
          description={
            <><span className="font-semibold text-gray-700">"{collection.name}"</span> 컬렉션을 삭제하면 모든 아이템과 보유 기록이 영구적으로 사라집니다. 정말 삭제할까요?</>
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
    </>
  );
}
