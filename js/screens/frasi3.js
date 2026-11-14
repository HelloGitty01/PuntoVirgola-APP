// Altre attività: Allunga la frase, Le domande del perché, Indovina cosa descrivo, Il diario di Punto.
import { S, impostazioni, nomeBambina } from '../state.js';
import { esc, ICONE, virgolaDice, aggiornaFumetto, collegaFumetti, riquadroImmagine, riempiImmagini, mescola, attendi } from '../ui.js';
import { TIPI, lode, nonSentito } from '../punteggi.js';
import { normalizza, parole, paroleContenuto, valutaElementi, contiene, trova, vocabolarioScena } from '../match.js';
import { parla } from '../tts.js';
import { collegaMicrofono, htmlMic, htmlRegistrazione, collegaRegistrazione, messaggioErroreVoce } from './dillo.js';
import { htmlContatore, aggiornaContatore } from './descrivi.js';

const caso = (a) => a[Math.floor(Math.random() * a.length)];
const limita = (n) => Math.max(0, Math.min(10, Math.round(n)));
const minuscola = (t) => t.charAt(0).toLowerCase() + t.slice(1);
const senzaPunto = (t) => String(t || '').replace(/[.!?…]+$/, '');
export const CONNETTIVI = ['perché', 'quindi', 'ma', 'però', 'quando', 'mentre', 'poi', 'dopo', 'prima', 'allora', 'infatti', 'così', 'alla fine', 'invece', 'anche'];
export const connettiviIn = (t) => CONNETTIVI.filter((c) => trova(parole(t), c) >= 0);

// Le scene adatte: hanno "chi" e "fa" più almeno un altro pezzo.
export function sceneAllunga() {
  return (S.scene.scene || []).filter((s) => {
    const t = (s.elementi || []).map((e) => e.tipo);
    return t.includes('chi') && t.includes('fa') && t.length >= 3;
  });
}

