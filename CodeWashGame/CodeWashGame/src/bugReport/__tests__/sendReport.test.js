import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  sendToEndpoint,
  reportFileName,
  mailtoUrl,
  downloadReport,
  sendReport,
} from '../sendReport';
import { createBugReportServer } from '../../../scripts/bug-report-server';

const report = {
  id: 'bug-1',
  createdAt: '2026-11-28T10:00:00.000Z',
  description: 'Le thème Spy ne change pas le fond',
};
const ok = { ok: true, status: 201 };
const silent = () => ({ error: vi.fn() });

describe('sendToEndpoint', () => {
  it('POST du rapport en JSON', async () => {
    const fetchFn = vi.fn(async () => ok);
    await sendToEndpoint(report, 'http://serveur/bug-reports', fetchFn);
    expect(fetchFn).toHaveBeenCalledWith('http://serveur/bug-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
  });

  it('réponse en erreur -> exception', async () => {
    await expect(
      sendToEndpoint(report, 'http://x', async () => ({ ok: false, status: 500 })),
    ).rejects.toThrow('HTTP 500');
  });

  it('utilise fetch global par défaut', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok);
    await sendToEndpoint(report, 'http://x');
    expect(spy).toHaveBeenCalled();
  });
});

describe('mailtoUrl et reportFileName', () => {
  it('nom de fichier du rapport', () => {
    expect(reportFileName(report)).toBe('bug-1.json');
  });

  it('e-mail prérempli avec résumé et consigne de pièce jointe', () => {
    const url = mailtoUrl(report, 'prof@ecole.fr');
    expect(url.startsWith('mailto:prof@ecole.fr?subject=')).toBe(true);
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('subject')).toBe('[Bug] Le thème Spy ne change pas le fond');
    expect(params.get('body')).toContain('bug-1.json');
  });
});

describe('downloadReport', () => {
  it('déclenche le téléchargement du rapport en .json', () => {
    const urlApi = { createObjectURL: vi.fn(() => 'blob:1'), revokeObjectURL: vi.fn() };
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadReport(report, document, urlApi);
    expect(click).toHaveBeenCalledTimes(1);
    const link = click.mock.contexts[0];
    expect(link.download).toBe('bug-1.json');
    expect(link.href).toBe('blob:1');
    expect(urlApi.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(urlApi.revokeObjectURL).toHaveBeenCalledWith('blob:1');
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('utilise document et URL par défaut', () => {
    URL.createObjectURL = vi.fn(() => 'blob:2');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadReport(report);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:2');
  });
});

describe('sendReport', () => {
  const deps = () => ({
    fetchFn: vi.fn(async () => ok),
    download: vi.fn(),
    openUrl: vi.fn(),
    logger: silent(),
  });

  it('serveur configuré et joignable -> envoi direct', async () => {
    const d = deps();
    await expect(
      sendReport(report, { endpoint: 'http://x', contactEmail: 'a@b.fr' }, d),
    ).resolves.toEqual({
      method: 'endpoint',
    });
    expect(d.download).not.toHaveBeenCalled();
    expect(d.openUrl).not.toHaveBeenCalled();
  });

  it('serveur injoignable -> téléchargement + e-mail, erreur signalée', async () => {
    const d = { ...deps(), fetchFn: async () => Promise.reject(new Error('offline')) };
    const result = await sendReport(report, { endpoint: 'http://x', contactEmail: 'a@b.fr' }, d);
    expect(result).toEqual({
      method: 'download',
      fileName: 'bug-1.json',
      emailOpened: true,
      endpointError: 'offline',
    });
    expect(d.download).toHaveBeenCalledWith(report);
    expect(d.openUrl).toHaveBeenCalledWith(expect.stringMatching(/^mailto:a@b\.fr/));
    expect(d.logger.error).toHaveBeenCalled();
  });

  it('ni serveur ni contact -> téléchargement seul', async () => {
    const d = deps();
    const result = await sendReport(report, { endpoint: '', contactEmail: '' }, d);
    expect(result).toEqual({ method: 'download', fileName: 'bug-1.json', emailOpened: false });
    expect(d.fetchFn).not.toHaveBeenCalled();
    expect(d.openUrl).not.toHaveBeenCalled();
  });

  it('valeurs par défaut (téléchargement et window.open réels)', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:3');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    await sendReport(report, { endpoint: '', contactEmail: 'a@b.fr' });
    expect(open).toHaveBeenCalledWith(expect.stringMatching(/^mailto:/), '_blank');
  });
});

// Test de bout en bout : le rapport est-il vraiment REÇU ?
// On démarre le vrai serveur de réception sur un port libre et on lui envoie un rapport
// avec le vrai code d'envoi du jeu.
describe('réception par le serveur (bout en bout)', () => {
  let server;
  let outDir;

  afterEach(async () => {
    await new Promise((resolve) => server?.close(resolve));
    rmSync(outDir, { recursive: true, force: true });
  });

  const start = async () => {
    outDir = mkdtempSync(join(tmpdir(), 'bug-reports-'));
    server = createBugReportServer({ outDir });
    await new Promise((resolve) => server.listen(0, resolve));
    return `http://127.0.0.1:${server.address().port}`;
  };

  it('le rapport envoyé par le jeu est enregistré par le serveur', async () => {
    const base = await start();
    const fullReport = { ...report, gameData: { currentProfile_v1: '1' }, logs: [] };
    await expect(
      sendReport(fullReport, { endpoint: `${base}/bug-reports`, contactEmail: '' }),
    ).resolves.toEqual({
      method: 'endpoint',
    });
    expect(readdirSync(outDir)).toEqual(['bug-1.json']);
    expect(JSON.parse(readFileSync(join(outDir, 'bug-1.json'), 'utf-8'))).toEqual(fullReport);
  });
});
