// systems/pixi-stage.js
// Helpers reusables para construir la shell visual de los juegos:
//  - Layout con HUD premium + cyber-frame con esquinas
//  - Init de PixiJS con resolución DPR y auto-density
//  - Filtros GlowFilter / AdvancedBloomFilter (pixi-filters) con fallback
//  - Partículas, screen-shake (GSAP), confetti burst
// Todo opcional: los juegos pueden usar solo los helpers que necesiten.

// -------- LAYOUT SHELL --------
// Construye el wrapper base común a todos los juegos.
// Respeta el padding-top:56px del #game-ui-overlay (HUD global de créditos).
//
// opts:
//   container:    HTMLElement (normalmente #game-ui-overlay)
//   hudHTML:      string con innerHTML del HUD (DOM tradicional)
//   hudHeight:    px del HUD (default 68)
//   bg:           background del _root (default rgba(5,8,16,0.92))
//   frameColor:   color del borde del frame (default azul)
//   cornerColor:  color de las esquinas decorativas (default dorado)
//   domOnly:      true = no se usa canvas Pixi; el pixiHost se prepara para alojar
//                 contenido DOM directamente (scroll interno, padding, fondo sólido)
//   maxWidth:     en domOnly, ancho máximo del frame (default 720)
//
// Returns: { root, hud, wrap, pixiHost, frame, content }
// Si domOnly=true, `content` es un div hijo del pixiHost listo para recibir el juego.
export function createGameShell(opts = {}) {
    const {
        container,
        hudHTML     = '',
        hudHeight   = 68,
        bg          = 'rgba(5,8,16,0.92)',
        frameColor  = 'rgba(59,130,246,0.4)',
        cornerColor = '#fbbf24',
        domOnly     = false,
        maxWidth    = 720,
    } = opts;

    container.innerHTML = '';

    const root = document.createElement('div');
    root.style.cssText = `position:absolute;top:56px;left:0;right:0;bottom:0;display:flex;flex-direction:column;background:${bg};pointer-events:auto;overflow:hidden;`;
    container.appendChild(root);

    const hud = document.createElement('div');
    hud.style.cssText = `
        padding:14px 28px;
        background:linear-gradient(180deg, rgba(5,8,20,0.98) 0%, rgba(5,8,20,0.88) 100%);
        border-bottom:1px solid rgba(59,130,246,0.25);
        box-shadow:0 2px 20px rgba(59,130,246,0.08);
        display:flex;justify-content:space-between;align-items:center;
        font-family:'Orbitron',monospace;flex-shrink:0;z-index:2;
        min-height:${hudHeight}px;box-sizing:border-box;
    `;
    hud.innerHTML = hudHTML;
    root.appendChild(hud);

    const wrap = document.createElement('div');
    wrap.style.cssText = 'flex:1 1 0;display:flex;align-items:center;justify-content:center;padding:20px;min-height:0;min-width:0;width:100%;box-sizing:border-box;';
    root.appendChild(wrap);

    const pixiHost = document.createElement('div');
    if(domOnly) {
        pixiHost.style.cssText = `
            position:relative;
            border:1px solid ${frameColor};
            border-radius:8px;
            background:linear-gradient(180deg, rgba(8,12,22,0.95) 0%, rgba(4,7,16,0.98) 100%);
            box-shadow:0 0 60px rgba(59,130,246,0.2),0 0 140px rgba(59,130,246,0.08),inset 0 0 40px rgba(0,0,0,0.6);
            width:100%;max-width:${maxWidth}px;
            max-height:100%;
            display:flex;flex-direction:column;
            overflow:hidden;
            flex:1 1 auto;
        `;
    } else {
        pixiHost.style.cssText = `
            position:relative;
            border:1px solid ${frameColor};
            border-radius:4px;
            background:#030610;
            box-shadow:0 0 60px rgba(59,130,246,0.25),0 0 140px rgba(59,130,246,0.1),inset 0 0 30px rgba(0,0,0,0.5);
            line-height:0;
            overflow:visible;
            flex:0 0 auto;
        `;
    }
    wrap.appendChild(pixiHost);
    addCornerDecorations(pixiHost, cornerColor);

    let content = null;
    if(domOnly) {
        content = document.createElement('div');
        if(opts.arena) {
            // Modo arena: sin scroll ni padding, para juegos con position:absolute interno
            content.style.cssText = `
                flex:1 1 auto;position:relative;min-height:0;width:100%;
                overflow:hidden;
            `;
        } else {
            content.style.cssText = `
                flex:1 1 auto;overflow-y:auto;overflow-x:hidden;
                padding:22px 28px;min-height:0;
                display:flex;flex-direction:column;gap:16px;
                scrollbar-width:thin;scrollbar-color:rgba(59,130,246,0.3) transparent;
            `;
        }
        pixiHost.appendChild(content);
    }

    return { root, hud, wrap, pixiHost, frame: pixiHost, content };
}

