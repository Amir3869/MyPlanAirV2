// src/api/cloud.ts
import { getCountryNameEn } from './countries';

const env = (import.meta as any).env as Record<string, string | undefined>;
const API_BASE = (
  env.VITE_MYTRIP_API_BASE ?? 'https://mytrip-api.amirsfr38.workers.dev'
).replace(/\/$/, '');

// ─────────────────────────────────────────────────────────────────────────────
// 📸 PHOTO
// ─────────────────────────────────────────────────────────────────────────────
export type PhotoResult =
  | {
      ok: true;
      photoUrl: string;
      query: string;
      credit?: { name?: string; username?: string; link?: string };
    }
  | { ok: false; photoUrl: null; reason?: string };

export const fetchTripPhoto = async (params: {
  city?: string;
  country?: string;
  countryCode?: string;
  capital?: string;
}): Promise<PhotoResult> => {
  try {
    const url = new URL(API_BASE + '/photo');

    const countryEn = params.countryCode
      ? getCountryNameEn(params.countryCode)
      : (params.country ?? '');

    const capitalEn = params.capital ?? '';

    if (params.city)  url.searchParams.set('city', params.city);
    if (countryEn)    url.searchParams.set('country', countryEn);
    if (capitalEn)    url.searchParams.set('capital', capitalEn);

    const res = await fetch(url.toString());
    if (!res.ok) return { ok: false, photoUrl: null, reason: `http_${res.status}` };
    return res.json() as Promise<PhotoResult>;
  } catch (err) {
    console.error('[fetchTripPhoto] Error:', err);
    return { ok: false, photoUrl: null, reason: 'network_error' };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🤖 ASSISTANT — Types (inchangés)
// ─────────────────────────────────────────────────────────────────────────────
export type AssistantPayload = {
  city: string;
  country: string;
  days?: number | null;
  budget?: number | null;
  currency?: string;
  style?: string;
  homeCurrency?: string;
};

export type AssistantResult =
  | {
      ok: true;
      checklist: string[];
      tips: { title: string; body: string }[];
      stepSuggestions: string[];
    }
  | { ok: false; error: string; status?: number; details?: string };

// ─────────────────────────────────────────────────────────────────────────────
// 💬 CHAT ARIA — Types
// Séparé de AssistantResult — endpoint dédié /chat
// ─────────────────────────────────────────────────────────────────────────────
export type ChatPayload = {
  question:     string;
  destination:  string;
  country:      string;
  days:         number;
  budget:       number;
  currency:     string;
  isRoadtrip:   boolean;
  destinations: Array<{ city: string; countryCode: string }>;
  history:      Array<{ role: 'user' | 'assistant'; content: string }>;
};

export type ChatResult =
  | { ok: true;  answer: string; source: 'groq' | 'mistral'; model: string }
  | { ok: false; error: string;  answer: null };

// ─────────────────────────────────────────────────────────────────────────────
// 💬 FETCH CHAT — Appel /chat avec fallback offline
// Cache séparé du cache assistant — clé = tripId + question (hash simple)
// ─────────────────────────────────────────────────────────────────────────────
const chatCache = new Map<string, string>();

const makeChatCacheKey = (tripId: string, question: string): string =>
  `${tripId}|${question.trim().toLowerCase().slice(0, 80)}`;

export const fetchChat = async (
  payload: ChatPayload,
  tripId: string,
): Promise<ChatResult> => {
  const cacheKey = makeChatCacheKey(tripId, payload.question);

  // Pas de cache pour le chat — chaque réponse doit être fraîche
  // Le cache est uniquement utilisé si offline (réseau indisponible)
  // pour retourner la dernière réponse connue sur la même question
  const cachedAnswer = chatCache.get(cacheKey);

  try {
    const res = await fetch(API_BASE + '/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      console.warn(`⚠️ [fetchChat] HTTP ${res.status}`);
      // Si on a une réponse en cache pour cette question → fallback
      if (cachedAnswer) {
        return { ok: true, answer: cachedAnswer, source: 'groq', model: 'cached' };
      }
      return {
        ok:     false,
        error:  `http_${res.status}`,
        answer: null,
      };
    }

    const data: ChatResult = await res.json();

    if (data.ok && data.answer) {
      // Mise en cache de la réponse pour usage offline
      chatCache.set(cacheKey, data.answer);
    }

    return data;

  } catch (err) {
    console.warn('⚠️ [fetchChat] Network error:', err);
    // Offline → réponse cachée si disponible
    if (cachedAnswer) {
      return { ok: true, answer: cachedAnswer, source: 'groq', model: 'cached' };
    }
    return {
      ok:     false,
      error:  'network_error',
      answer: null,
    };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🗑️ VIDER LE CACHE CHAT
// ─────────────────────────────────────────────────────────────────────────────
export const clearChatCache = (tripId?: string): void => {
  if (tripId) {
    // Supprime toutes les entrées du tripId donné
    for (const key of chatCache.keys()) {
      if (key.startsWith(`${tripId}|`)) {
        chatCache.delete(key);
      }
    }
    console.log('🗑️ [fetchChat] Cache vidé pour tripId:', tripId);
  } else {
    chatCache.clear();
    console.log('🗑️ [fetchChat] Cache entièrement vidé');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🌍 COORDONNÉES CAPITALES — Inchangé
// ─────────────────────────────────────────────────────────────────────────────
export const CAPITAL_COORDS: Record<string, { lat: number; lon: number; name: string }> = {
  AF: { lat: 34.5281, lon: 69.1723,  name: 'Kaboul' },
  DZ: { lat: 36.7372, lon: 3.0865,   name: 'Alger' },
  AR: { lat: -34.6037,lon: -58.3816, name: 'Buenos Aires' },
  AU: { lat: -35.2809,lon: 149.1300, name: 'Canberra' },
  AT: { lat: 48.2082, lon: 16.3738,  name: 'Vienne' },
  BE: { lat: 50.8503, lon: 4.3517,   name: 'Bruxelles' },
  BR: { lat: -15.7801,lon: -47.9292, name: 'Brasilia' },
  CA: { lat: 45.4215, lon: -75.6972, name: 'Ottawa' },
  CL: { lat: -33.4489,lon: -70.6693, name: 'Santiago' },
  CN: { lat: 39.9042, lon: 116.4074, name: 'Pékin' },
  CO: { lat: 4.7110,  lon: -74.0721, name: 'Bogotá' },
  HR: { lat: 45.8150, lon: 15.9819,  name: 'Zagreb' },
  CZ: { lat: 50.0755, lon: 14.4378,  name: 'Prague' },
  DK: { lat: 55.6761, lon: 12.5683,  name: 'Copenhague' },
  EG: { lat: 30.0444, lon: 31.2357,  name: 'Le Caire' },
  FI: { lat: 60.1699, lon: 24.9384,  name: 'Helsinki' },
  FR: { lat: 48.8566, lon: 2.3522,   name: 'Paris' },
  DE: { lat: 52.5200, lon: 13.4050,  name: 'Berlin' },
  GR: { lat: 37.9838, lon: 23.7275,  name: 'Athènes' },
  HU: { lat: 47.4979, lon: 19.0402,  name: 'Budapest' },
  IN: { lat: 28.6139, lon: 77.2090,  name: 'New Delhi' },
  ID: { lat: -6.2088, lon: 106.8456, name: 'Jakarta' },
  IR: { lat: 35.6892, lon: 51.3890,  name: 'Téhéran' },
  IE: { lat: 53.3498, lon: -6.2603,  name: 'Dublin' },
  IL: { lat: 31.7683, lon: 35.2137,  name: 'Jérusalem' },
  IT: { lat: 41.9028, lon: 12.4964,  name: 'Rome' },
  JP: { lat: 35.6762, lon: 139.6503, name: 'Tokyo' },
  KE: { lat: -1.2921, lon: 36.8219,  name: 'Nairobi' },
  KR: { lat: 37.5665, lon: 126.9780, name: 'Séoul' },
  MX: { lat: 19.4326, lon: -99.1332, name: 'Mexico' },
  MA: { lat: 33.9716, lon: -6.8498,  name: 'Rabat' },
  NL: { lat: 52.3676, lon: 4.9041,   name: 'Amsterdam' },
  NZ: { lat: -41.2865,lon: 174.7762, name: 'Wellington' },
  NG: { lat: 9.0765,  lon: 7.3986,   name: 'Abuja' },
  NO: { lat: 59.9139, lon: 10.7522,  name: 'Oslo' },
  PK: { lat: 33.6844, lon: 73.0479,  name: 'Islamabad' },
  PE: { lat: -12.0464,lon: -77.0428, name: 'Lima' },
  PH: { lat: 14.5995, lon: 120.9842, name: 'Manille' },
  PL: { lat: 52.2297, lon: 21.0122,  name: 'Varsovie' },
  PT: { lat: 38.7223, lon: -9.1393,  name: 'Lisbonne' },
  RO: { lat: 44.4268, lon: 26.1025,  name: 'Bucarest' },
  RU: { lat: 55.7558, lon: 37.6173,  name: 'Moscou' },
  SA: { lat: 24.7136, lon: 46.6753,  name: 'Riyad' },
  ZA: { lat: -25.7461,lon: 28.1881,  name: 'Pretoria' },
  ES: { lat: 40.4168, lon: -3.7038,  name: 'Madrid' },
  SE: { lat: 59.3293, lon: 18.0686,  name: 'Stockholm' },
  CH: { lat: 46.9480, lon: 7.4474,   name: 'Berne' },
  TH: { lat: 13.7563, lon: 100.5018, name: 'Bangkok' },
  TR: { lat: 39.9334, lon: 32.8597,  name: 'Ankara' },
  UA: { lat: 50.4501, lon: 30.5234,  name: 'Kyiv' },
  AE: { lat: 24.4539, lon: 54.3773,  name: 'Abu Dhabi' },
  GB: { lat: 51.5074, lon: -0.1278,  name: 'Londres' },
  US: { lat: 38.9072, lon: -77.0369, name: 'Washington' },
  VN: { lat: 21.0285, lon: 105.8542, name: 'Hanoï' },
  GE: { lat: 41.6938, lon: 44.8015,  name: 'Tbilissi' },
  IS: { lat: 64.1355, lon: -21.8954, name: 'Reykjavik' },
  HR2:{ lat: 43.5081, lon: 16.4402,  name: 'Split' },
  TN: { lat: 36.8190, lon: 10.1658,  name: 'Tunis' },
  SN: { lat: 14.6928, lon: -17.4467, name: 'Dakar' },
  CI: { lat: 5.3600,  lon: -4.0083,  name: 'Abidjan' },
  CM: { lat: 3.8480,  lon: 11.5021,  name: 'Yaoundé' },
  CU: { lat: 23.1136, lon: -82.3666, name: 'La Havane' },
  KZ: { lat: 51.1811, lon: 71.4460,  name: 'Astana' },
  UZ: { lat: 41.2995, lon: 69.2401,  name: 'Tachkent' },
  MM: { lat: 16.8661, lon: 96.1951,  name: 'Naypyidaw' },
  KH: { lat: 11.5564, lon: 104.9282, name: 'Phnom Penh' },
  LK: { lat: 6.9271,  lon: 79.8612,  name: 'Colombo' },
  NP: { lat: 27.7172, lon: 85.3240,  name: 'Katmandou' },
  BD: { lat: 23.8103, lon: 90.4125,  name: 'Dhaka' },
  ET: { lat: 9.0054,  lon: 38.7636,  name: 'Addis-Abeba' },
  TZ: { lat: -6.1630, lon: 35.7516,  name: 'Dodoma' },
  GH: { lat: 5.6037,  lon: -0.1870,  name: 'Accra' },
  MX2:{ lat: 20.9674, lon: -89.5926, name: 'Mérida' },
  EC: { lat: -0.1807, lon: -78.4678, name: 'Quito' },
  BO: { lat: -16.5000,lon: -68.1500, name: 'La Paz' },
  PY: { lat: -25.2867,lon: -57.6470, name: 'Asunción' },
  UY: { lat: -34.9011,lon: -56.1915, name: 'Montevideo' },
  VE: { lat: 10.4806, lon: -66.9036, name: 'Caracas' },
  CR: { lat: 9.9281,  lon: -84.0907, name: 'San José' },
  PA: { lat: 8.9936,  lon: -79.5197, name: 'Panama' },
  DO: { lat: 18.4861, lon: -69.9312, name: 'Saint-Domingue' },
  JM: { lat: 17.9970, lon: -76.7936, name: 'Kingston' },
  HK: { lat: 22.3193, lon: 114.1694, name: 'Hong Kong' },
  SG: { lat: 1.3521,  lon: 103.8198, name: 'Singapour' },
  MY: { lat: 3.1390,  lon: 101.6869, name: 'Kuala Lumpur' },
};

// ─────────────────────────────────────────────────────────────────────────────
// 🛡️ FALLBACK LOCAL ENRICHI — Inchangé
// ─────────────────────────────────────────────────────────────────────────────
const COUNTRY_STEPS: Record<string, string[]> = {
  Japon: [
    '⛩️ Visite d\'un sanctuaire shinto',
    '♨️ Expérience onsen (bain thermal)',
    '🍶 Soirée izakaya authentique',
    '🐟 Marché aux poissons Tsukiji',
    '🌃 Exploration quartier Shibuya',
    '🍵 Cérémonie du thé traditionnelle',
    '🏯 Visite d\'un château historique',
    '🌸 Promenade dans un parc fleuri',
  ],
  France: [
    '🥖 Marché de producteurs local',
    '☕ Café terrasse parisien',
    '🎨 Visite d\'un musée d\'art',
    '🌿 Promenade dans les jardins',
    '🍷 Déjeuner dans un bistrot',
    '🗼 Monument emblématique',
    '🧀 Dégustation fromagerie locale',
    '🚴 Balade à vélo en ville',
  ],
  Italie: [
    '🍹 Aperitivo en terrasse',
    '🍝 Trattoria de quartier',
    '⛪ Visite d\'une église baroque',
    '🍦 Promenade gelato',
    '🏛️ Place historique au coucher du soleil',
    '🛶 Balade en gondole ou bateau',
    '🍕 Cours de cuisine locale',
    '🖼️ Musée d\'art renaissance',
  ],
  Espagne: [
    '🌅 Coucher de soleil sur la plage',
    '🥘 Dégustation tapas locales',
    '💃 Spectacle flamenco',
    '🏟️ Visite monument emblématique',
    '🌃 Soirée dans le quartier historique',
    '🍷 Cave à vin locale',
    '🚂 Excursion village voisin',
    '🏖️ Journée plage méditerranée',
  ],
  'États-Unis': [
    '🗽 Monument emblématique local',
    '🍔 Diner américain authentique',
    '🚗 Road trip panoramique',
    '🎵 Concert ou show live',
    '🏙️ Rooftop bar avec vue',
    '🛍️ Marché farmers market',
    '🎡 Quartier artistique local',
    '🌉 Balade waterfront',
  ],
  Thaïlande: [
    '💆 Massage thaï traditionnel',
    '🌃 Marché de nuit local',
    '🛕 Temple bouddhiste',
    '👨‍🍳 Cours de cuisine thaï',
    '🌅 Coucher de soleil sur la plage',
    '🚤 Excursion en bateau longtail',
    '🥭 Dégustation fruits tropicaux',
    '🐘 Sanctuaire éléphants éthique',
  ],
  Maroc: [
    '🏺 Balade dans la médina',
    '🛒 Souk des épices',
    '🍵 Thé à la menthe en terrasse',
    '🐪 Excursion désert ou dunes',
    '🔨 Atelier artisanat local',
    '🌅 Coucher de soleil depuis remparts',
    '🍲 Dîner tajine en riad',
    '🏰 Palais historique',
  ],
  'Royaume-Uni': [
    '🍺 Pub traditionnel local',
    '🎭 Spectacle théâtre ou comédie',
    '🏰 Château ou palais historique',
    '🌿 Promenade parc royal',
    '🎨 Galerie d\'art gratuite',
    '🚇 Exploration quartiers tendance',
    '🐟 Fish & chips authentique',
    '🏛️ Musée national',
  ],
  Allemagne: [
    '🍺 Biergarten local',
    '🏰 Château romantique',
    '🌲 Randonnée forêt noire',
    '🎡 Marché local ou festival',
    '🚲 Balade vélo en ville',
    '🏛️ Musée d\'histoire',
    '🥨 Petit-déjeuner bavarois',
    '⛪ Cathédrale gothique',
  ],
  Portugal: [
    '🎵 Concert Fado authentique',
    '🍷 Dégustation vins Douro',
    '🚃 Balade en tram historique',
    '🐟 Sardines grillées au port',
    '🏰 Château mauresque',
    '🌊 Plage Atlantique',
    '🎨 Quartier azulejos',
    '☕ Pastel de nata en boulangerie',
  ],
  Grèce: [
    '🏛️ Site archéologique antique',
    '🌅 Coucher de soleil sur la mer Égée',
    '🐙 Mezze au bord de l\'eau',
    '⛵ Excursion île voisine',
    '🫒 Dégustation huile d\'olive locale',
    '🏖️ Plage aux eaux cristallines',
    '⛪ Monastère orthodoxe',
    '🍷 Vin local en terrasse',
  ],
};

const COUNTRY_TIPS: Record<string, { title: string; body: string }[]> = {
  Japon: [
    { title: '🍣 Étiquette à table', body: 'Ne plantez jamais vos baguettes verticalement dans le riz. Slurper les nouilles est un compliment du chef.' },
    { title: '🚇 JR Pass', body: 'Achetez le JR Pass avant de partir depuis la France — il n\'est pas vendu au Japon. Prenez aussi une carte Suica pour les métros.' },
    { title: '💴 Cash uniquement', body: 'Beaucoup de petits restaurants n\'acceptent que les espèces. Retirez aux ATM des 7-Eleven, les seuls fiables pour cartes étrangères.' },
    { title: '🙇 Respect', body: 'Ne mangez pas en marchant dans la rue. Baissez la voix dans les transports. Les pourboires sont considérés insultants.' },
    { title: '📱 Pocket WiFi', body: 'Louez un Pocket WiFi à l\'aéroport (9€/jour). Indispensable — les eSIM étrangères fonctionnent mal sur certains réseaux.' },
  ],
  France: [
    { title: '🥖 Horaires repas', body: 'Le déjeuner est servi entre 12h et 14h strictement. Le dîner après 19h30. Hors de ces créneaux, seuls les touristes sont servis.' },
    { title: '🚄 TGV malin', body: 'Les billets non-échangeables sont 50% moins chers. Réservez sur Ouigo ou SNCF Connect 3 mois à l\'avance pour les meilleurs tarifs.' },
    { title: '💳 Paiement', body: 'Les marchés et petits bistrots acceptent peu la carte. Gardez toujours 30-50€ en espèces.' },
    { title: '🗣️ Politesse', body: 'Dites toujours "Bonjour" en entrant dans un commerce. L\'absence de salutation est perçue comme de la grossièreté.' },
    { title: '🏛️ Musées gratuits', body: 'Les musées nationaux (Louvre, Orsay...) sont gratuits le premier dimanche du mois et pour les moins de 26 ans UE.' },
  ],
  Italie: [
    { title: '☕ Code café', body: 'Un cappuccino après 11h est un impair culturel. Commandez un espresso après repas, jamais un "café au lait".' },
    { title: '🍝 Coperto', body: 'Le "coperto" (couvert) de 2-4€/personne est légal et obligatoire. En revanche, le pourboire n\'est pas attendu.' },
    { title: '🏛️ Files d\'attente', body: 'Réservez le Colisée, la Chapelle Sixtine et les Offices MINIMUM 3 semaines à l\'avance en ligne. Les files durent 3h sans réservation.' },
    { title: '🚌 Transport urbain', body: 'Achetez vos tickets de bus/tram AVANT de monter (tabac, distributeur). Contrôles fréquents, amendes élevées.' },
    { title: '👗 Dress code', body: 'Épaules et genoux couverts obligatoires dans toutes les églises. Gardez un foulard dans votre sac.' },
  ],
  Thaïlande: [
    { title: '🙏 Le Wai', body: 'Salut mains jointes, tête baissée. Ne touchez jamais la tête d\'une personne — c\'est sacré. Ne pointez pas les pieds vers un Bouddha.' },
    { title: '🌶️ Commander épicé', body: 'Dites "mai phet" (pas épicé) ou "phet nit noi" (un peu épicé). Sans précision, les plats sont souvent imbuvables pour les européens.' },
    { title: '👑 Respect monarchie', body: 'Toute critique de la famille royale est un crime passible de prison. Évitez absolument ces sujets.' },
    { title: '💊 Santé', body: 'Anti-moustiques DEET 30%+ obligatoire le soir. Eau en bouteille uniquement, même pour se brosser les dents dans les zones rurales.' },
    { title: '💵 Négociation', body: 'Négociez au marché et pour les tuk-tuks (divisez par 3 le prix annoncé). Jamais dans les magasins avec prix affichés.' },
  ],
  Maroc: [
    { title: '🧭 Médina', body: 'Engagez un guide officiel pour votre première médina — impossible à apprivoiser seul. Évitez les "guides" non officiels qui vous demanderont commission.' },
    { title: '💰 Négociation', body: 'Au souk, le prix annoncé est x3-5 le prix réel. Négociez fermement mais souriez toujours. Partir est la meilleure négociation.' },
    { title: '🌡️ Chaleur', body: 'Evitez de marcher entre 12h et 16h en été. Portez des vêtements couvrants légers — respect culturel ET protection solaire.' },
    { title: '🍽️ Manger local', body: 'Mangez dans les restaurants fréquentés par les locaux, jamais face aux places touristiques. Budget : 5-8€ pour un repas complet.' },
    { title: '📸 Photos', body: 'Demandez toujours avant de photographier des personnes. Certains demandent un dirham symbolique — c\'est normal.' },
  ],
};

const GENERIC_STEPS = [
  '🗺️ Découverte du centre historique',
  '🍽️ Dégustation gastronomie locale',
  '🏛️ Visite monument emblématique',
  '🌅 Coucher de soleil panoramique',
  '🛒 Marché local authentique',
  '🚶 Balade dans les quartiers typiques',
  '📸 Spot photo incontournable',
  '☕ Café local en terrasse',
];

const GENERIC_TIPS = [
  { title: '🛡️ Sécurité documents', body: 'Photographiez votre passeport et envoyez-le à un proche. Stockez une copie dans le cloud (Google Drive, iCloud).' },
  { title: '🔌 Connectivité', body: 'Une eSIM (Airalo, Holafly) est souvent plus rentable que le roaming. Configurez-la avant le départ.' },
  { title: '💳 Banque malin', body: 'Les cartes Revolut et Wise sont sans frais à l\'étranger. Prévenez votre banque habituelle du voyage pour éviter le blocage.' },
  { title: '📱 Apps indispensables', body: 'Téléchargez Maps.me en mode hors-ligne avant le départ. Google Translate en mode photo fonctionne sans internet.' },
  { title: '💊 Santé basique', body: 'Emportez : anti-douleurs, anti-diarrhéiques, désinfectant, pansements. Vérifiez les vaccins recommandés sur le site du MAE français.' },
];

export function buildFallback(p: AssistantPayload): AssistantResult {
  const countryKey = Object.keys(COUNTRY_STEPS).find(
    (k) => k.toLowerCase() === p.country.toLowerCase()
  ) ?? Object.keys(COUNTRY_STEPS).find(
    (k) => p.country.toLowerCase().includes(k.toLowerCase())
  );

  const steps = countryKey ? COUNTRY_STEPS[countryKey] : GENERIC_STEPS.map((s) => s);

  const tipsKey = Object.keys(COUNTRY_TIPS).find(
    (k) => k.toLowerCase() === p.country.toLowerCase()
  ) ?? Object.keys(COUNTRY_TIPS).find(
    (k) => p.country.toLowerCase().includes(k.toLowerCase())
  );

  const tips = tipsKey
    ? COUNTRY_TIPS[tipsKey]
    : [
        { title: '📋 Documents essentiels', body: `Scannez tous vos documents et envoyez-les par email avant de partir pour ${p.city}.` },
        { title: '💰 Budget malin',          body: `Prévoyez 20% de marge sur votre budget pour les imprévus à ${p.city}.` },
        ...GENERIC_TIPS.slice(0, 3),
      ];

  const COUNTRY_CHECKLIST: Record<string, string[]> = {
    Japon: [
      'Passeport valide 6 mois minimum',
      'JR Pass (à acheter avant départ)',
      'Yens en espèces (min 500¥/jour)',
      'Adaptateur prise Type A',
      'Pocket WiFi réservé',
      'Vaccins à jour vérifiés',
      'Assurance voyage',
      'Carte Suica chargée',
    ],
    'États-Unis': [
      'ESTA (e-visa) approuvé',
      'Passeport valide 6 mois minimum',
      'Carte SIM US ou eSIM',
      'Adaptateur prise Type A/B',
      'Assurance santé internationale',
      'Réservations voiture confirmées',
      'Carte bancaire internationale',
      'Billets avion imprimés',
    ],
    Thaïlande: [
      'Vaccin hépatite A conseillé',
      'Anti-moustiques DEET 30%+',
      'Visa électronique (si requis)',
      'Passeport valide 6 mois minimum',
      'Assurance rapatriement',
      'Vêtements couvrants (temples)',
      'Médicaments anti-diarrhéiques',
      'Crème solaire SPF 50+',
    ],
    Maroc: [
      'Vêtements couvrants légers',
      'Crème solaire haute protection',
      'Passeport ou CNI française',
      'Dirhams en espèces (pas partout carte)',
      'Assurance voyage',
      'Médicaments intestinaux',
      'Adaptateur prise (Type C/E)',
      'Numéros urgence notés',
    ],
    Indonésie: [
      'Visa à l\'arrivée (VOA) ou e-VOA',
      'Anti-moustiques DEET',
      'Crème solaire',
      'Passeport valide 6 mois',
      'Vaccins fièvre typhoïde conseillés',
      'Assurance rapatriement',
      'Roupies indonésiennes en espèces',
      'Vêtements couvrants (temples)',
    ],
  };

  const checklistKey = Object.keys(COUNTRY_CHECKLIST).find(
    (k) => k.toLowerCase() === p.country.toLowerCase()
  );

  const checklist = checklistKey
    ? COUNTRY_CHECKLIST[checklistKey]
    : [
        'Passeport ou carte d\'identité valide',
        'Billets d\'avion / train confirmés',
        'Réservations hôtel imprimées',
        'Assurance voyage souscrite',
        'Devises locales en espèces',
        'Chargeur et adaptateur prise',
        'Médicaments habituels',
        'Carte bancaire internationale',
      ];

  return {
    ok: true,
    checklist,
    tips: tips.slice(0, 5),
    stepSuggestions: steps,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 📦 CACHE ASSISTANT — Inchangé
// ─────────────────────────────────────────────────────────────────────────────
const assistantCache = new Map<string, AssistantResult>();

const makeCacheKey = (p: AssistantPayload): string =>
  [p.city, p.country, p.days ?? 0, p.budget ?? 0, p.currency ?? 'EUR'].join('|');

// ─────────────────────────────────────────────────────────────────────────────
// 🤖 FETCH ASSISTANT — Inchangé
// ─────────────────────────────────────────────────────────────────────────────
export const fetchAssistant = async (
  payload: AssistantPayload,
): Promise<AssistantResult> => {
  const cacheKey = makeCacheKey(payload);

  if (assistantCache.has(cacheKey)) {
    console.log('📦 [fetchAssistant] Cache hit:', cacheKey);
    return assistantCache.get(cacheKey)!;
  }

  try {
    const res = await fetch(API_BASE + '/assistant', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) {
      console.warn(`⚠️ [fetchAssistant] HTTP ${res.status} → fallback`);
      return buildFallback(payload);
    }

    const data: AssistantResult = await res.json();
    console.log('✅ [fetchAssistant] Groq OK:', data);

    if (data.ok) {
      assistantCache.set(cacheKey, data);
      console.log('📦 [fetchAssistant] Mis en cache:', cacheKey);
    }

    return data;
  } catch (err) {
    console.warn('⚠️ [fetchAssistant] Network error → fallback:', err);
    if (assistantCache.has(cacheKey)) return assistantCache.get(cacheKey)!;
    return buildFallback(payload);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🗑️ VIDER LE CACHE ASSISTANT — Inchangé
// ─────────────────────────────────────────────────────────────────────────────
export const clearAssistantCache = (payload?: AssistantPayload): void => {
  if (payload) {
    const key = makeCacheKey(payload);
    assistantCache.delete(key);
    console.log('🗑️ [fetchAssistant] Cache clé supprimée:', key);
  } else {
    assistantCache.clear();
    console.log('🗑️ [fetchAssistant] Cache entièrement vidé');
  }
};