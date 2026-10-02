import type { WordBankFile } from './types';

const de: WordBankFile = {
  animals: {
    easy: ['katze', 'hund', 'fisch', 'vogel', 'kuh', 'schwein', 'ente', 'frosch', 'kaninchen', 'maus', 'huhn', 'schaf', 'pferd', 'löwe', 'tiger', 'bär', 'eule', 'delphin', 'wal', 'schlange'],
    medium: ['elefant', 'giraffe', 'pinguin', 'delfin', 'krake', 'känguru', 'schmetterling', 'krokodil', 'kamel', 'zebra', 'flamingo', 'fledermaus', 'otter', 'panther', 'robbe'],
    hard: ['chamäleon', 'schnabeltier', 'gürteltier', 'igel', 'narwal', 'seepferdchen', 'narwal', 'murmeltier', 'kobra', 'gecko'],
  },
  food: {
    easy: ['pizza', 'apfel', 'kuchen', 'ei', 'brot', 'käse', 'banane', 'keks', 'weintrauben', 'orange', 'reis', 'milch', 'suppe', 'bonbon', 'tomate', 'karotte', 'kartoffel', 'birne', 'kaffee', 'tee'],
    medium: ['hamburger', 'spaghetti', 'pfannkuchen', 'wassermelone', 'ananas', 'eiscreme', 'brezel', 'bratwurst', 'taco', 'sushi', 'croissant', 'donut', 'salat', 'curry', 'lasagne'],
    hard: ['avocado', 'granatapfel', 'croissant', 'blumenkohl', 'aubergine', 'mango', 'zimtstern', 'nudel', 'apfelkuchen', 'schokoladenkeks'],
  },
  objects: {
    easy: ['stuhl', 'tisch', 'schlüssel', 'tür', 'lampe', 'buch', 'uhr', 'schuh', 'kiste', 'hose', 'hemd', 'glas', 'löffel', 'gabel', 'teller', 'tasche', 'flasche', 'hut', 'kamm', 'rucksack'],
    medium: ['schere', 'rucksack', 'kerze', 'fernrohr', 'fahrrad', 'luftballon', 'koffer', 'leiter', 'mikrofon', 'brille', 'ball', 'vorhang', 'stuhl', 'zahnbürste'],
    hard: ['sanduhr', 'fallschirm', 'kronleuchter', 'kompass', 'schreibmaschine', 'mikroskop', 'globus', 'ventilator', 'kamera', 'geldschrank'],
  },
  nature: {
    easy: ['sonne', 'mond', 'stern', 'baum', 'blume', 'wolke', 'regen', 'berg', 'fluss', 'meer', 'blatt', 'schnee', 'gras', 'felsen', 'see', 'wind', 'wald', 'nest', 'feuer', 'insel'],
    medium: ['regenbogen', 'vulkan', 'wasserfall', 'tornado', 'insel', 'wüste', 'kaktus', 'pilz', 'dschungel', 'strand', 'wiese', 'höhle', 'ozean', 'eisberg', 'düne'],
    hard: ['polarlicht', 'erdbeben', 'lawine', 'geysir', 'sonnenfinsternis', 'meteor', 'sumpf', 'mündung', 'vulkaninsel', 'moor'],
  },
  technology: {
    easy: ['telefon', 'computer', 'kamera', 'roboter', 'fernseher', 'tastatur', 'radio', 'batterie', 'bildschirm', 'maus', 'ladegerät', 'lautsprecher', 'tablet', 'konsole', 'smartwatch', 'wecker'],
    medium: ['satellit', 'rakete', 'drohne', 'mikrofon', 'taschenlampe', 'drucker', 'videospiel', 'schaltkreis', 'algorithmus', 'modem', 'scanner', 'laptop', 'streaming', 'wifi'],
    hard: ['hologramm', 'algorithmus', 'mikrochip', 'solarpanel', 'virtuelle realität', 'künstliche intelligenz', 'cloud', 'quantencomputer', 'integrierter schaltkreis', 'kernfusion'],
  },
  sports: {
    easy: ['fußball', 'tennis', 'golf', 'schwimmen', 'boxen', 'baseball', 'basketball', 'skifahren', 'radfahren', 'leichtathletik', 'volleyball', 'surfing', 'rudern', 'handball', 'eislaufen'],
    medium: ['volleyball', 'surfen', 'bogenschießen', 'skateboard', 'turnen', 'angeln', 'radfahren', 'rudern', 'badminton', 'karate', 'taekwondo', 'rugby', 'seilspringen', 'windsurfen'],
    hard: ['fechten', 'speerwurf', 'gewichtheben', 'marathon', 'wasserball', 'triathlon', 'bobsleigh', 'hochsprung', 'rhythmische gymnastik', 'kajak'],
  },
  places: {
    easy: ['haus', 'schule', 'park', 'bauernhof', 'schloss', 'brücke', 'krankenhaus', 'zoo', 'markt', 'bibliothek', 'strand', 'bahnhof', 'supermarkt', 'flughafen', 'restaurant'],
    medium: ['flughafen', 'pyramide', 'iglu', 'wolkenkratzer', 'zirkus', 'stadion', 'windmühle', 'museum', 'u-bahn', 'dorf', 'leuchtturm', 'theater', 'garten', 'universität'],
    hard: ['eiffelturm', 'kolosseum', 'chinesische mauer', 'raumstation', 'observatorium', 'palast', 'hauptstraße', 'wüste', 'heiligtum', 'bahnhofsgebäude'],
  },
  actions: {
    easy: ['schlafen', 'essen', 'springen', 'tanzen', 'weinen', 'lachen', 'lesen', 'singen', 'zeichnen', 'schwimmen', 'laufen', 'schreiben', 'juchzen', 'antworten', 'gehen'],
    medium: ['jonglieren', 'niesen', 'malen', 'klettern', 'kochen', 'skaten', 'zelten', 'umarmen', 'angeln', 'reisen', 'meditieren', 'drachen steigen lassen', 'ausmalen', 'yoga machen'],
    hard: ['schlafwandeln', 'tagträumen', 'schluckauf', 'gähnen', 'puzzle lösen', 'magie machen', 'im chor singen', 'radfahren', 'auf schnee ski fahren', 'an einer brücke hängen'],
  },
};
export default de;
