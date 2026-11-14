import { nomeBambina } from './state.js';
// Regole dei punteggi (0–10 caramelle), frasi di Virgola, personaggi.

export const TIPI = {
  chi: { etichetta: 'CHI?', nome: 'Chi' },
  fa: { etichetta: 'FA COSA?', nome: 'Fa cosa' },
  cosa: { etichetta: 'COSA?', nome: 'Cosa' },
  dove: { etichetta: 'DOVE?', nome: 'Dove' },
  quando: { etichetta: 'QUANDO?', nome: 'Quando' },
  perche: { etichetta: 'PERCHÉ?', nome: 'Perché' }
};

// Tutte le attività. gruppo: 'frasi' o 'suoni'. livelli: quanti livelli ha (0 = nessuno).
export const GIOCHI = {
  componi: { titolo: 'Componi la scena', sotto: 'Metti i mattoncini al posto giusto', tipo: 'fa', gruppo: 'frasi', livelli: 5 },
  dillo: { titolo: 'Dillo tu', sotto: 'Guarda la figura e parla', tipo: 'dove', gruppo: 'frasi', livelli: 5 },
  racconta: { titolo: 'Racconta la storia', sotto: 'Metti in ordine e racconta', tipo: 'cosa', gruppo: 'frasi', livelli: 3 },
  descrivi: { titolo: 'Descrivi la scena', sotto: 'Tante parole e una parola segreta', tipo: 'quando', gruppo: 'frasi', livelli: 5 },
  scombinata: { titolo: 'Frase scombinata', sotto: 'Rimetti le parole in ordine', tipo: 'chi', gruppo: 'frasi', livelli: 3 },
  unisci: { titolo: 'Unisci le frasi', sotto: 'Trova la parola che le lega', tipo: 'perche', gruppo: 'frasi', livelli: 0 },
  finisci: { titolo: 'Finisci tu', sotto: 'Completa la frase a voce', tipo: 'dove', gruppo: 'frasi', livelli: 0 },
  trasforma: { titolo: 'Trasforma', sotto: 'Ieri, domani, tanti…', tipo: 'fa', gruppo: 'frasi', livelli: 0 },
  dopo: { titolo: 'Cosa succede dopo?', sotto: 'Inventa il seguito della storia', tipo: 'cosa', gruppo: 'frasi', livelli: 0 },
  coppie: { titolo: 'Orecchie attente', sotto: 'Cane o pane? Ascolta e tocca', tipo: 'dove', gruppo: 'suoni', livelli: 0 },
  sillabe: { titolo: 'Battiamo le sillabe', sotto: 'Un colpo per ogni pezzetto', tipo: 'chi', gruppo: 'suoni', livelli: 0 },
  iniziale: { titolo: 'Come comincia?', sotto: 'Trova il suono iniziale', tipo: 'quando', gruppo: 'suoni', livelli: 0 },
  rime: { titolo: 'Le rime di Punto', sotto: 'Gatto fa rima con…', tipo: 'perche', gruppo: 'suoni', livelli: 0 },
  ripeti: { titolo: 'Ripeti con Virgola', sotto: 'Ascolta e ripeti', tipo: 'fa', gruppo: 'suoni', livelli: 4 },
  riassunto: { titolo: 'Riassumi la storia', sotto: 'Leggi, ascolta e racconta in breve', tipo: 'quando', gruppo: 'storie', livelli: 3 },
  allunga: { titolo: 'Allunga la frase', sotto: 'Da corta a lunghissima!', tipo: 'dove', gruppo: 'frasi', livelli: 0 },
  domande: { titolo: 'Le domande di Virgola', sotto: 'Rispondi con una frase intera', tipo: 'perche', gruppo: 'frasi', livelli: 0 },
  indovina: { titolo: 'Indovina cosa descrivo', sotto: 'Indizi, figure e indovinelli', tipo: 'chi', gruppo: 'storie', livelli: 3 },
  diario: { get titolo() { const n = nomeBambina(); return n ? `Il diario di ${n}` : 'Il mio diario'; }, sotto: 'Racconta la tua giornata, a voce o scrivendo', tipo: 'quando', gruppo: 'storie', livelli: 0 },
  dettato: { titolo: 'Dettato', sotto: 'Ascolta e scrivi con la tastiera', tipo: 'dove', gruppo: 'scrivo', livelli: 3 },
  cascata: { titolo: 'Cascata di lettere', sotto: 'Il gioco delle parole che cadono', tipo: 'perche', gruppo: 'scrivo', livelli: 3 },
  pronuncia: { titolo: 'Pronuncia con Virgola', sotto: 'TR, STR, Z, C, SC: diciamole bene!', tipo: 'chi', gruppo: 'suoni', livelli: 0 }
};
export const SUONI = {
  sc: { nome: 'SC dolce', esempio: 'sci, pesce', segno: /sc(?=[ei])/i },
  sk: { nome: 'SC duro', esempio: 'scala, scarpa', segno: /sch?/i },
  z: { nome: 'Z', esempio: 'zio, pizza', segno: /z+/i },
  tr: { nome: 'TR', esempio: 'treno, tromba', segno: /tr/i },
  str: { nome: 'STR', esempio: 'strada, mostro', segno: /str/i },
  k: { nome: 'C dura', esempio: 'cane, casa', segno: /c+(?=[aouh])/i },
  ci: { nome: 'C dolce', esempio: 'cena, ciao', segno: /c(?=[ei])/i }
};
export const GRUPPI = { frasi: 'Costruisco le frasi', storie: 'Racconto e capisco', suoni: 'Suoni e parole', scrivo: 'Scrivo e gioco' };

