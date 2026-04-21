// systems/onboarding.js
// Welcome cinematico para primera vez: reveal dramatico con GSAP,
// typewriter del nombre del agente, frases de recepcion, y luego
// cede el paso al tutorial interactivo.
//
// Se ejecuta una sola vez: si `app.stats.onboardingDone` ya esta en true,
// no hace nada. Se llama desde main.js tras cargar el save.

const WELCOME_LINES = [
    'INICIANDO PROTOCOLO...',
    'CALIBRANDO INTERFAZ NEURAL...',
    'VERIFICANDO CREDENCIALES...',
    'ACCESO CONCEDIDO',
];

export function shouldShow(app) {
    // Solo primera vez: sin partidas jugadas + flag no seteado
    return !app.stats.onboardingDone && (app.stats.gamesPlayed || 0) === 0;
}

export function show(app, onDone) {
    if(!shouldShow(app)) { if(onDone) onDone(); return; }

    const overlay = document.createElement('div');
    overlay.className = 'onboarding-overlay';
    overlay.innerHTML = `
        <div class="ob-bg-grid"></div>
        <div class="ob-content">
            <div class="ob-brand">
                <div class="ob-brand-line">ARCADED</div>
                <div class="ob-brand-sub">LUXURY</div>
            </div>
            <div class="ob-divider"></div>
            <div class="ob-terminal" id="ob-terminal"></div>
            <div class="ob-agent-section" id="ob-agent" style="opacity:0;">
                <div class="ob-agent-label">IDENTIDAD DEL OPERADOR</div>
                <div class="ob-agent-name" id="ob-agent-name">${app.agentName || 'AGENTE'}</div>
                <button class="ob-begin-btn" id="ob-begin">
                    <i class="fa-solid fa-arrow-right-to-bracket"></i> INICIAR SESIÓN
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const hasGsap = typeof window.gsap !== 'undefined';
    const terminal = overlay.querySelector('#ob-terminal');
    const agentSec = overlay.querySelector('#ob-agent');

    // Entrada con GSAP
    if(hasGsap) {
        window.gsap.from('.ob-brand-line', { y: -30, opacity: 0, duration: 0.8, ease: 'power3.out' });
        window.gsap.from('.ob-brand-sub',  { y: 20,  opacity: 0, duration: 0.6, delay: 0.4, ease: 'power2.out' });
        window.gsap.from('.ob-divider',    { width: 0, duration: 0.6, delay: 0.8, ease: 'power2.inOut' });
    }

    // Typewriter de las lineas
    let lineIdx = 0;
    const showNextLine = () => {
        if(lineIdx >= WELCOME_LINES.length) {
            showAgent();
            return;
        }
        const line = WELCOME_LINES[lineIdx];
        const lineEl = document.createElement('div');
        lineEl.className = 'ob-term-line';
        const isLast = lineIdx === WELCOME_LINES.length - 1;
        lineEl.innerHTML = `<span class="ob-term-prompt">&gt;</span> <span class="ob-term-text ${isLast ? 'granted' : ''}"></span>`;
        terminal.appendChild(lineEl);

        const textEl = lineEl.querySelector('.ob-term-text');
        typewriter(textEl, line, () => {
            lineIdx++;
            setTimeout(showNextLine, isLast ? 800 : 280);
        });
    };

    const showAgent = () => {
        if(hasGsap) {
            window.gsap.to(agentSec, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
            window.gsap.from('#ob-agent-name', { scale: 0.5, opacity: 0, duration: 0.6, ease: 'back.out(2)' });
        } else {
            agentSec.style.opacity = '1';
        }
    };

    // Click del boton begin
    overlay.querySelector('#ob-begin').onclick = () => {
        try { app.audio.playWin(3); } catch(e) {}
        try { app.fx?.confettiBurst?.('neon'); } catch(e) {}

        if(hasGsap) {
            window.gsap.to(overlay, {
                opacity: 0,
                duration: 0.5,
                ease: 'power2.in',
                onComplete: () => {
                    overlay.remove();
                    finish(app, onDone);
                },
            });
        } else {
            overlay.style.transition = 'opacity 0.4s';
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                finish(app, onDone);
            }, 450);
        }
    };

    // Empezar typewriter tras intro
    setTimeout(showNextLine, 1400);
}

function typewriter(el, text, onDone) {
    let i = 0;
    const speed = 28; // ms por char
    const tick = () => {
        if(i >= text.length) { if(onDone) onDone(); return; }
        el.textContent = text.slice(0, ++i);
        setTimeout(tick, speed);
    };
    tick();
}

function finish(app, onDone) {
    app.stats.onboardingDone = true;
    app.save();
    if(onDone) onDone();
}
