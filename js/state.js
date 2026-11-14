// Stato locale del dispositivo (localStorage) e stato dell'app in memoria.
const P = 'pv.';

export const loc = {
  get(k, def = null) {
    try {
      const v = localStorage.getItem(P + k);
      return v === null ? def : JSON.parse(v);
    } catch { return def; }
  },
  set(k, v) {
    try { localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) { console.warn('localStorage pieno?', e); }
  },
  del(k) { try { localStorage.removeItem(P + k); } catch {} }
};

export function idDispositivo() {
  let id = loc.get('idDispositivo');
  if (!id) {
    id = 'd' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
    loc.set('idDispositivo', id);
  }
  return id;
}

// Configurazione del dispositivo: ruolo, modalità dati, accesso a GitHub.
// { ruolo: 'bambina' | 'genitore', modo: 'github' | 'locale', owner, repo, token, nomeDispositivo }
export function dispositivo() { return loc.get('dispositivo'); }
export function salvaDispositivo(d) { loc.set('dispositivo', d); }
export function scollegaDispositivo() {
  for (const k of ['dispositivo', 'cache.config', 'cache.scene', 'avatar', 'caramelleLocali', 'coda']) loc.del(k);
}

// Stato condiviso in memoria
export const S = {
  config: null,   // config.json
  scene: null,    // scene.json { scene: [], storie: [] }
  altriRiepiloghi: [], // riepiloghi degli altri dispositivi
  online: navigator.onLine
};

export const CONFIG_PREDEFINITA = {
  versione: 1,
  nome: '',
  pin: null,
  impostazioni: {
    scenePerPartita: 5,
    livelli: { componi: 1, dillo: 1, racconta: 1, descrivi: 1 },
    paroleDescrivi: { 1: 4, 2: 6, 3: 8 },
    letturaAutomatica: true,
    motoreVoce: 'vosk'
  },
  ignorate: []
};

export function impostazioni() {
  const base = CONFIG_PREDEFINITA.impostazioni;
  const i = (S.config && S.config.impostazioni) || {};
  return {
    ...base, ...i,
    livelli: { ...base.livelli, ...(i.livelli || {}) },
    paroleDescrivi: { ...base.paroleDescrivi, ...(i.paroleDescrivi || {}) }
  };
}

export function nomeBambina() { return (S.config && S.config.nome) || ''; }

export function caramelleTotali() {
  const mie = loc.get('caramelleLocali', 0);
  const altre = S.altriRiepiloghi.reduce((t, r) => t + (r.caramelle || 0), 0);
  return mie + altre;
}