// ---------- Allunga la frase ----------
export function allunga(area, { voce, fine }) {
  const el = voce.elementi;
  const chi = el.find((e) => e.tipo === 'chi');
  const fa = el.find((e) => e.tipo === 'fa');
  const passi = el.filter((e) => e !== chi && e !== fa);
  const pezzi = [{ tipo: 'chi', testo: chi.testo }, { tipo: 'fa', testo: fa.testo }];
  const esiti = []; // per ogni passo: 'sua' | 'aiuto' | 'saltato'
  let p = 0, finale = false, finito = false, ripetuta = false;
  const frasi = [];
  const leggi = impostazioni().letturaAutomatica;
  const fraseOra = () => pezzi.map((x, i) => (i ? minuscola(x.testo) : x.testo)).join(' ');
  const domanda = (e) => e.domanda || `${TIPI[e.tipo].nome}?`;
  const intro = `Partiamo da una frase corta corta: ${fraseOra()}. Adesso la facciamo diventare lunga! ${domanda(passi[0])}`;
  area.innerHTML = `<div class="due-colonne">
    <div class="colonna">
      ${riquadroImmagine(voce.immagine)}
      <div class="card morbida" style="display:flex;flex-direction:column;gap:10px">
        <span style="color:var(--tenue)">La nostra frase:</span>
        <div class="frase-lunga" id="frase"></div>
        <button class="btn secondario piccolo" id="ascolta" style="align-self:flex-start">${ICONE.altoparlante} Ascolta la frase</button>
      </div>
    </div>
    <div class="colonna">
      ${virgolaDice(intro)}
      <div class="trascrizione" id="trascr"></div>
      <div id="aiutini" class="mattoncini"></div>
      <div style="margin-top:auto;display:flex;flex-direction:column;gap:14px;align-items:center">
        ${htmlMic()}
        <div class="riga-pulsanti" style="justify-content:center">${htmlRegistrazione()}
          <button class="btn secondario" id="aiuto">${ICONE.aiuto} Aiuto</button></div>
      </div>
    </div></div>`;
  riempiImmagini(area);
  collegaFumetti(area);
  if (leggi) setTimeout(() => parla(intro), 400);
  const reg = collegaRegistrazione(area);
  const disegna = (nuovo = -1) => {
    area.querySelector('#frase').innerHTML = pezzi.map((x, i) => `<span class="pezzo-frase ${i === nuovo ? 'nuovo' : ''}" data-tipo="${x.tipo}">${esc(i ? minuscola(x.testo) : x.testo)}</span>`).join('')
      + (finale ? '' : `<span class="pezzo-frase vuoto" data-tipo="${passi[p].tipo}">${TIPI[passi[p].tipo].etichetta}</span>`);
  };
  disegna();
  area.querySelector('#ascolta').onclick = () => parla(fraseOra());

  const aggiungi = async (testo, tipo, come) => {
    pezzi.push({ tipo, testo });
    esiti.push(come);
    area.querySelector('#aiutini').innerHTML = '';
    p++;
    if (p >= passi.length) finale = true;
    disegna(pezzi.length - 1);
    const lode = come === 'sua' ? caso(['Che bello!', 'Bravissima!', 'Ottima idea!', 'Sì!']) : 'Ecco!';
    const seguito = finale ? 'Adesso dilla tutta intera, dall’inizio alla fine!' : domanda(passi[p]);
    const msg = `${lode} ${fraseOra()}. ${seguito}`;
    aggiornaFumetto(area, msg, { leggi: false, allegro: true });
    parla(msg);
    if (finale) area.querySelector('#aiuto').classList.add('nascosto');
  };

  const fermaMic = collegaMicrofono(area, {
    vocabolario: () => vocabolarioScena(voce),
    suTesto: (t) => { area.querySelector('#trascr').textContent = t; },
    suAnnulla: () => { area.querySelector('#trascr').textContent = ''; },
    suErrore: (e) => aggiornaFumetto(area, messaggioErroreVoce(e), { leggi }),
    suFine: async ({ testo, guidato, audio }) => {
      reg.imposta(audio);
      if (!testo) testo = guidato || '';
      if (!testo) { aggiornaFumetto(area, nonSentito(), { leggi }); return; }
      frasi.push(testo);
      if (finale) return chiudi(`${testo} ${guidato || ''}`);
      // se ha detto proprio il pezzo della figura (anche se il riconoscimento l'ha capito un po' storto) lo scriviamo bene
      if (passi[p] && valutaElementi(`${testo} ${guidato || ''}`, [passi[p]], { tollerante: true }).trovati.size) {
        return aggiungi(passi[p].testo, passi[p].tipo, 'sua');
      }
      // tengo solo le parole nuove (se ha ripetuto anche l'inizio della frase)
      const gia = new Set(parole(fraseOra()));
      const toks = testo.split(/\s+/);
      let i = 0;
      while (i < toks.length && gia.has(normalizza(toks[i]))) i++;
      const nuovo = toks.slice(i).join(' ');
      if (!paroleContenuto(nuovo).length) {
        aggiornaFumetto(area, `Mi serve un pezzo nuovo! ${domanda(passi[p])}`, { leggi });
        return;
      }
      await aggiungi(nuovo, passi[p].tipo, 'sua');
    }
  });

  area.querySelector('#aiuto').onclick = () => {
    if (finale) return;
    const e = passi[p];
    const altri = (voce.distrattori || []).filter((d) => d.tipo === e.tipo).slice(0, 2);
    const opz = mescola([{ testo: e.testo, ok: true }, ...altri.map((d) => ({ testo: d.testo, ok: false }))]);
    const box = area.querySelector('#aiutini');
    box.innerHTML = opz.map((o, k) => `<button class="mattoncino" data-tipo="${e.tipo}" data-k="${k}">${esc(o.testo)}</button>`).join('');
    aggiornaFumetto(area, opz.length > 1 ? 'Scegli il pezzo che va bene con la figura.' : 'Ecco un pezzo: toccalo per aggiungerlo.', { leggi });
    box.onclick = (ev) => {
      const b = ev.target.closest('[data-k]');
      if (!b) return;
      const o = opz[+b.dataset.k];
      if (!o.ok) { b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); return; }
      aggiungi(o.testo, e.tipo, 'aiuto');
    };
  };

  async function chiudi(testo) {
    if (finito) return;
    const attese = [...new Set(paroleContenuto(fraseOra()))];
    const dette = new Set(paroleContenuto(testo));
    const quota = attese.filter((w) => dette.has(w)).length / Math.max(1, attese.length);
    if (quota < 0.7 && !ripetuta) {
      ripetuta = true;
      aggiornaFumetto(area, `Quasi! Ascoltala ancora e ripetila tutta: ${fraseOra()}.`, { leggi });
      return;
    }
    finito = true;
    const passiPunti = esiti.reduce((t, x) => t + (x === 'sua' ? 1 : x === 'aiuto' ? 0.5 : 0), 0) / Math.max(1, passi.length);
    const punteggio = limita(7 * passiPunti + (quota >= 0.7 ? 3 : 1));
    const msg = quota >= 0.7 ? `${lode()} Era corta e ora è lunghissima: ${fraseOra()}!` : `Brava! La nostra frase lunga è: ${fraseOra()}.`;
    aggiornaFumetto(area, msg, { leggi: false, allegro: true });
    parla(msg);
    await attendi(900);
    fine({ punteggio, frasi, costruita: fraseOra(), passi: esiti, parole: parole(fraseOra()).length });
  }

  return () => { fermaMic(); reg.libera(); };
}

