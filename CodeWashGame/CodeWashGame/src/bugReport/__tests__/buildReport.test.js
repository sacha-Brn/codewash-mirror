import { describe, it, expect } from 'vitest';
import {
  MIN_DESCRIPTION_LENGTH,
  collectGameData,
  currentEnvironment,
  createReportId,
  validateReportInput,
  buildReport,
} from '../buildReport';

const fakeStorage = (data) => {
  const keys = Object.keys(data);
  return { length: keys.length, key: (i) => keys[i], getItem: (k) => data[k] };
};

const deps = {
  now: () => new Date('2026-11-28T10:00:00.000Z'),
  storage: fakeStorage({ heroSkills_v23_p1: '{"skills":{}}', currentProfile_v1: '1' }),
  logs: [{ time: 'T', level: 'error', message: 'boom' }],
  environment: { userAgent: 'test' },
  random: () => 0.123456789,
};

describe('validateReportInput', () => {
  it('description trop courte -> erreur', () => {
    expect(MIN_DESCRIPTION_LENGTH).toBe(10);
    expect(validateReportInput({ description: '   court  ' })).toBe('description-too-short');
    expect(validateReportInput({})).toBe('description-too-short');
  });

  it('description suffisante -> valide', () => {
    expect(validateReportInput({ description: 'Le jeu plante au menu' })).toBeNull();
  });
});

describe('collectGameData', () => {
  it('copie toutes les clés du stockage', () => {
    expect(collectGameData(deps.storage)).toEqual({
      heroSkills_v23_p1: '{"skills":{}}',
      currentProfile_v1: '1',
    });
  });

  it('utilise localStorage par défaut', () => {
    localStorage.setItem('k', 'v');
    expect(collectGameData()).toEqual({ k: 'v' });
  });
});

describe('createReportId', () => {
  it('identifiant lisible, horodaté et sûr pour un nom de fichier', () => {
    expect(createReportId('2026-11-28T10:00:00.000Z', () => 0.5)).toBe(
      'bug-2026-11-28T10-00-00-000Z-i',
    );
  });

  it('utilise Math.random par défaut', () => {
    expect(createReportId('2026-01-01T00:00:00.000Z')).toMatch(/^bug-2026-01-01T00-00-00-000Z-/);
  });
});

describe('currentEnvironment', () => {
  it('décrit le navigateur ou la fenêtre Electron', () => {
    expect(currentEnvironment()).toEqual({
      userAgent: navigator.userAgent,
      url: window.location.href,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
    });
  });
});

describe('buildReport', () => {
  const input = {
    description: '  Le thème ne change pas  ',
    steps: ' Menu > Thèmes ',
    reporterEmail: ' eleve@ecole.fr ',
    attachments: [{ name: 'a.png' }],
  };

  it('rapport complet', () => {
    expect(buildReport(input, deps)).toEqual({
      id: 'bug-2026-11-28T10-00-00-000Z-4fzzzx',
      createdAt: '2026-11-28T10:00:00.000Z',
      description: 'Le thème ne change pas',
      steps: 'Menu > Thèmes',
      reporterEmail: 'eleve@ecole.fr',
      environment: { userAgent: 'test' },
      logs: deps.logs,
      gameData: { heroSkills_v23_p1: '{"skills":{}}', currentProfile_v1: '1' },
      attachments: [{ name: 'a.png' }],
    });
  });

  it('le joueur peut exclure ses fichiers de jeu et les logs', () => {
    const report = buildReport({ ...input, includeGameData: false, includeLogs: false }, deps);
    expect(report.gameData).toEqual({});
    expect(report.logs).toEqual([]);
  });

  it('valeurs par défaut (horloge, stockage, environnement réels)', () => {
    const report = buildReport({ description: 'Un bug quelque part' });
    expect(report).toMatchObject({ steps: '', reporterEmail: '', attachments: [], logs: [] });
    expect(report.environment.userAgent).toBe(navigator.userAgent);
  });
});
