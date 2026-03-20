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

        // ABORTAR JUEGO — ahora solo btn-quit en el HUD
        safeBind('btn-quit', () => { this.audio.playClick(); this.endGame(); });

        // Hover Sounds
        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('.btn, .nav-tab, .game-card-v2, .shop-card-v2, .daily-card, .gcv2-info, .pv2-avatar-opt, .np-card, .sc-btn, .scv2-btn');
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

        // Escape y P para pausar/reanudar durante el juego
        document.addEventListener('keydown', (e) => {
            const isGame = document.getElementById('screen-game')?.classList.contains('active');
            if(!isGame) return;
            if(e.code === 'Escape' || e.code === 'KeyP') {
                e.preventDefault();
                if(this._pauseOverlayEl) this._autoResume();
                else this._manualPause();
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
                <div class="pause-hint">ESC · P para continuar</div>
            </div>`;
        document.body.appendChild(overlay);
        this._pauseOverlayEl = overlay;

        document.getElementById('pause-resume-btn').onclick = () => this._autoResume();
        document.getElementById('pause-quit-btn').onclick = () => {
            this._autoResume();
            setTimeout(() => { const btn = document.getElementById('btn-quit'); if(btn) btn.click(); }, 100);
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
        if(newState === 'pass') nextScreenId = 'screen-pass';

        const nextScreen = document.getElementById(nextScreenId);
        if(nextScreen) {
            nextScreen.classList.remove('hidden');
            
            if(newState === CONFIG.STATES.GAME) {
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
                    if(newState === CONFIG.STATES.MENU) {
                        this.renderMenu();
                        this.updateUI(); 
                    }
                }, 50); 
            });
        }
    },

    // --- LÓGICA DEL PASE DE BATALLA ---
    renderPassScreen() {
        if (!this.stats.passClaimed) this.stats.passClaimed = [];

        // --- CABECERA: nivel y XP ---
        const lvl = this.stats.level || 1;
        const xp  = this.stats.xp    || 0;
        const req = this.getReqXP(lvl);
        const pct = Math.min(100, (xp / req) * 100);

        const lvlEl   = document.getElementById('np-level');
        const fillEl  = document.getElementById('np-xp-fill');
        const glowEl  = document.getElementById('np-xp-glow');
        const textEl  = document.getElementById('np-xp-text');
        if(lvlEl)  lvlEl.innerText   = lvl;
        if(fillEl) fillEl.style.width = `${pct}%`;
        if(glowEl) glowEl.style.width = `${pct}%`;
        if(textEl) textEl.innerText  = `${Math.floor(xp)} / ${req} XP`;

        // --- BADGE de reclamables ---
        const claimable = CONFIG.BATTLE_PASS.filter(n =>
            lvl >= n.lvl && !this.stats.passClaimed.includes(n.lvl)
        ).length;
        const badge = document.getElementById('np-claimable-badge');
        const countEl = document.getElementById('np-claimable-count');
        if(badge) badge.classList.toggle('visible', claimable > 0);
        if(countEl) countEl.innerText = claimable;

        // --- TRACK ---
        const container = document.getElementById('np-track');
        if (!container) return;

        const rarityLabels = {
            common: 'Común', rare: 'Raro', epic: 'Épico', legendary: 'Legendario'
        };
        const typeLabels = {
            CREDITS: 'Créditos', PARTICLE: 'Efecto FX', THEME: 'Tema',
            AVATAR: 'Avatar', HARDWARE: 'Mejora Pasiva', GAME_UNLOCK: 'Juego'
        };

        let html = '';
        CONFIG.BATTLE_PASS.forEach((node, idx) => {
            const isUnlocked = lvl >= node.lvl;
            const isClaimed  = this.stats.passClaimed.includes(node.lvl);
            const rarity     = node.rarity || 'common';

            // Conector
            if (idx > 0) {
                const prevUnlocked = lvl >= CONFIG.BATTLE_PASS[idx-1].lvl;
                html += `<div class="np-connector ${prevUnlocked ? 'active' : ''}"></div>`;
            }

            // Acción
            let action = '';
            if (isUnlocked && !isClaimed) {
                action = `<button class="np-btn-claim" onclick="event.stopPropagation(); window.app.claimPassReward(${node.lvl})">
                    <i class="fa-solid fa-gift"></i> RECLAMAR
                </button>`;
            } else if (!isUnlocked) {
                action = `<div class="np-type-badge" style="margin-top:4px;">
                    <i class="fa-solid fa-lock" style="font-size:0.6rem;"></i> NVL ${node.lvl}
                </div>`;
            }

            const delayMs = idx * 35;
            html += `
                <div class="np-node">
                    <div class="np-card rarity-${rarity} ${isUnlocked ? 'unlocked' : ''} ${isClaimed ? 'claimed' : ''}"
                         style="animation-delay:${delayMs}ms"
                         data-lvl="${node.lvl}"
                         data-rarity="${rarity}"
                         data-name="${node.name}"
                         data-type="${typeLabels[node.type] || node.type}"
                         data-desc="${node.desc || ''}"
                         onmouseenter="window.app.showPassTooltip(event, this)"
                         onmouseleave="window.app.hidePassTooltip()">
                        <div class="np-level-badge">LVL ${node.lvl}</div>
                        <div class="np-rarity-dot"></div>
                        <div class="np-reward-icon">
                            <i class="${node.icon.includes(' ') ? node.icon : 'fa-solid ' + node.icon}"></i>
                        </div>
                        <div class="np-reward-name">${node.name}</div>
                        <div class="np-type-badge">${typeLabels[node.type] || node.type}</div>
                        ${action}
                    </div>
                </div>`;
        });

        container.innerHTML = html;

        // Auto-scroll al primer reclamable, o al primer bloqueado
        setTimeout(() => {
            const firstClaim = container.querySelector('.unlocked:not(.claimed) .np-btn-claim');
            const target = firstClaim ? firstClaim.closest('.np-node') : container.querySelector('.np-card:not(.unlocked)');
            if(target) {
                target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }, 200);
    },

    // Tooltip del pass
    showPassTooltip(event, card) {
        const tt = document.getElementById('np-tooltip');
        if (!tt) return;
        const rarity  = card.dataset.rarity;
        const rarityColors = { common: '#64748b', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b' };
        const rarityLabels = { common: 'COMÚN', rare: 'RARO', epic: 'ÉPICO', legendary: 'LEGENDARIO' };
        tt.querySelector('#np-tt-rarity').style.color = rarityColors[rarity] || '#fff';
        tt.querySelector('#np-tt-rarity').innerText   = rarityLabels[rarity] || rarity.toUpperCase();
        tt.querySelector('#np-tt-name').innerText     = card.dataset.name;
        tt.querySelector('#np-tt-type').innerText     = card.dataset.type;
        tt.querySelector('#np-tt-desc').innerText     = card.dataset.desc;
        tt.style.borderColor = (rarityColors[rarity] || '#fff') + '40';
        // Posicionar encima del card
        const rect = card.getBoundingClientRect();
        tt.style.left = `${rect.left + rect.width / 2 - 90}px`;
        tt.style.top  = `${rect.top - 110}px`;
        tt.classList.add('visible');
    },
    hidePassTooltip() {
        const tt = document.getElementById('np-tooltip');
        if(tt) tt.classList.remove('visible');
    },

    claimPassReward(lvl) {
        const reward = CONFIG.BATTLE_PASS.find(n => n.lvl === lvl);
        if (!reward) return;
        if (!this.stats.passClaimed) this.stats.passClaimed = [];
        if (this.stats.passClaimed.includes(lvl)) return;

        this.stats.passClaimed.push(lvl);

        if (reward.type === 'CREDITS') {
            this.addScore(0, reward.val);
        } else if (['THEME','PARTICLE','AVATAR','HARDWARE'].includes(reward.type)) {
            if (!this.shop.inventory.includes(reward.val)) this.shop.inventory.push(reward.val);
        } else if (reward.type === 'GAME_UNLOCK') {
            if(!this.stats.unlockedGames) this.stats.unlockedGames = [];
            if(!this.stats.unlockedGames.includes(reward.val)) {
                this.stats.unlockedGames.push(reward.val);
                this.showToast("¡JUEGO DESBLOQUEADO!", "Cyber Pong disponible", "gold");
            }
        }

        // Efectos por rareza
        const rarityColors = {
            common: '#64748b', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b'
        };
        const color = rarityColors[reward.rarity] || '#d946ef';

        if (reward.rarity === 'legendary') {
            this.audio.playWin(10);
            // Triple explosión para legendary
            setTimeout(() => this.canvas.explode(window.innerWidth*0.3, window.innerHeight*0.5, color), 0);
            setTimeout(() => this.canvas.explode(window.innerWidth*0.5, window.innerHeight*0.3, '#ffffff'), 150);
            setTimeout(() => this.canvas.explode(window.innerWidth*0.7, window.innerHeight*0.5, color), 300);
        } else if (reward.rarity === 'epic') {
            this.audio.playWin(7);
            this.canvas.explode(window.innerWidth/2, window.innerHeight/2, color);
        } else {
            this.audio.playWin(3);
            this.canvas.explode(window.innerWidth/2, window.innerHeight/2, color);
        }

        const rarityLabel = { common:'COMÚN', rare:'RARO', epic:'ÉPICO', legendary:'LEGENDARIO' };
        this.showToast(`[${rarityLabel[reward.rarity]||''}] ${reward.name}`, reward.desc || '', 'purple');

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
            const color    = CONFIG.COLORS[g.color] || '#fff';
            const score    = this.getBest(g.id);
            const rank     = this.calculateRank(g.id, score);
            const rankColors = { S:'#fbbf24', A:'#10b981', B:'#3b82f6', F:'#ef4444' };
            const rankColor  = rankColors[rank] || '#475569';
            const isLocked   = g.unlockReq && !this.stats.unlockedGames.includes(g.id);

            if(isLocked) {
                return `
                    <div class="game-card-v2 locked"
                         onclick="window.app.showToast('ACCESO DENEGADO','Neon Pass Nivel 5 requerido','danger')">
                        <div class="gcv2-body">
                            <div class="gcv2-icon" style="color:#334155;font-size:1.8rem;">
                                <i class="fa-solid fa-lock"></i>
                            </div>
                            <div class="gcv2-name" style="color:#334155;">CLASIFICADO</div>
                            <div class="gcv2-desc">${g.name}</div>
                        </div>
                    </div>`;
            }

            return `
                <div class="game-card-v2"
                     style="border-color:${color}25; --gc:${color};"
                     onmouseenter="this.style.borderColor='${color}60'; this.style.boxShadow='0 8px 24px ${color}20';"
                     onmouseleave="this.style.borderColor='${color}25'; this.style.boxShadow='';">
                    <button class="gcv2-info" onclick="event.stopPropagation(); window.app.showGameInfo('${g.id}')">
                        <i class="fa-solid fa-info"></i>
                    </button>
                    <div class="gcv2-body" onclick="window.app.launch('${g.id}')">
                        <div class="gcv2-icon" style="color:${color};">
                            <i class="${g.icon}"></i>
                        </div>
                        <div class="gcv2-name">${g.name}</div>
                        <div class="gcv2-desc">${g.desc}</div>
                    </div>
                    <div class="gcv2-footer">
                        <div class="gcv2-score">REC <span>${score > 0 ? score.toLocaleString() : '—'}</span></div>
                        <div class="gcv2-rank" style="background:${rankColor}20; color:${rankColor};">${rank}</div>
                    </div>
                </div>`;
        }).join('');
    },

    // --- RESTO DE FUNCIONES ---

    // Sentinel para distinguir "salí del lobby sin jugar" vs "jugué y saqué 0"
    _EXIT_CLEAN: Symbol('exit_clean'),

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

    const EXIT = this._EXIT_CLEAN;

    const onGameOverSmart = (finalScore = EXIT) => {
        // EXIT o null/undefined → salida del lobby sin haber jugado
        const isCleanExit = (finalScore === EXIT || finalScore === null || finalScore === undefined);
        
        if (!isCleanExit) {
            this.saveHighScore(gameId, finalScore);
        }

        this.showGameOverScreen(
            isCleanExit ? null : finalScore,
            gameId,
            () => { if (this.game && this.game.init) this.game.init(); },
            () => { if (this.game && this.game.cleanup) this.game.cleanup(); this.endGame(); }
        );
    };

    // Parchear todos los juegos que llaman onQuit(0) desde el menú de selección
    // para que usen el sentinel de salida limpia
    const patchedCallback = (score) => {
        if (score === 0 && this.game && !this.game._hasStarted) {
            onGameOverSmart(EXIT);
        } else {
            onGameOverSmart(score);
        }
    };

    this.game = new ClassRef(this.canvas, this.audio, patchedCallback);
    this.game.gameId = gameId;
    this.game._hasStarted = false; // Flag que los juegos activan al iniciar la partida real

    // Parchear métodos que indican que la partida real comenzó
    const markStarted = () => { if(this.game) this.game._hasStarted = true; };
    ['startGame','start','startRound','startGameLoop','prepareRound','go','nextRound','nextQuestion'].forEach(method => {
        if(typeof this.game[method] === 'function') {
            const orig = this.game[method].bind(this.game);
            this.game[method] = (...args) => { markStarted(); return orig(...args); };
        }
    });
    
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
                <div class="cod-agent-row">
                    <div class="cod-agent-avatar" style="border-color:${gameColor}50; background:${gameColor}10;">
                        <i class="fa-solid ${this.stats.avatar || 'fa-user-astronaut'}" style="color:${gameColor};"></i>
                    </div>
                    <div class="cod-agent-info">
                        <div class="cod-agent-name">AGENTE</div>
                        <div class="cod-agent-rank">${this.getRankName(this.stats.level)}</div>
                    </div>
                    <div class="cod-agent-level" style="color:${gameColor};">LVL ${this.stats.level}</div>
                </div>

                <!-- Métricas -->
                <div class="cod-metrics">
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
                <div class="cod-xp-section">
                    <div class="cod-xp-label">
                        <span>PROGRESIÓN NEURAL</span>
                        <span id="cod-xp-nums">LVL ${prevLvl}</span>
                    </div>
                    <div class="cod-xp-track">
                        <div class="cod-xp-fill" id="cod-xp-bar" style="width:0%; background:linear-gradient(90deg, var(--primary), #a855f7);"></div>
                        <div class="cod-xp-gain-marker" id="cod-xp-marker" style="opacity:0; background:#a855f7;"></div>
                    </div>
                </div>

                <!-- Acciones -->
                <div class="cod-actions">
                    <button class="cod-btn cod-btn-secondary" id="univ-quit">
                        <i class="fa-solid fa-arrow-left"></i> SALIR
                    </button>
                    <button class="cod-btn cod-btn-primary" id="univ-retry"
                            style="border-color:${rd.color}; color:${rd.color}; background:${rd.color}12;">
                        <i class="fa-solid fa-rotate-right"></i> REINTENTAR
                    </button>
                </div>

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

        document.getElementById('univ-retry').onclick = () => { ui.innerHTML = ''; onRetry(); };
        document.getElementById('univ-quit').onclick  = () => { ui.innerHTML = ''; onQuit();  };
        this.updateUI();
    },

    updateUI() {
        const get = id => document.getElementById(id);
        const credits   = get('menu-credits');
        const valCr     = get('val-credits');
        const lvlEl     = get('player-level');
        const rankEl    = get('player-rank');
        const xpBar     = get('xp-bar');
        const xpText    = get('xp-text');
        // Nav icon + status avatar
        const navIcon    = get('profile-nav-icon');
        const statusIcon = get('status-avatar-icon');

        if(credits)  credits.innerText  = this.credits.toLocaleString();
        if(valCr)    valCr.innerText    = this.credits.toLocaleString();

        const lvl = this.stats.level || 1;
        const xp  = this.stats.xp    || 0;
        const req = this.getReqXP(lvl);
        const pct = Math.min(100, (xp / req) * 100);

        if(lvlEl)    lvlEl.innerText    = lvl;
        if(rankEl)   rankEl.innerText   = this.getRankName(lvl).toUpperCase();
        if(xpBar)    xpBar.style.width  = `${pct}%`;
        if(xpText)   xpText.innerText   = `${Math.floor(xp)} / ${req} XP`;

        const avatarClass = `fa-solid ${this.stats.avatar || 'fa-user-astronaut'}`;
        if(navIcon)    navIcon.className    = avatarClass;
        if(statusIcon) statusIcon.className = avatarClass;
    },
    showToast(title, msg, type = 'default') {
        const container = document.getElementById('toast-container');
        if(!container) return;

        const el = document.createElement('div');

        // Configuración por tipo — icono, color de acento, duración
        const cfg = {
            gold:    { icon:'fa-trophy',       accent:'#fbbf24', dur:4000 },
            purple:  { icon:'fa-arrow-up',      accent:'#a855f7', dur:3500 },
            success: { icon:'fa-check',         accent:'#10b981', dur:2800 },
            danger:  { icon:'fa-skull',         accent:'#ef4444', dur:3000 },
            daily:   { icon:'fa-calendar-check',accent:'#f97316', dur:3500 },
            default: { icon:'fa-bell',          accent:'var(--primary)', dur:2500 },
        };
        const c = cfg[type] || cfg.default;
        const accentHex = c.accent.startsWith('#') ? c.accent : '#3b82f6';

        el.className = `toast-v2 toast-${type}`;
        el.style.setProperty('--ta', c.accent);
        el.innerHTML = `
            <div class="tv2-icon"><i class="fa-solid ${c.icon}"></i></div>
            <div class="tv2-body">
                <div class="tv2-title">${title}</div>
                ${msg ? `<div class="tv2-msg">${msg}</div>` : ''}
            </div>
            <div class="tv2-progress"><div class="tv2-bar" style="animation-duration:${c.dur}ms;"></div></div>`;

        container.appendChild(el);

        // Forzar reflow para animar
        void el.offsetWidth;
        el.classList.add('tv2-show');

        setTimeout(() => {
            el.classList.remove('tv2-show');
            el.classList.add('tv2-hide');
            setTimeout(() => el.remove(), 400);
        }, c.dur);
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
    showProfile() {
        const modal = document.getElementById('modal-profile');
        modal.classList.remove('hidden');

        const reflexRaw  = this.highScores['hyper-reflex'];
        const reflexBest = reflexRaw ? (typeof reflexRaw === 'number' ? reflexRaw : reflexRaw.best) : 0;
        const ctx = Object.assign({ credits: this.credits, bestReflex: reflexBest }, this.stats);

        // --- Definición de FA icons por logro (sin emojis) ---
        const achIcons = {
            rich:        'fa-gem',
            pro:         'fa-medal',
            sniper:      'fa-bolt',
            firstblood:  'fa-droplet',
            millionaire: 'fa-building-columns',
            dedicated:   'fa-screwdriver-wrench',
            collector:   'fa-box-open',
            speedgod:    'fa-fire',
            legend:      'fa-crown'
        };

        // Avatares
        const avatarsHTML = CONFIG.AVATARS.map(icon =>
            `<div class="pv2-avatar-opt ${this.stats.avatar === icon ? 'selected' : ''}"
                  onclick="window.app.setAvatar('${icon}')">
                <i class="fa-solid ${icon}"></i>
            </div>`
        ).join('');

        // Logros
        const unlockedCount = CONFIG.ACHIEVEMENTS.filter(a => a.check(ctx)).length;
        const achHTML = CONFIG.ACHIEVEMENTS.map(ach => {
            const unlocked = ach.check(ctx);
            const iconName = achIcons[ach.id] || 'fa-star';
            return `
                <div class="pv2-ach ${unlocked ? 'unlocked' : ''}" title="${ach.desc}">
                    <div class="pv2-ach-icon"><i class="fa-solid ${iconName}"></i></div>
                    <small>${ach.name}</small>
                </div>`;
        }).join('');

        // Récords con sparklines
        const recordsHTML = CONFIG.GAMES_LIST
            .filter(g => this.highScores[g.id])
            .map(g => {
                const entry  = this.highScores[g.id];
                const best   = typeof entry === 'number' ? entry : (entry.best || 0);
                const hist   = typeof entry === 'object' ? (entry.history || []) : [];
                const gColor = CONFIG.COLORS[g.color] || '#64748b';
                const bars   = hist.length > 1
                    ? hist.slice(0,6).reverse().map(h => {
                        const mx  = Math.max(...hist.slice(0,6).map(x => x.score));
                        const pct = mx > 0 ? Math.max(20, (h.score/mx)*100) : 50;
                        return `<div style="width:4px;height:${Math.round(pct*0.18)}px;background:${gColor};opacity:.7;border-radius:1px;align-self:flex-end;"></div>`;
                    }).join('') : '';
                return `
                    <div class="pv2-record-row">
                        <div class="pv2-rec-icon" style="background:${gColor}15;color:${gColor};">
                            <i class="${g.icon}"></i>
                        </div>
                        <div class="pv2-rec-name">${g.name}</div>
                        <div class="pv2-rec-spark">${bars}</div>
                        <div class="pv2-rec-score" style="color:${gColor};">${best.toLocaleString()}</div>
                    </div>`;
            }).join('') || `<div style="color:#334155;font-size:0.78rem;padding:8px 0;">Sin récords todavía</div>`;

        // Leaderboard
        const me = { name: "TÚ", xp: this.stats.xp, isPlayer: true };
        const board = [...(CONFIG.RIVALS || []), me].sort((a,b) => b.xp - a.xp);
        const lbHTML = board.map((r, i) =>
            `<div class="pv2-lb-row ${r.isPlayer ? 'is-player' : ''}">
                <div class="pv2-lb-pos">#${i+1}</div>
                <div class="pv2-lb-name" style="${r.color ? `color:${r.color}` : ''}">${r.name}</div>
                <div class="pv2-lb-xp">${r.xp.toLocaleString()} XP</div>
            </div>`
        ).join('');

        modal.innerHTML = `
            <div class="profile-v2">
                <div class="pv2-header">
                    <div class="pv2-avatar-ring">
                        <i class="fa-solid ${this.stats.avatar || 'fa-user-astronaut'}"></i>
                    </div>
                    <div class="pv2-name">AGENTE</div>
                    <div class="pv2-rank">${this.getRankName(this.stats.level)}</div>
                </div>

                <div class="pv2-stats">
                    <div class="pv2-stat">
                        <span class="s-label">PARTIDAS</span>
                        <span class="s-val">${this.stats.gamesPlayed}</span>
                    </div>
                    <div class="pv2-stat">
                        <span class="s-label">CRÉDITOS</span>
                        <span class="s-val gold">${this.credits.toLocaleString()}</span>
                    </div>
                    <div class="pv2-stat">
                        <span class="s-label">NIVEL</span>
                        <span class="s-val">${this.stats.level}</span>
                    </div>
                    <div class="pv2-stat">
                        <span class="s-label">LOGROS</span>
                        <span class="s-val">${unlockedCount}/${CONFIG.ACHIEVEMENTS.length}</span>
                    </div>
                </div>

                <div class="pv2-section">
                    <div class="pv2-section-title">AVATAR</div>
                    <div class="pv2-avatar-grid">${avatarsHTML}</div>
                </div>

                <div class="pv2-section">
                    <div class="pv2-section-title">LOGROS</div>
                    <div class="pv2-achievements">${achHTML}</div>
                </div>

                <div class="pv2-section">
                    <div class="pv2-section-title">RÉCORDS POR JUEGO</div>
                    <div class="pv2-records">${recordsHTML}</div>
                </div>

                <div class="pv2-section">
                    <div class="pv2-section-title">RANKING GLOBAL</div>
                    <div class="pv2-leaderboard">${lbHTML}</div>
                </div>

                <button class="btn pv2-close-btn" onclick="window.app.closeProfile()">
                    <i class="fa-solid fa-xmark"></i> CERRAR
                </button>
            </div>`;
    },
    // Actualiza el badge de racha en el HUD superior
    updateStreak(streakVal) {
        const badge = document.getElementById('ui-streak');
        if(!badge) return;
        if(streakVal > 1) {
            badge.classList.add('visible');
            const valEl = badge.querySelector('.hud-streak-val');
            if(valEl) valEl.textContent = `x${streakVal}`;
        } else {
            badge.classList.remove('visible');
        }
    },

    // ---- EFECTOS VISUALES DE CALLCARD ----
    _startCallcardEffect(style, rankColor) {
        const canvas = document.getElementById('cc-canvas');
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width  = canvas.parentElement?.offsetWidth  || window.innerWidth;
        canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight;
        let raf;
        const W = canvas.width, H = canvas.height;
        const t0 = Date.now();
        const T = () => (Date.now() - t0) / 1000;

        // Estado compartido por efectos
        const cols = {
            default:   ['#3b82f6','#6366f1'],
            bsod:      ['#0078d7','#003399','#1e90ff'],
            matrix:    ['#00ff41','#00cc33','#00ff88'],
            fallout:   ['#95b800','#6b8500','#c8d400'],  // Pip-Boy green
            vcity:     ['#ff6ec7','#ff2d78','#ffd700','#00cfff'],
            doom:      ['#ef4444','#dc2626','#7f1d1d','#f97316'],
            minecraft: ['#4aab2a','#7ec850','#c97c4f','#5b8dd9'],
            tron:      ['#00f5ff','#0099cc','#00ccff'],
            discord:   ['#5865f2','#7289da','#99aab5'],
            hacker:    ['#00ff41','#00cc33'],
            retro:     ['#ff0000','#ffff00','#00ff00','#00ffff','#ff00ff'],
            gold:      ['#ffd700','#ffa500','#ffec8b','#ff8c00'],
        };
        const pick = (style) => { const c = cols[style]||cols.default; return c[Math.floor(Math.random()*c.length)]; };

        // Partículas genéricas
        const P = Array.from({length:100},()=>({
            x:Math.random()*W,y:Math.random()*H,
            vx:(Math.random()-0.5)*1.5,vy:(Math.random()-0.5)*1.5,
            size:Math.random()*3+0.5,alpha:Math.random()*0.7+0.1,
            color:pick(style)
        }));

        const effects = {
            // DEFAULT — partículas suaves
            default() {
                ctx.fillStyle='rgba(5,8,18,0.88)'; ctx.fillRect(0,0,W,H);
                P.forEach(p=>{ p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;
                    ctx.globalAlpha=p.alpha;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill(); });
                ctx.globalAlpha=1;
            },

            // WINDOWS BSOD — pantalla azul con texto de error
            bsod() {
                ctx.fillStyle='#0078d7'; ctx.fillRect(0,0,W,H);
                // QR falso en la esquina
                ctx.fillStyle='rgba(0,0,0,0.15)'; ctx.fillRect(W*0.1,H*0.1,60,60);
                ctx.fillStyle='#fff'; ctx.font='bold 18px monospace';
                const t=T(); const blink=Math.floor(t*2)%2===0;
                if(blink){ctx.fillStyle='rgba(255,255,255,0.08)';ctx.fillRect(0,0,W,H);}
                // Scan line lento
                const sy=(T()*30)%H;
                ctx.fillStyle='rgba(255,255,255,0.04)';ctx.fillRect(0,sy,W,3);
                ctx.globalAlpha=1;
            },

            // MATRIX — katakana + binario, columnas independientes
            matrix() {
                ctx.fillStyle='rgba(0,5,0,0.13)'; ctx.fillRect(0,0,W,H);
                const cw=16;
                const chars='01ﾊﾋﾖｶｸｼﾐﾓﾔｺﾍﾎｱｲｳｴｵｶｷ';
                ctx.font=`${cw-2}px monospace`;
                P.forEach(p=>{
                    p.y+=2.5+p.size;
                    if(p.y>H){p.y=0;p.x=Math.round(Math.random()*W/cw)*cw;}
                    const c=chars[Math.floor(Math.random()*chars.length)];
                    // Primera letra más brillante
                    ctx.globalAlpha=p.alpha;
                    ctx.fillStyle=p.alpha>0.5?'#88ff88':p.color;
                    ctx.fillText(c,p.x,p.y);
                });
                ctx.globalAlpha=1;
            },

            // FALLOUT — glow verde Pip-Boy + CRT estático + interferencia
            fallout() {
                ctx.fillStyle='rgba(5,12,0,0.15)'; ctx.fillRect(0,0,W,H);
                // Scanlines CRT
                for(let y=0;y<H;y+=3){ctx.fillStyle='rgba(0,0,0,0.18)';ctx.fillRect(0,y,W,1);}
                // Static noise verde
                P.forEach(p=>{
                    p.x+=p.vx*0.4;p.y+=p.vy*0.4;
                    if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;
                    ctx.globalAlpha=p.alpha*0.5;
                    ctx.fillStyle=p.color;
                    ctx.fillRect(p.x,p.y,p.size,1);
                });
                // Horizontal glitch ocasional
                if(Math.random()<0.06){
                    const gy=Math.random()*H;
                    ctx.drawImage(canvas,Math.random()*10-5,gy,W,4,0,gy,W,4);
                }
                // Vignette verde
                const vg=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*0.7);
                vg.addColorStop(0,'transparent');
                vg.addColorStop(1,'rgba(0,30,0,0.6)');
                ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
                ctx.globalAlpha=1;
            },

            // VICE CITY — lluvia de neón rosa/amarillo, skyline nocturno
            vcity() {
                ctx.fillStyle='rgba(10,0,20,0.14)'; ctx.fillRect(0,0,W,H);
                // Reflejo en el suelo — gradiente degradado
                const gg=ctx.createLinearGradient(0,H*0.7,0,H);
                gg.addColorStop(0,'rgba(255,45,120,0.05)');
                gg.addColorStop(1,'rgba(0,207,255,0.05)');
                ctx.fillStyle=gg;ctx.fillRect(0,H*0.7,W,H*0.3);
                // Partículas brillantes con glow
                P.forEach(p=>{
                    p.y+=1.2;p.x+=Math.sin(T()+p.vx)*0.4;
                    if(p.y>H){p.y=-5;p.x=Math.random()*W;p.color=pick('vcity');}
                    ctx.globalAlpha=p.alpha;
                    ctx.shadowBlur=8;ctx.shadowColor=p.color;
                    ctx.fillStyle=p.color;
                    ctx.beginPath();ctx.arc(p.x,p.y,p.size*0.8,0,Math.PI*2);ctx.fill();
                    ctx.shadowBlur=0;
                });
                ctx.globalAlpha=1;
            },

            // DOOM — partículas de fuego + lava que sube + rojo infernal
            doom() {
                ctx.fillStyle='rgba(20,0,0,0.18)'; ctx.fillRect(0,0,W,H);
                // Glow de lava en el fondo inferior
                const lg=ctx.createLinearGradient(0,H*0.7,0,H);
                lg.addColorStop(0,'rgba(239,68,68,0)');
                lg.addColorStop(0.5,'rgba(249,115,22,0.12)');
                lg.addColorStop(1,'rgba(239,68,68,0.25)');
                ctx.fillStyle=lg;ctx.fillRect(0,0,W,H);
                // Chispas que suben
                P.forEach(p=>{
                    p.y-=1.5+p.size*0.6;
                    p.x+=Math.sin(T()*2+p.vx*5)*0.8;
                    p.alpha-=0.003;
                    if(p.y<0||p.alpha<0.05){p.y=H+5;p.x=Math.random()*W;p.alpha=Math.random()*0.7+0.2;p.color=pick('doom');}
                    ctx.globalAlpha=p.alpha;
                    ctx.shadowBlur=6;ctx.shadowColor=p.color;
                    ctx.fillStyle=p.color;
                    ctx.beginPath();ctx.arc(p.x,p.y,p.size*0.6,0,Math.PI*2);ctx.fill();
                    ctx.shadowBlur=0;
                });
                ctx.globalAlpha=1;
            },

            // MINECRAFT — bloques de píxeles que caen
            minecraft() {
                ctx.fillStyle='rgba(10,15,5,0.16)'; ctx.fillRect(0,0,W,H);
                const bs=12; // Block size
                P.forEach(p=>{
                    p.y+=1.8+p.size*0.3;
                    p.x+=Math.sin(p.vx+p.y*0.01)*0.3;
                    if(p.y>H){p.y=-bs;p.x=Math.round(Math.random()*W/bs)*bs;p.color=pick('minecraft');}
                    ctx.globalAlpha=p.alpha*0.8;
                    ctx.fillStyle=p.color;
                    // Bloque pixelado con borde
                    ctx.fillRect(p.x,p.y,bs-1,bs-1);
                    ctx.fillStyle='rgba(255,255,255,0.15)';
                    ctx.fillRect(p.x,p.y,bs-1,2); // Highlight top
                    ctx.fillStyle='rgba(0,0,0,0.2)';
                    ctx.fillRect(p.x,p.y+bs-2,bs-1,2); // Shadow bottom
                });
                ctx.globalAlpha=1;
            },

            // TRON — líneas de velocidad + grid + ciclos de luz
            tron() {
                ctx.fillStyle='rgba(0,10,20,0.2)'; ctx.fillRect(0,0,W,H);
                // Grid fino
                ctx.strokeStyle='rgba(0,245,255,0.05)';ctx.lineWidth=0.5;
                for(let x=0;x<W;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
                for(let y=0;y<H;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
                // Trazas de ciclos de luz
                P.slice(0,40).forEach(p=>{
                    if(!p.dir) p.dir=Math.random()>0.5?'H':'V';
                    if(p.dir==='H'){p.x+=3+p.size;if(p.x>W){p.x=0;p.y=Math.round(Math.random()*H/50)*50;}}
                    else{p.y+=3+p.size;if(p.y>H){p.y=0;p.x=Math.round(Math.random()*W/50)*50;}}
                    ctx.globalAlpha=p.alpha;
                    ctx.shadowBlur=10;ctx.shadowColor='#00f5ff';
                    ctx.strokeStyle='#00f5ff';ctx.lineWidth=1.5;
                    ctx.beginPath();
                    if(p.dir==='H'){ctx.moveTo(p.x-30,p.y);ctx.lineTo(p.x,p.y);}
                    else{ctx.moveTo(p.x,p.y-30);ctx.lineTo(p.x,p.y);}
                    ctx.stroke();ctx.shadowBlur=0;
                });
                ctx.globalAlpha=1;
            },

            // DISCORD — burbujas de notificación flotando
            discord() {
                ctx.fillStyle='rgba(30,33,58,0.18)'; ctx.fillRect(0,0,W,H);
                P.forEach(p=>{
                    p.y-=0.6+p.size*0.2;
                    p.x+=Math.sin(T()*0.8+p.vx*3)*0.5;
                    if(p.y<-20){p.y=H+20;p.x=Math.random()*W;p.size=Math.random()*18+4;}
                    ctx.globalAlpha=p.alpha*0.5;
                    ctx.shadowBlur=p.size>10?12:4;ctx.shadowColor=p.color;
                    ctx.strokeStyle=p.color;ctx.lineWidth=1.5;
                    ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.stroke();
                    // Punto de notificación para burbujas grandes
                    if(p.size>12){
                        ctx.fillStyle='#ed4245';ctx.beginPath();
                        ctx.arc(p.x+p.size*0.7,p.y-p.size*0.7,4,0,Math.PI*2);ctx.fill();
                    }
                    ctx.shadowBlur=0;
                });
                ctx.globalAlpha=1;
            },

            // HACKER / MR.ROBOT — código verde terminal, estilo hacking real
            hacker() {
                ctx.fillStyle='rgba(0,8,0,0.2)'; ctx.fillRect(0,0,W,H);
                const code=['if(sys.bypass()){','  root.access=true;','} else { die(); }','> whoami','> rm -rf /','EXPLOIT LOADED','CVE-2024-XXXX','[+] root shell',
                            '#!/bin/bash','nc -lvp 4444','wget payload.sh','chmod +x run.sh','./run.sh &'];
                ctx.font='12px monospace';
                P.slice(0,30).forEach((p,i)=>{
                    if(!p.code){p.code=code[i%code.length];p.alpha=Math.random()*0.6+0.1;}
                    p.y+=0.8;if(p.y>H){p.y=-15;p.x=Math.random()*(W-200);p.code=code[Math.floor(Math.random()*code.length)];}
                    ctx.globalAlpha=p.alpha;
                    ctx.fillStyle=p.alpha>0.5?'#00ff88':'#00aa44';
                    ctx.fillText(p.code,p.x,p.y);
                });
                // Cursor parpadeante
                if(Math.floor(T()*2)%2===0){ctx.globalAlpha=0.8;ctx.fillStyle='#00ff41';ctx.fillRect(W*0.1,H*0.85,8,14);}
                ctx.globalAlpha=1;
            },

            // ARCADE 1984 — píxeles de colores, estilo Space Invaders
            retro() {
                ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(0,0,W,H);
                const invader=[[0,1,0,0,1,0],[0,0,1,1,0,0],[0,1,1,1,1,0],[1,0,1,1,0,1],[1,0,0,0,0,1]];
                const ps=5,gap=3;
                // Mover invaders
                P.slice(0,20).forEach((p,i)=>{
                    if(!p.init){p.col=pick('retro');p.init=true;}
                    p.x+=(Math.sin(T()*0.5+i*0.3)*0.5);
                    p.y+=0.5+p.size*0.1;
                    if(p.y>H){p.y=-40;p.x=Math.random()*W;}
                    // Dibujar invader
                    ctx.globalAlpha=p.alpha*0.7;
                    ctx.fillStyle=p.col;
                    invader.forEach((row,ry)=>row.forEach((bit,rx)=>{
                        if(bit)ctx.fillRect(p.x+(rx-3)*(ps+1),p.y+(ry-2)*(ps+1),ps,ps);
                    }));
                });
                // Estrellas de fondo
                P.slice(20).forEach(p=>{
                    p.y+=0.3;if(p.y>H)p.y=0;
                    ctx.globalAlpha=p.alpha*0.4;ctx.fillStyle='#fff';
                    ctx.fillRect(p.x,p.y,1,1);
                });
                ctx.globalAlpha=1;
            },

            // PAY2WIN / BATTLE ROYALE — lluvias de coronas y monedas doradas
            gold() {
                ctx.fillStyle='rgba(15,10,0,0.12)'; ctx.fillRect(0,0,W,H);
                // Brillo dorado de fondo
                const gg=ctx.createRadialGradient(W/2,H,0,W/2,H,Math.max(W,H)*0.6);
                gg.addColorStop(0,'rgba(255,165,0,0.08)');
                gg.addColorStop(1,'transparent');
                ctx.fillStyle=gg;ctx.fillRect(0,0,W,H);
                // Monedas y coronas cayendo
                const syms=['$','¢','♛','💰','★'];
                ctx.font='bold 20px Arial';
                P.forEach(p=>{
                    if(!p.sym){p.sym=syms[Math.floor(Math.random()*syms.length)];}
                    p.y+=2.5+p.size;p.x+=Math.sin(p.y*0.04+p.vx)*0.8;
                    if(p.y>H){p.y=-10;p.x=Math.random()*W;p.color=pick('gold');}
                    ctx.globalAlpha=p.alpha;
                    ctx.shadowBlur=6;ctx.shadowColor='#ffd700';
                    ctx.fillStyle=p.color;
                    ctx.fillText(p.sym,p.x,p.y);
                    ctx.shadowBlur=0;
                });
                ctx.globalAlpha=1;
            }
        };

        const fn = effects[style] || effects.default;
        const loop = () => { fn(); raf = requestAnimationFrame(loop); };
        loop();

        // Parar cuando la overlay sea eliminada
        const observer = new MutationObserver(() => {
            if(!document.getElementById('cc-canvas')) {
                cancelAnimationFrame(raf);
                observer.disconnect();
            }
        });
        const ui = document.getElementById('game-ui-overlay');
        if(ui) observer.observe(ui, { childList: true });
    },

    setAvatar(icon) { this.stats.avatar = icon; this.audio.playClick(); this.showProfile(); this.updateUI(); this.save(); },
    closeProfile() { document.getElementById('modal-profile').classList.add('hidden'); },
    save() { localStorage.setItem('arcade_save', JSON.stringify({ credits: this.credits, stats: this.stats, highScores: this.highScores, shop: { inventory: this.shop.inventory, equipped: this.shop.equipped }, daily: this.daily, settings: { audio: this.audio.vol, performance: this.settings.performance } })); },
    checkDailyReset() { const today = new Date().toDateString(); if (this.daily.date !== today || this.daily.tasks.length === 0) { this.daily.date = today; this.daily.claimed = false; this.daily.tasks = []; const rng = new SeededRandom(parseInt(today.replace(/\D/g,'')) || Date.now()); const gameIds = Object.keys(this.gameClasses); while(this.daily.tasks.length < 3) { const gid = gameIds[Math.floor(rng.next() * gameIds.length)]; if (!this.daily.tasks.find(t => t.gameId === gid)) this.daily.tasks.push({ gameId: gid, target: CONFIG.DAILY_TARGETS[gid] || 10, done: false }); } this.save(); } },
    renderDailyScreen() {
        this.canvas.setMood('DAILY');
        const container = document.getElementById('screen-daily');
        if(!container) return;

        const done  = this.daily.tasks.filter(t => t.done).length;
        const total = this.daily.tasks.length;
        const pct   = Math.round((done / total) * 100);
        const allDone = done === total;

        const tasksHTML = this.daily.tasks.map((task, idx) => {
            const meta   = CONFIG.GAMES_LIST.find(g => g.id === task.gameId) || { name: task.gameId, icon: 'fa-solid fa-gamepad', color: 'DEFAULT' };
            const color  = task.done ? '#10b981' : '#f97316';
            const gameColor = CONFIG.COLORS[meta.color] || '#94a3b8';
            return `
                <div class="daily-card ${task.done ? 'done' : ''}"
                     style="--dc-color:${color};"
                     onclick="${task.done ? '' : `window.app.launchDaily('${task.gameId}')`}">
                    <div class="d-num">${idx + 1}</div>
                    <div class="d-game-icon" style="color:${gameColor}; background:${gameColor}12; border-color:${gameColor}20;">
                        <i class="${meta.icon}"></i>
                    </div>
                    <div class="d-info">
                        <h3>${meta.name}</h3>
                        <small>OBJETIVO: <span>${task.target} pts</span></small>
                    </div>
                    <div class="d-status-icon">
                        <i class="fa-solid ${task.done ? 'fa-circle-check' : 'fa-lock'}"></i>
                    </div>
                </div>`;
        }).join('');

        const claimed = this.daily.claimed;
        const claimDisabled = (!allDone || claimed) ? 'disabled' : '';
        const claimLabel = claimed
            ? `<i class="fa-solid fa-check-double"></i> COMPLETADO`
            : allDone
                ? `<i class="fa-solid fa-gift"></i> RECLAMAR 500 CR`
                : `<i class="fa-solid fa-lock"></i> BLOQUEADO`;

        container.innerHTML = `
            <div class="daily-panel-v2">
                <div class="daily-title-row">
                    <div>
                        <h2>PROTOCOLO DIARIO</h2>
                        <small>Sincronización Neural: ${done}/${total}</small>
                    </div>
                    <div class="daily-reward-badge">
                        <div class="r-label">RECOMPENSA</div>
                        <div class="r-val"><i class="fa-solid fa-coins"></i> 500 CR</div>
                    </div>
                </div>
                <div class="daily-progress-wrap">
                    <div class="daily-progress-track">
                        <div class="daily-progress-fill" style="width:${pct}%"></div>
                    </div>
                    <div class="daily-progress-label">${done}/${total} COMPLETADAS</div>
                </div>
                <div class="daily-tasks-list">${tasksHTML}</div>
                <div class="daily-actions">
                    <button class="btn btn-secondary" id="btn-daily-back-panel">
                        <i class="fa-solid fa-arrow-left"></i> VOLVER
                    </button>
                    <button id="btn-daily-claim-panel"
                            class="btn ${allDone && !claimed ? 'btn-claim-daily pulse' : ''}"
                            style="${!allDone || claimed ? 'opacity:0.4;cursor:not-allowed;' : ''}"
                            ${claimDisabled}>
                        ${claimLabel}
                    </button>
                </div>
                <div class="daily-footer">
                    ${claimed ? 'RECOMPENSA OBTENIDA — HASTA MAÑANA' : 'CAJA DE SUMINISTROS PENDIENTE'}
                </div>
            </div>`;

        document.getElementById('btn-daily-back-panel').onclick = () => {
            this.audio.playClick();
            this.changeState(CONFIG.STATES.MENU);
        };
        if(allDone && !claimed) {
            document.getElementById('btn-daily-claim-panel').onclick = () => this.claimDaily();
        }
    },
    launchDaily(gameId) { this.launch(gameId); },
    claimDaily() { if(this.daily.claimed) return; this.daily.claimed = true; this.addScore(0, 500); this.audio.playWin(10); this.showToast("¡RECOMPENSA RECLAMADA!", "Has ganado 500 Créditos", "gold"); this.renderDailyScreen(); this.save(); },
    addScore(pts, cash) { 
        this.credits += cash; 
        if(this.canvas && this.settings.performance) this.canvas.explode(null, null, CONFIG.COLORS.GOLD); 
        this.updateUI(); 
        this.save(); 
    },

    // --- CAJA DE SUMINISTROS ---
    buyLootBox() {
        const cost = (this.shop.inventory.includes('up_vip')) ? 400 : CONFIG.LOOT_BOX.COST;
        if(this.credits < cost){ this.showToast("FONDOS INSUFICIENTES",`Necesitas ${cost} CR`,"danger"); this.audio.playLose(); return; }
        this.credits -= cost;
        this.audio.playBuy();

        // Calcular drop
        const drops = CONFIG.LOOT_BOX.DROPS;
        let roll = Math.random() * drops.reduce((s,d)=>s+d.prob,0);
        let chosen = drops[drops.length-1];
        for(const d of drops){ roll-=d.prob; if(roll<=0){chosen=d;break;} }
        if(chosen.type==='CREDITS'||chosen.type==='JACKPOT') this.credits += chosen.val;

        // ANIMACIÓN FULLSCREEN
        const isJackpot = chosen.type==='JACKPOT';
        const color = chosen.color || '#fbbf24';
        const overlay = document.createElement('div');
        overlay.id = 'lootbox-overlay';
        overlay.innerHTML = `
            <div class="lb-bg"></div>
            <div class="lb-panel">
                <div class="lb-title">CAJA DE SUMINISTROS</div>
                <div class="lb-box-wrap" id="lb-box">
                    <div class="lb-box-icon"><i class="fa-solid fa-box lb-icon-closed"></i></div>
                </div>
                <div class="lb-dots" id="lb-dots">
                    <span></span><span></span><span></span>
                </div>
                <div class="lb-result" id="lb-result" style="display:none;">
                    <div class="lb-rarity-badge" style="color:${color};border-color:${color}40;background:${color}15;">${isJackpot?'JACKPOT':chosen.name.toUpperCase()}</div>
                    <div class="lb-reward-icon" style="color:${color};filter:drop-shadow(0 0 20px ${color});"><i class="fa-solid fa-coins"></i></div>
                    <div class="lb-reward-val" style="color:${color};">+${chosen.val.toLocaleString()} CR</div>
                    <button class="lb-close-btn" id="lb-close"><i class="fa-solid fa-check"></i> COBRAR</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        // Secuencia de animación
        setTimeout(()=>{
            const box = document.getElementById('lb-box');
            if(box){ box.innerHTML=`<div class="lb-box-icon lb-shake"><i class="fa-solid fa-box-open lb-icon-open" style="color:${color};filter:drop-shadow(0 0 20px ${color});"></i></div>`; }
            if(this.canvas) this.canvas.explode(window.innerWidth/2,window.innerHeight/2,color);
            if(isJackpot){ this.audio.playWin(10); setTimeout(()=>this.canvas?.explode(window.innerWidth*0.3,window.innerHeight*0.5,color),400); setTimeout(()=>this.canvas?.explode(window.innerWidth*0.7,window.innerHeight*0.5,color),600); }
        },600);
        setTimeout(()=>{
            const dots=document.getElementById('lb-dots'); if(dots)dots.style.display='none';
            const res=document.getElementById('lb-result'); if(res)res.style.display='flex';
        },1100);

        document.getElementById('lb-close').onclick = () => {
            overlay.style.animation='fadeOut 0.3s ease forwards';
            setTimeout(()=>{ overlay.remove(); this.updateUI(); const sc=document.getElementById('shop-credits'); if(sc)sc.innerText=this.credits.toLocaleString(); this.save(); },300);
        };
    },

    openPremiumBox(boxCfg) {
        const drops = boxCfg.drops;
        let roll = Math.random() * drops.reduce((s,d)=>s+d.prob,0);
        let chosen = drops[drops.length-1];
        for(const d of drops){ roll-=d.prob; if(roll<=0){chosen=d;break;} }
        if(chosen.type==='CREDITS'||chosen.type==='JACKPOT') this.credits += chosen.val;
        const isJackpot = chosen.type==='JACKPOT';
        const color = chosen.color || boxCfg.color || '#fbbf24';

        const overlay = document.createElement('div');
        overlay.id = 'lootbox-overlay';
        overlay.innerHTML = `
            <div class="lb-bg"></div>
            <div class="lb-panel">
                <div class="lb-title">${boxCfg.name.toUpperCase()}</div>
                <div class="lb-box-wrap" id="lb-box">
                    <div class="lb-box-icon"><i class="fa-solid fa-box lb-icon-closed" style="color:${boxCfg.color};filter:drop-shadow(0 0 16px ${boxCfg.color}40);"></i></div>
                </div>
                <div class="lb-dots" id="lb-dots"><span></span><span></span><span></span></div>
                <div class="lb-result" id="lb-result" style="display:none;">
                    <div class="lb-rarity-badge" style="color:${color};border-color:${color}40;background:${color}15;">${isJackpot?'¡JACKPOT!':chosen.name.toUpperCase()}</div>
                    <div class="lb-reward-icon" style="color:${color};filter:drop-shadow(0 0 20px ${color});"><i class="fa-solid fa-coins"></i></div>
                    <div class="lb-reward-val" style="color:${color};">+${chosen.val.toLocaleString()} CR</div>
                    <button class="lb-close-btn" id="lb-close"><i class="fa-solid fa-check"></i> COBRAR</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        setTimeout(()=>{
            const box=document.getElementById('lb-box');
            if(box) box.innerHTML=`<div class="lb-box-icon lb-shake"><i class="fa-solid fa-box-open lb-icon-open" style="color:${color};filter:drop-shadow(0 0 20px ${color});"></i></div>`;
            try{ this.canvas.explode(window.innerWidth/2,window.innerHeight/2,color); }catch(e){}
            if(isJackpot){ this.audio.playWin(10); setTimeout(()=>this.canvas?.explode(window.innerWidth*0.3,window.innerHeight*0.5,color),400); setTimeout(()=>this.canvas?.explode(window.innerWidth*0.7,window.innerHeight*0.5,color),600); }
        },600);
        setTimeout(()=>{
            const d=document.getElementById('lb-dots');if(d)d.style.display='none';
            const r=document.getElementById('lb-result');if(r)r.style.display='flex';
        },1100);
        document.getElementById('lb-close').onclick=()=>{
            overlay.style.animation='fadeOut 0.3s ease forwards';
            setTimeout(()=>{ overlay.remove(); this.updateUI(); const sc=document.getElementById('shop-credits');if(sc)sc.innerText=this.credits.toLocaleString(); this.save(); },300);
        };
    },
    showFloatingText(text, color) {
        const el = document.createElement('div');
        el.className = 'popup-score';
        el.innerText = text;
        el.style.color = color || 'white';
        el.style.left = '50%';
        el.style.top = '35%';
        el.style.transform = 'translate(-50%, -50%)';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1200);
    },
    toggleConsole() { const c = document.getElementById('debug-console'); if(!c) return; if (c.classList.contains('hidden')) { c.classList.remove('hidden'); document.getElementById('console-input').focus(); } else { c.classList.add('hidden'); } },
    logConsole(msg, type='') { const out = document.getElementById('console-output'); out.innerHTML += `<div class="console-msg ${type}">${msg}</div>`; out.scrollTop = out.scrollHeight; },
    execCommand(cmd) {
        this.logConsole(`> ${cmd}`);
        document.getElementById('console-input').value = '';
        const parts = cmd.toLowerCase().trim().split(' ');
        if(parts[0] === 'rich')  { this.credits += 10000; this.updateUI(); this.save(); this.logConsole('+10,000 CR INJECTED', 'sys'); }
        if(parts[0] === 'god')   { this.credits += 99999; this.stats.level = 50; this.stats.xp = 0; this.updateUI(); this.save(); this.logConsole('GOD MODE — 99,999 CR + LVL 50', 'sys'); }
        if(parts[0] === 'lvl')   { const n = parseInt(parts[1])||10; this.stats.level = n; this.stats.xp = 0; this.updateUI(); this.save(); this.logConsole(`LEVEL SET TO ${n}`, 'sys'); }
        if(parts[0] === 'card')  { const id = parts[1]; if(id && window.app.shop) { window.app.shop.inventory.push(id); this.save(); this.logConsole(`ITEM UNLOCKED: ${id}`, 'sys'); } }
        if(parts[0] === 'reset') { localStorage.removeItem('arcade_save'); location.reload(); }
        if(parts[0] === 'help')  { this.logConsole('COMMANDS: rich | god | lvl N | card [item_id] | reset | clear', 'sys'); }
        if(parts[0] === 'clear') { document.getElementById('console-output').innerHTML = ''; }
    },
    setCritical(active) { const vign = document.querySelector('.vignette'); if(vign) { if(active) vign.classList.add('critical'); else vign.classList.remove('critical'); } },
    applyTheme(themeId) { document.body.className = document.body.className.replace(/t_[a-z]+/g, "").trim(); if (themeId && themeId !== 't_default') document.body.classList.add(themeId); }
};

window.onload = () => app.init();