// Curated city/country database — works 100% offline (no API key required)
// Each city includes country code (for flag) and ISO currency code (auto-imported per spec)

export type CityEntry = {
  city: string;
  country: string;
  countryCode: string; // ISO 3166-1 alpha-2
  currency: string;    // ISO 4217
  capital?: string;
};

export const CITIES: CityEntry[] = [
  // France
  { city: 'Paris', country: 'France', countryCode: 'FR', currency: 'EUR', capital: 'Paris' },
  { city: 'Lyon', country: 'France', countryCode: 'FR', currency: 'EUR', capital: 'Paris' },
  { city: 'Marseille', country: 'France', countryCode: 'FR', currency: 'EUR', capital: 'Paris' },
  { city: 'Bordeaux', country: 'France', countryCode: 'FR', currency: 'EUR', capital: 'Paris' },
  { city: 'Nice', country: 'France', countryCode: 'FR', currency: 'EUR', capital: 'Paris' },
  { city: 'Grenoble', country: 'France', countryCode: 'FR', currency: 'EUR', capital: 'Paris' },
  { city: 'Toulouse', country: 'France', countryCode: 'FR', currency: 'EUR', capital: 'Paris' },
  { city: 'Strasbourg', country: 'France', countryCode: 'FR', currency: 'EUR', capital: 'Paris' },
  { city: 'Nantes', country: 'France', countryCode: 'FR', currency: 'EUR', capital: 'Paris' },
  { city: 'Lille', country: 'France', countryCode: 'FR', currency: 'EUR', capital: 'Paris' },
  // Italie
  { city: 'Rome', country: 'Italie', countryCode: 'IT', currency: 'EUR', capital: 'Rome' },
  { city: 'Milan', country: 'Italie', countryCode: 'IT', currency: 'EUR', capital: 'Rome' },
  { city: 'Venise', country: 'Italie', countryCode: 'IT', currency: 'EUR', capital: 'Rome' },
  { city: 'Florence', country: 'Italie', countryCode: 'IT', currency: 'EUR', capital: 'Rome' },
  { city: 'Naples', country: 'Italie', countryCode: 'IT', currency: 'EUR', capital: 'Rome' },
  // Espagne
  { city: 'Madrid', country: 'Espagne', countryCode: 'ES', currency: 'EUR', capital: 'Madrid' },
  { city: 'Barcelone', country: 'Espagne', countryCode: 'ES', currency: 'EUR', capital: 'Madrid' },
  { city: 'Séville', country: 'Espagne', countryCode: 'ES', currency: 'EUR', capital: 'Madrid' },
  { city: 'Valence', country: 'Espagne', countryCode: 'ES', currency: 'EUR', capital: 'Madrid' },
  // UK
  { city: 'Londres', country: 'Royaume-Uni', countryCode: 'GB', currency: 'GBP', capital: 'Londres' },
  { city: 'Édimbourg', country: 'Royaume-Uni', countryCode: 'GB', currency: 'GBP', capital: 'Londres' },
  { city: 'Manchester', country: 'Royaume-Uni', countryCode: 'GB', currency: 'GBP', capital: 'Londres' },
  // Allemagne
  { city: 'Berlin', country: 'Allemagne', countryCode: 'DE', currency: 'EUR', capital: 'Berlin' },
  { city: 'Munich', country: 'Allemagne', countryCode: 'DE', currency: 'EUR', capital: 'Berlin' },
  { city: 'Hambourg', country: 'Allemagne', countryCode: 'DE', currency: 'EUR', capital: 'Berlin' },
  // Pays-Bas / Belgique
  { city: 'Amsterdam', country: 'Pays-Bas', countryCode: 'NL', currency: 'EUR', capital: 'Amsterdam' },
  { city: 'Bruxelles', country: 'Belgique', countryCode: 'BE', currency: 'EUR', capital: 'Bruxelles' },
  { city: 'Bruges', country: 'Belgique', countryCode: 'BE', currency: 'EUR', capital: 'Bruxelles' },
  // Portugal
  { city: 'Lisbonne', country: 'Portugal', countryCode: 'PT', currency: 'EUR', capital: 'Lisbonne' },
  { city: 'Porto', country: 'Portugal', countryCode: 'PT', currency: 'EUR', capital: 'Lisbonne' },
  // Suisse
  { city: 'Zurich', country: 'Suisse', countryCode: 'CH', currency: 'CHF', capital: 'Berne' },
  { city: 'Genève', country: 'Suisse', countryCode: 'CH', currency: 'CHF', capital: 'Berne' },
  // Grèce / Croatie
  { city: 'Athènes', country: 'Grèce', countryCode: 'GR', currency: 'EUR', capital: 'Athènes' },
  { city: 'Santorin', country: 'Grèce', countryCode: 'GR', currency: 'EUR', capital: 'Athènes' },
  { city: 'Dubrovnik', country: 'Croatie', countryCode: 'HR', currency: 'EUR', capital: 'Zagreb' },
  // Scandinavie
  { city: 'Copenhague', country: 'Danemark', countryCode: 'DK', currency: 'DKK', capital: 'Copenhague' },
  { city: 'Stockholm', country: 'Suède', countryCode: 'SE', currency: 'SEK', capital: 'Stockholm' },
  { city: 'Oslo', country: 'Norvège', countryCode: 'NO', currency: 'NOK', capital: 'Oslo' },
  { city: 'Reykjavik', country: 'Islande', countryCode: 'IS', currency: 'ISK', capital: 'Reykjavik' },
  // Asie
  { city: 'Tokyo', country: 'Japon', countryCode: 'JP', currency: 'JPY', capital: 'Tokyo' },
  { city: 'Kyoto', country: 'Japon', countryCode: 'JP', currency: 'JPY', capital: 'Tokyo' },
  { city: 'Osaka', country: 'Japon', countryCode: 'JP', currency: 'JPY', capital: 'Tokyo' },
  { city: 'Séoul', country: 'Corée du Sud', countryCode: 'KR', currency: 'KRW', capital: 'Séoul' },
  { city: 'Bangkok', country: 'Thaïlande', countryCode: 'TH', currency: 'THB', capital: 'Bangkok' },
  { city: 'Phuket', country: 'Thaïlande', countryCode: 'TH', currency: 'THB', capital: 'Bangkok' },
  { city: 'Bali', country: 'Indonésie', countryCode: 'ID', currency: 'IDR', capital: 'Jakarta' },
  { city: 'Singapour', country: 'Singapour', countryCode: 'SG', currency: 'SGD', capital: 'Singapour' },
  { city: 'Hong Kong', country: 'Hong Kong', countryCode: 'HK', currency: 'HKD', capital: 'Hong Kong' },
  { city: 'Pékin', country: 'Chine', countryCode: 'CN', currency: 'CNY', capital: 'Pékin' },
  { city: 'Shanghai', country: 'Chine', countryCode: 'CN', currency: 'CNY', capital: 'Pékin' },
  { city: 'Hanoï', country: 'Vietnam', countryCode: 'VN', currency: 'VND', capital: 'Hanoï' },
  { city: 'Hô-Chi-Minh-Ville', country: 'Vietnam', countryCode: 'VN', currency: 'VND', capital: 'Hanoï' },
  { city: 'Dubaï', country: 'Émirats arabes unis', countryCode: 'AE', currency: 'AED', capital: 'Abou Dabi' },
  { city: 'Istanbul', country: 'Turquie', countryCode: 'TR', currency: 'TRY', capital: 'Ankara' },
  { city: 'Marrakech', country: 'Maroc', countryCode: 'MA', currency: 'MAD', capital: 'Rabat' },
  { city: 'Le Caire', country: 'Égypte', countryCode: 'EG', currency: 'EGP', capital: 'Le Caire' },
  // Amériques
  { city: 'New York', country: 'États-Unis', countryCode: 'US', currency: 'USD', capital: 'Washington' },
  { city: 'Los Angeles', country: 'États-Unis', countryCode: 'US', currency: 'USD', capital: 'Washington' },
  { city: 'San Francisco', country: 'États-Unis', countryCode: 'US', currency: 'USD', capital: 'Washington' },
  { city: 'Miami', country: 'États-Unis', countryCode: 'US', currency: 'USD', capital: 'Washington' },
  { city: 'Chicago', country: 'États-Unis', countryCode: 'US', currency: 'USD', capital: 'Washington' },
  { city: 'Las Vegas', country: 'États-Unis', countryCode: 'US', currency: 'USD', capital: 'Washington' },
  { city: 'Toronto', country: 'Canada', countryCode: 'CA', currency: 'CAD', capital: 'Ottawa' },
  { city: 'Montréal', country: 'Canada', countryCode: 'CA', currency: 'CAD', capital: 'Ottawa' },
  { city: 'Vancouver', country: 'Canada', countryCode: 'CA', currency: 'CAD', capital: 'Ottawa' },
  { city: 'Mexico', country: 'Mexique', countryCode: 'MX', currency: 'MXN', capital: 'Mexico' },
  { city: 'Cancún', country: 'Mexique', countryCode: 'MX', currency: 'MXN', capital: 'Mexico' },
  { city: 'Rio de Janeiro', country: 'Brésil', countryCode: 'BR', currency: 'BRL', capital: 'Brasilia' },
  { city: 'São Paulo', country: 'Brésil', countryCode: 'BR', currency: 'BRL', capital: 'Brasilia' },
  { city: 'Buenos Aires', country: 'Argentine', countryCode: 'AR', currency: 'ARS', capital: 'Buenos Aires' },
  { city: 'Lima', country: 'Pérou', countryCode: 'PE', currency: 'PEN', capital: 'Lima' },
  { city: 'Cusco', country: 'Pérou', countryCode: 'PE', currency: 'PEN', capital: 'Lima' },
  // Océanie
  { city: 'Sydney', country: 'Australie', countryCode: 'AU', currency: 'AUD', capital: 'Canberra' },
  { city: 'Melbourne', country: 'Australie', countryCode: 'AU', currency: 'AUD', capital: 'Canberra' },
  { city: 'Auckland', country: 'Nouvelle-Zélande', countryCode: 'NZ', currency: 'NZD', capital: 'Wellington' },
  // Afrique
  { city: 'Le Cap', country: 'Afrique du Sud', countryCode: 'ZA', currency: 'ZAR', capital: 'Pretoria' },
  { city: 'Nairobi', country: 'Kenya', countryCode: 'KE', currency: 'KES', capital: 'Nairobi' },
];

