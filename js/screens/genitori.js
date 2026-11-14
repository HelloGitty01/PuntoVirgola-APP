// Area genitori: riepilogo, scene, storie, frasi da rivedere, impostazioni, dispositivi.
import { vai } from '../nav.js';
import { S, loc, dispositivo, impostazioni, scollegaDispositivo, idDispositivo } from '../state.js';
import { conGitHub, leggiPartite, salvaConfig, salvaScene, aggiornaDaRemoto, sincronizza } from '../data.js';
import { esc, ICONE, toast, finestra, riquadroImmagine, riempiImmagini } from '../ui.js';
import { TIPI, GIOCHI, GRUPPI, SUONI, attivaGioco } from '../punteggi.js';
import { normalizza } from '../match.js';
import { CREDITI_ARASAAC } from '../arasaac.js';
import { preparaVosk, modelloInCache, PERCORSO_MODELLO } from '../speech.js';
import { editorScena, editorStoria, editorRacconto } from './editor.js';
import { musica } from '../musica.js';
import { vociItaliane, voceCorrente, aggiornaVoce, parla, PREDEFINITE } from '../tts.js';

const VERSIONE = '1.6.0';
const SCHEDE = [
  ['riepilogo', 'Riepilogo'], ['attivita', 'Attività'], ['scene', 'Scene'], ['storie', 'Storie'], ['racconti', 'Racconti'], ['esercizi', 'Altri esercizi'], ['rivedere', 'Da rivedere'],
  ['impostazioni', 'Impostazioni'], ['dispositivi', 'Dispositivi'], ['info', 'Info']
];

async function sha256(testo) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('pv:' + testo));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
export async function verificaPin(pin) { return S.config && S.config.pin && (await sha256(pin)) === S.config.pin; }

export function editor(app, { tipo, voce, scheda }) {
  const torna = () => vai('genitori', { scheda });
  if (tipo === 'storia') editorStoria(app, voce, torna);
  else if (tipo === 'racconto') editorRacconto(app, voce, torna);
  else editorScena(app, voce, torna);
}

export function genitori(app, { scheda = 'riepilogo' } = {}) {
  const d = dispositivo() || {};
  const suGenitore = d.ruolo === 'genitore';
  app.innerHTML = `<main class="schermata pa">
    <div class="barra">
      <button class="btn-tondo" id="esci" aria-label="${suGenitore ? 'Prova come bambina' : 'Torna ai giochi'}">${ICONE.indietro}</button>
      <img src="img/wordmark.png" alt="" style="height:44px">
      <h1>Area genitori</h1>
      <div class="destra">${conGitHub() ? `<button class="btn-tondo" id="ricarica" aria-label="Ricarica dai dati su GitHub">${ICONE.ricarica}</button>` : ''}</div>
    </div>
    <div class="schede" role="tablist">${SCHEDE.map(([k, t]) => `<button role="tab" data-scheda="${k}" aria-selected="${k === scheda}">${t}</button>`).join('')}</div>
    <section id="contenuto" style="display:flex;flex-direction:column;gap:16px"></section>
  </main>`;
  const cont = app.querySelector('#contenuto');
  app.querySelector('#esci').onclick = () => vai('home');
  const ric = app.querySelector('#ricarica');
  if (ric) ric.onclick = async () => {
    try { await aggiornaDaRemoto(); toast('Dati aggiornati'); vai('genitori', { scheda }); } catch (e) { toast(e.message); }
  };
  app.querySelectorAll('[data-scheda]').forEach((b) => { b.onclick = () => vai('genitori', { scheda: b.dataset.scheda }); });
  const fn = { riepilogo, attivita, scene, storie, racconti, esercizi, rivedere, impostazioniScheda, dispositivi, info }[scheda === 'impostazioni' ? 'impostazioniScheda' : scheda];
  fn(cont, scheda);
}

