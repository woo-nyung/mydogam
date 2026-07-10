'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { ChevronLeft, Plus, X } from 'lucide-react';
import { db } from '@/lib/db';
import ItemCard from '@/components/ItemCard';
import AddItemModal from '@/components/AddItemModal';
import EditItemModal from '@/components/EditItemModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import { type CollectionItem } from '@/lib/types';

type OwnedFilter = '전체' | '보유' | '미보유';
type SortKey = 'id_asc' | 'id_desc' | 'name_asc' | 'name_desc';

export default function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const collectionId = Number(id);

  const [ownedFilter, setOwnedFilter] = useState<OwnedFilter>('전체');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('id_asc');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedRarities, setSelectedRarities] = useState<Set<string>>(new Set());
  const [selectedTans, setSelectedTans] = useState<Set<string>>(new Set());
  const [selectedPackTypes, setSelectedPackTypes] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<CollectionItem | null>(null);

  const collection = useLiveQuery(() => db.collections.get(collectionId), [collectionId]);
  const items = useLiveQuery(
    () => db.items.where('collectionId').equals(collectionId).toArray(),
    [collectionId]
  );

  // ID 파싱: 팩 종류 + 탄 추출
  // HV-XX-YYY → 확장팩, 탄=XX
  // HVD-XX-YYY → 스타터팩, 탄=XX
  // HVP-YYY → 프로모카드, 탄=없음
  function parseIdFields(itemId: string): { packType: string | null; tan: string | null } {
    const parts = itemId.split('-');
    const prefix = parts[0];
    let packType: string | null = null;
    let tan: string | null = null;

    if (prefix === 'HV') packType = '확장팩';
    else if (prefix === 'HVD') packType = '스타터팩';
    else if (prefix === 'HVP') packType = '프로모카드';

    if (packType && prefix !== 'HVP' && parts[1] && /^\d+$/.test(parts[1])) {
      tan = String(parseInt(parts[1])); // "01" → "1"
    }

    return { packType, tan };
  }

  // 팩 종류 고유값 (고정 순서)
  const allPackTypes = useMemo(() => {
    const found = new Set<string>();
    items?.forEach((item) => {
      const { packType } = parseIdFields(item.itemId);
      if (packType) found.add(packType);
    });
    return ['확장팩', '스타터팩', '프로모카드'].filter((p) => found.has(p));
  }, [items]);

  // 탄 고유값 (숫자 오름차순, 프로모 제외)
  const allTans = useMemo(() => {
    const s = new Set<string>();
    items?.forEach((item) => {
      const { tan } = parseIdFields(item.itemId);
      if (tan) s.add(tan);
    });
    return [...s].sort((a, b) => parseInt(a) - parseInt(b));
  }, [items]);

  // 타입/레어리티 고유값 추출
  const allTypes = useMemo(() => {
    const s = new Set<string>();
    items?.forEach((item) => {
      if (typeof item.metadata.type === 'string') s.add(item.metadata.type);
    });
    return [...s].sort();
  }, [items]);

  const allRarities = useMemo(() => {
    const s = new Set<string>();
    items?.forEach((item) => {
      if (typeof item.metadata.rarity === 'string') s.add(item.metadata.rarity);
    });
    return [...s];
  }, [items]);

  // 필터 + 정렬
  const filtered = useMemo(() => {
    if (!items) return [];
    const q = search.toLowerCase();
    return items
      .filter((item) => {
        if (ownedFilter === '보유' && item.count === 0) return false;
        if (ownedFilter === '미보유' && item.count > 0) return false;
        const { packType, tan } = parseIdFields(item.itemId);
        if (selectedPackTypes.size > 0) {
          if (!selectedPackTypes.has(packType ?? '')) return false;
        }
        if (selectedTans.size > 0) {
          if (!selectedTans.has(tan ?? '')) return false;
        }
        if (selectedTypes.size > 0) {
          const t = typeof item.metadata.type === 'string' ? item.metadata.type : '';
          if (!selectedTypes.has(t)) return false;
        }
        if (selectedRarities.size > 0) {
          const r = typeof item.metadata.rarity === 'string' ? item.metadata.rarity : '';
          if (!selectedRarities.has(r)) return false;
        }
        if (q && !item.name.toLowerCase().includes(q) && !item.itemId.toLowerCase().includes(q)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortKey) {
          case 'id_asc':   return a.itemId.localeCompare(b.itemId);
          case 'id_desc':  return b.itemId.localeCompare(a.itemId);
          case 'name_asc': return a.name.localeCompare(b.name);
          case 'name_desc':return b.name.localeCompare(a.name);
        }
      });
  }, [items, ownedFilter, selectedPackTypes, selectedTans, selectedTypes, selectedRarities, search, sortKey]);

  function toggle<T extends string>(setState: React.Dispatch<React.SetStateAction<Set<T>>>, val: T) {
    setState((prev) => {
      const next = new Set(prev);
      next.has(val) ? next.delete(val) : next.add(val);
      return next;
    });
  }

  // 반응형 컬럼 수 감지
  const [cols, setCols] = useState(2);
  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      if (w >= 1024) setCols(5);
      else if (w >= 768) setCols(4);
      else if (w >= 640) setCols(3);
      else setCols(2);
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // 아이템을 행 단위로 그루핑
  const rows = useMemo(() => {
    const result: (typeof filtered)[] = [];
    for (let i = 0; i < filtered.length; i += cols) {
      result.push(filtered.slice(i, i + cols));
    }
    return result;
  }, [filtered, cols]);

  // 가상화: 윈도우 스크롤 기준
  const gridRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 400,
    overscan: 3,
    scrollMargin: gridRef.current?.offsetTop ?? 0,
  });

  async function handleCountChange(itemDbId: number, count: number) {
    await db.items.update(itemDbId, { count });
  }

  async function handleItemDelete(item: CollectionItem) {
    await db.items.delete(item.id!);
    await db.collections.where('id').equals(collectionId).modify((col) => {
      col.totalItems = Math.max(0, col.totalItems - 1);
    });
    setDeletingItem(null);
  }

  const ownedCount = items?.filter((i) => i.count > 0).length ?? 0;
  const totalCount = items?.length ?? 0;
  const pct = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;

  if (collection === undefined || items === undefined) {
    return <div className="min-h-screen bg-app-bg flex items-center justify-center text-gray-300">로딩 중...</div>;
  }

  if (collection === null) {
    return (
      <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">컬렉션을 찾을 수 없습니다.</p>
        <Link href="/" className="text-primary-600 hover:underline text-sm">홈으로 돌아가기</Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-app-bg">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* 헤더 */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <Link href="/" className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors">
              <ChevronLeft size={16} />
              목록으로
            </Link>
            <h1 className="text-xl font-extrabold text-gray-900 mt-2">{collection.name}</h1>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors flex-shrink-0 mt-6"
          >
            <Plus size={16} strokeWidth={2.5} />
            아이템 추가
          </button>
        </div>

        {/* 통계 */}
        <div className="bg-surface rounded-2xl border border-gray-200 p-5 mb-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              <span className="text-primary-600 font-bold text-lg">{ownedCount}</span>
              <span className="text-gray-400"> / {totalCount} 보유</span>
            </span>
            <span className="text-primary-600 font-bold text-lg">{pct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div className="bg-primary-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* 검색 + 정렬 (features 5, 6) */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="이름 또는 ID로 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-surface"
            />
            {/* 검색 지우기 버튼 (feature 5) */}
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {/* 정렬 드롭다운 (feature 6) */}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-600 bg-surface focus:outline-none focus:ring-2 focus:ring-primary-300 cursor-pointer"
          >
            <option value="id_asc">ID 오름차순</option>
            <option value="id_desc">ID 내림차순</option>
            <option value="name_asc">이름 오름차순</option>
            <option value="name_desc">이름 내림차순</option>
          </select>
        </div>

        {/* 필터 칩 */}
        {(allPackTypes.length > 0 || allTans.length > 0 || allTypes.length > 0 || allRarities.length > 0) && (
          <div className="bg-surface rounded-2xl border border-gray-200 p-4 mb-4 flex flex-col gap-3">
            {/* 팩 종류 필터 */}
            {allPackTypes.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-400 w-10 flex-shrink-0">팩</span>
                {allPackTypes.map((p) => (
                  <button
                    key={p}
                    onClick={() => toggle(setSelectedPackTypes, p)}
                    className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
                      selectedPackTypes.has(p)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            {/* 탄 필터 */}
            {allTans.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-400 w-10 flex-shrink-0">탄</span>
                {allTans.map((tan) => (
                  <button
                    key={tan}
                    onClick={() => toggle(setSelectedTans, tan)}
                    className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
                      selectedTans.has(tan)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tan}탄
                  </button>
                ))}
              </div>
            )}
            {/* 타입 필터 */}
            {allTypes.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-400 w-10 flex-shrink-0">타입</span>
                {allTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggle(setSelectedTypes, t)}
                    className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
                      selectedTypes.has(t)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
            {/* 레어도 필터 */}
            {allRarities.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-400 w-10 flex-shrink-0">레어도</span>
                {allRarities.map((r) => (
                  <button
                    key={r}
                    onClick={() => toggle(setSelectedRarities, r)}
                    className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
                      selectedRarities.has(r)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 보유 필터 탭 */}
        <div className="flex rounded-xl border border-gray-200 bg-surface overflow-hidden mb-6">
          {(['전체', '보유', '미보유'] as OwnedFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setOwnedFilter(f)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                ownedFilter === f ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-app-bg'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* 결과 수 */}
        <p className="text-xs text-gray-400 mb-3">{filtered.length}개 표시 중</p>

        {/* 아이템 그리드 (가상화) */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-300">
            <p>조건에 맞는 아이템이 없어요</p>
          </div>
        ) : (
          <div
            ref={gridRef}
            style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
                }}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-3">
                  {rows[virtualRow.index].map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onCountChange={(count) => handleCountChange(item.id!, count)}
                      onEdit={() => setEditingItem(item)}
                      onDelete={() => setDeletingItem(item)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddItemModal
          collectionId={collectionId}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editingItem && (
        <EditItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}

      {deletingItem && (
        <DeleteConfirmModal
          title="아이템 삭제"
          description={
            <><span className="font-semibold text-gray-700">"{deletingItem.name}"</span>을 삭제합니다. 이 작업은 되돌릴 수 없습니다.</>
          }
          onConfirm={() => handleItemDelete(deletingItem)}
          onCancel={() => setDeletingItem(null)}
        />
      )}
    </main>
  );
}
