import { CONFIG } from '../config.js';
import { showGameLoader, hideGameLoader } from '../game-loader.js';

export class SnakePlusGame {
    constructor(canvas, audio, onGameOver) {
        this.canvas     = canvas;
        this.ctx        = canvas.ctx;
        this.audio      = audio;
        this.onGameOver = onGameOver;
        this.animId     = null;
        this.mode       = 'NORMAL';
        // NUEVAS MECÁNICAS
        this.lastFoodTime = 0;
        this.foodCombo = 0;
        this.maxFoodCombo = 0;
        this.ghostAvailable = 1;
        this.ghostActive = false;
        this.ghostTimer = null;
        this.maxLength = 3;
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.pixiApp    = null;
        this._pGfx      = null;
        this._usePixi   = false;
        this.injectStyles();
    }

    injectStyles() {
        if(document.getElementById('snake-styles')) return;
        const s = document.createElement('style');
        s.id = 'snake-styles';
        s.innerHTML = `
            .sp-hud { position:absolute;top:70px;left:0;right:0;display:flex;justify-content:center;gap:32px;pointer-events:none;z-index:20; }
            .sp-hud-item { text-align:center; }
            .sp-hud-val { font-family:var(--font-display);font-size:1.4rem;color:white; }
            .sp-hud-lbl { font-size:0.5rem;color:#334155;font-family:monospace;letter-spacing:2px; }
            .sp-combo-chip { position:absolute; top:130px; left:50%; transform:translateX(-50%); padding:4px 12px; background:rgba(251,191,36,0.15); border:1.5px solid #fbbf24; border-radius:20px; color:#fbbf24; font-family:var(--font-display); font-size:0.65rem; letter-spacing:2px; pointer-events:none; opacity:0; transition:opacity 0.3s; z-index:21; }
            .sp-combo-chip.show { opacity:1; }
            .sp-combo-chip.hot { background:rgba(239,68,68,0.2); border-color:#ef4444; color:#ef4444; }
            .sp-pwr { position:absolute; bottom:22px; right:22px; padding:8px 14px; background:rgba(10,16,30,0.9); border:1.5px solid #a855f7; border-radius:8px; color:#a855f7; font-family:var(--font-display); font-size:0.62rem; letter-spacing:2px; cursor:pointer; transition:all 0.15s; display:flex; align-items:center; gap:6px; z-index:30; pointer-events:auto; }
            .sp-pwr:hover:not(.used) { background:rgba(168,85,247,0.15); transform:translateY(-2px); }
            .sp-pwr.used { opacity:0.3; pointer-events:none; filter:grayscale(1); }
            .sp-pwr .cnt { color:#94a3b8; font-size:0.55rem; }
        `;
        document.head.appendChild(s);
    }

    init() {
        this.showModeSelect();
    }

    showModeSelect() {
        const modes = [
            { id:'sp-classic', mc:'#10b981', icon:'fa-snake',       name:'CLÁSICO',   desc:'Snake tradicional · manzanas' },
            { id:'sp-turbo',   mc:'#f97316', icon:'fa-forward-fast', name:'TURBO',     desc:'Velocidad creciente · x2 pts' },
            { id:'sp-portal',  mc:'#a855f7', icon:'fa-circle-dot',   name:'PORTALES',  desc:'Teletransportación + power-ups' },
        ];
        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;">SNAKE <span style="color:#10b981;">++</span></div>
                <div style="font-size:0.65rem;color:#10b981;letter-spacing:3px;font-family:monospace;">PROTOCOLO SERPIENTE</div>
                <div style="width:120px;height:1px;background:#10b981;margin:10px auto 0;opacity:0.5;"></div>
            </div>
            <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
                ${modes.map(m=>`
                <div style="width:160px;min-height:155px;background:rgba(10,16,30,0.9);border:1px solid ${m.mc}25;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:pointer;transition:all 0.15s;padding:18px 12px;position:relative;overflow:hidden;"
                     id="${m.id}"
                     onmouseenter="this.style.transform='translateY(-4px)';this.style.borderColor='${m.mc}';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)';"
                     onmouseleave="this.style.transform='';this.style.borderColor='${m.mc}25';this.style.boxShadow='';">
                    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${m.mc};opacity:0.6;"></div>
                    <i class="fa-solid ${m.icon}" style="font-size:1.8rem;color:${m.mc};filter:drop-shadow(0 0 8px ${m.mc});"></i>
                    <div style="font-family:var(--font-display);font-size:0.76rem;letter-spacing:2px;color:${m.mc};">${m.name}</div>
                    <div style="font-size:0.6rem;color:#475569;font-family:monospace;text-align:center;line-height:1.5;">${m.desc}</div>
                </div>`).join('')}
            </div>
            <button class="btn btn-secondary" id="sp-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;
        document.getElementById('sp-classic').onclick = () => this.startWithMode('NORMAL');
        document.getElementById('sp-turbo').onclick   = () => this.startWithMode('TURBO');
        document.getElementById('sp-portal').onclick  = () => this.startWithMode('PORTAL');
        document.getElementById('sp-back').onclick    = () => { if(this.onGameOver) this.onGameOver(0); };
    }

