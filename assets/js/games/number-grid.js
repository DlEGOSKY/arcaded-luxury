import { CONFIG } from '../config.js';
import {
    createGameShell, hudStat, hudLogo, hudMode,
    winFlash, screenShake, burstConfetti,
} from '../systems/pixi-stage.js';

export class NumberGridGame {
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
        this.lastTapTime = 0;
        this.fastCombo = 0;
        this.maxFastCombo = 0;
        this.highlightAvailable = 2;
        this.injectStyles();
    }

    injectStyles() {
        if(document.getElementById('numgrid-styles')) return;
        const s = document.createElement('style');
        s.id = 'numgrid-styles';
        s.innerHTML = `
            .ng-root { display:flex;flex-direction:column;align-items:center;justify-content:flex-start;height:100%;padding:16px;gap:12px;box-sizing:border-box; }
            .ng-header { display:flex;align-items:center;justify-content:space-between;width:100%;max-width:380px; }
            .ng-stat { text-align:center; }
            .ng-stat-val { font-family:var(--font-display);font-size:1.2rem;color:white; }
            .ng-stat-lbl { font-size:0.5rem;color:#334155;font-family:monospace;letter-spacing:2px; }
            .ng-grid { display:grid;gap:6px;width:100%;max-width:380px; }
            .ng-cell { aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:1rem;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:rgba(10,16,30,0.85);color:#94a3b8;cursor:pointer;transition:all 0.12s;user-select:none; }
            .ng-cell:hover:not(.done):not(.wrong) { border-color:var(--primary);color:white;background:rgba(59,130,246,0.1); }
            .ng-cell.done  { background:rgba(16,185,129,0.15);border-color:#10b981;color:#10b981;cursor:default; }
            .ng-cell.wrong { background:rgba(239,68,68,0.15);border-color:#ef4444;color:#ef4444;animation:ngShake 0.3s ease; }
            .ng-cell.next  { border-color:rgba(251,191,36,0.5);box-shadow:0 0 8px rgba(251,191,36,0.2); }
            .ng-cell.highlight { border-color:#10b981 !important;box-shadow:0 0 20px #10b981 !important;animation:ngHighlight 0.4s ease-in-out 5; }
            @keyframes ngHighlight { 0%,100%{background:rgba(16,185,129,0.15)} 50%{background:rgba(16,185,129,0.4)} }
            @keyframes ngShake { 0%,100%{transform:translateX(0)} 33%{transform:translateX(-3px)} 66%{transform:translateX(3px)} }
            .ng-msg { font-family:var(--font-display);font-size:0.72rem;letter-spacing:2px;color:#94a3b8;min-height:20px; }
            /* Vidas HUD */
            .ng-lives { display:flex;gap:4px;align-items:center;justify-content:center; }
            .ng-heart { font-size:0.85rem;color:#ef4444;transition:all 0.2s; }
            .ng-heart.lost { color:#334155;transform:scale(0.7); }
            /* Power-up */
            .ng-pwr { padding:7px 14px;background:rgba(10,16,30,0.9);border:1.5px solid #10b981;border-radius:8px;color:#10b981;font-family:var(--font-display);font-size:0.62rem;letter-spacing:2px;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:6px;margin-top:4px; }
            .ng-pwr:hover:not(.used) { background:rgba(16,185,129,0.15);transform:translateY(-2px); }
            .ng-pwr.used { opacity:0.3;pointer-events:none;filter:grayscale(1); }
            .ng-pwr .cnt { color:#94a3b8;font-size:0.55rem; }
            /* Speed chip */
            .ng-speed-chip { font-family:var(--font-display);font-size:0.65rem;color:#fbbf24;letter-spacing:2px;padding:3px 10px;background:rgba(251,191,36,0.15);border:1.5px solid #fbbf24;border-radius:15px;display:inline-block;opacity:0;transition:opacity 0.2s; }
            .ng-speed-chip.show { opacity:1; }
        `;
        document.head.appendChild(s);
    }

    init() { this.showModeSelect(); }

    showModeSelect() {
        const modes = [
            { id:'ng-n', mc:'#3b82f6', icon:'fa-hashtag',    name:'NORMAL',  desc:'1→25 en orden · mide tu tiempo'        },
            { id:'ng-b', mc:'#ef4444', icon:'fa-forward',    name:'BLITZ',   desc:'Múltiples rondas · 60 segundos totales' },
            { id:'ng-h', mc:'#a855f7', icon:'fa-skull',      name:'MAESTRO', desc:'1→36 en orden · grilla más grande'      },
        ];
        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;">NUMBER GRID</div>
                <div style="font-size:0.65rem;color:#3b82f6;letter-spacing:3px;font-family:monospace;">PROTOCOLO NUMÉRICO</div>
                <div style="width:120px;height:1px;background:#3b82f6;margin:10px auto 0;opacity:0.5;"></div>
            </div>
            <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
                ${modes.map(m=>`
                <div style="width:160px;min-height:155px;background:rgba(10,16,30,0.9);border:1px solid ${m.mc}25;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:pointer;transition:all 0.15s;padding:18px 12px;position:relative;"
                     id="${m.id}"
                     onmouseenter="this.style.transform='translateY(-4px)';this.style.borderColor='${m.mc}';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)';"
                     onmouseleave="this.style.transform='';this.style.borderColor='${m.mc}25';this.style.boxShadow='';">
                    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${m.mc};opacity:0.6;"></div>
                    <i class="fa-solid ${m.icon}" style="font-size:1.8rem;color:${m.mc};filter:drop-shadow(0 0 8px ${m.mc});"></i>
                    <div style="font-family:var(--font-display);font-size:0.76rem;letter-spacing:2px;color:${m.mc};">${m.name}</div>
                    <div style="font-size:0.6rem;color:#475569;font-family:monospace;text-align:center;line-height:1.5;">${m.desc}</div>
                </div>`).join('')}
            </div>
            <button class="btn btn-secondary" id="ng-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;
        document.getElementById('ng-n').onclick = () => this.startWithMode('NORMAL');
        document.getElementById('ng-b').onclick = () => this.startWithMode('BLITZ');
        document.getElementById('ng-h').onclick = () => this.startWithMode('MAESTRO');
        document.getElementById('ng-back').onclick = () => { if(this.onGameOver) this.onGameOver(0); };
    }

    startWithMode(mode) {
        this.mode    = mode;
        this.score   = 0;
        this.rounds  = 0;
        this._shellBuilt = false;
        this.size    = mode === 'MAESTRO' ? 6 : 5;
        this.total   = this.size * this.size;
        this.lives = 3; this.maxLives = 3;
        this.lastTapTime = 0;
        this.fastCombo = 0; this.maxFastCombo = 0;
        this.highlightAvailable = 2;
        try { this.canvas.setMood('CYAN'); } catch(e) {}
        if(mode === 'BLITZ') {
            this.timeLeft = 60;
            this.timerInt = setInterval(() => {
                this.timeLeft--;
                const el = document.getElementById('ng-timer');
                if(el) { el.innerText = this.timeLeft+'s'; el.style.color = this.timeLeft < 15 ? '#ef4444' : '#f97316'; }
                if(this.timeLeft <= 0) { clearInterval(this.timerInt); this.endGame(); }
            }, 1000);
        }
        this.newRound();
    }

    newRound() {
        this.next     = 1;
        this.done     = new Set();
        this.startMs  = Date.now();
        this.numbers  = Array.from({length:this.total}, (_,i)=>i+1).sort(()=>Math.random()-0.5);
        this.render();
    }

    _buildShell() {
        const modeColor = this.mode === 'BLITZ' ? '#ef4444' : this.mode === 'MAESTRO' ? '#a855f7' : '#3b82f6';
        const hudHTML = `
            <div style="display:flex;gap:20px;align-items:center;">
                ${hudLogo({ title: 'NUMBER', subtitle: 'GRID', titleColor: '#3b82f6', subColor: '#a855f7' })}
                ${hudStat({ label: 'PUNTOS', id: 'ng-score', color: '#fbbf24', value: '0', minWidth: 70 })}
                ${hudStat({ label: 'SIGUIENTE', id: 'ng-next', color: '#a855f7', value: '1', minWidth: 80 })}
                ${this.mode === 'BLITZ'
                    ? hudStat({ label: 'TIEMPO', id: 'ng-timer', color: '#f97316', value: this.timeLeft+'s', minWidth: 70 })
                    : hudStat({ label: 'TIEMPO', id: 'ng-elapsed', color: '#64748b', value: '0.0s', minWidth: 70 })}
                ${hudStat({ label: 'VIDAS', id: 'ng-lives-num', color: '#ec4899', value: String(this.lives), minWidth: 60 })}
            </div>
            ${hudMode({ mode: this.mode, modeColor, hint: 'NUMERIC PROTOCOL' })}
        `;
        const shell = createGameShell({
            container: this.uiContainer, hudHTML,
            frameColor: `${modeColor}88`, cornerColor: modeColor,
            domOnly: true, maxWidth: 640,
        });
        this._frame = shell.frame;
        this._content = shell.content;
        this._shellBuilt = true;
    }

    render() {
        if(!this._shellBuilt) this._buildShell();

        // Actualizar HUD
        const scoreEl = document.getElementById('ng-score');
        if(scoreEl) scoreEl.textContent = this.score;
        const nextEl = document.getElementById('ng-next');
        if(nextEl) nextEl.textContent = this.next;
        const livesEl = document.getElementById('ng-lives-num');
        if(livesEl) livesEl.textContent = this.lives;

        const cells = this.numbers.map((n, i) => {
            const isDone  = this.done.has(n);
            const isNext  = n === this.next;
            return '<div class="ng-cell' + (isDone?' done':isNext?' next':'') + '" ' +
                'onclick="window.numberGrid.tap(' + n + ')">' + n + '</div>';
        }).join('');

        this._content.innerHTML = `
            <div class="ng-grid" style="grid-template-columns:repeat(${this.size},1fr);">${cells}</div>
            <div class="ng-speed-chip" id="ng-speed">RACHA RÁPIDA</div>
            <div class="ng-msg" id="ng-msg">Toca los números del 1 al ${this.total} en orden</div>
            <button class="ng-pwr" id="ng-highlight">HIGHLIGHT <span class="cnt">·${this.highlightAvailable}</span> <span class="cnt">$15</span></button>
        `;

        const hb = document.getElementById('ng-highlight');
        if (hb) hb.onclick = () => this.activateHighlight();

        window.numberGrid = this;
        if(this.mode !== 'BLITZ') this.startElapsed();
    }

    activateHighlight() {
        if (this.highlightAvailable <= 0) return;
        if (window.app.credits < 15) { try { window.app.showToast('CRÉDITOS INSUFICIENTES', 'Highlight cuesta $15', 'danger'); } catch(e){} return; }
        window.app.credits -= 15;
        const vc = document.getElementById('val-credits'); if (vc) vc.innerText = window.app.credits;
        try { window.app.save(); } catch(e){}
        this.highlightAvailable--;
        // Resalta el número siguiente
        const cells = document.querySelectorAll('.ng-cell');
        cells.forEach(cell => {
            if (parseInt(cell.textContent) === this.next) {
                cell.classList.add('highlight');
                setTimeout(() => cell.classList.remove('highlight'), 2000);
            }
        });
        try { this.audio.playTone(1500, 'sine', 0.12); } catch(e){}
        const btn = document.getElementById('ng-highlight');
        if (btn) {
            btn.innerHTML = `HIGHLIGHT <span class="cnt">·${this.highlightAvailable}</span> <span class="cnt">$15</span>`;
            if (this.highlightAvailable <= 0) btn.classList.add('used');
        }
    }

    startElapsed() {
        if(this._elapsedInt) clearInterval(this._elapsedInt);
        this._elapsedInt = setInterval(() => {
            const el = document.getElementById('ng-elapsed');
            if(el) el.innerText = ((Date.now()-this.startMs)/1000).toFixed(1)+'s';
        }, 100);
    }

    tap(n) {
        if(this.done.has(n)) return;
        if(n === this.next) {
            // Fast combo: tap en <0.8s del anterior
            const now = Date.now();
            const isFast = this.lastTapTime > 0 && (now - this.lastTapTime) < 800;
            if (isFast) {
                this.fastCombo++;
                if (this.fastCombo > this.maxFastCombo) this.maxFastCombo = this.fastCombo;
                this.score += this.fastCombo;
                const chip = document.getElementById('ng-speed');
                if (chip) {
                    chip.textContent = `RACHA RÁPIDA ×${this.fastCombo}`;
                    chip.classList.add('show');
                }
            } else {
                this.fastCombo = 1;
                const chip = document.getElementById('ng-speed');
                if (chip) chip.classList.remove('show');
            }
            this.lastTapTime = now;
            this.done.add(n);
            this.next++;
            const el = document.querySelector('.ng-cell:not(.done)');
            // Update cells directly for performance
            document.querySelectorAll('.ng-cell').forEach(cell => {
                const num = parseInt(cell.textContent);
                if(this.done.has(num)) { cell.className = 'ng-cell done'; }
                else if(num === this.next) { cell.className = 'ng-cell next'; }
                else { cell.className = 'ng-cell'; }
            });
            // Update score display inline
            const sc = document.getElementById('ng-score');
            if (sc) sc.innerText = this.score;
            try { this.audio.playTone(300 + n*20 + (this.fastCombo*30), 'sine', 0.06, 0.08); } catch(e) {}
            if(this.next > this.total) this.roundComplete();
        } else {
            // Wrong number → pierde vida
            const cells = document.querySelectorAll('.ng-cell');
            cells.forEach(c => { if(parseInt(c.textContent)===n) { c.classList.add('wrong'); setTimeout(()=>c.classList.remove('wrong'),300); } });
            try { this.audio.playTone(150,'square',0.05,0.1); } catch(e) {}
            screenShake(this._frame, { strength: 6, count: 4 });
            winFlash(this._frame, { color: '#ef4444', duration: 250 });
            this.lives--;
            const livesHudEl = document.getElementById('ng-lives-num');
            if(livesHudEl) livesHudEl.textContent = this.lives;
            this.fastCombo = 0;
            const chip = document.getElementById('ng-speed');
            if (chip) chip.classList.remove('show');
            const livesEl = document.getElementById('ng-lives');
            if (livesEl) {
                livesEl.innerHTML = Array.from({length:this.maxLives},(_,i)=>
                    `<i class="fa-solid fa-heart ng-heart${i>=this.lives?' lost':''}"></i>`
                ).join('');
            }
            if (this.lives <= 0) {
                setTimeout(() => this.endGame(), 400);
            }
        }
    }

    roundComplete() {
        clearInterval(this._elapsedInt);
        const elapsed = (Date.now() - this.startMs) / 1000;
        const timeBonus = Math.max(0, Math.round((30 - elapsed) * 5));
        const pts = 100 + timeBonus;
        this.score += pts;
        this.rounds++;

        const sc = document.getElementById('ng-score');
        if(sc) sc.innerText = this.score;
        const msg = document.getElementById('ng-msg');
        if(msg) { msg.style.color='#10b981'; msg.textContent = elapsed.toFixed(2)+'s · +'+pts+' PTS'; }

        try { this.audio.playWin(5); } catch(e) {}
        winFlash(this._frame, { color: elapsed < 10 ? '#fbbf24' : '#10b981', duration: 400 });
        burstConfetti(this._frame, { count: 50, colors: ['#3b82f6', '#fbbf24', '#10b981', '#ffffff'] });

        if(this.mode === 'BLITZ') {
            setTimeout(() => { this.newRound(); }, 800);
        } else {
            setTimeout(() => this.endGame(), 2000);
        }
    }

    endGame() {
        clearInterval(this.timerInt);
        clearInterval(this._elapsedInt);
        delete window.numberGrid;
        // Bonus por max fast combo y rondas
        let bonus = 0;
        if (this.maxFastCombo >= 5) bonus += this.maxFastCombo * 2;
        if (this.rounds >= 2) bonus += this.rounds * 5;
        if (bonus > 0) {
            window.app.credits += bonus;
            try { window.app.showToast('BONUS FINAL', `+${bonus} CR · Racha ×${this.maxFastCombo}`, 'success'); } catch(e){}
            const vc = document.getElementById('val-credits'); if (vc) vc.innerText = window.app.credits;
            try { window.app.save(); } catch(e){}
        }
        if(this.onGameOver) this.onGameOver(this.score);
    }

    pause()   { clearInterval(this.timerInt); clearInterval(this._elapsedInt); }
    resume()  { if(this.mode==='BLITZ' && this.timeLeft>0) { this.timerInt = setInterval(()=>{ this.timeLeft--; const el=document.getElementById('ng-timer'); if(el)el.innerText=this.timeLeft+'s'; if(this.timeLeft<=0){clearInterval(this.timerInt);this.endGame();}},1000); } this.startElapsed(); }
    cleanup() { clearInterval(this.timerInt); clearInterval(this._elapsedInt); delete window.numberGrid; }
}
