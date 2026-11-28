// Lecture sûre des données persistées dans localStorage.
//
// Corrige DEBT-01 (sauvegarde corrompue écrasée sans copie), DEBT-02 (écran blanc sur JSON
// illisible) et DEBT-03 (exceptions utilisées pour détecter l'absence de sauvegarde).
// `storage` et `logger` sont injectables pour pouvoir tester sans navigateur.

export const LEGACY_SAVE_KEY = 'heroSkills_v23';

export const saveKey = (profileId) => `heroSkills_v23_p${profileId}`;

/**
 * Parse du JSON sans jamais lever d'exception.
 * @param {string|null|undefined} raw - texte lu dans le stockage
 * @param {*} fallback - valeur renvoyée si `raw` est absent ou illisible
 * @param {(error: Error) => void} [onError] - appelé uniquement si `raw` est illisible
 */
export const safeParse = (raw, fallback, onError) => {
  if (raw === null || raw === undefined || raw === '') return fallback;
  try {
    return JSON.parse(raw);
  } catch (error) {
    if (onError) onError(error);
    return fallback;
  }
};

/**
 * Conserve une copie d'une donnée illisible avant qu'elle soit écrasée par le jeu.
 * Copies sous `<clé>_corrupted`, puis `<clé>_corrupted_2`, `_3`… Une même donnée n'est
 * copiée qu'une fois. Renvoie la clé de la copie.
 */
export const backupCorrupted = (key, raw, storage = localStorage, logger = console) => {
  for (let index = 1; ; index++) {
    const backupKey = index === 1 ? `${key}_corrupted` : `${key}_corrupted_${index}`;
    const existing = storage.getItem(backupKey);
    if (existing === raw) return backupKey;
    if (existing === null) {
      storage.setItem(backupKey, raw);
      logger.error(
        `[storage] Donnée illisible sous "${key}" : copie conservée sous "${backupKey}".`,
      );
      return backupKey;
    }
  }
};

/** Lit et parse une clé ; si elle est illisible, la sauvegarde puis renvoie `fallback`. */
export const readJSON = (key, fallback, storage = localStorage, logger = console) => {
  const raw = storage.getItem(key);
  return safeParse(raw, fallback, () => backupCorrupted(key, raw, storage, logger));
};

/**
 * Sauvegarde d'un profil (`{ skills, theme, stats }` ou ancien format « skills à plat »),
 * avec repli sur l'ancienne clé `heroSkills_v23` pour le profil 1. `null` si aucune
 * sauvegarde lisible.
 */
export const readProfileSave = (profileId, storage = localStorage, logger = console) => {
  const key = saveKey(profileId);
  if (storage.getItem(key)) return readJSON(key, null, storage, logger);
  if (profileId === 1) return readJSON(LEGACY_SAVE_KEY, null, storage, logger);
  return null;
};
