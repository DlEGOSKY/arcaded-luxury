// systems/game-fx.js
// Kit visual reutilizable para juegos DOM. Centraliza animaciones y
// efectos juicy para que todos los juegos tengan el mismo feel premium
// sin duplicar codigo.
//
// Filosofia:
// - Todas las funciones son defensivas: si GSAP no esta cargado, fallback
//   CSS o no-op silencioso. Nunca romper el juego.
// - Respetan prefers-reduced-motion + app.settings.reduceMotion
// - Devuelven cleanup/timeline cuando corresponde para poder cancelar
//
// Uso desde un juego:
//   import * as GFX from '../systems/game-fx.js';
//   GFX.tilt3D(cardEl);
//   GFX.flipCard(oldCard, newCard, 'right');
//   GFX.rollNumber(scoreEl, 0, 150, 0.8);

const hasGsap = () => typeof window.gsap !== 'undefined';
const hasConfetti = () => typeof window.confetti !== 'undefined';
const reduced = () => {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        || window.app?.settings?.reduceMotion;
};

// =============================================================
// TILT 3D — respuesta del elemento al mousemove
// =============================================================
export function tilt3D(el, opts = {}) {
    if(!el || reduced()) return () => {};
    const max = opts.max || 14;        // grados maximos
    const perspective = opts.perspective || 800;
    const scale = opts.scale || 1.02;

    el.style.transformStyle = 'preserve-3d';
    el.style.willChange = 'transform';

    let raf = null;
    const onMove = (e) => {
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width  - 0.5;
        const y = (e.clientY - rect.top)  / rect.height - 0.5;
        const rotY = x * max;
        const rotX = -y * max;
        if(raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
            el.style.transform = `perspective(${perspective}px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale})`;
        });
    };
    const onLeave = () => {
        if(raf) cancelAnimationFrame(raf);
        el.style.transform = `perspective(${perspective}px) rotateX(0) rotateY(0) scale(1)`;
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);

    return () => {
        el.removeEventListener('mousemove', onMove);
        el.removeEventListener('mouseleave', onLeave);
        if(raf) cancelAnimationFrame(raf);
        el.style.transform = '';
    };
}

// =============================================================
// FLIP CARD — reveal 3D de una carta nueva reemplazando a otra
// =============================================================
export function flipCard(oldEl, newEl, direction = 'right', onDone) {
    if(!newEl) { if(onDone) onDone(); return; }

    // Fallback sin GSAP: slide simple
    if(!hasGsap() || reduced()) {
        if(oldEl) oldEl.style.opacity = '0';
        newEl.style.opacity = '1';
        if(onDone) setTimeout(onDone, 200);
        return;
    }

    const gsap = window.gsap;
    const dir = direction === 'left' ? -1 : 1;

    const tl = gsap.timeline({ onComplete: onDone });

    if(oldEl) {
        tl.to(oldEl, {
            rotationY: -90 * dir,
            opacity: 0,
            duration: 0.35,
            ease: 'power2.in',
            transformPerspective: 800,
        });
    }
    tl.fromTo(newEl,
        { rotationY: 90 * dir, opacity: 0, transformPerspective: 800 },
        { rotationY: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.6)' },
        oldEl ? '-=0.1' : '0'
    );
    return tl;
}

