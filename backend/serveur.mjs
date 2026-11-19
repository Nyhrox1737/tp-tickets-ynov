import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { lister, creer, modifier } from './base.mjs';

const production = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);
const port = Number(process.env.PORT || 8000);
const origine = process.env.FRONTEND_ORIGIN || 'http://localhost:' + port;
if (production && !process.env.FRONTEND_ORIGIN) throw new Error('Configurer FRONTEND_ORIGIN.');
const fichiers = { '/': ['index.html','text/html'], '/style.css': ['style.css','text/css'], '/app.js': ['app.js','text/javascript'], '/config.js': ['config.js','text/javascript'] };

async function lireJSON(req) {
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') throw new Error('FORMAT');
  let taille = 0;
  const morceaux = [];
  for await (const morceau of req) {
    taille += morceau.length;
    if (taille > 20000) throw new Error('TAILLE');
    morceaux.push(morceau);
  }
  return JSON.parse(Buffer.concat(morceaux).toString()) ?? {};
}

createServer(async (req, res) => {
  const chemin = req.url.split('?')[0];
  function json(code, valeur) {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(valeur));
  }
  try {
    if (req.headers.origin && req.headers.origin !== origine) return json(403, { erreur: 'Origine refusée.' });
    res.setHeader('Access-Control-Allow-Origin', origine);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    if (!production && req.method === 'GET' && Object.hasOwn(fichiers, chemin)) {
      const [nom, type] = fichiers[chemin];
      const contenu = await readFile(new URL('../frontend/' + nom, import.meta.url));
      res.writeHead(200, { 'Content-Type': type + '; charset=utf-8' });
      return res.end(contenu);
    }
    if (req.method === 'GET' && chemin === '/health') return json(200, { status: 'ok' });
    if (chemin === '/api/tickets' && req.method === 'GET') return json(200, await lister());
    if (chemin === '/api/tickets' && req.method === 'POST') {
      const data = await lireJSON(req);
      const titre = typeof data.titre === 'string' && data.titre.trim();
      const description = typeof data.description === 'string' && data.description.trim();
      if (!titre || titre.length > 120 || !description || description.length > 2000)
        return json(400, { erreur: 'Saisis un titre (120 caractères max.) et une description (2 000 max.).' });
      return json(201, await creer(titre, description));
    }
    const ticket = chemin.match(/^\/api\/tickets\/([1-9]\d*)$/);
    if (ticket && req.method === 'PATCH' && Number.isSafeInteger(Number(ticket[1]))) {
      const { statut } = await lireJSON(req);
      if (!['Ouvert', 'En cours', 'Résolu'].includes(statut)) return json(400, { erreur: 'Statut invalide.' });
      const ligne = await modifier(Number(ticket[1]), statut);
      return ligne ? json(200, ligne) : json(404, { erreur: 'Ticket introuvable.' });
    }
    json(404, { erreur: 'Route introuvable.' });
  } catch (err) {
    if (err instanceof SyntaxError) return json(400, { erreur: 'JSON invalide.' });
    if (err.message === 'FORMAT') return json(415, { erreur: 'Format JSON attendu.' });
    if (err.message === 'TAILLE') return json(413, { erreur: 'Formulaire trop long.' });
    console.error(err.message);
    json(503, { erreur: 'Service indisponible.' });
  }
}).listen(port, production ? '0.0.0.0' : '127.0.0.1', () => console.log('Serveur démarré sur le port ' + port));
