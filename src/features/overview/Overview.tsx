// src/features/overview/Overview.tsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Cloud, Wallet,
  Lightbulb, ArrowRight, RefreshCw, WifiOff,
  Wind, Droplets, Plus, Check,
  Thermometer, ChevronDown, Map,
  CheckCircle2, ArrowLeftRight, Plane, Home, Navigation,
} from 'lucide-react';
import { useTripContext } from '../cockpit/useTripContext';
import { GlassCard } from '../../shared/GlassCard';
import { BottomSheet } from '../../shared/BottomSheet';
import { fmtMoney } from '../../utils/formatters';
import {
  fetchAssistant,
  clearAssistantCache,
  CAPITAL_COORDS,
  type AssistantResult,
  type AssistantPayload,
} from '../../api/cloud';
import { fetchWeather, type WeatherResult } from '../../api/weather';
import { fetchRate } from '../../api/currency';
import { getCountryMeta } from '../../api/countries';
import { Donut } from '../../shared/Donut';
import { useNavigate } from 'react-router-dom';
import { daysBetween, addDaysISO, tripStatus } from '../../utils/dateHelpers';
import {
  useTripStore,
  type StepPeriod,
  type StepType,
  type TripDestination,
} from '../../store/tripStore';
import { useToast } from '../../shared/Toast';
import { haptic } from '../../utils/haptic';

