// systems/pass.js
// Logica del Pase de Batalla (Neon Pass). Extraida de main.js.
//
// Contrato: recibe la instancia `app` que debe exponer:
//   app.stats       (level, xp, passClaimed, unlockedGames)
//   app.shop        (inventory)
//   app.audio       (playWin)
//   app.canvas      (explode)
//   app.getReqXP(lvl)
//   app.addScore(pts, cash)
//   app.save()
//   app.showToast(title, msg, type)
//
// IMPORTANTE: los onmouseenter / onclick de las cards usan
// `window.app.showPassTooltip(...)`, `window.app.hidePassTooltip()`
// y `window.app.claimPassReward(...)`. Por eso `main.js` conserva
// esos nombres como proxies que delegan aqui.

import { CONFIG } from '../config.js';

const TYPE_LABELS = {
    CREDITS:     'Créditos',
    PARTICLE:    'Efecto FX',
    THEME:       'Tema',
    AVATAR:      'Avatar',
    HARDWARE:    'Mejora',
    GAME_UNLOCK: 'Juego',
};

const RARITY_FX = {
    common:    { glow: 'rgba(100,116,139,0.25)', ring: '#64748b', anim: 'none',                                   stars: 0 },
    rare:      { glow: 'rgba(59,130,246,0.35)',  ring: '#3b82f6', anim: 'none',                                   stars: 1 },
    epic:      { glow: 'rgba(168,85,247,0.45)',  ring: '#a855f7', anim: 'epicPulse 2s ease-in-out infinite',      stars: 2 },
    legendary: { glow: 'rgba(245,158,11,0.6)',   ring: '#f59e0b', anim: 'legendaryFlame 1.5s ease-in-out infinite', stars: 3 },
};

const RARITY_COLORS = {
    common:    '#64748b',
    rare:      '#3b82f6',
    epic:      '#a855f7',
    legendary: '#f59e0b',
};

const RARITY_LABELS = {
    common:    'COMÚN',
    rare:      'RARO',
    epic:      'ÉPICO',
    legendary: 'LEGENDARIO',
};

