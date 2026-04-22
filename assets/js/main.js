import { CONFIG } from './config.js';
import { CanvasManager } from './utils.js';
import { AudioController } from './audio.js'; 
import { ShopSystem } from './shop.js';
import { initSettingsUI } from './systems/settings.js';
import * as Pass from './systems/pass.js';
import * as Missions from './systems/daily-weekly.js';
import * as EasterEggs from './systems/easter-eggs.js';
import * as Tutorial from './systems/tutorial.js';
import * as Profile from './systems/profile-v2.js';
import * as Invest from './systems/invest.js';
import * as Season from './systems/season.js';
import * as Tournament from './systems/tournament.js';
import * as Notifications from './systems/notifications.js';
import * as GameInfo from './systems/game-info.js';
import * as Vs from './systems/vs-mode.js';
import * as Lootbox from './systems/lootbox.js';
import * as DevConsole from './systems/dev-console.js';
import * as Theme from './systems/theme.js';
import * as Callcard from './systems/callcard.js';
import * as FX from './systems/fx.js';
import * as Shortcuts from './systems/shortcuts.js';
import * as Combo from './systems/combo.js';
import * as Onboarding from './systems/onboarding.js';
import * as Persistence from './systems/persistence.js';
import * as UI from './systems/ui.js';
import * as Icons from './systems/icons.js';

// --- JUEGOS (lazy import: se cargan solo al lanzar el juego) ---
// Cada entrada es una factory async que retorna la clase.
// Mejora dramáticamente el tiempo de boot inicial ya que no cargamos
// los 28 módulos de juegos hasta que el usuario realmente los necesita.
//
// IMPORTANTE: cada import usa `?v=21` como cache buster. El numero debe
// coincidir con el de index.html (main.js?v=N). Si cambias codigo de un
// juego, bump este numero para que el browser recargue el modulo.
const GV = '42';
const GAME_LOADERS = {
    'higher-lower':   () => import(`./games/higher-lower.js?v=${GV}`).then(m => m.HigherLowerGame),
    'guess-card':     () => import(`./games/guess-card.js?v=${GV}`).then(m => m.GuessCardGame),
    'trivia':         () => import(`./games/trivia.js?v=${GV}`).then(m => m.TriviaGame),
    'bio-scan':       () => import(`./games/bio-scan.js?v=${GV}`).then(m => m.BioScanGame),
    'geo-net':        () => import(`./games/geo-net.js?v=${GV}`).then(m => m.GeoNetGame),
    'hyper-reflex':   () => import(`./games/hyper-reflex.js?v=${GV}`).then(m => m.GameReflex),
    'spam-click':     () => import(`./games/spam-click.js?v=${GV}`).then(m => m.SpamClickGame),
    'neon-sniper':    () => import(`./games/neon-sniper.js?v=${GV}`).then(m => m.NeonSniperGame),
    'orbit-lock':     () => import(`./games/orbit-lock.js?v=${GV}`).then(m => m.OrbitLockGame),
    'memory-flash':   () => import(`./games/memory-flash.js?v=${GV}`).then(m => m.MemoryFlashGame),
    'vault-cracker':  () => import(`./games/vault-cracker.js?v=${GV}`).then(m => m.VaultCrackerGame),
    'phase-shifter':  () => import(`./games/phase-shifter.js?v=${GV}`).then(m => m.PhaseShifterGame),
    'math-rush':      () => import(`./games/math-rush.js?v=${GV}`).then(m => m.MathRushGame),
    'color-trap':     () => import(`./games/color-trap.js?v=${GV}`).then(m => m.ColorTrapGame),
    'holo-match':     () => import(`./games/holo-match.js?v=${GV}`).then(m => m.HoloMatchGame),
    'void-dodger':    () => import(`./games/void-dodger.js?v=${GV}`).then(m => m.VoidDodgerGame),
    'glitch-hunt':    () => import(`./games/glitch-hunt.js?v=${GV}`).then(m => m.GlitchHuntGame),
    'orbit-tracker':  () => import(`./games/orbit-tracker.js?v=${GV}`).then(m => m.OrbitTrackerGame),
    'cyber-typer':    () => import(`./games/cyber-typer.js?v=${GV}`).then(m => m.CyberTyperGame),
    'cyber-pong':     () => import(`./games/cyber-pong.js?v=${GV}`).then(m => m.CyberPongGame),
    'snake-plus':     () => import(`./games/snake-plus.js?v=${GV}`).then(m => m.SnakePlusGame),
    'cipher-decode':  () => import(`./games/cipher-decode.js?v=${GV}`).then(m => m.CipherDecodeGame),
    'pixel-draw':     () => import(`./games/pixel-draw.js?v=${GV}`).then(m => m.PixelDrawGame),
    'number-grid':    () => import(`./games/number-grid.js?v=${GV}`).then(m => m.NumberGridGame),
    'simon-says':     () => import(`./games/simon-says.js?v=${GV}`).then(m => m.SimonSaysGame),
    'pattern-rush':   () => import(`./games/pattern-rush.js?v=${GV}`).then(m => m.PatternRushGame),
    'reaction-chain': () => import(`./games/reaction-chain.js?v=${GV}`).then(m => m.ReactionChainGame),
    'word-rush':      () => import(`./games/word-rush.js?v=${GV}`).then(m => m.WordRushGame),
    'speed-tap':      () => import(`./games/speed-tap.js?v=${GV}`).then(m => m.SpeedTap),
    'neon-maze':      () => import(`./games/neon-maze.js?v=${GV}`).then(m => m.NeonMaze),
};

