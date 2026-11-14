// Livello dati: GitHub (repository privato) oppure solo su questo dispositivo.
import { loc, S, dispositivo, idDispositivo, CONFIG_PREDEFINITA } from './state.js';
import { GitHub } from './github.js';

let gh = null;
let shaConfig = null;
let shaScene = null;
const CACHE_IMG = 'pv-immagini';
const urlCreati = new Map();
const clona = (o) => JSON.parse(JSON.stringify(o));

export function inizializza() {
  const d = dispositivo();
  gh = d && d.modo === 'github' ? new GitHub(d.owner, d.repo, d.token) : null;
  return gh;
}
export function conGitHub() { return !!gh; }
export function clientGitHub() { return gh; }

export async function sceneIniziali() {
  const r = await fetch('data/scene-iniziali.json');
  return r.json();
}

// Carica configurazione e scene: prima la copia locale, poi (se possibile) GitHub.
export async function caricaTutto() {
  S.config = loc.get('cache.config');
  S.scene = loc.get('cache.scene');
  if (!gh) {
    if (!S.config) { S.config = clona(CONFIG_PREDEFINITA); loc.set('cache.config', S.config); }
    if (!S.scene) { S.scene = await sceneIniziali(); loc.set('cache.scene', S.scene); }
    return;
  }
  try {
    await aggiornaDaRemoto();
  } catch (e) {
    if (!S.config || !S.scene) throw e;
    console.warn('Uso la copia locale:', e.message);
  }
}

export async function aggiornaDaRemoto() {
  const [c, s] = await Promise.all([gh.leggiJSON('config.json'), gh.leggiJSON('scene.json')]);
  if (!c || !s) throw new Error('Il repository dati non è ancora stato preparato da un genitore');
  S.config = c.dati; shaConfig = c.sha; loc.set('cache.config', S.config);
  S.scene = s.dati; shaScene = s.sha; loc.set('cache.scene', S.scene);
  try { S.altriRiepiloghi = await leggiRiepiloghi(true); } catch { /* non essenziale */ }
}

// Prima configurazione da parte di un genitore.
export async function preparaRepository(nome) {
  const c = await gh.leggiJSON('config.json');
  if (c) { S.config = c.dati; shaConfig = c.sha; }
  else {
    S.config = { ...clona(CONFIG_PREDEFINITA), nome };
    shaConfig = await gh.scriviJSON('config.json', S.config, 'Punto e Virgola: configurazione iniziale');
  }
  const s = await gh.leggiJSON('scene.json');
  if (s) { S.scene = s.dati; shaScene = s.sha; }
  else {
    S.scene = await sceneIniziali();
    shaScene = await gh.scriviJSON('scene.json', S.scene, 'Punto e Virgola: scene iniziali');
  }
  loc.set('cache.config', S.config);
  loc.set('cache.scene', S.scene);
}

export async function salvaConfig() {
  loc.set('cache.config', S.config);
  if (!gh) return;
  try {
    shaConfig = await gh.scriviJSON('config.json', S.config, 'Aggiorna configurazione', shaConfig);
  } catch (e) {
    if (e.stato !== 409) throw e;
    const c = await gh.leggiJSON('config.json');
    shaConfig = await gh.scriviJSON('config.json', S.config, 'Aggiorna configurazione', c && c.sha);
  }
}

export async function salvaScene() {
  loc.set('cache.scene', S.scene);
  if (!gh) return;
  shaScene = await gh.scriviJSON('scene.json', S.scene, 'Aggiorna scene e storie', shaScene);
}

// ---------- Immagini (foto caricate dai genitori) ----------
function chiaveImg(path) { return new Request(new URL('__immagini/' + path, location.href).href); }

export async function salvaImmagine(blob) {
  const path = `immagini/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}.jpg`;
  if (gh) await gh.scriviBinario(path, blob, 'Nuova immagine');
  const c = await caches.open(CACHE_IMG);
  await c.put(chiaveImg(path), new Response(blob, { headers: { 'Content-Type': 'image/jpeg' } }));
  return path;
}

