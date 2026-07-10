'use client';

import { useRef, useState } from 'react';
import { Loader2, FileSpreadsheet } from 'lucide-react';
import { parseCollectionExcel } from '@/lib/parseExcel';
import { parseCollectionCsv } from '@/lib/parseCsv';
import { createCollectionFromItems } from '@/lib/collectionActions';

interface Props {
  onSuccess: () => void;
}

export default function ExcelUpload({ onSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    const isCsv = /\.csv$/i.test(file.name);
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    if (!isCsv && !isExcel) {
      setError('엑셀(.xlsx, .xls) 또는 CSV 파일만 업로드할 수 있습니다.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const items = isCsv ? await parseCollectionCsv(file) : await parseCollectionExcel(file);
      const collectionName = file.name.replace(/\.(xlsx|xls|csv)$/i, '');
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
          <FileSpreadsheet size={36} className="text-gray-400" />
        )}
        <p className="text-sm font-medium text-gray-600">
          {loading ? '처리 중...' : '엑셀/CSV 파일을 드래그하거나 클릭해서 업로드'}
        </p>
        <p className="text-xs text-gray-400 text-center leading-relaxed">
          첫 번째 행에 id, name 열 필요 · .xlsx / .xls / .csv
          <br />
          구글 시트는 파일 → 다운로드 → xlsx 또는 csv로 내보낸 후 업로드하세요
        </p>
      </div>

      {error && (
        <p className="text-sm text-rose-500 bg-rose-50 rounded-xl px-4 py-2">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={onInputChange}
      />
    </div>
  );
}
