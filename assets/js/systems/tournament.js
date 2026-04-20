// systems/tournament.js
// Torneos semanales: un juego rotativo con leaderboard y recompensa TOP 3.
// Extraido de main.js.
//
// Contrato: recibe la instancia `app` con:
//   app.tournament (week, gameId, scores, best, endDate)
//   app.stats (tournamentsPlayed, tournamentTop3)
//   app.save()
//   app.showToast(title, msg, type)
//
// Los onclick inline del panel usan `window.app.launch('game-id')`.
// `main.js` expone `launch` directamente, no requiere proxy adicional.

import { CONFIG } from '../config.js';
import { SeededRandom } from '../utils.js';

const TOURNEY_GAMES = [
    'higher-lower', 'cyber-pong', 'snake-plus', 'void-dodger', 'color-trap',
    'neon-sniper',  'word-rush',  'memory-flash', 'hyper-reflex', 'cipher-decode',
];

// -------------------------------------------------------------
// INIT: al arrancar el app, decide si es nueva semana
// -------------------------------------------------------------
export function init(app) {
    const today   = new Date();
    const weekKey = `${today.getFullYear()}-W${Math.ceil(today.getDate() / 7)}-${today.getMonth()}`;

    if(!app.tournament) app.tournament = {};
    if(app.tournament.week === weekKey) return;

    const seed   = parseInt(weekKey.replace(/\D/g, '')) || 1;
    const gameId = TOURNEY_GAMES[seed % TOURNEY_GAMES.length];
    // El RNG queda disponible si en el futuro se quiere sembrar leaderboard.
    new SeededRandom(seed);

    app.tournament = {
        week:    weekKey,
        gameId,
        scores:  app.tournament.scores || [],
        best:    0,
        endDate: getWeekEnd(),
    };
    app.save();
}

// -------------------------------------------------------------
// SUBMIT: al terminar una partida del juego activo del torneo
// -------------------------------------------------------------
export function submitScore(app, gameId, score) {
    if(!app.tournament || app.tournament.gameId !== gameId) return;
    if(score <= (app.tournament.best || 0)) return;

    app.tournament.best = score;

    if(!app.tournament.scores) app.tournament.scores = [];
    app.tournament.scores = app.tournament.scores.filter(s => !s.isPlayer);
    app.tournament.scores.push({ name: 'TÚ', score, isPlayer: true });
    app.tournament.scores.sort((a, b) => b.score - a.score);

    app.save();
    app.stats.tournamentsPlayed = (app.stats.tournamentsPlayed || 0) + 1;

    const pos = app.tournament.scores.findIndex(s => s.isPlayer) + 1;
    if(pos <= 3) {
        app.stats.tournamentTop3 = (app.stats.tournamentTop3 || 0) + 1;
        app.showToast(`TOP ${pos} EN EL TORNEO`, `Puntuación: ${score.toLocaleString()}`, 'gold');
    }
}

// -------------------------------------------------------------
// RENDER PANEL (string HTML, se inserta en la daily screen)
// -------------------------------------------------------------
export function renderPanel(app) {
    if(!app.tournament) return '';
    const t    = app.tournament;
    const game = CONFIG.GAMES_LIST.find(g => g.id === t.gameId);
    if(!game) return '';
    const color = CONFIG.COLORS[game.color] || '#3b82f6';

    const board = buildLeaderboard(t, color);
    const lbHTML = renderLeaderboardRows(board, color);
    const playerPos = board.findIndex(e => e.isPlayer) + 1;

    return '<div style="margin:0 0 6px;padding:12px 14px;background:' + color + '06;border:1px solid ' + color + '20;border-radius:10px;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
        `<div style="font-size:0.55rem;color:${color};font-family:monospace;letter-spacing:2px;"><i class="fa-solid fa-trophy"></i> TORNEO SEMANAL</div>` +
        `<div style="font-size:0.52rem;color:#334155;font-family:monospace;">hasta ${t.endDate}</div>` +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">' +
        `<div style="background:${color}15;border:1px solid ${color}30;border-radius:7px;padding:6px 10px;display:flex;align-items:center;gap:6px;cursor:pointer;" onclick="window.app.launch('${t.gameId}')">` +
        `<i class="${game.icon}" style="color:${color};"></i>` +
        '<div>' +
        `<div style="font-family:var(--font-display);font-size:0.68rem;color:${color};letter-spacing:1px;">${game.name}</div>` +
        '<div style="font-size:0.52rem;color:#334155;font-family:monospace;">JUEGO ACTIVO</div>' +
        '</div>' +
        '</div>' +
        '<div style="text-align:right;">' +
        `<div style="font-family:var(--font-display);font-size:0.9rem;color:${color};">${(t.best || 0).toLocaleString()}</div>` +
        '<div style="font-size:0.5rem;color:#334155;font-family:monospace;">TU MEJOR</div>' +
        '</div>' +
        '</div>' +
        lbHTML +
        (playerPos <= 3
            ? `<div style="margin-top:6px;text-align:center;font-size:0.55rem;color:#fbbf24;font-family:monospace;">🏆 TOP ${playerPos} — CALLCARD EXCLUSIVA AL FINAL</div>`
            : '') +
        '</div>';
}

// -------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------
function getWeekEnd() {
    const d    = new Date();
    const day  = d.getDay();
    const diff = (7 - day) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d.toLocaleDateString('es', { day: '2-digit', month: '2-digit' });
}

function buildLeaderboard(t, color) {
    const rivals = (CONFIG.RIVALS || []).slice(0, 6).map(r => ({
        name:     r.name,
        score:    Math.round(r.xp * 0.8 + Math.random() * 500),
        isPlayer: false,
        color:    r.color || '#64748b',
    }));
    const me = { name: 'TÚ', score: t.best || 0, isPlayer: true, color };
    return [...rivals, me].sort((a, b) => b.score - a.score).slice(0, 7);
}

function renderLeaderboardRows(board, color) {
    const medals = ['🥇', '🥈', '🥉'];
    return board.map((e, i) => {
        const pos  = medals[i] || `#${i + 1}`;
        const size = i < 3 ? '0.8' : '0.58';
        const fontFamily = e.isPlayer ? 'var(--font-display)' : 'monospace';
        const nameColor  = e.isPlayer ? 'white' : e.color;
        const scoreColor = e.isPlayer ? color : '#475569';
        return '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04);">' +
            `<div style="width:20px;text-align:center;font-size:${size}rem;">${pos}</div>` +
            `<div style="flex:1;font-size:0.65rem;color:${nameColor};font-family:${fontFamily};">${e.name}</div>` +
            `<div style="font-size:0.65rem;color:${scoreColor};font-family:var(--font-display);">${(e.score || 0).toLocaleString()}</div>` +
            '</div>';
    }).join('');
}
