// systems/ui.js
// UI glue del shell: HUD de creditos/nivel/XP/streak, grid del lobby,
// banner de recomendacion, favoritos, filtros por categoria y toasts.
// Extraido de main.js.
//
// Contrato: recibe la instancia `app` con:
//   app.credits, app.stats, app.streak, app.weekly, app.favorites
//   app.activeFilter  (se mantiene aqui; default 'ALL')
//   app.audio.playClick()
//   app.getBest(gameId), app.calculateRank(id, score)
//   app.getRankName(level), app.getReqXP(level)
//   app.daily, app.save()
//   app.startTutorial()
//   Los onclick inline delegan a window.app.launch(), .showGameInfo(),
//   .toggleFavorite(), .showToast() — main.js conserva esos proxies.

import { CONFIG } from '../config.js';

const RANK_COLORS_GRID  = { S: '#fbbf24', A: '#10b981', B: '#3b82f6', F: '#ef4444' };

const TOAST_CFG = {
    gold:    { icon: 'fa-trophy',          accent: '#fbbf24',        dur: 4000 },
    purple:  { icon: 'fa-arrow-up',        accent: '#a855f7',        dur: 3500 },
    success: { icon: 'fa-check',           accent: '#10b981',        dur: 2800 },
    danger:  { icon: 'fa-skull',           accent: '#ef4444',        dur: 3000 },
    daily:   { icon: 'fa-calendar-check',  accent: '#f97316',        dur: 3500 },
    default: { icon: 'fa-bell',            accent: 'var(--primary)', dur: 2500 },
};

// -------------------------------------------------------------
// FAVORITOS
// -------------------------------------------------------------
export function toggleFavorite(app, gameId, e) {
    if(e) e.stopPropagation();
    if(!app.favorites) app.favorites = [];
    const idx = app.favorites.indexOf(gameId);
    if(idx >= 0) app.favorites.splice(idx, 1);
    else         app.favorites.push(gameId);

    try { app.audio.playClick(); } catch(err) {}
    app.save();

    // Actualizar solo el boton (sin re-renderizar todo el grid)
    const btn = document.querySelector('.gcv2-fav[data-id="' + gameId + '"]');
    if(btn) {
        const isFav = app.favorites.includes(gameId);
        btn.style.color   = isFav ? '#fbbf24' : 'rgba(255,255,255,0.2)';
        btn.style.opacity = isFav ? '1' : '';
        btn.title         = isFav ? 'Quitar de favoritos' : 'Añadir a favoritos';
    }
}

