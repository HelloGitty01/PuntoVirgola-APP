// Editor di scene e storie (area genitori).
import { S } from '../state.js';
import { salvaScene, salvaImmagine, urlImmagine } from '../data.js';
import { cerca, urlPittogramma } from '../arasaac.js';
import { esc, ICONE, toast, finestra } from '../ui.js';
import { TIPI } from '../punteggi.js';

const lista = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
const opzioniTipo = (sel) => Object.entries(TIPI).map(([k, t]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${t.nome}</option>`).join('');

// Ridimensiona una foto a max 1280 px e la converte in JPEG.
async function comprimi(file) {
  const bmp = await createImageBitmap(file);
  const scala = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scala); c.height = Math.round(bmp.height * scala);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.85));
}

// Selettore immagine: pittogrammi ARASAAC oppure foto.
export function selettoreImmagine(box, iniziale) {
  let modo = iniziale && iniziale.tipo === 'foto' ? 'foto' : 'arasaac';
  let ids = iniziale && iniziale.tipo === 'arasaac' && iniziale.ids ? iniziale.ids.slice() : [];
  const paroleIniz = iniziale && iniziale.tipo === 'arasaac' ? (iniziale.parole || []) : [];
  let fotoPath = iniziale && iniziale.tipo === 'foto' ? iniziale.path : null;
  let fotoBlob = null;

  box.innerHTML = `<div class="schede" role="tablist">
      <button type="button" data-modo="arasaac" aria-selected="${modo === 'arasaac'}">Pittogrammi</button>
      <button type="button" data-modo="foto" aria-selected="${modo === 'foto'}">Foto</button></div>
    <div data-pannello="arasaac" style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
      <span class="aiuto">Scelti (in ordine, massimo 4):</span>
      <div class="pittogrammi-scelti" data-scelti></div>
      <div style="display:flex;gap:8px"><input type="text" data-cerca placeholder="Cerca una parola, es. gatto"><button type="button" class="btn piccolo" data-vai>Cerca</button></div>
      <div class="risultati-ricerca" data-risultati></div>
    </div>
    <div data-pannello="foto" style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
      <input type="file" accept="image/*" data-file>
      <div data-anteprima></div>
    </div>`;
  const q = (s) => box.querySelector(s);
  const mostraModo = () => {
    box.querySelectorAll('[data-modo]').forEach((b) => b.setAttribute('aria-selected', b.dataset.modo === modo));
    box.querySelectorAll('[data-pannello]').forEach((p) => p.classList.toggle('nascosto', p.dataset.pannello !== modo));
  };
  const disegnaScelti = () => {
    q('[data-scelti]').innerHTML = ids.length
      ? ids.map((id, i) => `<div class="pitto si"><img src="${urlPittogramma(id, 300)}" alt=""><button type="button" class="togli" data-togli="${i}" aria-label="Togli">×</button></div>`).join('')
      : `<span class="aiuto">${paroleIniz.length ? 'Automatici dalle parole: ' + esc(paroleIniz.join(', ')) : 'Nessuno'}</span>`;
  };
  const anteprimaFoto = async () => {
    const a = q('[data-anteprima]');
    if (fotoBlob) a.innerHTML = `<img src="${URL.createObjectURL(fotoBlob)}" alt="" style="max-width:320px;border-radius:12px">`;
    else if (fotoPath) { const u = await urlImmagine(fotoPath); a.innerHTML = u ? `<img src="${u}" alt="" style="max-width:320px;border-radius:12px">` : ''; }
  };
  const cercaOra = async () => {
    const t = q('[data-cerca]').value.trim();
    if (!t) return;
    const r = q('[data-risultati]');
    r.textContent = 'Cerco…';
    const trovati = await cerca(t);
    r.innerHTML = trovati.length ? trovati.slice(0, 18).map((id) => `<button type="button" class="pitto" data-id="${id}"><img src="${urlPittogramma(id, 300)}" alt=""></button>`).join('') : 'Nessun risultato (serve la connessione).';
  };
  box.addEventListener('click', (e) => {
    const m = e.target.closest('[data-modo]');
    if (m) { modo = m.dataset.modo; mostraModo(); return; }
    const t = e.target.closest('[data-togli]');
    if (t) { ids.splice(+t.dataset.togli, 1); disegnaScelti(); return; }
    const p = e.target.closest('[data-id]');
    if (p && ids.length < 4) { ids.push(+p.dataset.id); disegnaScelti(); return; }
    if (e.target.closest('[data-vai]')) cercaOra();
  });
  q('[data-cerca]').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); cercaOra(); } });
  q('[data-file]').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    fotoBlob = await comprimi(f);
    anteprimaFoto();
  });
  mostraModo(); disegnaScelti(); anteprimaFoto();

  return {
    async valore(paroleRiserva = []) {
      if (modo === 'foto') {
        if (fotoBlob) { fotoPath = await salvaImmagine(fotoBlob); fotoBlob = null; }
        return fotoPath ? { tipo: 'foto', path: fotoPath } : null;
      }
      if (ids.length) return { tipo: 'arasaac', ids: ids.slice(), parole: paroleIniz };
      const parole = paroleIniz.length ? paroleIniz : paroleRiserva;
      return parole.length ? { tipo: 'arasaac', parole } : null;
    }
  };
}

function rigaElemento(e = { tipo: 'chi', testo: '', accettate: [], domanda: '' }) {
  return `<div class="elemento-ed" data-tipo="${e.tipo}" data-elemento>
    <div class="campo"><label>Tipo</label><select data-f="tipo">${opzioniTipo(e.tipo)}</select></div>
    <div class="campo"><label>Testo nella frase</label><input type="text" data-f="testo" value="${esc(e.testo)}" placeholder="es. Il gatto"></div>
    <div class="campo"><label>Domanda di Virgola</label><input type="text" data-f="domanda" value="${esc(e.domanda || '')}" placeholder="es. Chi c'è nella figura?"></div>
    <div class="campo" style="grid-column:1/-1"><label>Risposte accettate (separate da virgola)</label><input type="text" data-f="accettate" value="${esc((e.accettate || []).join(', '))}" placeholder="gatto, micio, gattino"><span class="aiuto">Con * accetti tutte le forme: mangi* = mangia, mangiano, mangiava…</span></div>
    <div class="azioni"><button type="button" class="link" data-rimuovi-el>Rimuovi elemento</button></div></div>`;
}
function rigaDistrattore(d = { tipo: 'fa', testo: '' }) {
  return `<div style="display:flex;gap:8px;align-items:center" data-distrattore><select data-f="tipo" style="width:150px">${opzioniTipo(d.tipo)}</select><input type="text" data-f="testo" value="${esc(d.testo)}" placeholder="es. dorme"><button type="button" class="btn-tondo" data-rimuovi-di aria-label="Rimuovi">${ICONE.cestino}</button></div>`;
}

export function editorScena(app, scena, alTermine) {
  const s = scena ? JSON.parse(JSON.stringify(scena)) : { livello: 1, elementi: [{ tipo: 'chi', testo: '' }, { tipo: 'fa', testo: '' }], distrattori: [] };
  app.innerHTML = `<main class="schermata pa">
    <div class="barra"><button class="btn-tondo" id="indietro" aria-label="Indietro">${ICONE.indietro}</button><h1>${scena ? 'Modifica scena' : 'Nuova scena'}</h1></div>
    <form id="f" style="display:flex;flex-direction:column;gap:16px">
      <div class="card morbida" style="display:grid;grid-template-columns:1fr 160px;gap:12px">
        <div class="campo"><label for="frase">Frase modello</label><input id="frase" type="text" value="${esc(s.frase || '')}" placeholder="Il gatto mangia in cucina"></div>
        <div class="campo"><label for="livello">Livello</label><select id="livello">${[1, 2, 3, 4, 5].map((l) => `<option ${l === (s.livello || 1) ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      </div>
      <div class="card morbida"><h3>Immagine</h3><div id="img"></div></div>
      <div class="card morbida" style="display:flex;flex-direction:column;gap:12px"><h3>Elementi della frase (in ordine)</h3>
        <div id="elementi" style="display:flex;flex-direction:column;gap:12px">${s.elementi.map(rigaElemento).join('')}</div>
        <button type="button" class="btn secondario piccolo" id="add-el" style="align-self:flex-start">${ICONE.piu} Aggiungi elemento</button></div>
      <div class="card morbida" style="display:flex;flex-direction:column;gap:10px"><h3>Mattoncini sbagliati (distrattori)</h3>
        <div id="distrattori" style="display:flex;flex-direction:column;gap:8px">${(s.distrattori || []).map(rigaDistrattore).join('')}</div>
        <button type="button" class="btn secondario piccolo" id="add-di" style="align-self:flex-start">${ICONE.piu} Aggiungi distrattore</button></div>
      <div class="card morbida" style="display:flex;flex-direction:column;gap:12px"><h3>Per “Descrivi la scena”</h3>
        <div class="campo"><label for="voc">Vocabolario della scena (separato da virgola)</label><textarea id="voc">${esc((s.vocabolario || []).join(', '))}</textarea></div>
        <div class="campo"><label for="seg">Parole segrete possibili</label><input id="seg" type="text" value="${esc((s.parolaSegreta || []).join(', '))}"></div></div>
      <p class="errore" id="err" role="alert"></p>
      <div class="riga-pulsanti">
        <button class="btn" type="submit" id="salva">Salva scena</button>
        ${scena ? `<button class="btn secondario" type="button" id="elimina">${ICONE.cestino} Elimina</button>` : ''}
      </div>
    </form></main>`;
  const sel = selettoreImmagine(app.querySelector('#img'), s.immagine);
  const elBox = app.querySelector('#elementi');
  const diBox = app.querySelector('#distrattori');
  app.querySelector('#indietro').onclick = () => alTermine(false);
  app.querySelector('#add-el').onclick = () => elBox.insertAdjacentHTML('beforeend', rigaElemento({ tipo: 'dove', testo: '' }));
  app.querySelector('#add-di').onclick = () => diBox.insertAdjacentHTML('beforeend', rigaDistrattore());
  app.addEventListener('change', (e) => {
    if (e.target.matches('[data-elemento] [data-f="tipo"]')) e.target.closest('[data-elemento]').dataset.tipo = e.target.value;
  });
  app.addEventListener('click', (e) => {
    if (e.target.closest('[data-rimuovi-el]')) e.target.closest('[data-elemento]').remove();
    if (e.target.closest('[data-rimuovi-di]')) e.target.closest('[data-distrattore]').remove();
  });
  const el = app.querySelector('#elimina');
  if (el) el.onclick = async () => {
    const ok = await finestra({ titolo: 'Eliminare la scena?', pulsanti: [{ testo: 'Annulla', valore: false, classe: 'secondario' }, { testo: 'Elimina', valore: true }] });
    if (!ok) return;
    S.scene.scene = S.scene.scene.filter((x) => x.id !== scena.id);
    try { await salvaScene(); toast('Scena eliminata'); alTermine(true); } catch (ex) { app.querySelector('#err').textContent = ex.message; }
  };
  app.querySelector('#f').onsubmit = async (e) => {
    e.preventDefault();
    const err = app.querySelector('#err');
    const elementi = [...elBox.querySelectorAll('[data-elemento]')].map((r) => ({
      tipo: r.querySelector('[data-f="tipo"]').value,
      testo: r.querySelector('[data-f="testo"]').value.trim(),
      domanda: r.querySelector('[data-f="domanda"]').value.trim(),
      accettate: lista(r.querySelector('[data-f="accettate"]').value)
    })).filter((x) => x.testo);
    if (elementi.length < 2) { err.textContent = 'Servono almeno due elementi con il testo.'; return; }
    const bt = app.querySelector('#salva'); bt.disabled = true; bt.textContent = 'Salvo…';
    try {
      const frase = app.querySelector('#frase').value.trim() || elementi.map((x) => x.testo).join(' ');
      const nuova = {
        ...s,
        id: s.id || 's' + Date.now().toString(36),
        livello: Number(app.querySelector('#livello').value),
        frase,
        elementi,
        distrattori: [...diBox.querySelectorAll('[data-distrattore]')].map((r) => ({ tipo: r.querySelector('[data-f="tipo"]').value, testo: r.querySelector('[data-f="testo"]').value.trim() })).filter((x) => x.testo),
        vocabolario: lista(app.querySelector('#voc').value),
        parolaSegreta: lista(app.querySelector('#seg').value)
      };
      nuova.immagine = await sel.valore(elementi.map((x) => x.accettate[0] || x.testo).map((x) => x.replace('*', '')));
      const i = S.scene.scene.findIndex((x) => x.id === nuova.id);
      if (i >= 0) S.scene.scene[i] = nuova; else S.scene.scene.push(nuova);
      await salvaScene();
      toast('Scena salvata');
      alTermine(true);
    } catch (ex) {
      err.textContent = ex.stato === 409 ? 'Le scene sono state modificate da un altro dispositivo. Torna indietro e riapri l’area genitori.' : ex.message;
      bt.disabled = false; bt.textContent = 'Salva scena';
    }
  };
}

export function editorStoria(app, storia, alTermine) {
  const s = storia ? JSON.parse(JSON.stringify(storia)) : { livello: 1, vignette: [{}, {}, {}, {}], connettivi: ['prima', 'poi', 'dopo', 'alla fine'] };
  while (s.vignette.length < 4) s.vignette.push({});
  app.innerHTML = `<main class="schermata pa">
    <div class="barra"><button class="btn-tondo" id="indietro" aria-label="Indietro">${ICONE.indietro}</button><h1>${storia ? 'Modifica storia' : 'Nuova storia'}</h1></div>
    <form id="f" style="display:flex;flex-direction:column;gap:16px">
      <div class="card morbida" style="display:grid;grid-template-columns:1fr 160px;gap:12px">
        <div class="campo"><label for="titolo">Titolo</label><input id="titolo" type="text" value="${esc(s.titolo || '')}" required></div>
        <div class="campo"><label for="livello">Livello</label><select id="livello">${[1, 2, 3, 4, 5].map((l) => `<option ${l === (s.livello || 1) ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="campo" style="grid-column:1/-1"><label for="ponti">Parole ponte (separate da virgola)</label><input id="ponti" type="text" value="${esc((s.connettivi || []).join(', '))}"></div>
      </div>
      ${s.vignette.map((v, i) => `<div class="card morbida" style="display:flex;flex-direction:column;gap:10px"><h3>Vignetta ${i + 1}</h3>
        <div class="campo"><label>Cosa succede</label><input type="text" data-testo="${i}" value="${esc(v.testo || '')}" placeholder="La bambina pianta un seme"></div>
        <div class="campo"><label>Parole chiave (separate da virgola)</label><input type="text" data-parole="${i}" value="${esc((v.parole || []).join(', '))}" placeholder="seme, piantare"></div>
        <div data-img="${i}"></div></div>`).join('')}
      <p class="errore" id="err" role="alert"></p>
      <div class="riga-pulsanti"><button class="btn" type="submit" id="salva">Salva storia</button>
        ${storia ? `<button class="btn secondario" type="button" id="elimina">${ICONE.cestino} Elimina</button>` : ''}</div>
    </form></main>`;
  const selettori = s.vignette.map((v, i) => selettoreImmagine(app.querySelector(`[data-img="${i}"]`), v.immagine));
  app.querySelector('#indietro').onclick = () => alTermine(false);
  const el = app.querySelector('#elimina');
  if (el) el.onclick = async () => {
    if (!confirm('Eliminare la storia?')) return;
    S.scene.storie = (S.scene.storie || []).filter((x) => x.id !== storia.id);
    await salvaScene(); toast('Storia eliminata'); alTermine(true);
  };
  app.querySelector('#f').onsubmit = async (e) => {
    e.preventDefault();
    const err = app.querySelector('#err');
    const bt = app.querySelector('#salva'); bt.disabled = true; bt.textContent = 'Salvo…';
    try {
      const vignette = [];
      for (let i = 0; i < s.vignette.length; i++) {
        const testo = app.querySelector(`[data-testo="${i}"]`).value.trim();
        const parole = lista(app.querySelector(`[data-parole="${i}"]`).value);
        if (!testo) continue;
        vignette.push({ testo, parole, immagine: await selettori[i].valore(parole) });
      }
      if (vignette.length < 3) throw new Error('Servono almeno 3 vignette con il testo.');
      const nuova = { ...s, id: s.id || 'h' + Date.now().toString(36), titolo: app.querySelector('#titolo').value.trim(), livello: Number(app.querySelector('#livello').value), connettivi: lista(app.querySelector('#ponti').value), vignette };
      S.scene.storie = S.scene.storie || [];
      const i = S.scene.storie.findIndex((x) => x.id === nuova.id);
      if (i >= 0) S.scene.storie[i] = nuova; else S.scene.storie.push(nuova);
      await salvaScene();
      toast('Storia salvata');
      alTermine(true);
    } catch (ex) {
      err.textContent = ex.message;
      bt.disabled = false; bt.textContent = 'Salva storia';
    }
  };
}

// ---------- Racconti per "Riassumi la storia" ----------
const TIPI_ELEMENTO = { chi: 'Chi', dove: 'Dove', quando: 'Quando', problema: 'Problema', azione: 'Che cosa succede', fine: 'Come finisce' };
function rigaElementoRacconto(e = { tipo: 'chi', nome: '', parole: [], domanda: '' }) {
  const base = String(e.tipo || 'chi').replace(/\d+$/, '');
  return `<div class="card morbida" data-el-racconto style="display:grid;grid-template-columns:170px 1fr;gap:10px">
    <div class="campo"><label>Tipo</label><select data-f="tipo">${Object.entries(TIPI_ELEMENTO).map(([k, t]) => `<option value="${k}" ${k === base ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    <div class="campo"><label>Elemento (come lo vedrà la bambina quando l’ha trovato)</label><input type="text" data-f="nome" value="${esc(e.nome)}" placeholder="La volpe Rina"></div>
    <div class="campo" style="grid-column:1/-1"><label>Parole che lo provano (separate da virgola; * = tutte le forme; a+b = servono entrambe)</label><input type="text" data-f="parole" value="${esc((e.parole || []).join(', '))}" placeholder="volpe, rina"></div>
    <div class="campo" style="grid-column:1/-1"><label>Domanda di Virgola se manca</label><input type="text" data-f="domanda" value="${esc(e.domanda || '')}" placeholder="Chi è la protagonista della storia?"></div>
    <div style="grid-column:1/-1;display:flex;justify-content:flex-end"><button type="button" class="link" data-rimuovi-er>Rimuovi elemento</button></div></div>`;
}

export function editorRacconto(app, racconto, alTermine) {
  const r = racconto ? JSON.parse(JSON.stringify(racconto)) : { livello: 1, elementi: [{ tipo: 'chi' }, { tipo: 'dove' }, { tipo: 'problema' }, { tipo: 'fine' }] };
  app.innerHTML = `<main class="schermata pa">
    <div class="barra"><button class="btn-tondo" id="indietro" aria-label="Indietro">${ICONE.indietro}</button><h1>${racconto ? 'Modifica racconto' : 'Nuovo racconto'}</h1></div>
    <form id="f" style="display:flex;flex-direction:column;gap:16px">
      <div class="card morbida" style="display:grid;grid-template-columns:1fr 160px;gap:12px">
        <div class="campo"><label for="titolo">Titolo</label><input id="titolo" type="text" value="${esc(r.titolo || '')}" required></div>
        <div class="campo"><label for="livello">Livello</label><select id="livello">${[1, 2, 3].map((l) => `<option ${l === (r.livello || 1) ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="campo" style="grid-column:1/-1"><label for="testo">Testo del racconto</label><textarea id="testo" rows="10" required>${esc(r.testo || '')}</textarea>
          <span class="aiuto">Livello 1: circa 80 parole, riassunto guidato con domande. Livelli 2 e 3: racconti più lunghi, riassunto libero.</span></div>
      </div>
      <div class="card morbida" style="display:flex;flex-direction:column;gap:12px"><h3>Elementi essenziali (nell’ordine della storia)</h3>
        <div id="elementi" style="display:flex;flex-direction:column;gap:12px">${(r.elementi || []).map(rigaElementoRacconto).join('')}</div>
        <button type="button" class="btn secondario piccolo" id="add" style="align-self:flex-start">${ICONE.piu} Aggiungi elemento</button></div>
      <p class="errore" id="err" role="alert"></p>
      <div class="riga-pulsanti"><button class="btn" type="submit" id="salva">Salva racconto</button>
        ${racconto ? `<button class="btn secondario" type="button" id="elimina">${ICONE.cestino} Elimina</button>` : ''}</div>
    </form></main>`;
  const box = app.querySelector('#elementi');
  app.querySelector('#indietro').onclick = () => alTermine(false);
  app.querySelector('#add').onclick = () => box.insertAdjacentHTML('beforeend', rigaElementoRacconto({ tipo: 'azione' }));
  app.addEventListener('click', (e) => { if (e.target.closest('[data-rimuovi-er]')) e.target.closest('[data-el-racconto]').remove(); });
  const el = app.querySelector('#elimina');
  if (el) el.onclick = async () => {
    if (!confirm('Eliminare il racconto?')) return;
    S.scene.racconti = (S.scene.racconti || []).filter((x) => x.id !== racconto.id);
    await salvaScene(); toast('Racconto eliminato'); alTermine(true);
  };
  app.querySelector('#f').onsubmit = async (e) => {
    e.preventDefault();
    const err = app.querySelector('#err');
    const elementi = [...box.querySelectorAll('[data-el-racconto]')].map((x) => ({
      tipo: x.querySelector('[data-f="tipo"]').value,
      nome: x.querySelector('[data-f="nome"]').value.trim(),
      parole: lista(x.querySelector('[data-f="parole"]').value),
      domanda: x.querySelector('[data-f="domanda"]').value.trim()
    })).filter((x) => x.nome && x.parole.length);
    if (elementi.length < 3) { err.textContent = 'Servono almeno 3 elementi, ognuno con il nome e almeno una parola.'; return; }
    const nuovo = { ...r, id: r.id || 'rc' + Date.now().toString(36), titolo: app.querySelector('#titolo').value.trim(), livello: Number(app.querySelector('#livello').value), testo: app.querySelector('#testo').value.trim(), elementi: elementi.map((x) => ({ ...x, domanda: x.domanda || `Nel tuo riassunto manca: ${x.nome}?` })) };
    S.scene.racconti = S.scene.racconti || [];
    const i = S.scene.racconti.findIndex((x) => x.id === nuovo.id);
    if (i >= 0) S.scene.racconti[i] = nuovo; else S.scene.racconti.push(nuovo);
    const bt = app.querySelector('#salva'); bt.disabled = true;
    try { await salvaScene(); toast('Racconto salvato'); alTermine(true); } catch (ex) { err.textContent = ex.message; bt.disabled = false; }
  };
}
