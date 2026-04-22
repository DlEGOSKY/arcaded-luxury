import { CONFIG, TRIVIA_DATA } from '../config.js';
import * as FX from '../systems/game-fx.js';
import * as Backdrop from '../systems/game-backdrop.js';
import { icon } from '../systems/icons.js';
import {
    createGameShell, hudStat, hudLogo, hudMode,
    winFlash, screenShake, burstConfetti,
} from '../systems/pixi-stage.js';

const TARGET_QUESTIONS = 10;
const LIVES_START = 3;

export class TriviaGame {
    constructor(canvas, audio, onQuit) {
        this.canvas = canvas;
        this.audio = audio;
        this.onQuit = onQuit;
        this.score = 0;
        this.questionsAnswered = 0;
        this.lives = LIVES_START;
        this.creditsEarned = 0;
        this.timeLeft = 15;
        this.timePerQuestion = 15;
        this.questionStartTime = 0;
        this.timerInterval = null;
        this.currentQ = null;
        this.isProcessing = false;
        this.hintShown = false;
        this.uiContainer = document.getElementById('game-ui-overlay');

        this.powerups = {
            fifty: { used:false, cost:15, name:'50/50',  ic:'scaleBalanced' },
            hint:  { used:false, cost:10, name:'PISTA',  ic:'eye' },
            skip:  { used:false, cost:25, name:'SALTAR', ic:'forward' }
        };

        this.injectStyles();
    }

