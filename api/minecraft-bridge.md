# Bridge Minecraft ↔ Site ARKOS

## Pourquoi ne pas lire directement le serveur depuis le navigateur ?

Le frontend ne doit jamais exposer :

- mot de passe RCON
- token d'API
- accès base de données
- IP/ports internes sensibles

Le bon schéma est donc :

```text
Minecraft / Plugins / Scripts
          │
          ▼
  Backend ARKOS sécurisé
          │
          ▼
      Base SQLite
          │
          ▼
      Frontend ARKOS
```

## À quoi servent les fichiers `ajlb_*` ?

Les fichiers `ajlb_*` sont des **exports HTML de classements**.
Ils sont pratiques pour conserver l'existant, mais ce ne sont pas des données temps réel propres pour l'avenir.

### Recommandation

- **Court terme** : garder ces pages comme archive fonctionnelle.
- **Moyen terme** : remplacer progressivement par des endpoints JSON.

## Endpoints déjà prévus

### 1. Heartbeat serveur

`POST /api/bridge/heartbeat`

Header :

```text
X-Arkos-Bridge-Token: TON_TOKEN_SECRET
```

Payload exemple :

```json
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

### 2. Synchronisation joueurs

`POST /api/bridge/players`

```json
{
  "players": [
    {
      "pseudo": "Kael",
      "uuid": "uuid-ici",
      "playtime": "684 h",
      "money": 12450000,
      "votes": 119,
      "grade": "Titan",
      "job": "Marchand",
      "sanctions": "Aucune"
    }
  ]
}
```

### 3. Logs / événements

`POST /api/bridge/log`

```json
{
  "actor": "Bridge",
  "message": "Vote reçu pour Kael sur ServeursMinecraft"
}
```

## Trois méthodes possibles pour relier ton serveur

### Option A — Plugin Paper/Spigot dédié

Le plus propre.

Le plugin :

- lit les infos serveur
- lit l'économie / grades / votes via APIs plugins
- envoie les données au backend ARKOS toutes les 30 à 60 secondes

Tu peux récupérer par exemple :

- **LuckPerms** pour les grades / permissions
- **Vault** pour l'argent
- **VotingPlugin** pour les votes
- **PlaceholderAPI** pour certains placeholders
- **BlueMap / Dynmap** pour la carte

### Option B — Script local côté machine serveur

Tu peux faire un script Python/Node/Bash qui :

- interroge RCON
- lit certains fichiers / bases plugins
- envoie ensuite les données au backend ARKOS

Pratique pour commencer rapidement.

### Option C — API plugins spécifiques

Certains plugins exposent déjà leurs données.
Tu peux alors faire un petit service intermédiaire qui :

- appelle leurs APIs
- normalise les données
- les pousse vers `/api/bridge/*`

## Exemple très simple en Java (pseudo-code plugin Paper)

```java
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://ton-site.example/api/bridge/heartbeat"))
    .header("Content-Type", "application/json")
    .header("X-Arkos-Bridge-Token", BRIDGE_TOKEN)
    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
    .build();
```

## Exemple très simple en Python

```python
import requests

requests.post(
    "https://ton-site.example/api/bridge/heartbeat",
    headers={"X-Arkos-Bridge-Token": "TON_TOKEN"},
    json={
        "online": True,
        "version": "1.21.8",
        "players_online": 92,
        "players_max": 300,
        "cpu": 35,
        "ram": 61,
        "storage": 58,
        "uptime": "5j 03h"
    },
    timeout=10,
)
```

## Pour envoyer des commandes Minecraft depuis le panel

Deux solutions :

### RCON

Définis dans `.env` :

```env
RCON_HOST=127.0.0.1
RCON_PORT=25575
RCON_PASSWORD=motdepassefort
```

Le backend enverra les commandes au serveur.

### Wrapper local

Définis :

```env
MINECRAFT_COMMAND_WRAPPER=/opt/arkos/send-command.sh
```

Le backend délègue alors la commande à un script local sécurisé.

## Ce que je te conseille concrètement

1. Garde les pages `ajlb_*` pour l'historique.
2. Active le backend ARKOS.
3. Crée un petit plugin Paper ou script Python.
4. Envoie d'abord uniquement :
   - statut serveur
   - joueurs online
   - argent
   - votes
   - grades
5. Ensuite seulement, migre les classements vers JSON.

## Important sécurité

- **Jamais** de token dans le frontend.
- **Jamais** de mot de passe RCON dans JavaScript.
- Passe uniquement par le backend.
- Utilise un `BRIDGE_TOKEN` long et secret.
- Si tu exposes le site via Cloudflare Tunnel, garde le backend derrière le même domaine proxifié.
