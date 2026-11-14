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

// Restituisce l'insieme degli indici degli elementi riconosciuti nel testo.
export function valutaElementi(testo, elementi) {
  const toks = parole(testo);
  const trovati = new Set();
  const usati = new Set();
  elementi.forEach((el, i) => {
    for (const a of accettateDi(el)) {
      const pos = trova(toks, a);
      if (pos >= 0) {
        trovati.add(i);
        parole(a).forEach((_, k) => usati.add(pos + k));
        break;
      }
    }
  });
  return { trovati, usati, toks };
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
