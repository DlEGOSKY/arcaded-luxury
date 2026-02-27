import { CONFIG, TRIVIA_DATA } from '../config.js';

export class TriviaGame {
    // NOTA: 'onQuit' es el Smart Callback del main.js
    constructor(canvas, audio, onQuit) {
        this.canvas = canvas;
        this.audio = audio;
        this.onQuit = onQuit;
        this.score = 0;
        this.timeLeft = 15;
        this.timerInterval = null;
        this.currentQ = null;
        this.isProcessing = false;
        this.uiContainer = document.getElementById('game-ui-overlay');
        
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('trivia-styles')) return;
        const style = document.createElement('style');
        style.id = 'trivia-styles';
        // ... (TUS ESTILOS IGUALES, SIN CAMBIOS) ...
        style.innerHTML = `
            .trivia-container { width: 100%; max-width: 600px; display: flex; flex-direction: column; align-items: center; gap: 20px; }
            .trivia-category { font-size: 0.9rem; color: var(--cyan); text-transform: uppercase; letter-spacing: 4px; background: rgba(6, 182, 212, 0.1); padding: 5px 15px; border: 1px solid var(--cyan); border-radius: 20px; box-shadow: 0 0 10px rgba(6, 182, 212, 0.2); }
            .trivia-q { font-family: var(--font-display); font-size: 1.3rem; text-align: center; color: white; text-shadow: 0 0 10px rgba(255,255,255,0.3); min-height: 80px; display: flex; align-items: center; justify-content: center; }
            .timer-container { width: 100%; height: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; overflow: hidden; position: relative; border: 1px solid rgba(255,255,255,0.2); }
            .timer-fill { height: 100%; width: 100%; background: var(--cyan); box-shadow: 0 0 15px var(--cyan); transition: width 0.1s linear; }
            .timer-fill.critical { background: var(--accent); box-shadow: 0 0 15px var(--accent); animation: pulse-red 0.5s infinite; }
            .trivia-answers { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; width: 100%; }
            .trivia-btn { background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255,255,255,0.2); color: #94a3b8; padding: 20px; font-size: 1rem; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px); }
            .trivia-btn:hover:not(:disabled) { background: rgba(6, 182, 212, 0.1); border-color: var(--cyan); color: white; transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
            .trivia-btn:disabled { cursor: not-allowed; opacity: 0.7; }
            .trivia-btn.correct { background: rgba(16, 185, 129, 0.2) !important; border-color: var(--success) !important; color: var(--success) !important; box-shadow: 0 0 20px rgba(16, 185, 129, 0.4); }
            .trivia-btn.wrong { background: rgba(244, 63, 94, 0.2) !important; border-color: var(--accent) !important; color: var(--accent) !important; animation: shake 0.3s; }
        `;
        document.head.appendChild(style);
    }

    init() {
        if(window.app.credits < 15) {
            this.uiContainer.innerHTML = `
                <div style="text-align:center;">
                    <h2 style="color:var(--accent); margin-bottom:10px;">FONDOS INSUFICIENTES</h2>
                    <p style="color:#94a3b8; margin-bottom:20px;">Acceso denegado. Costo: $15</p>
                    <button class="btn btn-secondary" id="btn-t-back">Volver al Lobby</button>
                </div>`;
            // Salida segura
            document.getElementById('btn-t-back').onclick = () => { if(this.onQuit) this.onQuit(0); };
            return;
        }
        
        window.app.credits -= 15;
        document.getElementById('val-credits').innerText = window.app.credits;
        
        this.audio.playBuy();
        this.canvas.setMood('CYAN');
        
        this.score = 0;
        this.nextQuestion();
    }

    nextQuestion() {
        this.isProcessing = false;
        if(this.timerInterval) clearInterval(this.timerInterval);
        this.timeLeft = 15; 
        
        // Seleccionar pregunta aleatoria
        this.currentQ = TRIVIA_DATA[Math.floor(Math.random() * TRIVIA_DATA.length)];
        
        // Mezclar respuestas
        let options = [this.currentQ.a, ...this.currentQ.i];
        options.sort(() => Math.random() - 0.5);

        this.render(options);
        this.startTimer();
    }

    startTimer() {
        const bar = document.getElementById('t-timer');
        
        this.timerInterval = setInterval(() => {
            this.timeLeft -= 0.1;
            
            if(bar) {
                const pct = (this.timeLeft / 15) * 100;
                bar.style.width = pct + "%";
                if(this.timeLeft < 5) bar.classList.add('critical');
            }
            
            if(this.timeLeft <= 0) {
                this.timeOut();
            }
        }, 100);
    }

    timeOut() {
        clearInterval(this.timerInterval);
        if (this.isProcessing) return; 
        this.isProcessing = true;

        const btns = document.querySelectorAll('.trivia-btn');
        btns.forEach(b => {
            b.disabled = true;
            if(b.innerText === this.currentQ.a) b.classList.add('correct');
        });

        this.audio.playLose();
        window.app.showToast("TIEMPO AGOTADO", "Datos perdidos", "danger");
        
        setTimeout(() => this.resolve(false), 2000);
    }

    render(options) {
        this.uiContainer.innerHTML = `
            <div class="trivia-container">
                <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                    <div class="trivia-category">${this.currentQ.c}</div>
                    <div style="font-family:var(--font-display); color:var(--cyan);">SCORE: ${this.score}</div>
                </div>

                <div class="trivia-q">${this.currentQ.q}</div>
                
                <div class="timer-container"><div class="timer-fill" id="t-timer"></div></div>
                
                <div class="trivia-answers">
                    ${options.map(opt => `<button class="trivia-btn">${opt}</button>`).join('')}
                </div>
            </div>
        `;

        const btns = document.querySelectorAll('.trivia-btn');
        btns.forEach(btn => {
            btn.onclick = () => this.check(btn.innerText, btn);
        });
    }

    check(answer, btn) {
        if(this.isProcessing) return;
        this.isProcessing = true;
        clearInterval(this.timerInterval);

        const isCorrect = answer === this.currentQ.a;
        
        const allBtns = document.querySelectorAll('.trivia-btn');
        allBtns.forEach(b => {
            b.disabled = true;
            if(b.innerText === this.currentQ.a) {
                b.classList.add('correct');
                b.style.opacity = "1";
            } else if(b === btn && !isCorrect) {
                b.classList.add('wrong');
            } else {
                b.style.opacity = "0.3";
            }
        });

        if(isCorrect) {
            this.audio.playClick();
            setTimeout(() => {
                this.audio.playWin(1);
                this.score++;
                window.app.credits += 30;
                window.app.showToast("CORRECTO", "+$30 Créditos", "success");
                window.app.save();
                document.getElementById('val-credits').innerText = window.app.credits;
                
                const rect = btn.getBoundingClientRect();
                if(this.canvas.explode) this.canvas.explode(rect.left + rect.width/2, rect.top + rect.height/2, CONFIG.COLORS.CYAN);

                setTimeout(() => this.nextQuestion(), 1500);
            }, 500);
        } else {
            this.audio.playLose();
            setTimeout(() => this.resolve(false), 1500);
        }
    }

    // --- CORRECCIÓN FINAL ---
    resolve(win) {
        if(this.timerInterval) clearInterval(this.timerInterval);
        
        // Llamada Inteligente: El main se encarga de guardar y mostrar tarjeta
        if(this.onQuit) this.onQuit(this.score);
    }
    
    // Método de limpieza extra por si se llama desde fuera
    cleanup() {
        if(this.timerInterval) clearInterval(this.timerInterval);
    }
}