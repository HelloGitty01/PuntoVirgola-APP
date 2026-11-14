// Riconoscimento vocale: Vosk in locale (predefinito) oppure quello del browser.
import { impostazioni } from './state.js';

export const PERCORSO_MODELLO = 'models/vosk-model-small-it.tar.gz';
const CACHE_MODELLO = 'pv-modello';
let modelloVosk = null;
let promessaModello = null;

function urlModello() { return new URL(PERCORSO_MODELLO, location.href).href; }

function caricaScript(src) {
  return new Promise((ok, ko) => {
    if (document.querySelector(`script[data-src="${src}"]`)) return ok();
    const s = document.createElement('script');
    s.src = src; s.dataset.src = src;
    s.onload = () => ok(); s.onerror = () => ko(new Error('Script non caricato: ' + src));
    document.head.appendChild(s);
  });
}

export function motoreScelto() {
  const m = impostazioni().motoreVoce || 'vosk';
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (m !== 'vosk' && !SR) return 'vosk';
  return m;
}

export async function modelloInCache() {
  try { return !!(await (await caches.open(CACHE_MODELLO)).match(urlModello())); } catch { return false; }
}

async function blobModello(progresso) {
  const c = await caches.open(CACHE_MODELLO);
  const hit = await c.match(urlModello());
  if (hit) return hit.blob();
  const res = await fetch(urlModello());
  if (!res.ok) throw new Error('modello-mancante');
  const totale = Number(res.headers.get('content-length')) || 0;
  const lettore = res.body.getReader();
  const parti = [];
  let ricevuti = 0;
  for (;;) {
    const { done, value } = await lettore.read();
    if (done) break;
    parti.push(value);
    ricevuti += value.length;
    if (progresso && totale) progresso(ricevuti / totale);
  }
  const blob = new Blob(parti, { type: 'application/gzip' });
  await c.put(urlModello(), new Response(blob, { headers: { 'Content-Type': 'application/gzip' } }));
  return blob;
}

function conTempoMassimo(p, ms, msg) {
  return Promise.race([p, new Promise((_, ko) => setTimeout(() => ko(new Error(msg)), ms))]);
}

export function voskPronto() { return !!modelloVosk; }

export function preparaVosk(progresso) {
  if (modelloVosk) return Promise.resolve(modelloVosk);
  if (!promessaModello) {
    promessaModello = (async () => {
      await caricaScript('vendor/vosk.js');
      const blob = await blobModello(progresso);
      const u = URL.createObjectURL(blob);
      try {
        modelloVosk = await conTempoMassimo(window.Vosk.createModel(u), 120000, 'modello-lento');
      } catch (e) {
        console.warn('Modello da blob non caricato, provo dall’indirizzo', e);
        modelloVosk = await conTempoMassimo(window.Vosk.createModel(urlModello()), 120000, 'modello-lento');
      }
      return modelloVosk;
    })().catch((e) => { promessaModello = null; throw e; });
  }
  return promessaModello;
}

// Su telefoni e tablet, finché il microfono è aperto, il sistema mette tutto l'audio in "modalità
// chiamata": la voce di Virgola e la musica diventano metalliche. Lì il microfono si apre solo
// durante l'ascolto e si chiude subito dopo (sul Chromebook invece resta pronto).
const MIC_CALDO = !(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.userAgentData && navigator.userAgentData.mobile));

async function microfono() {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }
    });
  } catch (e) {
    throw new Error('microfono');
  }
}

function registratore(stream) {
  if (!window.MediaRecorder) return null;
  const tipi = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  const tipo = tipi.find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
  const r = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
  const pezzi = [];
  r.ondataavailable = (e) => { if (e.data && e.data.size) pezzi.push(e.data); };
  r.start();
  return {
    ferma: () => new Promise((ok) => {
      if (r.state === 'inactive') return ok(pezzi.length ? new Blob(pezzi, { type: r.mimeType }) : null);
      r.onstop = () => ok(pezzi.length ? new Blob(pezzi, { type: r.mimeType }) : null);
      r.stop();
    })
  };
}

