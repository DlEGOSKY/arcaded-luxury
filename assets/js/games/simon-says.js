import { CONFIG } from '../config.js';

// Juego #28 — Simon Says: secuencias de color en tiempo real
// Distinto a Pattern Rush porque: secuencia se presenta en tiempo real (no simultánea),
// los colores son los 4 clásicos del Simon, tiene audio propio y crecimiento dinámico
export class SimonSaysGame {
    constructor(canvas, audio, onGameOver) {
        this.canvas      = canvas;
        this.audio       = audio;
        this.onGameOver  = onGameOver;
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.score       = 0;
        this.mode        = 'CLASSIC';
        this._timers     = [];
        this._alive      = true;
        this.TONES       = [523, 659, 784, 392]; // Do Mi Sol Sol bajo
        this.COLORS      = ['#ef4444','#3b82f6','#fbbf24','#10b981'];
        this.NAMES       = ['ROJO','AZUL','AMARILLO','VERDE'];
        // NUEVAS MECÁNICAS
        this.lives       = 3;
        this.maxLives    = 3;
        this.streak      = 0;
        this.maxStreak   = 0;
        this.maxRound    = 0;
        this.replayAvailable = 1;
        this.injectStyles();
    }

    injectStyles() {
        if(document.getElementById('simon-styles')) return;
        const s = document.createElement('style');
        s.id = 'simon-styles';
        s.innerHTML = `
            .sm-root { display:flex;flex-direction:column;align-items:center;height:100%;padding:16px;gap:14px;box-sizing:border-box;justify-content:center; }
            .sm-header { display:flex;justify-content:space-between;align-items:center;width:100%;max-width:320px; }
            .sm-stat { text-align:center; }
            .sm-stat-val { font-family:var(--font-display);font-size:1.2rem;color:white; }
            .sm-stat-lbl { font-size:0.5rem;color:#334155;font-family:monospace;letter-spacing:2px; }
            .sm-board { display:grid;grid-template-columns:1fr 1fr;gap:8px;width:260px;height:260px; }
            .sm-btn { border-radius:12px;cursor:pointer;transition:all 0.1s;border:3px solid transparent;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:0.65rem;letter-spacing:2px;user-select:none; }
            .sm-btn:active,.sm-btn.lit { filter:brightness(1.8);transform:scale(0.96);box-shadow:0 0 30px currentColor; }
            .sm-btn.dim { filter:brightness(0.3); }
            .sm-msg { font-family:var(--font-display);font-size:0.75rem;letter-spacing:2px;color:#94a3b8;min-height:20px;text-align:center; }
            .sm-phase { font-size:0.55rem;color:#334155;font-family:monospace;letter-spacing:3px;text-align:center; }
            /* Vidas */
            .sm-lives { display:flex;gap:4px;align-items:center;justify-content:center; }
            .sm-heart { font-size:0.85rem;color:#ef4444;transition:all 0.2s; }
            .sm-heart.lost { color:#334155;transform:scale(0.7); }
            /* Streak chip */
            .sm-streak-chip { font-family:var(--font-display);font-size:0.62rem;color:#fbbf24;letter-spacing:2px;padding:3px 10px;background:rgba(251,191,36,0.15);border:1px solid #fbbf24;border-radius:15px;display:inline-block;opacity:0;transition:opacity 0.2s; }
            .sm-streak-chip.show { opacity:1; }
            /* Power-up */
            .sm-pwr { padding:7px 14px;background:rgba(10,16,30,0.9);border:1.5px solid #a855f7;border-radius:8px;color:#a855f7;font-family:var(--font-display);font-size:0.62rem;letter-spacing:2px;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:6px; }
            .sm-pwr:hover:not(.used) { background:rgba(168,85,247,0.15);transform:translateY(-2px); }
            .sm-pwr.used { opacity:0.3;pointer-events:none;filter:grayscale(1); }
            .sm-pwr .cnt { color:#94a3b8;font-size:0.55rem; }
        `;
        document.head.appendChild(s);
    }

    init() { this.showModeSelect(); }

