// Prima configurazione: genitore, abbinamento del dispositivo della bambina, prova locale.
import { vai } from '../nav.js';
import { S, salvaDispositivo, loc } from '../state.js';
import { inizializza, caricaTutto, preparaRepository, salvaConfig } from '../data.js';
import { GitHub } from '../github.js';
import { esc, toast, virgolaDice, collegaFumetti, ICONE } from '../ui.js';
import { parla } from '../tts.js';

export function benvenuto(app) {
  app.innerHTML = `<main class="schermata" style="align-items:center;text-align:center;justify-content:center;gap:22px">
    <img src="img/logo-completo.png" alt="Punto e Virgola" style="width:min(340px,60vw)">
    <h1 style="color:var(--navy);font-size:32px">Benvenuti!</h1>
    <p style="max-width:560px;margin:0">Come volete usare questo dispositivo?</p>
    <div style="display:flex;flex-direction:column;gap:14px;width:min(520px,100%)">
      <button class="btn grande" id="b-abbina">È il dispositivo di mia figlia</button>
      <button class="btn grande secondario" id="b-genitore">Sono un genitore (prima configurazione)</button>
      <button class="link" id="b-locale">Prova senza GitHub: dati solo su questo dispositivo</button>
    </div></main>`;
  app.querySelector('#b-abbina').onclick = () => vai('abbina');
  app.querySelector('#b-genitore').onclick = () => vai('configGenitore');
  app.querySelector('#b-locale').onclick = async () => {
    salvaDispositivo({ ruolo: 'bambina', modo: 'locale', nomeDispositivo: 'Questo dispositivo' });
    inizializza();
    await caricaTutto();
    vai('primoAvvio');
  };
}

export function configGenitore(app) {
  const prec = loc.get('ultimoRepo', {});
  app.innerHTML = `<main class="schermata pa" style="max-width:720px">
    <div class="barra"><button class="btn-tondo" id="indietro" aria-label="Indietro">${ICONE.indietro}</button><h1>Configurazione genitore</h1></div>
    <p>Servono il repository privato dei dati e un token di accesso. Le istruzioni sono nel file <b>README</b> del progetto.</p>
    <form class="card morbida" id="f" style="display:flex;flex-direction:column;gap:14px">
      <div class="campo"><label for="owner">Utente GitHub (proprietario)</label><input id="owner" type="text" autocomplete="off" required value="${esc(prec.owner || 'HelloGitty01')}"></div>
      <div class="campo"><label for="repo">Repository dei dati</label><input id="repo" type="text" autocomplete="off" required value="${esc(prec.repo || 'PuntoVirgola')}"><span class="aiuto">Deve essere privato.</span></div>
      <div class="campo"><label for="token">Token (fine-grained, lettura e scrittura su quel repository)</label><input id="token" type="password" autocomplete="off" required></div>
      <div class="campo"><label for="disp">Nome di questo dispositivo</label><input id="disp" type="text" placeholder="Telefono di papà" required></div>
      <div class="campo"><label for="nome">Nome della bambina</label><input id="nome" type="text" placeholder="Si può lasciare vuoto se già impostato"></div>
      <p class="errore" id="err" role="alert"></p>
      <button class="btn" type="submit" id="ok">Collega e prepara i dati</button>
    </form></main>`;
  app.querySelector('#indietro').onclick = () => vai('benvenuto');
  app.querySelector('#f').onsubmit = async (e) => {
    e.preventDefault();
    const v = (id) => app.querySelector('#' + id).value.trim();
    const err = app.querySelector('#err');
    const bt = app.querySelector('#ok');
    err.textContent = '';
    bt.disabled = true; bt.textContent = 'Controllo…';
    try {
      const gh = new GitHub(v('owner'), v('repo'), v('token'));
      const info = await gh.verifica();
      if (!info.scrittura) throw new Error('Il token non ha il permesso di scrittura su questo repository');
      if (!info.privato && !confirm('Attenzione: il repository NON è privato. I dati di tua figlia sarebbero visibili a tutti. Continuare comunque?')) throw new Error('Rendi privato il repository e riprova');
      salvaDispositivo({ ruolo: 'genitore', modo: 'github', owner: v('owner'), repo: v('repo'), token: v('token'), nomeDispositivo: v('disp') });
      loc.set('ultimoRepo', { owner: v('owner'), repo: v('repo') });
      inizializza();
      await preparaRepository(v('nome'));
      if (v('nome') && S.config.nome !== v('nome')) { S.config.nome = v('nome'); await salvaConfig(); }
      toast('Dati pronti!');
      vai('genitori');
    } catch (ex) {
      err.textContent = ex.message;
      bt.disabled = false; bt.textContent = 'Collega e prepara i dati';
    }
  };
}

export function decodificaCodice(testo) {
  const t = String(testo || '').trim();
  if (!t.startsWith('PV1:')) throw new Error('Codice non valido');
  const json = decodeURIComponent(escape(atob(t.slice(4).replace(/-/g, '+').replace(/_/g, '/'))));
  const d = JSON.parse(json);
  if (!d.o || !d.r || !d.t) throw new Error('Codice incompleto');
  return d;
}

