import { CONFIG } from '../config.js';
import * as GFX from '../systems/game-fx.js';
import * as Backdrop from '../systems/game-backdrop.js';
import { icon } from '../systems/icons.js';
import {
    createGameShell, hudStat, hudLogo, hudMode,
    winFlash, screenShake, burstConfetti,
} from '../systems/pixi-stage.js';

// Mapeo de palos a SVG custom (sin Font Awesome, sin Unicode char)
const SUIT_ICONS = {
    H: { svg: 'heart',   color: '#ef4444', glow: 'rgba(239,68,68,0.45)'  },
    D: { svg: 'diamond', color: '#f97316', glow: 'rgba(249,115,22,0.45)' },
    C: { svg: 'club',    color: '#3b82f6', glow: 'rgba(59,130,246,0.45)' },
    S: { svg: 'spade',   color: '#8b5cf6', glow: 'rgba(139,92,246,0.45)' }
};

// Cartas especiales tambien SVG custom
const SPECIAL_ICONS = {
    JOKER: { svg:'bug',       color:'#22c55e', label:'GLITCH'  },
    WALL:  { svg:'lock',      color:'#fbbf24', label:'FIREWALL'},
    CACHE: { svg:'database',  color:'#eab308', label:'CACHE'   },
    VIRUS: { svg:'biohazard', color:'#ef4444', label:'VIRUS'   },
    PROXY: { svg:'question',  color:'#a855f7', label:'PROXY'   },
    EMP:   { svg:'bolt',      color:'#06b6d4', label:'EMP'     }
};

export class HigherLowerGame {
    constructor(canvas, audio, onQuit) {
        this.canvas = canvas;
        this.audio = audio;
        this.onQuit = onQuit;
        this.deck = [];
        this.currentCard = null;
        this.score = 0;
        this.streak = 0;
        this.history = [];
        this.difficulty = 'NORMAL';
        this.lastMoveTime = 0;
        this.comboCounter = 0;
        this.isFrenzy = false;
        this.virusTimer = null;
        this.animationTimer = null;
        this.blitzTimerInterval = null;
        this.blitzTimeLeft = 60;
        this.shieldActive = false;
        this.peekedCard = null;
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.injectStyles();
    }

