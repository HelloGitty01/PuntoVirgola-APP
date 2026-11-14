// Accesso al repository dati privato tramite l'API Contents di GitHub.
const API = 'https://api.github.com';

function b64DaTesto(testo) {
  const bytes = new TextEncoder().encode(testo);
  return b64DaBytes(bytes);
}
function b64DaBytes(bytes) {
  let bin = '';
  const passo = 0x8000;
  for (let i = 0; i < bytes.length; i += passo) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + passo));
  return btoa(bin);
}
function testoDaB64(b64) {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export class ErroreGitHub extends Error {
  constructor(msg, stato) { super(msg); this.stato = stato; }
}

export class GitHub {
  constructor(owner, repo, token) {
    this.owner = owner.trim();
    this.repo = repo.trim();
    this.token = token.trim();
  }

  url(path) {
    const p = path.split('/').map(encodeURIComponent).join('/');
    return `${API}/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/contents/${p}`;
  }

  async chiama(metodo, url, corpo, accept = 'application/vnd.github+json') {
    let res;
    try {
      res = await fetch(url, {
        method: metodo,
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: accept,
          'X-GitHub-Api-Version': '2022-11-28',
          ...(corpo ? { 'Content-Type': 'application/json' } : {})
        },
        body: corpo ? JSON.stringify(corpo) : undefined
      });
    } catch (e) {
      throw new ErroreGitHub('Nessuna connessione a GitHub', 0);
    }
    return res;
  }

  async verifica() {
    const res = await this.chiama('GET', `${API}/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}`);
    if (res.status === 401) throw new ErroreGitHub('Token non valido o scaduto', 401);
    if (res.status === 404) throw new ErroreGitHub('Repository non trovato (controlla nome e permessi del token)', 404);
    if (!res.ok) throw new ErroreGitHub('Errore GitHub ' + res.status, res.status);
    const info = await res.json();
    return { privato: info.private, scrittura: !!(info.permissions && (info.permissions.push || info.permissions.admin)) };
  }

  // Restituisce { dati, sha } oppure null se il file non esiste.
  async leggiJSON(path) {
    const res = await this.chiama('GET', this.url(path));
    if (res.status === 404) return null;
    if (!res.ok) throw new ErroreGitHub('Lettura non riuscita: ' + path, res.status);
    const info = await res.json();
    let testo;
    if (info.content) testo = testoDaB64(info.content);
    else {
      const raw = await this.chiama('GET', this.url(path), null, 'application/vnd.github.raw+json');
      testo = await raw.text();
    }
    return { dati: JSON.parse(testo), sha: info.sha };
  }

  async scriviFile(path, contenutoB64, messaggio, sha) {
    const corpo = { message: messaggio, content: contenutoB64 };
    if (sha) corpo.sha = sha;
    const res = await this.chiama('PUT', this.url(path), corpo);
    if (res.status === 409 || res.status === 422) {
      throw new ErroreGitHub('Il file è stato modificato da un altro dispositivo', 409);
    }
    if (!res.ok) throw new ErroreGitHub('Scrittura non riuscita: ' + path + ' (' + res.status + ')', res.status);
    const info = await res.json();
    return info.content && info.content.sha;
  }

  scriviJSON(path, dati, messaggio, sha) {
    return this.scriviFile(path, b64DaTesto(JSON.stringify(dati, null, 2)), messaggio, sha);
  }

  async scriviBinario(path, blob, messaggio) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return this.scriviFile(path, b64DaBytes(bytes), messaggio);
  }

  // Elenco di una cartella: [{ name, path, type, sha }]
  async elenca(path) {
    const res = await this.chiama('GET', this.url(path));
    if (res.status === 404) return [];
    if (!res.ok) throw new ErroreGitHub('Elenco non riuscito: ' + path, res.status);
    const dati = await res.json();
    return Array.isArray(dati) ? dati : [];
  }

  async leggiBlob(path) {
    const res = await this.chiama('GET', this.url(path), null, 'application/vnd.github.raw+json');
    if (!res.ok) throw new ErroreGitHub('Immagine non trovata: ' + path, res.status);
    return res.blob();
  }

  async elimina(path, sha, messaggio) {
    const res = await this.chiama('DELETE', this.url(path), { message: messaggio, sha });
    if (!res.ok && res.status !== 404) throw new ErroreGitHub('Eliminazione non riuscita', res.status);
  }
}
