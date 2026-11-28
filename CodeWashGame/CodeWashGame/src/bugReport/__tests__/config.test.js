import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG_URL, DEFAULT_CONFIG, normalizeConfig, loadBugReportConfig } from '../config';

const jsonResponse = (body, ok = true, status = 200) => ({ ok, status, json: async () => body });
const logger = () => ({ warn: vi.fn() });

describe('normalizeConfig', () => {
  it('garde les champs texte, nettoie les espaces', () => {
    expect(normalizeConfig({ contactEmail: ' a@b.fr ', endpoint: 'http://x', other: 1 })).toEqual({
      contactEmail: 'a@b.fr',
      endpoint: 'http://x',
    });
  });

  it.each([null, undefined, {}, { contactEmail: 3, endpoint: [] }])(
    'valeur invalide (%s) -> champs vides',
    (data) => {
      expect(normalizeConfig(data)).toEqual({ contactEmail: '', endpoint: '' });
    },
  );
});

describe('loadBugReportConfig', () => {
  it('lit le fichier de configuration', async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({ contactEmail: 'prof@ecole.fr', endpoint: '' }),
    );
    await expect(loadBugReportConfig({ fetchFn, logger: logger() })).resolves.toEqual({
      contactEmail: 'prof@ecole.fr',
      endpoint: '',
    });
    expect(fetchFn).toHaveBeenCalledWith(CONFIG_URL);
  });

  it('fichier absent (404) -> configuration vide + avertissement', async () => {
    const log = logger();
    const fetchFn = async () => jsonResponse({}, false, 404);
    await expect(loadBugReportConfig({ fetchFn, logger: log })).resolves.toEqual(DEFAULT_CONFIG);
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('HTTP 404'));
  });

  it('réseau indisponible -> configuration vide', async () => {
    const fetchFn = async () => {
      throw new Error('offline');
    };
    await expect(loadBugReportConfig({ fetchFn, logger: logger() })).resolves.toEqual(
      DEFAULT_CONFIG,
    );
  });

  it('valeurs par défaut (fetch global, console)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}));
    await expect(loadBugReportConfig()).resolves.toEqual(DEFAULT_CONFIG);
    expect(fetchSpy).toHaveBeenCalledWith(CONFIG_URL);
  });
});

describe('fichier public/bug-report.config.json livré', () => {
  it('est du JSON valide avec les deux champs attendus', () => {
    const path = join(dirname(fileURLToPath(import.meta.url)), '../../../public', CONFIG_URL);
    const config = JSON.parse(readFileSync(path, 'utf-8'));
    expect(Object.keys(config).sort()).toEqual(['contactEmail', 'endpoint']);
  });
});
