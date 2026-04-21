import { CONFIG } from '../config.js';
import { showGameLoader, hideGameLoader } from '../game-loader.js';

export class CyberPongGame {
    constructor(canvasManager, audioController, onGameOver) {
        this.canvasManager = canvasManager;
        this.audio = audioController;
        this.onGameOver = onGameOver;
        this.animationId = null;
        this.pixiApp = null;

        // Configuración
        this.paddleHeight = 80;
        this.paddleWidth = 12;
        this.ballSize = 8;

        // Estado
        this.playerY = 0;
        this.aiY = 0;
        this.ball = { x: 0, y: 0, dx: 0, dy: 0, speed: 0 };
        this.score = 0;
        this.lives = 3;
        this.isPlaying = false;
        this.difficulty = 1;
        this.mode = "NORMAL";
        this.uiContainer = document.getElementById("game-ui-overlay");

        // Trail de la bola
        this._trail = [];
        this._trailMax = 12;

        // Control de Teclado
        this.keys = { up: false, down: false };
    }

    init() {
        this.showModeSelect();
    }

    showModeSelect() {
        if(!this.uiContainer) this.uiContainer = document.getElementById('game-ui-overlay');
        const modes = [
            { id:'pong-normal', mc:'#3b82f6', icon:'fa-table-tennis-paddle-ball', name:'NORMAL',    desc:'Dificultad progresiva'                 },
            { id:'pong-fast',   mc:'#ef4444', icon:'fa-forward-fast',             name:'TURBO',     desc:'Bola x2 velocidad · 5 vidas'           },
            { id:'pong-chaos',  mc:'#a855f7', icon:'fa-tornado',                  name:'CAOS',      desc:'Bola acelera tras cada golpe'          },
            { id:'pong-tour',   mc:'#fbbf24', icon:'fa-trophy',                   name:'TORNEO',    desc:'Mejor de 3 sets · first-to-5 rallies' },
        ];
        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;background:rgba(0,0,10,0.5);">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;">CYBER PONG</div>
                <div style="font-size:0.65rem;color:#3b82f6;letter-spacing:3px;font-family:monospace;">PROTOCOLO DE COLISIÓN</div>
                <div style="width:120px;height:1px;background:#3b82f6;margin:10px auto 0;opacity:0.5;"></div>
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
            <button class="btn btn-secondary" id="pong-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;
        document.getElementById('pong-normal').onclick = () => this.startWithMode('NORMAL');
        document.getElementById('pong-fast').onclick   = () => this.startWithMode('TURBO');
        document.getElementById('pong-chaos').onclick  = () => this.startWithMode('CHAOS');
        document.getElementById('pong-tour').onclick   = () => this.startWithMode('TOURNAMENT');
        document.getElementById('pong-back').onclick   = () => { if(this.onGameOver) this.onGameOver(0); };
    }

