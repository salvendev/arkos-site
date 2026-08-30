from __future__ import annotations

import json
import os
import re
import sqlite3
import subprocess
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, redirect, request, send_from_directory, session
from werkzeug.security import check_password_hash, generate_password_hash

try:
    from mctools import RCONClient
except Exception:  # pragma: no cover
    RCONClient = None

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_FILE = BASE_DIR / 'data' / 'site-content.json'
SCHEMA_FILE = BASE_DIR / 'database' / 'schema.sql'
DB_PATH = Path(os.environ.get('DB_PATH', str(BASE_DIR / 'data' / 'arkos.sqlite3')))
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'arkosadmin')
BRIDGE_TOKEN = os.environ.get('BRIDGE_TOKEN', 'change-me-bridge-token')
RATE_LIMITS: dict[tuple[str, str], deque[float]] = defaultdict(deque)

with DATA_FILE.open('r', encoding='utf-8') as handle:
    SEED_DATA = json.load(handle)

app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'change-me-secret-key')
app.config.update(SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE='Lax')


FORBIDDEN_PREFIXES = {'.git', 'backend', 'database', 'cloudflare'}


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def adapt_sql(sql: str) -> str:
    """Transforme le style de placeholders SQLite en style PostgreSQL/psycopg."""
    sql = re.sub(r":([A-Za-z_][A-Za-z0-9_]*)", r"%(\1)s", sql)
    return sql.replace('?', '%s')


class PostgresConnection:
    """Wrapper minimal pour utiliser le même code avec SQLite (dev) ou Supabase/Postgres (prod)."""

    def __init__(self, conn: Any) -> None:
        self.conn = conn

    def execute(self, sql: str, params: Any = None):
        return self.conn.execute(adapt_sql(sql), params or ())

    def executescript(self, sql: str) -> Any:
        for statement in sql.split(';'):
            if statement.strip():
                self.conn.execute(statement)
        return self

    def commit(self) -> None:
        self.conn.commit()

    def close(self) -> None:
        self.conn.close()

    def __getattr__(self, name):
        return getattr(self.conn, name)


