import { describe, it, expect, vi } from 'vitest';
import {
  getEncounterType,
  calculateDamage,
  calculateMobHealth,
  getExpectedDifficulty,
  calculateXPReward,
  calculateXPToLevel,
  generateMathProblem,
  getMobForSkill,
  getItemsForLength,
} from '../gameUtils';

// Tests de CARACTÉRISATION : ils figent le comportement ACTUEL, bugs compris.
// Ne pas « corriger » une valeur ici : ouvrir une entrée DEBT-xx à la place.

describe('getEncounterType (cycle de 20 niveaux)', () => {
  it.each([
    [1, 'hostile'],
    [9, 'hostile'],
    [10, 'miniboss'],
    [11, 'hostile'],
    [20, 'boss'],
    [21, 'hostile'],
    [30, 'miniboss'],
    [40, 'boss'],
  ])('niveau %i -> %s', (level, expected) => {
    expect(getEncounterType(level)).toBe(expected);
  });
});

describe('progression (golden master)', () => {
  it('table XP / PV / dégâts pour niveaux 1..160 x difficultés 1..7', () => {
    const table = [];
    for (let level = 1; level <= 160; level += 7) {
      for (let diff = 1; diff <= 7; diff++) {
        table.push({
          level,
          diff,
          damage: calculateDamage(level, diff),
          hp: calculateMobHealth(diff),
          expected: getExpectedDifficulty(level),
          xp: calculateXPReward(diff, level),
          xpToLevel: calculateXPToLevel(diff, level),
        });
      }
    }
    expect(table).toMatchSnapshot();
  });

  it('calculateDamage ignore le niveau du joueur (comportement actuel)', () => {
    expect(calculateDamage(1, 3)).toBe(calculateDamage(150, 3));
  });

  it('sans niveau joueur : ancienne formule', () => {
    expect(calculateXPReward(2)).toBe(300);
    expect(calculateXPToLevel(2)).toBe(300);
  });
});

describe('generateMathProblem (hasard contrôlé)', () => {
  it('Math.random = 0 -> problème déterministe en difficulté 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(generateMathProblem(1)).toMatchInlineSnapshot(`
      {
        "answer": "0",
        "question": "0 + 0 = ?",
        "type": "math",
      }
    `);
  });

  it('la réponse est toujours juste (propriété), 200 tirages par difficulté', () => {
    for (let diff = 1; diff <= 5; diff++) {
      for (let i = 0; i < 200; i++) {
        const { question, answer } = generateMathProblem(diff);
        const expr = question.replace(' = ?', '').replace('×', '*').replace('÷', '/');
        expect(String(Function(`return ${expr}`)())).toBe(answer);
      }
    }
  });
});

describe('getMobForSkill', () => {
  it('cleaning : Ender Chest tous les 20 niveaux, Shulker Box tous les 5', () => {
    expect(getMobForSkill({ id: 'cleaning' }, { level: 20 })).toBe('Ender Chest');
    expect(getMobForSkill({ id: 'cleaning' }, { level: 5 })).toBe('Shulker Box');
  });

  it('réutilise le mob stocké pour éviter les changements au re-render', () => {
    expect(getMobForSkill({ id: 'math' }, { level: 3, mathMob: 'Creeper' })).toBe('Creeper');
  });
});

describe('getItemsForLength', () => {
  it('forme de la réponse pour une longueur courante', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(getItemsForLength(4)).toMatchSnapshot();
  });
});
