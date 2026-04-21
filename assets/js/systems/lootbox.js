// systems/lootbox.js
// Cajas de suministros (standard + premium): animacion fullscreen, drop
// por probabilidad y payout en creditos/jackpot.
// Extraido de main.js.
//
// Contrato: recibe la instancia `app` con:
//   app.credits
//   app.shop.inventory
//   app.audio.playBuy(), playLose(), playWin(n)
//   app.canvas.explode(x, y, color)
//   app.updateUI(), app.save()
//   app.showToast(title, msg, type)
//
// La version anterior duplicaba ~60 lineas entre buyLootBox y
// openPremiumBox. Aqui se factoriza la animacion comun a un solo
// helper `_runLootAnimation`.

import { CONFIG } from '../config.js';

// -------------------------------------------------------------
// BUY: caja estandar (usa CONFIG.LOOT_BOX)
// -------------------------------------------------------------
export function buy(app) {
    const cost = app.shop.inventory.includes('up_vip') ? 400 : CONFIG.LOOT_BOX.COST;
    if(app.credits < cost) {
        app.showToast('FONDOS INSUFICIENTES', `Necesitas ${cost} CR`, 'danger');
        app.audio.playLose();
        return;
    }

    app.credits -= cost;
    app.audio.playBuy();

    const chosen = pickDrop(CONFIG.LOOT_BOX.DROPS);
    if(chosen.type === 'CREDITS' || chosen.type === 'JACKPOT') {
        app.credits += chosen.val;
    }

    const isJackpot = chosen.type === 'JACKPOT';
    const color     = chosen.color || '#fbbf24';

    runAnimation(app, {
        title:      'CAJA DE SUMINISTROS',
        boxColor:   null,
        rewardName: isJackpot ? 'JACKPOT' : chosen.name.toUpperCase(),
        rewardVal:  chosen.val,
        color,
        isJackpot,
    });
}

// -------------------------------------------------------------
// OPEN PREMIUM: cajas especiales (con config externa)
// -------------------------------------------------------------
export function openPremium(app, boxCfg) {
    const chosen = pickDrop(boxCfg.drops);
    if(chosen.type === 'CREDITS' || chosen.type === 'JACKPOT') {
        app.credits += chosen.val;
    }

    const isJackpot = chosen.type === 'JACKPOT';
    const color     = chosen.color || boxCfg.color || '#fbbf24';

    runAnimation(app, {
        title:      boxCfg.name.toUpperCase(),
        boxColor:   boxCfg.color,
        rewardName: isJackpot ? '¡JACKPOT!' : chosen.name.toUpperCase(),
        rewardVal:  chosen.val,
        color,
        isJackpot,
    });
}

// -------------------------------------------------------------
// INTERNALS
// -------------------------------------------------------------
function pickDrop(drops) {
    const total = drops.reduce((s, d) => s + d.prob, 0);
    let roll    = Math.random() * total;
    for(const d of drops) {
        roll -= d.prob;
        if(roll <= 0) return d;
    }
    return drops[drops.length - 1];
}

