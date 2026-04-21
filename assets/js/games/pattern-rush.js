import { CONFIG } from '../config.js';

export class PatternRushGame {
    constructor(canvas, audio, onGameOver) {
        this.canvas      = canvas;
        this.audio       = audio;
        this.onGameOver  = onGameOver;
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.score       = 0;
        this.mode        = 'NORMAL';
        // NUEVAS MECÁNICAS
        this.lives = 3;
        this.maxLives = 3;
        this.peekAvailable = 2;
        this.slowAvailable = 1;
        this.maxRoundsCompleted = 0;
        this.injectStyles();
    }

    injectStyles() {
        if(document.getElementById('prush-styles')) return;
        const s = document.createElement('style');
        s.id = 'prush-styles';
        s.innerHTML = `
            .pr-root { display:flex;flex-direction:column;align-items:center;height:100%;padding:16px;gap:14px;box-sizing:border-box; }
            .pr-header { display:flex;justify-content:space-between;align-items:center;width:100%;max-width:360px; }
            .pr-stat { text-align:center; }
            .pr-stat-val { font-family:var(--font-display);font-size:1.2rem;color:white; }
            .pr-stat-lbl { font-size:0.5rem;color:#334155;font-family:monospace;letter-spacing:2px; }
            .pr-grid { display:grid;gap:8px;width:100%;max-width:300px; }
            .pr-cell { aspect-ratio:1;border-radius:10px;border:2px solid rgba(255,255,255,0.08);
                background:rgba(10,16,30,0.85);cursor:pointer;transition:all 0.12s;
                display:flex;align-items:center;justify-content:center; }
            .pr-cell:hover:not(.inactive) { filter:brightness(1.2);transform:scale(1.04); }
            .pr-cell.lit   { filter:brightness(1.6);box-shadow:0 0 18px currentColor;transform:scale(1.08); }
            .pr-cell.hit   { filter:brightness(1.4);border-width:3px; }
            .pr-cell.wrong { animation:prWrong 0.3s ease;background:rgba(239,68,68,0.3) !important;border-color:#ef4444 !important; }
            .pr-cell.inactive { opacity:0.3;cursor:default; }
            @keyframes prWrong { 0%,100%{transform:scale(1)} 33%{transform:scale(0.92)} 66%{transform:scale(1.06)} }
            .pr-msg { font-family:var(--font-display);font-size:0.75rem;letter-spacing:2px;
                color:#94a3b8;min-height:20px;text-align:center; }
            .pr-phase { font-size:0.55rem;color:#334155;font-family:monospace;letter-spacing:3px;text-align:center; }
            /* Vidas */
            .pr-lives { display:flex;gap:6px;align-items:center;justify-content:center; }
            .pr-heart { font-size:0.9rem;color:#ef4444;transition:all 0.2s; }
            .pr-heart.lost { color:#334155;transform:scale(0.7);filter:grayscale(1); }
            /* Power-ups */
            .pr-pwrs { display:flex;gap:8px;justify-content:center;margin-top:4px; }
            .pr-pwr { padding:6px 12px;background:rgba(10,16,30,0.9);border:1.5px solid #a855f7;border-radius:8px;color:#a855f7;font-family:var(--font-display);font-size:0.58rem;letter-spacing:1.5px;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:4px; }
            .pr-pwr:hover:not(.used):not(.disabled) { background:rgba(168,85,247,0.15);transform:translateY(-2px); }
            .pr-pwr.used { opacity:0.3;pointer-events:none;filter:grayscale(1); }
            .pr-pwr.disabled { opacity:0.5;pointer-events:none; }
            .pr-pwr .cnt { color:#94a3b8;font-size:0.52rem; }
            .pr-cell.peek { background:rgba(251,191,36,0.25) !important; border-color:#fbbf24 !important; box-shadow:0 0 14px #fbbf24; animation:prPeek 0.4s ease-in-out 3; }
            @keyframes prPeek { 0%,100%{opacity:1} 50%{opacity:0.6} }
        `;
        document.head.appendChild(s);
    }

    init() { this.showModeSelect(); }

