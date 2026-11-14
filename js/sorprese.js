// Sorprese animate: ogni tanto passa qualcuno sullo schermo (uccellino, farfalla, Punto a passeggio…).
// E le mascotte "vive": Virgola si muove quando parla, Punto reagisce alle risposte.
import { schermataCorrente } from './nav.js';
import { loc, S, nomeBambina } from './state.js';
import { musica } from './musica.js';
import { reazione } from './ui.js';

const SCHERMATE = new Set(['home', 'gioco', 'risultato', 'finePartita', 'personaggio', 'mieiGiorni']);
let strato = null;
let timer = null;
let ascolta = false;
let ultima = '';

export function sorpreseAttive() {
  const i = (S.config && S.config.impostazioni) || {};
  if (i.sorprese === false || loc.get('sorprese') === false) return false;
  return !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
}

const caso = (a, b) => a + Math.random() * (b - a);
const W = () => window.innerWidth;
const H = () => window.innerHeight;

// ---------- piccoli suoni (solo se la musica non è spenta) ----------
function suono(tipo) {
  const ctx = musica.ctx;
  if (!ctx || ctx.state !== 'running' || musica.muto) return;
  const t = ctx.currentTime;
  const g = ctx.createGain();
  g.connect(ctx.destination);
  const nota = (f1, f2, inizio, dur, forma = 'sine', vol = 0.12) => {
    const o = ctx.createOscillator();
    const gg = ctx.createGain();
    o.type = forma;
    o.frequency.setValueAtTime(f1, t + inizio);
    o.frequency.exponentialRampToValueAtTime(f2, t + inizio + dur);
    gg.gain.setValueAtTime(0.0001, t + inizio);
    gg.gain.exponentialRampToValueAtTime(vol, t + inizio + 0.015);
    gg.gain.exponentialRampToValueAtTime(0.0001, t + inizio + dur);
    o.connect(gg).connect(g);
    o.start(t + inizio); o.stop(t + inizio + dur + 0.05);
  };
  if (tipo === 'cip') { nota(2600, 3800, 0, 0.09); nota(2800, 4200, 0.14, 0.08); }
  else if (tipo === 'pop') { nota(900, 120, 0, 0.12, 'triangle', 0.2); }
  else if (tipo === 'boing') { nota(220, 660, 0, 0.25, 'sine', 0.15); }
  else if (tipo === 'magia') { [0, 0.07, 0.14, 0.21].forEach((d, i) => nota(1200 + i * 300, 1500 + i * 300, d, 0.12, 'sine', 0.07)); }
}

