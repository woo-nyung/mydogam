import { db } from './db';

interface BackupItem {
  itemId: string;
  name: string;
  count: number;
  metadata: Record<string, unknown>;
}

interface BackupCollection {
  name: string;
  fileName: string;
  totalItems: number;
  createdAt: string;
  items: BackupItem[];
}

export interface BackupFile {
  version: 1;
  exportedAt: string;
  collections: BackupCollection[];
}

export async function exportBackup(): Promise<BackupFile> {
  const collections = await db.collections.toArray();
  const items = await db.items.toArray();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    collections: collections.map((col) => ({
      name: col.name,
      fileName: col.fileName,
      totalItems: col.totalItems,
      createdAt: col.createdAt.toISOString(),
      items: items
        .filter((item) => item.collectionId === col.id)
        .map((item) => ({
          itemId: item.itemId,
          name: item.name,
          count: item.count,
          metadata: item.metadata,
        })),
    })),
  };
}

export function downloadBackup(backup: BackupFile) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `collectr-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function isBackupFile(data: unknown): data is BackupFile {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return obj.version === 1 && Array.isArray(obj.collections);
}

export function parseBackupFile(json: unknown): BackupFile {
  if (!isBackupFile(json)) {
    throw new Error('올바른 백업 파일 형식이 아닙니다.');
  }
  return json;
}

export async function restoreBackup(backup: BackupFile) {
  await db.transaction('rw', db.collections, db.items, async () => {
    await db.items.clear();
    await db.collections.clear();
    for (const col of backup.collections) {
      const collectionId = await db.collections.add({
        name: col.name,
        fileName: col.fileName,
        totalItems: col.totalItems,
        createdAt: new Date(col.createdAt),
      });
      if (col.items.length > 0) {
        await db.items.bulkAdd(
          col.items.map((item) => ({
            collectionId: collectionId as number,
            itemId: item.itemId,
            name: item.name,
            count: item.count,
            metadata: item.metadata,
          }))
        );
      }
    }
  });
}
