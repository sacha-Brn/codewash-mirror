# Registre de dette technique

Document **vivant** : il décrit ce qui ne va pas dans le code, l'impact, et ce qu'on prévoit d'en faire.

- Chaque PR de refactoring ou de correction **cite l'identifiant** `DEBT-xx` qu'elle traite et met à jour son statut ici.
- Toute dette découverte **ou introduite** est ajoutée ici, même si on ne la traite pas.
- En fin de projet, ce fichier devient la carte de la dette résiduelle transmise à l'équipe suivante.

Les chemins de code sont relatifs à `CodeWashGame/CodeWashGame/`.

---

## Légende

| Champ | Valeurs |
|---|---|
| **Impact** | Critique · Élevé · Moyen · Faible : gravité pour le joueur ou l'équipe si le problème se produit |
| **Risque** | Élevé · Moyen · Faible : probabilité que le problème se produise |
| **Effort** | S (< 2 h) · M (½ journée) · L (1 jour) · XL (> 1 jour) |
| **Priorité** | P1 (à traiter maintenant) · P2 (pendant le projet) · P3 (si le temps le permet) |
| **Statut** | `Identifié` · `Figé` (comportement verrouillé par un test de caractérisation) · `En cours` · `Résolu` · `Accepté` (laissé volontairement, avec justification) |

---

## 1. Carte du code

> _À compléter : modules principaux, graphe d'appels, où vit l'état, où se font les I/O
> (stockage, audio, reconnaissance vocale, réseau)._

## 2. Métriques de départ

Mesures prises sur le **code tel que reçu** (commit `afd0585`), avant tout refactoring.
Pour les reproduire : `git worktree add /tmp/orig afd0585`, puis lancer les commandes depuis
`/tmp/orig/CodeWashGame/CodeWashGame` (lien symbolique vers un `node_modules` installé pour ESLint).

| Métrique | Valeur de départ | Outil et commande |
|---|---|---|
| Couverture de tests | **0 %** (aucun test) | `npm run test:coverage` (Vitest + v8) |
| Lignes de code (hors blancs et commentaires) | **5 832** dans 27 fichiers (JSX 4 885, JS 903) | `npx cloc@2 src electron` |
| Duplication | **5,95 %** : 9 clones, 324 lignes dupliquées | `npx jscpd@4 src --min-tokens 50` |
| Complexité cyclomatique | 396 fonctions, moyenne 2,8 ; **14 fonctions > 10**, **5 > 20** | `npx eslint src --rule '{"complexity":["warn",0]}' -f json` |
| Poids des assets | **242 Mo** dont **191 Mo de musique WAV** (`sounds/bgm`, 6 fichiers de 12 à 50 Mo) ; 16 fichiers > 1 Mo | `du -sh public/assets/*` |
| Bundle JS / CSS (build) | 362,8 Ko (102,6 Ko gzip) / 61,8 Ko (11,1 Ko gzip) | `npm run build` |
| Lint | 0 erreur (avertissements : voir commit `0158141`) | `npm run lint` |
| Format | 34 fichiers sur 34 non conformes à Prettier | `npx prettier --check .` |

**Fichiers les plus gros**

| Fichier | Lignes |
|---|---|
| `src/App.jsx` | 1 492 |
| `src/components/ui/GlobalStyles.jsx` | 1 302 |
| `src/components/skills/SkillCard.jsx` | 778 |
| `src/constants/gameData.jsx` | 416 |

**Fonctions les plus complexes** (complexité cyclomatique ; au-delà de 10, une fonction est considérée comme difficile à tester)

| Complexité | Emplacement |
|---|---|
| **107** | `src/components/skills/SkillCard.jsx:65` (composant `SkillCard` entier) |
| 31 | `src/App.jsx:94` (fusion de la sauvegarde dans `loadSkills`) |
| 27 | `src/components/drawers/MenuDrawer.jsx:142` |
| 24 | `src/App.jsx:569` |
| 21 | `src/components/drawers/CosmeticsDrawer.jsx:108` |
| 17 | `src/App.jsx:444` |
| 16 | `src/App.jsx:49` (composant `App`) et `src/App.jsx:1387` |

Ces chiffres servent de point de comparaison : on les remesure après chaque refactoring important
(section « Historique »).

## 3. Matrice des risques et plan d'attaque

> _À compléter : matrice impact × probabilité, ordre de traitement des points chauds et justification._

---

## 4. Registre

