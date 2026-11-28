import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  // Démonte les composants rendus : sans l'option `globals` de Vitest, Testing Library
  // ne le fait pas automatiquement et les rendus s'empileraient d'un test à l'autre.
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
