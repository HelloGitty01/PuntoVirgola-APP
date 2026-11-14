// Avvio di Punto e Virgola.
import { registra, vai } from './nav.js';
import { dispositivo, loc, nomeBambina, scollegaDispositivo } from './state.js';
import { inizializza, caricaTutto, sincronizza } from './data.js';
import { esc, attendi } from './ui.js';
import { installaMusica, musica } from './musica.js';
import * as setup from './screens/setup.js';
import { home } from './screens/home.js';
import { gioco } from './screens/gioco.js';
import { risultato, finePartita } from './screens/risultato.js';
import { sceltaPersonaggio } from './screens/personaggio.js';
import { genitori, editor } from './screens/genitori.js';
import { mieiGiorni } from './screens/giorni.js';
import { installaSorprese } from './sorprese.js';

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
registra('mieiGiorni', mieiGiorni);
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
installaSorprese();

function splash() {
  const s = document.createElement('div');
  s.className = 'splash';
  s.innerHTML = `<img src="img/logo-completo.png" alt="Punto e Virgola"><div class="caricamento">Punto e Virgola si stanno preparando…</div>`;
  document.body.appendChild(s);
  let tolto = false;
  const togli = () => { if (tolto) return; tolto = true; s.classList.add('via'); setTimeout(() => s.remove(), 600); };
  s.addEventListener('click', togli);
  // Se il browser non permette di far partire l'audio da solo, chiediamo un tocco per iniziare.
  togli.chiediTocco = () => new Promise((ok) => {
    s.querySelector('.caricamento').outerHTML = '<button class="btn grande arancio" id="via">Tocca per giocare!</button>';
    const b = s.querySelector('#via');
    b.focus();
    s.addEventListener('click', () => { musica.sblocca(); ok(); }, { once: true });
  });
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
    // quando arriva una versione nuova dell'app, la pagina si ricarica da sola (una volta)
    if (navigator.serviceWorker.controller) {
      let ricaricata = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (!ricaricata) { ricaricata = true; location.reload(); } });
    }
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
  // Proviamo ad avviare la musica da soli (nell'app installata spesso è consentito);
  // se il browser la blocca, la schermata iniziale chiede un tocco.
  if (!errore && musica.richiesto) {
    musica.sblocca();
    await attendi(150);
    if (!musica.ctx || musica.ctx.state !== 'running') await togliSplash.chiediTocco();
  }
  togliSplash();
}

window.addEventListener('online', () => sincronizza());
avvio();