// ---------------- Riepilogo ----------------
async function riepilogo(cont) {
  cont.innerHTML = '<p>Carico i progressi…</p>';
  let partite = [];
  try { partite = await leggiPartite(80); } catch (e) { cont.innerHTML = `<p class="errore">${esc(e.message)}</p>`; return; }
  const settimana = Date.now() - 7 * 864e5;
  const recenti = partite.filter((p) => new Date(p.fine || p.inizio).getTime() >= settimana);
  const esercizi = (lista) => lista.flatMap((p) => p.esercizi || []);
  const media = (es) => (es.length ? (es.reduce((t, e) => t + (e.punteggio || 0), 0) / es.length).toFixed(1) : '–');
  const esSett = esercizi(recenti);
  const perGioco = Object.keys(GIOCHI).map((g) => ({ g, es: esSett.filter((e) => e.gioco === g) }));
  const dilloTutti = esercizi(partite).filter((e) => e.gioco === 'dillo');
  const conteggio = {};
  dilloTutti.forEach((e) => (e.mancanti || []).forEach((t) => { conteggio[t] = (conteggio[t] || 0) + 1; }));
  const frasi = dilloTutti.filter((e) => e.frasi && e.frasi.length).slice(0, 10);
  cont.innerHTML = `
    <div class="griglia-stat">
      <div class="stat"><small>Partite (7 giorni)</small><b>${recenti.length}</b></div>
      <div class="stat"><small>Esercizi (7 giorni)</small><b>${esSett.length}</b></div>
      <div class="stat"><small>Media caramelle</small><b>${media(esSett)}</b></div>
      <div class="stat"><small>Caramelle (questo disp.)</small><b>${loc.get('caramelleLocali', 0)}</b></div>
    </div>
    <div class="card morbida"><h3 style="margin-bottom:12px">Media per gioco (7 giorni)</h3>
      <div class="barre">${perGioco.map(({ g, es }) => {
        const m = es.length ? es.reduce((t, e) => t + e.punteggio, 0) / es.length : 0;
        return `<div class="riga" data-tipo="${GIOCHI[g].tipo}" style="--c:var(--c)"><span>${esc(GIOCHI[g].titolo)}</span><div class="traccia"><div style="width:${m * 10}%;background:var(--c)"></div></div><b>${es.length ? m.toFixed(1) : '–'}</b></div>`;
      }).join('')}</div></div>
    <div class="card morbida"><h3 style="margin-bottom:6px">Elementi che mancano più spesso in “Dillo tu”</h3>
      <p class="aiuto" style="margin-top:0">Al primo tentativo, su ${dilloTutti.length} esercizi.</p>
      <div class="barre">${Object.keys(TIPI).filter((t) => conteggio[t]).map((t) => {
        const perc = Math.round((conteggio[t] / Math.max(1, dilloTutti.length)) * 100);
        return `<div class="riga" data-tipo="${t}"><span>${TIPI[t].nome}</span><div class="traccia"><div style="width:${perc}%;background:var(--c)"></div></div><b>${perc}%</b></div>`;
      }).join('') || '<p>Ancora nessun dato.</p>'}</div></div>
    ${(() => {
      const pr = esercizi(partite).filter((e) => e.gioco === 'pronuncia');
      if (!pr.length) return '';
      const per = {};
      pr.forEach((e) => { const x = per[e.suono] = per[e.suono] || { tot: 0, primo: 0, ok: 0, sentite: {} }; x.tot++; if (e.riuscita) x.ok++; if (e.riuscita && e.tentativi === 1) x.primo++; (e.sentite || []).filter((w) => w && w !== '?' && w !== String(e.parola).toLowerCase()).forEach((w) => { x.sentite[w] = (x.sentite[w] || 0) + 1; }); });
      return `<div class="card morbida"><h3 style="margin-bottom:6px">Pronuncia</h3><p class="aiuto" style="margin-top:0">Parole dette bene (al primo colpo / in totale) e sostituzioni sentite più spesso.</p>
        <div class="barre">${Object.entries(per).map(([k, x]) => `<div class="riga" style="grid-template-columns:90px 1fr 70px"><span>${esc((SUONI[k] || {}).nome || k)}</span><div class="traccia"><div style="width:${Math.round((x.ok / x.tot) * 100)}%;background:var(--verde)"></div></div><b>${x.primo}/${x.ok}/${x.tot}</b></div>
          ${Object.keys(x.sentite).length ? `<small style="color:var(--tenue);margin:-4px 0 6px 100px">sentito: ${Object.entries(x.sentite).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([w, n]) => `${esc(w)} (${n})`).join(', ')}</small>` : ''}`).join('')}</div></div>`;
    })()}
    ${(() => {
      const ri = esercizi(partite).filter((e) => e.gioco === 'riassunto').slice(0, 6);
      if (!ri.length) return '';
      return `<div class="card morbida"><h3 style="margin-bottom:10px">Riassunti recenti</h3><div class="elenco">${ri.map((e) => `<div class="voce" style="align-items:flex-start"><div class="testo">
        <b>${esc(e.titolo)}</b> · ${e.trovati.length}/${e.trovati.length + e.mancanti.length} elementi · ${e.punteggio} caramelle
        <small>${new Date(e.quando).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })} · ${e.modalita === 'guidato' ? 'guidato' : 'libero'}${e.ordineOk === false ? ' · ordine da rivedere' : ''}${e.sintesiOk === false ? ' · poco sintetico' : ''}</small>
        <p style="margin:6px 0">«${esc(e.testo)}»</p>
        ${e.mancanti.length ? `<small>Mancava: ${esc(e.mancanti.join('; '))}</small>` : '<small class="ok-testo">Tutti gli elementi presenti</small>'}</div></div>`).join('')}</div>
        <p class="aiuto">Se un elemento risulta mancante ma tua figlia l’aveva detto con altre parole, aggiungi quelle parole nella scheda Racconti.</p></div>`;
    })()}
    <div class="card morbida"><h3 style="margin-bottom:10px">Frasi dette di recente</h3>
      ${frasi.length ? `<div class="elenco">${frasi.map((e) => `<div class="voce"><div class="testo">«${esc(e.frasi[e.frasi.length - 1])}»<small>${new Date(e.quando).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })} · ${e.punteggio} caramelle</small></div></div>`).join('')}</div>` : '<p>Ancora nessuna frase.</p>'}</div>
    <div class="card morbida"><h3 style="margin-bottom:10px">Ultime partite</h3>
      ${partite.length ? `<div class="elenco">${partite.slice(0, 12).map((p) => `<div class="voce"><div class="testo">${esc((GIOCHI[p.gioco] || {}).titolo || p.gioco)} · livello ${p.livello}<small>${new Date(p.fine || p.inizio).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })} · ${esc(p.nomeDispositivo || '')}${p.interrotta ? ' · interrotta' : ''}</small></div><b>${(p.esercizi || []).reduce((t, e) => t + e.punteggio, 0)}</b></div>`).join('')}</div>` : '<p>Ancora nessuna partita.</p>'}</div>`;
}

