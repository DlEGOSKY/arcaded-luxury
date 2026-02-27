import { CONFIG } from '../config.js';

export class NeonSniperGame {
    // NOTA: 'onQuit' es el Smart Callback del main.js
    constructor(canvas, audio, onQuit) {
        this.canvas = canvas; // Unificamos nombre para consistencia
        this.audio = audio;
        this.onQuit = onQuit;
        
        this.score = 0;
        this.misses = 0; 
        this.isRunning = false;
        this.targets = []; 
        this.bullets = 5;
        this.maxBullets = 5;
        this.isReloading = false;
        this.spawnRate = 1200;
        this.lastSpawn = 0;
        
        this.uiContainer = document.getElementById('game-ui-overlay');
        
        // Bindings para poder remover listeners limpiamente
        this.handleInput = this.handleInput.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this); 
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleContextMenu = this.handleContextMenu.bind(this);
        this.gameLoopRef = null;

        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('sniper-styles')) return;
        const style = document.createElement('style');
        style.id = 'sniper-styles';
        // ... (ESTILOS IGUALES QUE YA TENÍAS) ...
        style.innerHTML = `
            .sniper-cursor-active { cursor: none !important; }
            #sniper-stage { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9000; pointer-events: none; }
            .sniper-target { position: absolute; border-radius: 50%; border: 4px solid #ef4444; background: rgba(239, 68, 68, 0.4); box-shadow: 0 0 25px #ef4444; transform: translate(-50%, -50%); pointer-events: auto !important; cursor: crosshair; }
            .sniper-target-center { position: absolute; width: 15px; height: 15px; background: #ef4444; border-radius: 50%; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; }
            #sniper-scope { position: fixed; width: 80px; height: 80px; border: 2px solid rgba(239, 68, 68, 0.9); border-radius: 50%; pointer-events: none; transform: translate(-50%, -50%); z-index: 9999; display: none; background: radial-gradient(circle, transparent 40%, rgba(0,0,0,0.2) 100%); box-shadow: 0 0 0 100vmax rgba(0,0,0,0.5); transition: transform 0.05s; }
            #sniper-scope::before { content: ''; position: absolute; top: 50%; left: 20%; width: 60%; height: 1px; background: rgba(239, 68, 68, 0.8); }
            #sniper-scope::after { content: ''; position: absolute; top: 20%; left: 50%; width: 1px; height: 60%; background: rgba(239, 68, 68, 0.8); }
            .ammo-rack { position: absolute; bottom: 30px; right: 30px; display: flex; gap: 5px; pointer-events: none; z-index: 9100; }
            .ammo-shell { width: 12px; height: 35px; background: #fbbf24; border: 1px solid #b45309; border-radius: 2px; box-shadow: 0 0 5px rgba(251, 191, 36, 0.5); transition: all 0.2s; }
            .ammo-shell.empty { background: rgba(255,255,255,0.1); border-color: #333; opacity: 0.3; transform: translateY(10px) rotate(10deg); }
            .reload-msg { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #ef4444; font-size: 2rem; font-family: monospace; font-weight: bold; animation: blink 0.2s infinite; pointer-events: none; text-shadow: 0 0 20px red; display: none; z-index: 9200; }
            .muzzle-flash { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: white; opacity: 0; pointer-events: none; z-index: 9150; transition: opacity 0.05s; }
            .debug-shot-marker { position: fixed; width: 10px; height: 10px; background: #00ffff; border-radius: 50%; z-index: 10000; pointer-events: none; transform: translate(-50%, -50%); animation: markerFade 0.5s forwards; }
            @keyframes markerFade { 0% { opacity: 1; transform: translate(-50%, -50%) scale(1); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(3); } }
        `;
        document.head.appendChild(style);
    }

    init() {
        if(window.app.credits < 15) {
            try { window.app.showToast("FONDOS INSUFICIENTES", "Costo: $15", "danger"); } catch(e) {}
            // Salida segura sin puntaje
            if(this.onQuit) this.onQuit(0);
            return;
        }
        
        // PANTALLA DE INICIO (IGUAL)
        this.uiContainer.innerHTML = `
            <div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; animation: fadeIn 0.5s;">
                <h2 style="color: #fff; text-shadow: 0 0 15px #ef4444; margin-bottom:10px; font-size: 2.5rem;">NEON SNIPER</h2>
                <p style="color:#94a3b8; font-size:0.9rem; margin-bottom:40px; letter-spacing: 1px;">PRECISIÓN TÁCTICA</p>
                <div class="cyber-mode-card" id="btn-ns-start" style="border-color:#ef4444; color:#ef4444; width:160px; height:200px;">
                    <i class="fa-solid fa-crosshairs" style="font-size:3rem;"></i>
                    <span style="font-size:1.2rem; margin-top:10px;">INICIAR</span>
                    <small>Costo: $15</small>
                </div>
                <button class="btn btn-secondary" id="btn-ns-back" style="margin-top:40px; width: 200px;">VOLVER</button>
            </div>
        `;

        document.getElementById('btn-ns-start').onclick = () => this.payAndStart();
        // Salida segura desde menú
        document.getElementById('btn-ns-back').onclick = () => { if(this.onQuit) this.onQuit(0); };
    }

    payAndStart() {
        window.app.credits -= 15;
        document.getElementById('val-credits').innerText = window.app.credits;
        try { this.audio.playBuy(); } catch(e) {}
        this.start();
    }

    start() {
        this.isRunning = true;
        this.score = 0;
        this.misses = 0;
        this.targets = [];
        this.bullets = 5;
        this.spawnRate = 1200; 
        this.lastSpawn = 0;
        
        document.body.classList.add('sniper-cursor-active');
        
        this.uiContainer.innerHTML = `
            <div id="sniper-stage"></div>
            <div id="sniper-scope"></div>
            <div class="muzzle-flash" id="flash"></div>
            <div class="reload-msg" id="reload-alert">¡RECARGAR! [R]</div>
            <div style="position:absolute; top:20px; width:100%; text-align:center; pointer-events:none; font-family:var(--font-display); font-size:1.5rem; text-shadow:0 0 10px white; z-index:9100;">
                BLANCOS <span id="ns-score" style="color:var(--primary)">0</span> | DAÑO <span id="ns-miss" style="color:#ef4444">0%</span>
            </div>
            <div class="ammo-rack" id="ammo-container">${'<div class="ammo-shell"></div>'.repeat(5)}</div>
            <div style="position:absolute; bottom:10px; right:30px; font-size:0.7rem; color:#94a3b8; pointer-events:none; z-index:9100;">CLIC DER / R PARA RECARGAR</div>
        `;
        
        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('mousedown', this.handleInput);
        window.addEventListener('touchstart', this.handleInput, {passive: false}); 
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('contextmenu', this.handleContextMenu);
        
        document.getElementById('sniper-scope').style.display = 'block';
        
        this.loop(performance.now());
    }

    // ... (handleMouseMove, handleInput, handleKeyDown, handleContextMenu, shoot, playSafeSound, triggerVisualRecoil, updateAmmoUI, eliminateTarget, hitSuccess, spawnTarget, reload, takeDamage IGUALES) ...
    handleMouseMove(e) { const scope = document.getElementById('sniper-scope'); if(scope) { scope.style.left = e.clientX + 'px'; scope.style.top = e.clientY + 'px'; } }
    handleInput(e) {
        if(!this.isRunning) return;
        let clientX, clientY, isRightClick = false;
        if (e.type === 'touchstart') { e.preventDefault(); clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; } 
        else { if (e.target.tagName === 'BUTTON') return; clientX = e.clientX; clientY = e.clientY; if (e.button === 2) isRightClick = true; }
        if (isRightClick) { this.reload(); } else { this.shoot(clientX, clientY); }
    }
    handleKeyDown(e) { if (e.key.toLowerCase() === 'r') this.reload(); }
    handleContextMenu(e) { e.preventDefault(); return false; }

    shoot(x, y) {
        if (this.isReloading) return;
        if (this.bullets <= 0) { this.playSafeSound('empty'); document.getElementById('reload-alert').style.display = 'block'; return; }
        this.bullets--;
        this.updateAmmoUI();
        this.playSafeSound('shoot');
        this.triggerVisualRecoil();
        const elementsUnderCursor = document.elementsFromPoint(x, y);
        const hitTarget = elementsUnderCursor.find(el => el.classList.contains('sniper-target') || el.classList.contains('sniper-target-center'));
        if (hitTarget) {
            const targetEl = hitTarget.classList.contains('sniper-target-center') ? hitTarget.parentElement : hitTarget;
            const targetId = parseFloat(targetEl.dataset.id);
            this.eliminateTarget(targetId);
        }
    }

    playSafeSound(type) { try { if (type === 'shoot') { if (typeof this.audio.playTone === 'function') this.audio.playTone(100, 'sawtooth', 0.1); else this.audio.playClick(); } else if (type === 'reload') { if (typeof this.audio.playTone === 'function') this.audio.playTone(600, 'sine', 0.2); } else if (type === 'empty') { if (typeof this.audio.playTone === 'function') this.audio.playTone(800, 'square', 0.05); } } catch (e) {} }
    triggerVisualRecoil() { const scope = document.getElementById('sniper-scope'); const flash = document.getElementById('flash'); if(scope) { scope.style.transform = 'translate(-50%, -50%) scale(1.4)'; setTimeout(() => scope.style.transform = 'translate(-50%, -50%) scale(1)', 80); } if(flash) { flash.style.opacity = 0.5; setTimeout(() => flash.style.opacity = 0, 50); } }
    updateAmmoUI() { const shells = document.querySelectorAll('.ammo-shell'); shells.forEach((s, i) => { if (i < this.bullets) s.classList.remove('empty'); else s.classList.add('empty'); }); }
    eliminateTarget(id) { const index = this.targets.findIndex(t => t.id === id); if (index !== -1) { const t = this.targets[index]; if (t.el) t.el.remove(); this.targets.splice(index, 1); this.hitSuccess(t.x, t.y); } }
    hitSuccess(x, y) { this.score++; try { this.audio.playClick(); } catch(e) {} try { if(this.canvas && this.canvas.explode) this.canvas.explode(x, y, CONFIG.COLORS.SNIPER); } catch(e) {} document.getElementById('ns-score').innerText = this.score; if(this.spawnRate > 500) this.spawnRate -= 20; }
    spawnTarget() { const w = window.innerWidth; const h = window.innerHeight; const padding = 100; const x = Math.random() * (w - padding * 2) + padding; const y = Math.random() * (h - padding * 2) + padding; this.targets.push({ id: Date.now() + Math.random(), x, y, size: 150, birth: Date.now(), life: Math.max(1500, 3000 - (this.score * 50)), el: null }); }
    reload() { if (this.isReloading || this.bullets === this.maxBullets) return; this.isReloading = true; const alert = document.getElementById('reload-alert'); if(alert) { alert.innerText = "RECARGANDO..."; alert.style.display = 'block'; alert.style.color = '#fbbf24'; } this.playSafeSound('reload'); setTimeout(() => { this.bullets = this.maxBullets; this.isReloading = false; this.updateAmmoUI(); if(alert) { alert.style.display = 'none'; alert.innerText = "¡RECARGAR! [R]"; alert.style.color = '#ef4444'; } }, 800); }
    takeDamage() { this.misses += 1; const hpPercent = Math.min(100, this.misses * 33); document.getElementById('ns-miss').innerText = `${Math.round(hpPercent)}% CRÍTICO`; try { this.audio.playLose(); } catch(e) {} document.body.classList.add('shake-screen'); setTimeout(() => document.body.classList.remove('shake-screen'), 300); if (this.misses >= 3) { this.gameOver(); } }

    loop(timestamp) {
        if(!this.isRunning) return;
        if (timestamp - this.lastSpawn > this.spawnRate) { this.spawnTarget(); this.lastSpawn = timestamp; }
        const now = Date.now();
        const stage = document.getElementById('sniper-stage');
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const t = this.targets[i];
            const age = now - t.birth;
            const progress = age / t.life; 
            if (!t.el) { t.el = document.createElement('div'); t.el.className = 'sniper-target'; t.el.dataset.id = t.id; t.el.innerHTML = '<div class="sniper-target-center"></div>'; stage.appendChild(t.el); }
            if (progress >= 1) { if(t.el) t.el.remove(); this.targets.splice(i, 1); this.takeDamage(); if(!this.isRunning) return; } 
            else { const currentSize = t.size * (1 - progress * 0.8); t.el.style.left = t.x + 'px'; t.el.style.top = t.y + 'px'; t.el.style.width = currentSize + 'px'; t.el.style.height = currentSize + 'px'; }
        }
        this.gameLoopRef = requestAnimationFrame((t) => this.loop(t));
    }

    // --- CORRECCIÓN CRÍTICA ---
    gameOver() {
        this.isRunning = false;
        if(this.gameLoopRef) cancelAnimationFrame(this.gameLoopRef);
        
        // LIMPIEZA TOTAL
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('mousedown', this.handleInput);
        window.removeEventListener('touchstart', this.handleInput);
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('contextmenu', this.handleContextMenu);
        
        document.body.classList.remove('sniper-cursor-active');
        
        // Llamada Inteligente al main.js pasando el puntaje
        if(this.onQuit) this.onQuit(this.score);
    }
}