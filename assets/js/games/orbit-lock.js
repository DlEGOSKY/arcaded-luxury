import { CONFIG } from '../config.js';
import { showGameLoader, hideGameLoader } from '../game-loader.js';

export class OrbitLockGame {
    constructor(canvas, audio, onQuit) {
        this.canvas = canvas;
        this.ctx = canvas.ctx;
        this.audio = audio;
        this.onQuit = onQuit;
        this.score = 0;
        this.level = 1;
        this.isRunning = false;
        this.animationId = null;
        this.angle = 0;
        this.speed = 0.05;
        this.targetAngle = 0;
        this.targetWidth = 0.5;
        this.radius = 100;
        this.multiRing = false;
        this.angle2 = Math.PI;
        this.speed2 = -0.07;
        this.mode = 'STANDARD';
        this.combo = 0;
        this.flashTimer = 0;
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.boundHandleInput = this.handleInput.bind(this);
        this.pixiApp = null;
        this._pGfx = null;
        this._usePixi = false;
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('ol-styles-v2')) return;
        const s = document.createElement('style');
        s.id = 'ol-styles-v2';
        s.innerHTML = `
        .ol-hud { position:absolute;top:16px;left:0;right:0;display:flex;justify-content:center;gap:16px;pointer-events:none;z-index:20; }
        .ol-stat { background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:5px 14px;display:flex;flex-direction:column;align-items:center;gap:1px; }
        .ol-stat-lbl { font-size:0.52rem;color:#475569;letter-spacing:2px;font-family:monospace;text-transform:uppercase; }
        .ol-stat-val { font-family:var(--font-display);font-size:0.95rem;color:white; }
        .ol-combo { position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:var(--font-display);font-size:2rem;color:#fbbf24;text-shadow:0 0 20px #fbbf24;pointer-events:none;animation:olCombo 0.5s ease both;z-index:30; }
        @keyframes olCombo { from{opacity:0;transform:translate(-50%,-70%) scale(0.5)} 30%{opacity:1;transform:translate(-50%,-60%) scale(1.3)} to{opacity:0;transform:translate(-50%,-80%) scale(1)} }

        /* Menú de modo */
        .ol-mode-grid { display:flex;gap:14px;justify-content:center;flex-wrap:wrap; }
        .ol-mode-card { width:155px;min-height:155px;background:rgba(10,16,30,0.9);border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:pointer;transition:all 0.15s;padding:18px 12px;position:relative;overflow:hidden;border:1px solid rgba(255,255,255,0.07); }
        .ol-mode-card::before { content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--mc);opacity:0.6; }
        .ol-mode-card:hover { transform:translateY(-4px);border-color:var(--mc);box-shadow:0 8px 24px rgba(0,0,0,0.4); }
        .ol-mode-card:hover::before { opacity:1; }
        `;
        document.head.appendChild(s);
    }

    init() {
        this.cleanup();
        try { this.audio.playBuy(); } catch(e) {}
        this.canvas.setMood('ORBIT');
        this.showModeSelect();
    }

    showModeSelect() {
        const modes = [
            { id:'m-standard', mc:'#a855f7', icon:'fa-circle-dot', name:'ESTÁNDAR',   desc:'Velocidad creciente' },
            { id:'m-dual',     mc:'#ec4899', icon:'fa-infinity',    name:'DUAL',       desc:'2 cursores simultáneos' },
            { id:'m-blitz',    mc:'#fbbf24', icon:'fa-bolt',        name:'BLITZ',      desc:'Zona pequeña desde el inicio' },
        ];
        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;">ORBIT LOCK</div>
                <div style="font-size:0.65rem;color:#a855f7;letter-spacing:3px;font-family:monospace;">SINCRONIZACIÓN ORBITAL</div>
                <div style="width:120px;height:1px;background:#a855f7;margin:10px auto 0;opacity:0.5;"></div>
            </div>
            <div class="ol-mode-grid">
                ${modes.map(m=>`
                <div class="ol-mode-card" id="${m.id}" style="--mc:${m.mc};">
                    <i class="fa-solid ${m.icon}" style="font-size:1.8rem;color:${m.mc};filter:drop-shadow(0 0 8px ${m.mc});"></i>
                    <div style="font-family:var(--font-display);font-size:0.78rem;letter-spacing:2px;color:${m.mc};">${m.name}</div>
                    <div style="font-size:0.6rem;color:#475569;font-family:monospace;letter-spacing:1px;text-transform:uppercase;">${m.desc}</div>
                </div>`).join('')}
            </div>
            <button class="btn btn-secondary" id="btn-ol-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;
        document.getElementById('m-standard').onclick = () => this.startMode('STANDARD');
        document.getElementById('m-dual').onclick     = () => this.startMode('DUAL');
        document.getElementById('m-blitz').onclick    = () => this.startMode('BLITZ');
        document.getElementById('btn-ol-back').onclick = () => { if(this.onQuit)this.onQuit(0); };
    }

    startMode(mode) {
        this.mode = mode;
        this.start();
    }

    async start() {
        this.isRunning = true;
        this.score = 0; this.level = 1; this.combo = 0;
        this.speed = this.mode==='BLITZ' ? 0.08 : 0.05;
        this.radius = Math.min(this.canvas.canvas.width, this.canvas.canvas.height) * 0.25;
        this.multiRing = (this.mode === 'DUAL');

        this.uiContainer.innerHTML = `
            <div class="ol-hud">
                <div class="ol-stat"><div class="ol-stat-lbl">LOCKS</div><div class="ol-stat-val" id="ol-score">0</div></div>
                <div class="ol-stat"><div class="ol-stat-lbl">NIVEL</div><div class="ol-stat-val" id="ol-level">1</div></div>
                <div class="ol-stat"><div class="ol-stat-lbl">COMBO</div><div class="ol-stat-val" id="ol-combo" style="color:#fbbf24;">×1</div></div>
            </div>
            <div id="orbit-click-layer" style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:9000;cursor:pointer;"></div>`;

        this.resetRound();
        this.setupEvents();

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

    setupEvents() {
        this.cleanupEvents();
        const layer = document.getElementById('orbit-click-layer');
        if(layer){
            layer.addEventListener('mousedown', this.boundHandleInput);
            layer.addEventListener('touchstart', this.boundHandleInput, {passive:false});
        }
        window.addEventListener('keydown', this.boundHandleInput);
    }
    cleanupEvents() {
        const layer = document.getElementById('orbit-click-layer');
        if(layer){ layer.removeEventListener('mousedown', this.boundHandleInput); layer.removeEventListener('touchstart', this.boundHandleInput); }
        window.removeEventListener('keydown', this.boundHandleInput);
    }
    cleanup() {
        this.isRunning = false;
        if(this.animationId){ cancelAnimationFrame(this.animationId); this.animationId=null; }
        this.cleanupEvents();
        this.uiContainer.innerHTML='';
        if(this.pixiApp) {
            try {
                const pc=this.pixiApp.canvas;
                if(pc && pc.parentNode) pc.parentNode.removeChild(pc);
                this.pixiApp.destroy(true);
            } catch(e) {}
            this.pixiApp = null;
        }
    }

    resetRound() {
        this.angle = Math.random() * Math.PI * 2;
        this.angle2 = this.angle + Math.PI;
        this.targetAngle = Math.random() * Math.PI * 2;
        const baseWidth = this.mode==='BLITZ' ? 0.3 : 0.6;
        this.targetWidth = Math.max(0.12, baseWidth - (this.level * 0.02));
        const dir = Math.random() > 0.5 ? 1 : -1;
        const spd = (0.05 + (this.level * 0.007));
        this.speed = spd * dir;
        this.speed2 = -spd * dir * 1.2;
    }

    handleInput(e) {
        if(!this.isRunning) return;
        if(e.type==='keydown'&&e.code!=='Space') return;
        if(e.type==='touchstart') e.preventDefault();
        const check = (angle) => {
            let cur = ((angle % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
            let tgt = this.targetAngle;
            let diff = Math.abs(cur-tgt);
            if(diff>Math.PI) diff = Math.PI*2 - diff;
            return diff < this.targetWidth/2;
        };
        const hit1 = check(this.angle);
        const hit2 = this.multiRing ? check(this.angle2) : true;
        if(hit1 && hit2) this.success();
        else this.fail();
    }

    success() {
        this.score++; this.level++; this.combo++;
        const multiplier = Math.min(4, 1 + Math.floor(this.combo/3));
        try{ this.audio.playWin(this.combo>3?5:1); }catch(e){}
        const cx=this.canvas.canvas.width/2, cy=this.canvas.canvas.height/2;
        const x=cx+Math.cos(this.angle)*this.radius, y=cy+Math.sin(this.angle)*this.radius;
        try{ this.canvas.explode(x,y,CONFIG.COLORS.ORBIT||'#a855f7'); }catch(e){}
        // Mostrar combo
        if(this.combo>1){
            const fb=document.createElement('div'); fb.className='ol-combo'; fb.textContent=`×${multiplier} COMBO!`;
            this.uiContainer.appendChild(fb); setTimeout(()=>fb.remove(),600);
        }
        // Actualizar HUD
        const s=document.getElementById('ol-score'); if(s)s.innerText=this.score;
        const l=document.getElementById('ol-level'); if(l)l.innerText=this.level;
        const c=document.getElementById('ol-combo'); if(c){c.innerText=`×${multiplier}`;c.style.color=multiplier>2?'#ef4444':'#fbbf24';}
        this.flashTimer = 5;
        this.resetRound();
    }

    fail() {
        if(!this.isRunning) return;
        try{ this.audio.playLose(); }catch(e){}
        document.body.classList.add('shake-screen');
        setTimeout(()=>document.body.classList.remove('shake-screen'),300);
        this.gameOver();
    }

    loop() {
        if(!this.isRunning) return;
        this.angle += this.speed;
        this.angle2 += this.speed2;
        if(this.flashTimer>0) this.flashTimer--;

        if(this._usePixi && this._pGfx) this._drawPixi();
        else this._drawCanvas();

        this.animationId = requestAnimationFrame(()=>this.loop());
    }

    _drawCanvas() {
        const cx=this.canvas.canvas.width/2, cy=this.canvas.canvas.height/2;
        const ctx=this.ctx;
        const color = CONFIG.COLORS.ORBIT || '#a855f7';
        ctx.beginPath(); ctx.arc(cx,cy,this.radius,0,Math.PI*2);
        ctx.strokeStyle='rgba(168,85,247,0.12)'; ctx.lineWidth=22; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx,cy,this.radius,this.targetAngle-this.targetWidth/2,this.targetAngle+this.targetWidth/2);
        ctx.strokeStyle=this.flashTimer>0?'#fff':color; ctx.lineWidth=22;
        ctx.shadowBlur=this.flashTimer>0?30:12; ctx.shadowColor=this.flashTimer>0?'#fff':color;
        ctx.stroke(); ctx.shadowBlur=0;
        const drawCursor=(angle,col)=>{
            const x=cx+Math.cos(angle)*this.radius, y=cy+Math.sin(angle)*this.radius;
            ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);
            ctx.fillStyle=col;ctx.shadowBlur=20;ctx.shadowColor=col;ctx.fill();ctx.shadowBlur=0;
            ctx.beginPath();ctx.arc(cx,cy,this.radius,angle-0.15,angle);
            ctx.strokeStyle=col+'60';ctx.lineWidth=8;ctx.stroke();
        };
        drawCursor(this.angle,'#fff');
        if(this.multiRing) drawCursor(this.angle2,'#ec4899');
    }

    _drawPixi() {
        const g=this._pGfx; g.clear();
        const cx=this.canvas.canvas.width/2, cy=this.canvas.canvas.height/2;
        const color = 0xa855f7;
        const flash = this.flashTimer>0;

        // Ring de fondo
        g.circle(cx,cy,this.radius).stroke({color, alpha:0.12, width:22});

        // Gradiente exterior del ring (halo)
        g.circle(cx,cy,this.radius+14).stroke({color, alpha:0.06, width:6});
        g.circle(cx,cy,this.radius-14).stroke({color, alpha:0.06, width:6});

        // Zona objetivo (arco)
        const zoneColor = flash ? 0xffffff : color;
        const start = this.targetAngle - this.targetWidth/2;
        const end   = this.targetAngle + this.targetWidth/2;
        g.arc(cx, cy, this.radius, start, end)
         .stroke({color: zoneColor, width: 22, alpha: flash?1:0.95});
        // Halo de la zona
        g.arc(cx, cy, this.radius, start, end)
         .stroke({color: zoneColor, width: 34, alpha: flash?0.5:0.25});
        if(flash) {
            g.arc(cx, cy, this.radius, start, end)
             .stroke({color: 0xffffff, width: 50, alpha: 0.15});
        }

        // Cursor principal + estela
        const drawCursor = (angle, col) => {
            const x = cx+Math.cos(angle)*this.radius;
            const y = cy+Math.sin(angle)*this.radius;
            // Estela
            g.arc(cx, cy, this.radius, angle-0.25, angle)
             .stroke({color: col, width: 8, alpha: 0.35});
            // Halo del cursor
            g.circle(x, y, 18).fill({color: col, alpha: 0.18});
            g.circle(x, y, 12).fill({color: col, alpha: 0.35});
            // Núcleo
            g.circle(x, y, 7).fill({color: col});
        };
        drawCursor(this.angle, 0xffffff);
        if(this.multiRing) drawCursor(this.angle2, 0xec4899);
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


    gameOver() { this.cleanup(); if(this.onQuit)this.onQuit(this.score); }
}
