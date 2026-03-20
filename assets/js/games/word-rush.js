import { CONFIG } from '../config.js';

const WORDS = [
    'NEXUS','CYBER','GLITCH','PIXEL','NEON','VIRUS','AGENT','PULSE','PRIME','LOGIC',
    'ORBIT','CRYPT','BLITZ','GHOST','LASER','SWIFT','CODEC','PROXY','NODES','SIGMA',
    'DELTA','ALPHA','OMEGA','CLOCK','FLAME','STORM','NERVE','PHASE','DRIVE','STACK',
    'RADAR','SONIC','TURBO','HYPER','ULTRA','MICRO','MACRO','PROTO','CACHE','SHELL',
    'CHUNK','BLOCK','FRAME','QUEUE','FETCH','PARSE','TOKEN','SCOPE','MUTEX','SPAWN',
];

export class WordRushGame {
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
        if(document.getElementById('wordrush-styles')) return;
        const s = document.createElement('style');
        s.id = 'wordrush-styles';
        s.innerHTML = `
            .wr-root { display:flex;flex-direction:column;align-items:center;justify-content:flex-start;height:100%;padding:16px;gap:12px;box-sizing:border-box;overflow-y:auto; }
            .wr-header { display:flex;align-items:center;justify-content:space-between;width:100%;max-width:340px; }
            .wr-stat { text-align:center; }
            .wr-stat-val { font-family:var(--font-display);font-size:1.2rem;color:white; }
            .wr-stat-lbl { font-size:0.5rem;color:#334155;font-family:monospace;letter-spacing:2px; }
            .wr-grid { display:flex;flex-direction:column;gap:5px;width:100%;max-width:340px; }
            .wr-row { display:grid;grid-template-columns:repeat(5,1fr);gap:5px; }
            .wr-cell { aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:1.1rem;letter-spacing:1px;border-radius:6px;border:2px solid rgba(255,255,255,0.1);background:rgba(10,16,30,0.8);color:white;transition:all 0.15s;text-transform:uppercase; }
            .wr-cell.filled { border-color:rgba(255,255,255,0.3);background:rgba(30,40,60,0.9); }
            .wr-cell.hit    { background:#10b981;border-color:#10b981;color:white;animation:wrFlip 0.4s ease; }
            .wr-cell.close  { background:#f59e0b;border-color:#f59e0b;color:white;animation:wrFlip 0.4s ease; }
            .wr-cell.miss   { background:#1e293b;border-color:#334155;color:#475569;animation:wrFlip 0.4s ease; }
            .wr-cell.shake  { animation:wrShake 0.4s ease; }
            @keyframes wrFlip { 0%{transform:scaleY(1)} 50%{transform:scaleY(0)} 100%{transform:scaleY(1)} }
            @keyframes wrShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
            .wr-keyboard { display:flex;flex-direction:column;gap:5px;width:100%;max-width:360px; }
            .wr-kb-row { display:flex;justify-content:center;gap:4px; }
            .wr-key { min-width:28px;height:38px;padding:0 6px;border-radius:5px;border:none;background:rgba(30,40,60,0.9);color:#94a3b8;font-family:var(--font-display);font-size:0.68rem;cursor:pointer;transition:all 0.1s;display:flex;align-items:center;justify-content:center; }
            .wr-key:hover { background:rgba(50,60,80,0.9); }
            .wr-key.hit   { background:#10b981;color:white; }
            .wr-key.close { background:#f59e0b;color:white; }
            .wr-key.miss  { background:#1e293b;color:#334155; }
            .wr-key.wide  { min-width:44px;font-size:0.6rem; }
            .wr-msg { font-family:var(--font-display);font-size:0.75rem;letter-spacing:2px;color:#94a3b8;min-height:20px;text-align:center; }
        `;
        document.head.appendChild(s);
    }

    init() { this.showModeSelect(); }

    showModeSelect() {
        const modes = [
            { id:'wr-normal', mc:'#3b82f6', icon:'fa-spell-check',  name:'NORMAL',  desc:'6 intentos · sin límite de tiempo'  },
            { id:'wr-blitz',  mc:'#ef4444', icon:'fa-stopwatch',     name:'BLITZ',   desc:'3 minutos · tantas palabras como puedas' },
            { id:'wr-hard',   mc:'#a855f7', icon:'fa-skull',         name:'DIFÍCIL', desc:'4 intentos · sin pistas de color'   },
        ];
        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;">WORD RUSH</div>
                <div style="font-size:0.65rem;color:#3b82f6;letter-spacing:3px;font-family:monospace;">PROTOCOLO LÉXICO</div>
                <div style="width:120px;height:1px;background:#3b82f6;margin:10px auto 0;opacity:0.5;"></div>
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
            <button class="btn btn-secondary" id="wr-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;
        document.getElementById('wr-normal').onclick = () => this.startWithMode('NORMAL');
        document.getElementById('wr-blitz').onclick  = () => this.startWithMode('BLITZ');
        document.getElementById('wr-hard').onclick   = () => this.startWithMode('HARD');
        document.getElementById('wr-back').onclick   = () => { if(this.onGameOver) this.onGameOver(0); };
    }

    startWithMode(mode) {
        this.mode         = mode;
        this.score        = 0;
        this.wordsGuessed = 0;
        this.maxAttempts  = mode === 'HARD' ? 4 : 6;
        this.keyStates    = {};
        try { this.canvas.setMood('CYAN'); } catch(e) {}
        if(mode === 'BLITZ') {
            this.timeLeft = 180;
            this.timerInt = setInterval(() => {
                this.timeLeft--;
                const el = document.getElementById('wr-timer');
                if(el) el.innerText = this.timeLeft + 's';
                if(el) el.style.color = this.timeLeft < 30 ? '#ef4444' : '#f59e0b';
                if(this.timeLeft === 15) { try{window.app.audio.setTension(true);}catch(e){} }
                if(this.timeLeft <= 0) { clearInterval(this.timerInt); this.endGame(true); }
            }, 1000);
        }
        this.newWord();
    }

    newWord() {
        this.target   = WORDS[Math.floor(Math.random() * WORDS.length)];
        this.attempts = [];
        this.current  = '';
        this.solved   = false;
        this.render();
        this.attachKeyboard();
    }

    render() {
        const maxR = this.maxAttempts;
        const timerHTML = this.mode === 'BLITZ'
            ? '<div class="wr-stat"><div class="wr-stat-val" id="wr-timer" style="color:#f59e0b;">'+this.timeLeft+'s</div><div class="wr-stat-lbl">TIEMPO</div></div>'
            : '';
        const rows = Array.from({length: maxR}, (_, ri) => {
            const attempt = this.attempts[ri];
            return '<div class="wr-row">' +
                Array.from({length: 5}, (_, ci) => {
                    let letter = '', cls = '';
                    if(attempt) {
                        letter = attempt.word[ci] || '';
                        if(this.mode !== 'HARD') cls = attempt.result[ci];
                        else cls = attempt.result[ci] === 'miss' ? 'miss' : 'filled';
                    } else if(ri === this.attempts.length && this.current[ci]) {
                        letter = this.current[ci];
                        cls = 'filled';
                    }
                    return '<div class="wr-cell '+cls+'">'+letter+'</div>';
                }).join('') +
            '</div>';
        }).join('');

        const KB_ROWS = [
            ['Q','W','E','R','T','Y','U','I','O','P'],
            ['A','S','D','F','G','H','J','K','L'],
            ['↵','Z','X','C','V','B','N','M','⌫'],
        ];
        const keyboard = '<div class="wr-keyboard">' +
            KB_ROWS.map(row =>
                '<div class="wr-kb-row">' +
                row.map(k => {
                    const st = this.keyStates[k] || '';
                    const wide = (k==='↵'||k==='⌫') ? ' wide' : '';
                    return '<button class="wr-key'+wide+' '+st+'" onclick="window.wordRush.pressKey(\''+k+'\')">' + k + '</button>';
                }).join('') +
                '</div>'
            ).join('') +
        '</div>';

        this.uiContainer.innerHTML = `
        <div class="wr-root">
            <div class="wr-header">
                <div class="wr-stat"><div class="wr-stat-val" id="wr-score">${this.score}</div><div class="wr-stat-lbl">PUNTOS</div></div>
                <div class="wr-stat"><div class="wr-stat-val" style="color:#a855f7;">${this.wordsGuessed}</div><div class="wr-stat-lbl">PALABRAS</div></div>
                ${timerHTML}
                <div class="wr-stat"><div class="wr-stat-val" style="color:#334155;">${this.attempts.length}/${maxR}</div><div class="wr-stat-lbl">INTENTOS</div></div>
            </div>
            <div class="wr-grid">${rows}</div>
            <div class="wr-msg" id="wr-msg"></div>
            ${keyboard}
        </div>`;
        window.wordRush = this;
    }

    attachKeyboard() {
        this._kbHandler = (e) => {
            if(e.key === 'Enter')      this.pressKey('↵');
            else if(e.key === 'Backspace') this.pressKey('⌫');
            else if(/^[a-zA-Z]$/.test(e.key)) this.pressKey(e.key.toUpperCase());
        };
        window.addEventListener('keydown', this._kbHandler);
    }

    pressKey(k) {
        if(this.solved) return;
        if(k === '⌫') {
            this.current = this.current.slice(0,-1);
        } else if(k === '↵') {
            this.submit();
            return;
        } else if(this.current.length < 5) {
            this.current += k;
        }
        this.render();
        window.wordRush = this;
    }

    submit() {
        if(this.current.length < 5) { this.showMsg('FALTAN LETRAS', '#ef4444'); return; }
        if(!WORDS.includes(this.current) && this.current !== this.target) {
            this.showMsg('PALABRA NO VÁLIDA', '#ef4444');
            this.shakeRow(this.attempts.length);
            return;
        }
        const result = Array.from({length:5}, (_,i) => {
            if(this.current[i] === this.target[i]) return 'hit';
            if(this.target.includes(this.current[i])) return 'close';
            return 'miss';
        });
        this.attempts.push({ word: this.current, result });
        // Actualizar estado del teclado
        this.current.split('').forEach((ch, i) => {
            const curr = this.keyStates[ch];
            const next = result[i];
            if(curr !== 'hit') this.keyStates[ch] = next === 'hit' ? 'hit' : next === 'close' ? (curr === 'close' ? 'close' : next) : 'miss';
        });
        this.current = '';
        const won = result.every(r => r === 'hit');
        if(won) {
            const pts = (this.maxAttempts - this.attempts.length + 1) * 20;
            this.score += pts;
            this.wordsGuessed++;
            this.solved = true;
            this.showMsg('¡CORRECTO! +' + pts + ' PTS', '#10b981');
            try { this.audio.playWin(3); } catch(e) {}
            this.render(); window.wordRush = this;
            if(this.mode === 'BLITZ') {
                setTimeout(() => { this.solved=false; this.newWord(); }, 1200);
            } else {
                setTimeout(() => this.endGame(false), 2000);
            }
        } else if(this.attempts.length >= this.maxAttempts) {
            this.showMsg('ERA: ' + this.target, '#ef4444');
            try { this.audio.playLose(); } catch(e) {}
            this.render(); window.wordRush = this;
            setTimeout(() => this.endGame(false), 2500);
        } else {
            this.render(); window.wordRush = this;
        }
    }

    showMsg(txt, col) {
        const el = document.getElementById('wr-msg');
        if(el) { el.textContent = txt; el.style.color = col; }
    }

    shakeRow(ri) {
        setTimeout(() => {
            const rows = document.querySelectorAll('.wr-row');
            if(rows[ri]) rows[ri].querySelectorAll('.wr-cell').forEach(c => {
                c.classList.add('shake');
                setTimeout(() => c.classList.remove('shake'), 400);
            });
        }, 50);
    }

    endGame(timeout) {
        clearInterval(this.timerInt);
        window.removeEventListener('keydown', this._kbHandler);
        if(this.onGameOver) this.onGameOver(this.score);
    }

    pause()   { clearInterval(this.timerInt); window.removeEventListener('keydown', this._kbHandler); }
    resume()  { if(this.mode==='BLITZ' && this.timeLeft>0 && !this.solved) { this.timerInt = setInterval(()=>{ this.timeLeft--; const el=document.getElementById('wr-timer'); if(el)el.innerText=this.timeLeft+'s'; if(this.timeLeft<=0){clearInterval(this.timerInt);this.endGame(true);}},1000); } this.attachKeyboard(); }
    cleanup() { clearInterval(this.timerInt); window.removeEventListener('keydown', this._kbHandler); delete window.wordRush; }
}
