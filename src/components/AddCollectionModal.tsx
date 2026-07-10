'use client';

import { useState } from 'react';
import { X, FolderOpen, FileSpreadsheet, Pencil, Plus } from 'lucide-react';
import { db } from '@/lib/db';
import FileUpload from './FileUpload';
import ExcelUpload from './ExcelUpload';

type Mode = 'json' | 'excel' | 'manual';
interface ManualItem { id: string; name: string; imgSrc: string; }

const EMPTY_MANUAL_ITEM: ManualItem = { id: '', name: '', imgSrc: '' };

interface Props {
  onClose: () => void;
}

export default function AddCollectionModal({ onClose }: Props) {
  const [mode, setMode] = useState<Mode>('json');
  const [manualName, setManualName] = useState('');
  const [manualCoverImage, setManualCoverImage] = useState('');
  const [manualItems, setManualItems] = useState<ManualItem[]>([{ ...EMPTY_MANUAL_ITEM }]);
  const [nameError, setNameError] = useState('');
  const [itemsError, setItemsError] = useState('');
  const [saving, setSaving] = useState(false);

  function updateManualItem(i: number, field: keyof ManualItem, value: string) {
    setItemsError('');
    setManualItems((prev) => {
      const next = prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item);
      const updated = next[i];
      const isLastRow = i === next.length - 1;
      // ID와 이름이 모두 채워진 마지막 행이면 아래에 새 빈 행을 자동으로 추가
      if (isLastRow && updated.id.trim() && updated.name.trim()) {
        next.push({ ...EMPTY_MANUAL_ITEM });
      }
      return next;
    });
  }

  function addManualItemRow() {
    setManualItems((prev) => [...prev, { ...EMPTY_MANUAL_ITEM }]);
  }

  function removeManualItemRow(i: number) {
    setManualItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function createManualCollection(e: React.FormEvent) {
    e.preventDefault();
    setNameError('');
    setItemsError('');
    if (!manualName.trim()) { setNameError('컬렉션 이름을 입력하세요.'); return; }

    // 완전히 빈 행(자동 추가된 마지막 placeholder 등)은 무시하고,
    // 일부만 채워진 행이 있으면 컬렉션을 만들지 않음
    const meaningfulItems = manualItems.filter(
      (item) => item.id.trim() || item.name.trim() || item.imgSrc.trim()
    );
    const hasIncompleteRow = meaningfulItems.some((item) => !item.id.trim() || !item.name.trim());
    if (hasIncompleteRow) {
      setItemsError('ID와 이름이 비어있는 행이 있어요. 모두 입력하거나 행을 삭제해주세요.');
      return;
    }
    // 컬렉션 이름과 마찬가지로 ID/이름도 필수이므로, 아이템이 하나도 없으면 만들 수 없음
    if (meaningfulItems.length === 0) {
      setItemsError('아이템을 하나 이상 입력하세요 (ID, 이름 필수).');
      return;
    }

    setSaving(true);
    try {
      const collectionId = await db.collections.add({
        name: manualName.trim(),
        fileName: '직접 입력',
        totalItems: meaningfulItems.length,
        createdAt: new Date(),
        ...(manualCoverImage.trim() ? { coverImage: manualCoverImage.trim() } : {}),
      });
      await db.items.bulkAdd(
        meaningfulItems.map((item) => ({
          collectionId: collectionId as number,
          itemId: item.id.trim(),
          name: item.name.trim(),
          count: 0,
          metadata: item.imgSrc.trim() ? { img_src: item.imgSrc.trim() } : {},
        }))
      );
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-800 text-lg">새 컬렉션 만들기</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500">
            <X size={20} />
          </button>
        </div>

        {/* 탭 */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden flex-shrink-0">
          <button
            onClick={() => setMode('json')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-sm font-semibold transition-colors ${mode === 'json' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <FolderOpen size={16} />
            JSON
          </button>
          <button
            onClick={() => setMode('excel')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-sm font-semibold transition-colors ${mode === 'excel' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <FileSpreadsheet size={16} />
            엑셀/시트
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-sm font-semibold transition-colors ${mode === 'manual' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Pencil size={16} />
            직접 입력
          </button>
        </div>

        {mode === 'json' && <FileUpload onSuccess={onClose} />}

        {mode === 'excel' && <ExcelUpload onSuccess={onClose} />}

        {mode === 'manual' && (
          <form onSubmit={createManualCollection} className="flex flex-col gap-4">
            {/* 컬렉션 이름 */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">컬렉션 이름 *</label>
              <input
                value={manualName}
                onChange={(e) => { setManualName(e.target.value); setNameError(''); }}
                placeholder="예: 나만의 컬렉션"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                autoFocus
              />
              {nameError && <p className="text-xs text-rose-500 mt-1">{nameError}</p>}
            </div>

            {/* 컬렉션 이미지 */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">
                컬렉션 이미지 링크 <span className="font-normal text-gray-300">(선택)</span>
              </label>
              <input
                value={manualCoverImage}
                onChange={(e) => setManualCoverImage(e.target.value)}
                placeholder="https://..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>

            {/* 아이템 목록 */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-500">아이템 목록</label>
              {/* 헤더 */}
              <div className="grid grid-cols-[1fr_1.3fr_1.5fr_auto] gap-2 px-1">
                <span className="text-[10px] font-semibold text-gray-400">
                  ID <span className="font-normal text-gray-300">(필수)</span>
                </span>
                <span className="text-[10px] font-semibold text-gray-400">
                  이름 <span className="font-normal text-gray-300">(필수)</span>
                </span>
                <span className="text-[10px] font-semibold text-gray-400">
                  이미지 주소 <span className="font-normal text-gray-300">(선택)</span>
                </span>
                <span className="w-6" />
              </div>
              {/* 아이템 행 */}
              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                {manualItems.map((item, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1.3fr_1.5fr_auto] gap-2 items-center">
                    <input
                      value={item.id}
                      onChange={(e) => updateManualItem(i, 'id', e.target.value)}
                      placeholder="ID"
                      className="min-w-0 border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-300"
                    />
                    <input
                      value={item.name}
                      onChange={(e) => updateManualItem(i, 'name', e.target.value)}
                      placeholder="이름"
                      className="min-w-0 border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-300"
                    />
                    <input
                      value={item.imgSrc}
                      onChange={(e) => updateManualItem(i, 'imgSrc', e.target.value)}
                      placeholder="https://..."
                      className="min-w-0 border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-300"
                    />
                    <button
                      type="button"
                      onClick={() => removeManualItemRow(i)}
                      className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-rose-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addManualItemRow}
                className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-700 font-semibold text-left mt-1"
              >
                <Plus size={12} strokeWidth={2.5} />
                행 추가
              </button>
              {itemsError && <p className="text-xs text-rose-500">{itemsError}</p>}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? '저장 중...' : '컬렉션 만들기'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
