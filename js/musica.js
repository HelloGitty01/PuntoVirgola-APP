// Musica di sottofondo generata dal browser (Web Audio), senza file da scaricare.
// "home": allegra e saltellante. "attivita": calma e morbida, per aiutare la concentrazione.
// Si abbassa quando Virgola parla e si ferma del tutto quando il microfono ascolta.
import { loc } from './state.js';

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const freq = (n) => {
  const m = /^([A-G]#?)(\d)$/.exec(n);
  return 440 * Math.pow(2, (NOTE[m[1]] + (Number(m[2]) + 1) * 12 - 69) / 12);
};

const BRANI = {
  home: {
    bpm: 104,
    accordi: [['C3', 'E3', 'G3'], ['A2', 'C3', 'E3'], ['F2', 'A2', 'C3'], ['G2', 'B2', 'D3']],
    bassi: ['C2', 'A1', 'F1', 'G1'],
    // melodia di 4 battute (8 crome per battuta); null = pausa
    melodia: [
      'E5', null, 'G5', 'E5', 'D5', null, 'C5', null,
      'C5', null, 'E5', 'C5', 'A4', null, null, null,
      'F5', null, 'A5', 'F5', 'E5', null, 'C5', null,
      'D5', null, 'G5', 'F5', 'E5', 'D5', 'C5', null
    ],
    variante: ['G5', 'E5', 'C5', 'D5', 'E5', 'A4', 'G4', 'C5'],
    volume: 0.55
  },
  attivita: {
    bpm: 66,
    accordi: [['C3', 'G3', 'B3', 'E4'], ['A2', 'E3', 'G3', 'C4'], ['F2', 'C3', 'E3', 'A3'], ['G2', 'D3', 'F3', 'B3']],
    bassi: ['C2', 'A1', 'F1', 'G1'],
    arpeggio: [['E4', 'G4', 'B4', 'D5'], ['C4', 'E4', 'A4', 'B4'], ['A4', 'C5', 'E5', 'G4'], ['B4', 'D5', 'G4', 'F4']],
    volume: 0.4
  }
};

class Musica {
  constructor() {
    this.ctx = null;
    this.brano = null;
    this.richiesto = null;
    this.muto = loc.get('musicaMuta', false);
    this.volume = loc.get('musicaVolume', 0.5);
    this.parla = false;
    this.ascolta = false;
    this.passo = 0;
    this.prossimo = 0;
    this.timer = null;
  }

  // Il browser permette l'audio solo dopo un tocco: si avvia al primo gesto.
  sblocca() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    this.ctx = new C();
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.filtro = this.ctx.createBiquadFilter();
    this.filtro.type = 'lowpass';
    this.filtro.frequency.value = 5200;
    this.master.connect(this.filtro);
    // limitatore: sugli altoparlanti piccoli dei telefoni evita che i bassi "gracchino"
    this.limite = this.ctx.createDynamicsCompressor();
    this.limite.threshold.value = -14; this.limite.knee.value = 6; this.limite.ratio.value = 12;
    this.limite.attack.value = 0.003; this.limite.release.value = 0.2;
    this.filtro.connect(this.limite);
    this.limite.connect(this.ctx.destination);
    this.avvia(this.richiesto);
  }

  // Ogni brano suona su un suo canale con la sua eco: quando si cambia brano il vecchio canale
  // sfuma in fretta e viene staccato, così le note già programmate non si sovrappongono al nuovo.
  creaCanale() {
    const bus = this.ctx.createGain();
    bus.gain.value = 1;
    bus.connect(this.master);
    const d = this.ctx.createDelay();
    d.delayTime.value = 0.28;
    const g = this.ctx.createGain();
    g.gain.value = 0.22;
    d.connect(g); g.connect(d); g.connect(bus);
    return { bus, eco: d, ritorno: g };
  }

  chiudiCanale(c) {
    if (!c) return;
    const t = this.ctx.currentTime;
    c.bus.gain.cancelScheduledValues(t);
    c.bus.gain.setValueAtTime(c.bus.gain.value, t);
    c.bus.gain.linearRampToValueAtTime(0, t + 0.25);
    setTimeout(() => { try { c.ritorno.disconnect(); c.eco.disconnect(); c.bus.disconnect(); } catch {} }, 400);
  }

  imposta(nome) {
    this.richiesto = nome;
    if (this.ctx) this.avvia(nome);
  }

  avvia(nome) {
    if (this.brano === nome) { this.aggiornaVolume(); return; }
    this.brano = nome;
    clearInterval(this.timer);
    this.timer = null;
    if (this.ctx) { this.chiudiCanale(this.canale); this.canale = null; }
    if (!nome || !this.ctx) { this.aggiornaVolume(); return; }
    this.canale = this.creaCanale();
    this.passo = 0;
    this.prossimo = this.ctx.currentTime + 0.15;
    this.timer = setInterval(() => this.programma(), 80);
    this.aggiornaVolume();
  }

  livello() {
    if (!this.brano || this.muto || this.ascolta) return 0;
    const base = BRANI[this.brano].volume * this.volume * 0.5;
    return this.parla ? base * 0.3 : base;
  }

  aggiornaVolume() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(this.livello(), t, this.ascolta ? 0.05 : 0.4);
  }

  setMuto(v) { this.muto = v; loc.set('musicaMuta', v); this.aggiornaVolume(); aggiornaPulsante(); }
  setVolume(v) { this.volume = v; loc.set('musicaVolume', v); this.aggiornaVolume(); }
  setParla(v) { this.parla = v; this.aggiornaVolume(); }
  setAscolta(v) { this.ascolta = v; this.aggiornaVolume(); }

  // ---------- strumenti ----------
  marimba(f, t, dur, vol = 0.3) {
    const c = this.ctx;
    const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = f;
    o2.type = 'sine'; o2.frequency.value = f * 4;
    const g2 = c.createGain(); g2.gain.value = 0.12;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); o2.connect(g2); g2.connect(g);
    g.connect(this.canale.bus); g.connect(this.canale.eco);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }

  carillon(f, t, dur, vol = 0.18) {
    const c = this.ctx;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.canale.bus); g.connect(this.canale.eco);
    o.start(t); o.stop(t + dur + 0.05);
  }

  tappeto(note, t, dur, vol = 0.05) {
    const c = this.ctx;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 900;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    lp.connect(g); g.connect(this.canale.bus);
    note.forEach((n) => {
      [-4, 4].forEach((det) => {
        const o = c.createOscillator();
        o.type = 'triangle'; o.frequency.value = freq(n); o.detune.value = det;
        o.connect(lp); o.start(t); o.stop(t + dur + 0.1);
      });
    });
  }

  basso(f, t, dur, vol = 0.22) {
    const c = this.ctx;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.canale.bus);
    o.start(t); o.stop(t + dur + 0.05);
  }

  // ---------- sequencer ----------
  programma() {
    if (!this.brano || !this.ctx || !this.canale) return;
    const b = BRANI[this.brano];
    const croma = 60 / b.bpm / 2;
    while (this.prossimo < this.ctx.currentTime + 0.4) {
      const t = this.prossimo;
      const p = this.passo;
      const battuta = Math.floor(p / 8) % 4;
      const nelGiro = Math.floor(p / 32);
      const pos = p % 8;
      if (this.brano === 'home') {
        if (pos === 0) { this.tappeto(b.accordi[battuta], t, croma * 8, 0.035); this.basso(freq(b.bassi[battuta]), t, croma * 3); }
        if (pos === 4) this.basso(freq(b.bassi[battuta]) * 1.5, t, croma * 2, 0.15);
        // la melodia suona un giro sì e uno no, nell'altro una variazione più leggera
        const idx = (battuta * 8 + pos);
        let n = b.melodia[idx];
        if (nelGiro % 2 === 1) n = pos % 2 === 0 ? (Math.random() < 0.6 ? b.variante[(idx / 2 + nelGiro) % b.variante.length | 0] : null) : null;
        if (n) this.marimba(freq(n), t, croma * 2.2, 0.22);
        if (pos % 2 === 1) this.marimba(freq(b.accordi[battuta][2]) * 2, t, croma * 0.8, 0.05);
      } else {
        if (pos === 0) { this.tappeto(b.accordi[battuta], t, croma * 8.5, 0.05); this.basso(freq(b.bassi[battuta]), t, croma * 6, 0.16); }
        // arpeggio da carillon, non sempre uguale
        if (pos % 2 === 0 && Math.random() < 0.75) {
          const arp = b.arpeggio[battuta];
          this.carillon(freq(arp[(pos / 2 + nelGiro) % arp.length]), t, croma * 3.5, 0.11);
        }
      }
      this.prossimo += croma;
      this.passo++;
    }
  }
}

