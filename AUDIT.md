# DOSSIER D'AUDIT TECHNIQUE — MyTripV3
### Audit réalisé le 06/11/2026 (lecture seule, aucune modification de code)

---

## 1. Résumé exécutif

MyTripV3 (nom produit affiché : **« My Plan'Air »**, `package.json` v5.0.0) est une **Progressive Web App (PWA)** de planification de voyages construite en **React 19 + Vite 7 + TypeScript + Tailwind 4**, avec état géré par **Zustand** (persistance `localStorage`). Il n'existe **aucun backend applicatif propre** : les seules dépendances serveur sont un **Worker Cloudflare externe** (IA/chat/photo/devise) et des API publiques tierces sans clé (Open-Meteo, Photon/Nominatim).

Le produit est **fonctionnellement riche et largement implémenté** (~20 modules métier, navigation complète, store typé et persistant, UI cohérente), mais il est **loin d'être prêt pour une publication sur les stores et en production** : **zéro test automatisé**, **aucune intégration mobile native** (pas de Capacitor/RN/Expo — donc pas de build iOS/Android possible en l'état), des **fichiers monolithiques** dépassant 2000 lignes, plusieurs **fonctionnalités factices ou placeholders** non signalées à l'utilisateur final de façon homogène, une route d'administration accessible à tout utilisateur connecté, et aucune politique de confidentialité / mentions légales identifiée.

**Verdict global : projet à un stade avancé de prototype fonctionnel (MVP solide), pas un produit prêt à publier.** La voie la plus réaliste n'est **pas une réécriture** — l'architecture React/Vite est saine et compatible Capacitor — mais un chantier de stabilisation, sécurisation, tests et packaging mobile estimé à **11 à 18 semaines** avant une première soumission aux stores (détail dans `ROADMAP.md`).

---

## 2. Présentation technique de l'application

| Élément | Valeur constatée |
|---|---|
| Nom package | `mytrip`, version `5.0.0` (package.json) |
| Framework UI | React 19.2.3 |
| Build tool | Vite 7.3.2 |
| Langage | TypeScript 5.9.3 (strict mode activé, tsconfig.json) |
| Styles | Tailwind CSS 4.1.17 (plugin Vite natif) |
| État global | Zustand 5.0.13 avec middleware `persist` → `localStorage` |
| Routing | React Router DOM 7.15 |
| Auth | Clerk (`@clerk/clerk-react` 5.61.6) |
| Cartographie | Leaflet / react-leaflet, react-globe.gl |
| Animations | Framer Motion |
| PWA | `vite-plugin-pwa` (manifest + Workbox généré au build) |
| Hébergement cible | Vercel (SPA rewrite, vercel.json) |
| Backend | Aucun en propre — Worker Cloudflare externe (`mytrip-api.amirsfr38.workers.dev`) |
| Mobile natif | **Absent** — aucun Capacitor/React Native/Expo |
| Tests | **Absents** — 0 fichier test, aucun framework installé |
| CI/CD | **Absent** — aucun `.github/workflows` |

C'est une **SPA 100 % client**, sans serveur applicatif, sans base de données propre, dont toute la persistance utilisateur (voyages, dépenses, documents) vit dans le navigateur (`localStorage` + `IndexedDB`).

---

## 3. Architecture et cartographie du projet

```
src/
├── api/              → clients externes (cloud.ts = proxy Worker, countries.ts, currency.ts, weather.ts)
│   └── cloud/         → capitals.ts, fallback.ts, types.ts
├── features/          → 1 dossier par domaine métier (20 modules, détail section 4)
├── shared/            → composants UI réutilisables (12 composants)
├── store/             → tripStore.ts (620 lignes) + types.ts (278 lignes) — state global unique
└── utils/             → helpers (dateHelpers, expenseHelpers, geo, docStorage, memoryStorage, docMigration, platform, usageTelemetry)
```

**Routage** (App.tsx) : toutes les pages sont `lazy()`. Trois niveaux de garde :
1. `ProtectedRoutes` : exige `isSignedIn` (Clerk) **et** `onboardingDone` (store).
2. `MainLayout` : 4 onglets principaux (`/`, `/voyages`, `/decouvrir`, `/profil`) avec `NavTabBar`.
3. `TripCockpit` (`/trip/:id`) : 8 sous-onglets imbriqués via `<Outlet>` (overview, parcours, budget, essentials, team, chat, documents, weather).