    injectStyles() {
        // v4: SVG custom + luxury ornaments — remove legacy versions
        ['hl-styles-v2', 'hl-styles-v3', 'hl-styles-v4'].forEach(id => {
            if(id !== 'hl-styles-v4') { const e = document.getElementById(id); if(e) e.remove(); }
        });
        if (document.getElementById('hl-styles-v4')) return;
        const s = document.createElement('style');
        s.id = 'hl-styles-v4';
        s.innerHTML = `
        /* HL Game — Layout */
        .hl-root { position:relative; z-index:2; display:flex; flex-direction:column; align-items:center; justify-content:space-between; height:calc(100vh - 56px); padding:16px 20px; width:100%; gap:10px; box-sizing:border-box; }

        /* SVG helpers: flex center para que el tamaño del SVG domine */
        .hl-root svg, .hl-mode-shell svg { display:block; }

        /* Mode select shell */
        .hl-mode-shell { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:32px; width:100%; position:relative; z-index:2; }
        .hl-mode-header { text-align:center; }
        .hl-mode-title { font-family:var(--font-display); font-size:1.8rem; color:white; letter-spacing:6px; margin-bottom:6px; text-shadow: 0 0 20px rgba(255,255,255,0.2); }
        .hl-mode-subtitle { font-size:0.65rem; color:#60a5fa; letter-spacing:4px; font-family:monospace; }
        .hl-mode-divider { width:140px; height:1px; background:linear-gradient(90deg, transparent, #3b82f6, transparent); margin:14px auto 0; }
        .hl-mode-grid { display:flex; gap:18px; flex-wrap:wrap; justify-content:center; }
        .hl-mode-card {
            width:180px; min-height:180px;
            background: linear-gradient(145deg, rgba(15,23,42,0.9), rgba(5,10,20,0.85));
            border:1px solid rgba(255,255,255,0.08);
            border-radius:14px;
            display:flex; flex-direction:column; align-items:center; justify-content:center;
            gap:14px; cursor:pointer;
            transition:transform 0.2s, border-color 0.2s, box-shadow 0.2s;
            padding:24px 16px; position:relative; overflow:hidden;
            box-shadow: 0 4px 14px rgba(0,0,0,0.3);
        }
        .hl-mode-card::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:var(--mc,#3b82f6); opacity:0.7; }
        .hl-mode-card::after {
            content:''; position:absolute; inset:0;
            background: radial-gradient(circle at top, var(--mc,#3b82f6), transparent 65%);
            opacity:0; transition: opacity 0.3s; pointer-events:none;
        }
        .hl-mode-card:hover { transform:translateY(-5px); border-color:var(--mc,#3b82f6); box-shadow:0 12px 32px rgba(0,0,0,0.55), 0 0 40px var(--mc,rgba(59,130,246,0.3)); }
        .hl-mode-card:hover::before { opacity:1; box-shadow:0 0 16px var(--mc,#3b82f6); }
        .hl-mode-card:hover::after { opacity:0.1; }
        .hl-mode-icon { display:flex; align-items:center; justify-content:center; }
        .hl-mode-name { font-family:var(--font-display); font-size:0.85rem; letter-spacing:3px; font-weight:700; }
        .hl-mode-desc { font-size:0.62rem; color:#64748b; font-family:monospace; letter-spacing:1.5px; text-transform:uppercase; }
        .hl-btn-back { width:200px; display:flex !important; align-items:center; justify-content:center; gap:8px; }

        /* HUD PREMIUM — mas grande, mas visible */
        .hl-hud {
            display:flex; gap:14px; align-items:stretch;
            width:100%; max-width:560px; padding-top:4px;
        }
        .hl-stat {
            position:relative;
            background: linear-gradient(145deg, rgba(15,23,42,0.88), rgba(10,16,30,0.75));
            border:1px solid rgba(255,255,255,0.08);
            border-left: 3px solid var(--hl-accent, #3b82f6);
            border-radius:10px;
            padding:10px 18px;
            display:flex; flex-direction:column; gap:4px; flex:1;
            box-shadow: 0 4px 14px rgba(0,0,0,0.35);
            overflow:hidden;
        }
        .hl-stat::before {
            content:''; position:absolute; top:0; left:0; right:0; height:1px;
            background: linear-gradient(90deg, transparent, var(--hl-accent, #3b82f6), transparent);
            opacity:0.5;
        }
        .hl-stat-label { font-size:0.58rem; color:#94a3b8; letter-spacing:2.5px; font-family:monospace; text-transform:uppercase; }
        .hl-stat-val {
            font-family:var(--font-display); font-size:1.45rem; color:white;
            display:flex; align-items:center; gap:8px;
            text-shadow: 0 0 10px rgba(255,255,255,0.15);
            font-weight: 700;
        }
        .hl-stat--streak .hl-stat-val { color: var(--hl-streak-color, #94a3b8); }
        .hl-streak-fire {
            display: inline-flex;
            animation: hlFireFlick 0.6s ease-in-out infinite alternate;
            filter: drop-shadow(0 0 4px currentColor);
            transform-origin: center bottom;
        }
        @keyframes hlFireFlick {
            from { transform: scale(1) rotate(-4deg); filter: drop-shadow(0 0 4px currentColor); }
            to   { transform: scale(1.15) rotate(4deg); filter: drop-shadow(0 0 12px currentColor); }
        }
        .hl-blitz-track { flex:2; display:flex; flex-direction:column; gap:5px; justify-content:center; padding:8px 14px; }
        .hl-blitz-bar-bg { height:6px; background:rgba(255,255,255,0.07); border-radius:3px; overflow:hidden; }
        .hl-blitz-bar-fill { height:100%; background:linear-gradient(90deg,#fbbf24,#f97316); border-radius:3px; transition:width 0.9s linear; box-shadow: 0 0 8px rgba(251,191,36,0.4); }

        /* Carta PREMIUM */
        .hl-card-wrap {
            flex:1; display:flex; align-items:center; justify-content:center;
            width:100%; position:relative;
            perspective: 1200px;
        }
        .hl-card-outer {
            position: relative;
            width:190px; height:268px;
            transform-style: preserve-3d;
        }
        .hl-card {
            position:relative;
            width:100%; height:100%;
            border-radius:18px;
            border:2px solid;
            background:
                radial-gradient(ellipse at top right, rgba(255,255,255,0.04), transparent 60%),
                linear-gradient(145deg, #0d1525 0%, #1a2540 55%, #0a1120 100%);
            display:flex; flex-direction:column; justify-content:space-between;
            padding:14px;
            overflow:hidden;
            transition: transform 0.25s cubic-bezier(0.2,0,0,1.3), border-color 0.3s;
            box-shadow:
                0 0 30px var(--sc, rgba(59,130,246,0.2)),
                0 12px 40px rgba(0,0,0,0.6),
                inset 0 0 30px rgba(0,0,0,0.5),
                inset 0 1px 0 rgba(255,255,255,0.1);
        }
        /* Holograma conic rotando detras del contenido */
        .hl-card::before {
            content:'';
            position:absolute;
            inset:-2px;
            border-radius:inherit;
            padding:2px;
            background: conic-gradient(from 0deg,
                var(--sc, #3b82f6) 0%,
                transparent 25%,
                var(--sc, #3b82f6) 50%,
                transparent 75%,
                var(--sc, #3b82f6) 100%);
            -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
                    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
            -webkit-mask-composite: xor;
                    mask-composite: exclude;
            opacity: 0.6;
            animation: hlCardHalo 8s linear infinite;
            pointer-events:none;
        }
        @keyframes hlCardHalo {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
        }
        /* Scanlines muy sutiles */
        .hl-card::after {
            content:'';
            position:absolute; inset:0;
            background: repeating-linear-gradient(
                0deg,
                rgba(255,255,255,0.015),
                rgba(255,255,255,0.015) 1px,
                transparent 1px,
                transparent 4px
            );
            pointer-events:none;
            border-radius:inherit;
        }

        /* Guilloche pattern — fondo de seguridad estilo billete */
        .hl-card-guilloche {
            position:absolute; inset:0;
            background-image:
                radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.02) 1px, transparent 1.5px),
                radial-gradient(ellipse at 70% 70%, rgba(255,255,255,0.02) 1px, transparent 1.5px),
                linear-gradient(45deg, transparent 48%, rgba(255,255,255,0.02) 49%, rgba(255,255,255,0.02) 51%, transparent 52%),
                linear-gradient(-45deg, transparent 48%, rgba(255,255,255,0.015) 49%, rgba(255,255,255,0.015) 51%, transparent 52%);
            background-size: 12px 12px, 18px 18px, 24px 24px, 24px 24px;
            pointer-events:none; z-index:0;
            opacity:0.8;
        }

        /* Corners art-deco — 4 esquinas ornamentadas */
        .hl-card-corners { position:absolute; inset:0; pointer-events:none; z-index:1; }
        .hl-corner {
            position:absolute; width:18px; height:18px;
            opacity:0.45;
        }
        .hl-corner::before, .hl-corner::after {
            content:''; position:absolute; background:currentColor; border-radius:1px;
        }
        .hl-corner::before { width:12px; height:1px; }
        .hl-corner::after  { width:1px; height:12px; }
        .hl-corner--tl { top:6px;    left:6px;    }
        .hl-corner--tr { top:6px;    right:6px;   transform:scaleX(-1); }
        .hl-corner--bl { bottom:6px; left:6px;    transform:scaleY(-1); }
        .hl-corner--br { bottom:6px; right:6px;   transform:scale(-1,-1); }

        .hl-card-corner { display:flex; flex-direction:column; align-items:flex-start; gap:4px; line-height:1; z-index:3; position:relative; width:max-content; }
        .hl-card-corner--tl { align-self:flex-start; }
        .hl-card-corner--br { align-self:flex-end; transform:rotate(180deg); }
        .hl-card-rank {
            font-family:var(--font-display);
            font-size:2.2rem;
            font-weight:900;
            letter-spacing:-2px;
            text-shadow: 0 0 12px currentColor, 0 2px 2px rgba(0,0,0,0.5);
            line-height: 0.9;
        }
        .hl-card-suit-sm {
            display:inline-flex;
            filter: drop-shadow(0 0 6px currentColor);
        }
        .hl-card-center {
            position:absolute; top:50%; left:50%;
            transform:translate(-50%,-50%);
            pointer-events:none;
            filter: drop-shadow(0 0 24px currentColor) drop-shadow(0 0 50px currentColor);
            animation: hlHeartbeat 2.2s ease-in-out infinite;
            z-index: 1;
            opacity: 0.5;
        }
        @keyframes hlHeartbeat {
            0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
            14%      { transform: translate(-50%, -50%) scale(1.1); opacity: 0.7; }
            28%      { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
            42%      { transform: translate(-50%, -50%) scale(1.1); opacity: 0.7; }
            56%      { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
        }

        /* Monograma central para face cards (J, Q, K, A) */
        .hl-card-monogram {
            position:absolute;
            top:50%; left:50%;
            transform: translate(-50%, -50%);
            opacity: 0.85;
            z-index: 2;
            filter: drop-shadow(0 0 6px currentColor);
        }
        .hl-card--face .hl-card-center { opacity: 0.18; }

        /* Carta especial */
        .hl-card--special { align-items:center; justify-content:center; padding:16px; }
        .hl-card-special-icon {
            display:flex; align-items:center; justify-content:center;
            margin: auto;
            z-index: 3;
            animation: hlSpecialBreathe 2s ease-in-out infinite;
        }
        @keyframes hlSpecialBreathe {
            0%, 100% { transform: scale(1); filter: drop-shadow(0 0 12px currentColor); }
            50%      { transform: scale(1.08); filter: drop-shadow(0 0 24px currentColor); }
        }
        .hl-card-special-label {
            position:absolute; bottom:18px; left:0; right:0;
            text-align:center;
            font-size:0.72rem; font-family:var(--font-display); letter-spacing:3px;
            z-index:3;
            font-weight:700;
            text-shadow: 0 0 10px currentColor;
        }
        .hl-shield-badge {
            position:absolute; top:12px; left:50%;
            transform:translateX(-50%);
            background:linear-gradient(135deg, rgba(16,185,129,0.95), rgba(5,150,105,0.9));
            color:white; font-size:0.6rem;
            padding:4px 12px; border-radius:20px;
            font-family:monospace; letter-spacing:1.5px;
            display:flex; align-items:center; gap:5px;
            white-space:nowrap; z-index:10;
            box-shadow: 0 0 15px rgba(16,185,129,0.6);
            border: 1px solid rgba(16,185,129,1);
        }

        /* Controles */
        .hl-controls { display:flex; flex-direction:column; align-items:center; gap:14px; width:100%; max-width:560px; }
        .hl-btn-row { display:flex; gap:50px; align-items:flex-start; justify-content:center; }
        .hl-btn-col { display:flex; flex-direction:column; align-items:center; gap:6px; }
        .hl-btn-label {
            font-family:var(--font-display); font-size:0.65rem;
            letter-spacing:3px; font-weight:700;
            text-shadow: 0 0 8px currentColor;
        }

        /* Botones circulares HIGH/LOW PREMIUM */
        .hl-action-btn {
            position: relative;
            width:86px; height:86px; border-radius:50%;
            border:2px solid;
            background:
                radial-gradient(circle at 30% 25%, rgba(255,255,255,0.08), transparent 60%),
                radial-gradient(circle at center, rgba(0,0,0,0.3), rgba(0,0,0,0.7));
            display:flex; align-items:center; justify-content:center;
            cursor:pointer;
            transition: transform 0.15s, box-shadow 0.2s, border-color 0.2s;
            overflow: hidden;
        }
        .hl-action-btn::before {
            content:''; position:absolute; inset:-4px;
            border-radius:50%;
            background: radial-gradient(circle, currentColor, transparent 72%);
            opacity:0.08; z-index:-1;
            transition: opacity 0.3s;
        }
        .hl-action-btn::after {
            content:''; position:absolute; inset:6px;
            border-radius:50%;
            border:1px dashed currentColor;
            opacity:0.25;
            pointer-events:none;
        }
        .hl-action-btn:hover { transform:translateY(-4px) scale(1.06); }
        .hl-action-btn:hover::before { opacity: 0.35; }
        .hl-action-btn:hover::after { opacity:0.5; animation: hlRingSpin 6s linear infinite; }
        .hl-action-btn:active { transform:scale(0.94); }
        @keyframes hlRingSpin { to { transform: rotate(360deg); } }

        .hl-action-btn .btn-icon {
            display:flex; align-items:center; justify-content:center;
            filter: drop-shadow(0 0 8px currentColor);
            transition: transform 0.2s;
            z-index:1;
        }
        .hl-action-btn:hover .btn-icon {
            animation: hlArrowBob 0.8s ease-in-out infinite;
        }
        @keyframes hlArrowBob {
            0%, 100% { transform: translateY(0); }
            50%      { transform: translateY(-4px); }
        }
        .btn-pct { font-size:0.68rem; font-family:monospace; letter-spacing:1px; font-weight: bold; opacity:0.85; }
        .hl-btn-lower  { border-color:#ef4444; color:#ef4444; box-shadow: 0 0 22px rgba(239,68,68,0.3), inset 0 0 24px rgba(239,68,68,0.12); }
        .hl-btn-lower:hover  { box-shadow: 0 0 40px rgba(239,68,68,0.7), inset 0 0 28px rgba(239,68,68,0.18); }
        .hl-btn-higher { border-color:#22c55e; color:#22c55e; box-shadow: 0 0 22px rgba(34,197,94,0.3), inset 0 0 24px rgba(34,197,94,0.12); }
        .hl-btn-higher:hover { box-shadow: 0 0 40px rgba(34,197,94,0.7), inset 0 0 28px rgba(34,197,94,0.18); }

        .hl-wall-cta {
            display:flex; align-items:center; gap:10px;
            color:#fbbf24; font-family:var(--font-display);
            font-size:0.75rem; letter-spacing:2px;
            padding:12px 20px;
            border:1px dashed #fbbf24;
            border-radius:8px;
            background: rgba(251,191,36,0.05);
        }

        /* Skills PREMIUM */
        .hl-skill-row {
            display:flex; gap:10px;
            padding:10px 14px;
            background:rgba(0,0,0,0.45);
            border-radius:12px;
            border:1px solid rgba(255,255,255,0.07);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
        }
        .hl-skill {
            position: relative;
            width:58px; height:58px;
            border:1px solid #334155; border-radius:10px;
            display:flex; flex-direction:column; align-items:center; justify-content:center;
            cursor:pointer;
            transition: all 0.18s;
            background: linear-gradient(145deg, rgba(255,255,255,0.04), rgba(0,0,0,0.2));
            gap:3px;
            overflow: hidden;
        }
        .hl-skill::after {
            content:''; position:absolute; inset:0;
            background: radial-gradient(circle at top, var(--sk-color, #a855f7), transparent 70%);
            opacity: 0;
            transition: opacity 0.2s;
            pointer-events:none;
        }
        .hl-skill:hover:not(.off) {
            border-color:var(--sk-color, rgba(255,255,255,0.3));
            transform:translateY(-3px);
            box-shadow: 0 6px 16px rgba(0,0,0,0.4);
        }
        .hl-skill:hover:not(.off)::after { opacity: 0.12; }
        .hl-skill.off { opacity:0.3; cursor:not-allowed; filter:grayscale(1); }
        .hl-skill-ico {
            display:flex; align-items:center; justify-content:center;
            filter: drop-shadow(0 0 6px currentColor);
            z-index:1;
        }
        .hl-skill-cost { font-size:0.6rem; font-family:monospace; color:#64748b; z-index:1; font-weight:600; }

        /* Historia */
        .hl-history {
            display:flex; gap:5px; height:44px; align-items:center;
            padding: 0 4px;
        }
        .hl-mini-card {
            position:relative;
            width:28px; height:40px; border-radius:5px;
            border:1px solid;
            background: linear-gradient(145deg, rgba(13,21,37,0.95), rgba(26,37,64,0.9));
            display:flex; flex-direction:column; align-items:center; justify-content:space-between;
            padding: 3px 2px;
            font-size:0.75rem;
            transition: transform 0.2s, border-color 0.2s;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        }
        .hl-mini-card:hover { transform: translateY(-4px) scale(1.1); }
        .hl-mini-rank {
            font-family: var(--font-display);
            font-size: 0.7rem;
            font-weight: 800;
            line-height: 1;
            text-shadow: 0 0 4px currentColor;
        }
        .hl-mini-suit { display:flex; align-items:center; justify-content:center; }

        /* Carta especial — WALL luxury */
        .hl-wall {
            position:relative;
            width:100%; height:100%; border-radius:16px;
            background:
                repeating-linear-gradient(45deg, rgba(251,191,36,0.08), rgba(251,191,36,0.08) 8px, transparent 8px, transparent 16px),
                linear-gradient(145deg, #1f2937, #111827);
            border:2px solid #fbbf24;
            display:flex; flex-direction:column; align-items:center; justify-content:center;
            gap:10px; cursor:pointer;
            box-shadow: 0 0 30px rgba(251,191,36,0.4), inset 0 0 30px rgba(0,0,0,0.6);
            overflow:hidden;
        }
        .hl-wall::before {
            content:''; position:absolute; inset:8px;
            border: 1px dashed rgba(251,191,36,0.35);
            border-radius: 10px;
            pointer-events:none;
        }
        .hl-wall-icon {
            animation: hlSpecialBreathe 1.8s ease-in-out infinite;
            z-index:1;
        }
        .hl-wall-title {
            font-family:var(--font-display); font-size:0.8rem;
            color:#fbbf24; letter-spacing:3px; font-weight:700;
            text-shadow: 0 0 10px #fbbf24;
            z-index:1;
        }
        .hl-wall-hp {
            display:inline-flex; align-items:center; gap:5px;
            background:#fbbf24; color:#111;
            font-size:0.7rem; padding:3px 12px; border-radius:4px;
            font-family:var(--font-display); font-weight:bold; letter-spacing:1.5px;
            box-shadow: 0 0 10px rgba(251,191,36,0.5);
            z-index:1;
        }
        .hl-wall-hint {
            font-size:0.55rem; color:#f59e0b;
            font-family:monospace; letter-spacing:2px;
            opacity:0.7;
            z-index:1;
        }
        `;
        document.head.appendChild(s);
    }

