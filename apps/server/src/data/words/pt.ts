import type { WordBankFile } from './types';

const pt: WordBankFile = {
  animals: {
    easy: ['gato', 'cão', 'peixe', 'vaca', 'cavalo'],
    medium: ['elefante', 'girafa', 'tartaruga', 'borboleta', 'crocodilo'],
    hard: ['camaleão', 'ornitorrinco', 'pica-pau', 'cavalo-marinho', 'ouriço-cacheiro'],
  },
  food: {
    easy: ['maçã', 'pão', 'leite', 'banana', 'arroz'],
    medium: ['sanduíche', 'panqueca', 'melancia', 'abacaxi', 'sorvete'],
    hard: ['romã', 'couve-flor', 'cogumelo', 'brigadeiro', 'berinjela'],
  },
  objects: {
    easy: ['cadeira', 'mesa', 'livro', 'chave', 'relógio'],
    medium: ['binóculos', 'bicicleta', 'guarda-chuva', 'escova de dentes', 'vela'],
    hard: ['lustre', 'paraquedas', 'máquina de escrever', 'microscópio', 'bússola'],
  },
  nature: {
    easy: ['sol', 'lua', 'estrela', 'árvore', 'nuvem'],
    medium: ['arco-íris', 'vulcão', 'cachoeira', 'deserto', 'ilha'],
    hard: ['avalanche', 'terremoto', 'cometa', 'furacão', 'eclipse solar'],
  },
  technology: {
    easy: ['telefone', 'computador', 'câmera', 'robô', 'rádio'],
    medium: ['satélite', 'foguete', 'drone', 'notebook', 'impressora'],
    hard: ['holograma', 'microchip', 'painel solar', 'algoritmo', 'realidade virtual'],
  },
  sports: {
    easy: ['bola', 'futebol', 'críquete', 'corrida', 'natação'],
    medium: ['badminton', 'basquete', 'tênis', 'voleibol', 'skate'],
    hard: ['maratona', 'tiro com arco', 'ginástica', 'luta livre', 'salto com vara'],
  },
  places: {
    easy: ['casa', 'escola', 'parque', 'mercado', 'hospital'],
    medium: ['biblioteca', 'aeroporto', 'estação de trem', 'museu', 'zoológico'],
    hard: ['observatório', 'farol', 'castelo', 'arranha-céu', 'metrô'],
  },
  actions: {
    easy: ['comer', 'dormir', 'ler', 'correr', 'pular'],
    medium: ['desenhar', 'cozinhar', 'andar de bicicleta', 'cantar', 'empinar pipa'],
    hard: ['resolver um enigma', 'escalar uma montanha', 'mergulhar', 'fazer mágica', 'fazer malabarismo'],
  },
};

export default pt;