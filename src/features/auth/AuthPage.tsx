import { motion } from 'framer-motion';
import { useTripStore } from '../../store/tripStore';
import { Plane } from 'lucide-react';

const AppleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16.365 1.43c0 1.14-.42 2.16-1.13 2.93-.74.78-1.95 1.39-3.06 1.3-.13-1.12.42-2.27 1.12-3.01.79-.83 2.13-1.46 3.07-1.49zM20.5 17.05c-.55 1.27-.81 1.84-1.52 2.96-.99 1.56-2.39 3.5-4.12 3.51-1.54.02-1.93-.99-4.02-.98-2.09.01-2.52 1-4.06.98-1.74-.02-3.06-1.78-4.05-3.34C-.04 16.32-.34 11.45 1.39 8.86c1.22-1.83 3.16-2.91 4.97-2.91 1.85 0 3.01 1.01 4.54 1.01 1.49 0 2.39-1.01 4.53-1.01 1.62 0 3.34.88 4.55 2.41-3.99 2.18-3.34 7.81 1.52 8.69z"/></svg>
);

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
);

export const AuthPage = () => {
  const setAuthed = useTripStore(s => s.setAuthed);
  const continueAs = (name: string) => setAuthed(true, name);

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&q=80)',
          filter: 'blur(8px) brightness(0.45)',
          transform: 'scale(1.1)',
        }}
      />
      <div className="aurora opacity-70" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/70" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative z-10 w-full max-w-md px-6 text-center"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', damping: 16 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-8"
          style={{ background: 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)', boxShadow: '0 20px 60px rgba(124,140,255,0.5)' }}
        >
          <Plane size={36} className="text-white -rotate-12" />
        </motion.div>

        <h1 className="font-display text-5xl sm:text-6xl font-extrabold tracking-tighter mb-3">
          MyTrip
        </h1>
        <p className="text-white/65 text-lg mb-12 tracking-tight">
          Vos voyages, sublimés.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => continueAs('Voyageur')}
            className="w-full h-14 rounded-2xl bg-white text-black font-semibold flex items-center justify-center gap-3 tap"
          >
            <GoogleIcon />
            Continuer avec Google
          </button>
          <button
            onClick={() => continueAs('Voyageur')}
            className="w-full h-14 rounded-2xl bg-black text-white font-semibold flex items-center justify-center gap-3 tap border border-white/15"
          >
            <AppleIcon />
            Continuer avec Apple
          </button>
        </div>

        <button
          onClick={() => continueAs('Voyageur')}
          className="mt-8 text-sm text-white/55 hover:text-white tap"
        >
          Continuer avec un email →
        </button>

        <p className="absolute -bottom-20 left-0 right-0 text-xs text-white/35">
          En continuant, vous acceptez nos conditions.
        </p>
      </motion.div>
    </div>
  );
};
