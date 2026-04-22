import { CONFIG } from '../config.js';
import { icon } from '../systems/icons.js';
import { mountGameFrame, unmountGameFrame } from '../systems/pixi-stage.js';

const LIVES_START = 3;
const TARGET_ROUNDS = 10;

export class BioScanGame {
    constructor(canvas, audio, onGameOver) {
        this.canvas = canvas;
        this.audio = audio;
        this.onGameOver = onGameOver;
        this.breeds = [];
        this.currentBreed = null;
        this.timerInterval = null;
        this.score = 0;
        this.questionsAnswered = 0;
        this.lives = LIVES_START;
        this.winStreak = 0;
        this.creditsEarned = 0;
        this.isProcessing = false;
        this.hintShown = false;
        this._quitTimers = [];
        this.uiContainer = document.getElementById('game-ui-overlay');

        // Power-ups por partida (1 uso cada)
        this.powerups = {
            fifty: { used:false, cost:15, name:'50/50',  ic:'scaleBalanced' },
            hint:  { used:false, cost:10, name:'PISTA',  ic:'eye' },
            skip:  { used:false, cost:25, name:'SALTAR', ic:'forward' }
        };

        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('bio-styles')) return;
        const style = document.createElement('style');
        style.id = 'bio-styles';
        // ... (MISMOS ESTILOS QUE YA TENÍAS, NO CAMBIAN) ...
        style.innerHTML = `
            .bio-scanner-frame { position: relative; width: 280px; height: 280px; border: 2px solid #84cc16; border-radius: 12px; overflow: hidden; margin-bottom: 20px; box-shadow: 0 0 20px rgba(132, 204, 22, 0.2); background: #000; }
            .bio-image { width: 100%; height: 100%; object-fit: cover; filter: sepia(100%) hue-rotate(50deg) saturate(300%) blur(10px); transition: filter 0.1s linear; }
            .bio-laser { position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: #84cc16; box-shadow: 0 0 15px #84cc16; animation: scanMove 2s linear infinite; z-index: 10; opacity: 0.8; }
            @keyframes scanMove { 0% { top: 0%; } 50% { top: 100%; } 100% { top: 0%; } }
            .bio-hud-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; background: linear-gradient(to right, #84cc16 2px, transparent 2px) 0 0, linear-gradient(to bottom, #84cc16 2px, transparent 2px) 0 0, linear-gradient(to left, #84cc16 2px, transparent 2px) 100% 0, linear-gradient(to bottom, #84cc16 2px, transparent 2px) 100% 0, linear-gradient(to left, #84cc16 2px, transparent 2px) 100% 100%, linear-gradient(to top, #84cc16 2px, transparent 2px) 100% 100%, linear-gradient(to right, #84cc16 2px, transparent 2px) 0 100%, linear-gradient(to top, #84cc16 2px, transparent 2px) 0 100%; background-size: 20px 20px; background-repeat: no-repeat; opacity: 0.5; }
            .bio-option-btn { background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(132, 204, 22, 0.3); color: #a3e635; padding: 15px; font-size: 0.9rem; text-transform: uppercase; cursor: pointer; transition: all 0.2s; border-radius: 4px; }
            .bio-option-btn:hover:not(:disabled) { background: rgba(132, 204, 22, 0.2); box-shadow: 0 0 15px rgba(132, 204, 22, 0.4); border-color: #84cc16; color: white; }
            .bio-option-btn:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(0.8); }
            .bio-option-btn.correct { background: #10b981 !important; color: black !important; border-color: #fff !important; box-shadow: 0 0 20px #10b981; }
            .bio-option-btn.wrong { background: #ef4444 !important; color: white !important; animation: shake 0.3s; }
            .bio-option-btn.eliminated { opacity: 0.18; pointer-events: none; filter: grayscale(1); }
            .bio-option-btn.hinted { border-color: #fbbf24 !important; box-shadow: 0 0 14px rgba(251,191,36,0.45); }

            .bio-hud { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; width:100%; max-width:500px; margin-bottom:10px; }
            .bio-hud-cell { background:rgba(5,10,20,0.9); border:1px solid rgba(132,204,22,0.2); border-radius:10px; padding:6px 10px; position:relative; overflow:hidden; }
            .bio-hud-cell::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg, transparent, rgba(132,204,22,0.5), transparent); }
            .bio-hud-cell-lbl { font-size:0.5rem; color:rgba(132,204,22,0.75); letter-spacing:2px; font-family:monospace; text-transform:uppercase; }
            .bio-hud-cell-val { font-family:var(--font-display); font-size:1rem; color:white; line-height:1.1; margin-top:2px; }
            .bio-lives { display:flex; gap:4px; }
            .bio-life { font-size:0.85rem; color:#ef4444; filter:drop-shadow(0 0 5px #ef4444); transition:all 0.3s; }
            .bio-life.lost { color:#334155; filter:none; opacity:0.3; transform:scale(0.85); }

            .bio-powerups { display:flex; gap:8px; justify-content:center; margin-bottom:12px; width:100%; max-width:500px; }
            .bio-pu { flex:1; max-width:130px; padding:6px; background:rgba(10,16,30,0.85); border:1.5px solid rgba(255,255,255,0.1); border-radius:10px; display:flex; flex-direction:column; align-items:center; gap:2px; cursor:pointer; transition:all 0.15s; }
            .bio-pu:hover:not(.used) { transform:translateY(-2px); border-color:rgba(132,204,22,0.5); }
            .bio-pu.used { opacity:0.25; filter:grayscale(1); pointer-events:none; }
            .bio-pu-icon { font-size:0.95rem; color:#84cc16; }
            .bio-pu-name { font-family:var(--font-display); font-size:0.6rem; letter-spacing:1.5px; color:white; }
            .bio-pu-cost { font-size:0.5rem; color:#fbbf24; font-family:monospace; }

            .bio-hint-banner { font-size:0.68rem; color:#fbbf24; letter-spacing:1.3px; font-family:monospace; background:rgba(251,191,36,0.1); border:1px solid rgba(251,191,36,0.4); border-radius:8px; padding:5px 10px; text-align:center; margin-bottom:8px; }
        `;
        document.head.appendChild(style);
    }

    async init() {
        if(window.app.credits < 20){
            try{ window.app.showToast("FONDOS INSUFICIENTES","Costo: $20","danger"); }catch(e){}
            if(this.onGameOver) this.onGameOver(0); return;
        }
        this.showModeSelect();
    }

    showModeSelect() {
        const modes = [
            { id:'bs-normal', mc:'#84cc16', icon:'fa-dna',      name:'ANÁLISIS',   desc:'Identifica la raza · desenfoque lento' },
            { id:'bs-speed',  mc:'#fbbf24', icon:'fa-bolt',     name:'VELOCIDAD',  desc:'Timer reducido · respuesta rápida'     },
            { id:'bs-expert', mc:'#ef4444', icon:'fa-flask',    name:'EXPERTO',    desc:'6 opciones · doble dificultad'         },
        ];
        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;">BIO-SCAN</div>
                <div style="font-size:0.65rem;color:#84cc16;letter-spacing:3px;font-family:monospace;">IDENTIFICACIÓN BIOLÓGICA</div>
                <div style="width:120px;height:1px;background:#84cc16;margin:10px auto 0;opacity:0.5;"></div>
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
            <button class="btn btn-secondary" id="bs-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;
        document.getElementById('bs-normal').onclick = () => this.payAndStart('NORMAL');
        document.getElementById('bs-speed').onclick  = () => this.payAndStart('SPEED');
        document.getElementById('bs-expert').onclick = () => this.payAndStart('EXPERT');
        document.getElementById('bs-back').onclick   = () => { if(this.onGameOver) this.onGameOver(0); };
    }

    async payAndStart(mode) {
        this.mode = mode;
        this.optionCount = mode === 'EXPERT' ? 6 : 4;
        this.timerSpeed = mode === 'SPEED' ? 1.2 : 0.5;
        try {
            const c = mode === 'SPEED' ? '#ef4444' : mode === 'EXPERT' ? '#a855f7' : '#06b6d4';
            this._frame = mountGameFrame({ color: c });
        } catch(e) {}

        if(this.breeds.length === 0) {
            this.uiContainer.innerHTML = '<div class="loader"></div><p style="margin-top:10px;color:var(--bio)">CARGANDO BASE DE DATOS...</p>';
            try {
                const res = await fetch('https://dog.ceo/api/breeds/list/all');
                const data = await res.json();
                this.breeds = Object.keys(data.message);
            } catch(e) {
                this.uiContainer.innerHTML = `
                <div class="game-error-panel">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <div class="gep-title">ERROR DE RED</div>
                    <div class="gep-msg">No se pudo cargar la base de datos biométrica. Verifica tu conexión.</div>
                    <div class="gep-hint">REGRESANDO AL LOBBY...</div>
                </div>`;
                this._quitTimers.push(setTimeout(() => { if(this.onGameOver) this.onGameOver(0); }, 2500));
                return;
            }
        }

        window.app.credits -= 20;
        document.getElementById('val-credits').innerText = window.app.credits;
        this.audio.playBuy();
        try{ this.canvas.setMood('BIO'); }catch(e){}
        this.score = 0;
        this.questionsAnswered = 0;
        this.lives = LIVES_START;
        this.winStreak = 0;
        this.creditsEarned = 0;
        Object.values(this.powerups).forEach(p => p.used = false);
        this.nextRound();
    }

    // ... (nextRound, formatBreed, render, startTimer SON IGUALES, COPIALOS DE TU CÓDIGO ANTERIOR) ...
    async nextRound() {
        this.isProcessing = false;
        this.hintShown = false;
        this.questionStartTime = performance.now();
        clearInterval(this.timerInterval);
        this.uiContainer.innerHTML = '<div class="loader"></div><p style="margin-top:10px; color:var(--bio)">ANALIZANDO ADN...</p>';
        try {
            const res = await fetch('https://dog.ceo/api/breeds/image/random');
            const data = await res.json();
            const breedPart = data.message.split('/breeds/')[1].split('/')[0];
            this.currentBreed = breedPart; 
            const options = [breedPart];
            while(options.length < (this.optionCount||4)) {
                const r = this.breeds[Math.floor(Math.random() * this.breeds.length)];
                if(!options.includes(r)) options.push(r);
            }
            options.sort(() => Math.random() - 0.5);
            this.render(data.message, options);
        } catch(e) {
            if(this.onGameOver) this.onGameOver(this.score);
        }
    }

    cleanup() {
        try { unmountGameFrame(); } catch(e) {}
        if(this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
        this._quitTimers.forEach(id => clearTimeout(id));
        this._quitTimers = [];
    }
    pause() {
        this._paused = true;
        if(this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    }
    resume() {
        if(!this._paused) return;
        this._paused = false;
        if(!this.isProcessing) this.startTimer();
    }
    formatBreed(str) { return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '); }

    render(imgUrl, options) {
        const livesHtml = Array.from({length: LIVES_START}).map((_, i) =>
            `<span class="bio-life ${i < LIVES_START - this.lives ? 'lost' : ''}">${icon('heart')}</span>`
        ).join('');
        const puHtml = Object.entries(this.powerups).map(([key, p]) => `
            <div class="bio-pu ${p.used?'used':''}" data-pu="${key}">
                <div class="bio-pu-icon">${icon(p.ic)}</div>
                <div class="bio-pu-name">${p.name}</div>
                <div class="bio-pu-cost">-${p.cost} CR</div>
            </div>`).join('');

        this.uiContainer.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; width:100%; max-width:500px; margin:0 auto; padding:0 16px;">
                <div class="bio-hud">
                    <div class="bio-hud-cell"><div class="bio-hud-cell-lbl">MUESTRA</div><div class="bio-hud-cell-val">${this.questionsAnswered + 1}<span style="font-size:0.6rem;color:#64748b;margin-left:2px;">/${TARGET_ROUNDS}</span></div></div>
                    <div class="bio-hud-cell"><div class="bio-hud-cell-lbl">RACHA</div><div class="bio-hud-cell-val" style="color:${this.winStreak>=3?'#f97316':'#84cc16'};">${this.winStreak}</div></div>
                    <div class="bio-hud-cell"><div class="bio-hud-cell-lbl">VIDAS</div><div class="bio-hud-cell-val"><span class="bio-lives">${livesHtml}</span></div></div>
                    <div class="bio-hud-cell"><div class="bio-hud-cell-lbl">MODO</div><div class="bio-hud-cell-val" style="color:#84cc16;font-size:0.72rem;">${this.mode}</div></div>
                </div>
                <div class="bio-scanner-frame">
                    <div class="bio-hud-overlay"></div>
                    <div class="bio-laser"></div>
                    <img src="${imgUrl}" class="bio-image" id="bio-img">
                </div>
                <div class="timer-bar-bg" style="margin-bottom:12px;">
                    <div class="timer-bar-fill" id="b-timer" style="background:var(--bio); width:100%;"></div>
                </div>
                <div class="bio-powerups">${puHtml}</div>
                <div class="trivia-answers">
                    ${options.map(opt => `<button class="bio-option-btn" data-val="${opt}" data-correct="${opt===this.currentBreed?'1':'0'}">${this.formatBreed(opt)}</button>`).join('')}
                </div>
            </div>`;
        this.startTimer();
        document.querySelectorAll('.bio-option-btn').forEach(btn => {
            btn.onclick = () => this.check(btn.dataset.val === this.currentBreed, btn);
        });
        document.querySelectorAll('[data-pu]').forEach(pu => {
            pu.onclick = () => {
                if (this.isProcessing || this.powerups[pu.dataset.pu]?.used) return;
                this.usePowerup(pu.dataset.pu);
            };
        });
    }

    startTimer() {
        const timerBar = document.getElementById('b-timer');
        const bioImg = document.getElementById('bio-img');
        let timeLeft = 100;
        if(bioImg) bioImg.style.filter = `blur(15px) grayscale(100%) sepia(100%) hue-rotate(50deg)`;
        // timerSpeed handled
        this.timerInterval = setInterval(() => {
            timeLeft -= (this.timerSpeed||0.5);
            if(timerBar) {
                timerBar.style.width = timeLeft + "%";
                if(timeLeft < 20) timerBar.style.backgroundColor = CONFIG.COLORS.ACCENT;
            }
            if(bioImg) {
                const blurVal = (timeLeft / 100) * 15;
                const filterVal = timeLeft / 100;
                bioImg.style.filter = `blur(${blurVal}px) grayscale(${filterVal * 100}%) sepia(${filterVal * 100}%) hue-rotate(${filterVal * 50}deg)`;
            }
            if(timeLeft <= 0) this.timeOut();
        }, 50);
    }

    timeOut() {
        clearInterval(this.timerInterval);
        if (this.isProcessing) return;
        this.isProcessing = true;

        const btns = document.querySelectorAll('.bio-option-btn');
        btns.forEach(b => {
            b.disabled = true;
            if(b.dataset.val === this.currentBreed) b.classList.add('correct');
        });

        this.audio.playLose();
        try { window.app.showToast("TIEMPO AGOTADO", `Muestra perdida · ${this.lives-1} vidas`, "danger"); } catch(e) {}
        this.loseLife();
    }

    check(isCorrect, clickedBtn) {
        if (this.isProcessing) return;
        this.isProcessing = true;
        clearInterval(this.timerInterval);

        const img = document.getElementById('bio-img');
        if(img) img.style.filter = 'none';

        const btns = document.querySelectorAll('.bio-option-btn');
        btns.forEach(b => {
            b.disabled = true;
            if(b.dataset.val === this.currentBreed) {
                b.classList.add('correct');
                b.style.opacity = "1";
            } else if(b === clickedBtn && !isCorrect) {
                b.classList.add('wrong');
            } else {
                b.style.opacity = "0.3";
            }
        });

        if(isCorrect) {
            // Speed bonus: tiempo desde questionStartTime
            const elapsed = (performance.now() - (this.questionStartTime||performance.now())) / 1000;
            let speedMulti = 1;
            if (elapsed < 3) speedMulti = 2;
            else if (elapsed < 6) speedMulti = 1.5;
            else if (elapsed < 10) speedMulti = 1.2;

            this.winStreak++;
            let streakMulti = 1;
            if (this.winStreak >= 10) streakMulti = 5;
            else if (this.winStreak >= 5) streakMulti = 3;
            else if (this.winStreak >= 3) streakMulti = 2;

            const modeMulti = this.mode === 'EXPERT' ? 2 : (this.mode === 'SPEED' ? 1.5 : 1);
            const baseReward = 40;
            const gained = Math.floor(baseReward * speedMulti * streakMulti * modeMulti);

            this.audio.playWin(streakMulti >= 3 ? 10 : 1);
            this.score++;
            this.questionsAnswered++;
            this.creditsEarned += gained;
            window.app.credits += gained;
            const speedLabel = speedMulti >= 2 ? ' ¡RELÁMPAGO!' : (speedMulti >= 1.5 ? ' ¡RÁPIDO!' : '');
            const streakLabel = streakMulti > 1 ? ` RACHA ×${streakMulti}` : '';
            try { window.app.showToast("ADN CONFIRMADO" + speedLabel, `+$${gained}${streakLabel}`, 'success'); } catch(e) {}
            window.app.save();
            document.getElementById('val-credits').innerText = window.app.credits;
            if(window.app.canvas) window.app.canvas.explode(null, null, CONFIG.COLORS.BIO);

            if (this.questionsAnswered >= TARGET_ROUNDS) {
                this._quitTimers.push(setTimeout(() => this.finishRun(true), 1500));
            } else {
                this._quitTimers.push(setTimeout(() => this.nextRound(), 1500));
            }
        } else {
            this.audio.playLose();
            try { window.app.showToast("ADN INCORRECTO", `${this.lives-1} vidas restantes`, 'danger'); } catch(e) {}
            this.loseLife();
        }
    }

    loseLife() {
        this.lives--;
        this.winStreak = 0;
        if (this.lives <= 0) {
            this._quitTimers.push(setTimeout(() => this.finishRun(false), 1500));
        } else {
            this.questionsAnswered++;
            if (this.questionsAnswered >= TARGET_ROUNDS) {
                this._quitTimers.push(setTimeout(() => this.finishRun(true), 1500));
            } else {
                this._quitTimers.push(setTimeout(() => this.nextRound(), 1500));
            }
        }
    }

    finishRun(completed) {
        if (completed && this.lives > 0) {
            const perfectBonus = this.lives === LIVES_START ? 300 : 150;
            this.creditsEarned += perfectBonus;
            window.app.credits += perfectBonus;
            try { window.app.showToast("RUN COMPLETADA", `+${perfectBonus} CR BONUS`, 'success'); } catch(e) {}
            window.app.save();
        }
        if (this.onGameOver) this.onGameOver(this.score);
    }

    usePowerup(key) {
        const p = this.powerups[key];
        if (!p || p.used) return;
        if (window.app.credits < p.cost) {
            try { window.app.showToast('SIN CRÉDITOS', `Necesitas ${p.cost} CR`, 'danger'); } catch(e) {}
            return;
        }
        window.app.credits -= p.cost;
        document.getElementById('val-credits').innerText = window.app.credits;
        try { this.audio.playClick(); } catch(e) {}
        p.used = true;
        if (key === 'fifty') this.applyFifty();
        else if (key === 'hint') this.applyHint();
        else if (key === 'skip') this.applySkip();
        const puEl = this.uiContainer.querySelector(`[data-pu="${key}"]`);
        if (puEl) puEl.classList.add('used');
    }

    applyFifty() {
        const wrong = Array.from(this.uiContainer.querySelectorAll('.bio-option-btn[data-correct="0"]'));
        wrong.sort(() => Math.random() - 0.5);
        wrong.slice(0, 2).forEach(b => b.classList.add('eliminated'));
        try { window.app.showToast('50/50', '2 razas eliminadas', 'info'); } catch(e) {}
    }

    applyHint() {
        const correctBtn = this.uiContainer.querySelector('.bio-option-btn[data-correct="1"]');
        if (correctBtn) correctBtn.classList.add('hinted');
        // Desenfocar imagen menos (foco extra)
        const img = document.getElementById('bio-img');
        if (img) {
            const prev = img.style.filter;
            img.style.filter = 'none';
            setTimeout(() => { if (img && this.timerInterval) img.style.filter = prev; }, 1500);
        }
        // Banner con primera letra
        const frame = this.uiContainer.querySelector('.bio-scanner-frame');
        if (frame) {
            const banner = document.createElement('div');
            banner.className = 'bio-hint-banner';
            banner.style.cssText += 'margin-top:10px;';
            banner.innerHTML = `${icon('eye')} PISTA: empieza con "${this.currentBreed.charAt(0).toUpperCase()}" · foco 1.5s`;
            frame.parentNode.insertBefore(banner, frame.nextSibling);
        }
        try { window.app.showToast('PISTA', 'Foco momentáneo · primera letra', 'info'); } catch(e) {}
    }

    applySkip() {
        try { window.app.showToast('SALTAR', 'Muestra nueva', 'info'); } catch(e) {}
        clearInterval(this.timerInterval);
        this.nextRound();
    }
}