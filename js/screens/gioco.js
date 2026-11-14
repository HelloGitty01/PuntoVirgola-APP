// Gestione della partita: scelta delle scene, avanzamento, registrazione.
import { vai } from '../nav.js';
import { S, loc, impostazioni } from '../state.js';
import { mescola, ICONE, esc, contatoreCaramelle, finestra } from '../ui.js';
import { GIOCHI } from '../punteggi.js';
import { componi } from './componi.js';
import { dillo } from './dillo.js';
import { racconta } from './racconta.js';
import { descrivi } from './descrivi.js';

const ESERCIZI = { componi, dillo, racconta, descrivi };
let P = null; // partita in corso

export function partitaCorrente() { return P; }

function scegli(gioco) {
  const imp = impostazioni();
  const livello = imp.livelli[gioco] || 1;
  const fonte = gioco === 'racconta' ? (S.scene.storie || []) : (S.scene.scene || []).filter((s) => {
    if (gioco === 'descrivi') return true;
    return (s.elementi || []).length >= 2;
  });
  const quanti = gioco === 'racconta' ? Math.min(3, imp.scenePerPartita) : imp.scenePerPartita;
  const recenti = new Set(loc.get('recenti.' + gioco, []));
  const ordina = (lista) => {
    const nuovi = mescola(lista.filter((x) => !recenti.has(x.id)));
    const vecchi = mescola(lista.filter((x) => recenti.has(x.id)));
    return nuovi.concat(vecchi);
  };
  let scelti = ordina(fonte.filter((x) => (x.livello || 1) === livello));
  if (scelti.length < quanti) scelti = scelti.concat(ordina(fonte.filter((x) => (x.livello || 1) < livello)));
  if (scelti.length < quanti) scelti = scelti.concat(ordina(fonte.filter((x) => (x.livello || 1) > livello)));
  const finale = scelti.slice(0, quanti);
  const nuoviRecenti = [...finale.map((x) => x.id), ...recenti].slice(0, Math.max(6, Math.floor(fonte.length * 0.6)));
  loc.set('recenti.' + gioco, nuoviRecenti);
  return { finale, livello };
}

export function gioco(app, param = {}) {
  if (!param.continua || !P) {
    const { finale, livello } = scegli(param.gioco);
    P = { gioco: param.gioco, livello, elementi: finale, i: 0, esercizi: [], inizio: new Date().toISOString() };
  }
  if (!P.elementi.length) {
    app.innerHTML = `<main class="schermata" style="align-items:center;justify-content:center;text-align:center">
      <img src="img/virgola.png" alt="" style="width:160px"><h1 style="color:var(--navy)">Non ci sono ancora esercizi per questo gioco</h1>
      <p>Chiedi a mamma o papà di aggiungerli dall'area genitori.</p><button class="btn" id="casa">Torna alla home</button></main>`;
    app.querySelector('#casa').onclick = () => vai('home');
    return;
  }
  const g = GIOCHI[P.gioco];
  const caramelleFin = P.esercizi.reduce((t, e) => t + e.punteggio, 0);
  const puntini = P.elementi.map((_, k) => `<span class="${k < P.i ? 'fatto' : k === P.i ? 'ora' : ''}"></span>`).join('');
  app.innerHTML = `<main class="schermata" data-tipo="${g.tipo}">
    <div class="barra">
      <button class="btn-tondo" id="esci" aria-label="Torna alla home">${ICONE.indietro}</button>
      <h1>${esc(g.titolo)}</h1>
      <div class="destra"><div class="puntini" aria-label="Esercizio ${P.i + 1} di ${P.elementi.length}">${puntini}</div>${contatoreCaramelle(caramelleFin)}</div>
    </div>
    <div id="esercizio" style="flex:1;display:flex;flex-direction:column"></div>
  </main>`;
  const area = app.querySelector('#esercizio');
  let pulizia = null;
  app.querySelector('#esci').onclick = async () => {
    const ok = await finestra({
      titolo: 'Vuoi tornare alla home?',
      html: '<p>Le caramelle di questa partita restano tue.</p>',
      pulsanti: [{ testo: 'Continuo a giocare', valore: false, classe: 'secondario' }, { testo: 'Torna alla home', valore: true }]
    });
    if (!ok) return;
    if (P.esercizi.length) vai('finePartita', { interrotta: true });
    else { P = null; vai('home'); }
  };
  const fine = (esito) => {
    P.esercizi.push({ gioco: P.gioco, id: P.elementi[P.i].id, livello: P.livello, quando: new Date().toISOString(), ...esito });
    P.i++;
    vai('risultato', { esito, ultimo: P.i >= P.elementi.length });
  };
  pulizia = ESERCIZI[P.gioco](area, { voce: P.elementi[P.i], fine, livello: P.livello });
  return () => { if (typeof pulizia === 'function') pulizia(); };
}

export function chiudiPartita() { const p = P; P = null; return p; }
