import { CONFIG } from './config.js';
import { CanvasManager, SeededRandom } from './utils.js';
import { AudioController } from './audio.js'; 
import { ShopSystem } from './shop.js';

// --- JUEGOS ---
import { HigherLowerGame } from './games/higher-lower.js';
import { GuessCardGame } from './games/guess-card.js';
import { TriviaGame } from './games/trivia.js';
import { BioScanGame } from './games/bio-scan.js';
import { GeoNetGame } from './games/geo-net.js';
import { GameReflex } from './games/hyper-reflex.js';
import { SpamClickGame } from './games/spam-click.js';
import { NeonSniperGame } from './games/neon-sniper.js';
import { OrbitLockGame } from './games/orbit-lock.js';
import { MemoryFlashGame } from './games/memory-flash.js';
import { VaultCrackerGame } from './games/vault-cracker.js';
import { PhaseShifterGame } from './games/phase-shifter.js';
import { MathRushGame } from './games/math-rush.js';
import { ColorTrapGame } from './games/color-trap.js';
import { HoloMatchGame } from './games/holo-match.js';
import { VoidDodgerGame } from './games/void-dodger.js';
import { GlitchHuntGame } from './games/glitch-hunt.js';
import { OrbitTrackerGame } from './games/orbit-tracker.js';
import { CyberTyperGame } from './games/cyber-typer.js';
// --- NUEVO JUEGO IMPORTADO ---
import { CyberPongGame } from './games/cyber-pong.js';

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
    daily: { date: '', tasks: [], claimed: false },
    settings: { 
        audio: { master: 0.5, sfx: 1.0, music: 0.5 },
        performance: true 
    },
    lastHovered: null,

    init() {
        this.canvas = new CanvasManager();
        this.audio = new AudioController();
        this.shop = new ShopSystem();
        window.app = this; 

        // Inicializar audio con el primer clic del usuario
        document.addEventListener('click', () => { if(this.audio) this.audio.init(); }, { once: true });

        this.gameClasses = {
            'higher-lower': HigherLowerGame, 'guess-card': GuessCardGame, 'trivia': TriviaGame,
            'bio-scan': BioScanGame, 'geo-net': GeoNetGame, 'hyper-reflex': GameReflex,
            'spam-click': SpamClickGame, 'neon-sniper': NeonSniperGame, 'orbit-lock': OrbitLockGame,
            'memory-flash': MemoryFlashGame, 'vault-cracker': VaultCrackerGame, 'phase-shifter': PhaseShifterGame,
            'math-rush': MathRushGame, 'color-trap': ColorTrapGame, 'holo-match': HoloMatchGame,
            'void-dodger': VoidDodgerGame, 'glitch-hunt': GlitchHuntGame, 'orbit-tracker': OrbitTrackerGame,
            'cyber-typer': CyberTyperGame,
            'cyber-pong': CyberPongGame 
        };

        let save = localStorage.getItem('arcade_save');
        if(save) { 
            try {
                let d = JSON.parse(save); 
                this.credits = d.credits || 100; 
                this.stats = d.stats || this.stats;
                
                // Asegurar inicialización de estadísticas
                if(!this.stats.xp) this.stats.xp = 0;
                if(!this.stats.level) this.stats.level = 1;
                if(!this.stats.avatar) this.stats.avatar = 'fa-user-astronaut';
                if(!this.stats.passClaimed) this.stats.passClaimed = []; 
                if(!this.stats.unlockedGames) this.stats.unlockedGames = []; 
                
                this.highScores = d.highScores || {}; 
                
                if(d.shop) { 
                    this.shop.load(d.shop); 
                    this.applyTheme(this.shop.equipped.theme); 
                }
                if(d.daily) this.daily = d.daily;
                if(d.settings) {
                    if(d.settings.audio) this.audio.vol = d.settings.audio;
                    if(d.settings.performance !== undefined) this.settings.performance = d.settings.performance;
                }
            } catch(e) { console.error("Error cargando save", e); }
        }
        
        // --- PARCHE DE MIGRACIÓN ---
        this.runMigrationFix();
        // ---------------------------

        this.checkDailyReset();
        this.renderMenu();
        this.updateUI();
        
        // Retrasar ligeramente la pantalla de bienvenida para asegurar carga
        setTimeout(() => this.changeState(CONFIG.STATES.WELCOME), 100);
        
        this.setupEventListeners();
    },

    // --- FUNCIÓN DE MIGRACIÓN ---
    runMigrationFix() {
        // Si ya reclamaste el nivel 5 pero no tienes 'cyber-pong' desbloqueado...
        if (this.stats.passClaimed && this.stats.passClaimed.includes(5) && !this.stats.unlockedGames.includes('cyber-pong')) {
            console.log("MIGRATION FIX: Desbloqueando Cyber Pong automáticamente...");
            this.stats.unlockedGames.push('cyber-pong');
            this.save();
        }
        // Aseguramos que unlockedGames sea un array válido siempre
        if (!Array.isArray(this.stats.unlockedGames)) {
            this.stats.unlockedGames = [];
        }
    },

    setupEventListeners() {
        const safeBind = (id, fn) => { const el = document.getElementById(id); if(el) el.onclick = fn; };

        // Botones Principales
        safeBind('btn-start', () => { this.audio.playClick(); this.changeState(CONFIG.STATES.MENU); if(this.shop.equipped.theme) this.audio.playHover(); });
        safeBind('btn-profile', () => this.showProfile());
        safeBind('btn-shop', () => { this.audio.playClick(); this.changeState(CONFIG.STATES.SHOP); this.shop.init(); });
        safeBind('btn-shop-back', () => { this.audio.playClick(); this.changeState(CONFIG.STATES.MENU); });
        safeBind('btn-daily', () => { this.audio.playClick(); this.renderDailyScreen(); this.changeState(CONFIG.STATES.DAILY); });
        safeBind('btn-daily-back', () => { this.audio.playClick(); this.changeState(CONFIG.STATES.MENU); });
        
        // BOTÓN NEON PASS
        safeBind('btn-pass', () => { 
            this.audio.playClick(); 
            this.renderPassScreen(); 
            this.changeState('pass'); 
        });
        safeBind('btn-pass-back', () => { 
            this.audio.playClick(); 
            this.changeState(CONFIG.STATES.MENU); 
        });

        // Modales
        const closeProfileBtn = document.getElementById('btn-close-profile');
        if(closeProfileBtn) closeProfileBtn.onclick = (e) => { e.preventDefault(); this.closeProfile(); };
        
        const closeInfoBtn = document.getElementById('btn-close-info');
        if(closeInfoBtn) closeInfoBtn.onclick = (e) => { e.preventDefault(); document.getElementById('modal-info').classList.add('hidden'); };

        // SETTINGS
        safeBind('btn-settings', () => {
            this.audio.playClick();
            const modal = document.getElementById('modal-settings');
            if(modal) {
                modal.classList.remove('hidden');
                // Actualizar sliders visualmente
                const updateSlider = (id, val) => { const el = document.getElementById(id); if(el) el.value = val * 100; };
                updateSlider('rng-master', this.audio.vol.master);
                updateSlider('rng-sfx', this.audio.vol.sfx);
                updateSlider('rng-music', this.audio.vol.music);
                
                const updateText = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = Math.round(val * 100) + '%'; };
                updateText('val-master', this.audio.vol.master);
                updateText('val-sfx', this.audio.vol.sfx);
                updateText('val-music', this.audio.vol.music);

                const perfCheck = document.getElementById('chk-performance');
                if(perfCheck) perfCheck.checked = this.settings.performance;
            }
        });

        safeBind('btn-close-settings', () => {
            this.audio.playClick();
            const modal = document.getElementById('modal-settings');
            if(modal) modal.classList.add('hidden');
            this.save();
        });

        // Sliders de Audio
        const bindSlider = (id, type, labelId) => {
            const el = document.getElementById(id);
            if(el) {
                el.oninput = (e) => {
                    const val = e.target.value;
                    const label = document.getElementById(labelId);
                    if(label) label.innerText = val + '%';
                    this.audio.setVolume(type, val);
                };
                el.onchange = () => this.audio.playHover(); 
            }
        };
        bindSlider('rng-master', 'master', 'val-master');
        bindSlider('rng-sfx', 'sfx', 'val-sfx');
        bindSlider('rng-music', 'music', 'val-music');

        // Checkbox Performance
        const perfCheck = document.getElementById('chk-performance');
        if(perfCheck) {
            perfCheck.onchange = (e) => {
                this.settings.performance = e.target.checked;
                this.audio.playClick();
            };
        }

        // LOOT BOX
        safeBind('btn-buy-lootbox', () => this.buyLootBox());

        // ABORTAR JUEGO
        safeBind('btn-global-abort', () => { this.audio.playClick(); this.endGame(); });
        safeBind('btn-quit', () => { this.audio.playClick(); this.endGame(); }); // Vinculación extra por seguridad

        // Hover Sounds
        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('.btn, .game-card-btn, .shop-card, .daily-card, .gc-info-btn, .avatar-option, .pass-node');
            if (target) { 
                if (this.lastHovered !== target) { 
                    this.lastHovered = target; 
                    this.audio.playHover(); 
                } 
            } else { 
                this.lastHovered = null; 
            }
        });
        
        // Consola de Depuración
        document.addEventListener('keydown', (e) => { if (e.key === 'F1' || e.code === 'F1') { e.preventDefault(); this.toggleConsole(); } });
        const consoleInput = document.getElementById('console-input');
        if(consoleInput) consoleInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') this.execCommand(e.target.value); });
        const debugTrigger = document.getElementById('debug-trigger');
        if(debugTrigger) debugTrigger.onclick = () => this.toggleConsole();
    },

    changeState(newState) {
        // Ocultar todas las pantallas
        document.querySelectorAll('.screen').forEach(s => { 
            s.classList.remove('active'); 
            setTimeout(() => { 
                if(!s.classList.contains('active')) s.classList.add('hidden'); 
            }, 400); 
        });

        let nextScreenId = '';
        if(newState === CONFIG.STATES.WELCOME) nextScreenId = 'screen-welcome';
        if(newState === CONFIG.STATES.MENU) nextScreenId = 'screen-menu';
        if(newState === CONFIG.STATES.GAME) nextScreenId = 'screen-game';
        if(newState === CONFIG.STATES.SHOP) nextScreenId = 'screen-shop';
        if(newState === CONFIG.STATES.DAILY) nextScreenId = 'screen-daily';
        
        // Estado Neon Pass
        if(newState === 'pass') nextScreenId = 'screen-pass';

        const nextScreen = document.getElementById(nextScreenId);
        if(nextScreen) {
            nextScreen.classList.remove('hidden');
            
            // Lógica específica por pantalla
            if(newState === CONFIG.STATES.GAME) {
                const abortBtn = document.getElementById('btn-global-abort');
                if(abortBtn) abortBtn.style.display = 'block';
                document.getElementById('val-credits').innerText = this.credits;
                const scoreEl = document.getElementById('ui-score');
                if(scoreEl) scoreEl.innerText = '0';
            } else {
                // Ocultar botón abortar si no es juego
                const abortBtn = document.getElementById('btn-global-abort');
                if(abortBtn) abortBtn.style.display = 'none';
            }

            if(newState === CONFIG.STATES.SHOP) {
                document.getElementById('shop-credits').innerText = this.credits;
            }

            // Animación de entrada
            requestAnimationFrame(() => { 
                setTimeout(() => { 
                    nextScreen.classList.add('active'); 
                    if(newState === CONFIG.STATES.MENU) {
                        this.renderMenu(); // Re-renderizar menú al volver para actualizar estados
                        this.updateUI(); 
                    }
                }, 50); 
            });
        }
    },

    // --- LÓGICA DEL PASE DE BATALLA ---
    renderPassScreen() {
        const container = document.getElementById('pass-track');
        if (!container) return;
        
        if (!this.stats.passClaimed) this.stats.passClaimed = [];
        
        const lvlDisplay = document.getElementById('pass-user-level');
        if(lvlDisplay) lvlDisplay.innerText = this.stats.level;
        
        let html = '';
        
        if (CONFIG.BATTLE_PASS) {
            CONFIG.BATTLE_PASS.forEach((node, index) => {
                const isUnlocked = this.stats.level >= node.lvl;
                const isClaimed = this.stats.passClaimed.includes(node.lvl);
                
                let statusClass = 'locked';
                if (isUnlocked) statusClass = 'unlocked';
                if (isClaimed) statusClass = 'unlocked claimed';
                
                let isMilestone = (node.lvl % 10 === 0) || node.lvl === 50 || node.lvl === 5;
                if (isMilestone) statusClass += ' milestone-node';

                if (index > 0) {
                    const prevUnlocked = this.stats.level >= CONFIG.BATTLE_PASS[index-1].lvl;
                    html += `<div class="pass-connector ${prevUnlocked ? 'active' : ''}"></div>`;
                }
                
                let actionBtn = '';
                if (isUnlocked && !isClaimed) {
                    actionBtn = `<button class="btn-claim-pass" onclick="window.app.claimPassReward(${node.lvl})">RECLAMAR</button>`;
                } else if (!isUnlocked) {
                    actionBtn = `<small style="margin-top:10px; color:#64748b; font-family:monospace;"><i class="fa-solid fa-lock"></i> LVL ${node.lvl}</small>`;
                }
                
                let tooltip = `
                    <div class="pass-tooltip">
                        <div class="pt-desc">${node.type}</div>
                        <div class="pt-name">${node.name}</div>
                    </div>
                `;

                html += `
                    <div class="pass-node ${statusClass}">
                        ${tooltip}
                        <div class="pass-level-badge">${node.lvl}</div>
                        <div class="pass-icon"><i class="fa-solid ${node.icon}"></i></div>
                        <div class="pass-info">
                            <h3>${node.name}</h3>
                            ${actionBtn}
                        </div>
                    </div>
                `;
            });
        }
        
        container.innerHTML = html;
        
        setTimeout(() => {
            const firstUnclaimed = container.querySelector('.unlocked:not(.claimed)');
            if(firstUnclaimed) firstUnclaimed.scrollIntoView({ behavior: 'smooth', inline: 'center' });
        }, 300);
    },

    claimPassReward(lvl) {
        const reward = CONFIG.BATTLE_PASS.find(n => n.lvl === lvl);
        if (!reward) return;
        
        if (!this.stats.passClaimed) this.stats.passClaimed = [];
        if (this.stats.passClaimed.includes(lvl)) return;
        
        this.stats.passClaimed.push(lvl);
        
        if (reward.type === 'CREDITS') {
            this.addScore(0, reward.val);
        } 
        else if (reward.type === 'THEME' || reward.type === 'PARTICLE' || reward.type === 'AVATAR' || reward.type === 'HARDWARE') {
            if (!this.shop.inventory.includes(reward.val)) {
                this.shop.inventory.push(reward.val);
            }
        }
        else if (reward.type === 'GAME_UNLOCK') {
            if(!this.stats.unlockedGames) this.stats.unlockedGames = [];
            if(!this.stats.unlockedGames.includes(reward.val)) {
                this.stats.unlockedGames.push(reward.val);
                this.showToast("¡NUEVO JUEGO!", "¡Cyber Pong Desbloqueado!", "gold");
            }
        }
        
        this.audio.playWin(10);
        this.showToast("¡RECOMPENSA DE PASE!", reward.name, "purple");
        if(this.canvas) this.canvas.explode(window.innerWidth/2, window.innerHeight/2, '#d946ef');
        
        this.save();
        this.renderPassScreen(); 
    },

    // --- FUNCIÓN DE INFORMACIÓN (MODAL TÁCTICO) ---
    showGameInfo(gameId) {
        // Detener propagación para no lanzar el juego al dar click en Info
        if(window.event) window.event.stopPropagation();

        this.audio.playClick();
        const info = CONFIG.GAME_INFO[gameId];
        const meta = CONFIG.GAMES_LIST.find(g => g.id === gameId);
        
        if(!info || !meta) return;

        const modal = document.getElementById('modal-info');
        const content = document.getElementById('info-content');
        const color = CONFIG.COLORS[meta.color] || '#fff';

        content.innerHTML = `
            <div class="info-header-tactical" style="border-bottom: 2px solid ${color};">
                <div class="iht-icon" style="color:${color}; text-shadow: 0 0 15px ${color};">
                    <i class="${meta.icon}"></i>
                </div>
                <div>
                    <h2 style="color:white; margin:0; font-size:1.5rem; text-transform:uppercase;">${meta.name}</h2>
                    <small style="color:${color}; letter-spacing:2px;">PROTOCOLO DE MISIÓN</small>
                </div>
            </div>
            
            <div class="info-body-tactical">
                <div class="ibt-row">
                    <div class="ibt-label"><i class="fa-solid fa-crosshairs"></i> OBJETIVO</div>
                    <div class="ibt-val">${info.desc}</div>
                </div>
                
                <div class="ibt-row">
                    <div class="ibt-label"><i class="fa-solid fa-microchip"></i> MECÁNICA</div>
                    <div class="ibt-val">${info.mech}</div>
                </div>

                <div class="ibt-row highlight" style="border-color:${color}40; background:${color}10;">
                    <div class="ibt-label" style="color:${color}"><i class="fa-solid fa-star"></i> CONDICIÓN DE VICTORIA</div>
                    <div class="ibt-val" style="color:white;">${info.obj}</div>
                </div>

                <div class="ibt-stats">
                    <span><i class="fa-solid fa-layer-group"></i> TIPO: <strong>${info.diff || 'Estándar'}</strong></span>
                    <span><i class="fa-solid fa-bolt"></i> XP: <strong>Alto</strong></span>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
    },

    // --- RENDER MENU ---
    renderMenu() {
        const container = document.getElementById('main-menu-grid');
        if(!container) return;
        
        if(!this.stats.unlockedGames) this.stats.unlockedGames = [];

        container.innerHTML = CONFIG.GAMES_LIST.map(g => {
            const color = CONFIG.COLORS[g.color] || '#fff';
            const score = this.highScores[g.id] || 0;
            const rank = this.calculateRank(g.id, score); 
            let rankColor = '#94a3b8'; 
            if(rank === 'S') rankColor = '#fbbf24'; else if(rank === 'A') rankColor = '#10b981'; else if(rank === 'B') rankColor = '#3b82f6'; else if(rank === 'F') rankColor = '#ef4444'; 
            
            const isLocked = g.unlockReq && !this.stats.unlockedGames.includes(g.id);

            if(isLocked) {
                return `<div class="game-card-btn locked" style="border-color: #334155; background: rgba(0,0,0,0.5); opacity:0.7; cursor:not-allowed;">
                    <div class="gc-click-area" onclick="window.app.showToast('ACCESO DENEGADO', 'Nivel 5 de Neon Pass requerido', 'danger')">
                        <div style="font-size:2.5rem; color:#475569; margin-bottom:10px;"><i class="fa-solid fa-lock"></i></div>
                        <span style="color:#64748b;">CLASIFICADO</span>
                        <span style="font-size:0.6rem; opacity:0.6; font-family:monospace; color:#475569;">${g.name}</span>
                    </div>
                </div>`;
            }

            return `<div class="game-card-btn" style="border-color: ${color}; background: ${color}10;">
                <div class="holo-tooltip" style="border-color: ${color}"><span class="ht-label">Récord</span><span class="ht-score" style="text-shadow: 0 0 10px ${color}">${score}</span><div class="ht-rank" style="background:${rankColor}; box-shadow:0 0 10px ${rankColor}">${rank}</div></div>
                <div class="gc-click-area" onclick="window.app.launch('${g.id}')"><div style="font-size:2.5rem; color:${color}; margin-bottom:10px; filter: drop-shadow(0 0 10px ${color});"><i class="${g.icon}"></i></div><span>${g.name}</span><span style="font-size:0.6rem; opacity:0.6; font-family:monospace;">${g.desc}</span></div>
                <button class="gc-info-btn" onclick="window.app.showGameInfo('${g.id}')"><i class="fa-solid fa-info"></i></button>
            </div>`;
        }).join('');
    },

    // --- RESTO DE FUNCIONES ---

    launch(gameId, GameClass = null) {
    this.audio.playClick();
    const ClassRef = GameClass || this.gameClasses[gameId];
    if(!ClassRef) return;
    
    this.stats.gamesPlayed++;
    this.activeGameId = gameId; 
    this.save();
    this.changeState(CONFIG.STATES.GAME);
    
    const ui = document.getElementById('game-ui-overlay');
    ui.innerHTML = '';
    ui.removeAttribute('style'); 

    // --- CORRECCIÓN: El score inicial ahora es null ---
    const onGameOverSmart = (finalScore = null) => {
        // Si el score es null, es una salida limpia, no guardamos récord ni mostramos tarjeta
        if (finalScore !== null) {
            this.saveHighScore(gameId, finalScore);
        }

        this.showGameOverScreen(
            finalScore,
            gameId,
            () => { // REINTENTAR
                if (this.game && this.game.init) this.game.init();
            },
            () => { // SALIR
                if (this.game && this.game.cleanup) this.game.cleanup();
                this.endGame(); 
            }
        );
    };

    this.game = new ClassRef(this.canvas, this.audio, onGameOverSmart);
    this.game.gameId = gameId; 
    
    setTimeout(() => this.game.init(), 100);
},

    endGame() {
        if (this.game) {
            let xpGain = 10;
            if (typeof this.game.score === 'number' && this.game.score > 0) xpGain += Math.min(100, Math.floor(this.game.score));
            
            if (this.shop.inventory.includes('up_xp')) {
                xpGain = Math.ceil(xpGain * 1.15); 
            }
            
            this.gainXP(xpGain);
            if (typeof this.game.score === 'number' && this.activeGameId) {
                const task = this.daily.tasks.find(t => t.gameId === this.activeGameId);
                if (task && !task.done && this.game.score >= task.target) {
                    task.done = true;
                    this.showToast("¡MISIÓN CUMPLIDA!", "Objetivo alcanzado", "daily");
                    this.audio.playWin(5);
                    this.save();
                }
            }
            if(this.game.timerInterval) clearInterval(this.game.timerInterval);
            if(this.game.animationId) cancelAnimationFrame(this.game.animationId);
            if(this.game.cleanup) this.game.cleanup();
        }
        this.game = null;
        this.activeGameId = null;
        this.canvas.setMood(0);
        this.changeState(CONFIG.STATES.MENU);
    },

    saveHighScore(gameId, score) {
        if (!gameId || typeof score !== 'number') return;
        const current = this.highScores[gameId] || 0;
        if (score > current) { 
            this.highScores[gameId] = score; 
            this.showToast("¡NUEVO RÉCORD!", `Score: ${score}`, "gold"); 
            this.audio.playWin(10); 
            this.save(); 
        }
    },

    showGameOverScreen(score, gameId, onRetry, onQuit) {
    // 🛡️ PROTOCOLO DE SEGURIDAD NEURO-ATLAS
    // Si no hay score (null o undefined), es una salida manual del lobby del juego.
    if (score === null || score === undefined) {
        const ui = document.getElementById('game-ui-overlay');
        if(ui) ui.innerHTML = ''; // Limpiamos rastro del menú del juego
        
        const globalAbortBtn = document.getElementById('btn-global-abort');
        if(globalAbortBtn) globalAbortBtn.style.display = 'block';
        
        this.updateUI();
        return; // Matamos la ejecución aquí para que no salga la carta de COD
    }

    this.setCritical(false);
    const ui = document.getElementById('game-ui-overlay');
    const globalAbortBtn = document.getElementById('btn-global-abort');

    if(globalAbortBtn) globalAbortBtn.style.display = 'none';

    // LÓGICA DE NEGOCIO (Créditos y Rango)
    const rank = this.calculateRank(gameId, score);
    let prize = 0;
    
    // ... (Mantén tu lógica de premios igual aquí debajo) ...
    if(rank === 'S') prize = Math.floor(score * 1.5) + 50;
    else if(rank === 'A') prize = Math.floor(score * 1.2) + 20;
    else if(rank === 'B') prize = Math.floor(score);
    else prize = Math.floor(score * 0.5);
    
    if (['higher-lower', 'guess-card', 'bio-scan', 'geo-net'].includes(gameId)) prize = 0; 
    if (prize > 0 && this.shop.inventory.includes('up_credit')) prize = Math.ceil(prize * 1.10);

    if (prize > 0) { this.credits += prize; this.save(); }
    if(rank === 'S' || rank === 'A') this.audio.playWin(5); else this.audio.playLose();

    // RENDERIZADO DE LA TARJETA
    ui.innerHTML = `
        <div class="report-overlay">
            <div class="mission-report rank-${rank.toLowerCase()}">
                <div class="report-header">
                    <span class="report-title">// REPORTE DE MISIÓN</span>
                </div>
                <div class="report-body">
                    <div class="report-rank-wrapper">
                        <div class="rank-circle">${rank}</div>
                        <div class="rank-label">RENDIMIENTO ${rank === 'F' ? 'CRÍTICO' : 'EXCELENTE'}</div>
                    </div>
                    <h2 class="agent-title">${this.getRankName(this.stats.level)}</h2>
                    <div class="report-stats">
                        <div class="stat-item">
                            <small>PUNTUACIÓN</small>
                            <div class="stat-value">${score}</div>
                        </div>
                        <div class="stat-item highlight">
                            <small>GANANCIA</small>
                            <div class="stat-value">+$${prize}</div>
                        </div>
                    </div>
                    <div class="report-actions">
                        <button class="btn btn-secondary" id="univ-quit">SALIR</button>
                        <button class="btn btn-primary" id="univ-retry">
                            <i class="fa-solid fa-rotate-right"></i> REINTENTAR
                        </button>
                    </div>
                </div>
                <div class="report-footer">ID: AGENT-${Math.floor(Math.random()*999)} // ARCADE_OS_V3</div>
            </div>
        </div>
    `;

    const cleanup = () => { ui.innerHTML = ''; if(globalAbortBtn) globalAbortBtn.style.display = 'block'; };
    document.getElementById('univ-retry').onclick = () => { cleanup(); onRetry(); };
    document.getElementById('univ-quit').onclick = () => { cleanup(); onQuit(); };
    
    this.updateUI();
},

    updateUI() {
        const els = { credits: document.getElementById('menu-credits'), valCredits: document.getElementById('val-credits'), level: document.getElementById('player-level'), rank: document.getElementById('player-rank'), xpBar: document.getElementById('xp-bar'), xpText: document.getElementById('xp-text'), profileIcon: document.querySelector('#btn-profile i') };
        if(els.credits) els.credits.innerText = this.credits; if(els.valCredits) els.valCredits.innerText = this.credits;
        const lvl = this.stats.level || 1; const xp = this.stats.xp || 0; const req = this.getReqXP(lvl); const pct = Math.min(100, (xp / req) * 100);
        if(els.level) els.level.innerText = lvl; if(els.rank) els.rank.innerText = this.getRankName(lvl).toUpperCase(); if(els.xpBar) els.xpBar.style.width = `${pct}%`; if(els.xpText) els.xpText.innerText = `${Math.floor(xp)} / ${req} XP`;
        if(els.profileIcon && this.stats.avatar) els.profileIcon.className = `fa-solid ${this.stats.avatar}`;
    },
    showToast(title, msg, type = 'default') {
        const container = document.getElementById('toast-container'); if(!container) return;
        const el = document.createElement('div'); el.className = `toast ${type}`;
        let icon = '🔔'; if(type === 'gold') icon = '🏆'; else if(type === 'purple') icon = '🆙'; else if(type === 'daily') icon = '📅'; else if(type === 'success') icon = '✅'; else if(type === 'danger') icon = '💀';
        el.innerHTML = `<div class="toast-icon">${icon}</div><div class="toast-content"><span class="toast-title">${title}</span>${msg ? `<span class="toast-msg">${msg}</span>` : ''}</div>`;
        container.appendChild(el); setTimeout(() => { el.style.animation = 'slideOut 0.3s forwards'; setTimeout(() => el.remove(), 300); }, 3000);
    },
    getRankName(level) { const ranks = [...CONFIG.RANKS].reverse(); const r = ranks.find(r => level >= r.lv); return r ? r.name : "VAGABUNDO"; },
    getReqXP(level) { return Math.floor(100 * level * 1.5); },
    gainXP(amount) { 
        this.stats.xp += amount; 
        let req = this.getReqXP(this.stats.level); 
        let leveledUp = false; 
        while (this.stats.xp >= req) { 
            this.stats.xp -= req; 
            this.stats.level++; 
            req = this.getReqXP(this.stats.level); 
            leveledUp = true; 
        } 
        if (leveledUp) { 
            this.audio.playWin(10); 
            this.showToast(`¡NIVEL ${this.stats.level} ALCANZADO!`, "¡Rango Subido!", "purple"); 
            this.credits += this.stats.level * 10; 
        } 
        this.save(); 
        this.updateUI(); 
    },
    calculateRank(gameId, score) { const target = CONFIG.DAILY_TARGETS[gameId] || 50; if (gameId === 'hyper-reflex') { if (score > 0 && score < 200) return 'S'; if (score < 300) return 'A'; if (score < 400) return 'B'; return 'F'; } if (score >= target * 2) return 'S'; if (score >= target * 1.5) return 'A'; if (score >= target) return 'B'; return 'F'; },
    saveStat(key, val) { if(!this.stats[key] || val < this.stats[key]) this.stats[key] = val; this.save(); },
    showProfile() { const modal = document.getElementById('modal-profile'); modal.classList.remove('hidden'); const playerEntry = { name: "TÚ", xp: this.stats.xp, isPlayer: true }; const allRivals = [...(CONFIG.RIVALS||[]), playerEntry]; allRivals.sort((a, b) => b.xp - a.xp); const leaderboardRows = allRivals.map((r, idx) => `<div class="leaderboard-row ${r.isPlayer ? 'player' : ''}"><div class="lb-rank">#${idx + 1}</div><div class="lb-name" style="color:${r.color || 'white'}">${r.name}</div><div class="lb-xp">${r.xp.toLocaleString()} XP</div></div>`).join(''); const achievementsHTML = CONFIG.ACHIEVEMENTS.map(ach => { const unlocked = ach.check(Object.assign({credits:this.credits, bestReflex: this.highScores['hyper-reflex']||0}, this.stats)); return `<div class="achievement ${unlocked?'unlocked':''}"><span>${ach.icon}</span><small>${ach.name}</small></div>`; }).join(''); const avatarsHTML = CONFIG.AVATARS.map(icon => `<div class="avatar-option ${this.stats.avatar === icon ? 'selected' : ''}" onclick="window.app.setAvatar('${icon}')"><i class="fa-solid ${icon}"></i></div>`).join(''); modal.innerHTML = `<div class="profile-panel"><div style="text-align:center;"><h2 style="margin:0; font-size:2rem; color:white;">AGENTE</h2><div style="color:var(--primary);">${this.getRankName(this.stats.level)}</div></div><div class="stats-row"><div class="stat-card"><small>JUEGOS</small><span>${this.stats.gamesPlayed}</span></div><div class="stat-card"><small>CRÉDITOS</small><span style="color:var(--gold)">$${this.credits}</span></div></div><div><div class="section-title">AVATAR</div><div class="avatar-grid">${avatarsHTML}</div></div><div><div class="section-title">LOGROS</div><div class="achievement-grid">${achievementsHTML}</div></div><div><div class="section-title">RANKING</div><div class="highscore-list">${leaderboardRows}</div></div><button class="btn" onclick="window.app.closeProfile()" style="margin-top:10px; width:100%;">CERRAR</button></div>`; },
    setAvatar(icon) { this.stats.avatar = icon; this.audio.playClick(); this.showProfile(); this.updateUI(); this.save(); },
    closeProfile() { document.getElementById('modal-profile').classList.add('hidden'); },
    save() { localStorage.setItem('arcade_save', JSON.stringify({ credits: this.credits, stats: this.stats, highScores: this.highScores, shop: { inventory: this.shop.inventory, equipped: this.shop.equipped }, daily: this.daily, settings: { audio: this.audio.vol, performance: this.settings.performance } })); },
    checkDailyReset() { const today = new Date().toDateString(); if (this.daily.date !== today || this.daily.tasks.length === 0) { this.daily.date = today; this.daily.claimed = false; this.daily.tasks = []; const rng = new SeededRandom(parseInt(today.replace(/\D/g,'')) || Date.now()); const gameIds = Object.keys(this.gameClasses); while(this.daily.tasks.length < 3) { const gid = gameIds[Math.floor(rng.next() * gameIds.length)]; if (!this.daily.tasks.find(t => t.gameId === gid)) this.daily.tasks.push({ gameId: gid, target: CONFIG.DAILY_TARGETS[gid] || 10, done: false }); } this.save(); } },
    renderDailyScreen() { this.canvas.setMood('DAILY'); const completedCount = this.daily.tasks.filter(t => t.done).length; const progressPct = (completedCount / 3) * 100; const allDone = this.daily.tasks.every(t => t.done); const container = document.getElementById('screen-daily'); if(!container) return; let html = `<div class="daily-panel"><div class="daily-header"><div><h2 style="color:#f97316; margin:0; font-size:1.5rem;">PROTOCOLO DIARIO</h2><small style="color:#94a3b8;">Sincronización Neural: ${completedCount}/3</small></div><div style="text-align:right;"><div style="font-size:0.8rem; color:#94a3b8;">RECOMPENSA</div><div style="color:var(--gold); font-weight:bold;">500 CR</div></div></div><div class="mission-progress-track"><div class="mission-progress-fill" style="width: ${progressPct}%"></div></div><div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">`; html += this.daily.tasks.map((task, idx) => { const meta = CONFIG.GAMES_LIST.find(g => g.id === task.gameId) || {name: task.gameId, icon: 'fa-gamepad'}; const statusIcon = task.done ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-lock"></i>'; const statusClass = task.done ? 'done' : ''; const statusColor = task.done ? '#10b981' : '#f97316'; let iconHtml = meta.icon.includes('fa-') ? `<i class="${meta.icon}"></i>` : meta.icon; return `<div class="daily-card ${statusClass}" onclick="window.app.launchDaily('${task.gameId}')" style="border-left: 4px solid ${statusColor};"><div class="d-icon" style="background:transparent; border:1px solid ${statusColor}; color:${statusColor}; width:35px; height:35px; font-size:1rem;">${idx + 1}</div><div class="d-info"><h3 style="display:flex; align-items:center; gap:10px;"><span style="color:${statusColor}">${iconHtml}</span> ${meta.name}</h3><small style="font-family:monospace; opacity:0.7;">OBJETIVO: <span style="color:white;">${task.target} Pts</span></small></div><div class="d-status" style="color:${statusColor}; font-size:1.2rem;">${statusIcon}</div></div>`; }).join(''); const btnText = this.daily.claimed ? '<i class="fa-solid fa-check-double"></i> COMPLETADO' : (allDone ? '<i class="fa-solid fa-gift"></i> RECLAMAR 500 CR' : '<i class="fa-solid fa-lock"></i> BLOQUEADO'); const btnClass = (allDone && !this.daily.claimed) ? 'btn pulse' : 'btn'; const btnDisabled = (!allDone || this.daily.claimed) ? 'disabled' : ''; const btnStyle = (allDone && !this.daily.claimed) ? 'background:#f97316; border-color:#f97316; color:white;' : 'opacity:0.5;'; html += `</div><div style="display:flex; gap:10px; margin-top:20px;"><button id="btn-daily-back-panel" class="btn btn-secondary" style="flex:1;">VOLVER</button><button id="btn-daily-claim-panel" class="${btnClass}" style="flex:2; ${btnStyle}" ${btnDisabled}>${btnText}</button></div><div class="reward-preview" style="margin-top:15px; padding:10px; border:none; background:transparent;"><small style="color:#fbbf24; opacity:0.6;">${this.daily.claimed ? 'RECOMPENSA OBTENIDA' : 'CAJA DE SUMINISTROS PENDIENTE'}</small></div></div>`; container.innerHTML = html; document.getElementById('btn-daily-back-panel').onclick = () => { this.audio.playClick(); this.changeState(CONFIG.STATES.MENU); }; const claimBtn = document.getElementById('btn-daily-claim-panel'); if(allDone && !this.daily.claimed) { claimBtn.onclick = () => this.claimDaily(); } },
    launchDaily(gameId) { this.launch(gameId); },
    claimDaily() { if(this.daily.claimed) return; this.daily.claimed = true; this.addScore(0, 500); this.audio.playWin(10); this.showToast("¡RECOMPENSA RECLAMADA!", "Has ganado 500 Créditos", "gold"); this.renderDailyScreen(); this.save(); },
    addScore(pts, cash) { 
        this.credits += cash; 
        if(this.canvas && this.settings.performance) this.canvas.explode(null, null, CONFIG.COLORS.GOLD); 
        this.updateUI(); 
        this.save(); 
    },
    toggleConsole() { const c = document.getElementById('debug-console'); if(!c) return; if (c.classList.contains('hidden')) { c.classList.remove('hidden'); document.getElementById('console-input').focus(); } else { c.classList.add('hidden'); } },
    logConsole(msg, type='') { const out = document.getElementById('console-output'); out.innerHTML += `<div class="console-msg ${type}">${msg}</div>`; out.scrollTop = out.scrollHeight; },
    execCommand(cmd) { this.logConsole(`> ${cmd}`); document.getElementById('console-input').value = ''; const parts = cmd.toLowerCase().trim().split(' '); if(parts[0] === 'rich') { this.credits += 1000; this.updateUI(); this.logConsole("RICH MODE ACTIVATED", "sys"); } if(parts[0] === 'reset') { localStorage.removeItem('arcade_save'); location.reload(); } if(parts[0] === 'help') { this.logConsole("COMMANDS: help, rich, reset, clear", "sys"); } if(parts[0] === 'clear') { document.getElementById('console-output').innerHTML = ''; } },
    setCritical(active) { const vign = document.querySelector('.vignette'); if(vign) { if(active) vign.classList.add('critical'); else vign.classList.remove('critical'); } },
    applyTheme(themeId) { document.body.className = document.body.className.replace(/t_[a-z]+/g, "").trim(); if (themeId && themeId !== 't_default') document.body.classList.add(themeId); }
};

window.onload = () => app.init();