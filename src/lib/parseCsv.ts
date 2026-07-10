import Papa from 'papaparse';
import { type JsonItem } from './types';

const ID_KEYS = ['id', 'ID', 'Id'];
const NAME_KEYS = ['name', 'Name', 'NAME'];

export async function parseCollectionCsv(file: File): Promise<JsonItem[]> {
  const text = await file.text();
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });

  const fields = result.meta.fields ?? [];
  const idKey = fields.find((k) => ID_KEYS.includes(k.trim()));
  const nameKey = fields.find((k) => NAME_KEYS.includes(k.trim()));
  if (!idKey || !nameKey) {
    throw new Error("헤더 행에 'id'와 'name' 열이 필요합니다.");
  }

  const items: JsonItem[] = [];
  for (const row of result.data) {
    const idVal = row[idKey];
    const nameVal = row[nameKey];
    if (!idVal || !nameVal) continue;

    const metadata: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (k !== idKey && k !== nameKey) metadata[k] = v;
    }

    items.push({ id: String(idVal), name: String(nameVal), ...metadata });
  }

  if (items.length === 0) {
    throw new Error("'id'와 'name' 값을 가진 행이 없습니다.");
  }
  return items;
}