// =============================================================
// SHINE SWEEP — barrido de brillo holografico sobre un elemento
// =============================================================
export function shineSweep(el, opts = {}) {
    if(!el || reduced()) return;
    const color = opts.color || 'rgba(255,255,255,0.6)';
    const duration = opts.duration || 1.0;
    const angle = opts.angle || 105;

    // Crear capa de shine
    const shine = document.createElement('div');
    shine.className = 'gfx-shine';
    shine.style.cssText = `
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(${angle}deg,
            transparent 30%,
            ${color} 48%,
            ${color.replace(/[\d.]+\)$/, '0.9)')} 50%,
            ${color} 52%,
            transparent 70%);
        z-index: 3;
        mix-blend-mode: screen;
        border-radius: inherit;
        transform: translateX(-150%);
    `;

    // Asegurar que el parent tiene position + overflow
    const prev = { position: el.style.position, overflow: el.style.overflow };
    if(getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.style.overflow = 'hidden';
    el.appendChild(shine);

    if(hasGsap()) {
        window.gsap.to(shine, {
            x: '150%',
            duration,
            ease: 'power2.inOut',
            onComplete: () => {
                shine.remove();
                el.style.position = prev.position;
                el.style.overflow = prev.overflow;
            },
        });
    } else {
        shine.style.transition = `transform ${duration}s ease-in-out`;
        requestAnimationFrame(() => {
            shine.style.transform = 'translateX(150%)';
        });
        setTimeout(() => {
            shine.remove();
            el.style.position = prev.position;
            el.style.overflow = prev.overflow;
        }, duration * 1000 + 50);
    }
}

// =============================================================
// ROLLING NUMBER — animar un contador de from a to
// =============================================================
export function rollNumber(el, from, to, duration = 0.8, opts = {}) {
    if(!el) return;
    const prefix = opts.prefix || '';
    const suffix = opts.suffix || '';
    const format = opts.format || ((n) => Math.round(n).toLocaleString());

    if(reduced() || !hasGsap()) {
        el.textContent = prefix + format(to) + suffix;
        return;
    }
    const obj = { v: from };
    window.gsap.to(obj, {
        v: to,
        duration,
        ease: 'power2.out',
        onUpdate: () => {
            el.textContent = prefix + format(obj.v) + suffix;
        },
    });
}

// =============================================================
// HIT FEEDBACK — halo verde + pulso rapido
// =============================================================
export function hitFeedback(el, opts = {}) {
    if(!el) return;
    const color = opts.color || '#10b981';

    // Halo via box-shadow
    if(hasGsap() && !reduced()) {
        const gsap = window.gsap;
        const tl = gsap.timeline();
        tl.to(el, {
            boxShadow: `0 0 40px ${color}, 0 0 80px ${color}`,
            scale: 1.04,
            duration: 0.18,
            ease: 'power2.out',
        });
        tl.to(el, {
            boxShadow: el.style.boxShadow || '',
            scale: 1,
            duration: 0.35,
            ease: 'power2.out',
        });
    }

    // Confetti rapido desde el centro del elemento
    if(hasConfetti() && !reduced() && opts.confetti !== false) {
        const rect = el.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;
        window.confetti({
            particleCount: opts.particles || 25,
            spread: 50,
            startVelocity: 28,
            scalar: 0.7,
            origin: { x, y },
            colors: [color, '#ffffff'],
            disableForReducedMotion: true,
        });
    }
}

// =============================================================
// MISS FEEDBACK — shake + flash rojo + particulas rotas
// =============================================================
export function missFeedback(el, opts = {}) {
    if(!el) return;
    const color = opts.color || '#ef4444';

    if(hasGsap() && !reduced()) {
        const gsap = window.gsap;
        gsap.fromTo(el,
            { x: -8 },
            {
                x: 0,
                duration: 0.4,
                ease: 'elastic.out(1.2, 0.3)',
            }
        );
        // Flash borde rojo
        const prevShadow = el.style.boxShadow;
        gsap.to(el, {
            boxShadow: `0 0 40px ${color}, inset 0 0 20px ${color}`,
            duration: 0.12,
            onComplete: () => {
                gsap.to(el, { boxShadow: prevShadow, duration: 0.5 });
            },
        });
    } else if(!reduced()) {
        // Fallback CSS
        el.classList.add('gfx-shake');
        setTimeout(() => el.classList.remove('gfx-shake'), 400);
    }

    // Screen flash rojo sutil (opcional)
    if(opts.screenFlash !== false) {
        screenFlash(color, 0.15, 180);
    }
}

// =============================================================
// SCREEN FLASH — flash global rapido
// =============================================================
export function screenFlash(color = 'rgba(239,68,68,0.2)', maxAlpha = 0.2, durationMs = 200) {
    if(reduced()) return;
    const flash = document.createElement('div');
    flash.style.cssText = `
        position: fixed; inset: 0;
        background: ${color};
        opacity: 0;
        pointer-events: none;
        z-index: 999;
        mix-blend-mode: screen;
    `;
    document.body.appendChild(flash);
    if(hasGsap()) {
        const gsap = window.gsap;
        gsap.to(flash, {
            opacity: maxAlpha,
            duration: durationMs / 2000,
            ease: 'power2.out',
            onComplete: () => {
                gsap.to(flash, {
                    opacity: 0,
                    duration: durationMs / 2000,
                    ease: 'power2.in',
                    onComplete: () => flash.remove(),
                });
            },
        });
    } else {
        flash.style.transition = `opacity ${durationMs / 2}ms`;
        requestAnimationFrame(() => { flash.style.opacity = maxAlpha; });
        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => flash.remove(), durationMs / 2);
        }, durationMs / 2);
    }
}