// ─────────────────────────────────────────────────────────────────────────────
// Spinner inline
// ─────────────────────────────────────────────────────────────────────────────
const Spinner = ({ label }: { label?: string }) => (
  <div className="flex items-center gap-2 py-1">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      className="w-4 h-4 border border-white/20 border-t-white/70 rounded-full flex-shrink-0"
    />
    {label && <span className="text-sm text-white/40">{label}</span>}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// TipCard
// ─────────────────────────────────────────────────────────────────────────────
const TipCard = ({
  tip,
  index,
}: {
  tip: { title: string; body: string };
  index: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.07 }}
    className="rounded-2xl p-4"
    style={{
      background: 'rgba(255,255,255,0.06)',
      border:     '1px solid rgba(255,255,255,0.1)',
    }}
  >
    <div className="font-semibold tracking-tight mb-1">{tip.title}</div>
    <div className="text-sm text-white/65 leading-relaxed">{tip.body}</div>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Parser emoji
// ─────────────────────────────────────────────────────────────────────────────
const parseEmojiFromSuggestion = (suggestion: string): { emoji: string; text: string } => {
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u;
  const match      = suggestion.match(emojiRegex);
  if (match) return { emoji: match[0].trim(), text: suggestion.replace(match[0], '').trim() };
  const t = suggestion.toLowerCase();
  if (t.includes('restaurant') || t.includes('dîner') || t.includes('déjeuner') ||
      t.includes('café') || t.includes('cuisine') || t.includes('ramen') ||
      t.includes('sushi') || t.includes('tapas') || t.includes('gastronomie') ||
      t.includes('dégustation') || t.includes('marché')) return { emoji: '🍽️', text: suggestion };
  if (t.includes('train') || t.includes('bus') || t.includes('métro') ||
      t.includes('avion') || t.includes('taxi') || t.includes('ferry') ||
      t.includes('transport') || t.includes('gare')) return { emoji: '🚆', text: suggestion };
  if (t.includes('hôtel') || t.includes('auberge') || t.includes('logement') ||
      t.includes('airbnb') || t.includes('hostel')) return { emoji: '🏨', text: suggestion };
  if (t.includes('plage') || t.includes('mer') || t.includes('onsen') ||
      t.includes('bain') || t.includes('piscine')) return { emoji: '🏖️', text: suggestion };
  if (t.includes('temple') || t.includes('sanctuaire') || t.includes('église') ||
      t.includes('cathédrale') || t.includes('mosquée')) return { emoji: '🛕', text: suggestion };
  if (t.includes('musée') || t.includes('galerie') || t.includes('palais') ||
      t.includes('exposition')) return { emoji: '🏛️', text: suggestion };
  if (t.includes('montagne') || t.includes('randonnée') || t.includes('forêt') ||
      t.includes('parc naturel') || t.includes('volcan')) return { emoji: '⛰️', text: suggestion };
  if (t.includes('souk') || t.includes('bazar') || t.includes('shopping'))
    return { emoji: '🛒', text: suggestion };
  if (t.includes('coucher de soleil') || t.includes('panorama') || t.includes('belvédère'))
    return { emoji: '🌅', text: suggestion };
  if (t.includes('concert') || t.includes('spectacle') || t.includes('théâtre'))
    return { emoji: '🎭', text: suggestion };
  if (t.includes('château') || t.includes('forteresse') || t.includes('citadelle'))
    return { emoji: '🏯', text: suggestion };
  if (t.includes('massage') || t.includes('spa')) return { emoji: '💆', text: suggestion };
  return { emoji: '🗺️', text: suggestion };
};

// ─────────────────────────────────────────────────────────────────────────────
// Détection type étape
// ─────────────────────────────────────────────────────────────────────────────
const detectStepType = (title: string): StepType => {
  const t = title.toLowerCase();
  if (t.includes('restaurant') || t.includes('dîner') || t.includes('déjeuner') ||
      t.includes('café') || t.includes('gastronomie') || t.includes('ramen') ||
      t.includes('sushi') || t.includes('tapas') || t.includes('cuisine')) return 'food';
  if (t.includes('hôtel') || t.includes('airbnb') || t.includes('auberge') ||
      t.includes('logement') || t.includes('hébergement')) return 'lodging';
  if (t.includes('train') || t.includes('bus') || t.includes('métro') ||
      t.includes('avion') || t.includes('taxi') || t.includes('transport') ||
      t.includes('gare') || t.includes('ferry')) return 'transport';
  return 'sight';
};

// ─────────────────────────────────────────────────────────────────────────────
// Périodes
// ─────────────────────────────────────────────────────────────────────────────
const PERIODS: { key: StepPeriod; label: string; emoji: string; color: string }[] = [
  { key: 'morning',   label: 'Matin',      emoji: '🌅', color: '#56c5a4' },
  { key: 'afternoon', label: 'Après-midi', emoji: '☀️', color: '#f0b24a' },
  { key: 'night',     label: 'Soir',       emoji: '🌙', color: '#7c8cff' },
];

// ─────────────────────────────────────────────────────────────────────────────
// TripCountdownStat
// ─────────────────────────────────────────────────────────────────────────────
const TripCountdownStat = ({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate:   string;
}) => {
  const status = tripStatus(startDate, endDate);
  const now    = new Date(); now.setHours(0, 0, 0, 0);
  const start  = new Date(startDate); start.setHours(0, 0, 0, 0);
  const end    = new Date(endDate);   end.setHours(0, 0, 0, 0);

  if (status === 'upcoming') {
    const daysLeft = Math.round((start.getTime() - now.getTime()) / 86400000);
    return (
      <GlassCard className="p-4 text-center">
        <div className="flex items-center justify-center gap-1 mb-0.5">
          <Plane size={12} style={{ color: '#7c8cff' }} />
          <span
            className="text-2xl font-bold font-display tracking-tighter"
            style={{ color: '#7c8cff' }}
          >
            J-{daysLeft}
          </span>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-white/55 leading-tight">
          avant départ
        </div>
      </GlassCard>
    );
  }

  if (status === 'ongoing') {
    const dayIdx = Math.round((now.getTime() - start.getTime()) / 86400000) + 1;
    const total  = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    return (
      <GlassCard className="p-4 text-center">
        <div className="flex items-center justify-center gap-1 mb-0.5">
          <Navigation size={12} style={{ color: '#56c5a4' }} />
          <span
            className="text-2xl font-bold font-display tracking-tighter"
            style={{ color: '#56c5a4' }}
          >
            {dayIdx}/{total}
          </span>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-white/55 leading-tight">
          en voyage
        </div>
      </GlassCard>
    );
  }

  const daysAgo = Math.round((now.getTime() - end.getTime()) / 86400000);
  return (
    <GlassCard className="p-4 text-center">
      <div className="flex items-center justify-center gap-1 mb-0.5">
        <Home size={12} style={{ color: '#f0b24a' }} />
        <span
          className="text-2xl font-bold font-display tracking-tighter"
          style={{ color: '#f0b24a' }}
        >
          J+{daysAgo}
        </span>
      </div>
      <div className="text-[10px] uppercase tracking-wider text-white/55 leading-tight">
        depuis retour
      </div>
    </GlassCard>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CityAccordion
// ─────────────────────────────────────────────────────────────────────────────
type CityAccordionProps = {
  destination:  TripDestination;
  tripId:       string;
  tripCountry:  string;
  tripBudget:   number;
  tripCurrency: string;
  isOpen:       boolean;
  onToggle:     () => void;
  onAddToTrip:  (title: string, city: string) => void;
};

const CityAccordion = ({
  destination, tripId, tripCountry, tripBudget, tripCurrency,
  isOpen, onToggle, onAddToTrip,
}: CityAccordionProps) => {
  const setAiSuggestions     = useTripStore((s) => s.setAiSuggestions);
  const clearUsedSuggestions = useTripStore((s) => s.clearUsedSuggestions);
  const cacheKey             = `${tripId}_${destination.city}`;
  const aiSuggestionsRaw     = useTripStore((s) => s.aiSuggestions[cacheKey]);
  const usedSuggestionsRaw   = useTripStore((s) => s.usedSuggestions[cacheKey]);
  const aiSuggestions        = aiSuggestionsRaw  ?? [];
  const usedSuggestions      = usedSuggestionsRaw ?? [];

  const [loading,      setLoading]      = useState(false);
  const [loaded,       setLoaded]       = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);

  const cityDays = Math.max(1, daysBetween(destination.fromDate, destination.toDate));

  useEffect(() => {
    if (!isOpen || loaded || aiSuggestions.length > 0) return;
    const load = async () => {
      setLoading(true);
      try {
        const result = await fetchAssistant({
          city:     destination.city,
          country:  tripCountry,
          days:     cityDays,
          budget:   tripBudget,
          currency: tripCurrency,
        });
        if (result.ok && result.stepSuggestions.length > 0) {
          setAiSuggestions(cacheKey, result.stepSuggestions);
          setUsedFallback(false);
        } else {
          setUsedFallback(true);
        }
      } catch {
        setUsedFallback(true);
      } finally {
        setLoading(false);
        setLoaded(true);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleRefresh = async () => {
    haptic([5, 20, 5]);
    clearAssistantCache({ city: destination.city, country: tripCountry });
    clearUsedSuggestions(cacheKey);
    setAiSuggestions(cacheKey, []);
    setLoaded(false);
    setLoading(true);
    try {
      const result = await fetchAssistant({
        city:     destination.city,
        country:  tripCountry,
        days:     cityDays,
        budget:   tripBudget,
        currency: tripCurrency,
      });
      if (result.ok && result.stepSuggestions.length > 0) {
        setAiSuggestions(cacheKey, result.stepSuggestions);
        setUsedFallback(false);
      }
    } catch { /* silencieux */ }
    finally { setLoading(false); setLoaded(true); }
  };

  const availableSuggestions = aiSuggestions.filter((s) => !usedSuggestions.includes(s));

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border:     '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3.5 tap">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(124,140,255,0.15)' }}
        >
          <Map size={14} style={{ color: '#7c8cff' }} />
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-semibold tracking-tight">{destination.city}</div>
          <div className="text-xs text-white/40 mt-0.5">
            J{destination.fromDay}→J{destination.toDay} · {cityDays} jour{cityDays > 1 ? 's' : ''}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
            style={{ background: 'rgba(124,140,255,0.15)', color: '#7c8cff' }}
          >
            IA
          </span>
          {isOpen && (
            <button
              onClick={(e) => { e.stopPropagation(); handleRefresh(); }}
              disabled={loading}
              className="w-7 h-7 rounded-xl flex items-center justify-center tap"
              style={{ background: 'rgba(124,140,255,0.1)' }}
              aria-label="Nouvelles suggestions"
            >
              <motion.div
                animate={loading ? { rotate: 360 } : { rotate: 0 }}
                transition={
                  loading
                    ? { repeat: Infinity, duration: 1, ease: 'linear' }
                    : { duration: 0.3 }
                }
              >
                <RefreshCw size={11} style={{ color: '#7c8cff' }} />
              </motion.div>
            </button>
          )}
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={16} className="text-white/30" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              {loading && (
                <Spinner label={`Suggestions pour ${destination.city}...`} />
              )}
              {!loading && usedFallback && (
                <div
                  className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl"
                  style={{
                    background: 'rgba(240,178,74,0.08)',
                    border:     '1px solid rgba(240,178,74,0.15)',
                    color:      '#f0b24a',
                  }}
                >
                  <WifiOff size={11} /> Suggestions hors-ligne pour {destination.city}
                </div>
              )}
              <AnimatePresence mode="popLayout">
                {availableSuggestions.map((suggestion, i) => {
                  const { emoji, text } = parseEmojiFromSuggestion(suggestion);
                  return (
                    <motion.div
                      key={suggestion}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -16, height: 0 }}
                      transition={{
                        delay:  i * 0.03,
                        layout: { type: 'spring', damping: 26 },
                      }}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border:     '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <span className="text-base flex-shrink-0">{emoji}</span>
                      <span className="flex-1 text-sm font-medium tracking-tight">{text}</span>
                      <button
                        onClick={() => onAddToTrip(suggestion, destination.city)}
                        className="w-7 h-7 rounded-xl flex items-center justify-center tap flex-shrink-0"
                        style={{
                          background: 'rgba(124,140,255,0.2)',
                          border:     '1px solid rgba(124,140,255,0.3)',
                        }}
                        aria-label={`Ajouter ${text} au parcours`}
                      >
                        <Plus size={13} style={{ color: '#7c8cff' }} />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {!loading && availableSuggestions.length === 0 && loaded && (
                <p className="text-xs text-white/30 text-center py-2">
                  Toutes les suggestions ont été ajoutées !
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 🧠 OVERVIEW PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export const Overview = () => {
  const { trip } = useTripContext();
  const navigate  = useNavigate();
  const { success } = useToast();

  // ── Store ────────────────────────────────────────────────────────────────
  const setAiSuggestions     = useTripStore((s) => s.setAiSuggestions);
  const markSuggestionUsed   = useTripStore((s) => s.markSuggestionUsed);
  const clearUsedSuggestions = useTripStore((s) => s.clearUsedSuggestions);
  const addStep              = useTripStore((s) => s.addStep);

  const aiSuggestionsRaw   = useTripStore((s) => s.aiSuggestions[trip.id]);
  const usedSuggestionsRaw = useTripStore((s) => s.usedSuggestions[trip.id]);
  const aiSuggestions      = aiSuggestionsRaw  ?? [];
  const usedSuggestions    = usedSuggestionsRaw ?? [];

  // ── State ─────────────────────────────────────────────────────────────────
  const [aiOpen,        setAiOpen]        = useState(false);
  const [loadingAI,     setLoadingAI]     = useState(false);
  const [usedFallback,  setUsedFallback]  = useState(false);
  const [assistantData, setAssistantData] = useState<AssistantResult | null>(null);

  const [weather,            setWeather]            = useState<WeatherResult | null>(null);
  const [loadingWeather,     setLoadingWeather]     = useState(false);
  const [weatherFromCapital, setWeatherFromCapital] = useState(false);

  // ✅ FIX P4 — rateUpdatedAt supprimé (déclaré mais jamais lu)
  // On garde rate et rateSource qui sont utilisés dans le rendu
  const [rate,        setRate]        = useState<number | null>(null);
  const [rateSource,  setRateSource]  = useState<'live' | 'offline' | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);

  const [addingTitle,    setAddingTitle]    = useState<string | null>(null);
  const [addingCityHint, setAddingCityHint] = useState<string>('');
  const [addDay,         setAddDay]         = useState(1);
  const [addPeriod,      setAddPeriod]      = useState<StepPeriod>('morning');
  const [addPlace,       setAddPlace]       = useState('');
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalChecklist = trip.checklist.length;
  const doneChecklist  = trip.checklist.filter((c) => c.done).length;
  const checkPct       = totalChecklist > 0
    ? Math.round((doneChecklist / totalChecklist) * 100)
    : 0;
  const spent    = trip.expenses.reduce((s, e) => s + e.amount, 0);
  const budgetPct = trip.budget > 0
    ? Math.min(100, Math.round((spent / trip.budget) * 100))
    : 0;
  const days = daysBetween(trip.startDate, trip.endDate);

  const availableSuggestions = aiSuggestions.filter((s) => !usedSuggestions.includes(s));

  const assistantPayload: AssistantPayload = trip.isRoadtrip
    ? { city: trip.country, country: trip.country, days, budget: trip.budget, currency: trip.currency }
    : { city: trip.destination, country: trip.country, days, budget: trip.budget, currency: trip.currency };

  // ✅ FIX P2 — Devise réelle du pays de destination
  const destinationCurrency = getCountryMeta(trip.countryCode)?.currency ?? trip.currency;
  const showRateWidget = trip.homeCurrency !== destinationCurrency;

  // ── Météo ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadWeather = async () => {
      let lat = trip.lat;
      let lon = trip.lon;
      let fromCapital = false;
      if (!lat || !lon) {
        const cap = CAPITAL_COORDS[trip.countryCode];
        if (cap) { lat = cap.lat; lon = cap.lon; fromCapital = true; }
        else return;
      }
      setLoadingWeather(true);
      setWeatherFromCapital(fromCapital);
      const result = await fetchWeather(lat, lon);
      setWeather(result);
      setLoadingWeather(false);
    };
    loadWeather();
  }, [trip.id, trip.lat, trip.lon, trip.countryCode]);

  // ✅ FIX P2 — Taux chargé avec destinationCurrency via Worker (pas direct Frankfurter)
  useEffect(() => {
    if (!showRateWidget) return;
    const loadRate = async () => {
      setLoadingRate(true);
      try {
        const result = await fetchRate(trip.homeCurrency, destinationCurrency);
        setRate(result.rate);
        setRateSource(result.source);
        // ✅ FIX P4 — rateUpdatedAt supprimé car non utilisé dans le rendu
      } finally {
        setLoadingRate(false);
      }
    };
    loadRate();
  }, [trip.id, trip.homeCurrency, destinationCurrency, showRateWidget]);

  // ── Assistant ─────────────────────────────────────────────────────────────
  const loadAssistant = useCallback(async (forceRefresh = false) => {
    setLoadingAI(true);
    setUsedFallback(false);
    try {
      if (forceRefresh) clearAssistantCache(assistantPayload);
      const result = await fetchAssistant(assistantPayload);
      if (result.ok) {
        setAssistantData(result);
        if (!trip.isRoadtrip && result.stepSuggestions.length > 0) {
          const currentLength = aiSuggestionsRaw?.length ?? 0;
          if (currentLength === 0 || forceRefresh) {
            setAiSuggestions(trip.id, result.stepSuggestions);
          }
        }
      } else {
        setAssistantData(null);
        setUsedFallback(true);
      }
    } catch {
      setUsedFallback(true);
    } finally {
      setLoadingAI(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id, trip.destination, trip.country, trip.isRoadtrip, days, trip.budget, trip.currency, aiSuggestionsRaw]);

  useEffect(() => { loadAssistant(false); }, [loadAssistant]);

  const handleRefreshSuggestions = useCallback(() => {
    haptic([5, 20, 5]);
    clearUsedSuggestions(trip.id);
    setAiSuggestions(trip.id, []);
    loadAssistant(true);
  }, [trip.id, clearUsedSuggestions, setAiSuggestions, loadAssistant]);

  const toggleAccordion = useCallback((city: string) => {
    setOpenAccordions((prev) => ({ ...prev, [city]: !prev[city] }));
  }, []);

  const openAddSuggestion = (title: string, cityHint = '') => {
    const { text } = parseEmojiFromSuggestion(title);
    setAddingTitle(text || title);
    setAddingCityHint(cityHint || trip.destination);
    setAddDay(1);
    setAddPeriod('morning');
    setAddPlace(cityHint || trip.destination);
  };

  const handleAddFromRoadtrip = useCallback(
    (title: string, city: string) => { openAddSuggestion(title, city); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trip.destination],
  );

  const confirmAddSuggestion = () => {
    if (!addingTitle) return;
    haptic([5, 20, 5]);
    addStep(trip.id, {
      id:     crypto.randomUUID(),
      day:    addDay,
      period: addPeriod,
      type:   detectStepType(addingTitle),
      title:  addingTitle,
      place:  addPlace.trim() || trip.destination,
      done:   false,
    });
    markSuggestionUsed(trip.id, addingTitle);
    success(
      `✓ ${addingTitle} ajouté — Jour ${addDay} · ${
        PERIODS.find((p) => p.key === addPeriod)?.label
      }`,
    );
    setAddingTitle(null);
    setAddingCityHint('');
  };

  const tipsCount = assistantData?.ok ? assistantData.tips.length : 0;
  const assistantWidgetTitle = trip.isRoadtrip
    ? `Conseils · ${trip.country}`
    : `Conseils · ${trip.destination}`;
  const assistantWidgetSub = loadingAI
    ? 'Consultation IA...'
    : usedFallback
    ? 'Conseils généraux'
    : trip.isRoadtrip
    ? `${tipsCount} astuces pour ${trip.country}`
    : `${tipsCount} astuces locales`;

  const RATE_AMOUNTS = [1, 5, 10, 50];
  const formatRateAmount = (amount: number): string => {
    if (rate === null) return '—';
    const v = amount * rate;
    return v % 1 === 0 ? v.toFixed(0) : v.toFixed(2);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* ── LIGNE 1 : 3 stats ── */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard className="p-4 text-center">
          <div className="text-2xl font-bold font-display">{days}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/55 mt-0.5">Jours</div>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <div className="text-2xl font-bold font-display">{trip.steps.length}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/55 mt-0.5">Étapes</div>
        </GlassCard>
        <TripCountdownStat startDate={trip.startDate} endDate={trip.endDate} />
      </div>

      {/* ── Roadtrip banner ── */}
      {trip.isRoadtrip && trip.destinations && trip.destinations.length > 0 && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Map size={14} style={{ color: '#7c8cff' }} />
            <span className="text-xs uppercase tracking-wider text-white/55">
              Itinéraire Roadtrip
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {trip.destinations.map((dest, i) => (
              <div key={dest.city} className="flex items-center gap-2 flex-shrink-0">
                <div
                  className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap"
                  style={{
                    background: 'rgba(124,140,255,0.15)',
                    border:     '1px solid rgba(124,140,255,0.25)',
                    color:      '#a5b4fc',
                  }}
                >
                  {dest.city}
                  <span className="text-white/30 ml-1">
                    J{dest.fromDay}→{dest.toDay}
                  </span>
                </div>
                {i < trip.destinations!.length - 1 && (
                  <ArrowRight size={12} className="text-white/20 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ── LIGNE 2 : Budget + Checklist ── */}
      <div className="grid grid-cols-2 gap-3">
        <GlassCard
          className="p-4 flex flex-col items-center cursor-pointer"
          onClick={() => navigate(`/trip/${trip.id}/budget`)}
        >
          <div className="flex items-center gap-2 mb-3 w-full">
            <Wallet size={13} style={{ color: '#f0b24a' }} />
            <span className="text-[10px] uppercase tracking-wider text-white/55">Budget</span>
          </div>
          <Donut
            value={spent}
            max={trip.budget}
            size={90}
            stroke={9}
            color={budgetPct > 90 ? '#ef4444' : '#f0b24a'}
            label={`${budgetPct}%`}
          />
          <div className="mt-2 text-center w-full">
            <div className="text-xs font-semibold tracking-tight truncate">
              {fmtMoney(spent, trip.currency)}
            </div>
            <div className="text-[10px] text-white/40 mt-0.5 truncate">
              / {fmtMoney(trip.budget, trip.currency)}
            </div>
          </div>
        </GlassCard>

        <GlassCard
          className="p-4 flex flex-col items-center cursor-pointer"
          onClick={() => navigate(`/trip/${trip.id}/essentials`)}
        >
          <div className="flex items-center gap-2 mb-3 w-full">
            <CheckCircle2 size={13} style={{ color: '#56c5a4' }} />
            <span className="text-[10px] uppercase tracking-wider text-white/55">
              Préparation
            </span>
          </div>
          <Donut
            value={doneChecklist}
            max={totalChecklist || 1}
            size={90}
            stroke={9}
            color="#56c5a4"
            label={`${checkPct}%`}
          />
          <div className="mt-2 text-center w-full">
            <div className="text-xs font-semibold tracking-tight">
              {doneChecklist}/{totalChecklist}
            </div>
            <div className="text-[10px] text-white/40 mt-0.5">prêts</div>
          </div>
        </GlassCard>
      </div>

      {/* ── LIGNE 3 : Météo + Assistant ── */}
      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Cloud size={14} className="text-white/55" />
            <div className="text-xs uppercase tracking-wider text-white/55">Météo</div>
            {!loadingWeather && weather?.ok && (
              <span className="ml-auto text-[9px] font-medium" style={{ color: '#56c5a4' }}>
                LIVE
              </span>
            )}
          </div>
          {loadingWeather && <Spinner label="Chargement..." />}
          {!loadingWeather && weather?.ok && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-4xl mb-1">{weather.icon}</div>
              <div className="text-sm font-semibold tracking-tight leading-tight">
                {weather.label}
              </div>
              <div className="text-2xl font-bold font-display mt-1">{weather.temp}°C</div>
              <div className="flex items-center gap-1 mt-1">
                <Thermometer size={10} className="text-white/35" />
                <span className="text-[10px] text-white/40">
                  Ressenti {weather.feelsLike}°C
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-[10px] text-white/40">
                  <Droplets size={10} /> {weather.humidity}%
                </span>
                <span className="flex items-center gap-1 text-[10px] text-white/40">
                  <Wind size={10} /> {weather.wind} km/h
                </span>
              </div>
              {weatherFromCapital && (
                <div className="mt-2 text-[9px] text-white/25">
                  📍 {CAPITAL_COORDS[trip.countryCode]?.name ?? 'Capitale'}
                </div>
              )}
            </motion.div>
          )}
          {!loadingWeather && (!weather || !weather.ok) && (
            <div>
              <div className="text-3xl mb-1">🌡️</div>
              <div className="text-xs text-white/35 leading-relaxed">
                Météo non disponible
              </div>
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-5 cursor-pointer" onClick={() => setAiOpen(true)}>
          <div className="flex items-center gap-2 mb-2">
            {loadingAI ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-3.5 h-3.5 border border-white/30 border-t-[#7c8cff] rounded-full"
              />
            ) : (
              <Sparkles size={14} style={{ color: '#7c8cff' }} />
            )}
            <div className="text-xs uppercase tracking-wider text-white/55">Assistant</div>
            {usedFallback && !loadingAI && (
              <WifiOff size={11} className="text-white/30 ml-auto" />
            )}
          </div>
          <div className="text-sm font-semibold tracking-tight mb-1">
            {loadingAI ? 'Analyse...' : assistantWidgetTitle}
          </div>
          <div className="text-xs text-white/55 mb-3">{assistantWidgetSub}</div>
          <div
            className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: '#7c8cff' }}
          >
            Ouvrir <ArrowRight size={12} />
          </div>
        </GlassCard>
      </div>

      {/* ── WIDGET TAUX DE CHANGE ── */}
      {showRateWidget && (
        <GlassCard
          className="p-5 cursor-pointer"
          onClick={() => navigate(`/trip/${trip.id}/budget`)}
        >
          <div className="flex items-center gap-2 mb-4">
            <ArrowLeftRight size={14} style={{ color: '#56c5a4' }} />
            <div className="text-xs uppercase tracking-wider text-white/55 flex-1">
              Taux de change
            </div>
            {loadingRate ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full"
              />
            ) : rateSource === 'live' ? (
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                style={{
                  background: 'rgba(86,197,164,0.15)',
                  border:     '1px solid rgba(86,197,164,0.3)',
                  color:      '#56c5a4',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#56c5a4] inline-block" />
                LIVE
              </div>
            ) : rateSource === 'offline' ? (
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                style={{
                  background: 'rgba(240,178,74,0.12)',
                  border:     '1px solid rgba(240,178,74,0.25)',
                  color:      '#f0b24a',
                }}
              >
                ⚡ Indicatif
              </div>
            ) : null}
          </div>

          {!loadingRate && rate !== null && (
            <div
              className="text-sm font-semibold tracking-tight mb-4"
              style={{ color: 'rgba(255,255,255,0.75)' }}
            >
              1 {trip.homeCurrency}{' '}
              <span className="text-white/35 font-normal">=</span>{' '}
              <span style={{ color: '#56c5a4' }}>
                {rate.toFixed(4)} {destinationCurrency}
              </span>
            </div>
          )}
          {loadingRate && <div className="mb-4"><Spinner /></div>}
          {!loadingRate && rate === null && (
            <div className="text-xs text-white/35 mb-4">Taux indisponible</div>
          )}

          {!loadingRate && rate !== null && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {RATE_AMOUNTS.map((amount) => (
                <div
                  key={amount}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border:     '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <span className="text-xs text-white/50 font-medium">
                    {amount} {trip.homeCurrency}
                  </span>
                  <span className="text-xs font-bold" style={{ color: '#56c5a4' }}>
                    {formatRateAmount(amount)} {destinationCurrency}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1 text-xs text-white/30">
            <ArrowLeftRight size={10} />
            <span>Convertisseur complet</span>
            <ArrowRight size={10} className="ml-auto" />
          </div>
        </GlassCard>
      )}

      {/* ── SUGGESTIONS IA — Roadtrip ── */}
      {trip.isRoadtrip && trip.destinations && trip.destinations.length > 0 && (
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={15} style={{ color: '#7c8cff' }} />
            <div className="text-sm font-semibold tracking-tight">Suggestions par ville</div>
            <span
              className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(124,140,255,0.15)', color: '#7c8cff' }}
            >
              IA
            </span>
          </div>
          <div className="space-y-2">
            {trip.destinations.map((dest) => (
              <CityAccordion
                key={dest.city}
                destination={dest}
                tripId={trip.id}
                tripCountry={trip.country}
                tripBudget={trip.budget}
                tripCurrency={trip.currency}
                isOpen={openAccordions[dest.city] ?? false}
                onToggle={() => toggleAccordion(dest.city)}
                onAddToTrip={handleAddFromRoadtrip}
              />
            ))}
          </div>
        </GlassCard>
      )}

      {/* ── SUGGESTIONS IA — Voyage simple ── */}
      {!trip.isRoadtrip && (availableSuggestions.length > 0 || loadingAI) && (
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={15} style={{ color: '#7c8cff' }} />
            <div className="text-sm font-semibold tracking-tight">
              Suggestions · {trip.destination}
            </div>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(124,140,255,0.15)', color: '#7c8cff' }}
            >
              IA
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); handleRefreshSuggestions(); }}
              disabled={loadingAI}
              className="ml-auto w-8 h-8 rounded-xl flex items-center justify-center tap disabled:opacity-40"
              style={{
                background: 'rgba(124,140,255,0.12)',
                border:     '1px solid rgba(124,140,255,0.25)',
              }}
              aria-label="Nouvelles suggestions"
            >
              <motion.div
                animate={loadingAI ? { rotate: 360 } : { rotate: 0 }}
                transition={
                  loadingAI
                    ? { repeat: Infinity, duration: 1, ease: 'linear' }
                    : { duration: 0.3 }
                }
              >
                <RefreshCw size={13} style={{ color: '#7c8cff' }} />
              </motion.div>
            </button>
          </div>

          {loadingAI && availableSuggestions.length === 0 && (
            <Spinner label="Génération des suggestions..." />
          )}
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {availableSuggestions.map((suggestion, i) => {
                const { emoji, text } = parseEmojiFromSuggestion(suggestion);
                return (
                  <motion.div
                    key={suggestion}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    transition={{
                      delay:  i * 0.04,
                      layout: { type: 'spring', damping: 26 },
                    }}
                    className="flex items-center gap-3 p-3 rounded-2xl"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border:     '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <span className="text-lg flex-shrink-0">{emoji}</span>
                    <span className="flex-1 text-sm font-medium tracking-tight">{text}</span>
                    <button
                      onClick={() => openAddSuggestion(suggestion)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center tap flex-shrink-0"
                      style={{
                        background: 'rgba(124,140,255,0.2)',
                        border:     '1px solid rgba(124,140,255,0.3)',
                      }}
                      aria-label={`Ajouter ${text} au parcours`}
                    >
                      <Plus size={14} style={{ color: '#7c8cff' }} />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </GlassCard>
      )}

      {/* ── BottomSheet Assistant ── */}
      <BottomSheet
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        title={`Assistant · ${trip.isRoadtrip ? trip.country : trip.destination}`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-white/55">
            <Lightbulb size={14} style={{ color: '#7c8cff' }} />
            {usedFallback
              ? 'Conseils généraux (hors-ligne)'
              : trip.isRoadtrip
              ? `Astuces pour votre roadtrip en ${trip.country}`
              : 'Astuces locales par votre assistant IA'}
          </div>
          {usedFallback && !loadingAI && (
            <button
              onClick={(e) => { e.stopPropagation(); loadAssistant(true); }}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(124,140,255,0.15)',
                color:      '#7c8cff',
                border:     '1px solid rgba(124,140,255,0.3)',
              }}
            >
              <RefreshCw size={11} /> Réessayer
            </button>
          )}
        </div>

        {usedFallback && !loadingAI && (
          <div
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl mb-4"
            style={{
              background: 'rgba(240,178,74,0.1)',
              border:     '1px solid rgba(240,178,74,0.2)',
              color:      '#f0b24a',
            }}
          >
            <WifiOff size={12} /> Assistant IA temporairement indisponible.
          </div>
        )}

        <AnimatePresence mode="wait">
          {loadingAI ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-8 gap-3"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full"
              />
              <p className="text-sm text-white/50">
                Préparation de vos conseils pour{' '}
                {trip.isRoadtrip ? trip.country : trip.destination}...
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="tips"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              {assistantData?.ok &&
                assistantData.tips.map((tip, i) => (
                  <TipCard key={i} tip={tip} index={i} />
                ))}
            </motion.div>
          )}
        </AnimatePresence>
      </BottomSheet>

      {/* ── BottomSheet Ajouter suggestion ── */}
      <BottomSheet
        open={!!addingTitle}
        onClose={() => setAddingTitle(null)}
        title="Ajouter au parcours"
      >
        {addingTitle && (
          <div className="space-y-5">
            <div
              className="flex items-center gap-3 p-4 rounded-2xl"
              style={{
                background: 'rgba(124,140,255,0.1)',
                border:     '1px solid rgba(124,140,255,0.2)',
              }}
            >
              <span className="text-2xl">
                {parseEmojiFromSuggestion(addingTitle).emoji}
              </span>
              <div>
                <span className="font-semibold tracking-tight block">{addingTitle}</span>
                {addingCityHint && addingCityHint !== trip.destination && (
                  <span className="text-xs text-white/40 mt-0.5 block">
                    📍 {addingCityHint}
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">
                📅 Quel jour ?
              </div>
              <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
                {Array.from({ length: days }, (_, i) => i + 1).map((d) => {
                  const dateISO = addDaysISO(trip.startDate, d - 1);
                  const active  = addDay === d;
                  return (
                    <button
                      key={d}
                      onClick={() => setAddDay(d)}
                      className="flex-shrink-0 rounded-2xl px-3 py-2.5 tap min-w-[56px] text-center transition"
                      style={{
                        background: active
                          ? 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)'
                          : 'rgba(255,255,255,0.06)',
                        border: active ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      <div className="text-[10px] uppercase tracking-wider opacity-75">J{d}</div>
                      <div className="text-sm font-bold font-display">
                        {new Date(dateISO).getDate()}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">
                🕐 Quel moment ?
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PERIODS.map((p) => {
                  const active = addPeriod === p.key;
                  return (
                    <button
                      key={p.key}
                      onClick={() => setAddPeriod(p.key)}
                      className="rounded-2xl p-3 flex flex-col items-center gap-1.5 tap transition"
                      style={{
                        background: active ? `${p.color}25` : 'rgba(255,255,255,0.05)',
                        border: active
                          ? `1px solid ${p.color}60`
                          : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <span className="text-xl">{p.emoji}</span>
                      <span
                        className="text-xs font-semibold"
                        style={{
                          color: active ? p.color : 'rgba(255,255,255,0.6)',
                        }}
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

            <div>
              <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">
                📍 Lieu
              </div>
              <input
                value={addPlace}
                onChange={(e) => setAddPlace(e.target.value)}
                placeholder={addingCityHint || trip.destination}
                className="w-full glass rounded-xl px-4 py-3 bg-transparent outline-none font-medium text-sm"
              />
            </div>

            <button
              onClick={confirmAddSuggestion}
              className="w-full h-12 rounded-2xl font-semibold text-white tap flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)',
              }}
            >
              <Check size={16} /> Ajouter au parcours
            </button>
          </div>
        )}
      </BottomSheet>
    </motion.div>
  );
};