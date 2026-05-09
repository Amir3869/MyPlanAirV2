import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ArrowLeftRight, RefreshCw, Lock, Plane, Utensils, Bed, Smile, ShoppingBag, MoreHorizontal } from 'lucide-react';
import { useTripContext } from '../cockpit/useTripContext';
import { useTripStore, type Expense } from '../../store/tripStore';
import { GlassCard } from '../../shared/GlassCard';
import { BottomSheet } from '../../shared/BottomSheet';
import { Donut } from '../../shared/Donut';
import { fmtMoney, fmtMoneyDecimal } from '../../utils/formatters';
import { fetchRate } from '../../api/currency';
import { CURRENCIES } from '../../api/countries';
import { todayISO } from '../../utils/dateHelpers';
import { haptic } from '../../utils/haptic';

const CATEGORIES = [
  { key: 'transport', label: 'Transport', icon: Plane, color: '#7c8cff' },
  { key: 'food', label: 'Resto', icon: Utensils, color: '#f0b24a' },
  { key: 'lodging', label: 'Logement', icon: Bed, color: '#ec4899' },
  { key: 'leisure', label: 'Loisirs', icon: Smile, color: '#56c5a4' },
  { key: 'shopping', label: 'Shopping', icon: ShoppingBag, color: '#a78bfa' },
  { key: 'other', label: 'Autre', icon: MoreHorizontal, color: '#94a3b8' },
] as const;

