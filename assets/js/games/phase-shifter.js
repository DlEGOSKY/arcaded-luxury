import { CONFIG } from '../config.js';

export class PhaseShifterGame {
    // NOTA: 'onQuit' es el Smart Callback del main.js
    constructor(canvas, audio, onQuit) {
        this.audio = audio; // No usamos canvas 2D, solo DOM
        this.onQuit = onQuit;
        
        this.score = 0;
        this.isRunning = false;
        this.cursorPos = 50; 
        this.speed = 1.5;    
        this.direction = 1;
        this.zoneWidth = 30; 
        this.animationId = null;
        
        this.uiContainer = document.getElementById('game-ui-overlay');
        
        this.handleInput = this.handleInput.bind(this);
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('phase-styles')) return;
        const style = document.createElement('style');
        style.id = 'phase-styles';
        // ... (ESTILOS SIN CAMBIOS) ...
        style.innerHTML = `
            .phase-track { width: 100%; max-width: 600px; height: 60px; background: rgba(255,255,255,0.05); border: 2px solid #334155; border-radius: 30px; position: relative; overflow: hidden; box-shadow: inset 0 0 20px rgba(0,0,0,0.5); }
            .phase-zone { position: absolute; top: 0; height: 100%; background: rgba(236, 72, 153, 0.3); border-left: 2px solid #ec4899; border-right: 2px solid #ec4899; left: 50%; transform: translateX(-50%); box-shadow: 0 0 15px rgba(236, 72, 153, 0.4); transition: width 0.2s ease; }
            .phase-cursor { position: absolute; top: 0; bottom: 0; width: 4px; background: #fff; box-shadow: 0 0 15px white; left: 0%; transform: translateX(-50%); z-index: 10; }
            .phase-grid { position: absolute; top:0; left:0; width:100%; height:100%; background-image: linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 20px 100%; pointer-events: none; }
            .phase-score { font-family: var(--font-display); font-size: 4rem; color: #ec4899; text-shadow: 0 0 20px rgba(236, 72, 153, 0.5); margin-bottom: 20px; }
            .phase-msg { color: #94a3b8; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 2px; margin-top: 10px; opacity: 0.8; animation: blink 2s infinite; }
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
        
        window.app.credits -= 10;
        document.getElementById('val-credits').innerText = window.app.credits;
        
        try { this.audio.playBuy(); } catch(e) {}
        
        this.start();
    }

    start() {
        this.isRunning = true;
        this.score = 0;
        this.speed = 1.0;     
        this.zoneWidth = 40;  
        this.cursorPos = 0;
        this.direction = 1;
        
        this.uiContainer.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; width:100%;">
                <div class="phase-score" id="ps-score">0</div>
                <div class="phase-track" id="track">
                    <div class="phase-grid"></div>
                    <div class="phase-zone" id="zone" style="width: ${this.zoneWidth}%;"></div>
                    <div class="phase-cursor" id="cursor" style="left: 0%;"></div>
                </div>
                <div class="phase-msg">¡DETÉN EN EL CENTRO!</div>
                <div style="font-size:0.7rem; color:#555; margin-top:5px;">ESPACIO / CLICK</div>
            </div>
            <div id="phase-click-layer" style="position:fixed; top:0; left:0; width:100%; height:100%; z-index:9000; cursor:pointer;"></div>
        `;
        
        const layer = document.getElementById('phase-click-layer');
        if(layer) {
            layer.addEventListener('mousedown', this.handleInput);
            layer.addEventListener('touchstart', (e) => { e.preventDefault(); this.handleInput(e); });
        }
        window.addEventListener('keydown', this.handleInput);
        
        this.loop();
    }

    handleInput(e) {
        if(!this.isRunning) return;
        if(e.type === 'keydown' && e.code !== 'Space') return;

        const halfZone = this.zoneWidth / 2;
        const lowerBound = 50 - halfZone;
        const upperBound = 50 + halfZone;
        
        if (this.cursorPos >= lowerBound && this.cursorPos <= upperBound) {
            this.success();
        } else {
            this.fail();
        }
    }

    success() {
        this.score++;
        try { this.audio.playWin(1); } catch(e) {}
        
        const scoreEl = document.getElementById('ps-score');
        if(scoreEl) {
            scoreEl.innerText = this.score;
            scoreEl.style.transform = "scale(1.2)";
            setTimeout(() => scoreEl.style.transform = "scale(1)", 100);
        }
        
        const zone = document.getElementById('zone');
        if(zone) {
            zone.style.backgroundColor = "#fff";
            setTimeout(() => zone.style.backgroundColor = "rgba(236, 72, 153, 0.3)", 100);
        }

        this.speed += 0.2; 
        this.zoneWidth = Math.max(5, this.zoneWidth * 0.85); 
        
        if(zone) zone.style.width = this.zoneWidth + '%';
        
        this.cursorPos = Math.random() < 0.5 ? 0 : 100;
        this.direction = this.cursorPos === 0 ? 1 : -1;
    }

    fail() {
        if (!this.isRunning) return;
        
        try { this.audio.playLose(); } catch(e) {}
        
        const track = document.getElementById('track');
        if(track) track.style.borderColor = "#ef4444";
        
        document.body.classList.add('shake-screen');
        setTimeout(() => document.body.classList.remove('shake-screen'), 300);
        
        this.gameOver();
    }

    loop() {
        if(!this.isRunning) return;
        
        this.cursorPos += this.speed * this.direction;
        
        if (this.cursorPos >= 100) {
            this.cursorPos = 100;
            this.direction = -1;
        } else if (this.cursorPos <= 0) {
            this.cursorPos = 0;
            this.direction = 1;
        }
        
        const cursor = document.getElementById('cursor');
        if(cursor) cursor.style.left = this.cursorPos + '%';
        
        this.animationId = requestAnimationFrame(() => this.loop());
    }

    // --- CORRECCIÓN CRÍTICA ---
    gameOver() {
        this.isRunning = false;
        if(this.animationId) cancelAnimationFrame(this.animationId);
        
        // LIMPIEZA
        const layer = document.getElementById('phase-click-layer');
        if(layer) layer.remove(); 
        window.removeEventListener('keydown', this.handleInput);
        
        const prize = this.score * 5;
        
        setTimeout(() => {
            // Dar créditos manualmente porque es lógica específica de este juego
            window.app.credits += prize;
            window.app.save();
            
            // Delegar todo lo demás al main
            if(this.onQuit) this.onQuit(this.score);
        }, 500);
    }
}