// ---------- Microfono "caldo" ----------
// Aprire il microfono e l'audio richiede quasi un secondo: le prime parole andavano perse.
// Nelle schermate con il microfono lo apriamo in anticipo e lo teniamo pronto; i suoni
// arrivano al riconoscitore solo mentre la bambina sta parlando (dopo il tocco).
let mic = null;
let aprendo = null;

export function apriMicrofono() {
  if (mic) {
    if (mic.ctx.state === 'suspended') mic.ctx.resume().catch(() => {});
    return Promise.resolve(mic);
  }
  if (!aprendo) {
    aprendo = (async () => {
      const stream = await microfono();
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
      const sorgente = ctx.createMediaStreamSource(stream);
      const nodo = ctx.createScriptProcessor(4096, 1, 1);
      const m = { stream, ctx, sorgente, nodo, ascoltatore: null };
      nodo.onaudioprocess = (e) => { if (m.ascoltatore) m.ascoltatore(e.inputBuffer); };
      sorgente.connect(nodo);
      nodo.connect(ctx.destination);
      mic = m;
      return m;
    })().finally(() => { aprendo = null; });
  }
  return aprendo;
}

export function chiudiMicrofono() {
  if (!mic) return;
  const m = mic; mic = null;
  try { m.sorgente.disconnect(); m.nodo.disconnect(); } catch {}
  m.stream.getTracks().forEach((t) => t.stop());
  m.ctx.close().catch(() => {});
}

// Prepara tutto prima del tocco: modello vocale (se già scaricato) e microfono (se il permesso c'è già).
export async function preparaAscolto() {
  if (motoreScelto() !== 'vosk') return;
  try {
    if (!voskPronto() && await modelloInCache()) await preparaVosk();
    const p = navigator.permissions ? await navigator.permissions.query({ name: 'microphone' }) : null;
    if (MIC_CALDO && p && p.state === 'granted') await apriMicrofono();
  } catch { /* si aprirà al primo tocco */ }
}

// Un ascolto: avvia() → la bambina parla → ferma() restituisce { testo, audio }.
export class Ascolto {
  // grammatica: elenco di parole tra cui il riconoscitore deve scegliere (solo Vosk), es. ['treno', 'teno', '[unk]']
  // vocabolario: parole attese nell'esercizio. Con Vosk si fa una seconda lettura "guidata" che sceglie
  // solo tra queste parole: aiuta a riconoscere le parole giuste quando la lettura libera sbaglia.
  constructor({ onTesto, grammatica, vocabolario } = {}) {
    this.onTesto = onTesto || (() => {});
    this.grammatica = grammatica || null;
    this.vocabolario = vocabolario && vocabolario.length ? [...new Set(vocabolario)] : null;
    this.paroleConf = [];
    this.motore = motoreScelto();
    this.attivo = false;
  }

  async avvia() {
    window.dispatchEvent(new CustomEvent('pv-microfono', { detail: true }));
    try {
      if (this.motore === 'vosk') { this.mic = await apriMicrofono(); this.stream = this.mic.stream; }
      else this.stream = await microfono();
    } catch (e) { window.dispatchEvent(new CustomEvent('pv-microfono', { detail: false })); throw e; }
    this.attivo = true;
    if (this.motore === 'vosk') await this.avviaVosk();
    else await this.avviaBrowser(this.motore === 'browser-locale');
    this.reg = registratore(this.stream);
  }

