// "I miei progressi": le caramelle giorno per giorno, che si sommano.
import { vai } from '../nav.js';
import { caramelleTotali, nomeBambina } from '../state.js';
import { storico, aggiornaStorico, conGitHub } from '../data.js';
import { esc, ICONE, caramella, contatoreCaramelle, virgolaDice, collegaFumetti } from '../ui.js';
import { GIOCHI } from '../punteggi.js';
import { parla } from '../tts.js';

const giornoDi = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const maiuscola = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const daChiave = (k) => { const [a, m, g] = k.split('-').map(Number); return new Date(a, m - 1, g); };
const oggi = () => giornoDi(new Date().toISOString());

export function calcolaGiorni(st, totale) {
  const giorni = new Map();
  Object.values(st).forEach((p) => {
    if (!p || !p.q) return;
    const k = giornoDi(p.q);
    const g = giorni.get(k) || { chiave: k, caramelle: 0, partite: 0, giochi: {}, racconti: [] };
    g.caramelle += p.c || 0;
    g.partite++;
    g.giochi[p.g] = (g.giochi[p.g] || 0) + (p.c || 0);
    if (p.r) g.racconti.push(p.r);
    giorni.set(k, g);
  });
  const lista = [...giorni.values()].sort((a, b) => a.chiave.localeCompare(b.chiave));
  const somma = lista.reduce((t, g) => t + g.caramelle, 0);
  // caramelle guadagnate prima che esistesse il diario
  let progressivo = Math.max(0, (totale || 0) - somma);
  const prima = progressivo;
  lista.forEach((g) => { progressivo += g.caramelle; g.totale = progressivo; });
  return { lista, prima };
}

export function mieiGiorni(app) {
  collegaFumetti(app);
  const disegna = () => {
    const tot = caramelleTotali();
    const { lista, prima } = calcolaGiorni(storico(), tot);
    const perChiave = new Map(lista.map((g) => [g.chiave, g]));
    const settimana = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setHours(12); d.setDate(d.getDate() - (6 - i));
      const k = giornoDi(d.toISOString());
      return { k, d, c: (perChiave.get(k) || {}).caramelle || 0 };
    });
    const max = Math.max(10, ...settimana.map((x) => x.c));
    const sett = settimana.reduce((t, x) => t + x.c, 0);
    const migliore = lista.reduce((m, g) => (!m || g.caramelle > m.caramelle ? g : m), null);
    const messaggio = !lista.length
      ? 'Qui scriverò tutte le caramelle che guadagni, giorno per giorno. Inizia a giocare!'
      : perChiave.get(oggi())
        ? `Oggi hai già guadagnato ${perChiave.get(oggi()).caramelle} caramelle! In tutto ne hai ${tot}.`
        : `In questa settimana hai guadagnato ${sett} caramelle. In tutto ne hai ${tot}!`;
    app.innerHTML = `<main class="schermata">
      <div class="barra">
        <button class="btn-tondo" id="esci" aria-label="Torna alla home">${ICONE.indietro}</button>
        <h1>${nomeBambina() ? `I progressi di ${esc(nomeBambina())}` : 'I miei progressi'}</h1>
        <div class="destra">${contatoreCaramelle(tot)}</div>
      </div>
      <div class="diario-giorni">
        <div class="colonna">
          ${virgolaDice(messaggio)}
          <div class="card settimana">
            <b>Gli ultimi 7 giorni</b>
            <div class="barattoli">${settimana.map((x) => `<div class="giorno-bar ${x.k === oggi() ? 'oggi' : ''}">
              <span class="num">${x.c || ''}</span>
              <div class="vaso"><div class="riempi" style="height:${Math.round((x.c / max) * 100)}%"></div></div>
              <small>${x.d.toLocaleDateString('it-IT', { weekday: 'short' }).replace('.', '')}</small></div>`).join('')}</div>
            <div class="riga-pulsanti" style="justify-content:space-between"><span>Questa settimana: <b>${sett}</b></span>
              ${migliore ? `<span>Giorno record: <b>${migliore.caramelle}</b> (${daChiave(migliore.chiave).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })})</span>` : ''}</div>
          </div>
          <span class="aiuto" id="stato-sync"></span>
        </div>
        <div class="colonna pagine-diario">
          ${lista.length ? lista.slice().reverse().map((g) => `<article class="pagina-giorno ${g.chiave === oggi() ? 'oggi' : ''}">
            <header><span class="data">${esc(maiuscola(daChiave(g.chiave).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })))}${g.chiave === oggi() ? ' · oggi' : ''}</span>
              <span class="piu-caramelle"><span style="width:30px;display:inline-flex">${caramella(true)}</span>+${g.caramelle}</span></header>
            <div class="giochi-giorno">${Object.entries(g.giochi).map(([id, c]) => GIOCHI[id] ? `<span class="chip-gioco" data-tipo="${GIOCHI[id].tipo}" title="${esc(GIOCHI[id].titolo)}">${ICONE[id] || ''}<span>${esc(GIOCHI[id].titolo)}</span><b>${c}</b></span>` : '').join('')}</div>
            ${g.racconti.length ? `<p class="racconto-giorno">📖 «${esc(g.racconti.join(' '))}»</p>` : ''}
            <footer>In tutto: <b>${g.totale}</b> caramelle</footer>
          </article>`).join('') : '<div class="card"><p>Ancora nessuna giornata nel diario.</p></div>'}
          ${prima ? `<article class="pagina-giorno prima"><header><span class="data">Prima del diario</span><span class="piu-caramelle">${prima}</span></header><footer>Caramelle guadagnate prima di aprire il diario</footer></article>` : ''}
        </div>
      </div></main>`;
    app.querySelector('#esci').onclick = () => vai('home');
    return messaggio;
  };
  if (!conGitHub()) aggiornaStorico();
  const messaggio = disegna();
  setTimeout(() => parla(messaggio), 400);
  if (conGitHub() && navigator.onLine) {
    const s = app.querySelector('#stato-sync');
    if (s) s.textContent = 'Controllo le caramelle degli altri dispositivi…';
    aggiornaStorico().then(() => { if (document.body.contains(app)) disegna(); }).catch(() => { const x = app.querySelector('#stato-sync'); if (x) x.textContent = ''; });
  }
}
