// Attività per frasi più complesse: frase scombinata, unisci le frasi, finisci tu, trasforma, cosa succede dopo.
import { impostazioni } from '../state.js';
import { esc, ICONE, virgolaDice, aggiornaFumetto, collegaFumetti, riquadroImmagine, riempiImmagini, mescola, attendi } from '../ui.js';
import { puntiScelta, INCORAGGIAMENTI } from '../punteggi.js';
import { normalizza, paroleContenuto, contiene } from '../match.js';
import { parla } from '../tts.js';
import { collegaMicrofono, htmlMic, htmlRegistrazione, collegaRegistrazione, messaggioErroreVoce } from './dillo.js';
import { htmlContatore, aggiornaContatore } from './descrivi.js';

const caso = (a) => a[Math.floor(Math.random() * a.length)];
const minuscolaIniziale = (t) => t.charAt(0).toLowerCase() + t.slice(1);
const CONNETTIVI = ['perché', 'quindi', 'ma', 'quando', 'mentre', 'poi', 'dopo', 'allora', 'alla fine', 'però', 'infatti', 'così'];

// ---------- Frase scombinata ----------
export function scombinata(area, { voce, fine }) {
  const parole = voce.frase.replace(/[.!?]$/, '').split(/\s+/);
  const pezzi = mescola(parole.map((p, i) => ({ p, i })));
  let pos = 0, errori = 0, aiuti = 0, finito = false;
  const leggi = impostazioni().letturaAutomatica;
  const intro = 'Le parole si sono mescolate! Toccale nell’ordine giusto per rimettere a posto la frase.';
  area.innerHTML = `<div class="due-colonne" style="grid-template-columns:minmax(0,.7fr) minmax(0,1.3fr)">
    <div class="colonna">${virgolaDice(intro)}<img src="img/punto.png" alt="Punto" style="width:min(220px,60%);align-self:center"></div>
    <div class="colonna" style="gap:22px">
      <div class="costruita" id="costruita" aria-live="polite"></div>
      <div class="mattoncini" id="tessere">${pezzi.map((x, k) => `<button class="tessera" data-k="${k}">${esc(x.p.toLowerCase())}</button>`).join('')}</div>
      <div class="riga-pulsanti"><button class="btn secondario" id="aiuto">${ICONE.aiuto} Aiuto di Virgola</button>
        <button class="btn secondario" id="ascolta">${ICONE.altoparlante} Ascolta la frase</button></div>
    </div></div>`;
  collegaFumetti(area);
  if (leggi) setTimeout(() => parla(intro), 400);
  const prossimoGiusto = () => pezzi.findIndex((x, k) => !area.querySelector(`[data-k="${k}"]`).classList.contains('usata') && normalizza(x.p) === normalizza(parole[pos]));
  area.querySelector('#tessere').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-k]');
    if (!b || finito || b.classList.contains('usata')) return;
    const x = pezzi[+b.dataset.k];
    if (normalizza(x.p) !== normalizza(parole[pos])) {
      errori++;
      b.classList.remove('no'); void b.offsetWidth; b.classList.add('no');
      aggiornaFumetto(area, pos === 0 ? 'Uhm, con quale parola comincia la frase? Di solito si parte da chi fa l’azione.' : `Quale parola viene dopo "${parole[pos - 1]}"?`, { leggi });
      return;
    }
    b.classList.add('usata');
    area.querySelectorAll('.suggerita').forEach((s) => s.classList.remove('suggerita'));
    area.querySelector('#costruita').insertAdjacentHTML('beforeend', `<span class="pezzo">${esc(parole[pos])}</span>`);
    parla(parole[pos]);
    pos++;
    if (pos < parole.length) return;
    finito = true;
    const msg = `${caso(INCORAGGIAMENTI)} La frase è: ${voce.frase}`;
    aggiornaFumetto(area, msg, { leggi: false, allegro: true });
    await parla(msg);
    await attendi(500);
    fine({ punteggio: Math.max(0, 10 - 2 * errori - aiuti), errori, aiuti });
  });
  area.querySelector('#aiuto').onclick = () => {
    if (finito) return;
    const k = prossimoGiusto();
    if (k < 0) return;
    aiuti++;
    area.querySelector(`[data-k="${k}"]`).classList.add('suggerita');
    aggiornaFumetto(area, 'Ti aiuto io: guarda la parola che lampeggia!', { leggi: true });
  };
  area.querySelector('#ascolta').onclick = () => {
    const fatta = parole.slice(0, pos).join(' ');
    parla(fatta || 'Non hai ancora messo nessuna parola.');
  };
}

