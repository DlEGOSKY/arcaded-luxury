// systems/profile-v2.js
// Modal de perfil del agente: avatar, titulo, logros, records, ranking.
// Archivo nuevo (anteriormente profile.js) para romper cache del browser.

import { CONFIG } from '../config.js';

const ACH_ICONS = {
    rich:        'fa-gem',
    pro:         'fa-medal',
    sniper:      'fa-bolt',
    firstblood:  'fa-droplet',
    millionaire: 'fa-building-columns',
    dedicated:   'fa-screwdriver-wrench',
    collector:   'fa-box-open',
    speedgod:    'fa-fire',
    legend:      'fa-crown',
};

const RANK_COLORS = {
    S: '#fbbf24',
    A: '#10b981',
    B: '#3b82f6',
    F: '#475569',
};

// -------------------------------------------------------------
// OPEN / CLOSE
// -------------------------------------------------------------
export function show(app) {
    const modal = document.getElementById('modal-profile');
    if(!modal) { console.error('modal-profile no existe en el DOM'); return; }
    modal.classList.remove('hidden');

    // Defensas: si stats esta incompleto, lo completamos con defaults
    app.stats = app.stats || {};
    app.stats.gamesPlayed   = app.stats.gamesPlayed   ?? 0;
    app.stats.level         = app.stats.level         ?? 1;
    app.stats.xp            = app.stats.xp            ?? 0;
    app.stats.avatar        = app.stats.avatar        || 'fa-user-astronaut';
    app.stats.unlockedAchs  = app.stats.unlockedAchs  || [];
    app.stats.unlockedGames = app.stats.unlockedGames || [];
    app.highScores          = app.highScores          || {};

    const safeRender = (fn, fallback = '') => {
        try { return fn(); }
        catch(e) { console.error('profile render', e); return fallback; }
    };

    const reflexBest = getReflexBest(app);
    const ctx = Object.assign(
        { credits: app.credits, bestReflex: reflexBest, highScores: app.highScores },
        app.stats,
    );

    // Contar logros con check protegido individualmente
    const unlockedCount = CONFIG.ACHIEVEMENTS.reduce((count, ach) => {
        if(typeof ach.check !== 'function') return count;
        try { return ach.check(ctx, app) ? count + 1 : count; }
        catch(e) { return count; }
    }, 0);

    modal.innerHTML = `
        <div class="profile-v2">
            ${safeRender(() => renderHeader(app))}
            ${safeRender(() => renderStats(app, unlockedCount))}
            ${safeRender(() => renderSection('AVATAR', `<div class="pv2-avatar-grid">${renderAvatars(app)}</div>`))}
            ${safeRender(() => renderSection('TÍTULO DE AGENTE', `<div class="pv2-titles-grid">${renderTitles(app)}</div>`))}
            ${safeRender(() => renderSection('LOGROS', `<div class="pv2-achievements">${renderAchievements(ctx, app)}</div>`))}
            ${safeRender(() => renderSection('RÉCORDS POR JUEGO', `<div class="pv2-records">${renderRecords(app)}</div>`))}
            ${safeRender(() => renderSection('RANKING GLOBAL', `<div class="pv2-leaderboard">${renderLeaderboard(app)}</div>`))}
            <button class="btn pv2-close-btn" onclick="window.app.closeProfile()">
                <i class="fa-solid fa-xmark"></i> CERRAR
            </button>
        </div>`;
}

export function close() {
    const modal = document.getElementById('modal-profile');
    if(modal) modal.classList.add('hidden');
}

// -------------------------------------------------------------
// SETTERS (y re-render)
// -------------------------------------------------------------
export function setAvatar(app, icon) {
    app.stats.avatar = icon;
    app.audio.playClick();
    show(app);
    app.updateUI();
    app.save();
}

export function setTitle(app, titleId) {
    app.stats.equippedTitle = app.stats.equippedTitle === titleId ? null : titleId;
    app.audio.playClick();
    show(app);
    app.updateUI();
    app.save();
}

