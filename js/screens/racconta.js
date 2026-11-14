// Gioco "Racconta la storia": vignette in ordine, poi il racconto a voce.
import { impostazioni } from '../state.js';
import { esc, virgolaDice, aggiornaFumetto, collegaFumetti, riquadroImmagine, riempiImmagini, trascinabile, mescola, attendi } from '../ui.js';
import { puntiRacconta } from '../punteggi.js';
import { contiene, paroleContenuto, parole, trova } from '../match.js';
import { parla } from '../tts.js';
import { collegaMicrofono, htmlMic, htmlRegistrazione, collegaRegistrazione, messaggioErroreVoce } from './dillo.js';

const PONTI_MODELLO = ['Prima', 'Poi', 'Dopo', 'Alla fine'];

export function racconta(area, { voce, fine }) {
  const vig = voce.vignette || [];
  const ordine = mescola(vig.map((_, i) => i));
  const posti = vig.map(() => null);
  const ponti = voce.connettivi && voce.connettivi.length ? voce.connettivi : ['prima', 'poi', 'dopo', 'alla fine', 'perché', 'ma', 'quindi'];
  let errori = 0, scelto = null, fase = 1, finito = false;
  const leggi = impostazioni().letturaAutomatica;
  const intro = `${voce.titolo ? voce.titolo + '. ' : ''}Metti le vignette in ordine: cosa succede prima?`;

  area.innerHTML = `<div class="due-colonne">
    <div class="colonna">
      <div class="vignette" id="posti">${vig.map((_, i) => `<div class="posto" data-posto="${i}"><span class="num">${i + 1}</span></div>`).join('')}</div>
      <div class="vassoio" id="vassoio">${ordine.map((i) => `<div class="vignetta" data-v="${i}" role="button" tabindex="0" aria-label="Vignetta">${riquadroImmagine(vig[i].immagine, 'scena-img piccola')}</div>`).join('')}</div>
    </div>
    <div class="colonna">
      ${virgolaDice(intro)}
      <div id="fase2" class="nascosto" style="display:flex;flex-direction:column;gap:16px">
        <div class="mattoncini">${ponti.map((p) => `<span class="mattoncino" data-tipo="ponte" style="min-height:52px;display:inline-flex;align-items:center">${esc(p)}</span>`).join('')}</div>
        <div class="trascrizione" id="trascr"></div>
        ${htmlMic()}
        ${htmlRegistrazione()}
        <button class="link" id="salta">Non voglio raccontarla adesso</button>
      </div>
    </div></div>`;
  area.querySelectorAll('.vignetta .scena-img').forEach((n) => { n.style.border = 'none'; n.style.padding = '0'; n.style.minHeight = '0'; });
  riempiImmagini(area);
  collegaFumetti(area);
  if (leggi) setTimeout(() => parla(intro), 400);

  function primoLibero() { return posti.findIndex((p) => p === null); }

  function prova(v, j) {
    if (fase !== 1 || posti[j] !== null) return;
    const nodo = area.querySelector(`.vassoio [data-v="${v}"]`);
    if (!nodo) return;
    nodo.classList.remove('scelto');
    scelto = null;
    if (v !== j) {
      errori++;
      nodo.classList.remove('no'); void nodo.offsetWidth; nodo.classList.add('no');
      aggiornaFumetto(area, j === 0 ? 'Uhm, è proprio la prima cosa che succede? Guarda bene!' : 'Non ancora: pensa a cosa succede subito dopo.', { leggi });
      return;
    }
    posti[j] = v;
    const posto = area.querySelector(`[data-posto="${j}"]`);
    nodo.removeAttribute('role');
    posto.replaceWith(nodo);
    nodo.dataset.posto = j;
    nodo.insertAdjacentHTML('beforeend', `<span class="num">${j + 1}</span>`);
    if (vig[v].testo) parla(vig[v].testo);
    if (primoLibero() < 0) avviaFase2();
    else aggiornaFumetto(area, 'Brava! E poi cosa succede?', { leggi: false, allegro: true });
  }

  trascinabile(area, {
    elementi: '.vassoio .vignetta',
    destinazioni: '.posto',
    suRilascio: (n, dest) => prova(+n.dataset.v, +dest.dataset.posto),
    suTocco: (n) => {
      area.querySelectorAll('.vignetta.scelto').forEach((b) => b.classList.remove('scelto'));
      scelto = +n.dataset.v;
      n.classList.add('scelto');
    }
  });
  area.addEventListener('click', (e) => {
    const p = e.target.closest('.posto');
    if (p && scelto !== null) prova(scelto, +p.dataset.posto);
  });

  let fermaMic = () => {};
  let reg = null;
  function avviaFase2() {
    fase = 2;
    area.querySelector('#vassoio').classList.add('nascosto');
    area.querySelector('#fase2').classList.remove('nascosto');
    aggiornaFumetto(area, 'Perfetto! Ora raccontami la storia. Usa le parole ponte: prima, poi, alla fine.', { leggi, allegro: true });
    reg = collegaRegistrazione(area);
    fermaMic = collegaMicrofono(area, {
      suTesto: (t) => { area.querySelector('#trascr').textContent = t; },
      suErrore: (e) => aggiornaFumetto(area, messaggioErroreVoce(e) + ' Puoi anche saltare il racconto.', { leggi }),
      suFine: ({ testo, audio }) => {
        reg.imposta(audio);
        if (!testo) { aggiornaFumetto(area, 'Non ho sentito bene. Riprova!', { leggi }); return; }
        area.querySelector('#trascr').textContent = testo;
        const usati = ponti.filter((p) => contiene(testo, p));
        const toks = parole(testo);
        const citate = vig.filter((v) => {
          const chiavi = [...(v.parole || []), ...paroleContenuto(v.testo || '')];
          return chiavi.some((k) => trova(toks, k) >= 0 || trova(toks, k.replace(/.$/, '*')) >= 0);
        }).length;
        concludi(true, usati.length, citate, testo);
      }
    });
    area.querySelector('#salta').onclick = () => concludi(false, 0, 0, '');
  }

  async function concludi(raccontata, nPonti, citate, testo) {
    if (finito) return;
    finito = true;
    const modello = vig.map((v, i) => `${PONTI_MODELLO[Math.min(i, 2)] && i < vig.length - 1 ? PONTI_MODELLO[Math.min(i, 2)] : 'Alla fine'}, ${(v.testo || '').replace(/^./, (c) => c.toLowerCase())}`).join('. ');
    const lode = raccontata ? (nPonti ? 'Che bel racconto!' : 'Bel racconto! La prossima volta usa anche le parole ponte.') : 'Va bene!';
    aggiornaFumetto(area, `${lode} Ascolta come la racconto io.`, { leggi: false, allegro: true });
    parla(`${lode} Ascolta come la racconto io. ${modello}.`);
    await attendi(900);
    fine({
      punteggio: puntiRacconta({ errori, ponti: nPonti, vignetteCitate: citate, totaleVignette: vig.length, raccontata }),
      errori, ponti: nPonti, vignetteCitate: citate, raccontata, frasi: testo ? [testo] : []
    });
  }

  return () => { fermaMic(); if (reg) reg.libera(); };
}
