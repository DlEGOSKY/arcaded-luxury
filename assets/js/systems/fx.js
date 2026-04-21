// systems/fx.js
// Sistema central de efectos visuales con GSAP + canvas-confetti + html2canvas.
// Todas las funciones son defensivas: si la libreria no cargo, silenciosamente no-op.
//
// Uso desde cualquier modulo:
//   import * as FX from './systems/fx.js';
//   FX.confetti('burst', '#fbbf24');
//   FX.rewardClaim(document.querySelector('.np-card.reclaim'));
//   FX.gameOverReveal(callcardEl, isVictory);
//   FX.levelUp(newLevel);

const hasGsap    = () => typeof window !== 'undefined' && typeof window.gsap !== 'undefined';
const hasConfetti = () => typeof window !== 'undefined' && typeof window.confetti !== 'undefined';
const hasH2C     = () => typeof window !== 'undefined' && typeof window.html2canvas !== 'undefined';

const prefersReduced = () =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const appReducedMotion = () =>
    typeof window !== 'undefined' && window.app?.settings?.reduceMotion;

function motionOff() {
    return prefersReduced() || appReducedMotion();
}

// ----------------------------------------------------------------
// CONFETTI — wrappers con presets
// ----------------------------------------------------------------
const CONFETTI_PALETTE = {
    gold:    ['#fbbf24', '#f59e0b', '#fde68a', '#fbbf24'],
    neon:    ['#3b82f6', '#06b6d4', '#22d3ee', '#a855f7'],
    victory: ['#10b981', '#34d399', '#fbbf24', '#3b82f6'],
    epic:    ['#a855f7', '#d946ef', '#ec4899', '#fbbf24'],
    legend:  ['#fbbf24', '#f97316', '#ef4444', '#fbbf24'],
};

export function confetti(preset = 'neon', opts = {}) {
    if(!hasConfetti() || motionOff()) return;
    const colors = CONFETTI_PALETTE[preset] || CONFETTI_PALETTE.neon;

    const defaults = {
        particleCount: 80,
        spread: 70,
        startVelocity: 35,
        gravity: 0.9,
        ticks:  180,
        scalar: 0.9,
        disableForReducedMotion: true,
        colors,
    };
    window.confetti({ ...defaults, ...opts });
}

export function confettiBurst(preset = 'neon') {
    if(!hasConfetti() || motionOff()) return;
    const colors = CONFETTI_PALETTE[preset] || CONFETTI_PALETTE.neon;
    // Burst desde el centro
    window.confetti({
        particleCount: 120,
        spread:  90,
        startVelocity: 45,
        origin:  { x: 0.5, y: 0.55 },
        colors,
        disableForReducedMotion: true,
    });
}

export function confettiSides(preset = 'victory') {
    if(!hasConfetti() || motionOff()) return;
    const colors = CONFETTI_PALETTE[preset] || CONFETTI_PALETTE.victory;
    // Dos burst laterales simultáneos
    const end = Date.now() + 600;
    (function frame() {
        window.confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.7 },
            colors,
            disableForReducedMotion: true,
        });
        window.confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.7 },
            colors,
            disableForReducedMotion: true,
        });
        if(Date.now() < end) requestAnimationFrame(frame);
    })();
}

export function confettiFromElement(element, preset = 'gold') {
    if(!hasConfetti() || motionOff() || !element) return;
    const rect = element.getBoundingClientRect();
    const x = (rect.left + rect.width  / 2) / window.innerWidth;
    const y = (rect.top  + rect.height / 2) / window.innerHeight;
    const colors = CONFETTI_PALETTE[preset] || CONFETTI_PALETTE.gold;
    window.confetti({
        particleCount: 80,
        spread: 100,
        startVelocity: 40,
        origin: { x, y },
        colors,
        disableForReducedMotion: true,
    });
}

// ----------------------------------------------------------------
// REWARD CLAIM — secuencia epica del Neon Pass
// ----------------------------------------------------------------
export function rewardClaim(cardElement, rarity = 'common') {
    if(!cardElement) return;

    // Confetti del color de la rareza
    const preset = rarity === 'legendary' ? 'legend'
                 : rarity === 'epic'      ? 'epic'
                 : rarity === 'rare'      ? 'neon'
                 :                          'gold';
    confettiFromElement(cardElement, preset);

    if(!hasGsap() || motionOff()) return;
    const gsap = window.gsap;

    // Flash dorado radial
    const flash = document.createElement('div');
    const cardRect = cardElement.getBoundingClientRect();
    flash.style.cssText =
        'position:fixed;pointer-events:none;z-index:9999;' +
        `left:${cardRect.left + cardRect.width/2}px;` +
        `top:${cardRect.top + cardRect.height/2}px;` +
        'width:20px;height:20px;border-radius:50%;transform:translate(-50%,-50%);' +
        'background:radial-gradient(circle,rgba(251,191,36,0.9) 0%,rgba(251,191,36,0.4) 40%,transparent 70%);';
    document.body.appendChild(flash);

    const tl = gsap.timeline({ onComplete: () => flash.remove() });
    tl.to(flash, { width: 400, height: 400, opacity: 0, duration: 0.7, ease: 'expo.out' }, 0);
    // Zoom del card
    tl.fromTo(cardElement,
        { scale: 1 },
        { scale: 1.12, duration: 0.25, ease: 'back.out(3)', yoyo: true, repeat: 1 },
        0
    );
}