export function attivaGioco(config, id) {
  const a = (config && config.attivita) || {};
  return a[id] !== false;
}

// Punteggio per le attività a scelta: 10 al primo tentativo, 5 al secondo, poi 0.
export function puntiScelta(tentativi) { return [10, 5][tentativi - 1] ?? 0; }

const limita = (n) => Math.max(0, Math.min(10, Math.round(n)));

// Componi: si parte da 10; -2 per mattoncino sbagliato, -1 per ogni aiuto.
export function puntiComponi({ errori, aiuti }) { return limita(10 - 2 * errori - aiuti); }

// Dillo tu: 10 al primo colpo; -2 per ogni tentativo in più; -3 per ogni mattoncino d'aiuto.
export function puntiDillo({ tentativi, aiuti, trovati, totali }) {
  if (trovati < totali) return limita((10 * trovati) / totali - 2 * (tentativi - 1));
  return limita(10 - 2 * (tentativi - 1) - 3 * aiuti);
}

// Racconta: ordine fino a 6 punti (-2 per errore), racconto fino a 4 (parole ponte + vignette citate).
export function puntiRacconta({ errori, ponti, vignetteCitate, totaleVignette, raccontata }) {
  const ordine = Math.max(0, 6 - 2 * errori);
  if (!raccontata) return limita(ordine);
  const racconto = Math.min(2, ponti) + Math.round((2 * vignetteCitate) / Math.max(1, totaleVignette));
  return limita(ordine + racconto);
}

// Descrivi: parole fino a 6 punti, parola segreta 4 punti.
export function puntiDescrivi({ parole, obiettivo, segreta }) {
  return limita(6 * Math.min(1, parole / obiettivo) + (segreta ? 4 : 0));
}

export function fraseVirgola(punti, nome = '') {
  const scegli = (a) => a[Math.floor(Math.random() * a.length)];
  const n = nome ? `, ${nome}` : '';
  if (punti >= 10) return scegli([`Evviva${n}! Sei stata fantastica: 10 caramelle tutte per te!`, `Wow${n}! Perfetto! Ecco 10 caramelle!`, `Che campionessa! Punto è a bocca aperta: 10 caramelle!`]);
  if (punti >= 7) return scegli([`Bravissima${n}! Ti meriti ${punti} caramelle!`, `Ottimo lavoro! Ecco ${punti} caramelle, gnam!`, `Che brava! ${punti} caramelle nel tuo barattolo!`]);
  if (punti >= 4) return scegli([`Brava${n}! Ti do ${punti} caramelle. La prossima andrà ancora meglio!`, `Bene! ${punti} caramelle per te. Stai imparando tanto!`]);
  if (punti >= 1) return `Ti do ${punti} ${punti === 1 ? 'caramella' : 'caramelle'}. Non importa: ci riproviamo insieme, io e te!`;
  return 'Questa volta niente caramelle, ma hai imparato una frase nuova! Ci riproviamo insieme?';
}