export const Budget = () => {
  const { trip } = useTripContext();
  const removeExpense = useTripStore(s => s.removeExpense);
  const [adderOpen, setAdderOpen] = useState(false);
  const [convOpen, setConvOpen] = useState(false);

  const spent = trip.expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = Math.max(0, trip.budget - spent);
  const pct = trip.budget > 0 ? Math.min(100, (spent / trip.budget) * 100) : 0;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    trip.expenses.forEach(e => map.set(e.category, (map.get(e.category) ?? 0) + e.amount));
    return CATEGORIES.map(c => ({ ...c, total: map.get(c.key) ?? 0 })).sort((a, b) => b.total - a.total);
  }, [trip.expenses]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-5">
      {/* Donut central */}
      <GlassCard className="p-6 flex flex-col items-center">
        <Donut
          value={spent}
          max={trip.budget}
          size={200}
          stroke={16}
          color={pct > 90 ? '#ef4444' : pct > 70 ? '#f0b24a' : '#7c8cff'}
          label={fmtMoney(spent, trip.currency)}
          sublabel={`/ ${fmtMoney(trip.budget, trip.currency)}`}
        />
        <div className="mt-4 grid grid-cols-2 gap-3 w-full">
          <div className="text-center">
            <div className="text-xs uppercase tracking-wider text-white/55">Restant</div>
            <div className="text-xl font-bold font-display">{fmtMoney(remaining, trip.currency)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs uppercase tracking-wider text-white/55">Utilisé</div>
            <div className="text-xl font-bold font-display">{Math.round(pct)}%</div>
          </div>
        </div>
        <div className="mt-4 flex gap-2 w-full">
          <button
            onClick={() => setConvOpen(true)}
            className="flex-1 glass rounded-2xl py-3 flex items-center justify-center gap-2 tap font-semibold text-sm"
          >
            <ArrowLeftRight size={16} /> Convertisseur
          </button>
          <button
            onClick={() => setAdderOpen(true)}
            className="flex-1 rounded-2xl py-3 flex items-center justify-center gap-2 tap font-semibold text-sm text-white"
            style={{ background: 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)' }}
          >
            <Plus size={16} /> Ajouter
          </button>
        </div>
      </GlassCard>

      {/* By category */}
      <div className="grid grid-cols-2 gap-3">
        {byCategory.filter(c => c.total > 0).map(c => {
          const Icon = c.icon;
          return (
            <GlassCard key={c.key} className="p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${c.color}26` }}>
                  <Icon size={13} style={{ color: c.color }} />
                </div>
                <div className="text-xs text-white/65 font-medium">{c.label}</div>
              </div>
              <div className="text-lg font-bold font-display">{fmtMoney(c.total, trip.currency)}</div>
              <div className="text-[10px] text-white/45">{Math.round((c.total / Math.max(1, spent)) * 100)}% du total</div>
            </GlassCard>
          );
        })}
      </div>

      {/* History */}
      <div>
        <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">Historique</div>
        <div className="space-y-2">
          {trip.expenses.length === 0 && (
            <GlassCard className="p-6 text-center text-white/55">
              <p>Aucune dépense pour le moment</p>
              <p className="text-xs mt-1 text-white/35">Cliquez sur « Ajouter » pour commencer</p>
            </GlassCard>
          )}
          <AnimatePresence>
            {trip.expenses.map(e => {
              const cat = CATEGORIES.find(c => c.key === e.category) ?? CATEGORIES[5];
              const Icon = cat.icon;
              return (
                <motion.div
                  key={e.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <GlassCard className="p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${cat.color}26` }}>
                      <Icon size={15} style={{ color: cat.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold tracking-tight truncate flex items-center gap-1.5">
                        {e.label}
                        {e.private && <Lock size={11} className="text-white/45" />}
                      </div>
                      <div className="text-xs text-white/55">{cat.label} · {new Date(e.date).toLocaleDateString('fr-FR')}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold font-display tracking-tight">{fmtMoneyDecimal(e.amount, trip.currency)}</div>
                    </div>
                    <button
                      onClick={() => removeExpense(trip.id, e.id)}
                      className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center tap text-red-400/80"
                    >
                      <Trash2 size={13} />
                    </button>
                  </GlassCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <ExpenseAdder open={adderOpen} onClose={() => setAdderOpen(false)} />
      <Converter open={convOpen} onClose={() => setConvOpen(false)} />
    </motion.div>
  );
};

const ExpenseAdder = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { trip } = useTripContext();
  const addExpense = useTripStore(s => s.addExpense);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<typeof CATEGORIES[number]['key']>('food');
  const [isPrivate, setPrivate] = useState(false);
  const [date, setDate] = useState(todayISO());

  const submit = () => {
    const amt = parseFloat(amount);
    if (!label.trim() || !amt || amt <= 0) return;
    haptic([5, 20, 5]);
    const exp: Expense = {
      id: crypto.randomUUID(),
      category,
      label: label.trim(),
      amount: amt,
      date,
      private: isPrivate,
    };
    addExpense(trip.id, exp);
    setLabel(''); setAmount(''); setPrivate(false);
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Nouvelle dépense">
      <div className="space-y-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">Catégorie</div>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(c => {
              const Icon = c.icon;
              const active = category === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`rounded-2xl p-3 flex flex-col items-center gap-1 tap transition ${active ? 'bg-white text-black' : 'glass'}`}
                >
                  <Icon size={18} style={{ color: active ? c.color : c.color }} />
                  <span className="text-[11px] font-medium">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">Libellé</div>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex: Dîner au resto"
            className="w-full glass rounded-xl px-4 py-3 bg-transparent outline-none font-medium"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">Montant ({trip.currency})</div>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full glass rounded-xl px-4 py-3 bg-transparent outline-none font-medium font-display text-lg"
            />
          </label>
          <label className="block">
            <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">Date</div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full glass rounded-xl px-4 py-3 bg-transparent outline-none font-medium text-sm"
              style={{ colorScheme: 'dark' }}
            />
          </label>
        </div>

        <button
          onClick={() => setPrivate(!isPrivate)}
          className={`w-full glass rounded-2xl p-3 flex items-center gap-3 tap ${isPrivate ? 'bg-white/15' : ''}`}
        >
          <Lock size={16} className={isPrivate ? 'text-white' : 'text-white/45'} />
          <div className="flex-1 text-left">
            <div className="text-sm font-semibold">Dépense privée</div>
            <div className="text-xs text-white/55">Masquée du lien partagé</div>
          </div>
          <div className={`w-10 h-6 rounded-full p-0.5 transition ${isPrivate ? 'bg-[#7c8cff]' : 'bg-white/15'}`}>
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isPrivate ? 'translate-x-4' : ''}`} />
          </div>
        </button>

        <button
          disabled={!label.trim() || !parseFloat(amount)}
          onClick={submit}
          className="w-full h-12 rounded-2xl font-semibold text-white tap disabled:opacity-30 mt-2"
          style={{ background: 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)' }}
        >
          Enregistrer la dépense
        </button>
      </div>
    </BottomSheet>
  );
};

const Converter = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { trip } = useTripContext();
  const [from, setFrom] = useState(trip.homeCurrency);
  const [to, setTo] = useState(trip.currency);
  const [amount, setAmount] = useState('100');
  const [rate, setRate] = useState<number | null>(null);
  const [source, setSource] = useState<'live' | 'offline' | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await fetchRate(from, to);
      setRate(r.rate);
      setSource(r.source);
      setUpdatedAt(r.updatedAt);
      haptic(5);
    } finally {
      setLoading(false);
    }
  };

  const swap = () => { const f = from; setFrom(to); setTo(f); setRate(null); };

  const converted = rate !== null ? (parseFloat(amount) || 0) * rate : null;

  return (
    <BottomSheet open={open} onClose={onClose} title="Convertisseur de devises">
      <div className="space-y-4">
        <div className="glass rounded-2xl p-4">
          <div className="text-xs uppercase tracking-wider text-white/55 mb-2">Vous payez</div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-transparent outline-none text-3xl font-bold font-display tracking-tighter flex-1 min-w-0"
            />
            <select
              value={from}
              onChange={(e) => { setFrom(e.target.value); setRate(null); }}
              className="bg-white/10 rounded-xl px-3 py-2 outline-none font-semibold"
              style={{ colorScheme: 'dark' }}
            >
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-center -my-2">
          <button onClick={swap} className="w-10 h-10 rounded-full glass-strong flex items-center justify-center tap rotate-90">
            <ArrowLeftRight size={16} />
          </button>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="text-xs uppercase tracking-wider text-white/55 mb-2">Vous recevez</div>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-bold font-display tracking-tighter flex-1 min-w-0 truncate">
              {converted !== null ? converted.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : '—'}
            </div>
            <select
              value={to}
              onChange={(e) => { setTo(e.target.value); setRate(null); }}
              className="bg-white/10 rounded-xl px-3 py-2 outline-none font-semibold"
              style={{ colorScheme: 'dark' }}
            >
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={refresh}
          disabled={loading}
          className="w-full h-12 rounded-2xl font-semibold text-white tap disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #56c5a4 0%, #7c8cff 100%)' }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Récupération...' : 'Obtenir le taux'}
        </button>

        {rate !== null && (
          <div className="text-center text-sm text-white/55">
            1 {from} = <span className="text-white font-semibold">{rate.toFixed(4)}</span> {to}
            <div className="text-xs mt-1 flex items-center justify-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${source === 'live' ? 'bg-[#56c5a4]' : 'bg-[#f0b24a]'}`} />
              {source === 'live' ? 'Taux en temps réel' : 'Taux estimé (offline)'}
              {updatedAt && ` · ${new Date(updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