Deux routes hors layout normal mais toujours dans `ProtectedRoutes` : `/world` et **`/admin-test`** (console de debug usage API — voir section 8, finding sécurité).

**Constat architectural** : la séparation feature-based est cohérente et lisible pour un projet de cette taille. Le point faible n'est pas la structure des dossiers mais la **taille de certains fichiers individuels** (section 5), qui concentre logique métier, état local et rendu JSX dans un seul composant.

---

## 4. Inventaire fonctionnel complet

Statuts utilisés : **TV** = Terminée et vérifiée (code lu, logique cohérente) · **INV** = Implémentée non vérifiée (aucun run réel) · **PI** = Partiellement implémentée · **SIM** = Simulée/données fictives · **NF** = Non fonctionnelle · **ABS** = Absente.

| Module | Fichier(s) | Fonction | Statut | Détail |
|---|---|---|---|---|
| Auth | `features/auth/AuthPage.tsx` | Connexion Clerk (Google/Apple OAuth + email) | **PI** | Bouton email désactivé, « Email bientôt disponible » — migration Supabase annoncée mais non câblée |
| Onboarding | `features/auth/OnboardingFlow.tsx` (1444 l.) | Setup initial (nom, ville, préférences) | **INV** | Gros fichier, non testé en exécution réelle |
| SSO Callback | `features/auth/SSOCallback.tsx` | Retour OAuth Clerk | **INV** | Délègue entièrement au SDK Clerk |
| Dashboard | `features/dashboard/Dashboard.tsx` (765 l.) | Accueil, cartes de statut, raccourcis | **PI** | Carte « Communauté » = `onClick={() => {}}` (no-op), libellé « Bientôt » |
| Trips Hub | `features/trips/TripsHub.tsx` (1265 l.) | Liste/filtres des voyages | **INV** | — |
| Trip Creator | `features/trips/TripCreator.tsx` (1978 l.) | Assistant de création de voyage | **INV** | Fichier très volumineux |
| Cockpit | `features/cockpit/TripCockpit.tsx` | Shell d'un voyage (8 sous-onglets) | **TV** | Petit, propre |
| Overview | `features/overview/Overview.tsx` (**2500 l.**) | Résumé voyage, journal/souvenirs | **INV** | Plus gros fichier de l'app — risque de maintenabilité majeur |
| Parcours | `features/parcours/Parcours.tsx` (2398 l.) | Itinéraire jour par jour | **INV** | 2ᵉ plus gros fichier |
| Budget | `features/budget/Budget.tsx` (1240 l.) | Suivi dépenses | **INV** | — |
| Essentials | `features/essentials/Essentials.tsx` | Checklist/notes | **TV** | Correctif CSS déjà appliqué (commentaire historique) |
| Collaboration | `features/collaboration/TeamTab.tsx` | Équipe de voyage | **SIM** | Le code lui-même déclare : « V1 = UI statique… V2 = Supabase temps réel » — bannière « Bientôt » visible |
| Chat IA (ARIA) | `features/chat/TripChat.tsx` (1537 l.) | Assistant conversationnel | **PI** | UI complète ; génération réelle des réponses non confirmée dans ce fichier (dépend du Worker) |
| Documents | `features/documents/Documents.tsx` (1203 l.) | Gestion fichiers/documents voyage | **PI** | CTA « Passer Pro — Bientôt » non fonctionnel |
| Weather | `features/weather/Weather.tsx` (833 l.) | Prévisions 7 jours | **TV** | Vraies API (Open-Meteo/Photon), cache 2 niveaux, bugs historiques documentés comme résolus |
| Notifications | `features/notifications/NotificationCenter.tsx` (1109 l.) | Alertes locales + export ICS/Google Agenda | **INV** | Sophistiqué mais non testé en exécution ; accessible seulement depuis Dashboard |
| Découvrir (planner IA) | `features/decouvrir/*` (~2100 l. cumulées) | Suggestions destinations + planificateur IA | **SIM (partiel)** | `plannerFallback.ts` explicitement documenté comme données de démonstration, en attente d'un vrai Worker |
| World Map | `features/world/*` (~2600 l. cumulées) | Carte pays visités, stats, badges | **INV** | Route orpheline (`/world`, hors nav principale) |
| Profil | `features/profil/Profil.tsx` (1207 l.) | Profil utilisateur, export PDF | **PI** | « Export PDF — Bientôt » non fonctionnel |
| Settings | `features/settings/SettingsSheet.tsx` (775 l.) | Devise, thème, suppression compte | **INV** | Suppression de compte à vérifier côté Clerk réel |
| Share | `features/share/ShareView.tsx` | Partage public lecture seule d'un voyage | **TV** | Fonctionne, mais payload base64 non signé, non expirant (voir section 8) |
| Travel Prep | `features/travelPrep/*` | Liens partenaires (assurance, SIM) | **TV** | Liste statique volontaire |
| Admin | `features/admin/UsageConsole.tsx` (1358 l.) | Console debug usage API/IA | **TV (dev-only)** | Exposée en prod sans garde de rôle (section 8) |

