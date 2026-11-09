# CLAUDE.md — MyPlan'air

Règles permanentes de développement, d'analyse et surtout d'optimisation de la consommation de tokens pour ce projet. À lire en entier au début de chaque session (il est volontairement court).

**Langue : toujours répondre en français, jamais en anglais.**

## 1. Identité du projet

- Nom : MyPlan'air (nom de package npm : `mytrip`).
- Stack confirmée (package.json) : React 19.2, React Router 7, Zustand 5, Clerk (`@clerk/clerk-react`), Tailwind, Framer Motion, Leaflet/react-leaflet, react-globe.gl, Vite 7, TypeScript strict, Vitest 4 + Testing Library pour les tests.
- Scripts : `npm run dev`, `npm run build`, `npm test` (vitest run), `npm run test:watch`, `npm run test:ui`.
- Auth : Clerk uniquement, pas de backend custom, pas de base de données utilisateur — objectif coût 0€ / pas de données utilisateur stockées côté serveur.
- Architecture : app React en `src/features/<module>/`, store global Zustand (`src/store/tripStore.ts`), persistance locale (localStorage).

## 2. Documentation de référence — ne pas refaire ce travail

- `AUDIT.md` : audit technique complet déjà réalisé (score, constats, dette technique).
- `ROADMAP.md` : décisions produit actées (features gardées/coupées, modèle de monétisation Free+Ads / Premium / marketplace affiliée) et méthode de travail validée.
- Consulter ces fichiers seulement quand la tâche le nécessite réellement. Ne jamais recopier leur contenu intégral ailleurs. Ne jamais relancer un audit global ou refaire une analyse déjà documentée dedans.

## 3. Optimisation des tokens (priorité absolue)

- Une conversation = une tâche. Ne pas enchaîner des sujets indépendants dans la même session fleuve : plus l'historique grandit, plus **chaque** tour suivant coûte cher (tout l'historique est renvoyé à chaque message).
- Lire uniquement les fichiers directement concernés par la demande. Utiliser `offset`/`limit` ou `Grep` pour cibler une portion de fichier plutôt que de lire un gros fichier en entier.
- Ne jamais relire un fichier déjà lu et inchangé dans la session en cours.
- Éviter les recherches globales répétées (pas de scan de tout le projet pour une petite demande).
- Limiter la taille des sorties affichées (pas de dump de milliers de lignes de code ou de logs).
- Ne pas lancer plusieurs sous-agents pour une tâche simple ; réserver les sous-agents (fork) aux explorations volumineuses, justement pour que leur contenu ne pollue pas le contexte principal.
- Ne pas relancer toute la suite de tests (`npm test`) après une petite modification ciblée — lancer uniquement le(s) fichier(s) de test concernés (`npx vitest run chemin/du/fichier.test.tsx`).
- Ne pas répéter des explications déjà données dans la session.
- Réponses courtes et directes par défaut ; pas de rapport long sauf demande explicite.

## 4. Mode audit

Un audit (global ou ciblé) doit être demandé explicitement. Par défaut : pas d'audit, pas de relecture complète du projet, pas de modification de code, pas de création de tests. Un audit ciblé ne couvre que le module concerné et ses dépendances directes.

## 5. Mode développement

Pour chaque demande :
1. Comprendre précisément le besoin.
2. Identifier les fichiers strictement nécessaires.
3. Annoncer brièvement le périmètre de travail avant de modifier.
4. Modifier uniquement ce qui est nécessaire.
5. Respecter l'architecture et les conventions déjà en place.
6. Vérifier uniquement la fonctionnalité concernée (pas toute l'app).
7. Signaler les problèmes rencontrés, sans les corriger silencieusement si ça sort du périmètre demandé.

Ne jamais profiter d'une petite demande pour refactoriser plus large que nécessaire.

## 6. Mode tests

- La suite de tests existe déjà (`src/**/*.test.ts(x)`, config dans `vitest.config.ts`). Vérifier si un test couvre déjà le cas avant d'en écrire un nouveau.
- Ne créer que les tests réellement nécessaires à la tâche en cours.
- Toute création massive de tests (plusieurs fichiers / plusieurs modules) nécessite une autorisation explicite préalable.
- Préférer les tests ciblés (`npx vitest run <fichier>`) à `npm test` complet pendant l'itération.

## 7. Gestion du contexte entre sessions

- Garder uniquement le contexte utile à la tâche en cours ; ne pas transporter l'historique de modules indépendants d'une tâche à l'autre.
- En cas de changement de module/sujet indépendant, démarrer une **nouvelle conversation** plutôt que de continuer celle en cours.
- Après une tâche importante, donner un résumé court (modifications faites, points restants) — pas un rapport exhaustif.
- Pour redémarrer rapidement une session : donner le contexte minimal nécessaire ("on travaille sur le module X, voir ROADMAP.md section Y") plutôt que de faire relire tout l'historique.

## 8. Sécurité et qualité

- Ne jamais supprimer une fonctionnalité existante sans autorisation explicite.
- Ne jamais exposer de clés API, secrets, identifiants (y compris proxy réseau) dans le code, les commandes ou les réponses.
- Respecter l'authentification/autorisation existante (Clerk).
- Éviter d'ajouter des dépendances non nécessaires.
- Signaler uniquement les vulnérabilités réellement constatées, pas de spéculation.

## 9. Autorisation requise avant

- Analyse globale du projet.
- Refonte architecturale.
- Modification massive de fichiers.
- Création de nombreux tests d'un coup.
- Migration importante (ex. changement de store, de routeur, d'auth).
- Installation de dépendances significatives.
- Toute opération dont le coût en tokens est susceptible d'être élevé.

Une demande de développement classique n'est jamais une autorisation implicite de refonte globale.