    showModeSelect() {
        const modes = [
            { id:'pr-n', mc:'#a855f7', icon:'fa-border-all',   name:'NORMAL',   desc:'3×3 · dificultad progresiva'          },
            { id:'pr-h', mc:'#ef4444', icon:'fa-th',           name:'DIFÍCIL',  desc:'4×4 · patrones más largos'            },
            { id:'pr-s', mc:'#f97316', icon:'fa-stopwatch',    name:'SPEED',    desc:'60s · tantos patrones como puedas'    },
            { id:'pr-m', mc:'#06b6d4', icon:'fa-brain',        name:'MEMORY',   desc:'Sin pistas al repetir · +50% puntos'  },
        ];
        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;">PATTERN RUSH</div>
                <div style="font-size:0.65rem;color:#a855f7;letter-spacing:3px;font-family:monospace;">PROTOCOLO VISUAL</div>
                <div style="width:120px;height:1px;background:#a855f7;margin:10px auto 0;opacity:0.5;"></div>
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
            <button class="btn btn-secondary" id="pr-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;
        document.getElementById('pr-n').onclick = () => this.startWithMode('NORMAL');
        document.getElementById('pr-h').onclick = () => this.startWithMode('HARD');
        document.getElementById('pr-s').onclick = () => this.startWithMode('SPEED');
        document.getElementById('pr-m').onclick = () => this.startWithMode('MEMORY');
        document.getElementById('pr-back').onclick = () => { if(this.onGameOver) this.onGameOver(0); };
    }

    startWithMode(mode) {
        this.mode     = mode;
        this.score    = 0;
        this.round    = 0;
        this.gridSize = mode === 'HARD' ? 4 : 3;
        this.phase    = 'watching'; // 'watching' | 'input'
        this.lives    = 3;
        // MEMORY: sin peek (sacaria el desafio), slow sí
        this.peekAvailable = mode === 'MEMORY' ? 0 : 2;
        this.slowAvailable = 1;
        this.maxRoundsCompleted = 0;
        try { this.canvas.setMood('CYAN'); } catch(e) {}
        try { window.app.combo?.start(); } catch(e){}

        if(mode === 'SPEED') {
            this.timeLeft = 60;
            this._timerInt = setInterval(() => {
                this.timeLeft--;
                const el = document.getElementById('pr-timer');
                if(el) { el.innerText = this.timeLeft + 's'; el.style.color = this.timeLeft < 15 ? '#ef4444' : '#f97316'; }
                if(this.timeLeft <= 0) { clearInterval(this._timerInt); this.endGame(); }
            }, 1000);
        }
        this.newRound();
    }

    newRound() {
        this.round++;
        const patLen = Math.min(2 + Math.floor(this.round * 0.8), this.gridSize * this.gridSize);
        const total  = this.gridSize * this.gridSize;
        const N      = this.gridSize;
        const COLORS = ['#ef4444','#f97316','#fbbf24','#10b981','#3b82f6','#a855f7'];

        // Generar patrón — celdas y colores únicos
        this.pattern = [];
        const available = Array.from({length: total}, (_, i) => i);
        for(let i = available.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [available[i], available[j]] = [available[j], available[i]];
        }
        for(let i = 0; i < patLen; i++) {
            this.pattern.push({ cell: available[i], color: COLORS[i % COLORS.length] });
        }

        this.inputSeq = [];
        this.phase = 'watching';
        this.render();
        this.playPattern();
    }

