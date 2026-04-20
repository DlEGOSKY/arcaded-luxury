// systems/season.js
// Temporadas mensuales: tracking de progreso + recompensa al finalizar.
// Extraido de main.js.
//
// Contrato: recibe la instancia `app` con:
//   app.season (key, name, startLevel, startXP, peakLevel, gamesPlayed, wins, endDate, history, resolved)
//   app.stats (level, xp)
//   app.credits
//   app.save()
//   app.showToast(title, msg, type)
//   app.addNotif(icon, title, body, type)

const MAX_HISTORY = 6;

// -------------------------------------------------------------
// INIT: al arrancar el app, decide si hay nueva temporada
// -------------------------------------------------------------
export function init(app) {
    const now = new Date();
    const key = `${now.getFullYear()}-${now.getMonth() + 1}`;

    if(!app.season) app.season = {};
    if(app.season.key === key) return;

    // Hay nueva temporada — resolver la anterior si existe
    if(app.season.key) resolve(app);

    app.season = {
        key,
        name:        `TEMPORADA ${now.toLocaleString('es', { month: 'long' }).toUpperCase()} ${now.getFullYear()}`,
        startLevel:  app.stats.level,
        startXP:     ((app.stats.level - 1) * 100) + (app.stats.xp || 0),
        peakLevel:   app.stats.level,
        gamesPlayed: 0,
        wins:        0,
        endDate:     new Date(now.getFullYear(), now.getMonth() + 1, 0)
                        .toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    };
    app.save();

    setTimeout(() => app.showToast('NUEVA TEMPORADA', app.season.name, 'gold'), 2000);
}

// -------------------------------------------------------------
// RESOLVE: cierra la temporada anterior con recompensa
// -------------------------------------------------------------
export function resolve(app) {
    if(!app.season || !app.season.key) return;

    const xpGained = ((app.stats.level - 1) * 100 + (app.stats.xp || 0)) - app.season.startXP;
    const reward   = Math.max(500, Math.round(xpGained * 2));
    app.credits   += reward;

    app.addNotif('🏅', 'TEMPORADA FINALIZADA',
        `${app.season.name} · +${reward.toLocaleString()} CR`, 'gold');

    app.season.resolved = true;
    if(!app.season.history) app.season.history = [];
    app.season.history.unshift({
        key:       app.season.key,
        name:      app.season.name,
        xpGained,
        reward,
        peakLevel: app.season.peakLevel,
    });
    if(app.season.history.length > MAX_HISTORY) app.season.history.pop();
}

// -------------------------------------------------------------
// UPDATE: se llama al terminar una partida
// -------------------------------------------------------------
export function updateStats(app, gameId, score) {
    if(!app.season) return;
    app.season.gamesPlayed = (app.season.gamesPlayed || 0) + 1;
    if(score > 0) app.season.wins = (app.season.wins || 0) + 1;
    if(app.stats.level > (app.season.peakLevel || 0)) app.season.peakLevel = app.stats.level;
    app.save();
}

// -------------------------------------------------------------
// RENDER PANEL (string HTML, se inserta en la daily screen)
// -------------------------------------------------------------
export function renderPanel(app) {
    if(!app.season) return '';
    const s       = app.season;
    const xpNow   = (app.stats.level - 1) * 100 + (app.stats.xp || 0);
    const xpStart = s.startXP || 0;
    const xpDiff  = xpNow - xpStart;
    const hist    = s.history || [];

    let html = '<div style="margin:0 0 6px;padding:12px 14px;background:rgba(251,191,36,0.05);border:1px solid rgba(251,191,36,0.2);border-radius:10px;">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">';
    html += `<div style="font-size:0.55rem;color:#fbbf24;font-family:monospace;letter-spacing:2px;"><i class="fa-solid fa-calendar-days"></i> ${s.name || 'TEMPORADA'}</div>`;
    html += `<div style="font-size:0.52rem;color:#334155;font-family:monospace;">hasta ${s.endDate || '?'}</div>`;
    html += '</div>';

    html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px;">';
    const statsRow = [
        { label: 'XP GANADO', val: xpDiff.toLocaleString() },
        { label: 'PARTIDAS',  val: (s.gamesPlayed || 0).toLocaleString() },
        { label: 'PICO LVL',  val: s.peakLevel || app.stats.level },
    ];
    statsRow.forEach(st => {
        html += '<div style="background:rgba(255,255,255,0.02);border-radius:7px;padding:6px 8px;text-align:center;">';
        html += `<div style="font-family:var(--font-display);font-size:0.85rem;color:#fbbf24;">${st.val}</div>`;
        html += `<div style="font-size:0.5rem;color:#334155;font-family:monospace;">${st.label}</div>`;
        html += '</div>';
    });
    html += '</div>';

    if(hist.length > 0) {
        html += '<div style="font-size:0.5rem;color:#1e293b;font-family:monospace;letter-spacing:2px;margin-bottom:4px;">TEMPORADAS ANTERIORES</div>';
        hist.slice(0, 3).forEach(h => {
            html += '<div style="display:flex;justify-content:space-between;font-size:0.56rem;font-family:monospace;color:#334155;padding:2px 0;border-top:1px solid rgba(255,255,255,0.03);">';
            html += `<span>${h.name || h.key}</span>`;
            html += `<span style="color:#fbbf24;">+${(h.reward || 0).toLocaleString()} CR</span>`;
            html += '</div>';
        });
    }
    html += '</div>';
    return html;
}
