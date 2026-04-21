import { CONFIG } from '../config.js';

const SPRITES = [
    { name:'CORAZÓN',   grid: [
        [0,1,1,0,1,1,0,0],[1,1,1,1,1,1,1,0],[1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,0,0],[0,0,1,1,1,0,0,0],[0,0,0,1,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0]
    ], color:'#ef4444' },
    { name:'ESPADA',    grid: [
        [0,0,0,0,0,0,1,0],[0,0,0,0,0,1,0,0],[0,0,0,0,1,0,0,0],[0,0,0,1,0,0,0,0],
        [0,0,1,0,0,0,0,0],[0,1,1,0,0,0,0,0],[1,1,0,0,0,0,0,0],[1,0,0,0,0,0,0,0]
    ], color:'#94a3b8' },
    { name:'ESTRELLA',  grid: [
        [0,0,0,1,0,0,0,0],[0,0,1,1,1,0,0,0],[1,1,1,1,1,1,1,0],[0,1,1,1,1,1,0,0],
        [0,0,1,1,1,0,0,0],[0,1,0,1,0,1,0,0],[1,0,0,1,0,0,1,0],[0,0,0,0,0,0,0,0]
    ], color:'#fbbf24' },
    { name:'CALAVERA',  grid: [
        [0,1,1,1,1,1,0,0],[1,0,0,0,0,0,1,0],[1,1,0,1,0,1,1,0],[1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,0,0],[0,1,0,1,0,1,0,0],[0,0,1,0,1,0,0,0],[0,0,0,0,0,0,0,0]
    ], color:'#e2e8f0' },
    { name:'RAYO',      grid: [
        [0,0,0,1,1,0,0,0],[0,0,1,1,0,0,0,0],[0,1,1,1,1,0,0,0],[0,0,1,1,1,1,0,0],
        [0,0,0,1,1,0,0,0],[0,0,0,0,1,0,0,0],[0,0,0,1,0,0,0,0],[0,0,0,0,0,0,0,0]
    ], color:'#fbbf24' },
    { name:'FANTASMA',  grid: [
        [0,0,1,1,1,0,0,0],[0,1,0,0,0,1,0,0],[1,0,1,0,1,0,1,0],[1,0,0,0,0,0,1,0],
        [1,1,1,1,1,1,1,0],[1,0,0,0,0,0,1,0],[1,0,1,0,1,0,1,0],[0,0,0,0,0,0,0,0]
    ], color:'#a855f7' },
    { name:'COHETE',    grid: [
        [0,0,0,1,0,0,0,0],[0,0,1,1,1,0,0,0],[0,1,1,1,1,1,0,0],[0,1,1,1,1,1,0,0],
        [0,0,1,1,1,0,0,0],[0,1,0,1,0,1,0,0],[0,0,0,1,0,0,0,0],[0,0,1,0,1,0,0,0]
    ], color:'#3b82f6' },
    { name:'DIAMANTE',  grid: [
        [0,0,0,1,0,0,0,0],[0,0,1,1,1,0,0,0],[0,1,1,0,1,1,0,0],[1,1,0,0,0,1,1,0],
        [0,1,1,0,1,1,0,0],[0,0,1,1,1,0,0,0],[0,0,0,1,0,0,0,0],[0,0,0,0,0,0,0,0]
    ], color:'#06b6d4' },
];

export class PixelDrawGame {
    constructor(canvas, audio, onGameOver) {
        this.canvas      = canvas;
        this.audio       = audio;
        this.onGameOver  = onGameOver;
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.score       = 0;
        this.mode        = 'NORMAL';
        // NUEVAS MECÁNICAS
        this.streak = 0;           // sprites consecutivos con accuracy >=80
        this.maxStreak = 0;
        this.spritesCompleted = 0;
        this.colorHintAvailable = 2;
        this.injectStyles();
    }