// ---------- Le frasi di Virgola: tante, e mai le stesse due volte di fila ----------
const usate = {};
function pesca(chiave, lista) {
  const recenti = usate[chiave] || (usate[chiave] = []);
  const libere = lista.filter((f) => !recenti.includes(f));
  const f = (libere.length ? libere : lista)[Math.floor(Math.random() * (libere.length || lista.length))];
  recenti.push(f);
  if (recenti.length > Math.min(8, Math.floor(lista.length / 2))) recenti.shift();
  return f;
}
const conNome = (f, nome, prob = 0.25) => (nome && Math.random() < prob ? f.replace(/([!.?])$/, `, ${nome}$1`) : f);

const LODI = ['Brava!', 'Esatto!', 'Giusto!', 'Benissimo!', 'Sì, proprio così!', 'Evviva!', 'Che brava!', 'Super!',
  'Perfetto!', 'Fantastico!', 'Wow!', 'Grande!', 'Bellissimo!', 'Ottimo!', 'Ce l’hai fatta!', 'Giustissimo!',
  'Che orecchie fini!', 'Sei bravissima!', 'Punto fa i salti di gioia!', 'Così si fa!', 'Spettacolare!',
  'Mi hai stupita!', 'Hai fatto centro!', 'Bravissima davvero!', 'Che campionessa!', 'Applausi!', 'Splendido!'];
const RIPROVE = ['Uhm, non va lì. Guarda il colore!', 'Quasi! Prova un altro mattoncino.', 'Ops! Non è questo. Riprova, ce la fai!',
  'Mmm, sei vicina! Prova ancora.', 'Non proprio… guarda bene!', 'Ci sei quasi, riprova!', 'Ops, prova di nuovo!',
  'Questo no, ma non mollare!', 'Hmm, ascolta e guarda meglio.', 'Riprova, io credo in te!'];
const NON_SENTITO = ['Non ho sentito bene. Riprova!', 'Scusa, non ho capito. Me lo ridici?', 'Le mie orecchie non hanno sentito: riprova un po’ più forte!',
  'Ops, non ho sentito niente. Parla vicino al microfono!', 'Mi sono distratta! Me lo ripeti?', 'Non ho capito bene… riproviamo?'];
export const lode = (nome = '') => conNome(pesca('lode', LODI), nome, 0.2);
export const riprova = () => pesca('riprova', RIPROVE);
export const nonSentito = () => pesca('nonsentito', NON_SENTITO);
// compatibilità: chi usa ancora l'elenco riceve le lodi
export const INCORAGGIAMENTI = LODI;
export const RIPROVA = RIPROVE;

export function fraseSaluto(nome = '', serie = 0) {
  const ora = new Date().getHours();
  const momento = ora < 12 ? ['Buongiorno!', 'Buona mattina!'] : ora < 18 ? ['Buon pomeriggio!', 'Ciao ciao!'] : ['Buonasera!', 'Ciao, eccoti!'];
  const frasi = [
    'Scegli un gioco: io ti spiego tutto e Punto gioca con te.', 'Che bello vederti! Con quale gioco iniziamo oggi?',
    'Pronta? Ogni gioco finito vale tante caramelle!', 'Oggi che cosa ti va di fare? Frasi, storie o suoni?',
    'Punto ti stava aspettando! Scegli un gioco.', 'Io sono pronta, e tu? Scegli da dove partire!',
    'Ho preparato giochi nuovi per te. Scegli quello che ti piace!', 'Che ne dici di una sfida? Scegli un gioco!',
    'Il barattolo delle caramelle ha fame! Giochiamo?', 'Allora, cosa impariamo oggi?'
  ];
  let f = `${pesca('momento', momento)} ${pesca('saluto', frasi)}`;
  if (serie >= 2 && Math.random() < 0.6) f = `${pesca('momento', momento)} Giochi da ${serie} giorni di fila: fantastico! ${pesca('saluto', frasi)}`;
  return f.replace(/^([^!]+)!/, (m, a) => (nome && Math.random() < 0.5 ? `${a}, ${nome}!` : m));
}