    injectStyles() {
        const old = document.getElementById('trivia-styles'); if (old) old.remove();
        if (document.getElementById('trivia-styles-v2')) return;
        const s = document.createElement('style');
        s.id = 'trivia-styles-v2';
        s.innerHTML = `
        .triv-root { display:flex; flex-direction:column; align-items:center; justify-content:flex-start; height:calc(100vh - 56px); padding:12px 16px 16px; width:100%; gap:10px; box-sizing:border-box; position:relative; z-index:1; overflow-y:auto; max-width:640px; margin:0 auto; }

        .triv-hud { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; width:100%; flex-shrink:0; }
        .triv-hud-cell { position:relative; background:rgba(5,10,20,0.92); border:1px solid rgba(6,182,212,0.2); border-radius:10px; padding:6px 10px; overflow:hidden; }
        .triv-hud-cell::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg, transparent, rgba(6,182,212,0.5), transparent); }
        .triv-hud-cell-lbl { font-size:0.5rem; color:rgba(6,182,212,0.75); letter-spacing:2.5px; font-family:monospace; text-transform:uppercase; }
        .triv-hud-cell-val { font-family:var(--font-display); font-size:1rem; color:white; display:flex; align-items:center; gap:4px; line-height:1.1; margin-top:2px; }
        .triv-hud-cell-val .icon-svg { font-size:0.78em; }

        .triv-lives { display:flex; gap:4px; align-items:center; }
        .triv-life { font-size:0.9rem; color:#ef4444; filter:drop-shadow(0 0 6px #ef4444); transition:all 0.3s; }
        .triv-life.lost { color:#334155; filter:none; opacity:0.3; transform:scale(0.85); }

        .triv-category { font-size:0.7rem; color:#06b6d4; text-transform:uppercase; letter-spacing:3px; background:rgba(6,182,212,0.08); padding:5px 18px; border:1px solid rgba(6,182,212,0.4); border-radius:20px; box-shadow:0 0 14px rgba(6,182,212,0.2); font-family:monospace; font-weight:600; }

        .triv-q-wrap { width:100%; background:rgba(8,14,26,0.95); border:1.5px solid rgba(6,182,212,0.22); border-radius:14px; padding:20px 18px; position:relative; overflow:hidden; backdrop-filter:blur(6px); }
        .triv-q-wrap::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg, transparent, rgba(6,182,212,0.7), transparent); }
        .triv-q-wrap::after { content:''; position:absolute; bottom:0; left:0; right:0; height:1px; background:linear-gradient(90deg, transparent, rgba(6,182,212,0.25), transparent); }
        .triv-q { font-family:var(--font-display); font-size:1.25rem; text-align:center; color:white; text-shadow:0 0 12px rgba(6,182,212,0.35); line-height:1.4; min-height:68px; display:flex; align-items:center; justify-content:center; }

        .triv-timer-wrap { width:100%; height:6px; background:rgba(0,0,0,0.5); border-radius:3px; overflow:hidden; position:relative; border:1px solid rgba(6,182,212,0.25); }
        .triv-timer-fill { height:100%; width:100%; background:linear-gradient(90deg, #06b6d4, #3b82f6); box-shadow:0 0 10px #06b6d4; transition:width 0.1s linear; }
        .triv-timer-fill.warn     { background:linear-gradient(90deg,#fbbf24,#f97316); box-shadow:0 0 10px #f97316; }
        .triv-timer-fill.critical { background:linear-gradient(90deg,#ef4444,#dc2626); box-shadow:0 0 12px #ef4444; animation:trivPulseRed 0.5s infinite; }

        .triv-powerups { display:flex; gap:8px; justify-content:center; width:100%; }
        .triv-pu { flex:1; max-width:130px; padding:7px 6px; background:rgba(10,16,30,0.85); border:1.5px solid rgba(255,255,255,0.1); border-radius:10px; display:flex; flex-direction:column; align-items:center; gap:3px; cursor:pointer; transition:all 0.15s; position:relative; overflow:hidden; }
        .triv-pu:hover:not([disabled]) { transform:translateY(-2px); border-color:rgba(6,182,212,0.5); box-shadow:0 4px 14px rgba(6,182,212,0.2); }
        .triv-pu[disabled] { opacity:0.3; cursor:not-allowed; filter:grayscale(0.9); pointer-events:none; }
        .triv-pu.used { opacity:0.25; filter:grayscale(1); pointer-events:none; }
        .triv-pu-icon { font-size:1rem; color:#06b6d4; }
        .triv-pu-name { font-family:var(--font-display); font-size:0.62rem; letter-spacing:1.5px; color:white; }
        .triv-pu-cost { font-size:0.5rem; color:#fbbf24; font-family:monospace; letter-spacing:0.5px; }

        .triv-answers { display:grid; grid-template-columns:1fr 1fr; gap:10px; width:100%; }
        .triv-btn { background:rgba(10,16,30,0.85); border:1.5px solid rgba(255,255,255,0.15); color:#e2e8f0; padding:14px 14px; font-size:0.88rem; cursor:pointer; transition:all 0.2s; position:relative; overflow:hidden; clip-path:polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px); text-align:center; font-family:inherit; min-height:62px; display:flex; align-items:center; justify-content:center; line-height:1.3; }
        .triv-btn:hover:not(:disabled) { background:rgba(6,182,212,0.1); border-color:#06b6d4; color:white; transform:translateY(-2px); box-shadow:0 6px 18px rgba(0,0,0,0.4), 0 0 14px rgba(6,182,212,0.3); }
        .triv-btn:disabled { cursor:not-allowed; }
        .triv-btn.correct { background:rgba(16,185,129,0.22) !important; border-color:#22c55e !important; color:#22c55e !important; box-shadow:0 0 22px rgba(16,185,129,0.5); }
        .triv-btn.wrong   { background:rgba(244,63,94,0.22) !important; border-color:#ef4444 !important; color:#ef4444 !important; animation:trivShake 0.3s; }
        .triv-btn.eliminated { opacity:0.2; pointer-events:none; filter:grayscale(1); }
        .triv-btn.hinted { border-color:#fbbf24 !important; box-shadow:0 0 16px rgba(251,191,36,0.4); }

        .triv-hint-banner { font-size:0.7rem; color:#fbbf24; letter-spacing:1.5px; font-family:monospace; background:rgba(251,191,36,0.1); border:1px solid rgba(251,191,36,0.4); border-radius:8px; padding:6px 12px; text-align:center; display:flex; align-items:center; justify-content:center; gap:6px; }

        .triv-feedback { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:50; font-family:var(--font-display); font-size:3rem; letter-spacing:6px; pointer-events:none; opacity:0; }
        .triv-feedback.win  { color:#22c55e; text-shadow:0 0 30px #22c55e; }
        .triv-feedback.loss { color:#ef4444; text-shadow:0 0 30px #ef4444; }
        .triv-feedback.active { animation:trivFeedback 0.9s cubic-bezier(0.2,0,0,1.3) both; }

        @keyframes trivPulseRed { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes trivShake    { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        @keyframes trivFeedback { 0%{opacity:0;transform:translate(-50%,-50%) scale(0.3)} 30%{opacity:1;transform:translate(-50%,-50%) scale(1.15)} 70%{opacity:1;transform:translate(-50%,-50%) scale(1)} 100%{opacity:0;transform:translate(-50%,-50%) scale(1.5)} }
        `;
        document.head.appendChild(s);
    }

