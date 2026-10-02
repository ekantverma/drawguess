import type { WordBankFile } from './types';

const pt: WordBankFile = {
  animals: {
    easy: ['gato', 'cão', 'peixe', 'vaca', 'cavalo', 'coelho', 'rato', 'galinha', 'ovelha', 'leão', 'tigre', 'urso', 'coruja', 'golfinho', 'baleia', 'cobra', 'borboleta', 'pato', 'sapo'],
    medium: ['elefante', 'girafa', 'tartaruga', 'borboleta', 'crocodilo', 'camelo', 'zebra', 'flamingo', 'morcego', 'lontra', 'pantera', 'foca', 'rinoceronte', 'alpaca'],
    hard: ['camaleão', 'ornitorrinco', 'pica-pau', 'cavalo-marinho', 'ouriço-cacheiro', 'narval', 'golfinho', 'pulga', 'lêmure', 'lemur'],
  },
  food: {
    easy: ['maçã', 'pão', 'leite', 'banana', 'arroz', 'uva', 'laranja', 'sopa', 'doce', 'tomate', 'cenoura', 'batata', 'limão', 'café', 'chá', 'pera', 'bolo', 'queijo', 'coco'],
    medium: ['sanduíche', 'panqueca', 'melancia', 'abacaxi', 'sorvete', 'taco', 'sushi', 'croissant', 'salada', 'curry', 'lasanha', 'cuscuz', 'brigadeiro', 'acai'],
    hard: ['romã', 'couve-flor', 'cogumelo', 'brigadeiro', 'berinjela', 'manga', 'canela', 'massa', 'torta de maçã', 'chocolate amargo'],
  },
  objects: {
    easy: ['cadeira', 'mesa', 'livro', 'chave', 'relógio', 'caixa', 'calça', 'camisa', 'copo', 'colher', 'garfo', 'prato', 'bolsa', 'garrafa', 'chapéu', 'pente', 'mochila', 'papel', 'sapato', 'vela'],
    medium: ['binóculos', 'bicicleta', 'guarda-chuva', 'escova de dentes', 'vela', 'microfone', 'óculos', 'bola', 'cortina', 'cadeira de balanço', 'aspirador', 'ventilador', 'escada', 'pincel'],
    hard: ['lustre', 'paraquedas', 'máquina de escrever', 'microscópio', 'bússola', 'relógio de areia', 'globo terrestre', 'câmera', 'cofre', 'ferramenta de corte'],
  },
  nature: {
    easy: ['sol', 'lua', 'estrela', 'árvore', 'nuvem', 'chuva', 'montanha', 'rio', 'mar', 'folha', 'neve', 'grama', 'pedra', 'lago', 'vento', 'floresta', 'ninho', 'fogo', 'ilha', 'oceano'],
    medium: ['arco-íris', 'vulcão', 'cachoeira', 'deserto', 'ilha', 'selva', 'praia', 'savana', 'caverna', 'oceano', 'iceberg', 'duna', 'geiser', 'pântano'],
    hard: ['avalanche', 'terremoto', 'cometa', 'furacão', 'eclipse solar', 'meteoro', 'pântano', 'estuário', 'montanha de neve', 'mar de gelo'],
  },
  technology: {
    easy: ['telefone', 'computador', 'câmera', 'robô', 'rádio', 'tela', 'mouse', 'carregador', 'alto-falante', 'tablet', 'console', 'smartwatch', 'despertador'],
    medium: ['satélite', 'foguete', 'drone', 'notebook', 'impressora', 'microfone', 'lanterna', 'modem', 'scanner', 'laptop', 'streaming', 'wifi'],
    hard: ['holograma', 'microchip', 'painel solar', 'algoritmo', 'realidade virtual', 'inteligência artificial', 'nuvem', 'computador quântico', 'circuito integrado', 'fusão nuclear'],
  },
  sports: {
    easy: ['bola', 'futebol', 'críquete', 'corrida', 'natação', 'ciclismo', 'atletismo', 'vôlei', 'surfe', 'remo', 'handebol', 'patinação', 'rugby', 'tênis'],
    medium: ['badminton', 'basquete', 'tênis', 'voleibol', 'skate', 'boxe', 'karatê', 'taekwondo', 'rugby', 'saltar corda', 'polo aquático', 'tiro com arco'],
    hard: ['maratona', 'tiro com arco', 'ginástica', 'luta livre', 'salto com vara', 'triatlo', 'bobsled', 'salto em altura', 'gimnástica rítmica', 'caiaque'],
  },
  places: {
    easy: ['casa', 'escola', 'parque', 'mercado', 'hospital', 'biblioteca', 'praia', 'estação', 'supermercado', 'aeroporto', 'restaurante', 'templo'],
    medium: ['biblioteca', 'aeroporto', 'estação de trem', 'museu', 'zoológico', 'metrô', 'vila', 'farol', 'teatro', 'jardim', 'universidade'],
    hard: ['observatório', 'farol', 'castelo', 'arranha-céu', 'metrô', 'palácio', 'avenida principal', 'deserto', 'santuário', 'estação ferroviária'],
  },
  actions: {
    easy: ['comer', 'dormir', 'ler', 'correr', 'pular', 'nadar', 'escrever', 'dançar', 'desenhar', 'responder', 'aplaudir', 'andar'],
    medium: ['desenhar', 'cozinhar', 'andar de bicicleta', 'cantar', 'empinar pipa', 'pescar', 'viajar', 'meditar', 'pintar', 'fazer yoga', 'jogar', 'conversar'],
    hard: ['resolver um enigma', 'escalar uma montanha', 'mergulhar', 'fazer mágica', 'fazer malabarismo', 'resolver um quebra-cabeça', 'apresentar truques', 'esquiar na neve', 'pendurar em uma ponte', 'fazer acrobacias'],
  },
};

export default pt;