// -------------------------------------------------------------
// FILTRO DEL LOBBY
// -------------------------------------------------------------
export function setLobbyFilter(app, cat, btn) {
    app.activeFilter = cat;
    document.querySelectorAll('.lf-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    app.audio.playClick();
    renderMenu(app);
}

export function setLobbySearch(app, query) {
    app.lobbySearch = (query || '').trim().toLowerCase();
    const clearBtn = document.getElementById('lsb-clear');
    const kbdHint  = document.querySelector('.lsb-kbd');
    if(clearBtn) clearBtn.style.opacity = app.lobbySearch ? '1' : '0';
    if(kbdHint)  kbdHint.style.opacity  = app.lobbySearch ? '0' : '';
    renderMenu(app);
}

export function clearLobbySearch(app) {
    app.lobbySearch = '';
    const input = document.getElementById('lobby-search');
    if(input) input.value = '';
    const clearBtn = document.getElementById('lsb-clear');
    const kbdHint  = document.querySelector('.lsb-kbd');
    if(clearBtn) clearBtn.style.opacity = '0';
    if(kbdHint)  kbdHint.style.opacity  = '';
    renderMenu(app);
}

// -------------------------------------------------------------
// BANNER DE RECOMENDACION EN EL LOBBY
// -------------------------------------------------------------
export function renderRecommendation(app) {
    const el = document.getElementById('lobby-recommend');
    if(!el) return;

    const scored = CONFIG.GAMES_LIST
        .filter(g => {
            const locked = g.unlockReq && !(app.stats.unlockedGames || []).includes(g.id);
            return !locked;
        })
        .map(g => ({
            g,
            best:  app.getBest(g.id),
            rank:  app.calculateRank(g.id, app.getBest(g.id)),
            color: CONFIG.COLORS[g.color] || '#3b82f6',
        }));

    // Prioridad: juegos sin record → juegos con rank F → el mas bajo
    const noRecord = scored.filter(x => x.best === 0);
    const lowRank  = scored.filter(x => x.rank === 'F' && x.best > 0);
    const pick     = noRecord.length > 0
        ? noRecord[Math.floor(Math.random() * Math.min(noRecord.length, 5))]
        : lowRank.length > 0
            ? lowRank[Math.floor(Math.random() * Math.min(lowRank.length, 5))]
            : scored.sort((a, b) => a.best - b.best)[0];

    if(!pick) { el.style.display = 'none'; return; }

    const msg       = pick.best === 0 ? 'Sin récord aún' : `Récord actual: ${pick.best.toLocaleString()} pts`;
    const dailyTask = app.daily.tasks?.find(t => t.gameId === pick.g.id && !t.done);

    el.style.display = 'block';
    el.innerHTML = `
        <div style="margin:0 0 8px;padding:10px 16px;background:rgba(10,16,30,0.7);border:1px solid ${pick.color}20;border-left:3px solid ${pick.color};border-radius:12px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:all 0.15s;"
             onmouseenter="this.style.background='rgba(10,16,30,0.95)';this.style.borderColor='${pick.color}40';"
             onmouseleave="this.style.background='rgba(10,16,30,0.7)';this.style.borderColor='${pick.color}20';"
             onclick="window.app.launch('${pick.g.id}')">
            <div style="width:36px;height:36px;border-radius:10px;background:${pick.color}12;border:1px solid ${pick.color}20;display:flex;align-items:center;justify-content:center;color:${pick.color};font-size:1rem;flex-shrink:0;">
                <i class="${pick.g.icon}"></i>
            </div>
            <div style="flex:1;min-width:0;">
                <div style="font-size:0.58rem;color:#334155;font-family:monospace;letter-spacing:2px;margin-bottom:1px;">PROTOCOLO RECOMENDADO</div>
                <div style="font-family:var(--font-display);font-size:0.8rem;color:white;letter-spacing:1px;">${pick.g.name}</div>
                <div style="font-size:0.6rem;color:#475569;margin-top:1px;">${msg}${dailyTask ? ' · <span style="color:#f97316;">Misión diaria pendiente</span>' : ''}</div>
            </div>
            <div style="font-size:0.65rem;color:${pick.color};font-family:monospace;display:flex;align-items:center;gap:5px;flex-shrink:0;">
                JUGAR <i class="fa-solid fa-play" style="font-size:0.55rem;"></i>
            </div>
        </div>`;
}

// -------------------------------------------------------------
// GRID DEL LOBBY
// -------------------------------------------------------------
export function renderMenu(app) {
    const container = document.getElementById('main-menu-grid');
    if(!container) return;
    if(!app.stats.unlockedGames) app.stats.unlockedGames = [];

    // Tutorial primera vez
    if(!app.stats.tutorialDone && app.stats.gamesPlayed === 0) {
        setTimeout(() => app.startTutorial(), 800);
    }

    // Banner de recomendacion arriba del grid
    renderRecommendation(app);

    const filter = app.activeFilter || 'ALL';
    const search = (app.lobbySearch || '').toLowerCase();

    const filtered = CONFIG.GAMES_LIST.filter(g => {
        if(!g.id || g.unlockLevel) return !search; // ocultar bloqueados en búsqueda
        const catOk = filter === 'FAVS'
            ? (app.favorites || []).includes(g.id)
            : filter === 'ALL' || g.cat === filter;
        if(!catOk) return false;
        if(!search) return true;
        return g.name.toLowerCase().includes(search)
            || (g.desc || '').toLowerCase().includes(search)
            || (g.cat || '').toLowerCase().includes(search);
    });

    container.innerHTML = filtered.map(g => renderCard(app, g)).join('');

    // Nota: no animar aquí. El cascadeIn del changeState(MENU) se encarga
    // de la entrada al lobby. Animar en cada renderMenu competía con él y
    // dejaba cards en opacity:0.

    // Actualizar contador
    const countEl = document.getElementById('lobby-count');
    if(countEl) {
        if(search) {
            countEl.textContent = `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}`;
            countEl.style.opacity = '1';
        } else {
            countEl.textContent = '';
            countEl.style.opacity = '0';
        }
    }
}

function renderCard(app, g) {
    const color      = CONFIG.COLORS[g.color] || '#fff';
    const score      = app.getBest(g.id);
    const rank       = app.calculateRank(g.id, score);
    const rankColor  = RANK_COLORS_GRID[rank] || '#475569';
    const isLocked   = g.unlockReq && !app.stats.unlockedGames.includes(g.id);

    if(isLocked) {
        return `
            <div class="game-card-v2 locked"
                 onclick="window.app.showToast('ACCESO DENEGADO','Neon Pass Nivel 5 requerido','danger')">
                <div class="gcv2-body">
                    <div class="gcv2-icon" style="color:#334155;font-size:1.8rem;">
                        <i class="fa-solid fa-lock"></i>
                    </div>
                    <div class="gcv2-name" style="color:#334155;">CLASIFICADO</div>
                    <div class="gcv2-desc">${g.name}</div>
                </div>
            </div>`;
    }

    const favs    = app.favorites || [];
    const isFav   = favs.includes(g.id);
    const favTip  = isFav ? 'Quitar de favoritos' : 'Añadir a favoritos';

    const NEW_GAMES = ['speed-tap', 'neon-maze'];
    const isNew  = NEW_GAMES.includes(g.id) && score === 0;
    const dailyTask = (app.daily?.tasks || []).find(t => t.gameId === g.id && !t.done);
    const isChallenge = app.daily?.challenge?.gameId === g.id && !app.daily?.challenge?.done;

    return `
        <div class="game-card-v2${isNew ? ' gcv2-new' : ''}" data-game-id="${g.id}" tabindex="0"
             role="button" aria-label="${g.name} · ${g.desc}"
             style="border-color:${color}25; --gc:${color};">
            ${isNew ? `<span class="gcv2-new-badge">NUEVO</span>` : ''}
            ${isChallenge ? `<span class="gcv2-challenge-badge"><i class="fa-solid fa-fire-flame-curved"></i> RETO</span>` : ''}
            <button class="gcv2-fav ${isFav ? 'active' : ''}" data-id="${g.id}"
                    onclick="event.stopPropagation(); window.app.toggleFavorite('${g.id}',event)"
                    title="${favTip}" aria-label="${favTip}">
                <i class="fa-solid fa-star"></i>
            </button>
            <button class="gcv2-info" onclick="event.stopPropagation(); window.app.showGameInfo('${g.id}')"
                    title="Info del juego" aria-label="Ver información de ${g.name}">
                <i class="fa-solid fa-info"></i>
            </button>
            <div class="gcv2-body" onclick="window.app.launch('${g.id}')">
                <div class="gcv2-icon" style="color:${color};">
                    <i class="${g.icon}"></i>
                </div>
                <div class="gcv2-name">${g.name}</div>
                <div class="gcv2-desc">${g.desc}</div>
            </div>
            <div class="gcv2-footer">
                <div class="gcv2-score">REC <span>${score > 0 ? score.toLocaleString() : '—'}</span></div>
                <div style="display:flex;gap:4px;align-items:center;">
                    ${dailyTask ? `<span style="font-size:0.5rem;color:#f97316;font-family:monospace;letter-spacing:1px;"><i class="fa-solid fa-calendar-check"></i> MISIÓN</span>` : ''}
                    <div class="gcv2-rank" style="background:${rankColor}20; color:${rankColor};">${rank}</div>
                </div>
            </div>
        </div>`;
}

// -------------------------------------------------------------
// HUD: creditos, nivel, XP bar, avatar, streak y badge semanal
// -------------------------------------------------------------
export function updateUI(app) {
    const get = id => document.getElementById(id);

    const credits    = get('menu-credits');
    const valCr      = get('val-credits');
    const lvlEl      = get('player-level');
    const rankEl     = get('player-rank');
    const xpBar      = get('xp-bar');
    const xpText     = get('xp-text');
    const navIcon    = get('profile-nav-icon');
    const statusIcon = get('status-avatar-icon');

    if(credits) credits.innerText = app.credits.toLocaleString();
    if(valCr)   valCr.innerText   = app.credits.toLocaleString();

    const lvl = app.stats.level || 1;
    const xp  = app.stats.xp    || 0;
    const req = app.getReqXP(lvl);
    const pct = Math.min(100, (xp / req) * 100);

    if(lvlEl)  lvlEl.innerText   = lvl;
    if(rankEl) rankEl.innerText  = app.getRankName(lvl).toUpperCase();
    if(xpBar)  xpBar.style.width = `${pct}%`;
    if(xpText) xpText.innerText  = `${Math.floor(xp)} / ${req} XP`;

    // Titulo equipado en status bar
    const titleEl = get('status-title');
    if(titleEl) {
        const t = CONFIG.TITLES?.find(tt => tt.id === app.stats.equippedTitle);
        titleEl.textContent   = t ? t.name : '';
        titleEl.style.display = t ? 'block' : 'none';
    }

    const avatarClass = `fa-solid ${app.stats.avatar || 'fa-user-astronaut'}`;
    if(navIcon)    navIcon.className    = avatarClass;
    if(statusIcon) statusIcon.className = avatarClass;

    // Streak badge
    const streakBar  = get('streak-bar');
    const streakDays = get('streak-days');
    if(streakBar && app.streak?.days > 1) {
        streakBar.style.display = 'flex';
        if(streakDays) streakDays.textContent = `${app.streak.days}d`;
    }

    // Badge "claimable" en el boton semanal
    const wDone  = (app.weekly?.tasks || []).filter(t => t.done).length;
    const wTotal = (app.weekly?.tasks || []).length;
    const wBtn   = get('btn-weekly');
    if(wBtn) {
        const existing = wBtn.querySelector('.nav-claimable-dot');
        const shouldShow = wDone === wTotal && wTotal > 0 && !app.weekly?.claimed;
        if(shouldShow) {
            if(!existing) {
                const dot = document.createElement('span');
                dot.className = 'nav-claimable-dot';
                dot.style.cssText = 'position:absolute;top:4px;right:4px;width:7px;height:7px;border-radius:50%;background:#a855f7;';
                wBtn.style.position = 'relative';
                wBtn.appendChild(dot);
            }
        } else if(existing) {
            existing.remove();
        }
    }

    // Badge de challenge diario pendiente en btn-daily
    const dBtn = get('btn-daily');
    if(dBtn) {
        const existingDot = dBtn.querySelector('.nav-daily-dot');
        const allDone  = (app.daily?.tasks || []).filter(t => t.done).length === (app.daily?.tasks || []).length
                      && (app.daily?.tasks || []).length > 0;
        const hasClaim = (allDone && !app.daily?.claimed) || (app.daily?.challenge?.done && !app.daily?.challengeClaimed);
        const hasStreak = (app.daily?.streak?.count || 0) > 0;
        const dotColor = hasClaim ? '#f97316' : hasStreak ? '#fbbf24' : null;
        if(dotColor) {
            if(!existingDot) {
                const dot = document.createElement('span');
                dot.className = 'nav-daily-dot';
                dot.style.cssText = `position:absolute;top:4px;right:4px;width:7px;height:7px;border-radius:50%;background:${dotColor};box-shadow:0 0 6px ${dotColor};animation:pulse-dot 1.5s ease-in-out infinite;`;
                dBtn.style.position = 'relative';
                dBtn.appendChild(dot);
            } else {
                existingDot.style.background = dotColor;
                existingDot.style.boxShadow = `0 0 6px ${dotColor}`;
            }
        } else if(existingDot) {
            existingDot.remove();
        }
    }
}

// -------------------------------------------------------------
// TOAST
// -------------------------------------------------------------
export function showToast(title, msg, type = 'default') {
    const container = document.getElementById('toast-container');
    if(!container) return;

    const c = TOAST_CFG[type] || TOAST_CFG.default;

    const el = document.createElement('div');
    el.className = `toast-v2 toast-${type}`;
    el.style.setProperty('--ta', c.accent);
    el.innerHTML = `
        <div class="tv2-icon"><i class="fa-solid ${c.icon}"></i></div>
        <div class="tv2-body">
            <div class="tv2-title">${title}</div>
            ${msg ? `<div class="tv2-msg">${msg}</div>` : ''}
        </div>
        <div class="tv2-progress"><div class="tv2-bar" style="animation-duration:${c.dur}ms;"></div></div>`;

    container.appendChild(el);

    // Forzar reflow para animar
    void el.offsetWidth;
    el.classList.add('tv2-show');

    setTimeout(() => {
        el.classList.remove('tv2-show');
        el.classList.add('tv2-hide');
        setTimeout(() => el.remove(), 400);
    }, c.dur);
}
