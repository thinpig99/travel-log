import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { errorText } from '../lib/format';

export default function Login() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

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
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: pw,
          options: { data: { display_name: name.trim() }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) setMsg('가입 확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.');
      }
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <form className="page" onSubmit={submit} style={{ justifyContent: 'center', gap: 24 }}>
        <div className="stack gap8">
          <img src="/favicon.svg" alt="" width={56} height={56} />
          <h1 className="title">여행 지도</h1>
          <p className="muted">다녀온 곳은 지도에 남기고, 갈 곳은 차근차근 준비해요.</p>
        </div>
        <div className="stack gap12">
          {mode === 'up' && (
            <label className="field">
              <span>이름</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Shin" autoComplete="nickname" />
            </label>
          )}
          <label className="field">
            <span>이메일</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" autoComplete="email" />
          </label>
          <label className="field">
            <span>비밀번호</span>
            <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="6자 이상" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
          </label>
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
