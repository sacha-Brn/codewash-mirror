// Configuration du rapport de bug : à qui l'envoyer.
// Le fichier `public/bug-report.config.json` est copié tel quel dans le build : on peut donc
// changer le contact sans recompiler le jeu (voir docs/BUG_REPORTING.md).

export const CONFIG_URL = 'bug-report.config.json';

export const DEFAULT_CONFIG = Object.freeze({ contactEmail: '', endpoint: '' });

const text = (value) => (typeof value === 'string' ? value.trim() : '');

/** Ne garde que des champs texte attendus ; tout le reste est ignoré. */
export const normalizeConfig = (data) => ({
  contactEmail: text(data?.contactEmail),
  endpoint: text(data?.endpoint),
});

/** Charge la configuration ; en cas de problème, configuration vide (le rapport reste téléchargeable). */
export const loadBugReportConfig = async ({
  fetchFn = fetch,
  url = CONFIG_URL,
  logger = console,
} = {}) => {
  try {
    const response = await fetchFn(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return normalizeConfig(await response.json());
  } catch (error) {
    logger.warn(`[bug-report] Configuration illisible (${url}) : ${error.message}`);
    return { ...DEFAULT_CONFIG };
  }
};