// ---------------- Scene ----------------
function scene(cont, scheda) {
  const lista = (S.scene.scene || []).slice().sort((a, b) => (a.livello || 1) - (b.livello || 1));
  cont.innerHTML = `<div class="riga-pulsanti"><button class="btn" id="nuova">${ICONE.piu} Nuova scena</button><span>${lista.length} scene</span></div>
    <div class="elenco">${lista.map((s) => `<div class="voce">
      ${riquadroImmagine(s.immagine, 'miniatura')}
      <div class="testo"><b>${esc(s.frase)}</b><small>Livello ${s.livello || 1} · ${(s.elementi || []).map((e) => `<span class="etichetta-tipo" data-tipo="${e.tipo}">${TIPI[e.tipo].nome}</span>`).join(' ')}</small></div>
      <button class="btn-tondo" data-mod="${esc(s.id)}" aria-label="Modifica">${ICONE.matita}</button></div>`).join('')}</div>`;
  riempiImmagini(cont);
  cont.querySelector('#nuova').onclick = () => vai('editor', { tipo: 'scena', voce: null, scheda });
  cont.querySelectorAll('[data-mod]').forEach((b) => { b.onclick = () => vai('editor', { tipo: 'scena', voce: S.scene.scene.find((x) => x.id === b.dataset.mod), scheda }); });
}

function storie(cont, scheda) {
  const lista = S.scene.storie || [];
  cont.innerHTML = `<div class="riga-pulsanti"><button class="btn" id="nuova">${ICONE.piu} Nuova storia</button><span>${lista.length} storie</span></div>
    <div class="elenco">${lista.map((s) => `<div class="voce">
      ${riquadroImmagine(s.vignette && s.vignette[0] && s.vignette[0].immagine, 'miniatura')}
      <div class="testo"><b>${esc(s.titolo)}</b><small>Livello ${s.livello || 1} · ${(s.vignette || []).length} vignette</small></div>
      <button class="btn-tondo" data-mod="${esc(s.id)}" aria-label="Modifica">${ICONE.matita}</button></div>`).join('')}</div>`;
  riempiImmagini(cont);
  cont.querySelector('#nuova').onclick = () => vai('editor', { tipo: 'storia', voce: null, scheda });
  cont.querySelectorAll('[data-mod]').forEach((b) => { b.onclick = () => vai('editor', { tipo: 'storia', voce: lista.find((x) => x.id === b.dataset.mod), scheda }); });
}

function racconti(cont, scheda) {
  const lista = (S.scene.racconti || []).slice().sort((a, b) => (a.livello || 1) - (b.livello || 1));
  cont.innerHTML = `<div class="riga-pulsanti"><button class="btn" id="nuovo">${ICONE.piu} Nuovo racconto</button><span>${lista.length} racconti per “Riassumi la storia”</span></div>
    <div class="elenco">${lista.map((r) => `<div class="voce">
      <div class="testo"><b>${esc(r.titolo)}</b><small>Livello ${r.livello || 1} · ${(r.testo || '').split(/\s+/).length} parole · ${(r.elementi || []).length} elementi essenziali</small></div>
      <button class="btn-tondo" data-mod="${esc(r.id)}" aria-label="Modifica">${ICONE.matita}</button></div>`).join('')}</div>`;
  cont.querySelector('#nuovo').onclick = () => vai('editor', { tipo: 'racconto', voce: null, scheda });
  cont.querySelectorAll('[data-mod]').forEach((b) => { b.onclick = () => vai('editor', { tipo: 'racconto', voce: lista.find((x) => x.id === b.dataset.mod), scheda }); });
}