    injectStyles() {
        if(document.getElementById('pixeldraw-styles')) return;
        const s = document.createElement('style');
        s.id = 'pixeldraw-styles';
        s.innerHTML = `
            .pd-root { display:flex;flex-direction:column;align-items:center;height:100%;padding:12px;gap:10px;box-sizing:border-box;overflow-y:auto; }
            .pd-header { display:flex;align-items:center;justify-content:space-between;width:100%;max-width:480px; }
            .pd-stat { text-align:center; }
            .pd-stat-val { font-family:var(--font-display);font-size:1.1rem;color:white; }
            .pd-stat-lbl { font-size:0.5rem;color:#334155;font-family:monospace;letter-spacing:2px; }
            .pd-boards { display:flex;gap:16px;align-items:flex-start;justify-content:center;width:100%; }
            .pd-board-wrap { display:flex;flex-direction:column;align-items:center;gap:5px; }
            .pd-board-lbl { font-size:0.55rem;color:#334155;font-family:monospace;letter-spacing:2px; }
            .pd-grid { display:grid;grid-template-columns:repeat(8,1fr);gap:2px;border:2px solid rgba(255,255,255,0.08);border-radius:8px;padding:4px;background:rgba(10,16,30,0.8); }
            .pd-cell { width:28px;height:28px;border-radius:3px;cursor:pointer;transition:all 0.05s;border:1px solid rgba(255,255,255,0.04); }
            .pd-cell:hover { filter:brightness(1.3); }
            .pd-cell.ref { cursor:default; }
            .pd-cell.ref:hover { filter:none; }
            .pd-palette { display:flex;gap:5px;flex-wrap:wrap;justify-content:center;max-width:260px; }
            .pd-color { width:26px;height:26px;border-radius:5px;cursor:pointer;border:2px solid transparent;transition:all 0.1s; }
            .pd-color.active { border-color:white;transform:scale(1.2); }
            .pd-msg { font-family:var(--font-display);font-size:0.72rem;letter-spacing:2px;color:#94a3b8;min-height:18px; }
            .pd-actions { display:flex;gap:8px; }
            .pd-btn { padding:7px 16px;border-radius:8px;font-family:var(--font-display);font-size:0.65rem;letter-spacing:2px;cursor:pointer;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#94a3b8;transition:all 0.15s; }
            .pd-btn:hover { background:rgba(255,255,255,0.1);color:white; }
            .pd-btn.primary { border-color:rgba(59,130,246,0.5);background:rgba(59,130,246,0.12);color:#60a5fa; }
            .pd-btn.pwr { border-color:rgba(168,85,247,0.5);background:rgba(168,85,247,0.12);color:#a855f7; }
            .pd-btn.pwr.used { opacity:0.3;pointer-events:none;filter:grayscale(1); }
            .pd-btn.pwr .cnt { color:#94a3b8;font-size:0.55rem;margin-left:4px; }
            .pd-color.hint { animation:pdHint 0.5s ease-in-out 3; box-shadow:0 0 18px currentColor; }
            @keyframes pdHint { 0%,100%{transform:scale(1.2)} 50%{transform:scale(1.4)} }
            .pd-streak { font-family:var(--font-display);font-size:0.65rem;color:#fbbf24;letter-spacing:2px;padding:3px 10px;background:rgba(251,191,36,0.15);border:1px solid #fbbf24;border-radius:15px; }
        `;
        document.head.appendChild(s);
    }

    init() { this.showModeSelect(); }

    showModeSelect() {
        const modes = [
            { id:'pd-normal', mc:'#3b82f6', icon:'fa-paintbrush',  name:'NORMAL',  desc:'Copia el sprite · sin límite de tiempo' },
            { id:'pd-speed',  mc:'#f97316', icon:'fa-stopwatch',   name:'SPEED',   desc:'90 segundos · más puntos por rapidez'   },
            { id:'pd-libre', mc:'#a855f7', icon:'fa-pen-ruler',   name:'LIBRE',   desc:'Dibuja lo que quieras · sin objetivo'   },
        ];
        // Fix typo en id
        modes[2].id = 'pd-libre';
        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;">PIXEL DRAW</div>
                <div style="font-size:0.65rem;color:#3b82f6;letter-spacing:3px;font-family:monospace;">PROTOCOLO ARTÍSTICO</div>
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
            <button class="btn btn-secondary" id="pd-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;
        document.getElementById('pd-normal').onclick = () => this.startWithMode('NORMAL');
        document.getElementById('pd-speed').onclick  = () => this.startWithMode('SPEED');
        document.getElementById('pd-libre').onclick  = () => this.startWithMode('FREE');
        document.getElementById('pd-back').onclick   = () => { if(this.onGameOver) this.onGameOver(0); };
    }

