// Construction d'un rapport de bug complet. Fonctions pures : horloge, stockage,
// environnement et générateur d'identifiant sont injectés.

export const MIN_DESCRIPTION_LENGTH = 10;

/** Copie de toutes les données du jeu (sauvegardes, profils, préférences) stockées localement. */
export const collectGameData = (storage = localStorage) => {
  const data = {};
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    data[key] = storage.getItem(key);
  }
  return data;
};

export const currentEnvironment = (win = window) => ({
  userAgent: win.navigator.userAgent,
  url: win.location.href,
  viewport: `${win.innerWidth}x${win.innerHeight}`,
  language: win.navigator.language,
});

export const createReportId = (createdAt, random = Math.random) =>
  `bug-${createdAt.replace(/[:.]/g, '-')}-${random().toString(36).slice(2, 8)}`;

/** Renvoie un code d'erreur, ou `null` si le formulaire est valide. */
export const validateReportInput = ({ description = '' }) =>
  description.trim().length < MIN_DESCRIPTION_LENGTH ? 'description-too-short' : null;

export const buildReport = (
  {
    description,
    steps = '',
    reporterEmail = '',
    attachments = [],
    includeGameData = true,
    includeLogs = true,
  },
  {
    now = () => new Date(),
    storage = localStorage,
    logs = [],
    environment = currentEnvironment(),
    random = Math.random,
  } = {},
) => {
  const createdAt = now().toISOString();
  return {
    id: createReportId(createdAt, random),
    createdAt,
    description: description.trim(),
    steps: steps.trim(),
    reporterEmail: reporterEmail.trim(),
    environment,
    logs: includeLogs ? logs : [],
    gameData: includeGameData ? collectGameData(storage) : {},
    attachments,
  };
};