// ---------------- Da rivedere ----------------
async function rivedere(cont) {
  cont.innerHTML = '<p>Carico…</p>';
  let partite = [];
  try { partite = await leggiPartite(80); } catch (e) { cont.innerHTML = `<p class="errore">${esc(e.message)}</p>`; return; }
  const ignorate = new Set((S.config.ignorate || []).map(normalizza));
  const voci = new Map();
  partite.flatMap((p) => p.esercizi || []).filter((e) => e.gioco === 'dillo').forEach((e) => {
    const sc = S.scene.scene.find((x) => x.id === e.id);
    if (!sc) return;
    const note = new Set([...(sc.vocabolario || []), ...sc.elementi.flatMap((x) => x.accettate || [])].map(normalizza));
    (e.nonPreviste || []).forEach((p) => {
      const k = normalizza(p);
      if (ignorate.has(k) || note.has(k)) return;
      const chiave = sc.id + '|' + k;
      if (!voci.has(chiave)) voci.set(chiave, { scena: sc, parola: p, frase: (e.frasi || []).slice(-1)[0] || '' });
    });
  });
  const elenco = [...voci.values()];
  cont.innerHTML = `<p>Parole dette da tua figlia che l’app non conosceva. Se erano giuste, aggiungile come risposta accettata: la prossima volta verranno riconosciute.</p>
    ${elenco.length ? `<div class="elenco">${elenco.map((v, i) => `<div class="voce" style="flex-wrap:wrap">
      <div class="testo"><b>«${esc(v.parola)}»</b><small>Scena: ${esc(v.scena.frase)}${v.frase ? ` · ha detto: «${esc(v.frase)}»` : ''}</small></div>
      <select data-el="${i}" style="width:auto"><option value="">Aggiungi a…</option>${v.scena.elementi.map((e, k) => `<option value="${k}">${TIPI[e.tipo].nome}: ${esc(e.testo)}</option>`).join('')}<option value="voc">Vocabolario della scena</option></select>
      <button class="btn piccolo" data-agg="${i}">Aggiungi</button>
      <button class="btn piccolo secondario" data-ign="${i}">Ignora</button></div>`).join('')}</div>` : '<p class="ok-testo">Niente da rivedere!</p>'}`;
  cont.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-agg]');
    const ig = e.target.closest('[data-ign]');
    try {
      if (a) {
        const v = elenco[+a.dataset.agg];
        const dove = cont.querySelector(`[data-el="${a.dataset.agg}"]`).value;
        if (!dove) { toast('Scegli dove aggiungerla'); return; }
        const sc = S.scene.scene.find((x) => x.id === v.scena.id);
        if (dove === 'voc') sc.vocabolario = [...(sc.vocabolario || []), v.parola];
        else sc.elementi[+dove].accettate = [...(sc.elementi[+dove].accettate || []), v.parola];
        await salvaScene();
        a.closest('.voce').remove();
        toast('Aggiunta!');
      }
      if (ig) {
        const v = elenco[+ig.dataset.ign];
        S.config.ignorate = [...(S.config.ignorate || []), v.parola];
        await salvaConfig();
        ig.closest('.voce').remove();
      }
    } catch (ex) { toast(ex.message); }
  });
}

