// Local "AI" assistant — smart templates per destination type

type Tip = { icon: string; title: string; body: string };

const GENERIC_CHECKLIST = [
  'Passeport / carte d’identité',
  'Billets de transport',
  'Réservations hôtels',
  'Assurance voyage',
  'Adaptateur prise',
  'Chargeurs',
  'Trousse à pharmacie',
  'Carte bancaire',
  'Espèces locales',
];

const COUNTRY_CHECKLIST: Record<string, string[]> = {
  Japon: ['JR Pass', 'Pocket Wifi', 'Yens en espèces', 'Adaptateur Type A'],
  'États-Unis': ['ESTA', 'Carte SIM US', 'Adaptateur Type A/B'],
  Thaïlande: ['Vaccins à jour', 'Anti-moustiques', 'Visa électronique'],
  Indonésie: ['Visa à l’arrivée', 'Anti-moustiques', 'Crème solaire'],
  Vietnam: ['Visa électronique', 'Adaptateur'],
  'Royaume-Uni': ['Adaptateur Type G', 'Carte Oyster (Londres)'],
  Maroc: ['Vêtements couvrants', 'Crème solaire'],
  'Émirats arabes unis': ['Vêtements légers couvrants', 'Crème solaire +50'],
  Islande: ['Vêtements chauds', 'Imperméable', 'Maillot (sources chaudes)'],
};

export const getStarterChecklist = (country: string): string[] => {
  const extra = COUNTRY_CHECKLIST[country] ?? [];
  return [...GENERIC_CHECKLIST, ...extra];
};

const TIPS_BY_COUNTRY: Record<string, Tip[]> = {
  Japon: [
    { icon: '🍣', title: 'Étiquette à table', body: 'Ne plantez jamais vos baguettes verticalement dans le riz. Slurper les nouilles est un compliment.' },
    { icon: '🚇', title: 'Transport', body: 'Le JR Pass est rentable dès 2 trajets longue-distance. Achetez une carte Suica/Pasmo pour le métro.' },
    { icon: '💴', title: 'Cash king', body: 'Beaucoup de petits restos n’acceptent que les espèces. Retirez aux 7-Eleven (ATM internationaux).' },
  ],
  France: [
    { icon: '🥖', title: 'Bonne table', body: 'Le déjeuner est servi entre 12h et 14h. Réservez à l’avance dans les bistrots étoilés.' },
    { icon: '🚄', title: 'TGV', body: 'Les billets non-flexibles sont 50% moins chers. Réservez 3 mois à l’avance.' },
  ],
  Italie: [
    { icon: '☕', title: 'Café', body: 'Boire un cappuccino après 11h est un faux pas. Préférez un espresso après le repas.' },
    { icon: '🍝', title: 'Restos', body: 'Le « coperto » (couvert) est facturé 2-3€/personne. Pas de pourboire attendu.' },
  ],
  Espagne: [
    { icon: '🌅', title: 'Rythme', body: 'Le dîner ne commence pas avant 21h. Sieste sacrée entre 14h et 17h.' },
    { icon: '🍷', title: 'Tapas', body: 'Une tournée = un verre + une tapa offerte. À Grenade encore vraiment pratiqué.' },
  ],
  'États-Unis': [
    { icon: '💵', title: 'Pourboire', body: '18-22% au restaurant. C’est le salaire des serveurs, ce n’est pas optionnel.' },
    { icon: '🚗', title: 'Voiture', body: 'Hors NYC/SF, la voiture est indispensable. Réservez avec assurance complète.' },
  ],
  Thaïlande: [
    { icon: '🙏', title: 'Wai', body: 'Salut traditionnel mains jointes. Ne touchez jamais la tête de quelqu’un.' },
    { icon: '🌶️', title: 'Épicé', body: 'Demandez « mai phet » pour pas épicé. « Phet nit noi » pour un peu.' },
  ],
  'Royaume-Uni': [
    { icon: '🚌', title: 'Conduite', body: 'Conduite à gauche. Préférez le métro/bus à Londres.' },
    { icon: '☔', title: 'Météo', body: 'Imperméable obligatoire toute l’année. Couches superposables.' },
  ],
};

const GENERIC_TIPS: Tip[] = [
  { icon: '🛡️', title: 'Sécurité', body: 'Photographiez votre passeport et envoyez-le à un proche. Stockez-le dans le cloud.' },
  { icon: '🔌', title: 'Connectivité', body: 'eSIM (Airalo, Holafly) souvent plus rentable que le roaming.' },
  { icon: '💳', title: 'Banque', body: 'Cartes Revolut/Wise sans frais à l’étranger. Prévenez votre banque du voyage.' },
  { icon: '📱', title: 'Apps utiles', body: 'Maps.me (offline), Google Translate (mode photo), Citymapper.' },
];

export const getAssistantTips = (country: string, city: string): Tip[] => {
  const country_tips = TIPS_BY_COUNTRY[country] ?? [];
  const local: Tip[] = [
    { icon: '📍', title: `Spécial ${city}`, body: `Téléchargez la carte hors-ligne de ${city} sur Google Maps avant le départ. Identifiez 3 quartiers prioritaires.` },
  ];
  return [...local, ...country_tips, ...GENERIC_TIPS].slice(0, 7);
};

export const getStepSuggestions = (country: string): string[] => {
  const base = ['Petit-déjeuner local', 'Visite musée', 'Balade en centre-ville', 'Dîner gastronomique', 'Coucher de soleil'];
  const map: Record<string, string[]> = {
    Japon: ['Sanctuaire shinto', 'Onsen (bain thermal)', 'Izakaya', 'Marché aux poissons', 'Quartier Shibuya / Gion'],
    Italie: ['Aperitivo', 'Trattoria de quartier', 'Visite église', 'Promenade gelato', 'Place historique'],
    France: ['Marché de producteurs', 'Café terrasse', 'Bistrot', 'Musée d’art', 'Parc & jardins'],
    Thaïlande: ['Massage thaï', 'Marché de nuit', 'Temple bouddhiste', 'Cours de cuisine', 'Plage'],
  };
  return [...(map[country] ?? []), ...base];
};
