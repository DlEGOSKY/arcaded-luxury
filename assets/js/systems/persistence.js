// systems/persistence.js
// Persistencia en localStorage: save, load y migration fix.
// Extraido de main.js.
//
// Contrato: recibe la instancia `app` con:
//   app.credits, app.stats, app.highScores
//   app.shop.inventory, app.shop.equipped, app.shop.load(obj)
//   app.daily, app.weekly, app.streak, app.invest, app.favorites
//   app.tournament, app.notifLog, app.agentName, app.season
//   app.audio.vol, app.settings.performance
//   app.applyTheme(themeId)
//   app.save() (para el migration fix)
//
// Nota: el save original en main.js concentraba 14 claves en una sola
// linea enorme. La version extraida lo estructura con indentacion y
// define la clave `version` para migraciones futuras.

import * as Notifications from './notifications.js';
import { applyVisualSettingsToDOM } from './settings.js';

const STORAGE_KEY  = 'arcade_save';
const SAVE_VERSION = 1;

// -------------------------------------------------------------
// SAVE: serializa el estado a localStorage
// -------------------------------------------------------------
export function save(app) {
    const payload = {
        version:     SAVE_VERSION,
        savedAt:     new Date().toISOString(),
        credits:     app.credits,
        stats:       app.stats,
        highScores:  app.highScores,
        shop: {
            inventory: app.shop.inventory,
            equipped:  app.shop.equipped,
        },
        daily:       app.daily,
        weekly:      app.weekly,
        streak:      app.streak,
        invest:      app.invest,
        favorites:   app.favorites,
        tournament:  app.tournament,
        notifLog:    app.notifLog,
        agentName:   app.agentName,
        season:      app.season,
        settings: {
            audio:        app.audio.vol,
            performance:  app.settings.performance,
            scanlines:    app.settings.scanlines,
            shake:        app.settings.shake,
            reduceMotion: app.settings.reduceMotion,
            showNotifs:   app.settings.showNotifs,
        },
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch(e) {
        console.error('Error guardando save', e);
    }
}

// -------------------------------------------------------------
// LOAD: lee el save de localStorage y lo aplica al app
// -------------------------------------------------------------
export function load(app) {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return;

    let d;
    try { d = JSON.parse(raw); }
    catch(e) { console.error('Error parseando save', e); return; }

    try {
        app.credits = d.credits || 100;
        app.stats   = d.stats   || app.stats;

        // Defaults seguros — si el save es viejo, no tumbamos el juego
        if(!app.stats.xp)            app.stats.xp            = 0;
        if(!app.stats.level)         app.stats.level         = 1;
        if(!app.stats.avatar)        app.stats.avatar        = 'fa-user-astronaut';
        if(!app.stats.passClaimed)   app.stats.passClaimed   = [];
        if(!app.stats.unlockedGames) app.stats.unlockedGames = [];

        app.highScores = d.highScores || {};

        if(d.shop) {
            app.shop.load(d.shop);
            app.applyTheme(app.shop.equipped.theme);
        }

        if(d.daily)      app.daily      = d.daily;
        if(d.weekly)     app.weekly     = d.weekly;
        if(d.streak)     app.streak     = d.streak;
        if(d.invest)     app.invest     = d.invest;
        if(d.favorites)  app.favorites  = d.favorites;
        if(d.tournament) app.tournament = d.tournament;
        if(d.notifLog)   app.notifLog   = d.notifLog;
        // Defensa: saves antiguos pueden tener agentName con caracteres HTML
        // (antes de la whitelist en editAgentName). Limpieza en carga.
        if(d.agentName)  app.agentName  = String(d.agentName).toUpperCase().replace(/[^A-Z0-9 _-]/g, '').slice(0, 16) || 'AGENTE';
        if(d.season)     app.season     = d.season;

        // Badge de notificaciones tras cargar
        setTimeout(() => Notifications.refreshBadge(app), 500);

        if(d.settings) {
            if(d.settings.audio)                      app.audio.vol             = d.settings.audio;
            if(d.settings.performance  !== undefined) app.settings.performance  = d.settings.performance;
            if(d.settings.scanlines    !== undefined) app.settings.scanlines    = d.settings.scanlines;
            if(d.settings.shake        !== undefined) app.settings.shake        = d.settings.shake;
            if(d.settings.reduceMotion !== undefined) app.settings.reduceMotion = d.settings.reduceMotion;
            if(d.settings.showNotifs   !== undefined) app.settings.showNotifs   = d.settings.showNotifs;
        }

        // Sincronizar DOM con los settings visuales cargados
        // (performance-mode, no-scanlines, reduce-motion)
        applyVisualSettingsToDOM(app);
    } catch(e) {
        console.error('Error cargando save', e);
    }
}

// -------------------------------------------------------------
// MIGRATION FIX: parches sobre saves viejos
// -------------------------------------------------------------
export function runMigrationFix(app) {
    // Si ya reclamaste el nivel 5 pero no tienes 'cyber-pong' desbloqueado...
    if(app.stats.passClaimed
       && app.stats.passClaimed.includes(5)
       && !app.stats.unlockedGames.includes('cyber-pong')) {
        console.log('MIGRATION FIX: Desbloqueando Cyber Pong automáticamente...');
        app.stats.unlockedGames.push('cyber-pong');
        app.save();
    }
    // Asegurar que unlockedGames sea siempre un array valido
    if(!Array.isArray(app.stats.unlockedGames)) {
        app.stats.unlockedGames = [];
    }
}