    createDeck() {
        const suits = ['H','D','C','S'];
        const defs = [{r:'2',v:2},{r:'3',v:3},{r:'4',v:4},{r:'5',v:5},{r:'6',v:6},
                      {r:'7',v:7},{r:'8',v:8},{r:'9',v:9},{r:'10',v:10},
                      {r:'J',v:11},{r:'Q',v:12},{r:'K',v:13},{r:'A',v:14}];
        let deck = [];
        for(const s of suits) for(const d of defs) deck.push({type:'NORMAL',suit:s,rank:d.r,value:d.v});
        deck.push({type:'JOKER',value:99});
        deck.push({type:'WALL', value:50,hp:4});
        deck.push({type:'CACHE',value:10,suit:'D',rank:'$'});
        deck.push({type:'VIRUS',value:7, suit:'S',rank:'!'});
        deck.push({type:'PROXY',value:Math.floor(Math.random()*13)+2,suit:'C',rank:'?'});
        deck.push({type:'EMP',  value:8, suit:'S',rank:'~'});
        return this.shuffle(deck);
    }
    shuffle(arr){ let c=arr.length,r; while(c){r=Math.floor(Math.random()*c--);[arr[c],arr[r]]=[arr[r],arr[c]];} return arr; }
    drawCard(){ if(!this.deck||!this.deck.length) this.deck=this.createDeck(); return this.deck.pop()||{type:'NORMAL',suit:'S',rank:'A',value:14}; }

