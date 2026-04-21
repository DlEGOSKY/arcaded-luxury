// systems/game-backdrop.js
// Fondo animado reutilizable para juegos DOM. Crea una capa fija detras
// del area de juego con varios efectos ambientales:
// - Grid radial tenue que palpita
// - Spotlight dinamico centrado
// - Particulas fantasma flotando (opcional)
//
// Uso:
//   import * as Backdrop from '../systems/game-backdrop.js';
//   Backdrop.mount({ color: '#3b82f6', particles: 'cards' });
//   Backdrop.setColor('#ef4444');  // cambio dinamico
//   Backdrop.unmount();            // en cleanup

let host = null;
let particleInterval = null;

const reduced = () =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    || window.app?.settings?.reduceMotion;

// =============================================================
// MOUNT / UNMOUNT
// =============================================================
export function mount(opts = {}) {
    unmount(); // idempotente

    const color = opts.color || '#3b82f6';
    const particleType = opts.particles || null; // 'cards' | 'dots' | null
    const intensity = opts.intensity || 1;

    host = document.createElement('div');
    host.className = 'game-backdrop';
    host.style.setProperty('--bd-color', color);
    host.style.setProperty('--bd-intensity', intensity);

    host.innerHTML = `
        <div class="bd-grid"></div>
        <div class="bd-spotlight"></div>
        <div class="bd-particles" id="bd-particles"></div>
        <div class="bd-vignette"></div>
    `;

    // Insertar detras del game-ui-overlay
    const gameScreen = document.getElementById('screen-game');
    if(gameScreen) {
        gameScreen.insertBefore(host, gameScreen.firstChild);
    } else {
        document.body.appendChild(host);
    }

    if(particleType && !reduced()) {
        startParticles(particleType);
    }
}

export function unmount() {
    if(host) {
        host.remove();
        host = null;
    }
    if(particleInterval) {
        clearInterval(particleInterval);
        particleInterval = null;
    }
}

export function setColor(color) {
    if(!host) return;
    host.style.setProperty('--bd-color', color);
}

export function pulseSpotlight() {
    if(!host) return;
    const spot = host.querySelector('.bd-spotlight');
    if(!spot) return;
    spot.classList.remove('pulsing');
    void spot.offsetWidth; // reflow
    spot.classList.add('pulsing');
}

// =============================================================
// PARTICLES — cartas desenfocadas flotando o dots
// =============================================================
function startParticles(type) {
    const container = host?.querySelector('#bd-particles');
    if(!container) return;

    const spawn = () => {
        if(!host || !container.isConnected) return;
        const p = document.createElement('div');
        p.className = `bd-particle bd-particle-${type}`;

        if(type === 'cards') {
            p.innerHTML = randomCardHTML();
        }

        // Posicion horizontal random
        const xStart = Math.random() * 100;
        const duration = 14 + Math.random() * 10;
        const scale = 0.6 + Math.random() * 0.6;
        const opacity = 0.06 + Math.random() * 0.08;

        p.style.left = xStart + '%';
        p.style.animationDuration = duration + 's';
        p.style.transform = `scale(${scale})`;
        p.style.opacity = opacity;

        container.appendChild(p);
        setTimeout(() => p.remove(), duration * 1000);
    };

    // Spawn inicial (3-4 particulas ya en pantalla)
    for(let i = 0; i < 3; i++) {
        setTimeout(spawn, i * 2000);
    }
    particleInterval = setInterval(spawn, type === 'cards' ? 3500 : 1500);
}

function randomCardHTML() {
    const ranks = ['A', 'K', 'Q', 'J', '10', '9', '7', '5', '3'];
    const suits = ['♥', '♦', '♣', '♠'];
    const colors = ['#ef4444', '#f97316', '#3b82f6', '#8b5cf6'];
    const r = ranks[Math.floor(Math.random() * ranks.length)];
    const i = Math.floor(Math.random() * suits.length);
    return `
        <div class="bd-card-inner" style="color:${colors[i]}">
            <span class="bd-card-rank">${r}</span>
            <span class="bd-card-suit">${suits[i]}</span>
        </div>
    `;
}
