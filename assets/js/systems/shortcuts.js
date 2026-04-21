// systems/shortcuts.js
// Overlay de ayuda con todos los atajos de teclado. Se abre con ? o H.
// Tambien expone SHORTCUTS para que otros sistemas puedan registrar los suyos.

const SHORTCUTS = [
    // Globales
    { keys: ['?', 'H'],     desc: 'Mostrar/ocultar esta ayuda',             ctx: 'global' },
    { keys: ['F1'],         desc: 'Consola de desarrollo',                  ctx: 'global' },
    { keys: ['Esc'],        desc: 'Pausa / cerrar modal',                   ctx: 'global' },

    // Menu / Lobby
    { keys: ['\u2191', '\u2193', '\u2190', '\u2192'],
      desc: 'Navegar entre cards del menu', ctx: 'menu' },
    { keys: ['Enter', 'Space'],
      desc: 'Lanzar juego seleccionado',    ctx: 'menu' },
    { keys: ['F'],          desc: 'Toggle favorito (card enfocada)',        ctx: 'menu' },

    // Juego
    { keys: ['P', 'Esc'],   desc: 'Pausar / reanudar',                      ctx: 'game' },
    { keys: ['Q'],          desc: 'Abandonar partida (desde pausa)',        ctx: 'game' },

    // Game Over (callcard)
    { keys: ['R', 'Enter'], desc: 'Reintentar',                             ctx: 'gameover' },
    { keys: ['Q', 'Esc'],   desc: 'Volver al menu',                         ctx: 'gameover' },
    { keys: ['Shift+Click'], desc: 'En el boton share: copiar texto',       ctx: 'gameover' },

    // Secretos
    { keys: ['\u2191\u2191\u2193\u2193\u2190\u2192\u2190\u2192BA'],
      desc: 'Konami code — sorpresa',      ctx: 'secret' },
];

const CONTEXT_LABELS = {
    global:   'GLOBAL',
    menu:     'LOBBY',
    game:     'DURANTE JUEGO',
    gameover: 'RESULTADO',
    secret:   'SECRETOS',
};

let overlayEl = null;
let keyListener = null;

export function init(app) {
    // Listener global de ?
    keyListener = (e) => {
        // Ignorar si estoy escribiendo en input/textarea
        const tag = e.target?.tagName;
        if(tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;

        // ? (Shift+/) o H abren el overlay
        if(e.key === '?' || e.key === 'h' || e.key === 'H') {
            e.preventDefault();
            toggle(app);
        }
    };
    document.addEventListener('keydown', keyListener);
}

export function toggle(app) {
    if(overlayEl) { close(); return; }
    open(app);
}

export function open(app) {
    if(overlayEl) return;
    try { app?.audio?.playClick?.(); } catch(e) {}

    overlayEl = document.createElement('div');
    overlayEl.className = 'kbd-overlay';
    overlayEl.innerHTML = buildHTML();
    document.body.appendChild(overlayEl);

    // Animacion de entrada con GSAP si esta disponible
    if(typeof window.gsap !== 'undefined') {
        window.gsap.from(overlayEl.querySelector('.kbd-panel'), {
            scale: 0.85,
            opacity: 0,
            duration: 0.35,
            ease: 'back.out(1.7)',
        });
        window.gsap.from(overlayEl.querySelectorAll('.kbd-row'), {
            y: 10,
            opacity: 0,
            duration: 0.25,
            stagger: 0.015,
            delay: 0.1,
            ease: 'power2.out',
        });
    }

    // Click fuera o boton X cierra
    overlayEl.addEventListener('click', (e) => {
        if(e.target === overlayEl) close();
    });
    overlayEl.querySelector('.kbd-close')?.addEventListener('click', close);

    // ESC tambien cierra
    const escHandler = (e) => {
        if(e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler, true); }
    };
    document.addEventListener('keydown', escHandler, true);
}

export function close() {
    if(!overlayEl) return;
    if(typeof window.gsap !== 'undefined') {
        window.gsap.to(overlayEl, {
            opacity: 0,
            duration: 0.2,
            ease: 'power2.in',
            onComplete: () => {
                if(overlayEl) { overlayEl.remove(); overlayEl = null; }
            },
        });
    } else {
        overlayEl.remove();
        overlayEl = null;
    }
}

function buildHTML() {
    // Agrupar por contexto
    const byCtx = {};
    SHORTCUTS.forEach(s => {
        if(!byCtx[s.ctx]) byCtx[s.ctx] = [];
        byCtx[s.ctx].push(s);
    });

    let groupsHTML = '';
    for(const ctx of ['global', 'menu', 'game', 'gameover', 'secret']) {
        const items = byCtx[ctx];
        if(!items || items.length === 0) continue;
        groupsHTML += `
            <div class="kbd-group">
                <div class="kbd-group-title">${CONTEXT_LABELS[ctx] || ctx}</div>
                ${items.map(s => `
                    <div class="kbd-row">
                        <div class="kbd-keys">${s.keys.map(k => `<kbd>${k}</kbd>`).join('<span class="kbd-sep">+</span>')}</div>
                        <div class="kbd-desc">${s.desc}</div>
                    </div>
                `).join('')}
            </div>`;
    }

    return `
        <div class="kbd-panel">
            <div class="kbd-header">
                <div>
                    <div class="kbd-title"><i class="fa-solid fa-keyboard"></i> ATAJOS DE TECLADO</div>
                    <div class="kbd-subtitle">Presiona ? o H para cerrar</div>
                </div>
                <button class="kbd-close" title="Cerrar (Esc)">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="kbd-content">
                ${groupsHTML}
            </div>
            <div class="kbd-footer">ARCADED LUXURY v2.0 · Presiona cualquier tecla para verla aqui</div>
        </div>`;
}
