document.addEventListener('DOMContentLoaded', function() {
    
    const navbar = document.querySelector('.storycraft-nav');
    
    if (!navbar) return;
    
    function handleScroll() {
        const scrollY = window.scrollY;
        
        if (scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
    
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('#navbarNav');
    
    if (navbarToggler && navbarCollapse) {
        navbarCollapse.addEventListener('show.bs.collapse', function() {
            navbarToggler.classList.add('active');
        });
        
        navbarCollapse.addEventListener('hide.bs.collapse', function() {
            navbarToggler.classList.remove('active');
        });
        
        navbarToggler.classList.remove('active');
    }
    
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link:not(.dropdown-toggle)');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth < 992) {
                const bsCollapse = new bootstrap.Collapse(navbarCollapse, {
                    hide: true
                });
                navbarToggler.classList.remove('active');
            }
        });
    });
    
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    
    handleScroll();
    
    function clipboardCallback(element, status) {
        const message = element.dataset[status ? 'copied' : 'copyError'];
        const btnText = element.querySelector('.btn-text');
        const icon = element.querySelector('i');

        if (message) {
            const originalText = btnText.textContent;
            const originalIcon = icon.className;
            
            btnText.textContent = message;
            if (status) {
                icon.className = 'bi bi-check-circle-fill';
            }
            
            setTimeout(function() {
                btnText.textContent = originalText;
                icon.className = originalIcon;
            }, 2000);
        }
    }

    function copyClipboard(button) {
        const ip = button.getAttribute('data-ip');
        if (!ip) {
            console.error('Aucune IP trouvée dans data-ip');
            return;
        }
        
        navigator.clipboard.writeText(ip).then(function() {
            console.log('IP copiée avec succès:', ip);
            clipboardCallback(button, true);
        }, function(err) {
            console.error('Could not copy text to clipboard: ', err);
            clipboardCallback(button, false);
        });
    }

    document.querySelectorAll('[data-copied]').forEach(function (el) {
        if (!navigator.clipboard) {
            console.log('Clipboard API non disponible');
            return;
        }

        el.addEventListener('click', function (ev) {
            ev.preventDefault();
            console.log('Clic sur le bouton de copie');
            copyClipboard(el);
        });
    });
});