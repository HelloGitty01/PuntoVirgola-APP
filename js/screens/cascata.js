// "Cascata di lettere": cadono pezzi con sillabe o lettere; mettili in fila per formare la parola.
// Quando la parola è scritta (in orizzontale da sinistra a destra, o in verticale dall'alto) sparisce.
import { S, impostazioni } from '../state.js';
import { esc, ICONE, virgolaDice, aggiornaFumetto, collegaFumetti, riquadroImmagine, riempiImmagini, mescola, attendi, reazione } from '../ui.js';
import { parla } from '../tts.js';

const COLONNE = 8;
const RIGHE = 12;
const OBIETTIVO = 5;
const COLORI = ['#48ABFC', '#F7A63A', '#E84A7F', '#8A5CD8', '#5C9A2E', '#E65E03', '#16A3A3'];
const caso = (a) => a[Math.floor(Math.random() * a.length)];
const VELOCITA = { 1: 950, 2: 800, 3: 600 };

function parolePossibili() {
  return (S.scene.parole || [])
    .map((p) => ({ parola: String(p.parola).toLowerCase(), sillabe: String(p.sillabe || p.parola).toLowerCase().split('-') }))
    .filter((p) => /^[a-zàèéìòù]+$/.test(p.parola) && p.parola.length >= 3 && p.parola.length <= COLONNE);
}