// ---------- disegni ----------
const SVG = {
  uccellino: `<svg viewBox="0 0 80 60" width="74"><g stroke="#1F2A44" stroke-width="2.5" stroke-linejoin="round">
    <path class="ala-su" d="M34 28 C30 10 44 4 50 8 C46 16 44 24 40 30z" fill="#F7A63A"/>
    <ellipse cx="38" cy="34" rx="22" ry="16" fill="#48ABFC"/><ellipse cx="34" cy="40" rx="12" ry="8" fill="#DCEFFF" stroke="none"/>
    <path d="M58 30l12 4-12 5z" fill="#FBB804"/><circle cx="50" cy="28" r="3" fill="#1F2A44" stroke="none"/>
    <path d="M17 30 L4 24 L8 34 L4 42 L17 38" fill="#48ABFC"/>
    <path class="ala" d="M36 30 C24 22 18 34 26 42 C32 40 36 36 40 34z" fill="#F7A63A"/></g></svg>`,
  farfalla: `<svg viewBox="0 0 80 70" width="66"><g stroke="#1F2A44" stroke-width="2.5" stroke-linejoin="round">
    <g class="ali-sx"><path d="M38 34 C20 4 2 12 8 30 C12 40 26 40 38 36z" fill="#E84A7F"/><path d="M38 38 C22 44 12 58 22 62 C30 64 36 52 38 40z" fill="#8A5CD8"/></g>
    <g class="ali-dx"><path d="M42 34 C60 4 78 12 72 30 C68 40 54 40 42 36z" fill="#E84A7F"/><path d="M42 38 C58 44 68 58 58 62 C50 64 44 52 42 40z" fill="#8A5CD8"/></g>
    <ellipse cx="40" cy="38" rx="4" ry="14" fill="#1F2A44"/><path d="M38 25 C34 14 30 12 28 10M42 25 C46 14 50 12 52 10" fill="none"/>
    <circle cx="20" cy="24" r="4" fill="#FBB804" stroke="none"/><circle cx="60" cy="24" r="4" fill="#FBB804" stroke="none"/></g></svg>`,
  coccinella: `<svg viewBox="0 0 70 50" width="58"><g stroke="#1F2A44" stroke-width="2.5">
    <g class="zampe" fill="none"><path d="M22 36l-6 8M34 38v9M46 36l6 8"/></g>
    <circle cx="58" cy="26" r="9" fill="#1F2A44"/><circle cx="61" cy="23" r="2" fill="#fff" stroke="none"/>
    <path d="M10 30 A24 20 0 0 1 56 30 Z" fill="#E8333A"/><path d="M33 10v20" />
    <circle cx="22" cy="22" r="3.5" fill="#1F2A44" stroke="none"/><circle cx="44" cy="20" r="3.5" fill="#1F2A44" stroke="none"/><circle cx="30" cy="27" r="3" fill="#1F2A44" stroke="none"/><circle cx="46" cy="28" r="3" fill="#1F2A44" stroke="none"/></g></svg>`,
  palloncino: (c) => `<svg viewBox="0 0 60 120" width="62"><path d="M30 70 C26 84 36 94 28 118" fill="none" stroke="#1F2A44" stroke-width="2"/>
    <path d="M30 4 C48 4 56 20 54 36 C52 54 40 66 30 68 C20 66 8 54 6 36 C4 20 12 4 30 4z" fill="${c}" stroke="#1F2A44" stroke-width="2.5"/>
    <path d="M26 66l4 6 4-6z" fill="${c}" stroke="#1F2A44" stroke-width="2"/><path d="M18 18 C14 24 14 30 15 34" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".7"/></svg>`,
  aereo: (testo) => `<div class="aereo"><svg viewBox="0 0 90 50" width="86"><g stroke="#1F2A44" stroke-width="2.5" stroke-linejoin="round">
    <path d="M10 28 C10 18 60 16 76 22 C86 26 86 32 76 34 C60 38 10 38 10 28z" fill="#E65E03"/><path d="M36 26l-8-20h10l16 20z" fill="#FBB804"/><path d="M38 34l-6 14h9l12-14z" fill="#FBB804"/>
    <path d="M10 28l-6-14h8l8 12z" fill="#FBB804"/><circle cx="66" cy="27" r="4" fill="#DCEFFF"/><circle cx="54" cy="27" r="4" fill="#DCEFFF"/>
    <path class="elica" d="M84 16v24" stroke-width="3"/></g></svg><span class="striscione">${testo}</span></div>`,
  stella: `<svg viewBox="0 0 140 40" width="140"><defs><linearGradient id="scia" x1="0" x2="1"><stop offset="0" stop-color="#FFF1BF" stop-opacity="0"/><stop offset="1" stop-color="#FBB804"/></linearGradient></defs>
    <path d="M0 22 L100 16 L100 26z" fill="url(#scia)"/><path d="M115 6l4 9 10 1-8 6 3 10-9-6-9 6 3-10-8-6 10-1z" fill="#FBB804" stroke="#1F2A44" stroke-width="2"/></svg>`
};

function nuovo(html, classe) {
  const d = document.createElement('div');
  d.className = 'sorpresa ' + (classe || '');
  d.innerHTML = html;
  strato.appendChild(d);
  return d;
}

