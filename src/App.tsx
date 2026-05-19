// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useTripStore } from './store/tripStore';
import { ErrorBoundary } from './shared/ErrorBoundary';
import { AuthPage } from './features/auth/AuthPage';
import { SSOCallback } from './features/auth/SSOCallback';
import { TripsHub } from './features/trips/TripsHub';
import { TripCockpit } from './features/cockpit/TripCockpit';
import { Overview } from './features/overview/Overview';
import { Parcours } from './features/parcours/Parcours';
import { Budget } from './features/budget/Budget';
import { Essentials } from './features/essentials/Essentials';
import { ShareView } from './features/share/ShareView';
import { WorldMap } from './features/world/WorldMap';
import { TripChat } from './features/chat/TripChat';
import { motion } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// Loader — affiché pendant que Clerk vérifie la session (~300ms)
// ─────────────────────────────────────────────────────────────────────────────
const ClerkLoader = () => (
  <div
    className="fixed inset-0 flex items-center justify-center"
    style={{ background: '#07070b' }}
  >
    <motion.div
      className="flex flex-col items-center gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Logo animé */}
      <motion.div
        className="w-16 h-16 rounded-[22px] flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)',
          boxShadow:  '0 0 60px rgba(124,140,255,0.4)',
        }}
        animate={{
          boxShadow: [
            '0 0 60px rgba(124,140,255,0.4)',
            '0 0 100px rgba(124,140,255,0.6)',
            '0 0 60px rgba(124,140,255,0.4)',
          ],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.span
          className="text-3xl"
          animate={{ y: [0, -3, 0], rotate: [-8, -12, -8] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          ✈️
        </motion.span>
      </motion.div>

      {/* Barre de chargement */}
      <div
        className="w-24 h-0.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.1)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #7c8cff, #ec4899)' }}
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </motion.div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Routes protégées — accessibles seulement si connecté + onboarding OK
// ─────────────────────────────────────────────────────────────────────────────
const ProtectedRoutes = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const onboardingDone = useTripStore((s) => s.onboardingDone);

  // Clerk charge encore → loader
  if (!isLoaded) return <ClerkLoader />;

  // Pas connecté → AuthPage
  if (!isSignedIn) return <AuthPage />;

  // Connecté mais onboarding pas fait → AuthPage (affiche OnboardingFlow)
  if (!onboardingDone) return <AuthPage />;

  // ✅ Connecté + onboarding OK → App complète
  return (
    <Routes>
      {/* Pages principales */}
      <Route path="/"      element={<TripsHub />} />
      <Route path="/world" element={<WorldMap />} />

      {/* Chat IA plein écran */}
      <Route path="/trip/:id/chat" element={<TripChat />} />

      {/* Cockpit voyage */}
      <Route path="/trip/:id" element={<TripCockpit />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview"   element={<Overview />} />
        <Route path="parcours"   element={<Parcours />} />
        <Route path="budget"     element={<Budget />} />
        <Route path="essentials" element={<Essentials />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// App principale — BrowserRouter en dehors de tout check auth
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>

          {/* ✅ CRITIQUE — Route SSO publique AVANT tout check auth
              Quand Google redirige vers /sso-callback, Clerk doit
              pouvoir finaliser l'OAuth sans être bloqué par isSignedIn */}
          <Route path="/sso-callback" element={<SSOCallback />} />

          {/* ✅ Partage — public, pas besoin d'être connecté */}
          <Route path="/share/:id" element={<ShareView />} />

          {/* ✅ Toutes les routes protégées */}
          <Route path="/*" element={<ProtectedRoutes />} />

        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}