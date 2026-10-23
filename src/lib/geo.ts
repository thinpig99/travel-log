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
