import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, CheckCircle2, Cloud, Wallet, Lightbulb, ArrowRight } from 'lucide-react';
import { useTripContext } from '../cockpit/useTripContext';
import { GlassCard } from '../../shared/GlassCard';
import { BottomSheet } from '../../shared/BottomSheet';
import { fmtMoney } from '../../utils/formatters';
import { getAssistantTips } from '../../api/assistant';
import { Donut } from '../../shared/Donut';
import { useNavigate } from 'react-router-dom';
import { daysBetween, getTimeOfDay } from '../../utils/dateHelpers';

const WEATHER_BY_TIME = {
  morning: { icon: '🌅', label: 'Matinée douce', temp: 18 },
  afternoon: { icon: '☀️', label: 'Après-midi ensoleillé', temp: 24 },
  night: { icon: '🌙', label: 'Soirée fraîche', temp: 16 },
};

export const Overview = () => {
  const { trip } = useTripContext();
  const [aiOpen, setAiOpen] = useState(false);
  const navigate = useNavigate();

  const totalChecklist = trip.checklist.length;
  const doneChecklist = trip.checklist.filter(c => c.done).length;
  const checkPct = totalChecklist > 0 ? Math.round((doneChecklist / totalChecklist) * 100) : 0;

  const spent = trip.expenses.reduce((s, e) => s + e.amount, 0);
  const budgetPct = trip.budget > 0 ? Math.min(100, Math.round((spent / trip.budget) * 100)) : 0;

  const weather = WEATHER_BY_TIME[getTimeOfDay()];
  const tips = getAssistantTips(trip.country, trip.destination);
  const days = daysBetween(trip.startDate, trip.endDate);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Top stats */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard className="p-4 text-center">
          <div className="text-2xl font-bold font-display">{days}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/55 mt-0.5">Jours</div>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <div className="text-2xl font-bold font-display">{trip.steps.length}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/55 mt-0.5">Étapes</div>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <div className="text-2xl font-bold font-display">{trip.expenses.length}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/55 mt-0.5">Dépenses</div>
        </GlassCard>
      </div>

      {/* Préparation widget */}
      <GlassCard className="p-5" onClick={() => navigate(`/trip/${trip.id}/essentials`)}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(86,197,164,0.2)' }}>
            <CheckCircle2 size={18} style={{ color: '#56c5a4' }} />
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wider text-white/55">Préparation</div>
            <div className="text-lg font-semibold tracking-tight">{doneChecklist}/{totalChecklist} prêts</div>
          </div>
          <div className="text-2xl font-bold font-display">{checkPct}%</div>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${checkPct}%` }}
            transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #56c5a4, #7c8cff)' }}
          />
        </div>
      </GlassCard>

      {/* Budget widget */}
      <GlassCard className="p-5" onClick={() => navigate(`/trip/${trip.id}/budget`)}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(240,178,74,0.2)' }}>
            <Wallet size={18} style={{ color: '#f0b24a' }} />
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wider text-white/55">Budget</div>
            <div className="text-lg font-semibold tracking-tight">{fmtMoney(spent, trip.currency)} dépensés</div>
          </div>
          <div className="text-sm text-white/55">/ {fmtMoney(trip.budget, trip.currency)}</div>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${budgetPct}%` }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="h-full rounded-full"
            style={{
              background: budgetPct > 90
                ? 'linear-gradient(90deg, #f0b24a, #ef4444)'
                : 'linear-gradient(90deg, #f0b24a, #ec4899)',
            }}
          />
        </div>
      </GlassCard>

      {/* Météo + Assistant */}
      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Cloud size={14} className="text-white/55" />
            <div className="text-xs uppercase tracking-wider text-white/55">Météo</div>
          </div>
          <div className="text-4xl mb-1">{weather.icon}</div>
          <div className="text-sm font-semibold tracking-tight">{weather.label}</div>
          <div className="text-2xl font-bold font-display mt-1">{weather.temp}°</div>
        </GlassCard>

        <GlassCard className="p-5 cursor-pointer" onClick={() => setAiOpen(true)}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} style={{ color: '#7c8cff' }} />
            <div className="text-xs uppercase tracking-wider text-white/55">Assistant</div>
          </div>
          <div className="text-sm font-semibold tracking-tight mb-2">Conseils sur {trip.destination}</div>
          <div className="text-xs text-white/55 mb-3">{tips.length} astuces locales</div>
          <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#7c8cff' }}>
            Ouvrir <ArrowRight size={12} />
          </div>
        </GlassCard>
      </div>

      {/* Quick donut */}
      <GlassCard className="p-6 flex items-center gap-5">
        <Donut
          value={spent}
          max={trip.budget}
          size={120}
          stroke={12}
          color={budgetPct > 90 ? '#ef4444' : '#7c8cff'}
          label={`${budgetPct}%`}
          sublabel="utilisé"
        />
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wider text-white/55">Restant</div>
          <div className="text-3xl font-bold font-display tracking-tighter truncate">
            {fmtMoney(Math.max(0, trip.budget - spent), trip.currency)}
          </div>
          <div className="text-sm text-white/55 mt-1">
            soit {fmtMoney(days > 0 ? Math.max(0, trip.budget - spent) / days : 0, trip.currency)}/jour
          </div>
        </div>
      </GlassCard>

      <BottomSheet open={aiOpen} onClose={() => setAiOpen(false)} title={`Assistant · ${trip.destination}`}>
        <div className="flex items-center gap-2 mb-4 text-sm text-white/55">
          <Lightbulb size={14} style={{ color: '#7c8cff' }} />
          Astuces locales sélectionnées par votre assistant.
        </div>
        <div className="space-y-3">
          {tips.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl p-4 flex gap-3"
            >
              <div className="text-2xl">{t.icon}</div>
              <div>
                <div className="font-semibold tracking-tight">{t.title}</div>
                <div className="text-sm text-white/65 mt-0.5">{t.body}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </BottomSheet>
    </motion.div>
  );
};
