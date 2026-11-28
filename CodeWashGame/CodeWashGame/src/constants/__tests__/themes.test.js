import { describe, it, expect } from 'vitest';
import { THEME_CONFIG, THEMES_LIST } from '../gameData';

// Extrait le chemin d'une valeur CSS `url('...')`.
const backgroundOf = (themeId) =>
  THEME_CONFIG[themeId].style.backgroundImage.match(/url\('(.+)'\)/)[1];

describe('thèmes', () => {
  it('chaque thème du menu a une configuration', () => {
    THEMES_LIST.forEach(({ id }) => expect(THEME_CONFIG[id]).toBeDefined());
  });

  // DEBT-08 : comportement actuel figé. Le thème Spy réutilise le fond de Minecraft.
  it('fond de chaque thème (comportement actuel)', () => {
    expect(Object.fromEntries(THEMES_LIST.map(({ id }) => [id, backgroundOf(id)]))).toEqual({
      minecraft: 'assets/themes/minecraft.png',
      kpop: 'assets/themes/kpop.jpg',
      pokemon: 'assets/themes/pokemon.jpg',
      spy: 'assets/themes/minecraft.png',
    });
  });
});