function scintille(x, y) {
  for (let i = 0; i < 10; i++) {
    const s = document.createElement('span');
    s.className = 'scintilla';
    s.textContent = ['✦', '★', '•', '♥'][i % 4];
    s.style.left = x + 'px'; s.style.top = y + 'px';
    s.style.color = ['#FBB804', '#E84A7F', '#48ABFC', '#8A5CD8', '#5C9A2E'][i % 5];
    strato.appendChild(s);
    const a = (Math.PI * 2 * i) / 10;
    s.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * 70}px), calc(-50% + ${Math.sin(a) * 70}px)) scale(.4)`, opacity: 0 }], { duration: 700, easing: 'ease-out' }).onfinish = () => s.remove();
  }
}

// Un'animazione di attraversamento: punti del percorso → keyframes.
function vola(el, punti, durata, { easing = 'linear', specchio = false } = {}) {
  const k = punti.map(([x, y, r = 0]) => ({ transform: `translate(${x}px, ${y}px) rotate(${r}deg)${specchio ? ' scaleX(-1)' : ''}` }));
  const a = el.animate(k, { duration: durata, easing, fill: 'forwards' });
  a.onfinish = () => el.remove();
  return a;
}

const CREATURE = {
  uccellino() {
    const el = nuovo(SVG.uccellino, 'uccellino');
    const daSx = Math.random() < 0.5;
    const y0 = caso(0.06, 0.28) * H();
    const pts = Array.from({ length: 9 }, (_, i) => {
      const x = daSx ? -90 + (i / 8) * (W() + 180) : W() + 90 - (i / 8) * (W() + 180);
      return [x, y0 + Math.sin(i * 1.3) * 30];
    });
    const a = vola(el, pts, caso(7000, 10000), { specchio: !daSx });
    el.onclick = (e) => {
      suono('cip'); scintille(e.clientX, e.clientY);
      a.pause();
      const r = el.getBoundingClientRect();
      vola(el, [[r.left, r.top], [r.left + (daSx ? 180 : -180), -120]], 900, { easing: 'ease-in', specchio: !daSx });
      a.cancel();
    };
  },
  farfalla() {
    const el = nuovo(SVG.farfalla, 'farfalla');
    const daSx = Math.random() < 0.5;
    const pts = Array.from({ length: 13 }, (_, i) => {
      const x = daSx ? -80 + (i / 12) * (W() + 160) : W() + 80 - (i / 12) * (W() + 160);
      return [x, caso(0.15, 0.75) * H(), caso(-15, 15)];
    });
    const a = vola(el, pts, caso(11000, 15000), { easing: 'ease-in-out' });
    el.onclick = (e) => { suono('magia'); scintille(e.clientX, e.clientY); a.playbackRate = 2.5; };
  },
  punto() {
    const el = nuovo('<img class="fermo" src="img/punto.png" alt="">', 'passeggia');
    const daSx = Math.random() < 0.5;
    const y = H() - 120;
    const pts = [[daSx ? -110 : W() + 10, y], [daSx ? W() + 10 : -110, y]];
    const a = vola(el, pts, caso(13000, 17000), { specchio: !daSx });
    el.onclick = () => {
      suono('boing');
      el.firstChild.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-70px) rotate(360deg)' }, { transform: 'translateY(0) rotate(360deg)' }], { duration: 700, easing: 'ease-out' });
    };
  },
  virgola() {
    const el = nuovo('<img class="fermo" src="img/virgola.png" alt=""><span class="nuvola-ciao">Ciao!</span>', 'cucu');
    const y = caso(0.3, 0.6) * H();
    const x = W();
    el.animate([
      { transform: `translate(${x}px, ${y}px) rotate(0deg)` },
      { transform: `translate(${x - 95}px, ${y}px) rotate(-12deg)`, offset: 0.15 },
      { transform: `translate(${x - 95}px, ${y}px) rotate(-4deg)`, offset: 0.3 },
      { transform: `translate(${x - 95}px, ${y}px) rotate(-14deg)`, offset: 0.45 },
      { transform: `translate(${x - 95}px, ${y}px) rotate(-4deg)`, offset: 0.6 },
      { transform: `translate(${x - 95}px, ${y}px) rotate(-12deg)`, offset: 0.8 },
      { transform: `translate(${x}px, ${y}px) rotate(0deg)` }
    ], { duration: 4200, easing: 'ease-in-out', fill: 'forwards' }).onfinish = () => el.remove();
    el.onclick = (e) => { suono('magia'); scintille(e.clientX, e.clientY); };
  },
  coccinella() {
    const el = nuovo(SVG.coccinella, 'coccinella');
    const daSx = Math.random() < 0.5;
    const y = H() - 52;
    vola(el, [[daSx ? -70 : W() + 10, y], [daSx ? W() + 10 : -70, y]], caso(22000, 28000), { specchio: !daSx });
    el.onclick = (e) => { suono('pop'); scintille(e.clientX, e.clientY); };
  },
  palloncino() {
    const colori = ['#E84A7F', '#48ABFC', '#FBB804', '#8A5CD8', '#5C9A2E', '#E65E03'];
    const el = nuovo(SVG.palloncino(colori[Math.floor(Math.random() * colori.length)]), 'palloncino');
    const x0 = caso(0.1, 0.85) * W();
    const pts = Array.from({ length: 7 }, (_, i) => [x0 + Math.sin(i) * 40, H() + 20 - (i / 6) * (H() + 180), Math.sin(i) * 8]);
    const a = vola(el, pts, caso(9000, 12000), { easing: 'ease-in-out' });
    el.onclick = (e) => { suono('pop'); scintille(e.clientX, e.clientY); a.cancel(); el.remove(); };
  },
  aereo() {
    const nome = nomeBambina();
    const frasi = nome ? [`Forza ${nome}!`, `Brava ${nome}!`, `Ciao ${nome}!`] : ['Forza!', 'Che brava!', 'Ciao!'];
    const el = nuovo(SVG.aereo(frasi[Math.floor(Math.random() * frasi.length)]), 'aeroplano');
    const y = caso(0.05, 0.18) * H();
    vola(el, [[W() + 20, y], [W() * 0.5, y + 14], [-420, y]], caso(10000, 13000));
    el.onclick = () => suono('boing');
  },
  stella() {
    const el = nuovo(SVG.stella, 'stella');
    const x0 = caso(0.1, 0.5) * W();
    vola(el, [[x0, -40, 18], [x0 + W() * 0.5, H() * 0.45, 18]], 1800, { easing: 'ease-in' });
    el.onclick = (e) => { suono('magia'); scintille(e.clientX, e.clientY); };
  }
};
const PESI = [['uccellino', 3], ['farfalla', 3], ['punto', 2], ['virgola', 2], ['coccinella', 2], ['palloncino', 2], ['aereo', 1], ['stella', 1]];

function scegli() {
  const tot = PESI.reduce((t, [, p]) => t + p, 0);
  for (let i = 0; i < 5; i++) {
    let r = Math.random() * tot;
    const [nome] = PESI.find(([, p]) => (r -= p) < 0);
    if (nome !== ultima) { ultima = nome; return nome; }
  }
  return 'farfalla';
}

export function sorpresa(nome) {
  if (!strato) return;
  try { CREATURE[nome || scegli()](); } catch (e) { console.warn('sorpresa', e); }
}

function programma(primo = false) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const ok = sorpreseAttive() && SCHERMATE.has(schermataCorrente()) && !ascolta && !document.hidden && !document.querySelector('.velo, .splash');
    if (ok && strato.childElementCount < 2) sorpresa();
    programma();
  }, primo ? caso(12000, 25000) : caso(30000, 70000));
}

export function installaSorprese() {
  strato = document.createElement('div');
  strato.id = 'sorprese';
  strato.setAttribute('aria-hidden', 'true');
  document.body.appendChild(strato);
  window.addEventListener('pv-microfono', (e) => { ascolta = !!e.detail; });
  // Virgola "parla" mentre la voce legge
  window.addEventListener('pv-parla', (e) => document.body.classList.toggle('parla', !!e.detail));
  // quando qualcosa "scuote" (risposta sbagliata) Punto scuote la testa
  document.addEventListener('animationstart', (e) => { if (e.animationName === 'no') reazione('oops', 900); });
  programma(true);
  window.pvSorpresa = sorpresa; // per provare dalla console
}
