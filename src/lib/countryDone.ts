import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/** 나라별 "완료" 표시 (비자 신청, 입국 사전 등록). prep_entries 에 kind 별로 저장 */
export function useCountryDone(tripId: string, itemId: string | undefined, kind: 'visa' | 'arrival') {
  const [rows, setRows] = useState<{ id: string; cc: string; done: boolean }[] | null>(itemId ? null : []);
  useEffect(() => {
    if (!itemId) return;
    supabase.from('prep_entries').select('id, data, done').eq('item_id', itemId).eq('kind', kind).then(({ data }) =>
      setRows(((data ?? []) as { id: string; data: { cc: string }; done: boolean }[]).map((r) => ({ id: r.id, cc: r.data.cc, done: r.done }))));
  }, [itemId]);
  const isDone = (cc: string) => !!rows?.find((r) => r.cc === cc)?.done;
  const toggle = async (cc: string) => {
    if (!itemId || !rows) return;
    const r = rows.find((x) => x.cc === cc);
    if (r) {
      setRows(rows.map((x) => (x.cc === cc ? { ...x, done: !x.done } : x)));
      await supabase.from('prep_entries').update({ done: !r.done }).eq('id', r.id);
    } else {
      const { data } = await supabase.from('prep_entries').insert({ trip_id: tripId, item_id: itemId, kind, data: { cc }, done: true }).select('id').single();
      setRows([...rows, { id: data?.id ?? cc, cc, done: true }]);
    }
  };
  return { loaded: rows != null, isDone, toggle };
}
