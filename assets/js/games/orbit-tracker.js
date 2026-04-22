import { CONFIG } from '../config.js';
import { showGameLoader, hideGameLoader } from '../game-loader.js';
import { mountGameFrame, unmountGameFrame } from '../systems/pixi-stage.js';

export class OrbitTrackerGame {
    constructor(canvas, audio, onQuit) {
        this.bgCanvas = canvas;
        this.audio = audio;
        this.onQuit = onQuit;
        this.score = 0;
        this.startTime = 0;
        this.isRunning = false;
        this.animationId = null;
        this.mouseX = 0; this.mouseY = 0;
        this.orbs = [];
        this.energy = 60;
        this.mode = 'STANDARD';
        this.level = 1;
        this.lockedCount = 0;
        // NUEVAS MECÁNICAS
        this.lockStreak = 0;         // frames consecutivos con al menos 1 lock
        this.maxLockStreak = 0;
        this.boostAvailable = 2;
        this.comboFrames = 0;        // frames con lock completo (todos los orbes)
        this.maxLevel = 1;
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.handleMove = this.handleMove.bind(this);
        this.pixiApp = null;
        this._pGfx = null;
        this._usePixi = false;
        this.injectStyles();
    }

    injectStyles() {
        if(document.getElementById('ot-styles')) return;
        const s = document.createElement('style');
        s.id = 'ot-styles';
        s.innerHTML = `
        .ot-canvas { position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none; }
        .ot-hud { position:absolute;top:16px;left:0;right:0;display:flex;justify-content:center;gap:14px;pointer-events:none;z-index:10; }
        .ot-stat { background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:5px 14px;display:flex;flex-direction:column;align-items:center;gap:1px; }
        .ot-stat-lbl { font-size:0.52rem;color:#475569;letter-spacing:2px;font-family:monospace;text-transform:uppercase; }
        .ot-stat-val { font-family:var(--font-display);font-size:0.9rem;color:white; }
        .ot-energy-track { width:180px;height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden; }
        .ot-energy-fill { height:100%;border-radius:4px;transition:width 0.1s,background 0.3s; }
        .ot-pwr { position:absolute;bottom:22px;right:22px;padding:8px 14px;background:rgba(10,16,30,0.9);border:1.5px solid #10b981;border-radius:8px;color:#10b981;font-family:var(--font-display);font-size:0.62rem;letter-spacing:2px;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:6px;z-index:30;pointer-events:auto; }
        .ot-pwr:hover:not(.used) { background:rgba(16,185,129,0.15);transform:translateY(-2px); }
        .ot-pwr.used { opacity:0.3;pointer-events:none;filter:grayscale(1); }
        .ot-pwr .cnt { color:#94a3b8;font-size:0.55rem; }
        .ot-combo-chip { position:absolute;top:75px;left:50%;transform:translateX(-50%);padding:4px 14px;background:rgba(34,211,238,0.15);border:1.5px solid #22d3ee;border-radius:20px;color:#22d3ee;font-family:var(--font-display);font-size:0.65rem;letter-spacing:2px;pointer-events:none;opacity:0;transition:opacity 0.3s;z-index:20; }
        .ot-combo-chip.show { opacity:1; }
        .ot-combo-chip.full { background:rgba(251,191,36,0.2);border-color:#fbbf24;color:#fbbf24;transform:translateX(-50%) scale(1.05); }
        `;
        document.head.appendChild(s);
    }

    init() {
        if(window.app.credits < 10){
            try{ window.app.showToast("FONDOS INSUFICIENTES","Costo: $10","danger"); }catch(e){}
            if(this.onQuit) this.onQuit(0); return;
        }
        this.showModeSelect();
    }

