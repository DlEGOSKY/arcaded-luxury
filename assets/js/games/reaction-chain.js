import { CONFIG } from '../config.js';
import {
    createGameShell, hudStat, hudLogo, hudMode,
    winFlash, screenShake, burstConfetti,
} from '../systems/pixi-stage.js';

export class ReactionChainGame {
    constructor(canvas, audio, onGameOver) {
        this.canvas      = canvas;
        this.audio       = audio;
        this.onGameOver  = onGameOver;
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.score       = 0;
        this.mode        = 'NORMAL';
        // NUEVAS MECÁNICAS
        this.streak = 0;
        this.maxStreak = 0;
        this.fastChains = 0;
        this.timeBoostsAvailable = 2;
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
            /* Power-up + streak */
            .rc-foot { display:flex;gap:10px;align-items:center;width:100%;max-width:420px;justify-content:space-between;margin-top:4px; }
            .rc-pwr { padding:6px 12px;background:rgba(10,16,30,0.9);border:1.5px solid #10b981;border-radius:8px;color:#10b981;font-family:var(--font-display);font-size:0.6rem;letter-spacing:2px;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:6px; }
            .rc-pwr:hover:not(.used) { background:rgba(16,185,129,0.15);transform:translateY(-2px); }
            .rc-pwr.used { opacity:0.3;pointer-events:none;filter:grayscale(1); }
            .rc-pwr .cnt { color:#94a3b8;font-size:0.52rem; }
            .rc-streak { padding:3px 10px;background:rgba(251,191,36,0.15);border:1px solid #fbbf24;border-radius:15px;color:#fbbf24;font-family:var(--font-display);font-size:0.6rem;letter-spacing:2px; }
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
        this._shellBuilt = false;
        this.lives   = 3;
        this.maxLives = 3;
        this.baseTime= mode === 'SPEED' ? 8000 : 12000;
        this.streak = 0; this.maxStreak = 0;
        this.fastChains = 0;
        this.timeBoostsAvailable = 2;
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

    _buildShell() {
        const modeColor = this.mode === 'SPEED' ? '#ef4444' : this.mode === 'ENDLESS' ? '#a855f7' : '#3b82f6';
        const hudHTML = `
            <div style="display:flex;gap:20px;align-items:center;">
                ${hudLogo({ title: 'REACTION', subtitle: 'CHAIN', titleColor: '#3b82f6', subColor: '#ec4899' })}
                ${hudStat({ label: 'PUNTOS', id: 'rc-score', color: '#fbbf24', value: '0', minWidth: 70 })}
                ${hudStat({ label: 'RONDA',  id: 'rc-round', color: '#a855f7', value: '0', minWidth: 60 })}
                ${hudStat({ label: 'VIDAS',  id: 'rc-lives-num', color: '#ec4899', value: String(this.lives), minWidth: 60 })}
            </div>
            ${hudMode({ mode: this.mode, modeColor, hint: 'CHAIN PROTOCOL' })}
        `;
        const shell = createGameShell({
            container: this.uiContainer, hudHTML,
            frameColor: `${modeColor}88`, cornerColor: modeColor,
            domOnly: true, maxWidth: 620,
        });
        this._frame = shell.frame;
        this._content = shell.content;
        this._shellBuilt = true;
    }

    render() {
        if(!this._shellBuilt) this._buildShell();
        // HUD
        const sEl = document.getElementById('rc-score'); if(sEl) sEl.textContent = this.score;
        const rEl = document.getElementById('rc-round'); if(rEl) rEl.textContent = this.round;
        const lEl = document.getElementById('rc-lives-num'); if(lEl) lEl.textContent = this.lives;

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

        const streakHTML = this.streak >= 2 ? `<div class="rc-streak">RACHA ×${this.streak}</div>` : '<div></div>';

        this._content.innerHTML = `
            <div class="rc-chain-bar"><div class="rc-chain-fill" id="rc-bar-fill" style="width:100%;"></div></div>
            <div class="rc-arena">${nodesHTML}</div>
            <div class="rc-msg" id="rc-msg">Toca los nodos del 1 al ${this.chain.length} en orden</div>
            <div class="rc-foot">
                ${streakHTML}
                <button class="rc-pwr${this.timeBoostsAvailable<=0?' used':''}" id="rc-time">+3s <span class="cnt">·${this.timeBoostsAvailable}</span> <span class="cnt">$15</span></button>
            </div>
        `;
        const tb = document.getElementById('rc-time');
        if (tb) tb.onclick = () => this.activateTimeBoost();
        window.reactionChain = this;
    }

    activateTimeBoost() {
        if (this.timeBoostsAvailable <= 0 || !this.chain || this.current >= this.chain.length) return;
        if (window.app.credits < 15) { try { window.app.showToast('CRÉDITOS INSUFICIENTES', '+3s cuesta $15', 'danger'); } catch(e){} return; }
        window.app.credits -= 15;
        const vc = document.getElementById('val-credits'); if (vc) vc.innerText = window.app.credits;
        try { window.app.save(); } catch(e){}
        this.timeBoostsAvailable--;
        // Añadir 3s al timer actual
        this.timeLimit += 3000;
        this.startTime += 0; // no move startTime, solo ampliamos el total
        try { this.audio.playTone(1500, 'sine', 0.12); } catch(e){}
        try { window.app.showToast('+3 SEGUNDOS', 'Tiempo extendido', 'success'); } catch(e){}
        const btn = document.getElementById('rc-time');
        if (btn) {
            btn.innerHTML = `+3s <span class="cnt">·${this.timeBoostsAvailable}</span> <span class="cnt">$15</span>`;
            if (this.timeBoostsAvailable <= 0) btn.classList.add('used');
        }
    }

    tap(id) {
        if(id !== this.current) {
            // Wrong node → pierde vida + rompe racha
            const el = document.getElementById('rc-node-' + id);
            if(el) { el.classList.add('wrong'); setTimeout(()=>el.classList.remove('wrong'),300); }
            try { this.audio.playTone(150,'square',0.05,0.1); } catch(e) {}
            this.lives--;
            this.streak = 0;
            if(this.lives <= 0) { clearInterval(this._timerInt); setTimeout(()=>this.endGame(),400); return; }
            this.render(); window.reactionChain = this;
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
            // Fast chain bonus: si se completa en <50% del tiempo
            const isFast = elapsed < this.timeLimit * 0.5;
            const fastBonus = isFast ? 20 : 0;
            if (isFast) this.fastChains++;
            // Streak
            this.streak++;
            if (this.streak > this.maxStreak) this.maxStreak = this.streak;
            let streakMulti = 1;
            if (this.streak >= 5) streakMulti = 2;
            else if (this.streak >= 3) streakMulti = 1.5;
            const basePts = this.chain.length * 10 + timeBonus + fastBonus;
            const pts = Math.floor(basePts * streakMulti);
            this.score += pts;
            const sc = document.getElementById('rc-score');
            if(sc) sc.innerText = this.score;
            const msg = document.getElementById('rc-msg');
            const fastTxt = isFast ? ' + FAST' : '';
            const streakTxt = streakMulti > 1 ? ` ×${streakMulti}` : '';
            if(msg) { msg.style.color='#10b981'; msg.textContent = `¡CADENA! +${pts}${fastTxt}${streakTxt}`; }
            try { this.audio.playWin(3); } catch(e) {}
            winFlash(this._frame, { color: isFast ? '#fbbf24' : '#10b981', duration: 300 });
            if(this.streak === 5 || this.streak === 10) {
                burstConfetti(this._frame, { count: this.streak >= 10 ? 60 : 40, colors: ['#3b82f6', '#fbbf24', '#10b981', '#ffffff'] });
            }

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
        screenShake(this._frame, { strength: 8, count: 5 });
        winFlash(this._frame, { color: '#ef4444', duration: 350 });
        // Timeout penaliza vida + rompe racha en todos los modos
        this.lives--;
        this.streak = 0;
        const lEl = document.getElementById('rc-lives-num');
        if(lEl) lEl.textContent = this.lives;
        if(this.lives > 0) { setTimeout(()=>this.newChain(),1000); }
        else setTimeout(()=>this.endGame(),1000);
    }

    endGame() {
        clearInterval(this._timerInt);
        // Bonus por maxStreak y fastChains
        let bonus = 0;
        if (this.maxStreak >= 3) bonus += this.maxStreak * 4;
        if (this.fastChains >= 2) bonus += this.fastChains * 5;
        if (bonus > 0) {
            window.app.credits += bonus;
            try { window.app.showToast('BONUS FINAL', `+${bonus} CR · Racha ×${this.maxStreak} · ${this.fastChains} rápidas`, 'success'); } catch(e){}
            const vc = document.getElementById('val-credits'); if (vc) vc.innerText = window.app.credits;
            try { window.app.save(); } catch(e){}
        }
        delete window.reactionChain;
        if(this.onGameOver) this.onGameOver(this.score);
    }

    pause()   { clearInterval(this._timerInt); }
    resume()  { if(this.chain) this.newChain(); }
    cleanup() { clearInterval(this._timerInt); delete window.reactionChain; }
}
