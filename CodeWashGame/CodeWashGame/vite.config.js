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
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/**/__tests__/**', 'src/test/**'],
      // Quality gate : `npm run test:coverage` échoue sous ces seuils.
      // Règle : on ne les baisse JAMAIS (sinon, entrée dans docs/DEBT.md) ;
      // on les remonte quand la couverture progresse.
      // Base mesurée le 2026-11-27 : stmts 47.6 %, branches 44.8 %, funcs 40.7 %, lignes 50.0 %.
      thresholds: {
        statements: 45,
        branches: 42,
        functions: 38,
        lines: 47,
      },
    },
  },
});
