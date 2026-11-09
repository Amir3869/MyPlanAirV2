# ROADMAP — MyTripV3 vers publication App Store / Google Play

Légende priorité : **P0** bloquant/critique · **P1** indispensable avant publication · **P2** important · **P3** amélioration secondaire.

Référence : voir `AUDIT.md` pour le détail des constats justifiant chaque étape.

---

## Étape 1 — Corrections critiques et sécurisation (P0/P1)
- **Objectifs** : fermer les risques sécurité connus.
- **Tâches** : protéger `/admin-test` (rôle/whitelist) ; exécuter `npm audit`/`npm outdated` et traiter les CVE ; décider du sort de `VITE_GROQ_API_KEY`/`VITE_SUPABASE_*` ; sécuriser ou documenter le lien de partage.
- **Fichiers concernés** : `src/App.tsx`, `src/features/admin/UsageConsole.tsx`, `.env.local`, `src/features/share/ShareView.tsx`.
- **Dépendances** : accès réseau npm rétabli.
- **Priorité** : P0 (route admin), P1 (reste).
- **Difficulté** : faible à moyenne. **Durée estimée** : 2-4 jours.
- **Critère de fin** : aucun accès non autorisé possible, `npm audit` exécuté et rapport traité.

## Étape 2 — Stabilisation de l'architecture (P1/P2)
- **Objectifs** : réduire le risque de maintenabilité avant d'ajouter des fonctionnalités.
- **Tâches** : découper `Overview.tsx`, `Parcours.tsx`, `TripCreator.tsx` en sous-composants/hooks ; introduire ESLint ; nettoyer `tsconfig.app.json`/`tsconfig.node.json` vides et la règle Workbox morte.
- **Priorité** : P2. **Difficulté** : moyenne-élevée (gros fichiers). **Durée estimée** : 1-2 semaines.
- **Critère de fin** : plus aucun fichier > ~600 lignes dans les modules retravaillés, lint propre.

## Étape 3 — Correction des bugs (P1/P2)
- **Tâches** : traiter les 10 anomalies listées dans `AUDIT.md` section 14 (CTA morts, placeholders, cohérence auth email).
- **Priorité** : P1 pour celles visibles utilisateur avant store, P2 sinon.
- **Durée estimée** : 3-5 jours.

## Étape 4 — Finalisation des fonctionnalités (P1)
- **Objectifs** : décider pour chaque placeholder (« Communauté », « Export PDF », « Passer Pro », « Collaboration temps réel », planner IA fallback) : masquer ou finir.
- **Priorité** : P1 (condition de crédibilité produit en revue store).
- **Durée estimée** : 1-3 semaines selon arbitrage.

