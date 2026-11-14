// Home della bambina.
import { vai } from '../nav.js';
import { S, loc, nomeBambina, caramelleTotali, dispositivo } from '../state.js';
import { esc, ICONE, contatoreCaramelle, cancelloGenitori, virgolaDice, collegaFumetti } from '../ui.js';
import { GIOCHI, personaggio, prossimoSblocco } from '../punteggi.js';
import { verificaPin } from './genitori.js';

export function home(app) {
  const tot = caramelleTotali();
  const pg = personaggio(loc.get('avatar'));
  const prossimo = prossimoSblocco(tot);
  const saluti = [
    'Ciao! Scegli un gioco: io ti spiego tutto e Punto gioca con te.',
    'Che bello vederti! Con quale gioco iniziamo oggi?',
    'Pronta? Ogni frase giusta vale tante caramelle!'
  ];
  const saluto = saluti[Math.floor(Math.random() * saluti.length)];
  const percentuale = prossimo ? Math.round((tot / prossimo.costo) * 100) : 100;
  const giochi = Object.entries(GIOCHI).map(([id, g]) => `
    <button class="gioco" data-tipo="${g.tipo}" data-gioco="${id}">
      <span class="icona">${ICONE[id]}</span>
      <span><b>${esc(g.titolo)}</b><span>${esc(g.sotto)}</span></span>
    </button>`).join('');

  app.innerHTML = `<main class="schermata">
    <div class="home">
      <div class="lato">
        <img class="wordmark" src="img/wordmark.png" alt="Punto e Virgola">
        <div class="saluto">
          <button class="avatar" id="avatar" aria-label="Cambia il tuo personaggio">${pg.faccia}</button>
          <div><h1>Ciao, ${esc(nomeBambina())}!</h1><p>A cosa giochiamo oggi?</p></div>
        </div>
        ${virgolaDice(saluto)}
        <div class="card barattolo">
          <div class="info">
            <b>Le tue caramelle</b>
            ${contatoreCaramelle(tot)}
            ${prossimo ? `<div class="barra-progresso" aria-hidden="true"><div style="width:${Math.min(100, percentuale)}%"></div></div>
            <span style="font-size:16px;color:var(--tenue)">Ancora ${prossimo.costo - tot} per sbloccare ${esc(prossimo.nome)} ${prossimo.faccia}</span>`
            : '<span style="font-size:16px;color:var(--tenue)">Hai sbloccato tutti i personaggi!</span>'}
          </div>
          <img src="img/punto.png" alt="Punto">
        </div>
      </div>
      <div class="lato">
        <div style="display:flex;justify-content:flex-end;gap:12px">
          <button class="btn-tondo" id="genitori" aria-label="Area genitori">${ICONE.lucchetto}</button>
        </div>
        <div class="giochi" style="flex:1">${giochi}</div>
      </div>
    </div></main>`;

  collegaFumetti(app);
  app.querySelector('#avatar').onclick = () => vai('personaggio');
  app.querySelectorAll('[data-gioco]').forEach((b) => { b.onclick = () => vai('gioco', { gioco: b.dataset.gioco }); });
  app.querySelector('#genitori').onclick = async () => {
    const d = dispositivo();
    if (d && d.ruolo === 'genitore') return vai('genitori');
    if (await cancelloGenitori(S.config && S.config.pin, verificaPin)) vai('genitori');
  };
}
