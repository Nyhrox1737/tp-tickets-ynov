const formulaire = document.querySelector('#formulaire');
const liste = document.querySelector('#tickets');
const message = document.querySelector('#message');

async function requete(route, methode = 'GET', donnees) {
  const options = { method: methode };
  if (donnees) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(donnees);
  }
  const reponse = await fetch(API_URL + route, options);
  const resultat = await reponse.json();
  if (!reponse.ok) throw new Error(resultat.erreur || 'La demande a échoué.');
  return resultat;
}

function afficher(ticket) {
  const article = document.createElement('article');
  const titre = document.createElement('h3');
  titre.textContent = '#' + ticket.id + ' · ' + ticket.titre;
  const description = document.createElement('p');
  description.textContent = ticket.description;
  const statut = document.createElement('select');
  statut.setAttribute('aria-label', 'Statut du ticket ' + ticket.id);
  for (const valeur of ['Ouvert', 'En cours', 'Résolu']) statut.add(new Option(valeur, valeur));
  statut.value = ticket.statut;
  statut.onchange = async () => {
    statut.disabled = true;
    try {
      const resultat = await requete('/api/tickets/' + ticket.id, 'PATCH', { statut: statut.value });
      ticket.statut = resultat.statut;
      message.textContent = 'Statut enregistré.';
    } catch (erreur) {
      statut.value = ticket.statut;
      message.textContent = erreur.message;
    } finally { statut.disabled = false; }
  };
  article.append(titre, description, statut);
  return article;
}

async function charger() {
  try {
    const tickets = await requete('/api/tickets');
    liste.replaceChildren(...tickets.map(afficher));
    if (!tickets.length) message.textContent = 'Aucun ticket pour le moment.';
  } catch { message.textContent = 'Impossible de charger les tickets. Actualise la page pour réessayer.'; }
}

formulaire.onsubmit = async (event) => {
  event.preventDefault();
  const bouton = formulaire.querySelector('button');
  bouton.disabled = true;
  try {
    const ticket = await requete('/api/tickets', 'POST', Object.fromEntries(new FormData(formulaire)));
    liste.prepend(afficher(ticket));
    formulaire.reset();
    message.textContent = 'Ticket créé.';
  } catch (erreur) { message.textContent = erreur.message; }
  finally { bouton.disabled = false; }
};

charger();