def get_db() -> Any:
    url = os.environ.get('DATABASE_URL')
    if url:
        import psycopg
        from psycopg.rows import dict_row
        conn = psycopg.connect(url, row_factory=dict_row)
        return PostgresConnection(conn)

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def seed_db() -> None:
    connection = get_db()
    with SCHEMA_FILE.open('r', encoding='utf-8') as handle:
        connection.executescript(handle.read())

    has_users = connection.execute('SELECT COUNT(*) FROM users').fetchone()[0]
    if has_users:
        connection.close()
        return

    connection.execute(
        'INSERT INTO users (name, email, password_hash, role, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?)',
        ('Admin', 'admin@arkos.local', generate_password_hash(ADMIN_PASSWORD), 'admin', now_iso(), now_iso()),
    )
    connection.execute(
        'INSERT INTO users (name, email, password_hash, role, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?)',
        ('Martin', 'martin@arkos.local', generate_password_hash('martin123'), 'staff', now_iso(), now_iso()),
    )

    for rank in SEED_DATA['ranks']:
        connection.execute(
            'INSERT INTO grades (id, name, color, price, benefits, permissions) VALUES (?, ?, ?, ?, ?, ?)',
            (rank['id'], rank['name'], rank['color'], rank['price'], rank['benefits'], json.dumps(rank['permissions'])),
        )

    for product in SEED_DATA['shop']['products']:
        connection.execute(
            'INSERT INTO products (id, category, name, description, price, discount, image) VALUES (?, ?, ?, ?, ?, ?, ?)',
            (product['id'], product['category'], product['name'], product['description'], product['price'], product['discount'], product['image']),
        )

    for site in SEED_DATA['vote_sites']:
        connection.execute(
            'INSERT INTO vote_sites (id, name, reward, reward_command, link, status, cooldown_minutes) VALUES (?, ?, ?, ?, ?, ?, ?)',
            (site['id'], site['name'], site['reward'], site.get('reward_command', ''), site['link'], site['status'], site['cooldown_minutes']),
        )

    for post in SEED_DATA['news']:
        connection.execute(
            'INSERT INTO news (id, title, summary, content, image, category, author, published, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (post['id'], post['title'], post['summary'], post['content'], post['image'], post['category'], post['author'], 1, post['date']),
        )

    for event in SEED_DATA['events']:
        connection.execute(
            'INSERT INTO events (id, name, description, image, event_date, rewards, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            (event['id'], event['name'], event['description'], '', event['date'], event['rewards'], event['status']),
        )

    for ticket in SEED_DATA['tickets']:
        connection.execute(
            'INSERT INTO tickets (id, player_name, category, subject, status, priority, history_count, assignee, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (ticket['id'], '', ticket['category'], ticket['subject'], ticket['status'], ticket['priority'], ticket['history'], ticket['assignee'], ticket['created_at']),
        )

    for player in SEED_DATA['players']:
        connection.execute(
            '''INSERT INTO minecraft_players
            (id, pseudo, uuid, first_connection, last_connection, playtime, money, votes, grade, job, sanctions, online)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (
                player['id'], player['pseudo'], player['uuid'], player['first_connection'], player['last_connection'],
                player['playtime'], player['money'], player['votes'], player['grade'], player['job'], player['sanctions'], int(player['online'])
            ),
        )

    for item in SEED_DATA['notifications']:
        connection.execute(
            'INSERT INTO notifications (message, level, created_at) VALUES (?, ?, ?)',
            (item['message'], item['level'], now_iso()),
        )

    for log in SEED_DATA['logs']:
        connection.execute(
            'INSERT INTO admin_logs (actor, action, created_at) VALUES (?, ?, ?)',
            (log['actor'], log['action'], log['time']),
        )

    server = SEED_DATA['server']
    connection.execute(
        '''INSERT INTO server_status
        (id, online, version, players_online, players_max, bedrock_port, uptime, cpu, ram, storage, motd, updated_at)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (
            int(server['status'] == 'ONLINE'), server['version'], server['players_online'], server['players_max'],
            server['bedrock_port'], server['uptime'], server['cpu'], server['ram'], server['storage'], server['motd'], now_iso()
        ),
    )

    for metric_name, values in SEED_DATA['dashboard']['charts'].items():
        for index, value in enumerate(values, start=1):
            connection.execute(
                'INSERT INTO metrics (metric_type, metric_date, value) VALUES (?, ?, ?)',
                (metric_name, f'J{index}', value),
            )

    connection.commit()
    connection.close()


