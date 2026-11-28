import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TriviaGame from '../TriviaGame';
import App from '../../../App';

const questions = [
  {
    category: 'Science',
    difficulty: 'easy',
    question: 'What is H2O?',
    correctAnswer: 'Water',
    answers: ['Salt', 'Water', 'Air', 'Fire'],
  },
  {
    category: 'History',
    difficulty: 'easy',
    question: 'Who built the pyramids?',
    correctAnswer: 'Egyptians',
    answers: ['Egyptians', 'Romans', 'Vikings', 'Mayas'],
  },
];

const fakeServices = (overrides = {}) => ({
  loadQuestions: vi.fn(async () => questions),
  playClick: vi.fn(),
  playCorrect: vi.fn(),
  playWrong: vi.fn(),
  ...overrides,
});

const renderGame = (services = fakeServices(), onClose = vi.fn()) => {
  render(<TriviaGame isOpen onClose={onClose} services={services} />);
  return { services, onClose };
};
const click = (name) => fireEvent.click(screen.getByRole('button', { name }));

describe('TriviaGame', () => {
  it('fermé -> rien n’est affiché', () => {
    const { container } = render(<TriviaGame isOpen={false} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('partie complète : difficulté, réponses, sons, score final', async () => {
    const { services } = renderGame();
    click('hard');
    expect(screen.getByRole('button', { name: 'hard' })).toHaveAttribute('aria-pressed', 'true');
    click('Start');
    expect(services.loadQuestions).toHaveBeenCalledWith('hard');

    expect(await screen.findByText('What is H2O?')).toBeInTheDocument();
    expect(screen.getByText('Question 1/2 · Score 0')).toBeInTheDocument();
    click('Water');
    expect(services.playCorrect).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Water' })).toHaveAttribute('data-state', 'correct');
    expect(screen.getByRole('button', { name: 'Salt' })).toBeDisabled();
    click('Next');

    expect(screen.getByText('Question 2/2 · Score 1')).toBeInTheDocument();
    click('Romans');
    expect(services.playWrong).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Romans' })).toHaveAttribute('data-state', 'wrong');
    expect(screen.getByRole('button', { name: 'Egyptians' })).toHaveAttribute(
      'data-state',
      'correct',
    );
    click('See score');

    expect(screen.getByText('Score: 1/2')).toBeInTheDocument();
    click('Change difficulty');
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
  });

  it('rejouer relance une partie', async () => {
    const { services } = renderGame();
    click('Start');
    await screen.findByText('What is H2O?');
    click('Water');
    click('Next');
    click('Egyptians');
    click('See score');
    click('Play again');
    expect(services.loadQuestions).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('Question 1/2 · Score 0')).toBeInTheDocument();
  });

  it.each([
    ['rate-limit', /wait 5 seconds/],
    ['network', /internet connection/],
    ['no-results', /another difficulty/],
    ['invalid-parameter', /returned an error/],
  ])('erreur « %s » -> message adapté et bouton réessayer', async (code, message) => {
    const loadQuestions = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error(), { code }))
      .mockResolvedValueOnce(questions);
    renderGame(fakeServices({ loadQuestions }));
    click('Start');
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    click('Try again');
    expect(await screen.findByText('What is H2O?')).toBeInTheDocument();
  });

  it('erreur sans code -> message générique', async () => {
    renderGame(fakeServices({ loadQuestions: vi.fn(async () => Promise.reject(new Error('x'))) }));
    click('Start');
    expect(await screen.findByRole('alert')).toHaveTextContent(/returned an error/);
  });

  it('affiche « Loading » pendant le chargement', () => {
    renderGame(fakeServices({ loadQuestions: vi.fn(() => new Promise(() => {})) }));
    click('Start');
    expect(screen.getByText(/loading questions/i)).toBeInTheDocument();
  });

  it('fermer (croix) remet la partie à zéro', async () => {
    const { onClose } = renderGame();
    click('Start');
    await screen.findByText('What is H2O?');
    click('Close');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
  });

  it('services par défaut : questions réelles demandées à Open Trivia DB', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        response_code: 0,
        results: [
          {
            category: 'Art',
            difficulty: 'easy',
            question: 'Who%20painted%20it%3F',
            correct_answer: 'Monet',
            incorrect_answers: ['Dali', 'Klimt', 'Goya'],
          },
        ],
      }),
    });
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue();
    render(<TriviaGame isOpen onClose={() => {}} />);
    click('Start');
    expect(await screen.findByText('Who painted it?')).toBeInTheDocument();
    expect(fetchSpy.mock.calls[0][0]).toMatch(/^https:\/\/opentdb\.com\/api\.php\?/);
    click('Monet');
    click('See score');
    expect(screen.getByText('Score: 1/1')).toBeInTheDocument();
  });
});

// Intégration dans le jeu : le mini-jeu est accessible et n'est PAS relié aux niveaux ni aux
// succès (exigence du sujet pour la mission « New game »).
describe('Trivia dans le jeu', () => {
  it('le bouton Trivia ouvre le mini-jeu, et une partie ne modifie ni niveaux ni succès', async () => {
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => ({
      ok: true,
      json: async () =>
        String(url).startsWith('https://opentdb.com')
          ? {
              response_code: 0,
              results: [
                {
                  category: 'Art',
                  difficulty: 'easy',
                  question: 'Q%3F',
                  correct_answer: 'Oui',
                  incorrect_answers: ['Non', 'Peut-%C3%AAtre', 'Jamais'],
                },
              ],
            }
          : {},
    }));
    render(<App />);
    const saveBefore = JSON.parse(localStorage.getItem('heroSkills_v23_p1'));

    fireEvent.click(screen.getByRole('button', { name: 'Trivia' }));
    click('Start');
    fireEvent.click(await screen.findByRole('button', { name: 'Oui' }));
    click('See score');
    expect(screen.getByText('Score: 1/1')).toBeInTheDocument();

    const saveAfter = JSON.parse(localStorage.getItem('heroSkills_v23_p1'));
    expect(saveAfter.skills).toEqual(saveBefore.skills);
    expect(saveAfter.stats.achievementsUnlocked).toEqual(saveBefore.stats.achievementsUnlocked);
    expect(saveAfter.stats.totalMobsDefeated).toBe(saveBefore.stats.totalMobsDefeated);
  });
});
