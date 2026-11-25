# Level Up RPG — Code Wash

Jeu éducatif (lecture, calcul, orthographe, rangement, mémoire, logique) façon RPG,
reçu entièrement « vibe-codé » et en cours de nettoyage selon le protocole Code Wash Inc.

- **Stack** : React 19 · Vite 7 (`rolldown-vite`) · Tailwind CSS 4 · Electron 39
- **Cible d'origine** : exécutable Windows portable (`.exe`), mais le jeu tourne aussi
  dans un navigateur Chromium et sous Linux (voir plus bas).
- **Code source** : [`CodeWashGame/CodeWashGame/`](CodeWashGame/CodeWashGame/)
  (double imbrication héritée du livrable d'origine, conservée volontairement pour
  l'instant — voir `docs/DEBT.md`).

---

## Démarrage rapide (≈ 5 minutes)

### Prérequis

| Outil | Version | Vérifier |
|-------|---------|----------|
| Node.js | **≥ 20.19** (22 recommandé, celle de la CI) | `node -v` |
| npm | ≥ 10 | `npm -v` |
| Git | n'importe laquelle récente | `git --version` |

Avec [nvm](https://github.com/nvm-sh/nvm) : `nvm use` à la racine lit le fichier `.nvmrc`.

> Le navigateur doit être basé sur Chromium (Chrome, Edge, Brave…) : la carte
> « Reading » utilise `webkitSpeechRecognition`, absent de Firefox.

### Installation

```bash
git clone git@github.com:sacha-Brn/codewash-mirror.git
cd codewash-mirror/CodeWashGame/CodeWashGame
npm ci            # installe exactement les versions du package-lock.json
```

### Lancer le jeu

| Objectif | Commande (depuis `CodeWashGame/CodeWashGame/`) | Résultat |
|----------|-----------------------------------------------|----------|
| Développement (rechargement à chaud) | `npm run dev` | http://localhost:5173 |
| Build web de production | `npm run build` | dossier `dist/` |
| Prévisualiser le build web | `npm run preview` | http://localhost:4173 |
| Application de bureau (Electron) | `npm run electron:dev` | build + fenêtre 1280×720 |
| Exécutable Windows portable | `npm run electron:build` | `release/LevelUpRPG-Portable.exe` |
| Lint | `npm run lint` | ESLint, 0 erreur attendue |

### Spécificités par système

**Windows** — tout fonctionne nativement, y compris `npm run electron:build`.

**Linux (Ubuntu ≥ 23.10)** — Electron s'arrête avec :

```
FATAL: The SUID sandbox helper binary was found, but is not configured correctly…
```

AppArmor bloque le sandbox Chromium pour les utilisateurs non privilégiés. Deux solutions :

```bash
# Option A — développement local uniquement (désactive le sandbox Chromium)
npm run electron:dev -- --no-sandbox

# Option B — réparer le binaire sandbox (à refaire après chaque `npm ci`)
sudo chown root:root node_modules/electron/dist/chrome-sandbox
sudo chmod 4755 node_modules/electron/dist/chrome-sandbox
```

**Construire le `.exe` depuis Linux/macOS** — `electron-builder` a besoin de Wine pour
la cible Windows. Le plus simple est de passer par une machine Windows ou par la CI.

### Messages sans gravité pendant l'installation ou le build

- `npm warn deprecated glob@…` et `31 vulnerabilities` : ils viennent des **dépendances de
  développement** (outillage Electron). `npm audit --omit=dev` ne remonte **0 vulnérabilité**
  dans ce qui est livré au joueur. Suivi dans `docs/DEBT.md`.
- `baseline-browser-mapping … over two months old` / `caniuse-lite is … old` :
  données de compatibilité navigateur périmées, sans effet sur le jeu.

---

## Structure du dépôt

```
.
├── .github/workflows/ci.yml      # CI : install, lint, build (sur PR et push vers main)
├── README.md                     # ce fichier
└── CodeWashGame/CodeWashGame/
    ├── electron/main.cjs         # processus principal Electron (fenêtre, raccourcis)
    ├── public/assets/            # images, GIF, sons, thèmes (~240 Mo)
    ├── src/
    │   ├── App.jsx               # composant racine (≈1 500 lignes : état + logique + UI)
    │   ├── components/           # drawers, modals, skills (mini-jeux), ui
    │   ├── constants/            # données de jeu, succès, chemins d'assets
    │   └── utils/                # logique de jeu, succès, son
    └── docs/MICROPHONE_FEATURE.md
```

## Où sont les données du joueur ?

La progression est stockée dans le `localStorage` du navigateur / de la fenêtre Electron.
Pour repartir de zéro : bouton de réinitialisation du jeu, ou DevTools →
Application → Local Storage → supprimer les clés.

## Contribuer

- Une branche et une PR par intention ; la CI doit être verte avant de merger.
- Chaque refactoring référence l'entrée correspondante du registre de dette (`docs/DEBT.md`).
