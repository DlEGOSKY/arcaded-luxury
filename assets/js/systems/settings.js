// systems/settings.js
// UI del modal de Settings. Extraido de main.js para bajar el tamano
// del god-object y aislar la plomeria del modal.
//
// Contrato: recibe la instancia `app` que debe exponer:
//   app.audio   (vol, setVolume, playClick, playHover)
//   app.settings (performance, scanlines, shake, reduceMotion, showNotifs)
//   app.stats   (gamesPlayed, level)
//   app.shop    (inventory, equipped.theme)
//   app.save()  (persistencia)

import { CONFIG } from '../config.js';

export function initSettingsUI(app) {
    const safeBind = (id, fn) => {
        const el = document.getElementById(id);
        if(el) el.onclick = fn;
    };

    safeBind('btn-settings',       () => openSettingsModal(app));
    safeBind('btn-close-settings', () => closeSettingsModal(app));
    safeBind('btn-reset-data',     () => showResetConfirm());
    safeBind('btn-fullscreen',     () => toggleFullscreen(app));
    safeBind('btn-export-save',    () => exportSave(app));
    safeBind('btn-import-save',    () => document.getElementById('import-save-input')?.click());

    const importInput = document.getElementById('import-save-input');
    if(importInput) importInput.onchange = (e) => importSave(app, e.target.files[0]);

    bindAudioSliders(app);
    bindVisualToggles(app);

    // Sincronizar label de fullscreen cuando cambia
    document.addEventListener('fullscreenchange', () => updateFullscreenLabel());

    // Aplicar ajustes visuales guardados al DOM tras inicializar
    applyVisualSettingsToDOM(app);
}

function updateFullscreenLabel() {
    const label = document.getElementById('fullscreen-label');
    if(!label) return;
    label.textContent = document.fullscreenElement ? 'SALIR' : 'ACTIVAR';
    const btn = document.getElementById('btn-fullscreen');
    if(btn) {
        const icon = btn.querySelector('i');
        if(icon) icon.className = document.fullscreenElement ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
    }
}

function toggleFullscreen(app) {
    app.audio.playClick();
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(err => {
            app.showToast?.('FULLSCREEN', 'Tu navegador lo bloqueó', 'danger');
            console.error(err);
        });
    } else {
        document.exitFullscreen?.();
    }
}

