// Home della bambina.
import { vai } from '../nav.js';
import { S, loc, nomeBambina, caramelleTotali, dispositivo } from '../state.js';
import { esc, ICONE, contatoreCaramelle, cancelloGenitori, virgolaDice, collegaFumetti } from '../ui.js';
import { GIOCHI, GRUPPI, attivaGioco, personaggio, prossimoSblocco } from '../punteggi.js';
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
  const attivi = Object.entries(GIOCHI).filter(([id]) => attivaGioco(S.config, id));
  const tessera = ([id, g]) => `
    <button class="gioco" data-tipo="${g.tipo}" data-gioco="${id}">
      <span class="icona">${ICONE[id]}</span>
      <span class="testi"><b>${esc(g.titolo)}</b><span>${esc(g.sotto)}</span></span>
    </button>`;
  const giochi = Object.entries(GRUPPI).map(([gr, titolo]) => {
    const lista = attivi.filter(([, g]) => g.gruppo === gr);
    return lista.length ? `<section class="gruppo-giochi" data-gruppo="${gr}"><h2>${esc(titolo)}</h2><div class="giochi">${lista.map(tessera).join('')}</div></section>` : '';
  }).join('');
  app.innerHTML = `<main class="schermata">
    <div class="home">
      <header class="home-testa">
        <img class="wordmark" src="img/wordmark.png" alt="Punto e Virgola">
        ${virgolaDice(saluto)}
        <button class="btn-tondo angolo-genitori" id="genitori" aria-label="Area genitori">${ICONE.lucchetto}</button>
      </header>
      <div class="profilo">
        <button class="saluto" id="avatar" aria-label="Cambia il tuo personaggio">
          <span class="avatar">${pg.faccia}</span>
          <span><h1>Ciao, ${esc(nomeBambina())}!</h1><small>Tocca per cambiare personaggio</small></span>
        </button>
        <div class="barattolo">
          <img src="img/punto.png" alt="">
          <div class="info">
            <div class="riga-caramelle"><b>Le tue caramelle</b>${contatoreCaramelle(tot)}</div>
            ${prossimo ? `<div class="barra-progresso" aria-hidden="true"><div style="width:${Math.min(100, percentuale)}%"></div></div>
            <small>Ancora ${prossimo.costo - tot} per sbloccare ${esc(prossimo.nome)} ${prossimo.faccia}</small>`
            : '<small>Hai sbloccato tutti i personaggi!</small>'}
          </div>
        </div>
        <button class="diario-chip" id="diario-giorni">${ICONE.calendario}<span>I miei progressi</span></button>
      </div>
      <div class="elenco-giochi">
        ${giochi || '<p class="card">Nessuna attività attiva: chiedi a mamma o papà.</p>'}
      </div>
    </div></main>`;

  collegaFumetti(app);
  app.querySelector('#avatar').onclick = () => vai('personaggio');
  app.querySelector('#diario-giorni').onclick = () => vai('mieiGiorni');
  app.querySelectorAll('[data-gioco]').forEach((b) => { b.onclick = () => vai('gioco', { gioco: b.dataset.gioco }); });
  app.querySelector('#genitori').onclick = async () => {
    const d = dispositivo();
    if (d && d.ruolo === 'genitore') return vai('genitori');
    if (await cancelloGenitori(S.config && S.config.pin, verificaPin)) vai('genitori');
  };
}
