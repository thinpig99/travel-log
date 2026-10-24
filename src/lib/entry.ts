import { supabase } from './supabase';

export interface EntryAuth { cc: string; kind: 'eta' | 'arrival'; name: string; url: string; timing: string; note: string; status: 'active' | 'upcoming'; checked_on: string }

export const fetchEntryAuth = async (ccs: string[]) => {
  if (!ccs.length) return [] as EntryAuth[];
  const { data } = await supabase.from('entry_auth').select('*').in('cc', ccs);
  return (data as EntryAuth[]) ?? [];
};

export const isArrivalItem = (i: { stage: number; title: string }) => i.stage === 5 && i.title.trim() === '입국 사전 등록';
