'use client';

import { useRef, useState } from 'react';
import { downloadBackup, exportBackup, parseBackupFile, restoreBackup, type BackupFile } from '@/lib/backup';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';

export default function ExportImportBar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pendingBackup, setPendingBackup] = useState<BackupFile | null>(null);

  async function handleExport() {
    setBusy(true);
    setError('');
    try {
      const backup = await exportBackup();
      downloadBackup(backup);
    } finally {
      setBusy(false);
    }
  }

  function handleImportClick() {
    setError('');
    inputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError('');
    try {
      const text = await file.text();
      const backup = parseBackupFile(JSON.parse(text));
      setPendingBackup(backup);
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일을 읽는 중 오류가 발생했습니다.');
    }
  }

  async function confirmImport() {
    if (!pendingBackup) return;
    setBusy(true);
    setError('');
    try {
      await restoreBackup(pendingBackup);
    } catch (err) {
      setError(err instanceof Error ? err.message : '가져오기 중 오류가 발생했습니다.');
    } finally {
      setBusy(false);
      setPendingBackup(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <button
          onClick={handleExport}
          disabled={busy}
          className="text-xs font-semibold text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
        >
          내보내기
        </button>
        <button
          onClick={handleImportClick}
          disabled={busy}
          className="text-xs font-semibold text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
        >
          가져오기
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {error && <p className="text-xs text-rose-500">{error}</p>}

      {pendingBackup && (
        <DeleteConfirmModal
          title="데이터 가져오기"
          description={
            <>
              이 파일로 <span className="font-semibold text-gray-700">이 기기의 모든 컬렉션 데이터</span>를
              덮어씁니다 (컬렉션 {pendingBackup.collections.length}개). 현재 데이터는 사라지며 되돌릴 수 없습니다.
            </>
          }
          confirmLabel="가져오기"
          onConfirm={confirmImport}
          onCancel={() => setPendingBackup(null)}
        />
      )}
    </div>
  );
}