    showModeSelect() {
        const modes = [
            { id:'ot-std',   mc:'#22d3ee', icon:'fa-circle-nodes', name:'ESTÁNDAR',  desc:'Un orbe · mantén el cursor encima' },
            { id:'ot-multi', mc:'#a855f7', icon:'fa-atom',         name:'MULTIORBE', desc:'Hasta 3 orbes simultáneos' },
            { id:'ot-chaos', mc:'#ef4444', icon:'fa-tornado',      name:'CAOS',      desc:'Velocidad extrema · orbes que se dividen' },
        ];
        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;">ORBIT TRACKER</div>
                <div style="font-size:0.65rem;color:#22d3ee;letter-spacing:3px;font-family:monospace;">SEGUIMIENTO ORBITAL</div>
                <div style="width:120px;height:1px;background:#22d3ee;margin:10px auto 0;opacity:0.5;"></div>
            </div>
            <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
                ${modes.map(m=>`
                <div style="width:165px;min-height:155px;background:rgba(10,16,30,0.9);border:1px solid ${m.mc}25;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:pointer;transition:all 0.15s;padding:18px 12px;position:relative;overflow:hidden;"
                     id="${m.id}"
                     onmouseenter="this.style.transform='translateY(-4px)';this.style.borderColor='${m.mc}';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)';"
                     onmouseleave="this.style.transform='';this.style.borderColor='${m.mc}25';this.style.boxShadow='';">
                    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${m.mc};opacity:0.6;"></div>
                    <i class="fa-solid ${m.icon}" style="font-size:1.8rem;color:${m.mc};filter:drop-shadow(0 0 8px ${m.mc});"></i>
                    <div style="font-family:var(--font-display);font-size:0.75rem;letter-spacing:2px;color:${m.mc};">${m.name}</div>
                    <div style="font-size:0.6rem;color:#475569;font-family:monospace;text-align:center;line-height:1.5;">${m.desc}</div>
                </div>`).join('')}
            </div>
            <button class="btn btn-secondary" id="ot-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;
        document.getElementById('ot-std').onclick   = () => this.payAndStart('STANDARD');
        document.getElementById('ot-multi').onclick = () => this.payAndStart('MULTI');
        document.getElementById('ot-chaos').onclick = () => this.payAndStart('CHAOS');
        document.getElementById('ot-back').onclick  = () => { if(this.onQuit) this.onQuit(0); };
    }

    payAndStart(mode) {
        window.app.credits -= 10;
        document.getElementById('val-credits').innerText = window.app.credits;
        try{ this.audio.playBuy(); }catch(e){}
        this.mode = mode;
        this.start();
    }

    async start() {
        try {
            const c = this.mode === 'BLITZ' ? '#ef4444' : this.mode === 'CHAOS' ? '#a855f7' : '#3b82f6';
            this._frame = mountGameFrame({ color: c });
        } catch(e) {}
        this.isRunning = true; this.score = 0; this.energy = 60; this.level = 1; this.lockedCount = 0;
        this.startTime = Date.now();
        this.lockStreak = 0; this.maxLockStreak = 0;
        this.boostAvailable = 2; this.comboFrames = 0; this.maxLevel = 1;

        // Crear canvas propio para este juego (no el de fondo)
        this.uiContainer.innerHTML = `
            <canvas class="ot-canvas" id="ot-canvas"></canvas>
            <div class="ot-hud">
                <div class="ot-stat">
                    <div class="ot-stat-lbl">TIEMPO</div>
                    <div class="ot-stat-val" id="ot-score">0.0s</div>
                </div>
                <div class="ot-stat">
                    <div class="ot-stat-lbl">ENERGÍA</div>
                    <div class="ot-energy-track">
                        <div class="ot-energy-fill" id="ot-energy" style="width:60%;background:#22d3ee;"></div>
                    </div>
                </div>
                <div class="ot-stat">
                    <div class="ot-stat-lbl">LOCKS</div>
                    <div class="ot-stat-val" id="ot-locks" style="color:#22d3ee;">0</div>
                </div>
            </div>
            <div class="ot-combo-chip" id="ot-combo">STREAK</div>
            <button class="ot-pwr" id="ot-boost">BOOST <span class="cnt">·${this.boostAvailable}</span> <span class="cnt">$20</span></button>`;
        const bb = document.getElementById('ot-boost');
        if (bb) bb.onclick = () => this.activateBoost();

        const cvs = document.getElementById('ot-canvas');
        cvs.width  = window.innerWidth;
        cvs.height = window.innerHeight;
        this.ctx   = cvs.getContext('2d');

        // Inicializar orbes según modo
        const maxOrbs = this.mode === 'MULTI' ? 1 : this.mode === 'CHAOS' ? 2 : 1;
        this.orbs = [];
        for(let i = 0; i < maxOrbs; i++) this.spawnOrb();

        this.mouseX = cvs.width/2;
        this.mouseY = cvs.height/2;

        window.addEventListener('mousemove', this.handleMove);
        window.addEventListener('touchmove', this.handleMove, {passive:false});

        let _loader = null;
        if (typeof PIXI !== 'undefined') {
            _loader = showGameLoader('INICIALIZANDO RENDER');
            try {
                this._usePixi = true;
                this.pixiApp = new PIXI.Application();
                await this.pixiApp.init({
                    width: cvs.width, height: cvs.height,
                    backgroundAlpha: 0, antialias: true,
                    resolution: window.devicePixelRatio||1, autoDensity: true
                });
                const pc = this.pixiApp.canvas;
                pc.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:5;pointer-events:none;';
                this.uiContainer.appendChild(pc);
                this._pGfx = new PIXI.Graphics();
                this.pixiApp.stage.addChild(this._pGfx);
                // Ocultar canvas 2D para evitar doble dibujo
                cvs.style.display = 'none';
            } catch(e) { this._usePixi = false; }
            hideGameLoader(_loader);
        }

        this.loop();
    }

