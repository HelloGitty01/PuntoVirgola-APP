// Componenti grafici condivisi.
import { idsImmagine, urlPittogramma } from './arasaac.js';
import { urlImmagine } from './data.js';
import { parla } from './tts.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const svg = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
export const ICONE = {
  indietro: svg('<path d="M15 5l-7 7 7 7"/>'),
  altoparlante: svg('<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.5 6.5a7.5 7.5 0 0 1 0 11"/>'),
  mic: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>', 'stroke="#fff"'),
  stop: svg('<rect x="7" y="7" width="10" height="10" rx="2" fill="#fff"/>', 'stroke="#fff"'),
  lucchetto: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  play: svg('<path d="M7 5l12 7-12 7z" fill="currentColor"/>'),
  scarica: svg('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
  aiuto: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17.5v.01"/>'),
  matita: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
  cestino: svg('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  piu: svg('<path d="M12 5v14M5 12h14"/>'),
  ricarica: svg('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'),
  componi: svg('<rect x="3" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/>'),
  dillo: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>'),
  racconta: svg('<rect x="3" y="4" width="8" height="7" rx="1.5"/><rect x="13" y="4" width="8" height="7" rx="1.5"/><rect x="3" y="13" width="8" height="7" rx="1.5"/><rect x="13" y="13" width="8" height="7" rx="1.5"/>'),
  descrivi: svg('<path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/>'),
  scombinata: svg('<path d="M4 7h3l10 10h3M4 17h3l3-3M14 10l3-3h3"/><path d="M18 5l2 2-2 2M18 15l2 2-2 2"/>'),
  unisci: svg('<path d="M9 15l6-6"/><path d="M11 6l1-1a4 4 0 0 1 6 6l-1 1M13 18l-1 1a4 4 0 0 1-6-6l1-1"/>'),
  finisci: svg('<path d="M4 6h16M4 11h10"/><circle cx="15" cy="17" r="1"/><circle cx="19" cy="17" r="1"/><circle cx="11" cy="17" r="1"/>'),
  trasforma: svg('<path d="M4 8h13l-3-3M20 16H7l3 3"/>'),
  dopo: svg('<rect x="3" y="5" width="8" height="10" rx="1.5"/><path d="M14 10h6M17 7l3 3-3 3"/><path d="M15 19h1M18 19h1M21 19h.01"/>'),
  coppie: svg('<path d="M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-6 0"/><path d="M10 9a2 2 0 0 1 4 0"/>'),
  sillabe: svg('<ellipse cx="12" cy="8" rx="8" ry="3"/><path d="M4 8v8c0 1.7 3.6 3 8 3s8-1.3 8-3V8"/><path d="M5 3l5 4M19 3l-5 4"/>'),
  iniziale: svg('<path d="M5 20L10 5h1l5 15M7 14h7"/><path d="M18 9v6M18 7v.01"/>'),
  rime: svg('<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>'),
  ripeti: svg('<path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/>'),
  pronuncia: svg('<path d="M3 12c3-4 6-5 9-3 3-2 6-1 9 3-3 4-6 6-9 6s-6-2-9-6z"/><path d="M3 12h18"/>'),
  tamburo: svg('<ellipse cx="12" cy="8" rx="8" ry="3"/><path d="M4 8v8c0 1.7 3.6 3 8 3s8-1.3 8-3V8"/>')
};

export function caramella(piena = true, ritardo = 0) {
  if (!piena) {
    return `<svg viewBox="0 0 30 20" aria-hidden="true"><path d="M1 3l7 7-7 7z" fill="none" stroke="#D2C7B5" stroke-width="1.2" stroke-linejoin="round"/><path d="M29 3l-7 7 7 7z" fill="none" stroke="#D2C7B5" stroke-width="1.2" stroke-linejoin="round"/><ellipse cx="15" cy="10" rx="8" ry="7" fill="none" stroke="#D2C7B5" stroke-width="1.4" stroke-dasharray="2 2"/></svg>`;
  }
  return `<svg class="piena" style="animation-delay:${ritardo}ms" viewBox="0 0 30 20" aria-hidden="true"><path d="M1 3l7 7-7 7z" fill="#FBB804" stroke="#1F2A44" stroke-width=".8" stroke-linejoin="round"/><path d="M29 3l-7 7 7 7z" fill="#FBB804" stroke="#1F2A44" stroke-width=".8" stroke-linejoin="round"/><ellipse cx="15" cy="10" rx="8" ry="7" fill="#E84A7F" stroke="#1F2A44" stroke-width=".9"/><path d="M11 5l3 10M16 4l3 11" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>`;
}

export function contatoreCaramelle(n) {
  return `<span class="contatore" aria-label="${n} caramelle"><span style="width:38px;display:inline-flex">${caramella(true)}</span>${n}</span>`;
}

// Virgola (l'insegnante) che parla, con tasto per riascoltare.
export function virgolaDice(testo, { allegro = false, id = 'fumetto' } = {}) {
  return `<div class="virgola-dice">
    <img src="img/virgola.png" alt="Virgola">
    <div class="fumetto ${allegro ? 'allegro' : ''}" id="${id}"><span class="testo-fumetto">${esc(testo)}</span>
      <button class="ripeti" data-azione="ripeti-fumetto" aria-label="Ascolta Virgola">${ICONE.altoparlante}</button>
    </div>
  </div>`;
}

export function aggiornaFumetto(root, testo, { leggi = true, allegro = false, id = 'fumetto' } = {}) {
  const f = root.querySelector('#' + id);
  if (!f) return;
  f.querySelector('.testo-fumetto').textContent = testo;
  f.classList.toggle('allegro', allegro);
  if (leggi) parla(testo);
}

export function collegaFumetti(root) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-azione="ripeti-fumetto"]');
    if (b) parla(b.closest('.fumetto').querySelector('.testo-fumetto').textContent);
  });
}

