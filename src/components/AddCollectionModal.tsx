'use client';

import { useState } from 'react';
import { X, FolderOpen, FileSpreadsheet, Pencil, Plus } from 'lucide-react';
import { db } from '@/lib/db';
import FileUpload from './FileUpload';
import ExcelUpload from './ExcelUpload';

type Mode = 'json' | 'excel' | 'manual';
interface ManualItem { id: string; name: string; }

interface Props {
  onClose: () => void;
}

export default function AddCollectionModal({ onClose }: Props) {
  const [mode, setMode] = useState<Mode>('json');
  const [manualName, setManualName] = useState('');
  const [manualItems, setManualItems] = useState<ManualItem[]>([{ id: '', name: '' }]);
  const [manualError, setManualError] = useState('');
  const [saving, setSaving] = useState(false);

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
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-sm font-semibold transition-colors ${mode === 'json' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <FolderOpen size={16} />
            JSON
          </button>
          <button
            onClick={() => setMode('excel')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-sm font-semibold transition-colors ${mode === 'excel' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <FileSpreadsheet size={16} />
            엑셀/시트
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-sm font-semibold transition-colors ${mode === 'manual' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
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
                      className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-rose-400 disabled:opacity-20 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addManualItemRow}
                className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-semibold text-left mt-1"
              >
                <Plus size={12} strokeWidth={2.5} />
                행 추가
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
    </div>
  );
}
