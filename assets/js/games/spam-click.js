import { CONFIG } from '../config.js';

export class SpamClickGame {
    // NOTA: 'onQuit' es el Smart Callback
    constructor(canvas, audio, onQuit) {
        this.canvas = canvas;
        this.audio = audio;
        this.onQuit = onQuit;
        
        this.score = 0; 
        this.timeLeft = 5.0;
        this.targetClicks = 40; 
        this.isPlaying = false;
        this.isEnding = false; 
        this.timerInterval = null;
        this.mode = 'NORMAL';
        
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('spam-styles')) return;
        const style = document.createElement('style');
        style.id = 'spam-styles';
        // ... (ESTILOS IGUALES) ...
        style.innerHTML = `
            .spam-reactor { width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, #1e293b 30%, #0f172a 100%); border: 4px solid #ff5722; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; position: relative; box-shadow: 0 0 30px rgba(255, 87, 34, 0.2); transition: all 0.05s; user-select: none; -webkit-tap-highlight-color: transparent; }
            .spam-reactor:active { transform: scale(0.9); background: radial-gradient(circle, #ff5722 30%, #bf360c 100%); box-shadow: 0 0 50px #ff5722, inset 0 0 20px black; }
            .heat-gauge-container { width: 250px; height: 12px; background: rgba(255,255,255,0.1); border-radius: 6px; margin-top: 30px; overflow: hidden; border: 1px solid rgba(255,255,255,0.2); position: relative; }
            .heat-gauge-fill { height: 100%; width: 0%; background: linear-gradient(90deg, #3b82f6, #ff5722); box-shadow: 0 0 15px currentColor; transition: width 0.1s linear; }
            .heat-target-line { position: absolute; top: 0; left: 80%; width: 2px; height: 100%; background: #fff; z-index: 2; box-shadow: 0 0 5px white; }
            .reactor-win { border-color: #10b981 !important; box-shadow: 0 0 50px #10b981 !important; background: #064e3b !important; pointer-events: none; }
            .reactor-lose { border-color: #ef4444 !important; box-shadow: 0 0 50px #ef4444 !important; background: #450a0a !important; animation: shake 0.5s; pointer-events: none; }
            .spam-status { margin-top: 15px; font-family: monospace; color: #94a3b8; font-size: 0.9rem; }
            .mode-select-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 15px; width: 100%; max-width: 600px; padding: 10px; }
            .cyber-mode-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 15px 5px; height: 130px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; }
            .cyber-mode-card:hover { transform: translateY(-3px); background: rgba(255,255,255,0.08); }
            .cyber-mode-card i { font-size: 2.2rem; margin-bottom: 5px; transition: transform 0.2s; }
            .cyber-mode-card:hover i { transform: scale(1.2); }
            .cyber-mode-card span { font-family: var(--font-display); font-size: 0.9rem; letter-spacing: 1px; }
            .cyber-mode-card small { font-size: 0.6rem; color: #64748b; text-transform: uppercase; }
        `;
        document.head.appendChild(style);
    }

    init() {
        this.uiContainer.innerHTML = `
            <div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; animation: fadeIn 0.5s;">
                <h2 style="color: #fff; text-shadow: 0 0 15px var(--spam); margin-bottom:10px;">PRUEBA DE ESTRÉS</h2>
                <p style="color:#64748b; font-size:0.8rem; margin-bottom:30px;">SOBRECARGA EL NÚCLEO</p>
                <div class="mode-select-grid">
                    <div class="cyber-mode-card" id="mode-normal" style="border-color:var(--spam); color:var(--spam);">
                        <i class="fa-solid fa-hammer"></i><span>NORMAL</span><small>40 Clics / 5s</small>
                    </div>
                    <div class="cyber-mode-card" id="mode-hardcore" style="border-color:#ef4444; color:#ef4444;">
                        <i class="fa-solid fa-fire"></i><span>TURBO</span><small>60 Clics / 5s</small>
                    </div>
                </div>
                <button class="btn btn-secondary" id="btn-spam-back" style="margin-top:30px; width: 200px;">VOLVER AL LOBBY</button>
            </div>`;

        document.getElementById('mode-normal').onclick = () => this.start('NORMAL');
        document.getElementById('mode-hardcore').onclick = () => this.start('HARDCORE');
        // Salida segura
        document.getElementById('btn-spam-back').onclick = () => { if(this.onQuit) this.onQuit(0); };
    }

    start(mode) {
        if(window.app.credits < 10) {
            try { window.app.showToast("FONDOS INSUFICIENTES", "Costo: $10", "danger"); } catch(e) {}
            return;
        }
        
        window.app.credits -= 10;
        document.getElementById('val-credits').innerText = window.app.credits;
        
        this.mode = mode;
        this.targetClicks = (mode === 'HARDCORE') ? 60 : 40;
        this.isPlaying = true;
        this.isEnding = false;
        this.score = 0;
        this.timeLeft = 5.0;
        
        try { this.audio.playBuy(); } catch(e) {}
        
        this.uiContainer.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; width:100%; height:100%; justify-content:center;">
                <div style="font-family:monospace; font-size:2rem; margin-bottom:20px; color:#ff5722; text-shadow:0 0 10px #ff5722;">
                    <span id="sc-timer">5.00</span>s
                </div>
                <div class="spam-reactor" id="spam-btn">
                    <div class="reactor-count" id="sc-counter" style="font-size:3rem; font-weight:bold; color:white;">0</div>
                    <div class="reactor-label" style="font-size:0.8rem; color:#94a3b8;">PULSA</div>
                </div>
                <div class="heat-gauge-container">
                    <div class="heat-target-line" style="left: ${this.mode === 'HARDCORE' ? '90%' : '80%'}"></div>
                    <div class="heat-gauge-fill" id="heat-bar"></div>
                </div>
                <div class="spam-status">META: ${this.targetClicks} CLICS</div>
            </div>
        `;

        const btn = document.getElementById('spam-btn');
        
        const handleClick = (e) => {
            if(!this.isPlaying || this.isEnding) return;
            if(e.cancelable) e.preventDefault();
            
            this.score++;
            const counter = document.getElementById('sc-counter');
            if(counter) counter.innerText = this.score;
            
            const pct = Math.min(100, (this.score / this.targetClicks) * 100);
            const bar = document.getElementById('heat-bar');
            if(bar) bar.style.width = pct + "%";
            
            try { this.audio.playTone(200 + (this.score * 10), 'square', 0.05); } catch(e) {}
            
            const shakeIntensity = Math.min(5, this.score / 5);
            btn.style.transform = `scale(0.95) translate(${Math.random()*shakeIntensity-shakeIntensity/2}px, ${Math.random()*shakeIntensity-shakeIntensity/2}px)`;
            setTimeout(() => btn.style.transform = 'scale(1)', 50);
        };

        btn.addEventListener('mousedown', handleClick);
        btn.addEventListener('touchstart', handleClick, {passive: false});

        if(this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (this.isEnding) return;

            this.timeLeft -= 0.05;
            const el = document.getElementById('sc-timer');
            
            if (this.timeLeft <= 0) {
                this.timeLeft = 0;
                if(el) el.innerText = "0.00";
                this.endRun(); 
            } else {
                if (this.timeLeft < 2.0 && el) el.style.color = '#ef4444';
                if(el) el.innerText = this.timeLeft.toFixed(2);
            }
        }, 50);
    }

    endRun() {
        if (this.isEnding) return;
        this.isEnding = true;
        this.isPlaying = false;
        if(this.timerInterval) clearInterval(this.timerInterval);

        const passed = this.score >= this.targetClicks;
        const btn = document.getElementById('spam-btn');
        
        if(btn) {
            if(passed) {
                btn.className = 'spam-reactor reactor-win';
                btn.innerHTML = `<i class="fa-solid fa-check" style="font-size:5rem; color:white;"></i><div class="reactor-label" style="color:white; margin-top:10px;">HECHO</div>`;
            } else {
                btn.className = 'spam-reactor reactor-lose';
                btn.innerHTML = `<i class="fa-solid fa-xmark" style="font-size:5rem; color:white;"></i><div class="reactor-label" style="color:white; margin-top:10px;">FALLO</div>`;
            }
        }

        if (passed) {
            try { this.audio.playWin(3); } catch(e) {}
            let prize = (this.mode === 'HARDCORE') ? 100 : 30;
            const bonus = Math.max(0, this.score - this.targetClicks) * 2;
            const total = prize + bonus;
            
            window.app.credits += total;
            try { window.app.showToast("SISTEMA ROTO", `+$${total} Créditos`, "success"); } catch(e) {}
        } else {
            try { this.audio.playLose(); } catch(e) {}
            try { window.app.showToast("FALLO DE PRESIÓN", "Insuficiente", "danger"); } catch(e) {}
        }
        document.getElementById('val-credits').innerText = window.app.credits;

        // --- CORRECCIÓN CRÍTICA ---
        setTimeout(() => {
            // Delegar la tarjeta al main
            if(this.onQuit) this.onQuit(this.score);
        }, 1500); 
    }
}