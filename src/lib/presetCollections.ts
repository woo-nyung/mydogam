export interface PresetCollectionEntry {
  name: string;
  file: string;
}

const BASE_URL =
  'https://raw.githubusercontent.com/woo-nyung/mydogam-data-achive/refs/heads/main/JsonData/';

export async function fetchPresetManifest(): Promise<PresetCollectionEntry[]> {
  const res = await fetch(`${BASE_URL}manifest.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error('컬렉션 목록을 불러오지 못했습니다.');
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('컬렉션 목록 형식이 올바르지 않습니다.');
  return data as PresetCollectionEntry[];
}

export async function fetchPresetCollectionJson(file: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${encodeURIComponent(file)}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${file} 파일을 불러오지 못했습니다.`);
  return res.json();
}
