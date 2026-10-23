import { NavLink } from 'react-router-dom';
import { IconBoard, IconMap, IconTicket, IconUser } from './Icons';

export default function TabBar() {
  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '');
  return (
    <div className="tabbar">
      <nav aria-label="주요 메뉴">
        <NavLink to="/" end className={cls}><IconMap />홈</NavLink>
        <NavLink to="/board" className={cls}><IconBoard />게시판</NavLink>
        <NavLink to="/wallet" className={cls}><IconTicket />지갑</NavLink>
        <NavLink to="/me" className={cls}><IconUser />내 정보</NavLink>
      </nav>
    </div>
  );
}
