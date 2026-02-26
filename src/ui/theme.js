export function setupTheme() {
    const btnTheme = document.getElementById('btn-theme-toggle');
    const root = document.documentElement; // Elem Html

    // 1. Inicia buscando o localStorage, pra manter a preferencia do Usuario
    const savedTheme = localStorage.getItem('loja-theme');

    // 2. Ou capta a vontade do Sistema (SO) nativo do celular
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // 3. Aplicação incial inteligente
    if (savedTheme) {
        root.setAttribute('data-theme', savedTheme);
        updateIcon(savedTheme, btnTheme);
    } else {
        // Se nunca mexeu no botão, confiaremos no preferido do SO.
        updateIcon(prefersDark ? 'dark' : 'light', btnTheme);
    }

    if (btnTheme) {
        btnTheme.addEventListener('click', () => {
            // Descobrindo em que estado de cor estamos agora
            let currentTheme = root.getAttribute('data-theme');
            if (!currentTheme) {
                currentTheme = prefersDark ? 'dark' : 'light';
            }

            // Inverte e Aplica globalmente na interface
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            root.setAttribute('data-theme', newTheme);
            localStorage.setItem('loja-theme', newTheme);

            updateIcon(newTheme, btnTheme);
        });
    }
}

function updateIcon(theme, btnElement) {
    if (!btnElement) return;
    if (theme === 'dark') {
        btnElement.innerHTML = '☀️'; // Sol (Muda aparência indicando que o próximo clique será claro)
        btnElement.setAttribute('aria-label', 'Ativar Modo Claro');
    } else {
        btnElement.innerHTML = '🌙'; // Lua
        btnElement.setAttribute('aria-label', 'Ativar Modo Noturno');
    }
}
