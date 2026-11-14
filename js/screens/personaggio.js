// Scelta del personaggio della bambina.
import { vai } from '../nav.js';
import { loc, caramelleTotali, nomeBambina } from '../state.js';
import { sincronizza } from '../data.js';
import { esc, ICONE, caramella, virgolaDice, collegaFumetti, aggiornaFumetto, toast } from '../ui.js';
import { PERSONAGGI } from '../punteggi.js';
import { parla } from '../tts.js';

export function sceltaPersonaggio(app, { primoAvvio } = {}) {
  const tot = caramelleTotali();
  let scelto = loc.get('avatar') || (primoAvvio ? null : PERSONAGGI[0].id);
  const testo = primoAvvio
    ? `${nomeBambina()}, scegli il tuo personaggio! Potrai cambiarlo quando vuoi.`
    : 'Chi gioca con noi oggi? Con le caramelle sblocchi nuovi personaggi.';
  app.innerHTML = `<main class="schermata">
    <div class="barra">
      ${primoAvvio ? '' : `<button class="btn-tondo" id="indietro" aria-label="Indietro">${ICONE.indietro}</button>`}
      <h1>Scegli il tuo personaggio</h1>
    </div>
    <div class="due-colonne" style="grid-template-columns:minmax(0,.7fr) minmax(0,1.3fr)">
      <div class="colonna">${virgolaDice(testo)}<img src="img/punto.png" alt="Punto" style="width:min(240px,60%);align-self:center"></div>
      <div class="colonna">
        <div class="personaggi">${PERSONAGGI.map((p) => {
          const bloccato = p.costo > tot;
          return `<button class="personaggio ${bloccato ? 'bloccato' : ''} ${p.id === scelto ? 'attivo' : ''}" data-id="${p.id}" aria-pressed="${p.id === scelto}" aria-label="${esc(p.nome)}${bloccato ? ', bloccato' : ''}">
            <span class="faccia">${p.faccia}</span><span>${esc(p.nome)}</span>
            ${bloccato ? `<span class="costo">${caramella(true)} ${p.costo}</span>` : ''}</button>`;
        }).join('')}</div>
        <button class="btn grande" id="fatto" style="align-self:flex-end" ${scelto ? '' : 'disabled'}>Fatto!</button>
      </div>
    </div></main>`;
  collegaFumetti(app);
  setTimeout(() => parla(testo), 300);
  app.querySelector('.personaggi').addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    const p = PERSONAGGI.find((x) => x.id === b.dataset.id);
    if (p.costo > tot) {
      aggiornaFumetto(app, `${p.nome} si sblocca con ${p.costo} caramelle. Te ne mancano ${p.costo - tot}!`);
      return;
    }
    scelto = p.id;
    app.querySelectorAll('.personaggio').forEach((x) => { x.classList.toggle('attivo', x.dataset.id === scelto); x.setAttribute('aria-pressed', x.dataset.id === scelto); });
    app.querySelector('#fatto').disabled = false;
    parla(p.nome);
  });
  app.querySelector('#fatto').onclick = () => {
    loc.set('avatar', scelto);
    sincronizza();
    toast('Personaggio scelto!');
    vai('home');
  };
  const ind = app.querySelector('#indietro');
  if (ind) ind.onclick = () => vai('home');
}
