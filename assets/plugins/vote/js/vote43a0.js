function toggleStep(step) {
    document.querySelectorAll('[data-vote-step]').forEach(function (el) {
        el.classList.add('d-none');
    });

    const current = document.querySelector('[data-vote-step="' + step + '"]');
    if (current) current.classList.remove('d-none');
}

function clearVoteAlert() {
    const host = document.getElementById('status-message');
    if (host) host.innerHTML = '';
}

function displayVoteAlert(message, level) {
    if (window.createAlert) window.createAlert(level, message, true);
}

function voteStorageKey(user, siteId) {
    return 'arkos-vote:' + user.toLowerCase() + ':' + siteId;
}

function getTimeDifference(timestamp) {
    const difference = Math.max(0, timestamp - Date.now());
    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    return (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}

function updateVoteLink(link) {
    const voteTime = parseInt(link.dataset.voteTime || '0', 10);
    const timer = link.querySelector('.vote-timer');

    if (!voteTime || !timer) return;

    if (voteTime > Date.now()) {
        link.classList.add('disabled');
        timer.innerText = getTimeDifference(voteTime);
    } else {
        link.classList.remove('disabled');
        timer.innerText = 'Disponible';
        link.removeAttribute('data-vote-time');
    }
}

async function recordVote(username, siteId) {
    try {
        const response = await fetch('/api/vote/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pseudo: username, site_id: siteId }),
            credentials: 'same-origin',
        });
        const payload = await response.json();
        if (!response.ok) {
            displayVoteAlert(payload.message || 'Impossible d’enregistrer le vote.', 'warning');
            return;
        }
        displayVoteAlert(payload.message || 'Vote enregistré !', 'success');
    } catch (error) {
        displayVoteAlert('Vote enregistré localement (mode démo). Le backend n’est pas joignable.', 'warning');
    }
}

function initVote() {
    if (!window.username) return;

    document.querySelectorAll('[data-vote-url]').forEach(function (el) {
        const siteId = el.dataset.voteId;
        const cooldown = parseInt(el.dataset.cooldownMinutes || '0', 10) * 60 * 1000;
        const saved = parseInt(localStorage.getItem(voteStorageKey(window.username, siteId)) || '0', 10);

        if (saved && saved > Date.now()) {
            el.dataset.voteTime = saved;
        }

        updateVoteLink(el);
        const interval = setInterval(function () { updateVoteLink(el); }, 1000);

        el.addEventListener('click', function (ev) {
            if (el.classList.contains('disabled')) {
                ev.preventDefault();
                return;
            }

            clearVoteAlert();
            const until = Date.now() + cooldown;
            localStorage.setItem(voteStorageKey(window.username, siteId), String(until));
            el.dataset.voteTime = until;
            updateVoteLink(el);

            recordVote(window.username, siteId);
        });

        el.dataset.bound = 'true';
        window.addEventListener('beforeunload', function () { clearInterval(interval); }, { once: true });
    });
}

const voteNameForm = document.getElementById('voteNameForm');
if (voteNameForm) {
    voteNameForm.addEventListener('submit', function (ev) {
        ev.preventDefault();
        clearVoteAlert();
        const usernameInput = document.getElementById('stepNameInput');
        const tempUsername = usernameInput ? usernameInput.value.trim() : '';
        if (!tempUsername) {
            displayVoteAlert('Entre ton pseudo Minecraft pour continuer.', 'warning');
            return;
        }
        window.username = tempUsername;
        toggleStep(2);
        initVote();
    });
}

if (window.username) {
    initVote();
}
