import { CONFIG } from '../config.js';

export class OrbitLockGame {
    // NOTA: onQuit es el Smart Callback
    constructor(canvas, audio, onQuit) {
        this.canvas = canvas;
        this.ctx = canvas.ctx;
        this.audio = audio;
        this.onQuit = onQuit;
        
        this.score = 0;
        this.level = 1;
        this.isRunning = false;
        this.animationId = null;
        
        // Variables de juego
        this.angle = 0;
        this.speed = 0.05;
        this.targetAngle = 0;
        this.targetWidth = 0.5;
        this.radius = 100;
        
        this.uiContainer = document.getElementById('game-ui-overlay');
        
        // Bindings fijos para poder añadir/quitar listeners correctamente
        this.boundHandleInput = this.handleInput.bind(this);
    }

    init() {
        // 1. LIMPIEZA TOTAL PREVIA
        this.cleanup();
        
        // 2. Audio Seguro
        try { this.audio.playBuy(); } catch(e) {}
        this.canvas.setMood('ORBIT');
        
        this.start();
    }

    start() {
        this.isRunning = true;
        this.score = 0;
        this.level = 1;
        this.speed = 0.05;
        
        // Ajustar radio dinámicamente
        this.radius = Math.min(this.canvas.canvas.width, this.canvas.canvas.height) * 0.25;
        
        // Render UI
        this.uiContainer.innerHTML = `
            <div style="position:absolute; top:20px; width:100%; text-align:center; pointer-events:none; font-family:var(--font-display); font-size:1.5rem; text-shadow:0 0 10px var(--orbit);">
                LOCKS <span id="ol-score" style="color:#fff">0</span>
            </div>
            <div id="orbit-click-layer" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:9000; cursor:pointer;"></div>
        `;
        
        this.resetRound();
        this.setupEvents();
        this.loop();
    }

    setupEvents() {
        this.cleanupEvents();
        const layer = document.getElementById('orbit-click-layer');
        if (layer) {
            layer.addEventListener('mousedown', this.boundHandleInput);
            layer.addEventListener('touchstart', this.boundHandleInput, {passive: false});
        }
        window.addEventListener('keydown', this.boundHandleInput);
    }

    cleanupEvents() {
        const layer = document.getElementById('orbit-click-layer');
        if (layer) {
            layer.removeEventListener('mousedown', this.boundHandleInput);
            layer.removeEventListener('touchstart', this.boundHandleInput);
        }
        window.removeEventListener('keydown', this.boundHandleInput);
    }

    cleanup() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.cleanupEvents();
        this.uiContainer.innerHTML = ''; 
    }

    resetRound() {
        this.angle = Math.random() * Math.PI * 2;
        this.targetAngle = Math.random() * Math.PI * 2;
        this.targetWidth = Math.max(0.2, 0.6 - (this.level * 0.03)); 
        this.speed = (0.05 + (this.level * 0.008)) * (Math.random() > 0.5 ? 1 : -1); 
    }

    handleInput(e) {
        if(!this.isRunning) return;
        if(e.type === 'keydown' && e.code !== 'Space') return; 
        if(e.type === 'touchstart') e.preventDefault(); 

        let current = (this.angle % (Math.PI * 2));
        if (current < 0) current += Math.PI * 2;
        
        let target = this.targetAngle;
        let diff = Math.abs(current - target);
        if (diff > Math.PI) diff = (Math.PI * 2) - diff; 

        if (diff < this.targetWidth / 2) {
            this.success();
        } else {
            this.fail();
        }
    }

    success() {
        this.score++;
        this.level++;
        try { this.audio.playWin(1); } catch(e) {}
        
        const scoreEl = document.getElementById('ol-score');
        if(scoreEl) scoreEl.innerText = this.score;
        
        const cx = this.canvas.canvas.width / 2;
        const cy = this.canvas.canvas.height / 2;
        const x = cx + Math.cos(this.angle) * this.radius;
        const y = cy + Math.sin(this.angle) * this.radius;
        
        try { this.canvas.explode(x, y, CONFIG.COLORS.ORBIT); } catch(e) {}
        
        this.resetRound();
    }

    fail() {
        if (!this.isRunning) return; 
        try { this.audio.playLose(); } catch(e) {}
        document.body.classList.add('shake-screen');
        setTimeout(() => document.body.classList.remove('shake-screen'), 300);
        this.gameOver();
    }

    loop() {
        if(!this.isRunning) return;
        
        this.angle += this.speed;
        const cx = this.canvas.canvas.width / 2;
        const cy = this.canvas.canvas.height / 2;
        const ctx = this.ctx;

        // Dibujar Anillo Base
        ctx.beginPath();
        ctx.arc(cx, cy, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 20;
        ctx.stroke();

        // Dibujar Zona Objetivo
        ctx.beginPath();
        ctx.arc(cx, cy, this.radius, this.targetAngle - this.targetWidth/2, this.targetAngle + this.targetWidth/2);
        ctx.strokeStyle = CONFIG.COLORS.ORBIT || '#a855f7'; 
        ctx.lineWidth = 20;
        ctx.shadowBlur = 15;
        ctx.shadowColor = CONFIG.COLORS.ORBIT || '#a855f7';
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Dibujar Cursor
        const curX = cx + Math.cos(this.angle) * this.radius;
        const curY = cy + Math.sin(this.angle) * this.radius;
        
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(curX, curY, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
        ctx.fill();
        ctx.shadowBlur = 0;

        this.animationId = requestAnimationFrame(() => this.loop());
    }

    // --- CORRECCIÓN FINAL ---
    gameOver() {
        this.cleanup(); 
        
        // Simplemente llamamos al main con el puntaje
        // El main calculará los premios, guardará el highscore y mostrará la tarjeta
        if (this.onQuit) this.onQuit(this.score);
    }
}