// Attività "Suoni e parole": orecchie attente, sillabe, suono iniziale, rime, ripeti con Virgola.
import { S, impostazioni } from '../state.js';
import { esc, ICONE, virgolaDice, aggiornaFumetto, collegaFumetti, riquadroImmagine, riempiImmagini, mescola, attendi } from '../ui.js';
import { puntiScelta, INCORAGGIAMENTI, SUONI } from '../punteggi.js';
import { parole, normalizza } from '../match.js';
import { parla } from '../tts.js';
import { collegaMicrofono, htmlMic, htmlRegistrazione, collegaRegistrazione, messaggioErroreVoce } from './dillo.js';

const caso = (a) => a[Math.floor(Math.random() * a.length)];
const img = (p) => ({ tipo: 'arasaac', parole: [p] });

// Scelta tra figure/testi: gestisce tentativi, evidenziazione e punteggio.
function scelta(area, { intro, sinistra, opzioni, conFigure = true, mostraEtichette = true, alTocco, giusta, dopoGiusta, fine, rileggi }) {
  const leggi = impostazioni().letturaAutomatica;
  let tentativi = 0, finito = false;
  area.innerHTML = `<div class="due-colonne">
    <div class="colonna">${sinistra}${virgolaDice(intro)}</div>
    <div class="colonna" style="justify-content:center;gap:22px">
      ${rileggi ? `<button class="btn secondario" id="rileggi" style="align-self:flex-start">${ICONE.altoparlante} Ascolta di nuovo</button>` : ''}
      <div class="opzioni">${opzioni.map((o, i) => `<button class="opzione ${conFigure ? '' : 'testo'}" data-o="${i}">
        ${conFigure ? riquadroImmagine(img(o), 'scena-img') : ''}
        <span class="etichetta-parola">${!conFigure || mostraEtichette ? esc(o) : ''}</span></button>`).join('')}</div>
    </div></div>`;
  riempiImmagini(area);
  collegaFumetti(area);
  if (leggi || rileggi) setTimeout(() => (rileggi ? rileggi() : parla(intro)), 400);
  const r = area.querySelector('#rileggi');
  if (r) r.onclick = () => rileggi();
  area.querySelector('.opzioni').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-o]');
    if (!b || finito || b.classList.contains('sbagliata')) return;
    const o = opzioni[+b.dataset.o];
    tentativi++;
    if (alTocco) alTocco(o);
    if (o !== giusta) {
      b.classList.remove('no'); void b.offsetWidth; b.classList.add('no', 'sbagliata');
      if (conFigure) b.querySelector('.etichetta-parola').textContent = o;
      return;
    }
    finito = true;
    b.classList.add('giusta');
    b.parentNode.querySelectorAll('[data-o]').forEach((x) => { if (x !== b) x.disabled = true; });
    if (conFigure) area.querySelectorAll('[data-o]').forEach((x) => { x.querySelector('.etichetta-parola').textContent = opzioni[+x.dataset.o]; });
    const msg = dopoGiusta(tentativi);
    aggiornaFumetto(area, msg, { leggi: false, allegro: true });
    parla(msg);
    await attendi(900);
    fine({ punteggio: puntiScelta(tentativi), tentativi });
  });
}

// ---------- Orecchie attente (coppie minime) ----------
export function coppie(area, { voce, fine }) {
  const [a, b] = voce.coppia;
  const bersaglio = Math.random() < 0.5 ? a : b;
  const altro = bersaglio === a ? b : a;
  const altre = (S.scene.coppie || []).flat().filter((w) => w !== a && w !== b);
  const opzioni = mescola([a, b, caso(altre) || 'sole']);
  const intro = `Ascolta bene e tocca la figura giusta: ${bersaglio}!`;
  scelta(area, {
    intro,
    sinistra: `<div class="card" style="text-align:center;display:flex;flex-direction:column;gap:12px;align-items:center">
      <img src="img/punto.png" alt="Punto che ascolta" style="width:min(220px,50%)">
      <span class="parola-grande">?</span><span style="color:var(--tenue)">La parola la dice Virgola: ascolta con attenzione!</span></div>`,
    opzioni, mostraEtichette: false, giusta: bersaglio,
    rileggi: () => parla(`Tocca: ${bersaglio}.`, { velocita: 0.85 }),
    alTocco: (o) => { if (o !== bersaglio) parla(`Questo è ${o}. Ascolta ancora: ${bersaglio}.`); },
    dopoGiusta: () => `${caso(INCORAGGIAMENTI)} ${bersaglio}! Senti la differenza? ${bersaglio}, ${altro}.`,
    fine
  });
}