function exportSave(app) {
    app.audio.playClick();
    const raw = localStorage.getItem('arcade_save');
    if(!raw) {
        app.showToast?.('SIN DATOS', 'No hay save para exportar', 'danger');
        return;
    }
    try {
        const payload = {
            version: 1,
            exported: new Date().toISOString(),
            app: 'arcaded-luxury',
            save: JSON.parse(raw),
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url;
        a.download = `arcaded-luxury-save-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        app.showToast?.('SAVE EXPORTADA', 'Archivo JSON descargado', 'success');
    } catch(e) {
        console.error('exportSave', e);
        app.showToast?.('ERROR', 'No se pudo exportar', 'danger');
    }
}

function importSave(app, file) {
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);
            const save = data.save || data; // tolerante: archivo completo o solo payload
            if(typeof save !== 'object') throw new Error('Estructura inválida');
            // Confirmación antes de sobreescribir
            showImportConfirm(app, save);
        } catch(e) {
            console.error('importSave', e);
            app.showToast?.('ARCHIVO INVÁLIDO', 'El JSON no es un save de Arcaded Luxury', 'danger');
        }
    };
    reader.onerror = () => app.showToast?.('ERROR', 'No se pudo leer el archivo', 'danger');
    reader.readAsText(file);
}

function showImportConfirm(app, save) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML =
        '<div style="background:#0a0e1a;border:1px solid rgba(59,130,246,0.4);border-radius:14px;padding:28px 32px;text-align:center;max-width:320px;">' +
        '<i class="fa-solid fa-triangle-exclamation" style="font-size:1.8rem;color:#fbbf24;margin-bottom:10px;"></i>' +
        '<div style="font-family:var(--font-display);font-size:0.85rem;color:white;letter-spacing:2px;margin-bottom:8px;">IMPORTAR SAVE</div>' +
        '<div style="font-size:0.65rem;color:#64748b;margin-bottom:20px;">Tu save actual será <b style="color:#ef4444;">sobreescrita</b>. Esta acción no se puede deshacer.</div>' +
        '<div style="display:flex;gap:8px;">' +
        '<button id="imp-cancel" style="flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#64748b;border-radius:8px;padding:9px;font-family:var(--font-display);font-size:0.65rem;cursor:pointer;">CANCELAR</button>' +
        '<button id="imp-confirm" style="flex:1;background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.4);color:var(--primary);border-radius:8px;padding:9px;font-family:var(--font-display);font-size:0.65rem;cursor:pointer;">IMPORTAR</button>' +
        '</div></div>';
    document.body.appendChild(modal);
    modal.querySelector('#imp-cancel').onclick = () => modal.remove();
    modal.querySelector('#imp-confirm').onclick = () => {
        localStorage.setItem('arcade_save', JSON.stringify(save));
        modal.remove();
        location.reload();
    };
}

// -------------------------------------------------------------
// APPLY TO DOM: sincroniza body classes con app.settings.
// Se llama al init (arriba) y desde persistence.js tras cargar save.
// -------------------------------------------------------------
export function applyVisualSettingsToDOM(app) {
    const s = app.settings || {};
    document.body.classList.toggle('performance-mode', !!s.performance);
    document.body.classList.toggle('reduce-motion',    !!s.reduceMotion);
    // scanlines apagadas via clase en body (no inline style — asi no la pisan los temas)
    document.body.classList.toggle('no-scanlines',     s.scanlines === false);
}

function bindAudioSliders(app) {
    const bind = (id, type, labelId) => {
        const el = document.getElementById(id);
        if(!el) return;
        el.oninput = (e) => {
            const val = e.target.value;
            const label = document.getElementById(labelId);
            if(label) label.innerText = val + '%';
            app.audio.setVolume(type, val);
        };
        el.onchange = () => app.audio.playHover();
    };
    bind('rng-master', 'master', 'val-master');
    bind('rng-sfx',    'sfx',    'val-sfx');
    bind('rng-music',  'music',  'val-music');
}

function bindVisualToggles(app) {
    const bind = (id, handler) => {
        const el = document.getElementById(id);
        if(!el) return;
        el.onchange = (e) => { handler(e); app.audio.playClick(); };
    };

    // chk-performance: ahora honrado de verdad — aplica body.performance-mode
    // que desactiva animaciones idle, text-shadow global y backdrop-filters.
    bind('chk-performance', (e) => {
        app.settings.performance = e.target.checked;
        document.body.classList.toggle('performance-mode', e.target.checked);
    });

    // chk-scanlines: usa clase en body (no inline style — asi los temas con
    // `body.t_* .scanlines { display:none }` no lo pisan).
    bind('chk-scanlines', (e) => {
        app.settings.scanlines = e.target.checked;
        document.body.classList.toggle('no-scanlines', !e.target.checked);
    });

    bind('chk-shake', (e) => { app.settings.shake = e.target.checked; });

    bind('chk-countdown', (e) => { app.settings.countdown = e.target.checked; });

    bind('chk-reduce-motion', (e) => {
        app.settings.reduceMotion = e.target.checked;
        document.body.classList.toggle('reduce-motion', e.target.checked);
    });
}

function openSettingsModal(app) {
    app.audio.playClick();
    const modal = document.getElementById('modal-settings');
    if(!modal) return;
    modal.classList.remove('hidden');

    syncAudioSliders(app);
    syncVisualToggles(app);
    syncThemeQuickPicker(app);
    syncSystemInfo(app);
}

function syncAudioSliders(app) {
    const setRange = (id, val) => {
        const el = document.getElementById(id);
        if(el) el.value = val * 100;
    };
    const setLabel = (id, val) => {
        const el = document.getElementById(id);
        if(el) el.innerText = Math.round(val * 100) + '%';
    };
    setRange('rng-master', app.audio.vol.master);
    setRange('rng-sfx',    app.audio.vol.sfx);
    setRange('rng-music',  app.audio.vol.music);
    setLabel('val-master', app.audio.vol.master);
    setLabel('val-sfx',    app.audio.vol.sfx);
    setLabel('val-music',  app.audio.vol.music);
}

function syncVisualToggles(app) {
    const setCheck = (id, val) => {
        const el = document.getElementById(id);
        if(el) el.checked = val;
    };
    setCheck('chk-performance',   app.settings.performance);
    setCheck('chk-scanlines',     app.settings.scanlines || false);
    setCheck('chk-shake',         app.settings.shake !== false);
    setCheck('chk-countdown',     app.settings.countdown || false);
    setCheck('chk-reduce-motion', app.settings.reduceMotion || false);
    setCheck('chk-notifs',        app.settings.showNotifs !== false);
}

function syncThemeQuickPicker(app) {
    const host = document.getElementById('settings-theme-quick');
    if(!host) return;
    const quickThemes = CONFIG.SHOP.filter(i => i.type === 'THEME').slice(0, 8);
    host.innerHTML = quickThemes.map(t => {
        const owned  = app.shop.inventory.includes(t.id);
        const active = app.shop.equipped.theme === t.id;
        const onclickAttr = owned
            ? 'window.app.shop.equipped.theme=\'' + t.id + '\';'
              + 'window.app.applyTheme(\'' + t.id + '\');'
              + 'window.app.save();'
              + 'this.parentElement.querySelectorAll("div").forEach(d=>d.style.boxShadow="");'
              + 'this.style.boxShadow="0 0 0 2px white";'
            : '';
        const cursor   = owned ? 'pointer' : 'not-allowed';
        const opacity  = owned ? '1' : '0.3';
        const shadow   = active ? '0 0 0 2px white' : 'none';
        return '<div title="' + t.name + '" onclick="' + onclickAttr + '" '
             + 'style="width:26px;height:26px;border-radius:6px;'
             + 'background:var(--primary);cursor:' + cursor + ';'
             + 'opacity:' + opacity + ';box-shadow:' + shadow + ';'
             + 'border:1px solid rgba(255,255,255,0.1);'
             + 'transition:all 0.15s;"></div>';
    }).join('');
}

function syncSystemInfo(app) {
    const set = (id, text) => { const el = document.getElementById(id); if(el) el.innerText = text; };

    set('sys-agent',  app.agentName || 'AGENTE');
    set('sys-games',  app.stats.gamesPlayed || 0);
    set('sys-level',  app.stats.level || 1);

    // Tamaño del save y fecha del último guardado
    try {
        const raw = localStorage.getItem('arcade_save');
        if(raw) {
            const sizeKB = (raw.length / 1024).toFixed(1);
            set('sys-save-size', sizeKB + ' KB');
            // Intentar leer la fecha del save; fallback: fecha de la última partida
            let date = null;
            try {
                const parsed = JSON.parse(raw);
                date = parsed.savedAt || parsed.stats?.lastPlayed || null;
            } catch(e) {}
            set('sys-save-date', date ? new Date(date).toLocaleDateString() : 'Hoy');
        } else {
            set('sys-save-size', '0 KB');
            set('sys-save-date', '—');
        }
    } catch(e) {
        set('sys-save-size', '—');
        set('sys-save-date', '—');
    }

    // Sincronizar label del botón fullscreen (por si se abrió con fs activo)
    updateFullscreenLabel();
}

function closeSettingsModal(app) {
    app.audio.playClick();
    const modal = document.getElementById('modal-settings');
    if(modal) modal.classList.add('hidden');

    const notifCheck = document.getElementById('chk-notifs');
    if(notifCheck) app.settings.showNotifs = notifCheck.checked;

    app.save();
}

function showResetConfirm() {
    const modal = document.createElement('div');
    modal.style.cssText =
        'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;'
      + 'display:flex;align-items:center;justify-content:center;';
    modal.innerHTML =
        '<div style="background:#0a0e1a;border:1px solid rgba(239,68,68,0.4);'
      + 'border-radius:14px;padding:28px 32px;text-align:center;max-width:300px;">'
      + '<div style="font-size:1.5rem;margin-bottom:10px;">⚠️</div>'
      + '<div style="font-family:var(--font-display);font-size:0.85rem;color:white;'
      + 'letter-spacing:2px;margin-bottom:8px;">BORRAR DATOS</div>'
      + '<div style="font-size:0.65rem;color:#64748b;margin-bottom:20px;">'
      + 'Se perderán todos los créditos, récords, logros y progreso. '
      + 'Esta acción no se puede deshacer.</div>'
      + '<div style="display:flex;gap:8px;">'
      + '<button id="reset-cancel" style="flex:1;background:rgba(255,255,255,0.05);'
      + 'border:1px solid rgba(255,255,255,0.1);color:#64748b;border-radius:8px;'
      + 'padding:9px;font-family:var(--font-display);font-size:0.65rem;cursor:pointer;">'
      + 'CANCELAR</button>'
      + '<button id="reset-confirm" style="flex:1;background:rgba(239,68,68,0.12);'
      + 'border:1px solid rgba(239,68,68,0.4);color:#ef4444;border-radius:8px;'
      + 'padding:9px;font-family:var(--font-display);font-size:0.65rem;cursor:pointer;">'
      + 'BORRAR TODO</button>'
      + '</div></div>';
    document.body.appendChild(modal);
    modal.querySelector('#reset-cancel').onclick  = () => modal.remove();
    modal.querySelector('#reset-confirm').onclick = () => {
        localStorage.removeItem('arcade_save');
        location.reload();
    };
}