// ---------- Unisci le frasi ----------
export function unisci(area, { voce, fine }) {
  const opzioni = mescola([voce.giusto, ...(voce.altre || [])]);
  const completa = (c) => `${voce.a} ${c} ${minuscolaIniziale(voce.b)}`;
  let tentativi = 0, fase = 1, finito = false;
  const leggi = impostazioni().letturaAutomatica;
  const intro = `Abbiamo due frasi: ${voce.a}. ${voce.b}. Quale parola le unisce meglio?`;
  area.innerHTML = `<div class="due-colonne">
    <div class="colonna" style="gap:22px">
      <div class="blocchi-frase"><span class="blocco">${esc(voce.a)}</span><span class="buco" id="buco">?</span><span class="blocco">${esc(minuscolaIniziale(voce.b))}</span></div>
      <div class="opzioni" id="opz">${opzioni.map((o, i) => `<button class="opzione testo" data-o="${i}">${esc(o)}</button>`).join('')}</div>
    </div>
    <div class="colonna">${virgolaDice(intro)}
      <div id="voce2" class="nascosto" style="display:flex;flex-direction:column;gap:14px;align-items:center;margin-top:auto">
        <div class="trascrizione" id="trascr"></div>${htmlMic()}${htmlRegistrazione()}
        <button class="link" id="salta">Vai avanti</button></div>
    </div></div>`;
  collegaFumetti(area);
  if (leggi) setTimeout(() => parla(intro), 400);
  let reg = null, fermaMic = () => {};
  area.querySelector('#opz').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-o]');
    if (!b || fase !== 1 || b.classList.contains('sbagliata')) return;
    const o = opzioni[+b.dataset.o];
    tentativi++;
    if (o !== voce.giusto) {
      b.classList.remove('no'); void b.offsetWidth; b.classList.add('no', 'sbagliata');
      aggiornaFumetto(area, `"${completa(o)}": suona strano, vero? Prova un’altra parola.`, { leggi });
      return;
    }
    fase = 2;
    b.classList.add('giusta');
    b.parentNode.querySelectorAll('[data-o]').forEach((x) => { if (x !== b) x.disabled = true; });
    area.querySelector('#buco').textContent = o;
    const msg = `${caso(INCORAGGIAMENTI)} ${completa(o)}. Ora prova a dirla tu tutta intera!`;
    aggiornaFumetto(area, msg, { leggi: false, allegro: true });
    await parla(msg);
    area.querySelector('#voce2').classList.remove('nascosto');
    reg = collegaRegistrazione(area);
    fermaMic = collegaMicrofono(area, {
      suTesto: (t) => { area.querySelector('#trascr').textContent = t; },
      suErrore: (err) => aggiornaFumetto(area, messaggioErroreVoce(err), { leggi }),
      suFine: async ({ testo, audio }) => {
        reg.imposta(audio);
        area.querySelector('#trascr').textContent = testo;
        const ok = testo && contiene(testo, voce.giusto);
        aggiornaFumetto(area, ok ? 'Bravissima, l’hai detta benissimo!' : 'Brava! Ricordati la parola che unisce le due frasi.', { leggi: true, allegro: ok });
        await attendi(1800);
        termina();
      }
    });
    area.querySelector('#salta').onclick = termina;
  });
  function termina() {
    if (finito) return;
    finito = true;
    fine({ punteggio: puntiScelta(tentativi), tentativi });
  }
  return () => { fermaMic(); if (reg) reg.libera(); };
}

