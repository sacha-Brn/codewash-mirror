# Trivia : le mini-jeu de culture générale

Mini-jeu de questions à choix multiples, alimenté par l'API publique
[Open Trivia DB](https://opentdb.com).

---

## Pour le joueur

1. Bouton **cerveau violet** (en bas à droite, au-dessus du bouton Bug).
2. Choisir une difficulté : `any` (toutes), `easy`, `medium` ou `hard`, puis **Start**.
3. 10 questions, 4 réponses chacune. Après chaque réponse :
   - la bonne réponse s'affiche en **vert**, une mauvaise réponse choisie en **rouge** ;
   - un son de réussite ou d'échec est joué (les sons du jeu) ;
   - **Next** passe à la question suivante.
4. À la fin : le score (`Score: 7/10`), puis **Play again** ou **Change difficulty**.

| Message | Signification | Que faire |
|---|---|---|
| *Could not reach the trivia server* | pas d'accès à Internet | vérifier la connexion |
| *Too many requests. Please wait 5 seconds* | l'API n'accepte qu'une requête toutes les 5 secondes par adresse IP (important en classe : tous les postes partagent souvent la même IP) | attendre puis **Try again** |
| *Not enough questions available* | pas assez de questions pour cette difficulté | changer de difficulté |

> **Une connexion Internet est nécessaire** : les questions viennent d'opentdb.com. Le reste du jeu
> fonctionne normalement hors ligne.

---

## Ce que Trivia ne fait pas (choix volontaire)

Conformément au sujet de la mission *New game*, **Trivia n'est relié à aucun système du jeu** :
pas d'XP, pas de niveaux, pas de succès, pas de sauvegarde. Un test automatique le vérifie
(`TriviaGame.test.jsx` › « Trivia dans le jeu ») : la sauvegarde est identique avant et après une
partie complète.

La relier aux niveaux et aux succès est l'objet de la mission *New game+*. Voir « Pistes » plus bas.

---

## Pour les développeurs

### Architecture

| Fichier | Rôle | Dépend de |
|---|---|---|
| `src/trivia/triviaApi.js` | appel à l'API, décodage, mélange des réponses, codes d'erreur | `fetch`, `Math.random` (injectables) |
| `src/trivia/triviaGame.js` | règles de la partie : **reducer pur** (`setup → loading → question ⇄ answered → finished`, ou `error`) | rien |
| `src/components/trivia/TriviaGame.jsx` | fenêtre du jeu, style des autres fenêtres (pierre, VT323, icônes `lucide-react`) | les deux modules + sons, via la prop `services` |
| `src/App.jsx` | un état `isTriviaOpen`, le bouton et la fenêtre : **3 ajouts, aucune logique** | — |

### Choix techniques
- **`encode=url3986`** : par défaut l'API renvoie des entités HTML (`&quot;`, `&#039;`). Avec
  l'encodage URL, un simple `decodeURIComponent` suffit et le texte est affiché comme **texte**
  par React : aucun risque d'injection HTML.
- **Reducer pur** : toutes les règles (score, réponse unique, passage à la suite) se testent sans
  React ni réseau.
- **Services injectés** dans le composant (`loadQuestions`, sons) : les tests simulent l'API.
- Code de réponse réel observé : en cas de limite atteinte, l'API renvoie
  `{"response_code":5,"result":[]}`, avec `result` au singulier. Le client ne lit `results` qu'en
  cas de succès.

### Tests
- `src/trivia/__tests__/triviaApi.test.js` : URL, décodage sur une **vraie réponse de l'API**
  (relevée le 2026-11-28), tous les codes d'erreur 1 à 5, réseau coupé, réponse illisible.
- `src/trivia/__tests__/triviaGame.test.js` : toutes les transitions de la partie.
- `src/components/trivia/__tests__/TriviaGame.test.jsx` : partie complète dans l'interface,
  messages d'erreur, services réels (seul `fetch` simulé), et intégration dans `App`.
- Couverture : 100 % des trois fichiers.

### Ajouter un autre mini-jeu « autonome » sur ce modèle
1. Logique pure dans `src/<jeu>/` (reducer ou fonctions), testée seule.
2. Accès aux données externes dans un module séparé, avec `fetch` injectable.
3. Composant dans `src/components/<jeu>/`, qui reçoit ses dépendances par une prop `services`
   (valeurs réelles par défaut).
4. Dans `App.jsx` : un état `is<Jeu>Open`, un bouton, le composant. Rien d'autre.

### Pistes (non faites)
- **New game+** : ajouter Trivia à `SKILL_DATA` (`src/constants/gameData.jsx`) pour l'intégrer au
  carrousel, à l'XP et aux succès. Attention : plusieurs succès supposent **6 compétences**
  (`skill_mastery` affiche « x/6 », voir aussi DEBT-05), et `SkillCard.jsx` (complexité 107)
  devrait d'abord être découpé.
- Jeton de session de l'API (`api_token.php`) pour ne jamais reposer la même question.
- Choix de la catégorie (`api_category.php` liste les catégories).
- Textes de l'interface en anglais, comme le reste du jeu : à intégrer à la mission Translation.
