import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { TRIP_SELECT, tripCities, whenLabel } from '../lib/trips';
import { companionLabel, type Group, type PrepItem, type ScheduleItem, type Trip } from '../lib/types';
import { nightsDays, rangeLabel } from '../lib/format';
import { IconBack } from '../components/Icons';
import Overview from './trip/Overview';
import Prep from './trip/Prep';
import Schedule from './trip/Schedule';

type Tab = 'overview' | 'prep' | 'schedule';

export default function TripPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { session } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [prep, setPrep] = useState<PrepItem[]>([]);
  const [sched, setSched] = useState<ScheduleItem[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<Tab>('prep');

  const load = useCallback(async () => {
    const [t, p, s, g] = await Promise.all([
      supabase.from('trips').select(TRIP_SELECT).eq('id', id!).maybeSingle(),
      supabase.from('prep_items').select('*').eq('trip_id', id!).order('stage').order('sort').order('created_at'),
      supabase.from('schedule_items').select('*').eq('trip_id', id!).order('day').order('time', { nullsFirst: true }).order('created_at'),
      supabase.from('groups').select('*'),
    ]);
    if (!t.data) return setMissing(true);
    setTrip(t.data as Trip);
    setPrep((p.data as PrepItem[]) ?? []);
    setSched((s.data as ScheduleItem[]) ?? []);
    setGroups((g.data as Group[]) ?? []);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (missing) return <div className="center-fill stack gap12"><span className="muted">여행을 찾을 수 없어요.</span><button className="btn secondary small" onClick={() => nav('/')}>홈으로</button></div>;
  if (!trip) return <div className="center-fill muted">불러오는 중</div>;

  const isOwner = trip.owner_id === session?.user.id;
  const cities = tripCities(trip);
  const groupName = groups.find((g) => g.id === trip.group_id)?.name;

  return (
    <div className="screen">
      <div className="topbar">
        <button className="icon-btn" aria-label="뒤로" onClick={() => nav('/')}><IconBack /></button>
        {trip.group_id && <span className="xs muted" style={{ paddingRight: 12 }}>{groupName ?? '그룹'} 그룹과 공유 중</span>}
      </div>
      <main className="page" style={{ paddingTop: 4 }}>
        <div className="stack gap4">
          <span className="small muted">{cities.join(', ')}</span>
          <h1 className="title">{trip.title}</h1>
          <span className="small muted">
            {trip.kind === 'full' && trip.start_date && trip.end_date
              ? `${rangeLabel(trip.start_date, trip.end_date)} · ${nightsDays(trip.start_date, trip.end_date)}`
              : whenLabel(trip)}
            {' · '}
            {companionLabel(trip.companion)}
            {trip.kind === 'full' ? ` ${trip.headcount}명` : ''}
          </span>
        </div>

        {trip.kind === 'simple' ? (
          <Overview trip={trip} prep={[]} sched={[]} groups={groups} isOwner={isOwner} onChange={load} />
        ) : (
          <>
            <div className="tabs" role="tablist">
              {([['overview', '개요'], ['prep', '준비'], ['schedule', '일정']] as [Tab, string][]).map(([k, l]) => (
                <button key={k} role="tab" aria-selected={tab === k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>
            {tab === 'overview' && <Overview trip={trip} prep={prep} sched={sched} groups={groups} isOwner={isOwner} onChange={load} />}
            {tab === 'prep' && <Prep tripId={trip.id} items={prep} setItems={setPrep} />}
            {tab === 'schedule' && <Schedule trip={trip} items={sched} setItems={setSched} />}
          </>
        )}
      </main>
    </div>
  );
}
