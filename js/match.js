// Confronto tra ciò che la bambina ha detto e le risposte attese.

export const STOPWORDS = new Set((
  'il lo la i gli le l un uno una un\' di a da in con su per tra fra del dello della dei degli delle ' +
  'al allo alla ai agli alle dal dallo dalla dai dagli dalle nel nello nella nei negli nelle col coi ' +
  'sul sullo sulla sui sugli sulle e ed o od ma anche che chi cui non ne ci vi si mi ti me te se ' +
  'lui lei loro noi voi io tu esso essa questo questa questi queste quello quella quelli quelle ' +
  'mio mia miei mie tuo tua suo sua suoi sue nostro nostra è e\' sono era erano ha hanno ho hai ' +
  'c poi dopo prima quando dove come perché perche cosa così cosi molto tanto più piu già gia ' +
  'eh ehm uhm mmm ok allora ecco tipo cioè cioe sta stanno stava'
).split(/\s+/));

export function senzaAccenti(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function normalizza(s) {
  return senzaAccenti(String(s || '').toLowerCase())
    .replace(/[’'`]/g, ' ')
    .replace(/[^a-z0-9\s*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parole(s) {
  const n = normalizza(s);
  return n ? n.split(' ') : [];
}

export function paroleContenuto(s) {
  return parole(s).filter((p) => p.length >= 2 && !STOPWORDS.has(p) && !/^\d+$/.test(p));
}

function tokenOk(tok, modello) {
  if (modello.endsWith('*')) return tok.startsWith(modello.slice(0, -1));
  return tok === modello;
}

// Cerca la sequenza di parole "modello" (anche con *) dentro "toks".
export function trova(toks, modello) {
  const m = parole(modello);
  if (!m.length) return -1;
  for (let i = 0; i + m.length <= toks.length; i++) {
    let ok = true;
    for (let j = 0; j < m.length; j++) if (!tokenOk(toks[i + j], m[j])) { ok = false; break; }
    if (ok) return i;
  }
  return -1;
}

// Risposte accettate per un elemento: quelle scritte + le parole significative del testo modello.
export function accettateDi(el) {
  const set = new Set((el.accettate || []).map((a) => normalizza(a)).filter(Boolean));
  for (const p of paroleContenuto(el.testo)) set.add(p);
  return [...set];
}

// Chiave "di suono": il riconoscimento vocale confonde spesso parole che suonano simili
// (cucina/cugina, gatto/gato, chiave/kiave). Togliamo doppie, h e differenze di grafia.
export function chiaveSuono(w) {
  return String(w).replace(/h/g, '').replace(/gn/g, 'ni').replace(/gli/g, 'li').replace(/q/g, 'c').replace(/k/g, 'c')
    .replace(/(.)\1+/g, '$1').replace(/[ou]$/, 'o').replace(/[ei]$/, 'e');
}
function distanza(a, b) {
  if (Math.abs(a.length - b.length) > 1) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[a.length][b.length];
}
// La parola detta "suona come" quella attesa? (solo per parole non troppo corte, per non confondere cane/pane)
function suonaCome(tok, modello) {
  if (modello.endsWith('*')) {
    const radice = chiaveSuono(modello.slice(0, -1));
    if (radice.length < 4) return false;
    const t = chiaveSuono(tok);
    return t.startsWith(radice) || (radice.length >= 5 && distanza(t.slice(0, radice.length), radice) <= 1);
  }
  if (modello.length < 4) return false;
  const a = chiaveSuono(tok), b = chiaveSuono(modello);
  if (a === b) return true;
  return modello.length >= 5 && distanza(a, b) <= 1;
}
function trovaSimile(toks, modello) {
  const m = parole(modello);
  if (m.length !== 1) return -1;
  return toks.findIndex((t) => suonaCome(t, m[0]));
}

// Restituisce l'insieme degli indici degli elementi riconosciuti nel testo.
// tollerante: accetta anche parole che "suonano come" quelle attese (errori del riconoscimento vocale).
export function valutaElementi(testo, elementi, { tollerante = false } = {}) {
  const toks = parole(testo);
  const trovati = new Set();
  const usati = new Set();
  elementi.forEach((el, i) => {
    const acc = accettateDi(el);
    for (const a of acc) {
      const pos = trova(toks, a);
      if (pos >= 0) {
        trovati.add(i);
        parole(a).forEach((_, k) => usati.add(pos + k));
        return;
      }
    }
    if (!tollerante) return;
    for (const a of acc) {
      const pos = trovaSimile(toks, a);
      if (pos >= 0 && !usati.has(pos)) { trovati.add(i); usati.add(pos); return; }
    }
  });
  return { trovati, usati, toks };
}

// Parole comuni che una bambina usa per descrivere una figura (per la lettura "guidata").
const BASE = ('il lo la i gli le l un uno una di a da in con su per tra fra del della dei delle al alla ai alle dal dalla nel nella nei nelle sul sulla sui ' +
  'e ed o ma anche che chi non ci si mi ti c è sono era erano ha hanno ho hai c\'è ci sono poi dopo prima quando dove come perché cosa così molto tanto più ' +
  'io tu lui lei noi voi loro questo questa quello quella suo sua loro mio mia ' +
  'bambino bambina bambini mamma papà nonno nonna signore signora maestra amico amica cane gatto ' +
  'fa fanno sta stanno gioca giocano mangia mangiano beve dorme corre corrono salta cammina legge scrive disegna guarda prende porta va vanno arriva ' +
  'casa scuola parco giardino cucina camera letto tavolo sedia strada mare spiaggia montagna bosco prato albero fiore sole pioggia neve ' +
  'oggi ieri domani mattina sera notte pomeriggio sempre adesso grande piccolo piccola bello bella felice contento contenta triste ' +
  'perche quindi allora però mentre insieme vicino sopra sotto dentro fuori davanti dietro').split(/\s+/);

// Vocabolario di un esercizio: parole della scena + parole comuni.
export function vocabolarioScena(voce) {
  const testi = [voce.frase, voce.descrizione, ...(voce.vocabolario || []),
    ...(voce.elementi || []).flatMap((e) => [e.testo, ...(e.accettate || []).filter((a) => !a.includes('*'))]),
    ...(voce.distrattori || []).map((d) => d.testo)];
  const set = new Set(BASE.map((w) => w.toLowerCase()));
  testi.filter(Boolean).forEach((t) => String(t).toLowerCase().replace(/[’']/g, ' ').replace(/[^a-zàèéìòù\s]/g, ' ').split(/\s+/).forEach((w) => { if (w.length > 1 || w === 'e' || w === 'a' || w === 'è') set.add(w); }));
  return [...set];
}

// Parole significative dette ma non previste (per "Frasi da rivedere").
export function paroleNonPreviste(testo, elementi, vocabolario = [], ignorate = []) {
  const { toks, usati } = valutaElementi(testo, elementi);
  const voc = new Set([...vocabolario, ...ignorate].map(normalizza));
  return [...new Set(toks.filter((t, i) => !usati.has(i) && t.length >= 3 && !STOPWORDS.has(t) && !voc.has(t)))];
}

// Conta le parole di contenuto distinte; segnala quali sono nel vocabolario della scena.
export function analizzaDescrizione(testo, vocabolario = []) {
  const voc = vocabolario.map(normalizza);
  const contenuto = [...new Set(paroleContenuto(testo))];
  const nelVoc = contenuto.filter((p) => voc.some((v) => tokenOk(p, v) || (v.length > 4 && p.startsWith(v.slice(0, -1)))));
  return { contenuto, nelVoc };
}

export function contiene(testo, parola) {
  return trova(parole(testo), parola) >= 0 || trova(parole(testo), parola.replace(/.$/, '*')) >= 0;
}

// Evidenzia le parole di contenuto in un testo (per la trascrizione).
export function evidenzia(testo, daEvidenziare, esc) {
  const set = new Set(daEvidenziare.map(normalizza));
  return String(testo || '').split(/(\s+)/).map((w) => {
    const n = normalizza(w);
    return n && set.has(n) ? `<mark>${esc(w)}</mark>` : esc(w);
  }).join('');
}