    async startWithMode(mode) {
        this.mode = mode;
        try { this.canvas.setMood('BIO'); } catch(e) {}
        // Reset nuevas mecánicas
        this.lastFoodTime = 0; this.foodCombo = 0; this.maxFoodCombo = 0;
        this.ghostAvailable = 1; this.ghostActive = false; this.maxLength = 3;

        this.uiContainer.innerHTML = `
            <div class="sp-hud">
                <div class="sp-hud-item"><div class="sp-hud-val" id="sp-score">0</div><div class="sp-hud-lbl">PUNTOS</div></div>
                <div class="sp-hud-item"><div class="sp-hud-val" id="sp-length" style="color:#10b981;">1</div><div class="sp-hud-lbl">LONGITUD</div></div>
                <div class="sp-hud-item"><div class="sp-hud-val" id="sp-level" style="color:#f97316;">1</div><div class="sp-hud-lbl">NIVEL</div></div>
            </div>
            <div class="sp-combo-chip" id="sp-combo">COMBO ×0</div>
            <button class="sp-pwr" id="sp-ghost">GHOST <span class="cnt">$25</span></button>`;
        const gb = document.getElementById('sp-ghost');
        if (gb) gb.onclick = () => this.activateGhost();

        const W = this.canvas.canvas.width;
        const H = this.canvas.canvas.height;
        this.CELL = 20;
        this.COLS = Math.floor(W / this.CELL);
        this.ROWS = Math.floor(H / this.CELL);
        this.score    = 0;
        this.level    = 1;
        this.dir      = { x: 1, y: 0 };
        this.nextDir  = { x: 1, y: 0 };
        this.snake    = [
            { x: Math.floor(this.COLS/2), y: Math.floor(this.ROWS/2) },
            { x: Math.floor(this.COLS/2)-1, y: Math.floor(this.ROWS/2) },
            { x: Math.floor(this.COLS/2)-2, y: Math.floor(this.ROWS/2) },
        ];
        this.food     = [];
        this.powerups = [];
        this.portals  = [];
        this.particles= [];
        this.tickMs   = mode === 'TURBO' ? 90 : 120;
        this.lastTick = 0;
        this.alive    = true;
        this.spawnFood();
        if(mode === 'PORTAL') this.spawnPortals();

        this.keyHandler = (e) => {
            const map = { ArrowUp:{x:0,y:-1}, ArrowDown:{x:0,y:1}, ArrowLeft:{x:-1,y:0}, ArrowRight:{x:1,y:0},
                          w:{x:0,y:-1}, s:{x:0,y:1}, a:{x:-1,y:0}, d:{x:1,y:0},
                          W:{x:0,y:-1}, S:{x:0,y:1}, A:{x:-1,y:0}, D:{x:1,y:0} };
            const nd = map[e.key];
            if(nd && !(nd.x === -this.dir.x && nd.y === -this.dir.y)) {
                this.nextDir = nd;
                e.preventDefault();
            }
        };
        window.addEventListener('keydown', this.keyHandler);
        // Touch controls
        this._touchStartX = 0; this._touchStartY = 0;
        this._touchHandler = (e) => {
            const dx = e.changedTouches[0].clientX - this._touchStartX;
            const dy = e.changedTouches[0].clientY - this._touchStartY;
            if(Math.abs(dx) > Math.abs(dy)) {
                this.keyHandler({ key: dx > 0 ? 'ArrowRight' : 'ArrowLeft', preventDefault:()=>{} });
            } else {
                this.keyHandler({ key: dy > 0 ? 'ArrowDown' : 'ArrowUp', preventDefault:()=>{} });
            }
        };
        this._touchStartHandler = (e) => { this._touchStartX = e.touches[0].clientX; this._touchStartY = e.touches[0].clientY; };
        window.addEventListener('touchstart', this._touchStartHandler, {passive:true});
        window.addEventListener('touchend', this._touchHandler, {passive:true});

        let _loader = null;
        if (typeof PIXI !== 'undefined') {
            _loader = showGameLoader('INICIALIZANDO RENDER');
            try {
                this._usePixi = true;
                this.pixiApp = new PIXI.Application();
                await this.pixiApp.init({
                    width: this.canvas.canvas.width, height: this.canvas.canvas.height,
                    backgroundAlpha: 0, antialias: true,
                    resolution: window.devicePixelRatio||1, autoDensity: true
                });
                const pc = this.pixiApp.canvas;
                pc.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:5;pointer-events:none;';
                const gs = document.getElementById('screen-game');
                if(gs) gs.appendChild(pc);
                this._pGfx = new PIXI.Graphics();
                this.pixiApp.stage.addChild(this._pGfx);
            } catch(e) { this._usePixi = false; }
            hideGameLoader(_loader);
        }

        this.loop();
    }

