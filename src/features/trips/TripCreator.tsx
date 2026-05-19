// src/features/trips/TripCreator.tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, MapPin,
  Sparkles, Wallet, X, Plus,
  Trash2, Map, ChevronRight, Minus, Check,
  ArrowLeftRight,
} from 'lucide-react';
import { searchAll, CURRENCIES, type CityEntry } from '../../api/countries';
import { fetchTripPhoto, fetchAssistant } from '../../api/cloud';
import { fetchRate } from '../../api/currency';
import { useTripStore, type Trip, type TripDestination } from '../../store/tripStore';
import { Flag } from '../../shared/Flag';
import { MiniSpinner } from '../../shared/Spinner';
import { DatePickerSheet, DateTrigger } from '../../shared/DatePickerSheet';
import { addDaysISO, daysBetween, todayISO, fmtRange } from '../../utils/dateHelpers';
import { haptic } from '../../utils/haptic';
import { useNavigate } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// VILLES RAPIDES PAR PAYS
// ─────────────────────────────────────────────────────────────────────────────
const QUICK_CITIES: Record<string, string[]> = {
  JP: ['Tokyo', 'Osaka', 'Kyoto', 'Sapporo', 'Hiroshima', 'Nara'],
  FR: ['Paris', 'Lyon', 'Marseille', 'Nice', 'Bordeaux', 'Strasbourg'],
  IT: ['Rome', 'Milan', 'Florence', 'Venise', 'Naples', 'Bologne'],
  ES: ['Barcelone', 'Madrid', 'Séville', 'Valence', 'Grenade', 'Bilbao'],
  US: ['New York', 'Los Angeles', 'Miami', 'Chicago', 'Las Vegas', 'San Francisco'],
  DE: ['Berlin', 'Munich', 'Hambourg', 'Cologne', 'Francfort', 'Dresde'],
  GB: ['Londres', 'Édimbourg', 'Manchester', 'Liverpool', 'Oxford', 'Bath'],
  PT: ['Lisbonne', 'Porto', 'Faro', 'Sintra', 'Évora', 'Tavira'],
  GR: ['Athènes', 'Santorin', 'Mykonos', 'Thessalonique', 'Héraklion', 'Rhodes'],
  TH: ['Bangkok', 'Phuket', 'Chiang Mai', 'Koh Samui', 'Pattaya', 'Krabi'],
  MA: ['Marrakech', 'Casablanca', 'Fès', 'Rabat', 'Agadir', 'Tanger'],
  TR: ['Istanbul', 'Antalya', 'Cappadoce', 'Bodrum', 'Izmir', 'Pamukkale'],
  ID: ['Bali', 'Jakarta', 'Yogyakarta', 'Lombok', 'Labuan Bajo', 'Komodo'],
  VN: ['Hanoï', 'Hô-Chi-Minh-Ville', 'Da Nang', 'Hội An', 'Ha Long', 'Hué'],
  IN: ['Mumbai', 'Delhi', 'Goa', 'Jaipur', 'Agra', 'Kerala'],
  CN: ['Pékin', 'Shanghai', "Xi'an", 'Guilin', 'Chengdu', 'Hangzhou'],
  AU: ['Sydney', 'Melbourne', 'Brisbane', 'Cairns', 'Perth', 'Adélaïde'],
  CA: ['Toronto', 'Vancouver', 'Montréal', 'Québec', 'Banff', 'Victoria'],
  MX: ['Mexico', 'Cancún', 'Guadalajara', 'Oaxaca', 'Mérida', 'Tulum'],
  BR: ['Rio de Janeiro', 'São Paulo', 'Salvador', 'Florianópolis', 'Manaus', 'Iguaçu'],
  MY: ['Kuala Lumpur', 'Penang', 'Langkawi', 'Kota Kinabalu', 'Malacca', 'Perhentian'],
  AR: ['Buenos Aires', 'Mendoza', 'Bariloche', 'Córdoba', 'Salta', 'Ushuaia'],
  EG: ['Le Caire', 'Louxor', 'Assouan', 'Alexandrie', 'Hurghada', 'Charm el-Cheikh'],
  AE: ['Dubaï', 'Abu Dhabi', 'Sharjah', 'Ras Al Khaimah', 'Fujairah', 'Ajman'],
  ZA: ['Le Cap', 'Johannesburg', 'Durban', 'Stellenbosch', 'Knysna', 'Franschhoek'],
  NL: ['Amsterdam', 'Rotterdam', 'La Haye', 'Utrecht', 'Delft', 'Leiden'],
  BE: ['Bruxelles', 'Bruges', 'Gand', 'Anvers', 'Liège', 'Dinant'],
  CH: ['Zurich', 'Genève', 'Berne', 'Lausanne', 'Interlaken', 'Lucerne'],
  AT: ['Vienne', 'Salzbourg', 'Innsbruck', 'Graz', 'Hallstatt', 'Linz'],
  CZ: ['Prague', 'Brno', 'Český Krumlov', 'Karlovy Vary', 'Olomouc', 'Telč'],
  HU: ['Budapest', 'Debrecen', 'Pécs', 'Győr', 'Eger', 'Veszprém'],
  HR: ['Dubrovnik', 'Split', 'Zagreb', 'Hvar', 'Pula', 'Rovinj'],
  PL: ['Cracovie', 'Varsovie', 'Gdańsk', 'Wrocław', 'Poznań', 'Zakopane'],
  KR: ['Séoul', 'Busan', 'Jeju', 'Gyeongju', 'Incheon', 'Jeonju'],
  IS: ['Reykjavik', 'Akureyri', 'Vik', 'Húsavík', 'Selfoss', 'Stykkishólmur'],
  NO: ['Oslo', 'Bergen', 'Tromsø', 'Flåm', 'Stavanger', 'Ålesund'],
  SE: ['Stockholm', 'Göteborg', 'Malmö', 'Uppsala', 'Kiruna', 'Visby'],
  DK: ['Copenhague', 'Aarhus', 'Odense', 'Aalborg', 'Helsingør', 'Roskilde'],
  GE: ['Tbilissi', 'Batoumi', 'Kazbegi', 'Kutaisi', 'Sighnaghi', 'Mestia'],
  PE: ['Lima', 'Cusco', 'Machu Picchu', 'Arequipa', 'Iquitos', 'Puno'],
  CO: ['Bogotá', 'Medellín', 'Carthagène', 'Cali', 'Santa Marta', 'Tayrona'],
  PH: ['Manille', 'Cebu', 'Boracay', 'Palawan', 'Davao', 'Bohol'],
  KH: ['Siem Reap', 'Phnom Penh', 'Battambang', 'Kampot', 'Koh Rong', 'Kep'],
  LK: ['Colombo', 'Kandy', 'Sigiriya', 'Galle', 'Ella', 'Trincomalee'],
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type RoadtripStop = {
  id:     string;
  city:   string;
  nbDays: number;
};

type CreationStep = 'idle' | 'photo' | 'checklist' | 'saving';

// ─────────────────────────────────────────────────────────────────────────────
// CSS VARIABLE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const ACCENT_GRADIENT = 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)';
const ACCENT_FROM_SOFT = 'rgba(var(--accent-from-rgb, 124,140,255), 0.18)';
const ACCENT_FROM_BORDER = 'rgba(var(--accent-from-rgb, 124,140,255), 0.35)';
const ACCENT_FROM_COLOR = 'var(--accent-from, #7c8cff)';
const ACCENT_FROM_LABEL = 'var(--accent-label, #a5b4fc)';

// ─────────────────────────────────────────────────────────────────────────────
// DaysStepper
// ─────────────────────────────────────────────────────────────────────────────
const DaysStepper = ({
  value,
  onChange,
}: {
  value:    number;
  onChange: (v: number) => void;
}) => {
  const canDecrease = value > 1;

  return (
    <div className="flex items-center gap-3">
      <motion.button
        whileTap={{ scale: canDecrease ? 0.88 : 1 }}
        onClick={() => {
          if (!canDecrease) return;
          haptic(6);
          onChange(value - 1);
        }}
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          background: canDecrease ? ACCENT_FROM_SOFT   : 'rgba(255,255,255,0.05)',
          border:     canDecrease ? `1px solid ${ACCENT_FROM_BORDER}` : '1px solid rgba(255,255,255,0.08)',
        }}
        aria-label="Réduire"
      >
        <Minus
          size={14}
          style={{ color: canDecrease ? ACCENT_FROM_LABEL : 'rgba(255,255,255,0.2)' }}
        />
      </motion.button>

      <AnimatePresence mode="wait">
        <motion.div
          key={value}
          initial={{ opacity: 0, y: -6, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.85 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="min-w-[56px] text-center"
        >
          <span
            className="text-2xl font-bold font-display tracking-tighter"
            style={{ color: ACCENT_FROM_LABEL }}
          >
            {value}
          </span>
          <span className="text-xs text-white/40 ml-1">
            {value > 1 ? 'jours' : 'jour'}
          </span>
        </motion.div>
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={() => {
          haptic(6);
          onChange(value + 1);
        }}
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          background: ACCENT_FROM_SOFT,
          border:     `1px solid ${ACCENT_FROM_BORDER}`,
        }}
        aria-label="Augmenter"
      >
        <Plus size={14} style={{ color: ACCENT_FROM_LABEL }} />
      </motion.button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CreationLoader
// ─────────────────────────────────────────────────────────────────────────────
const CreationLoader = ({
  creationStep,
  isRoadtrip,
  destination,
}: {
  creationStep: CreationStep;
  isRoadtrip:   boolean;
  destination:  string;
}) => {
  const steps: { key: CreationStep; icon: string; label: string }[] = [
    { key: 'photo',     icon: '📸', label: 'Photo évocatrice...' },
    { key: 'checklist', icon: '✨', label: `Checklist IA pour ${destination}...` },
    { key: 'saving',    icon: '💾', label: 'Finalisation...' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
      style={{ background: 'rgba(7,7,11,0.92)', backdropFilter: 'blur(32px)' }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="aurora opacity-30" />
      </div>
      <div className="relative flex flex-col items-center gap-8 px-8 max-w-sm w-full">
        <motion.div
          animate={{ scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
          className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{
            background: 'rgba(124,140,255,0.15)',
            border:     '1px solid rgba(124,140,255,0.4)',
            boxShadow:  '0 0 40px rgba(124,140,255,0.25)',
          }}
        >
          <span className="text-4xl">{isRoadtrip ? '🗺️' : '✈️'}</span>
        </motion.div>

        <div className="text-center">
          <div className="text-xl font-bold tracking-tight mb-1">Création en cours...</div>
          <div className="text-sm text-white/45">
            {isRoadtrip ? `Roadtrip · ${destination}` : `Voyage · ${destination}`}
          </div>
        </div>

        <div className="w-full space-y-3">
          {steps.map((s, i) => {
            const currentIdx = steps.findIndex((st) => st.key === creationStep);
            const isDone     = i < currentIdx;
            const isActive   = s.key === creationStep;
            return (
              <motion.div
                key={s.key}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: isDone || isActive ? 1 : 0.3, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{
                  background: isActive
                    ? 'rgba(124,140,255,0.12)'
                    : isDone
                    ? 'rgba(86,197,164,0.08)'
                    : 'rgba(255,255,255,0.03)',
                  border: isActive
                    ? '1px solid rgba(124,140,255,0.3)'
                    : isDone
                    ? '1px solid rgba(86,197,164,0.2)'
                    : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0">
                  {isDone ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-7 h-7 rounded-xl flex items-center justify-center"
                      style={{ background: '#56c5a4' }}
                    >
                      <Check size={14} className="text-black" strokeWidth={3} />
                    </motion.div>
                  ) : isActive ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                      style={{
                        width: 20, height: 20, borderRadius: '50%',
                        border: '2px solid rgba(124,140,255,0.3)',
                        borderTopColor: '#7c8cff',
                      }}
                    />
                  ) : (
                    <span className="text-base opacity-40">{s.icon}</span>
                  )}
                </div>
                <span
                  className="text-sm font-medium"
                  style={{
                    color: isDone
                      ? '#56c5a4'
                      : isActive
                      ? 'rgba(255,255,255,0.9)'
                      : 'rgba(255,255,255,0.3)',
                  }}
                >
                  {isDone ? s.label.replace('...', ' ✓') : s.label}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* ✅ Barre progression — CSS variables */}
        <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: ACCENT_GRADIENT }}
            animate={{
              width:
                creationStep === 'photo'
                  ? '33%'
                  : creationStep === 'checklist'
                  ? '66%'
                  : '95%',
            }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export const TripCreator = ({ onClose }: { onClose: () => void }) => {
  const [step, setStep] = useState(1);

  const [query,       setQuery]       = useState('');
  const [picked,      setPicked]      = useState<CityEntry | null>(null);
  const [suggestions, setSuggestions] = useState<CityEntry[]>([]);
  const [searching,   setSearching]   = useState(false);

  const [isRoadtrip,      setIsRoadtrip]      = useState(false);
  const [stops,           setStops]           = useState<RoadtripStop[]>([]);
  const [stopQuery,       setStopQuery]       = useState('');
  const [stopSearching,   setStopSearching]   = useState(false);
  const [stopSuggestions, setStopSuggestions] = useState<CityEntry[]>([]);
  const [addingStop,      setAddingStop]      = useState(false);

  const [start,           setStart]           = useState(addDaysISO(todayISO(), 14));
  const [end,             setEnd]             = useState(addDaysISO(todayISO(), 21));
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen,   setEndPickerOpen]   = useState(false);

  const [budget,   setBudget]   = useState<number>(1500);
  const [currency, setCurrency] = useState('EUR');

  const [liveRate,       setLiveRate]       = useState<number | null>(null);
  const [liveRateSource, setLiveRateSource] = useState<'live' | 'offline' | null>(null);
  const [loadingRate,    setLoadingRate]    = useState(false);

  const [creationStep, setCreationStep] = useState<CreationStep>('idle');

  const abortRef     = useRef<AbortController | null>(null);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopAbortRef = useRef<AbortController | null>(null);
  const stopDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const homeCurrency = useTripStore((s) => s.homeCurrency);
  const addTrip      = useTripStore((s) => s.addTrip);
  const navigate     = useNavigate();

  useEffect(() => {
    setCurrency(homeCurrency);
  }, [homeCurrency]);

  const tripCurrency       = picked?.currency ?? 'USD';
  const showBothCurrencies = homeCurrency !== tripCurrency;
  const isBudgetStep       = (step === 3 && !isRoadtrip) || (step === 4 && isRoadtrip);

  useEffect(() => {
    if (!isBudgetStep) return;
    if (!picked) return;
    if (!showBothCurrencies) {
      setLiveRate(null);
      setLiveRateSource(null);
      return;
    }
    let cancelled = false;
    const loadRate = async () => {
      setLoadingRate(true);
      setLiveRate(null);
      setLiveRateSource(null);
      try {
        const result = await fetchRate(currency, tripCurrency);
        if (!cancelled) {
          setLiveRate(result.rate);
          setLiveRateSource(result.source);
        }
      } catch {
        if (!cancelled) { setLiveRate(null); setLiveRateSource(null); }
      } finally {
        if (!cancelled) setLoadingRate(false);
      }
    };
    loadRate();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBudgetStep, currency, tripCurrency, picked?.countryCode]);

  useEffect(() => {
    if (picked) { setSuggestions([]); return; }
    if (query.trim().length < 2) { setSuggestions([]); setSearching(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      setSearching(true);
      try {
        const results = await searchAll(query, abortRef.current.signal);
        setSuggestions(results);
      } catch { /* silencieux */ }
      finally { setSearching(false); }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, picked]);

  useEffect(() => {
    if (!addingStop || stopQuery.trim().length < 2) {
      setStopSuggestions([]); setStopSearching(false); return;
    }
    if (stopDebounce.current) clearTimeout(stopDebounce.current);
    stopDebounce.current = setTimeout(async () => {
      if (stopAbortRef.current) stopAbortRef.current.abort();
      stopAbortRef.current = new AbortController();
      setStopSearching(true);
      try {
        const results = await searchAll(stopQuery, stopAbortRef.current.signal);
        const filtered = results.filter(
          (r) => r.type === 'city' && r.countryCode === picked?.countryCode,
        );
        setStopSuggestions(
          filtered.length > 0
            ? filtered.slice(0, 5)
            : results.filter((r) => r.type === 'city').slice(0, 5),
        );
      } catch { /* silencieux */ }
      finally { setStopSearching(false); }
    }, 300);
    return () => { if (stopDebounce.current) clearTimeout(stopDebounce.current); };
  }, [stopQuery, addingStop, picked?.countryCode]);

  const days          = daysBetween(start, end);
  const totalStopDays = stops.reduce((acc, s) => acc + s.nbDays, 0);

  const stopsStatus: 'ok' | 'trop_peu' | 'trop' | 'vide' =
    stops.length === 0
      ? 'vide'
      : totalStopDays === days
      ? 'ok'
      : totalStopDays < days
      ? 'trop_peu'
      : 'trop';

  const canNext1   = !!picked;
  const canNext2   = !!start && !!end && new Date(end) >= new Date(start);
  const canCreate  = budget > 0 && !!currency;
  const isCreating = creationStep !== 'idle';

  const getStopOffsets = useCallback((): {
    fromDay: number; toDay: number; fromDate: string; toDate: string;
  }[] => {
    const result: { fromDay: number; toDay: number; fromDate: string; toDate: string }[] = [];
    let offset = 0;
    stops.forEach((stop, index) => {
      const isLast   = index === stops.length - 1;
      const nbDays   = stop.nbDays;
      const fromDay  = offset + 1;
      const toDay    = offset + nbDays;
      const fromDate = addDaysISO(start, offset);
      const toDate   = isLast ? end : addDaysISO(start, offset + nbDays - 1);
      result.push({ fromDay, toDay, fromDate, toDate });
      offset += nbDays;
    });
    return result;
  }, [stops, start, end]);

  const pickSuggestion = (s: CityEntry) => {
    setPicked(s);
    setQuery(s.type === 'country' ? s.country : `${s.city}, ${s.country}`);
    setSuggestions([]);
    setIsRoadtrip(false);
    setStops([]);
  };

  const addStop = useCallback((cityName: string) => {
    haptic(8);
    const allocated   = stops.reduce((a, s) => a + s.nbDays, 0);
    const remaining   = Math.max(1, days - allocated);
    const defaultDays = Math.max(1, remaining);
    setStops((prev) => [
      ...prev,
      { id: crypto.randomUUID(), city: cityName, nbDays: defaultDays },
    ]);
    setAddingStop(false);
    setStopQuery('');
    setStopSuggestions([]);
  }, [stops, days]);

  const updateStopDays = useCallback((stopId: string, newDays: number) => {
    setStops((prev) =>
      prev.map((s) => s.id === stopId ? { ...s, nbDays: Math.max(1, newDays) } : s),
    );
  }, []);

  const removeStop = useCallback((stopId: string) => {
    haptic(8);
    setStops((prev) => prev.filter((s) => s.id !== stopId));
  }, []);

  const create = async () => {
    if (!picked || !canCreate || isCreating) return;
    haptic([8, 30, 8]);
    const primaryCity = isRoadtrip && stops.length > 0 ? stops[0].city : picked.city;

    try {
      setCreationStep('photo');

      const [photoSettled, assistantSettled] = await Promise.allSettled([
        fetchTripPhoto({
          city:        picked.type === 'city' ? picked.city : undefined,
          country:     picked.country,
          countryCode: picked.countryCode,
          capital:     picked.capital,
        }),
        fetchAssistant({
          city:         primaryCity,
          country:      picked.country,
          days,
          budget,
          currency,
          homeCurrency,
        }),
      ]);

      setCreationStep('checklist');

      const photoUrl =
        photoSettled.status === 'fulfilled' &&
        photoSettled.value.ok &&
        photoSettled.value.photoUrl
          ? photoSettled.value.photoUrl
          : 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800';

      let smartChecklist: { id: string; label: string; done: boolean }[] = [];
      if (
        assistantSettled.status === 'fulfilled' &&
        assistantSettled.value.ok &&
        assistantSettled.value.checklist.length > 0
      ) {
        smartChecklist = assistantSettled.value.checklist.map((label) => ({
          id: crypto.randomUUID(), label, done: false,
        }));
      }
      if (smartChecklist.length === 0) {
        smartChecklist = [
          "Passeport / Carte d'identité", "Billets d'avion / Train",
          'Réservations hôtel', 'Assurance voyage',
          'Adaptateur électrique', 'Devises locales',
          'Médicaments habituels', 'Chargeur et power bank',
        ].map((label) => ({ id: crypto.randomUUID(), label, done: false }));
      }

      setCreationStep('saving');

      let tripDestinations: TripDestination[] | undefined;
      if (isRoadtrip && stops.length > 0) {
        const offsets = getStopOffsets();
        tripDestinations = stops.map((stop, index) => ({
          city:        stop.city,
          countryCode: picked.countryCode,
          fromDate:    offsets[index].fromDate,
          toDate:      offsets[index].toDate,
          fromDay:     offsets[index].fromDay,
          toDay:       offsets[index].toDay,
        }));
      }

      const trip: Trip = {
        id:           crypto.randomUUID(),
        destination:  picked.city,
        country:      picked.country,
        countryCode:  picked.countryCode,
        capital:      picked.capital,
        lat:          picked.lat,
        lon:          picked.lon,
        startDate:    start,
        endDate:      end,
        budget,
        currency,
        homeCurrency,
        photoUrl,
        steps:        [],
        expenses:     [],
        checklist:    smartChecklist,
        notes:        '',
        createdAt:    new Date().toISOString(),
        isRoadtrip:   isRoadtrip && stops.length > 0,
        destinations: tripDestinations,
      };

      await new Promise((r) => setTimeout(r, 400));
      addTrip(trip);
      onClose();
      setTimeout(() => navigate(`/trip/${trip.id}/overview`), 100);

    } catch (err) {
      console.error('❌ Erreur création voyage:', err);
      setCreationStep('idle');
    }
  };

  const totalSteps = isRoadtrip ? 4 : 3;

  const convertedBudget =
    liveRate !== null && budget > 0
      ? (budget * liveRate).toLocaleString('fr-FR', { maximumFractionDigits: 0 })
      : null;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <AnimatePresence>
        {isCreating && (
          <CreationLoader
            creationStep={creationStep}
            isRoadtrip={isRoadtrip}
            destination={picked?.city ?? picked?.country ?? ''}
          />
        )}
      </AnimatePresence>

      <DatePickerSheet
        open={startPickerOpen}
        onClose={() => setStartPickerOpen(false)}
        value={start}
        min={todayISO()}
        max={addDaysISO(todayISO(), 730)}
        title="Date de départ"
        onChange={(iso) => {
          setStart(iso);
          if (iso >= end) setEnd(addDaysISO(iso, 7));
          setStartPickerOpen(false);
        }}
      />

      <DatePickerSheet
        open={endPickerOpen}
        onClose={() => setEndPickerOpen(false)}
        value={end}
        min={addDaysISO(start, 1)}
        max={addDaysISO(todayISO(), 730)}
        title="Date de retour"
        onChange={(iso) => {
          setEnd(iso);
          setEndPickerOpen(false);
        }}
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        className="fixed inset-0 z-[120] bg-[#07070b] overflow-y-auto"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="aurora opacity-40" />
        </div>

        {/* ── Header stepper ── */}
        <div className="sticky top-0 z-20 backdrop-blur-2xl bg-[rgba(7,7,11,0.7)] border-b border-white/5 pt-safe">
          <div className="flex items-center justify-between px-5 py-4 max-w-2xl mx-auto">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center tap"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>

            {/* ✅ Stepper pills — CSS variables */}
            <div className="flex items-center gap-2">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n) => (
                <div
                  key={n}
                  className="h-1 rounded-full transition-all duration-500"
                  style={{
                    width:      step >= n ? 32 : 16,
                    background: step >= n ? ACCENT_GRADIENT : 'rgba(255,255,255,0.15)',
                  }}
                />
              ))}
            </div>

            <div className="w-10" />
          </div>
        </div>

        <div className="relative max-w-2xl mx-auto px-5 py-8 pb-32">
          <AnimatePresence mode="wait">

            {/* ════ ÉTAPE 1 — DESTINATION ════ */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22 }}
              >
                <div className="flex items-center gap-2 text-white/55 text-sm mb-3">
                  <MapPin size={14} />
                  <span>ÉTAPE 1 / {totalSteps}</span>
                </div>
                <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tighter mb-8">
                  Où allez-vous ?
                </h2>

                <div className="glass-strong rounded-2xl px-5 py-4 mb-3 flex items-center gap-3">
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      if (picked) { setPicked(null); setIsRoadtrip(false); setStops([]); }
                    }}
                    placeholder="Paris, Malaisie, Bali, Tbilissi..."
                    className="flex-1 bg-transparent outline-none text-xl font-medium tracking-tight placeholder-white/30"
                  />
                  {searching && <MiniSpinner />}
                  {query.length > 0 && !searching && (
                    <button
                      onClick={() => {
                        setQuery('');
                        setPicked(null);
                        setSuggestions([]);
                        setIsRoadtrip(false);
                        setStops([]);
                      }}
                      className="text-white/30 hover:text-white/60 transition tap"
                      aria-label="Effacer"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {suggestions.length > 0 && !picked && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="space-y-2 mb-4"
                    >
                      {suggestions.map((s) => (
                        <motion.button
                          key={`${s.type}-${s.countryCode}-${s.city}-${s.lat}`}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => pickSuggestion(s)}
                          className="w-full glass rounded-2xl px-5 py-4 flex items-center gap-4 tap text-left"
                        >
                          <Flag code={s.countryCode} size={20} />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold tracking-tight truncate">{s.city}</div>
                            <div className="text-sm text-white/55 truncate">
                              {s.type === 'city'
                                ? `${s.country} · ${s.currency}`
                                : `Pays · ${s.currency}`}
                            </div>
                          </div>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{
                              background: s.type === 'city'
                                ? 'rgba(124,140,255,0.2)'
                                : 'rgba(86,197,164,0.2)',
                              color: s.type === 'city' ? '#7c8cff' : '#56c5a4',
                            }}
                          >
                            {s.type === 'city' ? 'Ville' : 'Pays'}
                          </span>
                          <ArrowRight size={16} className="text-white/30 flex-shrink-0" />
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {picked && (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="space-y-3"
                  >
                    <div className="glass-strong rounded-2xl p-5 flex items-center gap-4">
                      <Flag code={picked.countryCode} size={20} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-xl font-semibold tracking-tight">{picked.city}</div>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              background: picked.type === 'city'
                                ? 'rgba(124,140,255,0.2)'
                                : 'rgba(86,197,164,0.2)',
                              color: picked.type === 'city' ? '#7c8cff' : '#56c5a4',
                            }}
                          >
                            {picked.type === 'city' ? 'Ville' : 'Pays'}
                          </span>
                        </div>
                        <div className="text-sm text-white/55 mt-0.5">
                          {picked.country} · {picked.currency}
                        </div>
                      </div>
                      <Sparkles size={18} className="text-[#7c8cff] flex-shrink-0" />
                    </div>

                    {picked.type === 'country' && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <button
                          onClick={() => { haptic(8); setIsRoadtrip(true); setStops([]); }}
                          className="w-full rounded-2xl p-4 flex items-center gap-4 tap transition-all"
                          style={{
                            background: isRoadtrip
                              ? 'rgba(124,140,255,0.15)'
                              : 'rgba(255,255,255,0.05)',
                            border: isRoadtrip
                              ? '1px solid rgba(124,140,255,0.4)'
                              : '1px solid rgba(255,255,255,0.1)',
                          }}
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{
                              background: isRoadtrip
                                ? 'rgba(124,140,255,0.25)'
                                : 'rgba(255,255,255,0.08)',
                            }}
                          >
                            <Map
                              size={18}
                              style={{
                                color: isRoadtrip ? '#7c8cff' : 'rgba(255,255,255,0.5)',
                              }}
                            />
                          </div>
                          <div className="flex-1 text-left">
                            <div
                              className="font-semibold text-sm tracking-tight"
                              style={{
                                color: isRoadtrip ? '#7c8cff' : 'rgba(255,255,255,0.8)',
                              }}
                            >
                              Roadtrip — Plusieurs villes
                            </div>
                            <div className="text-xs text-white/40 mt-0.5">
                              Planifiez votre itinéraire ville par ville
                            </div>
                          </div>
                          <div
                            className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                            style={{
                              borderColor: isRoadtrip
                                ? '#7c8cff'
                                : 'rgba(255,255,255,0.25)',
                              background: isRoadtrip ? '#7c8cff' : 'transparent',
                            }}
                          >
                            {isRoadtrip && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                        </button>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {!picked && query.length >= 2 && !searching && suggestions.length === 0 && (
                  <p className="text-sm text-white/40 mt-3 px-2">
                    Aucune destination trouvée. Essayez « Paris », « Malaisie », « Bali »…
                  </p>
                )}
              </motion.div>
            )}

            {/* ════ ÉTAPE 2 — DATES ════ */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22 }}
              >
                <div className="flex items-center gap-2 text-white/55 text-sm mb-3">
                  <span>📅</span>
                  <span>ÉTAPE 2 / {totalSteps}</span>
                </div>
                <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tighter mb-8">
                  Quand partez-vous ?
                </h2>

                <div className="space-y-3 mb-6">
                  <DateTrigger
                    value={start}
                    label="Départ"
                    onClick={() => setStartPickerOpen(true)}
                  />
                  <DateTrigger
                    value={end}
                    label="Retour"
                    onClick={() => setEndPickerOpen(true)}
                  />
                </div>

                {canNext2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-2xl p-5 text-center"
                  >
                    <div className="text-sm text-white/55 mb-1">{fmtRange(start, end)}</div>
                    <div className="text-3xl font-bold tracking-tighter font-display">
                      {days} {days > 1 ? 'jours' : 'jour'}
                    </div>
                    {isRoadtrip && (
                      <div className="text-xs text-white/40 mt-2 flex items-center justify-center gap-1">
                        <Map size={11} /> Roadtrip · vous choisirez vos villes à l'étape suivante
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ════ ÉTAPE 3 — VILLES ROADTRIP ════ */}
            {step === 3 && isRoadtrip && (
              <motion.div
                key="step-3-roadtrip"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22 }}
              >
                <div className="flex items-center gap-2 text-white/55 text-sm mb-3">
                  <Map size={14} />
                  <span>ÉTAPE 3 / {totalSteps}</span>
                </div>
                <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tighter mb-2">
                  Votre itinéraire
                </h2>
                <p className="text-white/45 text-sm mb-6">
                  {picked?.country} · {fmtRange(start, end)} · {days} jours au total
                </p>

                <div className="space-y-3 mb-4">
                  <AnimatePresence mode="popLayout">
                    {stops.map((stop, index) => {
                      const offsets  = getStopOffsets();
                      const fromDate = offsets[index]?.fromDate ?? start;
                      const toDate   = offsets[index]?.toDate   ?? end;
                      const pct      = Math.round((stop.nbDays / Math.max(1, days)) * 100);

                      return (
                        <motion.div
                          key={stop.id}
                          layout
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20, height: 0 }}
                          transition={{ type: 'spring', damping: 26 }}
                          className="rounded-2xl p-4"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border:     '1px solid rgba(255,255,255,0.1)',
                          }}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            {/* ✅ Numéro stop — CSS variables */}
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{ background: ACCENT_GRADIENT }}
                            >
                              {index + 1}
                            </div>
                            <div className="flex-1 font-semibold tracking-tight">
                              {stop.city}
                            </div>
                            <button
                              onClick={() => removeStop(stop.id)}
                              className="w-7 h-7 rounded-full flex items-center justify-center tap"
                              style={{ background: 'rgba(239,68,68,0.15)' }}
                              aria-label="Supprimer cette étape"
                            >
                              <Trash2 size={13} style={{ color: '#ef4444' }} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div>
                              <div className="text-xs text-white/40 mb-0.5">
                                Durée à {stop.city}
                              </div>
                              <div className="text-xs text-white/30">
                                {new Date(fromDate + 'T12:00:00').toLocaleDateString('fr-FR', {
                                  day: 'numeric', month: 'short',
                                })}
                                {' → '}
                                {new Date(toDate + 'T12:00:00').toLocaleDateString('fr-FR', {
                                  day: 'numeric', month: 'short',
                                })}
                              </div>
                            </div>
                            <DaysStepper
                              value={stop.nbDays}
                              onChange={(v) => updateStopDays(stop.id, v)}
                            />
                          </div>

                          <div>
                            <span className="text-[10px] text-white/25">
                              {pct}% du voyage
                            </span>
                            {/* ✅ Barre stop — CSS variables */}
                            <div className="h-1 rounded-full bg-white/10 overflow-hidden mt-1">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(pct, 100)}%` }}
                                transition={{ duration: 0.4 }}
                                className="h-full rounded-full"
                                style={{ background: ACCENT_GRADIENT }}
                              />
                            </div>
                          </div>

                          {index < stops.length - 1 && (
                            <div
                              className="flex items-center gap-2 mt-3 pt-3"
                              style={{ borderTop: '1px dashed rgba(255,255,255,0.08)' }}
                            >
                              <ChevronRight size={12} className="text-white/20" />
                              <span className="text-xs text-white/25">
                                Suite : {stops[index + 1]?.city ?? '—'}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {stops.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-between px-4 py-3 rounded-2xl mb-4"
                    style={{
                      background:
                        stopsStatus === 'ok'
                          ? 'rgba(86,197,164,0.08)'
                          : stopsStatus === 'trop'
                          ? 'rgba(239,68,68,0.08)'
                          : 'rgba(240,178,74,0.08)',
                      border:
                        stopsStatus === 'ok'
                          ? '1px solid rgba(86,197,164,0.2)'
                          : stopsStatus === 'trop'
                          ? '1px solid rgba(239,68,68,0.2)'
                          : '1px solid rgba(240,178,74,0.2)',
                    }}
                  >
                    <span
                      className="text-xs font-medium"
                      style={{
                        color:
                          stopsStatus === 'ok'
                            ? '#56c5a4'
                            : stopsStatus === 'trop'
                            ? '#ef4444'
                            : '#f0b24a',
                      }}
                    >
                      {stopsStatus === 'ok' && `✓ ${totalStopDays} jours planifiés — parfait !`}
                      {stopsStatus === 'trop_peu' &&
                        `⚠️ ${totalStopDays}/${days} jours planifiés — il reste ${days - totalStopDays} jour${days - totalStopDays > 1 ? 's' : ''} à allouer`}
                      {stopsStatus === 'trop' &&
                        `⚠️ ${totalStopDays}/${days} jours planifiés — ${totalStopDays - days} jour${totalStopDays - days > 1 ? 's' : ''} en trop`}
                    </span>
                    <span className="text-xs text-white/35">
                      {stops.length} ville{stops.length > 1 ? 's' : ''}
                    </span>
                  </motion.div>
                )}

                <AnimatePresence>
                  {addingStop ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden mb-3"
                    >
                      <div
                        className="rounded-2xl p-4 space-y-3"
                        style={{
                          background: 'rgba(124,140,255,0.06)',
                          border:     '1px solid rgba(124,140,255,0.2)',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="text-sm font-semibold"
                            style={{ color: ACCENT_FROM_COLOR }}
                          >
                            Ajouter une ville
                          </span>
                          <button
                            onClick={() => {
                              setAddingStop(false);
                              setStopQuery('');
                              setStopSuggestions([]);
                            }}
                            className="tap"
                          >
                            <X size={16} className="text-white/40" />
                          </button>
                        </div>

                        <div className="text-xs text-white/30 italic">
                          💡 Vous pouvez revenir dans une ville déjà visitée (ex: hub de transit)
                        </div>

                        {picked && QUICK_CITIES[picked.countryCode] && (
                          <div>
                            <div className="text-xs text-white/35 mb-2">
                              Destinations populaires
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {QUICK_CITIES[picked.countryCode].map((city) => (
                                <button
                                  key={city}
                                  onClick={() => addStop(city)}
                                  className="px-3 py-1.5 rounded-full text-xs font-medium tap"
                                  style={{
                                    background: ACCENT_FROM_SOFT,
                                    border:     `1px solid ${ACCENT_FROM_BORDER}`,
                                    color:      ACCENT_FROM_LABEL,
                                  }}
                                >
                                  {city}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
                          <MapPin size={13} className="text-white/35 flex-shrink-0" />
                          <input
                            autoFocus
                            value={stopQuery}
                            onChange={(e) => setStopQuery(e.target.value)}
                            placeholder="Rechercher une ville..."
                            className="flex-1 bg-transparent outline-none text-sm font-medium placeholder-white/30"
                          />
                          {stopSearching && <MiniSpinner />}
                          {stopQuery.length > 0 && !stopSearching && (
                            <button
                              onClick={() => {
                                setStopQuery('');
                                setStopSuggestions([]);
                              }}
                              className="tap"
                            >
                              <X size={13} className="text-white/30" />
                            </button>
                          )}
                        </div>

                        <AnimatePresence>
                          {stopSuggestions.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="space-y-1"
                            >
                              {stopSuggestions.map((s) => (
                                <button
                                  key={`stop-${s.city}-${s.lat}`}
                                  onClick={() => addStop(s.city)}
                                  className="w-full glass rounded-xl px-4 py-2.5 flex items-center gap-3 tap text-left"
                                >
                                  <MapPin size={12} className="text-white/35" />
                                  <span className="text-sm font-medium flex-1">{s.city}</span>
                                  <span className="text-xs text-white/30">{s.country}</span>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => { setAddingStop(true); setStopQuery(''); }}
                      className="w-full rounded-2xl p-4 flex items-center gap-3 tap mb-3"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border:     '1px dashed rgba(255,255,255,0.15)',
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: ACCENT_FROM_SOFT }}
                      >
                        <Plus size={16} style={{ color: ACCENT_FROM_COLOR }} />
                      </div>
                      <span className="text-sm font-medium text-white/60">
                        Ajouter une ville
                      </span>
                    </motion.button>
                  )}
                </AnimatePresence>

                {stops.length === 0 && (
                  <p className="text-center text-sm text-white/35 py-4">
                    Ajoutez votre première ville d'étape ci-dessus
                  </p>
                )}
              </motion.div>
            )}

            {/* ════ ÉTAPE BUDGET ════ */}
            {isBudgetStep && (
              <motion.div
                key="step-budget"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22 }}
              >
                <div className="flex items-center gap-2 text-white/55 text-sm mb-3">
                  <Wallet size={14} />
                  <span>ÉTAPE {isRoadtrip ? 4 : 3} / {totalSteps}</span>
                </div>
                <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tighter mb-8">
                  Quel est votre budget ?
                </h2>

                <div className="glass-strong rounded-2xl px-5 py-5 mb-4">
                  <div className="text-xs uppercase tracking-wider text-white/55 mb-2">
                    Budget total
                  </div>
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

                <div className="mb-4">
                  <div className="text-xs uppercase tracking-wider text-white/55 mb-3 px-1">
                    Devise de votre budget
                  </div>

                  {showBothCurrencies ? (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setCurrency(homeCurrency)}
                        className="rounded-2xl p-4 flex flex-col items-center gap-2 tap transition-all"
                        style={{
                          background: currency === homeCurrency
                            ? 'rgba(124,140,255,0.2)'
                            : 'rgba(255,255,255,0.05)',
                          border: currency === homeCurrency
                            ? '2px solid rgba(124,140,255,0.5)'
                            : '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        <div
                          className="text-2xl font-bold font-display"
                          style={{
                            color: currency === homeCurrency
                              ? ACCENT_FROM_COLOR
                              : 'rgba(255,255,255,0.7)',
                          }}
                        >
                          {homeCurrency}
                        </div>
                        <div className="text-xs text-white/50">Ma devise</div>
                        {currency === homeCurrency && (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: ACCENT_FROM_COLOR }}
                          >
                            <Check size={11} className="text-white" strokeWidth={3} />
                          </div>
                        )}
                      </button>

                      <button
                        onClick={() => setCurrency(tripCurrency)}
                        className="rounded-2xl p-4 flex flex-col items-center gap-2 tap transition-all"
                        style={{
                          background: currency === tripCurrency
                            ? 'rgba(86,197,164,0.2)'
                            : 'rgba(255,255,255,0.05)',
                          border: currency === tripCurrency
                            ? '2px solid rgba(86,197,164,0.5)'
                            : '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        <div
                          className="text-2xl font-bold font-display"
                          style={{
                            color: currency === tripCurrency
                              ? '#56c5a4'
                              : 'rgba(255,255,255,0.7)',
                          }}
                        >
                          {tripCurrency}
                        </div>
                        <div className="text-xs text-white/50">Devise locale</div>
                        {currency === tripCurrency && (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: '#56c5a4' }}
                          >
                            <Check size={11} className="text-white" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div
                      className="rounded-2xl p-4 flex items-center gap-3"
                      style={{
                        background: 'rgba(86,197,164,0.1)',
                        border:     '1px solid rgba(86,197,164,0.25)',
                      }}
                    >
                      <Check size={16} style={{ color: '#56c5a4' }} />
                      <div>
                        <div className="font-semibold" style={{ color: '#56c5a4' }}>
                          {currency}
                        </div>
                        <div className="text-xs text-white/45">
                          Devise locale et personnelle identiques
                        </div>
                      </div>
                    </div>
                  )}

                  <details className="mt-3">
                    <summary className="text-xs text-white/30 cursor-pointer hover:text-white/50 transition px-1 py-1 select-none">
                      Autre devise...
                    </summary>
                    <div className="mt-2 glass rounded-2xl p-2 max-h-48 overflow-y-auto">
                      {CURRENCIES.map((c) => (
                        <button
                          key={c.code}
                          onClick={() => setCurrency(c.code)}
                          className={`w-full text-left px-4 py-2.5 rounded-xl flex items-center justify-between transition ${
                            currency === c.code ? 'bg-white/10' : 'hover:bg-white/5'
                          }`}
                        >
                          <div>
                            <span className="font-semibold mr-2 text-sm">{c.code}</span>
                            <span className="text-xs text-white/45">{c.name}</span>
                          </div>
                          <span className="text-white/35 text-xs">{c.symbol}</span>
                        </button>
                      ))}
                    </div>
                  </details>
                </div>

                {showBothCurrencies && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="mb-4 rounded-2xl p-4"
                    style={{
                      background: 'rgba(86,197,164,0.06)',
                      border:     '1px solid rgba(86,197,164,0.18)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowLeftRight size={13} style={{ color: '#56c5a4' }} />
                      <span className="text-xs font-semibold" style={{ color: '#56c5a4' }}>
                        Taux de change
                      </span>
                      {loadingRate ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                          className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full ml-auto"
                        />
                      ) : liveRateSource === 'live' ? (
                        <div
                          className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                          style={{
                            background: 'rgba(86,197,164,0.15)',
                            border:     '1px solid rgba(86,197,164,0.3)',
                            color:      '#56c5a4',
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#56c5a4] inline-block" />
                          LIVE
                        </div>
                      ) : liveRateSource === 'offline' ? (
                        <div
                          className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-bold"
                          style={{
                            background: 'rgba(240,178,74,0.15)',
                            border:     '1px solid rgba(240,178,74,0.3)',
                            color:      '#f0b24a',
                          }}
                        >
                          ⚡ Indicatif
                        </div>
                      ) : null}
                    </div>

                    {!loadingRate && liveRate !== null && (
                      <>
                        <div className="text-sm font-semibold text-white/80 mb-1">
                          1 {currency}{' '}
                          <span className="text-white/35 font-normal">=</span>{' '}
                          <span style={{ color: '#56c5a4' }}>
                            {liveRate.toFixed(liveRate < 1 ? 4 : 2)}{' '}
                            {currency === homeCurrency ? tripCurrency : homeCurrency}
                          </span>
                        </div>
                        {convertedBudget && budget > 0 && (
                          <div className="text-xs text-white/45">
                            Votre budget ≈{' '}
                            <span className="text-white/70 font-semibold">
                              {convertedBudget}{' '}
                              {currency === homeCurrency ? tripCurrency : homeCurrency}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {!loadingRate && liveRate === null && (
                      <div className="text-xs text-white/35">
                        Taux temporairement indisponible
                      </div>
                    )}
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-start gap-2 text-xs px-3 py-3 rounded-xl"
                  style={{
                    background: 'rgba(124,140,255,0.08)',
                    border:     '1px solid rgba(124,140,255,0.2)',
                    color:      'rgba(165,180,252,0.8)',
                  }}
                >
                  <Sparkles
                    size={12}
                    style={{ color: ACCENT_FROM_COLOR, flexShrink: 0, marginTop: 1 }}
                  />
                  <span>
                    {isRoadtrip && stops.length > 0
                      ? `Photo évocatrice + checklist IA générées pour votre roadtrip en ${picked?.country}`
                      : `Photo évocatrice + checklist IA générées pour ${picked?.country ?? 'votre destination'}`}
                  </span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Navigation bas ── */}
        <div className="fixed bottom-0 left-0 right-0 z-20 backdrop-blur-2xl bg-[rgba(7,7,11,0.85)] border-t border-white/5 pb-safe">
          <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="h-14 px-5 rounded-2xl glass tap flex items-center gap-2 font-medium"
              >
                <ArrowLeft size={18} /> Retour
              </button>
            )}

            {/* ✅ Bouton Continuer étape 1 — CSS variables */}
            {step === 1 && (
              <button
                disabled={!canNext1}
                onClick={() => setStep(2)}
                className="flex-1 h-14 rounded-2xl font-semibold text-white tap disabled:opacity-30 flex items-center justify-center gap-2"
                style={{ background: ACCENT_GRADIENT }}
              >
                Continuer <ArrowRight size={18} />
              </button>
            )}

            {/* ✅ Bouton Continuer étape 2 — CSS variables */}
            {step === 2 && (
              <button
                disabled={!canNext2}
                onClick={() => setStep(3)}
                className="flex-1 h-14 rounded-2xl font-semibold text-white tap disabled:opacity-30 flex items-center justify-center gap-2"
                style={{ background: ACCENT_GRADIENT }}
              >
                Continuer <ArrowRight size={18} />
              </button>
            )}

            {/* ✅ Bouton Continuer étape 3 roadtrip — CSS variables */}
            {step === 3 && isRoadtrip && (
              <button
                disabled={stops.length === 0}
                onClick={() => setStep(4)}
                className="flex-1 h-14 rounded-2xl font-semibold text-white tap disabled:opacity-30 flex items-center justify-center gap-2"
                style={{ background: ACCENT_GRADIENT }}
              >
                {stops.length === 0
                  ? 'Ajoutez une ville'
                  : `Continuer · ${stops.length} ville${stops.length > 1 ? 's' : ''}`}
                {stops.length > 0 && <ArrowRight size={18} />}
              </button>
            )}

            {/* ✅ Bouton Créer — CSS variables */}
            {isBudgetStep && (
              <button
                disabled={!canCreate || isCreating}
                onClick={create}
                className="flex-1 h-14 rounded-2xl font-semibold text-white tap disabled:opacity-30 flex items-center justify-center gap-2"
                style={{ background: ACCENT_GRADIENT }}
              >
                <Sparkles size={18} /> Créer mon carnet
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
};