// ---------- Le domande del perché ----------
export function domande(area, { voce, fine }) {
  const el = voce.elementi || [];
  const chi = el.find((e) => e.tipo === 'chi');
  const fa = el.find((e) => e.tipo === 'fa');
  const base = chi && fa ? `${chi.testo} ${minuscola(fa.testo)}` : senzaPunto(voce.frase);
  const lista = el.slice(0, 4).map((e) => ({
    tipo: e.tipo, el: e,
    testo: e.domanda || `${TIPI[e.tipo].nome}?`,
    modello: ['chi', 'fa'].includes(e.tipo) ? base : `${base} ${minuscola(e.testo)}`
  }));
  if (!el.some((e) => e.tipo === 'perche')) {
    lista.push({ tipo: 'perche', aperta: true, testo: `Secondo te, perché ${minuscola(senzaPunto(voce.frase))}?`, modello: '' });
  }
  const risposte = [];
  let q = 0, tentativo = 0, finito = false;
  const leggi = impostazioni().letturaAutomatica;
  const intro = `Guarda la figura. Ti faccio qualche domanda: rispondi sempre con una frase intera, non con una parola sola! ${lista[0].testo}`;
  area.innerHTML = `<div class="due-colonne">
    <div class="colonna">
      ${riquadroImmagine(voce.immagine)}
      <div class="lista-domande" id="lista">${lista.map((d, i) => `<div class="domanda-riga" data-tipo="${d.tipo}" data-q="${i}"><span class="stato"></span><span>${esc(d.testo)}</span></div>`).join('')}</div>
    </div>
    <div class="colonna">
      ${virgolaDice(intro)}
      <div class="card morbida"><span style="color:var(--tenue)">Hai risposto:</span><div class="trascrizione" id="trascr"></div></div>
      <div style="margin-top:auto;display:flex;flex-direction:column;gap:14px;align-items:center">
        ${htmlMic()}
        <div class="riga-pulsanti" style="justify-content:center">${htmlRegistrazione()}<button class="link" id="salta">Salta la domanda</button></div>
      </div>
    </div></div>`;
  riempiImmagini(area);
  collegaFumetti(area);
  if (leggi) setTimeout(() => parla(intro), 400);
  const reg = collegaRegistrazione(area);
  const evidenziaRiga = () => area.querySelectorAll('.domanda-riga').forEach((r, i) => r.classList.toggle('ora', i === q));
  evidenziaRiga();

  const valuta = (d, testo) => {
    const n = parole(testo).length;
    if (d.aperta) {
      const nuove = paroleContenuto(testo).filter((w) => !paroleContenuto(voce.frase).includes(w)).length;
      return { contenuto: contiene(testo, 'perché') || contiene(testo, 'perche') || nuove >= 2, intera: n >= 4 && (contiene(testo, 'perché') || contiene(testo, 'perche')) };
    }
    return { contenuto: valutaElementi(`${testo} ${guidatoUltimo}`, [d.el], { tollerante: true }).trovati.size > 0, intera: n >= 3 };
  };

  const prossima = async (msgPrima) => {
    q++; tentativo = 0;
    evidenziaRiga();
    area.querySelector('#trascr').textContent = '';
    if (q >= lista.length) return chiudi(msgPrima);
    const msg = `${msgPrima} ${lista[q].testo}`;
    aggiornaFumetto(area, msg, { leggi: false, allegro: true });
    parla(msg);
  };

  const segna = (i, punti, testo) => {
    risposte[i] = { domanda: lista[i].testo, tipo: lista[i].tipo, testo, punti };
    const r = area.querySelector(`[data-q="${i}"]`);
    r.classList.add(punti >= 3 ? 'ok' : punti > 0 ? 'quasi' : 'no');
    r.querySelector('.stato').textContent = punti >= 3 ? '✓' : punti > 0 ? '~' : '–';
  };

  let guidatoUltimo = '';
  const fermaMic = collegaMicrofono(area, {
    vocabolario: () => vocabolarioScena(voce),
    suTesto: (t) => { area.querySelector('#trascr').textContent = t; },
    suAnnulla: () => { area.querySelector('#trascr').textContent = ''; },
    suErrore: (e) => aggiornaFumetto(area, messaggioErroreVoce(e), { leggi }),
    suFine: async ({ testo, guidato, audio }) => {
      reg.imposta(audio);
      guidatoUltimo = guidato || '';
      if (!testo && guidato) testo = guidato;
      if (!testo || finito) { if (!testo) aggiornaFumetto(area, nonSentito(), { leggi }); return; }
      tentativo++;
      const d = lista[q];
      const v = valuta(d, testo);
      if (v.contenuto && v.intera) {
        segna(q, tentativo === 1 ? 3 : 2, testo);
        return prossima(caso(['Perfetto, una frase intera!', 'Bravissima!', 'Che bella risposta!', 'Esatto!']));
      }
      if (tentativo >= 2) {
        segna(q, v.contenuto ? 1 : 0, testo);
        const esempio = d.modello ? ` Si può dire: ${d.modello}.` : '';
        return prossima(`${v.contenuto ? 'Brava!' : 'Ci siamo quasi.'}${esempio} Andiamo avanti.`);
      }
      const msg = v.contenuto
        ? (d.aperta ? 'Bella idea! Ora dimmela con una frase intera che comincia con: perché…' : `Giusto! Ma dimmelo con una frase intera${d.modello ? `, per esempio cominciando con: ${d.modello.split(' ').slice(0, 2).join(' ')}…` : ''}`)
        : `Mmm, guarda bene la figura. ${d.testo}`;
      aggiornaFumetto(area, msg, { leggi });
    }
  });

  area.querySelector('#salta').onclick = () => { if (finito || q >= lista.length) return; segna(q, 0, ''); prossima('Va bene, passiamo alla prossima.'); };

  async function chiudi(msgPrima) {
    if (finito) return;
    finito = true;
    const tot = risposte.reduce((t, r) => t + ((r && r.punti) || 0), 0);
    const punteggio = limita((10 * tot) / (3 * lista.length));
    const msg = `${msgPrima} Hai risposto a tutte le domande!`;
    aggiornaFumetto(area, msg, { leggi: false, allegro: true });
    parla(msg);
    await attendi(900);
    fine({ punteggio, risposte, frasi: risposte.map((r) => r && r.testo).filter(Boolean) });
  }

  return () => { fermaMic(); reg.libera(); };
}

