import { describe, it, expect } from 'vitest';
import { initialState, triviaReducer, currentQuestion, answerState } from '../triviaGame';

const questions = [
  { question: 'Q1', correctAnswer: 'A', answers: ['A', 'B', 'C', 'D'] },
  { question: 'Q2', correctAnswer: 'C', answers: ['A', 'B', 'C', 'D'] },
];
const play = (...actions) => actions.reduce(triviaReducer, initialState);
const started = () =>
  play(
    { type: 'choose-difficulty', difficulty: 'hard' },
    { type: 'start' },
    { type: 'loaded', questions },
  );

describe('triviaReducer', () => {
  it('état initial : écran de choix de la difficulté', () => {
    expect(initialState).toMatchObject({ status: 'setup', difficulty: 'any', score: 0 });
  });

  it('choisir la difficulté puis lancer -> chargement, difficulté conservée', () => {
    expect(
      play({ type: 'choose-difficulty', difficulty: 'hard' }, { type: 'start' }),
    ).toMatchObject({
      status: 'loading',
      difficulty: 'hard',
    });
  });

  it('questions chargées -> première question', () => {
    const state = started();
    expect(state).toMatchObject({ status: 'question', index: 0 });
    expect(currentQuestion(state).question).toBe('Q1');
  });

  it('échec du chargement -> erreur', () => {
    expect(play({ type: 'start' }, { type: 'failed', error: 'rate-limit' })).toMatchObject({
      status: 'error',
      error: 'rate-limit',
    });
  });

  it('bonne réponse -> +1 point', () => {
    expect(triviaReducer(started(), { type: 'answer', answer: 'A' })).toMatchObject({
      status: 'answered',
      selected: 'A',
      score: 1,
    });
  });

  it('mauvaise réponse -> 0 point', () => {
    expect(triviaReducer(started(), { type: 'answer', answer: 'B' }).score).toBe(0);
  });

  it('on ne peut pas répondre deux fois à la même question', () => {
    const answered = triviaReducer(started(), { type: 'answer', answer: 'B' });
    expect(triviaReducer(answered, { type: 'answer', answer: 'A' })).toBe(answered);
  });

  it('« suivant » uniquement après avoir répondu', () => {
    const state = started();
    expect(triviaReducer(state, { type: 'next' })).toBe(state);
  });

  it('partie complète : 2 questions, score final, puis rejouer', () => {
    let state = started();
    state = triviaReducer(state, { type: 'answer', answer: 'A' });
    state = triviaReducer(state, { type: 'next' });
    expect(state).toMatchObject({ status: 'question', index: 1, selected: null });
    state = triviaReducer(state, { type: 'answer', answer: 'C' });
    state = triviaReducer(state, { type: 'next' });
    expect(state).toMatchObject({ status: 'finished', score: 2 });
    expect(currentQuestion(state)).toBeNull();
    expect(triviaReducer(state, { type: 'start' })).toMatchObject({
      status: 'loading',
      score: 0,
      index: 0,
      difficulty: 'hard',
    });
  });

  it('retour au choix de difficulté : partie remise à zéro, difficulté gardée', () => {
    const state = triviaReducer(triviaReducer(started(), { type: 'answer', answer: 'A' }), {
      type: 'back-to-setup',
    });
    expect(state).toEqual({ ...initialState, difficulty: 'hard' });
  });

  it('action inconnue -> état inchangé', () => {
    expect(triviaReducer(initialState, { type: 'inconnue' })).toBe(initialState);
  });
});

describe('answerState', () => {
  it('avant de répondre : tous neutres', () => {
    expect(answerState(started(), 'A')).toBe('idle');
  });

  it('après une mauvaise réponse : la bonne en vert, celle choisie en rouge, les autres neutres', () => {
    const state = triviaReducer(started(), { type: 'answer', answer: 'B' });
    expect(['A', 'B', 'C'].map((a) => answerState(state, a))).toEqual(['correct', 'wrong', 'idle']);
  });
});