// ---------------- Impostazioni ----------------
async function impostazioniScheda(cont) {
  const imp = impostazioni();
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  cont.innerHTML = `<form id="f" style="display:flex;flex-direction:column;gap:16px">
    <div class="card morbida" style="display:flex;flex-direction:column;gap:14px">
      <div class="campo"><label for="nome">Nome della bambina</label><input id="nome" type="text" value="${esc(S.config.nome || '')}"></div>
      <div class="campo"><label for="spp">Esercizi per partita</label><input id="spp" type="number" min="1" max="15" value="${imp.scenePerPartita}"></div>
      <div class="campo"><label><input type="checkbox" id="lett" ${imp.letturaAutomatica ? 'checked' : ''}> Virgola legge ad alta voce le istruzioni</label></div>
    </div>
    <div class="card morbida" style="display:flex;flex-direction:column;gap:12px"><h3>“Descrivi la scena”: parole minime</h3>
      <div style="display:flex;gap:12px;flex-wrap:wrap">${[1, 2, 3, 4, 5].map((l) => `<div class="campo"><label for="pd-${l}">Livello ${l}</label><input id="pd-${l}" type="number" min="2" max="25" value="${imp.paroleDescrivi[l]}"></div>`).join('')}</div>
    </div>
    <div class="card morbida" style="display:flex;flex-direction:column;gap:12px"><h3>Voce di Virgola (su questo dispositivo)</h3>
      <div class="campo"><label for="voce-nome">Voce</label><select id="voce-nome"></select>
        <span class="aiuto">Le voci dipendono dal dispositivo. Su Chromebook la più naturale di solito è “Google italiano”; su Edge le voci “Natural”.</span></div>
      <div class="campo"><label for="voce-tono">Tono (più alto = più allegro)</label><input id="voce-tono" type="range" min="0.9" max="1.5" step="0.02"></div>
      <div class="campo"><label for="voce-vel">Velocità</label><input id="voce-vel" type="range" min="0.75" max="1.15" step="0.01"></div>
      <div class="riga-pulsanti"><button type="button" class="btn secondario piccolo" id="voce-prova">${ICONE.altoparlante} Prova la voce</button>
        <button type="button" class="link" id="voce-reset">Valori consigliati</button></div>
    </div>
    <div class="card morbida" style="display:flex;flex-direction:column;gap:12px"><h3>Musica di sottofondo (su questo dispositivo)</h3>
      <label style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="mus-on" style="width:22px;height:22px" ${musica.muto ? '' : 'checked'}> Musica accesa</label>
      <div class="campo"><label for="mus-vol">Volume</label><input id="mus-vol" type="range" min="0.1" max="1" step="0.05" value="${musica.volume}"></div>
      <span class="aiuto">Nella home è allegra, durante le attività è calma. Si abbassa quando parla Virgola e si spegne quando il microfono ascolta. Il pulsante con la nota, in basso a sinistra, la spegne in ogni schermata.</span>
    </div>
    <div class="card morbida" style="display:flex;flex-direction:column;gap:12px"><h3>Riconoscimento vocale</h3>
      <div class="campo"><label for="motore">Motore</label><select id="motore">
        <option value="vosk" ${imp.motoreVoce === 'vosk' ? 'selected' : ''}>Vosk, sul dispositivo (consigliato, l’audio non esce)</option>
        <option value="browser-locale" ${imp.motoreVoce === 'browser-locale' ? 'selected' : ''} ${SR ? '' : 'disabled'}>Browser, sul dispositivo (se supportato)</option>
        <option value="browser" ${imp.motoreVoce === 'browser' ? 'selected' : ''} ${SR ? '' : 'disabled'}>Browser online (l’audio va ai server di Google)</option>
      </select></div>
      <div id="stato-modello" class="aiuto">Controllo il modello vocale…</div>
      <button type="button" class="btn secondario piccolo" id="scarica-modello" style="align-self:flex-start">Scarica ora il modello vocale su questo dispositivo</button>
    </div>
    <div class="card morbida" style="display:flex;flex-direction:column;gap:12px"><h3>PIN dell’area genitori</h3>
      <p class="aiuto" style="margin:0">${S.config.pin ? 'Il PIN è impostato.' : 'Senza PIN, per entrare si risponde a una moltiplicazione.'}</p>
      <div class="campo"><label for="pin">Nuovo PIN (4-6 cifre, vuoto = non cambiare)</label><input id="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6"></div>
      ${S.config.pin ? '<label><input type="checkbox" id="togli-pin"> Togli il PIN</label>' : ''}
    </div>
    <p class="errore" id="err" role="alert"></p>
    <button class="btn" type="submit" id="salva" style="align-self:flex-start">Salva impostazioni</button>
  </form>`;
  cont.querySelector('#mus-on').addEventListener('change', (e) => musica.setMuto(!e.target.checked));
  cont.querySelector('#mus-vol').addEventListener('input', (e) => musica.setVolume(Number(e.target.value)));
  // Voce di Virgola: preferenze salvate solo su questo dispositivo
  const pv = { ...PREDEFINITE, ...loc.get('voce', {}) };
  const selV = cont.querySelector('#voce-nome');
  const riempiVoci = () => {
    const voci = vociItaliane();
    const att = (voceCorrente() || {}).name;
    selV.innerHTML = voci.length ? voci.map((v) => `<option ${v.name === (pv.nome || att) ? 'selected' : ''}>${esc(v.name)}</option>`).join('') : '<option>Nessuna voce italiana trovata</option>';
  };
  riempiVoci();
  if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', riempiVoci);
  cont.querySelector('#voce-tono').value = pv.tono;
  cont.querySelector('#voce-vel').value = pv.velocita;
  const salvaVoce = () => {
    const v = { nome: selV.value, tono: Number(cont.querySelector('#voce-tono').value), velocita: Number(cont.querySelector('#voce-vel').value) };
    loc.set('voce', v);
    aggiornaVoce();
  };
  ['#voce-nome', '#voce-tono', '#voce-vel'].forEach((q) => cont.querySelector(q).addEventListener('change', salvaVoce));
  cont.querySelector('#voce-prova').onclick = () => { salvaVoce(); parla(`Ciao ${S.config.nome || ''}! Sono Virgola, la tua maestra. Sei pronta a giocare con le frasi? Evviva!`); };
  cont.querySelector('#voce-reset').onclick = () => {
    cont.querySelector('#voce-tono').value = PREDEFINITE.tono;
    cont.querySelector('#voce-vel').value = PREDEFINITE.velocita;
    salvaVoce();
    toast('Voce ripristinata');
  };
  const statoModello = async () => {
    const box = cont.querySelector('#stato-modello');
    if (await modelloInCache()) { box.innerHTML = '<span class="ok-testo">Modello vocale pronto su questo dispositivo.</span>'; return; }
    try {
      const r = await fetch(PERCORSO_MODELLO, { method: 'HEAD' });
      box.textContent = r.ok ? 'Il modello verrà scaricato (circa 50 MB) la prima volta che si usa il microfono.' : 'Modello vocale non trovato sul sito: segui le istruzioni del README (cartella models).';
    } catch { box.textContent = 'Non riesco a controllare il modello (offline?).'; }
  };
  statoModello();
  cont.querySelector('#scarica-modello').onclick = async (e) => {
    const b = e.target; b.disabled = true;
    try { await preparaVosk((p) => { b.textContent = `Scarico… ${Math.round(p * 100)}%`; }); toast('Modello vocale pronto'); }
    catch (ex) { toast(ex.message === 'modello-mancante' ? 'Modello non trovato: vedi README' : ex.message); }
    b.disabled = false; b.textContent = 'Scarica ora il modello vocale su questo dispositivo';
    statoModello();
  };
  cont.querySelector('#f').onsubmit = async (e) => {
    e.preventDefault();
    const v = (id) => cont.querySelector('#' + id);
    const pin = v('pin').value.trim();
    if (pin && !/^\d{4,6}$/.test(pin)) { v('err').textContent = 'Il PIN deve avere da 4 a 6 cifre.'; return; }
    S.config.nome = v('nome').value.trim();
    S.config.impostazioni = {
      scenePerPartita: Math.max(1, Math.min(15, Number(v('spp').value) || 5)),
      livelli: imp.livelli,
      paroleDescrivi: Object.fromEntries([1, 2, 3, 4, 5].map((l) => [l, Number(v('pd-' + l).value) || imp.paroleDescrivi[l]])),
      letturaAutomatica: v('lett').checked,
      motoreVoce: v('motore').value
    };
    if (pin) S.config.pin = await sha256(pin);
    if (v('togli-pin') && v('togli-pin').checked) S.config.pin = null;
    const b = v('salva'); b.disabled = true;
    try { await salvaConfig(); toast('Impostazioni salvate'); vai('genitori', { scheda: 'impostazioni' }); }
    catch (ex) { v('err').textContent = ex.message; b.disabled = false; }
  };
}

