import { mkdir, copyFile, writeFile } from 'node:fs/promises';
const api = new URL(process.env.API_URL);
if (api.protocol !== 'https:') throw new Error('API_URL doit utiliser HTTPS.');
await mkdir('dist', { recursive: true });
for (const fichier of ['index.html','style.css','app.js']) await copyFile(fichier, 'dist/' + fichier);
await writeFile('dist/config.js', 'const API_URL = ' + JSON.stringify(api.origin) + ';');
