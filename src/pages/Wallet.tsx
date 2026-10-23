import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import TabBar from '../components/TabBar';

export default function Wallet() {
  const { profile, refreshProfile } = useAuth();
  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);
  const received = profile?.likes_received ?? 0;
  const step = received % 10;

  return (
    <div className="screen">
      <main className="page with-tabs">
        <h1 className="title">지갑</h1>
        <div className="two">
          <div className="stack gap4" style={{ padding: 16, borderRadius: 16, background: 'var(--ink)', color: '#fff' }}>
            <span className="small" style={{ color: '#c3ccd3' }}>보유 티켓</span>
            <b style={{ fontSize: 30 }}>{profile?.is_admin ? '무제한' : <>{profile?.tickets ?? 0}<span style={{ fontSize: 15, fontWeight: 500 }}> 장</span></>}</b>
            <span className="xs" style={{ color: '#c3ccd3' }}>자세한 여행 1개에 1장</span>
          </div>
          <div className="soft-card stack gap4">
            <span className="small muted">줄 수 있는 좋아요</span>
            <b style={{ fontSize: 30 }}>{profile?.is_admin ? '무제한' : <>{profile?.like_coupons ?? 0}<span style={{ fontSize: 15, fontWeight: 500 }}> 개</span></>}</b>
            <span className="xs muted">복제하려면 1개 필요</span>
          </div>
        </div>

        <div className="card stack gap8">
          <div className="row between">
            <b>받은 좋아요</b>
            <b style={{ color: 'var(--brand)' }}>{step} / 10</b>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, minmax(0, 1fr))', gap: 4 }}>
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} style={{ height: 10, borderRadius: 5, background: i < step ? 'var(--brand)' : 'var(--land)' }} />
            ))}
          </div>
          <span className="small muted">{10 - step}개 더 받으면 티켓 1장이 생겨요 · 지금까지 {received}개</span>
        </div>

        <section className="stack gap8">
          <h2 className="h2">티켓 받는 방법</h2>
          <div className="stack small" style={{ gap: 6 }}>
            <span>· 가입하면 티켓 1장과 좋아요 쿠폰 1개를 드려요</span>
            <span>· 친구가 가입할 때 내 닉네임을 추천인으로 넣으면 둘 다 티켓 1장과 쿠폰 1개 (최대 10명)</span>
            <span>· 끝난 여행을 게시판에 공개하고 좋아요 10개를 받기</span>
            <span>· 티켓 구매 (결제는 정식 출시 때 열려요. 테스트 기간에는 운영자가 넣어드려요)</span>
          </div>
          <Link to="/board" className="btn secondary block">게시판 둘러보기</Link>
        </section>
      </main>
      <TabBar />
    </div>
  );
}
