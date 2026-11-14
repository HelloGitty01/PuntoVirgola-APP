// Navigazione tra le schermate.
import { zitto } from './tts.js';

const registro = {};
let pulizia = null;
let corrente = null;

export function registra(nome, fn) { registro[nome] = fn; }
export function schermataCorrente() { return corrente; }

export function vai(nome, param) {
  if (pulizia) { try { pulizia(); } catch (e) { console.warn(e); } pulizia = null; }
  zitto();
  // Contenitore nuovo a ogni schermata: così non restano ascoltatori di eventi vecchi.
  const vecchio = document.getElementById('app');
  const app = vecchio.cloneNode(false);
  vecchio.replaceWith(app);
  window.scrollTo(0, 0);
  corrente = nome;
  const r = registro[nome](app, param);
  if (typeof r === 'function') pulizia = r;
  else if (r && typeof r.then === 'function') r.then((f) => { if (typeof f === 'function' && corrente === nome) pulizia = f; }).catch((e) => console.error(e));
}