    async startWithMode(mode) {
        this.mode = mode;
        if(this.uiContainer) this.uiContainer.innerHTML = '';

        const W = this.canvasManager.canvas.width  || window.innerWidth;
        const H = this.canvasManager.canvas.height || (window.innerHeight - 56);

        this.playerY = H / 2 - this.paddleHeight / 2;
        this.aiY     = H / 2 - this.paddleHeight / 2;
        this.resetBallWH(W, H);
        this.lives      = mode === 'TURBO' ? 5 : 3;
        this.score      = 0;
        this.difficulty = mode === 'TURBO' ? 2 : mode === 'TOURNAMENT' ? 1.5 : 1;
        this.isPlaying  = true;
        // TORNEO: mejor de 3 sets (first to 5 rallies each)
        this.sets = { player: 0, ai: 0 };
        this.setScore = { player: 0, ai: 0 };
        this.pointsPerSet = 5;
        this.setsToWin = 2;

        if (window.app && window.app.canvas) window.app.canvas.pauseBackground();

        // ── Pixi Application ──────────────────────────────────────────────
        if (typeof PIXI === 'undefined') {
            // Fallback a Canvas 2D si Pixi no cargó
            this.ctx    = this.canvasManager.ctx;
            this.canvas = this.canvasManager.canvas;
            this._pixiFailed = true;
        } else {
            this._pixiFailed = false;
            const _loader = showGameLoader('INICIALIZANDO RENDER');
            try {
                this.pixiApp = new PIXI.Application();
                await this.pixiApp.init({
                    width: W, height: H,
                    backgroundAlpha: 0,
                    antialias: true,
                    resolution: window.devicePixelRatio || 1,
                    autoDensity: true,
                });
                // Montar canvas Pixi encima del canvas principal
                const pixiCanvas = this.pixiApp.canvas;
                pixiCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:5;pointer-events:none;';
                const gameScreen = document.getElementById('screen-game');
                if(gameScreen) gameScreen.appendChild(pixiCanvas);

                this._buildPixiScene(W, H);
            } catch(e) {
                // Degradar a canvas 2D si Pixi falla
                this.ctx    = this.canvasManager.ctx;
                this.canvas = this.canvasManager.canvas;
                this._pixiFailed = true;
            }
            hideGameLoader(_loader);
        }

        // ── Eventos ───────────────────────────────────────────────────────
        const target = this._pixiFailed ? this.canvasManager.canvas : document.getElementById('screen-game') || document.body;
        this.moveHandler = (e) => {
            const rect = target.getBoundingClientRect();
            this.playerY = (e.clientY - rect.top) - this.paddleHeight / 2;
        };
        this.keyDownHandler = (e) => {
            if (e.key==='ArrowUp'  ||e.key==='w'||e.key==='W') this.keys.up   = true;
            if (e.key==='ArrowDown'||e.key==='s'||e.key==='S') this.keys.down = true;
        };
        this.keyUpHandler = (e) => {
            if (e.key==='ArrowUp'  ||e.key==='w'||e.key==='W') this.keys.up   = false;
            if (e.key==='ArrowDown'||e.key==='s'||e.key==='S') this.keys.down = false;
        };
        this.touchHandler = (e) => {
            e.preventDefault();
            const rect = target.getBoundingClientRect();
            this.playerY = e.touches[0].clientY - rect.top - this.paddleHeight / 2;
        };
        target.addEventListener('mousemove',  this.moveHandler);
        target.addEventListener('touchmove',  this.touchHandler, {passive:false});
        window.addEventListener('keydown', this.keyDownHandler);
        window.addEventListener('keyup',   this.keyUpHandler);
        this._eventTarget = target;

        this.loop();
    }

    _buildPixiScene(W, H) {
        const app = this.pixiApp;
        const stage = app.stage;

        // Línea central
        const center = new PIXI.Graphics();
        for(let y=0; y<H; y+=25) {
            center.rect(W/2-1, y, 2, 12).fill({color:0xffffff, alpha:0.15});
        }
        stage.addChild(center);

        // Paddle jugador (verde neón)
        this._gfxPlayer = new PIXI.Graphics();
        stage.addChild(this._gfxPlayer);

        // Paddle IA (rojo)
        this._gfxAI = new PIXI.Graphics();
        stage.addChild(this._gfxAI);

        // Trail container
        this._trailContainer = new PIXI.Container();
        stage.addChild(this._trailContainer);

        // Bola
        this._gfxBall = new PIXI.Graphics();
        stage.addChild(this._gfxBall);

        // Score text
        this._txtScore = new PIXI.Text({ text: '0', style: {
            fontFamily: 'Orbitron, monospace', fontSize: 42,
            fill: 0xffffff, align: 'center', dropShadow: {
                color: 0x3b82f6, blur: 20, distance: 0, alpha: 0.8
            }
        }});
        this._txtScore.anchor.set(0.5, 0);
        this._txtScore.position.set(W/2, 12);
        stage.addChild(this._txtScore);

        // Lives / Sets text
        this._txtLives = new PIXI.Text({ text: '● ● ●', style: {
            fontFamily: 'Orbitron, monospace', fontSize: 14,
            fill: 0xef4444, letterSpacing: 3
        }});
        this._txtLives.anchor.set(0.5, 0);
        this._txtLives.position.set(W/2, 58);
        stage.addChild(this._txtLives);

        this._W = W; this._H = H;
    }