    startWithMode(mode) {
        this.mode    = mode;
        this.score   = 0;
        this.drawing = Array.from({length:8}, ()=>Array(8).fill('#0a0e1a'));
        this.selectedColor = '#ef4444';
        this.isDrawing = false;
        // Reset nuevas mecánicas
        this.streak = 0; this.maxStreak = 0;
        this.spritesCompleted = 0;
        this.colorHintAvailable = 2;

        this.target = mode === 'FREE' ? null : SPRITES[Math.floor(Math.random() * SPRITES.length)];
        try { this.canvas.setMood('CYAN'); } catch(e) {}

        if(mode === 'SPEED') {
            this.timeLeft = 90;
            this.timerInt = setInterval(() => {
                this.timeLeft--;
                const el = document.getElementById('pd-timer');
                if(el) { el.innerText = this.timeLeft+'s'; el.style.color = this.timeLeft < 20 ? '#ef4444' : '#f97316'; }
                if(this.timeLeft <= 0) { clearInterval(this.timerInt); this.checkResult(true); }
            }, 1000);
        }
        this.render();
    }

    render() {
        const PALETTE = ['#ef4444','#f97316','#fbbf24','#10b981','#3b82f6','#a855f7','#ec4899',
                         '#ffffff','#94a3b8','#475569','#1e293b','#0a0e1a'];

        const timerHTML = this.mode === 'SPEED'
            ? '<div class="pd-stat"><div class="pd-stat-val" id="pd-timer" style="color:#f97316;">'+this.timeLeft+'s</div><div class="pd-stat-lbl">TIEMPO</div></div>'
            : '';

        const renderGrid = (grid, isRef, sprite) => {
            return grid.map((row, ri) =>
                row.map((cell, ci) => {
                    const color = isRef ? (cell ? (sprite.color||'#fff') : '#0a0e1a') : cell;
                    const cls = isRef ? 'pd-cell ref' : 'pd-cell draw';
                    const id  = isRef ? '' : `id="cell-${ri}-${ci}"`;
                    return `<div class="${cls}" ${id} style="background:${color};"
                        ${!isRef ? `onmousedown="window.pixelDraw.startDraw(${ri},${ci})"
                                   onmouseenter="window.pixelDraw.continueDraw(${ri},${ci})"` : ''}
                    ></div>`;
                }).join('')
            ).join('');
        };

        const refHTML = this.target
            ? `<div class="pd-board-wrap">
                <div class="pd-board-lbl">REFERENCIA</div>
                <div class="pd-grid">${renderGrid(this.target.grid, true, this.target)}</div>
               </div>`
            : '';

        const drawHTML = `<div class="pd-board-wrap">
            <div class="pd-board-lbl">${this.mode==='FREE'?'TU OBRA':'TU COPIA'}</div>
            <div class="pd-grid" onmouseleave="window.pixelDraw.stopDraw()">${renderGrid(this.drawing, false, null)}</div>
        </div>`;

        const paletteHTML = PALETTE.map(c =>
            `<div class="pd-color ${c===this.selectedColor?'active':''}" style="background:${c};"
                 onclick="window.pixelDraw.selectColor('${c}')"></div>`
        ).join('');

        const scoreHTML = this.target
            ? `<button class="pd-btn primary" onclick="window.pixelDraw.checkResult(false)">
                <i class="fa-solid fa-check"></i> VERIFICAR</button>`
            : `<button class="pd-btn primary" onclick="window.pixelDraw.endGame()">
                <i class="fa-solid fa-save"></i> GUARDAR</button>`;

        const hintHTML = this.target
            ? `<button class="pd-btn pwr${this.colorHintAvailable<=0?' used':''}" onclick="window.pixelDraw.activateColorHint()">
                HINT <span class="cnt">·${this.colorHintAvailable}</span> <span class="cnt">$10</span></button>`
            : '';

        const streakHTML = this.streak >= 2 ? `<div class="pd-streak">RACHA ×${this.streak}</div>` : '';

        this.uiContainer.innerHTML = `
        <div class="pd-root">
            <div class="pd-header">
                <div class="pd-stat"><div class="pd-stat-val" id="pd-score">${this.score}</div><div class="pd-stat-lbl">PUNTOS</div></div>
                ${timerHTML}
                ${this.target ? `<div class="pd-stat"><div class="pd-stat-val" style="color:#a855f7;">${this.target.name}</div><div class="pd-stat-lbl">OBJETIVO</div></div>` : ''}
            </div>
            <div class="pd-boards">${refHTML}${drawHTML}</div>
            <div class="pd-palette">${paletteHTML}</div>
            ${streakHTML}
            <div class="pd-msg" id="pd-msg">${this.mode==='FREE'?'Dibuja libremente — elige colores y pinta':'Copia el sprite de la izquierda con exactitud'}</div>
            <div class="pd-actions">
                <button class="pd-btn" onclick="window.pixelDraw.clearCanvas()"><i class="fa-solid fa-eraser"></i> LIMPIAR</button>
                ${hintHTML}
                ${scoreHTML}
                <button class="pd-btn" onclick="window.pixelDraw.quit()"><i class="fa-solid fa-arrow-left"></i> SALIR</button>
            </div>
        </div>`;

        // Eventos de mouse global para drag
        this.uiContainer.onmouseup = () => this.stopDraw();
        window.pixelDraw = this;
    }

