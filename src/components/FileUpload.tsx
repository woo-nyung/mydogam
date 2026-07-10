'use client';

import { useRef, useState } from 'react';
import { Loader2, FolderOpen } from 'lucide-react';
import { parseCollectionJson } from '@/lib/parseJson';
import { createCollectionFromItems } from '@/lib/collectionActions';

interface Props {
  onSuccess: () => void;
}

export default function FileUpload({ onSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!file.name.endsWith('.json')) {
      setError('JSON 파일만 업로드할 수 있습니다.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const items = parseCollectionJson(json);

      const collectionName = file.name.replace(/\.json$/i, '');
      await createCollectionFromItems(collectionName, file.name, items);

      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : '파일 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
          dragging ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
        }`}
      >
        {loading ? (
          <Loader2 size={36} className="text-gray-400 animate-spin" />
        ) : (
          <FolderOpen size={36} className="text-gray-400" />
        )}
        <p className="text-sm font-medium text-gray-600">
          {loading ? '처리 중...' : 'JSON 파일을 드래그하거나 클릭해서 업로드'}
        </p>
        <p className="text-xs text-gray-400">필수 키: id, name</p>
      </div>

      {error && (
        <p className="text-sm text-rose-500 bg-rose-50 rounded-xl px-4 py-2">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={onInputChange}
      />
    </div>
  );
}
