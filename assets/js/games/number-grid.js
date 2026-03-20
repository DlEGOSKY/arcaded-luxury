import { CONFIG } from '../config.js';

export class NumberGridGame {
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
            @keyframes ngShake { 0%,100%{transform:translateX(0)} 33%{transform:translateX(-3px)} 66%{transform:translateX(3px)} }
            .ng-msg { font-family:var(--font-display);font-size:0.72rem;letter-spacing:2px;color:#94a3b8;min-height:20px; }
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
        this.size    = mode === 'MAESTRO' ? 6 : 5;
        this.total   = this.size * this.size;
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

    render() {
        const timerHTML = this.mode === 'BLITZ'
            ? '<div class="ng-stat"><div class="ng-stat-val" id="ng-timer" style="color:#f97316;">'+this.timeLeft+'s</div><div class="ng-stat-lbl">TIEMPO</div></div>'
            : '<div class="ng-stat"><div class="ng-stat-val" id="ng-elapsed" style="color:#475569;">0.0s</div><div class="ng-stat-lbl">TIEMPO</div></div>';

        const cells = this.numbers.map((n, i) => {
            const isDone  = this.done.has(n);
            const isNext  = n === this.next;
            return '<div class="ng-cell' + (isDone?' done':isNext?' next':'') + '" ' +
                'onclick="window.numberGrid.tap(' + n + ')">' + n + '</div>';
        }).join('');

        this.uiContainer.innerHTML = `
        <div class="ng-root">
            <div class="ng-header">
                <div class="ng-stat"><div class="ng-stat-val" id="ng-score">${this.score}</div><div class="ng-stat-lbl">PUNTOS</div></div>
                <div class="ng-stat"><div class="ng-stat-val" style="color:#a855f7;">${this.next}</div><div class="ng-stat-lbl">SIGUIENTE</div></div>
                ${timerHTML}
                <div class="ng-stat"><div class="ng-stat-val" style="color:#334155;">${this.rounds}</div><div class="ng-stat-lbl">RONDAS</div></div>
            </div>
            <div class="ng-grid" style="grid-template-columns:repeat(${this.size},1fr);">${cells}</div>
            <div class="ng-msg" id="ng-msg">Toca los números del 1 al ${this.total} en orden</div>
        </div>`;

        window.numberGrid = this;
        if(this.mode !== 'BLITZ') this.startElapsed();
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
            try { this.audio.playTone(300 + n*20, 'sine', 0.06, 0.08); } catch(e) {}
            if(this.next > this.total) this.roundComplete();
        } else {
            // Wrong number
            const cells = document.querySelectorAll('.ng-cell');
            cells.forEach(c => { if(parseInt(c.textContent)===n) { c.classList.add('wrong'); setTimeout(()=>c.classList.remove('wrong'),300); } });
            try { this.audio.playTone(150,'square',0.05,0.1); } catch(e) {}
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
        if(this.onGameOver) this.onGameOver(this.score);
    }

    pause()   { clearInterval(this.timerInt); clearInterval(this._elapsedInt); }
    resume()  { if(this.mode==='BLITZ' && this.timeLeft>0) { this.timerInt = setInterval(()=>{ this.timeLeft--; const el=document.getElementById('ng-timer'); if(el)el.innerText=this.timeLeft+'s'; if(this.timeLeft<=0){clearInterval(this.timerInt);this.endGame();}},1000); } this.startElapsed(); }
    cleanup() { clearInterval(this.timerInt); clearInterval(this._elapsedInt); delete window.numberGrid; }
}
