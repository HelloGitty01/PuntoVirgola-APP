// Gioco "Dillo tu": la bambina descrive la figura a voce.
import { S, impostazioni } from '../state.js';
import { esc, ICONE, virgolaDice, aggiornaFumetto, collegaFumetti, riquadroImmagine, riempiImmagini, mescola, attendi } from '../ui.js';
import { TIPI, puntiDillo, lode } from '../punteggi.js';
import { valutaElementi, paroleNonPreviste, vocabolarioScena } from '../match.js';
import { Ascolto, motoreScelto, voskPronto, preparaVosk, preparaAscolto } from '../speech.js';
import { parla, zitto } from '../tts.js';

const caso = (a) => a[Math.floor(Math.random() * a.length)];

export function messaggioErroreVoce(e) {
  if (e.message === 'microfono') return 'Non riesco a usare il microfono. Chiedi a mamma o papà di dare il permesso.';
  if (e.message === 'modello-mancante') return 'Mi manca il modello vocale: chiedi a mamma o papà di installarlo (vedi istruzioni).';
  if (e.message === 'locale-non-disponibile') return 'Il riconoscimento locale del browser non è disponibile: scegliete Vosk nelle impostazioni.';
  return 'Il microfono non ha funzionato. Riproviamo?';
}

// Tasto microfono riutilizzabile: gestisce preparazione del modello, ascolto e stop.
// Seconda lettura guidata del riconoscimento vocale (attiva salvo diversa scelta dei genitori)
export function letturaGuidata() { return impostazioni().letturaGuidata !== false; }

export function collegaMicrofono(area, { suTesto, suFine, suErrore, primaDiAscoltare, grammatica, vocabolario, suAnnulla }) {
  const bt = area.querySelector('#mic');
  const etich = area.querySelector('#mic-testo');
  const annulla = area.querySelector('#mic-annulla');
  let ascolto = null;
  let timer = null;
  // "Cancella": durante la dettatura butta via quello che è stato riconosciuto finora, senza valutarlo.
  if (annulla) annulla.onclick = async () => {
    if (!ascolto) return;
    clearTimeout(timer);
    const a = ascolto; ascolto = null;
    annulla.classList.add('nascosto');
    bt.disabled = true;
    await a.ferma();
    statoRiposo();
    if (suAnnulla) suAnnulla(); else suTesto('');
    etich.textContent = 'Cancellato! Tocca e riprova';
  };
  preparaAscolto();
  const statoRiposo = () => { if (annulla) annulla.classList.add('nascosto'); bt.classList.remove('ascolta'); bt.innerHTML = ICONE.mic; bt.setAttribute('aria-label', 'Tocca e parla'); etich.textContent = 'Tocca e parla'; bt.disabled = false; };
  statoRiposo();
  bt.onclick = async () => {
    if (ascolto) {
      clearTimeout(timer);
      const a = ascolto; ascolto = null;
      bt.disabled = true; etich.textContent = 'Un attimo…';
      const r = await a.ferma();
      statoRiposo();
      suFine(r);
      return;
    }
    zitto();
    if (primaDiAscoltare) primaDiAscoltare();
    try {
      if (motoreScelto() === 'vosk' && !voskPronto()) {
        bt.disabled = true;
        etich.textContent = 'Virgola prepara le orecchie…';
        await preparaVosk((p) => { etich.textContent = `Virgola prepara le orecchie… ${Math.round(p * 100)}%`; });
        bt.disabled = false;
      }
      ascolto = new Ascolto({ onTesto: suTesto, grammatica: typeof grammatica === 'function' ? grammatica() : grammatica, vocabolario: letturaGuidata() ? (typeof vocabolario === 'function' ? vocabolario() : vocabolario) : null });
      await ascolto.avvia();
      bt.classList.add('ascolta');
      bt.innerHTML = ICONE.stop;
      bt.setAttribute('aria-label', 'Ho finito');
      etich.textContent = 'Ti ascolto… tocca quando hai finito';
      if (annulla) annulla.classList.remove('nascosto');
      timer = setTimeout(() => { if (ascolto) bt.click(); }, 20000);
    } catch (e) {
      ascolto = null;
      statoRiposo();
      suErrore(e);
    }
  };
  return () => { clearTimeout(timer); if (ascolto) ascolto.annulla(); };
}

export function htmlMic() {
  return `<div class="mic-zona"><button class="mic" id="mic"></button><span class="mic-testo" id="mic-testo">Tocca e parla</span>
    <button class="btn secondario piccolo nascosto" id="mic-annulla">✕ Cancella e ricomincia</button></div>`;
}

export function collegaRegistrazione(area) {
  let url = null, blob = null;
  const play = area.querySelector('#riascolta');
  const giu = area.querySelector('#scarica');
  play.onclick = () => { if (url) new Audio(url).play(); };
  giu.onclick = () => {
    if (!blob) return;
    const a = document.createElement('a');
    const est = (blob.type.split('/')[1] || 'webm').split(';')[0];
    a.href = url; a.download = `punto-e-virgola-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.${est}`;
    document.body.appendChild(a); a.click(); a.remove();
  };
  return {
    imposta(b) {
      if (!b) return;
      if (url) URL.revokeObjectURL(url);
      blob = b; url = URL.createObjectURL(b);
      play.disabled = false; giu.disabled = false;
    },
    libera() { if (url) URL.revokeObjectURL(url); }
  };
}

export function htmlRegistrazione() {
  return `<div class="riga-pulsanti" style="justify-content:center">
    <button class="btn secondario" id="riascolta" disabled>${ICONE.play} Riascoltati</button>
    <button class="btn-tondo" id="scarica" disabled aria-label="Scarica la registrazione">${ICONE.scarica}</button></div>`;
}