function runAnimation(app, opts) {
    const { title, boxColor, rewardName, rewardVal, color, isJackpot } = opts;

    const closedStyle = boxColor
        ? ` style="color:${boxColor};filter:drop-shadow(0 0 16px ${boxColor}40);"`
        : '';

    const overlay = document.createElement('div');
    overlay.id = 'lootbox-overlay';
    overlay.innerHTML = `
        <div class="lb-bg"></div>
        <div class="lb-panel">
            <div class="lb-title" id="lb-title">${title}</div>
            <div class="lb-box-wrap" id="lb-box">
                <div class="lb-box-icon" id="lb-box-icon"><i class="fa-solid fa-box lb-icon-closed"${closedStyle}></i></div>
            </div>
            <div class="lb-dots" id="lb-dots"><span></span><span></span><span></span></div>
            <div class="lb-result" id="lb-result" style="display:none;">
                <div class="lb-rarity-badge" id="lb-rarity" style="color:${color};border-color:${color}40;background:${color}15;">${rewardName}</div>
                <div class="lb-reward-icon" id="lb-reward-icon" style="color:${color};filter:drop-shadow(0 0 20px ${color});"><i class="fa-solid fa-coins"></i></div>
                <div class="lb-reward-val" id="lb-reward-val" style="color:${color};">+${rewardVal.toLocaleString()} CR</div>
                <button class="lb-close-btn" id="lb-close"><i class="fa-solid fa-check"></i> COBRAR</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    const gsap = window.gsap;
    const hasGsap = typeof gsap !== 'undefined';

    // Paso 0: animacion de entrada con GSAP (zoom + fade)
    if(hasGsap) {
        gsap.from(overlay.querySelector('.lb-panel'), {
            scale: 0.7,
            opacity: 0,
            duration: 0.45,
            ease: 'back.out(1.8)',
        });
        gsap.from('#lb-title', { y: -20, opacity: 0, duration: 0.4, delay: 0.15, ease: 'power2.out' });
        // La caja tiembla antes de abrirse
        gsap.to('#lb-box-icon', {
            rotation: -8,
            duration: 0.05,
            repeat: 9,
            yoyo: true,
            delay: 0.3,
            ease: 'none',
            transformOrigin: '50% 50%',
        });
    }

    // Paso 1: abrir la caja (800ms para darle suspense)
    setTimeout(() => {
        const box = document.getElementById('lb-box');
        if(box) {
            box.innerHTML = `<div class="lb-box-icon lb-shake" id="lb-box-icon"><i class="fa-solid fa-box-open lb-icon-open" style="color:${color};filter:drop-shadow(0 0 20px ${color});"></i></div>`;
        }
        // FX al abrir: flash + confetti + explode
        try { app.canvas?.explode(window.innerWidth / 2, window.innerHeight / 2, color); } catch(e) {}
        try {
            if(app.fx) {
                app.fx.screenFlash('rgba(255,255,255,0.15)', 0.15);
                if(isJackpot) {
                    app.fx.confettiBurst('legend');
                    setTimeout(() => app.fx.confettiSides('legend'), 200);
                } else {
                    app.fx.confettiBurst(color === '#fbbf24' ? 'gold' : 'neon');
                }
            }
        } catch(e) {}
        if(isJackpot) {
            try { app.audio.playWin(10); } catch(e) {}
            setTimeout(() => app.canvas?.explode(window.innerWidth * 0.3, window.innerHeight * 0.5, color), 400);
            setTimeout(() => app.canvas?.explode(window.innerWidth * 0.7, window.innerHeight * 0.5, color), 600);
        } else {
            try { app.audio.playWin(5); } catch(e) {}
        }
    }, 800);

    // Paso 2: mostrar resultado con secuencia escalonada GSAP
    setTimeout(() => {
        const dots   = document.getElementById('lb-dots');
        const result = document.getElementById('lb-result');
        if(dots)   dots.style.display   = 'none';
        if(result) result.style.display = 'flex';

        if(hasGsap && result) {
            // Rareza: slide desde arriba con bounce
            gsap.from('#lb-rarity', {
                y: -30,
                opacity: 0,
                scale: 0.5,
                duration: 0.5,
                ease: 'back.out(2)',
            });
            // Icono: zoom elastic
            gsap.from('#lb-reward-icon', {
                scale: 0,
                rotation: -180,
                opacity: 0,
                duration: 0.7,
                delay: 0.15,
                ease: 'elastic.out(1, 0.5)',
            });
            // Valor: slide desde abajo
            gsap.from('#lb-reward-val', {
                y: 30,
                opacity: 0,
                duration: 0.4,
                delay: 0.4,
                ease: 'power3.out',
            });
            // Boton: fade in
            gsap.from('#lb-close', {
                y: 20,
                opacity: 0,
                duration: 0.35,
                delay: 0.55,
                ease: 'power2.out',
            });
        }
    }, 1300);

    // Cerrar / cobrar
    const closeBtn = document.getElementById('lb-close');
    if(closeBtn) {
        closeBtn.onclick = () => {
            if(hasGsap) {
                gsap.to(overlay, {
                    opacity: 0,
                    duration: 0.25,
                    ease: 'power2.in',
                    onComplete: () => {
                        overlay.remove();
                        app.updateUI();
                        const sc = document.getElementById('shop-credits');
                        if(sc) sc.innerText = app.credits.toLocaleString();
                        app.save();
                    },
                });
            } else {
                overlay.style.animation = 'fadeOut 0.3s ease forwards';
                setTimeout(() => {
                    overlay.remove();
                    app.updateUI();
                    const sc = document.getElementById('shop-credits');
                    if(sc) sc.innerText = app.credits.toLocaleString();
                    app.save();
                }, 300);
            }
        };
    }
}
