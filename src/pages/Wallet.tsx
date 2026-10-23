import { useEffect } from 'react';
import { useAuth } from '../lib/auth';
import TabBar from '../components/TabBar';

export default function Wallet() {
  const { profile, refreshProfile } = useAuth();
  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);
  const used = Math.min(2, profile?.free_trips_used ?? 0);

  return (
    <div className="screen">
      <main className="page with-tabs">
        <h1 className="title">지갑</h1>
        <div className="two">
          <div className="stack gap4" style={{ padding: 16, borderRadius: 16, background: 'var(--ink)', color: '#fff' }}>
            <span className="small" style={{ color: '#c3ccd3' }}>보유 티켓</span>
            <b style={{ fontSize: 30 }}>{profile?.tickets ?? 0}<span style={{ fontSize: 15, fontWeight: 500 }}> 장</span></b>
            <span className="xs" style={{ color: '#c3ccd3' }}>새 여행 1개에 1장</span>
          </div>
          <div className="soft-card stack gap4">
            <span className="small muted">줄 수 있는 좋아요</span>
            <b style={{ fontSize: 30 }}>{profile?.like_coupons ?? 0}<span style={{ fontSize: 15, fontWeight: 500 }}> 개</span></b>
            <span className="xs muted">게시판이 열리면 쓸 수 있어요</span>
          </div>
        </div>
        <div className="row between" style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--brand-soft)', color: 'var(--brand-ink)' }}>
          <span className="small">{used < 2 ? `무료 여행 ${2 - used}회가 남았어요` : '무료 여행 2개를 모두 사용했어요'}</span>
          <b className="small">{used} / 2</b>
        </div>
        <section className="stack gap8">
          <h2 className="h2">티켓 구매</h2>
          <div className="notice">티켓 구매는 다음 업데이트에서 열려요. 테스트 기간에는 운영자가 직접 티켓을 넣어드려요.</div>
        </section>
      </main>
      <TabBar />
    </div>
  );
}
