import type { WordBankFile } from './types';

const fr: WordBankFile = {
  animals: {
    easy: ['chat', 'chien', 'poisson', 'oiseau', 'vache', 'cochon', 'canard', 'grenouille', 'lapin', 'souris', 'poulet', 'mouton', 'cheval', 'lion', 'tigre', 'ours', 'hibou', 'dauphin', 'baleine', 'serpent'],
    medium: ['éléphant', 'girafe', 'pingouin', 'dauphin', 'pieuvre', 'kangourou', 'papillon', 'crocodile', 'chameau', 'zèbre', 'flamant', 'chauve-souris', 'loutre', 'panthère', 'morse'],
    hard: ['caméléon', 'ornithorynque', 'tatou', 'hérisson', 'narval', 'lamantin', 'mandrill', 'stegosaure', 'aplysie', 'iguane'],
  },
  food: {
    easy: ['pizza', 'pomme', 'gâteau', 'oeuf', 'pain', 'fromage', 'banane', 'biscuit', 'raisin', 'orange', 'riz', 'lait', 'soupe', 'bonbon', 'tomate', 'carotte', 'pomme de terre', 'poire', 'café', 'thé'],
    medium: ['hamburger', 'spaghetti', 'crêpe', 'pastèque', 'ananas', 'glace', 'sushi', 'brioche', 'taco', 'pancake', 'salade', 'curry', 'lasagne', 'bagel', 'soupe de légumes'],
    hard: ['avocat', 'grenade', 'croissant', 'chou-fleur', 'aubergine', 'mangue', 'cannelle', 'nouille', 'tarte aux pommes', 'chocolat noir'],
  },
  objects: {
    easy: ['chaise', 'table', 'clé', 'porte', 'lampe', 'livre', 'horloge', 'chaussure', 'boîte', 'pantalon', 'chemise', 'verre', 'cuillère', 'fourchette', 'assiette', 'sac', 'bouteille', 'chapeau', 'peigne', 'cartable'],
    medium: ['ciseaux', 'sac à dos', 'bougie', 'télescope', 'vélo', 'ballon', 'valise', 'échelle', 'microphone', 'lunettes', 'voiture', 'rideau', 'fauteuil', 'brosse à dents'],
    hard: ['sablier', 'parachute', 'lustre', 'boussole', 'machine à écrire', 'microscope', 'globe terrestre', 'ventilateur', 'caméra', 'coffre-fort'],
  },
  nature: {
    easy: ['soleil', 'lune', 'étoile', 'arbre', 'fleur', 'nuage', 'pluie', 'montagne', 'rivière', 'mer', 'feuille', 'neige', 'herbe', 'roche', 'lac', 'vent', 'forêt', 'nid', 'feu', 'île'],
    medium: ['arc-en-ciel', 'volcan', 'cascade', 'tornade', 'île', 'désert', 'cactus', 'champignon', 'forêt tropicale', 'plage', 'prairie', 'grotte', 'océan', 'iceberg', 'dune'],
    hard: ['aurore boréale', 'tremblement de terre', 'avalanche', 'geyser', 'éclipse solaire', 'météorite', 'marais', 'estuaire', 'vulcan', 'tourbière'],
  },
  technology: {
    easy: ['téléphone', 'ordinateur', 'appareil photo', 'robot', 'télévision', 'clavier', 'radio', 'pile', 'écran', 'souris', 'chargeur', 'haut-parleur', 'tablette', 'console', 'montre connectée', 'réveil'],
    medium: ['satellite', 'fusée', 'drone', 'microphone', 'lampe torche', 'imprimante', 'jeu vidéo', 'circuit', 'algorithme', 'modem', 'scanner', 'ordinateur portable', 'streaming', 'wifi'],
    hard: ['hologramme', 'algorithme', 'puce', 'panneau solaire', 'réalité virtuelle', 'intelligence artificielle', 'nuage', 'ordinateur quantique', 'circuit intégré', 'fusion nucléaire'],
  },
  sports: {
    easy: ['football', 'tennis', 'golf', 'natation', 'boxe', 'baseball', 'basket', 'ski', 'cyclisme', 'athlétisme', 'volley', 'surf', 'aviron', 'handball', 'patinage'],
    medium: ['volley', 'surf', "tir à l'arc", 'skateboard', 'gymnastique', 'pêche', 'cyclisme', 'aviron', 'badminton', 'karaté', 'taekwondo', 'rugby', 'saut à la corde', 'planche à voile'],
    hard: ['escrime', 'javelot', 'haltérophilie', 'marathon', 'water-polo', 'triathlon', 'bobsleigh', 'saut en hauteur', 'gymnastique rythmique', 'kayak'],
  },
  places: {
    easy: ['maison', 'école', 'parc', 'ferme', 'château', 'pont', 'hôpital', 'zoo', 'marché', 'bibliothèque', 'plage', 'gare', 'supermarché', 'aéroport', 'restaurant'],
    medium: ['aéroport', 'pyramide', 'igloo', 'gratte-ciel', 'cirque', 'stade', 'moulin', 'musée', 'métro', 'village', 'phare', 'théâtre', 'jardin', 'université'],
    hard: ['tour eiffel', 'colisée', 'grande muraille', 'station spatiale', 'observatoire', 'palais', 'grande avenue', 'désert', 'sanctuaire', 'gare routière'],
  },
  actions: {
    easy: ['dormir', 'manger', 'sauter', 'danser', 'pleurer', 'rire', 'lire', 'chanter', 'dessiner', 'nager', 'courir', 'écrire', 'applaudir', 'répondre', 'marcher'],
    medium: ['jongler', 'éternuer', 'peindre', 'grimper', 'cuisiner', 'patiner', 'camper', 'câliner', 'pêcher', 'voyager', 'méditer', 'faire voler un cerf-volant', 'colorier', 'faire du yoga'],
    hard: ['somnambulisme', 'rêvasser', 'hoqueter', 'bâiller', 'résoudre un puzzle', 'faire de la magie', 'chanter en chœur', 'rouler à vélo', 'skier sur la neige', 'se suspendre à un pont'],
  },
};
export default fr;
