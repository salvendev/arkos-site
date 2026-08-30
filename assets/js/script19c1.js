axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function (el) {
        if (window.bootstrap && bootstrap.Tooltip) {
            new bootstrap.Tooltip(el);
        }
    });

    document.querySelectorAll('[data-confirm]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
            const message = el.getAttribute('data-confirm') || 'Confirmer cette action ?';
            if (!window.confirm(message)) {
                ev.preventDefault();
            }
        });
    });

    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', function (e) {
            e.preventDefault();
        });
    }
});

window.createAlert = function (color, message, dismiss) {
    const host = document.getElementById('status-message');
    if (!host) return;
    const close = dismiss ? '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' : '';
    const icons = {
        info: 'bi-info-circle',
        success: 'bi-check-circle',
        danger: 'bi-exclamation-octagon',
        warning: 'bi-exclamation-triangle'
    };
    host.innerHTML = `<div class="alert alert-${color} ${dismiss ? 'alert-dismissible fade show' : ''}" role="alert"><i class="bi ${icons[color] || 'bi-bell'} me-2"></i>${message}${close}</div>`;
};
