// Client de l'API Open Trivia DB (https://opentdb.com).
// Les textes sont demandés encodés en URL (RFC 3986) : un simple decodeURIComponent suffit,
// sans risque d'injecter du HTML (l'encodage par défaut renvoie des entités HTML).

export const API_URL = 'https://opentdb.com/api.php';
export const QUESTIONS_PER_GAME = 10;
export const DIFFICULTIES = ['any', 'easy', 'medium', 'hard'];

// Codes de réponse documentés par l'API.
export const RESPONSE_ERRORS = {
  1: 'no-results', // pas assez de questions pour cette demande
  2: 'invalid-parameter',
  3: 'token-not-found',
  4: 'token-empty',
  5: 'rate-limit', // une seule requête toutes les 5 secondes par adresse IP
};

/** Construit l'URL de la requête. `difficulty: 'any'` = toutes difficultés. */
export const buildQuestionsUrl = ({ amount = QUESTIONS_PER_GAME, difficulty = 'any' } = {}) => {
  const params = new URLSearchParams({
    amount: String(amount),
    type: 'multiple',
    encode: 'url3986',
  });
  if (difficulty !== 'any') params.set('difficulty', difficulty);
  return `${API_URL}?${params}`;
};

/** Mélange de Fisher-Yates ; `random` injectable pour des tests déterministes. */
export const shuffle = (items, random = Math.random) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/** Transforme une question brute de l'API en question prête à afficher. */
export const normalizeQuestion = (raw, random = Math.random) => {
  const decode = decodeURIComponent;
  const correctAnswer = decode(raw.correct_answer);
  return {
    category: decode(raw.category),
    difficulty: decode(raw.difficulty),
    question: decode(raw.question),
    correctAnswer,
    answers: shuffle([correctAnswer, ...raw.incorrect_answers.map(decode)], random),
  };
};

/** Erreur portant un code lisible par l'interface (`network`, `rate-limit`, …). */
export class TriviaError extends Error {
  constructor(code) {
    super(`Open Trivia DB : ${code}`);
    this.name = 'TriviaError';
    this.code = code;
  }
}

/** Récupère et prépare une partie. Lève une `TriviaError` en cas de problème. */
export const fetchQuestions = async ({ difficulty = 'any', fetchFn = fetch, random } = {}) => {
  let data;
  try {
    const response = await fetchFn(buildQuestionsUrl({ difficulty }));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
  } catch {
    throw new TriviaError('network');
  }
  if (data.response_code !== 0) {
    throw new TriviaError(RESPONSE_ERRORS[data.response_code] ?? 'unknown');
  }
  return data.results.map((raw) => normalizeQuestion(raw, random));
};