// ---------- Come comincia? (sillaba iniziale) ----------
export function iniziale(area, { voce, fine }) {
  const sill = voce.sillabe.split('-');
  const giusta = sill[0];
  const altre = mescola([...new Set((S.scene.parole || []).map((p) => p.sillabe.split('-')[0]).filter((x) => normalizza(x) !== normalizza(giusta)))]).slice(0, 2);
  const opzioni = mescola([giusta, ...altre]);
  scelta(area, {
    intro: `Questo è ${voce.parola}. Con quale suono comincia?`,
    sinistra: `${riquadroImmagine(img(voce.parola), 'scena-img figura-grande')}<div class="parola-grande">_ ${esc(sill.slice(1).join(''))}</div>`,
    opzioni, conFigure: false, giusta,
    alTocco: (o) => parla(o),
    dopoGiusta: () => `Sì! ${voce.parola} comincia con ${giusta}. ${sill.join(', ')}.`,
    fine
  });
}

// ---------- Le rime di Punto ----------
export function rime(area, { voce, fine }) {
  const [w, rima] = voce.coppia;
  const altre = mescola((S.scene.rime || []).flat().filter((x) => x !== w && x !== rima && normalizza(x).slice(-3) !== normalizza(rima).slice(-3))).slice(0, 2);
  const opzioni = mescola([rima, ...altre]);
  scelta(area, {
    intro: `Quale parola fa rima con ${w}?`,
    sinistra: `${riquadroImmagine(img(w), 'scena-img figura-grande')}<div class="parola-grande">${esc(w)}</div>`,
    opzioni, giusta: rima,
    alTocco: (o) => parla(o),
    dopoGiusta: () => `${caso(INCORAGGIAMENTI)} ${w}, ${rima}: finiscono allo stesso modo!`,
    fine
  });
}

// ---------- Battiamo le sillabe ----------
export function sillabe(area, { voce, fine }) {
  const sill = voce.sillabe.split('-');
  let colpi = 0, prove = 0, finito = false;
  const leggi = impostazioni().letturaAutomatica;
  const intro = `Questa parola è ${voce.parola}. Batti sul tamburo un colpo per ogni pezzetto, poi tocca Fatto!`;
  area.innerHTML = `<div class="due-colonne">
    <div class="colonna">${riquadroImmagine(img(voce.parola), 'scena-img figura-grande')}
      <div class="parola-grande" id="parola">${esc(voce.parola)}</div>${virgolaDice(intro)}</div>
    <div class="colonna" style="align-items:center;justify-content:center;gap:22px">
      <button class="btn secondario" id="ascolta">${ICONE.altoparlante} Ascolta la parola</button>
      <button class="tamburo" id="tamburo" aria-label="Tamburo: tocca per ogni sillaba">BUM!</button>
      <div class="colpi" id="colpi" aria-live="polite"></div>
      <div class="riga-pulsanti" style="justify-content:center">
        <button class="btn secondario" id="ricomincia">Ricomincia</button>
        <button class="btn arancio grande" id="fatto">Fatto!</button>
      </div>
    </div></div>`;
  riempiImmagini(area);
  collegaFumetti(area);
  if (leggi) setTimeout(() => parla(intro), 400);
  const disegna = () => { area.querySelector('#colpi').innerHTML = '<span></span>'.repeat(colpi); };
  let ctxAudio = null;
  const bum = () => {
    try {
      ctxAudio = ctxAudio || new (window.AudioContext || window.webkitAudioContext)();
      const o = ctxAudio.createOscillator(), g = ctxAudio.createGain();
      o.frequency.setValueAtTime(150, ctxAudio.currentTime);
      o.frequency.exponentialRampToValueAtTime(60, ctxAudio.currentTime + 0.2);
      g.gain.setValueAtTime(0.6, ctxAudio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctxAudio.currentTime + 0.25);
      o.connect(g); g.connect(ctxAudio.destination); o.start(); o.stop(ctxAudio.currentTime + 0.26);
    } catch {}
  };
  area.querySelector('#tamburo').onclick = (e) => {
    if (finito || colpi >= 10) return;
    colpi++; disegna(); bum();
    e.currentTarget.classList.add('colpo'); setTimeout(() => e.currentTarget && e.currentTarget.classList && e.currentTarget.classList.remove('colpo'), 120);
  };
  area.querySelector('#ascolta').onclick = () => parla(voce.parola, { velocita: 0.8 });
  area.querySelector('#ricomincia').onclick = () => { colpi = 0; disegna(); };
  area.querySelector('#fatto').onclick = async () => {
    if (finito || !colpi) return;
    prove++;
    const giusto = colpi === sill.length;
    if (!giusto && prove < 2) {
      aggiornaFumetto(area, `Hai battuto ${colpi} ${colpi === 1 ? 'colpo' : 'colpi'}. Riproviamo: ascolta piano piano. ${sill.join('... ')}.`, { leggi: true });
      colpi = 0; disegna();
      return;
    }
    finito = true;
    area.querySelector('#parola').innerHTML = `<div class="sillabe-vis">${sill.map((x) => `<span>${esc(x)}</span>`).join('')}</div>`;
    const msg = giusto ? `${caso(INCORAGGIAMENTI)} ${voce.parola} ha ${sill.length} sillabe:` : `${voce.parola} ha ${sill.length} sillabe, contiamole insieme:`;
    aggiornaFumetto(area, `${msg} ${sill.join(' - ')}`, { leggi: false, allegro: giusto });
    parla(`${msg} ${sill.join('... ')}.`);
    await attendi(900);
    fine({ punteggio: giusto ? (prove === 1 ? 10 : 6) : 2, colpi, sillabe: sill.length, prove });
  };
  return () => { if (ctxAudio) ctxAudio.close().catch(() => {}); };
}