// ---------------- Attività: attiva/disattiva e livelli ----------------
function attivita(cont) {
  const imp = impostazioni();
  cont.innerHTML = `<p style="margin:0">Scegli quali attività vede tua figlia nella home e a che livello giocarle.</p>
    ${Object.entries(GRUPPI).map(([gr, titolo]) => `<div class="card morbida" style="padding:8px 0"><h3 style="padding:8px 14px 0">${esc(titolo)}</h3>
      ${Object.entries(GIOCHI).filter(([, g]) => g.gruppo === gr).map(([id, g]) => `<div class="interruttore" data-tipo="${g.tipo}">
        <span class="icona-mini" style="width:40px;height:40px;border-radius:12px;background:var(--cc);border:2px solid var(--c);display:flex;align-items:center;justify-content:center;color:var(--ct)">${ICONE[id].replace('<svg', '<svg style="width:24px;height:24px"')}</span>
        <label class="nome" for="att-${id}"><b>${esc(g.titolo)}</b><small>${esc(g.sotto)}</small></label>
        ${g.livelli ? `<select id="lv-${id}" aria-label="Livello di ${esc(g.titolo)}" style="width:120px">${Array.from({ length: g.livelli }, (_, i) => i + 1).map((l) => `<option value="${l}" ${(imp.livelli[id] || 1) === l ? 'selected' : ''}>Livello ${l}</option>`).join('')}</select>` : ''}
        <span class="switch"><input type="checkbox" id="att-${id}" ${attivaGioco(S.config, id) ? 'checked' : ''}><span></span></span>
      </div>`).join('')}</div>`).join('')}
    <div class="card morbida" style="display:flex;flex-direction:column;gap:10px"><h3>Suoni per “Pronuncia con Virgola”</h3>
      <div style="display:flex;flex-wrap:wrap;gap:10px">${Object.entries(SUONI).map(([k, x]) => `<label style="display:flex;align-items:center;gap:8px;padding:8px 14px;border:2px solid #E7E1D6;border-radius:14px;background:#fff">
        <input type="checkbox" data-suono="${k}" style="width:22px;height:22px" ${!S.config.suoniPronuncia || S.config.suoniPronuncia.includes(k) ? 'checked' : ''}> <b>${esc(x.nome)}</b> <small style="color:var(--tenue)">${esc(x.esempio)}</small></label>`).join('')}</div>
      <span class="aiuto">Virgola riconosce la parola giusta e le sostituzioni più comuni (es. treno → “teno”, cane → “tane”). È un allenamento: con la voce di una bambina può sbagliare, e le registrazioni restano da riascoltare.</span></div>
    <div class="card morbida"><label style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="solo-ascolto" style="width:22px;height:22px" ${S.config.riassuntoSoloAscolto ? 'checked' : ''}>
      <span><b>Riassumi la storia: solo ascolto</b><br><small style="color:var(--tenue)">Il racconto non si legge: Virgola lo racconta e basta (più difficile, allena la comprensione all’ascolto).</small></span></label></div>
    <p class="aiuto">Componi e Dillo tu: livello 1 = 2 elementi, 2 = 3 elementi, 3 = 4 elementi, 4 = 5 elementi, 5 = frasi lunghe con due azioni o un perché. Frase scombinata: 1 = frasi corte, 3 = frasi lunghe. Riassumi la storia: 1 = racconti brevi con riassunto guidato, 2-3 = racconti più lunghi con riassunto libero.</p>
    <p class="errore" id="err" role="alert"></p>
    <button class="btn" id="salva" style="align-self:flex-start">Salva</button>`;
  cont.querySelector('#salva').onclick = async (e) => {
    const att = {};
    const livelli = { ...imp.livelli };
    Object.entries(GIOCHI).forEach(([id, g]) => {
      att[id] = cont.querySelector('#att-' + id).checked;
      if (g.livelli) livelli[id] = Number(cont.querySelector('#lv-' + id).value);
    });
    if (!Object.values(att).some(Boolean)) { cont.querySelector('#err').textContent = 'Lascia attiva almeno un’attività.'; return; }
    S.config.attivita = att;
    const suoni = [...cont.querySelectorAll('[data-suono]')].filter((x) => x.checked).map((x) => x.dataset.suono);
    if (!suoni.length) { cont.querySelector('#err').textContent = 'Scegli almeno un suono per la pronuncia.'; return; }
    S.config.suoniPronuncia = suoni;
    S.config.riassuntoSoloAscolto = cont.querySelector('#solo-ascolto').checked;
    S.config.impostazioni = { ...(S.config.impostazioni || {}), livelli };
    e.target.disabled = true;
    try { await salvaConfig(); toast('Attività salvate'); } catch (ex) { cont.querySelector('#err').textContent = ex.message; }
    e.target.disabled = false;
  };
}

