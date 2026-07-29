'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Package, LibraryBig, Star } from 'lucide-react';
import { db } from '@/lib/db';
import AddCollectionModal from '@/components/AddCollectionModal';
import CollectionCard from '@/components/CollectionCard';
import SettingsMenu from '@/components/SettingsMenu';

type Tab = 'binder' | 'wish';

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('binder');
  const [showAddModal, setShowAddModal] = useState(false);

  const collections = useLiveQuery(() =>
    db.collections.orderBy('createdAt').reverse().toArray()
  );

  async function handleDelete(id: number) {
    await db.items.where('collectionId').equals(id).delete();
    await db.collections.delete(id);
  }

  return (
    <main className="min-h-screen bg-white pb-24">
      <div className="fixed top-0 inset-x-0 z-40 bg-white">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-5 py-5">
          <h1 className="text-2xl font-extrabold text-gray-900">마이도감</h1>
          {tab === 'binder' && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowAddModal(true)}
                title="새 컬렉션"
                className="w-9 h-9 flex items-center justify-center text-gray-700 hover:text-gray-900 transition-colors"
              >
                <Plus size={22} strokeWidth={2.5} />
              </button>
              <SettingsMenu />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto pt-[76px]">
        <div className="px-5 py-8">
          {tab === 'wish' ? (
            <div className="text-center py-24 flex flex-col items-center gap-3">
              <Star size={48} className="text-gray-300" />
              <p className="text-gray-400 font-medium">Wish는 준비 중이에요</p>
            </div>
          ) : collections === undefined ? (
            <p className="text-center text-gray-300 py-20">로딩 중...</p>
          ) : collections.length === 0 ? (
            <div className="text-center py-24 flex flex-col items-center gap-3">
              <Package size={56} className="text-gray-300" />
              <p className="text-gray-400 font-medium">아직 컬렉션이 없어요</p>
              <p className="text-sm text-gray-300">JSON 업로드 또는 직접 입력으로 시작하세요</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-x-3 gap-y-6">
              {collections.map((col) => (
                <CollectionCard
                  key={col.id}
                  collection={col}
                  onDelete={() => handleDelete(col.id!)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 하단 탭 메뉴 */}
      <nav className="fixed bottom-0 inset-x-0 flex justify-center gap-16 py-3 bg-white">
        <button
          onClick={() => setTab('binder')}
          className="flex flex-col items-center gap-1 px-4 py-1"
        >
          <LibraryBig size={20} className={tab === 'binder' ? 'text-gray-900' : 'text-gray-300'} />
          <span className={`text-xs font-semibold ${tab === 'binder' ? 'text-gray-900' : 'text-gray-300'}`}>
            Binder
          </span>
        </button>
        <button
          onClick={() => setTab('wish')}
          className="flex flex-col items-center gap-1 px-4 py-1"
        >
          <Star size={20} className={tab === 'wish' ? 'text-gray-900' : 'text-gray-300'} />
          <span className={`text-xs font-semibold ${tab === 'wish' ? 'text-gray-900' : 'text-gray-300'}`}>
            Wish
          </span>
        </button>
      </nav>

      {showAddModal && <AddCollectionModal onClose={() => setShowAddModal(false)} />}
    </main>
  );
}