    spawnFood(count = 1) {
        for(let i = 0; i < count; i++) {
            let pos;
            do { pos = { x: Math.floor(Math.random()*this.COLS), y: Math.floor(Math.random()*this.ROWS) }; }
            while(this.snake.some(s=>s.x===pos.x&&s.y===pos.y));
            this.food.push({ x: pos.x, y: pos.y, pulse: 0 });
        }
    }

    spawnPortals() {
        const c = this.CELL;
        const pA = { x: 3, y: 3, pair: 1, color: '#3b82f6' };
        const pB = { x: this.COLS-4, y: this.ROWS-4, pair: 1, color: '#f97316' };
        this.portals = [pA, pB];
    }

    spawnPowerUp() {
        const types = [
            { t:'SPEED',  color:'#fbbf24', faIcon:'fa-bolt',         label:'VELOCIDAD' },
            { t:'SLOW',   color:'#3b82f6', faIcon:'fa-snowflake',    label:'LENTO'     },
            { t:'DOUBLE', color:'#a855f7', faIcon:'fa-star',         label:'DOBLE'     },
            { t:'SHIELD', color:'#10b981', faIcon:'fa-shield-halved',label:'ESCUDO'    },
        ];
        const pick = types[Math.floor(Math.random()*types.length)];
        let pos;
        do { pos = { x: Math.floor(Math.random()*this.COLS), y: Math.floor(Math.random()*this.ROWS) }; }
        while(this.snake.some(s=>s.x===pos.x&&s.y===pos.y));
        this.powerups.push({ ...pos, ...pick, life: 200 });
    }

    addParticles(px, py, color, n=8) {
        for(let i=0;i<n;i++) {
            const a=(Math.PI*2/n)*i; const sp=1+Math.random()*2;
            this.particles.push({ x:px,y:py, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, r:3, color, life:20+Math.random()*15, maxLife:35 });
        }
    }