    render() {
        const N = this.gridSize;
        const timerHTML = this.mode === 'SPEED'
            ? `<div class="pr-stat"><div class="pr-stat-val" id="pr-timer" style="color:#f97316;">${this.timeLeft||60}s</div><div class="pr-stat-lbl">TIEMPO</div></div>`
            : '';

        const cells = Array.from({length: N*N}, (_, i) =>
            `<div class="pr-cell${this.phase==='watching'?' inactive':''}" id="pr-cell-${i}"
                 onclick="window.patternRush.tap(${i})"
                 style="color:#334155;background:rgba(10,16,30,0.85);"></div>`
        ).join('');

        const phaseLabel = this.phase === 'watching' ? 'OBSERVA EL PATRÓN' : 'REPITE EL PATRÓN';

        // Hearts HTML
        const heartsHTML = Array.from({length: this.maxLives}, (_, i) =>
            `<i class="fa-solid fa-heart pr-heart${i >= this.lives ? ' lost' : ''}"></i>`
        ).join('');

        this.uiContainer.innerHTML = `
        <div class="pr-root">
            <div class="pr-header">
                <div class="pr-stat"><div class="pr-stat-val" id="pr-score">${this.score}</div><div class="pr-stat-lbl">PUNTOS</div></div>
                <div class="pr-stat"><div class="pr-stat-val" style="color:#a855f7;">${this.round}</div><div class="pr-stat-lbl">RONDA</div></div>
                ${timerHTML}
                <div class="pr-stat"><div class="pr-lives" id="pr-lives">${heartsHTML}</div><div class="pr-stat-lbl">VIDAS</div></div>
                <div class="pr-stat"><div class="pr-stat-val" style="color:#334155;">${this.pattern?this.inputSeq.length+'/'+this.pattern.length:'0'}</div><div class="pr-stat-lbl">PROGRESO</div></div>
            </div>
            <div class="pr-phase" id="pr-phase">${phaseLabel}</div>
            <div class="pr-grid" style="grid-template-columns:repeat(${N},1fr);">${cells}</div>
            <div class="pr-pwrs">
                <button class="pr-pwr" id="pr-peek">PEEK <span class="cnt">·${this.peekAvailable}</span> <span class="cnt">$20</span></button>
                <button class="pr-pwr" id="pr-slow">SLOW <span class="cnt">·${this.slowAvailable}</span> <span class="cnt">$25</span></button>
            </div>
            <div class="pr-msg" id="pr-msg"></div>
        </div>`;
        window.patternRush = this;

        // Power-up binds
        const pk = document.getElementById('pr-peek');
        if (pk) {
            if (this.peekAvailable<=0 || this.phase!=='input') pk.classList.add('disabled');
            pk.onclick = () => this.activatePeek();
        }
        const sl = document.getElementById('pr-slow');
        if (sl) {
            if (this.slowAvailable<=0) sl.classList.add('disabled');
            sl.onclick = () => this.activateSlow();
        }
    }

    activatePeek() {
        if (this.peekAvailable<=0 || this.phase!=='input') return;
        if (window.app.credits < 20) { try { window.app.showToast('CRÉDITOS INSUFICIENTES', 'Peek cuesta $20', 'danger'); } catch(e){} return; }
        const next = this.pattern[this.inputSeq.length];
        if (!next) return;
        window.app.credits -= 20;
        const vc = document.getElementById('val-credits'); if (vc) vc.innerText = window.app.credits;
        try { window.app.save(); } catch(e) {}
        this.peekAvailable--;
        const el = document.getElementById('pr-cell-' + next.cell);
        if (el) {
            el.style.background = next.color + '50';
            el.style.borderColor = next.color;
            el.classList.add('peek');
            setTimeout(() => {
                el.classList.remove('peek');
                el.style.background = 'rgba(10,16,30,0.85)';
                el.style.borderColor = 'rgba(255,255,255,0.08)';
            }, 1200);
        }
        try { this.audio.playTone(1400, 'sine', 0.1); } catch(e){}
        const btn = document.getElementById('pr-peek');
        if (btn) {
            btn.innerHTML = `PEEK <span class="cnt">·${this.peekAvailable}</span> <span class="cnt">$20</span>`;
            if (this.peekAvailable<=0) btn.classList.add('used');
        }
    }

