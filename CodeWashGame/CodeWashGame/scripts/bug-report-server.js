// Serveur de réception des rapports de bug.
// Reçoit les rapports en POST /bug-reports et les enregistre en JSON dans un dossier.
// Sert en démonstration et dans les tests automatiques pour prouver qu'un rapport est reçu.
//
// Lancement : npm run bug-report-server
// Options (variables d'environnement) : BUG_REPORT_PORT (8787), BUG_REPORT_DIR (bug-reports)

import { createServer } from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_BODY_BYTES = 30 * 1024 * 1024;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const reply = (res, status, body) => {
  res.writeHead(status, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

/** Garde uniquement des caractères sûrs pour un nom de fichier. */
export const safeFileName = (id) =>
  String(id)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 100);

export const createBugReportServer = ({ outDir, log = () => {} }) => {
  mkdirSync(outDir, { recursive: true });
  return createServer((req, res) => {
    if (req.method === 'OPTIONS') return reply(res, 204, {});
    if (req.method === 'GET' && req.url === '/health') return reply(res, 200, { status: 'ok' });
    if (req.method !== 'POST' || req.url !== '/bug-reports') {
      return reply(res, 404, { error: 'not-found' });
    }

    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reply(res, 413, { error: 'too-large' });
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (res.writableEnded) return;
      let report;
      try {
        report = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
      } catch {
        return reply(res, 400, { error: 'invalid-json' });
      }
      if (!report || typeof report.id !== 'string' || typeof report.description !== 'string') {
        return reply(res, 400, { error: 'invalid-report' });
      }
      const file = join(outDir, `${safeFileName(report.id)}.json`);
      writeFileSync(file, JSON.stringify(report, null, 2));
      log(`Rapport reçu : ${report.id} -> ${file}`);
      return reply(res, 201, { received: true, id: report.id });
    });
  });
};

/* c8 ignore start -- point d'entrée en ligne de commande, non exécuté par les tests */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.BUG_REPORT_PORT ?? 8787);
  const outDir = resolve(process.env.BUG_REPORT_DIR ?? 'bug-reports');
  createBugReportServer({ outDir, log: console.log }).listen(port, () => {
    console.log(`Réception des rapports de bug sur http://localhost:${port}/bug-reports`);
    console.log(`Rapports enregistrés dans ${outDir}`);
  });
}
/* c8 ignore stop */
