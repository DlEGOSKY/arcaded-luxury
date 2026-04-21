// systems/tutorial.js
// Tutorial interactivo de primera vez. Spotlight + tooltip paso a paso.
//
// Contrato: recibe la instancia `app` que debe exponer:
//   app.stats (tutorialDone flag)
//   app.audio (playClick)
//   app.save()
//   app.showToast(title, msg, type)
//
// Dependencia DOM: crea y destruye el overlay `#tutorial-overlay` y sus hijos
// internos (.tutorial-spotlight, .tutorial-tooltip, .tut-step, .tut-title,
// .tut-desc, .tut-actions, .tut-dots, .tut-dot[.active], .tut-btn-skip,
// .tut-btn-next). Los estilos viven en assets/css/style.css.

const TUT_STEPS = [
    {
        target: '.main-nav-brand',
        title:  'PROTOCOLOS',
        desc:   'Bienvenido al sistema. Aquí verás el nombre y el botón de partida aleatoria.',
        pos:    'bottom',
    },
    {
        target: '.main-nav-tabs',
        title:  'NAVEGACIÓN',
        desc:   'Accede al Protocolo Diario, Misiones Semanales, Neon Pass, Tienda y tu Perfil.',
        pos:    'bottom',
    },
    {
        target: '.lobby-filters',
        title:  'FILTROS',
        desc:   'Filtra los juegos por categoría: Reflejos, Memoria, Mental, Acción o Conocimiento.',
        pos:    'bottom',
    },
    {
        target: '.game-card-v2',
        title:  'JUEGOS',
        desc:   'Haz click para jugar. El ícono (i) muestra info del juego. Acumulas récords y XP.',
        pos:    'right',
    },
    {
        target: '.status-bar',
        title:  'ESTADO DEL AGENTE',
        desc:   'Tu rango, barra de XP, créditos y racha diaria. Todo progresa con cada partida.',
        pos:    'top',
    },
];

const TOOLTIP_W   = 280;
const TOOLTIP_H   = 150;
const PADDING     = 8;
const EDGE_MARGIN = 8;
const GAP         = 10;

export function start(app) {
    if(app.stats.tutorialDone) return;
    showStep(app, 0);
}

function showStep(app, idx) {
    removeOverlay();
    if(idx >= TUT_STEPS.length) { finish(app); return; }

    const step = TUT_STEPS[idx];
    const el   = document.querySelector(step.target);
    if(!el) { showStep(app, idx + 1); return; }

    const rect = el.getBoundingClientRect();

    const overlay = document.createElement('div');
    overlay.id = 'tutorial-overlay';
    overlay.className = 'tutorial-overlay';

    overlay.appendChild(buildSpotlight(rect));
    overlay.appendChild(buildTooltip(app, idx, step, rect));

    document.body.appendChild(overlay);
}

function buildSpotlight(rect) {
    const spot = document.createElement('div');
    spot.className = 'tutorial-spotlight';
    spot.style.cssText = [
        `left:${rect.left - PADDING}px`,
        `top:${rect.top - PADDING}px`,
        `width:${rect.width + PADDING * 2}px`,
        `height:${rect.height + PADDING * 2}px`,
    ].join(';');
    return spot;
}

function buildTooltip(app, idx, step, rect) {
    const tt = document.createElement('div');
    tt.className = 'tutorial-tooltip';

    const dotsHTML = TUT_STEPS
        .map((_, i) => `<div class="tut-dot${i === idx ? ' active' : ''}"></div>`)
        .join('');

    const nextLabel = idx === TUT_STEPS.length - 1 ? 'LISTO' : 'SIGUIENTE';
    const canGoBack = idx > 0;

    tt.innerHTML = [
        `<div class="tut-step">PASO ${idx + 1} / ${TUT_STEPS.length}</div>`,
        `<div class="tut-title">${step.title}</div>`,
        `<div class="tut-desc">${step.desc}</div>`,
        `<div class="tut-actions">`,
        `  <div class="tut-dots">${dotsHTML}</div>`,
        `  <div style="display:flex;gap:6px;align-items:center;">`,
        canGoBack ? `    <button class="tut-btn-skip" id="tut-back"><i class="fa-solid fa-arrow-left"></i></button>` : '',
        `    <button class="tut-btn-skip" id="tut-skip">SALTAR</button>`,
        `    <button class="tut-btn-next" id="tut-next">${nextLabel}</button>`,
        `  </div>`,
        `</div>`,
    ].join('');

    const { left, top } = positionTooltip(step, rect);
    tt.style.left = `${left}px`;
    tt.style.top  = `${top}px`;

    tt.querySelector('#tut-next').onclick = () => {
        playClick(app);
        showStep(app, idx + 1);
    };
    tt.querySelector('#tut-skip').onclick = () => {
        playClick(app);
        finish(app);
    };
    const backBtn = tt.querySelector('#tut-back');
    if(backBtn) {
        backBtn.onclick = () => {
            playClick(app);
            showStep(app, idx - 1);
        };
    }

    // Animacion de entrada con GSAP si disponible
    if(typeof window.gsap !== 'undefined') {
        setTimeout(() => {
            window.gsap.from(tt, {
                opacity: 0,
                scale: 0.85,
                y: 10,
                duration: 0.35,
                ease: 'back.out(1.8)',
            });
        }, 0);
    }

    return tt;
}

function positionTooltip(step, rect) {
    let left, top;
    if(step.pos === 'bottom') {
        left = Math.min(rect.left, window.innerWidth - TOOLTIP_W - 16);
        top  = rect.bottom + PADDING + GAP;
    } else if(step.pos === 'top') {
        left = Math.min(rect.left, window.innerWidth - TOOLTIP_W - 16);
        top  = rect.top - TOOLTIP_H - PADDING - GAP;
    } else {
        left = rect.right + PADDING + GAP;
        top  = rect.top;
    }
    return {
        left: Math.max(EDGE_MARGIN, left),
        top:  Math.max(EDGE_MARGIN, top),
    };
}

function playClick(app) {
    try { app.audio.playClick(); } catch(e) {}
}

function removeOverlay() {
    const el = document.getElementById('tutorial-overlay');
    if(el) el.remove();
}

function finish(app) {
    removeOverlay();
    app.stats.tutorialDone = true;
    app.save();
    app.showToast('SISTEMA DOMINADO', 'Tutorial completado. ¡A jugar!', 'success');
}
