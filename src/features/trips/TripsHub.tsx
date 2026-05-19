// src/features/trips/TripsHub.tsx
import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useTransform, type MotionStyle } from 'framer-motion';
import {
  Plus, Settings, Plane, MapPin,
  Wallet, Calendar, Sparkles, Globe, Trash2, AlertTriangle, Map,
} from 'lucide-react';
import { useTripStore, type Trip } from '../../store/tripStore';
import { FAB } from '../../shared/FAB';
import { TripCreator } from './TripCreator';
import { SettingsSheet } from '../settings/SettingsSheet';
import { dayCounter, fmtRange, tripStatus } from '../../utils/dateHelpers';
import { fmtMoney } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../shared/Toast';
import {
  BellWithBadge,
  NotificationCenter,
  useNotificationGenerator,
} from '../notifications/NotificationCenter';

type Filter = 'all' | 'upcoming' | 'ongoing' | 'finished';

const STATUS_LABEL: Record<
  Exclude<Filter, 'all'>,
  { label: string; color: string }
> = {
  upcoming: { label: 'À venir',  color: '#7c8cff' },
  ongoing:  { label: 'En cours', color: '#56c5a4' },
  finished: { label: 'Terminé',  color: 'rgba(255,255,255,0.45)' },
};

// ─────────────────────────────────────────────────────────────────────────────
// ✅ Greeting dynamique selon l'heure
// ─────────────────────────────────────────────────────────────────────────────
const getDynamicGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 18) return 'Bonjour';
  return 'Bonsoir';
};

// ─────────────────────────────────────────────────────────────────────────────
// FlagBadge
// ─────────────────────────────────────────────────────────────────────────────
const FlagBadge = ({
  countryCode,
  countryName,
}: {
  countryCode: string;
  countryName: string;
}) => {
  const cc = (countryCode || '').toUpperCase();

  const getFlagEmoji = (code: string): string => {
    if (code.length !== 2) return '🌍';
    const A = 0x1f1e6;
    try {
      return (
        String.fromCodePoint(A + code.charCodeAt(0) - 65) +
        String.fromCodePoint(A + code.charCodeAt(1) - 65)
      );
    } catch {
      return '🌍';
    }
  };

  const flagEmoji = getFlagEmoji(cc);
  const flagStyle: React.CSSProperties = {
    fontSize:      '18px',
    lineHeight:    '1',
    display:       'inline-block',
    fontFamily:    '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif',
    userSelect:    'none',
    letterSpacing: '0',
  };

  return (
    <div className="glass-strong pill px-3 py-1.5 flex items-center gap-2">
      <span aria-label={`Drapeau ${countryName}`} role="img" style={flagStyle}>
        {flagEmoji}
      </span>
      <span className="text-xs font-semibold tracking-tight">{countryName}</span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SwipeableTripCard
// ─────────────────────────────────────────────────────────────────────────────
const SwipeableTripCard = ({
  trip,
  index,
  onDelete,
  onClick,
}: {
  trip:     Trip;
  index:    number;
  onDelete: (trip: Trip) => void;
  onClick:  () => void;
}) => {
  const status        = tripStatus(trip.startDate, trip.endDate);
  const statusInfo    = STATUS_LABEL[status];
  const spent         = trip.expenses.reduce((s, e) => s + e.amount, 0);
  const checklistDone = trip.checklist.filter((c) => c.done).length;

  const x             = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-80, -20], [1, 0]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isDragging    = useRef(false);

  const destinationLabel = trip.isRoadtrip ? trip.country : trip.destination;
  const subLabel         = trip.isRoadtrip
    ? `Roadtrip · ${trip.destinations?.length ?? 0} villes`
    : trip.country;

  const cardMotionStyle: MotionStyle = {
    backgroundImage:    `url(${trip.photoUrl})`,
    backgroundSize:     'cover',
    backgroundPosition: 'center',
    boxShadow:          '0 24px 60px rgba(0,0,0,0.45)',
    x,
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06, type: 'spring', damping: 22 }}
        className="relative"
        style={{ touchAction: 'pan-y' }}
      >
        {/* Bouton rouge derrière */}
        <motion.div
          style={{ opacity: deleteOpacity }}
          className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center rounded-[24px]"
        >
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmOpen(true); }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.9)' }}
          >
            <Trash2 size={20} className="text-white" />
          </button>
        </motion.div>

        {/* Card */}
        <motion.div
          drag="x"
          dragConstraints={{ left: -80, right: 0 }}
          dragElastic={{ left: 0.1, right: 0.05 }}
          style={cardMotionStyle}
          onDragStart={() => { isDragging.current = true; }}
          onDragEnd={(_, info) => {
            setTimeout(() => { isDragging.current = false; }, 100);
            if (info.offset.x > -40) x.set(0);
          }}
          onClick={() => { if (!isDragging.current) onClick(); }}
          className="relative h-64 rounded-[24px] overflow-hidden cursor-pointer"
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg,rgba(0,0,0,0.25) 0%,rgba(0,0,0,0.55) 60%,rgba(0,0,0,0.85) 100%)',
            }}
          />
          {status === 'finished' && <div className="absolute inset-0 bg-black/30" />}

          {/* TOP */}
          <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2">
            <FlagBadge countryCode={trip.countryCode} countryName={trip.country} />
            <div className="flex items-center gap-2">
              {trip.isRoadtrip && (
  <div
    className="pill px-2.5 py-1.5 flex items-center gap-1.5 backdrop-blur-xl"
    style={{
      // ✅ Couleur thème via CSS variables — même logique que chips statut
      background: 'rgba(var(--accent-from-rgb), 0.18)',
      border:     '1px solid rgba(var(--accent-from-rgb), 0.38)',
    }}
  >
    <Map size={11} style={{ color: 'var(--accent-label)' }} />
    <span className="text-[10px] font-semibold" style={{ color: 'var(--accent-label)' }}>
      Roadtrip
    </span>
  </div>
)}
              <div
  className="pill px-3 py-1.5 flex items-center gap-2 backdrop-blur-xl"
  style={{
    // ✅ "En cours" et "Terminé" gardent leur couleur sémantique
    // ✅ "À venir" prend la couleur du thème (léger, glass)
    background: status === 'upcoming'
      ? 'rgba(var(--accent-from-rgb), 0.18)'
      : `${statusInfo.color}26`,
    border: status === 'upcoming'
      ? '1px solid rgba(var(--accent-from-rgb), 0.38)'
      : `1px solid ${statusInfo.color}55`,
  }}
