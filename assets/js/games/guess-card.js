import { CONFIG } from '../config.js';
import * as FX from '../systems/game-fx.js';
import * as Backdrop from '../systems/game-backdrop.js';
import { icon } from '../systems/icons.js';

const SUIT_DATA = {
    H: { char:'♥', key:'heart',   color:'#ef4444', name:'Corazones', red:true,  glow:'rgba(239,68,68,0.55)' },
    D: { char:'♦', key:'diamond', color:'#f97316', name:'Diamantes', red:true,  glow:'rgba(249,115,22,0.55)' },
    C: { char:'♣', key:'club',    color:'#3b82f6', name:'Tréboles',  red:false, glow:'rgba(59,130,246,0.55)' },
    S: { char:'♠', key:'spade',   color:'#8b5cf6', name:'Picas',     red:false, glow:'rgba(139,92,246,0.55)' }
};
const RANK_LABELS = { J:'JOTA', Q:'REINA', K:'REY', A:'AS' };
const CHIPS = [10, 25, 50, 100];

export class GuessCardGame {
    constructor(canvas, audio, onQuit) {
        this.canvas = canvas;
        this.audio  = audio;
        this.onQuit = onQuit;
        this.deck = [];
        this.burnedCards = [];
        this.currentCard = null;
        this.score = 0;
        this.round = 0;
        this.winStreak = 0;
        this.totalWins = 0;
        this.totalLosses = 0;
        this.roundHistory = [];
        this.currentChip = 25;
        this.isRevealing = false;
        this.blitzTimer = null;
        this.blitzTimeLeft = 0;
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.injectStyles();
    }

    createDeck() {
        const suits = ['H','D','C','S'];
        const defs = [{r:'2',v:2},{r:'3',v:3},{r:'4',v:4},{r:'5',v:5},{r:'6',v:6},{r:'7',v:7},{r:'8',v:8},{r:'9',v:9},{r:'10',v:10},{r:'J',v:11},{r:'Q',v:12},{r:'K',v:13},{r:'A',v:14}];
        const deck = [];
        for (const s of suits) for (const d of defs) deck.push({ suit:s, rank:d.r, value:d.v });
        return this.shuffle(deck);
    }
    shuffle(a) { let c=a.length,r; while(c){r=Math.floor(Math.random()*c--);[a[c],a[r]]=[a[r],a[c]];} return a; }
    drawCard() {
        if (!this.deck || this.deck.length === 0) { this.deck = this.createDeck(); this.burnedCards = []; }
        return this.deck.pop();
    }

    cleanup() {
        this._paused = true;
        if (this.blitzTimer) { clearInterval(this.blitzTimer); this.blitzTimer = null; }
        try { Backdrop.unmount(); } catch(e) {}
    }
    pause() { this._paused = true; if (this.blitzTimer) { clearInterval(this.blitzTimer); this.blitzTimer = null; } }
    resume() { this._paused = false; if (this.mode==='BLITZ' && !this.isRevealing && this.blitzTimeLeft>0) this.startBlitzTimer(); }

    init() { this.showModeSelect(); }

    // === STYLES ===
    injectStyles() {
        ['oracle-styles','oracle-styles-v2'].forEach(id => { const old = document.getElementById(id); if (old) old.remove(); });
        if (document.getElementById('oracle-styles-v3')) return;
        const s = document.createElement('style');
        s.id = 'oracle-styles-v3';
        s.innerHTML = this.stylesCSS();
        document.head.appendChild(s);
    }