    getCardHTML(card, mini=false) {
        if(!card) return '';
        if(mini) {
            if(card.type !== 'NORMAL') {
                const sp = SPECIAL_ICONS[card.type] || SPECIAL_ICONS.PROXY;
                return `<div class="hl-mini-card" style="border-color:${sp.color}; color:${sp.color};">${icon(sp.svg,{size:14})}</div>`;
            }
            const si = SUIT_ICONS[card.suit] || SUIT_ICONS.S;
            return `<div class="hl-mini-card" style="border-color:${si.color}50; color:${si.color};">
                <div class="hl-mini-rank">${card.rank}</div>
                <div class="hl-mini-suit">${icon(si.svg,{size:9})}</div>
            </div>`;
        }

        // Cartas especiales
        if(card.type === 'WALL') return `
            <div class="hl-wall" onclick="window.app.game.hitWall()">
                <div class="hl-wall-icon" style="color:#fbbf24;">${icon('lock',{size:54})}</div>
                <div class="hl-wall-title">FIREWALL</div>
                <div class="hl-wall-hp">${icon('shield',{size:12})} HP · ${card.hp}</div>
                <div class="hl-wall-hint">PULSA PARA ROMPER</div>
            </div>`;

        const sp = SPECIAL_ICONS[card.type];
        if(sp) return `
            <div class="hl-card hl-card--special" style="border-color:${sp.color}; --sc:${sp.color}66;">
                <div class="hl-card-corners"></div>
                <div class="hl-card-special-icon" style="color:${sp.color};filter:drop-shadow(0 0 16px ${sp.color});">
                    ${icon(sp.svg,{size:84})}
                </div>
                <div class="hl-card-special-label" style="color:${sp.color};">${sp.label}</div>
            </div>`;

        const si = SUIT_ICONS[card.suit] || SUIT_ICONS.S;
        // Carta normal PREMIUM: guilloche pattern + ornamentos de esquina + monograma central
        const isFace = ['J','Q','K','A'].includes(card.rank);
        return `
            <div class="hl-card entering ${isFace?'hl-card--face':''}" style="border-color:${si.color}; color:${si.color}; --sc:${si.glow};">
                <div class="hl-card-guilloche"></div>
                <div class="hl-card-corners">
                    <span class="hl-corner hl-corner--tl"></span>
                    <span class="hl-corner hl-corner--tr"></span>
                    <span class="hl-corner hl-corner--bl"></span>
                    <span class="hl-corner hl-corner--br"></span>
                </div>
                <div class="hl-card-corner hl-card-corner--tl">
                    <span class="hl-card-rank">${card.rank}</span>
                    <span class="hl-card-suit-sm">${icon(si.svg,{size:16})}</span>
                </div>
                <div class="hl-card-center">
                    ${icon(si.svg,{size:96})}
                </div>
                ${isFace ? `<div class="hl-card-monogram">${icon('fleuron',{size:72,color:si.color})}</div>` : ''}
                <div class="hl-card-corner hl-card-corner--br">
                    <span class="hl-card-rank">${card.rank}</span>
                    <span class="hl-card-suit-sm">${icon(si.svg,{size:16})}</span>
                </div>
            </div>`;
    }

