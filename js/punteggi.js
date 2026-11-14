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
  ripeti: { titolo: 'Ripeti con Virgola', sotto: 'Ascolta e ripeti', tipo: 'fa', gruppo: 'suoni', livelli: 4 }
};
export const GRUPPI = { frasi: 'Costruisco le frasi', suoni: 'Suoni e parole' };

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

export const INCORAGGIAMENTI = ['Brava!', 'Esatto!', 'Giusto!', 'Benissimo!', 'Sì, proprio così!', 'Evviva!', 'Che brava!', 'Super!'];
export const RIPROVA = ['Uhm, non va lì. Guarda il colore!', 'Quasi! Prova un altro mattoncino.', 'Ops! Non è questo. Riprova, ce la fai!', 'Mmm, sei vicina! Prova ancora.'];

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
  { id: 'astronauta', faccia: '🧑‍🚀', nome: 'Astronauta', costo: 600 }
];

export function personaggio(id) { return PERSONAGGI.find((p) => p.id === id) || PERSONAGGI[0]; }

export function prossimoSblocco(caramelle) {
  return PERSONAGGI.find((p) => p.costo > caramelle) || null;
}