export function dillo(area, { voce, fine }) {
  const el = voce.elementi || [];
  const trovati = new Set();
  let tentativi = 0, aiuti = 0, finito = false, mancantiPrimo = null;
  const frasi = [];
  const nonPreviste = new Set();
  const leggi = impostazioni().letturaAutomatica;
  const intro = `Guarda bene la figura e dimmi una frase: ${el.map((e) => TIPI[e.tipo].nome.toLowerCase()).join(', ')}.`;

  area.innerHTML = `<div class="due-colonne">
    <div class="colonna">
      ${riquadroImmagine(voce.immagine)}
      <div class="card morbida" style="display:flex;flex-direction:column;gap:10px">
        <span style="color:var(--tenue)">Hai detto:</span>
        <div class="frase" id="pezzi">${el.map((e, i) => `<div class="spazio" data-tipo="${e.tipo}"><div class="casella" data-el="${i}" style="min-height:56px;min-width:110px;font-size:20px">${TIPI[e.tipo].etichetta}</div></div>`).join('')}</div>
        <div class="trascrizione" id="trascr"></div>
      </div>
    </div>
    <div class="colonna">
      ${virgolaDice(intro)}
      <div id="aiutini" class="mattoncini"></div>
      <div style="margin-top:auto;display:flex;flex-direction:column;gap:16px;align-items:center">
        ${htmlMic()}
        ${htmlRegistrazione()}
      </div>
    </div></div>`;
  riempiImmagini(area);
  collegaFumetti(area);
  if (leggi) setTimeout(() => parla(intro), 400);
  const reg = collegaRegistrazione(area);

  function mostraTrovati(insieme) {
    el.forEach((e, i) => {
      const c = area.querySelector(`[data-el="${i}"]`);
      const ok = insieme.has(i);
      c.classList.toggle('piena', ok);
      c.textContent = ok ? e.testo : TIPI[e.tipo].etichetta;
    });
  }

  const fermaMic = collegaMicrofono(area, {
    vocabolario: () => vocabolarioScena(voce),
    suTesto: (t) => {
      area.querySelector('#trascr').textContent = t;
      const live = valutaElementi(t, el, { tollerante: true }).trovati;
      mostraTrovati(new Set([...trovati, ...live]));
    },
    suErrore: (e) => {
      aggiornaFumetto(area, messaggioErroreVoce(e), { leggi });
      mostraAiutiTutti();
    },
    suFine: ({ testo, guidato, audio }) => {
      reg.imposta(audio);
      if (!testo && !guidato) { aggiornaFumetto(area, 'Non ho sentito bene. Riprova parlando un po’ più forte!', { leggi }); return; }
      testo = testo || guidato;
      tentativi++;
      frasi.push(testo);
      area.querySelector('#trascr').textContent = testo;
      // contano sia la lettura libera sia quella guidata, con un po' di tolleranza sui suoni
      valutaElementi(`${testo} ${guidato || ''}`, el, { tollerante: true }).trovati.forEach((i) => trovati.add(i));
      paroleNonPreviste(testo, el, voce.vocabolario || [], (S.config && S.config.ignorate) || []).forEach((p) => nonPreviste.add(p));
      if (mancantiPrimo === null) mancantiPrimo = el.map((e, i) => (trovati.has(i) ? null : e.tipo)).filter(Boolean);
      mostraTrovati(trovati);
      valuta();
    }
  });

  function primoMancante() { return el.findIndex((_, i) => !trovati.has(i)); }

  function valuta() {
    const m = primoMancante();
    if (m < 0) return completa();
    const dom = el[m].domanda || `${TIPI[el[m].tipo].nome}?`;
    if (tentativi >= 3) {
      aggiornaFumetto(area, `Ti aiuto io! ${dom} Scegli il mattoncino giusto.`, { leggi });
      mostraAiuto(m);
    } else {
      const lodi = trovati.size ? `${lode()} ` : '';
      aggiornaFumetto(area, `${lodi}${dom}`, { leggi });
    }
  }

  function mostraAiuto(m) {
    const e = el[m];
    const altri = (voce.distrattori || []).filter((d) => d.tipo === e.tipo).slice(0, 2);
    const opzioni = mescola([{ testo: e.testo, ok: true }, ...altri.map((d) => ({ testo: d.testo, ok: false }))]);
    const box = area.querySelector('#aiutini');
    box.innerHTML = opzioni.map((o, k) => `<button class="mattoncino" data-tipo="${e.tipo}" data-k="${k}">${esc(o.testo)}</button>`).join('');
    box.onclick = (ev) => {
      const b = ev.target.closest('[data-k]');
      if (!b) return;
      const o = opzioni[+b.dataset.k];
      if (!o.ok) { b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); return; }
      aiuti++;
      trovati.add(m);
      box.innerHTML = '';
      mostraTrovati(trovati);
      valuta();
    };
  }

  function mostraAiutiTutti() {
    if (tentativi < 3) tentativi = 3;
    const m = primoMancante();
    if (m >= 0) mostraAiuto(m);
  }

  async function completa() {
    if (finito) return;
    finito = true;
    const frase = voce.frase || el.map((e) => e.testo).join(' ');
    aggiornaFumetto(area, `Bravissima! Si dice: ${frase}`, { leggi: false, allegro: true });
    parla(`Bravissima! Si dice: ${frase}`);
    await attendi(900);
    fine({
      punteggio: puntiDillo({ tentativi: Math.max(1, tentativi), aiuti, trovati: trovati.size, totali: el.length }),
      tentativi, aiuti,
      mancanti: mancantiPrimo || [],
      frasi,
      nonPreviste: [...nonPreviste]
    });
  }

  return () => { fermaMic(); reg.libera(); };
}