// ---------------- Altri esercizi: elenchi modificabili ----------------
const ELENCHI = [
  { k: 'parole', titolo: 'Parole divise in sillabe', uso: 'Battiamo le sillabe, Come comincia?', aiuto: 'Una parola per riga, con le sillabe separate da trattini: ca-ra-mel-la',
    a: (x) => x.sillabe, da: (r) => ({ parola: r.replace(/-/g, ''), sillabe: r }), ok: (r) => /^[^\s-]+(-[^\s-]+)+$/.test(r) },
  { k: 'coppie', titolo: 'Coppie minime', uso: 'Orecchie attente', aiuto: 'Due parole che cambiano per un solo suono, separate da /: cane / pane',
    a: (x) => x.join(' / '), da: (r) => r.split('/').map((t) => t.trim()), ok: (r) => r.split('/').filter((t) => t.trim()).length === 2 },
  { k: 'rime', titolo: 'Rime', uso: 'Le rime di Punto', aiuto: 'Due parole che fanno rima, separate da /: gatto / piatto',
    a: (x) => x.join(' / '), da: (r) => r.split('/').map((t) => t.trim()), ok: (r) => r.split('/').filter((t) => t.trim()).length === 2 },
  { k: 'ripeti', titolo: 'Frasi da ripetere', uso: 'Ripeti con Virgola', aiuto: 'Livello (1-4) | frase: 2 | il cane corre nel prato',
    a: (x) => `${x.livello} | ${x.frase}`, da: (r) => { const [l, f] = r.split('|'); return { livello: Number(l) || 1, frase: (f || '').trim() }; }, ok: (r) => r.includes('|') },
  { k: 'scombinate', titolo: 'Frasi da riordinare', uso: 'Frase scombinata', aiuto: 'Una frase per riga (il livello dipende dalla lunghezza).',
    a: (x) => x, da: (r) => r, ok: (r) => r.split(/\s+/).length >= 3 },
  { k: 'unisci', titolo: 'Frasi da unire', uso: 'Unisci le frasi', aiuto: 'Prima frase | seconda frase | parola giusta | altre parole: Prendo l’ombrello | piove | perché | ma, quindi',
    a: (x) => `${x.a} | ${x.b} | ${x.giusto} | ${(x.altre || []).join(', ')}`, da: (r) => { const [a, b, g, o] = r.split('|').map((t) => (t || '').trim()); return { a, b, giusto: g, altre: (o || '').split(',').map((t) => t.trim()).filter(Boolean) }; }, ok: (r) => r.split('|').length >= 4 },
  { k: 'finisci', titolo: 'Frasi da finire', uso: 'Finisci tu', aiuto: 'L’inizio della frase, una per riga: Sono contenta quando…',
    a: (x) => x, da: (r) => r, ok: (r) => r.length > 3 },
  { k: 'pronuncia', titolo: 'Parole per la pronuncia', uso: 'Pronuncia con Virgola', aiuto: 'Suono | parola | sostituzioni tipiche (parole vere): tr | treno | reno — suoni: sc, sk, z, tr, str, k, ci',
    a: (x) => `${x.suono} | ${x.parola} | ${(x.varianti || []).join(', ')}`, da: (r) => { const [su, p, v] = r.split('|').map((t) => (t || '').trim()); return { suono: su, parola: p, varianti: (v || '').split(',').map((t) => t.trim()).filter(Boolean) }; }, ok: (r) => r.split('|').length >= 2 && Object.keys(SUONI).includes(r.split('|')[0].trim()) },
  { k: 'trasforma', titolo: 'Frasi da trasformare', uso: 'Trasforma', aiuto: 'Frase | frase nuova con ___ | parola giusta | altre: Il gatto dorme | I gatti ___ | dormono | dorme, dormiamo',
    a: (x) => `${x.frase} | ${x.modello} | ${x.giusto} | ${(x.altre || []).join(', ')}`, da: (r) => { const [f, m, g, o] = r.split('|').map((t) => (t || '').trim()); return { frase: f, modello: m, giusto: g, altre: (o || '').split(',').map((t) => t.trim()).filter(Boolean) }; }, ok: (r) => r.split('|').length >= 4 && r.includes('___') }
];

function esercizi(cont) {
  cont.innerHTML = `<p style="margin:0">Qui modifichi i contenuti delle altre attività. Una voce per riga, nel formato indicato.</p>
    ${ELENCHI.map((e) => `<div class="card morbida" style="display:flex;flex-direction:column;gap:8px">
      <h3>${esc(e.titolo)} <small style="font-weight:400;color:var(--tenue)">· ${esc(e.uso)}</small></h3>
      <span class="aiuto">${esc(e.aiuto)}</span>
      <textarea id="el-${e.k}" rows="6" style="font-size:16px">${esc(((S.scene[e.k]) || []).map(e.a).join('\n'))}</textarea></div>`).join('')}
    <p class="errore" id="err" role="alert"></p>
    <button class="btn" id="salva" style="align-self:flex-start">Salva gli esercizi</button>`;
  cont.querySelector('#salva').onclick = async (ev) => {
    const err = cont.querySelector('#err');
    err.textContent = '';
    const nuovi = {};
    for (const e of ELENCHI) {
      const righe = cont.querySelector('#el-' + e.k).value.split('\n').map((r) => r.trim()).filter(Boolean);
      const sbagliata = righe.find((r) => !e.ok(r));
      if (sbagliata) { err.textContent = `${e.titolo}: la riga “${sbagliata}” non è nel formato giusto.`; return; }
      nuovi[e.k] = righe.map(e.da);
    }
    Object.assign(S.scene, nuovi);
    ev.target.disabled = true;
    try { await salvaScene(); toast('Esercizi salvati'); } catch (ex) { err.textContent = ex.message; }
    ev.target.disabled = false;
  };
}