// -------------------------------------------------------------
// ACHIEVEMENTS
// -------------------------------------------------------------
export function checkAchievements(app) {
    if(!app.stats.unlockedAchs) app.stats.unlockedAchs = [];

    const reflexBest = getReflexBest(app);
    const ctx = Object.assign(
        { credits: app.credits, bestReflex: reflexBest, highScores: app.highScores },
        app.stats,
    );

    const newlyUnlocked = [];
    CONFIG.ACHIEVEMENTS.forEach(ach => {
        if(typeof ach.check !== 'function') return;
        if(app.stats.unlockedAchs.includes(ach.id)) return;
        try {
            if(ach.check(ctx, app)) {
                app.stats.unlockedAchs.push(ach.id);
                newlyUnlocked.push(ach);
            }
        } catch(e) { /* check roto, skip */ }
    });

    if(!newlyUnlocked.length) return;
    app.save();

    newlyUnlocked.forEach((ach, i) => {
        app.addNotif(ach.icon, ach.name, ach.desc, 'gold');
        setTimeout(() => {
            showAchievementToast(ach);
            try { app.audio.playWin(8); } catch(e) {}
        }, i * 2000);
    });
}

export function showAchievementToast(ach) {
    const container = document.getElementById('toast-container');
    if(!container) return;

    const el = document.createElement('div');
    el.style.cssText =
        'background:linear-gradient(135deg,rgba(251,191,36,0.15),rgba(245,158,11,0.08));' +
        'border:1px solid rgba(251,191,36,0.5);border-left:3px solid #fbbf24;' +
        'border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px;' +
        'box-shadow:0 8px 32px rgba(0,0,0,0.5),0 0 20px rgba(251,191,36,0.15);' +
        'max-width:320px;opacity:0;transform:translateX(60px) scale(0.85);' +
        'transition:all 0.4s cubic-bezier(0.2,0,0,1.3);';

    el.innerHTML = `
        <div style="font-size:1.6rem;filter:drop-shadow(0 0 8px rgba(251,191,36,0.6));">${ach.icon}</div>
        <div style="flex:1;min-width:0;">
            <div style="font-size:0.56rem;color:#fbbf24;font-family:monospace;letter-spacing:2px;margin-bottom:2px;">LOGRO DESBLOQUEADO</div>
            <div style="font-family:var(--font-display);font-size:0.82rem;color:white;letter-spacing:1px;">${ach.name}</div>
            <div style="font-size:0.62rem;color:#94a3b8;margin-top:1px;">${ach.desc}</div>
        </div>
        <i class="fa-solid fa-trophy" style="color:#fbbf24;opacity:0.6;font-size:1.1rem;"></i>
    `;

    container.appendChild(el);
    requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'none';
    });
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateX(60px)';
        setTimeout(() => el.remove(), 400);
    }, 4500);
}

// -------------------------------------------------------------
// STREAK BADGE
// -------------------------------------------------------------
export function updateStreak(streakVal) {
    const badge = document.getElementById('ui-streak');
    if(!badge) return;
    if(streakVal > 1) {
        badge.classList.add('visible');
        const valEl = badge.querySelector('.hud-streak-val');
        if(valEl) valEl.textContent = `x${streakVal}`;
    } else {
        badge.classList.remove('visible');
    }
}

// -------------------------------------------------------------
// PARTIALS DEL MODAL
// -------------------------------------------------------------
function renderHeader(app) {
    return `
        <div class="pv2-header">
            <div class="pv2-avatar-ring">
                <i class="fa-solid ${app.stats.avatar || 'fa-user-astronaut'}"></i>
            </div>
            <div class="pv2-name" id="pv2-agent-name" onclick="window.app.editAgentName()" style="cursor:pointer;" title="Click para editar">
                ${app.agentName || 'AGENTE'}
                <i class='fa-solid fa-pen-to-square' style='font-size:0.5rem;opacity:0.4;margin-left:4px;'></i>
            </div>
            <div class="pv2-rank">${app.getRankName(app.stats.level)}</div>
        </div>`;
}

