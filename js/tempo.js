// Tempo di gioco del giorno e limite giornaliero (opzionale, impostato dai genitori).
import { loc, S } from './state.js';

const oggi = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const chiave = () => 'tempo.' + oggi();

export function secondiOggi() { return loc.get(chiave(), 0); }
export function limiteMinuti() {
  const i = (S.config && S.config.impostazioni) || {};
  return Number(i.limiteMinuti) || 0;
}
// minuti extra concessi oggi dai genitori
export function extraOggi() { return loc.get('tempo.extra.' + oggi(), 0); }
export function concediMinuti(m) { loc.set('tempo.extra.' + oggi(), extraOggi() + m); }
export function limiteSuperato() {
  const lim = limiteMinuti();
  return lim > 0 && secondiOggi() >= (lim + extraOggi()) * 60;
}
export function minutiRimasti() {
  const lim = limiteMinuti();
  return lim > 0 ? Math.max(0, Math.ceil(lim + extraOggi() - secondiOggi() / 60)) : null;
}

// Conta il tempo mentre la bambina è dentro un gioco (solo a schermo visibile).
let timer = null;
export function avviaConteggio() {
  fermaConteggio();
  timer = setInterval(() => {
    if (document.hidden) return;
    loc.set(chiave(), secondiOggi() + 10);
    // pulizia dei giorni vecchi, una volta ogni tanto
    if (Math.random() < 0.02) {
      Object.keys(localStorage).filter((k) => k.startsWith('pv.tempo.') && !k.endsWith(oggi())).forEach((k) => localStorage.removeItem(k));
    }
  }, 10000);
}
export function fermaConteggio() { clearInterval(timer); timer = null; }
