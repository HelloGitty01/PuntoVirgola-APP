// Pittogrammi ARASAAC (Sergio Palao, Governo di Aragona, licenza CC BY-NC-SA).
import { loc } from './state.js';

const API = 'https://api.arasaac.org/v1/pictograms';
export const CREDITI_ARASAAC =
  'Pittogrammi: Sergio Palao. Origine: ARASAAC (https://arasaac.org). Licenza: CC BY-NC-SA. Proprietà: Governo di Aragona (Spagna).';

export function urlPittogramma(id, dim = 500) {
  return `https://static.arasaac.org/pictograms/${id}/${id}_${dim}.png`;
}

export async function cerca(parola, lingua = 'it') {
  const p = encodeURIComponent(parola.trim().toLowerCase());
  for (const tipo of ['bestsearch', 'search']) {
    try {
      const r = await fetch(`${API}/${lingua}/${tipo}/${p}`);
      if (!r.ok) continue;
      const dati = await r.json();
      if (Array.isArray(dati) && dati.length) return dati.map((x) => x._id).filter(Boolean);
    } catch { /* offline */ }
  }
  return [];
}

// Dalla parola al primo pittogramma trovato (memorizzato sul dispositivo).
export async function idPerParola(parola) {
  const mappa = loc.get('arasaac', {});
  const k = parola.trim().toLowerCase();
  if (mappa[k]) return mappa[k];
  const ids = await cerca(k);
  if (!ids.length) return null;
  mappa[k] = ids[0];
  loc.set('arasaac', mappa);
  return ids[0];
}

// Immagine di una scena: { tipo: 'arasaac', parole: [], ids: [] } oppure { tipo: 'foto', path }.
export async function idsImmagine(img) {
  if (!img || img.tipo !== 'arasaac') return [];
  if (Array.isArray(img.ids) && img.ids.length) return img.ids;
  const out = [];
  for (const p of img.parole || []) {
    const id = await idPerParola(p);
    if (id) out.push(id);
  }
  return out;
}