// ---------- Trasforma ----------
export function trasforma(area, { voce, fine }) {
  const opzioni = mescola([voce.giusto, ...(voce.altre || [])]);
  const [prima, dopo] = voce.modello.split('___');
  let tentativi = 0, finito = false;
  const leggi = impostazioni().letturaAutomatica;
  const tipo = /^(ieri)/i.test(voce.modello) ? 'Come diventa la frase se è successo ieri?' : /^(domani)/i.test(voce.modello) ? 'Come diventa la frase se succederà domani?' : 'Come cambia la frase?';
  const intro = `${voce.frase}. ${tipo} Scegli la parola giusta.`;
  area.innerHTML = `<div class="due-colonne">
    <div class="colonna" style="gap:22px">
      <div class="blocchi-frase"><span class="blocco">${esc(voce.frase)}</span></div>
      <div class="blocchi-frase"><span class="freccia">⟶</span><span>${esc(prima)}</span><span class="buco" id="buco">?</span><span>${esc(dopo || '')}</span></div>
      <div class="opzioni" id="opz">${opzioni.map((o, i) => `<button class="opzione testo" data-o="${i}">${esc(o)}</button>`).join('')}</div>
    </div>
    <div class="colonna">${virgolaDice(intro)}<img src="img/punto.png" alt="Punto" style="width:min(220px,60%);align-self:center"></div></div>`;
  collegaFumetti(area);
  if (leggi) setTimeout(() => parla(intro), 400);
  area.querySelector('#opz').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-o]');
    if (!b || finito || b.classList.contains('sbagliata')) return;
    const o = opzioni[+b.dataset.o];
    tentativi++;
    parla(`${prima} ${o} ${dopo || ''}`);
    if (o !== voce.giusto) { b.classList.remove('no'); void b.offsetWidth; b.classList.add('no', 'sbagliata'); return; }
    finito = true;
    b.classList.add('giusta');
    b.parentNode.querySelectorAll('[data-o]').forEach((x) => { if (x !== b) x.disabled = true; });
    area.querySelector('#buco').textContent = o;
    const msg = `${caso(INCORAGGIAMENTI)} ${prima}${o}${dopo || ''}.`;
    aggiornaFumetto(area, msg, { leggi: false, allegro: true });
    await attendi(1200);
    await parla(msg);
    await attendi(400);
    fine({ punteggio: puntiScelta(tentativi), tentativi });
  });
}

// ---------- Finisci tu / Cosa succede dopo (risposte libere a voce) ----------
function rispostaLibera(area, { sinistra, intro, obiettivo, conta, fine, valuta, chiusura }) {
  const leggi = impostazioni().letturaAutomatica;
  const frasi = [];
  let finito = false;
  area.innerHTML = `<div class="due-colonne">
    <div class="colonna">${sinistra}
      <div class="card morbida"><span style="color:var(--tenue)">Hai detto:</span><div class="trascrizione" id="trascr"></div>
        <button class="link nascosto" id="togli-ultima">Cancella l’ultima frase</button></div></div>
    <div class="colonna">${virgolaDice(intro)}
      ${htmlContatore(obiettivo, `Prova a usare almeno ${obiettivo} parole`)}
      <div style="margin-top:auto;display:flex;flex-direction:column;gap:14px;align-items:center">
        ${htmlMic()}
        <div class="riga-pulsanti" style="justify-content:center">${htmlRegistrazione()}<button class="btn arancio" id="finito" disabled>Ho finito</button></div>
      </div></div></div>`;
  riempiImmagini(area);
  collegaFumetti(area);
  if (leggi) setTimeout(() => parla(intro), 400);
  const reg = collegaRegistrazione(area);
  const mostra = (corrente = '') => {
    const testo = [...frasi, corrente].filter(Boolean).join(' ');
    const p = conta(testo);
    aggiornaContatore(area, p, obiettivo);
    area.querySelector('#trascr').textContent = testo;
    area.querySelector('#togli-ultima').classList.toggle('nascosto', !frasi.length || !!corrente);
    area.querySelector('#finito').disabled = !frasi.length;
    return p.length;
  };
  const fermaMic = collegaMicrofono(area, {
    suTesto: (t) => mostra(t),
    suAnnulla: () => mostra(),
    suErrore: (e) => aggiornaFumetto(area, messaggioErroreVoce(e), { leggi }),
    suFine: ({ testo, audio }) => {
      reg.imposta(audio);
      if (!testo) { aggiornaFumetto(area, 'Non ho sentito bene. Riprova!', { leggi }); mostra(); return; }
      frasi.push(testo);
      const n = mostra();
      const m = obiettivo - n;
      if (m > 0) aggiornaFumetto(area, `Bello! Te ne ${m === 1 ? 'manca' : 'mancano'} ancora ${m}: tocca di nuovo il microfono e aggiungi qualcosa.`, { leggi });
      else aggiornaFumetto(area, 'Che bella frase! Tocca “Ho finito” oppure aggiungi altro.', { leggi, allegro: true });
    }
  });
  area.querySelector('#togli-ultima').onclick = () => { frasi.pop(); mostra(); aggiornaFumetto(area, 'Ho cancellato l’ultima frase. Riprova!', { leggi }); };
  area.querySelector('#finito').onclick = async () => {
    if (finito) return;
    finito = true;
    const testo = frasi.join(' ');
    const punti = valuta(testo);
    const msg = chiusura(testo, punti);
    aggiornaFumetto(area, msg, { leggi: false, allegro: true });
    await parla(msg);
    await attendi(400);
    fine({ punteggio: punti, frasi });
  };
  return () => { fermaMic(); reg.libera(); };
}

