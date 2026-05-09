import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Settings, Plane, MapPin, Wallet, Calendar, Sparkles } from 'lucide-react';
import { useTripStore } from '../../store/tripStore';
import { Flag } from '../../shared/Flag';
import { FAB } from '../../shared/FAB';
import { TripCreator } from './TripCreator';
import { dayCounter, fmtRange, tripStatus } from '../../utils/dateHelpers';
import { fmtMoney } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';

type Filter = 'all' | 'upcoming' | 'ongoing' | 'finished';

const STATUS_LABEL: Record<Exclude<Filter, 'all'>, { label: string; color: string }> = {
  upcoming: { label: 'À venir', color: '#7c8cff' },
  ongoing: { label: 'En cours', color: '#56c5a4' },
  finished: { label: 'Terminé', color: 'rgba(255,255,255,0.45)' },
};

export const TripsHub = () => {
  const trips = useTripStore(s => s.trips);
  const userName = useTripStore(s => s.userName);
  const [filter, setFilter] = useState<Filter>('all');
  const [creatorOpen, setCreatorOpen] = useState(false);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    if (filter === 'all') return trips;
    return trips.filter(t => tripStatus(t.startDate, t.endDate) === filter);
  }, [trips, filter]);

  return (
    <div className="min-h-screen relative">
      {/* Background aurora */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="aurora opacity-30" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-5 pt-safe pb-4 max-w-3xl mx-auto">
        <div className="flex items-start justify-between pt-4">
          <div>
            <div className="text-sm text-white/55 mb-1">Bonjour {userName} 👋</div>
            <h1 className="font-display text-5xl font-extrabold tracking-tighter">Voyages</h1>
          </div>
          <button className="w-11 h-11 glass rounded-full flex items-center justify-center tap">
            <Settings size={18} />
          </button>
        </div>

        {/* Filter pills */}
        <div className="mt-6 flex gap-2 overflow-x-auto -mx-5 px-5">
          {([
            { k: 'all' as const, l: 'Tous' },
            { k: 'upcoming' as const, l: 'À venir' },
            { k: 'ongoing' as const, l: 'En cours' },
            { k: 'finished' as const, l: 'Terminés' },
          ]).map(({ k, l }) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`pill px-4 py-2 text-sm font-medium whitespace-nowrap tap transition-all ${
                filter === k
                  ? 'bg-white text-black'
                  : 'glass text-white/75'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </header>

      {/* Trip cards */}
      <main className="relative z-10 px-5 pb-32 max-w-3xl mx-auto">
        {filtered.length === 0 ? (
          <EmptyState onCreate={() => setCreatorOpen(true)} hasAny={trips.length > 0} />
        ) : (
          <div className="space-y-4">
            {filtered.map((t, i) => {
              const status = tripStatus(t.startDate, t.endDate);
              const statusInfo = STATUS_LABEL[status];
              const spent = t.expenses.reduce((s, e) => s + e.amount, 0);
              const checklistDone = t.checklist.filter(c => c.done).length;
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, type: 'spring', damping: 22 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/trip/${t.id}/overview`)}
                  className="relative h-64 rounded-[24px] overflow-hidden cursor-pointer group"
                  style={{
                    backgroundImage: `url(${t.photoUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
                  }}
                >
                  {/* Overlay */}
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.85) 100%)' }} />
                  {status === 'finished' && <div className="absolute inset-0 bg-black/30" />}

                  {/* Top row */}
                  <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
                    <div className="glass-strong pill px-3 py-1.5 flex items-center gap-2">
                      <Flag code={t.countryCode} size={18} />
                      <span className="text-xs font-semibold tracking-tight">{t.country}</span>
                    </div>
                    <div
                      className="pill px-3 py-1.5 flex items-center gap-2 backdrop-blur-xl"
                      style={{ background: `${statusInfo.color}26`, border: `1px solid ${statusInfo.color}55` }}
                    >
                      {status === 'ongoing' && <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: statusInfo.color }} />}
                      <span className="text-xs font-semibold" style={{ color: statusInfo.color }}>{statusInfo.label}</span>
                    </div>
                  </div>

                  {/* Bottom content */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div className="text-2xl font-bold font-display tracking-tighter leading-tight">
                      {t.destination} <span className="text-white/55 font-semibold">— {t.country}</span>
                    </div>
                    <div className="text-sm text-white/65 mt-1 mb-4">{fmtRange(t.startDate, t.endDate)}</div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="pill px-3 py-1 glass-strong text-xs font-semibold">
                        {dayCounter(t.startDate, t.endDate)}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/75">
                        <span className="flex items-center gap-1"><MapPin size={12} />{t.steps.length}</span>
                        <span className="flex items-center gap-1"><Sparkles size={12} />{checklistDone}/{t.checklist.length}</span>
                        <span className="flex items-center gap-1"><Wallet size={12} />{fmtMoney(spent, t.currency)}/{fmtMoney(t.budget, t.currency)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <FAB onClick={() => setCreatorOpen(true)} label="Nouveau voyage">
        <Plus size={20} />
      </FAB>

      <AnimatePresence>
        {creatorOpen && <TripCreator onClose={() => setCreatorOpen(false)} />}
      </AnimatePresence>
    </div>
  );
};

const EmptyState = ({ onCreate, hasAny }: { onCreate: () => void; hasAny: boolean }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="glass-strong rounded-3xl p-10 text-center mt-8"
  >
    <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4"
      style={{ background: 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)' }}>
      <Plane size={28} className="text-white -rotate-12" />
    </div>
    <h3 className="font-display text-2xl font-bold tracking-tight mb-2">
      {hasAny ? 'Aucun voyage dans cette catégorie' : 'Votre prochaine aventure commence ici'}
    </h3>
    <p className="text-white/55 mb-6">
      {hasAny ? 'Changez de filtre ou créez un nouveau voyage.' : 'Créez votre premier carnet de voyage en quelques secondes.'}
    </p>
    <button
      onClick={onCreate}
      className="h-12 px-6 rounded-2xl font-semibold text-white tap inline-flex items-center gap-2"
      style={{ background: 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)' }}
    >
      <Plus size={18} /> Créer un voyage
    </button>
    <div className="mt-6 flex items-center justify-center gap-4 text-xs text-white/35">
      <Calendar size={12} /> Hors-ligne · iCloud-style · Premium
    </div>
  </motion.div>
);