const app = {
    state: CONFIG.STATES.WELCOME,
    credits: 100, 
    canvas: null,
    audio: null,
    shop: null,
    game: null,
    activeGameId: null,
    stats: { gamesPlayed: 0, xp: 0, level: 1, avatar: 'fa-user-astronaut', passClaimed: [], unlockedGames: [] }, 
    highScores: {},
    daily:  { date: '', tasks: [], claimed: false },
    weekly: { week: '', tasks: [], claimed: false },
    streak: { days: 0, lastDate: '', best: 0 },
    invest: { date: '', amount: 0, risk: '', resolved: false, result: 0, history: [] },
    favorites: [],
    tournament: null,
    season: null,
    notifLog: [],
    agentName: 'AGENTE',
    settings: { 
        audio: { master: 0.5, sfx: 1.0, music: 0.5 },
        performance: true 
    },
    lastHovered: null,

    init() {
        this.canvas = new CanvasManager();
        this.audio = new AudioController();
        this.shop = new ShopSystem();
        this.fx = FX;
        window.app = this;
        window.FX  = FX;
        window.Icons = Icons;

        // Inicializar audio con el primer clic del usuario
        document.addEventListener('click', () => { if(this.audio) this.audio.init(); }, { once: true });

        // Polyfill FA → SVG custom: reemplaza <i class="fa-*"> por SVG inline
        // con MutationObserver para cubrir nodos nuevos del DOM. Idempotente.
        try { Icons.startFaAutoReplace(); } catch(e) { console.error('icons.startFaAutoReplace', e); }

        // Referencia al mapa de loaders — el consumo externo (vs-mode, daily-weekly)
        // sigue funcionando con Object.keys y la verificacion de existencia.
        this.gameClasses = GAME_LOADERS;

        // --- CARGA DE SAVE + MIGRACION (delegado a systems/persistence.js) ---
        try { Persistence.load(this); }           catch(e) { console.error('persistence.load', e); }
        try { Persistence.runMigrationFix(this); } catch(e) { console.error('persistence.runMigrationFix', e); }

        try { this.checkDailyReset(); }   catch(e) { console.error('checkDailyReset', e); }
        try { this.checkWeeklyReset(); }  catch(e) { console.error('checkWeeklyReset', e); }
        try { this.checkStreakUpdate(); } catch(e) { console.error('checkStreakUpdate', e); }
        try { this.checkInvestment(); }   catch(e) { console.error('checkInvestment', e); }
        try { this.initEasterEggs(); }    catch(e) { console.error('initEasterEggs', e); }
        try { this.initSeason(); }        catch(e) { console.error('initSeason', e); }
        try { this.initTournament(); }    catch(e) { console.error('initTournament', e); }
        // Notif si el torneo termina pronto (2 días o menos)
        setTimeout(() => {
            try {
                const t = this.tournament;
                if(t && t.endDate) {
                    const end  = new Date(t.endDate.split('/').reverse().join('-'));
                    const diff = Math.ceil((end - new Date()) / (1000*60*60*24));
                    if(diff <= 2 && diff >= 0) {
                        const game = CONFIG.GAMES_LIST.find(g=>g.id===t.gameId);
                        this.addNotif('TROPHY', 'TORNEO TERMINA EN ' + diff + ' DÍA' + (diff===1?'':'S'),
                            (game?.name||t.gameId) + ' · Tu mejor: ' + (t.best||0).toLocaleString(), 'gold');
                    }
                }
            } catch(e) {}
        }, 3000);
        try { this.renderMenu(); } catch(e) { console.error('renderMenu', e); }
        try { this.updateUI(); }   catch(e) { console.error('updateUI', e); }
        
        // Pantalla de bienvenida — siempre se activa aunque haya errores arriba
        setTimeout(() => this.changeState(CONFIG.STATES.WELCOME), 100);

        // Onboarding cinematico solo en primera vez (tras un delay para
        // que cargue el welcome y las libs del CDN)
        setTimeout(() => {
            try {
                if(Onboarding.shouldShow(this)) {
                    Onboarding.show(this, () => {
                        // Saltamos directo al menu tras terminar onboarding
                        this.changeState(CONFIG.STATES.MENU);
                    });
                }
            } catch(e) { console.error('onboarding', e); }
        }, 1400);
        
        try { this.setupEventListeners(); } catch(e) { console.error('setupEventListeners', e); }
        // Inicializar keyboard shortcuts overlay (tecla ? o H)
        try { Shortcuts.init(this); } catch(e) { console.error('shortcuts.init', e); }
        // Inicializar sistema de combos (opt-in para juegos)
        try { Combo.init(this); } catch(e) { console.error('combo.init', e); }
    },

    // --- PERSISTENCIA (delegado a systems/persistence.js) ---
    runMigrationFix() { return Persistence.runMigrationFix(this); },
    save()            { return Persistence.save(this); },

    setupEventListeners() {
        const safeBind = (id, fn) => { const el = document.getElementById(id); if(el) el.onclick = fn; };

        // Botones Principales
        safeBind('btn-start', () => {
            this.audio.playClick();
            this.changeState(CONFIG.STATES.MENU);
            if(this.shop.equipped.theme) this.audio.playHover();
        });
        // Mensaje de lore aleatorio en boot
        const LORE_MSGS = ['AGENTE, TU PRESENCIA HA SIDO DETECTADA.', 'PROTOCOLOS NEURALES SINCRONIZADOS.', 'BIENVENIDO DE VUELTA AL SISTEMA.', 'TODOS LOS MÓDULOS OPERATIVOS.', 'CALIBRACIÓN COMPLETADA. LISTO PARA COMBATE.', 'CONEXIÓN SEGURA ESTABLECIDA.', 'SISTEMA OPERATIVO. INICIO DE SESIÓN CONFIRMADO.', 'PROTOCOLOS DE SEGURIDAD ACTIVOS.'];
        const loreLine = document.querySelector('.boot-line:last-child');
        if(loreLine) loreLine.textContent = LORE_MSGS[Math.floor(Math.random() * LORE_MSGS.length)];

        // Mostrar stats si ya jugó antes
        const wrReturning = document.getElementById('welcome-returning');
        const wrLabel     = document.getElementById('wr-label');
        const wrStats     = document.getElementById('wr-stats');
        if(wrReturning && this.stats.gamesPlayed > 0) {
            wrReturning.style.display = 'flex';
            if(wrLabel) wrLabel.textContent = 'Bienvenido de vuelta — ' + this.getRankName(this.stats.level || 1).toUpperCase();
            if(wrStats) wrStats.textContent = this.stats.gamesPlayed + ' partidas · LVL ' + (this.stats.level||1) + ' · ' + this.credits.toLocaleString() + ' CR';
        }
        safeBind('btn-profile', () => this.showProfile());
        safeBind('btn-shop', () => { this.audio.playClick(); this.changeState(CONFIG.STATES.SHOP); this.shop.init(); });
        safeBind('btn-shop-back', () => { this.audio.playClick(); this.changeState(CONFIG.STATES.MENU); });
        safeBind('btn-daily',  () => { this.audio.playClick(); this.renderDailyScreen();  this.changeState(CONFIG.STATES.DAILY);  });
        safeBind('btn-weekly', () => { this.audio.playClick(); this.renderWeeklyScreen(); this.changeState(CONFIG.STATES.WEEKLY); });
        safeBind('btn-random-game', () => {
            this.audio.playClick();
            const available = Object.keys(this.gameClasses);
            const pick = available[Math.floor(Math.random() * available.length)];
            this.showToast('PROTOCOLO ALEATORIO', CONFIG.GAMES_LIST.find(g=>g.id===pick)?.name || pick, 'purple');
            setTimeout(() => this.launch(pick), 600);
        });
        safeBind('btn-daily-back', () => { this.audio.playClick(); this.changeState(CONFIG.STATES.MENU); });
        
        // BOTÓN NEON PASS
        safeBind('btn-pass', () => { 
            this.audio.playClick(); 
            this.changeState('pass');
            setTimeout(() => this.renderPassScreen(), 60);
        });
        safeBind('btn-pass-back', () => { 
            this.audio.playClick(); 
            this.hidePassTooltip();
            this.changeState(CONFIG.STATES.MENU); 
        });

        // Modales
        const closeProfileBtn = document.getElementById('btn-close-profile');
        if(closeProfileBtn) closeProfileBtn.onclick = (e) => { e.preventDefault(); this.closeProfile(); };
        
        const closeInfoBtn = document.getElementById('btn-close-info');
        if(closeInfoBtn) closeInfoBtn.onclick = (e) => { e.preventDefault(); document.getElementById('modal-info').classList.add('hidden'); };

        // SETTINGS — cableado delegado a systems/settings.js
        initSettingsUI(this);

        // LOOT BOX
        safeBind('btn-buy-lootbox', () => this.buyLootBox());

        // ABORTAR JUEGO — ahora solo btn-quit en el HUD
        safeBind('btn-quit', () => { this.audio.playClick(); this.endGame(); });

        // Hover Sounds — SFX por categoría
        const CAT_FREQS = { REFLEJOS:600, MEMORIA:400, MENTAL:500, ACCION:350, CONOCIMIENTO:450 };
        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('.btn, .nav-tab, .game-card-v2, .shop-card-v2, .daily-card, .gcv2-info, .pv2-avatar-opt, .np-card, .sc-btn, .scv2-btn');
            if (target) {
                if (this.lastHovered !== target) {
                    this.lastHovered = target;
                    if(target.classList.contains('game-card-v2')) {
                        const gid  = target.dataset.gameId;
                        const game = gid && CONFIG.GAMES_LIST.find(g => g.id === gid);
                        const freq = (game && game.cat) ? (CAT_FREQS[game.cat] || 400) : 400;
                        const sfx = this._themeSFX; try { this.audio.playTone(sfx?sfx.hover.freq:freq, sfx?sfx.hover.type:'sine', 0.04, 0.08); } catch(err) {}
                    } else {
                        this.audio.playHover();
                    }
                }
            } else {
                this.lastHovered = null;
            }
        });
        
        // Consola de Depuración
        document.addEventListener('keydown', (e) => { if (e.key === 'F1' || e.code === 'F1') { e.preventDefault(); this.toggleConsole(); } });

        // Escape y P para pausar/reanudar durante el juego · Q para abandonar desde pausa
        document.addEventListener('keydown', (e) => {
            const isGame = document.getElementById('screen-game')?.classList.contains('active');
            if(!isGame) return;
            if(e.code === 'Escape' || e.code === 'KeyP') {
                e.preventDefault();
                if(this._pauseOverlayEl) this._autoResume();
                else this._manualPause();
            } else if((e.code === 'KeyQ') && this._pauseOverlayEl) {
                // Abandono rápido desde el overlay de pausa
                e.preventDefault();
                this._pauseOverlayEl.remove();
                this._pauseOverlayEl = null;
                try { this.canvas.resumeBackground(); } catch(_) {}
                this.audio.playClick();
                this.endGame();
            }
        });
        const consoleInput = document.getElementById('console-input');
        if(consoleInput) consoleInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') this.execCommand(e.target.value); });
        const debugTrigger = document.getElementById('debug-trigger');
        if(debugTrigger) debugTrigger.onclick = () => this.toggleConsole();

        // === PAUSA AUTOMÁTICA — pestaña oculta o app en segundo plano ===
        const handleVisibility = () => {
            if (document.hidden) this._autoPause();
            else this._autoResume();
        };
        const handleBlur  = () => this._autoPause();
        const handleFocus = () => this._autoResume();
        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('blur',  handleBlur);
        window.addEventListener('focus', handleFocus);

        // === NAVEGACION CON TECLADO EN EL MENU DE JUEGOS ===
        // Flechas para moverse entre cards, Enter/Space para lanzar juego
        document.addEventListener('keydown', (e) => {
            const grid = document.getElementById('main-menu-grid');
            if(!grid) return;
            const menuActive = document.getElementById('screen-menu')?.classList.contains('active');
            if(!menuActive) return;

            const focused = document.activeElement;
            const isCard = focused && focused.classList.contains('game-card-v2');

            // Si no hay card enfocada, Tab/flechas comienzan en la primera visible
            if(!isCard) {
                if(['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'].includes(e.key)) {
                    const first = grid.querySelector('.game-card-v2:not(.locked)');
                    if(first) { first.focus(); e.preventDefault(); }
                }
                return;
            }

            // Enter/Space lanza el juego
            if(e.key === 'Enter' || e.key === ' ') {
                const id = focused.dataset.gameId;
                if(id) { e.preventDefault(); this.launch(id); }
                return;
            }

            // Flechas navegan entre cards (calcula columnas por fila)
            const cards = Array.from(grid.querySelectorAll('.game-card-v2'));
            const idx = cards.indexOf(focused);
            if(idx === -1) return;

            // Detectar columnas por bounding box (primer row)
            const firstTop = cards[0].getBoundingClientRect().top;
            let cols = 1;
            for(let i = 1; i < cards.length; i++) {
                if(Math.abs(cards[i].getBoundingClientRect().top - firstTop) < 2) cols++;
                else break;
            }

            let newIdx = idx;
            if(e.key === 'ArrowRight')      newIdx = Math.min(cards.length - 1, idx + 1);
            else if(e.key === 'ArrowLeft')  newIdx = Math.max(0, idx - 1);
            else if(e.key === 'ArrowDown')  newIdx = Math.min(cards.length - 1, idx + cols);
            else if(e.key === 'ArrowUp')    newIdx = Math.max(0, idx - cols);
            else return;

            e.preventDefault();
            cards[newIdx]?.focus();
            cards[newIdx]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
    },

    // ---- Sistema de auto-pausa ----
    _pauseOverlayEl: null,
    _manualPause() {
        const isGame = document.getElementById('screen-game')?.classList.contains('active');
        if(!isGame || this._pauseOverlayEl) return;
        this._autoPause(true);
    },

    _autoPause(manual = false) {
        // Solo pausar si hay un juego activo corriendo
        const isGame = document.getElementById('screen-game')?.classList.contains('active');
        if(!isGame || this._pauseOverlayEl) return;

        // Pausar el background canvas y el juego si tiene método pause
        try { this.canvas.pauseBackground(); } catch(e) {}
        if(this.game && typeof this.game.pause === 'function') {
            try { this.game.pause(); } catch(e) {}
        }

        const overlay = document.createElement('div');
        overlay.id = 'pause-overlay';
        overlay.innerHTML = `
            <div class="pause-panel">
                <div class="pause-icon-ring">
                    <i class="fa-solid fa-pause"></i>
                </div>
                <div class="pause-title">PAUSA</div>
                <div class="pause-sub">${manual ? 'Pausa manual activada' : 'Ventana perdió el foco'}</div>
                <div class="pause-actions">
                    <button class="pause-btn pause-btn-primary" id="pause-resume-btn">
                        <i class="fa-solid fa-play"></i> CONTINUAR
                    </button>
                    <button class="pause-btn pause-btn-danger" id="pause-quit-btn">
                        <i class="fa-solid fa-xmark"></i> ABANDONAR
                    </button>
                </div>
                <div class="pause-hint">ESC · P para continuar   ·   Q para abandonar</div>
            </div>`;
        document.body.appendChild(overlay);
        this._pauseOverlayEl = overlay;

        document.getElementById('pause-resume-btn').onclick = () => this._autoResume();
        document.getElementById('pause-quit-btn').onclick = () => {
            // Abandono directo: quitar overlay sin reanudar el juego y terminar
            if(this._pauseOverlayEl) {
                this._pauseOverlayEl.remove();
                this._pauseOverlayEl = null;
            }
            try { this.canvas.resumeBackground(); } catch(e) {}
            this.audio.playClick();
            this.endGame();
        };
    },

    _autoResume() {
        if(!this._pauseOverlayEl) return;
        this._pauseOverlayEl.classList.add('pause-hiding');
        setTimeout(() => { this._pauseOverlayEl?.remove(); this._pauseOverlayEl = null; }, 250);
        try { this.canvas.resumeBackground(); } catch(e) {}
        if(this.game && typeof this.game.resume === 'function') {
            try { this.game.resume(); } catch(e) {}
        }
    },

    changeState(newState) {
        // Defensivo: limpiar overlay de pausa si sobrevive a un cambio de pantalla
        if(this._pauseOverlayEl) {
            this._pauseOverlayEl.remove();
            this._pauseOverlayEl = null;
            try { this.canvas.resumeBackground(); } catch(e) {}
        }

        // FX: glitch sutil entre pantallas (excepto si venimos de welcome o game)
        const isBigTransition = this._currentState &&
            this._currentState !== CONFIG.STATES.WELCOME &&
            newState !== CONFIG.STATES.WELCOME &&
            this._currentState !== newState;
        if(isBigTransition && this.fx) {
            try { this.fx.screenGlitch(0.24); } catch(e) {}
        }
        this._currentState = newState;

        let nextScreenId = '';
        if(newState === CONFIG.STATES.WELCOME) nextScreenId = 'screen-welcome';
        if(newState === CONFIG.STATES.MENU)    nextScreenId = 'screen-menu';
        if(newState === CONFIG.STATES.GAME)    nextScreenId = 'screen-game';
        if(newState === CONFIG.STATES.SHOP)    nextScreenId = 'screen-shop';
        if(newState === CONFIG.STATES.DAILY)   nextScreenId = 'screen-daily';
        if(newState === CONFIG.STATES.WEEKLY)  nextScreenId = 'screen-weekly';
        if(newState === 'pass')                nextScreenId = 'screen-pass';

        document.querySelectorAll('.screen').forEach(s => {
            if(s.id === nextScreenId) return; // no tocar el destino
            s.classList.remove('active'); 
            setTimeout(() => { 
                if(!s.classList.contains('active')) s.classList.add('hidden'); 
            }, 400); 
        });

        const nextScreen = document.getElementById(nextScreenId);
        if(nextScreen) {
            nextScreen.classList.remove('hidden');
            
            if(newState === CONFIG.STATES.GAME) {
                // Parar música de lobby al iniciar partida
                try { this.audio.stopAmbience(); } catch(e) {}
                // Resetear HUD al entrar en juego
                const valCr = document.getElementById('val-credits');
                if(valCr) valCr.innerText = this.credits;
                const scoreEl = document.getElementById('ui-score');
                if(scoreEl) scoreEl.innerText = '0';
                const streakBadge = document.getElementById('ui-streak');
                if(streakBadge) streakBadge.classList.remove('visible');
            }

            if(newState === CONFIG.STATES.SHOP) {
                document.getElementById('shop-credits').innerText = this.credits;
            }

            requestAnimationFrame(() => { 
                setTimeout(() => { 
                    nextScreen.classList.add('active');
                    nextScreen.classList.add('entering');
                    setTimeout(() => nextScreen.classList.remove('entering'), 350);
                    if(newState === CONFIG.STATES.MENU) {
                        this.renderMenu();
                        this.updateUI();
                        // FX: cascada de aparicion de cards del lobby
                        try {
                            this.fx.cascadeIn('#main-menu-grid .game-card-v2', {
                                y: 12, duration: 0.3, stagger: 0.025
                            });
                        } catch(e) {}
                        // Música generativa de lobby
                        try {
                            const theme = this.shop && this.shop.equipped && this.shop.equipped.theme;
                            this.audio.setAmbience(theme || null);
                        } catch(e) {}
                        // Notificación de racha con animación especial
                        if(this.streak && this.streak.days >= 3) {
                            if(this.streak.days >= 7) {
                                const streakOverlay = document.createElement('div');
                                streakOverlay.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:9998;pointer-events:none;animation:wFadeIn 0.3s ease;';
                                streakOverlay.innerHTML = '<div style="text-align:center;animation:luPop 0.5s cubic-bezier(0.2,0,0,1.5) both;">' +
                                    '<div style="font-family:var(--font-display);font-size:2rem;color:#fbbf24;letter-spacing:4px;text-shadow:0 0 20px #fbbf24;margin-bottom:8px;">RACHA</div>' +
                                    '<div style="font-family:var(--font-display);font-size:1.2rem;color:#fbbf24;letter-spacing:3px;">' + this.streak.days + ' DÍAS</div>' +
                                    '</div>';
                                document.body.appendChild(streakOverlay);
                                setTimeout(() => streakOverlay.remove(), 2000);
                            }
                            setTimeout(() => {
                                const fire = this.streak.days >= 7 ? 'MEGA' : 'HOT';
                                this.showToast(fire + ' RACHA: ' + this.streak.days + ' DÍAS', 'Bonus XP activo · +' + Math.min(50, this.streak.days*5) + ' XP por partida', 'gold');
                            }, 600);
                        }
                    }

                    // FX: cascada en otras pantallas tras el render
                    try {
                        if(newState === CONFIG.STATES.SHOP) {
                            this.fx.cascadeIn('#shop-grid .shop-card-v2', { y: 10, duration: 0.28, stagger: 0.015 });
                        } else if(newState === CONFIG.STATES.DAILY) {
                            this.fx.cascadeIn('#screen-daily .daily-task-v3', { y: 10, duration: 0.3, stagger: 0.06 });
                        } else if(newState === CONFIG.STATES.WEEKLY) {
                            this.fx.cascadeIn('#screen-weekly .daily-task-v3', { y: 10, duration: 0.3, stagger: 0.06 });
                        } else if(newState === 'pass') {
                            // El pass se renderiza con delay de 60ms desde el btn-pass
                            setTimeout(() => {
                                this.fx.cascadeIn('#np-track .np-node', { y: 18, duration: 0.35, stagger: 0.02 });
                            }, 80);
                        }
                    } catch(e) {}
                }, 50); 
            });
        }
    },

    // --- PASE DE BATALLA (delegado a systems/pass.js) ---
    // Se mantienen los nombres originales porque los templates inline
    // de las cards hacen `window.app.showPassTooltip(...)` y compania.
    renderPassScreen()             { return Pass.render(this); },
    showPassTooltip(event, card)   { return Pass.showTooltip(event, card); },
    hidePassTooltip()              { return Pass.hideTooltip(); },
    claimPassReward(lvl)           { return Pass.claim(this, lvl); },

    // --- FUNCION DE INFORMACION (delegado a systems/game-info.js) ---
    // Bug fix real: el `window.event` deprecated desaparece; el unico
    // caller ya llama event.stopPropagation() explicitamente antes.
    showGameInfo(gameId) { return GameInfo.show(this, gameId); },

    // --- UI / LOBBY (delegado a systems/ui.js) ---
    activeFilter: 'ALL',
    lobbySearch:  '',
    toggleFavorite(gameId, e)  { return UI.toggleFavorite(this, gameId, e); },
    setLobbyFilter(cat, btn)   { return UI.setLobbyFilter(this, cat, btn); },
    setLobbySearch(query)      { return UI.setLobbySearch(this, query); },
    clearLobbySearch()         { return UI.clearLobbySearch(this); },



    // --- EASTER EGGS (delegado a systems/easter-eggs.js) ---
    initEasterEggs() { return EasterEggs.init(this); },
    activateKonami() { return EasterEggs.activateKonami(this); },

    // --- TUTORIAL INTERACTIVO (delegado a systems/tutorial.js) ---
    startTutorial()  { return Tutorial.start(this); },

    renderRecommendation() { return UI.renderRecommendation(this); },
    renderMenu()           { return UI.renderMenu(this); },

    // --- RESTO DE FUNCIONES ---

    // Sentinel para distinguir "salí del lobby sin jugar" vs "jugué y saqué 0"
    _EXIT_CLEAN: Symbol('exit_clean'),

    async launch(gameId, GameClass = null) {
        this.audio.playClick();
        const entry = GameClass || this.gameClasses[gameId];
        if(!entry) return;

        this.stats.gamesPlayed++;
        this.activeGameId = gameId;
        this.save();
        this.changeState(CONFIG.STATES.GAME);

        const ui = document.getElementById('game-ui-overlay');
        ui.innerHTML = '';
        ui.removeAttribute('style');

        // Resolver la clase: si es factory async (lazy import) la ejecutamos.
        // Una clase comun es una funcion pero NO es la factory (no tiene prototype.then).
        let ClassRef;
        let _launchLoader = null;
        try {
            if (typeof entry === 'function' && !entry.prototype) {
                // Factory lazy: muestra loader mientras descarga el modulo
                const { showGameLoader, hideGameLoader } = await import('./game-loader.js');
                _launchLoader = showGameLoader('CARGANDO MODULO');
                ClassRef = await entry();
                hideGameLoader(_launchLoader);
                _launchLoader = null;
            } else {
                ClassRef = entry;
            }
        } catch(err) {
            console.error('Error cargando juego', gameId, err);
            if(_launchLoader) {
                const { hideGameLoader } = await import('./game-loader.js').catch(() => ({}));
                if(hideGameLoader) hideGameLoader(_launchLoader);
            }
            this.showToast('ERROR AL CARGAR', 'No se pudo iniciar el juego', 'danger');
            this.endGame();
            return;
        }
        if(!ClassRef) { this.endGame(); return; }

        const EXIT = this._EXIT_CLEAN;

        const onGameOverSmart = (finalScore = EXIT) => {
            const isCleanExit = (finalScore === EXIT || finalScore === null || finalScore === undefined);
            if (!isCleanExit) this.saveHighScore(gameId, finalScore);
            this.showGameOverScreen(
                isCleanExit ? null : finalScore,
                gameId,
                () => { if (this.game && this.game.init) this.game.init(); },
                () => { if (this.game && this.game.cleanup) this.game.cleanup(); this.endGame(); }
            );
        };

        // patchedCallback: garantiza que onQuit solo dispare UNA VEZ
        let _callbackFired = false;
        const patchedCallback = (score) => {
            if (_callbackFired) return;
            _callbackFired = true;
            if (score === 0 && this.game && !this.game._hasStarted) {
                onGameOverSmart(EXIT);
            } else {
                onGameOverSmart(score);
            }
        };

        this.game = new ClassRef(this.canvas, this.audio, patchedCallback);
        this.game.gameId = gameId;
        this.game._hasStarted = false;

        const markStarted = () => { if(this.game) this.game._hasStarted = true; };
        ['startGame','start','startRound','startGameLoop','prepareRound','go','nextRound','nextQuestion'].forEach(method => {
            if(typeof this.game[method] === 'function') {
                const orig = this.game[method].bind(this.game);
                this.game[method] = (...args) => { markStarted(); return orig(...args); };
            }
        });

        // Countdown opcional 3-2-1-GO antes de init() si el setting esta activo
        const doInit = () => { if(this.game && typeof this.game.init === 'function') this.game.init(); };
        if(this.settings.countdown && this.fx) {
            // Color del juego para el countdown
            const gameMeta = CONFIG.GAMES_LIST.find(g => g.id === gameId);
            const color    = gameMeta ? (CONFIG.COLORS[gameMeta.color] || '#3b82f6') : '#3b82f6';
            setTimeout(() => {
                this.fx.countdown({ duration: 0.55, color }).then(() => {
                    if(this.game) doInit();
                });
            }, 100);
        } else {
            setTimeout(doInit, 100);
        }
    },

    endGame() {
        const gId    = this.activeGameId;
        const gScore = (this.game && typeof this.game.score === 'number') ? this.game.score : 0;

        try {
            if (this.game) {
                // Cleanup primero — cancela RAF, intervals y listeners
                if (typeof this.game.cleanup === 'function') this.game.cleanup();

                let xpGain = 10;
                if (gScore > 0) xpGain += Math.min(100, Math.floor(gScore));
                if (this.shop.inventory.includes('up_xp')) xpGain = Math.ceil(xpGain * 1.15);
                this.gainXP(xpGain);

                try { this.submitTournamentScore(gId, gScore); } catch(e) {}
                try { this.updateSeasonStats(gId, gScore); }     catch(e) {}

                if (gScore > 0 && gId) {
                    // Misión diaria
                    try {
                        const task = this.daily.tasks.find(t => t.gameId === gId);
                        if (task && !task.done && gScore >= task.target) {
                            task.done = true;
                            this.showToast('¡MISIÓN CUMPLIDA!', 'Objetivo alcanzado', 'daily');
                            try { for(let i=0;i<3;i++) setTimeout(()=>this.canvas.explode(Math.random()*window.innerWidth, window.innerHeight*0.3, '#f97316'), i*200); } catch(e) {}
                            this.audio.playWin(5);
                            this.save();
                        }
                    } catch(e) {}
                    // Misión semanal
                    try {
                        const wtask = this.weekly.tasks?.find(t => t.gameId === gId);
                        if (wtask && !wtask.done && gScore >= wtask.target) {
                            wtask.done = true;
                            this.showToast('¡MISIÓN SEMANAL!', wtask.label, 'gold');
                            const wDone = this.weekly.tasks.filter(t=>t.done).length;
                            if(wDone === this.weekly.tasks.length) {
                                setTimeout(()=>this.showToast('¡TODAS LAS MISIONES!','Reclama tu recompensa semanal','purple'),1000);
                            }
                            this.save();
                        }
                    } catch(e) {}
                    // Challenge diario especial
                    try {
                        const ch = this.daily.challenge;
                        if (ch && !ch.done && !this.daily.challengeClaimed && ch.gameId === gId) {
                            const target = CONFIG.DAILY_TARGETS[gId] || 10;
                            if (gScore >= target) {
                                ch.done = true;
                                this.showToast('¡DESAFÍO DEL DÍA!', `Modo ${ch.mode} superado · Reclama +${ch.rewardCR} CR`, 'gold');
                                setTimeout(()=>{
                                    try { this.canvas.explode(window.innerWidth/2, window.innerHeight*0.4, ch.color||'#fbbf24'); } catch(e) {}
                                }, 300);
                                this.save();
                            }
                        }
                    } catch(e) {}
                }
                try { this.checkAchievements(); } catch(e) {}
            }
        } catch(e) {
            console.error('endGame error', e);
        }

        this.game = null;
        this.activeGameId = null;
        try { this.audio.setTension(false); } catch(e) {}
        try { this.canvas.setMood(0); } catch(e) {}
        this.changeState(CONFIG.STATES.MENU);
    },

    saveHighScore(gameId, score) {
        if (!gameId || typeof score !== 'number') return;
        
        // Inicializar estructura si no existe
        if (!this.highScores[gameId] || typeof this.highScores[gameId] === 'number') {
            const oldBest = typeof this.highScores[gameId] === 'number' ? this.highScores[gameId] : 0;
            this.highScores[gameId] = { best: oldBest, history: [] };
        }
        
        const entry = this.highScores[gameId];
        
        // Añadir al historial (máximo 10 entradas)
        entry.history.unshift({ score, date: new Date().toLocaleDateString('es', { day:'2-digit', month:'2-digit' }) });
        if (entry.history.length > 10) entry.history.pop();
        
        // Actualizar récord
        if (score > entry.best) {
            entry.best = score;
            this.showToast("¡NUEVO RÉCORD!", `Score: ${score}`, "gold");
            this.audio.playWin(10);
        }
        
        this.save();
    },

    // Helper para obtener el best score independientemente del formato
    getBest(gameId) {
        const entry = this.highScores[gameId];
        if (!entry) return 0;
        if (typeof entry === 'number') return entry;
        return entry.best || 0;
    },


    showLevelUpAnimation(newLevel, newRankName, rankChanged) {
        const overlay = document.createElement('div');
        overlay.id = 'levelup-overlay';
        overlay.style.cssText = [
            'position:fixed', 'inset:0', 'z-index:99998',
            'display:flex', 'align-items:center', 'justify-content:center',
            'background:rgba(0,0,0,0.85)', 'backdrop-filter:blur(8px)',
            'animation:luFadeIn 0.4s ease',
            'cursor:pointer',
        ].join(';');

        const rankColors = CONFIG.RANKS ? [...CONFIG.RANKS].reverse() : [];
        const rankObj    = rankColors.find(r => newLevel >= r.lv) || { name: 'VAGABUNDO' };
        const prevRank   = rankColors.find(r => (newLevel-1) >= r.lv) || rankObj;
        const color      = rankChanged ? '#fbbf24' : 'var(--primary)';

        overlay.innerHTML = '<style>' +
            '@keyframes luFadeIn{from{opacity:0}to{opacity:1}}' +
            '@keyframes luPop{from{opacity:0;transform:scale(0.5)}to{opacity:1;transform:scale(1)}}' +
            '@keyframes luShine{0%,100%{opacity:0.5}50%{opacity:1}}' +
            '</style>' +
            '<div style="text-align:center;padding:40px;">' +
            '<div style="font-size:0.65rem;color:#334155;font-family:monospace;letter-spacing:4px;margin-bottom:16px;">SUBIDA DE NIVEL</div>' +
            '<div style="font-family:var(--font-display);font-size:5rem;color:' + color + ';animation:luPop 0.5s cubic-bezier(0.2,0,0,1.5) 0.2s both;line-height:1;filter:drop-shadow(0 0 30px ' + color + ');">' + newLevel + '</div>' +
            '<div style="font-size:0.7rem;color:#64748b;font-family:monospace;letter-spacing:3px;margin:8px 0 4px;">NIVEL ALCANZADO</div>' +
            (rankChanged ? '<div style="font-family:var(--font-display);font-size:1.1rem;color:#fbbf24;letter-spacing:3px;margin-top:12px;animation:luShine 1s ease infinite;">▲ RANGO: ' + rankObj.name.toUpperCase() + '</div>' : '<div style="font-family:var(--font-display);font-size:0.9rem;color:' + color + '60;letter-spacing:2px;margin-top:8px;">' + rankObj.name.toUpperCase() + '</div>') +
            '<div style="font-size:0.58rem;color:#1e293b;font-family:monospace;margin-top:28px;letter-spacing:2px;">TAP PARA CONTINUAR</div>' +
            '</div>';

        document.body.appendChild(overlay);
        overlay.onclick = () => overlay.remove();
        setTimeout(() => { if(overlay.parentNode) overlay.remove(); }, 4000);

        try { this.audio.playWin(10); } catch(e) {}
        try { this.canvas.explode(window.innerWidth/2, window.innerHeight/2, color); } catch(e) {}
        // FX: celebracion con confetti desde las 4 esquinas + flash global
        try { this.fx.levelUp(newLevel); } catch(e) {}
    },

    showGameOverScreen(score, gameId, onRetry, onQuit) {
        if (score === null || score === undefined) {
            const ui = document.getElementById('game-ui-overlay');
            if(ui) ui.innerHTML = '';
            this.updateUI();
            // Volver al menú inmediatamente — salida limpia sin tarjeta
            if(typeof onQuit === 'function') onQuit();
            return;
        }

        this.setCritical(false);
        const ui = document.getElementById('game-ui-overlay');

        // Lógica de negocio
        const rank = this.calculateRank(gameId, score);
        let prize = 0;
        if(rank === 'S') prize = Math.floor(score * 1.5) + 50;
        else if(rank === 'A') prize = Math.floor(score * 1.2) + 20;
        else if(rank === 'B') prize = Math.floor(score);
        else prize = Math.floor(score * 0.5);
        if (['higher-lower', 'guess-card', 'bio-scan', 'geo-net'].includes(gameId)) prize = 0;
        if (prize > 0 && this.shop.inventory.includes('up_credit')) prize = Math.ceil(prize * 1.10);
        if (prize > 0) { this.credits += prize; this.save(); }
        // Tracking para logros
        if(prize > (this.stats.bestPrize||0)) this.stats.bestPrize = prize;
        if(rank === 'S') {
            this.stats.hasRankS = true;
            this.stats.rankSCount = (this.stats.rankSCount||0) + 1;
        }
        if(new Date().getHours() >= 0 && new Date().getHours() < 4) {
            this.stats.lateGames = (this.stats.lateGames||0) + 1;
        }
        // Trackear stats de juegos nuevos para logros
        if(gameId === 'word-rush') {
            if(score > 0) this.stats.wordRushWins = (this.stats.wordRushWins||0) + 1;
            if(score > (this.stats.wordRushBest||0)) this.stats.wordRushBest = score;
        }
        if(gameId === 'pixel-draw') {
            if(score > 0) this.stats.pixelDrawDone = (this.stats.pixelDrawDone||0) + 1;
            if(score > (this.stats.pixelDrawBest||0)) this.stats.pixelDrawBest = score;
        }
        if(gameId === 'simon-says') {
            if(score > 0) this.stats.simonDone = (this.stats.simonDone||0) + 1;
            if(score > (this.stats.simonBest||0)) this.stats.simonBest = score;
        }
        if(gameId === 'pattern-rush') {
            if(score > 0) this.stats.prDone = (this.stats.prDone||0) + 1;
            if(score > (this.stats.prBest||0)) this.stats.prBest = score;
        }
        if(gameId === 'reaction-chain') {
            if(score > 0) this.stats.rcDone = (this.stats.rcDone||0) + 1;
            if(score > (this.stats.rcBest||0)) this.stats.rcBest = score;
        }
        if(gameId === 'number-grid') {
            if(score > 0) this.stats.numberGridDone = (this.stats.numberGridDone||0) + 1;
            if(score > (this.stats.numberGridBest||0)) this.stats.numberGridBest = score;
        }
        // lateGames se trackea en saveHighScore

        // XP ganado
        let xpGain = 10 + Math.min(100, Math.floor(score));
        if (this.shop.inventory.includes('up_xp')) xpGain = Math.ceil(xpGain * 1.15);
        const prevXP = this.stats.xp;
        const prevLvl = this.stats.level;

        const gameMeta = CONFIG.GAMES_LIST.find(g => g.id === gameId);
        const gameColor = gameMeta ? (CONFIG.COLORS[gameMeta.color] || '#3b82f6') : '#3b82f6';

        const rankData = {
            S: { color: '#fbbf24', label: 'ÉLITE',   sub: 'RENDIMIENTO EXCEPCIONAL', bg: 'rgba(251,191,36,0.06)' },
            A: { color: '#10b981', label: 'EXPERTO', sub: 'MISIÓN COMPLETADA',        bg: 'rgba(16,185,129,0.06)' },
            B: { color: '#3b82f6', label: 'AGENTE',  sub: 'PROTOCOLO EJECUTADO',      bg: 'rgba(59,130,246,0.06)' },
            F: { color: '#ef4444', label: 'CRÍTICO', sub: 'PROTOCOLO FALLIDO',        bg: 'rgba(239,68,68,0.06)'  }
        };
        const rd = rankData[rank] || rankData.F;
        const isGood = rank === 'S' || rank === 'A';

        if(isGood) this.audio.playWin(rank === 'S' ? 10 : 5);
        else this.audio.playLose();

        // Tarjeta de resultado equipada
        const cardStyle = this.shop?.equipped?.callcard || 'default';

        // Badge de referencia del universo de la callcard
        const ccRef = CONFIG.SHOP.find(s=>s.val===cardStyle&&s.type==='CALLCARD');
        const refBadge = (ccRef?.ref) ? `<div class="cod-ref-badge">// ${ccRef.ref}</div>` : '';

        ui.innerHTML = `
        <div class="cod-overlay cc-${cardStyle}" id="cod-overlay">
            <!-- Canvas para efecto de fondo de la callcard -->
            <canvas class="cc-canvas" id="cc-canvas"></canvas>
            ${refBadge}

            <!-- Franja de rango (entra desde la izquierda) -->
            <div class="cod-rank-stripe" id="cod-stripe" style="background:${rd.color}18; border-color:${rd.color}30;">
                <div class="cod-rank-badge" style="color:${rd.color}; border-color:${rd.color}; box-shadow:0 0 40px ${rd.color}40;" id="cod-rank-letter">${rank}</div>
                <div class="cod-rank-texts">
                    <div class="cod-rank-class" style="color:${rd.color};">${rd.label}</div>
                    <div class="cod-rank-sub">${rd.sub}</div>
                </div>
                <div class="cod-game-badge" style="color:${gameColor}; border-color:${gameColor}30;">
                    ${gameMeta ? `<i class="${gameMeta.icon}"></i> ${gameMeta.name.toUpperCase()}` : 'PROTOCOLO'}
                </div>
            </div>

            <!-- Panel de datos (entra desde la derecha) -->
            <div class="cod-data-panel" id="cod-data">

                <!-- Agente -->
                <div class="cod-agent-row fx-reveal">
                    <div class="cod-agent-avatar" style="border-color:${gameColor}50; background:${gameColor}10;">
                        <i class="fa-solid ${this.stats.avatar || 'fa-user-astronaut'}" style="color:${gameColor};"></i>
                    </div>
                    <div class="cod-agent-info">
                        <div class="cod-agent-name">${this.agentName||'AGENTE'}</div>
                        <div class="cod-agent-rank">${this.getRankName(this.stats.level)}</div>
                        ${(() => {
                            const t = CONFIG.TITLES && CONFIG.TITLES.find(t => t.id === this.stats.equippedTitle);
                            return t ? '<div style="font-size:0.52rem;color:#a855f7;font-family:monospace;letter-spacing:1px;margin-top:1px;">' + t.name + '</div>' : '';
                        })()}
                    </div>
                    <div class="cod-agent-level" style="color:${gameColor};">LVL ${this.stats.level}</div>
                </div>

                <!-- Métricas -->
                <div class="cod-metrics fx-reveal">
                    <div class="cod-metric" id="cod-score">
                        <div class="cod-m-label"><i class="fa-solid fa-crosshairs"></i> PUNTUACIÓN</div>
                        <div class="cod-m-val" data-target="${score}">0</div>
                    </div>
                    <div class="cod-metric" id="cod-prize">
                        <div class="cod-m-label"><i class="fa-solid fa-coins"></i> CRÉDITOS</div>
                        <div class="cod-m-val" style="color:var(--gold);" data-target="${prize}">+0</div>
                    </div>
                    <div class="cod-metric" id="cod-xp">
                        <div class="cod-m-label"><i class="fa-solid fa-bolt"></i> XP GANADO</div>
                        <div class="cod-m-val" style="color:#a855f7;" data-target="${xpGain}">+0</div>
                    </div>
                </div>

                <!-- Barra XP -->
                <div class="cod-xp-section fx-reveal">
                    <div class="cod-xp-label">
                        <span>PROGRESIÓN NEURAL</span>
                        <span id="cod-xp-nums">LVL ${prevLvl}</span>
                    </div>
                    <div class="cod-xp-track">
                        <div class="cod-xp-fill" id="cod-xp-bar" style="width:0%; background:linear-gradient(90deg, var(--primary), #a855f7);"></div>
                        <div class="cod-xp-gain-marker" id="cod-xp-marker" style="opacity:0; background:#a855f7;"></div>
                    </div>
                </div>

                <!-- Comparador de rivales -->
                ${(() => {
                    const sortedRivals = [...CONFIG.RIVALS].sort((a,b) => a.xp - b.xp);
                    const playerXP = (this.stats.level * 100) + (this.stats.xp || 0);
                    const beaten   = sortedRivals.filter(r => playerXP >= r.xp);
                    const next     = sortedRivals.find(r => playerXP < r.xp);
                    const scoreBeaten = sortedRivals.filter(r => score >= (r.xp/100));
                    if(!next && !beaten.length) return '';
                    let html = '<div class="cod-rivals">';
                    if(beaten.length > 0) {
                        const top = beaten[beaten.length-1];
                        html += `<div class="cod-rival beaten"><i class="fa-solid fa-trophy" style="color:${top.color};"></i> SUPERASTE A <span style="color:${top.color};">${top.name}</span></div>`;
                    }
                    if(next) {
                        const diff = next.xp - playerXP;
                        html += `<div class="cod-rival next"><i class="fa-solid fa-angle-up"></i> ${diff.toLocaleString()} XP para superar a <span style="color:${next.color};">${next.name}</span></div>`;
                    }
                    html += '</div>';
                    return html;
                })()}

                <!-- Acciones -->
                <div class="cod-actions fx-reveal">
                    <button class="cod-btn cod-btn-secondary" id="univ-quit" title="Salir al menú (ESC · Q)">
                        <i class="fa-solid fa-arrow-left"></i> SALIR
                    </button>
                    <button class="cod-btn cod-btn-secondary" id="univ-share" title="Copiar resultado"
                            style="padding:10px 14px;">
                        <i class="fa-solid fa-share-nodes"></i>
                    </button>
                    <button class="cod-btn cod-btn-primary" id="univ-retry" title="Reintentar (Enter · R)"
                            style="border-color:${rd.color}; color:${rd.color}; background:${rd.color}12;">
                        <i class="fa-solid fa-rotate-right"></i> REINTENTAR
                    </button>
                </div>
                <div class="cod-shortcut-hint">ESC · Q para salir   ·   Enter · R para reintentar</div>

                <div class="cod-footer">ARCADE_OS v3.5 // SESIÓN ${Math.floor(Math.random()*99999).toString().padStart(5,'0')}</div>
            </div>
        </div>`;

        // Iniciar efecto de callcard en canvas de fondo
        this._startCallcardEffect(cardStyle, rd.color);

        // Explosión de partículas en S/A
        if(isGood && this.canvas) {
            setTimeout(() => this.canvas.explode(window.innerWidth*0.5, window.innerHeight*0.5, rd.color), 600);
            if(rank === 'S') {
                setTimeout(() => this.canvas.explode(window.innerWidth*0.25, window.innerHeight*0.5, rd.color), 900);
                setTimeout(() => this.canvas.explode(window.innerWidth*0.75, window.innerHeight*0.5, rd.color), 1100);
            }
        }

        // Animar contadores
        const animateCounter = (el, target, prefix='', duration=1200) => {
            if(!el) return;
            const start = performance.now();
            const isScore = prefix === '';
            const update = (now) => {
                const t = Math.min(1, (now - start) / duration);
                const ease = 1 - Math.pow(1-t, 3);
                const val = Math.floor(ease * target);
                el.textContent = isScore ? val.toLocaleString() : `+${val.toLocaleString()}`;
                if(t < 1) requestAnimationFrame(update);
                else el.textContent = isScore ? target.toLocaleString() : `+${target.toLocaleString()}`;
            };
            requestAnimationFrame(update);
        };

        // Secuencia de animaciones
        setTimeout(() => {
            const stripe = document.getElementById('cod-stripe');
            const data   = document.getElementById('cod-data');
            if(stripe) stripe.classList.add('slide-in');
            if(data)   data.classList.add('slide-in');
            // FX: revelado escalonado de metricas + brillo en victoria
            try {
                if(data) this.fx.gameOverReveal(data, isGood);
            } catch(e) {}
            // Confetti de celebracion segun rango
            try {
                if(rank === 'S') {
                    setTimeout(() => this.fx.confettiBurst('legend'), 450);
                    setTimeout(() => this.fx.confettiSides('legend'), 650);
                } else if(rank === 'A') {
                    setTimeout(() => this.fx.confettiBurst('victory'), 450);
                }
            } catch(e) {}
        }, 100);

        setTimeout(() => animateCounter(document.querySelector('#cod-score .cod-m-val'), score), 600);
        setTimeout(() => animateCounter(document.querySelector('#cod-prize .cod-m-val'), prize, '+'), 900);
        setTimeout(() => animateCounter(document.querySelector('#cod-xp .cod-m-val'), xpGain, '+'), 1100);

        // Animar XP bar
        setTimeout(() => {
            const req = this.getReqXP(prevLvl);
            const startPct = Math.min(100, (prevXP / req) * 100);
            const endXP = prevXP + xpGain;
            const endPct = Math.min(100, (endXP / req) * 100);
            const bar = document.getElementById('cod-xp-bar');
            const marker = document.getElementById('cod-xp-marker');
            const numsEl = document.getElementById('cod-xp-nums');
            if(bar) {
                bar.style.transition = 'none';
                bar.style.width = `${startPct}%`;
                setTimeout(() => {
                    bar.style.transition = 'width 1.2s cubic-bezier(0.4,0,0.2,1)';
                    bar.style.width = `${Math.min(100, endPct)}%`;
                    if(marker) {
                        marker.style.left = `${startPct}%`;
                        marker.style.opacity = '1';
                        setTimeout(() => { marker.style.left=`${Math.min(99, endPct)}%`; marker.style.transition='left 1.2s cubic-bezier(0.4,0,0.2,1)'; }, 50);
                    }
                }, 50);
            }
            if(numsEl) numsEl.textContent = `${Math.floor(prevXP)} → ${Math.floor(prevXP + xpGain)} / ${req} XP`;
        }, 1200);

        // Atajos de teclado: R/Enter = reintentar · ESC/Q = salir al menú
        const cleanupKb = () => window.removeEventListener('keydown', kbHandler, true);
        const doRetry = () => { cleanupKb(); ui.innerHTML = ''; onRetry(); };
        const doQuit  = () => { cleanupKb(); ui.innerHTML = ''; onQuit();  };
        const kbHandler = (e) => {
            if(e.key === 'Enter' || e.key === 'r' || e.key === 'R') { e.preventDefault(); doRetry(); }
            else if(e.key === 'Escape' || e.key === 'q' || e.key === 'Q') { e.preventDefault(); doQuit(); }
        };
        window.addEventListener('keydown', kbHandler, true);
        document.getElementById('univ-retry').onclick = doRetry;
        document.getElementById('univ-quit').onclick  = doQuit;

        // Botón share — captura PNG del callcard via html2canvas (Web Share API si esta disponible, si no descarga)
        // Click largo o shift+click = copiar texto al clipboard (modo rapido)
        const shareBtn = document.getElementById('univ-share');
        if(shareBtn) {
            const copyTextMode = async () => {
                const name = gameMeta ? gameMeta.name : gameId;
                const text = `ARCADED LUXURY · ${name}\nRango: ${rank} · ${rd.label}\nScore: ${score}${prize>0?` · +${prize}$`:''}\nAgente Nv.${this.stats.level}`;
                try {
                    if(navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
                    else {
                        const ta = document.createElement('textarea');
                        ta.value = text; ta.style.position='fixed'; ta.style.left='-9999px';
                        document.body.appendChild(ta); ta.select();
                        document.execCommand('copy'); ta.remove();
                    }
                    this.showToast('TEXTO COPIADO', 'Pegalo donde quieras', 'success');
                } catch(err) {
                    this.showToast('NO SE PUDO COPIAR', 'Intenta de nuevo', 'danger');
                }
            };

            shareBtn.onclick = async (e) => {
                // Shift+click = modo texto rapido
                if(e.shiftKey) { await copyTextMode(); return; }

                const overlay = document.getElementById('cod-overlay');
                const gameName = (gameMeta ? gameMeta.name : gameId).toLowerCase().replace(/\s+/g, '-');
                const filename = `arcaded-${gameName}-${rank}-${score}`;

                shareBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                shareBtn.disabled = true;
                try {
                    const result = await this.fx.shareCallcard(overlay, filename);
                    if(result.ok) {
                        const msg = result.method === 'share' ? 'COMPARTIDO' : 'DESCARGADO';
                        this.showToast(msg, `arcaded-${rank}-${score}.png`, 'success');
                        shareBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                    } else {
                        // Fallback a texto si la captura fallo
                        await copyTextMode();
                        shareBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                    }
                } catch(err) {
                    console.error('share callcard', err);
                    await copyTextMode();
                    shareBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                } finally {
                    shareBtn.disabled = false;
                    setTimeout(() => {
                        if(shareBtn.isConnected) shareBtn.innerHTML = '<i class="fa-solid fa-share-nodes"></i>';
                    }, 1600);
                }
            };
            shareBtn.title = 'Compartir imagen (Shift+Click = copiar texto)';
        }
        this.updateUI();
    },

    updateUI()                        { return UI.updateUI(this); },
    showToast(title, msg, type)       { return UI.showToast(title, msg, type); },
    getRankName(level) { const ranks = [...CONFIG.RANKS].reverse(); const r = ranks.find(r => level >= r.lv); return r ? r.name : "VAGABUNDO"; },
    getReqXP(level) { return Math.floor(100 * level * 1.5); },
    gainXP(amount) { 
        this.stats.xp += amount; 
        let req = this.getReqXP(this.stats.level); 
        let leveledUp = false;
        const prevLevel = this.stats.level;
        while (this.stats.xp >= req) { 
            this.stats.xp -= req; 
            this.stats.level++; 
            req = this.getReqXP(this.stats.level); 
            leveledUp = true; 
        } 
        if (leveledUp) {
            const prevRankName = this.getRankName(prevLevel);
            const newRankName  = this.getRankName(this.stats.level);
            const rankChanged  = prevRankName !== newRankName;
            this.credits += this.stats.level * 10;
            setTimeout(() => this.showLevelUpAnimation(this.stats.level, newRankName, rankChanged), 800);
            this.addNotif('⬆️', 'NIVEL ' + this.stats.level, rankChanged ? 'Nuevo rango: ' + newRankName : 'Sigue así', 'purple');
        } 
        this.save(); 
        this.updateUI(); 
    },
    calculateRank(gameId, score) {
        // Rangos específicos por juego — basados en lo que es realista alcanzar
        const thresholds = {
            // [F_max, B_min, A_min, S_min]
            // score < B_min → F, >= B_min → B, >= A_min → A, >= S_min → S
            'higher-lower':  [0, 10, 25, 50],
            'guess-card':    [0,  3,  8, 15],
            'trivia':        [0, 30, 50, 70],
            'bio-scan':      [0, 30, 50, 70],
            'geo-net':       [0, 20, 40, 65],
            'hyper-reflex':  [0, 500, 700, 850],  // score = 1000 - ms
            'spam-click':    [0, 20, 35, 50],
            'neon-sniper':   [0,  5, 12, 20],
            'orbit-lock':    [0, 15, 30, 50],
            'memory-flash':  [0, 15, 30, 45],
            'vault-cracker': [0,  1,  2,  3],
            'phase-shifter': [0, 15, 30, 50],
            'math-rush':     [0, 15, 30, 50],
            'color-trap':    [0,  4,  8, 12],
            'holo-match':    [0,  1,  2,  3],
            'void-dodger':   [0,  5, 10, 18],
            'glitch-hunt':   [0,  2,  4,  7],
            'orbit-tracker': [0,  8, 15, 22],
            'cyber-typer':   [0,150,300,450],
            'cyber-pong':    [0,  2,  4,  7],
        };
        const t = thresholds[gameId];
        if(!t) {
            // Fallback genérico: porcentaje relativo al target diario
            const target = CONFIG.DAILY_TARGETS[gameId] || 50;
            if(score >= target * 2)   return 'S';
            if(score >= target * 1.2) return 'A';
            if(score >= target * 0.6) return 'B';
            return 'F';
        }
        if(score >= t[3]) return 'S';
        if(score >= t[2]) return 'A';
        if(score >= t[1]) return 'B';
        return 'F';
    },
    saveStat(key, val) { if(!this.stats[key] || val < this.stats[key]) this.stats[key] = val; this.save(); },
    // --- PERFIL / AVATAR / TITULO (delegado a systems/profile.js) ---
    // El bloque showProfile original tenia un bug: referenciaba `globalStatsHTML`
    // sin declararla, lanzando ReferenceError al abrir el modal. La version
    // extraida ya no incluye esa seccion muerta.
    showProfile()           { return Profile.show(this); },
    updateStreak(streakVal) { return Profile.updateStreak(streakVal); },

    // --- CALLCARD EFFECTS (delegado a systems/callcard.js) ---
    // Bug fix real: el objeto effects original tenia 4 claves duplicadas
    // (minecraft, celeste, halflife, portal). En JS la segunda definicion
    // pisa la primera, convirtiendo ~80 lineas en codigo muerto. El modulo
    // extraido solo mantiene la version viva.
    _startCallcardEffect(style) { return Callcard.startEffect(style); },

    setAvatar(icon)   { return Profile.setAvatar(this, icon); },
    setTitle(titleId) { return Profile.setTitle(this, titleId); },
    closeProfile()    { return Profile.close(); },
    // --- MISIONES DIARIAS / SEMANALES (delegado a systems/daily-weekly.js) ---
    checkDailyReset()      { return Missions.checkDailyReset(this); },
    checkWeeklyReset()     { return Missions.checkWeeklyReset(this); },

    checkStreakUpdate() {
        const today    = new Date().toDateString();
        const last     = this.streak.lastDate;
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
        const yStr     = yesterday.toDateString();

        if(last === today) return; // Ya actualizado hoy

        if(last === yStr) {
            // Día consecutivo
            this.streak.days++;
        } else if(last !== today) {
            // Se rompió la racha (o es el primer día)
            this.streak.days = 1;
        }
        this.streak.lastDate = today;
        this.streak.best = Math.max(this.streak.best||0, this.streak.days);

        // Toast de racha
        if(this.streak.days > 1) {
            const bonusXP = Math.min(50, this.streak.days * 5);
            setTimeout(() => {
                this.showToast(`RACHA: ${this.streak.days} DÍAS`, `+${bonusXP} XP bonus`, 'gold');
                this.gainXP(bonusXP);
            }, 1500);
        }
        this.save();
    },

    claimWeekly()           { return Missions.claimWeekly(this); },
    claimDailyChallenge()   { return Missions.claimDailyChallenge(this); },


    // ─── SISTEMA DE NOTIFICACIONES (delegado a systems/notifications.js) ───
    addNotif(icon, title, body, type) { return Notifications.add(this, icon, title, body, type); },



    updateFavicon(themeId) { return Theme.updateFavicon(themeId); },

    editAgentName() {
        const current = this.agentName || 'AGENTE';
        const name = prompt('Nombre de agente (máx. 16 caracteres):', current);
        if(name === null) return;
        // Sanitizacion estricta: solo alfanumericos + espacio/guion/underscore.
        // Antes era solo trim+upper+slice(16), que permitia inyeccion HTML
        // tipo `<SCRIPT>ALERT(1)` (16 chars) en el perfil, callcard y VS mode.
        const clean = (name.trim().toUpperCase().replace(/[^A-Z0-9 _-]/g, '').slice(0, 16)) || 'AGENTE';
        this.agentName = clean;
        this.save();
        this.showProfile();
        this.showToast('IDENTIDAD ACTUALIZADA', clean, 'purple');
        try { this.audio.playWin(3); } catch(e) {}
    },

    markNotifsRead()   { return Notifications.markAllRead(this); },
    renderNotifPanel() { return Notifications.renderPanel(this); },
    showNotifPanel()   { return Notifications.showPanel(this); },



    // ─── MODO 2 JUGADORES LOCAL (delegado a systems/vs-mode.js) ───
    // Bug fix real: el onclick inline de showVsIntro usaba comillas
    // dobles dentro de un string single-quoted (`\"vs-intro\"`), lo que
    // rompia el atributo onclick en el HTML final.
    startVsMode(gameId)              { return Vs.start(this, gameId); },
    showVsIntro()                    { return Vs.showIntro(this); },
    vsPlayTurn(playerNum)            { return Vs.playTurn(this, playerNum); },
    vsRecordScore(playerNum, score)  { return Vs.recordScore(this, playerNum, score); },
    vsShowResult()                   { return Vs.showResult(this); },


    // ─── TEMPORADAS MENSUALES (delegado a systems/season.js) ───
    initSeason()                        { return Season.init(this); },
    resolveSeason()                     { return Season.resolve(this); },
    updateSeasonStats(gameId, score)    { return Season.updateStats(this, gameId, score); },
    renderSeasonPanel()                 { return Season.renderPanel(this); },

    // ─── TORNEOS SEMANALES (delegado a systems/tournament.js) ─
    initTournament()                        { return Tournament.init(this); },
    submitTournamentScore(gameId, score)    { return Tournament.submitScore(this, gameId, score); },
    renderTournamentPanel()                 { return Tournament.renderPanel(this); },

    renderDailyScreen()    { return Missions.renderDailyScreen(this); },
    renderWeeklyScreen()   { return Missions.renderWeeklyScreen(this); },
    // --- LOGROS (delegado a systems/profile.js) ---
    checkAchievements()        { return Profile.checkAchievements(this); },
    showAchievementToast(ach)  { return Profile.showAchievementToast(ach); },

    // ─── INVERSION / MERCADO NEGRO (delegado a systems/invest.js) ─
    // Bug fix real: el checkInvestment original pusheaba al history con
    // `inv.date` / `inv.amount` / `inv.risk` pero `inv` nunca estaba declarada.
    // La version extraida lee `app.invest.*` correctamente antes de mutar.
    checkInvestment()           { return Invest.check(this); },
    makeInvestment(amount, risk){ return Invest.make(this, amount, risk); },
    renderInvestPanel()         { return Invest.renderPanel(this); },

    claimDaily()           { return Missions.claimDaily(this); },
    addScore(pts, cash) { 
        this.credits += cash; 
        if(this.canvas && this.settings.performance) this.canvas.explode(null, null, CONFIG.COLORS.GOLD); 
        this.updateUI(); 
        this.save();
        // Popup flotante de ganancia (cerca del HUD de creditos)
        try {
            if(this.fx && cash > 0) {
                const credEl = document.getElementById('val-credits') || document.getElementById('menu-credits');
                if(credEl) {
                    const r = credEl.getBoundingClientRect();
                    this.fx.scorePopup({
                        x: r.left + r.width / 2,
                        y: r.top - 10,
                        text: '+' + cash.toLocaleString(),
                        color: '#fbbf24',
                        size: cash >= 1000 ? 'large' : 'normal',
                    });
                }
            }
        } catch(e) {}
    },

    // --- CAJAS DE SUMINISTROS (delegado a systems/lootbox.js) ---
    buyLootBox()           { return Lootbox.buy(this); },
    openPremiumBox(boxCfg) { return Lootbox.openPremium(this, boxCfg); },

    // --- MINI CONSOLA DE DEBUG (delegado a systems/dev-console.js) ---
    toggleConsole()            { return DevConsole.toggle(); },
    logConsole(msg, type = '') { return DevConsole.log(msg, type); },
    execCommand(cmd)           { return DevConsole.exec(this, cmd); },
    showFloatingText(text, color) { return DevConsole.showFloatingText(text, color); },
    // --- TEMAS VISUALES (delegado a systems/theme.js) ---
    setCritical(active)  { return Theme.setCritical(active); },
    applyTheme(themeId)  { return Theme.apply(this, themeId); },
};

window.onload = () => app.init();