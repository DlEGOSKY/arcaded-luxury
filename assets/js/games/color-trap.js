import { CONFIG } from '../config.js';

export class ColorTrapGame {
    constructor(canvas, audio, onGameOver) {
        this.audio = audio;
        this.onGameOver = onGameOver; // Referencia inteligente
        
        this.score = 0;
        this.timeLeft = 5.0; 
        this.maxTime = 5.0;
        this.isRunning = false;
        this.gameLoopId = null;
        this.lastTime = 0;
        
        this.colors = [
            { name: "ROJO", hex: "#ef4444", class: "glow-red" },
            { name: "AZUL", hex: "#3b82f6", class: "glow-blue" },
            { name: "VERDE", hex: "#22c55e", class: "glow-green" },
            { name: "AMARILLO", hex: "#eab308", class: "glow-yellow" },
            { name: "PURPURA", hex: "#a855f7", class: "glow-purple" }
        ];

        this.currentWord = null;
        this.inkColor = null;
        this.targetType = 'TEXT';
        this.options = [];
        this.mode = 'NORMAL';

        this.uiContainer = document.getElementById('game-ui-overlay');
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('ct-styles')) return;
        const style = document.createElement('style');
        style.id = 'ct-styles';
        // ... (ESTILOS IGUALES, SIN CAMBIOS) ...
        style.innerHTML = `
            .ct-menu-container { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; animation: fadeIn 0.5s; }
            .mode-select-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 15px; width: 100%; max-width: 600px; padding: 10px; }
            .cyber-mode-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 15px 5px; height: 130px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; }
            .cyber-mode-card:hover { transform: translateY(-3px); background: rgba(255,255,255,0.08); }
            .cyber-mode-card i { font-size: 2.2rem; margin-bottom: 5px; transition: transform 0.2s; }
            .cyber-mode-card:hover i { transform: scale(1.2); }
            .cyber-mode-card span { font-family: var(--font-display); font-size: 0.9rem; letter-spacing: 1px; }
            .cyber-mode-card small { font-size: 0.6rem; color: #64748b; text-transform: uppercase; }
            .mode-ct-std { border-color: #facc15; color: #facc15; }
            .mode-ct-chaos { border-color: #a855f7; color: #a855f7; }
            .ct-hud { position: absolute; top: 80px; width: 100%; text-align: center; font-family: var(--font-display); font-size: 1.5rem; color: white; text-shadow: 0 0 10px rgba(255,255,255,0.3); z-index: 20; pointer-events: none; }
            .ct-card { background: rgba(15, 23, 42, 0.95); border: 2px solid #334155; border-radius: 16px; padding: 30px; width: 320px; height: 180px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 0 40px rgba(0,0,0,0.6); position: relative; overflow: hidden; margin-bottom: 25px; backdrop-filter: blur(10px); }
            .ct-word { font-family: var(--font-display); font-size: 3.2rem; font-weight: bold; letter-spacing: 2px; text-shadow: 0 0 25px currentColor; margin-top: 10px; }
            .ct-timer-bar { position: absolute; bottom: 0; left: 0; height: 6px; background: #334155; width: 100%; }
            .ct-timer-fill { height: 100%; background: #eab308; width: 100%; transition: width 0.1s linear, background-color 0.2s; box-shadow: 0 0 10px #eab308; }
            .ct-instruction { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; text-align: center; width: 100%; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; }
            .ct-instruction strong { color: white; border-bottom: 2px solid var(--primary); padding-bottom: 2px; }
            .ct-options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; width: 100%; max-width: 450px; padding: 0 10px; }
            .ct-btn { background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%); border: 1px solid rgba(255,255,255,0.1); color: #e2e8f0; padding: 15px 10px; font-size: 1rem; font-weight: bold; cursor: pointer; transition: all 0.15s ease; text-transform: uppercase; letter-spacing: 1px; position: relative; overflow: hidden; clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px); font-family: var(--font-display); }
            .ct-btn::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: var(--primary); opacity: 0.5; transition: 0.2s; }
            .ct-btn:hover { background: rgba(255,255,255,0.1); transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.3); color: white; text-shadow: 0 0 8px white; }
            .ct-btn:hover::before { opacity: 1; box-shadow: 0 0 10px var(--primary); }
            .ct-btn:active { transform: scale(0.96); }
            .shake-card { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; border-color: #ef4444; }
            .col-purple { color: #a855f7 !important; }
            .col-warn { color: #ef4444 !important; }
        `;
        document.head.appendChild(style);
    }

    init() {
        if(window.app.credits < 15) {
            // Manejo de error de fondos seguro
            try { window.app.showToast("FONDOS INSUFICIENTES", "Costo: $15", "danger"); } catch(e) {}
            // Salimos sin guardar score (0)
            if(this.onGameOver) this.onGameOver(0);
            return;
        }

        // ... (RESTO DE LA UI DE INICIO IGUAL) ...
        this.uiContainer.innerHTML = `
            <div class="ct-menu-container">
                <h2 style="color: #fff; text-shadow: 0 0 15px #eab308; margin-bottom:10px; font-size:2rem;">COLOR TRAP</h2>
                <p style="color:#64748b; font-size:0.8rem; margin-bottom:30px;">CONFLICTO COGNITIVO</p>
                <div class="mode-select-grid">
                    <div class="cyber-mode-card mode-ct-std" id="mode-std"><i class="fa-solid fa-palette"></i><span>ESTÁNDAR</span><small>Texto vs Color</small></div>
                    <div class="cyber-mode-card mode-ct-chaos" id="mode-chaos"><i class="fa-solid fa-shuffle"></i><span>CAOS</span><small>Reglas Cambiantes</small></div>
                </div>
                <button class="btn btn-secondary" id="btn-ct-back" style="margin-top:30px; width: 200px;">VOLVER</button>
            </div>
        `;

        document.getElementById('mode-std').onclick = () => this.payAndStart('NORMAL');
        document.getElementById('mode-chaos').onclick = () => this.payAndStart('CHAOS');
        // Usar callback seguro para salir del menú
        document.getElementById('btn-ct-back').onclick = () => { if(this.onGameOver) this.onGameOver(0); };
    }

    // ... (payAndStart, start, nextRound, renderUI, handleInput, loop IGUALES) ...
    payAndStart(mode) {
        window.app.credits -= 15;
        document.getElementById('val-credits').innerText = window.app.credits;
        try { this.audio.playBuy(); } catch(e) {}
        this.mode = mode;
        this.start();
    }

    start() {
        this.isRunning = true;
        this.score = 0;
        this.maxTime = 5.0; 
        this.timeLeft = this.maxTime;
        this.lastTime = performance.now();
        const globalScore = document.getElementById('ui-score');
        if(globalScore) globalScore.innerText = '0';
        this.nextRound();
        this.loop(performance.now());
    }

    nextRound() {
        if(!this.isRunning) return;
        const speedMod = Math.min(2.5, Math.floor(this.score / 5) * 0.2);
        this.maxTime = Math.max(1.5, 4.0 - speedMod);
        this.timeLeft = this.maxTime;
        const pool = this.mode === 'NORMAL' ? this.colors.slice(0, 4) : this.colors;
        this.currentWord = pool[Math.floor(Math.random() * pool.length)];
        if (Math.random() > 0.3) {
            const diffColors = pool.filter(c => c.name !== this.currentWord.name);
            this.inkColor = diffColors[Math.floor(Math.random() * diffColors.length)];
        } else {
            this.inkColor = this.currentWord;
        }
        this.targetType = 'TEXT';
        if (this.mode === 'CHAOS' && Math.random() > 0.5) this.targetType = 'COLOR';
        const correctAns = (this.targetType === 'TEXT' ? this.currentWord : this.inkColor);
        this.options = [correctAns];
        const wrongOptions = pool.filter(c => c.name !== correctAns.name);
        wrongOptions.sort(() => Math.random() - 0.5);
        this.options = this.options.concat(wrongOptions.slice(0, 3));
        this.options.sort(() => Math.random() - 0.5);
        this.renderUI();
    }

    renderUI() {
        const instruction = this.targetType === 'TEXT' ? "SELECCIONA EL <strong>SIGNIFICADO</strong>" : "SELECCIONA EL <strong class='col-purple'>COLOR DE TINTA</strong>";
        const targetClass = this.targetType === 'COLOR' ? 'col-purple' : '';
        this.uiContainer.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; width:100%; height:100%; justify-content:center;">
                <div class="ct-card" id="ct-main-card">
                    <div class="ct-instruction ${targetClass}">${instruction}</div>
                    <div class="ct-word" style="color: ${this.inkColor.hex}">${this.currentWord.name}</div>
                    <div class="ct-timer-bar"><div id="ct-bar-fill" class="ct-timer-fill"></div></div>
                </div>
                <div class="ct-options-grid">
                    ${this.options.map(opt => `<button class="ct-btn" data-name="${opt.name}">${opt.name}</button>`).join('')}
                </div>
            </div>`;
        const btns = document.querySelectorAll('.ct-btn');
        btns.forEach(btn => { btn.onclick = (e) => this.handleInput(e.target.dataset.name); });
    }

    handleInput(selectedName) {
        if(!this.isRunning) return;
        const correctAnswer = this.targetType === 'TEXT' ? this.currentWord.name : this.inkColor.name;
        if (selectedName === correctAnswer) {
            this.score++;
            try { this.audio.playClick(); } catch(e){}
            const globalScore = document.getElementById('ui-score');
            if(globalScore) globalScore.innerText = this.score;
            this.nextRound();
        } else {
            const card = document.getElementById('ct-main-card');
            if(card) card.classList.add('shake-card');
            setTimeout(() => this.gameOver(), 400); 
        }
    }

    loop(timestamp) {
        if(!this.isRunning) return;
        if (!this.lastTime) this.lastTime = timestamp;
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        if (dt > 0.1) { this.gameLoopId = requestAnimationFrame((t) => this.loop(t)); return; }
        this.timeLeft -= dt;
        const bar = document.getElementById('ct-bar-fill');
        if(bar) {
            const pct = Math.max(0, (this.timeLeft / this.maxTime) * 100);
            bar.style.width = pct + '%';
            if (pct < 30) { bar.style.backgroundColor = '#ef4444'; bar.style.boxShadow = '0 0 15px #ef4444'; } 
            else { bar.style.backgroundColor = '#eab308'; bar.style.boxShadow = '0 0 10px #eab308'; }
        }
        if (this.timeLeft <= 0) { this.gameOver(); return; }
        this.gameLoopId = requestAnimationFrame((t) => this.loop(t));
    }

    // --- CORRECCIÓN FINAL AQUÍ ---
    gameOver() {
        if(!this.isRunning) return; 
        this.isRunning = false;
        if(this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
        
        try { this.audio.playLose(); } catch(e){}
        
        // Simplemente llamamos al main con el puntaje
        if(this.onGameOver) this.onGameOver(this.score);
    }
}