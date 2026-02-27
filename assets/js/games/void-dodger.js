import { CONFIG } from '../config.js';

export class VoidDodgerGame {
    // NOTA: 'onQuit' es el Smart Callback
    constructor(canvas, audio, onQuit) {
        this.canvas = canvas;
        this.ctx = canvas.ctx;
        this.audio = audio;
        this.onQuit = onQuit;
        
        this.score = 0; // Tiempo sobrevivido
        this.isRunning = false;
        this.player = { x: 0, y: 0, r: 8, speed: 1, invulnerable: false };
        this.enemies = [];
        this.powerups = [];
        this.startTime = 0;
        this.gameLoopId = null;
        
        this.mousePos = { x: 0, y: 0 };
        
        this.uiContainer = document.getElementById('game-ui-overlay');
        
        // Binding seguro
        this.handleMove = this.handleMove.bind(this);
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('void-styles')) return;
        const style = document.createElement('style');
        style.id = 'void-styles';
        // ... (ESTILOS SIN CAMBIOS) ...
        style.innerHTML = `
            .vd-hud { position: absolute; top: 80px; width: 100%; text-align: center; pointer-events: none; z-index: 20; }
            .vd-timer { font-family: var(--font-display); font-size: 3rem; color: #fff; text-shadow: 0 0 15px white; }
            .vd-msg { position: absolute; top: 40%; width: 100%; text-align: center; font-family: var(--font-display); font-size: 2rem; color: #fbbf24; opacity: 0; pointer-events: none; transition: opacity 0.5s; text-shadow: 0 0 20px #fbbf24; }
            .vd-msg.show { opacity: 1; animation: floatUp 1s forwards; }
            @keyframes floatUp { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-50px); opacity: 0; } }
            .vd-menu { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; animation: fadeIn 0.5s; background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 80%); }
            .vd-start-btn { width: 180px; height: 180px; border-radius: 50%; border: 4px solid white; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s; background: rgba(0,0,0,0.5); box-shadow: 0 0 30px rgba(255,255,255,0.2); }
            .vd-start-btn:hover { transform: scale(1.1); background: rgba(255,255,255,0.1); box-shadow: 0 0 50px white; }
        `;
        document.head.appendChild(style);
    }

    init() {
        if(window.app.credits < 10) {
            try { window.app.showToast("FONDOS INSUFICIENTES", "Costo: $10", "danger"); } catch(e) {}
            // Salida segura
            if(this.onQuit) this.onQuit(0);
            return;
        }

        this.uiContainer.innerHTML = `
            <div class="vd-menu">
                <h2 style="color:white; font-size:2.5rem; margin-bottom:10px; text-shadow:0 0 20px white;">VOID DODGER</h2>
                <p style="color:#94a3b8; margin-bottom:40px;">SOBREVIVE AL VACÍO</p>
                <div class="vd-start-btn" id="btn-vd-start">
                    <i class="fa-solid fa-play" style="font-size:3rem; color:white;"></i>
                    <span style="margin-top:10px; font-family:monospace;">JUGAR ($10)</span>
                </div>
                <button class="btn btn-secondary" id="btn-vd-back" style="margin-top:50px;">VOLVER</button>
            </div>
        `;

        document.getElementById('btn-vd-start').onclick = () => this.payAndStart();
        // Salida segura
        document.getElementById('btn-vd-back').onclick = () => { if(this.onQuit) this.onQuit(0); };
    }

    payAndStart() {
        window.app.credits -= 10;
        document.getElementById('val-credits').innerText = window.app.credits;
        try { this.audio.playBuy(); } catch(e) {}
        this.canvas.setMood('VOID'); 
        this.start();
    }

    start() {
        this.isRunning = true;
        this.score = 0;
        this.enemies = [];
        this.powerups = [];
        this.startTime = Date.now();
        
        const w = this.canvas.canvas.width;
        const h = this.canvas.canvas.height;
        this.player = { x: w/2, y: h/2, r: 8, invulnerable: false, invTimer: 0 };
        this.mousePos = { x: w/2, y: h/2 }; 
        
        this.uiContainer.innerHTML = `
            <div class="vd-hud"><div class="vd-timer" id="vd-score">0.0</div></div>
            <div class="vd-msg" id="vd-msg"></div>
        `;
        
        window.addEventListener('mousemove', this.handleMove);
        window.addEventListener('touchmove', this.handleMove, { passive: false });
        
        this.loop();
    }

    // ... (handleMove, spawnEnemy, spawnPowerUp, showMsg, updateAndDraw, loop IGUALES) ...
    handleMove(e) {
        if(!this.isRunning) return;
        const rect = this.canvas.canvas.getBoundingClientRect();
        if(e.touches) {
            this.mousePos.x = e.touches[0].clientX - rect.left;
            this.mousePos.y = e.touches[0].clientY - rect.top;
            e.preventDefault();
        } else {
            this.mousePos.x = e.clientX - rect.left;
            this.mousePos.y = e.clientY - rect.top;
        }
    }

    spawnEnemy() {
        const w = this.canvas.canvas.width;
        const h = this.canvas.canvas.height;
        let x, y, dist;
        do {
            const side = Math.floor(Math.random() * 4);
            if(side === 0) { x = Math.random() * w; y = -20; }
            else if(side === 1) { x = w + 20; y = Math.random() * h; }
            else if(side === 2) { x = Math.random() * w; y = h + 20; }
            else { x = -20; y = Math.random() * h; }
            dist = Math.hypot(x - this.player.x, y - this.player.y);
        } while(dist < 200);
        const baseSpeed = 2 + (this.score * 0.15); 
        const angle = Math.atan2(this.player.y - y, this.player.x - x);
        const jitter = (Math.random() - 0.5) * 0.5; 
        this.enemies.push({ x, y, vx: Math.cos(angle + jitter) * baseSpeed, vy: Math.sin(angle + jitter) * baseSpeed, r: 6 + Math.random()*6, color: CONFIG.COLORS.VOID || '#fff' });
    }

    spawnPowerUp() {
        const w = this.canvas.canvas.width;
        const h = this.canvas.canvas.height;
        const x = Math.random() * (w - 100) + 50;
        const y = Math.random() * (h - 100) + 50;
        const type = Math.random() > 0.5 ? 'SHIELD' : 'SLOW';
        this.powerups.push({ x, y, type, r: 15, life: 300 });
    }

    showMsg(text, color) {
        const el = document.getElementById('vd-msg');
        if(el) {
            el.innerText = text; el.style.color = color; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
        }
    }

    updateAndDraw(ctx) {
        this.player.x += (this.mousePos.x - this.player.x) * 0.2;
        this.player.y += (this.mousePos.y - this.player.y) * 0.2;
        ctx.save(); ctx.translate(this.player.x, this.player.y);
        if (this.player.invulnerable) {
            ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, this.player.r + 5 + Math.sin(Date.now()/100)*2, 0, Math.PI*2); ctx.stroke();
            this.player.invTimer--; if (this.player.invTimer <= 0) this.player.invulnerable = false;
        }
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, this.player.r, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 15; ctx.shadowColor = '#fff'; ctx.fill(); ctx.restore();
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            let p = this.powerups[i]; p.life--;
            ctx.save(); ctx.translate(p.x, p.y); const scale = 1 + Math.sin(Date.now()/200)*0.2; ctx.scale(scale, scale);
            ctx.fillStyle = p.type === 'SHIELD' ? '#00ffff' : '#10b981'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10; ctx.beginPath(); 
            if (p.type === 'SHIELD') ctx.arc(0,0, p.r, 0, Math.PI*2); else ctx.rect(-p.r/2, -p.r/2, p.r, p.r); ctx.fill();
            ctx.fillStyle = 'black'; ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.type === 'SHIELD' ? 'S' : 'T', 0, 0); ctx.restore();
            const dist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
            if (dist < p.r + this.player.r) {
                if (p.type === 'SHIELD') { this.player.invulnerable = true; this.player.invTimer = 180; this.showMsg("¡ESCUDO ACTIVO!", "#00ffff"); try{ this.audio.playWin(1); }catch(e){} } 
                else { this.enemies.forEach(e => { e.vx *= 0.5; e.vy *= 0.5; }); this.showMsg("¡RALENTIZADO!", "#10b981"); try{ this.audio.playClick(); }catch(e){} }
                this.powerups.splice(i, 1); continue;
            }
            if (p.life <= 0) this.powerups.splice(i, 1);
        }
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let e = this.enemies[i]; e.x += e.vx; e.y += e.vy;
            ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI*2); ctx.fill();
            const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
            if (dist < e.r + this.player.r) {
                if (this.player.invulnerable) { this.canvas.explode(e.x, e.y, e.color); this.enemies.splice(i, 1); try{ this.audio.playTone(100, 'noise', 0.1); }catch(e){} } 
                else { this.gameOver(); return; }
            }
            if (e.x < -50 || e.x > this.canvas.canvas.width + 50 || e.y < -50 || e.y > this.canvas.canvas.height + 50) { this.enemies.splice(i, 1); }
        }
    }

    loop() {
        if(!this.isRunning) return;
        this.score = (Date.now() - this.startTime) / 1000;
        const scoreEl = document.getElementById('vd-score'); if(scoreEl) scoreEl.innerText = this.score.toFixed(1);
        const spawnChance = Math.min(0.1, 0.02 + (this.score * 0.002));
        if (Math.random() < spawnChance) this.spawnEnemy();
        if (Math.random() < 0.005) this.spawnPowerUp();
        this.ctx.fillStyle = 'rgba(0,0,0,0.1)'; this.ctx.fillRect(0, 0, this.canvas.canvas.width, this.canvas.canvas.height);
        this.updateAndDraw(this.ctx);
        this.gameLoopId = requestAnimationFrame(() => this.loop());
    }

    // --- CORRECCIÓN CRÍTICA: Fin de Juego ---
    gameOver() {
        this.isRunning = false;
        if(this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
        
        window.removeEventListener('mousemove', this.handleMove);
        window.removeEventListener('touchmove', this.handleMove);
        
        try { this.audio.playLose(); } catch(e) {}
        if(this.canvas && this.canvas.explode) this.canvas.explode(this.player.x, this.player.y, '#fff');

        // Cálculo de Puntuación
        const finalScore = Math.floor(this.score * 10); // Puntos base
        
        // NOTA: Los créditos se pueden calcular en main.js si se configura una fórmula
        // Pero para este juego específico, si quieres dar un premio especial por tiempo:
        const bonusCredits = Math.floor(this.score * 2);
        window.app.credits += bonusCredits;
        window.app.save();

        // Delegamos al main con el puntaje final
        if (this.onQuit) this.onQuit(finalScore);
    }
}