import Dexie, { type Table } from 'dexie';
import { type Collection, type CollectionItem } from './types';

class CollectorDB extends Dexie {
  collections!: Table<Collection>;
  items!: Table<CollectionItem>;

  constructor() {
    super('CollectorDB');
    this.version(1).stores({
      collections: '++id, name, createdAt',
      items: '++id, collectionId, itemId, [collectionId+itemId]',
    });
  }
}

export const db = new CollectorDB();