    hitWall() {
        if(!this.currentCard||this.currentCard.type!=='WALL') return;
        this.currentCard.hp--;
        try{ this.audio.playClick(); }catch(e){}
        const el = document.getElementById('hl-main-card');
        if(el){ el.style.transform=`translate(${Math.random()*8-4}px,${Math.random()*8-4}px)`; setTimeout(()=>{ if(el) el.style.transform=''; },60); }
        if(this.currentCard.hp<=0){
            try{ window.app.showToast('FIREWALL DESTRUIDO','Acceso recuperado','gold'); }catch(e){}
            this.currentCard=this.drawCard(); this.renderTable();
        } else this.renderTable();
    }

    triggerVirusFail(){ if(!this.virusTimer)return; try{window.app.showToast('¡VIRUS EJECUTADO!','Sistema corrompido','danger');}catch(e){} try{this.audio.playLose();}catch(e){} this.endGameLogic(); }
    pause() {
        this._paused = true;
        if(this.blitzTimerInterval) { clearInterval(this.blitzTimerInterval); this.blitzTimerInterval = null; }
    }
    resume() {
        if(!this._paused) return;
        this._paused = false;
        if(this.currentMode === 'BLITZ' && this.blitzTimeLeft > 0) this.startBlitzTimer();
    }
    startBlitzTimer(){ this.blitzTimeLeft=60; if(this.blitzTimerInterval)clearInterval(this.blitzTimerInterval); this.blitzTimerInterval=setInterval(()=>{ this.blitzTimeLeft--; const t=document.getElementById('hl-blitz-fill'); if(t) t.style.width=(this.blitzTimeLeft/60*100)+'%'; const tv=document.getElementById('hl-timer-val'); if(tv) tv.textContent=this.blitzTimeLeft+'s'; if(this.blitzTimeLeft<=0){clearInterval(this.blitzTimerInterval);this.endGameLogic();} },1000); }

    init() {
        window.app.game=this;
        if(window.app.credits<15){ try{window.app.showToast('FONDOS INSUFICIENTES','Costo: 15 CR','danger');}catch(e){} if(this.onQuit)this.onQuit(0); return; }
        this.showDifficultySelect();
    }

    showDifficultySelect() {
        const modes = [
            { id:'mode-normal',   mc:'#3b82f6', svg:'layers', name:'ESTÁNDAR',  desc:'Racha infinita' },
            { id:'mode-hardcore', mc:'#ef4444', svg:'skull',  name:'LETAL',     desc:'1 Fallo = Fin'  },
            { id:'mode-blitz',    mc:'#fbbf24', svg:'bolt',   name:'BLITZ',     desc:'60 segundos'    }
        ];
        this.uiContainer.innerHTML = `
            <div class="hl-mode-shell">
                <div class="hl-mode-header">
                    <div class="hl-mode-title">HIGH / LOW</div>
                    <div class="hl-mode-subtitle">SELECCIONA NIVEL DE ACCESO</div>
                    <div class="hl-mode-divider"></div>
                </div>
                <div class="hl-mode-grid">
                    ${modes.map(m=>`
                    <div class="hl-mode-card" id="${m.id}" style="--mc:${m.mc};">
                        <div class="hl-mode-icon" style="color:${m.mc};filter:drop-shadow(0 0 10px ${m.mc});">${icon(m.svg,{size:42})}</div>
                        <div class="hl-mode-name" style="color:${m.mc};">${m.name}</div>
                        <div class="hl-mode-desc">${m.desc}</div>
                    </div>`).join('')}
                </div>
                <button class="btn btn-secondary hl-btn-back" id="btn-hl-back">
                    ${icon('arrowLeft',{size:14})}
                    <span>VOLVER AL LOBBY</span>
                </button>
            </div>`;
        document.getElementById('mode-normal').onclick  = () => this.payAndStart('NORMAL');
        document.getElementById('mode-hardcore').onclick = () => this.payAndStart('HARDCORE');
        document.getElementById('mode-blitz').onclick   = () => this.payAndStart('BLITZ');
        document.getElementById('btn-hl-back').onclick  = () => { if(this.onQuit)this.onQuit(0); };
    }

    payAndStart(mode) {
        window.app.credits-=15;
        document.getElementById('val-credits').innerText=window.app.credits;
        try{this.audio.playBuy();}catch(e){}
        this.difficulty=mode;
        this._shellBuilt = false;
        // Mount backdrop con color segun modo
        const color = mode === 'HARDCORE' ? '#ef4444' : mode === 'BLITZ' ? '#fbbf24' : '#3b82f6';
        try { Backdrop.mount({ color, particles: 'cards', intensity: 1 }); } catch(e) {}
        this.startGameLoop();
    }