    startDraw(r, c) { this.isDrawing = true; this.paint(r, c); }
    continueDraw(r, c) { if(this.isDrawing) this.paint(r, c); }
    stopDraw() { this.isDrawing = false; }

    paint(r, c) {
        this.drawing[r][c] = this.selectedColor;
        const el = document.getElementById(`cell-${r}-${c}`);
        if(el) el.style.background = this.selectedColor;
        try { this.audio.playTone(200 + c*50, 'sine', 0.03, 0.05); } catch(e) {}
    }

    selectColor(color) {
        this.selectedColor = color;
        document.querySelectorAll('.pd-color').forEach(el => {
            el.classList.toggle('active', el.style.background === color || el.style.backgroundColor === color);
        });
    }

    clearCanvas() {
        this.drawing = Array.from({length:8}, ()=>Array(8).fill('#0a0e1a'));
        this.render();
        window.pixelDraw = this;
    }

    activateColorHint() {
        if (this.colorHintAvailable <= 0 || !this.target) return;
        if (window.app.credits < 10) { try { window.app.showToast('CRÉDITOS INSUFICIENTES', 'Hint cuesta $10', 'danger'); } catch(e){} return; }
        window.app.credits -= 10;
        const vc = document.getElementById('val-credits'); if (vc) vc.innerText = window.app.credits;
        try { window.app.save(); } catch(e){}
        this.colorHintAvailable--;
        // Auto-selecciona el color del sprite objetivo y lo resalta
        this.selectedColor = this.target.color;
        document.querySelectorAll('.pd-color').forEach(el => {
            const bg = el.style.background || el.style.backgroundColor;
            if (bg === this.target.color) {
                el.classList.add('hint', 'active');
            } else {
                el.classList.remove('active');
            }
        });
        try { this.audio.playTone(1500, 'sine', 0.12); } catch(e){}
        setTimeout(() => {
            document.querySelectorAll('.pd-color').forEach(el => el.classList.remove('hint'));
        }, 1500);
    }

