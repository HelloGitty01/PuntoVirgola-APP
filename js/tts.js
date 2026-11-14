// Virgola legge ad alta voce (sintesi vocale del dispositivo), con un tono vivace e affettuoso.
import { loc } from './state.js';

const MASCHILI = ['giuseppe', 'diego', 'cosimo', 'luca', 'pietro', 'lorenzo', 'rinaldo', 'benigno', 'calimero', 'gianni', 'andrea', 'marcello', 'giorgio', 'male'];
const FEMMINILI = ['isabella', 'elsa', 'alice', 'federica', 'paola', 'carla', 'silvia', 'bianca', 'chiara', 'elena', 'fiamma', 'palmira', 'imelda', 'irma', 'pierina', 'female'];

export const PREDEFINITE = { tono: 1.18, velocita: 0.95 };

export function vociItaliane() {
  if (!('speechSynthesis' in window)) return [];
  return speechSynthesis.getVoices().filter((v) => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith('it'));
}

function punteggio(v) {
  const n = v.name.toLowerCase();
  if (MASCHILI.some((m) => n.includes(m))) return -100;
  let p = 0;
  if (/natural|neural|online|premium|enhanced/.test(n)) p += 40; // voci più naturali (Edge, ChromeOS)
  if (FEMMINILI.some((f) => n.includes(f))) p += 30;
  if (n.includes('google')) p += 25; // "Google italiano" è femminile
  if (v.localService) p += 5;
  return p;
}

function scegliVoce() {
  const voci = vociItaliane();
  if (!voci.length) return null;
  const pref = loc.get('voce', {});
  if (pref.nome) {
    const v = voci.find((x) => x.name === pref.nome);
    if (v) return v;
  }
  return voci.slice().sort((a, b) => punteggio(b) - punteggio(a))[0];
}

let voce = null;
if ('speechSynthesis' in window) {
  voce = scegliVoce();
  speechSynthesis.onvoiceschanged = () => { voce = scegliVoce(); };
}

export function aggiornaVoce() { voce = scegliVoce(); return voce; }
export function voceCorrente() { return voce; }
export function disponibile() { return 'speechSynthesis' in window; }

export function zitto() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

// Divide il testo in frasi e varia il tono: più alto per esclamazioni e domande, così suona più viva.
export function parla(testo, opz = {}) {
  return new Promise((ok) => {
    if (!('speechSynthesis' in window) || !testo) return ok();
    speechSynthesis.cancel();
    const pref = { ...PREDEFINITE, ...loc.get('voce', {}), ...opz };
    const frasi = String(testo).replace(/\s+/g, ' ').match(/[^.!?…]+[.!?…]*/g) || [testo];
    let finito = false;
    const fine = () => { if (!finito) { finito = true; ok(); } };
    // rete di sicurezza se il browser non segnala la fine (tempo largo, basato sulle parole)
    setTimeout(fine, 4000 + String(testo).split(/\s+/).length * 900);
    const pulite = frasi.map((f) => f.trim()).filter(Boolean);
    pulite.forEach((t, i) => {
      const u = new SpeechSynthesisUtterance(t);
      u.lang = 'it-IT';
      if (voce) u.voice = voce;
      const esclama = t.endsWith('!');
      const domanda = t.endsWith('?');
      u.pitch = Math.min(2, pref.tono + (esclama ? 0.12 : domanda ? 0.08 : 0));
      u.rate = pref.velocita * (esclama ? 1.04 : 1);
      if (i === pulite.length - 1) { u.onend = fine; u.onerror = fine; }
      speechSynthesis.speak(u);
    });
  });
}