    _drawPixi() {
        const W = this._W, H = this._H;
        const pw = this.paddleWidth, ph = this.paddleHeight;

        // Trail de la bola
        this._trail.push({x: this.ball.x, y: this.ball.y});
        if(this._trail.length > this._trailMax) this._trail.shift();
        this._trailContainer.removeChildren();
        this._trail.forEach((p, i) => {
            const alpha = (i / this._trailMax) * 0.55;
            const r     = this.ballSize * (i / this._trailMax) * 0.9;
            const g = new PIXI.Graphics();
            g.circle(p.x, p.y, Math.max(1, r)).fill({color: 0xffffff, alpha});
            this._trailContainer.addChild(g);
        });

        // Paddle jugador
        this._gfxPlayer.clear();
        this._gfxPlayer
            .roundRect(20, this.playerY, pw, ph, 4)
            .fill({color: 0x00ff88})
            .roundRect(18, this.playerY - 2, pw + 4, ph + 4, 6)
            .fill({color: 0x00ff88, alpha: 0.15});

        // Paddle IA
        this._gfxAI.clear();
        this._gfxAI
            .roundRect(W - 20 - pw, this.aiY, pw, ph, 4)
            .fill({color: 0xef4444})
            .roundRect(W - 22 - pw, this.aiY - 2, pw + 4, ph + 4, 6)
            .fill({color: 0xef4444, alpha: 0.15});

        // Bola con halo
        this._gfxBall.clear();
        this._gfxBall
            .circle(this.ball.x, this.ball.y, this.ballSize * 2.2)
            .fill({color: 0xffffff, alpha: 0.12})
            .circle(this.ball.x, this.ball.y, this.ballSize)
            .fill({color: 0xffffff});

        // Score / Sets según modo
        if(this.mode === 'TOURNAMENT') {
            this._txtScore.text = `${this.setScore.player} - ${this.setScore.ai}`;
            this._txtScore.style.fill = 0xfbbf24;
            // Marcadores de sets ganados: bullet dorado = set, hueco = pendiente
            let pSets = '';
            for(let i=0;i<this.setsToWin;i++) pSets += (i < this.sets.player ? '●' : '○') + ' ';
            let aSets = '';
            for(let i=0;i<this.setsToWin;i++) aSets += (i < this.sets.ai ? '●' : '○') + ' ';
            this._txtLives.text = `${pSets.trim()}  SETS  ${aSets.trim()}`;
            this._txtLives.style.fill = 0xfbbf24;
        } else {
            this._txtScore.text = String(this.score);
            this._txtScore.style.fill = 0xffffff;
            let dots = '';
            for(let i=0;i<this.lives;i++) dots += '● ';
            this._txtLives.text = dots.trim();
            this._txtLives.style.fill = 0xef4444;
        }
    }