    spawnOrb() {
        const W = this.ctx?.canvas?.width || window.innerWidth;
        const H = this.ctx?.canvas?.height || window.innerHeight;
        const pad = 80;
        const speed = this.mode === 'CHAOS' ? 3 + this.level*0.5 : 1.5 + this.level*0.2;
        this.orbs.push({
            x: pad + Math.random()*(W-pad*2),
            y: pad + Math.random()*(H-pad*2),
            tx: pad + Math.random()*(W-pad*2),
            ty: pad + Math.random()*(H-pad*2),
            radius: this.mode === 'CHAOS' ? 28 : 40,
            speed: speed,
            isLocked: false,
            lockTime: 0,
            color: ['#22d3ee','#a855f7','#10b981','#f97316'][this.orbs.length % 4],
            pulse: 0
        });
    }

    handleMove(e) {
        if(!this.isRunning) return;
        const cvs = document.getElementById('ot-canvas');
        if(!cvs) return;
        const rect = cvs.getBoundingClientRect();
        if(e.touches){
            this.mouseX = e.touches[0].clientX - rect.left;
            this.mouseY = e.touches[0].clientY - rect.top;
            e.preventDefault();
        } else {
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        }
    }

    loop() {
        if(!this.isRunning) return;
        const W = this.ctx.canvas.width, H = this.ctx.canvas.height;
        const pad = 80;
        const now = Date.now();
        const elapsed = (now - this.startTime) / 1000;

        this.lockedCount = 0;
        let totalEnergy = 0;

        // Física y detección
        this.orbs.forEach(orb => {
            const dx = orb.tx - orb.x, dy = orb.ty - orb.y;
            const dist = Math.sqrt(dx*dx + dy*dy) || 1;
            const spd = orb.speed * (1 + this.level * 0.05);
            orb.x += (dx/dist) * spd;
            orb.y += (dy/dist) * spd;
            if(dist < spd + 5){
                orb.tx = pad + Math.random()*(W-pad*2);
                orb.ty = pad + Math.random()*(H-pad*2);
            }
            const dMouse = Math.sqrt((this.mouseX-orb.x)**2 + (this.mouseY-orb.y)**2);
            orb.isLocked = dMouse < orb.radius;
            if(orb.isLocked){
                this.lockedCount++;
                orb.lockTime += 1/60;
                orb.pulse = Math.sin(now/200) * 0.3 + 0.7;
                totalEnergy += 1.2;
                if(Math.random() > 0.97 && this.bgCanvas){
                    try{ this.bgCanvas.explode(orb.x, orb.y, orb.color); }catch(e){}
                }
            } else {
                orb.pulse = 0;
                totalEnergy -= 1.0 / this.orbs.length;
            }
        });

        // Render
        if(this._usePixi && this._pGfx) this._drawPixi();
        else this._drawCanvas();

        // Bonus de streak: si tenemos locks sostenidos, energía extra
        const allLocked = this.lockedCount === this.orbs.length && this.orbs.length > 0;
        if (allLocked) {
            this.comboFrames++;
            this.lockStreak++;
            if (this.lockStreak > this.maxLockStreak) this.maxLockStreak = this.lockStreak;
            if (this.comboFrames > 30) totalEnergy += 0.5;    // combo sostenido → más energía
            if (this.comboFrames > 120) totalEnergy += 0.5;   // combo épico
        } else {
            this.comboFrames = 0;
            if (this.lockedCount === 0) this.lockStreak = Math.max(0, this.lockStreak - 1);
        }
        this.energy = Math.max(0, Math.min(100, this.energy + totalEnergy));
        this.score = elapsed;

        if(elapsed > this.level * 10){
            this.level++;
            if (this.level > this.maxLevel) this.maxLevel = this.level;
            if(this.mode === 'MULTI' && this.orbs.length < 3) this.spawnOrb();
            try{ window.app.showToast(`NIVEL ${this.level}`, 'Velocidad aumentada', 'default'); }catch(e){}
        }

        // Update combo chip
        const chip = document.getElementById('ot-combo');
        if (chip) {
            if (allLocked && this.orbs.length > 1) {
                chip.textContent = `COMBO COMPLETO · ${(this.comboFrames/60).toFixed(1)}s`;
                chip.classList.add('show', 'full');
            } else if (this.lockStreak > 60) {
                chip.textContent = `STREAK · ${(this.lockStreak/60).toFixed(1)}s`;
                chip.classList.add('show');
                chip.classList.remove('full');
            } else {
                chip.classList.remove('show', 'full');
            }
        }

        const scoreEl = document.getElementById('ot-score');
        if(scoreEl) scoreEl.innerText = elapsed.toFixed(1)+'s';
        const energyEl = document.getElementById('ot-energy');
        if(energyEl){ energyEl.style.width = this.energy+'%'; energyEl.style.background = this.energy<25?'#ef4444':this.energy<50?'#f97316':'#22d3ee'; }
        const locksEl = document.getElementById('ot-locks');
        if(locksEl) locksEl.innerText = this.lockedCount + '/' + this.orbs.length;

        if(this.energy <= 0){ this.gameOver(); return; }
        this.animationId = requestAnimationFrame(() => this.loop());
    }