export function finisci(area, { voce, fine }) {
  const inizio = voce.inizio;
  const paroleInizio = new Set(paroleContenuto(inizio));
  return rispostaLibera(area, {
    sinistra: `<div class="card" style="display:flex;flex-direction:column;gap:12px"><span style="color:var(--tenue)">Finisci tu la frase:</span>
      <div class="parola-grande" style="text-align:left;font-size:clamp(30px,3.6vw,44px)">${esc(inizio)}</div></div>
      <img src="img/punto.png" alt="Punto" style="width:min(200px,45%);align-self:center">`,
    intro: `Finisci tu la frase: ${inizio.replace('…', '')}... Dillo a voce, comincia proprio così!`,
    obiettivo: 4,
    conta: (t) => [...new Set(paroleContenuto(t).filter((p) => !paroleInizio.has(p)))],
    valuta: (t) => {
      const nuove = new Set(paroleContenuto(t).filter((p) => !paroleInizio.has(p))).size;
      return nuove ? Math.min(10, 2 + 2 * nuove) : 0;
    },
    chiusura: (t, p) => (p >= 8 ? 'Che frase lunga e ricca! Bravissima!' : p > 0 ? 'Bella frase! La prossima volta prova ad aggiungere un perché.' : 'Riproviamo un’altra volta!'),
    fine
  });
}

export function dopo(area, { voce, fine }) {
  const vig = voce.vignette || [];
  const mostrate = vig.slice(0, Math.max(2, vig.length - 1));
  const vera = vig[vig.length - 1];
  return rispostaLibera(area, {
    sinistra: `<div class="vignette" style="grid-template-columns:repeat(${mostrate.length + 1},minmax(0,1fr))">${mostrate.map((v, i) => `<div class="vignetta"><span class="num">${i + 1}</span>${riquadroImmagine(v.immagine, 'scena-img piccola')}</div>`).join('')}
      <div class="posto" style="border-color:var(--viola)"><span class="parola-grande">?</span></div></div>
      <div class="card morbida" style="font-size:20px">${mostrate.map((v) => esc(v.testo)).join('. ')}…</div>`,
    intro: `${voce.titolo ? voce.titolo + '. ' : ''}${mostrate.map((v) => v.testo).join('. ')}. E poi? Inventa tu cosa succede dopo! Usa almeno due frasi.`,
    obiettivo: 8,
    conta: (t) => [...new Set(paroleContenuto(t))],
    valuta: (t) => {
      const n = new Set(paroleContenuto(t)).size;
      const ponti = CONNETTIVI.filter((c) => contiene(t, c)).length;
      return Math.min(10, Math.round(6 * Math.min(1, n / 8)) + Math.min(4, 2 * ponti));
    },
    chiusura: () => `Che bella idea! Nella mia storia invece: ${vera ? vera.testo : ''}.`,
    fine
  });
}
