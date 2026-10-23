import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Login from './pages/Login';
import Home from './pages/Home';
import PastTrip from './pages/PastTrip';
import NewTrip from './pages/NewTrip';
import TripPage from './pages/Trip';
import Wallet from './pages/Wallet';
import Me from './pages/Me';
import Board from './pages/Board';
import Record from './pages/Record';
import Finish from './pages/Finish';

export default function App() {
  const { session, loading } = useAuth();
  if (loading) return <div className="center-fill muted">불러오는 중</div>;
  if (!session) return <Login />;
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/past/new" element={<PastTrip />} />
      <Route path="/trips/new" element={<NewTrip />} />
      <Route path="/trips/:id" element={<TripPage />} />
      <Route path="/trips/:id/finish" element={<Finish />} />
      <Route path="/board" element={<Board />} />
      <Route path="/board/:id" element={<Record />} />
      <Route path="/wallet" element={<Wallet />} />
      <Route path="/me" element={<Me />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
