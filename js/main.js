// Avvio di Punto e Virgola.
import { registra, vai } from './nav.js';
import { dispositivo, loc, nomeBambina, scollegaDispositivo } from './state.js';
import { inizializza, caricaTutto, sincronizza } from './data.js';
import { esc, attendi } from './ui.js';
import { installaMusica } from './musica.js';
import * as setup from './screens/setup.js';
import { home } from './screens/home.js';
import { gioco } from './screens/gioco.js';
import { risultato, finePartita } from './screens/risultato.js';
import { sceltaPersonaggio } from './screens/personaggio.js';
import { genitori, editor } from './screens/genitori.js';

registra('benvenuto', setup.benvenuto);
registra('configGenitore', setup.configGenitore);
registra('abbina', setup.abbina);
registra('primoAvvio', setup.primoAvvio);
registra('home', home);
registra('gioco', gioco);
registra('risultato', risultato);
registra('finePartita', finePartita);
registra('personaggio', sceltaPersonaggio);
registra('genitori', genitori);
registra('editor', editor);
registra('errore', (app, { messaggio }) => {
  app.innerHTML = `<main class="schermata" style="align-items:center;justify-content:center;text-align:center">
    <img src="img/punto.png" alt="" style="width:180px">
    <h1 style="color:var(--navy)">Ops, qualcosa non va</h1>
    <p>${esc(messaggio)}</p>
    <div class="riga-pulsanti" style="justify-content:center">
      <button class="btn" id="riprova">Riprova</button>
      <button class="btn secondario" id="scollega">Configura di nuovo questo dispositivo</button>
    </div></main>`;
  app.querySelector('#riprova').onclick = () => location.reload();
  app.querySelector('#scollega').onclick = () => { if (confirm('Vuoi scollegare questo dispositivo?')) { scollegaDispositivo(); location.reload(); } };
});

installaMusica();

function splash() {
  const s = document.createElement('div');
  s.className = 'splash';
  s.innerHTML = `<img src="img/logo-completo.png" alt="Punto e Virgola"><div class="caricamento">Punto e Virgola si stanno preparando…</div>`;
  document.body.appendChild(s);
  let tolto = false;
  const togli = () => { if (tolto) return; tolto = true; s.classList.add('via'); setTimeout(() => s.remove(), 600); };
  s.addEventListener('click', togli);
  return togli;
}

export function destinazioneIniziale() {
  const d = dispositivo();
  if (!d) return 'benvenuto';
  if (d.ruolo === 'genitore') return 'genitori';
  if (!nomeBambina() || !loc.get('avatar')) return 'primoAvvio';
  return 'home';
}

async function avvio() {
  const togliSplash = splash();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW', e));
  }
  const attesa = attendi(1800);
  let dest = 'benvenuto';
  let errore = null;
  const d = dispositivo();
  if (d) {
    inizializza();
    try {
      await caricaTutto();
      dest = destinazioneIniziale();
      sincronizza();
    } catch (e) {
      errore = e.message || String(e);
    }
  }
  await attesa;
  if (errore) vai('errore', { messaggio: errore });
  else vai(dest);
  togliSplash();
}

window.addEventListener('online', () => sincronizza());
avvio();
