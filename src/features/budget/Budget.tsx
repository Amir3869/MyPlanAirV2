// src/features/budget/Budget.tsx
import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, ArrowLeftRight, RefreshCw,
  Lock, Plane, Utensils, Bed, Smile,
  ShoppingBag, MoreHorizontal, ArrowRight, WifiOff,
} from 'lucide-react';
import { useTripContext } from '../cockpit/useTripContext';
import { useTripStore, type Expense } from '../../store/tripStore';
import { GlassCard } from '../../shared/GlassCard';
import { BottomSheet } from '../../shared/BottomSheet';
import { Donut } from '../../shared/Donut';
import { fmtMoney, fmtMoneyDecimal } from '../../utils/formatters';
import { fetchRate } from '../../api/currency';
import { CURRENCIES, getCountryMeta } from '../../api/countries';
import { DatePickerSheet, DateTrigger } from '../../shared/DatePickerSheet';
import { todayISO } from '../../utils/dateHelpers';
import { haptic } from '../../utils/haptic';

// ─────────────────────────────────────────────────────────────────────────────
// Catégories
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'transport', label: 'Transport', icon: Plane,          color: '#7c8cff' },
  { key: 'food',      label: 'Resto',     icon: Utensils,       color: '#f0b24a' },
  { key: 'lodging',   label: 'Logement',  icon: Bed,            color: '#ec4899' },
  { key: 'leisure',   label: 'Loisirs',   icon: Smile,          color: '#56c5a4' },
  { key: 'shopping',  label: 'Shopping',  icon: ShoppingBag,    color: '#a78bfa' },
  { key: 'other',     label: 'Autre',     icon: MoreHorizontal, color: '#94a3b8' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Budget principal
// ─────────────────────────────────────────────────────────────────────────────
export const Budget = () => {
  const { trip }      = useTripContext();
  const removeExpense = useTripStore((s) => s.removeExpense);

  const [adderOpen, setAdderOpen] = useState(false);
  const [convOpen,  setConvOpen]  = useState(false);

  const spent     = trip.expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = Math.max(0, trip.budget - spent);
  const pct       = trip.budget > 0 ? Math.min(100, (spent / trip.budget) * 100) : 0;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    trip.expenses.forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amount));
    return CATEGORIES
      .map((c) => ({ ...c, total: map.get(c.key) ?? 0 }))
      .sort((a, b) => b.total - a.total);
  }, [trip.expenses]);

  const destinationCurrency = getCountryMeta(trip.countryCode)?.currency ?? trip.currency;
  const hasTwoDevises       = trip.homeCurrency !== destinationCurrency;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* ── Donut central ── */}
      <GlassCard className="p-6 flex flex-col items-center">
        <Donut
          value={spent}
          max={trip.budget}
          size={200}
          stroke={16}
          // ✅ Couleur donut : rouge si >90%, ambre si >70%, sinon couleur thème via CSS var
          color={pct > 90 ? '#ef4444' : pct > 70 ? '#f0b24a' : 'var(--accent-from)'}
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

        {/* Widget devise rapide */}
        {hasTwoDevises && (
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => setConvOpen(true)}
            className="mt-4 w-full rounded-2xl px-4 py-3 flex items-center gap-3 tap"
            style={{ background: 'rgba(86,197,164,0.08)', border: '1px solid rgba(86,197,164,0.2)' }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(86,197,164,0.15)' }}
            >
              <ArrowLeftRight size={14} style={{ color: '#56c5a4' }} />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold" style={{ color: '#56c5a4' }}>
                {trip.homeCurrency} → {destinationCurrency}
              </div>
              <div className="text-xs text-white/40">Convertisseur rapide</div>
            </div>
            <ArrowRight size={14} className="text-white/30" />
          </motion.button>
        )}

        <div className="mt-3 flex gap-2 w-full">
          {!hasTwoDevises && (
            <button
              onClick={() => setConvOpen(true)}
              className="flex-1 glass rounded-2xl py-3 flex items-center justify-center gap-2 tap font-semibold text-sm"
            >
              <ArrowLeftRight size={16} /> Convertisseur
            </button>
          )}
          {/* ✅ CSS variables thème */}
          <button
            onClick={() => setAdderOpen(true)}
            className="flex-1 rounded-2xl py-3 flex items-center justify-center gap-2 tap font-semibold text-sm text-white"
            style={{
              background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)',
            }}
          >
            <Plus size={16} /> Ajouter une dépense
          </button>
        </div>
      </GlassCard>

      {/* ── Par catégorie ── */}
      {byCategory.some((c) => c.total > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {byCategory.filter((c) => c.total > 0).map((c) => {
            const Icon = c.icon;
            return (
              <GlassCard key={c.key} className="p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${c.color}26` }}
                  >
                    <Icon size={13} style={{ color: c.color }} />
                  </div>
                  <div className="text-xs text-white/65 font-medium">{c.label}</div>
                </div>
                <div className="text-lg font-bold font-display">{fmtMoney(c.total, trip.currency)}</div>
                <div className="text-[10px] text-white/45">
                  {Math.round((c.total / Math.max(1, spent)) * 100)}% du total
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* ── Historique ── */}
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
            {trip.expenses.map((e) => {
              const cat  = CATEGORIES.find((c) => c.key === e.category) ?? CATEGORIES[5];
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
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${cat.color}26` }}
                    >
                      <Icon size={15} style={{ color: cat.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold tracking-tight truncate flex items-center gap-1.5">
                        {e.label}
                        {e.private && <Lock size={11} className="text-white/45" />}
                      </div>
                      <div className="text-xs text-white/55">
                        {cat.label} · {new Date(e.date).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold font-display tracking-tight">
                        {fmtMoneyDecimal(e.amount, trip.currency)}
                      </div>
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
      <Converter
        open={convOpen}
        onClose={() => setConvOpen(false)}
        destinationCurrency={destinationCurrency}
      />
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ExpenseAdder
// ─────────────────────────────────────────────────────────────────────────────
const ExpenseAdder = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { trip }   = useTripContext();
  const addExpense = useTripStore((s) => s.addExpense);

  const [label,          setLabel]          = useState('');
  const [amount,         setAmount]         = useState<string>('');
  const [category,       setCategory]       = useState<typeof CATEGORIES[number]['key']>('food');
  const [isPrivate,      setPrivate]        = useState(false);
  const [date,           setDate]           = useState(todayISO());
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const submit = () => {
    const amt = parseFloat(amount);
    if (!label.trim() || !amt || amt <= 0) return;
    haptic([5, 20, 5]);
    const exp: Expense = {
      id:       crypto.randomUUID(),
      category,
      label:    label.trim(),
      amount:   amt,
      date,
      private:  isPrivate,
    };
    addExpense(trip.id, exp);
    setLabel('');
    setAmount('');
    setPrivate(false);
    setDate(todayISO());
    onClose();
  };

  return (
    <>
      <DatePickerSheet
        open={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        value={date}
        title="Date de la dépense"
        onChange={(iso) => {
          setDate(iso);
          setDatePickerOpen(false);
        }}
      />

      <BottomSheet open={open} onClose={onClose} title="Nouvelle dépense">
        <div className="space-y-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">Catégorie</div>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => {
                const Icon   = c.icon;
                const active = category === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() => setCategory(c.key)}
                    className={`rounded-2xl p-3 flex flex-col items-center gap-1 tap transition ${
                      active ? 'bg-white/15' : 'glass'
                    }`}
                  >
                    <Icon size={18} style={{ color: c.color }} />
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
              <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">
                Montant ({trip.currency})
              </div>
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

            <div>
              <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">Date</div>
              <DateTrigger
                value={date}
                onClick={() => setDatePickerOpen(true)}
              />
            </div>
          </div>

          {/* ✅ Toggle dépense privée — CSS variables thème */}
          <button
            onClick={() => setPrivate(!isPrivate)}
            className={`w-full glass rounded-2xl p-3 flex items-center gap-3 tap ${
              isPrivate ? 'bg-white/15' : ''
            }`}
          >
            <Lock size={16} className={isPrivate ? 'text-white' : 'text-white/45'} />
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold">Dépense privée</div>
              <div className="text-xs text-white/55">Masquée du lien partagé</div>
            </div>
            <div
              className="w-10 h-6 rounded-full p-0.5 transition-colors duration-200"
              style={{
                // ✅ CSS variables thème pour le toggle actif
                background: isPrivate
                  ? 'var(--accent-from)'
                  : 'rgba(255,255,255,0.15)',
              }}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ${
                  isPrivate ? 'translate-x-4' : ''
                }`}
              />
            </div>
          </button>

          {/* ✅ Bouton enregistrer — CSS variables thème */}
          <button
            disabled={!label.trim() || !parseFloat(amount)}
            onClick={submit}
            className="w-full h-12 rounded-2xl font-semibold text-white tap disabled:opacity-30 mt-2"
            style={{
              background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)',
            }}
          >
            Enregistrer la dépense
          </button>
        </div>
      </BottomSheet>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Converter
// ─────────────────────────────────────────────────────────────────────────────
const Converter = ({
  open,
  onClose,
  destinationCurrency,
}: {
  open:                boolean;
  onClose:             () => void;
  destinationCurrency: string;
}) => {
  const { trip } = useTripContext();

  const [from,      setFrom]      = useState(trip.homeCurrency);
  const [to,        setTo]        = useState(destinationCurrency);
  const [amount,    setAmount]    = useState(String(trip.budget));
  const [rate,      setRate]      = useState<number | null>(null);
  const [source,    setSource]    = useState<'live' | 'offline' | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [hasError,  setHasError]  = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const fetchingRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setFrom(trip.homeCurrency);
    setTo(destinationCurrency);
    setAmount(String(trip.budget));
    setRate(null);
    setSource(null);
    setHasError(false);
    setUpdatedAt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    doFetchRate(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, from, to]);

  const doFetchRate = async (fromCurrency: string, toCurrency: string) => {
    if (fetchingRef.current) return;
    if (fromCurrency === toCurrency) {
      setRate(1);
      setSource('live');
      setUpdatedAt(new Date().toISOString());
      setHasError(false);
      return;
    }
    fetchingRef.current = true;
    setLoading(true);
    setHasError(false);
    setRate(null);
    try {
      const r = await fetchRate(fromCurrency, toCurrency);
      setRate(r.rate);
      setSource(r.source);
      setUpdatedAt(r.updatedAt);
      setHasError(false);
      haptic(5);
    } catch {
      setRate(null);
      setSource(null);
      setHasError(true);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  const swap  = () => { setFrom(to); setTo(from); };
  const retry = () => { haptic(5); doFetchRate(from, to); };

  const converted     = rate !== null ? (parseFloat(amount) || 0) * rate : null;
  const hasTwoDevises = trip.homeCurrency !== destinationCurrency;

  return (
    <BottomSheet open={open} onClose={onClose} title="Convertisseur de devises">
      <div className="space-y-4">

        {hasTwoDevises && (
          <div
            className="flex items-center gap-2 p-3 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="text-xs text-white/40 flex-shrink-0">Raccourcis :</div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => { setFrom(trip.homeCurrency); setTo(destinationCurrency); }}
                className="px-3 py-1.5 rounded-full text-xs font-semibold tap transition"
                style={{
                  background: from === trip.homeCurrency && to === destinationCurrency
                    ? 'rgba(86,197,164,0.2)' : 'rgba(255,255,255,0.08)',
                  border: from === trip.homeCurrency && to === destinationCurrency
                    ? '1px solid rgba(86,197,164,0.4)' : '1px solid rgba(255,255,255,0.12)',
                  color: from === trip.homeCurrency && to === destinationCurrency
                    ? '#56c5a4' : 'rgba(255,255,255,0.6)',
                }}
              >
                {trip.homeCurrency} → {destinationCurrency}
              </button>
              <button
                onClick={() => { setFrom(destinationCurrency); setTo(trip.homeCurrency); }}
                className="px-3 py-1.5 rounded-full text-xs font-semibold tap transition"
                style={{
                  background: from === destinationCurrency && to === trip.homeCurrency
                    ? 'rgba(124,140,255,0.2)' : 'rgba(255,255,255,0.08)',
                  border: from === destinationCurrency && to === trip.homeCurrency
                    ? '1px solid rgba(124,140,255,0.4)' : '1px solid rgba(255,255,255,0.12)',
                  color: from === destinationCurrency && to === trip.homeCurrency
                    ? '#7c8cff' : 'rgba(255,255,255,0.6)',
                }}
              >
                {destinationCurrency} → {trip.homeCurrency}
              </button>
            </div>
          </div>
        )}

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
              onChange={(e) => setFrom(e.target.value)}
              className="bg-white/10 rounded-xl px-3 py-2 outline-none font-semibold"
              style={{ colorScheme: 'dark' }}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.code}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-center -my-2">
          <button
            onClick={swap}
            className="w-10 h-10 rounded-full glass-strong flex items-center justify-center tap rotate-90"
          >
            <ArrowLeftRight size={16} />
          </button>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="text-xs uppercase tracking-wider text-white/55 mb-2">Vous recevez</div>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-bold font-display tracking-tighter flex-1 min-w-0">
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                  className="w-7 h-7 border-2 border-white/15 border-t-white/60 rounded-full"
                />
              ) : converted !== null ? (
                <span>{converted.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}</span>
              ) : (
                <span className="text-white/20 text-xl">—</span>
              )}
            </div>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-white/10 rounded-xl px-3 py-2 outline-none font-semibold"
              style={{ colorScheme: 'dark' }}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.code}</option>
              ))}
            </select>
          </div>
        </div>

        {hasError && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <WifiOff size={15} style={{ color: '#ef4444', flexShrink: 0 }} />
            <div className="flex-1">
              <div className="text-sm font-semibold" style={{ color: '#ef4444' }}>Connexion requise</div>
              <div className="text-xs text-white/45 mt-0.5">
                Le taux de change nécessite une connexion internet.
              </div>
            </div>
            <button
              onClick={retry}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full tap flex-shrink-0"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <RefreshCw size={11} /> Réessayer
            </button>
          </motion.div>
        )}

        {rate !== null && !loading && !hasError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="text-sm text-white/55">
              1 {from} ={' '}
              <span className="text-white font-semibold">{rate.toFixed(4)}</span>{' '}
              {to}
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              {source === 'live' ? (
                <div
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: 'rgba(86,197,164,0.15)', border: '1px solid rgba(86,197,164,0.3)', color: '#56c5a4' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#56c5a4] inline-block" />
                  LIVE
                </div>
              ) : source === 'offline' ? (
                <div
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: 'rgba(240,178,74,0.15)', border: '1px solid rgba(240,178,74,0.3)', color: '#f0b24a' }}
                >
                  ⚡ Indicatif
                </div>
              ) : null}
              {updatedAt && (
                <span className="text-[10px] text-white/30">
                  · {new Date(updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </BottomSheet>
  );
};