    activateSlow() {
        if (this.slowAvailable<=0) return;
        if (window.app.credits < 25) { try { window.app.showToast('CRÉDITOS INSUFICIENTES', 'Slow cuesta $25', 'danger'); } catch(e){} return; }
        window.app.credits -= 25;
        const vc = document.getElementById('val-credits'); if (vc) vc.innerText = window.app.credits;
        try { window.app.save(); } catch(e) {}
        this.slowAvailable--;
        // Efecto: extiende el tiempo si está en modo SPEED
        if (this.mode === 'SPEED') {
            this.timeLeft = Math.min(60, this.timeLeft + 10);
            try { window.app.showToast('TIEMPO', '+10 segundos', 'success'); } catch(e) {}
        } else {
            // En modos normales: muestra el patrón de nuevo más lento
            if (this.phase === 'input') {
                this.phase = 'watching';
                document.querySelectorAll('.pr-cell').forEach(c => c.classList.add('inactive'));
                this._replayPattern();
            }
        }
        try { this.audio.playTone(1200, 'sine', 0.15); } catch(e){}
        const btn = document.getElementById('pr-slow');
        if (btn) {
            btn.innerHTML = `SLOW <span class="cnt">·${this.slowAvailable}</span> <span class="cnt">$25</span>`;
            if (this.slowAvailable<=0) btn.classList.add('used');
        }
    }

    _replayPattern() {
        // Reproduce el patrón desde donde está, más lento
        const startIdx = this.inputSeq.length;
        const remaining = this.pattern.slice(startIdx);
        remaining.forEach((step, i) => {
            setTimeout(() => {
                const el = document.getElementById('pr-cell-' + step.cell);
                if (!el) return;
                el.style.background = step.color + '40';
                el.style.borderColor = step.color;
                el.classList.add('lit');
                try { this.audio.playTone(200 + step.cell * 40, 'sine', 0.15, 0.1); } catch(e){}
                setTimeout(() => {
                    el.style.background = 'rgba(10,16,30,0.85)';
                    el.style.borderColor = 'rgba(255,255,255,0.08)';
                    el.classList.remove('lit');
                }, 450);
            }, 300 + i * 700);
        });
        const totalTime = 300 + remaining.length * 700 + 300;
        setTimeout(() => {
            this.phase = 'input';
            document.querySelectorAll('.pr-cell').forEach(c => c.classList.remove('inactive'));
        }, totalTime);
    }

    playPattern() {
        // MEMORY: patrón más rápido (400ms vs 600ms) para aumentar la dificultad
        const stepInterval = this.mode === 'MEMORY' ? 400 : 600;
        const litDuration  = this.mode === 'MEMORY' ? 250 : 350;
        let delay = 400;
        this.pattern.forEach((step, i) => {
            setTimeout(() => {
                const el = document.getElementById('pr-cell-' + step.cell);
                if(!el) return;
                el.style.background = step.color + '40';
                el.style.borderColor = step.color;
                el.classList.add('lit');
                try { this.audio.playTone(200 + step.cell * 40, 'sine', 0.15, 0.1); } catch(e) {}
                setTimeout(() => {
                    el.style.background = 'rgba(10,16,30,0.85)';
                    el.style.borderColor = 'rgba(255,255,255,0.08)';
                    el.classList.remove('lit');
                }, litDuration);
            }, delay + i * stepInterval);
        });

        // Activar input después de mostrar todo
        const totalTime = delay + this.pattern.length * stepInterval + 400;
        setTimeout(() => {
            this.phase = 'input';
            const phaseEl = document.getElementById('pr-phase');
            if(phaseEl) {
                phaseEl.textContent = this.mode === 'MEMORY' ? 'REPITE DE MEMORIA' : 'REPITE EL PATRÓN';
                phaseEl.style.color = this.mode === 'MEMORY' ? '#06b6d4' : '#a855f7';
            }
            document.querySelectorAll('.pr-cell').forEach(c => c.classList.remove('inactive'));
            window.patternRush = this;
        }, totalTime);
    }

