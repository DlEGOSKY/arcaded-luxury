import { CONFIG } from '../config.js';

export class CyberTyperGame {
    constructor(canvas, audio, onGameOver) {
        this.audio = audio;
        // El 3er argumento ahora lo tratamos como "onGameOver", igual que en Pong
        this.onGameOver = onGameOver;
        
        this.words = [
            "SYSTEM", "HACK", "ROOT", "ADMIN", "ACCESS", "DENIED", "PROXY", "SERVER", 
            "DATA", "NODE", "LINK", "CODE", "JAVA", "HTML", "CSS", "SCRIPT", "BLOCK",
            "CHAIN", "TOKEN", "KEY", "LOCK", "BREACH", "VIRUS", "WORM", "TROJAN",
            "FIREWALL", "ENCRYPT", "DECRYPT", "PHISHING", "SPOOF", "BOTNET", "DDOS",
            "MALWARE", "SPYWARE", "RANSOM", "LOGIC", "BOMB", "ZERO", "DAY", "PATCH",
            "KERNEL", "SHELL", "BASH", "SUDO", "GREP", "CURL", "WGET", "SSH", "FTP",
            "BIOS", "CMOS", "RAM", "CPU", "GPU", "SSD", "HDD", "NVME", "RAID", "USB"
        ];
        
        this.activeWords = [];
        this.score = 0;
        this.level = 1;
        this.spawnRate = 2000;
        this.fallSpeed = 0.5;
        this.lastSpawn = 0;
        
        this.inputBuffer = "";
        this.isRunning = false;
        this.gameLoopId = null;
        this.lastTime = 0;

        this.uiContainer = document.getElementById('game-ui-overlay');
        this.injectStyles();
        
        // Bindings
        this.handleInput = this.handleInput.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    injectStyles() {
        if (document.getElementById('typer-styles')) return;
        const style = document.createElement('style');
        style.id = 'typer-styles';
        style.innerHTML = `
            .typer-container {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                overflow: hidden; pointer-events: none;
            }
            .typer-word {
                position: absolute;
                color: #0f0;
                font-family: 'Courier New', monospace;
                font-weight: bold;
                font-size: 1.2rem;
                text-shadow: 0 0 5px #0f0;
                white-space: nowrap;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.5);
                padding: 2px 5px;
            }
            .typer-word.matched {
                color: #fff;
                text-shadow: 0 0 10px #fff;
                transform: translateX(-50%) scale(1.2);
                transition: transform 0.1s;
            }
            .typer-input-display {
                position: absolute; bottom: 80px; width: 100%;
                text-align: center;
                font-family: 'Courier New', monospace;
                font-size: 2.5rem;
                color: #0f0;
                text-shadow: 0 0 10px #0f0;
                pointer-events: none;
                background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
                padding-bottom: 20px;
            }
            .typer-input-display::after {
                content: '█';
                animation: blink 1s infinite;
                margin-left: 5px;
                font-size: 0.8em;
            }
            .typer-line {
                position: absolute; bottom: 120px; width: 100%; height: 2px;
                background: rgba(255, 0, 0, 0.5);
                box-shadow: 0 0 10px red;
            }
            .mobile-keyboard-trigger {
                position: absolute; top: -1000px; left: -1000px;
                opacity: 0;
            }
            .typer-menu {
                width: 100%; height: 100%; display: flex; flex-direction: column; 
                align-items: center; justify-content: center; 
                animation: fadeIn 0.5s; font-family: 'Courier New', monospace;
            }
            .typer-btn {
                background: transparent; border: 1px solid #0f0; color: #0f0;
                padding: 15px 30px; font-family: inherit; font-size: 1.2rem;
                cursor: pointer; transition: all 0.2s; margin-top: 20px;
                text-transform: uppercase;
            }
            .typer-btn:hover {
                background: #0f0; color: black; box-shadow: 0 0 20px #0f0;
            }
        `;
        document.head.appendChild(style);
    }

    init() {
        if(window.app.credits < 20) {
            try { window.app.showToast("FONDOS INSUFICIENTES", "Costo: $20", "danger"); } catch(e) {}
            return;
        }

        this.uiContainer.innerHTML = `
            <div class="typer-menu">
                <h2 style="color: #0f0; text-shadow: 0 0 15px #0f0; margin-bottom:10px; font-size: 3rem;">CYBER TYPER</h2>
                <p style="color:#0f0; font-size:1rem; margin-bottom:50px;">PROTOCOL: HACKING // SECURITY_LEVEL: HIGH</p>
                <div style="text-align:left; width: 200px;">
                    <div style="color:#0f0; margin-bottom: 5px;">&gt; EJECUTAR_SISTEMA.EXE</div>
                    <div style="color:#005500; font-size: 0.8rem;">COSTO_MEMORIA: $20</div>
                </div>
                <button class="typer-btn" id="btn-typer-start">[ ENTER ]</button>
                <button class="typer-btn" id="btn-typer-back" style="border-color:#555; color:#888; font-size:0.8rem;">&lt; SALIR /&gt;</button>
            </div>
        `;

        document.getElementById('btn-typer-start').onclick = () => this.payAndStart();
        
        // CORRECCIÓN: Botón salir llama al callback onGameOver sin score (abortar)
        document.getElementById('btn-typer-back').onclick = () => {
             if(this.onGameOver) this.onGameOver(); 
        };
    }

    payAndStart() {
        window.app.credits -= 20;
        document.getElementById('val-credits').innerText = window.app.credits;
        try { this.audio.playBuy(); } catch(e) {}
        this.start();
    }

    start() {
        this.isRunning = true;
        this.score = 0;
        this.level = 1;
        this.activeWords = [];
        this.inputBuffer = "";
        this.spawnRate = 2000;
        this.fallSpeed = 0.5;
        this.lastSpawn = performance.now();
        this.lastTime = performance.now();
        
        const globalScore = document.getElementById('ui-score');
        if(globalScore) globalScore.innerText = '0';

        this.uiContainer.innerHTML = `
            <div class="typer-container" id="word-layer"></div>
            <div class="typer-line"></div>
            <div class="typer-input-display" id="typer-input"></div>
            <input type="text" id="hidden-input" class="mobile-keyboard-trigger" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
        `;

        const hiddenInput = document.getElementById('hidden-input');
        hiddenInput.focus();
        this.uiContainer.onclick = () => hiddenInput.focus();
        hiddenInput.addEventListener('input', this.handleInput);
        hiddenInput.addEventListener('keydown', this.handleKeyDown);

        this.loop(performance.now());
    }

    handleInput(e) {
        if(!this.isRunning) return;
        const val = e.target.value.toUpperCase().trim();
        if (val.length > this.inputBuffer.length) {
            this.inputBuffer = val;
            this.checkWord();
        } else {
            this.inputBuffer = val;
        }
        this.updateInputDisplay();
    }

    handleKeyDown(e) {
        if(!this.isRunning) return;
        if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
            try { this.audio.playClick(); } catch(e){}
        } else if (e.key === 'Backspace') {
            try { this.audio.playTone(300, 'square', 0.05); } catch(e){}
        } else if (e.key === 'Enter') {
            this.clearInput();
        }
    }

