// Dettato: Virgola detta un pezzo alla volta, la bambina scrive con la tastiera (niente microfono).
import { S, impostazioni } from '../state.js';
import { esc, ICONE, virgolaDice, aggiornaFumetto, collegaFumetti, attendi } from '../ui.js';
import { lode } from '../punteggi.js';
import { parla } from '../tts.js';

export const OPZIONI_DETTATO = { parole: 3, maiuscole: false, punteggiatura: false };
export function opzioniDettato() { return { ...OPZIONI_DETTATO, ...((S.config && S.config.dettato) || {}) }; }

export const TIPI_ERRORE = {
  doppia: 'doppie', accento: 'accenti', apostrofo: 'apostrofi', h: 'acca (h)', suoni: 'gruppi di lettere (gn, gl, ch, qu…)',
  maiuscola: 'maiuscole', punteggiatura: 'punteggiatura', staccata: 'parole staccate', attaccate: 'parole attaccate',
  mancante: 'parole saltate', inpiu: 'parole in più', altro: 'altri errori'
};

const ATTENZIONE = { doppia: 'alle doppie', accento: 'agli accenti', apostrofo: 'agli apostrofi', h: 'all’acca', suoni: 'ai gruppi di lettere come gn, gl, ch', maiuscola: 'alle maiuscole', punteggiatura: 'alla punteggiatura', staccata: 'alle parole che vanno scritte attaccate', attaccate: 'agli spazi tra le parole', mancante: 'a non saltare le parole' };
const PUNTI = /[.,;:!?«»"“”()…\-–]/g;
const senzaAccenti = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const apo = (s) => s.replace(/[’`´]/g, '\'');

function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[a.length][b.length];
}

// Come si confrontano le parole in base alle opzioni scelte dai genitori.
function normalizzatore(opz) {
  return (t) => {
    let s = apo(t);
    if (!opz.punteggiatura) s = s.replace(PUNTI, '');
    if (!opz.maiuscole) s = s.toLowerCase();
    return s;
  };
}

const suoni = (s) => s.toLowerCase().replace(/k/g, 'c').replace(/gn/g, 'ni').replace(/gli/g, 'li').replace(/ch/g, 'c').replace(/gh/g, 'g')
  .replace(/qu/g, 'cu').replace(/cqu/g, 'cu').replace(/cie/g, 'ce').replace(/gie/g, 'ge').replace(/sci([aou])/g, 'sc$1');

export function tipoErrore(atteso, scritto) {
  const a = apo(atteso), b = apo(scritto);
  if (a.toLowerCase() === b.toLowerCase()) return 'maiuscola';
  if (a.replace(PUNTI, '') === b.replace(PUNTI, '')) return 'punteggiatura';
  const al = a.toLowerCase().replace(PUNTI, ''), bl = b.toLowerCase().replace(PUNTI, '');
  if (al === bl) return 'punteggiatura';
  if (senzaAccenti(al) === senzaAccenti(bl)) return 'accento';
  if (al.replace(/'/g, '') === bl.replace(/'/g, '')) return 'apostrofo';
  if (senzaAccenti(al.replace(/'/g, '')) === senzaAccenti(bl.replace(/'/g, ''))) return 'apostrofo';
  const sd = (s) => s.replace(/(.)\1+/g, '$1');
  if (sd(senzaAccenti(al)) === sd(senzaAccenti(bl))) return 'doppia';
  if (al.replace(/h/g, '') === bl.replace(/h/g, '')) return 'h';
  if (sd(suoni(senzaAccenti(al))) === sd(suoni(senzaAccenti(bl)))) return 'suoni';
  return 'altro';
}

// Allinea le parole del testo con quelle scritte (anche parole attaccate o staccate).
export function correggi(testo, scritto, opz = OPZIONI_DETTATO) {
  const n = normalizzatore(opz);
  const T = testo.split(/\s+/).filter(Boolean).map((o) => ({ o, n: n(o) })).filter((x) => x.n);
  const W = String(scritto || '').split(/\s+/).filter(Boolean).map((o) => ({ o, n: n(o) })).filter((x) => x.n);
  const I = T.length, J = W.length;
  const D = Array.from({ length: I + 1 }, () => new Array(J + 1).fill(Infinity));
  const B = Array.from({ length: I + 1 }, () => new Array(J + 1).fill(null));
  D[0][0] = 0;
  const costoSost = (a, b) => {
    if (a === b) return 0;
    const r = lev(a, b) / Math.max(a.length, b.length);
    return r <= 0.5 ? 0.6 + r * 0.4 : 1.2;
  };
  const togli = (s) => s.replace(/'/g, '');
  for (let i = 0; i <= I; i++) for (let j = 0; j <= J; j++) {
    const v = D[i][j];
    if (v === Infinity) continue;
    const prova = (ii, jj, c, op) => { if (ii <= I && jj <= J && v + c < D[ii][jj]) { D[ii][jj] = v + c; B[ii][jj] = { i, j, op }; } };
    if (i < I && j < J) prova(i + 1, j + 1, costoSost(T[i].n, W[j].n), 'sost');
    if (i < I) prova(i + 1, j, 1, 'manca');
    if (j < J) prova(i, j + 1, 1, 'extra');
    if (i < I && j + 1 < J && togli(T[i].n) === togli(W[j].n + W[j + 1].n)) prova(i + 1, j + 2, 0.5, 'staccata');
    if (i + 1 < I && j < J && togli(T[i].n + T[i + 1].n) === togli(W[j].n)) prova(i + 2, j + 1, 0.5, 'attaccate');
  }
  const out = [];
  let i = I, j = J;
  while (i > 0 || j > 0) {
    const b = B[i][j];
    if (!b) break;
    if (b.op === 'sost') {
      const t = T[b.i], w = W[b.j];
      out.push(t.n === w.n ? { atteso: t.o, scritto: w.o, ok: true } : { atteso: t.o, scritto: w.o, tipo: tipoErrore(t.n, w.n) });
    } else if (b.op === 'manca') out.push({ atteso: T[b.i].o, scritto: '', tipo: 'mancante' });
    else if (b.op === 'extra') out.push({ atteso: '', scritto: W[b.j].o, tipo: 'inpiu' });
    else if (b.op === 'staccata') out.push({ atteso: T[b.i].o, scritto: `${W[b.j].o} ${W[b.j + 1].o}`, tipo: 'staccata' });
    else out.push({ atteso: `${T[b.i].o} ${T[b.i + 1].o}`, scritto: W[b.j].o, tipo: 'attaccate', due: true });
    i = b.i; j = b.j;
  }
  out.reverse();
  const giuste = out.filter((x) => x.ok).length;
  const errori = out.filter((x) => !x.ok);
  return { righe: out, giuste, totale: T.length, errori };
}

function pezzi(testo, quante) {
  if (!quante) return testo.match(/[^.!?]+[.!?…]*\s*/g).map((s) => s.trim()).filter(Boolean);
  const t = testo.split(/\s+/).filter(Boolean);
  const out = [];
  for (let i = 0; i < t.length; i += quante) out.push(t.slice(i, i + quante).join(' '));
  return out;
}

function daDire(pezzo, opz) {
  if (!opz.punteggiatura) return pezzo.replace(/[«»"“”()]/g, '');
  return pezzo.replace(/\?/g, ' punto interrogativo. ').replace(/!/g, ' punto esclamativo. ').replace(/,/g, ' virgola, ')
    .replace(/:/g, ' due punti. ').replace(/;/g, ' punto e virgola. ').replace(/\.(\s|$)/g, ' punto. ');
}

export function dettato(area, { voce, fine }) {
  const opz = opzioniDettato();
  const lista = pezzi(voce.testo, Number(opz.parole) || 0);
  const leggi = impostazioni().letturaAutomatica;
  let k = 0, finito = false;
  const quanteTxt = opz.parole ? `${opz.parole} ${opz.parole === 1 ? 'parola' : 'parole'} alla volta` : 'una frase alla volta';
  const avvisi = [opz.maiuscole ? 'attenta alle maiuscole' : '', opz.punteggiatura ? 'scrivi anche i punti e le virgole' : ''].filter(Boolean).join(' e ');
  const intro = `Facciamo un dettato! Ti detto ${quanteTxt}: ascolta bene e scrivi${avvisi ? `, ${avvisi}` : ''}. Quando hai scritto, tocca Avanti.`;
  area.innerHTML = `<div class="due-colonne dettato">
    <div class="colonna">
      <div class="card foglio">
        <div class="riga-pulsanti" style="justify-content:space-between;align-items:center">
          <span class="passo-di" id="pezzo-n"></span>
          <div class="riga-pulsanti">
            <button class="btn secondario piccolo" id="ripeti">${ICONE.altoparlante} Ripeti</button>
            <button class="btn secondario piccolo" id="piano">🐢 Più piano</button>
          </div>
        </div>
        <textarea id="foglio" rows="6" spellcheck="false" autocorrect="off" autocapitalize="off" autocomplete="off" aria-label="Scrivi qui il dettato" placeholder="Scrivi qui…"></textarea>
        <div class="correzione nascosto" id="correzione"></div>
      </div>
    </div>
    <div class="colonna">
      ${virgolaDice(intro)}
      <div style="margin-top:auto;display:flex;flex-direction:column;gap:12px;align-items:center">
        <button class="btn grande" id="avanti-pezzo">Avanti ${ICONE.avanti}</button>
        <button class="link" id="rileggi" style="display:none">Rileggimi tutto il dettato</button>
      </div>
    </div></div>`;
  collegaFumetti(area);
  const foglio = area.querySelector('#foglio');
  const detta = (piano = false) => {
    if (k >= lista.length) return;
    parla(daDire(lista[k], opz), piano ? { velocita: 0.7 } : undefined);
  };
  const aggiorna = () => {
    area.querySelector('#pezzo-n').textContent = k < lista.length ? `Pezzo ${k + 1} di ${lista.length}` : 'Hai scritto tutto!';
    const b = area.querySelector('#avanti-pezzo');
    b.innerHTML = k >= lista.length - 1 ? `Ho finito, correggi! ${ICONE.avanti}` : `Avanti ${ICONE.avanti}`;
    area.querySelector('#rileggi').style.display = k >= lista.length - 1 ? '' : 'none';
  };
  aggiorna();
  setTimeout(() => {
    if (leggi) parla(intro);
    setTimeout(() => { detta(); foglio.focus({ preventScroll: true }); }, leggi ? 300 : 600);
  }, 400);
  area.querySelector('#ripeti').onclick = () => { detta(); foglio.focus({ preventScroll: true }); };
  area.querySelector('#piano').onclick = () => { detta(true); foglio.focus({ preventScroll: true }); };
  area.querySelector('#rileggi').onclick = () => parla(daDire(voce.testo, opz));
  area.querySelector('#avanti-pezzo').onclick = () => {
    if (finito) return;
    if (k < lista.length - 1) {
      k++;
      if (foglio.value && !/\s$/.test(foglio.value)) foglio.value += ' ';
      aggiorna();
      detta();
      foglio.focus({ preventScroll: true });
      return;
    }
    if (!foglio.value.trim()) { aggiornaFumetto(area, 'Il foglio è ancora vuoto! Scrivi quello che ti ho dettato.', { leggi }); return; }
    chiudi();
  };

  async function chiudi() {
    finito = true;
    k = lista.length;
    aggiorna();
    const r = correggi(voce.testo, foglio.value, opz);
    foglio.readOnly = true;
    foglio.classList.add('nascosto');
    area.querySelector('#avanti-pezzo').style.display = 'none';
    area.querySelector('#rileggi').style.display = 'none';
    area.querySelector('#piano').disabled = true;
    area.querySelector('#ripeti').disabled = true;
    const perTipo = {};
    r.errori.forEach((e) => { perTipo[e.tipo] = (perTipo[e.tipo] || 0) + 1; });
    const cor = area.querySelector('#correzione');
    cor.classList.remove('nascosto');
    cor.innerHTML = `<div class="testo-corretto">${r.righe.map((x) => {
      if (x.ok) return `<span class="ok">${esc(x.atteso)}</span>`;
      if (x.tipo === 'mancante') return `<span class="manca" title="Parola saltata">${esc(x.atteso)}</span>`;
      if (x.tipo === 'inpiu') return `<span class="extra" title="Parola in più"><s>${esc(x.scritto)}</s></span>`;
      return `<span class="err" title="${esc(TIPI_ERRORE[x.tipo] || '')}"><s>${esc(x.scritto)}</s><b>${esc(x.atteso)}</b></span>`;
    }).join(' ')}</div>
      <div class="riepilogo-dettato"><b>${r.giuste} parole giuste su ${r.totale}</b>
      ${Object.entries(perTipo).map(([t, n]) => `<span class="chip-errore">${esc((TIPI_ERRORE[t] || t).replace(/^./, (c) => c.toUpperCase()))}: ${n}</span>`).join('')}</div>`;
    const quota = r.totale ? Math.max(0, r.totale - r.errori.length) / r.totale : 0;
    const punteggio = Math.round(10 * quota);
    const principale = Object.entries(perTipo).sort((a, b) => b[1] - a[1])[0];
    const msg = !r.errori.length ? `${lode()} Nessun errore: dettato perfetto!`
      : quota >= 0.8 ? `${lode()} Hai sbagliato solo ${r.errori.length === 1 ? 'una parola' : `${r.errori.length} parole`}: guarda le parole in rosso.${principale && ATTENZIONE[principale[0]] ? ` Attenta soprattutto ${ATTENZIONE[principale[0]]}.` : ''}`
        : `Bel lavoro! Guarda insieme a me le parole in rosso: sotto c’è come si scrivono.${principale && ATTENZIONE[principale[0]] ? ` Facciamo attenzione ${ATTENZIONE[principale[0]]}.` : ''}`;
    aggiornaFumetto(area, msg, { leggi: false, allegro: quota >= 0.8 });
    parla(msg);
    await attendi(900);
    fine({ punteggio, testo: voce.testo, scritto: foglio.value.trim(), giuste: r.giuste, parole: r.totale, errori: r.errori.map((e) => ({ atteso: e.atteso, scritto: e.scritto, tipo: e.tipo })), opzioni: opz });
  }
  return () => { finito = true; };
}
