'use client';

import { useEffect, useState } from 'react';
import { Loader2, Download, Check } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { parseCollectionJson } from '@/lib/parseJson';
import { createCollectionFromItems } from '@/lib/collectionActions';
import {
  fetchPresetManifest,
  fetchPresetCollectionJson,
  type PresetCollectionEntry,
} from '@/lib/presetCollections';

interface Props {
  onSuccess: () => void;
}

export default function PresetCollectionPicker({ onSuccess }: Props) {
  const [entries, setEntries] = useState<PresetCollectionEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addingFile, setAddingFile] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const existingFileNames = useLiveQuery(async () => {
    const collections = await db.collections.toArray();
    return new Set(collections.map((c) => c.fileName));
  });

  useEffect(() => {
    fetchPresetManifest()
      .then(setEntries)
      .catch((e) => setLoadError(e instanceof Error ? e.message : '목록을 불러오지 못했습니다.'));
  }, []);

  async function handleAdd(entry: PresetCollectionEntry) {
    setAddError(null);
    setAddingFile(entry.file);
    try {
      const json = await fetchPresetCollectionJson(entry.file);
      const items = parseCollectionJson(json);
      await createCollectionFromItems(entry.name, entry.file, items);
      onSuccess();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : '컬렉션을 추가하지 못했습니다.');
    } finally {
      setAddingFile(null);
    }
  }

  if (loadError) {
    return <p className="text-sm text-rose-500 bg-rose-50 rounded-xl px-4 py-2">{loadError}</p>;
  }

  if (!entries) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 size={28} className="text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
        {entries.map((entry) => {
          const already = existingFileNames?.has(entry.file);
          const isAdding = addingFile === entry.file;
          return (
            <button
              key={entry.file}
              type="button"
              onClick={() => handleAdd(entry)}
              disabled={isAdding}
              className="flex items-center justify-between gap-3 border border-gray-200 rounded-xl px-4 py-3 text-left hover:border-primary-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <span className="text-sm font-semibold text-gray-700">{entry.name}</span>
              {isAdding ? (
                <Loader2 size={16} className="text-gray-400 animate-spin flex-shrink-0" />
              ) : already ? (
                <span className="flex items-center gap-1 text-xs text-primary-500 font-semibold flex-shrink-0">
                  <Check size={14} /> 추가됨
                </span>
              ) : (
                <Download size={16} className="text-gray-300 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
      {addError && (
        <p className="text-sm text-rose-500 bg-rose-50 rounded-xl px-4 py-2">{addError}</p>
      )}
    </div>
  );
}
