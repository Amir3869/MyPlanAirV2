import { useNavigate, useParams, Outlet, NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Share2, LayoutDashboard, Map, Wallet, ListChecks, Trash2 } from 'lucide-react';
import { useTrip, useTripStore } from '../../store/tripStore';
import { Flag } from '../../shared/Flag';
import { bgOpacityForTime, dayCounter, fmtRange } from '../../utils/dateHelpers';
import { useState } from 'react';
import { BottomSheet } from '../../shared/BottomSheet';

export const TripCockpit = () => {
  const { id } = useParams<{ id: string }>();
  const trip = useTrip(id);
  const navigate = useNavigate();
  const removeTrip = useTripStore(s => s.removeTrip);
  const [shareOpen, setShareOpen] = useState(false);

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/55">
        <div className="text-center">
          <p>Voyage introuvable.</p>
          <button onClick={() => navigate('/')} className="mt-4 underline">Retour</button>
        </div>
      </div>
    );
  }

  const opacity = bgOpacityForTime();
  const shareUrl = `${window.location.origin}/share/${trip.id}`;

  return (
    <div className="min-h-screen relative">
      {/* Persistent background photo with timelapse opacity */}
      <div
        className="fixed inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${trip.photoUrl})`,
          opacity,
          filter: 'blur(2px)',
          transform: 'scale(1.05)',
        }}
      />
      <div className="fixed inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(7,7,11,0.85) 60%, rgba(7,7,11,0.95) 100%)' }} />

      {/* Header */}
      <header className="relative z-10 px-5 pt-safe">
        <div className="max-w-3xl mx-auto pt-3 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="w-10 h-10 rounded-full glass flex items-center justify-center tap">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setShareOpen(true)} className="w-10 h-10 rounded-full glass flex items-center justify-center tap">
              <Share2 size={16} />
            </button>
            <button
              onClick={() => { removeTrip(trip.id); navigate('/'); }}
              className="w-10 h-10 rounded-full glass flex items-center justify-center tap text-red-400"
              title="Supprimer le voyage"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto mt-6 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Flag code={trip.countryCode} size={20} />
            <span className="text-sm text-white/65 font-medium">{trip.country}</span>
            <span className="ml-auto pill px-3 py-1 glass-strong text-xs font-semibold">{dayCounter(trip.startDate, trip.endDate)}</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tighter">{trip.destination}</h1>
          <p className="text-white/55 mt-1">{fmtRange(trip.startDate, trip.endDate)}</p>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 max-w-3xl mx-auto px-5 pb-32">
        <Outlet context={{ trip }} />
      </main>

      {/* Bottom navigation iOS-style */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 pb-safe">
        <div className="max-w-3xl mx-auto px-4 pb-2">
          <div className="glass-strong rounded-[28px] p-1.5 flex items-center justify-around">
            {[
              { to: 'overview', icon: LayoutDashboard, label: 'Aperçu' },
              { to: 'parcours', icon: Map, label: 'Parcours' },
              { to: 'budget', icon: Wallet, label: 'Budget' },
              { to: 'essentials', icon: ListChecks, label: 'Essentiels' },
            ].map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `relative flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-[22px] tap transition ${
                    isActive ? 'text-white' : 'text-white/55'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="navPill"
                        className="absolute inset-0 rounded-[22px]"
                        style={{ background: 'linear-gradient(135deg, rgba(124,140,255,0.35), rgba(236,72,153,0.25))', border: '1px solid rgba(255,255,255,0.15)' }}
                        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                      />
                    )}
                    <Icon size={20} className="relative" />
                    <span className="relative text-[10px] font-semibold tracking-tight">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Share sheet */}
      <BottomSheet open={shareOpen} onClose={() => setShareOpen(false)} title="Partager le voyage">
        <p className="text-white/65 text-sm mb-3">Lien de consultation (lecture seule). Les dépenses privées sont masquées.</p>
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="flex-1 truncate text-sm font-mono text-white/75">{shareUrl}</div>
          <button
            onClick={() => { navigator.clipboard?.writeText(shareUrl); }}
            className="px-3 py-2 rounded-xl bg-white text-black text-sm font-semibold tap"
          >
            Copier
          </button>
        </div>
        <p className="text-xs text-white/40 mt-4">SaaS-ready : ce lien est conçu pour devenir public dans la prochaine version (collaboration multi-utilisateurs).</p>
      </BottomSheet>
    </div>
  );
};
