// Virgola assegna le caramelle.
import { vai } from '../nav.js';
import { dispositivo, caramelleTotali, nomeBambina } from '../state.js';
import { registraPartita, serieGiorni, giocatoOggi } from '../data.js';
import { limiteSuperato } from '../tempo.js';
import { caramella, virgolaDice, collegaFumetti, contatoreCaramelle } from '../ui.js';
import { fraseVirgola, fraseFineCiclo, PERSONAGGI } from '../punteggi.js';
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
  const registra = P.esercizi.length && (d.ruolo === 'bambina' || d.modo === 'locale');
  const guadagnate = P.esercizi.reduce((t, e) => t + (e.punteggio || 0), 0);
  const massimo = P.esercizi.length * 10;
  // bonus per i giorni di fila: solo al primo ciclo completato della giornata
  const serie = registra ? serieGiorni(true) : 0;
  const primoDiOggi = registra && !giocatoOggi();
  const bonus = primoDiOggi && serie >= 2 ? 2 * Math.min(serie, 5) : 0;
  const esercizi = bonus ? [...P.esercizi, { gioco: 'serie', punteggio: bonus, serie, quando: new Date().toISOString() }] : P.esercizi;
  if (registra) registraPartita({ gioco: P.gioco, livello: P.livello, inizio: P.inizio, fine: new Date().toISOString(), interrotta: !!interrotta, esercizi });
  const tot = guadagnate + bonus;
  const dopo = registra ? caramelleTotali() : prima;
  const sbloccati = PERSONAGGI.filter((x) => x.costo > prima && x.costo <= dopo);
  const quota = massimo ? guadagnate / massimo : 0;
  const nome = Math.random() < 0.4 ? nomeBambina() : '';
  let msg = fraseFineCiclo(quota, guadagnate, nome);
  if (bonus) msg += ` E siccome giochi da ${serie} giorni di fila, ecco ${bonus} caramelle in più!`;
  if (sbloccati.length) msg += ` Hai sbloccato ${sbloccati.map((x) => x.nome).join(' e ')}!`;
  if (limiteSuperato()) msg += ' Per oggi abbiamo giocato abbastanza: ci vediamo domani!';
  const passi = P.esercizi.map((e, i) => `<div class="passo-ciclo ${e.punteggio >= 7 ? 'alto' : e.punteggio >= 4 ? 'medio' : 'basso'}" style="animation-delay:${i * 120}ms"><small>${i + 1}</small><b>${e.punteggio}</b></div>`).join('');
  app.innerHTML = `<main class="schermata" style="justify-content:center">
    <div class="risultato">
      <div class="mascotte"><img src="img/duo.png" alt="Punto e Virgola" class="festa" style="width:90%"></div>
      <div class="colonna" style="gap:18px">
        <h1 style="font-size:clamp(34px,4.2vw,50px);color:var(--navy)">${quota >= 0.7 ? 'Bravissima!' : quota >= 0.4 ? 'Brava!' : 'Ce l’hai fatta!'}</h1>
        <div class="card riepilogo-ciclo">
          <div class="punteggio"><b>+${tot}</b><span>caramelle${bonus ? ` <small>(${guadagnate} + ${bonus} 🔥)</small>` : ''}</span></div>
          ${P.esercizi.length > 1 ? `<div class="passi-ciclo" aria-label="Caramelle per ogni esercizio">${passi}</div>` : ''}
        </div>
        ${virgolaDice(msg, { allegro: true })}
        ${sbloccati.length ? `<div class="card" style="display:flex;gap:16px;align-items:center;font-size:52px">${sbloccati.map((x) => x.faccia).join(' ')}<span style="font-size:20px;font-family:var(--font-titoli)">Nuovo personaggio!</span></div>` : ''}
        <div>Ora hai ${contatoreCaramelle(dopo)}${serie >= 2 ? ` <span class="serie-chip">🔥 ${serie} giorni di fila</span>` : ''}</div>
        <div class="riga-pulsanti">
          ${limiteSuperato() ? '' : '<button class="btn grande" id="ancora">Gioca ancora</button>'}
          <button class="btn ${limiteSuperato() ? 'grande' : 'secondario'}" id="casa">Torna alla home</button>
          ${sbloccati.length ? '<button class="btn secondario" id="pers">Scegli il personaggio</button>' : ''}
        </div>
      </div>
    </div></main>`;
  collegaFumetti(app);
  setTimeout(() => parla(msg), 350);
  const anc = app.querySelector('#ancora');
  if (anc) anc.onclick = () => vai('gioco', { gioco: P.gioco });
  app.querySelector('#casa').onclick = () => vai('home');
  const pb = app.querySelector('#pers');
  if (pb) pb.onclick = () => vai('personaggio');
}