export function cascata(area, { livello = 1, fine }) {
  // con le lettere singole le parole lunghe sono troppo difficili: al massimo 6 lettere
  const tutte = parolePossibili().filter((p) => livello === 1 || p.parola.length <= 6);
  const lista = mescola(tutte).slice(0, OBIETTIVO + 3);
  const leggi = impostazioni().letturaAutomatica;
  const griglia = Array.from({ length: RIGHE }, () => Array(COLONNE).fill(null));
  let indice = 0;
  let bersaglio = lista[0];
  let pezzo = null, prossimo = null, coda = [];
  let fatte = 0, bonus = 0, finito = false, pausa = false, attesa = false;
  let intervallo = VELOCITA[livello] || 900;
  let timer = null;
  let colore = 0;

  const intro = `Costruisci la parola ${bersaglio.parola}! Sposta i pezzi che cadono e mettili in fila, uno accanto all’altro. Puoi anche girarli.`;
  area.innerHTML = `<div class="due-colonne cascata">
    <div class="colonna" style="align-items:center">
      <div class="tabellone" id="tab" style="--col:${COLONNE};--righe:${RIGHE}" tabindex="0" aria-label="Tabellone del gioco"></div>
    </div>
    <div class="colonna">
      ${virgolaDice(intro)}
      <div class="card bersaglio-card">
        <div id="fig" style="width:110px;flex:none"></div>
        <div style="display:flex;flex-direction:column;gap:8px;min-width:0">
          <span style="color:var(--tenue)">Scrivi la parola:</span>
          <div class="parola-bersaglio" id="bers"></div>
          <button class="btn secondario piccolo" id="ascolta" style="align-self:flex-start">${ICONE.altoparlante} Ascolta</button>
        </div>
      </div>
      <div class="riga-pulsanti" style="justify-content:space-between;align-items:center">
        <div class="card morbida prossimo"><small>Prossimo pezzo</small><div id="pross"></div></div>
        <div class="conta-grande"><b id="fatte">0</b> / ${OBIETTIVO} parole</div>
      </div>
      <div class="comandi" id="comandi">
        <button class="btn-comando" data-c="sx" aria-label="Sinistra">◀</button>
        <button class="btn-comando" data-c="gira" aria-label="Gira">⟳</button>
        <button class="btn-comando" data-c="giu" aria-label="Giù">▼</button>
        <button class="btn-comando" data-c="dx" aria-label="Destra">▶</button>
      </div>
      <span class="aiuto">Sul Chromebook puoi usare le frecce della tastiera: ← → per spostare, ↑ per girare, ↓ per scendere veloce.</span>
    </div></div>`;
  collegaFumetti(area);
  const tab = area.querySelector('#tab');
  tab.innerHTML = Array.from({ length: RIGHE * COLONNE }, () => '<div class="cella"></div>').join('');
  const celle = [...tab.children];
  if (leggi) setTimeout(() => parla(intro), 400);

  const mostraBersaglio = () => {
    area.querySelector('#bers').innerHTML = (livello === 1 ? bersaglio.sillabe : bersaglio.parola.split('')).map((x) => `<span>${esc(x.toUpperCase())}</span>`).join('');
    const fig = area.querySelector('#fig');
    fig.innerHTML = riquadroImmagine({ tipo: 'arasaac', parole: [bersaglio.parola] }, 'scena-img piccola');
    riempiImmagini(fig);
  };
  area.querySelector('#ascolta').onclick = () => parla(livello === 1 ? `${bersaglio.parola}: ${bersaglio.sillabe.join(', ')}` : bersaglio.parola);

  // ---- pezzi ----
  const pezziDella = (p) => (livello === 1 ? p.sillabe : p.parola.split(''));
  const distrattore = () => {
    const altra = caso(tutte.filter((x) => x.parola !== bersaglio.parola));
    return caso(pezziDella(altra));
  };
  const riempiCoda = () => {
    let seq = pezziDella(bersaglio).slice();
    if (livello >= 3) seq = mescola(seq);
    const fuori = livello >= 3 ? 2 : 1;
    for (let i = 0; i < fuori; i++) seq.splice(1 + Math.floor(Math.random() * seq.length), 0, distrattore());
    coda = coda.concat(seq);
  };
  const nuovoPezzo = (testo) => ({ testo, r: 0, c: Math.max(0, Math.floor((COLONNE - testo.length) / 2)), verticale: false, colore: COLORI[colore++ % COLORI.length] });
  const celleDi = (p, r = p.r, c = p.c, v = p.verticale) => p.testo.split('').map((ch, i) => ({ r: v ? r + i : r, c: v ? c : c + i, ch }));
  const libero = (cs) => cs.every(({ r, c }) => c >= 0 && c < COLONNE && r < RIGHE && (r < 0 || !griglia[r][c]));

  const disegna = (lampeggia = []) => {
    const mobile = pezzo ? celleDi(pezzo) : [];
    // ombra: dove cadrebbe il pezzo
    let ombra = [];
    if (pezzo && livello < 3) {
      let r = pezzo.r;
      while (libero(celleDi(pezzo, r + 1))) r++;
      ombra = celleDi(pezzo, r);
    }
    for (let r = 0; r < RIGHE; r++) for (let c = 0; c < COLONNE; c++) {
      const el = celle[r * COLONNE + c];
      const fisso = griglia[r][c];
      const m = mobile.find((x) => x.r === r && x.c === c);
      const o = ombra.find((x) => x.r === r && x.c === c);
      const x = m || fisso;
      el.textContent = x ? x.ch.toUpperCase() : '';
      el.className = 'cella' + (m ? ' mobile' : fisso ? ' piena' : o ? ' ombra' : '') + (lampeggia.some((l) => l.r === r && l.c === c) ? ' esplode' : '');
      el.style.background = m ? pezzo.colore : fisso ? fisso.colore : '';
    }
    const pr = area.querySelector('#pross');
    pr.innerHTML = prossimo ? `<span class="pezzo-mini" style="background:${COLORI[colore % COLORI.length]}">${esc(prossimo.toUpperCase())}</span>` : '';
  };

  const prendi = () => {
    if (!coda.length) riempiCoda();
    return coda.shift();
  };
  const genera = () => {
    if (!prossimo) prossimo = prendi();
    pezzo = nuovoPezzo(prossimo);
    prossimo = prendi();
    if (!libero(celleDi(pezzo))) return perso();
    if (livello === 1 && pezzo.testo.length > 1) parla(pezzo.testo);
    disegna();
  };

  // ---- parole formate ----
  const leggiRiga = (r) => griglia[r].map((x) => (x ? x.ch : ' ')).join('');
  const leggiColonna = (c) => griglia.map((riga) => (riga[c] ? riga[c].ch : ' ')).join('');
  const cercaParole = () => {
    const altre = tutte.map((p) => p.parola);
    const trovate = [];
    const prova = (stringa, aCella) => {
      for (const w of [bersaglio.parola, ...altre]) {
        let i = stringa.indexOf(w);
        while (i >= 0) {
          trovate.push({ parola: w, celle: Array.from({ length: w.length }, (_, k) => aCella(i + k)) });
          i = stringa.indexOf(w, i + 1);
        }
        if (trovate.length) return true;
      }
      return false;
    };
    for (let r = 0; r < RIGHE && !trovate.length; r++) prova(leggiRiga(r), (k) => ({ r, c: k }));
    for (let c = 0; c < COLONNE && !trovate.length; c++) prova(leggiColonna(c), (k) => ({ r: k, c }));
    return trovate[0] || null;
  };
  const rigaPiena = () => { for (let r = RIGHE - 1; r >= 0; r--) if (griglia[r].every(Boolean)) return r; return -1; };
  const gravita = () => {
    for (let c = 0; c < COLONNE; c++) {
      const pila = [];
      for (let r = RIGHE - 1; r >= 0; r--) if (griglia[r][c]) pila.push(griglia[r][c]);
      for (let r = RIGHE - 1, k = 0; r >= 0; r--, k++) griglia[r][c] = pila[k] || null;
    }
  };

  const dopoAtterraggio = async () => {
    attesa = true;
    // più parole possono formarsi a catena
    for (let giri = 0; giri < 6; giri++) {
      const w = cercaParole();
      const piena = w ? -1 : rigaPiena();
      if (!w && piena < 0) break;
      const cs = w ? w.celle : griglia[piena].map((_, c) => ({ r: piena, c }));
      disegna(cs);
      await attendi(550);
      cs.forEach(({ r, c }) => { griglia[r][c] = null; });
      gravita();
      disegna();
      if (w && w.parola === bersaglio.parola) {
        fatte++;
        area.querySelector('#fatte').textContent = fatte;
        reazione('gioia');
        if (fatte >= OBIETTIVO) { attesa = false; return vinto(); }
        indice++;
        bersaglio = lista[indice % lista.length];
        coda = [];
        prossimo = null;
        intervallo = Math.max(380, intervallo * 0.93);
        mostraBersaglio();
        const msg = `Bravissima! Hai scritto ${w.parola}! Ora costruisci: ${bersaglio.parola}.`;
        aggiornaFumetto(area, msg, { leggi: false, allegro: true });
        parla(msg);
      } else if (w) {
        bonus++;
        const msg = `Wow, hai scritto anche ${w.parola}! Caramella bonus!`;
        aggiornaFumetto(area, msg, { leggi: false, allegro: true });
        parla(msg);
      } else {
        aggiornaFumetto(area, 'Riga completa: spazzata via!', { leggi: false, allegro: true });
      }
    }
    attesa = false;
    if (!finito) genera();
  };

  const atterra = () => {
    celleDi(pezzo).forEach(({ r, c, ch }) => { if (r >= 0) griglia[r][c] = { ch, colore: pezzo.colore }; });
    pezzo = null;
    dopoAtterraggio();
  };

  const muovi = (dr, dc) => {
    if (!pezzo || attesa || finito || pausa) return false;
    const cs = celleDi(pezzo, pezzo.r + dr, pezzo.c + dc);
    if (libero(cs)) { pezzo.r += dr; pezzo.c += dc; disegna(); return true; }
    if (dr > 0) atterra();
    return false;
  };
  const gira = () => {
    if (!pezzo || attesa || finito || pausa || pezzo.testo.length < 2) return;
    const v = !pezzo.verticale;
    // prova a girarlo, spostandolo un po' se tocca il bordo
    for (const dc of [0, -1, 1, -2, 2, -3]) {
      if (libero(celleDi(pezzo, pezzo.r, pezzo.c + dc, v))) { pezzo.c += dc; pezzo.verticale = v; disegna(); return; }
    }
  };
  const giu = () => { if (!pezzo || attesa || finito || pausa) return; while (muovi(1, 0)); };

  const passo = () => { if (!pausa && !attesa && !finito && pezzo) muovi(1, 0); timer = setTimeout(passo, intervallo); };

  // ---- comandi ----
  const azioni = { sx: () => muovi(0, -1), dx: () => muovi(0, 1), gira, giu };
  area.querySelector('#comandi').addEventListener('pointerdown', (e) => {
    const b = e.target.closest('[data-c]');
    if (!b) return;
    e.preventDefault();
    azioni[b.dataset.c]();
  });
  const tasti = (e) => {
    const m = { ArrowLeft: 'sx', ArrowRight: 'dx', ArrowUp: 'gira', ArrowDown: 'giu', ' ': 'giu' }[e.key];
    if (!m || finito) return;
    e.preventDefault();
    azioni[m]();
  };
  window.addEventListener('keydown', tasti);
  // gesti sul tabellone: tocco = gira, trascina = sposta, trascina giù = scende
  let start = null;
  tab.addEventListener('pointerdown', (e) => { start = { x: e.clientX, y: e.clientY, c: 0 }; tab.setPointerCapture(e.pointerId); });
  tab.addEventListener('pointermove', (e) => {
    if (!start) return;
    const passoPx = tab.clientWidth / COLONNE;
    const dc = Math.round((e.clientX - start.x) / passoPx);
    while (start.c < dc && muovi(0, 1)) start.c++;
    while (start.c > dc && muovi(0, -1)) start.c--;
  });
  tab.addEventListener('pointerup', (e) => {
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) gira();
    else if (dy > 60 && Math.abs(dy) > Math.abs(dx)) giu();
    start = null;
  });
  const visibile = () => { pausa = document.hidden; };
  document.addEventListener('visibilitychange', visibile);

  // ---- fine ----
  async function vinto() {
    finito = true;
    clearTimeout(timer);
    const msg = `Fantastico! Hai costruito ${OBIETTIVO} parole!${bonus ? ` E ne hai trovate ${bonus} in più!` : ''}`;
    aggiornaFumetto(area, msg, { leggi: false, allegro: true });
    parla(msg);
    await attendi(900);
    fine({ punteggio: 10, parole: fatte, bonus, vinto: true });
  }
  async function perso() {
    finito = true;
    clearTimeout(timer);
    pezzo = null;
    disegna();
    tab.classList.add('pieno');
    const msg = fatte
      ? `La torre è arrivata in cima! Hai costruito ${fatte} ${fatte === 1 ? 'parola' : 'parole'}. Brava!`
      : 'La torre è arrivata in cima! Prova a mettere i pezzi uno accanto all’altro per scrivere la parola.';
    aggiornaFumetto(area, msg, { leggi: false, allegro: fatte > 0 });
    parla(msg);
    await attendi(900);
    fine({ punteggio: Math.min(10, Math.max(1, fatte * 2 + bonus)), parole: fatte, bonus, vinto: false });
  }

  area.statoCascata = () => ({ pezzo: pezzo && { ...pezzo }, bersaglio, fatte, finito, attesa }); // per i test
  mostraBersaglio();
  genera();
  timer = setTimeout(passo, intervallo + 1500);
  tab.focus({ preventScroll: true });

  return () => {
    finito = true;
    clearTimeout(timer);
    window.removeEventListener('keydown', tasti);
    document.removeEventListener('visibilitychange', visibile);
  };
}
