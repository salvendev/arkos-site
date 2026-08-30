# ARKOS — Portail web Minecraft auto-hébergeable

Cette refonte transforme la base statique fournie en **portail officiel ARKOS** avec :

- identité visuelle verte / forêt / premium
- landing page moderne
- pages vote / classements / actualités / boutique / carte / événements
- **admin panel** complet sous `/admin`
- backend Flask + SQLite
- architecture Docker
- compatibilité **Cloudflare Tunnel**
- préparation au lien sécurisé entre le site et le serveur Minecraft

---

## 1. Structure actuelle

Le projet conserve la base existante et la modernise :

```text
index.html
rankings.html
vote.html
youtube.html
shop.html
events.html
map.html
user/
news/
rankings/
admin/
assets/
backend/
database/
data/
api/
cloudflare/
```

Les exports historiques `rankings/ajlb_*` sont conservés pour ne pas casser l'existant.

---

## 2. Lancement rapide

### Prérequis

- Docker
- Docker Compose

### Installation

```bash
cp .env.example .env
docker compose up -d --build
```

### Accès

- Frontend : `http://localhost:8080`
- API backend : `http://localhost:5000`
- Admin : `http://localhost:8080/admin`

### Compte admin seed

- Email : `admin@arkos.local`
- Mot de passe par défaut : valeur de `ADMIN_PASSWORD` dans `.env`

**Change ce mot de passe immédiatement après installation.**

---

## 3. Pages disponibles

### Site public

- `/`
- `/rankings.html`
- `/vote.html`
- `/youtube.html`
- `/shop.html`
- `/events.html`
- `/map.html`
- `/news/jouer.html`
- `/news/1/like.html`
- `/user/login.html`
- `/user/register.html`
- `/user/password/reset.html`
- `/user/index.html`

### Administration

- `/admin`
- `/admin/login.html`
- `/admin/server.html`
- `/admin/console.html`
- `/admin/players.html`
- `/admin/player.html`
- `/admin/ranks.html`
- `/admin/shop.html`
- `/admin/products.html`
- `/admin/votes.html`
- `/admin/news.html`
- `/admin/events.html`
- `/admin/tickets.html`
- `/admin/users.html`
- `/admin/staff.html`
- `/admin/logs.html`
- `/admin/settings.html`
- `/admin/maintenance.html`

---

## 4. Backend et sécurité

Le backend fournit :

- authentification
- sessions sécurisées
- mot de passe hashé
- contrôle d'accès admin
- jeton CSRF pour les actions authentifiées
- rate limiting simple
- logs d'actions administrateur
- endpoints bridge pour le serveur Minecraft

Fichiers principaux :

- `backend/app.py`
- `database/schema.sql`
- `data/site-content.json`

---

## 5. Comment relier ton serveur Minecraft au site ?

C'est le point important.

### Règle d'or

**Le frontend ne doit jamais parler directement à ton serveur Minecraft avec des identifiants sensibles.**

Le lien doit être fait ainsi :

```text
Serveur Minecraft / Plugins / Script local
                ↓
        Backend ARKOS sécurisé
                ↓
          Base de données
                ↓
            Frontend web
```

### Endpoints prévus

- `POST /api/bridge/heartbeat`
- `POST /api/bridge/players`
- `POST /api/bridge/log`

Le token secret est envoyé dans le header :

```text
X-Arkos-Bridge-Token: TON_TOKEN_SECRET
```

### Données que tu peux remonter au début

Je te conseille de commencer par seulement :

1. statut online/offline
2. nombre de joueurs connectés
3. version du serveur
4. CPU / RAM / stockage
5. joueurs online
6. argent
7. votes
8. grade
9. métier

### Méthodes possibles

#### Option 1 — Plugin Paper / Spigot dédié

La meilleure solution.

Ce plugin envoie régulièrement les données du serveur au backend ARKOS.

Tu peux lire :

