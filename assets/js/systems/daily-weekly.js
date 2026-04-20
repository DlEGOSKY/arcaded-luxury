// systems/daily-weekly.js
// Sistemas de misiones diarias y semanales. Extraido de main.js.
//
// Contrato: recibe la instancia `app` que debe exponer:
//   app.daily, app.weekly          (estado persistido)
//   app.stats                       (dailyCompleted, weeklyCompleted)
//   app.credits
//   app.gameClasses                 (para elegir gameIds del reset diario)
//   app.canvas                      (setMood, explode)
//   app.audio                       (playWin)
//   app.showToast(title, msg, type)
//   app.addScore(pts, cash)
//   app.gainXP(amount)
//   app.save()
//   app.renderSeasonPanel()         (panel anidado, aun vive en main.js)
//   app.renderTournamentPanel()     (idem)
//   app.renderInvestPanel()         (idem)
//
// Los onclick inline en los templates usan `window.app.launchDaily(...)`,
// `window.app.launch(...)`, `window.app.claimDaily()`, `window.app.claimWeekly()`,
// `window.app.changeState('menu')` y `window.app.audio.playClick()`. Como
// `main.js` conserva las funciones `claimDaily`, `claimWeekly`, `renderDailyScreen`,
// `renderWeeklyScreen` como proxies hacia este modulo, la API publica queda intacta.

import { CONFIG } from '../config.js';
import { SeededRandom } from '../utils.js';

const WEEKLY_MISSIONS = [
    { gameId: 'higher-lower',  target: 25,  label: 'Alcanza 25 aciertos en High/Low',     reward: 800  },
    { gameId: 'geo-net',       target: 50,  label: 'Consigue 50 puntos en Geo-Net',       reward: 1000 },
    { gameId: 'spam-click',    target: 100, label: 'Llega a 100 clics en Spam Click',     reward: 600  },
    { gameId: 'neon-sniper',   target: 15,  label: 'Noquea 15 objetivos en Neon Sniper',  reward: 700  },
    { gameId: 'color-trap',    target: 20,  label: 'Supera racha 20 en Color Trap',       reward: 900  },
    { gameId: 'cyber-typer',   target: 300, label: 'Escribe 300 pts en Cyber Typer',      reward: 850  },
    { gameId: 'glitch-hunt',   target: 10,  label: 'Atrapa 10 glitches',                  reward: 750  },
    { gameId: 'math-rush',     target: 80,  label: 'Consigue 80 pts en Math Rush',        reward: 700  },
    { gameId: 'word-rush',     target: 40,  label: 'Consigue 40 pts en Word Rush',        reward: 800  },
    { gameId: 'snake-plus',    target: 50,  label: 'Llega a 50 puntos en Snake ++',       reward: 750  },
    { gameId: 'cipher-decode', target: 60,  label: 'Descifra mensajes por 60 pts',        reward: 900  },
    { gameId: 'void-dodger',   target: 20,  label: 'Sobrevive 20 segundos en Void Dodger', reward: 850 },
];

// -------------------------------------------------------------
// RESETS
// -------------------------------------------------------------
export function checkDailyReset(app) {
    const today = new Date().toDateString();
    if(app.daily.date === today && app.daily.tasks.length > 0) return;

    app.daily.date = today;
    app.daily.claimed = false;
    app.daily.tasks = [];

    const seed    = parseInt(today.replace(/\D/g, '')) || Date.now();
    const rng     = new SeededRandom(seed);
    const gameIds = Object.keys(app.gameClasses);

    while(app.daily.tasks.length < 3) {
        const gid = gameIds[Math.floor(rng.next() * gameIds.length)];
        if(!app.daily.tasks.find(t => t.gameId === gid)) {
            app.daily.tasks.push({
                gameId: gid,
                target: CONFIG.DAILY_TARGETS[gid] || 10,
                done:   false,
            });
        }
    }
    app.save();
}

export function checkWeeklyReset(app) {
    const now    = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const weekKey = monday.toDateString();

    if(app.weekly.week === weekKey && app.weekly.tasks.length > 0) return;

    app.weekly = { week: weekKey, tasks: [], claimed: false };

    const seed     = parseInt(weekKey.replace(/\D/g, '')) || Date.now();
    const rng      = new SeededRandom(seed);
    const shuffled = [...WEEKLY_MISSIONS].sort(() => rng.next() - 0.5);

    app.weekly.tasks = shuffled.slice(0, 4).map(m => ({ ...m, done: false }));
    app.save();
}

