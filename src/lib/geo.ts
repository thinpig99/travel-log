import { supabase } from './supabase';

export type CityRow = [number, string, string, string, number, number, number];
export interface City {
  id: number;
  nameEn: string;
  nameKo: string;
  country: string;
  lat: number;
  lng: number;
  pop: number;
}
export type CountryMap = Record<string, [string, string, string, string, string]>;

let citiesP: Promise<City[]> | null = null;
let countriesP: Promise<CountryMap> | null = null;

export const loadCountries = () =>
  (countriesP ??= fetch('/data/countries.json').then((r) => r.json()));

export const loadCities = () =>
  (citiesP ??= fetch('/data/cities.json')
    .then((r) => r.json())
    .then((rows: CityRow[]) =>
      rows.map(([id, nameEn, nameKo, country, lat, lng, pop]) => ({ id, nameEn, nameKo, country, lat, lng, pop }))
    ));

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export const searchCities = async (q: string, limit = 8) => {
  const query = norm(q);
  if (!query) return [];
  const [cities, countries] = await Promise.all([loadCities(), loadCountries()]);
  const scored: { c: City; s: number }[] = [];
  for (const c of cities) {
    const ko = c.nameKo;
    const en = norm(c.nameEn);
    const countryKo = countries[c.country]?.[0] ?? '';
    let s = -1;
    if (ko && ko.startsWith(q.trim())) s = 3;
    else if (en.startsWith(query)) s = 2;
    else if (ko && ko.includes(q.trim())) s = 1;
    else if (query.length >= 3 && en.includes(query)) s = 0.5;
    else if (countryKo && countryKo === q.trim()) s = 0.2;
    if (s >= 0) scored.push({ c, s: s + Math.log10(c.pop + 10) / 10 });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((x) => x.c);
};

export const countryName = async (code: string) => (await loadCountries())[code]?.[0] ?? code;

export const cityLabel = (c: { nameKo?: string; nameEn?: string; name_ko?: string | null; name_en?: string }) =>
  c.nameKo || c.name_ko || c.nameEn || c.name_en || '';

export const ensureCity = async (c: City) => {
  const countries = await loadCountries();
  const [ko, en, cont] = countries[c.country] ?? [c.country, c.country, '기타', '', ''];
  const { error } = await supabase.rpc('ensure_city', {
    p_id: c.id,
    p_name_en: c.nameEn,
    p_name_ko: c.nameKo,
    p_country: c.country,
    p_country_ko: ko,
    p_country_en: en,
    p_continent: cont,
    p_lat: c.lat,
    p_lng: c.lng,
    p_population: c.pop,
  });
  if (error) throw error;
};

// 앱 목록에 없는 곳: 오픈스트리트맵(Nominatim) 검색. 이용 정책상 버튼을 눌렀을 때만 한 번 검색한다.
const OSM_TYPE: Record<string, number> = { node: 0, way: 1, relation: 2 };
const OSM_ID_BASE = 2_000_000_000_000;
const PLACE_TYPES = new Set(['city', 'town', 'village', 'hamlet', 'island', 'islet', 'municipality', 'suburb', 'neighbourhood', 'quarter', 'locality', 'county', 'state', 'region', 'province', 'archipelago', 'administrative']);

interface NominatimResult {
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  name: string;
  type: string;
  addresstype?: string;
  category?: string;
  display_name: string;
  address?: Record<string, string>;
  namedetails?: Record<string, string>;
}

export interface PlaceResult extends City {
  detail: string;
}

let lastOsmCall = 0;

export const searchPlaces = async (q: string): Promise<PlaceResult[]> => {
  const wait = 1100 - (Date.now() - lastOsmCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastOsmCall = Date.now();
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({
    q: q.trim(),
    format: 'jsonv2',
    limit: '8',
    addressdetails: '1',
    namedetails: '1',
    'accept-language': 'ko,en',
  }).toString();
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('PLACE_SEARCH_FAILED');
  const list = (await res.json()) as NominatimResult[];
  const seen = new Set<number>();
  const out: PlaceResult[] = [];
  for (const r of list) {
    const cc = r.address?.country_code?.toUpperCase();
    if (!cc || !(r.osm_type in OSM_TYPE)) continue;
    const kind = r.addresstype || r.type;
    if (r.category && r.category !== 'place' && r.category !== 'boundary' && !PLACE_TYPES.has(kind)) continue;
    const id = OSM_ID_BASE + r.osm_id * 3 + OSM_TYPE[r.osm_type];
    if (seen.has(id)) continue;
    seen.add(id);
    const nd = r.namedetails ?? {};
    const nameEn = nd['name:en'] || nd.name || r.name;
    const nameKo = nd['name:ko'] || '';
    const parts = r.display_name.split(',').map((s) => s.trim());
    out.push({
      id,
      nameEn,
      nameKo,
      country: cc,
      lat: Number(r.lat),
      lng: Number(r.lon),
      pop: 0,
      detail: parts.slice(1, 3).join(', '),
    });
  }
  return out;
};