// -------------------------------------------------------------
// RENDER
// -------------------------------------------------------------
export function render(app) {
    if(!app.stats.passClaimed) app.stats.passClaimed = [];

    const lvl = app.stats.level || 1;
    const xp  = app.stats.xp    || 0;
    const req = app.getReqXP(lvl);
    const pct = Math.min(100, (xp / req) * 100);

    syncHeader(lvl, xp, req, pct);
    syncClaimableBadge(app, lvl);
    syncStats(app);

    const container = document.getElementById('np-track');
    if(!container) return;

    container.innerHTML = CONFIG.BATTLE_PASS.map((node, idx) =>
        renderNode(app, node, idx, lvl)
    ).join('');

    // Bind filtros (idempotente: onclick overwrite es seguro)
    document.querySelectorAll('.np-filter-btn').forEach(btn => {
        btn.onclick = () => {
            try { app.audio.playClick(); } catch(e) {}
            document.querySelectorAll('.np-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyPassFilter(container, btn.dataset.filter);
        };
    });

    // Bind jump to current
    const jumpBtn = document.getElementById('btn-pass-jump');
    if(jumpBtn) jumpBtn.onclick = () => jumpToCurrent(app, container);

    scrollToFirstClaimable(container);
}

function syncStats(app) {
    const claimed = (app.stats.passClaimed || []).length;
    const total   = CONFIG.BATTLE_PASS.length;
    const cEl = document.getElementById('np-stats-claimed');
    const tEl = document.getElementById('np-stats-total');
    if(cEl) cEl.innerText = claimed;
    if(tEl) tEl.innerText = total;
}

function applyPassFilter(container, filter) {
    const cards = container.querySelectorAll('.np-card');
    cards.forEach(card => {
        const node = card.closest('.np-node');
        if(!node) return;
        const isUnlocked  = card.classList.contains('unlocked');
        const isClaimed   = card.classList.contains('claimed');
        const isClaimable = isUnlocked && !isClaimed;

        let show = true;
        if(filter === 'claimable') show = isClaimable;
        else if(filter === 'unlocked') show = isUnlocked && !isClaimed;
        else if(filter === 'locked') show = !isUnlocked;
        else if(filter === 'claimed') show = isClaimed;

        node.style.display = show ? '' : 'none';
        // Conectores también: si el nodo anterior está oculto, el conector queda visualmente roto
    });
    // Ocultar conectores cuando ambos extremos están ocultos o uno lo está
    const nodes = Array.from(container.querySelectorAll('.np-node'));
    nodes.forEach((node, i) => {
        const connector = node.querySelector('.np-connector');
        if(connector) {
            const prevVisible = i > 0 && nodes[i-1].style.display !== 'none';
            const thisVisible = node.style.display !== 'none';
            connector.style.display = (prevVisible && thisVisible) ? '' : 'none';
        }
    });
}

function jumpToCurrent(app, container) {
    try { app.audio.playClick(); } catch(e) {}
    const lvl = app.stats.level || 1;
    // Buscar el card del nivel actual o el siguiente disponible
    const target = container.querySelector(`.np-card[data-lvl="${lvl}"]`)
                || container.querySelector('.np-card.unlocked:not(.claimed)')
                || container.querySelector('.np-card:not(.unlocked)');
    if(target) {
        const node = target.closest('.np-node');
        if(node && node.style.display !== 'none') {
            node.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            target.classList.add('np-pulse');
            setTimeout(() => target.classList.remove('np-pulse'), 1600);
        }
    }
}

function syncHeader(lvl, xp, req, pct) {
    const lvlEl  = document.getElementById('np-level');
    const fillEl = document.getElementById('np-xp-fill');
    const glowEl = document.getElementById('np-xp-glow');
    const textEl = document.getElementById('np-xp-text');
    if(lvlEl)  lvlEl.innerText    = lvl;
    if(fillEl) fillEl.style.width = `${pct}%`;
    if(glowEl) glowEl.style.width = `${pct}%`;
    if(textEl) textEl.innerText   = `${Math.floor(xp)} / ${req} XP`;
}

function syncClaimableBadge(app, lvl) {
    const claimable = CONFIG.BATTLE_PASS.filter(
        n => lvl >= n.lvl && !app.stats.passClaimed.includes(n.lvl)
    ).length;
    const badge   = document.getElementById('np-claimable-badge');
    const countEl = document.getElementById('np-claimable-count');
    if(badge)   badge.classList.toggle('visible', claimable > 0);
    if(countEl) countEl.innerText = claimable;
}

function renderNode(app, node, idx, lvl) {
    const isUnlocked = lvl >= node.lvl;
    const isClaimed  = app.stats.passClaimed.includes(node.lvl);
    const rarity     = node.rarity || 'common';
    const fx         = RARITY_FX[rarity] || RARITY_FX.common;

    let html = '';
    if(idx > 0) {
        const prevUnlocked = lvl >= CONFIG.BATTLE_PASS[idx - 1].lvl;
        html += `<div class="np-connector ${prevUnlocked ? 'active' : ''}"></div>`;
    }

    const starsHTML = fx.stars > 0
        ? `<div class="np-stars">${'<i class="fa-solid fa-star np-star"></i>'.repeat(fx.stars)}</div>`
        : '';

    const orbitsHTML = rarity === 'legendary' && isUnlocked && !isClaimed
        ? `<div class="np-orbit-ring"></div><div class="np-orbit-dot"></div>`
        : '';

    let action = '';
    if(isUnlocked && !isClaimed) {
        action = `<button class="np-btn-claim rarity-${rarity}" onclick="event.stopPropagation(); window.app.claimPassReward(${node.lvl})">
            <i class="fa-solid fa-gift"></i> RECLAMAR
        </button>`;
    } else if(!isUnlocked) {
        action = `<div class="np-lock-badge"><i class="fa-solid fa-lock"></i> ${node.lvl}</div>`;
    } else {
        action = `<div class="np-claimed-check"><i class="fa-solid fa-check"></i></div>`;
    }

    const iconClass = node.icon.includes(' ') ? node.icon : 'fa-solid ' + node.icon;
    const cardStyle = isUnlocked && !isClaimed
        ? `--rarity-glow:${fx.glow}; --rarity-ring:${fx.ring}; animation:${fx.anim};`
        : `--rarity-glow:${fx.glow}; --rarity-ring:${fx.ring};`;

    html += `
    <div class="np-node">
        <div class="np-card rarity-${rarity} ${isUnlocked ? 'unlocked' : ''} ${isClaimed ? 'claimed' : ''}"
             style="${cardStyle} animation-delay:${idx * 40}ms;"
             data-lvl="${node.lvl}" data-rarity="${rarity}"
             data-name="${node.name}" data-type="${TYPE_LABELS[node.type] || node.type}"
             data-desc="${node.desc || ''}"
             onmouseenter="window.app.showPassTooltip(event,this)"
             onmouseleave="window.app.hidePassTooltip()">
            <div class="np-level-badge">LVL ${node.lvl}</div>
            ${orbitsHTML}
            ${starsHTML}
            <div class="np-reward-icon ${rarity === 'legendary' && isUnlocked && !isClaimed ? 'np-icon-glow' : ''}">
                <i class="${iconClass}"></i>
            </div>
            <div class="np-reward-name">${node.name}</div>
            <div class="np-type-badge">${TYPE_LABELS[node.type] || node.type}</div>
            ${action}
        </div>
    </div>`;
    return html;
}

function scrollToFirstClaimable(container) {
    setTimeout(() => {
        const firstClaim = container.querySelector('.unlocked:not(.claimed) .np-btn-claim');
        const target = firstClaim
            ? firstClaim.closest('.np-node')
            : container.querySelector('.np-card:not(.unlocked)');
        if(target) target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 250);
}

// -------------------------------------------------------------
// TOOLTIP
// -------------------------------------------------------------
export function showTooltip(event, card) {
    const tt = document.getElementById('np-tooltip');
    if(!tt) return;
    const rarity = card.dataset.rarity;

    tt.querySelector('#np-tt-rarity').style.color = RARITY_COLORS[rarity] || '#fff';
    tt.querySelector('#np-tt-rarity').innerText   = RARITY_LABELS[rarity] || rarity.toUpperCase();
    tt.querySelector('#np-tt-name').innerText     = card.dataset.name;
    tt.querySelector('#np-tt-type').innerText     = card.dataset.type;
    tt.querySelector('#np-tt-desc').innerText     = card.dataset.desc;
    tt.style.borderColor = (RARITY_COLORS[rarity] || '#fff') + '40';

    const rect = card.getBoundingClientRect();
    tt.style.left = `${rect.left + rect.width / 2 - 90}px`;
    tt.style.top  = `${rect.top - 110}px`;
    tt.classList.add('visible');
}

export function hideTooltip() {
    const tt = document.getElementById('np-tooltip');
    if(tt) tt.classList.remove('visible');
}

// -------------------------------------------------------------
// CLAIM
// -------------------------------------------------------------
export function claim(app, lvl) {
    const reward = CONFIG.BATTLE_PASS.find(n => n.lvl === lvl);
    if(!reward) return;
    if(!app.stats.passClaimed) app.stats.passClaimed = [];
    if(app.stats.passClaimed.includes(lvl)) return;

    // Capturar el card antes de re-render para la animacion FX
    const cardEl = document.querySelector(`.np-card[data-lvl="${lvl}"]`);

    app.stats.passClaimed.push(lvl);

    grantReward(app, reward);
    playClaimEffects(app, reward);

    // FX: secuencia epica con GSAP + confetti del color de rareza
    if(cardEl && app.fx) {
        try { app.fx.rewardClaim(cardEl, reward.rarity || 'common'); } catch(e) {}
    }

    const label = RARITY_LABELS[reward.rarity] || '';
    app.showToast(`[${label}] ${reward.name}`, reward.desc || '', 'purple');

    app.save();
    // Pequeño delay para que se vea la animacion del card antes del re-render
    setTimeout(() => render(app), 450);
}

function grantReward(app, reward) {
    if(reward.type === 'CREDITS') {
        app.addScore(0, reward.val);
        return;
    }
    if(['THEME', 'PARTICLE', 'AVATAR', 'HARDWARE'].includes(reward.type)) {
        if(!app.shop.inventory.includes(reward.val)) app.shop.inventory.push(reward.val);
        return;
    }
    if(reward.type === 'GAME_UNLOCK') {
        if(!app.stats.unlockedGames) app.stats.unlockedGames = [];
        if(!app.stats.unlockedGames.includes(reward.val)) {
            app.stats.unlockedGames.push(reward.val);
            app.showToast('¡JUEGO DESBLOQUEADO!', 'Cyber Pong disponible', 'gold');
        }
    }
}

function playClaimEffects(app, reward) {
    const color = RARITY_COLORS[reward.rarity] || '#d946ef';
    const cx = window.innerWidth  / 2;
    const cy = window.innerHeight / 2;

    if(reward.rarity === 'legendary') {
        app.audio.playWin(10);
        setTimeout(() => app.canvas.explode(window.innerWidth * 0.3, window.innerHeight * 0.5, color),     0);
        setTimeout(() => app.canvas.explode(window.innerWidth * 0.5, window.innerHeight * 0.3, '#ffffff'), 150);
        setTimeout(() => app.canvas.explode(window.innerWidth * 0.7, window.innerHeight * 0.5, color),     300);
    } else if(reward.rarity === 'epic') {
        app.audio.playWin(7);
        app.canvas.explode(cx, cy, color);
    } else {
        app.audio.playWin(3);
        app.canvas.explode(cx, cy, color);
    }
}