// A fine ciclo: quota = caramelle prese / massimo possibile.
export function fraseFineCiclo(quota, caramelle, nome = '') {
  const n = nome ? `, ${nome}` : '';
  const alto = [`Evviva${n}! Hai guadagnato ${caramelle} caramelle!`, `Che campionessa${n}! ${caramelle} caramelle nel barattolo!`,
    `Wow! Punto è a bocca aperta: ${caramelle} caramelle!`, `Sei stata fantastica${n}! Ecco ${caramelle} caramelle, gnam!`,
    `Che partita! ${caramelle} caramelle tutte per te!`, `Applausi${n}! Ti sei meritata ${caramelle} caramelle!`];
  const medio = [`Brava${n}! Ecco ${caramelle} caramelle per te.`, `Bel lavoro! ${caramelle} caramelle nel tuo barattolo.`,
    `Hai guadagnato ${caramelle} caramelle! La prossima andrà ancora meglio.`, `Bene${n}! Stai imparando tanto: ${caramelle} caramelle!`,
    `${caramelle} caramelle! Ogni volta diventi più brava.`];
  const basso = [`Ti sei impegnata${n}: ecco ${caramelle} caramelle. Ci riproviamo insieme?`, `Non era facile! Intanto ecco ${caramelle} caramelle.`,
    `Hai finito tutto il gioco, ed è già una bella cosa! ${caramelle} caramelle per te.`, `Coraggio${n}! Con un po’ di allenamento andrà sempre meglio. Ecco ${caramelle} caramelle.`];
  if (!caramelle) return pesca('fine0', [`Hai finito tutto il gioco${n}! Questa volta niente caramelle, ma la prossima andrà meglio.`, 'Era difficile, vero? Riproviamo insieme un’altra volta!']);
  return pesca(quota >= 0.7 ? 'fineA' : quota >= 0.4 ? 'fineM' : 'fineB', quota >= 0.7 ? alto : quota >= 0.4 ? medio : basso);
}

// Personaggi tra cui scegliere (i primi sono gratis, gli altri si sbloccano con le caramelle).
export const PERSONAGGI = [
  { id: 'gatto', faccia: '🐱', nome: 'Gattina', costo: 0 },
  { id: 'cane', faccia: '🐶', nome: 'Cagnolino', costo: 0 },
  { id: 'coniglio', faccia: '🐰', nome: 'Coniglietta', costo: 0 },
  { id: 'volpe', faccia: '🦊', nome: 'Volpe', costo: 0 },
  { id: 'panda', faccia: '🐼', nome: 'Panda', costo: 0 },
  { id: 'rana', faccia: '🐸', nome: 'Ranocchia', costo: 0 },
  { id: 'koala', faccia: '🐨', nome: 'Koala', costo: 40 },
  { id: 'leone', faccia: '🦁', nome: 'Leoncino', costo: 80 },
  { id: 'gufo', faccia: '🦉', nome: 'Gufetta', costo: 130 },
  { id: 'polpo', faccia: '🐙', nome: 'Polpo', costo: 190 },
  { id: 'delfino', faccia: '🐬', nome: 'Delfina', costo: 260 },
  { id: 'unicorno', faccia: '🦄', nome: 'Unicorno', costo: 350 },
  { id: 'drago', faccia: '🐲', nome: 'Draghetto', costo: 450 },
  { id: 'astronauta', faccia: '🧑‍🚀', nome: 'Astronauta', costo: 600 },
  { id: 'giraffa', faccia: '🦒', nome: 'Giraffa', costo: 750 },
  { id: 'pinguino', faccia: '🐧', nome: 'Pinguino', costo: 900 },
  { id: 'farfalla', faccia: '🦋', nome: 'Farfalla', costo: 1050 },
  { id: 'tartaruga', faccia: '🐢', nome: 'Tartaruga', costo: 1200 },
  { id: 'riccio', faccia: '🦔', nome: 'Riccio', costo: 1400 },
  { id: 'ape', faccia: '🐝', nome: 'Apetta', costo: 1600 },
  { id: 'fenicottero', faccia: '🦩', nome: 'Fenicottero', costo: 1850 },
  { id: 'balena', faccia: '🐳', nome: 'Balena', costo: 2100 },
  { id: 'dinosauro', faccia: '🦖', nome: 'Dinosauro', costo: 2400 },
  { id: 'fatina', faccia: '🧚', nome: 'Fatina', costo: 2750 },
  { id: 'sirena', faccia: '🧜‍♀️', nome: 'Sirena', costo: 3100 },
  { id: 'supereroina', faccia: '🦸‍♀️', nome: 'Supereroina', costo: 3500 },
  { id: 'arcobaleno', faccia: '🌈', nome: 'Arcobaleno', costo: 4000 }
];

export function personaggio(id) { return PERSONAGGI.find((p) => p.id === id) || PERSONAGGI[0]; }

export function prossimoSblocco(caramelle) {
  return PERSONAGGI.find((p) => p.costo > caramelle) || null;
}
