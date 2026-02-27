import { CONFIG } from '../config.js';

export class OrbitTrackerGame {
    constructor(canvas, audio, onQuit) {
        this.canvas = canvas;
        this.ctx = canvas.ctx;
        this.audio = audio;
        this.onQuit = onQuit;
        
        this.score = 0;
        this.startTime = 0;
        this.isRunning = false;
        this.animationId = null;
        
        this.mouseX = 0; this.mouseY = 0;
        this.target = { x: 0, y: 0, tx: 0, ty: 0, radius: 40 };
        this.energy = 50; 
        this.isTracking = false;

        this.uiContainer = document.getElementById('game-ui-overlay');
        this.handleMove = this.handleMove.bind(this);
    }

    init() {
        if(window.app.credits < 10) {
            try { window.app.showToast("FONDOS INSUFICIENTES", "Costo: $10", "danger"); } catch(e) {}
            // Salida segura
            if(this.onQuit) this.onQuit(0);
            return;
        }
        window.app.credits -= 10;
        document.getElementById('val-credits').innerText = window.app.credits;
        
        this.audio.playBuy();
        this.canvas.setMood('TRACKER');
        this.start();
    }

    start() {
        this.isRunning = true;
        this.score = 0;
        this.energy = 50;
        this.startTime = Date.now();
        
        const w = this.canvas.canvas.width;
        const h = this.canvas.canvas.height;
        this.target.x = w / 2; this.target.y = h / 2;
        this.pickNewDestination();
        this.mouseX = w / 2; this.mouseY = h / 2;

        this.uiContainer.innerHTML = '';
        const hud = document.createElement('div');
        hud.innerHTML = `
            <div style="position:absolute; top:20px; width:100%; text-align:center; pointer-events:none; font-family:var(--font-display);">
                <div style="font-size:1.5rem;">TIEMPO: <span id="ot-score">0.0</span>s</div>
                <div style="width:200px; height:10px; background:#334155; margin:10px auto; border-radius:5px; overflow:hidden;">
                    <div id="ot-bar" style="width:50%; height:100%; background:${CONFIG.COLORS.TRACKER}; transition: width 0.1s;"></div>
                </div>
            </div>`;
        this.uiContainer.appendChild(hud);

        window.addEventListener('mousemove', this.handleMove);
        window.addEventListener('touchmove', this.handleMove, { passive: false });
        this.loop();
    }

    handleMove(e) {
        if(!this.isRunning) return;
        const rect = this.canvas.canvas.getBoundingClientRect();
        if(e.touches) {
            this.mouseX = e.touches[0].clientX - rect.left;
            this.mouseY = e.touches[0].clientY - rect.top;
            e.preventDefault();
        } else {
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        }
    }

    pickNewDestination() {
        const w = this.canvas.canvas.width;
        const h = this.canvas.canvas.height;
        const pad = 60;
        this.target.tx = pad + Math.random() * (w - pad*2);
        this.target.ty = pad + Math.random() * (h - pad*2);
    }

    loop() {
        if(!this.isRunning) return;

        const difficulty = 1 + (this.score * 0.05);
        const lerpSpeed = 0.02 * difficulty; 
        
        this.target.x += (this.target.tx - this.target.x) * lerpSpeed;
        this.target.y += (this.target.ty - this.target.y) * lerpSpeed;

        const distToDest = Math.hypot(this.target.tx - this.target.x, this.target.ty - this.target.y);
        if (distToDest < 20) this.pickNewDestination();

        const distToMouse = Math.hypot(this.mouseX - this.target.x, this.mouseY - this.target.y);
        this.isTracking = distToMouse < this.target.radius;

        if (this.isTracking) {
            this.energy = Math.min(100, this.energy + 0.5);
            if(Math.random() > 0.8) this.canvas.explode(this.target.x, this.target.y, CONFIG.COLORS.TRACKER);
        } else {
            this.energy = Math.max(0, this.energy - 0.8);
        }

        const now = Date.now();
        this.score = (now - this.startTime) / 1000;
        document.getElementById('ot-score').innerText = this.score.toFixed(1);
        
        const bar = document.getElementById('ot-bar');
        if(bar) {
            bar.style.width = `${this.energy}%`;
            bar.style.backgroundColor = this.energy < 20 ? '#ef4444' : CONFIG.COLORS.TRACKER;
        }

        if (this.energy <= 0) {
            this.gameOver();
            return;
        }

        // Draw
        this.ctx.beginPath();
        this.ctx.arc(this.target.x, this.target.y, this.target.radius, 0, Math.PI * 2);
        this.ctx.shadowBlur = this.isTracking ? 30 : 10;
        this.ctx.shadowColor = CONFIG.COLORS.TRACKER;
        this.ctx.fillStyle = this.isTracking ? '#fff' : 'rgba(34, 211, 238, 0.2)';
        this.ctx.fill();
        this.ctx.strokeStyle = CONFIG.COLORS.TRACKER;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        if (this.isTracking) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.mouseX, this.mouseY);
            this.ctx.lineTo(this.target.x, this.target.y);
            this.ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            this.ctx.stroke();
        }

        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath(); this.ctx.arc(this.mouseX, this.mouseY, 5, 0, Math.PI*2); this.ctx.fill();

        this.animationId = requestAnimationFrame(() => this.loop());
    }

    // --- CORRECCIÓN FINAL ---
    gameOver() {
        this.isRunning = false;
        if(this.animationId) cancelAnimationFrame(this.animationId);
        window.removeEventListener('mousemove', this.handleMove);
        window.removeEventListener('touchmove', this.handleMove);

        this.audio.playLose();
        
        // Pasamos el puntaje (segundos) al main
        // El main calculará los premios si configuras una fórmula para este juego o si es score plano
        if (this.onQuit) this.onQuit(parseFloat(this.score.toFixed(1)));
    }
}