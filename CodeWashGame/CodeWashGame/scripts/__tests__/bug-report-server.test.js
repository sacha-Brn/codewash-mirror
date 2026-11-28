import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createBugReportServer, safeFileName, MAX_BODY_BYTES } from '../bug-report-server';

let server;
let outDir;
let base;
let log;

beforeEach(async () => {
  outDir = mkdtempSync(join(tmpdir(), 'bug-server-'));
  log = vi.fn();
  server = createBugReportServer({ outDir, log });
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  rmSync(outDir, { recursive: true, force: true });
});

const post = (body) =>
  fetch(`${base}/bug-reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

describe('safeFileName', () => {
  it('neutralise les caractères dangereux (../, /, espaces)', () => {
    expect(safeFileName('../../etc/passwd')).toBe('______etc_passwd');
    expect(safeFileName('bug-1_OK')).toBe('bug-1_OK');
    expect(safeFileName('x'.repeat(150))).toHaveLength(100);
  });
});

describe('serveur de réception des rapports', () => {
  it('GET /health -> ok, avec en-têtes CORS', async () => {
    const response = await fetch(`${base}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('OPTIONS (pré-requête CORS du navigateur) -> 204', async () => {
    const response = await fetch(`${base}/bug-reports`, { method: 'OPTIONS' });
    expect(response.status).toBe(204);
  });

  it('route inconnue -> 404', async () => {
    expect((await fetch(`${base}/autre`)).status).toBe(404);
  });

  it('rapport valide -> 201 et fichier enregistré', async () => {
    const response = await post(JSON.stringify({ id: 'bug-42', description: 'Plantage' }));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ received: true, id: 'bug-42' });
    expect(readdirSync(outDir)).toEqual(['bug-42.json']);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('bug-42'));
  });

  it('JSON illisible -> 400', async () => {
    const response = await post('{pas du json');
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid-json' });
  });

  it.each([null, { id: 1, description: 'x' }, { id: 'bug-1' }])(
    'rapport incomplet (%j) -> 400',
    async (body) => {
      const response = await post(JSON.stringify(body));
      expect(response.status).toBe(400);
      expect(readdirSync(outDir)).toEqual([]);
    },
  );

  it('corps trop volumineux -> 413, rien n’est enregistré', async () => {
    expect(MAX_BODY_BYTES).toBe(30 * 1024 * 1024);
    const status = await new Promise((resolve, reject) => {
      const req = request(`${base}/bug-reports`, { method: 'POST' }, (res) =>
        resolve(res.statusCode),
      );
      req.on('error', reject);
      const chunk = Buffer.alloc(1024 * 1024, 'a');
      for (let i = 0; i <= 30; i++) req.write(chunk);
      req.end();
    }).catch(() => 413);
    expect(status).toBe(413);
    expect(readdirSync(outDir)).toEqual([]);
  });

  it('journal par défaut silencieux', () => {
    const other = createBugReportServer({ outDir });
    expect(other.listening).toBe(false);
  });
});