export function abbina(app) {
  let flusso = null;
  let attivo = true;
  app.innerHTML = `<main class="schermata pa" style="max-width:760px">
    <div class="barra"><button class="btn-tondo" id="indietro" aria-label="Indietro">${ICONE.indietro}</button><h1>Abbina il dispositivo</h1></div>
    <p>Dal telefono di un genitore apri <b>Area genitori → Dispositivi → Aggiungi dispositivo</b>, poi inquadra il QR code oppure incolla il codice.</p>
    <div class="card morbida" style="display:flex;flex-direction:column;gap:14px;align-items:flex-start">
      <button class="btn" id="b-cam">Inquadra il QR code</button>
      <video class="scanner nascosto" id="video" playsinline muted></video>
      <div class="campo" style="width:100%"><label for="codice">Oppure incolla il codice</label><textarea id="codice" placeholder="PV1:…"></textarea></div>
      <button class="btn secondario" id="b-codice">Usa il codice</button>
      <p class="errore" id="err" role="alert"></p>
    </div></main>`;
  const err = app.querySelector('#err');
  const usa = async (testo) => {
    try {
      const d = decodificaCodice(testo);
      attivo = false;
      salvaDispositivo({ ruolo: 'bambina', modo: 'github', owner: d.o, repo: d.r, token: d.t, nomeDispositivo: d.e || 'Dispositivo' });
      inizializza();
      await caricaTutto();
      toast('Dispositivo abbinato!');
      vai('primoAvvio');
    } catch (e) {
      err.textContent = e.message === 'Codice non valido' || e.message === 'Codice incompleto' ? e.message : 'Abbinamento non riuscito: ' + e.message;
    }
  };
  app.querySelector('#indietro').onclick = () => vai('benvenuto');
  app.querySelector('#b-codice').onclick = () => usa(app.querySelector('#codice').value);
  app.querySelector('#b-cam').onclick = async () => {
    const video = app.querySelector('#video');
    try {
      flusso = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    } catch { err.textContent = 'Non riesco ad accedere alla fotocamera. Usa il codice.'; return; }
    video.srcObject = flusso;
    video.classList.remove('nascosto');
    await video.play();
    let rilevatore = null;
    if ('BarcodeDetector' in window) {
      try { rilevatore = new window.BarcodeDetector({ formats: ['qr_code'] }); } catch {}
    }
    if (!rilevatore && !window.jsQR) {
      await new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'vendor/jsQR.js'; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
    }
    const tela = document.createElement('canvas');
    const ctx = tela.getContext('2d', { willReadFrequently: true });
    const giro = async () => {
      if (!attivo) return;
      try {
        let valore = null;
        if (rilevatore) {
          const r = await rilevatore.detect(video);
          if (r.length) valore = r[0].rawValue;
        } else if (video.videoWidth) {
          tela.width = video.videoWidth; tela.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          const img = ctx.getImageData(0, 0, tela.width, tela.height);
          const r = window.jsQR(img.data, img.width, img.height);
          if (r) valore = r.data;
        }
        if (valore && valore.startsWith('PV1:')) { flusso.getTracks().forEach((t) => t.stop()); return usa(valore); }
      } catch {}
      setTimeout(giro, 250);
    };
    giro();
  };
  return () => { attivo = false; if (flusso) flusso.getTracks().forEach((t) => t.stop()); };
}

export function primoAvvio(app) {
  const nome = S.config && S.config.nome;
  const saluto = nome
    ? `Ciao ${nome}! Io sono Virgola, la maestra. E lui è Punto, il mio studente. Giochiamo insieme con le frasi?`
    : 'Ciao! Io sono Virgola, la maestra. E lui è Punto, il mio studente. Come ti chiami?';
  app.innerHTML = `<main class="schermata" style="justify-content:center">
    <div class="due-colonne" style="flex:0;align-items:center">
      <div class="colonna" style="align-items:center"><img src="img/duo.png" alt="Punto e Virgola" style="width:min(460px,80%)"></div>
      <div class="colonna">
        ${virgolaDice(saluto)}
        ${nome ? '' : `<div class="campo"><label for="nome" style="font-size:22px">Il tuo nome</label><input id="nome" type="text" autocomplete="off" style="font-size:26px;min-height:64px"></div>`}
        <button class="btn grande" id="avanti">${nome ? 'Sì, giochiamo!' : 'Avanti'}</button>
      </div>
    </div></main>`;
  collegaFumetti(app);
  setTimeout(() => parla(saluto), 300);
  app.querySelector('#avanti').onclick = async () => {
    if (!nome) {
      const v = app.querySelector('#nome').value.trim();
      if (!v) { app.querySelector('#nome').focus(); return; }
      S.config.nome = v.charAt(0).toUpperCase() + v.slice(1);
      try { await salvaConfig(); } catch (e) { toast('Nome salvato su questo dispositivo, lo invio appena possibile'); }
    }
    vai('personaggio', { primoAvvio: true });
  };
}