    stylesCSS() {
        return `
        .oracle-root { display:flex; flex-direction:column; align-items:center; justify-content:flex-start; height:calc(100vh - 56px); padding:10px 14px 14px; width:100%; gap:8px; box-sizing:border-box; position:relative; z-index:1; overflow-y:auto; }
        .oracle-hud { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; width:100%; max-width:560px; flex-shrink:0; }
        .oracle-hud-cell { position:relative; background:rgba(5,10,20,0.92); border:1px solid rgba(168,85,247,0.18); border-radius:10px; padding:6px 10px; overflow:hidden; }
        .oracle-hud-cell::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg, transparent, rgba(168,85,247,0.5), transparent); }
        .oracle-hud-cell-lbl { font-size:0.5rem; color:rgba(168,85,247,0.7); letter-spacing:2.5px; font-family:monospace; text-transform:uppercase; }
        .oracle-hud-cell-val { font-family:var(--font-display); font-size:1.02rem; color:white; display:flex; align-items:center; gap:4px; line-height:1.1; margin-top:2px; }
        .oracle-hud-cell-val .icon-svg { font-size:0.78em; }

        .oracle-history-row { display:flex; gap:3px; justify-content:center; flex-wrap:wrap; min-height:12px; max-width:560px; width:100%; flex-shrink:0; }
        .oracle-dot { width:7px; height:7px; border-radius:50%; border:1px solid; flex-shrink:0; }
        .oracle-dot.win  { background:#22c55e55; border-color:#22c55e; box-shadow:0 0 4px #22c55e80; }
        .oracle-dot.loss { background:#ef444455; border-color:#ef4444; }

        .oracle-burned { display:flex; gap:4px; align-items:center; padding:4px 10px; background:rgba(0,0,0,0.45); border-radius:20px; max-width:560px; width:100%; overflow:hidden; border:1px solid rgba(255,255,255,0.04); flex-shrink:0; }
        .oracle-burned-lbl { font-size:0.5rem; color:#475569; letter-spacing:1.5px; font-family:monospace; white-space:nowrap; }
        .oracle-burned-cards { display:flex; gap:3px; flex:1; overflow:hidden; justify-content:flex-end; }
        .oracle-burned-card { font-size:0.6rem; padding:1px 5px; border-radius:4px; background:rgba(0,0,0,0.4); font-family:monospace; border:1px solid; white-space:nowrap; }

        .oracle-blitz { width:100%; max-width:560px; height:4px; background:rgba(0,0,0,0.5); border-radius:2px; overflow:hidden; position:relative; flex-shrink:0; }
        .oracle-blitz-bar { height:100%; background:linear-gradient(90deg,#f97316,#ef4444); box-shadow:0 0 8px #ef4444; transition:width 0.1s linear; width:100%; }

        .oracle-card-wrap { position:relative; flex:1; min-height:230px; display:flex; align-items:center; justify-content:center; width:100%; perspective:1000px; }
        .oracle-card-stack { display:flex; flex-direction:column; align-items:center; gap:4px; }
        .oracle-card { width:180px; height:252px; border-radius:16px; border:2.5px solid; display:flex; flex-direction:column; justify-content:space-between; padding:12px; position:relative; overflow:hidden; transition:transform 0.4s cubic-bezier(0.2,0,0,1); transform-style:preserve-3d; }
        .oracle-card.hidden { background:radial-gradient(ellipse at center, #3a1c6b 0%, #1a0d30 60%, #0a0418 100%); border-color:#c084fc; box-shadow:0 0 50px rgba(168,85,247,0.55), 0 0 90px rgba(168,85,247,0.25), inset 0 0 30px rgba(0,0,0,0.5), inset 0 0 15px rgba(192,132,252,0.3); }
        .oracle-card.hidden::before { content:''; position:absolute; inset:8px; border:1.5px solid rgba(192,132,252,0.45); border-radius:10px; background: repeating-linear-gradient(45deg, rgba(192,132,252,0.14), rgba(192,132,252,0.14) 2px, transparent 2px, transparent 8px), repeating-linear-gradient(-45deg, rgba(168,85,247,0.1), rgba(168,85,247,0.1) 1px, transparent 1px, transparent 5px); box-shadow:inset 0 0 12px rgba(192,132,252,0.2); }
        .oracle-card.hidden::after { content:''; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:96px; height:96px; border:2px solid rgba(192,132,252,0.75); border-radius:50%; box-shadow:0 0 28px rgba(192,132,252,0.55), inset 0 0 20px rgba(192,132,252,0.35); background:radial-gradient(circle, rgba(192,132,252,0.12) 0%, transparent 70%); }
        .oracle-card-back-sigil { position:relative; z-index:2; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; font-family:var(--font-display); letter-spacing:4px; color:#e9d5ff; text-shadow:0 0 14px #a855f7, 0 0 24px rgba(168,85,247,0.6); animation:oracleFloat 3s ease-in-out infinite; }
        .oracle-card-back-sigil-word { font-size:0.85rem; font-weight:bold; }
        .oracle-card-back-sigil-sub { font-size:0.55rem; opacity:0.75; letter-spacing:3px; color:#c084fc; }
        .oracle-card-back-sigil-rune { font-size:1.4rem; line-height:1; color:#c084fc; filter:drop-shadow(0 0 10px #a855f7); }

        .oracle-card.revealed { background:linear-gradient(145deg,#0e1628,#1c2848); }
        .oracle-card.revealed::before { content:''; position:absolute; inset:6px; border-radius:10px; background: repeating-linear-gradient(0deg, rgba(255,255,255,0.025), rgba(255,255,255,0.025) 1px, transparent 1px, transparent 3px); pointer-events:none; }
        .oracle-card.revealed::after { content:''; position:absolute; inset:4px; border-radius:12px; pointer-events:none; background: linear-gradient(135deg, currentColor 0, currentColor 7px, transparent 7px) top left/12px 12px no-repeat, linear-gradient(-135deg, currentColor 0, currentColor 7px, transparent 7px) top right/12px 12px no-repeat, linear-gradient(-45deg, currentColor 0, currentColor 7px, transparent 7px) bottom right/12px 12px no-repeat, linear-gradient(45deg, currentColor 0, currentColor 7px, transparent 7px) bottom left/12px 12px no-repeat; opacity:0.85; }
        .oracle-card-corner { display:flex; flex-direction:column; align-items:center; gap:0; line-height:1; position:relative; z-index:2; }
        .oracle-card-rank { font-family:var(--font-display); font-size:1.45rem; font-weight:bold; }
        .oracle-card-suit-sm { font-size:1rem; }
        .oracle-card-center { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:4.6rem; pointer-events:none; filter:drop-shadow(0 0 22px currentColor); z-index:1; }
        .oracle-card-corner-br { align-self:flex-end; transform:rotate(180deg); }

        .oracle-platform { width:180px; height:22px; background:radial-gradient(ellipse at center,rgba(168,85,247,0.55) 0%,transparent 70%); border-radius:50%; transition:background 0.4s; position:relative; color:#a855f7; }
        .oracle-platform::after { content:''; position:absolute; top:50%; left:0; right:0; height:1px; background:linear-gradient(90deg, transparent, currentColor, transparent); opacity:0.3; }

        .oracle-bet-panel { width:100%; max-width:560px; background:rgba(8,14,26,0.95); border:1px solid rgba(168,85,247,0.22); border-radius:14px; padding:12px; display:flex; flex-direction:column; gap:10px; backdrop-filter:blur(8px); position:relative; overflow:hidden; flex-shrink:0; }
        .oracle-bet-panel::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg, transparent, rgba(168,85,247,0.6), transparent); }
        .oracle-bet-title { font-size:0.56rem; color:rgba(168,85,247,0.85); letter-spacing:3px; font-family:monospace; text-transform:uppercase; text-align:center; }

        .oracle-chips-row { display:flex; gap:6px; justify-content:center; }
        .oracle-chip { padding:6px 14px; border-radius:20px; border:1.5px solid; font-family:var(--font-display); font-size:0.7rem; letter-spacing:1.5px; cursor:pointer; transition:all 0.15s; background:rgba(0,0,0,0.4); position:relative; overflow:hidden; user-select:none; }
        .oracle-chip:hover { transform:translateY(-2px); }
        .oracle-chip.active { background:currentColor; box-shadow:0 0 12px; color:#0a0f1e !important; }
        .oracle-chip[data-v="10"]  { border-color:#64748b; color:#94a3b8; }
        .oracle-chip[data-v="25"]  { border-color:#3b82f6; color:#60a5fa; }
        .oracle-chip[data-v="50"]  { border-color:#a855f7; color:#c084fc; }
        .oracle-chip[data-v="100"] { border-color:#fbbf24; color:#fbbf24; }

        .oracle-bet-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
        .oracle-bet-row { display:flex; gap:6px; }
        .oracle-bet-btn { flex:1; padding:7px 6px; border:1.5px solid; background:rgba(0,0,0,0.4); border-radius:10px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; cursor:pointer; transition:all 0.15s; position:relative; overflow:hidden; min-height:54px; }
        .oracle-bet-btn:hover:not([disabled]) { transform:translateY(-2px); }
        .oracle-bet-btn[disabled] { opacity:0.35; cursor:not-allowed; filter:grayscale(0.7); pointer-events:none; }
        .oracle-bet-btn-name { font-family:var(--font-display); font-size:0.65rem; letter-spacing:1.2px; line-height:1.1; }
        .oracle-bet-btn-sub { font-size:0.52rem; font-family:monospace; opacity:0.8; }

        .oracle-suit-row { display:grid; grid-template-columns:repeat(4,1fr); gap:5px; }
        .oracle-suit-btn { padding:7px 4px; border:1.5px solid; border-radius:10px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; cursor:pointer; transition:all 0.15s; background:rgba(0,0,0,0.4); min-height:54px; position:relative; overflow:hidden; }
        .oracle-suit-btn:hover { transform:scale(1.06); }
        .oracle-suit-btn-icon { font-size:1.25rem; }
        .oracle-suit-btn-pct, .oracle-suit-btn-multi { font-size:0.52rem; font-family:monospace; }

        .oracle-reveal-panel { width:100%; max-width:560px; background:rgba(8,14,26,0.95); border:1px solid rgba(168,85,247,0.22); border-radius:14px; padding:14px; display:flex; flex-direction:column; gap:10px; text-align:center; backdrop-filter:blur(8px); position:relative; overflow:hidden; flex-shrink:0; }
        .oracle-reveal-panel::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg, transparent, rgba(168,85,247,0.6), transparent); }
        .oracle-result-badge { display:inline-flex; align-items:center; gap:8px; padding:8px 20px; border-radius:10px; font-family:var(--font-display); font-size:0.85rem; letter-spacing:2px; border:1.5px solid; margin:0 auto; }
        .oracle-result-badge.win  { color:#22c55e; border-color:#22c55e60; background:rgba(34,197,94,0.1); box-shadow:0 0 20px rgba(34,197,94,0.28); }
        .oracle-result-badge.loss { color:#ef4444; border-color:#ef444460; background:rgba(239,68,68,0.1); }
        .oracle-card-identity { font-size:0.72rem; color:#94a3b8; font-family:monospace; letter-spacing:1px; display:flex; align-items:center; justify-content:center; gap:6px; }
        .oracle-next-btn { width:100%; padding:12px; border:1.5px solid #a855f7; background:rgba(168,85,247,0.1); color:#a855f7; border-radius:10px; font-family:var(--font-display); font-size:0.82rem; letter-spacing:2px; cursor:pointer; transition:all 0.15s; display:flex; align-items:center; justify-content:center; gap:8px; position:relative; overflow:hidden; }
        .oracle-next-btn:hover { background:rgba(168,85,247,0.22); box-shadow:0 0 22px rgba(168,85,247,0.4); transform:translateY(-2px); }

        @keyframes oracleFloat { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-6px)} }
        `;
    }

