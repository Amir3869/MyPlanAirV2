// Smart photo selection — uses curated, reliable Unsplash CDN URLs
// Logic: city-specific > capital skyline > country landscape > generic travel
// URLs are persisted at trip creation (never change)

type PhotoMap = Record<string, string[]>;

// Hand-picked Unsplash photos that work reliably (direct CDN images)
const CITY_PHOTOS: PhotoMap = {
  Paris: ['https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&q=80'],
  Lyon: ['https://images.unsplash.com/photo-1524396309943-e03f5249f002?w=1600&q=80'],
  Marseille: ['https://images.unsplash.com/photo-1548585744-301a98fb9b69?w=1600&q=80'],
  Bordeaux: ['https://images.unsplash.com/photo-1591291621164-2c6367723315?w=1600&q=80'],
  Nice: ['https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=1600&q=80'],
  Grenoble: ['https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?w=1600&q=80'],
  Toulouse: ['https://images.unsplash.com/photo-1572122560156-f81b87f0a48e?w=1600&q=80'],
  Strasbourg: ['https://images.unsplash.com/photo-1559717865-a99cac1c95d8?w=1600&q=80'],
  Nantes: ['https://images.unsplash.com/photo-1605910347065-f8a4ee30db95?w=1600&q=80'],
  Lille: ['https://images.unsplash.com/photo-1591200649-eccb716bf7e9?w=1600&q=80'],

  Rome: ['https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1600&q=80'],
  Milan: ['https://images.unsplash.com/photo-1520440229-6469a149ac59?w=1600&q=80'],
  Venise: ['https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=1600&q=80'],
  Florence: ['https://images.unsplash.com/photo-1543429776-2782fc8e1acd?w=1600&q=80'],
  Naples: ['https://images.unsplash.com/photo-1534445967719-8ae7b972b1a5?w=1600&q=80'],

  Madrid: ['https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=1600&q=80'],
  Barcelone: ['https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1600&q=80'],
  Séville: ['https://images.unsplash.com/photo-1559682468-a6a29e7d9517?w=1600&q=80'],
  Valence: ['https://images.unsplash.com/photo-1599930113854-d6d7fd521f10?w=1600&q=80'],

  Londres: ['https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1600&q=80'],
  'Édimbourg': ['https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=1600&q=80'],
  Manchester: ['https://images.unsplash.com/photo-1588934604375-957d22c89c69?w=1600&q=80'],

  Berlin: ['https://images.unsplash.com/photo-1560969184-10fe8719e047?w=1600&q=80'],
  Munich: ['https://images.unsplash.com/photo-1595867818082-083862f3d630?w=1600&q=80'],
  Hambourg: ['https://images.unsplash.com/photo-1552751753-0fc84ae3e718?w=1600&q=80'],

  Amsterdam: ['https://images.unsplash.com/photo-1534351590666-13e3e96c5017?w=1600&q=80'],
  Bruxelles: ['https://images.unsplash.com/photo-1559113202-c916b8e44373?w=1600&q=80'],
  Bruges: ['https://images.unsplash.com/photo-1597531072931-8001a76b6285?w=1600&q=80'],

  Lisbonne: ['https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1600&q=80'],
  Porto: ['https://images.unsplash.com/photo-1555881400-69a45c2bf08a?w=1600&q=80'],

  Zurich: ['https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=1600&q=80'],
  Genève: ['https://images.unsplash.com/photo-1584656502311-fa6abd3aedea?w=1600&q=80'],

  Athènes: ['https://images.unsplash.com/photo-1555993539-1732b0258235?w=1600&q=80'],
  Santorin: ['https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1600&q=80'],
  Dubrovnik: ['https://images.unsplash.com/photo-1555990538-32320cce6cdf?w=1600&q=80'],

  Copenhague: ['https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=1600&q=80'],
  Stockholm: ['https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=1600&q=80'],
  Oslo: ['https://images.unsplash.com/photo-1580674684089-5c8b0a6b9b3b?w=1600&q=80'],
  Reykjavik: ['https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=1600&q=80'],

  Tokyo: ['https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1600&q=80'],
  Kyoto: ['https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1600&q=80'],
  Osaka: ['https://images.unsplash.com/photo-1590559899731-a382839e5549?w=1600&q=80'],
  Séoul: ['https://images.unsplash.com/photo-1538485399081-7c8970d40b1e?w=1600&q=80'],
  Bangkok: ['https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1600&q=80'],
  Phuket: ['https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=1600&q=80'],
  Bali: ['https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1600&q=80'],
  Singapour: ['https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1600&q=80'],
  'Hong Kong': ['https://images.unsplash.com/photo-1536599018102-9f803c140fc1?w=1600&q=80'],
  Pékin: ['https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=1600&q=80'],
  Shanghai: ['https://images.unsplash.com/photo-1545893835-abaa50cbe628?w=1600&q=80'],
  Hanoï: ['https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=1600&q=80'],
  'Hô-Chi-Minh-Ville': ['https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1600&q=80'],
  Dubaï: ['https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=80'],
  Istanbul: ['https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1600&q=80'],
  Marrakech: ['https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=1600&q=80'],
  'Le Caire': ['https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=1600&q=80'],

  'New York': ['https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1600&q=80'],
  'Los Angeles': ['https://images.unsplash.com/photo-1518533954129-7774297db60a?w=1600&q=80'],
  'San Francisco': ['https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1600&q=80'],
  Miami: ['https://images.unsplash.com/photo-1535498730771-e735b998cd64?w=1600&q=80'],
  Chicago: ['https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1600&q=80'],
  'Las Vegas': ['https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?w=1600&q=80'],
  Toronto: ['https://images.unsplash.com/photo-1517090504586-fde19ea6066f?w=1600&q=80'],
  Montréal: ['https://images.unsplash.com/photo-1519178614-68673b201f36?w=1600&q=80'],
  Vancouver: ['https://images.unsplash.com/photo-1559511260-66a654ae982a?w=1600&q=80'],
  Mexico: ['https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=1600&q=80'],
  Cancún: ['https://images.unsplash.com/photo-1552074284-5e88ef1aef18?w=1600&q=80'],
  'Rio de Janeiro': ['https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=1600&q=80'],
  'São Paulo': ['https://images.unsplash.com/photo-1543059080-f9b1272213d5?w=1600&q=80'],
  'Buenos Aires': ['https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=1600&q=80'],
  Lima: ['https://images.unsplash.com/photo-1580239279174-2c4f3e7d6a92?w=1600&q=80'],
  Cusco: ['https://images.unsplash.com/photo-1526392060635-9d6019884377?w=1600&q=80'],

  Sydney: ['https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1600&q=80'],
  Melbourne: ['https://images.unsplash.com/photo-1514395462725-fb4566210144?w=1600&q=80'],
  Auckland: ['https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=1600&q=80'],

  'Le Cap': ['https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1600&q=80'],
  Nairobi: ['https://images.unsplash.com/photo-1611348586804-61bf6c080437?w=1600&q=80'],
};

