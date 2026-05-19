// src/features/parcours/Parcours.tsx
import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun, SunDim, Moon, Plus, Check, Trash2,
  MapPin, Sparkles, ChevronRight, Map,
} from 'lucide-react';
import { useTripContext } from '../cockpit/useTripContext';
import { useTripStore, type Step, type StepPeriod, type StepType } from '../../store/tripStore';
import { GlassCard } from '../../shared/GlassCard';
import { BottomSheet } from '../../shared/BottomSheet';
import { daysBetween, getTimeOfDay, addDaysISO, fmtDate } from '../../utils/dateHelpers';
import { haptic } from '../../utils/haptic';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────
const PERIODS: { key: StepPeriod; label: string; icon: typeof Sun; color: string }[] = [
  { key: 'morning',   label: 'Matin',      icon: Sun,    color: '#56c5a4' },
  { key: 'afternoon', label: 'Après-midi', icon: SunDim, color: '#f0b24a' },
  { key: 'night',     label: 'Soir',       icon: Moon,   color: '#7c8cff' },
];

const TYPES: { key: StepType; label: string; emoji: string; color: string }[] = [
  { key: 'sight',     label: 'Visite',    emoji: '🗺️', color: '#7c8cff' },
  { key: 'food',      label: 'Resto',     emoji: '🍽️', color: '#f0b24a' },
  { key: 'transport', label: 'Transport', emoji: '🚆', color: '#56c5a4' },
  { key: 'lodging',   label: 'Logement',  emoji: '🏨', color: '#ec4899' },
  { key: 'other',     label: 'Autre',     emoji: '✨', color: '#94a3b8' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Palette couleurs par ville (roadtrip)
// ─────────────────────────────────────────────────────────────────────────────
const CITY_PALETTE = [
  '#56c5a4', '#ec4899', '#7c8cff', '#f0b24a',
  '#a78bfa', '#34d399', '#fb923c', '#38bdf8',
];

const buildCityColorMap = (
  destinations: { city: string }[] | undefined,
): Record<string, string> => {
  if (!destinations || destinations.length === 0) return {};
  const uniqueCities = Array.from(new Set(destinations.map((d) => d.city)));
  const map: Record<string, string> = {};
  uniqueCities.forEach((city, idx) => {
    map[city] = CITY_PALETTE[idx % CITY_PALETTE.length];
  });
  return map;
};

const getCityForDay = (
  day: number,
  destinations: { city: string; fromDay: number; toDay: number }[] | undefined,
): string | null => {
  if (!destinations || destinations.length === 0) return null;
  const dest = destinations.find((d) => day >= d.fromDay && day <= d.toDay);
  return dest?.city ?? destinations[destinations.length - 1].city;
};

// ─────────────────────────────────────────────────────────────────────────────
// CityDaySeparator
// ─────────────────────────────────────────────────────────────────────────────
const CityDaySeparator = ({
  city, fromDay, toDay, color,
}: {
  city: string; fromDay: number; toDay: number; color: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: -6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="flex items-center gap-3 mb-4 px-1"
  >
    <div className="flex-1 h-px" style={{ background: `${color}40` }} />
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full"
      style={{ background: `${color}15`, border: `1px solid ${color}40` }}
    >
      <Map size={11} style={{ color }} />
      <span className="text-xs font-semibold tracking-tight" style={{ color }}>
        {city}
      </span>
      <span className="text-[10px] text-white/35">
        J{fromDay}→{toDay}
      </span>
    </div>
    <div className="flex-1 h-px" style={{ background: `${color}40` }} />
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Parcours principal
// ─────────────────────────────────────────────────────────────────────────────
export const Parcours = () => {
  const { trip }   = useTripContext();
  const days       = daysBetween(trip.startDate, trip.endDate);
  const updateStep = useTripStore((s) => s.updateStep);
  const removeStep = useTripStore((s) => s.removeStep);

  const [selectedDay, setSelectedDay] = useState(1);
  const [adderOpen,   setAdderOpen]   = useState(false);
  const [adderPeriod, setAdderPeriod] = useState<StepPeriod>('morning');

  const cityColorMap = useMemo(
    () => buildCityColorMap(trip.destinations),
    [trip.destinations],
  );

  const currentCity = useMemo(
    () => getCityForDay(selectedDay, trip.destinations),
    [selectedDay, trip.destinations],
  );

  const currentDestination = useMemo(() => {
    if (!trip.destinations) return null;
    return (
      trip.destinations.find(
        (d) => selectedDay >= d.fromDay && selectedDay <= d.toDay,
      ) ?? null
    );
  }, [selectedDay, trip.destinations]);

  const currentCityColor = currentCity
    ? (cityColorMap[currentCity] ?? '#7c8cff')
    : '#7c8cff';

  const stepsByPeriod = useMemo(() => {
    const map: Record<StepPeriod, Step[]> = { morning: [], afternoon: [], night: [] };
    trip.steps.filter((s) => s.day === selectedDay).forEach((s) => map[s.period].push(s));
    return map;
  }, [trip.steps, selectedDay]);

  const currentPeriod = getTimeOfDay();

  const isToday = (() => {
    const start = new Date(trip.startDate); start.setHours(0, 0, 0, 0);
    const now   = new Date(); now.setHours(0, 0, 0, 0);
    const dayIdx = Math.round((now.getTime() - start.getTime()) / 86400000) + 1;
    return dayIdx === selectedDay;
  })();

  const openAdder = (period: StepPeriod) => {
    setAdderPeriod(period);
    setAdderOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* ── Sélecteur de jour ── */}
      <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-2">
        {Array.from({ length: days }, (_, i) => i + 1).map((d) => {
          const dateISO = addDaysISO(trip.startDate, d - 1);
          const active  = selectedDay === d;
          const dayCity = getCityForDay(d, trip.destinations);

          // ✅ Roadtrip → couleur de la ville
          // ✅ Voyage simple → couleur du thème via CSS variables
          const dayColor = trip.isRoadtrip && dayCity
            ? (cityColorMap[dayCity] ?? '#7c8cff')
            : null;

          // ✅ Pour voyage simple : on utilise les CSS variables directement
          // via style inline conditionnel
          const isFirstDayOfStop =
            trip.destinations?.some((dest) => dest.fromDay === d) ?? false;

          return (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              className="flex-shrink-0 rounded-2xl px-4 py-3 tap min-w-[68px] transition relative"
              style={
                trip.isRoadtrip
                  ? {
                      // ── MODE ROADTRIP : couleur par ville ──────────────────
                      background: active
                        ? (dayColor ?? 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)')
                        : dayColor
                        ? `${dayColor}18`
                        : 'rgba(255,255,255,0.06)',
                      border: active
                        ? 'none'
                        : dayColor
                        ? `1px solid ${dayColor}35`
                        : '1px solid rgba(255,255,255,0.1)',
                      color: '#ffffff',
                    }
                  : {
                      // ── MODE VOYAGE SIMPLE : couleur du thème ─────────────
                      // ✅ Actif → gradient thème complet
                      // ✅ Inactif → teinte légère du thème à 15% d'opacité
                      background: active
                        ? 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)'
                        : 'rgba(var(--accent-from-rgb), 0.13)',
                      border: active
                        ? 'none'
                        : '1px solid rgba(var(--accent-from-rgb), 0.28)',
                      color: '#ffffff',
                    }
              }
            >
              {/* ✅ Point indicateur premier jour d'un stop (roadtrip uniquement) */}
              {isFirstDayOfStop && trip.isRoadtrip && !active && dayColor && (
                <div
                  className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                  style={{ background: dayColor }}
                />
              )}
              <div className="text-[10px] uppercase tracking-wider opacity-65">Jour {d}</div>
              <div className="text-lg font-bold font-display tracking-tight">
                {fmtDate(dateISO, { day: '2-digit' })}
              </div>
              <div className="text-[10px] opacity-65">
                {fmtDate(dateISO, { weekday: 'short' })}
              </div>
              {/* ✅ Nom de ville affiché UNIQUEMENT en mode roadtrip */}
              {dayCity && trip.isRoadtrip && (
                <div
                  className="text-[9px] mt-0.5 font-semibold truncate max-w-[60px]"
                  style={{
                    color: active
                      ? 'rgba(255,255,255,0.75)'
                      : (dayColor ?? 'rgba(255,255,255,0.5)'),
                  }}
                >
                  {dayCity.split(' ')[0]}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Séparateur de ville (roadtrip uniquement) ── */}
      <AnimatePresence mode="wait">
        {trip.isRoadtrip && currentCity && currentDestination && (
          <motion.div
            key={currentCity}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <CityDaySeparator
              city={currentCity}
              fromDay={currentDestination.fromDay}
              toDay={currentDestination.toDay}
              color={currentCityColor}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Timeline ── */}
      <div className="space-y-4">
        {PERIODS.map((p) => {
          const dimmed =
            isToday &&
            ((p.key === 'morning' && currentPeriod !== 'morning') ||
              (p.key === 'afternoon' && currentPeriod === 'night'));

          const Icon  = p.icon;
          const items = stepsByPeriod[p.key];

          return (
            <div key={p.key} className="transition-opacity" style={{ opacity: dimmed ? 0.5 : 1 }}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: `${p.color}26` }}
                >
                  <Icon size={15} style={{ color: p.color }} />
                </div>
                <div
                  className="text-xs uppercase tracking-wider font-semibold"
                  style={{ color: p.color }}
                >
                  {p.label}
                </div>
                <div className="flex-1 h-px" style={{ background: `${p.color}33` }} />
                <span className="text-xs text-white/45">{items.length}</span>
              </div>

              <div className="space-y-2">
                <AnimatePresence>
                  {items.map((step) => {
                    const tt = TYPES.find((t) => t.key === step.type);
                    return (
                      <motion.div
                        key={step.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                      >
                        <GlassCard className="p-4 flex items-center gap-3">
                          <button
                            onClick={() => {
                              haptic(8);
                              updateStep(trip.id, step.id, { done: !step.done });
                            }}
                            className="w-7 h-7 rounded-full border-2 flex items-center justify-center tap flex-shrink-0 transition"
                            style={{
                              background:  step.done ? '#56c5a4' : 'transparent',
                              borderColor: step.done ? '#56c5a4' : 'rgba(255,255,255,0.3)',
                            }}
                          >
                            {step.done && <Check size={14} className="text-black" strokeWidth={3} />}
                          </button>
                          <div className="text-xl">{tt?.emoji}</div>
                          <div className="flex-1 min-w-0">
                            <div
                              className={`font-semibold tracking-tight truncate ${
                                step.done ? 'line-through opacity-55' : ''
                              }`}
                            >
                              {step.title}
                            </div>
                            <div className="text-xs text-white/55 flex items-center gap-1 mt-0.5">
                              <MapPin size={10} /> {step.place}
                            </div>
                            {step.notes && (
                              <div className="text-xs text-white/45 mt-1 italic truncate">
                                {step.notes}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => removeStep(trip.id, step.id)}
                            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center tap text-red-400/80"
                          >
                            <Trash2 size={13} />
                          </button>
                        </GlassCard>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* ✅ Bouton "Ajouter une étape" — CSS variables thème */}
                <button
                  onClick={() => openAdder(p.key)}
                  className="w-full glass rounded-2xl p-3 flex items-center justify-center gap-2 text-white/55 tap hover:text-white transition"
                  style={{
                    borderColor: 'rgba(var(--accent-from-rgb), 0.20)',
                  }}
                >
                  <Plus size={16} />
                  <span className="text-sm">Ajouter une étape</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <StepAdder
        open={adderOpen}
        onClose={() => setAdderOpen(false)}
        initialPeriod={adderPeriod}
        initialDay={selectedDay}
        cityHint={currentCity ?? undefined}
        cityColorMap={cityColorMap}
      />
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// StepAdder — Flow 3 étapes iOS
// ─────────────────────────────────────────────────────────────────────────────
const StepAdder = ({
  open,
  onClose,
  initialPeriod,
  initialDay,
  cityHint,
  cityColorMap,
}: {
  open:          boolean;
  onClose:       () => void;
  initialPeriod: StepPeriod;
  initialDay:    number;
  cityHint?:     string;
  cityColorMap:  Record<string, string>;
}) => {
  const { trip }         = useTripContext();
  const addStep          = useTripStore((s) => s.addStep);
  const aiSuggestionsRaw = useTripStore((s) => s.aiSuggestions[trip.id]);
  const aiSuggestions    = aiSuggestionsRaw ?? [];
  const days             = daysBetween(trip.startDate, trip.endDate);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [type,        setType]        = useState<StepType>('sight');
  const [title,       setTitle]       = useState('');
  const [place,       setPlace]       = useState(cityHint ?? trip.destination);
  const [notes,       setNotes]       = useState('');
  const [day,         setDay]         = useState(initialDay);
  const [period,      setPeriod]      = useState<StepPeriod>(initialPeriod);

  useEffect(() => {
    if (open) {
      setDay(initialDay);
      setPeriod(initialPeriod);
      setPlace(cityHint ?? trip.destination);
    }
  }, [open, initialDay, initialPeriod, cityHint, trip.destination]);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setCurrentStep(1);
        setTitle('');
        setNotes('');
        setType('sight');
      }, 300);
    }
  }, [open]);

  const canStep2 = type !== undefined;
  const canStep3 = title.trim().length > 0 && place.trim().length > 0;

  const submit = () => {
    if (!canStep3) return;
    haptic([5, 20, 5]);
    addStep(trip.id, {
      id:     crypto.randomUUID(),
      day,
      period,
      type,
      title:  title.trim(),
      place:  place.trim(),
      notes:  notes.trim() || undefined,
      done:   false,
    });
    onClose();
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center gap-2">
          <div
            className="flex items-center justify-center rounded-full font-semibold text-xs transition-all duration-300"
            style={{
              width:      currentStep >= n ? 28 : 24,
              height:     currentStep >= n ? 28 : 24,
              // ✅ CSS variables thème pour les indicateurs d'étapes
              background: currentStep > n
                ? '#56c5a4'
                : currentStep === n
                ? 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)'
                : 'rgba(255,255,255,0.1)',
              color: currentStep >= n ? '#fff' : 'rgba(255,255,255,0.4)',
            }}
          >
            {currentStep > n ? <Check size={12} strokeWidth={3} /> : n}
          </div>
          {n < 3 && (
            <div
              className="h-px w-8 transition-all duration-300"
              style={{ background: currentStep > n ? '#56c5a4' : 'rgba(255,255,255,0.15)' }}
            />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <BottomSheet open={open} onClose={onClose} title="Nouvelle étape">
      <StepIndicator />

      <AnimatePresence mode="wait">

        {/* ══ ÉTAPE 1 — TYPE ══ */}
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="text-center mb-2">
              <div className="text-base font-semibold tracking-tight">Quel type d'étape ?</div>
              <div className="text-xs text-white/45 mt-0.5">Sélectionnez la catégorie</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {TYPES.map((t) => {
                const active = type === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setType(t.key)}
                    className="rounded-2xl p-4 flex flex-col items-center gap-2 tap transition"
                    style={{
                      background: active ? `${t.color}20` : 'rgba(255,255,255,0.05)',
                      border: active
                        ? `2px solid ${t.color}60`
                        : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <span className="text-3xl">{t.emoji}</span>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: active ? t.color : 'rgba(255,255,255,0.7)' }}
                    >
                      {t.label}
                    </span>
                    {active && (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: t.color }}
                      >
                        <Check size={11} className="text-black" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {/* ✅ Bouton Suivant — CSS variables thème */}
            <button
              disabled={!canStep2}
              onClick={() => setCurrentStep(2)}
              className="w-full h-12 rounded-2xl font-semibold text-white tap disabled:opacity-30 flex items-center justify-center gap-2 mt-2"
              style={{
                background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)',
              }}
            >
              Suivant <ChevronRight size={16} />
            </button>
          </motion.div>
        )}

        {/* ══ ÉTAPE 2 — DÉTAILS ══ */}
        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <div className="text-center mb-2">
              <div className="text-base font-semibold tracking-tight">Détails de l'étape</div>
              <div className="text-xs text-white/45 mt-0.5">
                {TYPES.find((t) => t.key === type)?.emoji}{' '}
                {TYPES.find((t) => t.key === type)?.label}
              </div>
            </div>

            {cityHint && trip.isRoadtrip && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{
                  background: `${cityColorMap[cityHint] ?? '#7c8cff'}15`,
                  border:     `1px solid ${cityColorMap[cityHint] ?? '#7c8cff'}35`,
                }}
              >
                <Map size={12} style={{ color: cityColorMap[cityHint] ?? '#7c8cff' }} />
                <span className="text-xs text-white/55">
                  Étape à{' '}
                  <span
                    className="font-semibold"
                    style={{ color: cityColorMap[cityHint] ?? '#7c8cff' }}
                  >
                    {cityHint}
                  </span>
                </span>
              </div>
            )}

            <label className="block">
              <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">
                Titre *
              </div>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Visite du Colisée"
                className="w-full glass rounded-xl px-4 py-3 bg-transparent outline-none font-medium"
              />
            </label>

            <label className="block">
              <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">
                Ville / Quartier *
                {cityHint && trip.isRoadtrip && (
                  <span className="ml-1 normal-case text-white/30">(pré-rempli)</span>
                )}
              </div>
              <input
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder={`Ex: Centre de ${trip.destination}`}
                className="w-full glass rounded-xl px-4 py-3 bg-transparent outline-none font-medium"
              />
            </label>

            <label className="block">
              <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">
                Notes (optionnel)
              </div>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Réservation, prix, infos..."
                className="w-full glass rounded-xl px-4 py-3 bg-transparent outline-none font-medium text-sm"
              />
            </label>

            {aiSuggestions.length > 0 && (
              <div>
                <div className="flex items-center gap-1 text-xs text-white/55 mb-2 px-1">
                  <Sparkles size={11} style={{ color: 'var(--accent-from)' }} /> Suggestions IA
                </div>
                <div className="flex flex-wrap gap-2">
                  {aiSuggestions.slice(0, 5).map((s) => (
                    <button
                      key={s}
                      onClick={() => setTitle(s)}
                      className="pill px-3 py-1.5 text-xs glass tap text-white/75 transition hover:bg-white/10"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setCurrentStep(1)}
                className="h-12 px-5 rounded-2xl glass tap font-medium text-sm"
              >
                ← Retour
              </button>
              {/* ✅ Bouton Suivant étape 2 — CSS variables thème */}
              <button
                disabled={!canStep3}
                onClick={() => setCurrentStep(3)}
                className="flex-1 h-12 rounded-2xl font-semibold text-white tap disabled:opacity-30 flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)',
                }}
              >
                Suivant <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ══ ÉTAPE 3 — QUAND ══ */}
        {currentStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="text-center mb-2">
              <div className="text-base font-semibold tracking-tight">Quand ?</div>
              <div className="text-xs text-white/45 mt-0.5">Choisissez le jour et le moment</div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">
                📅 Jour
              </div>
              <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
                {Array.from({ length: days }, (_, i) => i + 1).map((d) => {
                  const dateISO = addDaysISO(trip.startDate, d - 1);
                  const active  = day === d;
                  const dCity   = getCityForDay(d, trip.destinations);

                  // ✅ Même logique que le sélecteur principal
                  const dColor = trip.isRoadtrip && dCity
                    ? (cityColorMap[dCity] ?? '#7c8cff')
                    : null;

                  return (
                    <button
                      key={d}
                      onClick={() => {
                        setDay(d);
                        if (trip.isRoadtrip && dCity) {
                          setPlace(dCity);
                        }
                      }}
                      className="flex-shrink-0 rounded-2xl px-3 py-2.5 tap min-w-[56px] text-center transition"
                      style={
                        trip.isRoadtrip
                          ? {
                              // ── MODE ROADTRIP ──────────────────────────────
                              background: active
                                ? (dColor ?? 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)')
                                : dColor
                                ? `${dColor}18`
                                : 'rgba(255,255,255,0.06)',
                              border: active
                                ? 'none'
                                : dColor
                                ? `1px solid ${dColor}30`
                                : '1px solid rgba(255,255,255,0.1)',
                            }
                          : {
                              // ── MODE VOYAGE SIMPLE : couleur thème ─────────
                              background: active
                                ? 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)'
                                : 'rgba(var(--accent-from-rgb), 0.13)',
                              border: active
                                ? 'none'
                                : '1px solid rgba(var(--accent-from-rgb), 0.28)',
                            }
                      }
                    >
                      <div className="text-[10px] uppercase tracking-wider opacity-75">J{d}</div>
                      <div className="text-sm font-bold font-display">
                        {new Date(dateISO).getDate()}
                      </div>
                      {dCity && trip.isRoadtrip && (
                        <div
                          className="text-[8px] mt-0.5 truncate font-semibold"
                          style={{
                            color: active
                              ? 'rgba(255,255,255,0.75)'
                              : (dColor ?? 'rgba(255,255,255,0.5)'),
                          }}
                        >
                          {dCity.split(' ')[0]}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">
                🕐 Moment
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PERIODS.map((p) => {
                  const Icon   = p.icon;
                  const active = period === p.key;
                  return (
                    <button
                      key={p.key}
                      onClick={() => setPeriod(p.key)}
                      className="rounded-2xl p-3 flex flex-col items-center gap-1.5 tap transition"
                      style={{
                        background: active ? `${p.color}25` : 'rgba(255,255,255,0.05)',
                        border: active
                          ? `1px solid ${p.color}60`
                          : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <Icon size={20} style={{ color: active ? p.color : 'rgba(255,255,255,0.5)' }} />
                      <span
                        className="text-xs font-semibold"
                        style={{ color: active ? p.color : 'rgba(255,255,255,0.55)' }}
                      >
                        {p.label}
                      </span>
                      {active && (
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ background: p.color }}
                        >
                          <Check size={10} className="text-black" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Récap */}
            <div
              className="rounded-2xl p-3 flex items-center gap-3"
              style={{
                background: 'rgba(var(--accent-from-rgb), 0.08)',
                border:     '1px solid rgba(var(--accent-from-rgb), 0.15)',
              }}
            >
              <span className="text-xl">{TYPES.find((t) => t.key === type)?.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{title}</div>
                <div className="text-xs text-white/50">
                  📍 {place} · Jour {day} · {PERIODS.find((p) => p.key === period)?.label}
                  {trip.isRoadtrip && getCityForDay(day, trip.destinations) && (
                    <span
                      className="ml-1"
                      style={{
                        color: cityColorMap[getCityForDay(day, trip.destinations)!] ?? '#7c8cff',
                      }}
                    >
                      · {getCityForDay(day, trip.destinations)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep(2)}
                className="h-12 px-5 rounded-2xl glass tap font-medium text-sm"
              >
                ← Retour
              </button>
              {/* ✅ Bouton final "Ajouter l'étape" — CSS variables thème */}
              <button
                onClick={submit}
                className="flex-1 h-12 rounded-2xl font-semibold text-white tap flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)',
                }}
              >
                <Check size={16} /> Ajouter l'étape
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </BottomSheet>
  );
};