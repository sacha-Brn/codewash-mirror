import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import App from '../App';

// jsdom n'a ni Audio, ni AudioContext, ni reconnaissance vocale : on les remplace.
beforeEach(() => {
  vi.stubGlobal('Audio', vi.fn(function () {
    this.play = vi.fn(() => Promise.resolve());
    this.pause = vi.fn();
    this.addEventListener = vi.fn();
    this.removeEventListener = vi.fn();
  }));
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-01-15T10:00:00Z'));
});

describe('persistance localStorage (comportement actuel)', () => {
  it('premier lancement : écrit les clés de sauvegarde', () => {
    render(<App />);
    expect(Object.keys(localStorage).sort()).toMatchSnapshot();
    expect(localStorage.getItem('currentProfile_v1')).toBe('1');
  });

  it('recharge une sauvegarde existante', () => {
    render(<App />);
    const saved = Object.fromEntries(Object.entries(localStorage));
    localStorage.clear();
    Object.entries(saved).forEach(([k, v]) => localStorage.setItem(k, v));
    const { unmount } = render(<App />);
    unmount();
    expect(Object.fromEntries(Object.entries(localStorage))).toEqual(saved);
  });

  it('enregistre la date de connexion du jour dans les stats', () => {
    render(<App />);
    const save = JSON.parse(localStorage.getItem('heroSkills_v23_p1'));
    expect(save.stats.loginDates).toEqual(['2026-01-15']);
  });

  it('format de la sauvegarde : { skills, theme, stats }', () => {
    render(<App />);
    const save = JSON.parse(localStorage.getItem('heroSkills_v23_p1'));
    expect(Object.keys(save).sort()).toEqual(['skills', 'stats', 'theme']);
    expect(Object.keys(save.skills).sort())
      .toEqual(['cleaning', 'math', 'memory', 'patterns', 'reading', 'writing']);
    expect(save.theme).toBe('minecraft');
  });

  // Comportement figé : au premier lancement, loadTheme/loadStats font JSON.parse(null)
  // puis lisent .theme / .stats sur null -> TypeError attrapée et loguée.
  it('premier lancement : avertissements console (erreurs attrapées)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<App />);
    const messages = warn.mock.calls.map((c) => c[0]);
    expect(messages).toContain('Failed to parse theme:');
    expect(messages).toContain('Failed to parse stats:');
  });
});

describe('migration de l’ancienne sauvegarde heroSkills_v23 (profil 1)', () => {
  const legacy = {
    skills: { math: { level: 12, xp: 40, difficulty: 2 } },
    theme: 'spy',
    stats: { totalMobsDefeated: 7 },
  };

  it('reprend la progression de l’ancienne clé et l’écrit sous heroSkills_v23_p1', () => {
    localStorage.setItem('heroSkills_v23', JSON.stringify(legacy));
    render(<App />);
    const save = JSON.parse(localStorage.getItem('heroSkills_v23_p1'));
    expect(save.skills.math).toMatchObject({ level: 12, xp: 40, difficulty: 2 });
    expect(save.theme).toBe('spy');
    expect(save.stats.totalMobsDefeated).toBe(7);
  });

  it('complète les champs manquants (compatibilité ascendante)', () => {
    localStorage.setItem('heroSkills_v23', JSON.stringify(legacy));
    render(<App />);
    const math = JSON.parse(localStorage.getItem('heroSkills_v23_p1')).skills.math;
    expect(math).toMatchObject({ earnedBadges: [], lostLevel: false, recoveryDifficulty: null });
    expect(typeof math.mobHealth).toBe('number');
  });

  it('accepte l’ancien format « skills à plat » (sans clé skills)', () => {
    localStorage.setItem('heroSkills_v23', JSON.stringify({ reading: { level: 5 } }));
    render(<App />);
    const save = JSON.parse(localStorage.getItem('heroSkills_v23_p1'));
    expect(save.skills.reading.level).toBe(5);
  });

  it('ne supprime pas l’ancienne clé après migration (comportement actuel)', () => {
    localStorage.setItem('heroSkills_v23', JSON.stringify(legacy));
    render(<App />);
    expect(localStorage.getItem('heroSkills_v23')).toBe(JSON.stringify(legacy));
  });

  it('la nouvelle clé est prioritaire sur l’ancienne', () => {
    localStorage.setItem('heroSkills_v23', JSON.stringify(legacy));
    localStorage.setItem('heroSkills_v23_p1', JSON.stringify({ skills: { math: { level: 30 } } }));
    render(<App />);
    const save = JSON.parse(localStorage.getItem('heroSkills_v23_p1'));
    expect(save.skills.math.level).toBe(30);
  });
});

describe('sauvegardes corrompues (comportement actuel)', () => {
  // BUG : la sauvegarde illisible est remplacée par une nouvelle partie
  // -> perte de progression pour le joueur, sans avertissement.
  it('heroSkills_v23_p1 corrompu : pas de crash, mais la sauvegarde est écrasée', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem('heroSkills_v23_p1', '{pas du json');
    render(<App />);
    const save = JSON.parse(localStorage.getItem('heroSkills_v23_p1'));
    expect(save.skills.math.level).toBe(1);
  });

  it('JSON corrompu : comportement actuel figé (parser fragile)', () => {
    localStorage.setItem('heroProfileNames_v1', '{pas du json');
    let error = null;
    try { render(<App />); } catch (e) { error = e; }
    expect(error?.name ?? 'pas de crash').toMatchSnapshot();
  });
});