// ----------------------------------------------------------------
// GAME OVER REVEAL — callcard con entrada escalonada
// ----------------------------------------------------------------
export function gameOverReveal(containerEl, isVictory = false) {
    if(!containerEl || !hasGsap() || motionOff()) return;
    const gsap = window.gsap;

    // Hijos directos con clase reveal-item entran en cascada
    const items = containerEl.querySelectorAll('.fx-reveal');
    if(items.length === 0) return;

    gsap.from(items, {
        y: 18,
        opacity: 0,
        duration: 0.5,
        ease: 'power3.out',
        stagger: 0.07,
    });

    if(isVictory) {
        // Brillo overlay pasando por la card
        const shine = document.createElement('div');
        shine.className = 'fx-shine';
        containerEl.appendChild(shine);
        gsap.fromTo(shine,
            { x: '-120%', opacity: 0.6 },
            { x: '120%', opacity: 0, duration: 1.1, ease: 'power2.inOut',
              onComplete: () => shine.remove() }
        );
        // Confetti suave lateral
        setTimeout(() => confettiSides('victory'), 300);
    }
}

// ----------------------------------------------------------------
// LEVEL UP — celebracion global
// ----------------------------------------------------------------
export function levelUp(newLevel) {
    if(motionOff()) return;

    // Flash global
    if(hasGsap()) {
        const flash = document.createElement('div');
        flash.style.cssText =
            'position:fixed;inset:0;pointer-events:none;z-index:9998;' +
            'background:radial-gradient(ellipse at center,rgba(251,191,36,0.35) 0%,transparent 60%);' +
            'opacity:0;';
        document.body.appendChild(flash);
        window.gsap.to(flash, {
            opacity: 1, duration: 0.25, ease: 'power2.out',
            onComplete: () => {
                window.gsap.to(flash, {
                    opacity: 0, duration: 0.7, ease: 'power2.in',
                    onComplete: () => flash.remove(),
                });
            },
        });
    }

    // Confetti desde 4 esquinas
    if(hasConfetti()) {
        const origins = [
            { x: 0, y: 0, angle: 315 },
            { x: 1, y: 0, angle: 225 },
            { x: 0, y: 1, angle: 45  },
            { x: 1, y: 1, angle: 135 },
        ];
        origins.forEach(({ x, y, angle }) => {
            window.confetti({
                particleCount: 40,
                angle,
                spread: 55,
                startVelocity: 50,
                origin: { x, y },
                colors: CONFETTI_PALETTE.gold,
                disableForReducedMotion: true,
            });
        });
    }
}

