// Virgola legge ad alta voce (sintesi vocale del dispositivo, in locale).
let voce = null;

function scegliVoce() {
  if (!('speechSynthesis' in window)) return null;
  const voci = speechSynthesis.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith('it'));
  if (!voci.length) return null;
  const preferite = ['google italiano', 'alice', 'elsa', 'federica', 'paola', 'isabella', 'female'];
  for (const nome of preferite) {
    const v = voci.find((x) => x.name.toLowerCase().includes(nome));
    if (v) return v;
  }
  return voci.find((v) => v.localService) || voci[0];
}

if ('speechSynthesis' in window) {
  voce = scegliVoce();
  speechSynthesis.onvoiceschanged = () => { voce = scegliVoce(); };
}

export function disponibile() { return 'speechSynthesis' in window; }

export function zitto() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

export function parla(testo, { velocita = 0.92 } = {}) {
  return new Promise((ok) => {
    if (!('speechSynthesis' in window) || !testo) return ok();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(testo);
    u.lang = 'it-IT';
    if (voce) u.voice = voce;
    u.rate = velocita;
    u.pitch = 1.08;
    let finito = false;
    const fine = () => { if (!finito) { finito = true; ok(); } };
    u.onend = fine;
    u.onerror = fine;
    setTimeout(fine, Math.max(4000, testo.length * 120));
    speechSynthesis.speak(u);
  });
}