    _buildShell() {
        const modeColor = this.difficulty === 'HARDCORE' ? '#ef4444' : this.difficulty === 'BLITZ' ? '#fbbf24' : '#3b82f6';
        const hudHTML = `
            <div style="display:flex;gap:20px;align-items:center;">
                ${hudLogo({ title: 'HIGH', subtitle: 'LOW', titleColor: '#3b82f6', subColor: '#fbbf24' })}
                ${hudStat({ label: 'SCORE', id: 'hl-score-hud', color: '#fbbf24', value: '0', minWidth: 90 })}
                ${hudStat({ label: 'RACHA', id: 'hl-streak-hud', color: '#94a3b8', value: '0', minWidth: 60 })}
                ${this.difficulty === 'BLITZ' ? hudStat({ label: 'TIEMPO', id: 'hl-timer-hud', color: '#fbbf24', value: '60s', minWidth: 70 }) : ''}
            </div>
            ${hudMode({ mode: this.difficulty, modeColor, hint: 'HIGHER / LOWER' })}
        `;
        const shell = createGameShell({
            container: this.uiContainer, hudHTML,
            frameColor: `${modeColor}88`, cornerColor: modeColor,
            domOnly: true, maxWidth: 720,
        });
        this._frame = shell.frame;
        this._content = shell.content;
        this._shellBuilt = true;
    }

    startGameLoop() {
        this.deck=this.createDeck(); this.resetRoundState();
        this.currentCard=this.drawCard();
        while(this.currentCard.type!=='NORMAL') this.currentCard=this.drawCard();
        if(this.difficulty==='BLITZ') this.startBlitzTimer();
        this.renderTable();
    }

    resetRoundState() {
        this.score=0; this.streak=0; this.history=[]; this.shieldActive=false; this.peekedCard=null; this.isFrenzy=false; this.comboCounter=0;
        if(this.virusTimer){clearTimeout(this.virusTimer);this.virusTimer=null;}
        if(this.animationTimer){clearTimeout(this.animationTimer);this.animationTimer=null;}
        if(this.blitzTimerInterval){clearInterval(this.blitzTimerInterval);this.blitzTimerInterval=null;}
        document.body.classList.remove('frenzy-mode');
    }

    renderTable() {
        try {
            if(this.virusTimer){clearTimeout(this.virusTimer);this.virusTimer=null;}
            if(this.animationTimer){clearTimeout(this.animationTimer);this.animationTimer=null;}
            if(!this.currentCard) this.currentCard=this.drawCard();
            const isSpecial = !['NORMAL','CACHE','EMP'].includes(this.currentCard.type);
            const isWall    = this.currentCard.type==='WALL';
            const isEmp     = this.currentCard.type==='EMP';
            const isVirus   = this.currentCard.type==='VIRUS';

            if(isVirus){ try{this.audio.playTone(600,'sawtooth',0.5);}catch(e){} this.virusTimer=setTimeout(()=>this.triggerVirusFail(),4000); }

            const val=this.currentCard.value||0;
            const probH=(isSpecial||isEmp)?0:Math.max(5,Math.min(100,((14-val)/13)*100));
            const probL=(isSpecial||isEmp)?0:Math.max(5,Math.min(100,((val-2)/13)*100));
            const canSwap   = window.app.credits>=35;
            const canOracle = window.app.credits>=75 && !this.peekedCard && !isEmp;
            const canShield = window.app.credits>=150 && !this.shieldActive;
            const hideCtrl  = isWall;

            const blitzHUD = this.difficulty==='BLITZ' ? `
                <div class="hl-blitz-track">
                    <div class="hl-stat-label">TIEMPO — <span id="hl-timer-val">${this.blitzTimeLeft}s</span></div>
                    <div class="hl-blitz-bar-bg"><div id="hl-blitz-fill" class="hl-blitz-bar-fill" style="width:${this.blitzTimeLeft/60*100}%;"></div></div>
                </div>` : '';

            const streakColor = this.isFrenzy ? '#ef4444' : this.streak>=5 ? '#f97316' : this.streak>=3 ? '#fbbf24' : '#94a3b8';
            const scoreAccent = this.isFrenzy ? '#ef4444' : '#3b82f6';

            if(!this._shellBuilt) this._buildShell();
            // Update HUD externo
            const scoreEl = document.getElementById('hl-score-hud'); if(scoreEl) scoreEl.textContent = this.score.toLocaleString();
            const streakEl = document.getElementById('hl-streak-hud');
            if(streakEl) {
                streakEl.textContent = this.streak;
                streakEl.style.color = streakColor;
                streakEl.style.textShadow = `0 0 14px ${streakColor}`;
            }
            if(this.difficulty === 'BLITZ') {
                const timerEl = document.getElementById('hl-timer-val');
                if(timerEl) timerEl.textContent = `${this.blitzTimeLeft}s`;
            }

            this._content.innerHTML = `
            <div class="hl-root" style="padding:0;height:auto;">
                <!-- HUD inline para mantener animaciones específicas del juego -->
                <div class="hl-hud" style="display:none;">
                    <div class="hl-stat" style="--hl-accent:${scoreAccent};">
                        <div class="hl-stat-label">SCORE</div>
                        <div class="hl-stat-val"><span id="hl-score-val">${this.score.toLocaleString()}</span></div>
                    </div>
                    <div class="hl-stat hl-stat--streak" style="--hl-accent:${streakColor};--hl-streak-color:${streakColor};">
                        <div class="hl-stat-label">${this.isFrenzy?'FRENESÍ':'RACHA'}</div>
                        <div class="hl-stat-val">
                            <span id="hl-streak-val">${this.streak}</span>
                            ${this.streak>0?`<span class="hl-streak-fire">${icon('fire',{size:18})}</span>`:''}
                        </div>
                    </div>
                    ${blitzHUD}
                </div>

                <!-- CARTA -->
                <div class="hl-card-wrap">
                    ${this.shieldActive?`<div class="hl-shield-badge">${icon('shieldFilled',{size:12})} ESCUDO ACTIVO</div>`:''}
                    <div class="hl-card-outer" id="hl-main-card">
                        ${this.getCardHTML(this.currentCard)}
                    </div>
                </div>

                <!-- CONTROLES -->
                <div class="hl-controls">
                    ${!hideCtrl ? `
                    <div class="hl-btn-row">
                        <div class="hl-btn-col">
                            <div class="hl-btn-label" style="color:#ef4444;">LOWER</div>
                            <div class="hl-action-btn hl-btn-lower" id="btn-low">
                                <span class="btn-icon">${icon('chevronDown',{size:30})}</span>
                            </div>
                            ${probL>0?`<span class="btn-pct" style="color:#ef4444;">${Math.round(probL)}%</span>`:''}
                        </div>
                        <div class="hl-btn-col">
                            <div class="hl-btn-label" style="color:#22c55e;">HIGHER</div>
                            <div class="hl-action-btn hl-btn-higher" id="btn-high">
                                <span class="btn-icon">${icon('chevronUp',{size:30})}</span>
                            </div>
                            ${probH>0?`<span class="btn-pct" style="color:#22c55e;">${Math.round(probH)}%</span>`:''}
                        </div>
                    </div>` : `<div class="hl-wall-cta">${icon('lock',{size:16})}<span>ROMPE EL FIREWALL</span></div>`}

                    <div class="hl-skill-row">
                        <div class="hl-skill ${!canSwap?'off':''}" id="skill-swap" style="--sk-color:#a855f7;" title="Reroll — Cambia la carta actual">
                            <span class="hl-skill-ico" style="color:#a855f7;">${icon('shuffle',{size:20})}</span>
                            <span class="hl-skill-cost">$35</span>
                        </div>
                        <div class="hl-skill ${!canOracle||isEmp?'off':''}" id="skill-oracle" style="--sk-color:#3b82f6;" title="Oraculo — Predice la siguiente carta">
                            <span class="hl-skill-ico" style="color:#3b82f6;">${icon('eye',{size:20})}</span>
                            <span class="hl-skill-cost">$75</span>
                        </div>
                        <div class="hl-skill ${!canShield?'off':''}" id="skill-shield" style="--sk-color:${this.shieldActive?'#10b981':'#f97316'};" title="Blindaje — Salva un fallo">
                            <span class="hl-skill-ico" style="color:${this.shieldActive?'#10b981':'#f97316'};">${icon('shield',{size:20})}</span>
                            <span class="hl-skill-cost">$150</span>
                        </div>
                    </div>

                    <div class="hl-history">${this.history.map(c=>this.getCardHTML(c,true)).join('')}</div>
                </div>
            </div>`;

            if(!hideCtrl){
                const bL = document.getElementById('btn-low');
                const bH = document.getElementById('btn-high');
                if(bL) {
                    bL.onclick = (e)=>{
                        try { GFX.rippleClick(bL, e, 'rgba(239,68,68,0.45)'); } catch(err){}
                        this.makeMove('LOWER');
                    };
                }
                if(bH) {
                    bH.onclick = (e)=>{
                        try { GFX.rippleClick(bH, e, 'rgba(34,197,94,0.45)'); } catch(err){}
                        this.makeMove('HIGHER');
                    };
                }
            }
            const skSwap   = document.getElementById('skill-swap');
            const skOracle = document.getElementById('skill-oracle');
            const skShield = document.getElementById('skill-shield');
            if(skSwap)   skSwap.onclick   = (e)=>{ if(canSwap)   { try{GFX.rippleClick(skSwap,e,'rgba(168,85,247,0.4)');}catch(err){} this.activateSkill('SWAP',35); } };
            if(skOracle) skOracle.onclick = (e)=>{ if(canOracle&&!isEmp) { try{GFX.rippleClick(skOracle,e,'rgba(59,130,246,0.4)');}catch(err){} this.activateSkill('ORACLE',75); } };
            if(skShield) skShield.onclick = (e)=>{ if(canShield) { try{GFX.rippleClick(skShield,e,'rgba(249,115,22,0.4)');}catch(err){} this.activateSkill('SHIELD',150); } };

            // Tilt 3D en la carta principal
            try {
                if(this._tiltCleanup) { this._tiltCleanup(); this._tiltCleanup = null; }
                const cardOuter = document.getElementById('hl-main-card');
                if(cardOuter) {
                    this._tiltCleanup = GFX.tilt3D(cardOuter, { max: 12, perspective: 1200, scale: 1.03 });
                }
            } catch(e) {}

            // Shine sweep para cartas especiales (bonus visual para el wow)
            try {
                if(this.currentCard && this.currentCard.type !== 'NORMAL' && !isWall) {
                    const cardEl = this.uiContainer.querySelector('.hl-card');
                    if(cardEl) {
                        const sp = SPECIAL_ICONS[this.currentCard.type];
                        setTimeout(() => GFX.shineSweep(cardEl, {
                            color: sp ? sp.color + '90' : 'rgba(255,255,255,0.5)',
                            duration: 1.1,
                        }), 350);
                    }
                }
            } catch(e) {}
        } catch(e){ console.error('HL Render Error:',e); this.startGameLoop(); }
    }

