import { type JsonItem } from './types';

export function parseCollectionJson(jsonData: unknown): JsonItem[] {
  if (Array.isArray(jsonData)) {
    return validateItems(jsonData);
  }

  if (typeof jsonData === 'object' && jsonData !== null) {
    const obj = jsonData as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      if (Array.isArray(obj[key])) {
        return validateItems(obj[key] as unknown[]);
      }
    }
  }

  throw new Error('JSON 파일에서 아이템 배열을 찾을 수 없습니다.');
}

function validateItems(items: unknown[]): JsonItem[] {
  const valid: JsonItem[] = [];
  for (const item of items) {
    if (
      typeof item === 'object' &&
      item !== null &&
      'id' in item &&
      'name' in item &&
      typeof (item as Record<string, unknown>).id === 'string' &&
      typeof (item as Record<string, unknown>).name === 'string'
    ) {
      valid.push(item as JsonItem);
    }
  }
  if (valid.length === 0) {
    throw new Error("'id'와 'name' 키를 가진 아이템이 없습니다.");
  }
  return valid;
}