- **Vault** → argent
- **LuckPerms** → grades / permissions
- **VotingPlugin** → votes
- **PlaceholderAPI** → placeholders utiles
- **BlueMap / Dynmap** → carte

#### Option 2 — Script Python / Node sur la machine du serveur

Très bien pour commencer vite.

Le script :

- interroge RCON
- lit certains fichiers / bases de plugins
- pousse les infos vers `/api/bridge/*`

#### Option 3 — API de plugins existants

Si un plugin expose déjà une API, tu peux la consommer dans un petit service intermédiaire puis pousser le résultat vers le backend ARKOS.

---

## 6. Et les fichiers `ajlb_mycommand` ?

Les fichiers `ajlb_mycommand_*` et plus largement `ajlb_*` sont des **exports HTML de classements**.

### Ce qu'il faut comprendre

- ils sont utiles pour **conserver les classements existants**
- ils ne sont pas idéaux pour faire du vrai temps réel
- ils peuvent rester en place pendant la migration

### Stratégie recommandée

#### Court terme

- garder ces pages
- continuer à les afficher dans `rankings/`
- utiliser le nouveau design ARKOS

#### Moyen terme

- créer des endpoints JSON pour chaque classement
- remplacer progressivement les pages HTML exportées par du rendu dynamique

Exemples :

- `/api/public/rankings/richesse`
- `/api/public/rankings/playtime`
- `/api/public/rankings/votes`

---

## 7. Commandes admin et serveur Minecraft

Pour envoyer des commandes depuis le panel, deux options sont prévues.

### A. RCON

Dans `.env` :

```env
RCON_HOST=127.0.0.1
RCON_PORT=25575
RCON_PASSWORD=ton_mot_de_passe_rcon
```

Le backend utilisera RCON pour les commandes console.

### B. Wrapper local

Dans `.env` :

```env
MINECRAFT_COMMAND_WRAPPER=/opt/arkos/send-command.sh
```

Le backend délègue alors l'exécution à un script local sécurisé.

---

## 8. Cloudflare Tunnel

Le projet est prêt pour un accès externe sans ouvrir de ports dangereux.

### Méthode simple avec token

1. Crée un tunnel Cloudflare
2. Récupère le `TUNNEL_TOKEN`
3. Ajoute-le dans `.env`
4. Lance :

```bash
docker compose --profile tunnel up -d
```

### Exemple de config

Voir :

- `cloudflare/config.example.yml`

Le tunnel doit pointer vers le service `frontend:80`.

---

## 9. PostgreSQL plus tard

La V1 utilise SQLite pour simplifier l'installation.

Mais la composition Docker inclut déjà un service PostgreSQL optionnel :

```bash
docker compose --profile postgres up -d
```

La migration pourra se faire ensuite via une couche d'accès aux données plus avancée.

---

## 10. Conseils pour la suite

Si tu veux brancher le site à ton vrai serveur Minecraft, je te recommande dans cet ordre :

1. mettre une vraie IP / vrai domaine dans `data/site-content.json`
2. définir un `BRIDGE_TOKEN` fort
3. activer le backend Docker
4. créer un petit script ou plugin qui pousse le heartbeat
5. ajouter la synchro joueurs
6. brancher RCON
7. migrer les classements importants de `ajlb_*` vers JSON
8. ensuite seulement ajouter OAuth Discord, BlueMap, LuckPerms, Tebex, etc.

---

## 11. Documentation utile dans le repo

- `api/minecraft-bridge.md`
- `database/schema.sql`
- `.env.example`
- `docker-compose.yml`
- `backend/app.py`

---

## 12. Remarque importante

Cette version fournit :

- une vraie base ARKOS visuelle
- un panel admin structuré
- une architecture auto-hébergeable
- une passerelle backend prête pour le lien avec Minecraft

Les intégrations temps réel les plus poussées dépendront ensuite des plugins exacts utilisés sur ton serveur Paper/Spigot.
