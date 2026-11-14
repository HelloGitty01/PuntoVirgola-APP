// Gioco "Descrivi la scena": almeno N parole importanti e una parola segreta.
import { impostazioni } from '../state.js';
import { esc, virgolaDice, aggiornaFumetto, collegaFumetti, riquadroImmagine, riempiImmagini, attendi } from '../ui.js';
import { puntiDescrivi } from '../punteggi.js';
import { paroleContenuto, contiene, evidenzia, normalizza } from '../match.js';
import { parla } from '../tts.js';
import { collegaMicrofono, htmlMic, htmlRegistrazione, collegaRegistrazione, messaggioErroreVoce } from './dillo.js';

// Contatore riutilizzabile: parole dette, quante ne mancano, tacche e parole contate.
export function htmlContatore(obiettivo, titolo) {
  return `<div class="card sfida">
    <div class="testa"><span>${esc(titolo)}</span></div>
    <div class="conta-grande" aria-live="polite"><span><b id="n-dette">0</b> dette</span><span id="n-mancano" class="mancano">ne mancano ${obiettivo}</span></div>
    <div class="tacche" id="tacche">${Array.from({ length: obiettivo }, () => '<span></span>').join('')}</div>
    <div class="parole-contate" id="contate"></div>
    <span class="aiuto">Contano le parole importanti (non “il, la, di, e…”).</span>
  </div>`;
}
export function aggiornaContatore(area, parole, obiettivo) {
  const n = parole.length;
  area.querySelector('#n-dette').textContent = n;
  const m = Math.max(0, obiettivo - n);
  const nodo = area.querySelector('#n-mancano');
  nodo.textContent = m ? `ne ${m === 1 ? 'manca' : 'mancano'} ${m}` : 'obiettivo raggiunto!';
  nodo.classList.toggle('fatto', !m);
  area.querySelectorAll('#tacche span').forEach((s, i) => s.classList.toggle('ok', i < n));
  area.querySelector('#contate').innerHTML = parole.map((p) => `<span>${esc(p)}</span>`).join('');
}

// Esempio di descrizione che rispetta davvero il numero di parole richiesto.
function descrizioneModello(voce, obiettivo, segreta) {
  let testo = voce.descrizione || voce.frase || '';
  let n = new Set(paroleContenuto(testo)).size;
  const manca = segreta && !contiene(testo, segreta);
  if (n >= obiettivo && !manca) return { testo, n };
  // Ripiego per le scene senza descrizione: aggiungo parole del vocabolario della scena.
  const gia = new Set(paroleContenuto(testo));
  const extra = [...new Set([...(manca ? [segreta] : []), ...(voce.vocabolario || [])])].filter((w) => !gia.has(normalizza(w)));
  const servono = Math.max(manca ? 1 : 0, obiettivo - n);
  const aggiunte = extra.slice(0, servono);
  if (aggiunte.length) {
    testo = `${testo.replace(/[.!]?$/, '.')} Nella figura vedo anche: ${aggiunte.join(', ')}.`;
    n = new Set(paroleContenuto(testo)).size;
  }
  return { testo, n };
}

