# Punto e Virgola

App web (PWA) per esercitarsi a costruire le frasi, pensata per Chromebook e tablet, con area genitori usabile anche da smartphone.
**Punto** è lo studente, **Virgola** è la maestra: spiega gli esercizi, legge le istruzioni ad alta voce e assegna da 0 a 10 caramelle per ogni esercizio.

Nome tecnico del progetto: `PuntoVirgola`.

## Cosa contiene

- **14 attività**, ognuna attivabile o disattivabile dall'area genitori (scheda **Attività**):
  - *Costruisco le frasi*: Componi la scena (livelli 1–5), Dillo tu (1–5), Racconta la storia, Descrivi la scena, Frase scombinata, Unisci le frasi (perché, ma, quindi, quando, mentre), Finisci tu, Trasforma (ieri/domani, singolare/plurale), Cosa succede dopo?
  - *Suoni e parole*: Orecchie attente (coppie minime come cane/pane), Battiamo le sillabe, Come comincia? (sillaba iniziale), Le rime di Punto, Ripeti con Virgola, Pronuncia con Virgola (SC, Z, TR, STR, C dura e dolce: il riconoscitore sceglie tra la parola giusta e le sostituzioni tipiche, es. treno/reno, cane/tane).
  - *Leggo e riassumo*: Riassumi la storia — 15 racconti su 3 livelli; la bambina legge (o solo ascolta) e poi scrive o detta il riassunto. L'app controlla gli elementi essenziali della trama (chi, dove, problema, cosa succede, come finisce), l'ordine, la sintesi (più corto del racconto, non copiato) e le parole di collegamento; per ogni elemento mancante Virgola fa una domanda guida.
- I contenuti delle nuove attività si modificano nelle schede **Racconti** e **Altri esercizi**.
- **34 scene e 5 storie iniziali**, modificabili e ampliabili dall'area genitori (pittogrammi ARASAAC o foto vostre).
- **Caramelle e personaggi**: le caramelle si accumulano e sbloccano nuovi personaggi.
- **Riconoscimento vocale sul dispositivo** (Vosk): l'audio non esce mai dal Chromebook o dal tablet. Le registrazioni restano solo in memoria; c'è un tasto per scaricarle se volete conservarne una.
- **Area genitori**: riepilogo dei progressi, scene, storie, parole da rivedere, impostazioni (livelli, PIN, motore vocale), dispositivi (abbinamento con QR code).
- **Funziona anche offline** dopo il primo caricamento.

## 1. Pubblicare l'app su GitHub Pages

Servono due repository:

