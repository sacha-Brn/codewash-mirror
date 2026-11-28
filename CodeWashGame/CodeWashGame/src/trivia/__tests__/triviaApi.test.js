import { describe, it, expect, vi } from 'vitest';
import {
  API_URL,
  QUESTIONS_PER_GAME,
  DIFFICULTIES,
  RESPONSE_ERRORS,
  buildQuestionsUrl,
  shuffle,
  normalizeQuestion,
  TriviaError,
  fetchQuestions,
} from '../triviaApi';

// Question au format réel de l'API avec encode=url3986 (relevé le 2026-11-28).
const rawQuestion = {
  type: 'multiple',
  difficulty: 'easy',
  category: 'Entertainment%3A%20Video%20Games',
  question: 'What%20ingredients%20are%20required%20to%20make%20a%20cake%20in%20Minecraft%3F',
  correct_answer: 'Milk%2C%20Sugar%2C%20Egg%2C%20and%20Wheat',
  incorrect_answers: [
    'Milk%2C%20Bread%2C%20Egg%2C%20and%20Wheat',
    'Milk%2C%20Sugar%20Cane%2C%20Egg%2C%20and%20Wheat',
    'Milk%2C%20Sugar%2C%20and%20Wheat',
  ],
};
const response = (body, ok = true) => ({ ok, status: ok ? 200 : 503, json: async () => body });

describe('buildQuestionsUrl', () => {
  it('10 questions à choix multiples, textes encodés en URL, toutes difficultés', () => {
    expect(QUESTIONS_PER_GAME).toBe(10);
    expect(DIFFICULTIES).toEqual(['any', 'easy', 'medium', 'hard']);
    expect(buildQuestionsUrl()).toBe(`${API_URL}?amount=10&type=multiple&encode=url3986`);
  });

  it('difficulté choisie', () => {
    expect(buildQuestionsUrl({ amount: 5, difficulty: 'hard' })).toBe(
      `${API_URL}?amount=5&type=multiple&encode=url3986&difficulty=hard`,
    );
  });
});

describe('shuffle', () => {
  it('ne modifie pas le tableau d’origine et garde tous les éléments', () => {
    const items = [1, 2, 3, 4];
    const result = shuffle(items);
    expect(items).toEqual([1, 2, 3, 4]);
    expect([...result].sort()).toEqual([1, 2, 3, 4]);
  });

  it('déterministe avec un hasard contrôlé', () => {
    expect(shuffle(['a', 'b', 'c', 'd'], () => 0)).toEqual(['b', 'c', 'd', 'a']);
    expect(shuffle(['a', 'b', 'c', 'd'], () => 0.999)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('normalizeQuestion', () => {
  it('décode les textes et mélange la bonne réponse parmi les autres', () => {
    expect(normalizeQuestion(rawQuestion, () => 0.999)).toEqual({
      category: 'Entertainment: Video Games',
      difficulty: 'easy',
      question: 'What ingredients are required to make a cake in Minecraft?',
      correctAnswer: 'Milk, Sugar, Egg, and Wheat',
      answers: [
        'Milk, Sugar, Egg, and Wheat',
        'Milk, Bread, Egg, and Wheat',
        'Milk, Sugar Cane, Egg, and Wheat',
        'Milk, Sugar, and Wheat',
      ],
    });
  });

  it('du HTML dans une question reste du texte (pas d’injection)', () => {
    const q = normalizeQuestion({ ...rawQuestion, question: '%3Cb%3Ex%3C%2Fb%3E' });
    expect(q.question).toBe('<b>x</b>');
  });
});

describe('fetchQuestions', () => {
  it('succès (code 0) -> questions prêtes à afficher', async () => {
    const fetchFn = vi.fn(async () => response({ response_code: 0, results: [rawQuestion] }));
    const questions = await fetchQuestions({ difficulty: 'easy', fetchFn, random: () => 0 });
    expect(fetchFn).toHaveBeenCalledWith(
      `${API_URL}?amount=10&type=multiple&encode=url3986&difficulty=easy`,
    );
    expect(questions).toHaveLength(1);
    expect(questions[0].correctAnswer).toBe('Milk, Sugar, Egg, and Wheat');
  });

  // Format réel observé : en cas de limite atteinte, l'API répond `result` (pas `results`).
  it.each([
    [1, 'no-results'],
    [2, 'invalid-parameter'],
    [3, 'token-not-found'],
    [4, 'token-empty'],
    [5, 'rate-limit'],
    [99, 'unknown'],
  ])('code %i -> erreur « %s »', async (code, expected) => {
    expect(RESPONSE_ERRORS[5]).toBe('rate-limit');
    const fetchFn = async () => response({ response_code: code, result: [] });
    await expect(fetchQuestions({ fetchFn })).rejects.toMatchObject({
      name: 'TriviaError',
      code: expected,
    });
  });

  it.each([
    ['réseau coupé', async () => Promise.reject(new TypeError('Failed to fetch'))],
    ['erreur HTTP', async () => response({}, false)],
    [
      'réponse illisible',
      async () => ({ ok: true, json: async () => Promise.reject(new SyntaxError()) }),
    ],
  ])('%s -> erreur « network »', async (_, fetchFn) => {
    await expect(fetchQuestions({ fetchFn })).rejects.toEqual(new TriviaError('network'));
  });

  it('utilise fetch global par défaut', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(response({ response_code: 0, results: [] }));
    await expect(fetchQuestions()).resolves.toEqual([]);
    expect(spy).toHaveBeenCalledWith(`${API_URL}?amount=10&type=multiple&encode=url3986`);
  });
});
