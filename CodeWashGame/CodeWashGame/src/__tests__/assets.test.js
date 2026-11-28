import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Garde-fou DEBT-09 / DEBT-11 / DEBT-12 : tout chemin `assets/...` écrit dans le code doit exister dans `public/`.
// Les chemins construits dynamiquement (`${...}`) ne sont pas vérifiés ici.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'src');
const PUBLIC = join(ROOT, 'public');

const sourceFiles = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path);
    return /\.(js|jsx)$/.test(name) ? [path] : [];
  });

const referencedAssets = () => {
  const paths = new Set();
  for (const file of sourceFiles(SRC)) {
    for (const [, path] of readFileSync(file, 'utf-8').matchAll(/['"`](assets\/[^'"`]+)['"`]/g)) {
      if (!path.includes('${')) paths.add(path);
    }
  }
  return [...paths].sort();
};

describe('assets référencés dans le code', () => {
  const assets = referencedAssets();

  it('le scan trouve bien des chemins (le test vérifie quelque chose)', () => {
    expect(assets.length).toBeGreaterThan(100);
  });

  // Fichiers manquants connus, figés tels que reçus. Cette liste ne doit que RÉTRÉCIR :
  // si un NOUVEAU fichier manque, le test échoue.
  const KNOWN_MISSING = [
    // DEBT-12 : src/constants/assets.js, fichier jamais importé (code mort).
    'assets/audio/background_music.mp3',
    'assets/audio/battle_music.mp3',
    'assets/badges/beginner.png',
    'assets/badges/expert.png',
    'assets/badges/master.png',
    'assets/items/health_potion.png',
    'assets/items/mana_potion.png',
    'assets/items/sword.png',
    // DEBT-11 : BASE_ASSETS.audio (gameData.jsx). Seuls match et mismatch sont utilisés
    // (jeu Memory, SkillCard.jsx) : ces deux sons ne jouent jamais.
    'assets/sounds/bgm_1.wav',
    'assets/sounds/click.wav',
    'assets/sounds/damage.wav',
    'assets/sounds/fail.wav',
    'assets/sounds/faint.wav',
    'assets/sounds/hit_1.wav',
    'assets/sounds/levelup.wav',
    'assets/sounds/match_success.wav',
    'assets/sounds/mismatch.wav',
    'assets/sounds/success.wav',
    // DEBT-11 : soundManager.js attend sounds/ui/*.wav, les fichiers sont dans sounds/ui/ui/.
    'assets/sounds/ui/actioncard_left.wav',
    'assets/sounds/ui/actioncard_right.wav',
    'assets/sounds/ui/click.wav',
    'assets/sounds/ui/death.wav',
    'assets/sounds/ui/fail.wav',
    'assets/sounds/ui/levelup.wav',
    'assets/sounds/ui/notification.wav',
    'assets/sounds/ui/successful_hit.wav',
    // DEBT-09 : visuels de thème jamais fournis avec le projet.
    'assets/themes/kpop_memorycard.jpg',
    'assets/themes/pokemon_memorycard.jpg',
    'assets/themes/spy_logo.png',
    'assets/themes/spy_memorycard.jpg',
    // DEBT-12 : src/constants/assets.js (suite).
    'assets/ui/button.png',
    'assets/ui/health_bar.png',
  ];

  it('tous les fichiers référencés existent dans public/ (hors manquants connus)', () => {
    const missing = assets.filter((p) => !existsSync(join(PUBLIC, p)));
    expect(missing).toEqual(KNOWN_MISSING);
  });
});
