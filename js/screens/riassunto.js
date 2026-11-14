// "Riassumi la storia": lettura (o ascolto) di un racconto, riassunto scritto o dettato,
// verifica degli elementi essenziali della trama con le domande guida di Virgola.
import { S, impostazioni } from '../state.js';
import { esc, ICONE, virgolaDice, aggiornaFumetto, collegaFumetti, finestra } from '../ui.js';
import { parole } from '../match.js';
import { parla, zitto } from '../tts.js';
import { Ascolto, motoreScelto, voskPronto, preparaVosk } from '../speech.js';
import { messaggioErroreVoce } from './dillo.js';

const CONNETTIVI = ['poi', 'dopo', 'perche', 'alla fine', 'infine', 'quindi', 'ma', 'allora', 'cosi', 'mentre', 'quando', 'invece', 'però', 'pero', 'prima'];

// ---------- Confronto tollerante agli errori di ortografia ----------
function distanza(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 3;
  let prec = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prec[j] + 1, cur[j - 1] + 1, prec[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prec = cur;
  }
  return prec[n];
}
function tokenOk(tok, modello) {
  if (modello.endsWith('*')) {
    const radice = modello.slice(0, -1);
    if (tok.startsWith(radice)) return true;
    if (radice.length < 5) return false;
    // tollera una lettera in più, in meno o sbagliata nella radice (siarpa ≈ sciarp*)
    return [-1, 0, 1].some((d) => tok.length >= radice.length + d && distanza(tok.slice(0, radice.length + d), radice) <= 1);
  }
  if (tok === modello) return true;
  if (modello.length >= 5) return distanza(tok, modello) <= (modello.length >= 8 ? 2 : 1);
  return false;
}
function posizione(toks, chiave) {
  const m = parole(chiave);
  if (!m.length) return -1;
  for (let i = 0; i + m.length <= toks.length; i++) {
    if (m.every((p, j) => tokenOk(toks[i + j], p))) return i;
  }
  return -1;
}
// Lunghezza della più lunga sottosequenza crescente (per controllare l'ordine degli eventi).
function lis(a) {
  const code = [];
  for (const x of a) {
    let i = code.findIndex((y) => y >= x);
    if (i < 0) code.push(x); else code[i] = x;
  }
  return code.length;
}

export function valutaRiassunto(racconto, testo) {
  const toks = parole(testo);
  const esito = racconto.elementi.map((el) => {
    // "a+b" = servono entrambe le parole (es. "sciarp*+pers*")
    const pos = el.parole.map((k) => {
      const parti = k.split('+').map((x) => x.trim()).filter(Boolean);
      const ps = parti.map((x) => posizione(toks, x));
      return ps.every((x) => x >= 0) ? Math.min(...ps) : -1;
    }).filter((p) => p >= 0);
    return { ...el, trovato: pos.length > 0, pos: pos.length ? Math.min(...pos) : -1 };
  });
  const trovati = esito.filter((e) => e.trovato);
  const ordineOk = trovati.length >= 2 ? lis(trovati.map((e) => e.pos)) === trovati.length : null;
  const tokRacconto = parole(racconto.testo);
  const rapporto = toks.length / Math.max(1, tokRacconto.length);
  const quattro = (t) => new Set(t.slice(0, -3).map((_, i) => t.slice(i, i + 4).join(' ')));
  const gRacconto = quattro(tokRacconto);
  const gRiassunto = [...quattro(toks)];
  const copia = gRiassunto.length ? gRiassunto.filter((g) => gRacconto.has(g)).length / gRiassunto.length : 0;
  const collegamenti = CONNETTIVI.filter((c) => posizione(toks, c) >= 0);
  const sintesiOk = toks.length >= 8 && rapporto <= 0.6 && copia < 0.5;
  const quota = trovati.length / Math.max(1, esito.length);
  // Se copia il racconto o è lungo quasi quanto l'originale non è un riassunto: gli elementi valgono la metà.
  const base = (copia >= 0.5 || rapporto > 0.8) ? 3.5 * quota : 7 * quota;
  const punteggio = Math.min(10, Math.round(base) + (ordineOk ? 1 : 0) + (sintesiOk ? 1 : 0) + (collegamenti.length ? 1 : 0));
  return { esito, trovati: trovati.length, totali: esito.length, ordineOk, rapporto, copia, collegamenti, sintesiOk, parole: toks.length, punteggio };
}