// ---------- Indovina cosa descrivo ----------
function modoIndovina(livello, indice) {
  if (livello <= 1) return 'ascolta';
  if (livello >= 3) return 'descrivi';
  return indice % 2 ? 'descrivi' : 'ascolta';
}

export function indovina(area, opz) {
  const modo = modoIndovina(opz.livello, opz.indice || 0);
  return modo === 'descrivi' ? descriviTu(area, opz) : ascoltaETrova(area, opz);
}

function ascoltaETrova(area, { voce, fine }) {
  const tutti = (S.scene.indovinelli || []).filter((x) => x.parola !== voce.parola);
  const scelte = mescola([voce, ...mescola(tutti).slice(0, 3)]);
  const indizi = voce.indizi || [];
  let mostrati = 1, errori = 0, finito = false;
  const leggi = impostazioni().letturaAutomatica;
  const intro = `Indovina a cosa sto pensando! Ascolta l’indizio e tocca la figura giusta. ${indizi[0]}`;
  area.innerHTML = `<div class="due-colonne">
    <div class="colonna" style="gap:18px">
      <div class="griglia-indovina" id="scelte">${scelte.map((s, i) => `<button class="scelta-figura" data-i="${i}" aria-label="Figura ${i + 1}">${riquadroImmagine(s.immagine, 'scena-img piccola')}</button>`).join('')}</div>
    </div>
    <div class="colonna">
      ${virgolaDice(intro)}
      <div class="card morbida"><b>Gli indizi di Virgola</b><ol class="indizi" id="indizi"></ol></div>
      <button class="btn secondario" id="altro" style="align-self:center">${ICONE.aiuto} Un altro indizio</button>
    </div></div>`;
  riempiImmagini(area);
  collegaFumetti(area);
  if (leggi) setTimeout(() => parla(intro), 400);
  const mostra = () => {
    area.querySelector('#indizi').innerHTML = indizi.slice(0, mostrati).map((t, i) => `<li data-i="${i}">${esc(t)} <button class="ripeti-mini" data-leggi="${i}" aria-label="Ascolta">${ICONE.altoparlante}</button></li>`).join('');
    area.querySelector('#altro').classList.toggle('nascosto', mostrati >= indizi.length);
  };
  mostra();
  area.querySelector('#indizi').addEventListener('click', (e) => { const b = e.target.closest('[data-leggi]'); if (b) parla(indizi[+b.dataset.leggi]); });
  const altro = (prima = '') => {
    if (mostrati >= indizi.length) return;
    mostrati++;
    mostra();
    aggiornaFumetto(area, `${prima}${indizi[mostrati - 1]}`, { leggi });
  };
  area.querySelector('#altro').onclick = () => altro();
  area.querySelector('#scelte').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-i]');
    if (!b || finito || b.disabled) return;
    const s = scelte[+b.dataset.i];
    if (s.parola !== voce.parola) {
      errori++;
      b.classList.remove('no'); void b.offsetWidth; b.classList.add('no', 'sbagliata');
      b.disabled = true;
      if (mostrati < indizi.length) altro(`No, non è ${s.articolo}. Ascolta un altro indizio: `);
      else aggiornaFumetto(area, `No, non è ${s.articolo}. Riprova!`, { leggi });
      return;
    }
    finito = true;
    b.classList.add('giusta');
    area.querySelectorAll('.scelta-figura').forEach((x) => { if (x !== b) x.disabled = true; });
    const punteggio = limita([10, 9, 7, 5, 4][mostrati - 1] - 2 * errori);
    const msg = `${lode()} È proprio ${voce.articolo}! ${mostrati === 1 ? 'Ti è bastato un indizio solo!' : `Ti sono serviti ${mostrati} indizi.`}`;
    aggiornaFumetto(area, msg, { leggi: false, allegro: true });
    parla(msg);
    await attendi(900);
    fine({ punteggio: Math.max(2, punteggio), modo: 'ascolta', indizi: mostrati, errori, parola: voce.parola });
  });
}

