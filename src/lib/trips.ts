import { supabase } from './supabase';
import { todayStr } from './format';
import { cityLabel } from './geo';
import type { Trip } from './types';

export const TRIP_SELECT = '*, trip_cities(sort, cities(id, name_en, name_ko, country_code)), prep_items(status, cost)';

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
