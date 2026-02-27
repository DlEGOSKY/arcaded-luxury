import { CONFIG } from '../config.js';

export class GlitchHuntGame {
    // NOTA: 'onQuit' ahora es la función inteligente 'onGameOverSmart' del main.js
    constructor(canvas, audio, onQuit) {
        this.audio = audio; // No usamos canvas 2D, solo DOM
        this.onQuit = onQuit; 
        
        this.score = 0;
        this.level = 1;
        this.timeLeft = 5.0;
        this.maxTime = 5.0;
        this.isRunning = false;
        this.gameLoopId = null;
        this.lastTime = 0;

        this.gridSize = 3; 
        this.cells = [];
        this.targetIndex = -1;
        
        // Pares de caracteres (Normal vs Glitch)
        this.pairs = [
            ['0', 'O'], ['8', 'B'], ['1', 'I'], ['5', 'S'], ['V', 'U'], 
            ['#', '$'], ['?', '!'], ['X', 'K'], ['M', 'W'], ['E', 'F']
        ];

        this.uiContainer = document.getElementById('game-ui-overlay');
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('gh-styles')) return;
        const style = document.createElement('style');
        style.id = 'gh-styles';
        style.innerHTML = `
            .gh-hud { position: absolute; top: 80px; width: 100%; text-align: center; font-family: var(--font-display); font-size: 1.5rem; color: #a855f7; text-shadow: 0 0 10px #a855f7; z-index: 20; pointer-events: none; }
            .gh-grid-container { display: flex; justify-content: center; align-items: center; width: 100%; height: 100%; }
            .gh-grid { display: grid; gap: 5px; padding: 10px; background: rgba(168, 85, 247, 0.1); border: 2px solid #a855f7; border-radius: 10px; box-shadow: 0 0 20px rgba(168, 85, 247, 0.2); }
            .gh-cell { background: rgba(255,255,255,0.05); color: #e2e8f0; display: flex; align-items: center; justify-content: center; font-family: monospace; font-weight: bold; cursor: pointer; border-radius: 4px; transition: background 0.1s; user-select: none; }
            .gh-cell:active { background: rgba(255,255,255,0.2); }
            .gh-target { position: relative; color: #d8b4fe; }
            .gh-target:hover { text-shadow: 2px 0 #ff00ff, -2px 0 #00ffff; }
            .gh-timer-container { position: absolute; bottom: 20px; width: 80%; left: 10%; height: 6px; background: #333; border-radius: 3px; overflow: hidden; }
            .gh-timer-fill { height: 100%; background: #a855f7; width: 100%; transition: width 0.1s linear; box-shadow: 0 0 10px #a855f7; }
            .gh-menu-container { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; animation: fadeIn 0.5s; }
            .gh-start-card { background: rgba(15, 23, 42, 0.8); border: 2px solid #a855f7; border-radius: 16px; padding: 30px; text-align: center; width: 280px; cursor: pointer; transition: all 0.2s; box-shadow: 0 0 20px rgba(168, 85, 247, 0.2); display: flex; flex-direction: column; align-items: center; gap: 15px; }
            .gh-start-card:hover { transform: scale(1.05); background: rgba(168, 85, 247, 0.1); box-shadow: 0 0 30px rgba(168, 85, 247, 0.4); }
        `;
        document.head.appendChild(style);
    }

    init() {
        if(window.app.credits < 15) {
            try { window.app.showToast("FONDOS INSUFICIENTES", "Costo: $15", "danger"); } catch(e) {}
            // Si no hay fondos, salimos inmediatamente sin tarjeta de Game Over (score 0 o null)
            if(this.onQuit) this.onQuit(0); 
            return;
        }

        this.uiContainer.innerHTML = `
            <div class="gh-menu-container">
                <h2 style="color: #fff; text-shadow: 0 0 15px #a855f7; margin-bottom:10px; font-size:2rem;">GLITCH HUNT</h2>
                <p style="color:#94a3b8; font-size:0.8rem; margin-bottom:30px;">ENCUENTRA LA ANOMALÍA</p>
                <div class="gh-start-card" id="btn-gh-start">
                    <i class="fa-solid fa-bug" style="font-size:3rem; color:#a855f7;"></i>
                    <span style="font-family:var(--font-display); font-size:1.2rem; color:white;">INICIAR</span>
                    <small style="color:#94a3b8; font-family:monospace;">COSTO: $15</small>
                </div>
                <button class="btn btn-secondary" id="btn-gh-back" style="margin-top:30px; width: 200px;">VOLVER</button>
            </div>
        `;

        document.getElementById('btn-gh-start').onclick = () => this.payAndStart();
        // Usamos el callback onQuit para volver al menú principal de forma segura
        document.getElementById('btn-gh-back').onclick = () => { if(this.onQuit) this.onQuit(0); };
    }

    payAndStart() {
        window.app.credits -= 15;
        document.getElementById('val-credits').innerText = window.app.credits;
        try { this.audio.playBuy(); } catch(e) {}
        this.start();
    }

    start() {
        this.isRunning = true;
        this.score = 0;
        this.level = 1;
        this.gridSize = 3; 
        this.maxTime = 5.0;
        this.timeLeft = this.maxTime;
        
        const globalScore = document.getElementById('ui-score');
        if(globalScore) globalScore.innerText = '0';

        this.nextRound();
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    nextRound() {
        if(!this.isRunning) return;

        if (this.score > 0 && this.score % 3 === 0) this.gridSize = Math.min(8, this.gridSize + 1);
        
        const bonusBase = 2.0;
        const decay = Math.min(1.5, this.score * 0.05);
        this.timeLeft = Math.min(10, this.timeLeft + (bonusBase - decay)); 
        this.maxTime = Math.max(this.timeLeft, 5.0);

        const pair = this.pairs[Math.floor(Math.random() * this.pairs.length)];
        const normalChar = pair[0];
        const glitchChar = pair[1];
        
        this.targetIndex = Math.floor(Math.random() * (this.gridSize * this.gridSize));
        
        this.renderGrid(normalChar, glitchChar);
    }

    renderGrid(normal, glitch) {
        const totalSize = Math.min(window.innerWidth - 40, 350); 
        const cellSize = (totalSize - (this.gridSize * 5)) / this.gridSize;
        const fontSize = cellSize * 0.6;

        let cellsHTML = '';
        for(let i=0; i < this.gridSize * this.gridSize; i++) {
            const char = i === this.targetIndex ? glitch : normal;
            const targetClass = i === this.targetIndex ? 'gh-target' : '';
            // IMPORTANTE: Usamos un ID único o data attribute en lugar de onclick inline para evitar problemas de scope global
            cellsHTML += `<div class="gh-cell ${targetClass}" data-index="${i}" style="width:${cellSize}px; height:${cellSize}px; font-size:${fontSize}px;">${char}</div>`;
        }

        this.uiContainer.innerHTML = `
            <div class="gh-hud">NIVEL: <span style="color:white">${this.level}</span></div>
            <div class="gh-grid-container">
                <div class="gh-grid" style="grid-template-columns: repeat(${this.gridSize}, 1fr);">
                    ${cellsHTML}
                </div>
            </div>
            <div class="gh-timer-container">
                <div id="gh-bar" class="gh-timer-fill"></div>
            </div>
        `;

        // Asignamos los eventos click después de crear el HTML
        const cells = document.querySelectorAll('.gh-cell');
        cells.forEach(cell => {
            cell.onclick = () => this.handleInput(parseInt(cell.dataset.index));
        });
    }

    handleInput(index) {
        if(!this.isRunning) return;

        if (index === this.targetIndex) {
            this.success();
        } else {
            this.gameOver();
        }
    }

    success() {
        this.score++;
        this.level++;
        try { this.audio.playClick(); } catch(e){}
        const globalScore = document.getElementById('ui-score');
        if(globalScore) globalScore.innerText = this.score;
        this.nextRound();
    }

    loop(timestamp) {
        if(!this.isRunning) return;

        if (!this.lastTime) this.lastTime = timestamp;
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        if (dt > 0.1) {
            this.gameLoopId = requestAnimationFrame((t) => this.loop(t));
            return;
        }

        this.timeLeft -= dt;
        
        const bar = document.getElementById('gh-bar');
        if(bar) {
            const pct = Math.max(0, (this.timeLeft / this.maxTime) * 100);
            bar.style.width = pct + '%';
            if (this.timeLeft < 2.0) bar.style.backgroundColor = '#ef4444';
            else bar.style.backgroundColor = '#a855f7';
        }

        if (this.timeLeft <= 0) {
            this.gameOver();
            return;
        }

        this.gameLoopId = requestAnimationFrame((t) => this.loop(t));
    }

    // --- CORRECCIÓN CRÍTICA: Integración con main.js ---
    gameOver() {
        if(!this.isRunning) return;
        this.isRunning = false;
        if(this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
        
        try { this.audio.playLose(); } catch(e){}
        
        // Simplemente delegamos al main.js pasando el puntaje final
        if (this.onQuit) this.onQuit(this.score);
    }
}