// ---------- Dettatura dentro un campo di testo ----------
function collegaDettatura(btn, campo, area, alCambio) {
  let a = null, base = '';
  const riposo = () => { btn.classList.remove('ascolta'); btn.innerHTML = `${ICONE.dillo} Detta`; };
  riposo();
  btn.onclick = async () => {
    if (a) {
      const ascolto = a; a = null;
      btn.disabled = true;
      const r = await ascolto.ferma();
      campo.value = [base, r.testo].filter(Boolean).join(' ').trim();
      btn.disabled = false;
      riposo();
      alCambio();
      return;
    }
    zitto();
    try {
      if (motoreScelto() === 'vosk' && !voskPronto()) {
        btn.disabled = true;
        await preparaVosk((p) => { btn.textContent = `Preparo… ${Math.round(p * 100)}%`; });
        btn.disabled = false;
      }
      base = campo.value.trim();
      a = new Ascolto({ onTesto: (t) => { campo.value = [base, t].filter(Boolean).join(' '); alCambio(); } });
      await a.avvia();
      btn.classList.add('ascolta');
      btn.innerHTML = `${ICONE.stop} Ho finito di dettare`;
    } catch (e) {
      a = null; btn.disabled = false; riposo();
      aggiornaFumetto(area, messaggioErroreVoce(e), { leggi: true });
    }
  };
  return () => { if (a) a.annulla(); };
}