// ---------- Ripeti con Virgola ----------
export function ripeti(area, { voce, fine }) {
  const tutte = voce.frase.split(/\s+/);
  let tentativi = 0, finito = false, migliore = 0;
  const leggi = impostazioni().letturaAutomatica;
  area.innerHTML = `<div class="due-colonne">
    <div class="colonna">
      <div class="card" style="display:flex;flex-direction:column;gap:14px">
        <span style="color:var(--tenue)">Ascolta Virgola e ripeti:</span>
        <div class="parole-ripeti" id="parole">${voce.frase.split(/\s+/).map((w, i) => `<span data-i="${i}">${esc(w)}</span>`).join('')}</div>
        <button class="btn secondario" id="ascolta" style="align-self:flex-start">${ICONE.altoparlante} Ascolta di nuovo</button>
      </div>
      <div class="card morbida"><span style="color:var(--tenue)">Hai detto:</span><div class="trascrizione" id="trascr"></div></div>
    </div>
    <div class="colonna">
      ${virgolaDice('Ascolta bene e poi ripeti dopo di me!')}
      <div style="margin-top:auto;display:flex;flex-direction:column;gap:14px;align-items:center">${htmlMic()}${htmlRegistrazione()}</div>
    </div></div>`;
  collegaFumetti(area);
  const reg = collegaRegistrazione(area);
  const dici = () => parla(voce.frase, { velocita: 0.85 });
  setTimeout(() => (leggi ? parla('Ascolta bene e poi ripeti dopo di me!').then(dici) : dici()), 400);
  area.querySelector('#ascolta').onclick = dici;
  const segna = (testo) => {
    const toks = parole(testo);
    let trovate = 0;
    area.querySelectorAll('#parole span').forEach((s, i) => {
      const w = normalizza(tutte[i] || '').split(' ').pop();
      const ok = !!w && toks.includes(w);
      s.classList.toggle('ok', ok);
      if (ok) trovate++;
    });
    return trovate / Math.max(1, tutte.length);
  };
  const fermaMic = collegaMicrofono(area, {
    suTesto: (t) => { area.querySelector('#trascr').textContent = t; segna(t); },
    suErrore: (e) => aggiornaFumetto(area, messaggioErroreVoce(e), { leggi }),
    suFine: async ({ testo, audio }) => {
      reg.imposta(audio);
      if (!testo) { aggiornaFumetto(area, 'Non ho sentito bene. Riprova!', { leggi }); return; }
      tentativi++;
      area.querySelector('#trascr').textContent = testo;
      const r = segna(testo);
      migliore = Math.max(migliore, r);
      if (migliore >= 0.9 || tentativi >= 2) return concludi();
      aggiornaFumetto(area, 'Quasi! Riascolta e riprova: le parole verdi le hai già dette.', { leggi });
      await attendi(1200);
      dici();
    }
  });
  async function concludi() {
    if (finito) return;
    finito = true;
    const punti = Math.max(0, Math.round(10 * migliore) - (tentativi > 1 && migliore < 0.9 ? 2 : 0));
    const msg = migliore >= 0.9 ? `${caso(INCORAGGIAMENTI)} Hai ripetuto tutta la frase!` : 'Bel lavoro! Ascoltala ancora una volta.';
    aggiornaFumetto(area, msg, { leggi: false, allegro: migliore >= 0.9 });
    parla(msg).then(() => { if (migliore < 0.9 && finito) parla(voce.frase, { velocita: 0.85 }); });
    await attendi(900);
    fine({ punteggio: punti, tentativi, frasi: [area.querySelector('#trascr').textContent] });
  }
  return () => { fermaMic(); reg.libera(); };
}

