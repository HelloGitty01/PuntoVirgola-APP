// Report per la logopedista: riepilogo stampabile (o salvabile in PDF) di un periodo.
import { S, loc } from '../state.js';
import { leggiPartiteDal } from '../data.js';
import { esc, ICONE } from '../ui.js';
import { GIOCHI, GRUPPI, SUONI, TIPI } from '../punteggi.js';
import { parole, trova } from '../match.js';
import { CONNETTIVI } from './frasi3.js';

const SPONTANEE = new Set(['dillo', 'descrivi', 'finisci', 'dopo', 'domande', 'diario', 'indovina', 'racconta', 'unisci']);
const dataIt = (d, o = { day: 'numeric', month: 'long', year: 'numeric' }) => new Date(d).toLocaleDateString('it-IT', o);
const media = (a) => (a.length ? a.reduce((t, x) => t + x, 0) / a.length : null);
const f1 = (x) => (x === null || x === undefined || Number.isNaN(x) ? '–' : x.toFixed(1).replace('.', ','));
const perc = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '–');
const freccia = (ora, prima, soglia = 0.5) => {
  if (ora === null || prima === null) return '';
  if (ora - prima > soglia) return ` <span class="trend-su">▲ ${f1(prima)}</span>`;
  if (prima - ora > soglia) return ` <span class="trend-giu">▼ ${f1(prima)}</span>`;
  return ` <small>(= ${f1(prima)})</small>`;
};

function analizza(partite) {
  const es = partite.flatMap((p) => (p.esercizi || []).map((e) => ({ ...e, gioco: e.gioco || p.gioco })));
  const giorni = new Set(partite.map((p) => new Date(p.fine || p.inizio).toDateString()));
  const minuti = partite.reduce((t, p) => {
    const d = (new Date(p.fine).getTime() - new Date(p.inizio).getTime()) / 60000;
    return t + (d > 0 && d < 60 ? d : 0);
  }, 0);
  const frasi = es.filter((e) => SPONTANEE.has(e.gioco)).flatMap((e) => (e.frasi || []).map((f) => ({ f, gioco: e.gioco, quando: e.quando }))).filter((x) => x.f && x.f.trim());
  const lunghezze = frasi.map((x) => parole(x.f).length).filter((n) => n > 0);
  const conn = {};
  let conConnettivi = 0;
  frasi.forEach((x) => {
    const t = parole(x.f);
    const usati = CONNETTIVI.filter((c) => trova(t, c) >= 0);
    if (usati.length) conConnettivi++;
    usati.forEach((c) => { conn[c] = (conn[c] || 0) + 1; });
  });
  const perGioco = {};
  es.forEach((e) => { (perGioco[e.gioco] = perGioco[e.gioco] || []).push(e.punteggio || 0); });
  return { es, partite, giorni: giorni.size, minuti, frasi, lunghezze, conn, conConnettivi, perGioco };
}