// =====================================================================
// Overlay no-destructivo: añade solo marco + esquinas cyber sobre un
// contenedor existente sin tocar sus contenidos.
// Ideal para juegos con canvas HTML propio donde no queremos reescribir.
//
// opts: { color = '#3b82f6', cornerColor = color, inset = 8 }
// - Retorna el elemento overlay (para FX winFlash/screenShake/confetti)
// - Si el container ya tiene overlay, lo reemplaza.
// =====================================================================
export function applyCyberOverlay(container, opts = {}) {
    if(!container) return null;
    const color = opts.color || '#3b82f6';
    const cornerColor = opts.cornerColor || color;
    const defInset = opts.inset ?? 8;
    const top    = opts.top    ?? defInset;
    const right  = opts.right  ?? defInset;
    const bottom = opts.bottom ?? defInset;
    const left   = opts.left   ?? defInset;

    // Remove previous overlay if exists
    const prev = container.querySelector(':scope > .cyber-overlay-frame');
    if(prev) prev.remove();

    const overlay = document.createElement('div');
    overlay.className = 'cyber-overlay-frame';
    overlay.style.cssText = `
        position:absolute;
        top:${top}px;right:${right}px;bottom:${bottom}px;left:${left}px;
        pointer-events:none;
        border:1.5px solid ${color};
        border-radius:10px;
        box-shadow:
            0 0 24px ${color}55,
            inset 0 0 48px ${color}22,
            inset 0 0 0 1px rgba(255,255,255,0.03);
        z-index:50;
    `;
    addCornerDecorations(overlay, cornerColor);
    // Asegurar posicionamiento del container
    const cs = getComputedStyle(container);
    if(cs.position === 'static') container.style.position = 'relative';
    container.appendChild(overlay);
    return overlay;
}

// =====================================================================
// Monta un frame cyber sobre la pantalla de juego (#screen-game)
// respetando el HUD superior (top:56px por defecto).
// No toca el contenido del juego — ideal para juegos con canvas propio.
//
// opts: { color, hudOffset = 56, bottomOffset = 8 }
// Retorna el elemento overlay para FX (winFlash, screenShake).
// =====================================================================
export function mountGameFrame(opts = {}) {
    const screen = document.getElementById('screen-game');
    if(!screen) return null;
    return applyCyberOverlay(screen, {
        color: opts.color || '#3b82f6',
        cornerColor: opts.cornerColor,
        top: opts.hudOffset ?? 56,
        bottom: opts.bottomOffset ?? 8,
        left: 8, right: 8,
    });
}

export function unmountGameFrame() {
    const screen = document.getElementById('screen-game');
    if(!screen) return;
    const prev = screen.querySelector(':scope > .cyber-overlay-frame');
    if(prev) prev.remove();
}

// 4 esquinas decorativas tipo HUD militar
export function addCornerDecorations(host, color = '#fbbf24') {
    const cornerSVG = (rot) => `<svg viewBox="0 0 24 24" style="width:20px;height:20px;transform:rotate(${rot}deg);display:block;">
        <path d="M2 2 L2 11 M2 2 L11 2" stroke="${color}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <circle cx="2" cy="2" r="1.6" fill="${color}"/>
    </svg>`;
    const mkCorner = (pos, rot) => {
        const d = document.createElement('div');
        d.style.cssText = `position:absolute;${pos};pointer-events:none;z-index:3;`;
        d.innerHTML = cornerSVG(rot);
        return d;
    };
    host.appendChild(mkCorner('top:-6px;left:-6px', 0));
    host.appendChild(mkCorner('top:-6px;right:-6px', 90));
    host.appendChild(mkCorner('bottom:-6px;left:-6px', -90));
    host.appendChild(mkCorner('bottom:-6px;right:-6px', 180));
}

