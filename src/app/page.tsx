'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import FileUpload from '@/components/FileUpload';
import CollectionCard from '@/components/CollectionCard';

type Mode = null | 'json' | 'manual';
interface ManualItem { id: string; name: string; }

export default function HomePage() {
  const [mode, setMode] = useState<Mode>(null);
  const [manualName, setManualName] = useState('');
  const [manualItems, setManualItems] = useState<ManualItem[]>([{ id: '', name: '' }]);
  const [manualError, setManualError] = useState('');
  const [saving, setSaving] = useState(false);

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

  function updateManualItem(i: number, field: keyof ManualItem, value: string) {
    setManualItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  function addManualItemRow() {
    setManualItems((prev) => [...prev, { id: '', name: '' }]);
  }

  function removeManualItemRow(i: number) {
    setManualItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function createManualCollection(e: React.FormEvent) {
    e.preventDefault();
    if (!manualName.trim()) { setManualError('컬렉션 이름을 입력하세요.'); return; }
    setSaving(true);
    try {
      const validItems = manualItems.filter((i) => i.id.trim() && i.name.trim());
      const collectionId = await db.collections.add({
        name: manualName.trim(),
        fileName: '직접 입력',
        totalItems: validItems.length,
        createdAt: new Date(),
      });
      if (validItems.length > 0) {
        await db.items.bulkAdd(
          validItems.map((item) => ({
            collectionId: collectionId as number,
            itemId: item.id.trim(),
            name: item.name.trim(),
            count: 0,
            metadata: {},
          }))
        );
      }
      setMode(null);
      setManualName('');
      setManualItems([{ id: '', name: '' }]);
      setManualError('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">My Collections</h1>
            <p className="text-sm text-gray-400 mt-0.5">콜렉팅 진행 상황을 기록하세요</p>
          </div>
          <button
            onClick={() => { setMode(mode ? null : 'json'); setManualError(''); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            {mode ? '✕ 닫기' : '+ 새 컬렉션'}
          </button>
        </div>

        {/* 새 컬렉션 패널 */}
        {mode && (
          <div className="mb-8 bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-4">
            {/* 탭 */}
            <div className="flex rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setMode('json')}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${mode === 'json' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                📂 JSON 업로드
              </button>
              <button
                onClick={() => setMode('manual')}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${mode === 'manual' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                ✏️ 직접 입력
              </button>
            </div>

            {mode === 'json' && <FileUpload onSuccess={() => setMode(null)} />}

            {mode === 'manual' && (
              <form onSubmit={createManualCollection} className="flex flex-col gap-4">
                {/* 컬렉션 이름 */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">컬렉션 이름 *</label>
                  <input
                    value={manualName}
                    onChange={(e) => { setManualName(e.target.value); setManualError(''); }}
                    placeholder="예: 나만의 컬렉션"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    autoFocus
                  />
                  {manualError && <p className="text-xs text-rose-500 mt-1">{manualError}</p>}
                </div>

                {/* 아이템 목록 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-gray-500">아이템 목록</label>
                    <span className="text-[10px] text-gray-300">(id, name 필수)</span>
                  </div>
                  {/* 헤더 */}
                  <div className="grid grid-cols-[1fr_2fr_auto] gap-2 px-1">
                    <span className="text-[10px] font-semibold text-gray-400">ID</span>
                    <span className="text-[10px] font-semibold text-gray-400">이름</span>
                    <span className="w-6" />
                  </div>
                  {/* 아이템 행 */}
                  <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                    {manualItems.map((item, i) => (
                      <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center">
                        <input
                          value={item.id}
                          onChange={(e) => updateManualItem(i, 'id', e.target.value)}
                          placeholder="ID"
                          className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                        <input
                          value={item.name}
                          onChange={(e) => updateManualItem(i, 'name', e.target.value)}
                          placeholder="이름"
                          className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                        <button
                          type="button"
                          onClick={() => removeManualItemRow(i)}
                          disabled={manualItems.length === 1}
                          className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-rose-400 disabled:opacity-20 transition-colors text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addManualItemRow}
                    className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold text-left mt-1"
                  >
                    + 행 추가
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
                >
                  {saving ? '저장 중...' : '컬렉션 만들기'}
                </button>
              </form>
            )}
          </div>
        )}

        {collections === undefined ? (
          <p className="text-center text-gray-300 py-20">로딩 중...</p>
        ) : collections.length === 0 ? (
          <div className="text-center py-24 flex flex-col items-center gap-3">
            <span className="text-6xl">📦</span>
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
    </main>
  );
}