export async function report(cont) {
  const periodo = loc.get('report.giorni', 14);
  cont.innerHTML = `<div class="riga-pulsanti non-stampare">
      <label>Periodo: <select id="periodo" style="width:auto">${[7, 14, 30, 60].map((g) => `<option value="${g}" ${g === periodo ? 'selected' : ''}>ultimi ${g} giorni</option>`).join('')}</select></label>
      <button class="btn" id="stampa">${ICONE.scarica} Stampa o salva in PDF</button></div>
    <p class="aiuto non-stampare" style="margin:0">Per il PDF: tocca “Stampa o salva in PDF” e come stampante scegli “Salva come PDF”. Il report confronta il periodo scelto con quello precedente (▲ ▼).</p>
    <div id="corpo"><p>Preparo il report…</p></div>`;
  cont.querySelector('#periodo').onchange = (e) => { loc.set('report.giorni', Number(e.target.value)); report(cont); };
  cont.querySelector('#stampa').onclick = () => {
    const n = cont.querySelector('#note');
    const s = cont.querySelector('#note-stampa');
    if (n && s) s.textContent = n.value || '—';
    window.print();
  };
  const ora = Date.now();
  const inizio = new Date(ora - periodo * 864e5);
  const inizioPrec = new Date(ora - 2 * periodo * 864e5);
  let tutte;
  try { tutte = await leggiPartiteDal(inizioPrec.toISOString()); } catch (e) { cont.querySelector('#corpo').innerHTML = `<p class="errore">${esc(e.message)}</p>`; return; }
  const quando = (p) => new Date(p.fine || p.inizio).getTime();
  const A = analizza(tutte.filter((p) => quando(p) >= inizio.getTime()));
  const B = analizza(tutte.filter((p) => quando(p) < inizio.getTime()));
  const nome = (S.config && S.config.nome) || 'la bambina';
  const es = A.es;
  const di = (g) => es.filter((e) => e.gioco === g);

  // --- sezioni ---
  const tabellaAttivita = Object.entries(GRUPPI).map(([gr, titolo]) => {
    const righe = Object.entries(GIOCHI).filter(([id, g]) => g.gruppo === gr && (A.perGioco[id] || B.perGioco[id]));
    if (!righe.length) return '';
    return `<tr><th colspan="4">${esc(titolo)}</th></tr>` + righe.map(([id, g]) => {
      const a = A.perGioco[id] || [], b = B.perGioco[id] || [];
      return `<tr><td>${esc(g.titolo)}</td><td class="num">${a.length}</td><td class="num">${f1(media(a))}${freccia(media(a), media(b))}</td><td><small>${esc(livello(id))}</small></td></tr>`;
    }).join('');
  }).join('');

  const dillo = di('dillo');
  const mancanti = {};
  dillo.forEach((e) => (e.mancanti || []).forEach((t) => { mancanti[t] = (mancanti[t] || 0) + 1; }));

  const dom = di('domande').flatMap((e) => (e.risposte || []).filter(Boolean));
  const domPerTipo = {};
  dom.forEach((r) => { const x = domPerTipo[r.tipo] = domPerTipo[r.tipo] || { tot: 0, piene: 0 }; x.tot++; if (r.punti >= 3) x.piene++; });

  const all = di('allunga');
  const passi = all.flatMap((e) => e.passi || []);

  const pr = di('pronuncia');
  const perSuono = {};
  pr.forEach((e) => {
    const x = perSuono[e.suono] = perSuono[e.suono] || { tot: 0, primo: 0, ok: 0, sentite: {} };
    x.tot++; if (e.riuscita) x.ok++; if (e.riuscita && e.tentativi === 1) x.primo++;
    (e.sentite || []).filter((w) => w && w !== '?' && w !== String(e.parola).toLowerCase()).forEach((w) => { const k = `${e.parola} → ${w}`; x.sentite[k] = (x.sentite[k] || 0) + 1; });
  });

  const ria = di('riassunto');
  const ind = di('indovina');
  const indA = ind.filter((e) => e.modo === 'ascolta');
  const indD = ind.filter((e) => e.modo === 'descrivi');
  const dia = di('diario');
  const desc = di('descrivi');
  const esempi = A.frasi.slice().sort((a, b) => String(b.quando).localeCompare(String(a.quando))).filter((x) => parole(x.f).length >= 3).slice(0, 12);
  const topConn = Object.entries(A.conn).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const sezione = (titolo, html) => (html ? `<h2>${titolo}</h2>${html}` : '');

  cont.querySelector('#corpo').innerHTML = `<article class="report">
    <div class="intesta">
      <div><h1>Report attività – ${esc(nome)}</h1>
        <div>Periodo: dal ${dataIt(inizio)} al ${dataIt(ora)} (${periodo} giorni)</div>
        <small>Generato il ${new Date(ora).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })} dall’app Punto e Virgola. Tra parentesi o con ▲▼ il valore dei ${periodo} giorni precedenti.</small></div>
      <img src="img/logo-completo.png" alt="" style="height:70px">
    </div>

    <h2>In sintesi</h2>
    <div class="cifre">
      <div><small>Giorni di attività</small><b>${A.giorni}</b><small>prima: ${B.giorni}</small></div>
      <div><small>Esercizi svolti</small><b>${es.length}</b><small>prima: ${B.es.length}</small></div>
      <div><small>Tempo di gioco</small><b>${Math.round(A.minuti)} min</b><small>prima: ${Math.round(B.minuti)} min</small></div>
      <div><small>Punteggio medio (0–10)</small><b>${f1(media(es.map((e) => e.punteggio || 0)))}</b><small>prima: ${f1(media(B.es.map((e) => e.punteggio || 0)))}</small></div>
    </div>

    ${sezione('Produzione verbale spontanea', A.lunghezze.length ? `<table>
      <tr><td>Frasi prodotte a voce (esercizi liberi)</td><td class="num">${A.lunghezze.length}</td></tr>
      <tr><td>Lunghezza media della frase (parole)</td><td class="num">${f1(media(A.lunghezze))}${freccia(media(A.lunghezze), media(B.lunghezze), 0.3)}</td></tr>
      <tr><td>Frase più lunga (parole)</td><td class="num">${Math.max(...A.lunghezze)}</td></tr>
      <tr><td>Frasi con almeno un connettivo (perché, quindi, ma, poi…)</td><td class="num">${perc(A.conConnettivi, A.frasi.length)} <small>(prima ${perc(B.conConnettivi, B.frasi.length)})</small></td></tr>
      ${topConn.length ? `<tr><td>Connettivi usati</td><td>${topConn.map(([c, n]) => `${esc(c)} (${n})`).join(', ')}</td></tr>` : ''}
    </table><small>Calcolato sulle trascrizioni del riconoscimento vocale: parole mal riconosciute possono alterare i valori.</small>` : '')}

    <h2>Attività svolte</h2>
    ${tabellaAttivita ? `<table><tr><th>Attività</th><th class="num">Esercizi</th><th class="num">Media 0–10</th><th>Livello attuale</th></tr>${tabellaAttivita}</table>` : '<p>Nessuna attività nel periodo.</p>'}

    ${sezione('Struttura della frase (“Dillo tu”)', dillo.length ? `<p>Su ${dillo.length} frasi, elementi mancanti al primo tentativo:</p><table>${Object.keys(TIPI).filter((t) => mancanti[t]).map((t) => `<tr><td>${esc(TIPI[t].nome)}</td><td class="num">${perc(mancanti[t], dillo.length)}</td></tr>`).join('') || '<tr><td>Nessun elemento mancante</td><td></td></tr>'}</table>` : '')}

    ${sezione('Rispondere con frasi complete (“Le domande di Virgola”)', dom.length ? `<table><tr><th>Domanda</th><th class="num">Risposte</th><th class="num">Con frase intera e corretta</th></tr>
      ${Object.entries(domPerTipo).map(([t, x]) => `<tr><td>${esc((TIPI[t] || {}).nome || t)}</td><td class="num">${x.tot}</td><td class="num">${perc(x.piene, x.tot)}</td></tr>`).join('')}</table>` : '')}

    ${sezione('Espansione della frase (“Allunga la frase”)', all.length ? `<table>
      <tr><td>Frasi allungate</td><td class="num">${all.length}</td></tr>
      <tr><td>Pezzi aggiunti da sola / con aiuto / saltati</td><td class="num">${passi.filter((x) => x === 'sua').length} / ${passi.filter((x) => x === 'aiuto').length} / ${passi.filter((x) => x === 'saltato').length}</td></tr>
      <tr><td>Lunghezza media della frase finale (parole)</td><td class="num">${f1(media(all.map((e) => e.parole || 0)))}</td></tr></table>
      ${all.slice(0, 3).map((e) => `<blockquote>${esc(e.costruita || '')}</blockquote>`).join('')}` : '')}

    ${sezione('Lessico e descrizione', (desc.length || ind.length) ? `<table>
      ${desc.length ? `<tr><td>“Descrivi la scena”: parole importanti per descrizione (obiettivo medio)</td><td class="num">${f1(media(desc.map((e) => e.parole || 0)))} (${f1(media(desc.map((e) => e.obiettivo || 0)))})</td></tr>
      <tr><td>Parola segreta usata</td><td class="num">${perc(desc.filter((e) => e.segretaTrovata).length, desc.filter((e) => e.segreta).length)}</td></tr>` : ''}
      ${indA.length ? `<tr><td>“Indovina”: indizi ascoltati prima di indovinare (media, su 4)</td><td class="num">${f1(media(indA.map((e) => e.indizi || 0)))}</td></tr>` : ''}
      ${indD.length ? `<tr><td>“Indovina”: caratteristiche pertinenti date descrivendo un oggetto (media)</td><td class="num">${f1(media(indD.map((e) => (e.chiaviDette || []).length)))}</td></tr>
      <tr><td>Ha detto il nome dell’oggetto (non doveva)</td><td class="num">${perc(indD.filter((e) => e.nomeDetto).length, indD.length)}</td></tr>` : ''}</table>` : '')}

    ${sezione('Comprensione e sintesi (“Riassumi la storia”)', ria.length ? `<table><tr><th>Racconto</th><th class="num">Elementi colti</th><th>Note</th></tr>
      ${ria.map((e) => `<tr><td>${esc(e.titolo || '')}<br><small>${dataIt(e.quando, { day: 'numeric', month: 'short' })} · ${e.modalita === 'guidato' ? 'guidato' : 'libero'}</small></td><td class="num">${(e.trovati || []).length}/${(e.trovati || []).length + (e.mancanti || []).length}</td>
        <td><small>${[e.ordineOk === false ? 'ordine da rivedere' : '', e.sintesiOk === false ? 'poco sintetico' : '', (e.mancanti || []).length ? 'mancava: ' + esc(e.mancanti.join('; ')) : ''].filter(Boolean).join(' · ') || 'completo'}</small></td></tr>`).join('')}</table>` : '')}

    ${sezione('Fonetica (“Pronuncia con Virgola”)', pr.length ? `<table><tr><th>Suono</th><th class="num">Corrette al 1° tentativo</th><th class="num">Corrette in totale</th><th>Sostituzioni sentite più spesso</th></tr>
      ${Object.entries(perSuono).map(([k, x]) => `<tr><td>${esc((SUONI[k] || {}).nome || k)}</td><td class="num">${perc(x.primo, x.tot)}</td><td class="num">${x.ok}/${x.tot}</td><td><small>${Object.entries(x.sentite).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([w, n]) => `${esc(w)} (${n})`).join(', ') || '–'}</small></td></tr>`).join('')}</table>
      <small>Il riconoscimento vocale su una voce infantile è indicativo: le sostituzioni vanno confermate all’ascolto.</small>` : '')}

    ${sezione('Il diario della giornata (racconto autobiografico)', dia.length ? `<table><tr><th>Giorno</th><th class="num">Risposte (scritte)</th><th class="num">Parole</th><th>Connettivi</th></tr>
      ${dia.map((e) => `<tr><td>${dataIt(e.quando, { weekday: 'short', day: 'numeric', month: 'short' })}</td><td class="num">${(e.risposte || []).length}${e.scritte ? ` (${e.scritte})` : ''}</td><td class="num">${e.parole || 0}</td><td><small>${esc((e.connettivi || []).join(', ') || '–')}</small></td></tr>`).join('')}</table>
      ${dia.slice(0, 2).map((e) => `<blockquote><small>${dataIt(e.quando, { weekday: 'long', day: 'numeric', month: 'long' })}</small><br>${(e.risposte || []).map((r) => `<i>${esc(r.domanda)}</i> ${esc(r.testo)}`).join('<br>')}</blockquote>`).join('')}` : '')}

    ${sezione('Esempi di frasi dette', esempi.length ? esempi.map((x) => `<blockquote>«${esc(x.f)}» <small>— ${esc((GIOCHI[x.gioco] || {}).titolo || x.gioco)}, ${dataIt(x.quando, { day: 'numeric', month: 'short' })}</small></blockquote>`).join('') : '')}

    <h2>Note dei genitori</h2>
    <textarea id="note" class="non-stampare" rows="4" placeholder="Osservazioni da condividere con la logopedista (vengono stampate nel report)">${esc(loc.get('report.note', ''))}</textarea>
    <div class="note-stampa solo-stampa" id="note-stampa"></div>
    <p><small>Punteggi e trascrizioni sono calcolati automaticamente dall’app e vanno considerati indicativi. Le registrazioni audio non vengono conservate.</small></p>
  </article>`;
  const note = cont.querySelector('#note');
  const st = cont.querySelector('#note-stampa');
  note.oninput = () => { loc.set('report.note', note.value); st.textContent = note.value; };
  st.textContent = note.value;
}

function livello(id) {
  const g = GIOCHI[id];
  if (!g || !g.livelli) return '';
  const l = ((S.config && S.config.impostazioni && S.config.impostazioni.livelli) || {})[id] || 1;
  return `livello ${l} di ${g.livelli}`;
}