    checkResult(timeout) {
        if(!this.target) { this.endGame(); return; }
        clearInterval(this.timerInt);

        let correct = 0;
        let total   = 0;
        let perfectColor = 0;
        this.target.grid.forEach((row, ri) => {
            row.forEach((cell, ci) => {
                if(cell) {
                    total++;
                    const drawn = this.drawing[ri][ci];
                    // Aceptar el color del sprite o blanco como correcto
                    if(drawn !== '#0a0e1a' && drawn !== '#1e293b') {
                        correct++;
                        if (drawn === this.target.color) perfectColor++;
                    }
                }
            });
        });

        const accuracy = total > 0 ? Math.round((correct/total)*100) : 0;
        const colorAccuracy = total > 0 ? Math.round((perfectColor/total)*100) : 0;
        const timeBonus = this.mode === 'SPEED' ? this.timeLeft * 2 : 0;
        // Streak bonus si accuracy >=80%
        if (accuracy >= 80) {
            this.streak++;
            if (this.streak > this.maxStreak) this.maxStreak = this.streak;
            this.spritesCompleted++;
        } else {
            this.streak = 0;
        }
        let streakMulti = 1;
        if (this.streak >= 5) streakMulti = 3;
        else if (this.streak >= 3) streakMulti = 2;
        else if (this.streak >= 2) streakMulti = 1.5;
        const colorBonus = Math.round(colorAccuracy * 0.3);
        const pts = Math.floor((Math.round(accuracy * 0.8) + timeBonus + colorBonus) * streakMulti);
        this.score += pts;

        const el = document.getElementById('pd-msg');
        if(el) {
            el.style.color = accuracy >= 80 ? '#10b981' : accuracy >= 50 ? '#f59e0b' : '#ef4444';
            el.textContent = accuracy + '% DE PRECISIÓN · +' + pts + ' PTS';
        }
        const sc = document.getElementById('pd-score');
        if(sc) sc.innerText = this.score;

        if(accuracy >= 80) { try { this.audio.playWin(5); } catch(e) {} }
        else               { try { this.audio.playLose(); } catch(e) {} }

        if(!timeout && accuracy >= 60 && this.mode !== 'FREE') {
            // Siguiente sprite si acertó
            setTimeout(() => {
                this.target = SPRITES[Math.floor(Math.random() * SPRITES.length)];
                this.drawing = Array.from({length:8}, ()=>Array(8).fill('#0a0e1a'));
                this.render();
                window.pixelDraw = this;
            }, 1500);
        } else {
            setTimeout(() => this.endGame(), 2000);
        }
    }

    endGame() {
        clearInterval(this.timerInt);
        window.removeEventListener('mouseup', this._stopDraw);
        delete window.pixelDraw;
        // Bonus por sprites completados y racha
        let bonus = 0;
        if (this.spritesCompleted >= 3) bonus += this.spritesCompleted * 4;
        if (this.maxStreak >= 3) bonus += this.maxStreak * 3;
        if (bonus > 0) {
            window.app.credits += bonus;
            try { window.app.showToast('BONUS FINAL', `+${bonus} CR · Racha ×${this.maxStreak}`, 'success'); } catch(e){}
            const vc = document.getElementById('val-credits'); if (vc) vc.innerText = window.app.credits;
            try { window.app.save(); } catch(e){}
        }
        if(this.onGameOver) this.onGameOver(this.score);
    }

    quit() { this.endGame(); }
    pause()   { clearInterval(this.timerInt); }
    resume()  { if(this.mode==='SPEED' && this.timeLeft>0) { this.timerInt = setInterval(()=>{ this.timeLeft--; const el=document.getElementById('pd-timer'); if(el)el.innerText=this.timeLeft+'s'; if(this.timeLeft<=0){clearInterval(this.timerInt);this.checkResult(true);}},1000); } }
    cleanup() { clearInterval(this.timerInt); delete window.pixelDraw; }
}
