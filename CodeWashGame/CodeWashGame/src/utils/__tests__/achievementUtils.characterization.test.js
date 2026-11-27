import { describe, it, expect, vi } from 'vitest';
import { ACHIEVEMENTS } from '../../constants/achievements';
import {
  getDefaultStats,
  isAchievementUnlocked,
  getCurrentTier,
  getNextTier,
  getTierProgress,
  getNewlyUnlockedAchievements,
  getNewTierAchievements,
  addUniqueToArray,
  recordLoginDate,
  getAchievementDisplayName,
} from '../achievementUtils';

// Tests de CARACTÉRISATION : ils figent le comportement ACTUEL, bugs compris.
// Ne pas « corriger » une valeur ici : ouvrir une entrée DEBT-xx à la place.

const SKILL_IDS = ['reading', 'math', 'writing', 'cleaning', 'memory', 'patterns'];
const skillsAt = (level) => Object.fromEntries(SKILL_IDS.map((id) => [id, { level }]));
const stats = (overrides = {}) => ({ ...getDefaultStats(), ...overrides });

describe('getDefaultStats', () => {
  it('structure initiale des statistiques', () => {
    expect(getDefaultStats()).toMatchSnapshot();
  });

  it('renvoie un nouvel objet à chaque appel (pas de partage de tableaux)', () => {
    const a = getDefaultStats();
    a.loginDates.push('x');
    expect(getDefaultStats().loginDates).toEqual([]);
  });
});

describe('catalogue des succès', () => {
  it('liste des identifiants et type (palier / unique)', () => {
    const catalogue = Object.values(ACHIEVEMENTS).map((a) => [a.id, a.isTiered]);
    expect(catalogue).toMatchSnapshot();
  });
});

describe('isAchievementUnlocked', () => {
  it('identifiant inconnu -> false', () => {
    expect(isAchievementUnlocked('nexiste_pas', stats(), skillsAt(1))).toBe(false);
  });

  it('succès unique : first_steps après le premier ennemi vaincu', () => {
    expect(isAchievementUnlocked('first_steps', stats(), skillsAt(1))).toBe(false);
    expect(isAchievementUnlocked('first_steps', stats({ totalMobsDefeated: 1 }), skillsAt(1))).toBe(
      true,
    );
  });

  it('succès à paliers : débloqué dès le palier 1 (phantom_hunter = 5 fantômes)', () => {
    expect(isAchievementUnlocked('phantom_hunter', stats({ phantomsCaught: 4 }), skillsAt(1))).toBe(
      false,
    );
    expect(isAchievementUnlocked('phantom_hunter', stats({ phantomsCaught: 5 }), skillsAt(1))).toBe(
      true,
    );
  });

  it('état de départ : aucun succès débloqué pour un nouveau joueur', () => {
    const unlocked = Object.keys(ACHIEVEMENTS).filter((id) =>
      isAchievementUnlocked(id, stats(), skillsAt(1)),
    );
    expect(unlocked).toEqual([]);
  });
});

describe('paliers (phantom_hunter : 5, 10, 15, 20, 25, 50, 75, 100)', () => {
  it.each([
    [0, -1, 5, 0],
    [3, -1, 5, 60],
    [5, 0, 10, 0],
    [7, 0, 10, 40],
    [60, 5, 75, 40],
    [100, 7, null, 100],
    [999, 7, null, 100],
  ])('%i fantômes -> palier %i, prochain %s, progression %i %%', (caught, tier, nextLevel, pct) => {
    const s = stats({ phantomsCaught: caught });
    expect(getCurrentTier('phantom_hunter', s, skillsAt(1))).toBe(tier);
    expect(getNextTier('phantom_hunter', s, skillsAt(1))?.level ?? null).toBe(nextLevel);
    expect(getTierProgress('phantom_hunter', s, skillsAt(1))).toBe(pct);
  });

  it('succès unique ou inconnu : -1 / null / 0', () => {
    expect(getCurrentTier('first_steps', stats(), skillsAt(1))).toBe(-1);
    expect(getNextTier('first_steps', stats(), skillsAt(1))).toBeNull();
    expect(getTierProgress('first_steps', stats(), skillsAt(1))).toBe(0);
    expect(getCurrentTier('nexiste_pas', stats(), skillsAt(1))).toBe(-1);
  });

  it('combined_levels : somme des niveaux (6 x 17 = 102 -> Bronze)', () => {
    expect(getCurrentTier('combined_levels', stats(), skillsAt(17))).toBe(0);
  });

  it('skill_mastery : niveau minimum parmi les compétences', () => {
    const skills = { ...skillsAt(40), math: { level: 39 } };
    expect(getCurrentTier('skill_mastery', stats(), skills)).toBe(0);
  });

  // BUG figé : Math.min() sur une liste vide vaut Infinity -> palier maximum.
  it('skill_mastery sans aucune compétence -> palier max (comportement actuel)', () => {
    expect(getCurrentTier('skill_mastery', stats(), {})).toBe(7);
  });
});

