'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import {
  ChevronLeft, Plus, X, Eye, Pencil as PencilIcon, LibraryBig, Star, Filter,
} from 'lucide-react';
import { db } from '@/lib/db';
import ItemCard from '@/components/ItemCard';
import AddItemModal from '@/components/AddItemModal';
import EditItemModal from '@/components/EditItemModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import { type CollectionItem } from '@/lib/types';

type OwnedFilter = '보유' | '미보유' | '전체';
type SortKey = 'id_asc' | 'id_desc' | 'name_asc' | 'name_desc';
type PageMode = 'view' | 'edit';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'id_asc', label: 'ID 오름차순' },
  { value: 'id_desc', label: 'ID 내림차순' },
  { value: 'name_asc', label: '이름 오름차순' },
  { value: 'name_desc', label: '이름 내림차순' },
];

export default function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const collectionId = Number(id);

  const [mode, setMode] = useState<PageMode>('view');
  const [ownedFilter, setOwnedFilter] = useState<OwnedFilter>('전체');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('id_asc');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedRarities, setSelectedRarities] = useState<Set<string>>(new Set());
  const [selectedTans, setSelectedTans] = useState<Set<string>>(new Set());
  const [selectedPackTypes, setSelectedPackTypes] = useState<Set<string>>(new Set());
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<CollectionItem | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const collection = useLiveQuery(() => db.collections.get(collectionId), [collectionId]);
  const items = useLiveQuery(
    () => db.items.where('collectionId').equals(collectionId).toArray(),
    [collectionId]
  );

  // ID 파싱: 팩 종류 + 탄 추출
  // HV-XX-YYY → 확장팩, 탄=XX
  // HVD-XX-YYY → 스타터팩, 탄=XX
  // HVP-YYY → 프로모카드, 탄=없음
  // 탄 추출 자체는 특정 컬렉션에 국한되지 않고, "PREFIX-NN-..." 형태(3개 이상 세그먼트이고
  // 두 번째 세그먼트가 숫자)인 ID라면 업로드한 JSON 종류에 관계없이 공통으로 동작한다.
  function parseIdFields(itemId: string): { packType: string | null; tan: string | null } {
    const parts = itemId.split('-');
    const prefix = parts[0];
    let packType: string | null = null;
    let tan: string | null = null;

    if (prefix === 'HV') packType = '확장팩';
    else if (prefix === 'HVD') packType = '스타터팩';
    else if (prefix === 'HVP') packType = '프로모카드';

    if (parts.length >= 3 && /^\d+$/.test(parts[1])) {
      tan = String(parseInt(parts[1], 10)); // "01" → "1"
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
          case 'id_asc': return a.itemId.localeCompare(b.itemId);
          case 'id_desc': return b.itemId.localeCompare(a.itemId);
          case 'name_asc': return a.name.localeCompare(b.name);
          case 'name_desc': return b.name.localeCompare(a.name);
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

  const activeFilterCount =
    selectedPackTypes.size + selectedTans.size + selectedTypes.size + selectedRarities.size;

  // 상단바 높이 측정 (하위 sticky 영역이 그 바로 아래에 붙도록)
  // collection과 items 둘 다 로딩 중일 때는 아래 로딩 분기가 렌더되어 headerRef가 아직
  // DOM에 붙지 않으므로, 두 값이 각각 로드되는 시점마다 다시 측정해야 한다
  // (collection만 먼저 로드되고 items가 나중에 로드되는 경우가 있어 collection 하나만
  // 의존성으로 두면 그 시점을 놓칠 수 있다).
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  useEffect(() => {
    function measure() {
      if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [collection, items]);

  // 스크롤 방향 감지: 아래로 스크롤하면 검색/필터/보유탭을 접고, 위로 스크롤하면 펼침
  // 접힘/펼침으로 콘텐츠 높이가 바뀌면 브라우저가 scrollY를 보정하며 가짜 스크롤 이벤트를
  // 발생시킬 수 있어서(무한 접힘↔펼침 반복 방지), 일정 크기 이상의 델타만 반영하고
  // 상태를 바꾼 직후에는 트랜지션이 끝날 때까지 스크롤 이벤트를 잠깐 무시한다.
  const [subHeaderCollapsed, setSubHeaderCollapsed] = useState(false);
  const lastScrollYRef = useRef(0);
  const ignoreUntilRef = useRef(0);
  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      const now = Date.now();
      if (now < ignoreUntilRef.current) {
        lastScrollYRef.current = y;
        return;
      }
      const delta = y - lastScrollYRef.current;
      if (delta > 8 && y > headerHeight + 40) {
        setSubHeaderCollapsed((collapsed) => {
          if (!collapsed) ignoreUntilRef.current = now + 400;
          return true;
        });
      } else if (delta < -8) {
        setSubHeaderCollapsed((collapsed) => {
          if (collapsed) ignoreUntilRef.current = now + 400;
          return false;
        });
      }
      lastScrollYRef.current = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [headerHeight]);

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

  function startEditTitle() {
    if (!collection) return;
    setTitleDraft(collection.name);
    setEditingTitle(true);
  }

  async function commitTitle() {
    const trimmed = titleDraft.trim();
    if (collection && trimmed && trimmed !== collection.name) {
      await db.collections.update(collectionId, { name: trimmed });
    }
    setEditingTitle(false);
  }

  const ownedCount = items?.filter((i) => i.count > 0).length ?? 0;
  const totalCount = items?.length ?? 0;
  const pct = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;

  if (collection === undefined || items === undefined) {
    return <div className="min-h-screen bg-white flex items-center justify-center text-gray-300">로딩 중...</div>;
  }

  if (collection === null) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">컬렉션을 찾을 수 없습니다.</p>
        <Link href="/" className="text-primary-600 hover:underline text-sm">홈으로 돌아가기</Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white pb-24">
      {/* 상단 바: 뒤로가기 / 타이틀+진행률 바(중앙) / 추가 — 스크롤해도 항상 고정 */}
      <div ref={headerRef} className="fixed top-0 inset-x-0 z-40 bg-white">
        <div className="max-w-5xl mx-auto px-4 pt-6 pb-5 flex items-center gap-2">
          <Link href="/" className="w-9 h-9 flex-shrink-0 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronLeft size={20} />
          </Link>

          <div className="flex-1 min-w-0 flex flex-col items-center gap-1.5">
            {editingTitle ? (
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                  else if (e.key === 'Escape') setEditingTitle(false);
                }}
                className="w-full text-base font-extrabold text-gray-900 text-center bg-transparent border-b-2 border-primary-400 focus:outline-none px-1"
              />
            ) : (
              <h1
                onClick={startEditTitle}
                title="클릭하여 이름 수정"
                className="text-base font-extrabold text-gray-900 truncate text-center max-w-full cursor-pointer hover:text-primary-600 transition-colors"
              >
                {collection.name}
              </h1>
            )}
            <div className="flex items-center gap-2 w-full">
              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                <div className="bg-gray-800 h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[10px] font-semibold text-gray-400 flex-shrink-0">{pct}%</span>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            title="아이템 추가"
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center text-gray-700 hover:text-gray-900 transition-colors"
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-6" style={{ paddingTop: headerHeight }}>

        {/* 검색/필터/보유탭/결과수/정렬: 아래로 스크롤하면 접히고 위로 스크롤하면 펼쳐짐 */}
        <div className="sticky z-30 bg-white" style={{ top: headerHeight }}>
          <div
            className={`overflow-hidden transition-[max-height,opacity] duration-300 ${subHeaderCollapsed ? 'max-h-0 opacity-0' : 'max-h-[280px] opacity-100'
              }`}
          >
            {/* 검색 + 필터/정렬 버튼 */}
            <div className="flex gap-2 mb-4 pt-1">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="이름 또는 ID 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-surface"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilterSheet(true)}
                className="relative w-11 h-11 flex-shrink-0 rounded-xl border border-gray-200 bg-surface flex items-center justify-center text-gray-500 hover:bg-app-bg transition-colors"
              >
                <Filter size={18} />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* 보유 필터 탭 */}
            <div className="flex rounded-xl border border-gray-200 bg-surface overflow-hidden mb-4">
              {(['보유', '미보유', '전체'] as OwnedFilter[]).map((f) => {
                const count = f === '보유' ? ownedCount : f === '미보유' ? totalCount - ownedCount : totalCount;
                return (
                  <button
                    key={f}
                    onClick={() => setOwnedFilter(f)}
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors ${ownedFilter === f ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-app-bg'
                      }`}
                  >
                    {f} <span className="opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* 결과 수 + 정렬 */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400">{filtered.length}개 표시 중</p>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="text-xs font-semibold text-gray-500 bg-transparent focus:outline-none cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

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
                      mode={mode}
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

      {/* 보기/편집 모드 전환 FAB */}
      <button
        onClick={() => setMode((m) => (m === 'view' ? 'edit' : 'view'))}
        title={mode === 'view' ? '편집 모드로 전환' : '보기 모드로 전환'}
        className="fixed bottom-20 right-5 z-30 w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-lg flex items-center justify-center transition-colors"
      >
        {mode === 'view' ? <PencilIcon size={22} /> : <Eye size={22} />}
      </button>

      {/* 하단 탭 메뉴 */}
      <nav className="fixed bottom-0 inset-x-0 flex justify-center gap-16 py-3 bg-white">
        <Link href="/" className="flex flex-col items-center gap-1 px-4 py-1">
          <LibraryBig size={20} className="text-gray-900" />
          <span className="text-xs font-semibold text-gray-900">Binder</span>
        </Link>
        <Link href="/" className="flex flex-col items-center gap-1 px-4 py-1">
          <Star size={20} className="text-gray-300" />
          <span className="text-xs font-semibold text-gray-300">Wish</span>
        </Link>
      </nav>

      {/* 필터/정렬 바텀시트 */}
      {showFilterSheet && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end"
          onClick={() => setShowFilterSheet(false)}
        >
          <div
            className="bg-white rounded-t-2xl shadow-xl w-full max-h-[80vh] overflow-y-auto p-5 flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg">필터</h2>
              <button onClick={() => setShowFilterSheet(false)} className="text-gray-300 hover:text-gray-500">
                <X size={20} />
              </button>
            </div>

            {/* 팩 종류 필터 */}
            {allPackTypes.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-gray-400">팩</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {allPackTypes.map((p) => (
                    <button
                      key={p}
                      onClick={() => toggle(setSelectedPackTypes, p)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${selectedPackTypes.has(p)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 탄 필터 */}
            {allTans.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-gray-400">탄</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {allTans.map((tan) => (
                    <button
                      key={tan}
                      onClick={() => toggle(setSelectedTans, tan)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${selectedTans.has(tan)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {tan}탄
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 타입 필터 */}
            {allTypes.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-gray-400">타입</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {allTypes.map((t) => (
                    <button
                      key={t}
                      onClick={() => toggle(setSelectedTypes, t)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${selectedTypes.has(t)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 레어도 필터 */}
            {allRarities.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-gray-400">레어도</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {allRarities.map((r) => (
                    <button
                      key={r}
                      onClick={() => toggle(setSelectedRarities, r)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${selectedRarities.has(r)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setSelectedPackTypes(new Set());
                  setSelectedTans(new Set());
                  setSelectedTypes(new Set());
                  setSelectedRarities(new Set());
                }}
                className="text-sm font-semibold text-gray-400 hover:text-gray-600 self-center"
              >
                필터 초기화
              </button>
            )}
          </div>
        </div>
      )}

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
            <><span className="font-semibold text-gray-700">&quot;{deletingItem.name}&quot;</span>을 삭제합니다. 이 작업은 되돌릴 수 없습니다.</>
          }
          onConfirm={() => handleItemDelete(deletingItem)}
          onCancel={() => setDeletingItem(null)}
        />
      )}
    </main>
  );
}
