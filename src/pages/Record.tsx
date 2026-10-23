import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { fetchBoard, monthLabel, type BoardTrip } from '../lib/board';
import { STAGES, companionLabel, type Group, type PrepItem, type ScheduleItem } from '../lib/types';
import { dayLabel, daysBetween, errorText, nightsDays, todayStr, won } from '../lib/format';
import { IconBack } from '../components/Icons';

type Tab = 'schedule' | 'prep' | 'cost';
const manwon = (n: number) => (n >= 10000 ? `${(n / 10000).toFixed(n >= 1000000 ? 0 : 1)}만` : won(n));

export default function Record() {
  const { id } = useParams();
  const nav = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const [t, setT] = useState<BoardTrip | null>(null);
  const [prep, setPrep] = useState<PrepItem[]>([]);
  const [sched, setSched] = useState<ScheduleItem[]>([]);
  const [tab, setTab] = useState<Tab>('schedule');
  const [day, setDay] = useState('');
  const [missing, setMissing] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);

  const load = useCallback(async () => {
    const [b, p, s] = await Promise.all([
      fetchBoard({ trip: id }),
      supabase.from('prep_items').select('*').eq('trip_id', id!).order('stage').order('sort'),
      supabase.from('schedule_items').select('*').eq('trip_id', id!).order('day').order('time', { nullsFirst: true }),
    ]);
    if (!b[0]) return setMissing(true);
    setT(b[0]);
    setPrep((p.data as PrepItem[]) ?? []);
    setSched((s.data as ScheduleItem[]) ?? []);
    setDay((d) => d || b[0].start_date);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (missing) return <div className="center-fill stack gap12"><span className="muted">공개된 기록을 찾을 수 없어요.</span><button className="btn secondary small" onClick={() => nav('/board')}>게시판으로</button></div>;
  if (!t) return <div className="center-fill muted">불러오는 중</div>;

  const like = async () => {
    setErr('');
    setBusy(true);
    const { error } = await supabase.rpc('like_trip', { tid: t.id });
    setBusy(false);
    if (error) return setErr(errorText(error));
    await Promise.all([load(), refreshProfile()]);
  };

  const days = daysBetween(t.start_date, t.end_date);
  const dayItems = sched.filter((s) => s.day === day);
  const coupons = profile?.like_coupons ?? 0;

  return (
    <div className="screen">
      <div className="topbar">
        <button className="icon-btn" aria-label="뒤로" onClick={() => nav(-1)}><IconBack /></button>
      </div>
      <main className="page" style={{ paddingTop: 4 }}>
        <div className="stack gap4">
          <span className="small muted">{t.city_names.join(', ')}</span>
          <h1 className="title">{t.title}</h1>
          <span className="small muted">{t.author} · {monthLabel(t.start_date)} {nightsDays(t.start_date, t.end_date)} · {companionLabel(t.companion)} {t.headcount}명</span>
        </div>
        <div className="stats">
          <div className="soft-card stack gap4" style={{ padding: 12 }}><span className="xs muted">총 비용</span><b>{manwon(t.total_cost)}</b></div>
          <div className="soft-card stack gap4" style={{ padding: 12 }}><span className="xs muted">1인당</span><b>{manwon(t.total_cost / Math.max(1, t.headcount))}</b></div>
          <div className="soft-card stack gap4" style={{ padding: 12 }}><span className="xs muted">좋아요</span><b>{t.likes}</b></div>
        </div>
        {t.memo && <p className="small">{t.memo}</p>}

        <div className="tabs" role="tablist">
          {([['schedule', '일정'], ['prep', '준비'], ['cost', '비용']] as [Tab, string][]).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        {tab === 'schedule' && (
          <div className="stack gap12">
            <div className="row gap6" style={{ overflowX: 'auto' }}>
              {days.map((d, i) => <button key={d} className={`pill ${d === day ? 'on' : ''}`} onClick={() => setDay(d)}>{i + 1}일차</button>)}
            </div>
            <span className="small" style={{ fontWeight: 700 }}>{dayLabel(day)}</span>
            <div className="stack">
              {dayItems.length === 0 && <p className="notice">이날 적힌 일정이 없어요.</p>}
              {dayItems.map((s) => (
                <div key={s.id} className="item sched">
                  <span className="small muted">{s.time ? s.time.slice(0, 5) : '-'}</span>
                  <span className="stack gap4" style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 15 }}>{s.title}</span>
                    <span className="row gap6"><span className="cat">{s.category}</span>{s.area && <span className="xs muted">{s.area}</span>}</span>
                    {s.note && <span className="xs muted">{s.note}</span>}
                  </span>
                  <span className="small muted">{s.cost != null ? won(s.cost) : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'prep' && (
          <div className="stack gap12">
            {[1, 2, 3, 4, 5, 6].map((st) => {
              const list = prep.filter((p) => p.stage === st);
              if (!list.length) return null;
              return (
                <section key={st} className="stack">
                  <span className="stage-title">{st}단계 · {STAGES[st]}</span>
                  {list.map((p) => (
                    <div key={p.id} className="list-row">
                      <span className="stack gap4"><span style={{ fontSize: 15 }}>{p.title}</span>{p.note && <span className="xs muted">{p.note}</span>}</span>
                      <span className="small muted">{p.cost != null ? won(p.cost) : ''}</span>
                    </div>
                  ))}
                </section>
              );
            })}
          </div>
        )}

        {tab === 'cost' && (
          <div className="soft-card stack gap8">
            {[1, 2, 3, 4, 5, 6].map((st) => {
              const sum = prep.filter((p) => p.stage === st).reduce((a, p) => a + (p.cost ?? 0), 0);
              return sum ? <div key={st} className="row between small"><span className="muted">{STAGES[st]}</span><span>{won(sum)}</span></div> : null;
            })}
            <div className="row between" style={{ paddingTop: 8, borderTop: '1px solid var(--land)', fontWeight: 700 }}><span>합계</span><span>{won(t.total_cost)}</span></div>
            <div className="row between" style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--brand-soft)', color: 'var(--brand-ink)' }}>
              <span className="small">1인당 ({t.headcount}명)</span><b>{won(t.total_cost / Math.max(1, t.headcount))}</b>
            </div>
            {t.budget ? <span className="xs muted">처음 예산 {won(t.budget)}</span> : null}
          </div>
        )}
      </main>

      <div className="bottom-bar" style={{ flexDirection: 'column' }}>
        {err && <p className="error" role="alert">{err}</p>}
        <span className="xs muted" style={{ textAlign: 'center' }}>
          {t.is_mine ? '내가 공개한 기록이에요' : t.liked ? '좋아요를 눌렀어요 · 이제 복제할 수 있어요' : `좋아요를 누른 기록만 복제할 수 있어요 · 쿠폰 1개 사용 (보유 ${coupons}개)`}
        </span>
        <div className="row gap8">
          {!t.is_mine && (
            <button className="btn secondary" aria-pressed={t.liked} aria-label="좋아요" disabled={t.liked || busy} onClick={like}
              style={{ width: 52, padding: 0, borderColor: 'var(--brand)', background: t.liked ? 'var(--brand-soft)' : '#fff' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill={t.liked ? 'var(--brand)' : 'none'} stroke="var(--brand)" strokeWidth="2" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.5-9.5C1 7.5 4 4 7.5 4c2 0 3.5 1 4.5 2.5C13 5 14.5 4 16.5 4 20 4 23 7.5 21.5 11.5 19.5 16.4 12 21 12 21z" /></svg>
            </button>
          )}
          {t.liked || t.is_mine ? (
            <button className="btn grow" onClick={() => setCopyOpen(true)}>내 여행으로 복제</button>
          ) : (
            <button className="btn grow" disabled={busy} onClick={like} style={{ background: 'var(--line)', color: 'var(--ink-2)' }}>좋아요 누르고 복제하기</button>
          )}
        </div>
      </div>
      {copyOpen && <CopySheet trip={t} onClose={() => setCopyOpen(false)} />}
    </div>
  );
}

function CopySheet({ trip, onClose }: { trip: BoardTrip; onClose: () => void }) {
  const nav = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const [start, setStart] = useState('');
  const [title, setTitle] = useState(trip.title);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from('groups').select('*').then(({ data }) => setGroups((data as Group[]) ?? []));
  }, []);

  const go = async () => {
    if (!start) return setErr('출발일을 골라주세요.');
    setBusy(true);
    setErr('');
    const { data, error } = await supabase.rpc('copy_trip', { src: trip.id, p_start: start, p_title: title, p_group_id: groupId || null });
    setBusy(false);
    if (error) return setErr(errorText(error));
    await refreshProfile();
    nav(`/trips/${data}`);
  };

  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="내 여행으로 복제">
        <h2 className="h2">내 여행으로 복제</h2>
        <p className="xs muted">준비 항목과 일정이 복사돼요. 준비 비용은 비워두고, 일정은 출발일에 맞춰 날짜가 옮겨져요.</p>
        <label className="field"><span>여행 이름</span><input className="input" value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="field"><span>출발일 ({nightsDays(trip.start_date, trip.end_date)})</span><input className="input" type="date" min={todayStr()} value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <label className="field">
          <span>함께 볼 사람</span>
          <select className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">나만 보기</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name} 그룹과 공유</option>)}
          </select>
        </label>
        <div className="notice">티켓 1장을 사용해요 · 보유 {profile?.tickets ?? 0}장</div>
        {err && <p className="error" role="alert">{err}</p>}
        <button className="btn block" disabled={busy} onClick={go}>{busy ? '복제하는 중' : '복제하기'}</button>
      </div>
    </div>
  );
}
