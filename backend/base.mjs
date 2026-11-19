const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
let db;

if (!url || !key) {
  if (process.env.RENDER || process.env.NODE_ENV === 'production' || url || key) {
    throw new Error('Configurer SUPABASE_URL et SUPABASE_SECRET_KEY.');
  }
  const { DatabaseSync } = await import('node:sqlite');
  db = new DatabaseSync(process.env.SQLITE_FILE || new URL('./tickets.sqlite', import.meta.url).pathname.replace(/^\/([A-Z]:)/i, '$1'));
  db.exec(`CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY, titre TEXT NOT NULL, description TEXT NOT NULL,
    statut TEXT NOT NULL DEFAULT 'Ouvert' CHECK (statut IN ('Ouvert','En cours','Résolu')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
}

async function supabase(method, query, body) {
  const response = await fetch(new URL('/rest/v1/tickets?' + query, url), {
    method,
    headers: { apikey: key, Prefer: 'return=representation', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error('Supabase HTTP ' + response.status);
  return response.json();
}

export function lister() {
  if (db) return db.prepare('SELECT * FROM tickets ORDER BY id DESC').all();
  return supabase('GET', 'select=*&order=id.desc');
}

export async function creer(titre, description) {
  if (db) return db.prepare('INSERT INTO tickets(titre,description) VALUES (?,?) RETURNING *').get(titre, description);
  const lignes = await supabase('POST', '', { titre, description });
  return lignes[0];
}

export async function modifier(id, statut) {
  if (db) return db.prepare('UPDATE tickets SET statut=? WHERE id=? RETURNING *').get(statut, id);
  const lignes = await supabase('PATCH', 'id=eq.' + id, { statut });
  return lignes[0];
}
