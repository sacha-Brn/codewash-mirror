import React, { useReducer } from 'react';
import { Brain, X } from 'lucide-react';
import { DIFFICULTIES, QUESTIONS_PER_GAME, fetchQuestions } from '../../trivia/triviaApi';
import { answerState, currentQuestion, initialState, triviaReducer } from '../../trivia/triviaGame';
import { playClick, playFail, playSuccessfulHit } from '../../utils/soundManager';

// Services réels ; les tests en passent des versions simulées via la prop `services`.
const defaultServices = {
  loadQuestions: (difficulty) => fetchQuestions({ difficulty }),
  playClick,
  playCorrect: playSuccessfulHit,
  playWrong: playFail,
};

const ERROR_MESSAGES = {
  network: 'Could not reach the trivia server. Check your internet connection.',
  'rate-limit': 'Too many requests. Please wait 5 seconds and try again.',
  'no-results': 'Not enough questions available. Try another difficulty.',
};
const GENERIC_ERROR = 'The trivia server returned an error. Please try again.';

const ANSWER_STYLES = {
  idle: 'bg-stone-800 border-stone-600 hover:bg-stone-700',
  correct: 'bg-emerald-700 border-emerald-400',
  wrong: 'bg-red-800 border-red-400',
};

const buttonClass =
  'px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-2xl uppercase tracking-wider';

const TriviaGame = ({ isOpen, onClose, services = defaultServices }) => {
  const [state, dispatch] = useReducer(triviaReducer, initialState);

  if (!isOpen) return null;

  const start = async () => {
    services.playClick();
    dispatch({ type: 'start' });
    try {
      dispatch({ type: 'loaded', questions: await services.loadQuestions(state.difficulty) });
    } catch (error) {
      dispatch({ type: 'failed', error: error.code ?? 'unknown' });
    }
  };

  const answer = (choice) => {
    const correct = choice === currentQuestion(state).correctAnswer;
    (correct ? services.playCorrect : services.playWrong)();
    dispatch({ type: 'answer', answer: choice });
  };

  const close = () => {
    dispatch({ type: 'back-to-setup' });
    onClose();
  };

  const question = currentQuestion(state);
  const total = state.questions.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close}></div>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="trivia-title"
        className="relative bg-stone-900 border-4 border-stone-600 rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-2xl text-stone-200"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 text-stone-400 hover:text-white"
        >
          <X size={24} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <Brain className="text-purple-400" size={32} />
          <h2
            id="trivia-title"
            className="text-3xl font-bold text-slate-300 uppercase tracking-wider"
          >
            Trivia
          </h2>
          {question && (
            <span className="ml-auto mr-8 text-xl text-stone-400">
              Question {state.index + 1}/{total} · Score {state.score}
            </span>
          )}
        </div>

        {state.status === 'setup' && (
          <div className="text-center space-y-4">
            <p className="text-xl text-stone-400">
              Answer {QUESTIONS_PER_GAME} general knowledge questions. Choose a difficulty:
            </p>
            <div className="flex justify-center gap-2" role="group" aria-label="Difficulty">
              {DIFFICULTIES.map((difficulty) => (
                <button
                  key={difficulty}
                  type="button"
                  aria-pressed={state.difficulty === difficulty}
                  onClick={() => dispatch({ type: 'choose-difficulty', difficulty })}
                  className={`px-4 py-1 rounded-lg border-2 text-xl capitalize ${
                    state.difficulty === difficulty
                      ? 'bg-purple-700 border-purple-400'
                      : 'bg-stone-800 border-stone-600 hover:bg-stone-700'
                  }`}
                >
                  {difficulty}
                </button>
              ))}
            </div>
            <button type="button" onClick={start} className={buttonClass}>
              Start
            </button>
          </div>
        )}

        {state.status === 'loading' && (
          <p className="text-center text-2xl animate-pulse">Loading questions…</p>
        )}

        {state.status === 'error' && (
          <div className="text-center space-y-4">
            <p role="alert" className="text-xl text-red-400">
              {ERROR_MESSAGES[state.error] ?? GENERIC_ERROR}
            </p>
            <button type="button" onClick={start} className={buttonClass}>
              Try again
            </button>
          </div>
        )}

        {question && (
          <div className="space-y-4">
            <p className="text-stone-400 text-lg">
              {question.category} · <span className="capitalize">{question.difficulty}</span>
            </p>
            <p className="text-2xl">{question.question}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {question.answers.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  disabled={state.status === 'answered'}
                  onClick={() => answer(choice)}
                  data-state={answerState(state, choice)}
                  className={`p-3 rounded-lg border-2 text-xl text-left transition-colors ${
                    ANSWER_STYLES[answerState(state, choice)]
                  }`}
                >
                  {choice}
                </button>
              ))}
            </div>
            {state.status === 'answered' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    services.playClick();
                    dispatch({ type: 'next' });
                  }}
                  className={buttonClass}
                >
                  {state.index + 1 < total ? 'Next' : 'See score'}
                </button>
              </div>
            )}
          </div>
        )}

        {state.status === 'finished' && (
          <div className="text-center space-y-4">
            <p className="text-3xl">
              Score: {state.score}/{total}
            </p>
            <div className="flex justify-center gap-3">
              <button type="button" onClick={start} className={buttonClass}>
                Play again
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'back-to-setup' })}
                className="px-6 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded-lg text-2xl uppercase tracking-wider"
              >
                Change difficulty
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TriviaGame;
