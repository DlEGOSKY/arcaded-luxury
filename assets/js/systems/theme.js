// systems/theme.js
// Temas visuales del shell: aplicar clase t_*, sincronizar favicon,
// cambiar el mood del canvas de fondo y registrar SFX de UI por tema.
// Extraido de main.js.
//
// Contrato: recibe la instancia `app` con:
//   app.canvas.setMood(themeId | null)
//   app._themeSFX (se setea aqui; lo lee audio al tocar click/hover)

const FAVICON_COLORS = {
    't_diablo':    '#b91c1c',
    't_xperror':   '#1560bd',
    't_starcraft': '#3b82f6',
    't_matrix':    '#00ff41',
    't_hack':      '#00ff41',
    't_synthwave': '#f72585',
    't_celeste':   '#4fc3f7',
    't_portal':    '#ff6600',
    't_terminal':  '#00ff41',
    't_gameby':    '#5da832',
    // V3
    't_dos622':    '#c0c0c0',
    't_ipod':      '#1d6fff',
    't_n64':       '#7a52a0',
};

const THEME_SFX = {
    't_gameby':   { click: { freq: 440, type: 'square',   dur: 0.04 }, hover: { freq: 330, type: 'square', dur: 0.03 } },
    't_hack':     { click: { freq: 800, type: 'square',   dur: 0.03 }, hover: { freq: 400, type: 'square', dur: 0.02 } },
    't_matrix':   { click: { freq: 800, type: 'square',   dur: 0.03 }, hover: { freq: 400, type: 'square', dur: 0.02 } },
    't_terminal': { click: { freq: 600, type: 'square',   dur: 0.03 }, hover: { freq: 300, type: 'square', dur: 0.02 } },
    't_diablo':   { click: { freq: 120, type: 'sawtooth', dur: 0.08 }, hover: { freq:  80, type: 'sine',   dur: 0.04 } },
    // V3
    't_dos622':   { click: { freq: 900, type: 'square',   dur: 0.03 }, hover: { freq: 600, type: 'square', dur: 0.02 } },   // PC speaker beep
    't_ipod':     { click: { freq: 1200,type: 'sine',     dur: 0.02 }, hover: { freq: 800, type: 'sine',   dur: 0.01 } },   // Click crisp suave
    't_n64':      { click: { freq: 540, type: 'triangle', dur: 0.05 }, hover: { freq: 380, type: 'triangle', dur: 0.03 } }, // Tono cartridge chunky
};

// -------------------------------------------------------------
// APPLY: cambiar el tema activo del body
// -------------------------------------------------------------
export function apply(app, themeId) {
    document.body.className = document.body.className.replace(/t_[a-z0-9_]+/g, '').trim();
    if(themeId && themeId !== 't_default') document.body.classList.add(themeId);

    try { if(app.canvas) app.canvas.setMood(themeId || null); } catch(e) {}
    try { updateFavicon(themeId); } catch(e) {}

    app._themeSFX = THEME_SFX[themeId] || null;
}

// -------------------------------------------------------------
// FAVICON: SVG dinamico con el color del tema activo
// -------------------------------------------------------------
export function updateFavicon(themeId) {
    const col = FAVICON_COLORS[themeId] || '#3b82f6';
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>
        <rect width='32' height='32' rx='6' fill='#040810'/>
        <text x='50%' y='58%' font-size='18' font-family='monospace' font-weight='bold'
              fill='${col}' text-anchor='middle' dominant-baseline='middle'>A</text>
    </svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    let link   = document.querySelector("link[rel~='icon']");
    if(!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }
    link.href = url;
}

// -------------------------------------------------------------
// CRITICAL: toggle de viñeta roja sobre la vignette
// -------------------------------------------------------------
export function setCritical(active) {
    const vign = document.querySelector('.vignette');
    if(!vign) return;
    if(active) vign.classList.add('critical');
    else       vign.classList.remove('critical');
}