// ----------------------------------------------------------------
// SHARE CALLCARD — capturar como PNG
// ----------------------------------------------------------------
export async function shareCallcard(cardElement, filename = 'arcaded-luxury-callcard') {
    if(!cardElement) return { ok: false, reason: 'no element' };
    if(!hasH2C())    return { ok: false, reason: 'html2canvas no cargo' };

    try {
        const canvas = await window.html2canvas(cardElement, {
            backgroundColor: null,
            scale: 2,
            logging: false,
            useCORS: true,
        });
        // Intentar Web Share API primero si esta disponible
        if(navigator.share && canvas.toBlob) {
            return new Promise(resolve => {
                canvas.toBlob(async blob => {
                    try {
                        const file = new File([blob], `${filename}.png`, { type: 'image/png' });
                        if(navigator.canShare?.({ files: [file] })) {
                            await navigator.share({ files: [file], title: 'Arcaded Luxury' });
                            resolve({ ok: true, method: 'share' });
                            return;
                        }
                    } catch(e) { /* fallthrough a descarga */ }
                    downloadBlob(blob, filename + '.png');
                    resolve({ ok: true, method: 'download' });
                }, 'image/png');
            });
        }
        // Fallback: descargar
        canvas.toBlob(blob => downloadBlob(blob, filename + '.png'), 'image/png');
        return { ok: true, method: 'download' };
    } catch(e) {
        console.error('shareCallcard error', e);
        return { ok: false, reason: String(e) };
    }
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ----------------------------------------------------------------
// THEME TRANSITION — morph entre paletas via GSAP
// ----------------------------------------------------------------
export function themeTransition(toColors) {
    if(!hasGsap() || motionOff() || !toColors) return;
    const root = document.documentElement;
    const style = root.style;
    const gsap = window.gsap;

    // Lee los colores actuales de las variables CSS
    const computed = getComputedStyle(root);
    const getVar = (name) => computed.getPropertyValue(name).trim();

    const from = {
        primary: getVar('--primary') || '#3b82f6',
        accent:  getVar('--accent')  || '#06b6d4',
    };

    // Animacion de interpolacion de color
    const proxy = { ...from };
    gsap.to(proxy, {
        primary: toColors.primary || from.primary,
        accent:  toColors.accent  || from.accent,
        duration: 0.6,
        ease: 'power2.inOut',
        onUpdate: () => {
            if(toColors.primary) style.setProperty('--primary', proxy.primary);
            if(toColors.accent)  style.setProperty('--accent',  proxy.accent);
        },
    });
}

// ----------------------------------------------------------------
// PULSE — pulso generico sobre cualquier elemento
// ----------------------------------------------------------------
export function pulse(element, color = 'rgba(59,130,246,0.6)') {
    if(!element || !hasGsap() || motionOff()) return;
    const gsap = window.gsap;
    gsap.fromTo(element,
        { boxShadow: `0 0 0 0 ${color}` },
        {
            boxShadow: `0 0 0 24px ${color.replace(/[\d.]+\)$/, '0)')}`,
            duration: 0.9,
            ease: 'expo.out',
            clearProps: 'boxShadow',
        },
    );
}

// ----------------------------------------------------------------
// CASCADE IN — stagger de aparicion de elementos (lobby cards, listas)
// ----------------------------------------------------------------
export function cascadeIn(elementsOrSelector, opts = {}) {
    if(!hasGsap() || motionOff()) return;
    const els = typeof elementsOrSelector === 'string'
        ? Array.from(document.querySelectorAll(elementsOrSelector))
        : Array.isArray(elementsOrSelector)
            ? elementsOrSelector
            : Array.from(elementsOrSelector || []);
    if(!els.length) return;

    const defaults = { y: 14, opacity: 0, duration: 0.35, stagger: 0.035, ease: 'power3.out' };
    const config = { ...defaults, ...opts };
    window.gsap.from(els, config);
}

// ----------------------------------------------------------------
// SCREEN TRANSITION — glitch horizontal rapido para cambiar pantallas
// ----------------------------------------------------------------
export function screenGlitch(duration = 0.28) {
    if(!hasGsap() || motionOff()) return;
    const glitch = document.createElement('div');
    glitch.style.cssText =
        'position:fixed;inset:0;pointer-events:none;z-index:9996;opacity:0;' +
        'background:repeating-linear-gradient(0deg,' +
        'rgba(59,130,246,0.08) 0px,' +
        'rgba(59,130,246,0.08) 1px,' +
        'transparent 1px,' +
        'transparent 3px),' +
        'linear-gradient(180deg,rgba(59,130,246,0.05),transparent 30%,transparent 70%,rgba(168,85,247,0.04));' +
        'mix-blend-mode:screen;';
    document.body.appendChild(glitch);
    const gsap = window.gsap;
    const tl = gsap.timeline({ onComplete: () => glitch.remove() });
    tl.to(glitch, { opacity: 1, duration: duration * 0.3, ease: 'steps(2)' })
      .to(glitch, { opacity: 0, duration: duration * 0.7, ease: 'power2.in' });
}

// ----------------------------------------------------------------
// SCORE POPUP — numero flotante que sube y se desvanece
// ----------------------------------------------------------------
// Usar desde un juego:
//   FX.scorePopup({ x, y, text: '+50', color: '#fbbf24' });
// x/y son opcionales; si no se dan, aparece en el centro.
export function scorePopup({ x, y, text, color = '#fbbf24', size = 'normal' } = {}) {
    if(motionOff()) return;
    const el = document.createElement('div');
    el.className = 'fx-score-popup';
    el.textContent = text;

    const sizeMap = { small: '0.85rem', normal: '1.3rem', large: '2rem', xlarge: '2.8rem' };
    const fontSize = sizeMap[size] || sizeMap.normal;

    // Posicion default: centro de la ventana
    const cx = typeof x === 'number' ? x : window.innerWidth  / 2;
    const cy = typeof y === 'number' ? y : window.innerHeight / 2;

    el.style.cssText =
        'position:fixed;pointer-events:none;z-index:9995;' +
        `left:${cx}px;top:${cy}px;transform:translate(-50%,-50%);` +
        `color:${color};font-family:var(--font-display,monospace);font-weight:bold;` +
        `font-size:${fontSize};letter-spacing:1px;` +
        `text-shadow:0 0 12px ${color}88,0 2px 4px rgba(0,0,0,0.6);` +
        'will-change:transform,opacity;';
    document.body.appendChild(el);

    if(hasGsap()) {
        const tl = window.gsap.timeline({ onComplete: () => el.remove() });
        tl.fromTo(el,
            { scale: 0.5, opacity: 0, y: 0 },
            { scale: 1.15, opacity: 1, duration: 0.2, ease: 'back.out(2.5)' }
        ).to(el, {
            y: -60, scale: 1, opacity: 0, duration: 0.9, ease: 'power2.out'
        }, 0.2);
    } else {
        // Fallback CSS
        el.style.transition = 'transform 1s ease-out, opacity 1s ease-out';
        requestAnimationFrame(() => {
            el.style.transform = 'translate(-50%,calc(-50% - 60px))';
            el.style.opacity = '0';
        });
        setTimeout(() => el.remove(), 1100);
    }
}

// ----------------------------------------------------------------
// COUNTDOWN 3-2-1 — overlay animado antes de empezar partida
// ----------------------------------------------------------------
// Retorna una Promise que resuelve cuando termina la cuenta regresiva.
// Uso:
//   await FX.countdown();
//   startGame();
export function countdown({ duration = 0.6, color = 'var(--primary)', onTick } = {}) {
    return new Promise(resolve => {
        if(motionOff()) { resolve(); return; }

        const overlay = document.createElement('div');
        overlay.className = 'fx-countdown-overlay';
        overlay.innerHTML = '<div class="fx-countdown-num" id="fx-cd-num">3</div>';
        overlay.style.cssText =
            'position:fixed;inset:0;pointer-events:none;z-index:9994;' +
            'display:flex;align-items:center;justify-content:center;';
        document.body.appendChild(overlay);

        const numEl = overlay.querySelector('#fx-cd-num');
        numEl.style.cssText =
            'font-family:var(--font-display,monospace);font-size:10rem;font-weight:bold;' +
            `color:${color};text-shadow:0 0 40px ${color},0 0 80px ${color}44;` +
            'letter-spacing:2px;will-change:transform,opacity;';

        const numbers = ['3', '2', '1', 'GO'];
        let idx = 0;

        const tick = () => {
            if(idx >= numbers.length) {
                overlay.remove();
                resolve();
                return;
            }
            const n = numbers[idx];
            numEl.textContent = n;
            if(n === 'GO') {
                numEl.style.color = '#10b981';
                numEl.style.textShadow = '0 0 40px #10b981, 0 0 80px #10b98144';
                numEl.style.fontSize = '6rem';
            }
            try { onTick?.(n, idx); } catch(e) {}
            // Pequeno audio beep en cada tick (si hay audio disponible)
            try {
                if(window.app?.audio?.playClick) {
                    if(n === 'GO') window.app.audio.playWin(2);
                    else           window.app.audio.playClick();
                }
            } catch(e) {}

            if(hasGsap()) {
                window.gsap.fromTo(numEl,
                    { scale: 0.3, opacity: 0 },
                    {
                        scale: 1.1, opacity: 1, duration: duration * 0.4,
                        ease: 'back.out(3)',
                        onComplete: () => {
                            window.gsap.to(numEl, {
                                scale: 1.3, opacity: 0, duration: duration * 0.6,
                                ease: 'power2.in',
                                onComplete: () => { idx++; tick(); }
                            });
                        }
                    }
                );
            } else {
                idx++;
                setTimeout(tick, duration * 1000);
            }
        };
        tick();
    });
}

// ----------------------------------------------------------------
// SCREEN FLASH — flash rapido full screen
// ----------------------------------------------------------------
export function screenFlash(color = 'rgba(255,255,255,0.3)', duration = 0.2) {
    if(!hasGsap() || motionOff()) return;
    const flash = document.createElement('div');
    flash.style.cssText =
        'position:fixed;inset:0;pointer-events:none;z-index:9997;' +
        `background:${color};opacity:0;`;
    document.body.appendChild(flash);
    const gsap = window.gsap;
    gsap.to(flash, {
        opacity: 1,
        duration: duration / 2,
        yoyo: true,
        repeat: 1,
        ease: 'power2.inOut',
        onComplete: () => flash.remove(),
    });
}