    _drawCanvas() {
        const ctx=this.ctx, W=ctx.canvas.width, H=ctx.canvas.height;
        ctx.clearRect(0,0,W,H);
        this.orbs.forEach(orb=>{
            ctx.beginPath(); ctx.arc(orb.x,orb.y,orb.radius+15,0,Math.PI*2);
            ctx.strokeStyle=orb.color+'20'; ctx.lineWidth=2; ctx.stroke();
            ctx.beginPath(); ctx.arc(orb.x,orb.y,orb.radius,0,Math.PI*2);
            ctx.shadowBlur=orb.isLocked?25:8; ctx.shadowColor=orb.color;
            ctx.fillStyle=orb.isLocked?orb.color+'50':orb.color+'15'; ctx.fill();
            ctx.strokeStyle=orb.color; ctx.lineWidth=orb.isLocked?3:1.5; ctx.stroke();
            ctx.shadowBlur=0;
            if(orb.isLocked){
                ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.globalAlpha=orb.pulse;
                ctx.beginPath(); ctx.moveTo(orb.x-12,orb.y); ctx.lineTo(orb.x+12,orb.y); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(orb.x,orb.y-12); ctx.lineTo(orb.x,orb.y+12); ctx.stroke();
                ctx.globalAlpha=1;
                ctx.beginPath(); ctx.moveTo(this.mouseX,this.mouseY); ctx.lineTo(orb.x,orb.y);
                ctx.strokeStyle=orb.color+'40'; ctx.lineWidth=1; ctx.stroke();
            }
        });
        ctx.beginPath(); ctx.arc(this.mouseX,this.mouseY,6,0,Math.PI*2);
        ctx.fillStyle='#fff'; ctx.shadowBlur=10; ctx.shadowColor='#fff'; ctx.fill(); ctx.shadowBlur=0;
    }