### Vue d'ensemble

| ID | Titre | Emplacement | Impact | Risque | Effort | Priorité | Statut |
|---|---|---|---|---|---|---|---|
| [DEBT-01](#debt-01) | Sauvegarde corrompue écrasée sans prévenir | `src/App.jsx` `loadSkills` + effet de sauvegarde | Critique | Moyen | M | P1 | Figé |
| [DEBT-02](#debt-02) | Écran blanc si les profils sont corrompus | `src/App.jsx:51-52` | Critique | Moyen | S | P1 | Figé |
| [DEBT-03](#debt-03) | Erreurs attrapées et ignorées au premier lancement | `src/App.jsx` `loadTheme`, `loadStats` | Moyen | Élevé | S | P2 | Figé |
| [DEBT-04](#debt-04) | Ancienne clé de sauvegarde jamais nettoyée | `src/App.jsx:89,175,188,221` | Faible | Élevé | S | P3 | Figé |
| [DEBT-05](#debt-05) | `skill_mastery` au palier max sans compétence | `src/constants/achievements.js:105,109` | Faible | Faible | S | P3 | Figé |
| [DEBT-06](#debt-06) | Date de connexion calculée en UTC | `src/utils/achievementUtils.js:190`, `src/App.jsx:1117` | Moyen | Élevé | S | P2 | Figé |
| [DEBT-07](#debt-07) | Images et sons perdus sous une URL autre que `/` | ~200 chemins `assets/…` relatifs, `vite.config.js:7` | Moyen | Faible | M | P2 | Identifié |
| [DEBT-08](#debt-08) | Le thème Spy garde le fond Minecraft | `src/constants/gameData.jsx:205` | Moyen | Élevé | S | P1 | Identifié |
| [DEBT-09](#debt-09) | 4 fichiers de thème référencés mais absents | `src/constants/gameData.jsx` (`THEME_CONFIG`) | Moyen | Élevé | S | P2 | Identifié |
| [DEBT-10](#debt-10) | Code d'origine non formaté (exception au contrôle Prettier) | 29 fichiers listés dans `.prettierignore` | Faible | Élevé | M | P3 | Accepté (cliquet) |

---

### DEBT-01

**Sauvegarde corrompue écrasée sans prévenir : perte de progression silencieuse**

- **Emplacement** : `src/App.jsx`, `loadSkills` (l. 56-170, `catch` l. 168) et l'effet de sauvegarde (l. 283-289).
- **Problème** (*silent error*) : si `heroSkills_v23_p<N>` contient du JSON illisible, `loadSkills` attrape l'erreur, la logue en `console.warn` et repart d'une partie neuve. L'effet de sauvegarde s'exécute aussitôt et **remplace la sauvegarde corrompue par la partie neuve**. Le joueur perd toute sa progression sans message, et la donnée d'origine est détruite : impossible de la récupérer ensuite.
- **Impact** : Critique. Perte définitive de la progression d'un enfant.
- **Risque** : Moyen. Une modification manuelle, une extension de navigateur ou un futur changement de format de sauvegarde suffit.
- **Effort** : M.
- **Priorité** : P1.
- **Statut** : Figé.
- **Preuve** : `src/__tests__/persistence.characterization.test.jsx` › *sauvegardes corrompues* › « heroSkills_v23_p1 corrompu : pas de crash, mais la sauvegarde est écrasée ».
- **Piste** : lecture via un module `storage` unique avec `safeParse(raw, fallback)`. En cas d'échec, copier la donnée brute sous une clé de secours (`…_corrupted_<date>`) avant toute écriture, et informer le joueur.

### DEBT-02

**Écran blanc si les noms ou le statut parent des profils sont corrompus**

- **Emplacement** : `src/App.jsx:51` (`heroProfileNames_v1`) et `src/App.jsx:52` (`heroParentStatus_v1`).
- **Problème** (*fragile parser*) : `JSON.parse` est appelé directement dans l'initialiseur de `useState`, **sans `try/catch`**. Une valeur illisible lève une `SyntaxError` au rendu de `App` : toute l'application plante et l'écran reste blanc.
- **Impact** : Critique. Le jeu est inutilisable tant que le `localStorage` n'est pas vidé à la main.
- **Risque** : Moyen.
- **Effort** : S.
- **Priorité** : P1.
- **Statut** : Figé.
- **Preuve** : `src/__tests__/persistence.characterization.test.jsx` › *sauvegardes corrompues* › « JSON corrompu : comportement actuel figé (parser fragile) » (snapshot `"SyntaxError"`).
- **Piste** : même `safeParse` que DEBT-01, avec les valeurs par défaut actuelles comme repli. Le test changera d'attente : « l'app démarre avec les profils par défaut ».
- **Remarque** : `src/App.jsx:50` lit `currentProfile_v1` avec `parseInt` sans vérification. Une valeur non numérique donnerait `NaN`, donc une clé `heroSkills_v23_pNaN`. Non testé pour l'instant.

### DEBT-03

**Erreurs attrapées et ignorées à chaque premier lancement**

- **Emplacement** : `src/App.jsx`, `loadTheme` (l. 172-183) et `loadStats` (l. 185-199).
- **Problème** (*silent error*) : sans sauvegarde, `saved` vaut `null`. `JSON.parse(null)` renvoie `null`, puis `.theme` ou `.stats` lève une `TypeError`. Elle est attrapée et logue `Failed to parse theme:` / `Failed to parse stats:`. Le comportement final est correct, mais il repose sur une exception, et les vrais problèmes sont noyés parmi ces faux avertissements.
- **Impact** : Moyen. Masque les vraies erreurs (voir DEBT-01) et rend le diagnostic difficile.
- **Risque** : Élevé. Se produit à **chaque** nouveau profil.
- **Effort** : S.
- **Priorité** : P2.
- **Statut** : Figé.
- **Preuve** : `src/__tests__/persistence.characterization.test.jsx` › « premier lancement : avertissements console (erreurs attrapées) ».
- **Piste** : tester l'absence de sauvegarde avant de la parser. Même logique de lecture factorisée dans `loadSkills`, `loadTheme`, `loadStats` et `getProfileStats`, qui dupliquent aujourd'hui la lecture de la clé (*duplication*).

### DEBT-04

**Ancienne clé `heroSkills_v23` jamais nettoyée après migration**

- **Emplacement** : `src/App.jsx:89, 175, 188, 221` (lecture de repli pour le profil 1). La seule suppression est à la réinitialisation, l. 967.
- **Problème** : la migration vers `heroSkills_v23_p1` recopie les données mais laisse l'ancienne clé. Elle est relue en repli à chaque fois que la nouvelle clé est absente, donc une sauvegarde obsolète peut « revenir » (par exemple si `_p1` est supprimée).
- **Impact** : Faible.
- **Risque** : Élevé. Concerne tous les joueurs ayant une ancienne sauvegarde.
- **Effort** : S.
- **Priorité** : P3.
- **Statut** : Figé.
- **Preuve** : `src/__tests__/persistence.characterization.test.jsx` › *migration* › « ne supprime pas l'ancienne clé après migration ».
- **Piste** : migration explicite, exécutée une seule fois au démarrage : copier, vérifier, supprimer l'ancienne clé. Ensuite, retirer les 4 lectures de repli.

### DEBT-05

**Succès `skill_mastery` au palier maximum quand il n'y a aucune compétence**

- **Emplacement** : `src/constants/achievements.js:105` (`getProgress`) et `:109` (`getProgressText`).
- **Problème** : `Math.min(...[])` vaut `Infinity`. Avec un objet `skills` vide, la progression vaut `Infinity` : palier 7 (« Mythic ») et texte « 0/6 skills at level Infinity+ ».
- **Impact** : Faible. Dans le jeu actuel, `skills` contient toujours les 6 compétences.
- **Risque** : Faible. Mais devient réel si on ajoute un mode ou un jeu qui démarre sans compétence (mission *New game*).
- **Effort** : S.
- **Priorité** : P3.
- **Statut** : Figé.
- **Preuve** : `src/utils/__tests__/achievementUtils.characterization.test.js` › « skill_mastery sans aucune compétence -> palier max ».
- **Piste** : renvoyer 0 si la liste est vide.

### DEBT-06

**Date de connexion calculée en UTC au lieu de l'heure locale**

- **Emplacement** : `src/utils/achievementUtils.js:190` (`recordLoginDate`) et `src/App.jsx:1117`, qui **duplique** la même logique au lieu d'appeler `recordLoginDate`.
- **Problème** : `new Date().toISOString()` donne la date UTC. En France, entre 0 h et 1 h (2 h en été), le jeu considère qu'on est encore la veille. Le succès `dedicated` (« jouer 3 jours différents ») peut ne pas se débloquer, ou se débloquer un jour de travers.
- **Impact** : Moyen. Succès faussé, et confusion possible pour les parents et enseignants.
- **Risque** : Élevé. Systématique pour tout fuseau ≠ UTC sur cette plage horaire.
- **Effort** : S.
- **Priorité** : P2.
- **Statut** : Figé.
- **Preuve** : `src/utils/__tests__/achievementUtils.characterization.test.js` › « utilise la date UTC ».
- **Piste** : horloge injectée (`clock.today()` en heure locale), un seul point de calcul utilisé par `App.jsx` et `achievementUtils.js`.

### DEBT-07

**Toutes les images et tous les sons disparaissent quand le jeu est ouvert sous une URL autre que `/`**

- **Emplacement** : les chemins d'assets sont écrits en **relatif** (`'assets/…'`, sans `/` initial) et en dur, à environ 200 endroits : `src/constants/gameData.jsx` (173), `src/utils/soundManager.js` (17), `src/constants/assets.js` (10), `src/components/skills/SkillCard.jsx` (2, dont `new Audio(\`assets/sounds/axolotl/…\`)` l. 102). Origine du choix : `vite.config.js:7` (`base: './'`, nécessaire pour qu'Electron charge `dist/index.html` en `file://`).
- **Problème** : un chemin relatif se résout par rapport à l'URL de la page. Sur `http://localhost:5173/quelque_chose/`, le navigateur demande `/quelque_chose/assets/themes/minecraft.png`. Le serveur Vite n'a pas ce fichier et renvoie `index.html` (**HTTP 200, `text/html`**) à la place de l'image. Toutes les icônes sont remplacées par le repli 📦 de `SafeImage`, et les sons échouent sans message (*silent error*). Reproduit avec `curl` : `/assets/themes/minecraft.png` → `image/png`, `/quelque_chose/assets/themes/minecraft.png` → `text/html`.
- **Impact** : Moyen. Jeu visuellement cassé. **Electron n'est pas touché** : la page y est toujours `dist/index.html`, l'utilisateur ne peut pas changer l'URL.
- **Risque** : Faible aujourd'hui (seulement en `npm run dev` / `preview` ou pour un hébergement web avec un lien profond). Il devient **élevé** si on ajoute des routes (par exemple `/fr/` pour la mission *Translation*) ou un hébergement web sous un sous-chemin.
- **Effort** : M (environ 200 chemins à faire passer par une seule fonction).
- **Priorité** : P2. La correction centralise les chemins d'assets, ce dont les missions *Themes* et *Performance* ont aussi besoin.
- **Statut** : Identifié. Pas encore figé par un test : la résolution d'URL du navigateur n'est pas reproduite par jsdom.
- **Piste** :
  1. Créer un helper unique `assetUrl(path)` qui préfixe avec `import.meta.env.BASE_URL`.
  2. Configurer `base: '/'` pour le web et `base: './'` seulement pour le build Electron (variable d'environnement dans `electron:build`).
  3. Remplacer les ~200 chemins en dur.
  4. Test : tous les chemins exposés par les constantes passent par `assetUrl`. Plus un test e2e (Playwright) qui ouvre `/quelque_chose/` et vérifie qu'aucune image ne tombe en repli.

### DEBT-08

**Le thème Spy garde le fond d'écran Minecraft**

- **Emplacement** : `src/constants/gameData.jsx:205`, `THEME_CONFIG.spy.style.backgroundImage`.
- **Problème** (*duplication* / copier-coller) : le thème Spy pointe vers `assets/themes/minecraft.png` au lieu de `assets/themes/spy.png`. Le fichier `spy.png` existe bien : il est utilisé pour la vignette du menu des thèmes (`THEMES_LIST`). Résultat : on choisit « Spy » dans le menu, la vignette est correcte, mais le fond du jeu reste celui de Minecraft. Le joueur croit que le changement n'a pas marché.
- **Impact** : Moyen. Fonctionnalité visiblement cassée.
- **Risque** : Élevé. Se produit à chaque sélection du thème Spy.
- **Effort** : S (une ligne).
- **Priorité** : P1.
- **Statut** : Identifié, signalé en test manuel.
- **Preuve** : test manuel (Menu → Thèmes → Spy).
- **Piste** : figer par un test (« chaque thème utilise son propre fond »), puis corriger le chemin. Cause profonde : chaque thème recopie à la main la même structure de chemins. Un thème devrait être décrit par son seul identifiant, les chemins étant dérivés automatiquement (`assets/themes/<id>/background.png`…). C'est le cœur de la mission *Themes*.

### DEBT-09

**4 fichiers de thème référencés dans le code mais absents du disque**

- **Emplacement** : `src/constants/gameData.jsx`, `THEME_CONFIG` → fichiers attendus dans `public/assets/themes/`.
- **Problème** (*silent error*) : ces chemins pointent vers des fichiers qui n'existent pas :

  | Thème | Fichier manquant | Effet |
  |---|---|---|
  | K-Pop | `kpop_memorycard.jpg` | dos des cartes du jeu Memory absent |
  | Pokémon | `pokemon_memorycard.jpg` | dos des cartes du jeu Memory absent |
  | Spy | `spy_memorycard.jpg` | dos des cartes du jeu Memory absent |
  | Spy | `spy_logo.png` | logo remplacé par le repli 📦 de `SafeImage` |

  Aucune erreur n'est signalée : `SafeImage` masque l'échec. À l'inverse, `fantasy.png`, `Scifi.png`, `pokemon_logo.svg` et un fichier `text` sont présents dans le dossier mais ne sont référencés nulle part (assets morts).
- **Impact** : Moyen. Trois thèmes sur quatre sont incomplets.
- **Risque** : Élevé. Systématique pour ces thèmes.
- **Effort** : S pour le test, M pour produire les visuels manquants.
- **Priorité** : P2.
- **Statut** : Identifié.
- **Preuve** : vérification de l'existence des fichiers, à transformer en test : « tout chemin `assets/…` référencé dans les constantes existe dans `public/` » (la liste des fichiers manquants est figée en snapshot).
- **Piste** : ce test, ajouté à la CI, empêchera à l'avenir de référencer un fichier absent. Il servira aussi de garde-fou pour le guide « Ajouter un thème » demandé par la mission *Themes*.

### DEBT-10

**Code d'origine non formaté : exception au contrôle Prettier de la CI**

- **Emplacement** : `CodeWashGame/CodeWashGame/.prettierignore`, section « CLIQUET DE FORMATAGE » (29 fichiers d'origine, dont `App.jsx`, `GlobalStyles.jsx`, `gameData.jsx`, `electron/main.cjs`, `.github/workflows/build-exe.yml`).
- **Problème** : au moment d'ajouter Prettier à la CI, **34 fichiers sur 34** ne respectaient pas le format : indentation mélangeant tabulations et espaces, lignes de plusieurs centaines de caractères. Ce n'est pas un bug, mais une gêne de lecture et des diffs bruités.
- **Pourquoi une exception plutôt que tout reformater d'un coup** :
  1. Un reformatage global décalerait tous les numéros de ligne cités dans ce registre.
  2. Il provoquerait des conflits avec les branches en cours de l'autre membre de l'équipe (missions qui touchent `App.jsx` et les composants).
  3. Il noierait l'historique `git blame`.
- **Décision : « cliquet »** :
  - les **nouveaux** fichiers sont toujours vérifiés par la CI ;
  - un fichier d'origine est formaté **quand on le modifie**, dans un commit à part, puis retiré de `.prettierignore` ;
  - la liste ne peut que rétrécir. Règle rappelée dans le fichier et dans le README.
- **Impact** : Faible.
- **Risque** : Élevé (tous les fichiers d'origine).
- **Effort** : M au total, réparti au fil des PR.
- **Priorité** : P3.
- **Statut** : Accepté (cliquet en place).
- **Mesure de suivi** : nombre de lignes dans la section cliquet de `.prettierignore`. Départ : 29 le 2026-11-27. Objectif : 0.

---

## 5. Historique

| Date | Changement |
|---|---|
| 2026-11-25 | Création du registre. DEBT-01 à DEBT-06 relevés pendant l'écriture des tests de caractérisation (branche `test/characterization`). |
| 2026-11-25 | Ajout de DEBT-07 (assets cassés sous un sous-chemin), signalé en test manuel. |
| 2026-11-25 | Ajout de DEBT-08 (fond du thème Spy), signalé en test manuel, et DEBT-09 (fichiers de thème manquants), trouvé en l'analysant. |
| 2026-11-27 | Ajout de DEBT-10 (exception Prettier pour le code d'origine), introduite avec les quality gates de la CI (branche `ci/quality-gates`). |