**Synthèse** : sur ~24 modules, **aucun n'est « ABS » (absent)** ni « NF » pur — le socle fonctionnel est réel. Mais **6 modules contiennent des placeholders visibles à l'utilisateur** (Communauté, email login, Export PDF, Passer Pro, Collaboration temps réel, Planner IA fallback), ce qui est un vrai sujet de crédibilité produit si publié tel quel.

---

## 5. Audit de la qualité du code

**Points positifs**
- TypeScript strict activé, `tsc --noEmit` **passe sans erreur** (vérifié).
- Un seul store Zustand centralisé et typé (`store/types.ts`), pas de state éparpillé.
- Lazy loading systématique des pages → bon réflexe de perf.
- Découpage manual chunks dans `vite.config.ts` (vendor/motion/store/map/clerk/icons).
- Pas de duplication de logique métier détectée entre modules (chaque feature consomme le store central, pas de données locales dupliquées).

**Points faibles**

| Problème | Fichier(s) | Conséquence | Priorité |
|---|---|---|---|
| Fichiers monolithiques (>1000 lignes, certains >2000) | Overview.tsx (2500 l.), Parcours.tsx (2398 l.), TripCreator.tsx (1978 l.) | Maintenabilité et risque de régression élevés, revue de code difficile, onboarding développeur long | P2 |
| Aucun test automatisé | tout le repo | Impossible de garantir la non-régression à chaque évolution ; tout contrôle est manuel | P1 |
| Aucun lint configuré (pas de script `lint`, pas d'ESLint visible) | racine | Pas de garde-fou automatique de style/qualité, dérive possible | P2 |
| Variables d'environnement mortes | `.env.local` (VITE_GROQ_API_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) | Dette de config, risque de confusion sur l'état réel de la migration Supabase | P3 |
| Règle de cache Workbox obsolète (domaine exchangerate.host non utilisé) | vite.config.ts | Config PWA morte, inoffensive mais à nettoyer | P3 |
| `tsconfig.app.json` / `tsconfig.node.json` présents mais vides | racine | Fichiers fantômes, confusion possible | P3 |

**Non vérifié** : couverture réelle de duplication inter-fichiers à l'intérieur des gros composants (nécessiterait une lecture ligne à ligne complète, non réalisée dans cet audit).

---

## 6. Audit frontend et UX/UI

- **Navigation** : cohérente, 4 onglets principaux + cockpit voyage à 8 sous-onglets ; `BottomSheet` générique accessible (focus trap, Escape, aria-modal) — bon niveau d'accessibilité pour les modales.
- **Design system léger** : GlassCard, Donut, Flag, Spinner/MiniSpinner, Toast — cohérence visuelle probable mais **non vérifiée visuellement** (aucun rendu de l'app effectué dans cet audit en lecture seule).
- **Thèmes** : 6 thèmes couleur gérés via variables CSS custom properties (App.tsx) — mécanisme propre.
- **Responsive/mobile** : `useIsMobile.ts` présent, mais **aucune vérification sur device réel ou émulateur** n'a été faite (hors périmètre lecture seule).
- **Placeholders visibles utilisateur** : 5 CTA « Bientôt » recensés (section 4) — à traiter avant publication pour éviter une impression de produit inachevé face aux reviewers Apple/Google.
- **Accessibilité** : aucun audit axe-core/Lighthouse exécuté (nécessiterait de lancer l'app) — **non vérifié**.

---

## 7. Audit backend et données

Il n'y a **pas de backend dans ce dépôt**. Trois sources de données externes :

1. **Worker Cloudflare** (`src/api/cloud.ts` + `src/api/cloud/`) — endpoints `/photo`, `/chat`, `/assistant`, `/currency`. Gestion d'erreurs solide (timeouts via `AbortSignal.timeout`, fallback local `buildFallback()`), mais **validation de schéma superficielle** (`res.json().catch(() => null)` + vérifications de présence, pas de validation de forme stricte) — le code fait confiance à la réponse du Worker.
2. **Open-Meteo / Photon / Nominatim** (`src/api/weather.ts`) — appelées **directement depuis le navigateur**, sans proxy. Un header `User-Agent` est positionné pour respecter la politique Nominatim, mais les navigateurs modernes **ignorent/écrasent ce header**, ce qui peut constituer une violation non intentionnelle de la politique d'usage de Nominatim en production à grande échelle. **À surveiller.**
3. **countries-list** — données statiques, aucun risque.

**Persistance utilisateur** : 100 % côté client — Zustand `persist` → `localStorage` (voyages, profil, thème), IndexedDB via `docStorage.ts`/`memoryStorage.ts` (documents, photos). **Aucune sauvegarde cloud des données utilisateur** : en l'état, un utilisateur qui change d'appareil, vide son cache navigateur ou désinstalle l'app perd toutes ses données. C'est un **risque produit majeur**, pas seulement technique, surtout avec Clerk qui donne l'illusion d'un compte « cloud ».

---

## 8. Audit sécurité

| Constat | Gravité | Détail |
|---|---|---|
| Aucune clé/secret en dur dans le code source | ✅ Bon point | Recherche exhaustive (regex api_key, sk-, AIza, Bearer , etc.) négative, hors références `import.meta.env.VITE_*` légitimes |
| `.env.local` correctement ignoré par Git | ✅ Bon point | `.gitignore` couvre tous les `.env*` ; confirmé non tracké par `git ls-files` |
| Variables VITE_GROQ_API_KEY / VITE_SUPABASE_* définies mais inutilisées | **Moyenne** | Préfixe VITE_ = injectée dans le bundle client si jamais référencée directement dans le futur → fuite de clé LLM. Actuellement non référencée (donc pas de fuite active), mais c'est une bombe à retardement de configuration. **P2** |
| Route `/admin-test` accessible à tout utilisateur Clerk connecté, sans contrôle de rôle | **Moyenne-Haute** | Aucune vérification de rôle admin détectée dans App.tsx ni dans UsageConsole.tsx au-delà de la garde Clerk générique. N'importe quel compte utilisateur peut y accéder en tapant l'URL. **P1** avant publication |
| Lien de partage public (/share/:id) basé sur un payload base64 non signé, sans expiration | **Faible-Moyenne** | Toute personne possédant le lien voit l'intégralité des données du voyage, indéfiniment, sans révocation possible. **P2** |
| Auth déléguée à Clerk | ✅ Bon point | Gestion de session/token correctement déléguée au SDK, pas de manipulation de token en clair dans le code applicatif |
| Flag `authed` stocké en localStorage via Zustand | **Faible** | Flag de confort UI, pas un jeton de session — risque faible tant qu'aucune route sensible ne s'appuie dessus sans re-vérification Clerk |
| npm audit / npm outdated | **Non vérifié** | Impossible à exécuter dans l'environnement d'audit (proxy réseau bloqué) — à exécuter manuellement avant publication |
| Pas de politique de confidentialité / CGU trouvée dans le repo | **Bloquant pour les stores** | Obligatoire pour Apple App Store et Google Play |
| CORS / headers de sécurité | **Non applicable en l'état** | Pas de backend propre à configurer ; vercel.json ne définit aucun header de sécurité (CSP, X-Frame-Options, etc.) |

**Aucune vulnérabilité critique active (type XSS/injection exploitable) identifiée par lecture de code**, mais cela reste une revue statique, pas un pentest.

---

## 9. Audit performances

- Lazy loading de toutes les pages + découpage manuel des chunks (vendor/motion/store/map/clerk/icons) : bonnes pratiques déjà en place.
- Sourcemaps désactivées en production : bon point sécurité/perf.
- Cache localStorage/IndexedDB à 2 niveaux pour météo et devises (TTL 2h/48h et 15 min) : optimisation pertinente.
- **Risque identifié mais non mesuré** : les composants de 2000+ lignes (Overview, Parcours) peuvent souffrir de re-renders coûteux si la mémoïsation n'est pas rigoureuse — un bug de gel déjà corrigé est mentionné en commentaire dans Weather.tsx, signe que ce type de problème s'est déjà produit dans le projet.
- **Non vérifié** : taille réelle du bundle final, score Lighthouse, temps de chargement réel.

---

## 10. Audit tests et fiabilité

**Aucun test n'existe dans ce projet** : pas de fichier `*.test.*`/`*.spec.*`, pas de Vitest/Jest/Playwright/Cypress installé, pas de script `test` dans package.json.

Seule vérification automatisée possible et réalisée : `tsc --noEmit` → **0 erreur**. Signal positif sur la cohérence des types, mais ce n'est pas un test fonctionnel.

**Aucune fonctionnalité de cet audit n'a été déclarée « terminée et vérifiée » sur la seule base de l'existence du code.**

---

## 11. Audit compatibilité iOS et Android

**Constat central : il n'existe aujourd'hui aucun chemin vers une app native iOS/Android.** Pas de Capacitor, pas de React Native, pas de dossiers android/ios. L'application est une **PWA pure** (vite-plugin-pwa, manifest « My Plan'Air », icônes 192/512/maskable présentes dans public/).

**Bonne nouvelle technique** : une stack React + Vite + TypeScript est **directement compatible avec Capacitor** sans réécriture.

Éléments à vérifier/adapter pour le passage au natif :
- Comportement tactile et safe areas (iOS/Android) — non vérifié.
- Hors-ligne réel — non testé.
- Notifications push : actuellement **absentes** (NotificationCenter est un centre d'alertes local, pas du push serveur) — à construire entièrement si souhaité.
- Permissions natives (caméra, fichiers) : `ImageCropSheet.tsx` utilise probablement l'input file web — à adapter aux plugins Capacitor Camera/Filesystem.
- Stockage : localStorage/IndexedDB fonctionnent dans une WebView Capacitor, mais un utilisateur qui désinstalle l'app perdra tout (cf. section 7).

---

## 12. Préparation App Store (Apple)

| Exigence | État |
|---|---|
| Projet Xcode | **Absent** |
| Bundle Identifier | **Non défini** |
| Certificats/signature, Provisioning Profiles | **Non applicable en l'état** |
| Icônes app | Icônes PWA présentes, à redimensionner/adapter au jeu complet iOS |
| Splash screen | Splash animé React existant, pas de Launch Screen natif iOS |
| Politique de confidentialité | **Absente du repo** |
| Déclaration des données collectées (App Privacy) | **Non préparée** |
| Suppression de compte | Bouton existant dans SettingsSheet.tsx, effet réel non vérifié |
| TestFlight | **Non préparé** |

---

## 13. Préparation Google Play

| Exigence | État |
|---|---|
| Projet Android | **Absent** |
| Package Name | **Non défini** |
| Signature / génération AAB | **Non applicable en l'état** |
| Icônes | Base disponible, à décliner en adaptive icons |
| Politique de confidentialité | **Absente** |
| Data Safety | **Non préparé** |
| Classification du contenu | **Non entamée** |
| Tests internes/fermés | **Non applicable en l'état** |
| Compatibilité Android | **Non vérifiée** |

---

## 14. Liste détaillée des bugs et anomalies

| # | Fichier | Problème | Conséquence | Solution recommandée | Priorité |
|---|---|---|---|---|---|
| 1 | features/dashboard/Dashboard.tsx | Carte « Communauté » avec onClick no-op | Clic sans effet, confusion utilisateur | Griser ou retirer le CTA tant que la feature n'existe pas | P2 |
| 2 | features/collaboration/TeamTab.tsx | Feature temps réel documentée comme non implémentée | Attente utilisateur non comblée | Masquer l'entrée ou livrer la V2 Supabase avant publication | P1 |
| 3 | features/decouvrir/plannerFallback.ts | Données de planification potentiellement de démonstration | Fausses promesses de prix/itinéraire | Clarifier dans l'UI le caractère indicatif, finaliser le Worker | P1 |
| 4 | App.tsx route /admin-test | Accessible à tout compte connecté | Exposition d'infos internes | Ajouter un contrôle de rôle | P1 |
| 5 | features/share/ShareView.tsx | Lien de partage non signé/non expirant | Fuite de données si lien diffusé | Signer/expirer le payload | P2 |
| 6 | features/profil/Profil.tsx, features/documents/Documents.tsx | CTA « Export PDF », « Passer Pro » non fonctionnels | Impression de produit inachevé | Masquer ou implémenter avant publication | P1 |
| 7 | features/auth/AuthPage.tsx | Connexion email désactivée | Réduit les options de connexion | Réactiver ou retirer le bouton | P2 |
| 8 | Ensemble du store | Aucune sauvegarde cloud des données | Perte de données totale possible | Prioriser une synchronisation serveur | P1 |
| 9 | .env.local | Clés VITE_ inutilisées | Risque de fuite future | Retirer le préfixe VITE_ ou supprimer/documenter | P2 |
| 10 | Global | Aucun test automatisé | Pas de garantie de non-régression | Mettre en place Vitest + tests critiques | P1 |

---

## 15. Points forts

1. Stack moderne et cohérente (React 19, TypeScript strict, Vite 7).
2. Couverture fonctionnelle large et réellement implémentée pour la majorité des modules.
3. Store central unique, typé, avec migration de schéma déjà prévue.
4. Bonnes pratiques de performance déjà présentes (lazy loading, code splitting, caches API).
5. Hygiène des secrets correcte (rien en dur, .gitignore propre).
6. Auth déléguée à un prestataire reconnu (Clerk).
7. Documentation de roadmap existante (PROGRESS.md) montrant une intention de démarche structurée.

## 16. Points faibles

1. Zéro test automatisé sur l'ensemble du projet.
2. Aucune intégration mobile native — publication stores impossible en l'état.
3. Fichiers composants excessivement volumineux (jusqu'à 2500 lignes).
4. Plusieurs placeholders visibles utilisateur non assumés clairement dans l'UI.
5. Absence totale de sauvegarde cloud des données utilisateur.
6. Route d'administration insuffisamment protégée.
7. Aucune politique de confidentialité / CGU.
8. Aucun audit de sécurité offensif ni npm audit exécuté à ce jour.

---

## 17. Notation détaillée sur 100

| Domaine | Note | Justification synthétique |
|---|---|---|
| Architecture | 70 | Structure feature-based saine, mais fichiers monolithiques pénalisants |
| Qualité du code | 62 | Types stricts, zéro erreur TS, mais zéro lint/tests, gros fichiers |
| Frontend | 68 | Riche et cohérent, mais plusieurs placeholders non assumés |
| Backend | 55 | Pas de backend propre, tout repose sur un Worker externe non audité, pas de sauvegarde cloud |
| UX/UI | 65 | Design cohérent apparent, mais non vérifié visuellement, et CTA morts |
| Sécurité | 58 | Pas de secret exposé, mais route admin ouverte + lien de partage non protégé |
| Performance | 60 | Bonnes pratiques en place mais rien mesuré |
| Tests | 10 | Inexistants |
| Compatibilité mobile | 25 | Aucun wrapper natif, mais stack compatible Capacitor sans réécriture |
| Préparation App Store | 10 | Aucune brique native/légale existante |
| Préparation Google Play | 10 | Idem |
| Maintenabilité | 58 | Correcte à moyen terme, dégradée par les très gros fichiers |

**Note globale de maturité du projet : 48/100.**

---

## 18. Risques techniques majeurs (Top 5)

1. Absence de sauvegarde cloud des données utilisateur.
2. Zéro test — chaque évolution future peut casser silencieusement des fonctionnalités existantes.
3. Aucun wrapper mobile natif — bloque toute soumission aux stores.
4. Dette de « fausses promesses » UI (placeholders, fallback planner) — risque de rejet en revue store.
5. Surface de sécurité non auditée en profondeur (route admin ouverte, npm audit jamais lancé, pas de politique de confidentialité).

---

## 19. Recommandations prioritaires

1. Protéger `/admin-test` et exécuter npm audit/npm outdated dès que possible.
2. Décider et implémenter une stratégie de persistance cloud.
3. Introduire Capacitor pour obtenir des projets iOS/Android buildables, sans réécriture.
4. Mettre en place une suite de tests minimale avant toute refactorisation des gros fichiers.
5. Assainir l'UI des placeholders avant toute soumission store.

---

*Pour la roadmap détaillée (étapes, priorités, estimations de temps), voir `ROADMAP.md`.*
