// Regole dei punteggi (0–10 caramelle), frasi di Virgola, personaggi.

export const TIPI = {
  chi: { etichetta: 'CHI?', nome: 'Chi' },
  fa: { etichetta: 'FA COSA?', nome: 'Fa cosa' },
  cosa: { etichetta: 'COSA?', nome: 'Cosa' },
  dove: { etichetta: 'DOVE?', nome: 'Dove' },
  quando: { etichetta: 'QUANDO?', nome: 'Quando' },
  perche: { etichetta: 'PERCHÉ?', nome: 'Perché' }
};

export const GIOCHI = {
  componi: { titolo: 'Componi la scena', sotto: 'Metti i mattoncini al posto giusto', tipo: 'fa' },
  dillo: { titolo: 'Dillo tu', sotto: 'Guarda la figura e parla', tipo: 'dove' },
  racconta: { titolo: 'Racconta la storia', sotto: 'Metti in ordine e racconta', tipo: 'cosa' },
  descrivi: { titolo: 'Descrivi la scena', sotto: 'Tante parole e una parola segreta', tipo: 'quando' }
};

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

export function fraseVirgola(punti) {
  const scegli = (a) => a[Math.floor(Math.random() * a.length)];
  if (punti >= 10) return scegli(['Perfetto! Ti do 10 caramelle!', 'Bravissima! Tutte e 10 le caramelle sono tue!', 'Che campionessa! 10 caramelle!']);
  if (punti >= 7) return scegli([`Molto brava! Ti do ${punti} caramelle.`, `Ottimo lavoro! Ecco ${punti} caramelle.`]);
  if (punti >= 4) return scegli([`Brava! Ti do ${punti} caramelle. La prossima volta ancora meglio!`, `Bene! ${punti} caramelle per te.`]);
  if (punti >= 1) return `Ti do ${punti} ${punti === 1 ? 'caramella' : 'caramelle'}. Ci riproviamo insieme?`;
  return 'Questa volta niente caramelle, ma hai imparato una frase nuova! Riproviamo?';
}

export const INCORAGGIAMENTI = ['Brava!', 'Esatto!', 'Giusto!', 'Benissimo!', 'Sì, proprio così!'];
export const RIPROVA = ['Uhm, non va lì. Guarda il colore!', 'Quasi! Prova un altro mattoncino.', 'Non è questo. Riprova!'];

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
