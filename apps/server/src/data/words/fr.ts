import type { WordBankFile } from './types';

const fr: WordBankFile = {
  animals: {
    easy: ['chat', 'chien', 'poisson', 'oiseau', 'vache', 'cochon', 'canard', 'grenouille'],
    medium: [
      'éléphant',
      'girafe',
      'pingouin',
      'dauphin',
      'pieuvre',
      'kangourou',
      'papillon',
      'crocodile',
    ],
    hard: ['caméléon', 'ornithorynque', 'tatou', 'hérisson'],
  },
  food: {
    easy: ['pizza', 'pomme', 'gâteau', 'oeuf', 'pain', 'fromage', 'banane', 'biscuit'],
    medium: ['hamburger', 'spaghetti', 'crêpe', 'pastèque', 'ananas', 'glace', 'sushi', 'brioche'],
    hard: ['avocat', 'grenade', 'croissant', 'chou-fleur'],
  },
  objects: {
    easy: ['chaise', 'table', 'clé', 'porte', 'lampe', 'livre', 'horloge', 'chaussure'],
    medium: ['ciseaux', 'sac à dos', 'bougie', 'télescope', 'vélo', 'ballon', 'valise', 'échelle'],
    hard: ['sablier', 'parachute', 'lustre', 'boussole'],
  },
  nature: {
    easy: ['soleil', 'lune', 'étoile', 'arbre', 'fleur', 'nuage', 'pluie', 'montagne'],
    medium: [
      'arc-en-ciel',
      'volcan',
      'cascade',
      'tornade',
      'île',
      'désert',
      'cactus',
      'champignon',
    ],
    hard: ['aurore boréale', 'tremblement de terre', 'avalanche', 'geyser'],
  },
  technology: {
    easy: [
      'téléphone',
      'ordinateur',
      'appareil photo',
      'robot',
      'télévision',
      'clavier',
      'radio',
      'pile',
    ],
    medium: [
      'satellite',
      'fusée',
      'drone',
      'microphone',
      'lampe torche',
      'imprimante',
      'jeu vidéo',
      'circuit',
    ],
    hard: ['hologramme', 'algorithme', 'puce', 'panneau solaire'],
  },
  sports: {
    easy: ['football', 'tennis', 'golf', 'natation', 'boxe', 'baseball', 'basket', 'ski'],
    medium: [
      'volley',
      'surf',
      "tir à l'arc",
      'skateboard',
      'gymnastique',
      'pêche',
      'cyclisme',
      'aviron',
    ],
    hard: ['escrime', 'javelot', 'haltérophilie', 'marathon'],
  },
  places: {
    easy: ['maison', 'école', 'parc', 'ferme', 'château', 'pont', 'hôpital', 'zoo'],
    medium: ['aéroport', 'pyramide', 'igloo', 'gratte-ciel', 'cirque', 'stade', 'moulin', 'musée'],
    hard: ['tour eiffel', 'colisée', 'grande muraille', 'station spatiale'],
  },
  actions: {
    easy: ['dormir', 'manger', 'sauter', 'danser', 'pleurer', 'rire', 'lire', 'chanter'],
    medium: [
      'jongler',
      'éternuer',
      'peindre',
      'grimper',
      'cuisiner',
      'patiner',
      'camper',
      'câliner',
    ],
    hard: ['somnambulisme', 'rêvasser', 'hoqueter', 'bâiller'],
  },
};
export default fr;
