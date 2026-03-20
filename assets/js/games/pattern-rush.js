import { CONFIG } from '../config.js';

export class PatternRushGame {
    constructor(canvas, audio, onGameOver) {
        this.canvas      = canvas;
        this.audio       = audio;
        this.onGameOver  = onGameOver;
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.score       = 0;
        this.mode        = 'NORMAL';
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
        `;
        document.head.appendChild(s);
    }

    init() { this.showModeSelect(); }

    showModeSelect() {
        const modes = [
            { id:'pr-n', mc:'#a855f7', icon:'fa-border-all',   name:'NORMAL',   desc:'3×3 · dificultad progresiva'          },
            { id:'pr-h', mc:'#ef4444', icon:'fa-th',           name:'DIFÍCIL',  desc:'4×4 · patrones más largos'            },
            { id:'pr-s', mc:'#f97316', icon:'fa-stopwatch',    name:'SPEED',    desc:'60s · tantos patrones como puedas'    },
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
        document.getElementById('pr-back').onclick = () => { if(this.onGameOver) this.onGameOver(0); };
    }

    startWithMode(mode) {
        this.mode     = mode;
        this.score    = 0;
        this.round    = 0;
        this.gridSize = mode === 'HARD' ? 4 : 3;
        this.phase    = 'watching'; // 'watching' | 'input'
        try { this.canvas.setMood('CYAN'); } catch(e) {}

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

        this.uiContainer.innerHTML = `
        <div class="pr-root">
            <div class="pr-header">
                <div class="pr-stat"><div class="pr-stat-val" id="pr-score">${this.score}</div><div class="pr-stat-lbl">PUNTOS</div></div>
                <div class="pr-stat"><div class="pr-stat-val" style="color:#a855f7;">${this.round}</div><div class="pr-stat-lbl">RONDA</div></div>
                ${timerHTML}
                <div class="pr-stat"><div class="pr-stat-val" style="color:#334155;">${this.pattern?this.inputSeq.length+'/'+this.pattern.length:'0'}</div><div class="pr-stat-lbl">PROGRESO</div></div>
            </div>
            <div class="pr-phase" id="pr-phase">${phaseLabel}</div>
            <div class="pr-grid" style="grid-template-columns:repeat(${N},1fr);">${cells}</div>
            <div class="pr-msg" id="pr-msg"></div>
        </div>`;
        window.patternRush = this;
    }

    playPattern() {
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
                }, 350);
            }, delay + i * 600);
        });

        // Activar input después de mostrar todo
        const totalTime = delay + this.pattern.length * 600 + 400;
        setTimeout(() => {
            this.phase = 'input';
            const phaseEl = document.getElementById('pr-phase');
            if(phaseEl) { phaseEl.textContent = 'REPITE EL PATRÓN'; phaseEl.style.color = '#a855f7'; }
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
                el.style.background = expected.color + '35';
                el.style.borderColor = expected.color;
                el.classList.add('hit');
            }
            try { this.audio.playTone(300 + this.inputSeq.length * 80, 'sine', 0.08, 0.08); } catch(e) {}

            const prog = document.querySelector('.pr-stat-val:last-child');
            const progEl = this.uiContainer.querySelector('.pr-header .pr-stat:last-child .pr-stat-val');

            if(this.inputSeq.length >= this.pattern.length) {
                // Completado
                this.phase = 'watching';
                const timeBonus = this.mode === 'SPEED' ? this.timeLeft * 2 : 0;
                const pts = this.pattern.length * 15 + timeBonus;
                this.score += pts;

                const sc = document.getElementById('pr-score');
                if(sc) sc.innerText = this.score;
                const msg = document.getElementById('pr-msg');
                if(msg) { msg.style.color = '#10b981'; msg.textContent = '¡CORRECTO! +' + pts; }
                try { this.audio.playWin(4); } catch(e) {}
                setTimeout(() => this.newRound(), 1000);
            }
        } else {
            // Incorrecto
            if(el) el.classList.add('wrong');
            try { this.audio.playTone(120, 'square', 0.1, 0.15); } catch(e) {}
            const msg = document.getElementById('pr-msg');
            if(msg) { msg.style.color = '#ef4444'; msg.textContent = 'ERROR — Nueva ronda'; }
            this.phase = 'watching';
            if(this.mode !== 'SPEED') this.score = Math.max(0, this.score - 20);
            setTimeout(() => this.newRound(), 1200);
        }
    }

    endGame() {
        clearInterval(this._timerInt);
        delete window.patternRush;
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
    cleanup() { clearInterval(this._timerInt); delete window.patternRush; }
}