    _spawnParticles(x, y, color) {
        if(!this.pixiApp) return;
        const stage = this.pixiApp.stage;
        for(let i=0; i<10; i++) {
            const p = new PIXI.Graphics();
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            let vx = Math.cos(angle)*speed, vy = Math.sin(angle)*speed;
            let alpha = 0.9;
            p.circle(0, 0, 3 + Math.random()*3).fill({color, alpha});
            p.x = x; p.y = y;
            stage.addChild(p);
            const tick = () => {
                p.x += vx; p.y += vy;
                vx *= 0.9; vy *= 0.9;
                alpha -= 0.05;
                p.alpha = Math.max(0, alpha);
                if(alpha <= 0) { stage.removeChild(p); return; }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }
    }

    resetBall() { this.resetBallWH(this._W || this.canvasManager.canvas.width, this._H || this.canvasManager.canvas.height); }
    resetBallWH(W, H) {
        this.ball.x = W / 2;
        this.ball.y = H / 2;
        const baseSpeed = this.mode === 'TURBO' ? 10 : this.mode === 'CHAOS' ? 5 : 6;
        this.ball.speed = baseSpeed + (this.score * 0.5);
        this.ball.dx = (Math.random() > 0.5 ? 1 : -1) * this.ball.speed;
        this.ball.dy = (Math.random() * 2 - 1) * this.ball.speed;
    }

    update() {
        if(!this.isPlaying) return;
        const W = this._W || this.canvasManager.canvas.width;
        const H = this._H || this.canvasManager.canvas.height;

        if (this.keys.up)   this.playerY -= 10;
        if (this.keys.down) this.playerY += 10;
        if(this.playerY < 0) this.playerY = 0;
        if(this.playerY > H - this.paddleHeight) this.playerY = H - this.paddleHeight;

        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;

        if(this.ball.y < 0 || this.ball.y > H) {
            this.ball.dy *= -1;
            try{ this.audio.playTone(200,'square',0.05); }catch(e){}
        }

        // IA predictiva
        const aiSpeed = 5 + this.difficulty;
        let targetY;
        if(this.ball.dx > 0) {
            let bx=this.ball.x, by=this.ball.y, bdx=this.ball.dx, bdy=this.ball.dy;
            const aiX = W - this.paddleWidth - 20;
            let steps=0;
            while(bx < aiX && steps < 200) {
                bx+=bdx; by+=bdy; steps++;
                if(by<0){by=-by;bdy=-bdy;}
                if(by>H){by=2*H-by;bdy=-bdy;}
            }
            const err = (Math.random()-0.5)*Math.max(0,40-this.difficulty*8);
            const chaos = this.mode==='CHAOS'?(Math.random()-0.5)*60:0;
            targetY = by + err + chaos;
        } else { targetY = H/2; }
        const diff = targetY - (this.aiY + this.paddleHeight/2);
        if(Math.abs(diff)>4) this.aiY += Math.sign(diff)*Math.min(aiSpeed,Math.abs(diff));
        if(this.aiY<0) this.aiY=0;
        if(this.aiY>H-this.paddleHeight) this.aiY=H-this.paddleHeight;

        // Colisión jugador
        if(this.ball.x < 20+this.paddleWidth) {
            if(this.ball.y>this.playerY && this.ball.y<this.playerY+this.paddleHeight) {
                this.ball.dx *= this.mode==="CHAOS"?-1.22:-1.1;
                this.ball.x = 20+this.paddleWidth;
                try{ this.audio.playTone(400,'square',0.1); }catch(e){}
                this._spawnParticles(this.ball.x, this.ball.y, 0x00ff88);
            } else if(this.ball.x<0) {
                // Punto para la IA
                try{ this.audio.playLose(); }catch(e){}
                this._spawnParticles(0, this.ball.y, 0xef4444);
                if(this.mode === 'TOURNAMENT') {
                    this.setScore.ai++;
                    if(this.setScore.ai >= this.pointsPerSet) { this._endSet('ai'); } else { this.resetBall(); }
                } else {
                    this.lives--;
                    if(this.lives<=0) this.end(); else this.resetBall();
                }
            }
        }

        // Colisión IA
        if(this.ball.x > W-20-this.paddleWidth) {
            if(this.ball.y>this.aiY && this.ball.y<this.aiY+this.paddleHeight) {
                this.ball.dx *= this.mode==="CHAOS"?-1.22:-1.1;
                this.ball.x = W-20-this.paddleWidth;
                try{ this.audio.playTone(300,'square',0.1); }catch(e){}
            } else if(this.ball.x>W) {
                // Punto para jugador
                this.score++; this.difficulty+=0.3;
                try{ this.audio.playWin(5); }catch(e){}
                this._spawnParticles(W, this.ball.y, 0xfbbf24);
                if(this.mode === 'TOURNAMENT') {
                    this.setScore.player++;
                    if(this.setScore.player >= this.pointsPerSet) { this._endSet('player'); } else { this.resetBall(); }
                } else {
                    this.resetBall();
                }
            }
        }
    }

    _endSet(winner) {
        this.sets[winner]++;
        try { this.audio.playWin(winner==='player'?8:2); } catch(e){}
        // Mostrar toast del set
        try {
            const msg = winner === 'player' ? '¡SET GANADO!' : 'SET PERDIDO';
            const type = winner === 'player' ? 'success' : 'danger';
            window.app.showToast(msg, `Sets ${this.sets.player}-${this.sets.ai}`, type);
        } catch(e) {}
        // ¿Match terminado?
        if(this.sets.player >= this.setsToWin || this.sets.ai >= this.setsToWin) {
            this.end();
            return;
        }
        // Reset para siguiente set
        this.setScore = { player: 0, ai: 0 };
        this.difficulty = 1.5;
        setTimeout(() => this.resetBall(), 800);
    }

    draw() {
        if(!this._pixiFailed) { this._drawPixi(); return; }
        // Fallback Canvas 2D
        const ctx=this.ctx, W=this.canvas.width, H=this.canvas.height;
        ctx.clearRect(0,0,W,H);
        ctx.setLineDash([10,15]); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H);
        ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle='#00ff88'; ctx.shadowBlur=15; ctx.shadowColor='#00ff88';
        ctx.fillRect(20,this.playerY,this.paddleWidth,this.paddleHeight);
        ctx.fillStyle='#ef4444'; ctx.shadowColor='#ef4444';
        ctx.fillRect(W-20-this.paddleWidth,this.aiY,this.paddleWidth,this.paddleHeight);
        ctx.fillStyle='#fff'; ctx.shadowColor='#fff';
        ctx.beginPath(); ctx.arc(this.ball.x,this.ball.y,this.ballSize,0,Math.PI*2); ctx.fill();
        ctx.shadowBlur=0; ctx.fillStyle='rgba(255,255,255,0.8)';
        ctx.font="bold 40px 'Courier New'"; ctx.textAlign='center';
        ctx.fillText(this.score,W/2,50);
    }