export const musica = new Musica();

// ---------- pulsante per silenziare, sempre visibile ----------
const ICONA_SI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg>';
const ICONA_NO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/><path d="M3 3l18 18"/></svg>';

function aggiornaPulsante() {
  const b = document.getElementById('musica-btn');
  if (!b) return;
  b.innerHTML = musica.muto ? ICONA_NO : ICONA_SI;
  b.setAttribute('aria-pressed', String(!musica.muto));
  b.setAttribute('aria-label', musica.muto ? 'Accendi la musica' : 'Spegni la musica');
  b.classList.toggle('spenta', musica.muto);
  b.classList.toggle('nascosto', !musica.richiesto);
}

export function installaMusica() {
  const b = document.createElement('button');
  b.id = 'musica-btn';
  b.className = 'btn-musica';
  b.onclick = (e) => { e.stopPropagation(); musica.sblocca(); musica.setMuto(!musica.muto); };
  document.body.appendChild(b);
  aggiornaPulsante();
  const primoTocco = () => { musica.sblocca(); window.removeEventListener('pointerdown', primoTocco); window.removeEventListener('keydown', primoTocco); };
  window.addEventListener('pointerdown', primoTocco);
  window.addEventListener('keydown', primoTocco);
  window.addEventListener('pv-parla', (e) => musica.setParla(!!e.detail));
  window.addEventListener('pv-microfono', (e) => musica.setAscolta(!!e.detail));
  document.addEventListener('visibilitychange', () => {
    if (!musica.ctx) return;
    if (document.hidden) musica.ctx.suspend(); else musica.ctx.resume();
  });
}

// Quale musica per quale schermata (null = silenzio, ad esempio nell'area genitori).
const PER_SCHERMATA = {
  home: 'home', personaggio: 'home', primoAvvio: 'home', finePartita: 'home', benvenuto: 'home', mieiGiorni: 'home',
  gioco: 'attivita', risultato: 'attivita'
};
export function musicaPerSchermata(nome) {
  musica.imposta(PER_SCHERMATA[nome] || null);
  aggiornaPulsante();
}