>
  {status === 'ongoing' && (
    <span
      className="w-2 h-2 rounded-full pulse-dot"
      style={{ background: statusInfo.color }}
    />
  )}
  <span
    className="text-xs font-semibold"
    style={{
      // ✅ "À venir" → couleur accent-label du thème
      color: status === 'upcoming'
        ? 'var(--accent-label)'
        : statusInfo.color,
    }}
  >
    {statusInfo.label}
  </span>
</div>
            </div>
          </div>

          {/* BOTTOM */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="text-2xl font-bold font-display tracking-tighter leading-tight">
              {destinationLabel}{' '}
              <span className="text-white/55 font-semibold">— {subLabel}</span>
            </div>
            <div className="text-sm text-white/65 mt-1 mb-4">
              {fmtRange(trip.startDate, trip.endDate)}
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="pill px-3 py-1 glass-strong text-xs font-semibold">
                {dayCounter(trip.startDate, trip.endDate)}
              </div>
              <div className="flex items-center gap-3 text-xs text-white/75">
                <span className="flex items-center gap-1">
                  <MapPin size={12} />{trip.steps.length}
                </span>
                <span className="flex items-center gap-1">
                  <Sparkles size={12} />{checklistDone}/{trip.checklist.length}
                </span>
                <span className="flex items-center gap-1">
                  <Wallet size={12} />
                  {fmtMoney(spent, trip.currency)}/
                  {fmtMoney(trip.budget, trip.currency)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Modal confirmation suppression */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            className="fixed inset-0 z-[150] flex items-center justify-center p-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmOpen(false)}
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
                <span className="text-white font-semibold">
                  {trip.isRoadtrip ? `${trip.country} · Roadtrip` : trip.destination}
                </span>{' '}
                et toutes ses données seront définitivement supprimés.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="flex-1 h-12 rounded-2xl font-semibold text-white/80 tap"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border:     '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={() => { setConfirmOpen(false); onDelete(trip); }}
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
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EMOJI DYNAMIQUE selon statut voyage
// ─────────────────────────────────────────────────────────────────────────────
const getDynamicEmoji = (trips: Trip[]): string => {
  const hasOngoing  = trips.some((t) => tripStatus(t.startDate, t.endDate) === 'ongoing');
  const hasUpcoming = trips.some((t) => tripStatus(t.startDate, t.endDate) === 'upcoming');

  if (hasOngoing) return '✈️';

  if (hasUpcoming) {
    const next = trips
      .filter((t) => tripStatus(t.startDate, t.endDate) === 'upcoming')
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];

    if (next) {
      const now      = new Date(); now.setHours(0, 0, 0, 0);
      const start    = new Date(next.startDate); start.setHours(0, 0, 0, 0);
      const daysLeft = Math.round((start.getTime() - now.getTime()) / 86400000);
      if (daysLeft <= 1) return '⚡';
      if (daysLeft <= 7) return '🗺️';
    }
    return '🗺️';
  }

  if (trips.length > 0) return '🏆';
  return '🌍';
};

// ─────────────────────────────────────────────────────────────────────────────
// TRIPHUB PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export const TripsHub = () => {
  const trips      = useTripStore((s) => s.trips);
  const userName   = useTripStore((s) => s.userName);
  const removeTrip = useTripStore((s) => s.removeTrip);

  const [filter,       setFilter]       = useState<Filter>('all');
  const [creatorOpen,  setCreatorOpen]  = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifOpen,    setNotifOpen]    = useState(false);

  const navigate  = useNavigate();
  const { toast } = useToast();

  useNotificationGenerator();

  const filtered = useMemo(() => {
    if (filter === 'all') return trips;
    return trips.filter((t) => tripStatus(t.startDate, t.endDate) === filter);
  }, [trips, filter]);

  // ✅ FAB masqué si filtered.length === 0 (filtre vide OU aucun voyage)
  const showFAB = filtered.length > 0;

  // ✅ Emoji dynamique selon statut
  const dynamicEmoji = getDynamicEmoji(trips);

  // ✅ Greeting dynamique selon l'heure
  const greeting = getDynamicGreeting();

  const handleDelete = (trip: Trip) => {
    removeTrip(trip.id);
    toast(
      `${trip.isRoadtrip ? `${trip.country} · Roadtrip` : trip.destination} supprimé`,
      'info',
    );
  };

  // ─── Labels des filtres ───────────────────────────────────────────────────
  const FILTER_ITEMS = [
    { k: 'all'      as const, l: 'Tous'     },
    { k: 'upcoming' as const, l: 'À venir'  },
    { k: 'ongoing'  as const, l: 'En cours' },
    { k: 'finished' as const, l: 'Terminés' },
  ] as const;

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="aurora opacity-30" />
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 px-5 pt-safe max-w-3xl mx-auto">

        {/* ── Ligne 1 : Greeting + boutons ── */}
        <div className="flex items-center justify-between pt-5">
          <div className="text-sm text-white/50 leading-tight">
            {/* ✅ Greeting dynamique + emoji à droite du prénom */}
            {greeting} {userName} {dynamicEmoji}
          </div>

          {/* Boutons header */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <BellWithBadge onClick={() => setNotifOpen(true)} />
            <button
              onClick={() => navigate('/world')}
              className="w-11 h-11 glass rounded-full flex items-center justify-center tap"
              aria-label="Carte du monde"
            >
              <Globe size={18} />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-11 h-11 glass rounded-full flex items-center justify-center tap"
              aria-label="Réglages"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* ── Ligne 2 : Titre — avec espace respirant sous le greeting ── */}
        {/* ✅ Option B : mt-6 entre greeting et titre */}
        <h1 className="font-display text-4xl font-extrabold tracking-tighter leading-tight mt-6">
          Mes Voyages
        </h1>

        
        {/* ── Filtres avec soulignement thème ── */}
        <div className="mt-4 flex gap-2 overflow-x-auto -mx-5 px-5 pb-1">
          {FILTER_ITEMS.map(({ k, l }) => {
            const isActive = filter === k;
            return (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className="relative flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-medium whitespace-nowrap tap transition-all"
                style={{
                  // ✅ Actif : glass teinté thème — Inactif : glass standard
                  background: isActive
                    ? 'rgba(var(--accent-from-rgb), 0.15)'
                    : 'rgba(255,255,255,0.06)',
                  border: isActive
                    ? '1px solid rgba(var(--accent-from-rgb), 0.30)'
                    : '1px solid rgba(255,255,255,0.10)',
                  // ✅ Texte couleur accent-label si actif, blanc/75 sinon
                  color: isActive
                    ? 'var(--accent-label)'
                    : 'rgba(255,255,255,0.75)',
                  backdropFilter: isActive ? 'blur(20px)' : undefined,
                  WebkitBackdropFilter: isActive ? 'blur(20px)' : undefined,
                }}
              >
                {l}
                {/* ✅ Soulignement 2px couleur thème sous le texte si actif */}
                {isActive && (
                  <motion.div
                    layoutId="filterUnderline"
                    className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-0.5 rounded-full"
                    style={{
                      width:      '60%',
                      background: 'var(--accent-from)',
                    }}
                    transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── Cartes voyages ── */}
      {/* ✅ mt-5 identique à l'original entre filtres et cartes */}
      <main className="relative z-10 px-5 pb-32 max-w-3xl mx-auto mt-5">
        {filtered.length === 0 ? (
          <EmptyState
            onCreate={() => setCreatorOpen(true)}
            hasAny={trips.length > 0}
          />
        ) : (
          <div className="space-y-5">
            {filtered.map((t, i) => (
              <SwipeableTripCard
                key={t.id}
                trip={t}
                index={i}
                onDelete={handleDelete}
                onClick={() => navigate(`/trip/${t.id}/overview`)}
              />
            ))}
          </div>
        )}
      </main>

      {/* ✅ FAB masqué quand filtered.length === 0 (EmptyState visible) */}
      <FAB
        onClick={() => setCreatorOpen(true)}
        label="Nouveau voyage"
        hidden={!showFAB}
      >
        <Plus size={20} />
      </FAB>

      <AnimatePresence>
        {creatorOpen && <TripCreator onClose={() => setCreatorOpen(false)} />}
      </AnimatePresence>

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <NotificationCenter
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EmptyState — épuré
// ─────────────────────────────────────────────────────────────────────────────
const EmptyState = ({
  onCreate,
  hasAny,
}: {
  onCreate: () => void;
  hasAny:   boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="glass-strong rounded-3xl p-10 text-center mt-8"
  >
    <div
      className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4"
      style={{
        background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)',
      }}
    >
      <Plane size={28} className="text-white -rotate-12" />
    </div>
    <h3 className="font-display text-2xl font-bold tracking-tight mb-2">
      {hasAny
        ? 'Aucun voyage dans cette catégorie'
        : 'Votre prochaine aventure commence ici'}
    </h3>
    <p className="text-white/55 mb-8">
      {hasAny
        ? 'Changez de filtre ou créez un nouveau voyage.'
        : 'Créez votre premier carnet de voyage en quelques secondes.'}
    </p>

    {/* ✅ Bouton CTA — CSS variables thème */}
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onCreate}
      className="h-14 px-8 rounded-2xl font-semibold text-white inline-flex items-center gap-2 shadow-lg"
      style={{
        background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)',
        boxShadow:  '0 8px 32px rgba(var(--accent-from-rgb, 124,140,255), 0.4)',
      }}
    >
      <Plus size={20} /> Créer un voyage
    </motion.button>
  </motion.div>
);