    loop() {
        if(!this.isPlaying) return;
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(()=>this.loop());
    }

    pause() {
        if(!this.isPlaying) return;
        this._wasPaused = true;
        if(this.animationId){ cancelAnimationFrame(this.animationId); this.animationId=null; }
        if(this.pixiApp) this.pixiApp.stop();
    }
    resume() {
        if(!this._wasPaused) return;
        this._wasPaused = false;
        if(this.pixiApp) this.pixiApp.start();
        if(this.isPlaying) this.animationId = requestAnimationFrame(()=>this.loop());
    }

    end() {
        this.isPlaying = false;
        // Bonus TORNEO: +50 CR por set ganado, +200 CR si gana el match
        if(this.mode === 'TOURNAMENT') {
            const matchWon = this.sets.player >= this.setsToWin;
            const bonus = (this.sets.player * 50) + (matchWon ? 200 : 0);
            if(bonus > 0) {
                try { window.app.credits += bonus; window.app.save(); } catch(e){}
                try {
                    const title = matchWon ? 'CHAMPION' : 'TORNEO FINALIZADO';
                    window.app.showToast(title, `+${bonus} CR · Sets: ${this.sets.player}-${this.sets.ai}`, matchWon ? 'success' : 'gold');
                    const vc = document.getElementById('val-credits'); if(vc) vc.innerText = window.app.credits;
                } catch(e){}
            }
        }
        this.cleanup();
        if(this.onGameOver) this.onGameOver(this.score);
    }

    cleanup() {
        this.isPlaying = false;
        if(this.animationId){ cancelAnimationFrame(this.animationId); this.animationId=null; }
        const t = this._eventTarget;
        if(t){ t.removeEventListener('mousemove',this.moveHandler); t.removeEventListener('touchmove',this.touchHandler); }
        window.removeEventListener('keydown',this.keyDownHandler);
        window.removeEventListener('keyup',this.keyUpHandler);
        if(this.pixiApp) {
            try{
                const pixiCanvas = this.pixiApp.canvas;
                if(pixiCanvas && pixiCanvas.parentNode) pixiCanvas.parentNode.removeChild(pixiCanvas);
                this.pixiApp.destroy(true);
            }catch(e){}
            this.pixiApp = null;
        }
        if(window.app && window.app.canvas) window.app.canvas.resumeBackground();
    }
}