def serialize_rows(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    return [dict(row) for row in rows]


def build_bundle() -> dict[str, Any]:
    connection = get_db()
    server_row = connection.execute('SELECT * FROM server_status WHERE id = 1').fetchone()
    players = serialize_rows(connection.execute('SELECT * FROM minecraft_players ORDER BY money DESC').fetchall())
    ranks = serialize_rows(connection.execute('SELECT * FROM grades ORDER BY id').fetchall())
    products = serialize_rows(connection.execute('SELECT * FROM products ORDER BY id').fetchall())
    vote_sites = serialize_rows(connection.execute('SELECT * FROM vote_sites ORDER BY id').fetchall())
    news_rows = serialize_rows(connection.execute('SELECT * FROM news WHERE published = 1 ORDER BY id DESC').fetchall())
    events = serialize_rows(connection.execute('SELECT * FROM events ORDER BY event_date').fetchall())
    tickets = serialize_rows(connection.execute('SELECT * FROM tickets ORDER BY id DESC').fetchall())
    notifications = serialize_rows(connection.execute('SELECT * FROM notifications ORDER BY id DESC LIMIT 5').fetchall())
    logs_rows = serialize_rows(connection.execute('SELECT actor, action, created_at FROM admin_logs ORDER BY id DESC LIMIT 25').fetchall())
    users = serialize_rows(connection.execute('SELECT id, name, email, role, created_at, last_login FROM users ORDER BY id').fetchall())
    charts = {metric: SEED_DATA['dashboard']['charts'][metric] for metric in SEED_DATA['dashboard']['charts']}
    connection.close()

    server = {
        'ip': SEED_DATA['server']['ip'],
        'bedrock_port': server_row['bedrock_port'],
        'version': server_row['version'],
        'status': 'ONLINE' if server_row['online'] else 'OFFLINE',
        'players_online': server_row['players_online'],
        'players_max': server_row['players_max'],
        'discord_members': SEED_DATA['server']['discord_members'],
        'uptime': server_row['uptime'],
        'cpu': server_row['cpu'],
        'ram': server_row['ram'],
        'storage': server_row['storage'],
        'motd': server_row['motd'],
    }

    dashboard = {
        'connected_players': sum(1 for player in players if player['online']),
        'total_players': len(players),
        'registered_players': len(users),
        'votes_today': SEED_DATA['dashboard']['votes_today'],
        'shop_revenue': SEED_DATA['dashboard']['shop_revenue'],
        'tickets_open': sum(1 for ticket in tickets if ticket['status'] != 'Fermé'),
        'reports': SEED_DATA['dashboard']['reports'],
        'server_status': server['status'],
        'cpu': server['cpu'],
        'ram': server['ram'],
        'storage': server['storage'],
        'uptime': server['uptime'],
        'charts': charts,
    }

    normalized_logs = [
        {'actor': row['actor'], 'action': row['action'], 'time': row['created_at']}
        for row in logs_rows
    ]

    normalized_ranks = []
    for rank in ranks:
        permissions = json.loads(rank['permissions']) if rank['permissions'] else []
        normalized_ranks.append({
            'id': rank['id'],
            'name': rank['name'],
            'color': rank['color'],
            'price': rank['price'],
            'benefits': rank['benefits'],
            'permissions': permissions,
        })

    normalized_players = []
    for player in players:
        normalized_players.append({
            'id': player['id'],
            'pseudo': player['pseudo'],
            'uuid': player['uuid'],
            'first_connection': player['first_connection'],
            'last_connection': player['last_connection'],
            'playtime': player['playtime'],
            'money': player['money'],
            'votes': player['votes'],
            'grade': player['grade'],
            'job': player['job'],
            'sanctions': player['sanctions'],
            'online': bool(player['online']),
        })

    return {
        **SEED_DATA,
        'server': server,
        'dashboard': dashboard,
        'players': normalized_players,
        'ranks': normalized_ranks,
        'shop': {'categories': SEED_DATA['shop']['categories'], 'products': products},
        'vote_sites': vote_sites,
        'news': [
            {
                'id': item['id'],
                'title': item['title'],
                'summary': item['summary'],
                'content': item['content'],
                'image': item['image'],
                'category': item['category'],
                'author': item['author'],
                'date': item['published_at'],
            }
            for item in news_rows
        ],
        'events': [
            {
                'id': event['id'],
                'name': event['name'],
                'description': event['description'],
                'date': event['event_date'],
                'rewards': event['rewards'],
                'status': event['status'],
            }
            for event in events
        ],
        'tickets': [
            {
                'id': ticket['id'],
                'category': ticket['category'],
                'subject': ticket['subject'],
                'status': ticket['status'],
                'priority': ticket['priority'],
                'history': ticket['history_count'],
                'assignee': ticket['assignee'],
                'created_at': ticket['created_at'],
            }
            for ticket in tickets
        ],
        'notifications': notifications,
        'logs': normalized_logs,
        'users': users,
    }


def current_user() -> dict[str, Any] | None:
    user = session.get('user')
    return user if isinstance(user, dict) else None


def require_admin(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        user = current_user()
        if not user or user.get('role') != 'admin':
            return jsonify({'message': 'Accès administrateur requis.'}), 403
        return func(*args, **kwargs)

    return wrapper


def require_bridge_token(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        token = request.headers.get('X-Arkos-Bridge-Token', '')
        if token != BRIDGE_TOKEN:
            return jsonify({'message': 'Token bridge invalide.'}), 401
        return func(*args, **kwargs)

    return wrapper


def require_csrf() -> tuple[bool, str]:
    if request.method in {'GET', 'HEAD', 'OPTIONS'}:
        return True, ''
    if request.path.startswith('/api/bridge/'):
        return True, ''
    user = current_user()
    if not user:
        return True, ''
    token = request.headers.get('X-CSRF-Token') or request.form.get('_csrf')
    if token and token == session.get('csrf_token'):
        return True, ''
    return False, 'Jeton CSRF invalide.'


def log_admin(action: str, actor: str | None = None) -> None:
    actor_name = actor or (current_user() or {}).get('name', 'System')
    connection = get_db()
    connection.execute(
        'INSERT INTO admin_logs (actor, action, created_at) VALUES (?, ?, ?)',
        (actor_name, action, now_iso()),
    )
    connection.commit()
    connection.close()


def rate_limit() -> None:
    if not request.path.startswith('/api/'):
        return
    limit = 30 if request.path.startswith('/api/public/') else 12
    window = 60
    key = (request.remote_addr or 'local', request.path)
    timestamps = RATE_LIMITS[key]
    now = time.time()
    while timestamps and now - timestamps[0] > window:
        timestamps.popleft()
    if len(timestamps) >= limit:
        return jsonify({'message': 'Trop de requêtes, réessaie dans une minute.'}), 429
    timestamps.append(now)
    return None


@app.before_request
def before_request() -> Any:
    session.setdefault('csrf_token', os.urandom(16).hex())
    limited = rate_limit()
    if limited is not None:
        return limited
    valid, message = require_csrf()
    if not valid:
        return jsonify({'message': message}), 400
    return None


@app.after_request
def add_headers(response):
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Cache-Control'] = 'no-store' if request.path.startswith('/api/') else 'public, max-age=300'
    return response


@app.get('/api/health')
def health() -> Any:
    return jsonify({'status': 'ok', 'time': now_iso()})


@app.get('/api/public/bootstrap')
def public_bootstrap() -> Any:
    return jsonify(build_bundle())


@app.get('/api/public/status')
def public_status() -> Any:
    return jsonify(build_bundle()['server'])


@app.post('/api/vote/record')
def vote_record() -> Any:
    """Enregistre un vote et envoie la récompense au serveur Minecraft via RCON."""
    payload = request.get_json(silent=True) or request.form
    pseudo = (payload.get('pseudo') or '').strip()
    raw_site_id = payload.get('site_id')

    if not pseudo or raw_site_id is None:
        return jsonify({'message': 'Pseudo et site de vote sont requis.'}), 400

    try:
        site_id = int(raw_site_id)
    except (TypeError, ValueError):
        return jsonify({'message': 'Identifiant de site invalide.'}), 400

    connection = get_db()
    site = connection.execute('SELECT * FROM vote_sites WHERE id = ?', (site_id,)).fetchone()
    if not site:
        connection.close()
        return jsonify({'message': 'Site de vote introuvable.'}), 404

    player = connection.execute('SELECT * FROM minecraft_players WHERE pseudo = ?', (pseudo,)).fetchone()

    # Cooldown côté serveur
    cooldown_ms = int(site['cooldown_minutes'] or 0) * 60 * 1000
    if cooldown_ms > 0 and player:
        last = connection.execute(
            'SELECT voted_at FROM votes WHERE player_id = ? AND site_id = ? ORDER BY voted_at DESC LIMIT 1',
            (player['id'], site_id),
        ).fetchone()
        if last:
            last_time = datetime.fromisoformat(last['voted_at']).timestamp() * 1000
            if last_time + cooldown_ms > time.time() * 1000:
                connection.close()
                return jsonify({'message': 'Tu as déjà voté récemment pour ce site. Réessaie plus tard.'}), 429

    # Commande de récompense
    reward_command = (site['reward_command'] or os.environ.get('VOTE_REWARD_COMMAND', '')).strip()
    if reward_command:
        resolved = reward_command.replace('{player}', pseudo).replace('%player%', pseudo)
    else:
        resolved = ''

    connection.execute(
        'INSERT INTO votes (player_id, site_id, voted_at, reward) VALUES (?, ?, ?, ?)',
        (player['id'] if player else None, site_id, now_iso(), site['reward']),
    )
    if player:
        connection.execute('UPDATE minecraft_players SET votes = votes + 1 WHERE id = ?', (player['id'],))
    connection.commit()
    connection.close()

    command_result = execute_rcon_command(resolved) if resolved else 'Aucune commande de récompense configurée.'
    log_admin(f"Vote enregistré pour {pseudo} sur {site['name']} — {command_result}")
    return jsonify({
        'message': f"Vote enregistré pour {pseudo}. Récompense envoyée en jeu.",
        'reward': site['reward'],
        'command': command_result,
    })


@app.get('/api/auth/session')
def auth_session() -> Any:
    user = current_user()
    return jsonify({
        'authenticated': bool(user),
        'user': user,
        'csrf_token': session.get('csrf_token'),
    })


@app.post('/api/auth/register')
def auth_register() -> Any:
    payload = request.get_json(silent=True) or request.form
    name = (payload.get('name') or '').strip()
    email = (payload.get('email') or '').strip().lower()
    password = payload.get('password') or ''
    password_confirmation = payload.get('password_confirmation') or ''
    conditions = payload.get('conditions')

    if not all([name, email, password, password_confirmation]):
        return jsonify({'message': 'Tous les champs sont requis.'}), 400
    if password != password_confirmation:
        return jsonify({'message': 'Les mots de passe ne correspondent pas.'}), 400
    if not conditions:
        return jsonify({'message': 'Tu dois accepter les conditions.'}), 400

    connection = get_db()
    exists = connection.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()
    if exists:
        connection.close()
        return jsonify({'message': 'Cette adresse email est déjà utilisée.'}), 409

    connection.execute(
        'INSERT INTO users (name, email, password_hash, role, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?)',
        (name, email, generate_password_hash(password), 'user', now_iso(), now_iso()),
    )
    connection.commit()
    connection.close()
    return jsonify({'message': 'Compte créé avec succès. Tu peux maintenant te connecter.'})


@app.post('/api/auth/login')
def auth_login() -> Any:
    payload = request.get_json(silent=True) or request.form
    email = (payload.get('email') or '').strip().lower()
    password = payload.get('password') or ''

    connection = get_db()
    user = connection.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    if not user or not check_password_hash(user['password_hash'], password):
        connection.close()
        return jsonify({'message': 'Identifiants invalides.'}), 401

    connection.execute('UPDATE users SET last_login = ? WHERE id = ?', (now_iso(), user['id']))
    connection.commit()
    connection.close()

    session['user'] = {'id': user['id'], 'name': user['name'], 'email': user['email'], 'role': user['role']}
    if user['role'] == 'admin':
        log_admin('s’est connecté au panneau admin', actor=user['name'])
    return jsonify({'message': 'Connexion réussie.', 'user': session['user']})


@app.post('/api/auth/logout')
def auth_logout() -> Any:
    actor = (current_user() or {}).get('name')
    session.pop('user', None)
    if actor:
        log_admin('s’est déconnecté', actor=actor)
    return jsonify({'message': 'Déconnecté.'})


@app.post('/api/auth/forgot-password')
def forgot_password() -> Any:
    payload = request.get_json(silent=True) or request.form
    email = (payload.get('email') or '').strip().lower()
    if not email:
        return jsonify({'message': 'Adresse email requise.'}), 400
    return jsonify({'message': 'Demande enregistrée. Branche un service email pour envoyer le lien de réinitialisation.'})


@app.get('/api/admin/bundle')
@require_admin
def admin_bundle() -> Any:
    return jsonify(build_bundle())


@app.post('/api/admin/action')
@require_admin
def admin_action() -> Any:
    payload = request.get_json(silent=True) or {}
    action = payload.get('action', '')
    target = payload.get('target')
    bundle = build_bundle()
    connection = get_db()
    message = 'Action enregistrée.'

    if action == 'start-server':
        connection.execute('UPDATE server_status SET online = 1, updated_at = ? WHERE id = 1', (now_iso(),))
        message = 'Serveur démarré.'
    elif action == 'stop-server':
        connection.execute('UPDATE server_status SET online = 0, updated_at = ? WHERE id = 1', (now_iso(),))
        message = 'Serveur arrêté.'
    elif action == 'restart-server':
        connection.execute('UPDATE server_status SET online = 1, updated_at = ? WHERE id = 1', (now_iso(),))
        message = 'Serveur redémarré.'
    elif action == 'ban' and target:
        connection.execute('UPDATE minecraft_players SET sanctions = ? WHERE id = ?', ('Ban appliqué depuis le panel', target))
        player = next((item for item in bundle['players'] if item['id'] == int(target)), None)
        message = f"{player['pseudo'] if player else 'Joueur'} a été banni."
    elif action == 'kick' and target:
        player = next((item for item in bundle['players'] if item['id'] == int(target)), None)
        message = f"{player['pseudo'] if player else 'Joueur'} a été kick."
    elif action == 'mute' and target:
        connection.execute('UPDATE minecraft_players SET sanctions = ? WHERE id = ?', ('Mute appliqué depuis le panel', target))
        player = next((item for item in bundle['players'] if item['id'] == int(target)), None)
        message = f"{player['pseudo'] if player else 'Joueur'} a été mute."
    elif action.startswith('console-command:'):
        command = action.split(':', 1)[1]
        message = execute_rcon_command(command)
    elif action == 'update-vote-site' and target:
        data = payload.get('data', {})
        connection.execute(
            '''UPDATE vote_sites SET name = ?, reward = ?, reward_command = ?, link = ?, status = ?, cooldown_minutes = ? WHERE id = ?''',
            (
                data.get('name', ''), data.get('reward', ''), data.get('reward_command', ''),
                data.get('link', ''), data.get('status', 'Disponible'), int(data.get('cooldown_minutes', 60)), int(target)
            ),
        )
        message = 'Site de vote mis à jour.'
    else:
        message = f"Action « {action} » enregistrée."

    connection.commit()
    connection.close()
    log_admin(message)
    return jsonify({'message': message})


@app.post('/api/bridge/heartbeat')
@require_bridge_token
def bridge_heartbeat() -> Any:
    payload = request.get_json(silent=True) or {}
    connection = get_db()
    fields = {
        'online': int(bool(payload.get('online', True))),
        'version': payload.get('version', SEED_DATA['server']['version']),
        'players_online': int(payload.get('players_online', 0)),
        'players_max': int(payload.get('players_max', SEED_DATA['server']['players_max'])),
        'bedrock_port': str(payload.get('bedrock_port', SEED_DATA['server']['bedrock_port'])),
        'uptime': str(payload.get('uptime', SEED_DATA['server']['uptime'])),
        'cpu': int(payload.get('cpu', 0)),
        'ram': int(payload.get('ram', 0)),
        'storage': int(payload.get('storage', 0)),
        'motd': payload.get('motd', SEED_DATA['server']['motd']),
        'updated_at': now_iso(),
    }
    connection.execute(
        '''UPDATE server_status SET online = :online, version = :version, players_online = :players_online,
        players_max = :players_max, bedrock_port = :bedrock_port, uptime = :uptime, cpu = :cpu, ram = :ram,
        storage = :storage, motd = :motd, updated_at = :updated_at WHERE id = 1''',
        fields,
    )
    connection.commit()
    connection.close()
    return jsonify({'message': 'Heartbeat reçu.'})


@app.post('/api/bridge/players')
@require_bridge_token
def bridge_players() -> Any:
    payload = request.get_json(silent=True) or {}
    players = payload.get('players', [])
    connection = get_db()
    online_names = set()
    for player in players:
        online_names.add(player['pseudo'])
        exists = connection.execute('SELECT id FROM minecraft_players WHERE pseudo = ?', (player['pseudo'],)).fetchone()
        if exists:
            connection.execute(
                '''UPDATE minecraft_players SET uuid = ?, last_connection = ?, playtime = ?, money = ?, votes = ?, grade = ?, job = ?, sanctions = ?, online = 1
                WHERE pseudo = ?''',
                (
                    player.get('uuid', ''), now_iso(), player.get('playtime', '0 h'), player.get('money', 0), player.get('votes', 0),
                    player.get('grade', 'Joueur'), player.get('job', ''), player.get('sanctions', 'Aucune'), player['pseudo']
                ),
            )
        else:
            connection.execute(
                '''INSERT INTO minecraft_players (pseudo, uuid, first_connection, last_connection, playtime, money, votes, grade, job, sanctions, online)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)''',
                (
                    player['pseudo'], player.get('uuid', ''), now_iso(), now_iso(), player.get('playtime', '0 h'), player.get('money', 0),
                    player.get('votes', 0), player.get('grade', 'Joueur'), player.get('job', ''), player.get('sanctions', 'Aucune')
                ),
            )
    if online_names:
        placeholders = ','.join('?' for _ in online_names)
        connection.execute(f'UPDATE minecraft_players SET online = 0 WHERE pseudo NOT IN ({placeholders})', tuple(online_names))
    connection.commit()
    connection.close()
    return jsonify({'message': 'Joueurs synchronisés.'})


@app.post('/api/bridge/log')
@require_bridge_token
def bridge_log() -> Any:
    payload = request.get_json(silent=True) or {}
    log_admin(payload.get('message', 'Événement bridge reçu'), actor=payload.get('actor', 'Bridge'))
    return jsonify({'message': 'Log enregistré.'})


def execute_rcon_command(command: str) -> str:
    host = os.environ.get('RCON_HOST')
    port = int(os.environ.get('RCON_PORT', '25575'))
    password = os.environ.get('RCON_PASSWORD')

    if host and password and RCONClient:
        try:
            client = RCONClient(host, port=port)
            client.login(password)
            response = client.command(command)
            return f'Commande envoyée : {response}'
        except Exception as exc:  # pragma: no cover
            return f'Commande enregistrée, mais RCON a échoué : {exc}'

    start_cmd = os.environ.get('MINECRAFT_COMMAND_WRAPPER')
    if start_cmd:
        subprocess.run(f'{start_cmd} {command}', shell=True, check=False)
        return 'Commande déléguée au wrapper local.'

    return 'Commande enregistrée. Configure RCON_HOST/RCON_PASSWORD ou MINECRAFT_COMMAND_WRAPPER pour l’exécuter réellement.'


@app.get('/admin')
@app.get('/admin/')
def admin_shortcut() -> Any:
    return redirect('/admin/index.html')


@app.route('/', defaults={'path': 'index.html'})
@app.route('/<path:path>')
def static_files(path: str) -> Any:
    cleaned = path.lstrip('/')
    if any(cleaned == prefix or cleaned.startswith(prefix + '/') for prefix in FORBIDDEN_PREFIXES):
        return jsonify({'message': 'Accès refusé.'}), 403

    full_path = BASE_DIR / cleaned
    if full_path.is_dir():
        index = full_path / 'index.html'
        if index.exists():
            return send_from_directory(full_path, 'index.html')

    if full_path.exists() and full_path.is_file():
        return send_from_directory(full_path.parent, full_path.name)

    fallback = BASE_DIR / 'index.html'
    return send_from_directory(fallback.parent, fallback.name), 404


if __name__ == '__main__':
    seed_db()
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', '5000')), debug=False)
