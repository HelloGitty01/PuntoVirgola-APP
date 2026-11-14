// Gestione della partita: scelta delle scene, avanzamento, registrazione.
import { vai } from '../nav.js';
import { S, loc, impostazioni } from '../state.js';
import { mescola, ICONE, esc, contatoreCaramelle, finestra } from '../ui.js';
import { GIOCHI } from '../punteggi.js';
import { componi } from './componi.js';
import { dillo } from './dillo.js';
import { racconta } from './racconta.js';
import { descrivi } from './descrivi.js';
import { coppie, sillabe, iniziale, rime, ripeti, pronuncia } from './suoni.js';
import { scombinata, unisci, finisci, trasforma, dopo } from './frasi2.js';
import { riassunto } from './riassunto.js';
import { allunga, domande, indovina, diario, sceneAllunga } from './frasi3.js';
import { cascata } from './cascata.js';
import { dettato } from './dettato.js';
import { avviaConteggio, fermaConteggio, limiteSuperato } from '../tempo.js';

const ESERCIZI = { dettato, cascata, allunga, domande, indovina, diario, riassunto, pronuncia, componi, dillo, racconta, descrivi, coppie, sillabe, iniziale, rime, ripeti, scombinata, unisci, finisci, trasforma, dopo };

// Identificativo stabile ricavato dal contenuto (per non ripetere sempre gli stessi esercizi).
function idDa(testo) {
  let h = 0;
  for (const c of String(testo)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return 'x' + (h >>> 0).toString(36);
}

// Elenco degli esercizi disponibili per ogni attività.
function fonte(gioco) {
  const sc = S.scene || {};
  const conId = (lista, chiave) => (lista || []).map((x) => ({ ...x, id: x.id || idDa(chiave(x)) }));
  switch (gioco) {
    case 'componi': case 'dillo': return (sc.scene || []).filter((s) => (s.elementi || []).length >= 2);
    case 'descrivi': return sc.scene || [];
    case 'racconta': return sc.storie || [];
    case 'dopo': return (sc.storie || []).filter((s) => (s.vignette || []).length >= 3);
    case 'coppie': return (sc.coppie || []).map((c) => ({ id: idDa(c.join('/')), coppia: c }));
    case 'rime': return (sc.rime || []).map((c) => ({ id: idDa('r' + c.join('/')), coppia: c }));
    case 'sillabe': case 'iniziale': return conId(sc.parole, (x) => gioco + x.sillabe);
    case 'ripeti': return conId(sc.ripeti, (x) => x.frase);
    case 'riassunto': return sc.racconti || [];
    case 'allunga': return sceneAllunga();
    case 'domande': return (sc.scene || []).filter((s) => (s.elementi || []).length >= 2);
    case 'indovina': return sc.indovinelli || [];
    case 'diario': return [{ id: 'diario', domande: sc.diario || [] }];
    case 'dettato': return sc.dettati || [];
    case 'cascata': return (sc.parole || []).length >= 3 ? [{ id: 'cascata' }] : [];
    case 'pronuncia': {
      const scelti = (S.config && S.config.suoniPronuncia) || null;
      return conId(sc.pronuncia, (x) => 'p' + x.suono + x.parola).filter((x) => !scelti || scelti.includes(x.suono));
    }
    case 'scombinata': return (sc.scombinate || []).map((f) => {
      const n = f.split(/\s+/).length;
      return { id: idDa(f), frase: f, livello: n <= 5 ? 1 : n <= 7 ? 2 : 3 };
    });
    case 'unisci': return conId(sc.unisci, (x) => x.a + x.b);
    case 'finisci': return (sc.finisci || []).map((f) => ({ id: idDa(f), inizio: f }));
    case 'trasforma': return conId(sc.trasforma, (x) => x.frase + x.modello);
    default: return [];
  }
}
let P = null; // partita in corso

export function partitaCorrente() { return P; }

function scegli(gioco) {
  const imp = impostazioni();
  const conLivelli = (GIOCHI[gioco] || {}).livelli > 0;
  const livello = conLivelli ? (imp.livelli[gioco] || 1) : 1;
  const tutte = fonte(gioco);
  const fonteL = conLivelli ? tutte : tutte.map((x) => ({ ...x, livello: 1 }));
  const quanti = gioco === 'dettato' ? (livello >= 3 ? 1 : 2) : ['riassunto', 'diario', 'cascata'].includes(gioco) ? 1 : gioco === 'domande' ? Math.min(3, imp.scenePerPartita) : ['racconta', 'dopo'].includes(gioco) ? Math.min(3, imp.scenePerPartita) : imp.scenePerPartita;
  const recenti = new Set(loc.get('recenti.' + gioco, []));
  const ordina = (lista) => {
    const nuovi = mescola(lista.filter((x) => !recenti.has(x.id)));
    const vecchi = mescola(lista.filter((x) => recenti.has(x.id)));
    return nuovi.concat(vecchi);
  };
  let scelti = ordina(fonteL.filter((x) => (x.livello || 1) === livello));
  if (scelti.length < quanti) scelti = scelti.concat(ordina(fonteL.filter((x) => (x.livello || 1) < livello)).sort((a, b) => (b.livello || 1) - (a.livello || 1)));
  if (scelti.length < quanti) scelti = scelti.concat(ordina(fonteL.filter((x) => (x.livello || 1) > livello)));
  let finale = scelti.slice(0, quanti);
  // Ripasso: torna qualche esercizio andato male di recente (non quelli dell'ultima partita)
  if (!['diario', 'cascata'].includes(gioco)) {
    const dif = loc.get('difficili.' + gioco, {});
    const ultima = new Set(loc.get('ultima.' + gioco, []));
    const daRipassare = mescola(fonteL.filter((x) => dif[x.id] !== undefined && !ultima.has(x.id) && (x.livello || 1) <= livello))
      .slice(0, Math.ceil(quanti * 0.4));
    if (daRipassare.length) {
      const ids = new Set(daRipassare.map((x) => x.id));
      const resto = finale.filter((x) => !ids.has(x.id)).slice(0, quanti - daRipassare.length);
      finale = mescola([...resto, ...daRipassare.map((x) => ({ ...x, ripasso: true }))]);
    }
    loc.set('ultima.' + gioco, finale.map((x) => x.id));
  }
  const nuoviRecenti = [...finale.map((x) => x.id), ...recenti].slice(0, Math.max(6, Math.floor(fonteL.length * 0.6)));
  loc.set('recenti.' + gioco, nuoviRecenti);
  return { finale, livello };
}

export function gioco(app, param = {}) {
  if (!param.continua && limiteSuperato()) {
    P = null;
    app.innerHTML = `<main class="schermata" style="align-items:center;justify-content:center;text-align:center;gap:18px">
      <img src="img/duo.png" alt="" style="width:min(320px,70vw)"><h1 style="color:var(--navy)">Per oggi abbiamo giocato abbastanza!</h1>
      <p>Punto e Virgola si riposano un po’. Ci vediamo domani!</p><button class="btn grande" id="casa">Torna alla home</button></main>`;
    app.querySelector('#casa').onclick = () => vai('home');
    return;
  }
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
  const puntini = P.elementi.map((_, k) => `<span class="${k < P.i ? 'fatto' : k === P.i ? 'ora' : ''}"></span>`).join('');
  app.innerHTML = `<main class="schermata" data-tipo="${g.tipo}">
    <div class="barra">
      <button class="btn-tondo" id="esci" aria-label="Torna alla home">${ICONE.indietro}</button>
      <h1>${esc(g.titolo)}</h1>
      <div class="destra">${P.elementi.length > 1 ? `<span class="passo-di">${P.i + 1} di ${P.elementi.length}</span>` : ''}<div class="puntini" aria-label="Esercizio ${P.i + 1} di ${P.elementi.length}">${puntini}</div></div>
    </div>
    <div id="esercizio" style="flex:1;display:flex;flex-direction:column"></div>
  </main>`;
  const area = app.querySelector('#esercizio');
  let pulizia = null;
  app.querySelector('#esci').onclick = async () => {
    const mancano = P.elementi.length - P.esercizi.length;
    const ok = !P.esercizi.length || await finestra({
      titolo: 'Vuoi tornare alla home?',
      html: `<p>Le caramelle arrivano alla fine di tutto il gioco: ${mancano === 1 ? 'manca solo un esercizio' : `mancano ancora ${mancano} esercizi`}! Se esci adesso, le caramelle di questa partita si perdono.</p>`,
      pulsanti: [{ testo: 'Continuo a giocare', valore: false, classe: 'secondario' }, { testo: 'Esco lo stesso', valore: true }]
    });
    if (!ok) return;
    P = null;
    vai('home');
  };
  // A fine esercizio non si cambia pagina da soli: compare un pulsante, così Virgola finisce di parlare
  // e la bambina può ancora riascoltarsi. Le caramelle si vedono solo alla fine di tutto il ciclo.
  let concluso = false;
  const fine = (esito) => {
    if (concluso) return;
    concluso = true;
    const voce = P.elementi[P.i];
    P.esercizi.push({ gioco: P.gioco, id: voce.id, livello: P.livello, quando: new Date().toISOString(), ...(voce.ripasso ? { ripasso: true } : {}), ...esito });
    // ricordo gli esercizi andati male, per riproporli più avanti
    const dif = loc.get('difficili.' + P.gioco, {});
    if ((esito.punteggio || 0) >= 7) delete dif[voce.id]; else dif[voce.id] = esito.punteggio || 0;
    loc.set('difficili.' + P.gioco, dif);
    P.i++;
    const ultimo = P.i >= P.elementi.length;
    const mic = area.querySelector('#mic');
    if (mic) { mic.disabled = true; const t = area.querySelector('#mic-testo'); if (t) t.textContent = 'Esercizio finito!'; }
    const barra = document.createElement('div');
    barra.className = 'barra-fine';
    barra.innerHTML = `<button class="btn grande arancio" id="vai-caramelle">${ultimo ? 'Vedi le caramelle!' : 'Avanti!'} ${ICONE.avanti}</button>`;
    app.querySelector('main').appendChild(barra);
    const prosegui = () => (ultimo ? vai('finePartita', {}) : vai('gioco', { continua: true }));
    barra.querySelector('button').onclick = prosegui;
    // nel riassunto la bambina ha appena toccato "Fatto!": si va avanti subito
    if (P.gioco === 'riassunto') prosegui();
  };
  pulizia = ESERCIZI[P.gioco](area, { voce: P.elementi[P.i], fine, livello: P.livello, indice: P.i });
  avviaConteggio();
  return () => { fermaConteggio(); if (typeof pulizia === 'function') pulizia(); };
}

export function chiudiPartita() { const p = P; P = null; return p; }
