// systems/easter-eggs.js
// Recompensas ocultas del hub. Konami + secuencias de texto magicas.
//
// Contrato: recibe la instancia `app` que debe exponer:
//   app.credits, app.stats, app.audio, app.canvas, app.fx
//   app.save(), app.updateUI(), app.showToast(title, msg, type)
//   app.applyTheme(themeId), app.shop.inventory

const KONAMI_SEQUENCE = [
    'ArrowUp', 'ArrowUp',
    'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight',
    'ArrowLeft', 'ArrowRight',
    'b', 'a',
];

const KONAMI_BONUS = 3000;

const CELEBRATION_COLORS = [
    '#ef4444', '#f97316', '#fbbf24',
    '#10b981', '#3b82f6', '#a855f7', '#ec4899',
];

// Secuencias de texto que se escriben con el teclado y disparan reacciones
const TEXT_EGGS = {
    'matrix':   { fn: 'matrix',   desc: 'Bienvenido al desierto de lo real' },
    'doom':     { fn: 'doom',     desc: 'Rip and tear'                       },
    'neo':      { fn: 'matrix',   desc: 'He is the one'                      },
    'jackpot':  { fn: 'jackpot',  desc: 'Por probarlo'                        },
    'cheat':    { fn: 'cheat',    desc: '+500 creditos para probar'           },
    'party':    { fn: 'party',    desc: 'Party mode activado'                 },
    'hello':    { fn: 'hello',    desc: 'Hola agente'                         },
    'arcade':   { fn: 'arcade',   desc: 'Rubicon arcade'                      },
    'iddqd':    { fn: 'iddqd',    desc: 'God mode cheat'                      },
    'portal':   { fn: 'portal',   desc: 'Aperture science'                    },
};