    activateSkill(type,cost) {
        window.app.credits-=cost;
        try{this.audio.playBuy();}catch(e){}
        if(type==='SHIELD'){ this.shieldActive=true; try{window.app.showToast('BLINDAJE','Activo','success');}catch(e){} }
        else if(type==='SWAP'){ if(this.virusTimer)clearTimeout(this.virusTimer); this.currentCard=this.drawCard(); this.peekedCard=null; try{window.app.showToast('REROLL','Nueva carta','purple');}catch(e){} }
        else if(type==='ORACLE'){
            if(!this.peekedCard)this.peekedCard=this.drawCard();
            let hint='???';
            if(this.peekedCard.type==='NORMAL'&&this.currentCard.type==='NORMAL') hint=this.peekedCard.value>this.currentCard.value?'MAYOR ▲':'MENOR ▼';
            else if(this.peekedCard.type==='JOKER') hint='GLITCH (WIN)';
            else hint='PELIGRO';
            try{window.app.showToast('ORÁCULO',`Predicción: ${hint}`,'purple');}catch(e){}
        }
        this.renderTable();
    }

    makeMove(guess) {
        if(this.virusTimer){clearTimeout(this.virusTimer);this.virusTimer=null;}
        const now=Date.now();
        if(now-this.lastMoveTime<1800){this.comboCounter++;if(this.comboCounter>=3&&!this.isFrenzy){this.isFrenzy=true;try{window.app.showToast('¡FRENESÍ!','Puntos x2','danger');}catch(e){} document.body.classList.add('frenzy-mode');}}
        else{this.comboCounter=0;this.isFrenzy=false;document.body.classList.remove('frenzy-mode');}
        this.lastMoveTime=now;
        const bL=document.getElementById('btn-low'); const bH=document.getElementById('btn-high');
        if(bL)bL.style.pointerEvents='none'; if(bH)bH.style.pointerEvents='none';
        try{this.audio.playClick();}catch(e){}
        const next=this.peekedCard||(this.peekedCard=null,this.drawCard());
        this.peekedCard=null;

        // Flip 3D dramatico: la carta actual gira y desaparece
        const el = document.getElementById('hl-main-card');
        if(el && typeof window.gsap !== 'undefined' && !window.app?.settings?.reduceMotion) {
            window.gsap.to(el, {
                rotationY: guess === 'LOWER' ? -90 : 90,
                opacity: 0,
                duration: 0.22,
                ease: 'power2.in',
                transformPerspective: 1200,
                onComplete: () => this.resolve(guess, next),
            });
        } else {
            // Fallback sin GSAP
            if(el){ el.style.transition='all 0.2s'; el.style.transform='translateX(-40px)'; el.style.opacity='0'; }
            this.animationTimer = setTimeout(() => this.resolve(guess, next), 200);
        }
    }

