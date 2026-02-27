import { CONFIG } from '../config.js';
import { resolveText } from '../utils.js';

export class GeoNetGame {
    constructor(canvas, audio, onQuit) {
        this.audio = audio;
        this.onQuit = onQuit;
        this.countryMap = new Map();
        this.extinctData = [];
        this.score = 0;
        this.isRunning = false;
        this.isProcessing = false;
        this.currentQuestion = null;
        this.currentCheckFn = () => false; // Seguridad inicial
        this.timer = null;
        this.mode = 'NORMAL';
        this.uiContainer = document.getElementById('game-ui-overlay');
        
        // --- ESTADOS DE INTEGRIDAD Y MECÁNICAS (Sección 5.3) ---
        this.integrity = 100;         
        this.isOverclocked = false;   
        this.currentBlur = 20;
        this.missionTarget = null;
        this.currentCountry = null;

        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('geo-styles')) return;
        const style = document.createElement('style');
        style.id = 'geo-styles';
        style.innerHTML = `
            /* --- LOBBY ESTÉTICO RECONSTRUIDO --- */
            .geo-menu-grid { 
                display: grid; 
                grid-template-columns: repeat(3, 1fr); 
                gap: 15px; width: 100%; max-width: 950px; margin-bottom: 30px; 
            }
            .geo-mode-card {
                background: rgba(15, 23, 42, 0.7); border: 2px solid; border-radius: 12px;
                padding: 20px 10px; display: flex; flex-direction: column; align-items: center;
                gap: 8px; cursor: pointer; transition: 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .geo-mode-card:hover { transform: translateY(-8px); background: rgba(255,255,255,0.05); }
            .geo-mode-card i { font-size: 2.2rem; }
            .geo-mode-card span { font-family: var(--font-display); font-size: 0.95rem; letter-spacing: 1px; }

            /* --- ELEMENTOS DE JUEGO --- */
            .geo-btn { 
                background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255,255,255,0.2); 
                color: #e2e8f0; padding: 18px; border-radius: 12px; cursor: pointer; 
                font-family: var(--font-ui); font-size: 1rem; transition: all 0.2s;
            }
            .geo-btn.wrong { background: #ef4444 !important; animation: shake 0.4s both; }
            .geo-btn.correct { background: #10b981 !important; color: #000 !important; font-weight: bold; }

            .integrity-bar { width: 250px; height: 10px; background: rgba(0,0,0,0.5); border: 1px solid #334155; border-radius: 5px; overflow: hidden; }
            .integrity-fill { height: 100%; background: #06b6d4; transition: width 0.3s; }
            .integrity-fill.low { background: #ef4444; box-shadow: 0 0 15px #ef4444; }

            .hacking-input { 
                background: black; border: 2px solid var(--primary); color: var(--primary); 
                font-family: monospace; font-size: 1.5rem; padding: 15px; width: 100%; 
                max-width: 400px; text-align: center; text-transform: uppercase; outline: none;
                box-shadow: inset 0 0 15px var(--primary);
            }

            .ghost-flag-container { width: 100%; height: 220px; display: flex; justify-content: center; align-items: center; background: #000; border: 2px solid #ef4444; border-radius: 12px; overflow: hidden; }
            .ghost-flag { max-width: 90%; max-height: 85%; filter: blur(20px) contrast(200%); transition: filter 0.5s ease; }
            
            @keyframes shake { 10%, 90% { transform: translate3d(-2px, 0, 0); } 20%, 80% { transform: translate3d(3px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-5px, 0, 0); } 40%, 60% { transform: translate3d(5px, 0, 0); } }
        `;
        document.head.appendChild(style);
    }

    async init() {
        this.uiContainer.innerHTML = '<div class="loader"></div><p style="color:var(--primary)">SINCRO DE DATOS GEOPOLÍTICOS...</p>';
        try {
            // Carga mundo moderno optimizada [cite: 81-83]
            const res = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,borders,capital,flags');
            const data = await res.json();
            data.forEach(c => { if (c.cca2) this.countryMap.set(c.cca2, c); });

            // Shadow Database Corregida (Sección 3.2.1) [cite: 95]
            this.extinctData = [
                { id: "SUN", name: "Unión Soviética", flag: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Flag_of_the_Soviet_Union.svg", alignment: "Pacto de Varsovia" },
                { id: "YUG", name: "Yugoslavia", flag: "https://upload.wikimedia.org/wikipedia/commons/7/71/Flag_of_the_Socialist_Federal_Republic_of_Yugoslavia.svg", alignment: "No Alineados" },
                { id: "DDR", name: "Alemania Oriental", flag: "https://upload.wikimedia.org/wikipedia/commons/a/a1/Flag_of_East_Germany.svg", alignment: "Pacto de Varsovia" },
                { id: "CSK", name: "Checoslovaquia", flag: "https://upload.wikimedia.org/wikipedia/commons/c/cb/Flag_of_the_Czech_Republic.svg", alignment: "Pacto de Varsovia" },
                { id: "UAR", name: "República Árabe Unida", flag: "https://upload.wikimedia.org/wikipedia/commons/f/fe/Flag_of_the_United_Arab_Republic.svg", alignment: "No Alineados" }
            ];
        } catch(e) { console.error("Data Sync Failure", e); }
        this.showMenu();
    }

    showMenu() {
        this.isRunning = false;
        this.uiContainer.innerHTML = `
            <div style="text-align:center; animation: fadeIn 0.5s; display:flex; flex-direction:column; align-items:center;">
                <h1 id="geo-title" style="font-size:3.2rem; letter-spacing:8px; margin-bottom:5px;">GEO-NET</h1>
                <p style="color:#64748b; font-size:0.8rem; margin-bottom:40px; font-family:monospace;">SELECCIONA PROTOCOLO DE ENLACE</p>
                <div class="geo-menu-grid">
                    <div class="geo-mode-card" id="mode-normal" style="border-color:#3b82f6; color:#3b82f6;"><i class="fa-solid fa-earth-americas"></i><span>NORMAL</span></div>
                    <div class="geo-mode-card" id="mode-intel" style="border-color:#06b6d4; color:#06b6d4;"><i class="fa-solid fa-building-columns"></i><span>INTEL</span></div>
                    <div class="geo-mode-card" id="mode-frontier" style="border-color:#f97316; color:#f97316;"><i class="fa-solid fa-map-location-dot"></i><span>FRONTERA</span></div>
                    <div class="geo-mode-card" id="mode-war" style="border-color:#fbbf24; color:#fbbf24;"><i class="fa-solid fa-person-military-to-person"></i><span>60s WAR</span></div>
                    <div class="geo-mode-card" id="mode-ghost" style="border-color:#ef4444; color:#ef4444;"><i class="fa-solid fa-ghost"></i><span>GHOST</span></div>
                    <div class="geo-mode-card" id="mode-terminal" style="border-color:#10b981; color:#10b981;"><i class="fa-solid fa-terminal"></i><span>TERMINAL</span></div>
                </div>
                <div style="display:flex; gap:20px; align-items:center; margin-top:20px;">
                    <button class="btn-overclock ${this.isOverclocked ? 'active' : ''}" id="btn-overclock">OVERCLOCK: ${this.isOverclocked ? 'ON' : 'OFF'}</button>
                    <button class="btn btn-secondary" onclick="window.app.game.onQuit(0)">DESCONECTAR</button>
                </div>
            </div>`;
        resolveText(document.getElementById('geo-title'), "GEO-NET"); // [cite: 65]
        document.getElementById('mode-normal').onclick = () => this.startSession('NORMAL');
        document.getElementById('mode-intel').onclick = () => this.startSession('INTEL');
        document.getElementById('mode-frontier').onclick = () => this.startSession('FRONTERA');
        document.getElementById('mode-war').onclick = () => this.startSession('WAR');
        document.getElementById('mode-ghost').onclick = () => this.startSession('GHOST');
        document.getElementById('mode-terminal').onclick = () => this.startSession('TERMINAL');
        document.getElementById('btn-overclock').onclick = (e) => this.toggleOverclock(e.target);
    }

    toggleOverclock(btn) {
        this.isOverclocked = !this.isOverclocked;
        btn.classList.toggle('active');
        btn.innerText = `OVERCLOCK: ${this.isOverclocked ? 'ON' : 'OFF'}`;
        this.audio.playTone(this.isOverclocked ? 800 : 400, 'square', 0.1); // [cite: 130]
    }

    startSession(mode) {
        this.mode = mode;
        this.score = 0;
        this.integrity = 100;
        this.isRunning = true;
        this.currentCountry = null;
        this.nextQuestion();
    }

    nextQuestion() {
        if (!this.isRunning) return;
        this.isProcessing = false;
        this.currentBlur = 20;
        const all = Array.from(this.countryMap.values());
        
        if (this.mode === 'TERMINAL') {
            this.currentQuestion = all[Math.floor(Math.random() * all.length)];
            this.currentCheckFn = (input) => {
                const dist = this.getLevenshtein(input.value.trim().toLowerCase(), this.currentQuestion.name.common.toLowerCase());
                return dist <= 2; // Tolerancia de error tipográfico 
            };
            this.renderTerminal();
        } else if (this.mode === 'GHOST') {
            this.currentQuestion = this.extinctData[Math.floor(Math.random() * this.extinctData.length)];
            this.currentCheckFn = (btn) => btn.dataset.id === this.currentQuestion.id;
            this.renderGhost();
        } else if (this.mode === 'WAR') {
            const warCandidates = this.extinctData.concat(all.slice(0, 10));
            this.currentQuestion = warCandidates[Math.floor(Math.random() * warCandidates.length)];
            this.currentCheckFn = (btn) => btn.dataset.val === (this.currentQuestion.alignment || "No Alineados");
            this.renderWar();
        } else if (this.mode === 'FRONTERA') {
            if(!this.currentCountry) this.currentCountry = all.find(c => c.borders && c.borders.length > 1);
            const neighbors = (this.currentCountry.borders || []).map(id => this.countryMap.get(id)).filter(n => n);
            this.currentQuestion = neighbors[Math.floor(Math.random() * neighbors.length)];
            this.currentCheckFn = (btn) => (this.currentCountry.borders || []).includes(btn.dataset.id);
            this.renderStandard([this.currentQuestion, ...this.getRandom(all, 3, this.currentQuestion.cca2)]);
        } else {
            this.currentQuestion = all[Math.floor(Math.random() * all.length)];
            this.currentCheckFn = (btn) => btn.dataset.id === this.currentQuestion.cca2;
            this.renderStandard([this.currentQuestion, ...this.getRandom(all, 3, this.currentQuestion.cca2)]);
        }
    }

    renderStandard(options) {
        options.sort(() => Math.random() - 0.5);
        const display = this.mode === 'NORMAL' ? this.currentQuestion.cca2 : this.currentQuestion.name.common;
        this.uiContainer.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center;">
                <div style="display:flex; justify-content:space-between; width:600px; margin-bottom:20px;">
                    <div class="integrity-bar"><div class="integrity-fill" style="width:${this.integrity}%"></div></div>
                    <div style="color:white; font-family:monospace;">DATA: ${this.score}</div>
                </div>
                <div style="background:rgba(15,23,42,0.9); border:2px solid var(--primary); padding:50px; border-radius:16px; margin-bottom:30px; text-align:center; width:500px;">
                    <div style="font-size:6.5rem; color:#00ffff; font-family:var(--font-display);">${display}</div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; width:600px;">
                    ${options.map(opt => `<button class="geo-btn" data-id="${opt.cca2}">${this.mode === 'NORMAL' ? opt.name.common : (opt.capital ? opt.capital[0] : 'N/A')}</button>`).join('')}
                </div>
            </div>`;
        this.startTimer(this.isOverclocked ? 3 : 2);
        this.bindEvents();
    }

    renderTerminal() {
        this.uiContainer.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center;">
                <h2 style="font-family:var(--font-display); color:#10b981; margin-bottom:30px;">ACCESO TERMINAL</h2>
                <div style="background:black; border:2px solid #10b981; padding:60px; border-radius:16px; margin-bottom:30px; text-align:center; width:500px;">
                    <div style="font-size:7rem; color:#10b981; font-family:var(--font-display);">${this.currentQuestion.cca2}</div>
                    <p style="color:#10b981; margin-top:20px;">TECLEE NOMBRE DEL PAÍS</p>
                </div>
                <input type="text" class="hacking-input" id="h-input" autofocus autocomplete="off">
            </div>`;
        const input = document.getElementById('h-input');
        input.onkeydown = (e) => {
            if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return; 
            if(e.key === 'Enter') this.handleAnswer(input, this.currentCheckFn(input));
        };
        this.startTimer(1);
    }

    renderGhost() {
        const options = [this.currentQuestion, ...this.getRandom(this.extinctData, 3, this.currentQuestion.id)].sort(() => 0.5 - Math.random());
        this.uiContainer.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; width:100%;">
                <h2 style="font-family:var(--font-display); font-size:1.5rem; color:#ef4444; margin-bottom:20px;">ARQUEOLOGÍA DIGITAL</h2>
                <div class="ghost-flag-container"><img src="${this.currentQuestion.flag}" class="ghost-flag" id="flag-img"></div>
                <button class="geo-btn" id="btn-enhance" style="margin:15px 0;">> MEJORAR SEÑAL</button>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; width:600px;">
                    ${options.map(opt => `<button class="geo-btn" data-id="${opt.id}">${opt.name}</button>`).join('')}
                </div>
            </div>`;
        document.getElementById('btn-enhance').onclick = () => {
            this.currentBlur = Math.max(0, this.currentBlur - 5);
            document.getElementById('flag-img').style.filter = `blur(${this.currentBlur}px) contrast(200%)`;
        };
        this.bindEvents();
        this.startTimer(1.5);
    }

    renderWar() {
        this.uiContainer.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center;">
                <h2 style="font-family:var(--font-display); color:#fbbf24; margin-bottom:30px;">CRONOLÍNEA 60s</h2>
                <div style="background:black; border:2px solid #fbbf24; padding:50px; border-radius:16px; margin-bottom:30px; text-align:center; width:500px;">
                    <div style="font-size:3.5rem; color:white;">${this.currentQuestion.name.common || this.currentQuestion.name}</div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; width:600px;">
                    <button class="geo-btn" data-val="OTAN">OTAN</button>
                    <button class="geo-btn" data-val="Pacto de Varsovia">VARSOVIA</button>
                    <button class="geo-btn" data-val="No Alineados">NEUTRAL</button>
                </div>
            </div>`;
        this.bindEvents();
        this.startTimer(2);
    }

    getLevenshtein(a, b) {
        const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
        for (let j = 1; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                matrix[i][j] = b[i - 1] === a[j - 1] ? matrix[i - 1][j - 1] : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
            }
        }
        return matrix[b.length][a.length];
    }

    bindEvents() {
        document.querySelectorAll('.geo-btn').forEach(btn => {
            btn.onclick = () => this.handleAnswer(btn, this.currentCheckFn(btn));
        });
    }

    handleAnswer(element, isCorrect) {
        if (this.isProcessing || !this.isRunning) return;
        this.isProcessing = true;
        if(this.timer) clearInterval(this.timer);

        if (isCorrect) {
            if(element.classList) element.classList.add('correct');
            this.score += 10 * (this.isOverclocked ? 2 : 1);
            this.audio.playWin(1); // [cite: 133]
            if(this.mode === 'FRONTERA') this.currentCountry = this.countryMap.get(element.dataset.id);
            setTimeout(() => this.nextQuestion(), 800);
        } else {
            this.takeDamage(element);
        }
    }

    takeDamage(element) {
        if (!this.isRunning) return;
        this.integrity -= 34; // [cite: 188-190]
        if(element && element.classList) element.classList.add('wrong');
        this.audio.playLose(); // [cite: 135]

        if (this.currentCheckFn) {
            document.querySelectorAll('.geo-btn').forEach(btn => {
                if (this.currentCheckFn(btn)) btn.classList.add('correct');
            });
        }

        const noise = document.getElementById('noise-layer');
        if(noise) noise.style.opacity = (1 - (this.integrity / 100)) * 0.2;

        if (this.integrity <= 0) {
            this.gameOver();
        } else {
            setTimeout(() => this.nextQuestion(), 1200);
        }
    }

    startTimer(speed) {
        if(this.timer) clearInterval(this.timer);
        let current = 100;
        this.timer = setInterval(() => {
            current -= speed;
            if(current <= 0) { clearInterval(this.timer); this.takeDamage(); }
        }, 100);
    }

    gameOver() {
        if (!this.isRunning) return;
        this.isRunning = false;
        clearInterval(this.timer);
        this.onQuit(this.score);
    }

    getRandom(arr, count, exclude) { return arr.filter(i => (i.cca2 || i.id) !== exclude).sort(() => 0.5 - Math.random()).slice(0, count); }
}