// -------------------------------------------------------------
// INIT
// -------------------------------------------------------------
export function init(app) {
    let konamiSeq = [];
    let textBuf = '';
    let textBufTimer = null;

    window.addEventListener('keydown', (e) => {
        // Ignorar si escribiendo en input
        const tag = e.target?.tagName;
        if(tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;

        // Konami
        konamiSeq.push(e.key);
        if(konamiSeq.length > KONAMI_SEQUENCE.length) konamiSeq.shift();
        if(konamiSeq.join(',') === KONAMI_SEQUENCE.join(',')) {
            konamiSeq = [];
            activateKonami(app);
            return;
        }

        // Text eggs: solo teclas alfabeticas
        const k = e.key.toLowerCase();
        if(k.length === 1 && k >= 'a' && k <= 'z') {
            textBuf += k;
            if(textBuf.length > 20) textBuf = textBuf.slice(-20);

            // Buffer se resetea tras 1.5s sin tipear
            if(textBufTimer) clearTimeout(textBufTimer);
            textBufTimer = setTimeout(() => { textBuf = ''; }, 1500);

            // Check match contra todos los eggs
            for(const word of Object.keys(TEXT_EGGS)) {
                if(textBuf.endsWith(word)) {
                    triggerTextEgg(app, word);
                    textBuf = '';
                    return;
                }
            }
        }
    });
}

// -------------------------------------------------------------
// KONAMI
// -------------------------------------------------------------
export function activateKonami(app) {
    app.credits += KONAMI_BONUS;
    app.save();
    app.updateUI();
    app.showToast('\u2191\u2191\u2193\u2193\u2190\u2192\u2190\u2192BA', `+${KONAMI_BONUS} CR — Código activado`, 'gold');

    try { app.audio.playWin(15); } catch(e) {}
    try { app.fx?.confettiBurst?.('legend'); } catch(e) {}
    try { app.fx?.confettiSides?.('legend'); } catch(e) {}

    try {
        for(let i = 0; i < 5; i++) {
            setTimeout(() => app.canvas.explode(
                Math.random() * window.innerWidth,
                Math.random() * window.innerHeight,
                CELEBRATION_COLORS[Math.floor(Math.random() * CELEBRATION_COLORS.length)],
            ), i * 150);
        }
    } catch(e) {}

    if(!app.stats.konamiUsed) {
        app.stats.konamiUsed = true;
        app.showToast('CÓDIGO KONAMI', '¡El clásico de los clásicos!', 'purple');
    }
}

// -------------------------------------------------------------
// TEXT EGGS
// -------------------------------------------------------------
function triggerTextEgg(app, word) {
    const def = TEXT_EGGS[word];
    if(!def) return;

    // Evitar spam: cooldown por egg de 10s
    app._eggCooldown = app._eggCooldown || {};
    const now = Date.now();
    if(app._eggCooldown[word] && now - app._eggCooldown[word] < 10000) return;
    app._eggCooldown[word] = now;

    const fns = {
        matrix: () => {
            app.applyTheme('t_matrix');
            app.showToast('THE MATRIX HAS YOU', def.desc, 'success');
            try { app.audio.playWin(5); } catch(e) {}
            try { app.fx?.confettiBurst?.('neon'); } catch(e) {}
        },
        doom:   () => {
            app.applyTheme('t_doom');
            app.showToast('\u270E DOOM ACTIVADO', def.desc, 'danger');
            try { app.audio.playWin(8); } catch(e) {}
            try { app.fx?.confettiBurst?.('epic'); } catch(e) {}
        },
        jackpot: () => {
            const bonus = Math.floor(Math.random() * 1500) + 500;
            app.credits += bonus;
            app.save();
            app.updateUI();
            app.showToast('JACKPOT', `+${bonus} CR — ${def.desc}`, 'gold');
            try { app.audio.playWin(10); } catch(e) {}
            try { app.fx?.confettiBurst?.('legend'); } catch(e) {}
        },
        cheat:  () => {
            app.credits += 500;
            app.save();
            app.updateUI();
            app.showToast('CHEAT CODE', def.desc, 'success');
            try { app.audio.playWin(4); } catch(e) {}
        },
        party:  () => {
            app.showToast('PARTY MODE', def.desc, 'purple');
            try {
                ['neon','epic','legend','victory','gold'].forEach((preset, i) => {
                    setTimeout(() => app.fx?.confetti?.(preset, { particleCount: 60 }), i * 180);
                });
                app.audio?.playWin?.(8);
            } catch(e) {}
        },
        hello:  () => {
            app.showToast(`HOLA ${(app.agentName || 'AGENTE').toUpperCase()}`, def.desc, 'default');
            try { app.audio.playClick(); } catch(e) {}
            try { app.fx?.pulse?.(document.querySelector('.main-nav-brand'), 'rgba(59,130,246,0.6)'); } catch(e) {}
        },
        arcade: () => {
            app.applyTheme('t_retro');
            app.showToast('ARCADE MODE', def.desc, 'gold');
            try { app.audio.playWin(6); } catch(e) {}
            try { app.fx?.confettiBurst?.('gold'); } catch(e) {}
        },
        iddqd:  () => {
            app.credits += 9999;
            app.save();
            app.updateUI();
            app.showToast('IDDQD', 'Degreelessness mode on', 'danger');
            try { app.audio.playWin(10); } catch(e) {}
            try { app.fx?.screenFlash?.('rgba(255,0,0,0.25)', 0.3); } catch(e) {}
        },
        portal: () => {
            app.applyTheme('t_portal');
            app.showToast('APERTURE SCIENCE', def.desc, 'success');
            try { app.audio.playWin(7); } catch(e) {}
            try { app.fx?.confettiBurst?.('neon'); } catch(e) {}
        },
    };

    const handler = fns[def.fn];
    if(handler) handler();

    // Tracker de eggs encontrados
    app.stats.eggsFound = app.stats.eggsFound || [];
    if(!app.stats.eggsFound.includes(word)) {
        app.stats.eggsFound.push(word);
        app.save();
        setTimeout(() => {
            app.showToast('SECRETO ENCONTRADO',
                `${app.stats.eggsFound.length} / ${Object.keys(TEXT_EGGS).length} easter eggs descubiertos`,
                'purple');
        }, 1200);
    }
}