    update() {
        this.dir = { ...this.nextDir };
        const head = { x: (this.snake[0].x + this.dir.x + this.COLS) % this.COLS,
                       y: (this.snake[0].y + this.dir.y + this.ROWS) % this.ROWS };

        // Portal teleport
        if(this.mode === 'PORTAL') {
            const portal = this.portals.find(p => p.x === head.x && p.y === head.y);
            if(portal) {
                const other = this.portals.find(p => p.pair === portal.pair && p !== portal);
                if(other) { head.x = other.x; head.y = other.y; }
                try { this.audio.playTone(600,'sine',0.1); } catch(e) {}
            }
        }

        // Self collision (ignorado si ghost activo)
        if(!this.ghostActive && this.snake.some(s => s.x===head.x && s.y===head.y)) { this.die(); return; }

        this.snake.unshift(head);
        let grew = false;

        // Food check
        const fi = this.food.findIndex(f => f.x===head.x && f.y===head.y);
        if(fi !== -1) {
            this.food.splice(fi, 1);
            // Fast food combo: comer en <3s del anterior
            const now = Date.now();
            const isFast = this.lastFoodTime > 0 && (now - this.lastFoodTime) < 3000;
            if (isFast) {
                this.foodCombo++;
                if (this.foodCombo > this.maxFoodCombo) this.maxFoodCombo = this.foodCombo;
            } else {
                this.foodCombo = 1;
            }
            this.lastFoodTime = now;
            this.updateComboChip();
            // Combo multiplier
            let comboMulti = 1;
            if (this.foodCombo >= 8) comboMulti = 3;
            else if (this.foodCombo >= 4) comboMulti = 2;
            else if (this.foodCombo >= 2) comboMulti = 1.5;
            const basePts = this.mode==='TURBO' ? this.level*2 : this.level;
            const pts = Math.floor(basePts * comboMulti);
            this.score += pts;
            grew = true;
            this.addParticles(head.x*this.CELL+this.CELL/2, head.y*this.CELL+this.CELL/2, comboMulti>1 ? '#fbbf24' : '#10b981');
            try { this.audio.playTone(440+this.score*2+(this.foodCombo*20),'sine',0.1); } catch(e) {}
            this.spawnFood();
            if(this.food.length === 0) this.spawnFood(); // safety

            // Subir nivel
            if(this.score > 0 && this.score % (this.mode==='TURBO' ? 8 : 5) === 0) {
                this.level++;
                this.tickMs = Math.max(50, this.tickMs - 5);
                if(this.mode==='PORTAL' && Math.random()<0.5) this.spawnPowerUp();
                try { this.audio.playWin(1); } catch(e) {}
            }
            this.updateHUD();
        }

        // Powerup check
        const pi = this.powerups.findIndex(p => p.x===head.x && p.y===head.y);
        if(pi !== -1) {
            const pu = this.powerups[pi];
            this.powerups.splice(pi,1);
            this.addParticles(head.x*this.CELL+this.CELL/2, head.y*this.CELL+this.CELL/2, pu.color, 10);
            if(pu.t==='SPEED')  { this.tickMs = Math.max(40, this.tickMs-20); setTimeout(()=>{this.tickMs+=20;},5000); }
            if(pu.t==='SLOW')   { this.tickMs += 40; setTimeout(()=>{this.tickMs-=40;},5000); }
            if(pu.t==='DOUBLE') { this.score += this.level * 5; grew = true; }
            if(pu.t==='SHIELD') {
                this.ghostActive = true;
                if(this.ghostTimer) clearTimeout(this.ghostTimer);
                this.ghostTimer = setTimeout(() => { this.ghostActive = false; }, 5000);
            }
            try { this.audio.playWin(2); window.app.showToast(pu.label,'Power-up activado','success'); } catch(e) {}
        }

        // Spawn ocasional de power-ups en todos los modos (bajo prob cada food)
        if(grew && this.mode !== 'PORTAL' && Math.random() < 0.12 && this.powerups.length === 0) {
            this.spawnPowerUp();
        }

        if(!grew) this.snake.pop();
        if (this.snake.length > this.maxLength) this.maxLength = this.snake.length;

        // Powerup decay
        for(let i=this.powerups.length-1;i>=0;i--){ this.powerups[i].life--; if(this.powerups[i].life<=0) this.powerups.splice(i,1); }
    }

    updateHUD() {
        const sc = document.getElementById('sp-score');    if(sc) sc.innerText = this.score;
        const ln = document.getElementById('sp-length');   if(ln) ln.innerText = this.snake.length;
        const lv = document.getElementById('sp-level');    if(lv) lv.innerText = this.level;
    }