function descriviTu(area, { voce, fine }) {
  const obiettivo = 3;
  const radice = normalizza(voce.parola).slice(0, Math.max(3, voce.parola.length - 2));
  const leggi = impostazioni().letturaAutomatica;
  const frasi = [];
  let nomeDetto = false, finito = false;
  const intro = `Ora tocca a te! Descrivimi questa cosa senza dire il suo nome, e io provo a indovinare. Dimmi almeno ${obiettivo} cose: com’è, cosa fa, a cosa serve…`;
  area.innerHTML = `<div class="due-colonne">
    <div class="colonna">
      <div class="card" style="display:flex;flex-direction:column;align-items:center;gap:10px">
        <span class="segreto">🤫 Non dire il nome!</span>
        ${riquadroImmagine(voce.immagine, 'scena-img piccola')}
        <div class="parola-grande">${esc(voce.parola)}</div>
      </div>
      <div class="card morbida"><span style="color:var(--tenue)">Hai detto:</span><div class="trascrizione" id="trascr"></div>
        <button class="link nascosto" id="togli-ultima">Cancella l’ultima frase</button></div>
    </div>
    <div class="colonna">
      ${virgolaDice(intro)}
      ${htmlContatore(obiettivo, 'Indizi che hai dato a Virgola')}
      <div style="margin-top:auto;display:flex;flex-direction:column;gap:14px;align-items:center">
        ${htmlMic()}
        <div class="riga-pulsanti" style="justify-content:center">${htmlRegistrazione()}<button class="btn arancio" id="finito" disabled>Indovina, Virgola!</button></div>
      </div>
    </div></div>`;
  riempiImmagini(area);
  collegaFumetti(area);
  if (leggi) setTimeout(() => parla(intro), 400);
  const reg = collegaRegistrazione(area);
  const chiavi = (voce.chiavi || []).map(normalizza);
  const analizza = (testo) => {
    const cont = [...new Set(paroleContenuto(testo).filter((w) => !w.startsWith(radice)))];
    const kw = cont.filter((w) => chiavi.some((k) => (k.endsWith('*') ? w.startsWith(k.slice(0, -1)) : w === k)));
    // ogni parola chiave è un indizio; le altre parole valgono mezzo indizio
    const indizi = kw.length + Math.floor((cont.length - kw.length) / 2);
    return { cont, kw, indizi };
  };
  const mostra = (corrente = '') => {
    const testo = [...frasi, corrente].filter(Boolean).join(' ');
    const a = analizza(testo);
    const etichette = [...a.kw, ...a.cont.filter((w) => !a.kw.includes(w))];
    aggiornaContatore(area, etichette.slice(0, Math.max(a.indizi, 0)), obiettivo);
    area.querySelector('#n-dette').textContent = a.indizi;
    area.querySelector('#trascr').textContent = testo;
    area.querySelector('#togli-ultima').classList.toggle('nascosto', !frasi.length || !!corrente);
    area.querySelector('#finito').disabled = !frasi.length;
    return a;
  };
  const fermaMic = collegaMicrofono(area, {
    suTesto: (t) => mostra(t),
    suAnnulla: () => mostra(),
    suErrore: (e) => aggiornaFumetto(area, messaggioErroreVoce(e), { leggi }),
    suFine: ({ testo, audio }) => {
      reg.imposta(audio);
      if (!testo) { aggiornaFumetto(area, nonSentito(), { leggi }); mostra(); return; }
      frasi.push(testo);
      if (parole(testo).some((w) => w.startsWith(radice))) {
        nomeDetto = true;
        aggiornaFumetto(area, 'Ops! Hai detto il nome! Facciamo finta di niente… dimmi un’altra cosa.', { leggi });
      }
      const a = mostra();
      if (nomeDetto && parole(testo).some((w) => w.startsWith(radice))) return;
      const m = obiettivo - a.indizi;
      if (m > 0) aggiornaFumetto(area, caso([`Mmm… interessante! Dimmi ancora qualcosa.`, `Ci sto pensando… mi serve un altro indizio!`, `Uhm, non ho ancora capito. Com’è? A cosa serve?`]), { leggi });
      else aggiornaFumetto(area, 'Forse ho capito! Tocca “Indovina, Virgola!” oppure dimmi ancora qualcosa.', { leggi, allegro: true });
    }
  });
  area.querySelector('#togli-ultima').onclick = () => { frasi.pop(); mostra(); };
  area.querySelector('#finito').onclick = async () => {
    if (finito) return;
    finito = true;
    const a = analizza(frasi.join(' '));
    const capito = a.kw.length >= 2 || a.indizi >= obiettivo;
    const punteggio = limita(Math.min(10, 3 * a.kw.length + (a.cont.length - a.kw.length)) - (nomeDetto ? 3 : 0));
    const msg = capito
      ? `Ci sono! È ${voce.articolo}! ${a.kw.length >= 3 ? 'I tuoi indizi erano perfetti!' : 'Bravissima!'}`
      : `Uhm… è ${voce.articolo}? Che fatica! La prossima volta dimmi più cose: com’è e a cosa serve.`;
    aggiornaFumetto(area, msg, { leggi: false, allegro: capito });
    parla(msg);
    await attendi(900);
    fine({ punteggio: Math.max(capito ? 3 : 1, punteggio), modo: 'descrivi', parola: voce.parola, chiaviDette: a.kw, nomeDetto, frasi });
  };
  return () => { fermaMic(); reg.libera(); };
}