// -------------------------------------------------------------
// RENDER DIARIO
// -------------------------------------------------------------
export function renderDailyScreen(app) {
    app.canvas.setMood('DAILY');
    const container = document.getElementById('screen-daily');
    if(!container) return;

    const done    = app.daily.tasks.filter(t => t.done).length;
    const total   = app.daily.tasks.length;
    const pct     = total > 0 ? Math.round((done / total) * 100) : 0;
    const allDone = total > 0 && done === total;
    const claimed = app.daily.claimed;

    const timeStr   = buildDailyCountdown();
    const tasksHTML = app.daily.tasks.map(task => renderDailyTask(app, task)).join('');
    const claim     = buildDailyClaim(allDone, claimed);

    container.innerHTML = `
    <div class="daily-panel-v3">
        <div class="daily-header-v3">
            <div>
                <div class="daily-title-v3"><i class="fa-solid fa-calendar-check" style="color:var(--primary);margin-right:8px;"></i>PROTOCOLO DIARIO</div>
                <div class="daily-subtitle-v3">
                    <span>${done}/${total} COMPLETADAS</span>
                    <span class="dp-sep">·</span>
                    <span><i class="fa-solid fa-clock" style="font-size:0.6rem;margin-right:3px;"></i>${timeStr}</span>
                </div>
            </div>
            <div class="daily-reward-v3">
                <div class="daily-reward-lbl">RECOMPENSA</div>
                <div class="daily-reward-val"><i class="fa-solid fa-coins"></i> 500 CR</div>
            </div>
        </div>
        <div class="daily-progress-v3">
            <div class="dp-track"><div class="dp-fill" style="width:${pct}%;"></div></div>
            <div class="dp-label">${pct}% · ${claimed ? 'COMPLETADO HOY' : 'RENUEVA A MEDIANOCHE'}</div>
        </div>
        <div class="daily-tasks-v3">${tasksHTML}</div>
        ${app.renderSeasonPanel()}
        ${app.renderTournamentPanel()}
        ${app.renderInvestPanel()}
        <div class="daily-claim-v3">
            <button class="btn btn-secondary" onclick="window.app.audio.playClick(); window.app.changeState('menu');" style="flex-shrink:0;">
                <i class="fa-solid fa-arrow-left"></i>
            </button>
            <button class="btn-claim-daily-v3 ${claim.state}" ${claim.fn}>
                ${claim.label}
            </button>
        </div>
    </div>`;
}

function buildDailyCountdown() {
    const now      = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msLeft = midnight - now;
    const hLeft  = Math.floor(msLeft / 3600000);
    const mLeft  = Math.floor((msLeft % 3600000) / 60000);
    return hLeft > 0 ? `${hLeft}h ${mLeft}m para reset` : `${mLeft}m para reset`;
}

function getTaskProgress(app, task) {
    // El progreso actual se computa desde el mejor score del dia del gameId,
    // o si el task esta hecho retorna target.
    if(task.done) return task.target;
    const hs = app.highScores?.[task.gameId];
    if(!hs) return 0;
    const best = typeof hs === 'number' ? hs : (hs.todayBest || 0);
    return Math.min(best, task.target);
}

function renderDailyTask(app, task) {
    const meta      = CONFIG.GAMES_LIST.find(g => g.id === task.gameId)
                   || { name: task.gameId, icon: 'fa-solid fa-gamepad', color: 'DEFAULT' };
    const gameColor = CONFIG.COLORS[meta.color] || '#94a3b8';
    const isDone    = task.done;
    const progress  = getTaskProgress(app, task);
    const progPct   = Math.min(100, Math.round((progress / task.target) * 100));

    return `
    <div class="daily-task-v3 ${isDone ? 'done' : ''}" style="--tc:${gameColor};"
         onclick="${isDone ? '' : `window.app.launchDaily('${task.gameId}')`}">
        <div class="dt-icon-wrap" style="background:${gameColor}12; border-color:${gameColor}20; color:${gameColor};">
            <i class="${meta.icon}"></i>
        </div>
        <div class="dt-info">
            <div class="dt-name">${meta.name}</div>
            <div class="dt-target">
                ${isDone
                    ? '<span style="color:#10b981;"><i class="fa-solid fa-check" style="font-size:0.58rem;margin-right:3px;"></i>COMPLETADA</span>'
                    : `<span style="color:${gameColor};">${progress}</span><span style="color:#475569;"> / ${task.target} puntos</span>`
                }
            </div>
            ${!isDone ? `<div class="dt-progress-bar"><div class="dt-progress-fill" style="width:${progPct}%;background:${gameColor};"></div></div>` : ''}
        </div>
        <div class="dt-status ${isDone ? 'done' : 'pending'}">
            <i class="fa-solid ${isDone ? 'fa-check' : 'fa-play'}"></i>
        </div>
    </div>`;
}

