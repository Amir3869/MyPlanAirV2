import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTripStore } from './store/tripStore';
import { AuthPage } from './features/auth/AuthPage';
import { TripsHub } from './features/trips/TripsHub';
import { TripCockpit } from './features/cockpit/TripCockpit';
import { Overview } from './features/overview/Overview';
import { Parcours } from './features/parcours/Parcours';
import { Budget } from './features/budget/Budget';
import { Essentials } from './features/essentials/Essentials';

export default function App() {
  const authed = useTripStore(s => s.authed);

  if (!authed) return <AuthPage />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TripsHub />} />
        <Route path="/trip/:id" element={<TripCockpit />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="parcours" element={<Parcours />} />
          <Route path="budget" element={<Budget />} />
          <Route path="essentials" element={<Essentials />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
