import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  LEGACY_SAVE_KEY,
  saveKey,
  safeParse,
  backupCorrupted,
  readJSON,
  readProfileSave,
} from '../storage';

// Faux stockage en mémoire : les tests ne dépendent pas du navigateur.
const memoryStorage = (initial = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    dump: () => Object.fromEntries(data),
  };
};
const silentLogger = () => ({ error: vi.fn() });

describe('saveKey', () => {
  it('clé de sauvegarde par profil', () => {
    expect(saveKey(2)).toBe('heroSkills_v23_p2');
    expect(LEGACY_SAVE_KEY).toBe('heroSkills_v23');
  });
});

describe('safeParse', () => {
  it.each([null, undefined, ''])('valeur absente (%s) -> fallback, sans erreur', (raw) => {
    const onError = vi.fn();
    expect(safeParse(raw, 'défaut', onError)).toBe('défaut');
    expect(onError).not.toHaveBeenCalled();
  });

  it('JSON valide -> valeur parsée', () => {
    expect(safeParse('{"a":1}', null)).toEqual({ a: 1 });
  });

  it('JSON illisible -> fallback et onError appelé avec l’erreur', () => {
    const onError = vi.fn();
    expect(safeParse('{pas du json', 'défaut', onError)).toBe('défaut');
    expect(onError).toHaveBeenCalledWith(expect.any(SyntaxError));
  });

  it('JSON illisible sans onError -> fallback', () => {
    expect(safeParse('{', 0)).toBe(0);
  });
});

describe('backupCorrupted', () => {
  let storage;
  let logger;
  beforeEach(() => {
    storage = memoryStorage();
    logger = silentLogger();
  });

  it('copie la donnée sous <clé>_corrupted et le signale', () => {
    expect(backupCorrupted('k', 'abc', storage, logger)).toBe('k_corrupted');
    expect(storage.getItem('k_corrupted')).toBe('abc');
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('même donnée déjà copiée -> pas de doublon ni de nouveau message', () => {
    backupCorrupted('k', 'abc', storage, logger);
    expect(backupCorrupted('k', 'abc', storage, logger)).toBe('k_corrupted');
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('nouvelle donnée corrompue -> copie suivante, l’ancienne copie est gardée', () => {
    backupCorrupted('k', 'abc', storage, logger);
    expect(backupCorrupted('k', 'xyz', storage, logger)).toBe('k_corrupted_2');
    expect(storage.dump()).toEqual({ k_corrupted: 'abc', k_corrupted_2: 'xyz' });
  });

  it('utilise localStorage et console par défaut', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    backupCorrupted('défaut', 'abc');
    expect(localStorage.getItem('défaut_corrupted')).toBe('abc');
    expect(error).toHaveBeenCalled();
  });
});

describe('readJSON', () => {
  it('clé absente -> fallback', () => {
    expect(readJSON('k', { x: 1 }, memoryStorage(), silentLogger())).toEqual({ x: 1 });
  });

  it('clé lisible -> valeur', () => {
    expect(readJSON('k', null, memoryStorage({ k: '[1,2]' }), silentLogger())).toEqual([1, 2]);
  });

  it('clé illisible -> fallback + copie de secours', () => {
    const storage = memoryStorage({ k: '{oups' });
    expect(readJSON('k', 'défaut', storage, silentLogger())).toBe('défaut');
    expect(storage.getItem('k_corrupted')).toBe('{oups');
  });

  it('utilise localStorage par défaut', () => {
    localStorage.setItem('k', '42');
    expect(readJSON('k', null)).toBe(42);
  });
});

describe('readProfileSave', () => {
  const save = { skills: { math: { level: 3 } }, theme: 'spy' };

  it('lit la sauvegarde du profil', () => {
    const storage = memoryStorage({ heroSkills_v23_p2: JSON.stringify(save) });
    expect(readProfileSave(2, storage, silentLogger())).toEqual(save);
  });

  it('profil 1 sans sauvegarde -> ancienne clé heroSkills_v23', () => {
    const storage = memoryStorage({ heroSkills_v23: JSON.stringify(save) });
    expect(readProfileSave(1, storage, silentLogger())).toEqual(save);
  });

  it('autre profil sans sauvegarde -> null (pas de repli sur l’ancienne clé)', () => {
    const storage = memoryStorage({ heroSkills_v23: JSON.stringify(save) });
    expect(readProfileSave(2, storage, silentLogger())).toBeNull();
  });

  it('aucune sauvegarde -> null', () => {
    expect(readProfileSave(1, memoryStorage(), silentLogger())).toBeNull();
  });

  it('sauvegarde illisible -> null + copie de secours', () => {
    const storage = memoryStorage({ heroSkills_v23_p1: '{cassé' });
    expect(readProfileSave(1, storage, silentLogger())).toBeNull();
    expect(storage.getItem('heroSkills_v23_p1_corrupted')).toBe('{cassé');
  });

  it('utilise localStorage par défaut', () => {
    localStorage.setItem('heroSkills_v23_p3', JSON.stringify(save));
    expect(readProfileSave(3)).toEqual(save);
  });
});
