'use client';

import { useEffect, useRef, useState } from 'react';
import { Hexagon } from 'lucide-react';
import { downloadBackup, exportBackup, parseBackupFile, restoreBackup, type BackupFile } from '@/lib/backup';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';

export default function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pendingBackup, setPendingBackup] = useState<BackupFile | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function handleExport() {
    setBusy(true);
    setError('');
    try {
      const backup = await exportBackup();
      downloadBackup(backup);
    } finally {
      setBusy(false);
      setOpen(false);
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
      setOpen(false);
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
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="설정"
        className="w-9 h-9 flex items-center justify-center text-gray-700 hover:text-gray-900 transition-colors"
      >
        <Hexagon size={24} strokeWidth={2} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl border border-gray-200 shadow-lg py-1.5 z-20">
          <button
            onClick={handleExport}
            disabled={busy}
            className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            내보내기
          </button>
          <button
            onClick={handleImportClick}
            disabled={busy}
            className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            가져오기
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && (
        <p className="absolute right-0 mt-1 w-56 text-xs text-rose-500 bg-rose-50 rounded-lg px-2 py-1.5 z-20">{error}</p>
      )}

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