    showModeSelect() {
        const modes = [
            { id:'sm-c', mc:'#10b981', icon:'fa-circle-play',  name:'CLÁSICO',  desc:'Secuencia crece 1 por ronda'         },
            { id:'sm-s', mc:'#ef4444', icon:'fa-forward-fast', name:'SPEED',    desc:'Velocidad creciente · igual mecánica' },
            { id:'sm-r', mc:'#a855f7', icon:'fa-shuffle',      name:'RANDOM',   desc:'Secuencia aleatoria · nunca se repite'},
        ];
        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;">SIMON SAYS</div>
                <div style="font-size:0.65rem;color:#10b981;letter-spacing:3px;font-family:monospace;">PROTOCOLO CROMÁTICO</div>
                <div style="width:120px;height:1px;background:#10b981;margin:10px auto 0;opacity:0.5;"></div>
            </div>
            <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
                ${modes.map(m=>`
                <div style="width:160px;min-height:155px;background:rgba(10,16,30,0.9);border:1px solid ${m.mc}25;
                     border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;
                     gap:10px;cursor:pointer;transition:all 0.15s;padding:18px 12px;position:relative;"
                     id="${m.id}"
                     onmouseenter="this.style.transform='translateY(-4px)';this.style.borderColor='${m.mc}';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)';"
                     onmouseleave="this.style.transform='';this.style.borderColor='${m.mc}25';this.style.boxShadow='';">
                    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${m.mc};opacity:0.6;"></div>
                    <i class="fa-solid ${m.icon}" style="font-size:1.8rem;color:${m.mc};filter:drop-shadow(0 0 8px ${m.mc});"></i>
                    <div style="font-family:var(--font-display);font-size:0.76rem;letter-spacing:2px;color:${m.mc};">${m.name}</div>
                    <div style="font-size:0.6rem;color:#475569;font-family:monospace;text-align:center;line-height:1.5;">${m.desc}</div>
                </div>`).join('')}
            </div>
            <button class="btn btn-secondary" id="sm-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;
        document.getElementById('sm-c').onclick = () => this.startWithMode('CLASSIC');
        document.getElementById('sm-s').onclick = () => this.startWithMode('SPEED');
        document.getElementById('sm-r').onclick = () => this.startWithMode('RANDOM');
        document.getElementById('sm-back').onclick = () => { if(this.onGameOver) this.onGameOver(0); };
    }

    startWithMode(mode) {
        this.mode     = mode;
        this.score    = 0;
        this.round    = 0;
        this.sequence = [];
        this.speed    = mode === 'SPEED' ? 700 : 900;
        this.active   = false;
        // Reset nuevas mecánicas
        this.lives = mode === 'RANDOM' ? 1 : 3;
        this.maxLives = this.lives;
        this.streak = 0; this.maxStreak = 0; this.maxRound = 0;
        this.replayAvailable = 1;
        try { this.canvas.setMood('CYAN'); } catch(e) {}
        this.render();
        this._schedule(() => this.nextRound(), 600);
    }

    _schedule(fn, ms) {
        if(!this._alive) return null;
        const id = setTimeout(() => {
            if(!this._alive) return;
            try { fn(); } catch(e) { console.error('simon schedule', e); }
        }, ms);
        this._timers.push(id);
        return id;
    }