// ---------------- Dispositivi ----------------
function dispositivi(cont) {
  const d = dispositivo() || {};
  const gh = conGitHub();
  cont.innerHTML = `
    <div class="card morbida" style="display:flex;flex-direction:column;gap:8px"><h3>Questo dispositivo</h3>
      <p style="margin:0">${esc(d.nomeDispositivo || '')} · ${d.ruolo === 'genitore' ? 'genitore' : 'bambina'} · ${gh ? `dati su GitHub (${esc(d.owner)}/${esc(d.repo)})` : 'dati solo su questo dispositivo'}</p>
      <p class="aiuto" style="margin:0">Codice interno: ${esc(idDispositivo())}</p>
      <div class="riga-pulsanti">
        ${d.ruolo === 'genitore' ? '<button class="btn secondario piccolo" id="prova">Prova i giochi come bambina</button>' : ''}
        <button class="btn secondario piccolo" id="sync">Sincronizza ora</button>
        <button class="btn secondario piccolo" id="scollega">Scollega questo dispositivo</button>
      </div></div>
    ${gh ? `<div class="card morbida" style="display:flex;flex-direction:column;gap:12px"><h3>Aggiungi un dispositivo di tua figlia</h3>
      <p style="margin:0">Crea su GitHub un token fine-grained solo per quel dispositivo (vedi README), poi generane il codice.</p>
      <div class="campo"><label for="tok">Token del dispositivo</label><input id="tok" type="password" autocomplete="off"><span class="aiuto">Puoi usare anche il tuo token, ma uno separato si può revocare da solo.</span></div>
      <div class="campo"><label for="etich">Nome del dispositivo</label><input id="etich" type="text" placeholder="Chromebook"></div>
      <button class="btn" id="genera" style="align-self:flex-start">Genera QR code</button>
      <div id="qr-box"></div></div>` : `<div class="card morbida"><p style="margin:0">Questo dispositivo usa solo dati locali. Per usare più dispositivi serve la configurazione con GitHub (vedi README).</p></div>`}`;
  const prova = cont.querySelector('#prova');
  if (prova) prova.onclick = () => vai('home');
  cont.querySelector('#sync').onclick = async () => { await sincronizza(); toast('Sincronizzazione fatta'); };
  cont.querySelector('#scollega').onclick = async () => {
    const ok = await finestra({ titolo: 'Scollegare questo dispositivo?', html: '<p>Verranno tolti token e dati salvati qui. I dati su GitHub restano.</p>', pulsanti: [{ testo: 'Annulla', valore: false, classe: 'secondario' }, { testo: 'Scollega', valore: true }] });
    if (!ok) return;
    scollegaDispositivo();
    location.reload();
  };
  const gen = cont.querySelector('#genera');
  if (gen) gen.onclick = async () => {
    const tok = cont.querySelector('#tok').value.trim() || d.token;
    const etich = cont.querySelector('#etich').value.trim() || 'Dispositivo';
    const json = JSON.stringify({ o: d.owner, r: d.repo, t: tok, e: etich });
    const codice = 'PV1:' + btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_');
    if (!window.qrcode) {
      await new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'vendor/qrcode.js'; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
    }
    const qr = window.qrcode(0, 'L');
    qr.addData(codice);
    qr.make();
    cont.querySelector('#qr-box').innerHTML = `<div class="qr">${qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true })}</div>
      <p class="aiuto">Sul dispositivo di tua figlia scegli “È il dispositivo di mia figlia” e inquadra il QR, oppure incolla questo codice:</p>
      <div class="codice" id="codice">${esc(codice)}</div>
      <button class="btn secondario piccolo" id="copia" style="align-self:flex-start">Copia il codice</button>
      <p class="errore">Il codice contiene il token: non condividerlo con altri.</p>`;
    cont.querySelector('#copia').onclick = async () => { try { await navigator.clipboard.writeText(codice); toast('Codice copiato'); } catch { toast('Copia non riuscita: selezionalo a mano'); } };
  };
}

// ---------------- Info ----------------
function info(cont) {
  cont.innerHTML = `<div class="card morbida" style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">
      <img src="img/logo-completo.png" alt="Punto e Virgola" style="width:180px">
      <div style="flex:1;min-width:240px">
        <h3>Punto e Virgola ${VERSIONE}</h3>
        <p>Punto è lo studente, Virgola è la maestra: spiega gli esercizi e assegna le caramelle (da 0 a 10 per esercizio).</p>
        <p class="aiuto">Uso personale e familiare. Non è un dispositivo medico e non sostituisce la logopedista.</p>
      </div></div>
    <div class="card morbida crediti">
      <p>${esc(CREDITI_ARASAAC)}</p>
      <p>Riconoscimento vocale: Vosk (Alpha Cephei, licenza Apache 2.0) tramite vosk-browser. Font: Fredoka e Andika (SIL Open Font License). QR: qrcode-generator e jsQR (licenze MIT/Apache).</p>
    </div>`;
}