// -------- HUD helper: stat block reusable --------
// Devuelve el HTML de un bloque stat con label + valor
// opts: { label, id, color, value, minWidth }
export function hudStat({ label, id, color = '#60a5fa', value = '0', minWidth = 90 }) {
    return `
        <div style="display:flex;flex-direction:column;gap:4px;min-width:${minWidth}px;">
            <div style="font-size:0.52rem;color:#64748b;letter-spacing:3px;font-weight:600;">${label}</div>
            <div style="display:flex;align-items:baseline;gap:6px;">
                <div id="${id}" style="font-size:1.5rem;color:${color};letter-spacing:3px;font-weight:700;text-shadow:0 0 12px ${color}aa;">${value}</div>
            </div>
        </div>`;
}

// Logo block a la izquierda del HUD
export function hudLogo({ title, subtitle, titleColor = '#3b82f6', subColor = '#fbbf24' }) {
    return `
        <div style="display:flex;flex-direction:column;gap:2px;padding-right:24px;border-right:1px solid rgba(59,130,246,0.2);">
            <div style="font-size:0.55rem;color:${titleColor};letter-spacing:4px;font-weight:700;">${title}</div>
            <div style="font-size:0.75rem;color:${subColor};letter-spacing:3px;font-weight:800;">${subtitle}</div>
        </div>`;
}

// Bloque de modo a la derecha
export function hudMode({ mode, modeColor = '#60a5fa', hint = '' }) {
    return `
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
            <div style="font-size:0.55rem;color:#64748b;letter-spacing:3px;">MODO</div>
            <div style="font-size:0.85rem;color:${modeColor};letter-spacing:4px;font-weight:800;text-shadow:0 0 10px currentColor;">${mode}</div>
            ${hint ? `<div style="font-size:0.48rem;color:#475569;letter-spacing:2px;margin-top:2px;">${hint}</div>` : ''}
        </div>`;
}


// -------- PIXI SETUP --------
// Crea una PIXI.Application y la adjunta al host dado.
// Asegura que el canvas no escape y tenga estilos correctos.
export async function initPixiApp(host, { width, height }) {
    if(!window.PIXI) throw new Error('PixiJS no está cargado');
    const app = new PIXI.Application();
    await app.init({
        width, height,
        backgroundAlpha: 0,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
    });
    const canvas = app.canvas;
    if(canvas.parentNode && canvas.parentNode !== host) {
        canvas.parentNode.removeChild(canvas);
    }
    canvas.style.cssText = 'display:block;position:relative;width:100%;height:100%;';
    host.appendChild(canvas);
    return app;
}

// Calcula dimensión cuadrada disponible dentro de un wrap con padding.
export function computeSquareSize(wrap, { padding = 40, max = 900, min = 300 } = {}) {
    const cw = (wrap?.clientWidth  || window.innerWidth)  - padding;
    const ch = (wrap?.clientHeight || window.innerHeight) - padding;
    return Math.max(min, Math.min(cw, ch, max));
}

// Calcula dimensiones rectangulares disponibles (ratio libre).
export function computeRectSize(wrap, { padding = 40, maxW = 1400, maxH = 900, minW = 300, minH = 300 } = {}) {
    const cw = (wrap?.clientWidth  || window.innerWidth)  - padding;
    const ch = (wrap?.clientHeight || window.innerHeight) - padding;
    return { w: Math.max(minW, Math.min(cw, maxW)), h: Math.max(minH, Math.min(ch, maxH)) };
}


// -------- FILTROS --------
// GlowFilter con fallback a BlurFilter si pixi-filters no está.
export function makeGlow(color = 0x3b82f6, distance = 10, strength = 2) {
    if(window.PIXI?.filters?.GlowFilter) {
        return new PIXI.filters.GlowFilter({
            distance, outerStrength: strength, innerStrength: 0.3,
            color, quality: 0.25,
        });
    }
    return new PIXI.BlurFilter({ strength: 3 });
}

// AdvancedBloomFilter. Devuelve null si no disponible.
export function makeBloom({ threshold = 0.5, bloomScale = 0.8, brightness = 1, blur = 4, quality = 4 } = {}) {
    if(window.PIXI?.filters?.AdvancedBloomFilter) {
        return new PIXI.filters.AdvancedBloomFilter({ threshold, bloomScale, brightness, blur, quality });
    }
    return null;
}