export function riassunto(area, { voce, fine, livello }) {
  const leggi = impostazioni().letturaAutomatica;
  const soloAscolto = !!(S.config && S.config.riassuntoSoloAscolto);
  const guidato = (voce.livello || livello || 1) === 1;
  const campiGuidati = [
    { id: 'chi', etichetta: 'Chi sono i protagonisti?' },
    { id: 'dove', etichetta: 'Dove e quando succede?' },
    { id: 'cosa', etichetta: 'Che cosa succede? Qual è il problema?' },
    { id: 'fine', etichetta: 'Come finisce?' }
  ];
  let giro = 0, finito = false, testoSalvato = guidato ? {} : '';
  let pulizie = [];
  const pulisci = () => { pulizie.forEach((f) => f()); pulizie = []; };

  const testoRacconto = () => `<div class="card racconto"><h2>${esc(voce.titolo)}</h2>${voce.testo.split(/(?<=[.!?»])\s+(?=[A-ZÀ-Ú«])/).reduce((acc, f, i) => { const k = Math.floor(i / 3); (acc[k] = acc[k] || []).push(f); return acc; }, []).map((p) => `<p>${esc(p.join(' '))}</p>`).join('')}</div>`;

  function faseLeggi() {
    const intro = soloAscolto
      ? `Ascolta bene il racconto "${voce.titolo}". Poi me lo racconterai in poche parole!`
      : `Leggi con attenzione il racconto "${voce.titolo}". Puoi anche ascoltarlo. Poi me lo racconterai in poche parole!`;
    area.innerHTML = `<div class="due-colonne" style="grid-template-columns:minmax(0,1.3fr) minmax(0,.7fr)">
      <div class="colonna">${soloAscolto
        ? `<div class="card" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center"><img src="img/punto.png" alt="Punto che ascolta" style="width:min(240px,50%)"><h2 style="color:var(--navy)">${esc(voce.titolo)}</h2><p>Questa volta il racconto si ascolta soltanto.</p></div>`
        : testoRacconto()}</div>
      <div class="colonna">${virgolaDice(intro)}
        <button class="btn secondario" id="ascolta">${ICONE.altoparlante} Ascolta il racconto</button>
        <button class="btn arancio grande" id="avanti" style="margin-top:auto">Ho capito: faccio il riassunto!</button>
      </div></div>`;
    collegaFumetti(area);
    let leggendo = false;
    const bt = area.querySelector('#ascolta');
    bt.onclick = async () => {
      if (leggendo) { zitto(); leggendo = false; bt.innerHTML = `${ICONE.altoparlante} Ascolta il racconto`; return; }
      leggendo = true;
      bt.innerHTML = `${ICONE.stop} Ferma la lettura`;
      await parla(`${voce.titolo}. ${voce.testo}`, { velocita: 0.9 });
      leggendo = false;
      bt.innerHTML = `${ICONE.altoparlante} Ascolta il racconto`;
    };
    area.querySelector('#avanti').onclick = () => { zitto(); faseScrivi(); };
    if (soloAscolto) setTimeout(() => bt.click(), 600);
    else if (leggi) setTimeout(() => parla(intro), 400);
  }

  function faseScrivi() {
    pulisci();
    const nRacconto = parole(voce.testo).length;
    const consiglio = guidato
      ? 'Rispondi alle domande con frasi brevi. Puoi scrivere o dettare.'
      : `Racconta la storia in poche parole: chi, dove, che cosa succede e come finisce. Prova a usare meno di ${Math.round(nRacconto * 0.5)} parole!`;
    area.innerHTML = `<div class="due-colonne" style="grid-template-columns:minmax(0,1.3fr) minmax(0,.7fr)">
      <div class="colonna">
        ${guidato
          ? campiGuidati.map((c) => `<div class="campo riassunto-campo"><label for="r-${c.id}">${esc(c.etichetta)}</label>
              <div class="riga-campo"><textarea id="r-${c.id}" rows="2">${esc(testoSalvato[c.id] || '')}</textarea><button class="btn secondario piccolo" data-detta="${c.id}"></button></div></div>`).join('')
          : `<div class="campo riassunto-campo"><label for="r-libero">Il tuo riassunto</label>
              <textarea id="r-libero" rows="9">${esc(testoSalvato || '')}</textarea>
              <button class="btn secondario" data-detta="libero" style="align-self:flex-start"></button></div>`}
        <div class="aiuto" id="conta"></div>
      </div>
      <div class="colonna">${virgolaDice(giro ? 'Aggiungi quello che manca: guarda le mie domande!' : consiglio)}
        ${(livello || voce.livello || 1) < 3 && !soloAscolto ? `<button class="btn secondario" id="rileggi">${ICONE.racconta} Rileggi il racconto</button>` : `<button class="btn secondario" id="riascolta">${ICONE.altoparlante} Riascolta il racconto</button>`}
        <button class="btn arancio grande" id="verifica" style="margin-top:auto">Ho finito!</button>
      </div></div>`;
    collegaFumetti(area);
    if (leggi && !giro) setTimeout(() => parla(consiglio), 300);
    const raccogli = () => (guidato
      ? Object.fromEntries(campiGuidati.map((c) => [c.id, area.querySelector('#r-' + c.id).value.trim()]))
      : area.querySelector('#r-libero').value.trim());
    const testoUnico = () => (guidato ? campiGuidati.map((c) => testoSalvato[c.id]).filter(Boolean).join('. ') : testoSalvato);
    const aggiornaConta = () => {
      testoSalvato = raccogli();
      const n = parole(testoUnico()).length;
      area.querySelector('#conta').textContent = `Parole: ${n} (il racconto ne ha ${nRacconto})`;
    };
    area.querySelectorAll('textarea').forEach((t) => t.addEventListener('input', aggiornaConta));
    area.querySelectorAll('[data-detta]').forEach((b) => {
      const campo = area.querySelector('#r-' + b.dataset.detta);
      pulizie.push(collegaDettatura(b, campo, area, aggiornaConta));
    });
    aggiornaConta();
    const ril = area.querySelector('#rileggi');
    if (ril) ril.onclick = () => finestra({ titolo: voce.titolo, html: testoRacconto(), pulsanti: [{ testo: 'Chiudi', valore: true }] });
    const ria = area.querySelector('#riascolta');
    if (ria) ria.onclick = () => parla(voce.testo, { velocita: 0.9 });
    area.querySelector('#verifica').onclick = () => {
      testoSalvato = raccogli();
      const t = testoUnico();
      if (parole(t).length < 3) { aggiornaFumetto(area, 'Scrivi o detta almeno una frase, poi tocca “Ho finito!”.', { leggi: true }); return; }
      pulisci();
      faseVerifica(t);
    };
  }

  async function faseVerifica(testo) {
    giro++;
    const v = valutaRiassunto(voce, testo);
    const mancanti = v.esito.filter((e) => !e.trovato);
    const note = [];
    if (v.ordineOk === false) note.push('Attenta all’ordine: racconta le cose nella stessa sequenza della storia.');
    if (v.parole >= 8 && v.rapporto > 0.6) note.push('È un po’ lungo: un riassunto usa meno parole del racconto.');
    if (v.copia >= 0.5) note.push('Hai copiato pezzi del racconto: prova a dirlo con parole tue.');
    if (!v.collegamenti.length && !guidato) note.push('Usa parole come “poi”, “perché”, “alla fine” per collegare le frasi.');
    let msg;
    if (!mancanti.length) msg = `Fantastico! Hai colto tutti gli elementi della storia!`;
    else if (v.trovati >= v.totali / 2) msg = `Brava! Hai colto ${v.trovati} elementi su ${v.totali}. Ti faccio qualche domanda su quello che manca.`;
    else msg = `Hai iniziato bene! Ma mancano alcune parti importanti. Prova a rispondere alle mie domande.`;
    area.innerHTML = `<div class="due-colonne" style="grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr)">
      <div class="colonna">
        <div class="card" style="display:flex;flex-direction:column;gap:12px">
          <h2 style="color:var(--navy)">Gli elementi della storia</h2>
          <ul class="lista-elementi">${v.esito.map((e) => e.trovato
            ? `<li class="ok"><span class="segno">✓</span><span>${esc(e.nome)}</span></li>`
            : `<li class="manca"><span class="segno">?</span><span>${esc(e.domanda)}</span></li>`).join('')}</ul>
          ${note.length ? `<div class="note-riassunto">${note.map((n) => `<p>${esc(n)}</p>`).join('')}</div>` : ''}
        </div>
        <div class="card morbida"><span style="color:var(--tenue)">Il tuo riassunto:</span><p class="trascrizione" style="font-weight:400">${esc(testo)}</p></div>
      </div>
      <div class="colonna">${virgolaDice(msg, { allegro: !mancanti.length })}
        <div class="riga-pulsanti" style="margin-top:auto;justify-content:flex-end">
          ${mancanti.length && giro < 3 ? '<button class="btn secondario" id="aggiungi">Aggiungo quello che manca</button>' : ''}
          <button class="btn arancio grande" id="chiudi">${mancanti.length && giro < 3 ? 'Va bene così' : 'Fatto!'}</button>
        </div>
      </div></div>`;
    collegaFumetti(area);
    await parla(msg + (mancanti.length ? ' ' + mancanti[0].domanda : ''));
    const agg = area.querySelector('#aggiungi');
    if (agg) agg.onclick = () => { zitto(); faseScrivi(); };
    area.querySelector('#chiudi').onclick = () => {
      if (finito) return;
      finito = true;
      zitto();
      fine({
        punteggio: Math.max(0, v.punteggio - (giro > 1 ? 1 : 0)),
        titolo: voce.titolo,
        modalita: guidato ? 'guidato' : 'libero',
        testo,
        trovati: v.esito.filter((e) => e.trovato).map((e) => e.nome),
        mancanti: mancanti.map((e) => e.nome),
        ordineOk: v.ordineOk, sintesiOk: v.sintesiOk, paroleRiassunto: v.parole, giri: giro
      });
    };
  }

  faseLeggi();
  return () => { pulisci(); zitto(); };
}
