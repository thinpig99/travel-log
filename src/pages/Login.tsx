import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { errorText } from '../lib/format';

const NICK_RULE = /^[가-힣A-Za-z0-9_]{2,16}$/;

export default function Login() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [nick, setNick] = useState('');
  const [nickMsg, setNickMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [referral, setReferral] = useState('');
  const [refMsg, setRefMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const checkNick = async (v = nick) => {
    const n = v.trim();
    if (!NICK_RULE.test(n)) {
      setNickMsg({ ok: false, text: '한글, 영문, 숫자, _ 로 2~16자, 띄어쓰기 없이 적어주세요.' });
      return false;
    }
    const { data } = await supabase.rpc('nickname_status', { n });
    const ok = data === 'ok';
    setNickMsg(ok ? { ok, text: '쓸 수 있는 닉네임이에요. 친구에게 줄 추천인 코드가 돼요.' } : { ok, text: '이미 쓰고 있는 닉네임이에요.' });
    return ok;
  };

  const checkRef = async (v = referral) => {
    const n = v.trim();
    if (!n) {
      setRefMsg(null);
      return true;
    }
    const { data } = await supabase.rpc('referrer_exists', { n });
    setRefMsg(data ? { ok: true, text: '확인됐어요. 가입하면 티켓과 쿠폰을 1개씩 더 드려요.' } : { ok: false, text: '이 닉네임을 쓰는 사람이 없어요.' });
    return !!data;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    if (!email.includes('@')) return setErr('이메일을 확인해 주세요.');
    if (pw.length < 6) return setErr('비밀번호는 6자 이상이어야 해요.');
    setBusy(true);
    try {
      if (mode === 'in') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
        if (error) throw error;
      } else {
        if (!(await checkNick())) throw new Error('NICKNAME_CHECK');
        if (!(await checkRef())) throw new Error('REFERRAL_CHECK');
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: pw,
          options: { data: { display_name: nick.trim(), referral: referral.trim() }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) setMsg('가입 확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.');
      }
    } catch (e) {
      const m = (e as Error).message;
      if (m === 'NICKNAME_CHECK') setErr('닉네임을 확인해 주세요.');
      else if (m === 'REFERRAL_CHECK') setErr('추천인 닉네임을 확인하거나 비워주세요.');
      else setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const hint = (m: { ok: boolean; text: string } | null) =>
    m && <span className="xs" style={{ color: m.ok ? 'var(--brand-ink)' : 'var(--red-ink)' }}>{m.text}</span>;

  return (
    <div className="screen">
      <form className="page" onSubmit={submit} style={{ justifyContent: 'center', gap: 24 }}>
        <div className="stack gap8">
          <img src="/favicon.svg" alt="" width={56} height={56} />
          <h1 className="title">여행 지도</h1>
          <p className="muted">다녀온 곳은 지도에 남기고, 갈 곳은 차근차근 준비해요.</p>
        </div>
        <div className="stack gap12">
          <label className="field">
            <span>이메일</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" autoComplete="email" />
          </label>
          <label className="field">
            <span>비밀번호</span>
            <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="6자 이상" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
          </label>
          {mode === 'up' && (
            <>
              <label className="field">
                <span>닉네임</span>
                <input className="input" value={nick} maxLength={16} placeholder="여행하는신" autoComplete="nickname"
                  onChange={(e) => { setNick(e.target.value.replace(/\s/g, '')); setNickMsg(null); }}
                  onBlur={() => nick && checkNick()} />
                {hint(nickMsg)}
              </label>
              <label className="field">
                <span>추천인 닉네임 (선택)</span>
                <input className="input" value={referral} maxLength={16} placeholder="추천해 준 친구의 닉네임"
                  onChange={(e) => { setReferral(e.target.value.replace(/\s/g, '')); setRefMsg(null); }}
                  onBlur={() => checkRef()} />
                {hint(refMsg)}
              </label>
              <p className="xs muted">가입하면 티켓 1장과 좋아요 쿠폰 1개를 드려요. 추천인을 넣으면 나와 친구 모두 1개씩 더 받아요.</p>
            </>
          )}
          {err && <p className="error" role="alert">{err}</p>}
          {msg && <p className="notice">{msg}</p>}
        </div>
        <div className="stack gap8">
          <button className="btn block" disabled={busy}>{mode === 'in' ? '로그인' : '가입하기'}</button>
          <button type="button" className="link-btn" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setErr(''); setMsg(''); }}>
            {mode === 'in' ? '처음이신가요? 가입하기' : '이미 계정이 있어요. 로그인'}
          </button>
        </div>
      </form>
    </div>
  );
}