    draw() {
        if(this._usePixi && this._pGfx) { this._drawPixi(); return; }
        // Fallback Canvas 2D
        const ctx=this.ctx, C=this.CELL, W=this.canvas.canvas.width, H=this.canvas.canvas.height;
        ctx.fillStyle='rgba(5,8,18,0.85)'; ctx.fillRect(0,0,W,H);
        ctx.strokeStyle='rgba(255,255,255,0.02)'; ctx.lineWidth=0.5;
        for(let x=0;x<=this.COLS;x++){ctx.beginPath();ctx.moveTo(x*C,0);ctx.lineTo(x*C,H);ctx.stroke();}
        for(let y=0;y<=this.ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*C);ctx.lineTo(W,y*C);ctx.stroke();}
        this.portals.forEach(p=>{const px=p.x*C+C/2,py=p.y*C+C/2;ctx.beginPath();ctx.arc(px,py,C*0.45,0,Math.PI*2);ctx.fillStyle=p.color+'22';ctx.fill();ctx.strokeStyle=p.color;ctx.lineWidth=2;ctx.stroke();});
        this.powerups.forEach(p=>{const px=p.x*C+C/2,py=p.y*C+C/2;ctx.save();ctx.translate(px,py);ctx.fillStyle=p.color+'33';ctx.strokeStyle=p.color;ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(-C*0.4,-C*0.4,C*0.8,C*0.8,4);ctx.fill();ctx.stroke();ctx.restore();});
        this.food.forEach(f=>{f.pulse=(f.pulse||0)+0.08;const px=f.x*C+C/2,py=f.y*C+C/2;ctx.fillStyle='#ef4444';ctx.shadowBlur=10;ctx.shadowColor='#ef4444';ctx.beginPath();ctx.arc(px,py,C*0.32*(1+Math.sin(f.pulse)*0.12),0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;});
        this.snake.forEach((seg,i)=>{const t=1-i/this.snake.length;const green=Math.floor(155+t*100);ctx.fillStyle=i===0?'#fff':`rgb(0,${green},60)`;ctx.shadowBlur=i===0?12:4;ctx.shadowColor=i===0?'#fff':'#10b981';ctx.beginPath();ctx.roundRect(seg.x*C+1,seg.y*C+1,C-2,C-2,i===0?5:3);ctx.fill();});ctx.shadowBlur=0;
        for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.x+=p.vx;p.y+=p.vy;p.life--;ctx.globalAlpha=p.life/p.maxLife;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r*(p.life/p.maxLife),0,Math.PI*2);ctx.fill();if(p.life<=0)this.particles.splice(i,1);}ctx.globalAlpha=1;
    }

    _drawPixi() {
        const g=this._pGfx; g.clear();
        const C=this.CELL, t=Date.now();
        const W=this.canvas.canvas.width, H=this.canvas.canvas.height;

        // Fondo
        g.rect(0,0,W,H).fill({color:0x050812, alpha:0.85});

        // Grid sutil
        for(let x=0;x<=this.COLS;x++) g.moveTo(x*C,0).lineTo(x*C,H).stroke({color:0xffffff,alpha:0.02,width:0.5});
        for(let y=0;y<=this.ROWS;y++) g.moveTo(0,y*C).lineTo(W,y*C).stroke({color:0xffffff,alpha:0.02,width:0.5});

        // Portales
        this.portals.forEach(p=>{
            const px=p.x*C+C/2, py=p.y*C+C/2;
            const col=parseInt(p.color.replace('#',''),16);
            g.circle(px,py,C*0.45).fill({color:col,alpha:0.13}).stroke({color:col,width:2,alpha:0.9});
        });

        // Power-ups
        this.powerups.forEach(p=>{
            const px=p.x*C+C/2, py=p.y*C+C/2;
            const col=parseInt(p.color.replace('#',''),16);
            const pulse=1+Math.sin(t*0.006)*0.15;
            g.roundRect(px-C*0.4*pulse,py-C*0.4*pulse,C*0.8*pulse,C*0.8*pulse,4)
             .fill({color:col,alpha:0.2}).stroke({color:col,width:1.5,alpha:0.9});
        });

        // Comida
        this.food.forEach(f=>{
            f.pulse=(f.pulse||0)+0.08;
            const px=f.x*C+C/2, py=f.y*C+C/2;
            const r=C*0.32*(1+Math.sin(f.pulse)*0.12);
            g.circle(px,py,r*2).fill({color:0xef4444,alpha:0.15});
            g.circle(px,py,r).fill({color:0xef4444});
        });

        // Serpiente
        this.snake.forEach((seg,i)=>{
            const frac=1-i/this.snake.length;
            const green=Math.floor(155+frac*100);
            const col=i===0?0xffffff:((0<<16)|(green<<8)|60);
            const alpha=i===0?1:0.7+frac*0.3;
            g.roundRect(seg.x*C+1,seg.y*C+1,C-2,C-2,i===0?5:3).fill({color:col,alpha});
            if(i===0) g.roundRect(seg.x*C-2,seg.y*C-2,C+4,C+4,7).fill({color:0xffffff,alpha:0.08});
        });

        // Partículas
        for(let i=this.particles.length-1;i>=0;i--){
            const p=this.particles[i];
            p.x+=p.vx; p.y+=p.vy; p.life--;
            const a=Math.max(0,p.life/p.maxLife);
            const col=parseInt(p.color.replace('#',''),16);
            g.circle(p.x,p.y,p.r*a).fill({color:col,alpha:a});
            if(p.life<=0) this.particles.splice(i,1);
        }
    }

    loop(ts=0) {
        if(!this.alive) return;
        if(ts - this.lastTick >= this.tickMs) {
            this.update();
            this.lastTick = ts;
        }
        this.draw();
        this.animId = requestAnimationFrame(t => this.loop(t));
    }

    updateComboChip() {
        const chip = document.getElementById('sp-combo');
        if (!chip) return;
        if (this.foodCombo >= 2) {
            let m = 1;
            if (this.foodCombo >= 8) m = 3;
            else if (this.foodCombo >= 4) m = 2;
            else if (this.foodCombo >= 2) m = 1.5;
            chip.textContent = `COMBO ×${this.foodCombo} · BONUS ×${m}`;
            chip.classList.add('show');
            chip.classList.toggle('hot', this.foodCombo >= 4);
        } else {
            chip.classList.remove('show', 'hot');
        }
    }

    activateGhost() {
        if (!this.alive || this.ghostAvailable <= 0 || this.ghostActive) return;
        if (window.app.credits < 25) { try { window.app.showToast('CRÉDITOS INSUFICIENTES', 'Ghost cuesta $25', 'danger'); } catch(e){} return; }
        window.app.credits -= 25;
        const vc = document.getElementById('val-credits'); if (vc) vc.innerText = window.app.credits;
        try { window.app.save(); } catch(e) {}
        this.ghostAvailable--;
        this.ghostActive = true;
        try { this.audio.playTone(1500, 'sine', 0.15); } catch(e){}
        const btn = document.getElementById('sp-ghost');
        if (btn) { btn.classList.add('used'); btn.innerHTML = 'GHOST <span class="cnt">ACTIVO</span>'; }
        if (this.ghostTimer) clearTimeout(this.ghostTimer);
        this.ghostTimer = setTimeout(() => {
            this.ghostActive = false;
            if (btn) btn.innerHTML = 'GHOST <span class="cnt">AGOTADO</span>';
        }, 4000);
    }

    die() {
        this.alive = false;
        if(this.animId) cancelAnimationFrame(this.animId);
        if(this.ghostTimer) { clearTimeout(this.ghostTimer); this.ghostTimer = null; }
        window.removeEventListener('keydown', this.keyHandler);
        try { this.audio.playLose(); } catch(e) {}
        try { this.canvas.explode(
            this.snake[0].x*this.CELL+this.CELL/2,
            this.snake[0].y*this.CELL+this.CELL/2, '#10b981'); } catch(e) {}
        // Bonus por longitud y combo
        let bonus = 0;
        if (this.maxLength >= 10) bonus += (this.maxLength - 3) * 2;
        if (this.maxFoodCombo >= 4) bonus += this.maxFoodCombo * 3;
        if (bonus > 0) {
            window.app.credits += bonus;
            try { window.app.showToast('BONUS FINAL', `+${bonus} CR · Combo ×${this.maxFoodCombo}`, 'success'); } catch(e){}
            const vc = document.getElementById('val-credits'); if (vc) vc.innerText = window.app.credits;
            try { window.app.save(); } catch(e){}
        }
        this._quitTimer = setTimeout(() => { if(this.onGameOver) this.onGameOver(this.score); }, 800);
    }

    pause() {
        if(!this.alive) return;
        this._paused = true;
        if(this.animId) { cancelAnimationFrame(this.animId); this.animId = null; }
    }
    resume() {
        if(!this._paused) return;
        this._paused = false;
        this.loop();
    }
    cleanup() {
        this.alive = false;
        if(this.animId) { cancelAnimationFrame(this.animId); this.animId = null; }
        if(this._quitTimer) { clearTimeout(this._quitTimer); this._quitTimer = null; }
        if(this.ghostTimer) { clearTimeout(this.ghostTimer); this.ghostTimer = null; }
        window.removeEventListener('keydown', this.keyHandler);
        window.removeEventListener('touchstart', this._touchStartHandler);
        window.removeEventListener('touchend', this._touchHandler);
        if(this.pixiApp) {
            try {
                const pc=this.pixiApp.canvas;
                if(pc&&pc.parentNode) pc.parentNode.removeChild(pc);
                this.pixiApp.destroy(true);
            } catch(e) {}
            this.pixiApp=null;
        }
    }
}
