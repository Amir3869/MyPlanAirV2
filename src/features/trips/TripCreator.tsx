import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Calendar, MapPin, Sparkles, Wallet, X } from 'lucide-react';
import { searchCities, CURRENCIES, type CityEntry } from '../../api/countries';
import { fetchTripPhoto } from '../../api/cloud'; // ✅ CHANGEMENT ICI
import { useTripStore, type Trip } from '../../store/tripStore';
import { Flag } from '../../shared/Flag';
import { addDaysISO, daysBetween, todayISO, fmtRange } from '../../utils/dateHelpers';
import { haptic } from '../../utils/haptic';
import { useNavigate } from 'react-router-dom';

export const TripCreator = ({ onClose }: { onClose: () => void }) => {
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<CityEntry | null>(null);
  const [start, setStart] = useState(addDaysISO(todayISO(), 14));
  const [end, setEnd] = useState(addDaysISO(todayISO(), 21));
  const [budget, setBudget] = useState<number>(1500);
  const [currency, setCurrency] = useState('EUR');
  const [loading, setLoading] = useState(false); // ✅ État de chargement

  const homeCurrency = useTripStore(s => s.homeCurrency);
  const addTrip = useTripStore(s => s.addTrip);
  const navigate = useNavigate();

  const suggestions = useMemo(() => searchCities(query, 3), [query]);

  // Auto-select currency from country (per spec: "si un pays est ajouté ou une ville la devise de ce pays directement importer")
  useEffect(() => {
    if (picked) setCurrency(picked.currency);
  }, [picked]);

  const days = daysBetween(start, end);
  const canNext1 = !!picked;
  const canNext2 = !!start && !!end && new Date(end) >= new Date(start);
  const canCreate = budget > 0 && !!currency;

  // ✅ FONCTION DE CRÉATION AVEC APPEL UNSPLASH VIA WORKER
  const create = async () => {
    if (!picked || !canCreate || loading) return;
    
    setLoading(true);
    haptic([8, 30, 8]);

    try {
      // 📸 Appel au Worker Cloudflare pour récupérer la photo
console.log('🔍 Appel Worker avec:', { city: picked.city, country: picked.country, capital: picked.capital });

const photoResult = await fetchTripPhoto({
  city: picked.city,
  country: picked.country,
  capital: picked.capital,
});

console.log('📦 Résultat Worker:', photoResult);

const photoUrl = photoResult.ok && photoResult.photoUrl 
  ? photoResult.photoUrl 
  : 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800'; // Fallback

console.log('✅ Photo finale utilisée:', photoUrl);
console.log('🗂️ Objet voyage complet:', {
  destination: picked.city,
  country: picked.country,
  photoUrl,
});

      // ✅ Création de la checklist (on garde l'ancien système local pour l'instant)
      const checklist = [
        'Passeport / Carte d\'identité',
        'Billets d\'avion / Train',
        'Réservations hôtel',
        'Assurance voyage',
        'Adaptateur électrique',
      ].map(label => ({
        id: crypto.randomUUID(), 
        label, 
        done: false,
      }));

      const trip: Trip = {
        id: crypto.randomUUID(),
        destination: picked.city,
        country: picked.country,
        countryCode: picked.countryCode,
        capital: picked.capital,
        startDate: start,
        endDate: end,
        budget,
        currency,
        homeCurrency,
        photoUrl, // ✅ PERSISTANCE DE LA PHOTO
        steps: [],
        expenses: [],
        checklist,
        notes: '',
        createdAt: new Date().toISOString(),
      };

      addTrip(trip);
      onClose();
      setTimeout(() => navigate(`/trip/${trip.id}/overview`), 100);
    } catch (err) {
      console.error('❌ Erreur création voyage:', err);
      alert('Erreur lors de la création. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 32, stiffness: 320 }}
      className="fixed inset-0 z-[120] bg-[#07070b] overflow-y-auto"
    >
      {/* Aurora background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="aurora opacity-40" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-2xl bg-[rgba(7,7,11,0.7)] border-b border-white/5 pt-safe">
        <div className="flex items-center justify-between px-5 py-4 max-w-2xl mx-auto">
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center tap">
            <X size={18} />
          </button>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(n => (
              <div
                key={n}
                className="h-1 rounded-full transition-all duration-500"
                style={{
                  width: step >= n ? 32 : 16,
                  background: step >= n ? 'linear-gradient(90deg, #7c8cff, #ec4899)' : 'rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </div>
          <div className="w-10" />
        </div>
      </div>

      <div className="relative max-w-2xl mx-auto px-5 py-8 pb-32">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-2 text-white/55 text-sm mb-3">
                <MapPin size={14} /> ÉTAPE 1 / 3
              </div>
              <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tighter mb-8">
                Où allez-vous ?
              </h2>

              <div className="glass-strong rounded-2xl px-5 py-4 mb-3">
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setPicked(null); }}
                  placeholder="Tapez 3 lettres minimum..."
                  className="w-full bg-transparent outline-none text-xl font-medium tracking-tight placeholder-white/30"
                />
              </div>

              <AnimatePresence>
                {suggestions.length > 0 && !picked && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                    {suggestions.map((s) => (
                      <motion.button
                        key={`${s.city}-${s.country}`}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { setPicked(s); setQuery(`${s.city} — ${s.country}`); }}
                        className="w-full glass rounded-2xl px-5 py-4 flex items-center gap-4 tap text-left"
                      >
                        <Flag code={s.countryCode} size={32} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold tracking-tight">{s.city}</div>
                          <div className="text-sm text-white/55">{s.country} · {s.currency}</div>
                        </div>
                        <ArrowRight size={18} className="text-white/40" />
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {picked && (
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-strong rounded-2xl p-5 flex items-center gap-4">
                  <Flag code={picked.countryCode} size={40} />
                  <div className="flex-1">
                    <div className="text-xl font-semibold tracking-tight">{picked.city}</div>
                    <div className="text-sm text-white/55">{picked.country} · Devise auto: {picked.currency}</div>
                  </div>
                  <Sparkles size={20} className="text-[#7c8cff]" />
                </motion.div>
              )}

              {query.length > 0 && query.length < 3 && (
                <p className="text-sm text-white/40 mt-3">Tapez au moins 3 lettres pour voir les suggestions.</p>
              )}
              {query.length >= 3 && suggestions.length === 0 && !picked && (
                <p className="text-sm text-white/40 mt-3">Aucune destination trouvée. Essayez « Paris », « Tokyo », « Bali »...</p>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-2 text-white/55 text-sm mb-3">
                <Calendar size={14} /> ÉTAPE 2 / 3
              </div>
              <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tighter mb-8">
                Quand partez-vous ?
              </h2>

              <div className="space-y-3 mb-6">
                <label className="block">
                  <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-2">Départ</div>
                  <input
                    type="date"
                    value={start}
                    min={todayISO()}
                    onChange={(e) => setStart(e.target.value)}
                    className="w-full glass-strong rounded-2xl px-5 py-4 text-lg font-medium bg-transparent outline-none"
                    style={{ colorScheme: 'dark' }}
                  />
                </label>
                <label className="block">
                  <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-2">Retour</div>
                  <input
                    type="date"
                    value={end}
                    min={start}
                    onChange={(e) => setEnd(e.target.value)}
                    className="w-full glass-strong rounded-2xl px-5 py-4 text-lg font-medium bg-transparent outline-none"
                    style={{ colorScheme: 'dark' }}
                  />
                </label>
              </div>

              {canNext2 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5 text-center">
                  <div className="text-sm text-white/55 mb-1">{fmtRange(start, end)}</div>
                  <div className="text-3xl font-bold tracking-tighter">{days} {days > 1 ? 'jours' : 'jour'}</div>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="s3"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-2 text-white/55 text-sm mb-3">
                <Wallet size={14} /> ÉTAPE 3 / 3
              </div>
              <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tighter mb-8">
                Quel est votre budget ?
              </h2>

              <div className="glass-strong rounded-2xl px-5 py-5 mb-3">
                <div className="text-xs uppercase tracking-wider text-white/55 mb-2">Budget total</div>
                <div className="flex items-baseline gap-3">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={budget || ''}
                    onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="bg-transparent outline-none text-4xl font-bold tracking-tighter w-full font-display"
                  />
                  <span className="text-2xl font-semibold text-white/55">{currency}</span>
                </div>
              </div>

              <div className="mb-3">
                <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-2">Devise</div>
                <div className="glass rounded-2xl p-2 max-h-64 overflow-y-auto">
                  {CURRENCIES.map(c => (
                    <button
                      key={c.code}
                      onClick={() => setCurrency(c.code)}
                      className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition ${currency === c.code ? 'bg-white/10' : 'hover:bg-white/5'}`}
                    >
                      <div>
                        <span className="font-semibold mr-2">{c.code}</span>
                        <span className="text-sm text-white/55">{c.name}</span>
                      </div>
                      <span className="text-white/40">{c.symbol}</span>
                    </button>
                  ))}
                </div>
              </div>
              {picked && currency === picked.currency && (
                <p className="text-xs text-[#56c5a4] px-2">✓ Devise locale automatique pour {picked.country}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 backdrop-blur-2xl bg-[rgba(7,7,11,0.85)] border-t border-white/5 pb-safe">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="h-14 px-5 rounded-2xl glass tap flex items-center gap-2">
              <ArrowLeft size={18} /> Retour
            </button>
          )}
          {step < 3 && (
            <button
              disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2)}
              onClick={() => setStep(step + 1)}
              className="flex-1 h-14 rounded-2xl font-semibold text-white tap disabled:opacity-30 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)' }}
            >
              Continuer <ArrowRight size={18} />
            </button>
          )}
          {step === 3 && (
            <button
              disabled={!canCreate || loading}
              onClick={create}
              className="flex-1 h-14 rounded-2xl font-semibold text-white tap disabled:opacity-30 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #56c5a4 0%, #7c8cff 100%)' }}
            >
              {loading ? (
                <>Chargement...</>
              ) : (
                <>
                  <Sparkles size={18} /> Créer mon carnet
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};