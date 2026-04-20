// Overlay de carga para juegos con inicializacion async (Pixi, fetch, etc.)
// Archivo aparte de utils.js para evitar problemas de cache al iterar.

/**
 * Muestra un overlay de carga sobre screen-game.
 * Retorna el elemento para removerlo despues con hideGameLoader.
 */
export function showGameLoader(text = 'CARGANDO') {
    const el = document.createElement('div');
    el.className = 'game-loading-overlay';
    el.innerHTML = `<div class="loader"></div><div>${text}</div>`;
    (document.getElementById('screen-game') || document.body).appendChild(el);
    return el;
}

/**
 * Remueve el loader con fade-out. Seguro con null/undefined.
 */
export function hideGameLoader(el) {
    if (!el) return;
    el.classList.add('fading-out');
    setTimeout(() => { if (el.parentNode) el.remove(); }, 250);
}