function buildDailyClaim(allDone, claimed) {
    if(claimed) {
        return { state: 'done', label: '<i class="fa-solid fa-check-double"></i> COMPLETADO', fn: '' };
    }
    if(allDone) {
        return {
            state: 'active',
            label: '<i class="fa-solid fa-gift"></i> RECLAMAR RECOMPENSA',
            fn:    'onclick="window.app.claimDaily()"',
        };
    }
    return { state: 'inactive', label: '<i class="fa-solid fa-lock"></i> COMPLETA LAS 3 MISIONES', fn: '' };
}

// -------------------------------------------------------------
// RENDER SEMANAL
// -------------------------------------------------------------
export function renderWeeklyScreen(app) {
    app.canvas.setMood('WEEKLY');
    const container = document.getElementById('screen-weekly');
    if(!container) return;

    const done    = app.weekly.tasks.filter(t => t.done).length;
    const total   = app.weekly.tasks.length;
    const pct     = total > 0 ? Math.round((done / total) * 100) : 0;
    const allDone = total > 0 && done === total;
    const claimed = app.weekly.claimed;

    const timeStr     = buildWeeklyCountdown();
    const totalReward = app.weekly.tasks.reduce((s, t) => s + t.reward, 0);
    const tasksHTML   = app.weekly.tasks.map(task => renderWeeklyTask(task, app)).join('');
    const claim       = buildWeeklyClaim(allDone, claimed, total, totalReward);

    container.innerHTML = `
    <div class="daily-panel-v3">
        <div class="daily-header-v3">
            <div>
                <div class="daily-title-v3">
                    <i class="fa-solid fa-calendar-week" style="color:#a855f7;margin-right:8px;"></i>MISIONES SEMANALES
                </div>
                <div class="daily-subtitle-v3">RENUEVA EL LUNES · ${timeStr}</div>
            </div>
            <div class="daily-reward-v3" style="background:rgba(168,85,247,0.08);border-color:rgba(168,85,247,0.25);">
                <div class="daily-reward-lbl">RECOMPENSA TOTAL</div>
                <div class="daily-reward-val" style="color:#a855f7;">
                    <i class="fa-solid fa-coins"></i> ${totalReward.toLocaleString()} CR
                </div>
            </div>
        </div>
        <div class="daily-progress-v3">
            <div class="dp-track">
                <div class="dp-fill" style="width:${pct}%;background:#a855f7;box-shadow:0 0 8px #a855f7;"></div>
            </div>
            <div class="dp-label">${pct}% · ${done}/${total} COMPLETADAS${claimed ? ' · RECOMPENSA OBTENIDA' : ''}</div>
        </div>
        <div class="daily-tasks-v3">${tasksHTML}</div>
        <div class="daily-claim-v3">
            <button class="btn btn-secondary" onclick="window.app.audio.playClick(); window.app.changeState('menu');" style="flex-shrink:0;">
                <i class="fa-solid fa-arrow-left"></i>
            </button>
            <button class="btn-claim-daily-v3 ${claim.state}" ${claim.fn}>
                ${claim.label}
            </button>
        </div>
    </div>`;
}

function buildWeeklyCountdown() {
    const now     = new Date();
    const nextMon = new Date(now);
    const offset  = (7 - ((now.getDay() + 6) % 7)) % 7 || 7;
    nextMon.setDate(now.getDate() + offset);
    nextMon.setHours(0, 0, 0, 0);

    const msLeft = nextMon - now;
    const dLeft  = Math.floor(msLeft / 86400000);
    const hLeft  = Math.floor((msLeft % 86400000) / 3600000);
    return dLeft > 0 ? `${dLeft}d ${hLeft}h` : `${hLeft}h restantes`;
}

