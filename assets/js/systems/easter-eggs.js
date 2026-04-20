// systems/easter-eggs.js
// Recompensas ocultas del hub. De momento solo el codigo Konami.
//
// Contrato: recibe la instancia `app` que debe exponer:
//   app.credits
//   app.stats (konamiUsed flag)
//   app.audio (playWin)
//   app.canvas (explode)
//   app.save()
//   app.updateUI()
//   app.showToast(title, msg, type)

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

export function init(app) {
    let seq = [];
    window.addEventListener('keydown', (e) => {
        seq.push(e.key);
        if(seq.length > KONAMI_SEQUENCE.length) seq.shift();
        if(seq.join(',') === KONAMI_SEQUENCE.join(',')) {
            seq = [];
            activateKonami(app);
        }
    });
}

export function activateKonami(app) {
    app.credits += KONAMI_BONUS;
    app.save();
    app.updateUI();
    app.showToast('↑↑↓↓←→←→BA', `+${KONAMI_BONUS} CR — Código activado`, 'gold');

    try { app.audio.playWin(15); } catch(e) {}

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