describe('détection des nouveaux succès (toasts)', () => {
  it('getNewlyUnlockedAchievements : ce qui passe de verrouillé à débloqué', () => {
    const before = stats();
    const after = stats({ totalMobsDefeated: 1, phantomsCaught: 5 });
    expect(getNewlyUnlockedAchievements(before, after, skillsAt(1), skillsAt(2))).toMatchSnapshot();
  });

  it('aucun changement -> aucun nouveau succès', () => {
    expect(getNewlyUnlockedAchievements(stats(), stats(), skillsAt(1), skillsAt(1))).toEqual([]);
  });

  it('getNewTierAchievements : franchissement de palier', () => {
    const before = stats({ phantomsCaught: 9 });
    const after = stats({ phantomsCaught: 10 });
    expect(getNewTierAchievements(before, after, skillsAt(1), skillsAt(1))).toEqual([
      { achievementId: 'phantom_hunter', tierIndex: 1 },
    ]);
  });

  it('getNewTierAchievements : saut de plusieurs paliers -> renvoie le plus haut', () => {
    const r = getNewTierAchievements(
      stats(),
      stats({ phantomsCaught: 30 }),
      skillsAt(1),
      skillsAt(1),
    );
    expect(r).toEqual([{ achievementId: 'phantom_hunter', tierIndex: 4 }]);
  });
});

describe('addUniqueToArray', () => {
  it('ajoute une valeur absente sans muter le tableau', () => {
    const arr = ['Zombie'];
    const out = addUniqueToArray(arr, 'Creeper');
    expect(out).toEqual(['Zombie', 'Creeper']);
    expect(arr).toEqual(['Zombie']);
  });

  it('valeur déjà présente -> même référence', () => {
    const arr = ['Zombie'];
    expect(addUniqueToArray(arr, 'Zombie')).toBe(arr);
  });
});

describe('recordLoginDate (horloge contrôlée)', () => {
  it('ajoute la date du jour au format YYYY-MM-DD', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T10:00:00Z'));
    expect(recordLoginDate([])).toEqual(['2026-01-15']);
  });

  it('une seule fois par jour', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T23:00:00Z'));
    const dates = ['2026-01-15'];
    expect(recordLoginDate(dates)).toBe(dates);
  });

  // Comportement figé : la date est calculée en UTC, pas en heure locale.
  it('utilise la date UTC (00h30 à Paris le 16 = encore le 15 en UTC)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T23:30:00Z'));
    expect(recordLoginDate([])).toEqual(['2026-01-15']);
  });
});

describe('getAchievementDisplayName', () => {
  it('succès unique -> nom', () => {
    expect(getAchievementDisplayName('first_steps', stats(), skillsAt(1))).toBe('First Steps');
  });

  it('succès à paliers sans palier atteint -> nom générique', () => {
    expect(getAchievementDisplayName('phantom_hunter', stats(), skillsAt(1))).toBe('Ghost Buster');
  });

  it('succès à paliers -> nom du palier atteint', () => {
    expect(
      getAchievementDisplayName('phantom_hunter', stats({ phantomsCaught: 10 }), skillsAt(1)),
    ).toBe('Silver Ghost Buster');
  });

  it('identifiant inconnu -> chaîne vide', () => {
    expect(getAchievementDisplayName('nexiste_pas', stats(), skillsAt(1))).toBe('');
  });
});