const COUNTRY_FALLBACK: PhotoMap = {
  France: ['https://images.unsplash.com/photo-1431274172761-fca41d930114?w=1600&q=80'],
  Italie: ['https://images.unsplash.com/photo-1530841377377-3ff06c0ca713?w=1600&q=80'],
  Espagne: ['https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=1600&q=80'],
  Japon: ['https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=1600&q=80'],
  'États-Unis': ['https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=1600&q=80'],
};

const GENERIC = [
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&q=80',
  'https://images.unsplash.com/photo-1500835556837-99ac94a94552?w=1600&q=80',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&q=80',
];

/**
 * Smart photo resolver — implements the fallback cascade per the spec.
 * Always returns a valid URL — never undefined.
 */
export const pickPhoto = (city: string, country: string, capital?: string): string => {
  // 1. City-specific
  if (CITY_PHOTOS[city]?.[0]) return CITY_PHOTOS[city][0];
  // 2. Capital skyline (e.g. unknown city in known country)
  if (capital && CITY_PHOTOS[capital]?.[0]) return CITY_PHOTOS[capital][0];
  // 3. Country landscape
  if (COUNTRY_FALLBACK[country]?.[0]) return COUNTRY_FALLBACK[country][0];
  // 4. Generic — deterministic pick by country hash to keep it consistent
  const hash = (city + country).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return GENERIC[hash % GENERIC.length];
};
