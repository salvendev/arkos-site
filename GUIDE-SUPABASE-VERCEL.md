# 🚀 Mise en ligne du site ARKOS sur Vercel + Supabase

> Guide **pas à pas pour débutants**. Tu vas mettre ton site ARKOS en ligne avec :
> - **Vercel** pour heberger le site et l'API (gratuit)
> - **Supabase** pour la base de données PostgreSQL (gratuit)
>
> Le site est déjà en français, la marque **ARKOS** (plus SwayNight), et les couleurs **vertes**.
> Ce guide te montre comment le publier et comment **relier le serveur Minecraft + les votes**.

---

## Sommaire
1. Ce qu'il te faut avant de commencer
2. Étape 1 — Créer la base de données sur Supabase
3. Étape 2 — Mettre ton code sur GitHub
4. Étape 3 — Déployer sur Vercel (branchement à Supabase)
5. Étape 4 — Tester ton site et ton panneau admin
6. Étape 5 — Relier le serveur Minecraft (status + joueurs + commandes)
7. Étape 6 — Activer les votes et les récompenses en jeu
8. Questions fréquentes (FAQ)

---

## 1. Ce qu'il te faut avant de commencer

| Compte | Où | Pourquoi |
|---|---|---|
| **GitHub** | https://github.com | Stocker ton code et le connecter à Vercel |
| **Vercel** | https://vercel.com | Heberger le site (gratuit) |
| **Supabase** | https://supabase.com | Stocker la base de données (gratuit) |

> Tout est **gratuit** pour démarrer (plan gratuit des 3 services).

---

## 2. Étape 1 — Créer la base de données sur Supabase

1. Va sur **https://supabase.com** et connecte-toi (tu peux te connecter avec ton compte GitHub).
2. Clique sur **New project**.
   - **Name** : `arkos`
   - **Database password** : choisis un mot de passe fort (note-le, il sert pour la connexion PostgreSQL)
   - **Region** : choisis `Europe (Frankfurt)` ou `Europe (Paris)` si tu es en France.
3. Clique **Create new project**. Patient ~2 minutes.
4. Une fois créé, ouvre **SQL Editor** (menu de gauche).
5. Ouvre le fichier `supabase/schema.sql` de ce projet, **copie tout son contenu** et colle-le dans l'éditeur SQL, puis clique **Run**.
6. Ouvre maintenant le fichier `supabase/seed.sql`, colle son contenu dans un **nouvel éditeur SQL**, puis **Run**.
   - Cela crée le compte admin, les sites de vote et les récompenses.

> ✅ Tu viens de créer les tables et les premières données.

### Récupérer l'URL de connexion PostgreSQL
1. Dans Supabase, menu **Project Settings** → **Database**.
2. Dans **Connection string**, copie l'URL **Transaction pooler** (ou **Session pooler**), par exemple :
   ```
   postgresql://postgres.abcdef:motdepasse@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
   ```
3. Note cette URL : c'est ta variable `DATABASE_URL`.

---

## 3. Étape 2 — Mettre ton code sur GitHub

1. Crée un dépôt (repository) sur GitHub, par exemple nommé **arkos-site** (peut être privé, Vercel gère la connexion).
2. Depuis un terminal sur ton ordinateur, envoie le contenu de ce dossier :

```bash
git init
git add .
git commit -m "ARKOS site + Supabase + Vercel"
git branch -M main
git remote add origin https://github.com/TON_PSEUDO/arkos-site.git
git push -u origin main
```

> Pour Vercel, tout est déjà configuré dans `vercel.json`. Tu n'as rien à écrire à la main.

---

## 4. Étape 3 — Déployer sur Vercel

1. Va sur **https://vercel.com** et connecte-toi avec ton compte GitHub.
2. Clique **Add New** → **Project**.
3. Importe le dépôt **arkos-site**.
4. Vercel détecte automatiquement le projet (Python). Laisse les réglages par défaut.
5. **Important** — Ajoute les **variables d'environnement** (menu *Environment Variables* de la page de déploiement). Ajoute au moins celles-ci :

| Nom | Valeur (exemple) |
|---|---|
| `DATABASE_URL` | L'URL PostgreSQL de Supabase copiée plus haut |
| `FLASK_SECRET_KEY` | Une longue chaîne aléatoire (ex : `a1b2c3...` touche au hasard) |
| `ADMIN_PASSWORD` | Ton futur mot de passe admin (ex : `change-moi-123`) |
| `BRIDGE_TOKEN` | Un long secret pour le lien serveur Minecraft (ex : `un-token-tres-secret-123`) |
| `RCON_HOST` | L'adresse IP/hôte de ton serveur Minecraft (ou vide pour l'instant) |
| `RCON_PORT` | `25575` |
| `RCON_PASSWORD` | Le mot de passe RCON de ton serveur (si tu en as un) |
| `VOTE_REWARD_COMMAND` | `ar vote {player} 250` |

6. Clique **Deploy**.

> ⏳ Le premier déploiement prend quelques minutes. Ensuite tu obtiens une URL du type :
> `https://arkos-site.vercel.app`

---