    render(phase='') {
        const cells = this.COLORS.map((col, i) => `
            <div class="sm-btn" id="sm-${i}"
                 style="background:${col}30;border-color:${col}50;color:${col};"
                 onclick="window.simonGame && window.simonGame.tap(${i})">
                ${this.NAMES[i]}
            </div>`).join('');

        const heartsHTML = Array.from({length:this.maxLives},(_,i)=>
            `<i class="fa-solid fa-heart sm-heart${i>=this.lives?' lost':''}"></i>`
        ).join('');

        const streakMulti = this.getStreakMulti();
        const streakChip = this.streak >= 2
            ? `<div class="sm-streak-chip show">RACHA ×${this.streak} · BONUS ×${streakMulti}</div>`
            : '<div class="sm-streak-chip"></div>';

        this.uiContainer.innerHTML = `
        <div class="sm-root">
            <div class="sm-header">
                <div class="sm-stat"><div class="sm-stat-val" id="sm-score">${this.score}</div><div class="sm-stat-lbl">PUNTOS</div></div>
                <div class="sm-stat"><div class="sm-stat-val" style="color:#10b981;">${this.round}</div><div class="sm-stat-lbl">RONDA</div></div>
                <div class="sm-stat"><div class="sm-lives" id="sm-lives">${heartsHTML}</div><div class="sm-stat-lbl">VIDAS</div></div>
                <div class="sm-stat"><div class="sm-stat-val" style="color:#334155;">${this.sequence.length}</div><div class="sm-stat-lbl">SECUENCIA</div></div>
            </div>
            <div class="sm-phase" id="sm-phase">${phase}</div>
            <div class="sm-board">${cells}</div>
            ${streakChip}
            <div class="sm-msg" id="sm-msg">Memoriza la secuencia y repítela</div>
            <button class="sm-pwr${this.replayAvailable<=0?' used':''}" id="sm-replay">REPLAY <span class="cnt">·${this.replayAvailable}</span> <span class="cnt">$20</span></button>
        </div>`;
        const rb = document.getElementById('sm-replay');
        if (rb) rb.onclick = () => this.activateReplay();
        window.simonGame = this;
    }

    getStreakMulti() {
        if (this.streak >= 8) return 3;
        if (this.streak >= 5) return 2;
        if (this.streak >= 2) return 1.5;
        return 1;
    }

    activateReplay() {
        if (!this.active || this.replayAvailable <= 0 || this.inputIdx > 0) {
            try { window.app.showToast('REPLAY', 'Sólo antes de empezar a repetir', 'danger'); } catch(e){}
            return;
        }
        if (window.app.credits < 20) { try { window.app.showToast('CRÉDITOS INSUFICIENTES', 'Replay cuesta $20', 'danger'); } catch(e){} return; }
        window.app.credits -= 20;
        const vc = document.getElementById('val-credits'); if (vc) vc.innerText = window.app.credits;
        try { window.app.save(); } catch(e){}
        this.replayAvailable--;
        this.active = false;
        const phaseEl = document.getElementById('sm-phase');
        if (phaseEl) { phaseEl.textContent = 'REPLAY'; phaseEl.style.color = '#a855f7'; }
        this.dimAll();
        this._schedule(() => this.playSequence(), 400);
        const btn = document.getElementById('sm-replay');
        if (btn) { btn.classList.add('used'); btn.innerHTML = 'REPLAY <span class="cnt">USADO</span>'; }
    }

    nextRound() {
        this.round++;
        if(this.mode === 'RANDOM') {
            this.sequence = Array.from({length: this.round + 1}, () => Math.floor(Math.random() * 4));
        } else {
            this.sequence.push(Math.floor(Math.random() * 4));
        }
        if(this.mode === 'SPEED') this.speed = Math.max(300, 900 - this.round * 40);

        this.active = false;
        this.inputIdx = 0;
        const phaseEl = document.getElementById('sm-phase');
        if(phaseEl) phaseEl.textContent = 'OBSERVA';
        this.dimAll();
        this._schedule(() => this.playSequence(), 600);
    }

    playSequence() {
        let delay = 0;
        this.sequence.forEach((idx, i) => {
            this._schedule(() => this.flashBtn(idx), delay);
            delay += this.speed;
        });
        this._schedule(() => {
            this.active = true;
            this.inputIdx = 0;
            const phaseEl = document.getElementById('sm-phase');
            if(phaseEl) { phaseEl.textContent = 'REPITE'; phaseEl.style.color = '#10b981'; }
            this.undimAll();
        }, delay + 200);
    }

    flashBtn(idx) {
        const el = document.getElementById('sm-' + idx);
        if(!el) return;
        el.classList.add('lit');
        try { this.audio.playTone(this.TONES[idx], 'sine', (this.speed - 50) / 1000, 0.2); } catch(e) {}
        this._schedule(() => { if(el) el.classList.remove('lit'); }, this.speed - 100);
    }

    dimAll()   { this.COLORS.forEach((_, i) => { const e = document.getElementById('sm-'+i); if(e) e.classList.add('dim'); }); }
    undimAll() { this.COLORS.forEach((_, i) => { const e = document.getElementById('sm-'+i); if(e) e.classList.remove('dim'); }); }

