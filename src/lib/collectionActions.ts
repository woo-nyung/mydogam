import { db } from './db';
import { type JsonItem } from './types';

export async function createCollectionFromItems(
  name: string,
  fileName: string,
  items: JsonItem[]
): Promise<number> {
  const collectionId = await db.collections.add({
    name,
    fileName,
    totalItems: items.length,
    createdAt: new Date(),
  });

  await db.items.bulkAdd(
    items.map((item) => {
      const { id, name: itemName, count, ...metadata } = item;
      return {
        collectionId: collectionId as number,
        itemId: id,
        name: itemName,
        count: typeof count === 'number' ? count : 0,
        metadata: metadata as Record<string, unknown>,
      };
    })
  );

  return collectionId as number;
}
