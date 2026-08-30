(function () {
    const prefix = '../';
    const page = document.body.dataset.adminPage || 'dashboard';
    const root = document.getElementById('adminRoot');
    const sidebar = document.getElementById('adminSidebar');
    const topbar = document.getElementById('adminTopbar');
    const state = { session: null, bundle: null, csrfToken: null };

    const pageMeta = {
        dashboard: ['Dashboard', 'Vue d’ensemble du serveur et de l’activité.'],
        server: ['Serveur', 'Contrôle du statut, ressources et orchestration.'],
        console: ['Console', 'Commandes, logs et préparation RCON.'],
        players: ['Joueurs', 'Recherche, sanctions et gestion des profils Minecraft.'],
        player: ['Fiche joueur', 'Vue détaillée d’un profil en jeu.'],
        ranks: ['Grades', 'Gestion des rangs, couleurs et permissions.'],
        shop: ['Boutique', 'Vue globale de la monétisation et des catégories.'],
        products: ['Produits', 'Catalogue, remises et administration de la boutique.'],
        votes: ['Votes', 'Sites, récompenses et meilleurs voteurs.'],
        news: ['Actualités', 'CMS, catégories et publication.'],
        events: ['Événements', 'Programmation et comptes à rebours.'],
        tickets: ['Tickets', 'Support, bugs, paiements et signalements.'],
        users: ['Utilisateurs', 'Comptes du site, rôles et sessions.'],
        staff: ['Staff', 'Organisation des accès internes.'],
        logs: ['Logs', 'Historique complet des actions administratives.'],
        settings: ['Paramètres', 'Variables, intégrations et sécurité.'],
        maintenance: ['Maintenance', 'Bannière de maintenance et état global.'],
        login: ['Connexion admin', 'Accès sécurisé au panneau d’administration.']
    };

    const navItems = [
        ['dashboard', 'index.html', 'bi-speedometer2'],
        ['server', 'server.html', 'bi-hdd-rack'],
        ['console', 'console.html', 'bi-terminal'],
        ['players', 'players.html', 'bi-people'],
        ['ranks', 'ranks.html', 'bi-stars'],
        ['shop', 'shop.html', 'bi-bag'],
        ['products', 'products.html', 'bi-box-seam'],
        ['votes', 'votes.html', 'bi-heart'],
        ['news', 'news.html', 'bi-newspaper'],
        ['events', 'events.html', 'bi-calendar-event'],
        ['tickets', 'tickets.html', 'bi-life-preserver'],
        ['users', 'users.html', 'bi-person-badge'],
        ['staff', 'staff.html', 'bi-person-workspace'],
        ['logs', 'logs.html', 'bi-journal-text'],
        ['settings', 'settings.html', 'bi-sliders'],
        ['maintenance', 'maintenance.html', 'bi-cone-striped']
    ];

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function showToast(message, level = 'success', icon = 'bi-check-circle') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `toast-notification ${level}`;
        toast.innerHTML = `<i class="bi ${icon}"></i><span>${message}</span>`;
        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    async function fetchJson(url, options) {
        const response = await fetch(url, options);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'Erreur API');
        return payload;
    }

    async function fetchSession() {
        try {
            const payload = await fetchJson('/api/auth/session', { credentials: 'same-origin' });
            state.session = payload;
            state.csrfToken = payload.csrf_token || null;
        } catch (error) {
            state.session = null;
        }
    }

    async function fetchBundle() {
        try {
            state.bundle = await fetchJson('/api/admin/bundle', { credentials: 'same-origin' });
        } catch (error) {
            state.bundle = await fetchJson(`${prefix}data/site-content.json`);
        }
    }

    function renderSidebar() {
        if (!sidebar) return;
        sidebar.innerHTML = `
            <a href="index.html" class="admin-brand">
                <span class="nav-brand-mark">A</span>
                <span>
                    <span class="admin-brand-title">ARKOS ADMIN</span>
                    <span class="admin-brand-subtitle">Panneau d'administration</span>
                </span>
            </a>
            <nav class="admin-nav">
                ${navItems.map(([key, href, icon]) => `<a href="${href}" class="${page === key ? 'active' : ''}"><i class="bi ${icon}"></i><span>${pageMeta[key][0]}</span></a>`).join('')}
            </nav>
            <div class="admin-sidebar-footer">
                <a href="../index.html" class="admin-btn"><i class="bi bi-arrow-left"></i> Retour au site</a>
                <a href="#logout" id="adminLogout" class="admin-btn danger"><i class="bi bi-box-arrow-right"></i> Déconnexion</a>
            </div>`;
    }

    function renderTopbar() {
        if (!topbar) return;
        const [title, description] = pageMeta[page] || pageMeta.dashboard;
        const userName = state.session?.user?.name || 'Admin';
        topbar.innerHTML = `
            <div class="admin-topbar-title">
                <h1>${title}</h1>
                <p>${description}</p>
            </div>
            <div class="admin-toolbar">
                <span class="admin-chip"><i class="bi bi-person-circle"></i> ${escapeHtml(userName)}</span>
                <span class="admin-chip"><i class="bi bi-activity"></i> ${escapeHtml(state.bundle.server.status)}</span>
            </div>`;
    }

    function chartBox(values, labels) {
        const max = Math.max(...values, 1);
        return `
            <div class="chart-box">
                ${values.map((value, index) => `<div class="chart-bar" style="height:${Math.max(24, (value / max) * 100)}%"><span>${value}</span></div>`).join('')}
            </div>
            <div class="chart-legend">${labels.map((label) => `<span>${label}</span>`).join('')}</div>`;
    }

    function progressLine(label, value) {
        return `<div class="progress-line"><strong>${label} — ${value}%</strong><div class="progress-track"><span style="width:${value}%"></span></div></div>`;
    }

    function playerRows(players) {
        return players.map((player) => `
            <tr>
                <td><strong>${escapeHtml(player.pseudo)}</strong><div class="text-muted small">${escapeHtml(player.uuid)}</div></td>
                <td>${escapeHtml(player.grade)}</td>
                <td>${escapeHtml(player.job)}</td>
                <td>${escapeHtml(player.playtime)}</td>
                <td>${new Intl.NumberFormat('fr-FR').format(player.money)} ⛃</td>
                <td>${player.votes}</td>
                <td><span class="status-pill ${player.online ? '' : 'offline'}">${player.online ? 'ONLINE' : 'OFFLINE'}</span></td>
                <td>
                    <div class="admin-actions">
                        <button class="admin-btn warning" data-admin-action="kick" data-target="${player.id}" data-confirm="Confirmer le kick de ${escapeHtml(player.pseudo)} ?">Kick</button>
                        <button class="admin-btn danger" data-admin-action="ban" data-target="${player.id}" data-confirm="Confirmer le ban de ${escapeHtml(player.pseudo)} ?">Ban</button>
                        <button class="admin-btn" data-admin-action="mute" data-target="${player.id}">Mute</button>
                    </div>
                </td>
            </tr>`).join('');
    }

    function rankCards(ranks) {
        return ranks.map((rank) => `
            <div class="admin-card">
                <span class="rank-pill" style="color:${rank.color}; border-color:${rank.color};">${escapeHtml(rank.name)}</span>
                <h3 class="mt-3 mb-2">${escapeHtml(rank.name)}</h3>
                <p class="text-muted">${escapeHtml(rank.benefits)}</p>
                <p class="mb-2">Prix boutique : <strong>${rank.price}€</strong></p>
                <p class="mb-3 text-muted">Permissions : ${rank.permissions.join(', ')}</p>
                <div class="admin-actions">
                    <button class="admin-btn" data-admin-action="edit-rank" data-target="${rank.id}">Modifier</button>
                    <button class="admin-btn danger" data-admin-action="delete-rank" data-target="${rank.id}" data-confirm="Supprimer le grade ${escapeHtml(rank.name)} ?">Supprimer</button>
                </div>
            </div>`).join('');
    }

    function productRows(products) {
        return products.map((product) => `
            <tr>
                <td><strong>${escapeHtml(product.name)}</strong><div class="text-muted small">${escapeHtml(product.description)}</div></td>
                <td>${escapeHtml(product.category)}</td>
                <td>${product.price}€</td>
                <td>${product.discount ? product.discount + '%' : '-'}</td>
                <td><div class="admin-actions"><button class="admin-btn" data-admin-action="edit-product" data-target="${product.id}">Modifier</button><button class="admin-btn danger" data-admin-action="delete-product" data-target="${product.id}">Supprimer</button></div></td>
            </tr>`).join('');
    }

    function newsRows(news) {
        return news.map((item) => `
            <tr>
                <td><strong>${escapeHtml(item.title)}</strong><div class="text-muted small">${escapeHtml(item.summary)}</div></td>
                <td>${escapeHtml(item.category)}</td>
                <td>${escapeHtml(item.author)}</td>
                <td>${escapeHtml(item.date)}</td>
                <td><div class="admin-actions"><button class="admin-btn" data-admin-action="publish-news" data-target="${item.id}">Publier</button><button class="admin-btn danger" data-admin-action="delete-news" data-target="${item.id}">Supprimer</button></div></td>
            </tr>`).join('');
    }

    function ticketRows(tickets) {
        return tickets.map((ticket) => `
            <tr>
                <td><strong>#${ticket.id}</strong><div class="text-muted small">${escapeHtml(ticket.subject)}</div></td>
                <td>${escapeHtml(ticket.category)}</td>
                <td>${escapeHtml(ticket.priority)}</td>
                <td>${escapeHtml(ticket.assignee)}</td>
                <td><span class="status-pill ${ticket.status === 'Ouvert' ? 'warning-pill' : ''}">${escapeHtml(ticket.status)}</span></td>
                <td>${escapeHtml(ticket.created_at)}</td>
            </tr>`).join('');
    }

    function logRows(logs) {
        return logs.map((log) => `<div class="log-row"><div class="log-main"><span class="avatar-cube"><i class="bi bi-journal-text"></i></span><div><strong>${escapeHtml(log.actor)}</strong><div class="text-muted">${escapeHtml(log.action)}</div></div></div><strong>${escapeHtml(log.time)}</strong></div>`).join('');
    }

    function serverCards(bundle) {
        return `
            <div class="admin-kpi-grid">
                <div class="admin-card kpi-card"><div class="metric-icon"><i class="bi bi-people"></i></div><div><div class="kpi-label">Joueurs connectés</div><div class="kpi-value">${bundle.dashboard.connected_players}</div></div></div>
                <div class="admin-card kpi-card"><div class="metric-icon"><i class="bi bi-hdd-rack"></i></div><div><div class="kpi-label">Statut</div><div class="kpi-value">${escapeHtml(bundle.server.status)}</div></div></div>
                <div class="admin-card kpi-card"><div class="metric-icon"><i class="bi bi-controller"></i></div><div><div class="kpi-label">Version</div><div class="kpi-value">${escapeHtml(bundle.server.version)}</div></div></div>
                <div class="admin-card kpi-card"><div class="metric-icon"><i class="bi bi-clock-history"></i></div><div><div class="kpi-label">Uptime</div><div class="kpi-value">${escapeHtml(bundle.server.uptime)}</div></div></div>
            </div>`;
    }

    function pageContent() {
        const bundle = state.bundle;
        const labels = ['J1', 'J2', 'J3', 'J4', 'J5', 'J6', 'J7'];
        switch (page) {
            case 'dashboard':
                return `
                    <section class="admin-kpi-grid mb-4">
                        <div class="admin-card kpi-card"><div class="metric-icon"><i class="bi bi-people"></i></div><div><div class="kpi-label">Joueurs connectés</div><div class="kpi-value">${bundle.dashboard.connected_players}</div><div class="kpi-meta">sur ${bundle.server.players_max}</div></div></div>
                        <div class="admin-card kpi-card"><div class="metric-icon"><i class="bi bi-person-plus"></i></div><div><div class="kpi-label">Joueurs inscrits</div><div class="kpi-value">${bundle.dashboard.registered_players}</div><div class="kpi-meta">total site</div></div></div>
                        <div class="admin-card kpi-card"><div class="metric-icon"><i class="bi bi-heart"></i></div><div><div class="kpi-label">Votes aujourd'hui</div><div class="kpi-value">${bundle.dashboard.votes_today}</div><div class="kpi-meta">activité vote</div></div></div>
                        <div class="admin-card kpi-card"><div class="metric-icon"><i class="bi bi-cash-stack"></i></div><div><div class="kpi-label">Revenus boutique</div><div class="kpi-value">${bundle.dashboard.shop_revenue}€</div><div class="kpi-meta">sur la période</div></div></div>
                        <div class="admin-card kpi-card"><div class="metric-icon"><i class="bi bi-life-preserver"></i></div><div><div class="kpi-label">Tickets ouverts</div><div class="kpi-value">${bundle.dashboard.tickets_open}</div><div class="kpi-meta">support actif</div></div></div>
                        <div class="admin-card kpi-card"><div class="metric-icon"><i class="bi bi-flag"></i></div><div><div class="kpi-label">Signalements</div><div class="kpi-value">${bundle.dashboard.reports}</div><div class="kpi-meta">à traiter</div></div></div>
                    </section>
                    <section class="admin-double-grid mb-4">
                        <div class="admin-card"><h2>Joueurs connectés</h2>${chartBox(bundle.dashboard.charts.players, labels)}</div>
                        <div class="admin-card"><h2>Votes</h2>${chartBox(bundle.dashboard.charts.votes, labels)}</div>
                        <div class="admin-card"><h2>Nouveaux utilisateurs</h2>${chartBox(bundle.dashboard.charts.users, labels)}</div>
                        <div class="admin-card"><h2>Revenus</h2>${chartBox(bundle.dashboard.charts.revenue, labels)}</div>
                    </section>
                    <section class="admin-double-grid">
                        <div class="admin-card"><h2>État machine</h2><div class="progress-shell">${progressLine('CPU', bundle.server.cpu)}${progressLine('RAM', bundle.server.ram)}${progressLine('Stockage', bundle.server.storage)}</div></div>
                        <div class="admin-card"><h2>Logs récents</h2><div class="log-list">${logRows(bundle.logs.slice(0, 5))}</div></div>
                    </section>`;
            case 'server':
                return `
                    ${serverCards(bundle)}
                    <section class="admin-double-grid mt-4">
                        <div class="admin-card"><h2>Actions serveur</h2><div class="admin-actions"><button class="admin-btn primary" data-admin-action="start-server">Démarrer</button><button class="admin-btn warning" data-admin-action="restart-server">Redémarrer</button><button class="admin-btn danger" data-admin-action="stop-server">Arrêter</button></div></div>
                        <div class="admin-card"><h2>Ressources</h2><div class="progress-shell">${progressLine('CPU', bundle.server.cpu)}${progressLine('RAM', bundle.server.ram)}${progressLine('Stockage', bundle.server.storage)}</div></div>
                    </section>`;
            case 'console':
                return `
                    <section class="admin-double-grid">
                        <div class="admin-card"><h2>Console Minecraft</h2><div class="console-output">[INFO] ARKOS boot sequence ready\n[INFO] Players online: ${bundle.server.players_online}\n[INFO] Bridge API: waiting for heartbeat\n[INFO] RCON: configure credentials in .env to enable live commands</div></div>
                        <div class="admin-card"><h2>Envoyer une commande</h2><form id="consoleCommandForm"><div class="mb-3"><label class="form-label">Commande</label><input class="form-control" name="command" placeholder="say Maintenance dans 5 minutes"></div><button class="admin-btn primary" type="submit">Envoyer</button></form></div>
                    </section>`;
            case 'players':
                return `
                    <section class="admin-card mb-4"><div class="search-toolbar"><input id="playerSearch" class="form-control" placeholder="Rechercher un pseudo, UUID, grade..."><select id="playerFilter" class="form-select"><option value="all">Tous les statuts</option><option value="online">Online</option><option value="offline">Offline</option></select></div><div class="admin-table-wrapper"><table class="admin-table"><thead><tr><th>Joueur</th><th>Grade</th><th>Métier</th><th>Temps de jeu</th><th>Argent</th><th>Votes</th><th>Statut</th><th>Actions</th></tr></thead><tbody id="playersTableBody">${playerRows(bundle.players)}</tbody></table></div></section>`;
            case 'player':
                const player = bundle.players[0];
                return `<section class="admin-double-grid"><div class="admin-card"><h2>${escapeHtml(player.pseudo)}</h2><p>UUID : ${escapeHtml(player.uuid)}</p><p>Première connexion : ${escapeHtml(player.first_connection)}</p><p>Dernière connexion : ${escapeHtml(player.last_connection)}</p><p>Temps de jeu : ${escapeHtml(player.playtime)}</p><p>Argent : ${new Intl.NumberFormat('fr-FR').format(player.money)} ⛃</p><p>Votes : ${player.votes}</p><p>Grade : ${escapeHtml(player.grade)}</p><p>Métier : ${escapeHtml(player.job)}</p><p>Sanctions : ${escapeHtml(player.sanctions)}</p></div><div class="admin-card"><h2>Actions</h2><div class="admin-actions"><button class="admin-btn warning" data-admin-action="kick" data-target="${player.id}">Kick</button><button class="admin-btn danger" data-admin-action="ban" data-target="${player.id}">Ban</button><button class="admin-btn" data-admin-action="mute" data-target="${player.id}">Mute</button><button class="admin-btn" data-admin-action="grant-rank" data-target="${player.id}">Donner un grade</button></div></div></section>`;
            case 'ranks':
                return `<section class="admin-triple-grid">${rankCards(bundle.ranks)}</section>`;
            case 'shop':
                return `<section class="admin-double-grid"><div class="admin-card"><h2>Résumé boutique</h2><p class="text-muted">Catégories actives : ${bundle.shop.categories.join(', ')}</p><div class="admin-actions"><button class="admin-btn primary" data-admin-action="sync-shop">Synchroniser</button><button class="admin-btn" data-admin-action="open-products">Gérer les produits</button></div></div><div class="admin-card"><h2>Produits mis en avant</h2><div class="log-list">${bundle.shop.products.slice(0, 4).map((product) => `<div class="log-row"><div class="log-main"><span class="avatar-cube"><i class="bi bi-bag"></i></span><div><strong>${escapeHtml(product.name)}</strong><div class="text-muted">${product.price}€</div></div></div></div>`).join('')}</div></div></section>`;
            case 'products':
                return `<section class="admin-card"><div class="admin-actions mb-3"><button class="admin-btn primary" data-admin-action="add-product">Ajouter un produit</button></div><div class="admin-table-wrapper"><table class="admin-table"><thead><tr><th>Produit</th><th>Catégorie</th><th>Prix</th><th>Réduction</th><th>Actions</th></tr></thead><tbody>${productRows(bundle.shop.products)}</tbody></table></div></section>`;
            case 'votes':
                return `<section class="admin-double-grid"><div class="admin-card"><h2>Sites de vote &amp; récompenses</h2><p class="text-muted">Édite le nom, la récompense affichée et la <strong>commande en jeu</strong> exécutée via RCON quand un joueur vote (<code>{player}</code> = pseudo).</p><div class="admin-table-wrapper"><table class="admin-table"><thead><tr><th>Nom</th><th>Récompense</th><th>Commande en jeu</th><th>Cooldown</th><th>Statut</th><th></th></tr></thead><tbody>${bundle.vote_sites.map((site) => `<tr><td><input class="form-control form-control-sm" data-vote-field="name" data-site="${site.id}" value="${escapeHtml(site.name)}"></td><td><input class="form-control form-control-sm" data-vote-field="reward" data-site="${site.id}" value="${escapeHtml(site.reward || '')}"></td><td><input class="form-control form-control-sm" data-vote-field="reward_command" data-site="${site.id}" value="${escapeHtml(site.reward_command || '')}" placeholder="ex : ar vote {player} 250"></td><td><input class="form-control form-control-sm" data-vote-field="cooldown_minutes" data-site="${site.id}" type="number" value="${site.cooldown_minutes}"></td><td><span class="status-pill">${escapeHtml(site.status)}</span></td><td><button class="admin-btn primary" data-save-vote-site="${site.id}">Enregistrer</button></td></tr>`).join('')}</tbody></table></div></div><div class="admin-card"><h2>Meilleurs voteurs</h2><div class="log-list">${bundle.top_voters.map((voter, index) => `<div class="log-row"><div class="log-main"><span class="rank-number ${index < 3 ? 'top-' + (index + 1) : ''}">${index + 1}</span><div><strong>${escapeHtml(voter.name)}</strong><div class="text-muted">${escapeHtml(voter.reward)}</div></div></div><strong>${voter.votes}</strong></div>`).join('')}</div></div></section>`;
            case 'news':
                return `<section class="admin-card"><div class="admin-actions mb-3"><button class="admin-btn primary" data-admin-action="create-news">Créer une actualité</button></div><div class="admin-table-wrapper"><table class="admin-table"><thead><tr><th>Titre</th><th>Catégorie</th><th>Auteur</th><th>Date</th><th>Actions</th></tr></thead><tbody>${newsRows(bundle.news)}</tbody></table></div></section>`;
            case 'events':
                return `<section class="admin-card"><div class="admin-actions mb-3"><button class="admin-btn primary" data-admin-action="create-event">Créer un événement</button></div><div class="admin-table-wrapper"><table class="admin-table"><thead><tr><th>Nom</th><th>Description</th><th>Date</th><th>Récompenses</th><th>Statut</th></tr></thead><tbody>${bundle.events.map((event) => `<tr><td><strong>${escapeHtml(event.name)}</strong></td><td>${escapeHtml(event.description)}</td><td>${escapeHtml(event.date)}</td><td>${escapeHtml(event.rewards)}</td><td><span class="status-pill">${escapeHtml(event.status)}</span></td></tr>`).join('')}</tbody></table></div></section>`;
            case 'tickets':
                return `<section class="admin-card"><div class="admin-table-wrapper"><table class="admin-table"><thead><tr><th>Ticket</th><th>Catégorie</th><th>Priorité</th><th>Responsable</th><th>Statut</th><th>Créé le</th></tr></thead><tbody>${ticketRows(bundle.tickets)}</tbody></table></div></section>`;
            case 'users':
                return `<section class="admin-card"><div class="admin-table-wrapper"><table class="admin-table"><thead><tr><th>Utilisateur</th><th>Email</th><th>Rôle</th><th>Créé le</th><th>Dernière connexion</th></tr></thead><tbody>${bundle.users.map((user) => `<tr><td><strong>${escapeHtml(user.name)}</strong></td><td>${escapeHtml(user.email)}</td><td>${escapeHtml(user.role)}</td><td>${escapeHtml(user.created_at)}</td><td>${escapeHtml(user.last_login)}</td></tr>`).join('')}</tbody></table></div></section>`;
            case 'staff':
                return `<section class="admin-double-grid">${bundle.users.filter((user) => user.role !== 'user').map((user) => `<div class="admin-card"><h2>${escapeHtml(user.name)}</h2><p>${escapeHtml(user.email)}</p><p>Rôle : ${escapeHtml(user.role)}</p><p>Dernière connexion : ${escapeHtml(user.last_login)}</p></div>`).join('')}</section>`;
            case 'logs':
                return `<section class="admin-card"><h2>Historique</h2><div class="log-list mt-4">${logRows(bundle.logs)}</div></section>`;
            case 'settings':
                return `<section class="admin-double-grid"><div class="admin-card"><h2>Architecture</h2><div class="log-list"><div class="log-row"><div class="log-main"><span class="avatar-cube"><i class="bi bi-box-seam"></i></span><div><strong>Docker</strong><div class="text-muted">Frontend, backend, volumes persistants</div></div></div></div><div class="log-row"><div class="log-main"><span class="avatar-cube"><i class="bi bi-cloud"></i></span><div><strong>Cloudflare Tunnel</strong><div class="text-muted">Accès externe sans ouvrir les ports</div></div></div></div><div class="log-row"><div class="log-main"><span class="avatar-cube"><i class="bi bi-plug"></i></span><div><strong>Bridge API</strong><div class="text-muted">Connexion serveur Minecraft vers le site</div></div></div></div></div></div><div class="admin-card"><h2>Sécurité</h2><div class="progress-shell">${progressLine('CPU', bundle.server.cpu)}${progressLine('RAM', bundle.server.ram)}${progressLine('Stockage', bundle.server.storage)}</div><p class="text-muted mt-3">CSRF, hashage, logs et permissions admin sont prévus côté backend.</p></div></section>`;
            case 'maintenance':
                return `<section class="admin-double-grid"><div class="admin-card"><h2>Mode maintenance</h2><p class="text-muted">Prépare une bannière de maintenance visible sur le portail.</p><div class="admin-actions"><button class="admin-btn warning" data-admin-action="toggle-maintenance">Activer</button><button class="admin-btn" data-admin-action="edit-maintenance">Modifier le message</button></div></div><div class="admin-card"><h2>Aperçu</h2><div class="empty-state">Maintenance active — Le serveur revient bientôt. Merci pour votre patience.</div></div></section>`;
            default:
                return `<section class="admin-card"><div class="empty-state">Page en préparation.</div></section>`;
        }
    }

    function renderLockScreen() {
        document.body.innerHTML = `
            <div class="lock-screen">
                <div class="lock-card">
                    <span class="page-badge">Accès restreint</span>
                    <h1>ARKOS ADMIN</h1>
                    <p>Ce panneau n'est visible que pour un administrateur authentifié.</p>
                    <a class="admin-btn primary" href="login.html">Se connecter</a>
                    <a class="admin-btn mt-2" href="../index.html">Retour au site</a>
                </div>
            </div>`;
    }

    async function handleAction(action, target) {
        try {
            const payload = await fetchJson('/api/admin/action', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': state.csrfToken || ''
                },
                body: JSON.stringify({ action, target })
            });
            showToast(payload.message || 'Action enregistrée.', 'success', 'bi-check2-circle');
        } catch (error) {
            showToast(error.message || 'Impossible d’exécuter l’action.', 'danger', 'bi-exclamation-octagon');
        }
    }

    function bindInteractions() {
        document.addEventListener('click', function (event) {
            const button = event.target.closest('[data-admin-action]');
            if (button) {
                const message = button.getAttribute('data-confirm');
                if (message && !window.confirm(message)) return;
                handleAction(button.getAttribute('data-admin-action'), button.getAttribute('data-target'));
                return;
            }

            const saveVote = event.target.closest('[data-save-vote-site]');
            if (saveVote) {
                event.preventDefault();
                const siteId = saveVote.getAttribute('data-save-vote-site');
                const data = {};
                document.querySelectorAll(`[data-vote-field][data-site="${siteId}"]`).forEach((field) => {
                    data[field.getAttribute('data-vote-field')] = field.value.trim();
                });
                try {
                    fetchJson('/api/admin/action', {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-Token': state.csrfToken || ''
                        },
                        body: JSON.stringify({ action: 'update-vote-site', target: siteId, data })
                    }).then((payload) => {
                        showToast(payload.message || 'Site de vote mis à jour.', 'success', 'bi-check2-circle');
                        window.setTimeout(() => window.location.reload(), 800);
                    }).catch((error) => showToast(error.message || 'Erreur API.', 'danger', 'bi-exclamation-octagon'));
                } catch (error) {
                    showToast(error.message || 'Erreur API.', 'danger', 'bi-exclamation-octagon');
                }
                return;
            }

            const logout = event.target.closest('#adminLogout');
            if (logout) {
                event.preventDefault();
                fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': state.csrfToken || ''
                    },
                    body: JSON.stringify({})
                }).finally(() => { window.location.href = 'login.html'; });
            }
        });

        const searchInput = document.getElementById('playerSearch');
        const searchFilter = document.getElementById('playerFilter');
        if (searchInput) {
            const filterPlayers = () => {
                const text = searchInput.value.toLowerCase();
                const status = (searchFilter?.value || 'all').toLowerCase();
                document.querySelectorAll('#playersTableBody tr').forEach((row) => {
                    const rowText = row.textContent.toLowerCase();
                    const rowStatus = rowText.includes('online') ? 'online' : 'offline';
                    const matchesText = rowText.includes(text);
                    const matchesStatus = status === 'all' || rowStatus === status;
                    row.style.display = matchesText && matchesStatus ? '' : 'none';
                });
            };
            searchInput.addEventListener('input', filterPlayers);
            searchFilter?.addEventListener('change', filterPlayers);
        }

        const consoleForm = document.getElementById('consoleCommandForm');
        if (consoleForm) {
            consoleForm.addEventListener('submit', async function (event) {
                event.preventDefault();
                const command = new FormData(consoleForm).get('command');
                if (!command) return;
                await handleAction('console-command:' + command, null);
                consoleForm.reset();
            });
        }
    }

    async function bindLogin() {
        const form = document.getElementById('adminAuthForm');
        if (!form) return;
        form.addEventListener('submit', async function (event) {
            event.preventDefault();
            const data = Object.fromEntries(new FormData(form).entries());
            try {
                const payload = await fetchJson('/api/auth/login', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (!payload.user || payload.user.role !== 'admin') {
                    throw new Error('Ce compte n’a pas les permissions administrateur.');
                }
                showToast('Connexion administrateur réussie.', 'success', 'bi-shield-check');
                window.setTimeout(() => { window.location.href = 'index.html'; }, 800);
            } catch (error) {
                showToast(error.message, 'danger', 'bi-exclamation-octagon');
            }
        });
    }

    async function init() {
        if (page === 'login') return bindLogin();
        await fetchSession();
        if (!state.session?.authenticated || state.session?.user?.role !== 'admin') {
            renderLockScreen();
            return;
        }
        await fetchBundle();
        renderSidebar();
        renderTopbar();
        root.innerHTML = pageContent();
        bindInteractions();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
