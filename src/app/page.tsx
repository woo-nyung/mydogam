'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Package } from 'lucide-react';
import { db } from '@/lib/db';
import AddCollectionModal from '@/components/AddCollectionModal';
import CollectionCard from '@/components/CollectionCard';
import SettingsMenu from '@/components/SettingsMenu';

export default function HomePage() {
  const [showAddModal, setShowAddModal] = useState(false);

  const collections = useLiveQuery(() =>
    db.collections.orderBy('createdAt').reverse().toArray()
  );

  const ownedCounts = useLiveQuery(async () => {
    const allItems = await db.items.toArray();
    const counts: Record<number, number> = {};
    for (const item of allItems) {
      if (item.count > 0) {
        counts[item.collectionId] = (counts[item.collectionId] ?? 0) + 1;
      }
    }
    return counts;
  });

  async function handleDelete(id: number) {
    await db.items.where('collectionId').equals(id).delete();
    await db.collections.delete(id);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">My Collections</h1>
            <p className="text-sm text-gray-400 mt-0.5">콜렉팅 진행 상황을 기록하세요</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              <Plus size={16} strokeWidth={2.5} />
              새 컬렉션
            </button>
            <SettingsMenu />
          </div>
        </div>

        {collections === undefined ? (
          <p className="text-center text-gray-300 py-20">로딩 중...</p>
        ) : collections.length === 0 ? (
          <div className="text-center py-24 flex flex-col items-center gap-3">
            <Package size={56} className="text-gray-300" />
            <p className="text-gray-400 font-medium">아직 컬렉션이 없어요</p>
            <p className="text-sm text-gray-300">JSON 업로드 또는 직접 입력으로 시작하세요</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {collections.map((col) => (
              <CollectionCard
                key={col.id}
                collection={col}
                ownedCount={ownedCounts?.[col.id!] ?? 0}
                onDelete={() => handleDelete(col.id!)}
              />
            ))}
          </div>
        )}
      </div>

      {showAddModal && <AddCollectionModal onClose={() => setShowAddModal(false)} />}
    </main>
  );
}
