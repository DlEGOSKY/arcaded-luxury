// systems/combo.js
// Sistema de combos opt-in: los juegos llaman hit()/miss() y reciben
// un overlay visual automatico + multiplicador para bonificar score.
//
// Uso desde un juego:
//   const c = window.app.combo;
//   c.start();
//   c.hit();           // +1 al combo, muestra overlay
//   const multi = c.multiplier();  // 1x hasta 3x segun combo
//   const bonusScore = basePoints * multi;
//   c.miss();          // reset a 0
//   c.end();           // cleanup al terminar
//
// Milestones: 5, 10, 15, 25, 50. Cada milestone dispara FX especial.

let state = {
    count: 0,
    best:  0,
    active: false,
    overlayEl: null,
    hideTimeout: null,
    app: null,
};

const MILESTONES = [5, 10, 15, 25, 50, 100];

export function start(app) {
    state = {
        count: 0,
        best:  0,
        active: true,
        overlayEl: null,
        hideTimeout: null,
        app,
    };
}

export function hit() {
    if(!state.active) return 0;
    state.count++;
    if(state.count > state.best) state.best = state.count;

    showOverlay();
    maybeCelebrate();
    return state.count;
}

export function miss() {
    if(!state.active) return;
    if(state.count >= 3) {
        flashBreak();
    }
    state.count = 0;
    hideOverlay();
}

export function reset() { miss(); }

export function get() { return state.count; }

export function best() { return state.best; }

export function multiplier() {
    if(state.count < 3)  return 1;
    if(state.count < 6)  return 1.25;
    if(state.count < 10) return 1.5;
    if(state.count < 20) return 2;
    return 3;
}

export function end() {
    state.active = false;
    hideOverlay();
    if(state.hideTimeout) clearTimeout(state.hideTimeout);
    return { best: state.best, final: state.count };
}

// -------------------------------------------------------------
// OVERLAY RENDERING
// -------------------------------------------------------------
function showOverlay() {
    if(!state.overlayEl) {
        const el = document.createElement('div');
        el.className = 'combo-overlay';
        el.innerHTML = `
            <div class="combo-count" id="combo-count">0</div>
            <div class="combo-label">COMBO</div>
            <div class="combo-multi" id="combo-multi">x1</div>
        `;
        document.body.appendChild(el);
        state.overlayEl = el;
    }

    const countEl = state.overlayEl.querySelector('#combo-count');
    const multiEl = state.overlayEl.querySelector('#combo-multi');
    if(countEl) countEl.textContent = state.count;
    if(multiEl) multiEl.textContent = 'x' + multiplier();

    // Color dinamico segun intensidad
    const color = state.count >= 20 ? '#fbbf24'
               : state.count >= 10 ? '#a855f7'
               : state.count >= 5  ? '#06b6d4'
               :                     '#3b82f6';
    state.overlayEl.style.setProperty('--combo-color', color);
    state.overlayEl.classList.add('visible');

    // Bump animation con GSAP si esta disponible
    if(typeof window.gsap !== 'undefined') {
        window.gsap.fromTo(countEl,
            { scale: 1.4 },
            { scale: 1, duration: 0.25, ease: 'back.out(3)' }
        );
    }

    // Auto-ocultar despues de 1.5s sin hits
    if(state.hideTimeout) clearTimeout(state.hideTimeout);
    state.hideTimeout = setTimeout(hideOverlay, 1500);
}

function hideOverlay() {
    if(!state.overlayEl) return;
    state.overlayEl.classList.remove('visible');
    if(state.hideTimeout) { clearTimeout(state.hideTimeout); state.hideTimeout = null; }
}

function flashBreak() {
    if(!state.overlayEl) return;
    state.overlayEl.classList.add('broken');
    setTimeout(() => state.overlayEl?.classList.remove('broken'), 400);
    try { state.app?.audio?.playLose?.(); } catch(e) {}
}

// -------------------------------------------------------------
// MILESTONES: celebracion cada X combos
// -------------------------------------------------------------
function maybeCelebrate() {
    if(!MILESTONES.includes(state.count)) return;

    const fx = state.app?.fx;
    const color = state.count >= 50 ? '#fbbf24'
               : state.count >= 25 ? '#a855f7'
               :                     '#06b6d4';

    // FX segun milestone
    try {
        if(fx) {
            if(state.count >= 25) {
                fx.confettiBurst(state.count >= 50 ? 'legend' : 'epic');
            } else {
                fx.confetti('neon', { particleCount: 40, spread: 50, scalar: 0.7 });
            }
            fx.scorePopup({
                text: state.count + 'x COMBO!',
                color,
                size: state.count >= 25 ? 'large' : 'normal',
            });
        }
        state.app?.audio?.playWin?.(Math.min(state.count / 5, 8));
    } catch(e) {}
}

// -------------------------------------------------------------
// INIT: exponer en app.combo
// -------------------------------------------------------------
export function init(app) {
    app.combo = {
        start: () => start(app),
        hit,
        miss,
        reset,
        get,
        best,
        multiplier,
        end,
    };
}