export function descrivi(area, { voce, fine, livello }) {
  const imp = impostazioni();
  const obiettivo = Number(imp.paroleDescrivi[livello] || 6);
  const candidate = (voce.parolaSegreta && voce.parolaSegreta.length ? voce.parolaSegreta : (voce.vocabolario || []).filter((p) => p.length >= 4));
  const segreta = candidate.length ? candidate[Math.floor(Math.random() * candidate.length)] : null;
  const frasi = [];
  let finito = false;
  const leggi = imp.letturaAutomatica;
  const intro = `Sfida! Racconta cosa vedi nella figura usando almeno ${obiettivo} parole importanti${segreta ? ` e la parola segreta: ${segreta}` : ''}.`;
  const dette = () => [...new Set(paroleContenuto(frasi.join(' ')))];
  const segretaTrovata = () => !segreta || contiene(frasi.join(' '), segreta);

  area.innerHTML = `<div class="due-colonne">
    <div class="colonna">
      ${riquadroImmagine(voce.immagine)}
      <div class="card morbida" style="display:flex;flex-direction:column;gap:6px">
        <span style="color:var(--tenue)">Hai detto:</span>
        <div class="trascrizione" id="trascr"></div>
        <button class="link nascosto" id="togli-ultima" style="align-self:flex-start">Cancella l’ultima frase</button>
      </div>
    </div>
    <div class="colonna">
      ${virgolaDice(intro)}
      ${htmlContatore(obiettivo, `Usa almeno ${obiettivo} parole`)}
      ${segreta ? `<div class="card sfida"><div class="testa"><span>Parola segreta:</span><span class="segreta" id="segreta">${esc(segreta)}</span></div></div>` : ''}
      <div style="margin-top:auto;display:flex;flex-direction:column;gap:14px;align-items:center">
        ${htmlMic()}
        <div class="riga-pulsanti" style="justify-content:center">${htmlRegistrazione()}<button class="btn arancio" id="finito" disabled>Ho finito</button></div>
      </div>
    </div></div>`;
  riempiImmagini(area);
  collegaFumetti(area);
  if (leggi) setTimeout(() => parla(intro), 400);
  const reg = collegaRegistrazione(area);

  function mostra(testoCorrente = '') {
    const tutte = [...new Set([...dette(), ...paroleContenuto(testoCorrente)])];
    aggiornaContatore(area, tutte, obiettivo);
    const sNodo = area.querySelector('#segreta');
    if (sNodo) sNodo.classList.toggle('trovata', segretaTrovata() || (!!segreta && contiene(testoCorrente, segreta)));
    const testo = [...frasi, testoCorrente].filter(Boolean).join(' … ');
    area.querySelector('#trascr').innerHTML = evidenzia(testo, tutte, esc);
    area.querySelector('#togli-ultima').classList.toggle('nascosto', !frasi.length || !!testoCorrente);
    area.querySelector('#finito').disabled = !frasi.length;
    return tutte.length;
  }

  const fermaMic = collegaMicrofono(area, {
    suTesto: (t) => mostra(t),
    suAnnulla: () => mostra(),
    suErrore: (e) => aggiornaFumetto(area, messaggioErroreVoce(e), { leggi }),
    suFine: ({ testo, audio }) => {
      reg.imposta(audio);
      if (!testo) { aggiornaFumetto(area, 'Non ho sentito bene. Riprova!', { leggi }); mostra(); return; }
      frasi.push(testo);
      const n = mostra();
      if (n >= obiettivo && segretaTrovata()) return concludi();
      const mancano = Math.max(0, obiettivo - n);
      const parti = [];
      if (mancano) parti.push(`ti ${mancano === 1 ? 'manca' : 'mancano'} ancora ${mancano} ${mancano === 1 ? 'parola' : 'parole'}`);
      if (!segretaTrovata()) parti.push(`non hai ancora usato la parola segreta: ${segreta}`);
      aggiornaFumetto(area, `Brava! Continua: ${parti.join(' e ')}. Tocca il microfono e aggiungi qualcosa.`, { leggi });
    }
  });

  area.querySelector('#togli-ultima').onclick = () => {
    frasi.pop();
    mostra();
    aggiornaFumetto(area, 'Ho cancellato l’ultima frase. Tocca il microfono e riprova!', { leggi });
  };
  area.querySelector('#finito').onclick = () => concludi();

  async function concludi() {
    if (finito) return;
    finito = true;
    const n = dette().length;
    const punti = puntiDescrivi({ parole: n, obiettivo, segreta: segretaTrovata() && !!segreta });
    const msg = n >= obiettivo ? 'Che bella descrizione!' : 'Bella descrizione!';
    const modello = descrizioneModello(voce, obiettivo, segreta);
    aggiornaFumetto(area, `${msg} Io l’avrei descritta così: ${modello.testo}`, { leggi: false, allegro: true });
    parla(modello.testo ? `${msg} Io l'avrei descritta così, con ${modello.n} parole importanti. ${modello.testo}` : msg);
    await attendi(900);
    fine({ punteggio: punti, parole: n, obiettivo, segreta, segretaTrovata: segretaTrovata() && !!segreta, frasi });
  }

  return () => { fermaMic(); reg.libera(); };
}
