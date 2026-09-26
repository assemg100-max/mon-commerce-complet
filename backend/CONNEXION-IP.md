# Fonction « Informations de connexion »

Le backend expose désormais deux routes pour une utilisation transparente des adresses IP :

## 1. Affichage au visiteur

```http
GET /api/connexion-info
```

Réponse type :

```json
{
  "ip": "203.0.113.10",
  "message": "Cette adresse IP est affichée de manière transparente par le site.",
  "collectedFor": "Informations de connexion et diagnostic du fonctionnement du serveur.",
  "timestamp": "2026-09-26T00:00:00.000Z"
}
```

Le frontend peut appeler cette route sur la page **Informations de connexion**, puis afficher `ip` avec un texte explicite informant le visiteur.

## 2. Consultation administrateur

```http
GET /api/admin/connexions
Authorization: Bearer <jeton-admin>
```

La route est protégée par `requireAdmin`. Elle retourne les 200 dernières requêtes en mémoire, avec l’IP, la date, la méthode et le chemin. Le journal est volontairement non persistant et est vidé lors du redémarrage du serveur.

## Proxy et déploiement

Le serveur active `trust proxy` par défaut afin de récupérer l’IP publique transmise par un proxy de déploiement comme Render. Pour désactiver ce comportement dans un déploiement sans proxy, définir :

```bash
TRUST_PROXY=false
```

Cette fonction doit rester présentée clairement au visiteur et ne doit pas être utilisée pour une collecte dissimulée.