export const CURRENCIES: { code: string; name: string; symbol: string }[] = [
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'USD', name: 'Dollar américain', symbol: '$' },
  { code: 'GBP', name: 'Livre sterling', symbol: '£' },
  { code: 'JPY', name: 'Yen japonais', symbol: '¥' },
  { code: 'CHF', name: 'Franc suisse', symbol: 'CHF' },
  { code: 'CAD', name: 'Dollar canadien', symbol: 'CA$' },
  { code: 'AUD', name: 'Dollar australien', symbol: 'AU$' },
  { code: 'NZD', name: 'Dollar néo-zélandais', symbol: 'NZ$' },
  { code: 'CNY', name: 'Yuan chinois', symbol: '¥' },
  { code: 'KRW', name: 'Won sud-coréen', symbol: '₩' },
  { code: 'THB', name: 'Baht thaïlandais', symbol: '฿' },
  { code: 'IDR', name: 'Roupie indonésienne', symbol: 'Rp' },
  { code: 'SGD', name: 'Dollar de Singapour', symbol: 'S$' },
  { code: 'HKD', name: 'Dollar de Hong Kong', symbol: 'HK$' },
  { code: 'VND', name: 'Dong vietnamien', symbol: '₫' },
  { code: 'AED', name: 'Dirham émirati', symbol: 'AED' },
  { code: 'TRY', name: 'Livre turque', symbol: '₺' },
  { code: 'MAD', name: 'Dirham marocain', symbol: 'MAD' },
  { code: 'EGP', name: 'Livre égyptienne', symbol: 'E£' },
  { code: 'MXN', name: 'Peso mexicain', symbol: 'MX$' },
  { code: 'BRL', name: 'Real brésilien', symbol: 'R$' },
  { code: 'ARS', name: 'Peso argentin', symbol: 'AR$' },
  { code: 'PEN', name: 'Sol péruvien', symbol: 'S/' },
  { code: 'ZAR', name: 'Rand sud-africain', symbol: 'R' },
  { code: 'KES', name: 'Shilling kényan', symbol: 'KSh' },
  { code: 'DKK', name: 'Couronne danoise', symbol: 'kr' },
  { code: 'SEK', name: 'Couronne suédoise', symbol: 'kr' },
  { code: 'NOK', name: 'Couronne norvégienne', symbol: 'kr' },
  { code: 'ISK', name: 'Couronne islandaise', symbol: 'kr' },
];

export const findCurrency = (code: string) => CURRENCIES.find(c => c.code === code);

export const searchCities = (query: string, limit = 3): CityEntry[] => {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return [];
  // Normalize accents
  const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const nq = norm(q);
  const startsWith = CITIES.filter(c => norm(c.city).startsWith(nq) || norm(c.country).startsWith(nq));
  const contains = CITIES.filter(c => !startsWith.includes(c) && (norm(c.city).includes(nq) || norm(c.country).includes(nq)));
  return [...startsWith, ...contains].slice(0, limit);
};