    tap(cellId) {
        if(this.phase !== 'input') return;
        const expected = this.pattern[this.inputSeq.length];
        if(!expected) return;

        const el = document.getElementById('pr-cell-' + cellId);

        if(cellId === expected.cell) {
            // Correcto
            this.inputSeq.push(cellId);
            if(el) {
                // MEMORY: no revela el color (solo hint mínimo de feedback)
                if (this.mode === 'MEMORY') {
                    el.style.background = 'rgba(6,182,212,0.15)';
                    el.style.borderColor = 'rgba(6,182,212,0.4)';
                } else {
                    el.style.background = expected.color + '35';
                    el.style.borderColor = expected.color;
                }
                el.classList.add('hit');
            }
            try { this.audio.playTone(300 + this.inputSeq.length * 80, 'sine', 0.08, 0.08); } catch(e) {}

            if(this.inputSeq.length >= this.pattern.length) {
                // Completado
                this.phase = 'watching';
                this.maxRoundsCompleted++;
                const timeBonus = this.mode === 'SPEED' ? this.timeLeft * 2 : 0;
                // MEMORY: +50% puntos por dificultad
                const modeBonus = this.mode === 'MEMORY' ? 1.5 : 1;
                const multi = (window.app.combo?.multiplier?.() || 1);
                const pts = Math.floor((this.pattern.length * 15 + timeBonus) * multi * modeBonus);
                this.score += pts;
                try { window.app.combo?.hit(); } catch(e){}

                const sc = document.getElementById('pr-score');
                if(sc) sc.innerText = this.score;
                const msg = document.getElementById('pr-msg');
                const memoryTxt = this.mode === 'MEMORY' ? ' MEM' : '';
                if(msg) { msg.style.color = '#10b981'; msg.textContent = '¡CORRECTO! +' + pts + (multi > 1 ? ' x' + multi : '') + memoryTxt; }
                try { this.audio.playWin(4); } catch(e) {}
                setTimeout(() => this.newRound(), 1000);
            }
        } else {
            // Incorrecto — pierde vida
            if(el) el.classList.add('wrong');
            try { this.audio.playTone(120, 'square', 0.1, 0.15); } catch(e) {}
            try { window.app.combo?.miss(); } catch(e){}
            this.lives--;
            const livesEl = document.getElementById('pr-lives');
            if (livesEl) {
                livesEl.innerHTML = Array.from({length: this.maxLives}, (_, i) =>
                    `<i class="fa-solid fa-heart pr-heart${i >= this.lives ? ' lost' : ''}"></i>`
                ).join('');
            }
            document.body.classList.add('shake-screen');
            setTimeout(() => document.body.classList.remove('shake-screen'), 300);
            const msg = document.getElementById('pr-msg');
            if (this.lives <= 0) {
                if(msg) { msg.style.color = '#ef4444'; msg.textContent = 'SIN VIDAS — GAME OVER'; }
                setTimeout(() => this.endGame(), 1200);
                return;
            }
            if(msg) { msg.style.color = '#ef4444'; msg.textContent = `ERROR — VIDAS: ${this.lives}`; }
            this.phase = 'watching';
            if(this.mode !== 'SPEED') this.score = Math.max(0, this.score - 20);
            setTimeout(() => this.newRound(), 1200);
        }
    }

    endGame() {
        clearInterval(this._timerInt);
        delete window.patternRush;
        // Bonus por rondas completadas
        if (this.maxRoundsCompleted >= 5) {
            const bonus = this.maxRoundsCompleted * 2;
            window.app.credits += bonus;
            try { window.app.showToast('RONDAS COMPLETADAS', `${this.maxRoundsCompleted} · +${bonus} CR`, 'success'); } catch(e) {}
            const vc = document.getElementById('val-credits'); if (vc) vc.innerText = window.app.credits;
            try { window.app.save(); } catch(e) {}
        }
        if(this.onGameOver) this.onGameOver(this.score);
    }

    pause()   { clearInterval(this._timerInt); this._wasPaused = true; }
    resume()  { if(this._wasPaused && this.mode === 'SPEED' && this.timeLeft > 0) {
        this._timerInt = setInterval(() => {
            this.timeLeft--;
            const el = document.getElementById('pr-timer');
            if(el) el.innerText = this.timeLeft + 's';
            if(this.timeLeft <= 0) { clearInterval(this._timerInt); this.endGame(); }
        }, 1000);
    }}
    cleanup() {
        clearInterval(this._timerInt);
        try { window.app.combo?.end(); } catch(e) {}
        delete window.patternRush;
    }
}
