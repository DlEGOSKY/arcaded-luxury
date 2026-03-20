import { CONFIG } from '../config.js';

export class ReactionChainGame {
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
        if(document.getElementById('rchain-styles')) return;
        const s = document.createElement('style');
        s.id = 'rchain-styles';
        s.innerHTML = `
            .rc-root { display:flex;flex-direction:column;align-items:center;height:100%;padding:16px;gap:14px;box-sizing:border-box; }
            .rc-header { display:flex;justify-content:space-between;align-items:center;width:100%;max-width:420px; }
            .rc-stat { text-align:center; }
            .rc-stat-val { font-family:var(--font-display);font-size:1.2rem;color:white; }
            .rc-stat-lbl { font-size:0.5rem;color:#334155;font-family:monospace;letter-spacing:2px; }
            .rc-arena { position:relative;width:100%;max-width:420px;flex:1;background:rgba(8,14,26,0.85);border:1px solid rgba(255,255,255,0.06);border-radius:16px;overflow:hidden; }
            .rc-node { position:absolute;width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform 0.1s;font-family:var(--font-display);font-size:0.9rem;font-weight:bold;user-select:none;transform:translate(-50%,-50%); }
            .rc-node:hover { transform:translate(-50%,-50%) scale(1.1); }
            .rc-node.target { animation:rcPulse 0.6s ease-in-out infinite; }
            .rc-node.hit    { animation:rcHit 0.3s ease forwards; pointer-events:none; }
            .rc-node.wrong  { animation:rcWrong 0.3s ease forwards; }
            @keyframes rcPulse { 0%,100%{box-shadow:0 0 0 0 currentColor} 50%{box-shadow:0 0 0 8px transparent} }
            @keyframes rcHit   { 0%{transform:translate(-50%,-50%) scale(1)} 50%{transform:translate(-50%,-50%) scale(1.4)} 100%{transform:translate(-50%,-50%) scale(0);opacity:0} }
            @keyframes rcWrong { 0%,100%{transform:translate(-50%,-50%)} 25%{transform:translate(calc(-50% - 5px),-50%)} 75%{transform:translate(calc(-50% + 5px),-50%)} }
            .rc-msg { font-family:var(--font-display);font-size:0.72rem;letter-spacing:2px;color:#94a3b8;min-height:18px; }
            .rc-chain-bar { width:100%;max-width:420px;height:4px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden; }
            .rc-chain-fill { height:100%;background:var(--primary);border-radius:2px;transition:width 0.1s linear; }
        `;
        document.head.appendChild(s);
    }

    init() { this.showModeSelect(); }

    showModeSelect() {
        const modes = [
            { id:'rc-n', mc:'#3b82f6', icon:'fa-link',         name:'NORMAL',   desc:'Toca la cadena en orden · sin límite' },
            { id:'rc-s', mc:'#ef4444', icon:'fa-bolt',         name:'SPEED',    desc:'Cadenas cada vez más rápidas'         },
            { id:'rc-e', mc:'#a855f7', icon:'fa-infinity',     name:'ENDLESS',  desc:'Cadenas infinitas · errores = fin'    },
        ];
        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;">REACTION CHAIN</div>
                <div style="font-size:0.65rem;color:#3b82f6;letter-spacing:3px;font-family:monospace;">PROTOCOLO DE CADENA</div>
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
            <button class="btn btn-secondary" id="rc-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;
        document.getElementById('rc-n').onclick = () => this.startWithMode('NORMAL');
        document.getElementById('rc-s').onclick = () => this.startWithMode('SPEED');
        document.getElementById('rc-e').onclick = () => this.startWithMode('ENDLESS');
        document.getElementById('rc-back').onclick = () => { if(this.onGameOver) this.onGameOver(0); };
    }

    startWithMode(mode) {
        this.mode    = mode;
        this.score   = 0;
        this.round   = 0;
        this.lives   = mode === 'ENDLESS' ? 3 : 999;
        this.baseTime= mode === 'SPEED' ? 8000 : 12000;
        try { this.canvas.setMood('CYAN'); } catch(e) {}
        this.newChain();
    }

    newChain() {
        this.round++;
        const chainLen = Math.min(3 + Math.floor(this.round / 2), 9);
        const timeLimit = Math.max(3000, this.baseTime - this.round * 300);
        const COLORS = ['#ef4444','#f97316','#fbbf24','#10b981','#3b82f6','#a855f7','#ec4899','#06b6d4','#84cc16'];
        this.chain = Array.from({length: chainLen}, (_, i) => ({
            id: i,
            color: COLORS[i % COLORS.length],
            x: 15 + Math.random() * 70,
            y: 15 + Math.random() * 70,
        }));
        this.current = 0;
        this.timeLimit = timeLimit;
        this.startTime = Date.now();
        this.render();
        // Timer bar
        this._timerInt = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const pct = Math.max(0, 100 - (elapsed / timeLimit * 100));
            const bar = document.getElementById('rc-bar-fill');
            if(bar) bar.style.width = pct + '%';
            if(elapsed >= timeLimit) {
                clearInterval(this._timerInt);
                this.onTimeout();
            }
        }, 50);
    }

    render() {
        const livesHTML = Array.from({length: Math.min(this.lives, 5)}, (_, i) =>
            `<i class="fa-solid fa-heart" style="color:#ec4899;font-size:0.75rem;margin:0 2px;"></i>`
        ).join('');

        const nodesHTML = this.chain.map(n => {
            const isNext   = n.id === this.current;
            const isDone   = n.id < this.current;
            return `<div class="rc-node ${isNext?'target':''}" id="rc-node-${n.id}"
                style="left:${n.x}%;top:${n.y}%;background:${isDone?'rgba(255,255,255,0.05)':n.color+'22'};
                border:2px solid ${isDone?'rgba(255,255,255,0.08)':n.color};color:${n.color};
                ${isDone?'opacity:0.3;pointer-events:none;':''}"
                onclick="window.reactionChain.tap(${n.id})"
            >${n.id + 1}</div>`;
        }).join('');

        this.uiContainer.innerHTML = `
        <div class="rc-root">
            <div class="rc-header">
                <div class="rc-stat"><div class="rc-stat-val" id="rc-score">${this.score}</div><div class="rc-stat-lbl">PUNTOS</div></div>
                <div class="rc-stat"><div class="rc-stat-val" style="color:#a855f7;">${this.round}</div><div class="rc-stat-lbl">RONDA</div></div>
                <div class="rc-stat"><div style="display:flex;align-items:center;gap:2px;">${livesHTML}</div><div class="rc-stat-lbl">VIDAS</div></div>
            </div>
            <div class="rc-chain-bar"><div class="rc-chain-fill" id="rc-bar-fill" style="width:100%;"></div></div>
            <div class="rc-arena">${nodesHTML}</div>
            <div class="rc-msg" id="rc-msg">Toca los nodos del 1 al ${this.chain.length} en orden</div>
        </div>`;
        window.reactionChain = this;
    }

    tap(id) {
        if(id !== this.current) {
            // Wrong node
            const el = document.getElementById('rc-node-' + id);
            if(el) { el.classList.add('wrong'); setTimeout(()=>el.classList.remove('wrong'),300); }
            try { this.audio.playTone(150,'square',0.05,0.1); } catch(e) {}
            if(this.mode === 'ENDLESS') {
                this.lives--;
                if(this.lives <= 0) { clearInterval(this._timerInt); setTimeout(()=>this.endGame(),400); return; }
                this.render(); window.reactionChain = this;
            }
            return;
        }
        // Correct
        const el = document.getElementById('rc-node-' + id);
        if(el) el.classList.add('hit');
        try { this.audio.playTone(300 + id*80,'sine',0.06,0.08); } catch(e) {}
        this.current++;

        if(this.current >= this.chain.length) {
            // Chain complete!
            clearInterval(this._timerInt);
            const elapsed = Date.now() - this.startTime;
            const timeBonus = Math.round((this.timeLimit - elapsed) / 100);
            const pts = this.chain.length * 10 + timeBonus;
            this.score += pts;
            const sc = document.getElementById('rc-score');
            if(sc) sc.innerText = this.score;
            const msg = document.getElementById('rc-msg');
            if(msg) { msg.style.color='#10b981'; msg.textContent = '¡CADENA COMPLETADA! +' + pts; }
            try { this.audio.playWin(3); } catch(e) {}

            if(this.mode === 'NORMAL' && this.round >= 5) {
                setTimeout(() => this.endGame(), 1500);
            } else {
                setTimeout(() => this.newChain(), 1000);
            }
        } else {
            // Partial progress
            const nextEl = document.getElementById('rc-node-' + this.current);
            if(nextEl) { nextEl.classList.add('target'); }
        }
    }

    onTimeout() {
        const msg = document.getElementById('rc-msg');
        if(msg) { msg.style.color='#ef4444'; msg.textContent='¡TIEMPO AGOTADO!'; }
        try { this.audio.playLose(); } catch(e) {}
        if(this.mode === 'ENDLESS') {
            this.lives--;
            if(this.lives > 0) { setTimeout(()=>this.newChain(),1000); }
            else setTimeout(()=>this.endGame(),1000);
        } else {
            setTimeout(()=>this.endGame(),1500);
        }
    }

    endGame() {
        clearInterval(this._timerInt);
        delete window.reactionChain;
        if(this.onGameOver) this.onGameOver(this.score);
    }

    pause()   { clearInterval(this._timerInt); }
    resume()  { if(this.chain) this.newChain(); }
    cleanup() { clearInterval(this._timerInt); delete window.reactionChain; }
}