    updateInputDisplay() {
        const el = document.getElementById('typer-input');
        if(el) el.innerText = this.inputBuffer;
    }

    clearInput() {
        this.inputBuffer = "";
        const input = document.getElementById('hidden-input');
        if(input) input.value = "";
        this.updateInputDisplay();
    }

    checkWord() {
        const matchIndex = this.activeWords.findIndex(w => w.text === this.inputBuffer);
        if (matchIndex !== -1) {
            const word = this.activeWords[matchIndex];
            this.destroyWord(word, matchIndex);
            this.clearInput();
        } else {
            let anyMatch = false;
            this.activeWords.forEach(w => {
                if (w.text.startsWith(this.inputBuffer)) {
                    w.el.style.color = '#fff'; 
                    w.el.style.textShadow = '0 0 15px #fff';
                    anyMatch = true;
                } else {
                    w.el.style.color = '#0f0';
                    w.el.style.textShadow = '0 0 5px #0f0';
                }
            });
            
            const display = document.getElementById('typer-input');
            if (this.inputBuffer.length > 0 && !anyMatch) {
                display.style.color = 'red';
                display.style.textShadow = '0 0 10px red';
            } else {
                display.style.color = '#0f0';
                display.style.textShadow = '0 0 10px #0f0';
            }
        }
    }

    destroyWord(word, index) {
        this.activeWords.splice(index, 1);
        word.el.remove();
        this.score += word.text.length * 10;
        const globalScore = document.getElementById('ui-score');
        if(globalScore) globalScore.innerText = this.score;
        try { this.audio.playWin(2); } catch(e){}
        this.spawnRate = Math.max(600, 2000 - (this.score * 1.5));
        this.fallSpeed = 0.5 + (this.score * 0.002);
    }

    spawnWord() {
        const text = this.words[Math.floor(Math.random() * this.words.length)];
        const layer = document.getElementById('word-layer');
        if(!layer) return;
        const el = document.createElement('div');
        el.className = 'typer-word';
        el.innerText = text;
        el.style.left = (15 + Math.random() * 70) + '%'; 
        el.style.top = '-30px';
        layer.appendChild(el);
        this.activeWords.push({ text: text, el: el, y: -30 });
    }

    loop(timestamp) {
        if(!this.isRunning) return;
        if (!this.lastTime) this.lastTime = timestamp;
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;
        if (timestamp - this.lastSpawn > this.spawnRate) {
            this.spawnWord();
            this.lastSpawn = timestamp;
        }
        const limitY = this.uiContainer.offsetHeight - 120;
        for (let i = this.activeWords.length - 1; i >= 0; i--) {
            let w = this.activeWords[i];
            const moveAmt = this.fallSpeed * (dt / 16); 
            w.y += moveAmt;
            w.el.style.top = w.y + 'px';
            if (w.y > limitY) {
                this.gameOver();
                return;
            }
        }
        this.gameLoopId = requestAnimationFrame((t) => this.loop(t));
    }

    gameOver() {
        if(!this.isRunning) return;
        this.isRunning = false;
        // ... (limpieza de intervals y listeners) ...
        
        try { this.audio.playLose(); } catch(e){}

        // Ahora esto invocará la tarjeta automáticamente
        if (this.onGameOver) this.onGameOver(this.score);
    }
}