import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { errorText } from '../lib/format';
import type { Group } from '../lib/types';
import TabBar from '../components/TabBar';

interface Member { group_id: string; user_id: string; profiles: { display_name: string; email: string } | null }
interface Invite { id: string; group_id: string; email: string }

export default function Me() {
  const { session, profile, refreshProfile } = useAuth();
  const me = session!.user.id;
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [name, setName] = useState('');
  const [editName, setEditName] = useState(false);
  const [newGroup, setNewGroup] = useState('');
  const [inviteFor, setInviteFor] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const [g, m, i] = await Promise.all([
      supabase.from('groups').select('*').order('created_at'),
      supabase.from('group_members').select('group_id, user_id, profiles(display_name, email)'),
      supabase.from('group_invites').select('id, group_id, email'),
    ]);
    setGroups((g.data as Group[]) ?? []);
    setMembers((m.data as unknown as Member[]) ?? []);
    setInvites((i.data as Invite[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveName = async () => {
    await supabase.rpc('set_display_name', { p_name: name });
    await refreshProfile();
    setEditName(false);
  };

  const createGroup = async () => {
    setErr('');
    if (!newGroup.trim()) return;
    const { error } = await supabase.from('groups').insert({ name: newGroup.trim(), owner_id: me });
    if (error) return setErr(errorText(error));
    setNewGroup('');
    load();
  };

  const invite = async (gid: string) => {
    setErr('');
    setMsg('');
    if (!inviteEmail.includes('@')) return setErr('초대할 이메일을 확인해 주세요.');
    const { data, error } = await supabase.rpc('invite_to_group', { gid, invitee_email: inviteEmail });
    if (error) return setErr(errorText(error));
    setMsg(data === 'joined' ? '바로 그룹에 들어왔어요.' : '아직 가입 전이에요. 이 이메일로 가입하면 자동으로 그룹에 들어와요.');
    setInviteEmail('');
    setInviteFor(null);
    load();
  };

  const leave = async (g: Group, userId: string) => {
    await supabase.from('group_members').delete().eq('group_id', g.id).eq('user_id', userId);
    load();
  };
  const cancelInvite = async (id: string) => {
    await supabase.from('group_invites').delete().eq('id', id);
    load();
  };
  const removeGroup = async (g: Group) => {
    await supabase.from('groups').delete().eq('id', g.id);
    load();
  };

  return (
    <div className="screen">
      <main className="page with-tabs">
        <div className="row gap12">
          <div style={{ width: 56, height: 56, borderRadius: 28, background: 'var(--brand-soft)', color: 'var(--brand-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700 }}>
            {(profile?.display_name || profile?.email || '?').slice(0, 1).toUpperCase()}
          </div>
          <div className="stack gap4 grow">
            {editName ? (
              <div className="row gap8">
                <input className="input grow" value={name} autoFocus maxLength={40} onChange={(e) => setName(e.target.value)} aria-label="이름" />
                <button className="btn small" onClick={saveName}>저장</button>
              </div>
            ) : (
              <>
                <h1 style={{ fontSize: 20, fontWeight: 700 }}>{profile?.display_name || '이름 없음'}</h1>
                <span className="small muted">{profile?.email}</span>
              </>
            )}
          </div>
          {!editName && <button className="link-btn" onClick={() => { setName(profile?.display_name ?? ''); setEditName(true); }}>이름 바꾸기</button>}
        </div>

        <section className="stack gap8">
          <h2 className="h2">내 그룹</h2>
          <p className="xs muted">그룹에 공유한 여행은 멤버 모두가 보고 함께 고칠 수 있어요.</p>
          {msg && <p className="notice">{msg}</p>}
          {err && <p className="error" role="alert">{err}</p>}
          {groups.map((g) => {
            const ms = members.filter((m) => m.group_id === g.id);
            const inv = invites.filter((i) => i.group_id === g.id && !ms.some((m) => m.profiles?.email === i.email));
            const owner = g.owner_id === me;
            return (
              <div key={g.id} className="card stack gap8">
                <div className="row between">
                  <b>{g.name}</b>
                  <span className="xs muted">{ms.length}명</span>
                </div>
                {ms.map((m) => (
                  <div key={m.user_id} className="row between small">
                    <span>{m.profiles?.display_name || m.profiles?.email}{m.user_id === g.owner_id ? ' · 만든 사람' : ''}</span>
                    {owner && m.user_id !== me && <button className="link-btn" onClick={() => leave(g, m.user_id)}>내보내기</button>}
                  </div>
                ))}
                {inv.map((i) => (
                  <div key={i.id} className="row between small muted">
                    <span>{i.email} · 가입 대기</span>
                    <button className="link-btn" onClick={() => cancelInvite(i.id)}>초대 취소</button>
                  </div>
                ))}
                {inviteFor === g.id ? (
                  <div className="row gap8">
                    <input className="input grow" type="email" autoFocus value={inviteEmail} placeholder="초대할 이메일" onChange={(e) => setInviteEmail(e.target.value)} />
                    <button className="btn small" onClick={() => invite(g.id)}>초대</button>
                  </div>
                ) : (
                  <div className="row gap12">
                    <button className="link-btn" onClick={() => { setInviteFor(g.id); setInviteEmail(''); }}>+ 이메일로 초대</button>
                    {owner ? (
                      <button className="link-btn" style={{ color: 'var(--red-ink)' }} onClick={() => removeGroup(g)}>그룹 지우기</button>
                    ) : (
                      <button className="link-btn" style={{ color: 'var(--red-ink)' }} onClick={() => leave(g, me)}>그룹 나가기</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div className="row gap8">
            <input className="input grow" value={newGroup} maxLength={30} placeholder="새 그룹 이름 (우리 부부)" onChange={(e) => setNewGroup(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createGroup()} />
            <button className="btn small" onClick={createGroup}>만들기</button>
          </div>
        </section>

        <button className="btn secondary block" onClick={() => supabase.auth.signOut()}>로그아웃</button>
      </main>
      <TabBar />
    </div>
  );
}
