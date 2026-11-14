// Gioco "Descrivi la scena": almeno N parole e una parola segreta.
import { impostazioni } from '../state.js';
import { esc, virgolaDice, aggiornaFumetto, collegaFumetti, riquadroImmagine, riempiImmagini, attendi } from '../ui.js';
import { puntiDescrivi } from '../punteggi.js';
import { paroleContenuto, contiene, evidenzia } from '../match.js';
import { parla } from '../tts.js';
import { collegaMicrofono, htmlMic, htmlRegistrazione, collegaRegistrazione, messaggioErroreVoce } from './dillo.js';

export function descrivi(area, { voce, fine, livello }) {
  const imp = impostazioni();
  const obiettivo = Number(imp.paroleDescrivi[livello] || 6);
  const candidate = (voce.parolaSegreta && voce.parolaSegreta.length ? voce.parolaSegreta : (voce.vocabolario || []).filter((p) => p.length >= 4));
  const segreta = candidate.length ? candidate[Math.floor(Math.random() * candidate.length)] : null;
  const dette = new Set();
  const frasi = [];
  let segretaTrovata = !segreta, finito = false;
  const leggi = imp.letturaAutomatica;
  const intro = `Sfida! Racconta cosa vedi nella figura usando almeno ${obiettivo} parole${segreta ? ` e la parola segreta: ${segreta}` : ''}.`;

  area.innerHTML = `<div class="due-colonne">
    <div class="colonna">
      ${riquadroImmagine(voce.immagine)}
      <div class="card morbida" style="display:flex;flex-direction:column;gap:6px">
        <span style="color:var(--tenue)">Hai detto:</span>
        <div class="trascrizione" id="trascr"></div>
      </div>
    </div>
    <div class="colonna">
      ${virgolaDice(intro)}
      <div class="card sfida">
        <div class="testa"><span>Usa almeno ${obiettivo} parole</span><span id="conta">0 / ${obiettivo}</span></div>
        <div class="tacche" id="tacche">${Array.from({ length: obiettivo }, () => '<span></span>').join('')}</div>
        ${segreta ? `<div class="testa"><span>Parola segreta:</span><span class="segreta" id="segreta">${esc(segreta)}</span></div>` : ''}
      </div>
      <div style="margin-top:auto;display:flex;flex-direction:column;gap:14px;align-items:center">
        ${htmlMic()}
        <div class="riga-pulsanti" style="justify-content:center">${htmlRegistrazione()}<button class="btn arancio" id="finito" disabled>Ho finito</button></div>
      </div>
    </div></div>`;
  riempiImmagini(area);
  collegaFumetti(area);
  if (leggi) setTimeout(() => parla(intro), 400);
  const reg = collegaRegistrazione(area);

  function aggiorna(testoCorrente = '') {
    const tutte = new Set([...dette, ...paroleContenuto(testoCorrente)]);
    const n = tutte.size;
    area.querySelector('#conta').textContent = `${Math.min(n, obiettivo)} / ${obiettivo}`;
    area.querySelectorAll('#tacche span').forEach((s, i) => s.classList.toggle('ok', i < n));
    const seg = segretaTrovata || (segreta && contiene(testoCorrente, segreta));
    const sNodo = area.querySelector('#segreta');
    if (sNodo) sNodo.classList.toggle('trovata', !!seg);
    return { n, seg };
  }

  const fermaMic = collegaMicrofono(area, {
    suTesto: (t) => {
      const box = area.querySelector('#trascr');
      box.innerHTML = evidenzia(t, paroleContenuto(t), esc);
      aggiorna(t);
    },
    suErrore: (e) => aggiornaFumetto(area, messaggioErroreVoce(e), { leggi }),
    suFine: ({ testo, audio }) => {
      reg.imposta(audio);
      if (!testo) { aggiornaFumetto(area, 'Non ho sentito bene. Riprova!', { leggi }); return; }
      frasi.push(testo);
      paroleContenuto(testo).forEach((p) => dette.add(p));
      if (segreta && contiene(testo, segreta)) segretaTrovata = true;
      area.querySelector('#trascr').innerHTML = evidenzia(frasi.join(' … '), [...dette], esc);
      const { n } = aggiorna();
      area.querySelector('#finito').disabled = false;
      if (n >= obiettivo && segretaTrovata) return concludi();
      const mancano = Math.max(0, obiettivo - n);
      const parti = [];
      if (mancano) parti.push(`ti mancano ancora ${mancano} ${mancano === 1 ? 'parola' : 'parole'}`);
      if (!segretaTrovata) parti.push(`non hai ancora usato la parola segreta: ${segreta}`);
      aggiornaFumetto(area, `Brava! Continua: ${parti.join(' e ')}. Tocca il microfono e aggiungi qualcosa.`, { leggi });
    }
  });

  area.querySelector('#finito').onclick = () => concludi();

  async function concludi() {
    if (finito) return;
    finito = true;
    const punti = puntiDescrivi({ parole: dette.size, obiettivo, segreta: segretaTrovata && !!segreta });
    const msg = dette.size >= obiettivo ? 'Che bella descrizione!' : 'Bella descrizione!';
    aggiornaFumetto(area, msg, { leggi: false, allegro: true });
    if (voce.frase) await parla(`${msg} Io direi così: ${voce.frase}`);
    else await parla(msg);
    await attendi(500);
    fine({ punteggio: punti, parole: dette.size, obiettivo, segreta, segretaTrovata: segretaTrovata && !!segreta, frasi });
  }

  return () => { fermaMic(); reg.libera(); };
}