    // === MODE SELECT ===
    showModeSelect() {
        const modes = [
            { id:'oc-classic', mc:'#a855f7', ic:'eye',   name:'CLÁSICO', desc:'5 tipos de apuesta · mazo finito 52' },
            { id:'oc-blitz',   mc:'#ef4444', ic:'bolt',  name:'BLITZ',   desc:'Solo 2-way · 3s timer real'          },
            { id:'oc-expert',  mc:'#fbbf24', ic:'star',  name:'EXPERTO', desc:'Payouts ×1.4 · alto riesgo'          },
        ];
        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;padding:20px;">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.7rem;color:white;letter-spacing:5px;margin-bottom:4px;text-shadow:0 0 20px rgba(168,85,247,0.6);">THE ORACLE</div>
                <div style="font-size:0.62rem;color:#a855f7;letter-spacing:4px;font-family:monospace;">ADIVINACIÓN CUÁNTICA</div>
                <div style="width:120px;height:1px;background:linear-gradient(90deg,transparent,#a855f7,transparent);margin:10px auto 0;"></div>
            </div>
            <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
                ${modes.map(m => `
                <div class="fx-ripple" style="width:175px;min-height:165px;background:rgba(10,16,30,0.92);border:1px solid ${m.mc}30;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:pointer;transition:all 0.15s;padding:18px 12px;position:relative;overflow:hidden;"
                     id="${m.id}"
                     onmouseenter="this.style.transform='translateY(-4px)';this.style.borderColor='${m.mc}';this.style.boxShadow='0 10px 26px rgba(0,0,0,0.5), 0 0 20px ${m.mc}40';"
                     onmouseleave="this.style.transform='';this.style.borderColor='${m.mc}30';this.style.boxShadow='';">
                    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${m.mc};opacity:0.75;"></div>
                    <div style="font-size:2rem;color:${m.mc};filter:drop-shadow(0 0 10px ${m.mc});line-height:1;">${icon(m.ic)}</div>
                    <div style="font-family:var(--font-display);font-size:0.78rem;letter-spacing:2.5px;color:${m.mc};">${m.name}</div>
                    <div style="font-size:0.58rem;color:#64748b;font-family:monospace;text-align:center;line-height:1.5;">${m.desc}</div>
                </div>`).join('')}
            </div>
            <button class="btn btn-secondary" id="oc-back" style="width:200px;display:flex;align-items:center;justify-content:center;gap:8px;">
                <span style="display:inline-flex;align-items:center;">${icon('arrowLeft')}</span> VOLVER AL LOBBY
            </button>
        </div>`;
        document.getElementById('oc-classic').onclick = () => this.startWithMode('CLASSIC');
        document.getElementById('oc-blitz').onclick   = () => this.startWithMode('BLITZ');
        document.getElementById('oc-expert').onclick  = () => this.startWithMode('EXPERT');
        document.getElementById('oc-back').onclick    = () => { if (this.onQuit) this.onQuit(0); };
    }

    startWithMode(mode) {
        this.mode = mode;
        try { this.canvas.setMood('MYSTERY'); } catch(e) {}
        this.score = 0; this.round = 0; this.winStreak = 0;
        this.totalWins = 0; this.totalLosses = 0;
        this.roundHistory = [];
        this.deck = this.createDeck();
        this.burnedCards = [];
        this.currentChip = 25;
        const gs = document.getElementById('ui-score'); if (gs) gs.innerText = '0';
        try { Backdrop.mount({ color:'#a855f7', particles:'cards', intensity: mode==='BLITZ'?1.2:1 }); } catch(e) {}
        this.nextRound();
    }

    nextRound() {
        this.round++;
        this.isRevealing = false;
        this.currentCard = this.drawCard();
        this.renderBetting();
        if (this.mode === 'BLITZ') this.startBlitzTimer();
    }

    startBlitzTimer(resume) {
        if (this.blitzTimer) clearInterval(this.blitzTimer);
        if (!resume) this.blitzTimeLeft = 3.0;
        const bar = document.getElementById('oracle-blitz-bar');
        this.blitzTimer = setInterval(() => {
            if (this._paused) return;
            this.blitzTimeLeft -= 0.1;
            if (bar) bar.style.width = Math.max(0, (this.blitzTimeLeft/3)*100) + '%';
            if (this.blitzTimeLeft <= 0) {
                clearInterval(this.blitzTimer);
                this.blitzTimer = null;
                if (!this.isRevealing) this.blitzTimeout();
            }
        }, 100);
    }

    blitzTimeout() {
        this.isRevealing = true;
        try { this.audio.playLose(); window.app.showToast('TIEMPO AGOTADO','Sin apuesta, sin revelar','danger'); } catch(e) {}
        this.totalLosses++;
        this.winStreak = 0;
        this.roundHistory.push('loss');
        const cardEl = document.getElementById('oracle-card-el');
        if (cardEl) cardEl.innerHTML = this.getRevealedCardHTML(this.currentCard);
        this.burnedCards.push(this.currentCard);
        this.renderRevealResult(false, 0, null, null, true);
    }

    // === PROBABILITIES (cartas restantes en mazo real) ===
    computeProbs() {
        const deck = this.deck;
        const total = deck.length || 1;
        const redCount   = deck.filter(c => SUIT_DATA[c.suit].red).length;
        const blackCount = (deck.length) - redCount;
        const highCount  = deck.filter(c => c.value >= 8).length;
        const lowCount   = deck.filter(c => c.value <= 6).length;
        const evenCount  = deck.filter(c => c.value % 2 === 0).length;
        const oddCount   = (deck.length) - evenCount;
        const faceCount  = deck.filter(c => c.value >= 11).length;
        const numberCount= deck.filter(c => c.value <= 10).length;
        const suitCounts = { H:0, D:0, C:0, S:0 };
        for (const c of deck) suitCounts[c.suit]++;
        const p = (n) => Math.round((n / total) * 100);
        return {
            total: deck.length,
            color: { red: p(redCount), black: p(blackCount) },
            hl:    { HIGH: p(highCount), LOW: p(lowCount) },
            oe:    { EVEN: p(evenCount), ODD: p(oddCount) },
            face:  { FACE: p(faceCount), NUMBER: p(numberCount) },
            suits: { H: p(suitCounts.H), D: p(suitCounts.D), C: p(suitCounts.C), S: p(suitCounts.S) },
            suitCounts
        };
    }

    // Payouts (EXPERT aumenta 1.4x)
    payouts() {
        const base = {
            COLOR: 1.9, HIGH_LOW: 1.9, ODD_EVEN: 1.9,
            FACE_NUM: { FACE: 2.8, NUMBER: 1.35 },
            SUIT: 3.8
        };
        if (this.mode === 'EXPERT') {
            return {
                COLOR: 2.6, HIGH_LOW: 2.6, ODD_EVEN: 2.6,
                FACE_NUM: { FACE: 3.9, NUMBER: 1.85 },
                SUIT: 5.3
            };
        }
        return base;
    }

    getHiddenCardHTML() {
        return `<div class="oracle-card hidden">
            <div class="oracle-card-back-sigil">
                <div class="oracle-card-back-sigil-rune">✧</div>
                <div class="oracle-card-back-sigil-word">ORACLE</div>
                <div class="oracle-card-back-sigil-sub">◆ DLX ◆</div>
            </div>
        </div>`;
    }
    getRevealedCardHTML(card) {
        const si = SUIT_DATA[card.suit] || SUIT_DATA.S;
        return `<div class="oracle-card revealed" style="border-color:${si.color};box-shadow:0 0 30px ${si.glow},inset 0 0 20px rgba(0,0,0,0.5);color:${si.color};">
            <div class="oracle-card-corner">
                <span class="oracle-card-rank">${card.rank}</span>
                <span class="oracle-card-suit-sm">${si.char}</span>
            </div>
            <div class="oracle-card-center">${si.char}</div>
            <div class="oracle-card-corner oracle-card-corner-br">
                <span class="oracle-card-rank">${card.rank}</span>
                <span class="oracle-card-suit-sm">${si.char}</span>
            </div>
        </div>`;
    }

    buildHistoryRow() {
        return this.roundHistory.slice(-40).map(r => `<div class="oracle-dot ${r}" title="${r}"></div>`).join('');
    }
    buildBurnedRow() {
        if (!this.burnedCards.length) return '<div style="font-size:0.55rem;color:#334155;font-family:monospace;">mazo lleno · 52 cartas</div>';
        const last = this.burnedCards.slice(-18);
        return last.map(c => {
            const si = SUIT_DATA[c.suit];
            return `<span class="oracle-burned-card" style="color:${si.color};border-color:${si.color}50;">${c.rank}${si.char}</span>`;
        }).join('');
    }

    // === RENDER BETTING SCREEN ===
    renderBetting() {
        const p = this.computeProbs();
        const po = this.payouts();
        const remaining = this.deck.length;
        const allowHL = this.mode !== 'BLITZ';
        const allowOE = this.mode !== 'BLITZ';
        const allowFN = this.mode !== 'BLITZ';
        const allowSuit = this.mode !== 'BLITZ';

        this.uiContainer.innerHTML = `
        <div class="oracle-root">
            <div class="oracle-hud">
                <div class="oracle-hud-cell"><div class="oracle-hud-cell-lbl">RONDA</div><div class="oracle-hud-cell-val">${this.round}</div></div>
                <div class="oracle-hud-cell"><div class="oracle-hud-cell-lbl">ACIERTOS</div><div class="oracle-hud-cell-val" style="color:#22c55e;">${this.totalWins}</div></div>
                <div class="oracle-hud-cell"><div class="oracle-hud-cell-lbl">RACHA</div><div class="oracle-hud-cell-val" style="color:${this.winStreak>=3?'#f97316':'#a855f7'};">${this.winStreak}${this.winStreak>=3?icon('fire'):''}</div></div>
                <div class="oracle-hud-cell"><div class="oracle-hud-cell-lbl">MAZO</div><div class="oracle-hud-cell-val" style="color:#64748b;">${remaining}<span style="font-size:0.55rem;opacity:0.6;margin-left:2px;">/52</span></div></div>
            </div>
            <div class="oracle-history-row">${this.buildHistoryRow()}</div>
            <div class="oracle-burned">
                <span class="oracle-burned-lbl">QUEMADAS:</span>
                <div class="oracle-burned-cards">${this.buildBurnedRow()}</div>
            </div>
            ${this.mode==='BLITZ' ? `<div class="oracle-blitz"><div class="oracle-blitz-bar" id="oracle-blitz-bar"></div></div>` : ''}
            <div class="oracle-card-wrap">
                <div class="oracle-card-stack">
                    <div id="oracle-card-el">${this.getHiddenCardHTML()}</div>
                    <div class="oracle-platform"></div>
                </div>
            </div>
            <div class="oracle-bet-panel">
                <div class="oracle-bet-title">CHIP · TIPO DE APUESTA</div>
                <div class="oracle-chips-row">
                    ${CHIPS.map(v => `<div class="oracle-chip ${v===this.currentChip?'active':''}" data-v="${v}" data-chip="${v}">${v} CR</div>`).join('')}
                </div>
                <div class="oracle-bet-grid">
                    <div class="oracle-bet-row">
                        <div class="oracle-bet-btn" data-bet="COLOR:RED" style="border-color:#ef444470;color:#ef4444;">
                            <div style="display:flex;gap:3px;font-size:0.9rem;">${icon('heart')}${icon('diamond')}</div>
                            <div class="oracle-bet-btn-name">ROJO</div>
                            <div class="oracle-bet-btn-sub">${p.color.red}% · ×${po.COLOR}</div>
                        </div>
                        <div class="oracle-bet-btn" data-bet="COLOR:BLACK" style="border-color:#8b5cf670;color:#8b5cf6;">
                            <div style="display:flex;gap:3px;font-size:0.9rem;">${icon('club')}${icon('spade')}</div>
                            <div class="oracle-bet-btn-name">NEGRO</div>
                            <div class="oracle-bet-btn-sub">${p.color.black}% · ×${po.COLOR}</div>
                        </div>
                    </div>
                    <div class="oracle-bet-row">
                        <div class="oracle-bet-btn" ${allowHL?'':'disabled'} data-bet="HL:HIGH" style="border-color:#22c55e70;color:#22c55e;">
                            <div style="font-size:0.9rem;">${icon('arrowUp')}</div>
                            <div class="oracle-bet-btn-name">ALTA</div>
                            <div class="oracle-bet-btn-sub">8-A · ${p.hl.HIGH}% · ×${po.HIGH_LOW}</div>
                        </div>
                        <div class="oracle-bet-btn" ${allowHL?'':'disabled'} data-bet="HL:LOW" style="border-color:#06b6d470;color:#06b6d4;">
                            <div style="font-size:0.9rem;transform:rotate(180deg);">${icon('arrowUp')}</div>
                            <div class="oracle-bet-btn-name">BAJA</div>
                            <div class="oracle-bet-btn-sub">2-6 · ${p.hl.LOW}% · ×${po.HIGH_LOW}</div>
                        </div>
                    </div>
                    <div class="oracle-bet-row">
                        <div class="oracle-bet-btn" ${allowOE?'':'disabled'} data-bet="OE:EVEN" style="border-color:#3b82f670;color:#3b82f6;">
                            <div style="font-family:var(--font-display);font-size:0.95rem;">PAR</div>
                            <div class="oracle-bet-btn-sub">${p.oe.EVEN}% · ×${po.ODD_EVEN}</div>
                        </div>
                        <div class="oracle-bet-btn" ${allowOE?'':'disabled'} data-bet="OE:ODD" style="border-color:#ec489970;color:#ec4899;">
                            <div style="font-family:var(--font-display);font-size:0.95rem;">IMPAR</div>
                            <div class="oracle-bet-btn-sub">${p.oe.ODD}% · ×${po.ODD_EVEN}</div>
                        </div>
                    </div>
                    <div class="oracle-bet-row">
                        <div class="oracle-bet-btn" ${allowFN?'':'disabled'} data-bet="FN:FACE" style="border-color:#fbbf2470;color:#fbbf24;">
                            <div style="font-size:0.9rem;">${icon('crown')}</div>
                            <div class="oracle-bet-btn-name">FIGURA</div>
                            <div class="oracle-bet-btn-sub">J,Q,K,A · ${p.face.FACE}% · ×${po.FACE_NUM.FACE}</div>
                        </div>
                        <div class="oracle-bet-btn" ${allowFN?'':'disabled'} data-bet="FN:NUMBER" style="border-color:#94a3b870;color:#94a3b8;">
                            <div style="font-family:var(--font-display);font-size:0.95rem;">N°</div>
                            <div class="oracle-bet-btn-name">NÚMERO</div>
                            <div class="oracle-bet-btn-sub">2-10 · ${p.face.NUMBER}% · ×${po.FACE_NUM.NUMBER}</div>
                        </div>
                    </div>
                </div>
                ${allowSuit ? `
                <div style="font-size:0.5rem;color:#475569;letter-spacing:2px;font-family:monospace;text-align:center;margin-top:2px;">PALO EXACTO · MOONSHOT ×${po.SUIT}</div>
                <div class="oracle-suit-row">
                    ${['H','D','C','S'].map(suit => {
                        const si = SUIT_DATA[suit];
                        return `<div class="oracle-suit-btn" data-bet="SUIT:${suit}" style="border-color:${si.color}50;color:${si.color};">
                            <div class="oracle-suit-btn-icon">${icon(si.key)}</div>
                            <div class="oracle-suit-btn-pct">${p.suits[suit]}%</div>
                            <div class="oracle-suit-btn-multi">×${po.SUIT}</div>
                        </div>`;
                    }).join('')}
                </div>` : ''}
                <div style="display:flex;align-items:center;justify-content:center;gap:10px;font-size:0.54rem;color:#475569;font-family:monospace;letter-spacing:1px;">
                    <span style="display:inline-flex;align-items:center;gap:4px;color:var(--gold);">${icon('coins')} APUESTA: ${this.currentChip} CR</span>
                    <span style="color:#334155;">|</span>
                    <span style="color:#22c55e;">3→×2 · 5→×3 · 10→×5</span>
                </div>
            </div>
        </div>`;

        this.uiContainer.querySelectorAll('[data-chip]').forEach(el => {
            el.onclick = () => this.setChip(parseInt(el.dataset.chip, 10));
        });
        this.uiContainer.querySelectorAll('[data-bet]').forEach(el => {
            if (el.hasAttribute('disabled')) return;
            el.onclick = (e) => {
                try { FX.rippleClick(el, e); } catch(err) {}
                const [kind, value] = el.dataset.bet.split(':');
                this.placeBet(kind, value);
            };
        });
    }

    setChip(v) {
        if (this.currentChip === v) return;
        this.currentChip = v;
        this.uiContainer.querySelectorAll('[data-chip]').forEach(el => {
            el.classList.toggle('active', parseInt(el.dataset.chip, 10) === v);
        });
        try { this.audio.playClick(); } catch(e) {}
    }

    // === PLACE BET / RESOLVE ===
    placeBet(kind, prediction) {
        if (this.isRevealing) return;
        const cost = this.currentChip;
        if (window.app.credits < cost) {
            try { this.audio.playLose(); window.app.showToast('SIN CRÉDITOS', `Necesitas ${cost} CR`, 'danger'); } catch(e) {}
            return;
        }
        this.isRevealing = true;
        if (this.blitzTimer) { clearInterval(this.blitzTimer); this.blitzTimer = null; }
        window.app.credits -= cost;
        const vcEl = document.getElementById('val-credits'); if (vcEl) vcEl.innerText = window.app.credits;
        try { this.audio.playBuy(); } catch(e) {}

        const cardEl = document.getElementById('oracle-card-el');
        if (cardEl) {
            const oldCard = cardEl.firstElementChild;
            const wrapper = document.createElement('div');
            wrapper.innerHTML = this.getRevealedCardHTML(this.currentCard);
            const newCard = wrapper.firstElementChild;
            if (newCard) cardEl.appendChild(newCard);
            try {
                FX.flipCard(oldCard, newCard, 'right', () => {
                    if (oldCard && oldCard.parentNode) oldCard.remove();
                    this.resolveBet(kind, prediction);
                });
            } catch(e) {
                if (oldCard && oldCard.parentNode) oldCard.remove();
                setTimeout(() => this.resolveBet(kind, prediction), 200);
            }
        } else {
            this.resolveBet(kind, prediction);
        }
    }

    resolveBet(kind, prediction) {
        const card = this.currentCard;
        const si = SUIT_DATA[card.suit];
        const po = this.payouts();
        let win = false, multiplier = 0;

        if (kind === 'COLOR') {
            const actual = si.red ? 'RED' : 'BLACK';
            if (prediction === actual) { win = true; multiplier = po.COLOR; }
        } else if (kind === 'HL') {
            if (card.value === 7) { win = false; }
            else if (prediction === 'HIGH' && card.value >= 8) { win = true; multiplier = po.HIGH_LOW; }
            else if (prediction === 'LOW'  && card.value <= 6) { win = true; multiplier = po.HIGH_LOW; }
        } else if (kind === 'OE') {
            const isEven = (card.value % 2) === 0;
            if (prediction === 'EVEN' && isEven) { win = true; multiplier = po.ODD_EVEN; }
            else if (prediction === 'ODD' && !isEven) { win = true; multiplier = po.ODD_EVEN; }
        } else if (kind === 'FN') {
            const isFace = card.value >= 11;
            if (prediction === 'FACE' && isFace) { win = true; multiplier = po.FACE_NUM.FACE; }
            else if (prediction === 'NUMBER' && !isFace) { win = true; multiplier = po.FACE_NUM.NUMBER; }
        } else if (kind === 'SUIT') {
            if (prediction === card.suit) { win = true; multiplier = po.SUIT; }
        }

        let payout = 0;
        if (win) {
            payout = Math.floor(this.currentChip * multiplier);
            this.totalWins++;
            this.winStreak++;
            let streakMulti = 1;
            if (this.winStreak >= 10) streakMulti = 5;
            else if (this.winStreak >= 5) streakMulti = 3;
            else if (this.winStreak >= 3) streakMulti = 2;
            const finalPayout = payout * streakMulti;
            window.app.credits += finalPayout;
            this.score += Math.max(1, Math.floor(this.currentChip / 10));
            const gs = document.getElementById('ui-score'); if (gs) gs.innerText = this.score;
            this.roundHistory.push('win');
            try {
                const msg = streakMulti > 1 ? `¡RACHA ×${this.winStreak}!` : 'ACIERTO';
                window.app.showToast(msg, `+${finalPayout} CR${streakMulti>1?` (BONUS ×${streakMulti})`:''}`, 'success');
                this.audio.playWin(streakMulti >= 3 ? 10 : 3);
                if (this.canvas?.explode) this.canvas.explode(window.innerWidth/2, window.innerHeight/2, si.color);
            } catch(e) {}
            try { FX.hitFeedback(document.getElementById('oracle-card-el')); } catch(e) {}
        } else {
            this.totalLosses++;
            this.winStreak = 0;
            this.roundHistory.push('loss');
            try { window.app.showToast('PREDICCIÓN FALLIDA','Datos corruptos','danger'); this.audio.playLose(); } catch(e) {}
            try { FX.missFeedback(document.getElementById('oracle-card-el')); } catch(e) {}
            try { FX.screenFlash('#ef4444', 0.15); } catch(e) {}
        }

        this.burnedCards.push(card);
        const vcEl = document.getElementById('val-credits'); if (vcEl) vcEl.innerText = window.app.credits;
        window.app.save();

        this.renderRevealResult(win, payout, kind, prediction, false);

        const platform = this.uiContainer.querySelector('.oracle-platform');
        if (platform) platform.style.background = `radial-gradient(ellipse at center, ${si.glow} 0%, transparent 70%)`;
    }

    renderRevealResult(win, payout, kind, prediction, blitzTimeout) {
        const card = this.currentCard;
        const si = SUIT_DATA[card.suit];
        const rankLabel = RANK_LABELS[card.rank] || card.rank;
        const streakMulti = this.winStreak >= 10 ? 5 : (this.winStreak >= 5 ? 3 : (this.winStreak >= 3 ? 2 : 1));
        const finalPayout = win ? payout * streakMulti : 0;
        const deckOver = this.deck.length === 0;

        const oldPanel = this.uiContainer.querySelector('.oracle-bet-panel');
        if (!oldPanel) return;

        const resultText = blitzTimeout
            ? 'TIEMPO AGOTADO'
            : (win
                ? (streakMulti > 1 ? `RACHA ×${this.winStreak} · +${finalPayout} CR` : `ACIERTO · +${finalPayout} CR`)
                : 'FALLO · Racha perdida');

        oldPanel.outerHTML = `
        <div class="oracle-reveal-panel">
            <div class="oracle-result-badge ${win?'win':'loss'}">
                ${win ? icon('check') : icon('close')}
                ${resultText}
            </div>
            <div class="oracle-card-identity">
                <span style="color:${si.color};display:inline-flex;">${icon(si.key)}</span>
                ${rankLabel} de ${si.name}
            </div>
            ${deckOver ? `<div style="font-size:0.6rem;color:#fbbf24;letter-spacing:2px;font-family:monospace;">MAZO COMPLETADO · REBARAJAR</div>` : ''}
            <button class="oracle-next-btn fx-ripple" id="oracle-next">
                ${icon('rotateRight')} NUEVA LECTURA
            </button>
        </div>`;

        const nb = this.uiContainer.querySelector('#oracle-next');
        if (nb) {
            nb.onclick = (e) => {
                try { FX.rippleClick(nb, e); } catch(err) {}
                this.nextRound();
            };
        }

        const blitz = this.uiContainer.querySelector('.oracle-blitz');
        if (blitz) blitz.style.display = 'none';
    }
}