// ---------- Il diario (della bambina): a voce o scrivendo ----------
export function diario(area, { voce, fine }) {
  const domandeDiario = (voce.domande && voce.domande.length ? voce.domande : ['Cosa hai fatto oggi?']);
  const risposte = [];
  let q = 0, finito = false;
  const leggi = impostazioni().letturaAutomatica;
  const nome = nomeBambina();
  const intro = `Ciao${nome ? ' ' + nome : ''}! Apriamo il tuo diario: raccontami com’è andata la tua giornata. Puoi parlare oppure scrivere. Qui non ci sono risposte sbagliate! ${domandeDiario[0]}`;
  area.innerHTML = `<div class="due-colonne">
    <div class="colonna">
      <div class="quaderno" id="quaderno"><div class="data-quaderno">${esc(new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }))}</div><div id="pagine"></div></div>
    </div>
    <div class="colonna">
      ${virgolaDice(intro)}
      <form class="scrivi-diario" id="scrivi-form" autocomplete="off">
        <textarea id="scrivi" rows="2" placeholder="Scrivi qui, oppure tocca il microfono e parla…" aria-label="Scrivi la tua risposta" spellcheck="true" lang="it"></textarea>
        <button class="btn" type="submit" id="invia" disabled>${ICONE.diario} Scrivi</button>
      </form>
      <span class="aiuto" id="conta-parole" style="margin-top:-6px">Oggi mi hai raccontato 0 parole</span>
      <div style="margin-top:auto;display:flex;flex-direction:column;gap:14px;align-items:center">
        ${htmlMic()}
        <div class="riga-pulsanti" style="justify-content:center">${htmlRegistrazione()}
          <button class="btn secondario" id="salta">Prossima domanda</button>
          <button class="btn arancio" id="finito" disabled>Ho finito</button></div>
      </div>
    </div></div>`;
  collegaFumetti(area);
  if (leggi) setTimeout(() => parla(intro), 400);
  const reg = collegaRegistrazione(area);
  const totaleParole = () => risposte.reduce((t, r) => t + parole(r.testo).length, 0);
  const disegna = () => {
    area.querySelector('#pagine').innerHTML = risposte.map((r) => `<p><small>${esc(r.domanda)}</small><br>${esc(r.testo)}</p>`).join('')
      + (q < domandeDiario.length ? `<p class="in-corso"><small>${esc(domandeDiario[q])}</small><br>…</p>` : '');
    area.querySelector('#conta-parole').textContent = `Oggi mi hai raccontato ${totaleParole()} parole`;
    area.querySelector('#finito').disabled = !risposte.length;
    area.querySelector('#salta').classList.toggle('nascosto', q >= domandeDiario.length - 1);
  };
  disegna();
  const avanti = (prima) => {
    q++;
    disegna();
    if (q >= domandeDiario.length) {
      aggiornaFumetto(area, `${prima} Grazie! Tocca “Ho finito” per chiudere il diario.`, { leggi, allegro: true });
      return;
    }
    aggiornaFumetto(area, `${prima} ${domandeDiario[q]}`, { leggi, allegro: true });
  };
  const fermaMic = collegaMicrofono(area, {
    // mentre parla, il testo compare nel riquadro di scrittura
    suTesto: (t) => { const c = area.querySelector('#scrivi'); c.value = t; c.readOnly = true; },
    suAnnulla: () => { const c = area.querySelector('#scrivi'); c.value = ''; c.readOnly = false; },
    suErrore: (e) => aggiornaFumetto(area, messaggioErroreVoce(e), { leggi }),
    suFine: ({ testo, audio }) => {
      reg.imposta(audio);
      const c = area.querySelector('#scrivi'); c.value = ''; c.readOnly = false;
      if (!testo) { aggiornaFumetto(area, 'Non ho sentito bene. Me lo ridici?', { leggi }); return; }
      rispondi(testo, 'voce');
    }
  });
  function rispondi(testo, come) {
    if (q >= domandeDiario.length) { risposte[risposte.length - 1].testo += ' ' + testo; disegna(); return; }
    risposte.push({ domanda: domandeDiario[q], testo, come });
    avanti(caso(come === 'scritto'
      ? ['Che bello, l’hai scritto tu!', 'Brava, che bella scrittura!', 'Grazie! Punto è curiosissimo!', 'Wow!']
      : ['Che bello!', 'Davvero? Che bello!', 'Punto è curiosissimo!', 'Mi piace tanto ascoltarti!', 'Wow!']));
  }
  const campo = area.querySelector('#scrivi');
  const invia = area.querySelector('#invia');
  campo.addEventListener('input', () => { invia.disabled = !campo.value.trim(); });
  campo.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); area.querySelector('#scrivi-form').requestSubmit(); } });
  area.querySelector('#scrivi-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = campo.value.replace(/\s+/g, ' ').trim();
    if (!t || finito) return;
    campo.value = '';
    invia.disabled = true;
    rispondi(t, 'scritto');
    campo.focus();
  });
  area.querySelector('#salta').onclick = () => { if (q < domandeDiario.length) avanti('Va bene!'); };
  area.querySelector('#finito').onclick = async () => {
    if (finito || !risposte.length) return;
    finito = true;
    const testo = risposte.map((r) => r.testo).join(' ');
    const n = parole(testo).length;
    const punteggio = risposte.length >= 3 ? 10 : risposte.length === 2 ? 7 : 4;
    const msg = `Grazie per avermi raccontato la tua giornata! Hai usato ${n} parole. È tutto scritto nel tuo diario.`;
    aggiornaFumetto(area, msg, { leggi: false, allegro: true });
    parla(msg);
    await attendi(900);
    fine({ punteggio, risposte, frasi: risposte.map((r) => r.testo), scritte: risposte.filter((r) => r.come === 'scritto').length, parole: n, paroleImportanti: new Set(paroleContenuto(testo)).size, connettivi: connettiviIn(testo) });
  };
  return () => { fermaMic(); reg.libera(); };
}
