import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Sunset, Moon, Plus, Check, Trash2, MapPin, Sparkles } from 'lucide-react';
import { useTripContext } from '../cockpit/useTripContext';
import { useTripStore, type Step, type StepPeriod, type StepType } from '../../store/tripStore';
import { GlassCard } from '../../shared/GlassCard';
import { BottomSheet } from '../../shared/BottomSheet';
import { daysBetween, getTimeOfDay, addDaysISO, fmtDate } from '../../utils/dateHelpers';
import { getStepSuggestions } from '../../api/assistant';
import { haptic } from '../../utils/haptic';

const PERIODS: { key: StepPeriod; label: string; icon: typeof Sun; color: string }[] = [
  { key: 'morning', label: 'Matin', icon: Sun, color: '#56c5a4' },
  { key: 'afternoon', label: 'Après-midi', icon: Sunset, color: '#f0b24a' },
  { key: 'night', label: 'Soir', icon: Moon, color: '#7c8cff' },
];

const TYPES: { key: StepType; label: string; emoji: string }[] = [
  { key: 'sight', label: 'Visite', emoji: '🗺️' },
  { key: 'food', label: 'Resto', emoji: '🍽️' },
  { key: 'transport', label: 'Transport', emoji: '🚆' },
  { key: 'lodging', label: 'Logement', emoji: '🏨' },
  { key: 'other', label: 'Autre', emoji: '✨' },
];