  async avviaVosk() {
    const modello = await preparaVosk();
    this.ctx = this.mic.ctx;
    this.testi = [];
    this.parziale = '';
    this.rec = this.grammatica
      ? new modello.KaldiRecognizer(this.ctx.sampleRate, JSON.stringify(this.grammatica))
      : new modello.KaldiRecognizer(this.ctx.sampleRate);
    try { this.rec.setWords(true); } catch {}
    this.rec.on('result', (m) => {
      if (m.result && Array.isArray(m.result.result)) this.paroleConf.push(...m.result.result);
      // a volte il risultato finale arriva vuoto anche se il parziale conteneva la parola: in quel caso teniamo il parziale
      const t = (m.result && m.result.text) || this.parziale;
      if (t) this.testi.push(t);
      this.parziale = '';
      this.onTesto(this.testi.join(' '));
      if (this.attendiFinale) this.attendiFinale();
    });
    this.rec.on('partialresult', (m) => {
      this.parziale = (m.result && m.result.partial) || '';
      this.onTesto((this.testi.join(' ') + ' ' + this.parziale).trim());
    });
    this.testi2 = [];
    this.rec2 = null;
    if (this.vocabolario && !this.grammatica) {
      try {
        this.rec2 = new modello.KaldiRecognizer(this.ctx.sampleRate, JSON.stringify([...this.vocabolario, '[unk]']));
        this.rec2.on('result', (m) => {
          const t = m.result && m.result.text;
          if (t) this.testi2.push(t);
          if (this.attendiFinale2) this.attendiFinale2();
        });
      } catch (e) { console.warn('Lettura guidata non disponibile', e); this.rec2 = null; }
    }
    this.mic.ascoltatore = (buf) => {
      try { this.rec.acceptWaveform(buf); } catch {}
      if (this.rec2) { try { this.rec2.acceptWaveform(buf); } catch {} }
    };
  }

  async avviaBrowser(locale) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (locale && SR.available) {
      try {
        const opz = { langs: ['it-IT'], processLocally: true };
        const stato = await SR.available(opz);
        if (stato === 'downloadable' || stato === 'downloading') await SR.install(opz);
        else if (stato === 'unavailable') throw new Error('locale-non-disponibile');
      } catch (e) { throw new Error('locale-non-disponibile'); }
    }
    this.finali = [];
    const rec = new SR();
    rec.lang = 'it-IT';
    rec.continuous = true;
    rec.interimResults = true;
    if (locale) rec.processLocally = true;
    rec.onresult = (e) => {
      let provvisorio = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) this.finali.push(r[0].transcript);
        else provvisorio += r[0].transcript;
      }
      this.onTesto((this.finali.join(' ') + ' ' + provvisorio).trim());
    };
    rec.onend = () => {
      if (this.attivo) { try { rec.start(); } catch {} }
      else if (this.attendiFinale) this.attendiFinale();
    };
    rec.onerror = (e) => { console.warn('Riconoscimento:', e.error); if (e.error === 'not-allowed') this.attivo = false; };
    this.sr = rec;
    rec.start();
  }

  async ferma() {
    if (!this.attivo) return { testo: '', audio: null };
    this.attivo = false;
    let testo = '';
    if (this.motore === 'vosk' && this.rec) {
      if (this.mic) this.mic.ascoltatore = null;
      await Promise.all([
        new Promise((ok) => {
          this.attendiFinale = ok;
          try { this.rec.retrieveFinalResult(); } catch { ok(); }
          setTimeout(ok, 1500);
        }),
        this.rec2 ? new Promise((ok) => {
          this.attendiFinale2 = ok;
          try { this.rec2.retrieveFinalResult(); } catch { ok(); }
          setTimeout(ok, 1500);
        }) : null
      ]);
      this.attendiFinale = null;
      this.attendiFinale2 = null;
      testo = this.testi.join(' ');
      if (this.parziale) testo = (testo + ' ' + this.parziale).trim();
      try { this.rec.remove(); } catch {}
      if (this.rec2) { try { this.rec2.remove(); } catch {} }
    } else if (this.sr) {
      await new Promise((ok) => {
        this.attendiFinale = ok;
        try { this.sr.stop(); } catch { ok(); }
        setTimeout(ok, 2000);
      });
      testo = this.finali.join(' ');
    }
    const audio = this.reg ? await this.reg.ferma() : null;
    // con Vosk (su Chromebook/computer) il microfono resta aperto e pronto per il prossimo tocco
    if (this.motore !== 'vosk') this.stream.getTracks().forEach((t) => t.stop());
    else if (!MIC_CALDO) chiudiMicrofono();
    window.dispatchEvent(new CustomEvent('pv-microfono', { detail: false }));
    const guidato = (this.testi2 || []).join(' ').replace(/\[unk\]/g, ' ').replace(/\s+/g, ' ').trim();
    return { testo: testo.trim(), guidato, audio, parole: this.paroleConf };
  }

  annulla() {
    if (!this.attivo) return;
    this.ferma().catch(() => {});
  }
}