| Repository | Visibilità | Contenuto |
|---|---|---|
| `PuntoVirgola-APP` | **pubblico** | il codice dell'app (questa cartella) |
| `PuntoVirgola` | **privato** | nome, scene, progressi (li scrive l'app) |

### 1a. Repository dell'app

1. Su GitHub: **New repository** → nome `PuntoVirgola-APP` → **Public** → *Create repository* (senza README).
2. Il modello vocale (`models/vosk-model-small-it.tar.gz`, 34 MB) supera il limite di 25 MB del caricamento dal browser, quindi usate git da terminale:

```bash
cd PuntoVirgola            # la cartella estratta dallo zip
git init
git add .
git commit -m "Punto e Virgola 1.0"
git branch -M main
git remote add origin https://github.com/HelloGitty01/PuntoVirgola-APP.git
git push -u origin main
```

   In alternativa va bene **GitHub Desktop** (File → Add local repository → Publish).

3. Nel repository: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**.
4. Dopo un paio di minuti l'app è su: `https://hellogitty01.github.io/PuntoVirgola-APP/`

### 1b. Repository privato dei dati

1. **New repository** → nome `PuntoVirgola` → **Private** → spuntate *Add a README file* → *Create repository* (già fatto).
2. Non serve altro: i file (`config.json`, `scene.json`, `progressi/…`, `immagini/…`) li crea l'app.

### 1c. Token di accesso (fine-grained)

GitHub → foto profilo → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**:

- **Token name**: es. `PuntoVirgola genitori` (poi uno per ogni dispositivo di vostra figlia, es. `PuntoVirgola Chromebook`)
- **Expiration**: la durata massima che vi propone (poi va rinnovato: basta crearne uno nuovo e reinserirlo)
- **Repository access**: *Only select repositories* → `PuntoVirgola`
- **Permissions → Repository permissions → Contents: Read and write** (Metadata in sola lettura si aggiunge da solo)
- *Generate token* e copiatelo subito (GitHub non lo mostra più).

Il token dà accesso **solo** al repository dei dati. Se un dispositivo si perde, revocate il suo token da questa stessa pagina.

## 2. Primo avvio

### Sul telefono di un genitore (una volta sola)

1. Aprite `https://hellogitty01.github.io/PuntoVirgola-APP/` con Chrome.
2. Scegliete **Sono un genitore (prima configurazione)**.
3. Inserite utente GitHub, `PuntoVirgola`, il token genitori, il nome del dispositivo e il nome della bambina.
4. L'app prepara il repository dei dati con le scene iniziali e apre l'area genitori.
5. Menu di Chrome → **Aggiungi a schermata Home / Installa app**.

L'altro genitore fa lo stesso sul suo telefono (stesso token genitori o uno suo).

### Sul Chromebook (e sul tablet Android)

1. Sul telefono del genitore: **Area genitori → Dispositivi → Aggiungi un dispositivo di tua figlia**: incollate il token del dispositivo, scrivete il nome (es. "Chromebook") e toccate **Genera QR code**.
2. Sul Chromebook aprite l'indirizzo dell'app in Chrome e installatela (icona *Installa* nella barra degli indirizzi, oppure menu → *Trasmetti, salva e condividi → Installa pagina come app*).
3. Aprite l'app → **È il dispositivo di mia figlia** → inquadrate il QR code (oppure incollate il codice).
4. Vostra figlia sceglie il suo personaggio e può giocare.
5. Al primo uso del microfono Chrome chiede il permesso e l'app scarica il modello vocale (circa 34 MB, una volta sola). Meglio farlo prima con il Wi-Fi: **Area genitori → Impostazioni → Scarica ora il modello vocale**.

Sul tablet Android si fa la stessa cosa (Chrome → *Aggiungi a schermata Home*). I progressi dei due dispositivi si sommano.

### Prova veloce senza GitHub

Nella prima schermata c'è **Prova senza GitHub**: tutto resta su quel dispositivo (utile per farlo vedere alla logopedista).

## 3. Area genitori

Si apre dal lucchetto in alto a destra nella home. Senza PIN si risponde a una moltiplicazione; il PIN si imposta in **Impostazioni**.

- **Riepilogo**: partite, media caramelle per gioco, elementi che mancano più spesso in "Dillo tu", ultime frasi dette.
- **Scene / Storie**: modifica e aggiunta. Per l'immagine si cercano i pittogrammi ARASAAC (fino a 4, in ordine) oppure si carica una foto. Nelle risposte accettate l'asterisco accetta tutte le forme: `mangi*` = mangia, mangiano, mangiava.
- **Da rivedere**: parole dette da vostra figlia che l'app non conosceva. Se erano giuste, aggiungetele con un tocco come risposta accettata.
- **Impostazioni**: livello di ogni gioco, esercizi per partita, parole minime per "Descrivi la scena", lettura automatica, motore vocale, PIN.

### Come Virgola assegna le caramelle (0–10)

- **Componi la scena**: 10, meno 2 per ogni mattoncino nello spazio sbagliato, meno 1 per ogni aiuto.
- **Dillo tu**: 10 se la frase è completa al primo tentativo; meno 2 per ogni tentativo in più, meno 3 per ogni mattoncino d'aiuto. Dopo 3 tentativi Virgola propone i mattoncini.
- **Racconta la storia**: ordine fino a 6 (meno 2 per errore) + racconto fino a 4 (parole ponte usate e vignette citate).
- **Descrivi la scena**: fino a 6 per il numero di parole + 4 per la parola segreta.

Le regole sono in `js/punteggi.js` se la logopedista suggerisce di cambiarle.

## 4. Aggiornare l'app

Dopo una modifica al codice: aumentate `VERSIONE` in `sw.js` (es. `pv-v1.0.1`), poi `git commit` e `git push`. I dispositivi prendono la nuova versione alla successiva apertura (a volte serve chiudere e riaprire l'app).

## 5. Privacy

- La voce viene riconosciuta sul dispositivo (Vosk). Con il motore "Browser online" (sconsigliato, va attivato a mano) l'audio andrebbe ai server di Google.
- Le registrazioni non vengono salvate: restano in memoria finché si cambia esercizio. Si scaricano solo con il tasto apposito.
- Nel repository privato finiscono: nome, impostazioni, scene, foto caricate, e i progressi, **incluso il testo delle frasi riconosciute** (serve per "Da rivedere" e per il riepilogo).
- I pittogrammi vengono scaricati da ARASAAC (solo le immagini; nessun dato vostro).

## 6. Limiti noti

- Il riconoscimento della voce di una bambina non è perfetto: per questo ci sono i sinonimi, la sezione "Da rivedere" e l'aiuto con i mattoncini.
- I pittogrammi ARASAAC servono internet la prima volta, poi restano in cache. Se una ricerca non trova l'immagine adatta, scegliete il pittogramma a mano o usate una foto.
- Il modello vocale incluso è `vosk-model-small-it-0.4`. Si può sostituire con uno più recente (`vosk-model-small-it-0.22` da alphacephei.com): estraete lo zip e ricomprimetelo come `tar.gz` con la cartella del modello in radice, poi salvatelo con lo stesso nome in `models/`.
- Uso personale e familiare: non è un dispositivo medico e non sostituisce la logopedista.

## Struttura

```
index.html, manifest.webmanifest, sw.js   app installabile e offline
css/app.css                               stile
js/                                       logica (moduli ES, nessuna compilazione)
  screens/                                schermate: giochi, risultati, area genitori, editor
data/scene-iniziali.json                  34 scene e 5 storie iniziali
img/                                      logo, Punto, Virgola, icone
models/vosk-model-small-it.tar.gz         modello vocale italiano (Apache 2.0)
vendor/                                   vosk-browser, qrcode-generator, jsQR, font
```

## Crediti e licenze

- Pittogrammi: Sergio Palao. Origine: ARASAAC (https://arasaac.org). Licenza: CC BY-NC-SA. Proprietà: Governo di Aragona (Spagna).
- Riconoscimento vocale: Vosk, Alpha Cephei (Apache 2.0, vedi `models/COPYING` e `models/NOTICE`), tramite vosk-browser (Apache 2.0).
- Font: Fredoka e Andika (SIL Open Font License).
- QR code: qrcode-generator (MIT) e jsQR (Apache 2.0).