    init() {
        if (window.app.credits < 15) {
            try { window.app.showToast('FONDOS INSUFICIENTES', 'Costo: $15', 'danger'); } catch(e) {}
            if (this.onQuit) this.onQuit(0);
            return;
        }
        this.showModeSelect();
    }

    showModeSelect() {
        const modes = [
            { id:'triv-all',   mc:'#06b6d4', ic:'brain',     name:'GENERAL',  desc:'Todas las categorías' },
            { id:'triv-tech',  mc:'#3b82f6', ic:'microchip', name:'TECH',     desc:'Ciencia y tecnología' },
            { id:'triv-pop',   mc:'#a855f7', ic:'gamepad',   name:'POP',      desc:'Cine, música, juegos' },
            { id:'triv-speed', mc:'#ef4444', ic:'bolt',      name:'BLITZ',    desc:'5 segundos · payout ×2' },
        ];
        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;padding:20px;">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.7rem;color:white;letter-spacing:5px;margin-bottom:4px;text-shadow:0 0 20px rgba(6,182,212,0.6);">NEURAL TRIVIA</div>
                <div style="font-size:0.62rem;color:#06b6d4;letter-spacing:4px;font-family:monospace;">CONOCIMIENTO GENERAL</div>
                <div style="width:120px;height:1px;background:linear-gradient(90deg,transparent,#06b6d4,transparent);margin:10px auto 0;"></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:520px;width:100%;padding:0 10px;">
                ${modes.map(m => `
                <div class="fx-ripple" style="background:rgba(10,16,30,0.92);border:1px solid ${m.mc}30;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;transition:all 0.15s;padding:18px 10px;position:relative;overflow:hidden;min-height:125px;"
                     id="${m.id}"
                     onmouseenter="this.style.transform='translateY(-3px)';this.style.borderColor='${m.mc}';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.5), 0 0 18px ${m.mc}40';"
                     onmouseleave="this.style.transform='';this.style.borderColor='${m.mc}30';this.style.boxShadow='';">
                    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${m.mc};opacity:0.75;"></div>
                    <div style="font-size:1.7rem;color:${m.mc};filter:drop-shadow(0 0 10px ${m.mc});line-height:1;">${icon(m.ic)}</div>
                    <div style="font-family:var(--font-display);font-size:0.74rem;letter-spacing:2.5px;color:${m.mc};">${m.name}</div>
                    <div style="font-size:0.6rem;color:#64748b;font-family:monospace;text-align:center;">${m.desc}</div>
                </div>`).join('')}
            </div>
            <button class="btn btn-secondary" id="triv-back" style="width:200px;display:flex;align-items:center;justify-content:center;gap:8px;">
                <span style="display:inline-flex;align-items:center;">${icon('arrowLeft')}</span> VOLVER AL LOBBY
            </button>
        </div>`;
        document.getElementById('triv-all').onclick   = () => this.payAndStart('ALL',   15);
        document.getElementById('triv-tech').onclick  = () => this.payAndStart('TECH',  15);
        document.getElementById('triv-pop').onclick   = () => this.payAndStart('POP',   15);
        document.getElementById('triv-speed').onclick = () => this.payAndStart('SPEED', 15);
        document.getElementById('triv-back').onclick  = () => { if (this.onQuit) this.onQuit(0); };
    }

    payAndStart(mode, cost) {
        this.mode = mode;
        this.categoryFilter = {
            ALL: null,
            TECH: ['CIENCIA','TECNOLOGÍA','ASTRONOMÍA'],
            POP:  ['CINE','MÚSICA','VIDEOJUEGOS','ARTE'],
            SPEED: null
        }[mode];
        this.initialTime = mode === 'SPEED' ? 5 : 15;
        this.modeMultiplier = mode === 'SPEED' ? 2 : 1;
        window.app.credits -= cost;
        const vc = document.getElementById('val-credits'); if (vc) vc.innerText = window.app.credits;
        try { this.audio.playBuy(); } catch(e) {}
        try { this.canvas.setMood('CYAN'); } catch(e) {}
        try { window.app.combo?.start(); } catch(e) {}
        try { Backdrop.mount({ color:'#06b6d4', particles:'dots', intensity: mode==='SPEED'?1.3:1 }); } catch(e) {}

        this.score = 0;
        this.questionsAnswered = 0;
        this.lives = LIVES_START;
        this.creditsEarned = 0;
        this._shellBuilt = false;
        Object.values(this.powerups).forEach(p => p.used = false);
        this.nextQuestion();
    }

    _buildShell() {
        const modeColor = this.mode === 'SPEED' ? '#ef4444'
                        : this.mode === 'TECH'  ? '#3b82f6'
                        : this.mode === 'POP'   ? '#a855f7'
                        : '#06b6d4';
        const hudHTML = `
            <div style="display:flex;gap:20px;align-items:center;">
                ${hudLogo({ title: 'NEURAL', subtitle: 'TRIVIA', titleColor: '#06b6d4', subColor: '#fbbf24' })}
                ${hudStat({ label: 'SCORE',  id: 'triv-score-hud', color: '#22c55e', value: '0', minWidth: 70 })}
                ${hudStat({ label: 'VIDAS',  id: 'triv-lives-num', color: '#ec4899', value: String(LIVES_START), minWidth: 60 })}
                ${hudStat({ label: 'PREGUNTA', id: 'triv-qnum', color: '#fbbf24', value: '1', minWidth: 70 })}
            </div>
            ${hudMode({ mode: this.mode, modeColor, hint: 'QUIZ PROTOCOL' })}
        `;
        const shell = createGameShell({
            container: this.uiContainer,
            hudHTML,
            frameColor: `${modeColor}88`,
            cornerColor: modeColor,
            domOnly: true,
            maxWidth: 720,
        });
        this._frame = shell.frame;
        this._content = shell.content;
        this._shellBuilt = true;
    }

    nextQuestion() {
        this.isProcessing = false;
        this.hintShown = false;
        if (this.timerInterval) clearInterval(this.timerInterval);

        // Difficulty scaling: cada 3 preguntas, tiempo −1s (piso: 5s)
        const scaleStep = Math.floor(this.questionsAnswered / 3);
        const tpq = Math.max(5, this.initialTime - scaleStep);
        this.timePerQuestion = tpq;
        this.timeLeft = tpq;
        this.questionStartTime = performance.now();

        const pool = this.categoryFilter
            ? TRIVIA_DATA.filter(q => this.categoryFilter.includes(q.c))
            : TRIVIA_DATA;
        const usePool = pool.length > 0 ? pool : TRIVIA_DATA;
        this.currentQ = usePool[Math.floor(Math.random() * usePool.length)];

        const options = [this.currentQ.a, ...this.currentQ.i];
        options.sort(() => Math.random() - 0.5);
        this.currentOptions = options;

        this.render(options);
        this.startTimer();
    }

    startTimer() {
        const bar = document.getElementById('triv-timer');
        this.timerInterval = setInterval(() => {
            this.timeLeft -= 0.1;
            if (bar) {
                const pct = Math.max(0, (this.timeLeft / this.timePerQuestion) * 100);
                bar.style.width = pct + '%';
                const frac = this.timeLeft / this.timePerQuestion;
                bar.classList.remove('warn','critical');
                if (frac < 0.33) bar.classList.add('critical');
                else if (frac < 0.66) bar.classList.add('warn');
            }
            if (this.timeLeft <= 0) { clearInterval(this.timerInterval); this.timeOut(); }
        }, 100);
    }

    timeOut() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        const btns = document.querySelectorAll('.triv-btn');
        btns.forEach(b => { b.disabled = true; if (b.dataset.correct === '1') b.classList.add('correct'); });
        try { this.audio.playLose(); } catch(e) {}
        try { window.app.combo?.miss(); } catch(e) {}
        try { window.app.showToast('TIEMPO AGOTADO','Perdiste 1 vida','danger'); } catch(e) {}
        this.showFeedback(false);
        this.loseLife();
    }

    render(options) {
        if(!this._shellBuilt) this._buildShell();

        // Actualizar HUD externo
        const scoreEl = document.getElementById('triv-score-hud');
        if(scoreEl) scoreEl.textContent = this.score;
        const livesEl = document.getElementById('triv-lives-num');
        if(livesEl) livesEl.textContent = this.lives;
        const qnumEl = document.getElementById('triv-qnum');
        if(qnumEl) qnumEl.textContent = `${this.questionsAnswered + 1}/${TARGET_QUESTIONS}`;

        const puHtml = Object.entries(this.powerups).map(([key, p]) => {
            const used = p.used ? 'used' : '';
            const disabled = this.isProcessing ? 'disabled' : '';
            return `<div class="triv-pu ${used}" ${disabled} data-pu="${key}">
                <div class="triv-pu-icon">${icon(p.ic)}</div>
                <div class="triv-pu-name">${p.name}</div>
                <div class="triv-pu-cost">-${p.cost} CR</div>
            </div>`;
        }).join('');

        this._content.innerHTML = `
            <div style="display:flex;justify-content:center;width:100%;">
                <div class="triv-category">${this.currentQ.c}</div>
            </div>

            <div class="triv-q-wrap">
                <div class="triv-q">${this.currentQ.q}</div>
            </div>

            <div class="triv-timer-wrap"><div class="triv-timer-fill" id="triv-timer"></div></div>

            <div class="triv-powerups">${puHtml}</div>

            <div class="triv-answers">
                ${options.map((opt, i) => `
                    <button class="triv-btn" data-idx="${i}" data-correct="${opt === this.currentQ.a ? '1' : '0'}">${opt}</button>
                `).join('')}
            </div>
        `;

        this._content.querySelectorAll('.triv-btn').forEach(btn => {
            btn.onclick = (e) => {
                try { FX.rippleClick(btn, e); } catch(err) {}
                this.check(btn.innerText, btn);
            };
        });
        this._content.querySelectorAll('[data-pu]').forEach(pu => {
            pu.onclick = (e) => {
                if (this.isProcessing || this.powerups[pu.dataset.pu]?.used) return;
                try { FX.rippleClick(pu, e); } catch(err) {}
                this.usePowerup(pu.dataset.pu);
            };
        });

        try { FX.shineSweep(this._content.querySelector('.triv-q-wrap'), { duration: 0.9, color:'rgba(6,182,212,0.45)' }); } catch(e) {}
    }

    usePowerup(key) {
        const p = this.powerups[key];
        if (!p || p.used) return;
        if (window.app.credits < p.cost) {
            try { window.app.showToast('SIN CRÉDITOS', `Necesitas ${p.cost} CR`, 'danger'); } catch(e) {}
            return;
        }
        window.app.credits -= p.cost;
        const vc = document.getElementById('val-credits'); if (vc) vc.innerText = window.app.credits;
        try { this.audio.playClick(); } catch(e) {}
        p.used = true;

        if (key === 'fifty') this.applyFiftyFifty();
        else if (key === 'hint') this.applyHint();
        else if (key === 'skip') this.applySkip();

        // Refresh power-up UI
        const puEl = this.uiContainer.querySelector(`[data-pu="${key}"]`);
        if (puEl) puEl.classList.add('used');
    }

    applyFiftyFifty() {
        // Elimina 2 respuestas incorrectas al azar
        const wrongBtns = Array.from(this.uiContainer.querySelectorAll('.triv-btn'))
            .filter(b => b.dataset.correct === '0');
        // Mezclar y eliminar 2
        wrongBtns.sort(() => Math.random() - 0.5);
        wrongBtns.slice(0, 2).forEach(b => b.classList.add('eliminated'));
        try { window.app.showToast('50/50', '2 respuestas eliminadas', 'info'); } catch(e) {}
    }

    applyHint() {
        // Resalta la respuesta correcta con un borde sutil dorado
        const correctBtn = this.uiContainer.querySelector('.triv-btn[data-correct="1"]');
        if (correctBtn) correctBtn.classList.add('hinted');
        // Banner
        const qWrap = this.uiContainer.querySelector('.triv-q-wrap');
        if (qWrap) {
            const banner = document.createElement('div');
            banner.className = 'triv-hint-banner';
            banner.style.marginTop = '10px';
            banner.innerHTML = `${icon('eye')} PISTA: la respuesta empieza con "${this.currentQ.a.charAt(0).toUpperCase()}"`;
            qWrap.appendChild(banner);
        }
        try { window.app.showToast('PISTA', 'Respuesta resaltada', 'info'); } catch(e) {}
    }

    applySkip() {
        // Pregunta nueva sin perder vida ni consumir tiempo
        try { window.app.showToast('SALTAR', 'Nueva pregunta', 'info'); } catch(e) {}
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.nextQuestion();
    }

    check(answer, btn) {
        if (this.isProcessing) return;
        this.isProcessing = true;
        if (this.timerInterval) clearInterval(this.timerInterval);

        const isCorrect = answer === this.currentQ.a;
        const allBtns = this.uiContainer.querySelectorAll('.triv-btn');

        allBtns.forEach(b => {
            b.disabled = true;
            if (b.dataset.correct === '1') { b.classList.add('correct'); b.style.opacity = '1'; }
            else if (b === btn && !isCorrect) { b.classList.add('wrong'); }
            else { b.style.opacity = '0.3'; }
        });

        if (isCorrect) {
            // Speed bonus basado en cuánto tiempo quedaba
            const elapsed = (performance.now() - this.questionStartTime) / 1000;
            let speedMulti = 1;
            if (elapsed < 3) speedMulti = 2;
            else if (elapsed < 6) speedMulti = 1.5;
            else if (elapsed < 10) speedMulti = 1.2;

            const comboMulti = (window.app.combo?.multiplier?.() || 1);
            const baseReward = 30;
            const totalMulti = speedMulti * comboMulti * this.modeMultiplier;
            const gained = Math.floor(baseReward * totalMulti);

            try { this.audio.playWin(1); } catch(e) {}
            try { window.app.combo?.hit(); } catch(e) {}
            try { FX.hitFeedback(btn); } catch(e) {}
            winFlash(this._frame, { color: speedMulti >= 2 ? '#fbbf24' : '#22c55e', duration: 350 });
            if(speedMulti >= 2) {
                burstConfetti(this._frame, { count: 45, colors: ['#fbbf24', '#06b6d4', '#22c55e', '#ffffff'] });
            }
            try {
                const rect = btn.getBoundingClientRect();
                if (this.canvas?.explode) this.canvas.explode(rect.left + rect.width/2, rect.top + rect.height/2, CONFIG.COLORS.CYAN || '#06b6d4');
            } catch(e) {}

            this.score++;
            this.questionsAnswered++;
            this.creditsEarned += gained;
            window.app.credits += gained;
            const vc = document.getElementById('val-credits'); if (vc) vc.innerText = window.app.credits;
            window.app.save();

            const multiLabel = totalMulti > 1 ? ` (×${totalMulti.toFixed(1)})` : '';
            const speedLabel = speedMulti >= 2 ? ' ¡RELÁMPAGO!' : (speedMulti >= 1.5 ? ' ¡RÁPIDO!' : '');
            try { window.app.showToast('CORRECTO' + speedLabel, `+$${gained}${multiLabel}`, 'success'); } catch(e) {}

            this.showFeedback(true);

            // Chequear si completó el objetivo
            if (this.questionsAnswered >= TARGET_QUESTIONS) {
                setTimeout(() => this.finishRun(true), 1500);
            } else {
                setTimeout(() => this.nextQuestion(), 1400);
            }
        } else {
            try { this.audio.playLose(); } catch(e) {}
            try { window.app.combo?.miss(); } catch(e) {}
            try { FX.missFeedback(btn); } catch(e) {}
            try { FX.screenFlash('#ef4444', 0.12); } catch(e) {}
            screenShake(this._frame, { strength: 8, count: 5 });
            winFlash(this._frame, { color: '#ef4444', duration: 300 });

            this.showFeedback(false);
            this.loseLife();
        }
    }

    loseLife() {
        this.lives--;
        if (this.lives <= 0) {
            // Game over
            setTimeout(() => this.finishRun(false), 1500);
        } else {
            try { window.app.showToast(`${this.lives} VIDAS RESTANTES`, 'Continúa', 'danger'); } catch(e) {}
            this.questionsAnswered++; // avanza igual
            if (this.questionsAnswered >= TARGET_QUESTIONS) {
                setTimeout(() => this.finishRun(true), 1500);
            } else {
                setTimeout(() => this.nextQuestion(), 1500);
            }
        }
    }

    showFeedback(win) {
        const el = document.createElement('div');
        el.className = `triv-feedback ${win ? 'win' : 'loss'} active`;
        el.textContent = win ? 'CORRECTO' : 'FALLO';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 950);
    }

    finishRun(completed) {
        if (this.timerInterval) clearInterval(this.timerInterval);
        // Bonus por completar
        if (completed && this.lives > 0) {
            const perfectBonus = this.lives === LIVES_START ? 300 : 150;
            this.creditsEarned += perfectBonus;
            window.app.credits += perfectBonus;
            try { window.app.showToast('RUN COMPLETADA', `+${perfectBonus} CR BONUS`, 'success'); } catch(e) {}
            window.app.save();
        }
        if (this.onQuit) this.onQuit(this.score);
    }

    pause() {
        this._wasPaused = true;
        if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    }
    resume() {
        if (!this._wasPaused) return;
        this._wasPaused = false;
    }

    cleanup() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        try { window.app.combo?.end(); } catch(e) {}
        try { Backdrop.unmount(); } catch(e) {}
    }
}