function renderStats(app, unlockedCount) {
    return `
        <div class="pv2-stats">
            <div class="pv2-stat">
                <span class="s-label">PARTIDAS</span>
                <span class="s-val">${app.stats.gamesPlayed}</span>
            </div>
            <div class="pv2-stat">
                <span class="s-label">CRÉDITOS</span>
                <span class="s-val gold">${app.credits.toLocaleString()}</span>
            </div>
            <div class="pv2-stat">
                <span class="s-label">NIVEL</span>
                <span class="s-val">${app.stats.level}</span>
            </div>
            <div class="pv2-stat">
                <span class="s-label">LOGROS</span>
                <span class="s-val">${unlockedCount}/${CONFIG.ACHIEVEMENTS.length}</span>
            </div>
        </div>`;
}

function renderSection(title, inner) {
    return `
        <div class="pv2-section">
            <div class="pv2-section-title">${title}</div>
            ${inner}
        </div>`;
}

function renderAvatars(app) {
    return (CONFIG.AVATARS || []).map(icon => `
        <div class="pv2-avatar-opt ${app.stats.avatar === icon ? 'selected' : ''}"
             onclick="window.app.setAvatar('${icon}')" title="${icon}">
            <i class="fa-solid ${icon}"></i>
        </div>`).join('');
}

function renderTitles(app) {
    if(!app.stats.unlockedAchs) app.stats.unlockedAchs = [];
    const equipped = app.stats.equippedTitle || null;

    return (CONFIG.TITLES || []).map(t => {
        const isUnlocked = app.stats.unlockedAchs.includes(t.unlock);
        const isEquipped = equipped === t.id;
        const badge = isEquipped ? 'EQUIPADO' : isUnlocked ? 'DISPONIBLE' : 'BLOQUEADO';
        const click = isUnlocked ? `window.app.setTitle('${t.id}')` : '';
        const tip   = isUnlocked ? t.desc : `Bloqueado: logro ${t.unlock}`;
        return `
            <div class="pv2-title-opt ${isUnlocked ? 'unlocked' : ''} ${isEquipped ? 'equipped' : ''}"
                 onclick="${click}" title="${tip}">
                <div class="pvt-name">${t.name}</div>
                <div class="pvt-badge">${badge}</div>
            </div>`;
    }).join('');
}

function renderAchievements(ctx, app) {
    return CONFIG.ACHIEVEMENTS.map(ach => {
        let unlocked = false;
        if(typeof ach.check === 'function') {
            try { unlocked = !!ach.check(ctx, app); } catch(e) { /* skip */ }
        }
        const iconName = ACH_ICONS[ach.id] || 'fa-star';
        return `
            <div class="pv2-ach ${unlocked ? 'unlocked' : ''}" title="${ach.desc}">
                <div class="pv2-ach-icon"><i class="fa-solid ${iconName}"></i></div>
                <small>${ach.name}</small>
            </div>`;
    }).join('');
}

function renderRecords(app) {
    const rows = CONFIG.GAMES_LIST
        .filter(g => app.highScores[g.id])
        .map(g => renderRecordRow(app, g));
    if(rows.length === 0) {
        return '<div style="color:#334155;font-size:0.78rem;padding:8px 0;">Sin récords todavía</div>';
    }
    return rows.join('');
}

