// Collecte des erreurs et avertissements de l'application, joints aux rapports de bug.
// Installé une seule fois au démarrage (src/main.jsx) ; garde les N derniers messages.

export const MAX_LOG_ENTRIES = 200;

const safeStringify = (value) => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

/** Transforme un argument de console en texte lisible. */
export const formatArg = (arg) => {
  if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
  if (typeof arg === 'string') return arg;
  if (arg === undefined) return 'undefined';
  return safeStringify(arg);
};

/** Tampon circulaire de messages. `now` est injectable pour les tests. */
export const createLogCollector = ({
  max = MAX_LOG_ENTRIES,
  now = () => new Date().toISOString(),
} = {}) => {
  const entries = [];
  return {
    add(level, args) {
      entries.push({ time: now(), level, message: args.map(formatArg).join(' ') });
      if (entries.length > max) entries.shift();
    },
    entries: () => entries.map((entry) => ({ ...entry })),
    clear: () => {
      entries.length = 0;
    },
  };
};

/**
 * Branche le collecteur sur `console.error`, `console.warn` et les erreurs non attrapées.
 * Les messages continuent de s'afficher normalement dans la console.
 */
export const installLogCollector = (collector, target = window, consoleObject = console) => {
  for (const level of ['error', 'warn']) {
    const original = consoleObject[level];
    consoleObject[level] = (...args) => {
      collector.add(level, args);
      original.apply(consoleObject, args);
    };
  }
  target.addEventListener('error', (event) =>
    collector.add('error', [event.error ?? event.message]),
  );
  target.addEventListener('unhandledrejection', (event) =>
    collector.add('error', ['Unhandled promise rejection:', event.reason]),
  );
};

/** Collecteur partagé par toute l'application. */
export const appLogCollector = createLogCollector();
