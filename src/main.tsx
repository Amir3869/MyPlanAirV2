import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import './index.css';
import App from './App';
import { ToastProvider } from './shared/Toast';

// ─────────────────────────────────────────────────────────────────────────────
// FIX LEAFLET ICONS (Vite)
// ─────────────────────────────────────────────────────────────────────────────
import L from 'leaflet';
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─────────────────────────────────────────────────────────────────────────────
// Clerk publishable key — depuis .env.local
// ─────────────────────────────────────────────────────────────────────────────
const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

if (!CLERK_KEY) {
  throw new Error('❌ VITE_CLERK_PUBLISHABLE_KEY manquante dans .env.local');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* ✅ ClerkProvider enveloppe toute l'app */}
    <ClerkProvider publishableKey={CLERK_KEY}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ClerkProvider>
  </StrictMode>
);