export async function urlImmagine(path) {
  if (urlCreati.has(path)) return urlCreati.get(path);
  const c = await caches.open(CACHE_IMG);
  let r = await c.match(chiaveImg(path));
  if (!r && gh) {
    try {
      const b = await gh.leggiBlob(path);
      await c.put(chiaveImg(path), new Response(b, { headers: { 'Content-Type': b.type || 'image/jpeg' } }));
      r = await c.match(chiaveImg(path));
    } catch { return null; }
  }
  if (!r) return null;
  const u = URL.createObjectURL(await r.blob());
  urlCreati.set(path, u);
  return u;
}

// ---------- Progressi ----------
function nomeFile() { return new Date().toISOString().replace(/[:.]/g, '-') + '.json'; }

export function registraPartita(partita) {
  const id = idDispositivo();
  const d = dispositivo() || {};
  const record = { ...partita, dispositivo: id, nomeDispositivo: d.nomeDispositivo || '', avatar: loc.get('avatar') };
  const tot = partita.esercizi.reduce((t, e) => t + (e.punteggio || 0), 0);
  loc.set('caramelleLocali', loc.get('caramelleLocali', 0) + tot);
  if (gh) {
    const coda = loc.get('coda', []);
    coda.push({ path: `progressi/${id}/${nomeFile()}`, dati: record });
    loc.set('coda', coda);
    sincronizza();
  } else {
    const tutte = loc.get('progressi', []);
    tutte.push(record);
    loc.set('progressi', tutte.slice(-400));
  }
  return tot;
}

let sincronizzando = false;
export async function sincronizza() {
  if (!gh || sincronizzando || !navigator.onLine) return;
  sincronizzando = true;
  try {
    const coda = loc.get('coda', []);
    while (coda.length) {
      const voce = coda[0];
      try {
        await gh.scriviJSON(voce.path, voce.dati, 'Progressi ' + voce.path.split('/').pop());
      } catch (e) {
        if (e.stato === 0 || e.stato === 401 || e.stato === 403) break; // offline o token: riprova più tardi
        console.warn('Voce scartata', e);
      }
      coda.shift();
      loc.set('coda', coda);
    }
    await scriviRiepilogo();
  } catch (e) {
    console.warn('Sincronizzazione rimandata', e.message);
  } finally {
    sincronizzando = false;
  }
}

export async function scriviRiepilogo() {
  if (!gh) return;
  const d = dispositivo() || {};
  if (d.ruolo !== 'bambina') return;
  const id = idDispositivo();
  const path = `progressi/${id}/riepilogo.json`;
  const prec = await gh.leggiJSON(path);
  const dati = {
    dispositivo: id,
    nomeDispositivo: d.nomeDispositivo || '',
    caramelle: loc.get('caramelleLocali', 0),
    avatar: loc.get('avatar'),
    aggiornato: new Date().toISOString()
  };
  await gh.scriviJSON(path, dati, 'Riepilogo dispositivo', prec && prec.sha);
}

export async function leggiRiepiloghi(escludiQuesto) {
  if (!gh) return [];
  const mio = idDispositivo();
  const cartelle = (await gh.elenca('progressi')).filter((x) => x.type === 'dir' && (!escludiQuesto || x.name !== mio));
  const out = [];
  for (const c of cartelle) {
    const r = await gh.leggiJSON(`progressi/${c.name}/riepilogo.json`);
    if (r) out.push(r.dati);
  }
  return out;
}

// Le partite più recenti (per l'area genitori).
export async function leggiPartite(limite = 60) {
  if (!gh) return loc.get('progressi', []).slice(-limite).reverse();
  const cartelle = (await gh.elenca('progressi')).filter((x) => x.type === 'dir');
  let files = [];
  for (const c of cartelle) {
    const f = await gh.elenca(`progressi/${c.name}`);
    files = files.concat(f.filter((x) => x.type === 'file' && x.name !== 'riepilogo.json'));
  }
  files.sort((a, b) => b.name.localeCompare(a.name));
  files = files.slice(0, limite);
  const out = [];
  for (let i = 0; i < files.length; i += 6) {
    const blocco = await Promise.all(files.slice(i, i + 6).map((f) => gh.leggiJSON(f.path).catch(() => null)));
    blocco.forEach((r) => r && out.push(r.dati));
  }
  const inCoda = loc.get('coda', []).map((v) => v.dati);
  return inCoda.reverse().concat(out);
}
