// src/features/cockpit/TripCockpit.tsx
import { useState } from 'react';
import { useNavigate, useParams, Outlet, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Share2, LayoutDashboard,
  Map, Wallet, ListChecks, Trash2, AlertTriangle,
  MessageCircle,
} from 'lucide-react';
import { useTrip, useTripStore } from '../../store/tripStore';
import { Flag } from '../../shared/Flag';
import { BottomSheet } from '../../shared/BottomSheet';
import { useToast } from '../../shared/Toast';
import { bgOpacityForTime, dayCounter, fmtRange } from '../../utils/dateHelpers';

const encodeTripForShare = (trip: object): string => {
  try {
    const json    = JSON.stringify(trip);
    const encoded = btoa(encodeURIComponent(json));
    return encoded;
  } catch {
    return '';
  }
};

export const TripCockpit = () => {
  const { id }      = useParams<{ id: string }>();
  const trip        = useTrip(id);
  const navigate    = useNavigate();
  const removeTrip  = useTripStore((s) => s.removeTrip);
  const { success } = useToast();

  const [shareOpen,  setShareOpen]  = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/55">
        <div className="text-center">
          <p>Voyage introuvable.</p>
          <button onClick={() => navigate('/')} className="mt-4 underline">
            Retour
          </button>
        </div>
      </div>
    );
  }

  const opacity  = bgOpacityForTime();
  const encoded  = encodeTripForShare(trip);
  const shareUrl = encoded
    ? `${window.location.origin}/share/${trip.id}?v=${encoded}`
    : `${window.location.origin}/share/${trip.id}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      success('Lien copié dans le presse-papier !');
      setShareOpen(false);
    } catch {
      success('Lien prêt à être partagé !');
    }
  };

  const handleDelete = () => {
    removeTrip(trip.id);
    setDeleteOpen(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen relative">

      {/* Background photo */}
      <div
        className="fixed inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${trip.photoUrl})`,
          opacity,
          filter:    'blur(2px)',
          transform: 'scale(1.05)',
        }}
      />
      <div
        className="fixed inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(7,7,11,0.85) 60%, rgba(7,7,11,0.95) 100%)',
        }}
      />

      {/* Header */}
      <header className="relative z-10 px-5 pt-safe">
        <div className="max-w-3xl mx-auto pt-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-full glass flex items-center justify-center tap"
            aria-label="Retour"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShareOpen(true)}
              className="w-10 h-10 rounded-full glass flex items-center justify-center tap"
              aria-label="Partager"
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="w-10 h-10 rounded-full glass flex items-center justify-center tap text-red-400"
              aria-label="Supprimer le voyage"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto mt-6 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Flag code={trip.countryCode} size={20} />
            <span className="text-sm text-white/65 font-medium">{trip.country}</span>
            <span className="ml-auto pill px-3 py-1 glass-strong text-xs font-semibold">
              {dayCounter(trip.startDate, trip.endDate)}
            </span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tighter">
            {trip.destination}
          </h1>
          <p className="text-white/55 mt-1">
            {fmtRange(trip.startDate, trip.endDate)}
          </p>
        </div>
      </header>

      {/* Contenu enfant */}
      <main className="relative z-10 max-w-3xl mx-auto px-5 pb-32">
        <Outlet context={{ trip }} />
      </main>

      {/* ✅ Navigation bottom — couleur thème via CSS variables */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 pb-safe">
        <div className="max-w-3xl mx-auto px-4 pb-2">
          <div className="glass-strong rounded-[28px] p-1.5 flex items-center justify-around">
            {[
              { to: 'overview',   icon: LayoutDashboard, label: 'Aperçu'   },
              { to: 'parcours',   icon: Map,             label: 'Parcours' },
              { to: 'budget',     icon: Wallet,          label: 'Budget'   },
              { to: 'essentials', icon: ListChecks,      label: 'Prep.'    },
              { to: 'chat',       icon: MessageCircle,   label: 'ARIA'     },
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
                        style={{
                          // ✅ CSS variables thème — s'adapte automatiquement
                          background: to === 'chat'
                            ? 'rgba(var(--accent-from-rgb), 0.45)'
                            : 'rgba(var(--accent-from-rgb), 0.32)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)',
                        }}
                        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                      />
                    )}
                    <Icon size={20} className="relative" />
                    <span className="relative text-[10px] font-semibold tracking-tight">
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Share BottomSheet */}
      <BottomSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Partager le voyage"
      >
        <p className="text-white/65 text-sm mb-4">
          Ce lien permet à n'importe qui de consulter votre voyage en lecture seule.
          Les dépenses marquées comme privées sont masquées.
        </p>
        <div
          className="rounded-2xl p-4 flex items-center gap-3 mb-4"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border:     '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div className="flex-1 truncate text-sm font-mono text-white/55">
            {`${window.location.origin}/share/${trip.id}?v=...`}
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="w-full h-12 rounded-2xl font-semibold text-white tap flex items-center justify-center gap-2"
          style={{
            // ✅ CSS variables thème
            background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)',
          }}
        >
          <Share2 size={16} />
          Copier le lien de partage
        </button>
        <p className="text-xs text-white/35 mt-4 text-center">
          Ce lien fonctionne sur tous les appareils · Données encodées dans l'URL
        </p>
      </BottomSheet>

      {/* Modal Suppression */}
      <AnimatePresence>
        {deleteOpen && (
          <motion.div
            className="fixed inset-0 z-[150] flex items-center justify-center p-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteOpen(false)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="relative w-full max-w-sm rounded-3xl p-6 text-center"
              style={{
                background:     'rgba(20,20,28,0.95)',
                border:         '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(32px)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(239,68,68,0.15)' }}
              >
                <AlertTriangle size={26} style={{ color: '#ef4444' }} />
              </div>
              <h2 className="text-xl font-bold tracking-tight mb-2">
                Supprimer ce voyage ?
              </h2>
              <p className="text-sm text-white/55 mb-6 leading-relaxed">
                <span className="text-white font-semibold">{trip.destination}</span>{' '}
                et toutes ses données seront définitivement supprimés.
                Cette action est irréversible.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteOpen(false)}
                  className="flex-1 h-12 rounded-2xl font-semibold text-white/80 tap"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border:     '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 h-12 rounded-2xl font-semibold text-white tap"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  }}
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};