function renderRecordRow(app, g) {
    const entry  = app.highScores[g.id];
    const best   = typeof entry === 'number' ? entry : (entry.best || 0);
    const hist   = typeof entry === 'object' ? (entry.history || []) : [];
    const gColor = CONFIG.COLORS[g.color] || '#64748b';
    const rank   = app.calculateRank(g.id, best);
    const color  = RANK_COLORS[rank] || '#475569';

    const sparkSVG = buildSparkline(hist, gColor);
    const histHTML = hist.length === 0
        ? '<div style="font-size:0.55rem;color:#1e293b;font-family:monospace;padding:4px 0;">Sin historial aún</div>'
        : hist.slice(0, 10).map(h =>
            `<div class="pv2-hist-item"><span>${h.date || '?'}</span><span style="color:${gColor};">${(h.score || 0).toLocaleString()}</span></div>`
          ).join('');

    return `
        <div class="pv2-record-row" onclick="(function(el){const h=el.nextElementSibling;if(h)h.classList.toggle('open');})(this)">
            <div class="pv2-rec-icon" style="background:${gColor}15;color:${gColor};">
                <i class="${g.icon}"></i>
            </div>
            <div class="pv2-rec-name">${g.name}</div>
            <div class="pv2-rec-spark">${sparkSVG}</div>
            <div style="display:flex;align-items:center;gap:5px;">
                <span style="font-family:var(--font-display);font-size:0.6rem;color:${color};">${rank}</span>
                <div class="pv2-rec-score" style="color:${gColor};">${best.toLocaleString()}</div>
                ${hist.length > 0 ? '<i class="fa-solid fa-chevron-down" style="font-size:0.5rem;color:#334155;margin-left:2px;"></i>' : ''}
            </div>
        </div>
        <div class="pv2-record-history">${histHTML}</div>`;
}

function buildSparkline(hist, gColor) {
    if(hist.length <= 1) return '';
    const pts = hist.slice(0, 8).reverse();
    const mx  = Math.max(...pts.map(x => x.score), 1);
    const W   = 52;
    const H   = 18;
    const coords = pts.map((p, i) => {
        const x = (i / (pts.length - 1)) * W;
        const y = H - (p.score / mx) * (H - 3) - 1;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const last  = pts[pts.length - 1];
    const lastX = W;
    const lastY = (H - (last.score / mx) * (H - 3) - 1).toFixed(1);
    return `<svg width="${W}" height="${H}" style="overflow:visible;flex-shrink:0;">` +
        `<polyline points="${coords}" fill="none" stroke="${gColor}" stroke-width="1.5" stroke-linejoin="round" opacity="0.7"/>` +
        `<circle cx="${lastX}" cy="${lastY}" r="2.5" fill="${gColor}"/>` +
        `</svg>`;
}

function renderLeaderboard(app) {
    const playerTotalXP = ((app.stats.level - 1) * 100) + (app.stats.xp || 0);
    const me = { name: 'TÚ', xp: playerTotalXP, isPlayer: true, color: 'var(--primary)' };
    const board = [...(CONFIG.RIVALS || []), me].sort((a, b) => b.xp - a.xp);

    return board.map((r, i) => {
        const isBeaten = !r.isPlayer && playerTotalXP >= r.xp;
        return `
            <div class="pv2-lb-row ${r.isPlayer ? 'is-player' : ''}" style="${isBeaten ? 'opacity:0.5;' : ''}">
                <div class="pv2-lb-pos" style="${r.isPlayer ? 'color:var(--primary);font-weight:bold;' : ''}">#${i + 1}</div>
                <div class="pv2-lb-name" style="color:${r.color || '#94a3b8'};">
                    ${r.isPlayer ? '<i class="fa-solid fa-user" style="font-size:0.7rem;margin-right:4px;"></i>' : ''}${r.name}
                    ${isBeaten ? ' <span style="font-size:0.5rem;color:#10b981;margin-left:4px;">SUPERADO</span>' : ''}
                </div>
                <div class="pv2-lb-xp">${r.xp.toLocaleString()} XP</div>
            </div>`;
    }).join('');
}

// -------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------
function getReflexBest(app) {
    const raw = app.highScores?.['hyper-reflex'];
    if(!raw) return 0;
    return typeof raw === 'number' ? raw : (raw.best || 0);
}
