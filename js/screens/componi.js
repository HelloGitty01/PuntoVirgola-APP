// Gioco "Componi la scena": i mattoncini colorati vanno negli spazi giusti.
import { impostazioni } from '../state.js';
import { esc, ICONE, virgolaDice, aggiornaFumetto, collegaFumetti, riquadroImmagine, riempiImmagini, trascinabile, mescola, attendi } from '../ui.js';
import { TIPI, puntiComponi, lode, riprova } from '../punteggi.js';
import { normalizza } from '../match.js';
import { parla } from '../tts.js';

const caso = (a) => a[Math.floor(Math.random() * a.length)];

export function componi(area, { voce, fine }) {
  const el = voce.elementi || [];
  const pezzi = mescola([
    ...el.map((e, i) => ({ tipo: e.tipo, testo: e.testo, giusto: i })),
    ...(voce.distrattori || []).map((d) => ({ tipo: d.tipo, testo: d.testo, giusto: -1 }))
  ]);
  const pieni = el.map(() => false);
  let errori = 0, aiuti = 0, scelto = null, finito = false;
  const leggi = impostazioni().letturaAutomatica;
  const domanda = (i) => el[i].domanda || `${TIPI[el[i].tipo].nome}?`;
  const primoVuoto = () => pieni.findIndex((p) => !p);
  const intro = `Guarda la figura. ${domanda(0)} Trascina i mattoncini negli spazi giusti.`;

  area.innerHTML = `<div class="due-colonne">
    <div class="colonna">
      ${riquadroImmagine(voce.immagine)}
      ${virgolaDice(intro)}
    </div>
    <div class="colonna">
      <div class="card">
        <div class="frase">${el.map((e, i) => `
          <div class="spazio" data-tipo="${e.tipo}">
            <span class="etichetta">${TIPI[e.tipo].etichetta}</span>
            <div class="casella" data-spazio="${i}" role="button" tabindex="0" aria-label="Spazio ${TIPI[e.tipo].nome}"></div>
          </div>`).join('')}</div>
        <div class="riga-pulsanti" style="margin-top:18px">
          <button class="btn" id="ascolta">${ICONE.altoparlante} Ascolta la frase</button>
          <button class="btn secondario" id="aiuto">${ICONE.aiuto} Aiuto di Virgola</button>
        </div>
      </div>
      <div style="margin-top:auto;display:flex;flex-direction:column;gap:12px">
        <span style="color:var(--tenue)">Trascina un mattoncino nello spazio del suo colore (oppure toccalo e poi tocca lo spazio).</span>
        <div class="mattoncini">${pezzi.map((p, k) => `<button class="mattoncino" data-tipo="${p.tipo}" data-pezzo="${k}">${esc(p.testo)}</button>`).join('')}</div>
      </div>
    </div></div>`;

  riempiImmagini(area);
  collegaFumetti(area);
  if (leggi) setTimeout(() => parla(intro), 400);
  evidenziaAttesa();

  function evidenziaAttesa() {
    area.querySelectorAll('.casella').forEach((c) => c.classList.remove('attesa'));
    const i = primoVuoto();
    if (i >= 0) area.querySelector(`[data-spazio="${i}"]`).classList.add('attesa');
  }

  function prova(k, j) {
    if (finito) return;
    const p = pezzi[k];
    const btn = area.querySelector(`[data-pezzo="${k}"]`);
    if (pieni[j]) return;
    const giusto = p.giusto === j || (p.tipo === el[j].tipo && normalizza(p.testo) === normalizza(el[j].testo));
    btn.classList.remove('scelto', 'suggerito');
    scelto = null;
    if (!giusto) {
      errori++;
      btn.classList.remove('no'); void btn.offsetWidth; btn.classList.add('no');
      const msg = p.tipo !== el[j].tipo
        ? `Questo mattoncino va nello spazio "${TIPI[p.tipo].nome}". ${domanda(j)}`
        : riprova();
      aggiornaFumetto(area, msg, { leggi });
      return;
    }
    pieni[j] = true;
    btn.classList.add('usato');
    const cas = area.querySelector(`[data-spazio="${j}"]`);
    cas.textContent = el[j].testo;
    cas.classList.add('piena');
    const prossimo = primoVuoto();
    evidenziaAttesa();
    if (prossimo >= 0) {
      aggiornaFumetto(area, `${lode()} ${domanda(prossimo)}`, { leggi, allegro: true });
    } else {
      completa();
    }
  }

  async function completa() {
    finito = true;
    const frase = voce.frase || el.map((e) => e.testo).join(' ');
    aggiornaFumetto(area, `Bravissima! Ascolta la frase: ${frase}`, { leggi: false, allegro: true });
    parla(`Bravissima! Ascolta la frase. ${frase}`);
    await attendi(900);
    fine({ punteggio: puntiComponi({ errori, aiuti }), errori, aiuti });
  }

  trascinabile(area, {
    elementi: '.mattoncino',
    destinazioni: '.casella',
    suRilascio: (btn, dest) => prova(+btn.dataset.pezzo, +dest.dataset.spazio),
    suTocco: (btn) => {
      area.querySelectorAll('.mattoncino.scelto').forEach((b) => b.classList.remove('scelto'));
      scelto = +btn.dataset.pezzo;
      btn.classList.add('scelto');
      parla(btn.textContent);
    }
  });
  area.addEventListener('click', (e) => {
    const c = e.target.closest('.casella');
    if (c && scelto !== null) prova(scelto, +c.dataset.spazio);
  });
  area.querySelector('#ascolta').onclick = () => {
    const testo = el.map((e, i) => (pieni[i] ? e.testo : '…')).join(' ');
    parla(testo.replace(/…/g, ''));
  };
  area.querySelector('#aiuto').onclick = () => {
    const i = primoVuoto();
    if (i < 0) return;
    aiuti++;
    const k = pezzi.findIndex((p, idx) => p.giusto === i && !area.querySelector(`[data-pezzo="${idx}"]`).classList.contains('usato'));
    area.querySelectorAll('.suggerito').forEach((b) => b.classList.remove('suggerito'));
    if (k >= 0) area.querySelector(`[data-pezzo="${k}"]`).classList.add('suggerito');
    aggiornaFumetto(area, `Ti aiuto io: ${domanda(i)} Guarda il mattoncino che si muove!`, { leggi: true });
  };
}