    tap(idx) {
        if(!this.active) return;
        const el = document.getElementById('sm-' + idx);
        if(el) { el.classList.add('lit'); this._schedule(() => { if(el) el.classList.remove('lit'); }, 200); }
        try { this.audio.playTone(this.TONES[idx], 'sine', 0.12, 0.15); } catch(e) {}

        if(idx !== this.sequence[this.inputIdx]) {
            // Error
            this.active = false;
            this.lives--;
            this.streak = 0;
            try { this.audio.playLose(); } catch(e) {}
            // Update hearts
            const livesEl = document.getElementById('sm-lives');
            if (livesEl) {
                livesEl.innerHTML = Array.from({length:this.maxLives},(_,i)=>
                    `<i class="fa-solid fa-heart sm-heart${i>=this.lives?' lost':''}"></i>`
                ).join('');
            }
            const msg = document.getElementById('sm-msg');
            if (this.lives <= 0) {
                if(msg) { msg.style.color = '#ef4444'; msg.textContent = 'GAME OVER · Era: ' + this.sequence.map(i => this.NAMES[i]).join(' → '); }
                try { this.audio.setTension(false); } catch(e) {}
                this._schedule(() => this.endGame(), 2000);
            } else {
                if(msg) { msg.style.color = '#ef4444'; msg.textContent = `FALLO · ${this.lives} vida${this.lives===1?'':'s'} restantes`; }
                this._schedule(() => this.retryRound(), 1500);
            }
            return;
        }

        this.inputIdx++;
        if(this.inputIdx >= this.sequence.length) {
            // Ronda completada
            this.active = false;
            this.streak++;
            if (this.streak > this.maxStreak) this.maxStreak = this.streak;
            if (this.round > this.maxRound) this.maxRound = this.round;
            const streakMulti = this.getStreakMulti();
            const basePts = this.sequence.length * 10;
            const pts = Math.floor(basePts * streakMulti);
            this.score += pts;
            const sc = document.getElementById('sm-score');
            if(sc) sc.innerText = this.score;
            const msg = document.getElementById('sm-msg');
            const streakTxt = streakMulti > 1 ? ` ×${streakMulti}` : '';
            if(msg) { msg.style.color = '#10b981'; msg.textContent = `¡CORRECTO! +${pts}${streakTxt}`; }
            try { this.audio.playWin(3); } catch(e) {}
            // Tensión a partir de secuencia larga
            if(this.sequence.length >= 8) { try { this.audio.setTension(true); } catch(e) {} }
            this._schedule(() => this.nextRound(), 1000);
        }
    }

    retryRound() {
        // No agrega nueva nota, solo vuelve a reproducir la secuencia actual
        this.active = false;
        this.inputIdx = 0;
        const phaseEl = document.getElementById('sm-phase');
        if(phaseEl) { phaseEl.textContent = 'REINTENTO'; phaseEl.style.color = '#f97316'; }
        this.dimAll();
        this._schedule(() => this.playSequence(), 600);
    }

    endGame() {
        this._alive = false;
        this._timers.forEach(id => clearTimeout(id));
        this._timers = [];
        try { this.audio.setTension(false); } catch(e) {}
        // Bonus por maxRound y maxStreak
        let bonus = 0;
        if (this.maxRound >= 5) bonus += this.maxRound * 3;
        if (this.maxStreak >= 3) bonus += this.maxStreak * 4;
        if (bonus > 0) {
            window.app.credits += bonus;
            try { window.app.showToast('BONUS FINAL', `+${bonus} CR · Racha ×${this.maxStreak}`, 'success'); } catch(e){}
            const vc = document.getElementById('val-credits'); if (vc) vc.innerText = window.app.credits;
            try { window.app.save(); } catch(e){}
        }
        delete window.simonGame;
        if(this.onGameOver) this.onGameOver(this.score);
    }

    pause()   { this.active = false; }
    resume()  { /* secuencia se reinicia en el contexto del juego */ }
    cleanup() {
        this._alive = false;
        this._timers.forEach(id => clearTimeout(id));
        this._timers = [];
        delete window.simonGame;
        try { this.audio.setTension(false); } catch(e) {}
    }
}