// Riquadro immagine: i pittogrammi o la foto vengono inseriti in modo asincrono.
export function riquadroImmagine(img, classe = 'scena-img') {
  const dati = esc(JSON.stringify(img || null));
  return `<div class="${classe}" data-immagine="${dati}" role="img" aria-label="Figura della scena"><span class="vuota">…</span></div>`;
}

export async function riempiImmagini(root) {
  const nodi = root.querySelectorAll('[data-immagine]');
  await Promise.all([...nodi].map(async (n) => {
    let img;
    try { img = JSON.parse(n.dataset.immagine); } catch { img = null; }
    n.removeAttribute('data-immagine');
    if (!img) { n.innerHTML = '<span class="vuota">Nessuna immagine</span>'; return; }
    if (img.tipo === 'foto') {
      const u = await urlImmagine(img.path);
      n.innerHTML = u ? `<img class="foto" src="${u}" alt="">` : '<span class="vuota">Immagine non disponibile</span>';
      return;
    }
    const ids = await idsImmagine(img);
    if (!ids.length) { n.innerHTML = '<span class="vuota">Immagine non disponibile senza connessione</span>'; return; }
    n.innerHTML = ids.map((id) => `<img src="${urlPittogramma(id)}" alt="" loading="lazy">`).join('');
  }));
}

let tToast = null;
export function toast(msg, ms = 2800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('su');
  clearTimeout(tToast);
  tToast = setTimeout(() => t.classList.remove('su'), ms);
}

// Finestra di dialogo. pulsanti: [{ testo, valore, classe }]
export function finestra({ titolo, html = '', pulsanti = [{ testo: 'OK', valore: true }], prima } = {}) {
  return new Promise((ok) => {
    const velo = document.createElement('div');
    velo.className = 'velo';
    velo.innerHTML = `<div class="finestra" role="dialog" aria-modal="true" aria-label="${esc(titolo)}">
      ${titolo ? `<h2>${esc(titolo)}</h2>` : ''}<div class="corpo">${html}</div>
      <div class="azioni">${pulsanti.map((p, i) => `<button class="btn piccolo ${p.classe || ''}" data-i="${i}">${esc(p.testo)}</button>`).join('')}</div></div>`;
    document.body.appendChild(velo);
    const chiudi = (v) => { velo.remove(); ok(v); };
    velo.addEventListener('click', (e) => {
      const b = e.target.closest('[data-i]');
      if (b) {
        const p = pulsanti[+b.dataset.i];
        if (p.prima && p.prima(velo) === false) return;
        chiudi(typeof p.valore === 'function' ? p.valore(velo) : p.valore);
      }
    });
    if (prima) prima(velo, chiudi);
    const f = velo.querySelector('input, button');
    if (f) f.focus();
  });
}

