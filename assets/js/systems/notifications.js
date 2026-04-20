// systems/notifications.js
// Log de notificaciones del shell: badge en el HUD + panel desplegable.
// Extraido de main.js.
//
// Contrato: recibe la instancia `app` con:
//   app.notifLog  (array de notificaciones persistido)
//   app.save()
//
// BUG FIX aplicado: el showNotifPanel original concatenaba
// `'<button onclick="document.getElementById(\\"notif-panel\\").remove()">'`
// dentro de un string single-quoted. El doble escape producia HTML
// `onclick="document.getElementById(\"notif-panel\")..."` invalido,
// que la mayoria de navegadores no parsean como onclick funcional.
// Por eso el boton X nunca cerraba el panel (solo el click-afuera lo hacia).
// La version extraida usa template literal + comillas simples limpias.

const TYPE_COLORS = {
    gold:    '#fbbf24',
    success: '#10b981',
    danger:  '#ef4444',
    info:    '#3b82f6',
    purple:  '#a855f7',
};

const MAX_ENTRIES = 30;

// -------------------------------------------------------------
// ADD: push + persist + badge refresh
// -------------------------------------------------------------
export function add(app, icon, title, body, type) {
    if(!app.notifLog) app.notifLog = [];
    app.notifLog.unshift({
        icon,
        title,
        body,
        type: type || 'info',
        time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString('es', { day: '2-digit', month: '2-digit' }),
        read: false,
    });
    if(app.notifLog.length > MAX_ENTRIES) app.notifLog.pop();
    refreshBadge(app);
    app.save();
}

// -------------------------------------------------------------
// MARK READ: vaciar contador del badge
// -------------------------------------------------------------
export function markAllRead(app) {
    (app.notifLog || []).forEach(n => { n.read = true; });
    const badge = document.getElementById('notif-badge');
    if(badge) badge.style.display = 'none';
    app.save();
}

// -------------------------------------------------------------
// BADGE: sincronizar contador con el estado no-leido
// -------------------------------------------------------------
export function refreshBadge(app) {
    const badge = document.getElementById('notif-badge');
    if(!badge) return;
    const unread = (app.notifLog || []).filter(n => !n.read).length;
    badge.textContent     = unread;
    badge.style.display   = unread > 0 ? 'flex' : 'none';
}

// -------------------------------------------------------------
// RENDER PANEL: solo el HTML interno, sin shell
// -------------------------------------------------------------
export function renderPanel(app) {
    const log = app.notifLog || [];
    if(!log.length) {
        return '<div style="text-align:center;padding:24px;color:#334155;font-family:monospace;font-size:0.65rem;">SIN NOTIFICACIONES</div>';
    }

    return log.map(n => {
        const col = TYPE_COLORS[n.type] || '#3b82f6';
        return '<div style="display:flex;gap:10px;padding:9px 12px;border-bottom:1px solid rgba(255,255,255,0.04);' + (n.read ? 'opacity:0.5;' : '') + '">' +
            '<div style="font-size:1rem;flex-shrink:0;">' + n.icon + '</div>' +
            '<div style="flex:1;min-width:0;">' +
            '<div style="display:flex;justify-content:space-between;align-items:baseline;">' +
            '<div style="font-family:var(--font-display);font-size:0.68rem;color:' + col + ';letter-spacing:1px;">' + n.title + '</div>' +
            '<div style="font-size:0.5rem;color:#334155;font-family:monospace;flex-shrink:0;margin-left:6px;">' + n.date + ' ' + n.time + '</div>' +
            '</div>' +
            '<div style="font-size:0.6rem;color:#64748b;margin-top:1px;">' + n.body + '</div>' +
            '</div></div>';
    }).join('');
}

// -------------------------------------------------------------
// SHOW PANEL: toggle del panel flotante en el HUD
// -------------------------------------------------------------
export function showPanel(app) {
    markAllRead(app);

    const existing = document.getElementById('notif-panel');
    if(existing) { existing.remove(); return; }

    const panel = document.createElement('div');
    panel.id = 'notif-panel';
    panel.style.cssText = [
        'position:fixed', 'top:48px', 'right:8px', 'width:300px', 'max-height:400px',
        'background:rgba(8,14,26,0.98)', 'border:1px solid rgba(255,255,255,0.08)',
        'border-radius:12px', 'z-index:9999', 'overflow-y:auto',
        'box-shadow:0 20px 60px rgba(0,0,0,0.6)',
        'animation:wFadeIn 0.2s ease',
    ].join(';');

    // Header + cuerpo (sin el onclick inline roto)
    panel.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.06);">' +
        '<div style="font-family:var(--font-display);font-size:0.65rem;color:white;letter-spacing:2px;">NOTIFICACIONES</div>' +
        '<button type="button" data-notif-close style="background:none;border:none;color:#334155;cursor:pointer;font-size:0.7rem;padding:2px 6px;">✕</button>' +
        '</div>' +
        renderPanel(app);

    // Handler del boton X por referencia directa (antes era onclick inline roto)
    const closeBtn = panel.querySelector('[data-notif-close]');
    if(closeBtn) closeBtn.addEventListener('click', () => panel.remove());

    document.body.appendChild(panel);

    // Cerrar al hacer click fuera del panel
    setTimeout(() => {
        const closeOnOutside = (e) => {
            if(!panel.contains(e.target) && e.target.id !== 'notif-btn') {
                panel.remove();
                document.removeEventListener('click', closeOnOutside);
            }
        };
        document.addEventListener('click', closeOnOutside);
    }, 100);
}