function renderWeeklyTask(task, app) {
    const meta      = CONFIG.GAMES_LIST.find(g => g.id === task.gameId)
                   || { name: task.gameId, icon: 'fa-solid fa-gamepad', color: 'DEFAULT' };
    const gameColor = CONFIG.COLORS[meta.color] || '#94a3b8';
    const progress  = app ? getTaskProgress(app, task) : 0;
    const progPct   = Math.min(100, Math.round((progress / task.target) * 100));

    return `
    <div class="daily-task-v3 ${task.done ? 'done' : ''}" style="--tc:${gameColor};"
         onclick="${task.done ? '' : `window.app.launch('${task.gameId}')`}">
        <div class="dt-icon-wrap" style="background:${gameColor}12;border-color:${gameColor}20;color:${gameColor};">
            <i class="${meta.icon}"></i>
        </div>
        <div class="dt-info">
            <div class="dt-name">${task.label}</div>
            <div class="dt-target">
                <span style="color:${gameColor};">+${task.reward.toLocaleString()} CR</span>
                <span style="color:#475569;"> · </span>
                ${task.done
                    ? '<span style="color:#10b981"><i class="fa-solid fa-check" style="font-size:0.58rem;margin-right:3px;"></i>COMPLETADA</span>'
                    : `<span style="color:${gameColor};">${progress}</span><span style="color:#475569;"> / ${task.target} pts</span>`
                }
            </div>
            ${!task.done ? `<div class="dt-progress-bar"><div class="dt-progress-fill" style="width:${progPct}%;background:${gameColor};"></div></div>` : ''}
        </div>
        <div class="dt-status ${task.done ? 'done' : 'pending'}">
            <i class="fa-solid ${task.done ? 'fa-check' : 'fa-play'}"></i>
        </div>
    </div>`;
}

function buildWeeklyClaim(allDone, claimed, total, totalReward) {
    if(claimed) {
        return { state: 'done', label: '<i class="fa-solid fa-check-double"></i> RECOMPENSA RECLAMADA', fn: '' };
    }
    if(allDone) {
        return {
            state: 'active',
            label: `<i class="fa-solid fa-gift"></i> RECLAMAR ${totalReward.toLocaleString()} CR`,
            fn:    'onclick="window.app.claimWeekly()"',
        };
    }
    return { state: 'inactive', label: `<i class="fa-solid fa-lock"></i> COMPLETA LAS ${total} MISIONES`, fn: '' };
}

// -------------------------------------------------------------
// CLAIMS
// -------------------------------------------------------------
export function claimDaily(app) {
    if(app.daily.claimed) return;
    app.daily.claimed = true;
    app.stats.dailyCompleted = (app.stats.dailyCompleted || 0) + 1;
    app.addScore(0, 500);
    app.audio.playWin(10);
    app.showToast('¡RECOMPENSA RECLAMADA!', 'Has ganado 500 Créditos', 'gold');
    renderDailyScreen(app);
    app.save();
}

export function claimWeekly(app) {
    if(app.weekly.claimed) return;
    const done = app.weekly.tasks.filter(t => t.done).length;
    if(done < app.weekly.tasks.length) return;

    app.weekly.claimed = true;
    app.stats.weeklyCompleted = (app.stats.weeklyCompleted || 0) + 1;

    const totalReward = app.weekly.tasks.reduce((s, t) => s + t.reward, 0);
    app.credits += totalReward;

    app.audio.playWin(10);
    try { app.canvas.explode(window.innerWidth / 2, window.innerHeight / 2, '#fbbf24'); } catch(e) {}
    setTimeout(() => {
        try { app.canvas.explode(window.innerWidth * 0.3, window.innerHeight * 0.5, '#a855f7'); } catch(e) {}
    }, 300);

    app.showToast('¡MISIÓN SEMANAL COMPLETADA!', `+${totalReward.toLocaleString()} CR obtenidos`, 'gold');
    app.gainXP(200);
    renderWeeklyScreen(app);
    app.save();
}
