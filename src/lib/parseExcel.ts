import readXlsxFile from 'read-excel-file/browser';
import { type JsonItem } from './types';

const ID_KEYS = ['id', 'ID', 'Id'];
const NAME_KEYS = ['name', 'Name', 'NAME'];

export async function parseCollectionExcel(file: File): Promise<JsonItem[]> {
  const sheets = await readXlsxFile(file);
  const rows = sheets[0]?.data ?? [];
  if (rows.length === 0) {
    throw new Error('시트에 데이터가 없습니다.');
  }

  const headers = rows[0].map((h: unknown) => (h === null || h === undefined ? '' : String(h).trim()));
  const idIdx = headers.findIndex((h: string) => ID_KEYS.includes(h));
  const nameIdx = headers.findIndex((h: string) => NAME_KEYS.includes(h));
  if (idIdx === -1 || nameIdx === -1) {
    throw new Error("첫 번째 행(헤더)에 'id'와 'name' 열이 필요합니다.");
  }

  const items: JsonItem[] = [];
  for (const row of rows.slice(1)) {
    const idVal = row[idIdx];
    const nameVal = row[nameIdx];
    if (idVal === null || idVal === undefined || idVal === '') continue;
    if (nameVal === null || nameVal === undefined || nameVal === '') continue;

    const metadata: Record<string, unknown> = {};
    headers.forEach((h: string, i: number) => {
      if (i !== idIdx && i !== nameIdx && h) metadata[h] = row[i];
    });

    items.push({
      id: String(idVal),
      name: String(nameVal),
      ...metadata,
    });
  }

  if (items.length === 0) {
    throw new Error("'id'와 'name' 값을 가진 행이 없습니다.");
  }
  return items;
}
