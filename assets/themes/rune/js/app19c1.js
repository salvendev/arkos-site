(function () {
    const DEFAULT_DATA = {
        brand: {
            name: 'ARKOS',
            tagline: "L'aventure Minecraft commence ici.",
            footer: 'Ton aventure. Ton monde. Ton histoire.'
        },
        server: {
            ip: 'play.arkos.fr',
            bedrock_port: '19132',
            version: '1.21.8',
            status: 'ONLINE',
            players_online: 128,
            players_max: 300,
            discord_members: 1842,
            uptime: '14j 06h',
            cpu: 42,
            ram: 68,
            storage: 57
        },
        notifications: []
    };

    const state = {
        data: DEFAULT_DATA,
        session: null,
        csrfToken: null,
    };

    function pathPrefix() {
        const parts = window.location.pathname.split('/').filter(Boolean);
        if (!parts.length) return '';
        const file = parts[parts.length - 1];
        const folders = file.includes('.') ? parts.slice(0, -1) : parts;
        return '../'.repeat(folders.length);
    }

    function isAdminPage() {
        return window.location.pathname.includes('/admin/');
    }

    function pageKey() {
        const path = window.location.pathname;
        if (path.includes('vote')) return 'vote';
        if (path.includes('rankings')) return 'rankings';
        if (path.includes('shop')) return 'shop';
        if (path.includes('events')) return 'events';
        if (path.includes('map')) return 'map';
        if (path.includes('youtube')) return 'media';
        if (path.includes('news')) return 'news';
        if (path.includes('register')) return 'register';
        if (path.includes('login')) return 'login';
        if (path.includes('reset')) return 'reset';
        if (path.includes('/user/')) return 'user';
        return 'home';
    }

    function setTheme() {
        document.body.setAttribute('data-bs-theme', 'dark');
        const root = document.documentElement;
        const vars = {
            '--bs-primary': '#16A34A',
            '--bs-primary-rgb': '22, 163, 74',
            '--bs-link-color': '#86EFAC',
            '--bs-link-hover-color': '#F0FDF4',
            '--primary-orange': '#16A34A',
            '--primary-orange-light': '#22C55E',
            '--primary-orange-dark': '#0B2E1A',
            '--bg-primary': '#07110B',
            '--text-primary': '#F0FDF4'
        };
        Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value));
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) metaTheme.setAttribute('content', '#07110B');
    }

    function ensureToastContainer() {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    function showToast(message, level = 'success', icon = 'bi-check-circle') {
        const container = ensureToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast-notification ${level}`;
        toast.innerHTML = `<i class="bi ${icon}"></i><span>${message}</span>`;
        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function navHref(target) {
        const prefix = pathPrefix();
        return target.startsWith('http') || target.startsWith('#') ? target : `${prefix}${target}`;
    }

    function publicNav(session) {
        const active = pageKey();
        const activeClass = (key) => active === key ? 'active' : '';
        const userBlock = session && session.authenticated
            ? `
                <a href="${navHref('user/index.html')}" class="nav-btn nav-btn--user">
                    <span class="avatar-cube">${escapeHtml(session.user.name.slice(0, 1).toUpperCase())}</span>
                    <span class="btn-text">${escapeHtml(session.user.name)}</span>
                </a>
                <a href="#logout" id="logoutLink" class="nav-btn nav-btn--user">
                    <i class="bi bi-box-arrow-right"></i>
                    <span class="btn-text">Déconnexion</span>
                </a>`
            : `
                <a href="${navHref('user/login.html')}" class="nav-btn nav-btn--user ${activeClass('login')}">
                    <i class="bi bi-box-arrow-in-right"></i>
                    <span class="btn-text">Connexion</span>
                </a>
                <a href="${navHref('user/register.html')}" class="nav-btn nav-btn--user ${activeClass('register')}">
                    <i class="bi bi-person-plus"></i>
                    <span class="btn-text">Inscription</span>
                </a>`;

        return `
            <a class="nav-brand" href="${navHref('index.html')}">
                <span class="nav-brand-mark">A</span>
                <span class="nav-brand-text">
                    <span class="nav-title">ARKOS</span>
                    <span class="nav-subtitle">Serveur officiel Minecraft</span>
                </span>
            </a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Afficher/Masquer la navigation">
                <span></span><span></span><span></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav me-auto nav-menu">
                    <li class="nav-item"><a class="nav-link ${activeClass('home')}" href="${navHref('index.html')}">Accueil</a></li>
                    <li class="nav-item"><a class="nav-link" href="${navHref('index.html#why-arkos')}">Serveur</a></li>
                    <li class="nav-item"><a class="nav-link ${activeClass('rankings')}" href="${navHref('rankings.html')}">Classements</a></li>
                    <li class="nav-item"><a class="nav-link ${activeClass('vote')}" href="${navHref('vote.html')}">Vote</a></li>
                    <li class="nav-item"><a class="nav-link ${activeClass('shop')}" href="${navHref('shop.html')}">Boutique</a></li>
                    <li class="nav-item"><a class="nav-link ${activeClass('map')}" href="${navHref('map.html')}">Wiki</a></li>
                    <li class="nav-item"><a class="nav-link ${activeClass('news')}" href="${navHref('news/jouer.html')}">Actualités</a></li>
                    <li class="nav-item"><a class="nav-link" href="https://discord.gg/arkos" target="_blank" rel="noopener">Discord</a></li>
                </ul>
                <div class="nav-actions d-flex align-items-center"> 
                    <a href="${navHref('shop.html')}" class="nav-btn nav-btn--shop">
                        <i class="bi bi-bag"></i>
                        <span class="btn-text">Boutique</span>
                    </a>
                    ${userBlock}
                </div>
            </div>`;
    }

    function publicFooter() {
        return `
            <div class="container">
                <div class="footer-content">
                    <div class="row g-4">
                        <div class="col-lg-4 col-md-6">
                            <h4 class="footer-title">ARKOS</h4>
                            <p class="footer-description">${escapeHtml(state.data.brand.footer || DEFAULT_DATA.brand.footer)}</p>
                        </div>
                        <div class="col-lg-2 col-md-6">
                            <h4 class="footer-title">Navigation</h4>
                            <ul class="footer-links">
                                <li><a href="${navHref('index.html')}">Accueil</a></li>
                                <li><a href="${navHref('vote.html')}">Vote</a></li>
                                <li><a href="${navHref('shop.html')}">Boutique</a></li>
                                <li><a href="${navHref('events.html')}">Événements</a></li>
                            </ul>
                        </div>
                        <div class="col-lg-3 col-md-6">
                            <h4 class="footer-title">Communauté</h4>
                            <ul class="footer-links">
                                <li><a href="https://discord.gg/arkos" target="_blank" rel="noopener">Discord</a></li>
                                <li><a href="${navHref('map.html')}">Wiki</a></li>
                                <li><a href="${navHref('news/jouer.html')}">Actualités</a></li>
                                <li><a href="${navHref('rankings.html')}">Classements</a></li>
                            </ul>
                        </div>
                        <div class="col-lg-3 col-md-6">
                            <h4 class="footer-title">Légal</h4>
                            <ul class="footer-links">
                                <li><a href="${navHref('vote.html')}">Vote</a></li>
                                <li><a href="${navHref('shop.html')}">Boutique</a></li>
                                <li><a href="#">Règlement</a></li>
                                <li><a href="#">Confidentialité</a></li>
                                <li><a href="#">Contact</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="footer-bottom">
                    <div class="row align-items-center g-3">
                        <div class="col-lg-7">
                            <p class="copyright">© 2026 ARKOS — Tous droits réservés.</p>
                            <p class="powered-by">Portail Minecraft auto-hébergeable, conçu pour évoluer avec ton serveur.</p>
                        </div>
                        <div class="col-lg-5">
                            <div class="footer-bottom-links">
                                <a href="${navHref('admin/login.html')}">Admin</a>
                                <a href="${navHref('map.html')}">Carte</a>
                                <a href="${navHref('shop.html')}">Boutique</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    function rebuildSharedLayout() {
        if (isAdminPage()) return;
        const nav = document.querySelector('.storycraft-nav');
        if (nav) {
            const container = nav.querySelector('.container') || nav;
            container.innerHTML = publicNav(state.session);
        }

        const footer = document.querySelector('.site-footer');
        if (footer) footer.innerHTML = publicFooter();

        const heroLogo = document.querySelector('.hero-logo');
        if (heroLogo && heroLogo.querySelector('img')) {
            heroLogo.innerHTML = `
                <div class="hero-badge"><span class="pulse"></span> Serveur Minecraft officiel</div>
                <h1 class="hero-title"><span class="gradient">ARKOS</span></h1>
                <p class="hero-subtitle">${escapeHtml(state.data.brand.tagline || DEFAULT_DATA.brand.tagline)}</p>`;
        }

        const oldBrandText = document.querySelectorAll('title, meta[property="og:site_name"], meta[property="og:title"], meta[property="og:description"], meta[name="description"]');
        oldBrandText.forEach((node) => {
            const attr = node.getAttribute('content');
            if (attr) {
                node.setAttribute('content', attr.replace(/SwayNight/gi, 'ARKOS').replace(/Walyverse/gi, 'ARKOS'));
            } else if (node.textContent) {
                node.textContent = node.textContent.replace(/SwayNight/gi, 'ARKOS').replace(/Walyverse/gi, 'ARKOS');
            }
        });

        if (document.title) {
            document.title = document.title.replace(/SwayNight/gi, 'ARKOS').replace(/Page non trouvée/gi, 'ARKOS');
        }
    }

    function bindNavbar() {
        const navbar = document.querySelector('.storycraft-nav');
        if (!navbar) return;

        const handleScroll = () => {
            if (window.scrollY > 24) navbar.classList.add('scrolled');
            else navbar.classList.remove('scrolled');
        };

        const navbarToggler = document.querySelector('.navbar-toggler');
        const navbarCollapse = document.querySelector('#navbarNav');
        if (navbarToggler && navbarCollapse) {
            navbarCollapse.addEventListener('show.bs.collapse', () => navbarToggler.classList.add('active'));
            navbarCollapse.addEventListener('hide.bs.collapse', () => navbarToggler.classList.remove('active'));

            document.querySelectorAll('.navbar-nav .nav-link').forEach((link) => {
                link.addEventListener('click', () => {
                    if (window.innerWidth < 992 && navbarCollapse.classList.contains('show')) {
                        bootstrap.Collapse.getOrCreateInstance(navbarCollapse).hide();
                    }
                });
            });
        }

        window.addEventListener('scroll', handleScroll);
        handleScroll();
    }

    function updateBindings() {
        const server = state.data.server || DEFAULT_DATA.server;
        document.querySelectorAll('[data-server-ip]').forEach((el) => el.textContent = server.ip);
        document.querySelectorAll('[data-server-version]').forEach((el) => el.textContent = server.version);
        document.querySelectorAll('[data-server-status]').forEach((el) => {
            el.textContent = server.status;
            el.classList.toggle('offline', server.status !== 'ONLINE');
        });
        document.querySelectorAll('[data-players-online]').forEach((el) => el.textContent = server.players_online);
        document.querySelectorAll('[data-players-max]').forEach((el) => el.textContent = server.players_max);
        document.querySelectorAll('[data-bedrock-port]').forEach((el) => el.textContent = server.bedrock_port);
        document.querySelectorAll('[data-discord-members]').forEach((el) => el.textContent = new Intl.NumberFormat('fr-FR').format(server.discord_members));
        document.querySelectorAll('[data-uptime]').forEach((el) => el.textContent = server.uptime);
        document.querySelectorAll('[data-cpu]').forEach((el) => el.textContent = `${server.cpu}%`);
        document.querySelectorAll('[data-ram]').forEach((el) => el.textContent = `${server.ram}%`);
        document.querySelectorAll('[data-storage]').forEach((el) => el.textContent = `${server.storage}%`);

        const copyButton = document.getElementById('copy-ip-btn');
        if (copyButton) {
            copyButton.setAttribute('data-ip', server.ip);
            const btnText = copyButton.querySelector('.btn-text');
            if (btnText) btnText.textContent = server.ip;
        }

        const versionButton = document.querySelector('.nav-btn--version .btn-text');
        if (versionButton) versionButton.textContent = `Version ${server.version}`;

        document.querySelectorAll('.players-online .player-number').forEach((el) => el.textContent = server.players_online);
    }

    function copyFeedback(button, ok) {
        const btnText = button.querySelector('.btn-text');
        const icon = button.querySelector('i');
        if (!btnText || !icon) return;
        const oldText = btnText.textContent;
        const oldIcon = icon.className;
        btnText.textContent = ok ? 'IP copiée !' : 'Copie impossible';
        icon.className = ok ? 'bi bi-check-circle-fill' : 'bi bi-x-circle-fill';
        setTimeout(() => {
            btnText.textContent = oldText;
            icon.className = oldIcon;
        }, 1800);
    }

    function bindCopyIp() {
        document.querySelectorAll('[data-ip]').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                const ip = button.getAttribute('data-ip');
                if (!navigator.clipboard || !ip) return copyFeedback(button, false);
                navigator.clipboard.writeText(ip)
                    .then(() => {
                        copyFeedback(button, true);
                        showToast(`Adresse ${ip} copiée`, 'success', 'bi-clipboard-check');
                    })
                    .catch(() => copyFeedback(button, false));
            });
        });
    }

    function renderCountdown(node, targetDate) {
        const total = Math.max(0, new Date(targetDate).getTime() - Date.now());
        const days = Math.floor(total / (1000 * 60 * 60 * 24));
        const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((total / (1000 * 60)) % 60);
        const seconds = Math.floor((total / 1000) % 60);
        node.innerHTML = `
            <span class="countdown-chip"><strong>${days}</strong><span>Jours</span></span>
            <span class="countdown-chip"><strong>${hours.toString().padStart(2, '0')}</strong><span>Heures</span></span>
            <span class="countdown-chip"><strong>${minutes.toString().padStart(2, '0')}</strong><span>Min</span></span>
            <span class="countdown-chip"><strong>${seconds.toString().padStart(2, '0')}</strong><span>Sec</span></span>`;
    }

    function initCountdowns() {
        document.querySelectorAll('[data-countdown]').forEach((node) => {
            const target = node.getAttribute('data-countdown');
            renderCountdown(node, target);
            setInterval(() => renderCountdown(node, target), 1000);
        });
    }

    async function fetchSession() {
        try {
            const response = await fetch('/api/auth/session', { credentials: 'same-origin' });
            if (!response.ok) return;
            const session = await response.json();
            state.session = session;
            state.csrfToken = session.csrf_token || null;
        } catch (error) {
            state.session = null;
        }
    }

    async function bindAuthForms() {
        const forms = document.querySelectorAll('[data-auth-form]');
        if (!forms.length) return;

        forms.forEach((form) => {
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                const endpoint = form.getAttribute('data-endpoint');
                if (!endpoint) return;

                const data = Object.fromEntries(new FormData(form).entries());
                const submit = form.querySelector('button[type="submit"]');
                if (submit) submit.disabled = true;

                try {
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-Token': state.csrfToken || ''
                        },
                        body: JSON.stringify(data)
                    });

                    const payload = await response.json();
                    if (!response.ok) throw new Error(payload.message || 'Une erreur est survenue.');

                    showToast(payload.message || 'Action effectuée.', 'success', 'bi-check2-circle');
                    const target = form.getAttribute('data-success-redirect');
                    if (target) {
                        window.setTimeout(() => { window.location.href = target; }, 900);
                    } else {
                        form.reset();
                    }
                } catch (error) {
                    showToast(error.message || 'Impossible de traiter la demande.', 'danger', 'bi-exclamation-octagon');
                } finally {
                    if (submit) submit.disabled = false;
                }
            });
        });
    }

    function bindLogout() {
        document.addEventListener('click', async (event) => {
            const target = event.target.closest('#logoutLink');
            if (!target) return;
            event.preventDefault();
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': state.csrfToken || ''
                    },
                    body: JSON.stringify({})
                });
            } catch (error) {
                // noop
            }
            window.location.href = navHref('index.html');
        });
    }

    async function loadData() {
        const candidates = ['/api/public/bootstrap', `${pathPrefix()}data/site-content.json`, '/data/site-content.json'];
        for (const url of candidates) {
            try {
                const response = await fetch(url, { credentials: 'same-origin' });
                if (!response.ok) continue;
                state.data = await response.json();
                return;
            } catch (error) {
                // next
            }
        }
    }

    function maybePushInitialNotifications() {
        if (!state.data.notifications || !document.body.hasAttribute('data-notify-on-load')) return;
        state.data.notifications.slice(0, 2).forEach((item, index) => {
            setTimeout(() => showToast(item.message, item.level || 'info', 'bi-bell'), 500 + index * 250);
        });
    }

    window.createAlert = function (color, message) {
        const host = document.getElementById('status-message');
        if (!host) return;
        host.innerHTML = `<div class="alert alert-${color}" role="alert">${message}</div>`;
    };

    document.addEventListener('DOMContentLoaded', async () => {
        setTheme();
        await Promise.all([loadData(), fetchSession()]);
        rebuildSharedLayout();
        bindNavbar();
        updateBindings();
        bindCopyIp();
        initCountdowns();
        await bindAuthForms();
        bindLogout();
        maybePushInitialNotifications();
    });
})();