    _drawPixi() {
        const g = this._pGfx; g.clear();
        this.orbs.forEach(orb => {
            const col = parseInt(orb.color.replace('#',''), 16);
            // Anillo exterior
            g.circle(orb.x, orb.y, orb.radius + 15).stroke({color: col, alpha: 0.13, width: 2});
            // Halo cuando locked
            if(orb.isLocked) {
                g.circle(orb.x, orb.y, orb.radius + 28).fill({color: col, alpha: 0.08});
                g.circle(orb.x, orb.y, orb.radius + 18).fill({color: col, alpha: 0.12});
            }
            // Cuerpo
            g.circle(orb.x, orb.y, orb.radius)
             .fill({color: col, alpha: orb.isLocked ? 0.32 : 0.08})
             .stroke({color: col, width: orb.isLocked ? 3 : 1.5, alpha: 0.95});
            // Cruz de mira + línea al cursor
            if(orb.isLocked) {
                g.moveTo(orb.x-12, orb.y).lineTo(orb.x+12, orb.y)
                 .moveTo(orb.x, orb.y-12).lineTo(orb.x, orb.y+12)
                 .stroke({color: 0xffffff, width: 1, alpha: orb.pulse});
                g.moveTo(this.mouseX, this.mouseY).lineTo(orb.x, orb.y)
                 .stroke({color: col, width: 1, alpha: 0.25});
            }
        });
        // Cursor
        g.circle(this.mouseX, this.mouseY, 14).fill({color: 0xffffff, alpha: 0.12});
        g.circle(this.mouseX, this.mouseY, 6).fill({color: 0xffffff});
    }

    pause() {
        if(!this.isRunning) return;
        this._wasPaused = true;
        if(this.animationId) { cancelAnimationFrame(this.animationId); this.animationId = null; }
    }
    resume() {
        if(!this._wasPaused) return;
        this._wasPaused = false;
        if(this.isRunning) this.loop();
    }


    cleanup() {
        this.isRunning = false;
        try { unmountGameFrame(); } catch(e) {}
        if(this.animationId) { cancelAnimationFrame(this.animationId); this.animationId = null; }
        window.removeEventListener('mousemove', this.handleMove);
        window.removeEventListener('touchmove', this.handleMove);
        if(this.pixiApp) {
            try {
                const pc=this.pixiApp.canvas;
                if(pc && pc.parentNode) pc.parentNode.removeChild(pc);
                this.pixiApp.destroy(true);
            } catch(e) {}
            this.pixiApp = null;
        }
    }
    activateBoost() {
        if (!this.isRunning || this.boostAvailable <= 0) return;
        if (window.app.credits < 20) { try { window.app.showToast('CRÉDITOS INSUFICIENTES', 'Boost cuesta $20', 'danger'); } catch(e){} return; }
        window.app.credits -= 20;
        const vc = document.getElementById('val-credits'); if (vc) vc.innerText = window.app.credits;
        try { window.app.save(); } catch(e) {}
        this.boostAvailable--;
        this.energy = Math.min(100, this.energy + 35);
        try { this.audio.playTone(1400, 'sine', 0.2); } catch(e) {}
        const btn = document.getElementById('ot-boost');
        if (btn) {
            btn.innerHTML = `BOOST <span class="cnt">·${this.boostAvailable}</span> <span class="cnt">$20</span>`;
            if (this.boostAvailable <= 0) btn.classList.add('used');
        }
    }

    gameOver() {
        this.isRunning = false;
        if(this.animationId) cancelAnimationFrame(this.animationId);
        window.removeEventListener('mousemove', this.handleMove);
        window.removeEventListener('touchmove', this.handleMove);
        try{ this.audio.playLose(); }catch(e){}
        // Bonus por max level alcanzado y streak máximo
        let bonus = 0;
        if (this.maxLevel >= 3) bonus += this.maxLevel * 4;
        if (this.maxLockStreak >= 120) bonus += Math.floor(this.maxLockStreak / 60) * 3;
        if (bonus > 0) {
            window.app.credits += bonus;
            try { window.app.showToast('BONUS FINAL', `+${bonus} CR · Nivel ${this.maxLevel}`, 'success'); } catch(e) {}
            const vc = document.getElementById('val-credits'); if (vc) vc.innerText = window.app.credits;
            try { window.app.save(); } catch(e) {}
        }
        if(this.onQuit) this.onQuit(parseFloat(this.score.toFixed(1)));
    }
}
