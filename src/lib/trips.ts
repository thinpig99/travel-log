import { supabase } from './supabase';
import { todayStr } from './format';
import { cityLabel, ensureCity, type City } from './geo';
import type { Trip } from './types';

export const TRIP_SELECT = '*, trip_cities(sort, arrive, depart, note, cities(id, name_en, name_ko, country_code, lat, lng)), prep_items(status, cost)';

export const fetchTrips = async () => {
  const { data, error } = await supabase.from('trips').select(TRIP_SELECT);
  if (error) throw error;
  return (data ?? []) as Trip[];
};

export const tripCities = (t: Trip) =>
  [...(t.trip_cities ?? [])].sort((a, b) => a.sort - b.sort).map((x) => cityLabel(x.cities));

export const isUpcoming = (t: Trip) => t.kind === 'full' && !!t.end_date && t.end_date >= todayStr();

export const sortKey = (t: Trip) =>
  t.start_date ?? `${t.year ?? 0}-${String(t.month ?? 0).padStart(2, '0')}-00`;

export const whenLabel = (t: Trip) => {
  if (t.start_date) {
    const [y, m] = t.start_date.split('-');
    return `${y.slice(2)}.${m}`;
  }
  if (t.year) return t.month ? `${String(t.year).slice(2)}.${String(t.month).padStart(2, '0')}` : `${t.year}년`;
  return '';
};

// 여행 도시 목록을 새 목록으로 맞춘다 (빠진 도시는 지우고, 새 도시는 추가, 순서 갱신)
export const syncTripCities = async (tripId: string, prevIds: number[], cities: City[]) => {
  await Promise.all(cities.filter((c) => !prevIds.includes(c.id)).map(ensureCity));
  const removed = prevIds.filter((id) => !cities.some((c) => c.id === id));
  if (removed.length) {
    const { error } = await supabase.from('trip_cities').delete().eq('trip_id', tripId).in('city_id', removed);
    if (error) throw error;
  }
  const { error } = await supabase
    .from('trip_cities')
    .upsert(cities.map((c, i) => ({ trip_id: tripId, city_id: c.id, sort: i })), { onConflict: 'trip_id,city_id' });
  if (error) throw error;
};

export const fetchTripCityObjects = async (tripId: string): Promise<City[]> => {
  const { data } = await supabase
    .from('trip_cities')
    .select('sort, cities(id, name_en, name_ko, country_code, lat, lng, population)')
    .eq('trip_id', tripId)
    .order('sort');
  return ((data ?? []) as unknown as { cities: { id: number; name_en: string; name_ko: string | null; country_code: string; lat: number; lng: number; population: number } }[]).map(
    ({ cities: c }) => ({ id: c.id, nameEn: c.name_en, nameKo: c.name_ko ?? '', country: c.country_code, lat: c.lat, lng: c.lng, pop: c.population })
  );
};
