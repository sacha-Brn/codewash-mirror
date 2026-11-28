import { describe, it, expect } from 'vitest';
import { THEME_CONFIG, THEMES_LIST } from '../gameData';

// Extrait le chemin d'une valeur CSS `url('...')`.
const backgroundOf = (themeId) =>
  THEME_CONFIG[themeId].style.backgroundImage.match(/url\('(.+)'\)/)[1];

describe('thèmes', () => {
  it('chaque thème du menu a une configuration', () => {
    THEMES_LIST.forEach(({ id }) => expect(THEME_CONFIG[id]).toBeDefined());
  });

  // DEBT-08 (corrigé) : le thème Spy réutilisait le fond de Minecraft.
  it('le fond de jeu de chaque thème est celui de sa vignette dans le menu', () => {
    THEMES_LIST.forEach(({ id, img }) => expect(backgroundOf(id)).toBe(img));
  });

  it('deux thèmes ne partagent jamais le même fond', () => {
    const backgrounds = THEMES_LIST.map(({ id }) => backgroundOf(id));
    expect(new Set(backgrounds).size).toBe(backgrounds.length);
  });
});
