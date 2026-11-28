import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths for Electron compatibility
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    coverage: {
      provider: 'v8',
      // text : terminal · html : coverage/index.html · lcov : outils externes
      // json-summary + json : rapport publié dans les PR par la CI
      reporter: ['text', 'html', 'lcov', 'json-summary', 'json'],
      reportOnFailure: true,
      include: ['src/**/*.{js,jsx}', 'scripts/**/*.js'],
      exclude: ['**/__tests__/**', 'src/test/**'],
      // Quality gate : `npm run test:coverage` échoue sous ces seuils.
      // Règle : on ne les baisse JAMAIS (sinon, entrée dans docs/DEBT.md) ;
      // on les remonte quand la couverture progresse.
      // Historique : 2026-11-27 base stmts 47.6 / branches 44.8 / funcs 40.7 / lignes 50.0 ;
      // 2026-11-28 (Bug Reporting) stmts 53.0 / branches 49.3 / funcs 48.0 / lignes 55.2.
      thresholds: {
        statements: 50,
        branches: 46,
        functions: 45,
        lines: 52,
      },
    },
  },
});