## 5. Étape 4 — Tester ton site et ton panneau admin

- Ouvre ton URL Vercel → tu vois le **site ARKOS** (accueil, votes, classements, boutique, etc.).
- Va sur `https://TON-SITE.vercel.app/admin` → tu arrives sur le **panneau admin**.
- Connecte-toi avec :
  - **Email** : `admin@arkos.local`
  - **Mot de passe** : celui que tu as mis dans `ADMIN_PASSWORD`

> 🔐 **Change le mot de passe admin dès la première connexion** (via le compte Supabase tu peux aussi régénérer le hash).

Dans le panneau tu peux gérer : le serveur (démarrer/arrêter), la console (commandes RCON), les joueurs, les grades, la boutique, les **sites de vote**, les actualités, les événements, les tickets, les utilisateurs, les logs et les paramètres.

---

## 6. Étape 5 — Relier le serveur Minecraft

Le site et le serveur Minecraft communiquent par un petit **pont (bridge)** sécurisé grâce au `BRIDGE_TOKEN`.

### A) Statut du serveur (ONLINE, joueurs, version)
Une fois par minute, ton serveur (plugin ou script) envoie des données au site :

```
POST https://TON-SITE.vercel.app/api/bridge/heartbeat
Header: X-Arkos-Bridge-Token: TON_BRIDGE_TOKEN
Body:
{
  "online": true,
  "version": "1.21.8",
  "players_online": 87,
  "players_max": 300,
  "bedrock_port": "19132",
  "uptime": "3j 12h",
  "cpu": 38,
  "ram": 66,
  "storage": 57,
  "motd": "ARKOS • Économie • Quêtes"
}
```

### B) Synchroniser les joueurs + votes
```
POST https://TON-SITE.vercel.app/api/bridge/players
Body: { "players": [ { "pseudo": "Kael", "uuid": "...", "money": 12450000, "votes": 119, "grade": "Titan", "job": "Marchand" } ] }
```

Des exemples (Python et Java/Paper) sont disponibles dans `api/minecraft-bridge.md`.

### C) Envoyer des commandes depuis le panneau admin (RCON)
Dans le panneau admin → **Console**, tape une commande : elle sera exécutée sur ton serveur via RCON.
Pour que ça marche, configure les variables d'environnement Vercel :

```
RCON_HOST=IP_DE_TON_SERVEUR
RCON_PORT=25575
RCON_PASSWORD=TON_MOT_DE_PASSE_RCON
```

> 🌐 Si tu utilises un tunnel Cloudflare, garde le backend derrière le même domaine proxifié, mais ne mets **jamais** le token RCON dans le navigateur. Tout passe par le backend.

---

## 7. Étape 6 — Activer les votes et les récompenses

Le vote se fait sur la page `/vote.html` :
1. Le visiteur entre son pseudo Minecraft.
2. Il clique sur un site de vote.
3. Le backend enregistre le vote → `POST /api/vote/record` (avec un cooldown par joueur et par site pour éviter les abus).
4. Le backend exécute la **commande de récompense** sur le serveur (via RCON).

### Configurer la commande de récompense
- **Globalement** : variable d'environnement `VOTE_REWARD_COMMAND` (ex : `ar vote {player} 250`).
- **Par site de vote** : dans le panneau admin → **Votes**, modifie la colonne **Commande en jeu** et clique **Enregistrer**.
  - Utilise `{player}` qui sera remplacé par le pseudo du joueur.
  - Exemple : `ar vote {player} 250` → crédite 250 monnaies au joueur qui vote.

---

## 8. Questions fréquentes

**J'ai une erreur `Access refused` ou `Accès refusé` ?**
Le backend bloque l'accès aux dossiers `backend`, `database`, `cloudflare`. C'est normal (protection).

**Le site est lent au premier chargement ?**
Sur le plan gratuit Vercel, le backend Python a un "cold start" (démarrage à froid) qui peut ajouter 300–800 ms sur les premières requêtes. C'est normal ; les requêtes suivantes sont rapides.

**Comment changer le mot de passe admin ?**
Modifie d'abord `ADMIN_PASSWORD` dans les variables Vercel. Pour changer vraiment le hash en base, le plus simple est de recréer l'utilisateur dans Supabase (Table Editor → `users`).

**Où sont stockés les données ?**
Dans ta base **Supabase** (PostgreSQL). Vercel n'héberge que le code. C'est pourquoi on utilise `DATABASE_URL`.

**Pourquoi ne pas voir la partie RCON fonctionner depuis l'admin ?**
Il faut renseigner `RCON_HOST`, `RCON_PORT`, `RCON_PASSWORD`. Sans ces valeurs, la commande est "enregistrée" mais pas exécutée (message explicite).

---

## 🐳 Autre option : déployer en local avec Docker

Si tu préfères héberger toi-même, tu peux lancer tout le site + backend avec Docker :

```bash
cp .env.example .env
docker compose up -d --build
```

- Site : http://localhost:8080
- API : http://localhost:5000
- Admin : http://localhost:8080/admin

Ce mode utilise SQLite par défaut (aucune base externe nécessaire).

Bonne mise en ligne ! 🎉