export const Parcours = () => {
  const { trip } = useTripContext();
  const days = daysBetween(trip.startDate, trip.endDate);
  const [selectedDay, setSelectedDay] = useState(1);
  const [adderOpen, setAdderOpen] = useState<StepPeriod | null>(null);
  const updateStep = useTripStore(s => s.updateStep);
  const removeStep = useTripStore(s => s.removeStep);

  const stepsByPeriod = useMemo(() => {
    const map: Record<StepPeriod, Step[]> = { morning: [], afternoon: [], night: [] };
    trip.steps.filter(s => s.day === selectedDay).forEach(s => map[s.period].push(s));
    return map;
  }, [trip.steps, selectedDay]);

  const currentPeriod = getTimeOfDay();
  const isToday = (() => {
    const start = new Date(trip.startDate); start.setHours(0, 0, 0, 0);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const dayIdx = Math.round((now.getTime() - start.getTime()) / 86400000) + 1;
    return dayIdx === selectedDay;
  })();

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-5">
      {/* Day selector */}
      <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-2">
        {Array.from({ length: days }, (_, i) => i + 1).map(d => {
          const dateISO = addDaysISO(trip.startDate, d - 1);
          const active = selectedDay === d;
          return (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              className={`flex-shrink-0 rounded-2xl px-4 py-3 tap min-w-[68px] transition ${active ? 'bg-white text-black' : 'glass'}`}
            >
              <div className="text-[10px] uppercase tracking-wider opacity-65">Jour {d}</div>
              <div className="text-lg font-bold font-display tracking-tight">{fmtDate(dateISO, { day: '2-digit' })}</div>
              <div className="text-[10px] opacity-65">{fmtDate(dateISO, { weekday: 'short' })}</div>
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {PERIODS.map(p => {
          const dimmed = isToday && (
            (p.key === 'morning' && currentPeriod !== 'morning') ||
            (p.key === 'afternoon' && currentPeriod === 'night') ||
            (p.key === 'night' && false)
          );
          const Icon = p.icon;
          const items = stepsByPeriod[p.key];

          return (
            <div key={p.key} className={`transition-opacity ${dimmed ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${p.color}26` }}>
                  <Icon size={15} style={{ color: p.color }} />
                </div>
                <div className="text-xs uppercase tracking-wider font-semibold" style={{ color: p.color }}>{p.label}</div>
                <div className="flex-1 h-px" style={{ background: `${p.color}33` }} />
                <span className="text-xs text-white/45">{items.length}</span>
              </div>

              <div className="space-y-2">
                <AnimatePresence>
                  {items.map(step => {
                    const tt = TYPES.find(t => t.key === step.type);
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
                            onClick={() => { haptic(8); updateStep(trip.id, step.id, { done: !step.done }); }}
                            className={`w-7 h-7 rounded-full border-2 flex items-center justify-center tap flex-shrink-0 transition ${
                              step.done ? 'bg-[#56c5a4] border-[#56c5a4]' : 'border-white/30'
                            }`}
                          >
                            {step.done && <Check size={14} className="text-black" strokeWidth={3} />}
                          </button>
                          <div className="text-xl">{tt?.emoji}</div>
                          <div className="flex-1 min-w-0">
                            <div className={`font-semibold tracking-tight truncate ${step.done ? 'line-through opacity-55' : ''}`}>
                              {step.title}
                            </div>
                            <div className="text-xs text-white/55 flex items-center gap-1 mt-0.5">
                              <MapPin size={10} /> {step.place}
                            </div>
                            {step.notes && <div className="text-xs text-white/45 mt-1 italic truncate">{step.notes}</div>}
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

                <button
                  onClick={() => setAdderOpen(p.key)}
                  className="w-full glass rounded-2xl p-3 flex items-center justify-center gap-2 text-white/55 tap hover:text-white transition"
                >
                  <Plus size={16} /> <span className="text-sm">Ajouter une étape</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <StepAdder
        open={!!adderOpen}
        onClose={() => setAdderOpen(null)}
        period={adderOpen}
        day={selectedDay}
      />
    </motion.div>
  );
};

const StepAdder = ({
  open, onClose, period, day,
}: { open: boolean; onClose: () => void; period: StepPeriod | null; day: number }) => {
  const { trip } = useTripContext();
  const addStep = useTripStore(s => s.addStep);
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [type, setType] = useState<StepType>('sight');
  const [notes, setNotes] = useState('');

  const suggestions = getStepSuggestions(trip.country);

  const submit = () => {
    if (!title.trim() || !place.trim() || !period) return;
    haptic([5, 20, 5]);
    addStep(trip.id, {
      id: crypto.randomUUID(),
      day,
      period,
      type,
      title: title.trim(),
      place: place.trim(),
      notes: notes.trim() || undefined,
      done: false,
    });
    setTitle(''); setPlace(''); setNotes(''); setType('sight');
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={`Nouvelle étape · ${period && PERIODS.find(p => p.key === period)?.label}`}>
      <div className="space-y-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">Type</div>
          <div className="flex gap-2 overflow-x-auto -mx-1 px-1">
            {TYPES.map(t => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className={`pill px-3 py-2 text-sm whitespace-nowrap tap flex items-center gap-1.5 ${type === t.key ? 'bg-white text-black' : 'glass'}`}
              >
                <span>{t.emoji}</span> {t.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">Titre</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Visite du Colisée"
            className="w-full glass rounded-xl px-4 py-3 bg-transparent outline-none font-medium"
          />
        </label>

        <label className="block">
          <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">Ville / Quartier *</div>
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="Ex: Centro Storico"
            className="w-full glass rounded-xl px-4 py-3 bg-transparent outline-none font-medium"
          />
        </label>

        <label className="block">
          <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">Notes (optionnel)</div>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Réservation, prix..."
            className="w-full glass rounded-xl px-4 py-3 bg-transparent outline-none font-medium text-sm"
          />
        </label>

        <div className="pt-2">
          <div className="flex items-center gap-1 text-xs text-white/55 mb-2 px-1">
            <Sparkles size={11} style={{ color: '#7c8cff' }} /> Suggestions assistant
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 6).map(s => (
              <button
                key={s}
                onClick={() => setTitle(s)}
                className="pill px-3 py-1.5 text-xs glass tap text-white/75"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <button
          disabled={!title.trim() || !place.trim()}
          onClick={submit}
          className="w-full h-12 rounded-2xl font-semibold text-white tap disabled:opacity-30 mt-3"
          style={{ background: 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)' }}
        >
          Ajouter l'étape
        </button>
      </div>
    </BottomSheet>
  );
};
