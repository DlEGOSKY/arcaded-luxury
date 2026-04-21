import { CONFIG } from '../config.js';

export class MathRushGame {
    constructor(canvas, audio, onQuit) {
        this.audio = audio;
        this.onQuit = onQuit;
        
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.speed = 2;
        this.isRunning = false;
        this.equations = [];
        this.spawnTimer = null;
        this.gameLoopId = null;
        this.mode = 'CLASSIC';        // CLASSIC | BLITZ | MULTIPLY
        this.timeLeft = 0;
        this.timerInt = null;
        // NUEVAS MECÁNICAS
        this.streak = 0;
        this.maxStreak = 0;
        this.freezeAvailable = 1;
        this.freezeActive = false;
        this.freezeTimer = null;
        this.skipAvailable = 2;
        
        this.uiScore = document.getElementById('ui-score');
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('math-styles')) return;
        const style = document.createElement('style');
        style.id = 'math-styles';
        // ... (ESTILOS IGUALES, SIN CAMBIOS) ...
        style.innerHTML = `
            .math-menu-container { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; animation: fadeIn 0.5s; background: radial-gradient(circle at center, rgba(59, 130, 246, 0.1) 0%, transparent 70%); }
            .math-start-card { background: rgba(15, 23, 42, 0.8); border: 2px solid #3b82f6; border-radius: 16px; padding: 30px; text-align: center; width: 280px; cursor: pointer; transition: all 0.2s; box-shadow: 0 0 20px rgba(59, 130, 246, 0.2); display: flex; flex-direction: column; align-items: center; gap: 15px; }
            .math-start-card:hover { transform: scale(1.05); background: rgba(59, 130, 246, 0.1); border-color: #60a5fa; box-shadow: 0 0 30px rgba(59, 130, 246, 0.4); }
            .math-start-icon { font-size: 4rem; color: #3b82f6; text-shadow: 0 0 15px #3b82f6; }
            .math-start-title { font-family: var(--font-display); font-size: 1.5rem; color: white; letter-spacing: 2px; }
            .math-cost { font-family: monospace; color: #94a3b8; background: rgba(0,0,0,0.3); padding: 5px 10px; border-radius: 4px; }
            .math-lives-indicator { position: absolute; top: 80px; left: 50%; transform: translateX(-50%); font-size: 1.5rem; z-index: 30; filter: drop-shadow(0 0 5px rgba(239,68,68,0.5)); letter-spacing: 5px; animation: pulse 2s infinite; pointer-events: none; }
            @keyframes pulse { 0%,100% { opacity: 1; transform: translateX(-50%) scale(1); } 50% { opacity: 0.8; transform: translateX(-50%) scale(0.95); } }
            .zone-indicator { position: absolute; bottom: 0; width: 50%; height: 120px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 30px; font-weight: bold; font-size: 1.2rem; letter-spacing: 2px; z-index: 0; pointer-events: none; }
            .zone-true { left: 0; background: linear-gradient(to top, rgba(16, 185, 129, 0.15), transparent); color: #10b981; border-top: 2px solid rgba(16, 185, 129, 0.5); }
            .zone-false { right: 0; background: linear-gradient(to top, rgba(239, 68, 68, 0.15), transparent); color: #ef4444; border-top: 2px solid rgba(239, 68, 68, 0.5); }
            .math-card { position: absolute; left: 50%; transform: translateX(-50%); background: #0f172a; border: 2px solid #3b82f6; color: white; padding: 15px 20px; border-radius: 12px; font-family: monospace; font-size: 1.5rem; font-weight: bold; box-shadow: 0 0 15px rgba(59, 130, 246, 0.3); z-index: 10; width: 200px; text-align: center; pointer-events: none; }
            .math-card.correct { border-color: #10b981; background: #10b981; color: black; animation: popOut 0.2s forwards; }
            .math-card.wrong { border-color: #ef4444; background: #ef4444; animation: shake 0.3s; }
            @keyframes popOut { to { transform: translateX(-50%) scale(1.5); opacity: 0; } }
            .math-touch-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 5; display: flex; }
            .touch-zone { flex: 1; height: 100%; cursor: pointer; }
            .touch-zone:active { background: rgba(255,255,255,0.05); }
            /* Streak chip */
            .mr-streak-chip { position:absolute; top:140px; left:50%; transform:translateX(-50%); padding:5px 14px; background:rgba(10,16,30,0.9); border:1.5px solid #f97316; border-radius:20px; color:#f97316; font-family:var(--font-display); font-size:0.68rem; letter-spacing:2px; pointer-events:none; z-index:30; opacity:0; transition:opacity 0.2s, transform 0.2s; }
            .mr-streak-chip.show { opacity:1; }
            .mr-streak-chip.hot { background:rgba(239,68,68,0.2); border-color:#ef4444; color:#ef4444; transform:translateX(-50%) scale(1.08); }
            /* Power-ups */
            .mr-pwrs { position:absolute; bottom:20px; left:50%; transform:translateX(-50%); display:flex; gap:10px; z-index:30; }
            .mr-pwr { padding:7px 12px; background:rgba(10,16,30,0.9); border:1.5px solid #3b82f6; border-radius:8px; color:#3b82f6; font-family:var(--font-display); font-size:0.62rem; letter-spacing:2px; cursor:pointer; transition:all 0.15s; display:flex; align-items:center; gap:6px; }
            .mr-pwr:hover:not(.used):not(.disabled) { background:rgba(59,130,246,0.15); transform:translateY(-2px); }
            .mr-pwr.used { opacity:0.3; pointer-events:none; filter:grayscale(1); }
            .mr-pwr.disabled { opacity:0.5; pointer-events:none; }
            .mr-pwr .cost { font-size:0.55rem; color:#94a3b8; }
            body.mr-freeze .math-card { animation:mrFrz 0.3s infinite alternate; }
            @keyframes mrFrz { from{filter:hue-rotate(0)} to{filter:hue-rotate(60deg) brightness(1.15)} }
            .mr-points-pop { position:absolute; top:0; left:50%; transform:translateX(-50%); font-family:var(--font-display); font-size:1.2rem; color:#fbbf24; text-shadow:0 0 12px #fbbf24; pointer-events:none; animation:mrPopFly 0.9s ease both; z-index:40; }
            @keyframes mrPopFly { from{opacity:1;transform:translate(-50%,0)} to{opacity:0;transform:translate(-50%,-40px)} }
        `;
        document.head.appendChild(style);
    }

    init() {
        if(window.app.credits < 15) { 
            try { window.app.showToast("FONDOS INSUFICIENTES", "Costo: $15", "danger"); } catch(e) {} 
            if(this.onQuit) this.onQuit(0);
            return; 
        }

        const modes = [
            { id:'mr-classic',  mc:'#3b82f6', icon:'fa-calculator',   name:'CLÁSICO',  desc:'Suma y resta · 3 vidas · sin límite' },
            { id:'mr-blitz',    mc:'#ef4444', icon:'fa-stopwatch',     name:'BLITZ',     desc:'45 segundos · tantas como puedas'  },
            { id:'mr-multiply', mc:'#a855f7', icon:'fa-xmark',         name:'MULTIPLY',  desc:'Solo multiplicación · más difícil'  },
        ];

        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;text-shadow:0 0 20px #3b82f6;">MATH RUSH</div>
                <div style="font-size:0.65rem;color:#3b82f6;letter-spacing:3px;font-family:monospace;">CÁLCULO DE EMERGENCIA</div>
                <div style="width:120px;height:1px;background:#3b82f6;margin:10px auto 0;opacity:0.5;"></div>
            </div>
            <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
                ${modes.map(m=>`
                <div style="width:165px;min-height:160px;background:rgba(10,16,30,0.9);border:1px solid ${m.mc}25;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:pointer;transition:all 0.15s;padding:20px 14px;position:relative;overflow:hidden;"
                     id="${m.id}"
                     onmouseenter="this.style.transform='translateY(-4px)';this.style.borderColor='${m.mc}';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)';"
                     onmouseleave="this.style.transform='';this.style.borderColor='${m.mc}25';this.style.boxShadow='';">
                    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${m.mc};opacity:0.6;"></div>
                    <i class="fa-solid ${m.icon}" style="font-size:1.8rem;color:${m.mc};filter:drop-shadow(0 0 8px ${m.mc});"></i>
                    <div style="font-family:var(--font-display);font-size:0.76rem;letter-spacing:2px;color:${m.mc};">${m.name}</div>
                    <div style="font-size:0.6rem;color:#475569;font-family:monospace;text-align:center;line-height:1.5;">${m.desc}</div>
                    <div style="font-size:0.55rem;color:#64748b;letter-spacing:1px;">COSTO: $15</div>
                </div>`).join('')}
            </div>
            <button class="btn btn-secondary" id="btn-math-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;

        document.getElementById('mr-classic').onclick  = () => this.payAndStart('CLASSIC');
        document.getElementById('mr-blitz').onclick    = () => this.payAndStart('BLITZ');
        document.getElementById('mr-multiply').onclick = () => this.payAndStart('MULTIPLY');
        document.getElementById('btn-math-back').onclick = () => { if(this.onQuit) this.onQuit(0); };
    }

    payAndStart(mode) {
        window.app.credits -= 15;
        try { document.getElementById('val-credits').innerText = window.app.credits; } catch(e){}
        try { this.audio.playBuy(); } catch(e) {}
        this.mode = mode || 'CLASSIC';
        this.start();
    }

    // ... (start, handleKeyInput, spawnEquation, checkAnswer, success, fail, loop IGUALES) ...
    start() {
        this.isRunning = true;
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        // Velocidad inicial según modo
        this.speed = this.mode === 'BLITZ' ? 0.55 : this.mode === 'MULTIPLY' ? 0.45 : 0.4;
        this.equations = [];
        this.streak = 0; this.maxStreak = 0;
        this.freezeAvailable = 1; this.freezeActive = false;
        this.skipAvailable = 2;
        // BLITZ: timer 45s, infinitas vidas
        if (this.mode === 'BLITZ') {
            this.timeLeft = 45;
            this.lives = 99;   // prácticamente infinitas
            if (this.timerInt) clearInterval(this.timerInt);
            this.timerInt = setInterval(() => {
                this.timeLeft--;
                const el = document.getElementById('mr-timer');
                if (el) {
                    el.innerText = this.timeLeft + 's';
                    el.style.color = this.timeLeft < 10 ? '#ef4444' : this.timeLeft < 20 ? '#f97316' : '#fbbf24';
                }
                if (this.timeLeft <= 0) { clearInterval(this.timerInt); this.gameOver(); }
            }, 1000);
        }
        if(this.uiScore) this.uiScore.innerText = '0';

        // HUD condicional según modo
        const livesHTML = this.mode === 'BLITZ'
            ? `<div class="math-lives-indicator" id="mr-timer" style="color:#fbbf24;font-family:var(--font-display);font-size:1.2rem;">45s</div>`
            : `<div class="math-lives-indicator" id="mr-lives"><i class="fa-solid fa-heart" style="color:#ec4899;margin:0 3px;"></i><i class="fa-solid fa-heart" style="color:#ec4899;margin:0 3px;"></i><i class="fa-solid fa-heart" style="color:#ec4899;margin:0 3px;"></i></div>`;

        const modeBadge = `<div style="position:absolute;top:20px;right:20px;padding:4px 10px;background:rgba(10,16,30,0.9);border:1px solid #3b82f6;border-radius:12px;color:#3b82f6;font-family:monospace;font-size:0.55rem;letter-spacing:2px;z-index:50;">${this.mode}</div>`;

        this.uiContainer.innerHTML = `
            ${modeBadge}
            ${livesHTML}
            <div class="zone-indicator zone-true">VERDAD (Izq)</div>
            <div class="zone-indicator zone-false">FALSO (Der)</div>
            <div id="math-track" style="position:absolute; top:0; left:0; width:100%; height:100%; overflow:hidden; pointer-events:none;"></div>
            <div class="math-touch-layer"><div class="touch-zone" id="touch-left"></div><div class="touch-zone" id="touch-right"></div></div>
            <div class="mr-streak-chip" id="mr-streak">RACHA ×0</div>
            <div class="mr-pwrs">
                <button class="mr-pwr" id="mr-freeze">FREEZE <span class="cost">$20</span></button>
                <button class="mr-pwr" id="mr-skip">SKIP ·2 <span class="cost">$10</span></button>
            </div>`;
        const frz = document.getElementById('mr-freeze');
        if (frz) frz.onclick = (e) => { e.stopPropagation(); this.activateFreeze(); };
        const skp = document.getElementById('mr-skip');
        if (skp) skp.onclick = (e) => { e.stopPropagation(); this.activateSkip(); };
        
        // Listener seguro que se borra al final
        this.keyHandler = this.handleKeyInput.bind(this);
        window.addEventListener('keydown', this.keyHandler);
        
        document.getElementById('touch-left').onpointerdown = (e) => { e.preventDefault(); this.checkAnswer(true); };
        document.getElementById('touch-right').onpointerdown = (e) => { e.preventDefault(); this.checkAnswer(false); };
        this.spawnEquation();
        this.loop();
    }

    handleKeyInput(e) {
        if(!this.isRunning) return;
        if (e.key === 'ArrowLeft' || e.key === 'a') this.checkAnswer(true);
        if (e.key === 'ArrowRight' || e.key === 'd') this.checkAnswer(false);
    }

    spawnEquation() {
        if (!this.isRunning) return;
        let a, b, opSymbol, realRes;

        if (this.mode === 'MULTIPLY') {
            // Solo multiplicación: 2-9 × 2-9 en nivel 1, crece con el level
            const maxMult = Math.min(9, 5 + this.level);
            a = Math.floor(Math.random() * (maxMult - 1)) + 2;   // 2..maxMult
            b = Math.floor(Math.random() * (maxMult - 1)) + 2;
            opSymbol = '×';
            realRes = a * b;
        } else {
            const maxNum = 5 * this.level;
            a = Math.floor(Math.random() * maxNum) + 1;
            b = Math.floor(Math.random() * maxNum) + 1;
            const isPlus = Math.random() > 0.5;
            opSymbol = isPlus ? '+' : '-';
            realRes = isPlus ? a + b : a - b;
        }

        const isTrue = Math.random() > 0.5;
        let displayRes = realRes;
        if (!isTrue) {
            // Offset proporcional al resultado para que sea creíble pero falso
            const offsetBase = this.mode === 'MULTIPLY' ? Math.max(2, Math.floor(Math.abs(realRes) * 0.15)) : 3;
            const offset = Math.random() > 0.5 ? (Math.floor(Math.random()*offsetBase)+1) : Math.max(5, offsetBase*2);
            displayRes = Math.random() > 0.5 ? realRes + offset : realRes - offset;
            if(displayRes === realRes) displayRes += 1;
        }
        const el = document.createElement('div');
        el.className = 'math-card';
        el.innerText = `${a} ${opSymbol} ${b} = ${displayRes}`;
        el.style.top = '-15%';
        document.getElementById('math-track').appendChild(el);
        this.equations.push({ el: el, y: -15, isTrue: isTrue, active: true });
        // BLITZ spawnea más rápido; MULTIPLY tiene spawn normal pero con penalización de tiempo por dificultad mayor
        const baseDelay = this.mode === 'BLITZ' ? 1400 : 2500;
        const spawnDelay = Math.max(600, baseDelay - (this.level * 150));
        this.spawnTimer = setTimeout(() => this.spawnEquation(), spawnDelay);
    }

    checkAnswer(playerChoice) {
        const target = this.equations.find(eq => eq.active);
        if (!target) return;
        if (playerChoice === target.isTrue) this.success(target); else this.fail(target);
    }

    success(eq) {
        eq.active = false;
        eq.el.classList.add('correct');
        setTimeout(() => eq.el.remove(), 200);
        this.equations = this.equations.filter(e => e !== eq);
        this.streak++;
        if (this.streak > this.maxStreak) this.maxStreak = this.streak;
        // Speed bonus: cuánto más arriba (menos y), más bonus
        const yAtSuccess = eq.y;
        const speedBonus = yAtSuccess < 30 ? 5 : yAtSuccess < 60 ? 3 : 0;
        // Streak multiplier
        let streakMulti = 1;
        if (this.streak >= 15) streakMulti = 3;
        else if (this.streak >= 8) streakMulti = 2;
        else if (this.streak >= 4) streakMulti = 1.5;
        const basePts = 10 + speedBonus;
        const gained = Math.floor(basePts * streakMulti);
        this.score += gained;
        // Feedback flotante
        const track = document.getElementById('math-track');
        if (track && (speedBonus > 0 || streakMulti > 1)) {
            const pop = document.createElement('div');
            pop.className = 'mr-points-pop';
            pop.textContent = `+${gained}${streakMulti>1?` ×${streakMulti}`:''}`;
            pop.style.top = yAtSuccess + '%';
            track.appendChild(pop);
            setTimeout(() => pop.remove(), 900);
        }
        this.updateStreakChip();
        try { this.audio.playClick(); } catch(e){}
        if(this.uiScore) this.uiScore.innerText = this.score;
        if (this.score >= this.level * 50) {
            this.level++;
            this.speed += 0.05;
            try { this.audio.playWin(1); window.app.showToast("VELOCIDAD UP!", `Nivel ${this.level}`, "gold"); } catch(e){}
        }
    }

    updateStreakChip() {
        const el = document.getElementById('mr-streak');
        if (!el) return;
        if (this.streak >= 3) {
            let m = 1;
            if (this.streak >= 15) m = 3;
            else if (this.streak >= 8) m = 2;
            else if (this.streak >= 4) m = 1.5;
            el.textContent = `RACHA ×${this.streak} · BONUS ×${m}`;
            el.classList.add('show');
            el.classList.toggle('hot', this.streak >= 8);
        } else {
            el.classList.remove('show', 'hot');
        }
    }

    activateFreeze() {
        if (!this.isRunning || this.freezeAvailable <= 0 || this.freezeActive) return;
        if (window.app.credits < 20) {
            try { window.app.showToast('CRÉDITOS INSUFICIENTES', 'Freeze cuesta $20', 'danger'); } catch(e) {}
            return;
        }
        window.app.credits -= 20;
        const vc = document.getElementById('val-credits'); if (vc) vc.innerText = window.app.credits;
        try { window.app.save(); } catch(e) {}
        this.freezeAvailable--;
        this.freezeActive = true;
        document.body.classList.add('mr-freeze');
        const prevSpeed = this.speed;
        this.speed = prevSpeed * 0.25;
        const btn = document.getElementById('mr-freeze');
        if (btn) { btn.classList.add('used'); btn.innerHTML = 'ACTIVO · 3s'; }
        try { this.audio.playTone(1500, 'sine', 0.14); } catch(e) {}
        this.freezeTimer = setTimeout(() => {
            this.freezeActive = false;
            document.body.classList.remove('mr-freeze');
            this.speed = prevSpeed;
            if (btn) btn.innerHTML = 'AGOTADO';
        }, 3000);
    }

    activateSkip() {
        if (!this.isRunning || this.skipAvailable <= 0) return;
        if (window.app.credits < 10) {
            try { window.app.showToast('CRÉDITOS INSUFICIENTES', 'Skip cuesta $10', 'danger'); } catch(e) {}
            return;
        }
        const target = this.equations.find(eq => eq.active);
        if (!target) {
            try { window.app.showToast('SIN ECUACIÓN', 'Nada que saltar', 'info'); } catch(e) {}
            return;
        }
        window.app.credits -= 10;
        const vc = document.getElementById('val-credits'); if (vc) vc.innerText = window.app.credits;
        try { window.app.save(); } catch(e) {}
        this.skipAvailable--;
        target.active = false;
        target.el.classList.add('correct');
        setTimeout(() => target.el.remove(), 200);
        this.equations = this.equations.filter(e => e !== target);
        try { this.audio.playTone(1200, 'sine', 0.1); } catch(e) {}
        const btn = document.getElementById('mr-skip');
        if (btn) {
            btn.innerHTML = `SKIP ·${this.skipAvailable} <span class="cost">$10</span>`;
            if (this.skipAvailable <= 0) btn.classList.add('used');
        }
    }

    fail(eq) {
        if(eq) {
            eq.active = false;
            eq.el.classList.add('wrong');
            setTimeout(() => eq.el.remove(), 300);
            this.equations = this.equations.filter(e => e !== eq);
        }
        this.streak = 0;
        this.updateStreakChip();
        try { this.audio.playLose(); } catch(e){}
        document.body.classList.add('shake-screen');
        setTimeout(() => document.body.classList.remove('shake-screen'), 300);
        // BLITZ: fallo = -3s (no pierde vida)
        if (this.mode === 'BLITZ') {
            this.timeLeft = Math.max(0, this.timeLeft - 3);
            try { window.app.showToast('FALLO', '-3 segundos', 'danger'); } catch(e) {}
            if (this.timeLeft <= 0) { this.gameOver(); }
            return;
        }
        // CLASSIC / MULTIPLY: pierde vida
        this.lives--;
        const livesStr = '<i class="fa-solid fa-heart" style="color:#ec4899;margin:0 3px;"></i>'.repeat(this.lives) + '<i class="fa-solid fa-xmark" style="color:#334155;margin:0 3px;font-size:0.9rem;"></i>'.repeat(3-this.lives);
        const livesEl = document.getElementById('mr-lives');
        if(livesEl) livesEl.innerHTML = livesStr;
        if (this.lives <= 0) this.gameOver();
    }

    loop() {
        if(!this.isRunning) return;
        this.equations.forEach(eq => {
            if (eq.active) {
                eq.y += this.speed;
                eq.el.style.top = eq.y + '%';
                if (eq.y > 90) this.fail(eq);
            }
        });
        this.gameLoopId = requestAnimationFrame(() => this.loop());
    }

    // --- CORRECCIÓN CRÍTICA ---
    pause() {
        if(!this.isRunning) return;
        this._wasPaused = true;
        if(this.gameLoopId) { cancelAnimationFrame(this.gameLoopId); this.gameLoopId=null; }
    }
    resume() {
        if(!this._wasPaused) return;
        this._wasPaused = false;
        if(this.isRunning){ this.lastTime=performance.now(); this.gameLoopId=requestAnimationFrame(()=>this.loop()); }
    }

    cleanup() {
        this.isRunning = false;
        if(this.gameLoopId) { cancelAnimationFrame(this.gameLoopId); this.gameLoopId = null; }
        if(this.spawnTimer) { clearTimeout(this.spawnTimer); this.spawnTimer = null; }
        if(this.freezeTimer) { clearTimeout(this.freezeTimer); this.freezeTimer = null; }
        if(this.timerInt) { clearInterval(this.timerInt); this.timerInt = null; }
        document.body.classList.remove('mr-freeze');
        if(this.keyHandler) window.removeEventListener('keydown', this.keyHandler);
    }

    gameOver() {
        this.isRunning = false;
        if(this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
        if(this.spawnTimer) clearTimeout(this.spawnTimer);
        if(this.freezeTimer) { clearTimeout(this.freezeTimer); this.freezeTimer = null; }
        if(this.timerInt) { clearInterval(this.timerInt); this.timerInt = null; }
        document.body.classList.remove('mr-freeze');
        window.removeEventListener('keydown', this.keyHandler);
        // Bonus por mejor racha + bonus por modo difícil
        let bonus = 0;
        if (this.maxStreak >= 8) bonus += this.maxStreak * 3;
        if (this.mode === 'MULTIPLY' && this.score >= 80) bonus += Math.floor(this.score * 0.15);
        if (this.mode === 'BLITZ' && this.score >= 100) bonus += Math.floor(this.score * 0.10);
        if (bonus > 0) {
            window.app.credits += bonus;
            try { window.app.showToast('BONUS FINAL', `+${bonus} CR · ${this.mode} · Racha ${this.maxStreak}`, 'success'); } catch(e) {}
            const vc = document.getElementById('val-credits'); if (vc) vc.innerText = window.app.credits;
            try { window.app.save(); } catch(e) {}
        }
        if(this.onQuit) this.onQuit(this.score);
    }
}