## Étape 5 — Amélioration UX/UI (P2)
- **Tâches** : vérification visuelle réelle (lancer l'app), audit accessibilité (axe/Lighthouse), cohérence responsive sur device réel.
- **Durée estimée** : 3-5 jours.

## Étape 6 — Optimisation des performances (P2)
- **Tâches** : `npm run build` + analyse bundle, audit Lighthouse, corriger régressions éventuelles de re-render dans les gros composants.
- **Durée estimée** : 2-3 jours.

## Étape 7 — Mise en place des tests (P1)
- **Tâches** : installer Vitest + Testing Library ; tests unitaires sur `tripStore.ts`, `expenseHelpers.ts`, `dateHelpers.ts` ; tests d'intégration sur le flux création de voyage et l'auth ; au moins un test e2e (Playwright) du parcours critique.
- **Priorité** : P1. **Durée estimée** : 1-2 semaines.
- **Critère de fin** : couverture des flux critiques, CI capable de faire échouer une PR en cas de régression.

## Étape 8 — Préparation de l'environnement de production (P1)
- **Tâches** : mettre en place CI (GitHub Actions) : build + typecheck + tests à chaque PR ; variables d'env de prod revues ; décision finale sur la persistance cloud.
- **Durée estimée** : 3-5 jours.

## Étape 9 — Adaptation iOS et Android (P0 pour l'objectif mobile)
- **Tâches** : intégrer Capacitor, générer les projets Xcode/Android Studio, remplacer les accès fichier/caméra par les plugins natifs (`ImageCropSheet.tsx`), définir Bundle ID/Package Name, gérer safe areas et comportement offline réel.
- **Dépendances** : étapes 1-2 idéalement terminées avant.
- **Difficulté** : moyenne. **Durée estimée** : 2-3 semaines.

## Étape 10 — Tests sur appareils réels (P1)
- **Tâches** : tests manuels iPhone/Android réels (tactile, clavier, notifications, permissions), corrections associées.
- **Durée estimée** : 1 semaine.

## Étape 11 — Préparation dossiers et graphismes stores (P1)
- **Tâches** : jeux d'icônes complets iOS/Android, captures d'écran, politique de confidentialité, CGU, fiche Data Safety (Google) et App Privacy (Apple).
- **Durée estimée** : 3-5 jours (hors rédaction juridique spécialisée).

## Étape 12 — Tests TestFlight et Google Play internes (P1)
- **Durée estimée** : 1 semaine (incluant délai de propagation/feedback).

## Étape 13 — Soumission aux plateformes (P0)
- **Durée estimée** : variable (délai de revue Apple/Google hors contrôle, généralement 1-7 jours).

## Étape 14 — Corrections post-revue (P1)
- **Durée estimée** : 2-5 jours (provision).

## Étape 15 — Publication officielle (P0)

## Étape 16 — Maintenance et suivi post-lancement (P2)
- **Tâches** : monitoring d'erreurs (ex. Sentry), suivi des avis stores, cycle de correctifs.

---

## Estimation globale de charge

| Phase | Durée basse | Durée haute |
|---|---|---|
| Sécurisation + stabilisation + bugs (étapes 1-4) | 2,5 sem. | 5 sem. |
| UX/perf/tests/prod (étapes 5-8) | 3 sem. | 4,5 sem. |
| Mobile + tests device + stores (étapes 9-13) | 5 sem. | 7 sem. |
| Post-revue + lancement (étapes 14-15) | 0,5 sem. | 1,5 sem. |
| **Total avant 1ʳᵉ publication** | **≈ 11 semaines** | **≈ 18 semaines** |

Fourchette réaliste pour 1 à 2 développeurs à temps plein, hors délais de revue des stores (non maîtrisables).

---

## Checklist finale de mise en production

- [ ] `/admin-test` protégée par rôle
- [ ] `npm audit` exécuté et vulnérabilités traitées
- [ ] Politique de confidentialité + CGU publiées et liées dans l'app
- [ ] Tous les CTA « Bientôt » masqués ou finis
- [ ] Stratégie de sauvegarde des données utilisateur décidée et implémentée (ou limitation clairement communiquée)
- [ ] Suite de tests automatisés couvrant les flux critiques, intégrée en CI
- [ ] Capacitor intégré, build iOS et Android générés et testés sur device réel
- [ ] Icônes, splash screens et captures d'écran conformes aux specs Apple/Google
- [ ] TestFlight et Google Play internal testing validés
- [ ] Monitoring d'erreurs en place avant lancement public

---

## Décisions produit prises le 06/11/2026

Suite à l'audit et à une discussion de cadrage, les arbitrages suivants sont actés :

**Authentification** : Clerk est conservé (free tier), pas de backend/table utilisateurs custom. Raison : l'objectif du produit est 0€ de coût d'exploitation et zéro donnée de voyage stockée côté serveur (tout reste sur le téléphone de l'utilisateur) — construire un backend avec gestion de mots de passe irait à l'encontre de ces deux objectifs. La piste Supabase entamée (variables d'env inutilisées) est abandonnée.

**Fonctionnalités supprimées** : Notifications, Communauté, Export PDF.

**Fonctionnalités conservées et prioritaires** (piliers du produit, potentiel viral) : Documents, Météo, Devise, Souvenirs, World Map / Globe 3D.

**Fonctionnalités conservées mais à faire évoluer** :
- Chat ARIA : conservé, mais différencié par palier d'abonnement (capacités réduites en Free, complètes en Premium).
- Suggestions IA en cours de voyage : à réduire en nombre (actuellement jugées excessives).
- Planificateur IA (Découvrir) : priorité d'amélioration haute — c'est le levier de rétention et la porte d'entrée vers la marketplace d'affiliation.

**Nouveau modèle économique** — l'app ne sera pas gratuite (aucune autre source de revenu) :
- Compte **Free** : avec publicités (format à définir), ARIA limité.
- Compte **Premium/Pro** : payant (mensuel / annuel / à l'essai par voyage — modalités exactes à définir), ARIA complet.
- **Marketplace / affiliation** : revenu transverse lié au planificateur IA et aux partenaires déjà en place (assurance, SIM/eSIM), extensible plus tard.

**Reste à trancher plus tard** (non bloquant pour la suite) :
- Portée exacte de l'offre "à l'essai par voyage".
- Format des publicités (bannières vs interstitiel/vidéo récompensée).
- Gestion des rôles (admin/user) côté Clerk.
- Reprise des assets visuels/logos jugés flous/pixelisés — à prévoir avant soumission stores.
- Tri fin des fonctionnalités mortes ou à moitié développées, module par module — à faire une fois le socle testé (voir méthode ci-dessous).

## Méthode de travail actée

Avant de retoucher le périmètre fonctionnel ou de développer la monétisation, l'ordre convenu est :
1. Stabiliser et ajouter des tests sur l'existant (étapes 1-3 du plan ci-dessus).
2. Observer ce qui marche réellement une fois testé/exécuté (rien n'a encore tourné en conditions réelles).
3. Décider garder / couper / améliorer, fonctionnalité par fonctionnalité.
4. Construire les nouveautés (monétisation, marketplace, Premium) en dernier, une fois le socle fiable.

*Ce fichier sera mis à jour au fil de l'avancement du projet plutôt que considéré comme figé.*