// Accesso all'area genitori: PIN se impostato, altrimenti una moltiplicazione.
export async function cancelloGenitori(pinHash, verificaPin) {
  if (pinHash) {
    let pin = '';
    return finestra({
      titolo: 'Area genitori',
      html: `<p>Inserisci il PIN</p><p style="font-size:34px;letter-spacing:12px;text-align:center;min-height:44px" id="pin-vis"></p>
        <div class="tastierino">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((k) => k === '' ? '<span></span>' : `<button data-k="${k}">${k}</button>`).join('')}</div>`,
      pulsanti: [{ testo: 'Annulla', valore: false, classe: 'secondario' }],
      prima: (velo, chiudi) => {
        velo.querySelector('.tastierino').addEventListener('click', async (e) => {
          const k = e.target.dataset.k;
          if (k === undefined) return;
          pin = k === '⌫' ? pin.slice(0, -1) : (pin + k).slice(0, 6);
          velo.querySelector('#pin-vis').textContent = '•'.repeat(pin.length);
          if (pin.length >= 4 && await verificaPin(pin)) chiudi(true);
        });
      }
    });
  }
  const a = 3 + Math.floor(Math.random() * 7);
  const b = 3 + Math.floor(Math.random() * 7);
  return finestra({
    titolo: 'Area genitori',
    html: `<div class="campo"><label for="cg">Quanto fa ${a} × ${b}?</label><input id="cg" type="number" inputmode="numeric"></div>`,
    pulsanti: [
      { testo: 'Annulla', valore: false, classe: 'secondario' },
      { testo: 'Entra', valore: (v) => Number(v.querySelector('#cg').value) === a * b }
    ]
  });
}

// Trascinamento con dito o mouse, più "tocca e poi tocca la destinazione".
export function trascinabile(root, { elementi, destinazioni, suRilascio, suTocco }) {
  let attivo = null;
  root.addEventListener('pointerdown', (e) => {
    const el = e.target.closest(elementi);
    if (!el || !root.contains(el) || el.classList.contains('usato')) return;
    e.preventDefault();
    const r = el.getBoundingClientRect();
    attivo = { el, x0: e.clientX, y0: e.clientY, mosso: false, fantasma: null, dest: null, w: r.width };
    el.setPointerCapture(e.pointerId);
  });
  root.addEventListener('pointermove', (e) => {
    if (!attivo) return;
    const dx = e.clientX - attivo.x0, dy = e.clientY - attivo.y0;
    if (!attivo.mosso && Math.hypot(dx, dy) < 10) return;
    if (!attivo.mosso) {
      attivo.mosso = true;
      const f = attivo.el.cloneNode(true);
      f.classList.add('trascinato');
      f.style.width = attivo.w + 'px';
      document.body.appendChild(f);
      attivo.fantasma = f;
      attivo.el.style.opacity = '.3';
    }
    attivo.fantasma.style.left = e.clientX + 'px';
    attivo.fantasma.style.top = e.clientY + 'px';
    const sotto = document.elementFromPoint(e.clientX, e.clientY);
    const dest = sotto && sotto.closest(destinazioni);
    if (attivo.dest && attivo.dest !== dest) attivo.dest.classList.remove('sopra');
    if (dest) dest.classList.add('sopra');
    attivo.dest = dest;
  });
  const fine = (e) => {
    if (!attivo) return;
    const a = attivo;
    attivo = null;
    if (a.fantasma) a.fantasma.remove();
    a.el.style.opacity = '';
    if (a.dest) a.dest.classList.remove('sopra');
    if (!a.mosso) { suTocco && suTocco(a.el); return; }
    if (a.dest) suRilascio(a.el, a.dest);
  };
  root.addEventListener('pointerup', fine);
  root.addEventListener('pointercancel', fine);
}

export function mescola(a) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export const attendi = (ms) => new Promise((ok) => setTimeout(ok, ms));
