// Règles d'une partie de Trivia, sous forme de reducer pur (utilisé avec useReducer).
// Aucune dépendance à React, au réseau ou au son : entièrement testable.
//
// Déroulé : setup -> loading -> question <-> answered -> finished
//                        \-> error (on peut réessayer)

export const initialState = {
  status: 'setup',
  difficulty: 'any',
  questions: [],
  index: 0,
  score: 0,
  selected: null,
  error: null,
};

export const triviaReducer = (state, action) => {
  switch (action.type) {
    case 'choose-difficulty':
      return { ...state, difficulty: action.difficulty };
    case 'start':
      return { ...initialState, difficulty: state.difficulty, status: 'loading' };
    case 'loaded':
      return { ...state, status: 'question', questions: action.questions };
    case 'failed':
      return { ...state, status: 'error', error: action.error };
    case 'answer': {
      if (state.status !== 'question') return state;
      const correct = action.answer === state.questions[state.index].correctAnswer;
      return {
        ...state,
        status: 'answered',
        selected: action.answer,
        score: state.score + (correct ? 1 : 0),
      };
    }
    case 'next': {
      if (state.status !== 'answered') return state;
      const isLast = state.index + 1 >= state.questions.length;
      return isLast
        ? { ...state, status: 'finished', selected: null }
        : { ...state, status: 'question', index: state.index + 1, selected: null };
    }
    case 'back-to-setup':
      return { ...initialState, difficulty: state.difficulty };
    default:
      return state;
  }
};

/** Question en cours, ou `null` hors partie. */
export const currentQuestion = (state) =>
  state.status === 'question' || state.status === 'answered' ? state.questions[state.index] : null;

/** L'état d'un bouton de réponse, pour l'affichage. */
export const answerState = (state, answer) => {
  if (state.status !== 'answered') return 'idle';
  if (answer === currentQuestion(state).correctAnswer) return 'correct';
  return answer === state.selected ? 'wrong' : 'idle';
};