// -------- EFECTOS VISUALES --------
// Flash de borde/sombra al frame con color + duración.
export function winFlash(frame, { color = '#10b981', duration = 700 } = {}) {
    if(!frame) return;
    const origShadow = frame.style.boxShadow;
    const origBorder = frame.style.borderColor;
    frame.style.boxShadow = `0 0 80px ${color}, 0 0 160px ${color}88, inset 0 0 60px ${color}55`;
    frame.style.borderColor = color;
    setTimeout(() => {
        if(!frame) return;
        frame.style.boxShadow = origShadow;
        frame.style.borderColor = origBorder;
    }, duration);
}

// Screen shake con GSAP (no hace nada si GSAP no está).
export function screenShake(el, { strength = 6, count = 5 } = {}) {
    if(!window.gsap || !el) return;
    const tl = window.gsap.timeline();
    for(let i = 0; i < count; i++) {
        const x = (i % 2 === 0 ? -1 : 1) * strength * (1 - i / count);
        tl.to(el, { x, duration: 0.04 });
    }
    tl.to(el, { x: 0, duration: 0.05 });
}

// Confetti burst centrado en un elemento del DOM.
export function burstConfetti(el, { count = 80, colors = ['#fbbf24', '#10b981', '#60a5fa', '#ffffff'] } = {}) {
    if(!window.confetti) return;
    try {
        const rect = el?.getBoundingClientRect();
        const origin = rect ? {
            x: (rect.left + rect.width / 2) / window.innerWidth,
            y: (rect.top + rect.height / 2) / window.innerHeight,
        } : { x: 0.5, y: 0.5 };
        window.confetti({
            particleCount: count,
            spread: 75,
            origin,
            colors,
            scalar: 0.9,
            ticks: 120,
        });
    } catch(e) {}
}


// -------- PARTÍCULAS --------
// Sistema simple de partículas Pixi. Se maneja un array y se actualiza en cada tick.
// Crear particleLayer (Container) en tu stage y pasarlo.
export function spawnParticles(layer, particlesArray, cx, cy, color, count = 10, opts = {}) {
    const {
        minSpeed = 1, maxSpeed = 3.5,
        minRadius = 1.8, maxRadius = 4,
        minDecay = 0.015, maxDecay = 0.04,
        gravity = 0,
    } = opts;
    for(let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = minSpeed + Math.random() * (maxSpeed - minSpeed);
        const r = minRadius + Math.random() * (maxRadius - minRadius);
        const g = new PIXI.Graphics();
        g.circle(0, 0, r).fill({ color, alpha: 1 });
        g.x = cx; g.y = cy;
        g._vx = Math.cos(a) * s;
        g._vy = Math.sin(a) * s;
        g._life = 1;
        g._decay = minDecay + Math.random() * (maxDecay - minDecay);
        g._gravity = gravity;
        layer.addChild(g);
        particlesArray.push(g);
    }
}

// Actualiza y limpia partículas (llamar cada tick).
export function updateParticles(particlesArray) {
    for(let i = particlesArray.length - 1; i >= 0; i--) {
        const p = particlesArray[i];
        p.x += p._vx;
        p.y += p._vy;
        p._vx *= 0.92;
        p._vy *= 0.92;
        if(p._gravity) p._vy += p._gravity;
        p._life -= p._decay;
        if(p._life <= 0) {
            p.destroy();
            particlesArray.splice(i, 1);
            continue;
        }
        p.alpha = p._life;
        p.scale.set(p._life);
    }
}


// -------- STARFIELD BACKGROUND --------
// Llena una Container con estrellas parpadeantes. Devuelve array para animar.
export function spawnStarfield(layer, width, height, density = 5500, color = 0xb4d2ff) {
    const n = Math.floor((width * height) / density);
    const stars = [];
    for(let i = 0; i < n; i++) {
        const s = new PIXI.Graphics();
        const r = 0.4 + Math.random() * 1.4;
        s.circle(0, 0, r).fill({ color, alpha: 0.6 });
        s.x = Math.random() * width;
        s.y = Math.random() * height;
        s._phase = Math.random() * Math.PI * 2;
        s._speed = 0.6 + Math.random() * 1.4;
        layer.addChild(s);
        stars.push(s);
    }
    return stars;
}

// Actualiza twinkle de estrellas en cada tick. t en segundos.
export function updateStarfield(stars, t) {
    for(const s of stars) {
        s.alpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * s._speed + s._phase));
    }
}