// ---------- Pronuncia con Virgola ----------
// Il riconoscitore sceglie solo tra la parola giusta e le sue sostituzioni tipiche (es. treno / teno),
// così Virgola può dire "ho sentito teno". È un allenamento: non è una valutazione clinica.
export function pronuncia(area, { voce, fine }) {
  const suono = SUONI[voce.suono] || { nome: voce.suono, segno: null };
  const varianti = (voce.varianti || []).map((v) => v.toLowerCase());
  const target = voce.parola.toLowerCase();
  let tentativi = 0, nonCapito = 0, finito = false;
  const sentite = [];
  const leggi = impostazioni().letturaAutomatica;
  const evid = suono.segno ? esc(voce.parola).replace(suono.segno, (m) => `<span style="color:var(--arancio);text-decoration:underline;text-decoration-thickness:4px">${m}</span>`) : esc(voce.parola);
  const intro = `Allenamento ${suono.nome}! Ascolta bene e poi dì con me: ${voce.parola}.`;
  area.innerHTML = `<div class="due-colonne">
    <div class="colonna">${riquadroImmagine(img(voce.parola), 'scena-img figura-grande')}
      <div class="parola-grande" style="font-size:clamp(44px,6vw,72px)">${evid}</div></div>
    <div class="colonna">${virgolaDice(intro)}
      <button class="btn secondario" id="ascolta" style="align-self:flex-start">${ICONE.altoparlante} Ascolta Virgola</button>
      <div class="card morbida" style="text-align:center"><span style="color:var(--tenue)">Virgola ha sentito:</span><div class="trascrizione" id="trascr" style="font-size:30px"></div></div>
      <div style="margin-top:auto;display:flex;flex-direction:column;gap:14px;align-items:center">${htmlMic()}${htmlRegistrazione()}</div>
    </div></div>`;
  riempiImmagini(area);
  collegaFumetti(area);
  const reg = collegaRegistrazione(area);
  const dici = () => parla(voce.parola, { velocita: 0.75 });
  setTimeout(() => (leggi ? parla(intro) : dici()), 400);
  area.querySelector('#ascolta').onclick = dici;

  const fermaMic = collegaMicrofono(area, {
    grammatica: () => [target, ...varianti],
    suTesto: (t) => { area.querySelector('#trascr').textContent = t.replace('[unk]', '…'); },
    suErrore: (e) => aggiornaFumetto(area, messaggioErroreVoce(e), { leggi }),
    suFine: async ({ testo, audio, parole: pc }) => {
      reg.imposta(audio);
      const toks = parole(testo);
      const conf = (pc || []).filter((w) => normalizza(w.word) === normalizza(target)).map((w) => w.conf);
      const detto = toks.includes(normalizza(target));
      const sostituto = varianti.find((v) => toks.includes(normalizza(v)));
      if (!detto && !sostituto) {
        nonCapito++;
        area.querySelector('#trascr').textContent = '…';
        if (nonCapito < 3) { aggiornaFumetto(area, 'Non ho capito bene. Avvicinati e riprova un po’ più forte!', { leggi }); return; }
      }
      tentativi++;
      const sicuro = detto && (!conf.length || Math.max(...conf) >= 0.55);
      sentite.push(detto ? target : sostituto || '?');
      area.querySelector('#trascr').textContent = detto ? voce.parola : sostituto || '…';
      if (sicuro) return concludi(true);
      if (tentativi >= 3) return concludi(false);
      let msg;
      if (sostituto) msg = `Mi è sembrato di sentire "${sostituto}". Ascolta bene la ${suono.nome}: ${voce.parola}. Riprova!`;
      else if (detto) msg = `Quasi! Ripetiamo piano piano: ${voce.parola}.`;
      else msg = `Riproviamo insieme: ${voce.parola}.`;
      aggiornaFumetto(area, msg, { leggi: false });
      await parla(msg);
    }
  });

  async function concludi(riuscita) {
    if (finito) return;
    finito = true;
    const punti = riuscita ? [10, 8, 6][tentativi - 1] ?? 6 : 3;
    const msg = riuscita ? `${caso(INCORAGGIAMENTI)} Hai detto proprio ${voce.parola}!` : `Brava, ci hai provato tanto! Ci alleniamo ancora la prossima volta: ${voce.parola}.`;
    aggiornaFumetto(area, msg, { leggi: false, allegro: riuscita });
    parla(msg);
    await attendi(900);
    fine({ punteggio: punti, suono: voce.suono, parola: voce.parola, riuscita, tentativi, sentite });
  }
  return () => { fermaMic(); reg.libera(); };
}
