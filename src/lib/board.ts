import { supabase } from './supabase';
import type { Companion } from './types';

export interface BoardTrip {
  id: string;
  title: string;
  companion: Companion;
  start_date: string;
  end_date: string;
  headcount: number;
  budget: number | null;
  memo: string;
  total_cost: number;
  likes: number;
  copies: number;
  schedule_count: number;
  author: string;
  city_names: string[];
  country_codes: string[];
  liked: boolean;
  is_mine: boolean;
  published_at: string;
}

export interface TreeRow {
  continent: string;
  country_code: string;
  country_name: string;
  city_id: number;
  city_name: string;
  lat: number;
  lng: number;
  trips: number;
}

export const fetchBoard = async (opts: { trip?: string; country?: string | null; city?: number | null; sort?: 'popular' | 'recent' }) => {
  const { data, error } = await supabase.rpc('board_trips', {
    p_trip: opts.trip ?? null,
    p_country: opts.country ?? null,
    p_city: opts.city ?? null,
    p_sort: opts.sort ?? 'popular',
    p_limit: 100,
  });
  if (error) throw error;
  return (data ?? []) as BoardTrip[];
};

export const fetchTree = async () => {
  const { data } = await supabase.rpc('board_tree');
  return (data ?? []) as TreeRow[];
};

export const monthLabel = (d: string) => `${Number(d.slice(5, 7))}월`;
