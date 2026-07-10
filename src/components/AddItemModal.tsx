'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { db } from '@/lib/db';

interface Props {
  collectionId: number;
  onClose: () => void;
}

interface ExtraField {
  key: string;
  value: string;
}

export default function AddItemModal({ collectionId, onClose }: Props) {
  const [itemId, setItemId] = useState('');
  const [name, setName] = useState('');
  const [detail, setDetail] = useState('');
  const [extraFields, setExtraFields] = useState<ExtraField[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!itemId.trim() || !name.trim()) {
      setError('id와 name은 필수입니다.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const metadata: Record<string, unknown> = {};

      // detail 문자열 → 객체 파싱 ("key:value / key:value / ...")
      if (detail.trim()) {
        const detailObj: Record<string, string> = {};
        for (const part of detail.split('/')) {
          const colonIdx = part.indexOf(':');
          if (colonIdx > 0) {
            const k = part.slice(0, colonIdx).trim();
            const v = part.slice(colonIdx + 1).trim();
            if (k) detailObj[k] = v;
          }
        }
        if (Object.keys(detailObj).length > 0) metadata['detail'] = detailObj;
      }

      for (const field of extraFields) {
        if (field.key.trim()) metadata[field.key.trim()] = field.value;
      }
      await db.items.add({
        collectionId,
        itemId: itemId.trim(),
        name: name.trim(),
        count: 0,
        metadata,
      });
      await db.collections.where('id').equals(collectionId).modify((col) => {
        col.totalItems += 1;
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  function addField() {
    setExtraFields((prev) => [...prev, { key: '', value: '' }]);
  }

  function updateField(i: number, key: string, value: string) {
    setExtraFields((prev) => prev.map((f, idx) => (idx === i ? { key, value } : f)));
  }

  function removeField(i: number) {
    setExtraFields((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-800 text-lg">아이템 직접 추가</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">ID *</label>
            <input
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              placeholder="예: HV-12-001"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 히나타 쇼요"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Detail</label>
            <input
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="소속:카라스노 / 학년:1학년 / 포지션:MB"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              형식: <span className="font-mono">key:value / key:value / ...</span>
            </p>
          </div>

          {extraFields.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-gray-400">추가 속성 (선택)</p>
              {extraFields.map((field, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    value={field.key}
                    onChange={(e) => updateField(i, e.target.value, field.value)}
                    placeholder="키"
                    className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <input
                    value={field.value}
                    onChange={(e) => updateField(i, field.key, e.target.value)}
                    placeholder="값"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <button
                    type="button"
                    onClick={() => removeField(i)}
                    className="text-gray-300 hover:text-rose-400 flex-shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={addField}
            className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 text-left font-semibold"
          >
            <Plus size={12} strokeWidth={2.5} />
            속성 추가
          </button>

          {error && (
            <p className="text-xs text-rose-500 bg-rose-50 rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? '저장 중...' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
