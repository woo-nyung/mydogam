'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { db } from '@/lib/db';
import { type Collection } from '@/lib/types';
import DeleteConfirmModal from './DeleteConfirmModal';

interface Props {
  collection: Collection;
  ownedCount: number;
  onDelete: () => void;
}

export default function CollectionCard({ collection, ownedCount, onDelete }: Props) {
  const total = collection.totalItems;
  const pct = total > 0 ? Math.round((ownedCount / total) * 100) : 0;

  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(collection.name);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  async function commitEdit() {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== collection.name) {
      await db.collections.update(collection.id!, { name: trimmed });
    } else {
      setNameValue(collection.name);
    }
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') { setNameValue(collection.name); setEditing(false); }
  }

  // JSON 내보내기 (feature 4)
  async function handleExport() {
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

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                ref={inputRef}
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={handleKeyDown}
                className="w-full font-bold text-gray-800 text-base border-b-2 border-indigo-400 focus:outline-none bg-transparent pb-0.5"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-1.5 group/name">
                <h2 className="font-bold text-gray-800 text-base leading-snug truncate">
                  {collection.name}
                </h2>
                <button
                  onClick={startEdit}
                  className="text-gray-300 hover:text-indigo-400 transition-colors opacity-0 group-hover/name:opacity-100 flex-shrink-0 text-sm"
                  title="이름 수정"
                >
                  ✏️
                </button>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-0.5">{collection.fileName}</p>
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* 내보내기 버튼 */}
            <button
              onClick={handleExport}
              title="JSON으로 내보내기"
              className="text-gray-300 hover:text-indigo-400 transition-colors text-base leading-none"
            >
              ⬇
            </button>
            {/* 삭제 버튼 */}
            <button
              onClick={() => setShowDeleteModal(true)}
              title="삭제"
              className="text-gray-300 hover:text-rose-400 transition-colors text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{ownedCount} / {total} 보유</span>
            <span className="font-semibold text-indigo-600">{pct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <Link
          href={`/collections/${collection.id}`}
          className="block text-center text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl py-2 transition-colors"
        >
          콜렉션 보기 →
        </Link>
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
    </>
  );
}
