// Virgola assegna le caramelle.
import { vai } from '../nav.js';
import { dispositivo, caramelleTotali, nomeBambina } from '../state.js';
import { registraPartita } from '../data.js';
import { caramella, virgolaDice, collegaFumetti, contatoreCaramelle } from '../ui.js';
import { fraseVirgola, PERSONAGGI } from '../punteggi.js';
import { parla } from '../tts.js';
import { chiudiPartita, partitaCorrente } from './gioco.js';

export function risultato(app, { esito, ultimo }) {
  const p = esito.punteggio;
  const frase = fraseVirgola(p, Math.random() < 0.5 ? nomeBambina() : '');
  app.innerHTML = `<main class="schermata">
    <div class="risultato">
      <div class="mascotte">
        <img src="img/punto.png" alt="Punto" class="${p >= 7 ? 'festa' : ''}" style="width:80%">
      </div>
      <div class="colonna" style="gap:22px">
        <h1 style="font-size:clamp(40px,5vw,60px);color:var(--navy)">${p >= 7 ? 'Bravissima!' : p >= 4 ? 'Brava!' : 'Ci sei quasi!'}</h1>
        <div class="card" style="display:flex;flex-direction:column;gap:16px">
          <div class="punteggio"><b>${p}</b><span>caramelle su 10</span></div>
          <div class="caramelle" aria-label="${p} caramelle su 10">${Array.from({ length: 10 }, (_, i) => caramella(i < p, i * 90)).join('')}</div>
        </div>
        ${virgolaDice(frase, { allegro: p >= 7 })}
        <button class="btn grande" id="avanti">${ultimo ? 'Fine partita' : 'Avanti'}</button>
      </div>
    </div></main>`;
  collegaFumetti(app);
  setTimeout(() => parla(frase), 350);
  app.querySelector('#avanti').onclick = () => (ultimo ? vai('finePartita', {}) : vai('gioco', { continua: true }));
}

export function finePartita(app, { interrotta } = {}) {
  const prima = caramelleTotali();
  const P = chiudiPartita() || partitaCorrente();
  if (!P) return vai('home');
  const d = dispositivo() || {};
  let tot = P.esercizi.reduce((t, e) => t + e.punteggio, 0);
  if (P.esercizi.length && (d.ruolo === 'bambina' || d.modo === 'locale')) {
    tot = registraPartita({ gioco: P.gioco, livello: P.livello, inizio: P.inizio, fine: new Date().toISOString(), interrotta: !!interrotta, esercizi: P.esercizi });
  }
  const dopo = d.ruolo === 'genitore' && d.modo !== 'locale' ? prima : caramelleTotali();
  const sbloccati = PERSONAGGI.filter((x) => x.costo > prima && x.costo <= dopo);
  const msg = sbloccati.length
    ? `Hai guadagnato ${tot} caramelle e hai sbloccato ${sbloccati.map((s) => s.nome).join(' e ')}!`
    : `In questa partita hai guadagnato ${tot} caramelle!`;
  app.innerHTML = `<main class="schermata" style="justify-content:center">
    <div class="risultato">
      <div class="mascotte"><img src="img/duo.png" alt="Punto e Virgola" class="festa" style="width:90%"></div>
      <div class="colonna" style="gap:22px">
        <h1 style="font-size:clamp(36px,4.5vw,54px);color:var(--navy)">Partita finita!</h1>
        ${virgolaDice(msg, { allegro: true })}
        ${sbloccati.length ? `<div class="card" style="display:flex;gap:16px;align-items:center;font-size:56px">${sbloccati.map((s) => s.faccia).join(' ')}<span style="font-size:20px;font-family:var(--font-titoli)">Nuovo personaggio!</span></div>` : ''}
        <div>Ora hai ${contatoreCaramelle(dopo)}</div>
        <div class="riga-pulsanti">
          <button class="btn grande" id="ancora">Gioca ancora</button>
          <button class="btn secondario" id="casa">Torna alla home</button>
          ${sbloccati.length ? '<button class="btn secondario" id="pers">Scegli il personaggio</button>' : ''}
        </div>
      </div>
    </div></main>`;
  collegaFumetti(app);
  setTimeout(() => parla(msg), 350);
  app.querySelector('#ancora').onclick = () => vai('gioco', { gioco: P.gioco });
  app.querySelector('#casa').onclick = () => vai('home');
  const pb = app.querySelector('#pers');
  if (pb) pb.onclick = () => vai('personaggio');
}