    resolve(guess,nextCard) {
        if(!this.currentCard)this.currentCard={value:0};
        if(!nextCard)nextCard=this.drawCard();
        const curVal=this.currentCard.value||0, nextVal=nextCard.value||0;
        const isJoker=this.currentCard.type==='JOKER'||nextCard.type==='JOKER';
        const isWall=nextCard.type==='WALL';
        let outcome='LOSE', isCrit=false;
        if(isJoker){outcome='WIN';try{window.app.showToast('GLITCH','Acceso concedido','gold');}catch(e){}}
        else if(isWall){outcome='WIN';}
        else if(curVal===nextVal) outcome='TIE';
        else if((guess==='HIGHER'&&nextVal>curVal)||(guess==='LOWER'&&nextVal<curVal)){
            outcome='WIN';
            const p=(guess==='HIGHER')?(14-curVal)/13:(curVal-2)/13;
            if(p<0.25) isCrit=true;
        }

        // Snapshot de score/streak previos para animar el delta
        const prevScore = this.score;
        const prevStreak = this.streak;

        if(this.currentCard){this.history.push(this.currentCard);if(this.history.length>7)this.history.shift();}
        this.currentCard=nextCard;
        this.renderTable();

        // Entrada de la nueva carta con flip 3D desde el lado contrario
        const newEl = document.getElementById('hl-main-card');
        if(newEl && typeof window.gsap !== 'undefined' && !window.app?.settings?.reduceMotion) {
            const gsap = window.gsap;
            const fromRotY = guess === 'LOWER' ? 90 : -90;
            gsap.fromTo(newEl,
                { rotationY: fromRotY, opacity: 0, transformPerspective: 1200 },
                { rotationY: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.6)' }
            );
        } else if(newEl) {
            newEl.style.transition='none';
            newEl.style.transform='translateX(40px)';
            newEl.style.opacity='0';
            void newEl.offsetWidth;
            newEl.style.transition='all 0.25s cubic-bezier(0.2,0,0,1.3)';
            newEl.style.transform='';
            newEl.style.opacity='1';
        }

        // Pulso del spotlight del backdrop en cualquier resolucion
        try { Backdrop.pulseSpotlight(); } catch(e) {}

        if(outcome==='WIN'){
            if(!isWall){
                this.streak++;
                let pts=10;
                if(this.difficulty==='HARDCORE')pts*=2;
                if(this.isFrenzy)pts*=2;
                if(isCrit)pts*=3;
                this.score+=pts;

                // Feedback visual WIN
                try {
                    const cardEl = this.uiContainer.querySelector('.hl-card');
                    if(cardEl) GFX.hitFeedback(cardEl, {
                        color: isCrit ? '#fbbf24' : '#22c55e',
                        particles: isCrit ? 50 : 25,
                    });
                } catch(e) {}
                // Rolling number del score
                try {
                    const scoreEl = document.getElementById('hl-score-val');
                    if(scoreEl) GFX.rollNumber(scoreEl, prevScore, this.score, 0.6);
                } catch(e) {}
                // Pop del streak
                try {
                    const streakEl = document.getElementById('hl-streak-val');
                    if(streakEl) {
                        streakEl.textContent = this.streak;
                        GFX.popScale(streakEl, 1.3, 0.4);
                    }
                } catch(e) {}

                try{window.app.addScore(pts,Math.floor(pts/2));}catch(e){}
                if(nextCard.type==='CACHE'){window.app.credits+=25;try{window.app.showToast('DATA CACHE','+25 CR','gold');}catch(e){}}
                try{isCrit?this.audio.playWin(10):this.audio.playWin(this.streak>3?5:1);}catch(e){}
            } else try{window.app.showToast('FIREWALL','Bloqueo detectado','danger');}catch(e){}
        } else if(outcome==='TIE'){
            try{window.app.showToast('EMPATE','Salvado','default');this.audio.playTone(300,'square',0.1);}catch(e){}
        } else {
            if(this.shieldActive){
                this.shieldActive=false;
                try{this.audio.playShieldBreak();window.app.showToast('ESCUDO ROTO','Salvado','success');}catch(e){}
                try {
                    const cardEl = this.uiContainer.querySelector('.hl-card');
                    if(cardEl) GFX.hitFeedback(cardEl, { color: '#10b981', particles: 30 });
                } catch(e){}
                this.renderTable();
            } else {
                try{this.audio.playLose();}catch(e){}
                // Feedback MISS — shake + flash + streak break
                try {
                    const cardEl = this.uiContainer.querySelector('.hl-card');
                    if(cardEl) GFX.missFeedback(cardEl, { color: '#ef4444' });
                    if(prevStreak >= 3) {
                        const streakEl = document.getElementById('hl-streak-val');
                        if(streakEl) GFX.streakBreak(streakEl.parentElement);
                    }
                } catch(e){}

                this.isFrenzy=false;document.body.classList.remove('frenzy-mode');
                if(this.difficulty==='BLITZ'){
                    this.streak=0; this.blitzTimeLeft=Math.max(0,this.blitzTimeLeft-5);
                    try{window.app.showToast('PENALIZACIÓN','-5 Segundos','danger');}catch(e){}
                    this.renderTable();
                } else if(this.difficulty==='HARDCORE') this.endGameLogic();
                else{try{window.app.showToast('FALLO','Racha 0','danger');}catch(e){} this.streak=0; this.renderTable();}
            }
        }
    }

    endGameLogic() {
        if(this.virusTimer)clearTimeout(this.virusTimer);
        if(this.blitzTimerInterval)clearInterval(this.blitzTimerInterval);
        if(this.onQuit)this.onQuit(this.score);
    }

    cleanup() {
        if(this.virusTimer)      { clearTimeout(this.virusTimer);       this.virusTimer = null; }
        if(this.animationTimer)  { clearTimeout(this.animationTimer);   this.animationTimer = null; }
        if(this.blitzTimerInterval) { clearInterval(this.blitzTimerInterval); this.blitzTimerInterval = null; }
        if(this._tiltCleanup)    { this._tiltCleanup(); this._tiltCleanup = null; }
        try { Backdrop.unmount(); } catch(e) {}
        document.body.classList.remove('frenzy-mode');
    }
}