// =============================================================
// STREAK BREAK — efecto de cristal roto cuando se pierde combo
// =============================================================
export function streakBreak(el) {
    if(!el || reduced()) return;
    if(!hasGsap()) return;
    const gsap = window.gsap;
    gsap.timeline()
        .to(el, {
            rotation: -4,
            x: -6,
            duration: 0.08,
            ease: 'power2.out',
        })
        .to(el, {
            rotation: 4,
            x: 6,
            duration: 0.08,
            ease: 'power2.inOut',
        })
        .to(el, {
            rotation: 0,
            x: 0,
            duration: 0.3,
            ease: 'elastic.out(1, 0.4)',
        });
}

// =============================================================
// BREATHING GLOW — respiracion sutil infinita del glow
// =============================================================
export function breathingGlow(el, color = '#3b82f6', intensity = 0.4) {
    if(!el || reduced()) return () => {};
    if(!hasGsap()) return () => {};
    const gsap = window.gsap;
    const tween = gsap.to(el, {
        boxShadow: `0 0 ${30 * intensity}px ${color}, 0 0 ${60 * intensity}px ${color}`,
        duration: 1.4,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
    });
    return () => tween.kill();
}

// =============================================================
// RIPPLE CLICK — ondas de color al hacer click
// =============================================================
export function rippleClick(el, event, color = 'rgba(255,255,255,0.4)') {
    if(!el || reduced()) return;
    const rect = el.getBoundingClientRect();
    const x = (event?.clientX ?? rect.left + rect.width / 2) - rect.left;
    const y = (event?.clientY ?? rect.top + rect.height / 2) - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;

    const ripple = document.createElement('span');
    ripple.className = 'gfx-ripple';
    ripple.style.cssText = `
        position: absolute;
        left: ${x - size / 2}px;
        top: ${y - size / 2}px;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${color};
        pointer-events: none;
        transform: scale(0);
        opacity: 1;
        z-index: 0;
    `;

    // Garantizar position + overflow
    const prevPos = el.style.position;
    const prevOv = el.style.overflow;
    if(getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.style.overflow = 'hidden';
    el.appendChild(ripple);

    if(hasGsap()) {
        window.gsap.to(ripple, {
            scale: 1, opacity: 0, duration: 0.6, ease: 'power2.out',
            onComplete: () => {
                ripple.remove();
                el.style.position = prevPos;
                el.style.overflow = prevOv;
            },
        });
    } else {
        ripple.style.transition = 'transform 0.5s ease-out, opacity 0.5s ease-out';
        requestAnimationFrame(() => {
            ripple.style.transform = 'scale(1)';
            ripple.style.opacity = '0';
        });
        setTimeout(() => {
            ripple.remove();
            el.style.position = prevPos;
            el.style.overflow = prevOv;
        }, 550);
    }
}

// =============================================================
// POP SCALE — bump rapido al elemento (feedback de cambio)
// =============================================================
export function popScale(el, scale = 1.15, duration = 0.35) {
    if(!el || reduced()) return;
    if(!hasGsap()) return;
    const gsap = window.gsap;
    gsap.fromTo(el,
        { scale },
        { scale: 1, duration, ease: 'back.out(2)' }
    );
}

// =============================================================
// FLOAT IN — elementos aparecen desde abajo con fade
// =============================================================
export function floatIn(els, opts = {}) {
    if(!els || reduced() || !hasGsap()) return;
    const gsap = window.gsap;
    const nodes = els.length !== undefined ? Array.from(els) : [els];
    gsap.from(nodes, {
        y: opts.y || 20,
        opacity: 0,
        duration: opts.duration || 0.5,
        stagger: opts.stagger || 0.08,
        ease: opts.ease || 'back.out(1.5)',
    });
}
