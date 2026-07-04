export interface Collection {
  id?: number;
  name: string;
  fileName: string;
  totalItems: number;
  createdAt: Date;
}

export interface CollectionItem {
  id?: number;
  collectionId: number;
  itemId: string;
  name: string;
  count: number;
  metadata: Record<string, unknown>;
}

export interface JsonItem {
  id: string;
  name: string;
  [key: string]: unknown;
}
