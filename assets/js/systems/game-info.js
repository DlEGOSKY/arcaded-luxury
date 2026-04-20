// systems/game-info.js
// Modal tactico de informacion de un juego: preview del objetivo,
// mecanica, rank/record actual y lanzadores Jugar / VS.
// Extraido de main.js.
//
// Contrato: recibe la instancia `app` con:
//   app.audio.playClick()
//   app.getBest(gameId)
//   app.calculateRank(gameId, score)
//   app.highScores
//
// BUG FIX aplicado: el showGameInfo original empezaba con
// `if(window.event) window.event.stopPropagation();` — usa la API
// global deprecada `window.event`. El unico call site (el boton .gcv2-info
// del lobby) ya llama `event.stopPropagation()` antes de invocar esta
// funcion, asi que la linea era redundante. La version extraida la elimina.

import { CONFIG } from '../config.js';

const RANK_COLORS = {
    S: '#fbbf24',
    A: '#10b981',
    B: '#3b82f6',
    F: '#475569',
};

const DIFF_ICONS = {
    Timing:        'fa-stopwatch',
    Reflejos:      'fa-bolt',
    Memoria:       'fa-brain',
    Precisión:     'fa-crosshairs',
    Mental:        'fa-brain',
    Cognitivo:     'fa-puzzle-piece',
    Conocimiento:  'fa-graduation-cap',
    Estándar:      'fa-gamepad',
};

// -------------------------------------------------------------
// SHOW: abrir el modal-info con la data del juego
// -------------------------------------------------------------
export function show(app, gameId) {
    app.audio.playClick();

    const info = CONFIG.GAME_INFO[gameId];
    const meta = CONFIG.GAMES_LIST.find(g => g.id === gameId);
    if(!info || !meta) return;

    const color     = CONFIG.COLORS[meta.color] || '#3b82f6';
    const score     = app.getBest(gameId);
    const rank      = app.calculateRank(gameId, score);
    const rankColor = RANK_COLORS[rank] || '#475569';
    const diffIcon  = `fa-solid ${DIFF_ICONS[info.diff] || 'fa-gamepad'}`;
    const played    = Object.keys(app.highScores).includes(gameId);

    const modal   = document.getElementById('modal-info');
    const content = document.getElementById('info-content');
    if(!modal || !content) return;

    content.innerHTML = `
        <div class="gi-root">
            <!-- Fondo con color del juego -->
            <div class="gi-bg" style="--gc:${color};"></div>

            <!-- Header del juego -->
            <div class="gi-header">
                <div class="gi-icon-ring" style="--gc:${color};">
                    <i class="${meta.icon}"></i>
                </div>
                <div class="gi-title-block">
                    <div class="gi-game-name">${meta.name.toUpperCase()}</div>
                    <div class="gi-game-sub" style="color:${color};">${meta.desc}</div>
                </div>
                <div class="gi-rank-display" style="--rc:${rankColor};">
                    <div class="gi-rank-letter">${rank}</div>
                    <div class="gi-rank-label">RÉCORD</div>
                    <div class="gi-rank-score">${score > 0 ? score : '—'}</div>
                </div>
            </div>

            <!-- Divisor -->
            <div class="gi-divider" style="background:linear-gradient(90deg,${color}40,${color}10,transparent);"></div>

            <!-- Info cards -->
            <div class="gi-cards">
                <div class="gi-card">
                    <div class="gi-card-lbl"><i class="fa-solid fa-crosshairs"></i> OBJETIVO</div>
                    <div class="gi-card-val">${info.desc}</div>
                </div>
                <div class="gi-card">
                    <div class="gi-card-lbl"><i class="fa-solid fa-microchip"></i> MECÁNICA</div>
                    <div class="gi-card-val">${info.mech}</div>
                </div>
                <div class="gi-card gi-card-highlight" style="border-color:${color}30; background:${color}08;">
                    <div class="gi-card-lbl" style="color:${color};"><i class="fa-solid fa-trophy"></i> CONDICIÓN DE VICTORIA</div>
                    <div class="gi-card-val" style="color:white; font-weight:600;">${info.obj}</div>
                </div>
            </div>

            <!-- Stat pills -->
            <div class="gi-pills">
                <div class="gi-pill">
                    <i class="${diffIcon}" style="color:${color};"></i>
                    <span>${info.diff || 'Estándar'}</span>
                </div>
                <div class="gi-pill">
                    <i class="fa-solid fa-bolt" style="color:#fbbf24;"></i>
                    <span>XP ALTO</span>
                </div>
                <div class="gi-pill">
                    <i class="fa-solid fa-gamepad" style="color:#a855f7;"></i>
                    <span>${played ? 'JUGADO' : 'SIN JUGAR'}</span>
                </div>
            </div>

            <!-- Botones -->
            <div style="display:flex;gap:8px;">
                <button class="gi-play-btn" style="--gc:${color};flex:1;"
                        onclick="document.getElementById('modal-info').classList.add('hidden'); window.app.launch('${gameId}');">
                    <i class="fa-solid fa-play"></i>
                    JUGAR
                </button>
                <button style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.35);color:#f87171;
                        border-radius:12px;padding:12px 18px;font-family:var(--font-display);font-size:0.72rem;
                        letter-spacing:2px;cursor:pointer;transition:all 0.15s;flex-shrink:0;"
                        onmouseenter="this.style.background='rgba(239,68,68,0.22)'"
                        onmouseleave="this.style.background='rgba(239,68,68,0.1)'"
                        onclick="document.getElementById('modal-info').classList.add('hidden'); window.app.startVsMode('${gameId}');">
                    <i class="fa-solid fa-users"></i> VS
                </button>
            </div>
        </div>`;

    modal.classList.remove('hidden');
}
