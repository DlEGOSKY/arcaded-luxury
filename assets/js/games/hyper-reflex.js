import { CONFIG } from '../config.js';
import {
    createGameShell, hudStat, hudLogo, hudMode,
    initPixiApp, makeGlow, makeBloom,
    winFlash, screenShake, burstConfetti,
    spawnParticles, updateParticles,
    spawnStarfield, updateStarfield,
    computeRectSize,
} from '../systems/pixi-stage.js';

export class GameReflex {
    // NOTA: 'onQuit' ahora es la función inteligente 'onGameOverSmart' del main.js
    constructor(canvas, audio, onQuit) {
        this.canvas = canvas || window.app.canvas;
        this.audio = audio || window.app.audio;
        this.onQuit = onQuit;

        this.state = 'MENU';
        this.round = 0;
        this.maxRounds = 5;
        this.times = [];
        this.startTime = 0;
        this.timeoutId = null;
        this.timeoutFake = null;
        this.mode = 'NORMAL';

        // NUEVAS MECÁNICAS
        this.fastStreak = 0;           // consecutivos <200ms
        this.fakeCount = 0;            // fake signals mostrados
        this.fakeSurvived = 0;         // fake signals no pulsados
        this.bonusCreditsEarned = 0;   // bonus por speed streaks

        this.uiContainer = document.getElementById('game-ui-overlay');
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('reflex-styles')) return;
        const style = document.createElement('style');
        style.id = 'reflex-styles';
        // ... (TUS ESTILOS IGUALES, SIN CAMBIOS) ...
        style.innerHTML = `
            .reflex-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%; cursor: pointer; -webkit-tap-highlight-color: transparent; }
            .reflex-core { width: 180px; height: 180px; border-radius: 50%; position: relative; display: flex; align-items: center; justify-content: center; transition: all 0.1s; }
            .reflex-core.waiting { border: 4px solid rgba(239,68,68,0.5); background: radial-gradient(circle, #450a0a 0%, #000 80%); box-shadow: 0 0 30px rgba(239,68,68,0.2); animation: corePulse 0.8s infinite; }
            .reflex-core.active { background: #fff; border-color: #fff; box-shadow: 0 0 60px #fff, 0 0 100px #ec4899; transform: scale(1.1); }
            .reflex-core.fail { background: #ef4444; border-color: #ef4444; box-shadow: 0 0 50px #ef4444; }
            .reflex-core.fake { background: radial-gradient(circle, #3a2f0a 0%, #1a1500 80%); border-color: #fbbf24; box-shadow: 0 0 35px rgba(251,191,36,0.45); animation: corePulse 0.3s infinite; }
            .reflex-personal-best { font-family:monospace; font-size:0.65rem; color:#fbbf24; letter-spacing:2px; margin-top:10px; opacity:0.8; }
            .reflex-fast-streak { position:absolute; top:-40px; font-family:var(--font-display); font-size:0.72rem; color:#fbbf24; letter-spacing:2px; text-shadow:0 0 10px #fbbf24; }
            .reflex-ring { position: absolute; border-radius: 50%; border: 2px solid transparent; border-top-color: #ef4444; border-bottom-color: #ef4444; animation: spin 2s linear infinite; opacity: 0.6; pointer-events: none; }
            .reflex-ring:nth-child(1) { width: 100%; height: 100%; animation-duration: 3s; }
            .reflex-ring:nth-child(2) { width: 70%; height: 70%; animation-duration: 1.5s; animation-direction: reverse; }
            .reflex-core.active .reflex-ring { animation: expandRing 0.4s ease-out forwards; border-color: #ec4899; }
            .reflex-ms { font-family: 'Orbitron', sans-serif; font-size: 2.5rem; color: white; z-index: 20; text-shadow: 0 0 10px black; pointer-events: none; }
            .reflex-msg { position: absolute; bottom: -40px; font-size: 0.8rem; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase; white-space: nowrap; }
            @keyframes corePulse { 0% { transform: scale(1); } 50% { transform: scale(0.97); } 100% { transform: scale(1); } }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes expandRing { to { width: 250px; height: 250px; opacity: 0; border-width: 0; } }
        `;
        document.head.appendChild(style);
    }

    init() {
        if(window.app.credits < 15) {
            try { window.app.showToast("FONDOS INSUFICIENTES", "Requiere $15", "danger"); } catch(e){}
            if(this.onQuit) this.onQuit(0);
            return;
        }

        const bestReflex = (window.app?.stats?.bestReflex) || 0;
        const bestLabel = bestReflex > 0 ? `RÉCORD PERSONAL: ${bestReflex}ms` : 'SIN RÉCORD REGISTRADO';
        const modes = [
            { id:'mode-normal',   mc:'var(--reflex,#f97316)', icon:'fa-bolt',             name:'ESTÁNDAR',  desc:'5 rondas · fake signals aleatorias' },
            { id:'mode-hardcore', mc:'#ef4444',               icon:'fa-skull-crossbones', name:'LETAL',     desc:'< 250ms o game over'                },
            { id:'mode-fakeout',  mc:'#fbbf24',               icon:'fa-eye',              name:'FAKE-OUT',  desc:'Fake signals agresivas · pagan ×2' },
            { id:'mode-endless',  mc:'#a855f7',               icon:'fa-infinity',         name:'ENDLESS',   desc:'Hasta que falles · sin límite'      },
            { id:'mode-blitz',    mc:'#06b6d4',               icon:'fa-fire-flame-curved',name:'BLITZ',     desc:'30s · múltiples targets · velocidad máxima' },
        ];

        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;">HYPER REFLEX</div>
                <div style="font-size:0.65rem;color:var(--reflex,#f97316);letter-spacing:3px;font-family:monospace;">CALIBRACIÓN SINÁPTICA</div>
                <div style="width:120px;height:1px;background:var(--reflex,#f97316);margin:10px auto 0;opacity:0.5;"></div>
                <div class="reflex-personal-best">${bestLabel}</div>
            </div>
            <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
                ${modes.map(m=>`
                <div style="
                    width:160px;min-height:160px;
                    background:rgba(10,16,30,0.9);
                    border:1px solid ${m.mc}25;
                    border-radius:14px;
                    display:flex;flex-direction:column;
                    align-items:center;justify-content:center;
                    gap:10px;cursor:pointer;
                    transition:transform 0.15s,border-color 0.15s,box-shadow 0.15s;
                    padding:20px 12px;position:relative;overflow:hidden;"
                    id="${m.id}"
                    onmouseenter="this.style.transform='translateY(-4px)';this.style.borderColor='${m.mc}';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)';"
                    onmouseleave="this.style.transform='';this.style.borderColor='${m.mc}25';this.style.boxShadow='';">
                    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${m.mc};opacity:0.6;border-radius:14px 14px 0 0;"></div>
                    <i class="fa-solid ${m.icon}" style="font-size:2rem;color:${m.mc};filter:drop-shadow(0 0 8px ${m.mc});"></i>
                    <div style="font-family:var(--font-display);font-size:0.8rem;letter-spacing:2px;color:${m.mc};">${m.name}</div>
                    <div style="font-size:0.62rem;color:#475569;font-family:monospace;letter-spacing:1px;text-transform:uppercase;">${m.desc}</div>
                </div>`).join('')}
            </div>
            <button class="btn btn-secondary" id="reflex-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;

        document.getElementById('mode-normal').onclick   = () => this.startGame('NORMAL');
        document.getElementById('mode-hardcore').onclick = () => this.startGame('HARDCORE');
        document.getElementById('mode-fakeout').onclick  = () => this.startGame('FAKEOUT');
        document.getElementById('mode-endless').onclick  = () => this.startGame('ENDLESS');
        document.getElementById('mode-blitz').onclick    = () => this.startBlitz();
        document.getElementById('reflex-back').onclick   = () => { if(this.onQuit) this.onQuit(0); };
    }

    startGame(mode) {
        window.app.credits -= 15;
        document.getElementById('val-credits').innerText = window.app.credits;
        this.mode = mode;
        this.round = 0;
        this.times = [];
        this.maxRounds = mode === 'ENDLESS' ? 999 : 5;
        this.fastStreak = 0;
        this.fakeCount = 0;
        this.fakeSurvived = 0;
        this.bonusCreditsEarned = 0;
        this.canvas.setMood('REFLEX');
        try { window.app.combo?.start(); } catch(e){}
        this.prepareRound();
    }

    startBlitz() {
        window.app.credits -= 15;
        const valEl = document.getElementById('val-credits');
        if(valEl) valEl.innerText = window.app.credits;
        this.mode = 'BLITZ';
        this._blitzScore  = 0;
        this._blitzCombo  = 0;
        this._blitzBestCombo = 0;
        this._blitzMisses = 0;
        this._blitzTime   = 30;
        this._blitzActive = true;
        this._blitzTargets = [];
        this._blitzParticles = [];
        this._blitzFloaters  = [];
        this.canvas.setMood('REFLEX');

        // HUD premium con shell reusable
        const hudHTML = `
            <div style="display:flex;gap:20px;align-items:center;">
                ${hudLogo({ title: 'HYPER', subtitle: 'BLITZ', titleColor: '#06b6d4', subColor: '#fbbf24' })}
                ${hudStat({ label: 'PUNTOS', id: 'blitz-score', color: '#06b6d4', value: '0', minWidth: 80 })}
                ${hudStat({ label: 'COMBO',  id: 'blitz-combo', color: '#10b981', value: '0', minWidth: 70 })}
                ${hudStat({ label: 'TIEMPO', id: 'blitz-timer', color: '#fbbf24', value: '30', minWidth: 70 })}
            </div>
            ${hudMode({ mode: 'BLITZ', modeColor: '#06b6d4', hint: 'TAP FAST · MULTI TARGET' })}
        `;
        const shell = createGameShell({
            container: this.uiContainer,
            hudHTML,
            frameColor: 'rgba(6,182,212,0.5)',
            cornerColor: '#06b6d4',
        });
        this._blitzRoot     = shell.root;
        this._blitzWrap     = shell.wrap;
        this._blitzPixiHost = shell.pixiHost;
        this._blitzFrame    = shell.pixiHost;

        // Init Pixi + escena tras layout
        requestAnimationFrame(async () => {
            const { w, h } = computeRectSize(this._blitzWrap, { padding: 40, maxW: 1200, maxH: 720, minW: 400, minH: 360 });
            this._blitzW = w; this._blitzH = h;
            this._blitzPixiHost.style.width  = w + 'px';
            this._blitzPixiHost.style.height = h + 'px';

            this._blitzApp = await initPixiApp(this._blitzPixiHost, { width: w, height: h });
            this._buildBlitzScene();
            this._blitzApp.ticker.add((t) => this._blitzTick(t));

            // Arrancar spawns + timer
            this._blitzT0 = performance.now();
            for(let i = 0; i < 3; i++) this._spawnBlitzTarget();

            this._blitzInterval = setInterval(() => {
                this._blitzTime--;
                const el = document.getElementById('blitz-timer');
                if(el) {
                    el.textContent = this._blitzTime;
                    if(this._blitzTime <= 5) {
                        el.style.color = '#ef4444';
                        el.style.textShadow = '0 0 18px #ef4444';
                    }
                }
                if(this._blitzTime <= 0) this._endBlitz();
            }, 1000);
        });

        this._blitzResizeFn = () => {
            if(!this._blitzApp) return;
            const { w, h } = computeRectSize(this._blitzWrap, { padding: 40, maxW: 1200, maxH: 720, minW: 400, minH: 360 });
            this._blitzW = w; this._blitzH = h;
            this._blitzPixiHost.style.width  = w + 'px';
            this._blitzPixiHost.style.height = h + 'px';
            this._blitzApp.renderer.resize(w, h);
        };
        window.addEventListener('resize', this._blitzResizeFn);
    }

    _buildBlitzScene() {
        const stage = this._blitzApp.stage;
        this._blitzBg       = new PIXI.Container();
        this._blitzStars    = new PIXI.Container();
        this._blitzTargetsL = new PIXI.Container();
        this._blitzPartsL   = new PIXI.Container();
        this._blitzFxL      = new PIXI.Container();
        stage.addChild(this._blitzBg, this._blitzStars, this._blitzTargetsL, this._blitzPartsL, this._blitzFxL);

        // Fondo radial cian
        const bg = new PIXI.Graphics();
        const W = this._blitzW, H = this._blitzH;
        const cx = W/2, cy = H/2;
        for(let i = 10; i >= 0; i--) {
            const r = Math.max(W, H) * 0.8 * (i / 10);
            const c = i === 10 ? 0x020a10 : i > 6 ? 0x051018 : 0x0a1824;
            bg.circle(cx, cy, r).fill({ color: c, alpha: 1 });
        }
        this._blitzBg.addChild(bg);

        // Grid cian tenue
        const grid = new PIXI.Graphics();
        const step = 50;
        for(let x = 0; x <= W; x += step) {
            grid.moveTo(x, 0).lineTo(x, H).stroke({ color: 0x06b6d4, width: 1, alpha: 0.05 });
        }
        for(let y = 0; y <= H; y += step) {
            grid.moveTo(0, y).lineTo(W, y).stroke({ color: 0x06b6d4, width: 1, alpha: 0.05 });
        }
        this._blitzBg.addChild(grid);

        // Estrellas
        this._blitzStarArr = spawnStarfield(this._blitzStars, W, H, 7000, 0x67e8f9);

        // Bloom
        const bloom = makeBloom({ threshold: 0.5, bloomScale: 0.75, blur: 5 });
        if(bloom) stage.filters = [bloom];
    }

    _spawnBlitzTarget() {
        if(!this._blitzActive) return;
        const margin = 50;
        const W = this._blitzW, H = this._blitzH;
        const size = 34 + Math.floor(Math.random() * 26);
        const x = margin + Math.random() * (W - margin * 2);
        const y = margin + Math.random() * (H - margin * 2);
        const life = 900 + Math.random() * 600;
        const color = 0x06b6d4;

        const target = new PIXI.Container();
        target.x = x; target.y = y;
        target.eventMode = 'static';
        target.cursor = 'pointer';

        // Halo
        const halo = new PIXI.Graphics();
        halo.circle(0, 0, size * 0.95).fill({ color, alpha: 0.16 });
        target.addChild(halo);

        // Ring que se encoge
        const ring = new PIXI.Graphics();
        ring.circle(0, 0, size * 0.85).stroke({ color, width: 2, alpha: 0.55 });
        target.addChild(ring);
        target._ring = ring;

        // Core oscuro con borde cian
        const core = new PIXI.Graphics();
        core.circle(0, 0, size * 0.5).fill({ color: 0x050810, alpha: 0.9 });
        core.circle(0, 0, size * 0.5).stroke({ color, width: 2.5, alpha: 1 });
        core.filters = [ makeGlow(color, 14, 3) ];
        target.addChild(core);

        // Punto central
        const dot = new PIXI.Graphics();
        dot.circle(0, 0, size * 0.14).fill({ color: 0xe0f7ff });
        dot.filters = [ makeGlow(0xe0f7ff, 8, 1.5) ];
        target.addChild(dot);

        // Entrada con bounce
        target.scale.set(0.2);
        target.alpha = 0;
        if(window.gsap) {
            window.gsap.to(target.scale, { x: 1, y: 1, duration: 0.16, ease: 'back.out(2.2)' });
            window.gsap.to(target, { alpha: 1, duration: 0.14 });
        } else {
            target.scale.set(1); target.alpha = 1;
        }

        target._born = performance.now();
        target._lifespan = life;
        target._size = size;
        target._color = color;

        target.on('pointerdown', (e) => {
            e.stopPropagation?.();
            this._hitBlitzTarget(target);
        });

        this._blitzTargetsL.addChild(target);
        this._blitzTargets.push(target);
    }

    _hitBlitzTarget(target) {
        if(!target.parent || !this._blitzActive) return;
        const cx = target.x, cy = target.y;

        spawnParticles(this._blitzPartsL, this._blitzParticles, cx, cy, 0x06b6d4, 14, {
            maxSpeed: 4.5, minRadius: 2, maxRadius: 4.5, minDecay: 0.02, maxDecay: 0.05,
        });
        this._removeBlitzTarget(target);

        this._blitzCombo++;
        if(this._blitzCombo > this._blitzBestCombo) this._blitzBestCombo = this._blitzCombo;
        const mult = this._blitzCombo >= 10 ? 3 : this._blitzCombo >= 5 ? 2 : 1;
        const pts = 10 * mult;
        this._blitzScore += pts;

        this._spawnBlitzFloater(cx, cy, 0x06b6d4, `+${pts}`);
        try { this.audio?.playTone(700 + Math.min(this._blitzCombo * 35, 600), 'square', 0.05); } catch(e){}

        // Hitos de combo
        if(this._blitzCombo === 5 || this._blitzCombo === 10 || this._blitzCombo % 15 === 0) {
            this._spawnBlitzFloater(cx, cy - 32, 0xfbbf24, `${this._blitzCombo}X COMBO!`);
            winFlash(this._blitzFrame, { color: '#fbbf24', duration: 300 });
            if(this._blitzCombo >= 10) {
                burstConfetti(this._blitzFrame, { count: 40, colors: ['#06b6d4', '#fbbf24', '#ffffff'] });
            }
        }

        // Actualizar HUD
        const scoreEl = document.getElementById('blitz-score');
        const comboEl = document.getElementById('blitz-combo');
        if(scoreEl) scoreEl.textContent = this._blitzScore;
        if(comboEl) {
            comboEl.textContent = this._blitzCombo;
            comboEl.style.color = this._blitzCombo >= 10 ? '#ef4444' : this._blitzCombo >= 5 ? '#fbbf24' : '#10b981';
            comboEl.style.textShadow = `0 0 14px ${comboEl.style.color}`;
        }

        // Spawnea otro para mantener siempre 3 activos (o más según combo)
        const targetCount = Math.min(5, 3 + Math.floor(this._blitzCombo / 8));
        while(this._blitzTargets.length < targetCount) {
            setTimeout(() => this._spawnBlitzTarget(), 200 + Math.random() * 200);
            break; // uno por cada hit
        }
    }

    _spawnBlitzFloater(x, y, color, text) {
        if(!this._blitzFxL) return;
        const f = new PIXI.Text({
            text,
            style: {
                fontFamily: 'Orbitron, monospace',
                fontSize: 22,
                fontWeight: '800',
                fill: color,
                stroke: { color: 0x000000, width: 3 },
            },
        });
        f.anchor.set(0.5);
        f.x = x; f.y = y;
        f._born = performance.now();
        f._ttl  = 800;
        f.filters = [ makeGlow(color, 10, 2) ];
        this._blitzFxL.addChild(f);
        this._blitzFloaters.push(f);
    }

    _removeBlitzTarget(target) {
        this._blitzTargets = this._blitzTargets.filter(t => t !== target);
        if(target.parent) target.parent.removeChild(target);
        try { target.destroy({ children: true }); } catch(e){}
    }

    _blitzTick(ticker) {
        if(!this._blitzActive || !this._blitzApp) return;
        const t = (performance.now() - this._blitzT0) * 0.001;
        const now = performance.now();

        updateStarfield(this._blitzStarArr, t);

        // Targets: ring shrinking + expirar
        for(let i = this._blitzTargets.length - 1; i >= 0; i--) {
            const target = this._blitzTargets[i];
            const elapsed = now - target._born;
            const prog = Math.min(1, elapsed / target._lifespan);
            if(prog >= 1) {
                // Target expiró sin ser tocado = breaks combo
                const cx = target.x, cy = target.y;
                this._removeBlitzTarget(target);
                if(this._blitzCombo > 0) {
                    this._blitzCombo = 0;
                    const comboEl = document.getElementById('blitz-combo');
                    if(comboEl) { comboEl.textContent = '0'; comboEl.style.color = '#10b981'; }
                    this._spawnBlitzFloater(cx, cy, 0xf97316, 'MISS');
                }
                // Respawn para mantener densidad
                setTimeout(() => this._spawnBlitzTarget(), 150);
                continue;
            }
            if(target._ring) {
                target._ring.clear();
                const r = target._size * 0.85 * (1 - prog * 0.75);
                target._ring.circle(0, 0, r)
                    .stroke({ color: target._color, width: 2, alpha: 0.4 + (1 - prog) * 0.5 });
            }
            // Pulso
            const pulse = 1 + Math.sin(t * 6 + target._born * 0.001) * 0.05;
            target.scale.set(pulse);
        }

        updateParticles(this._blitzParticles);

        // Floaters
        for(let i = this._blitzFloaters.length - 1; i >= 0; i--) {
            const f = this._blitzFloaters[i];
            const age = now - f._born;
            const p = age / f._ttl;
            if(p >= 1) {
                f.destroy();
                this._blitzFloaters.splice(i, 1);
                continue;
            }
            f.y -= 0.6;
            f.alpha = 1 - p;
            f.scale.set(1 + p * 0.2);
        }
    }

    _endBlitz() {
        if(!this._blitzActive) return;
        this._blitzActive = false;
        clearInterval(this._blitzInterval);
        if(this._blitzResizeFn) window.removeEventListener('resize', this._blitzResizeFn);
        const score = this._blitzScore + this._blitzBestCombo * 20;

        // Destruir app Pixi
        if(this._blitzApp) {
            try { this._blitzApp.destroy(true, { children: true, texture: true }); } catch(e){}
            this._blitzApp = null;
        }

        try { window.app.addScore(score, Math.floor(score/10)); } catch(e){}
        if(this.onQuit) this.onQuit(score);
    }

    // Probabilidad de fake signal antes del GO
    getFakeChance() {
        if (this.mode === 'HARDCORE') return 0;       // HARDCORE no tiene fakes
        if (this.mode === 'FAKEOUT')  return 0.7;     // FAKEOUT muy agresivo
        if (this.round <= 1) return 0;                // Primera ronda sin fakes
        if (this.mode === 'ENDLESS') return 0.4;
        return 0.35;                                   // NORMAL
    }

    prepareRound() {
        this.state = 'WAITING';
        this.round++;
        const bestReflex = (window.app?.stats?.bestReflex) || 0;
        const fastStreakHtml = this.fastStreak > 0 ? `<div class="reflex-fast-streak">STREAK ×${this.fastStreak}</div>` : '';
        this.uiContainer.innerHTML = `
            <div class="reflex-container" id="reflex-trigger">
                <div style="position:relative;">
                    ${fastStreakHtml}
                    <div class="reflex-core waiting" id="reflex-core">
                        <div class="reflex-ring"></div><div class="reflex-ring"></div>
                        <div class="reflex-msg">ESPERA LA SEÑAL...</div>
                    </div>
                </div>
                <div style="margin-top:50px; font-family:monospace; color:#94a3b8;">RONDA ${this.round} / ${this.maxRounds}</div>
                ${bestReflex > 0 ? `<div class="reflex-personal-best">RÉCORD: ${bestReflex}ms</div>` : ''}
            </div>`;
        const trigger = document.getElementById('reflex-trigger');
        trigger.onmousedown = (e) => { e.preventDefault(); this.handleClick(); };
        trigger.ontouchstart = (e) => { e.preventDefault(); this.handleClick(); };

        // Calcular schedule: fake signals antes del real
        const fakeChance = this.getFakeChance();
        const fakes = [];
        let simTime = Math.random() * 1800 + 800;
        while (Math.random() < fakeChance && fakes.length < 3 && simTime < 3500) {
            fakes.push(simTime);
            simTime += Math.random() * 1200 + 600;
        }
        const realDelay = simTime + Math.random() * 1500 + 1500;

        // Programar fakes
        fakes.forEach(t => {
            setTimeout(() => {
                if (this.state !== 'WAITING' || this._paused) return;
                this.triggerFakeSignal();
            }, t);
        });
        // Programar señal real
        this.timeoutId = setTimeout(() => { this.activateSignal(); }, realDelay);
    }

    triggerFakeSignal() {
        if (this.state !== 'WAITING') return;
        this.state = 'FAKE';
        this.fakeCount++;
        const core = document.getElementById('reflex-core');
        if (core) {
            core.className = 'reflex-core fake';
            core.innerHTML = '<div class="reflex-ms" style="font-size:1.4rem;color:#fbbf24;">!?</div><div class="reflex-msg" style="color:#fbbf24;font-weight:bold;">¿PULSAR?</div>';
        }
        try { this.audio.playTone(400, 'sawtooth', 0.06); } catch(e) {}
        setTimeout(() => {
            if (this.state === 'FAKE') {
                this.fakeSurvived++;
                this.state = 'WAITING';
                const c = document.getElementById('reflex-core');
                if (c) {
                    c.className = 'reflex-core waiting';
                    c.innerHTML = '<div class="reflex-ring"></div><div class="reflex-ring"></div><div class="reflex-msg">ESPERA LA SEÑAL...</div>';
                }
            }
        }, 400);
    }

    activateSignal() {
        if (this.state !== 'WAITING') return;
        this.state = 'ACTIVE';
        this.startTime = performance.now();
        const core = document.getElementById('reflex-core');
        if(core) {
            core.className = 'reflex-core active';
            core.innerHTML = '<div class="reflex-ms">!</div><div class="reflex-msg" style="color:white; font-weight:bold;">¡PULSA!</div>';
        }
        try { this.audio.playTone(800, 'square', 0.1); } catch(e){}
    }

    handleClick() {
        if (this.state === 'FAKE') {
            this.handleFail("¡FAKE SIGNAL! No debías pulsar");
        } else if (this.state === 'WAITING') {
            this.handleFail("¡DEMASIADO PRONTO!");
        } else if (this.state === 'ACTIVE') {
            const endTime = performance.now();
            const reactionTime = Math.floor(endTime - this.startTime);
            this.handleSuccess(reactionTime);
        }
    }

    handleSuccess(ms) {
        this.state = 'RESULT';
        this.times.push(ms);
        const core = document.getElementById('reflex-core');
        core.innerHTML = `<div class="reflex-ms">${ms}<span style="font-size:1rem">ms</span></div>`;
        if (this.mode === 'HARDCORE' && ms > 250) { this.handleFail("¡LENTO! (>250ms)"); return; }
        let color = CONFIG.COLORS.REFLEX;
        let msg = "BUENO";

        // Tracking fast streak (<200ms)
        if (ms < 200) {
            this.fastStreak++;
            color = CONFIG.COLORS.GOLD;
            msg = "¡DIVINO!";
            try { this.audio.playWin(2); } catch(e){}
            // Bonus al acumular 3 streak <200ms
            if (this.fastStreak === 3 || this.fastStreak === 6 || this.fastStreak === 10) {
                const bonus = this.fastStreak === 10 ? 500 : (this.fastStreak === 6 ? 250 : 100);
                this.bonusCreditsEarned += bonus;
                window.app.credits += bonus;
                const vc = document.getElementById('val-credits'); if (vc) vc.innerText = window.app.credits;
                try { window.app.showToast(`STREAK ×${this.fastStreak}`, `+${bonus} CR DIAMANTE`, 'success'); } catch(e) {}
                window.app.save();
            }
        } else {
            this.fastStreak = 0;
            if (ms < 300) { color = CONFIG.COLORS.SUCCESS; msg = "EXCELENTE"; try { this.audio.playClick(); } catch(e){} }
            else { color = "#94a3b8"; msg = "NORMAL"; try { this.audio.playClick(); } catch(e){} }
        }
        core.style.borderColor = color;
        core.style.boxShadow = `0 0 30px ${color}`;
        // Combo
        try {
            if(ms < 300) window.app.combo?.hit();
            else         window.app.combo?.miss();
        } catch(e){}
        try { window.app.showToast(`${ms}ms`, msg, "default"); } catch(e){}
        setTimeout(() => {
            if (this.round < this.maxRounds) { this.prepareRound(); }
            else { this.finishGame(); }
        }, 1500);
    }

    handleFail(reason) {
        this.state = 'RESULT';
        clearTimeout(this.timeoutId);
        const core = document.getElementById('reflex-core');
        if(core) {
            core.className = 'reflex-core fail';
            core.innerHTML = `<i class="fa-solid fa-xmark" style="font-size:4rem; color:white;"></i><div class="reflex-msg" style="color:white;">${reason}</div>`;
        }
        try { this.audio.playLose(); } catch(e){}
        try { window.app.combo?.miss(); } catch(e){}
        document.body.classList.add('shake-screen');
        setTimeout(() => document.body.classList.remove('shake-screen'), 500);

        if (this.mode === 'HARDCORE' || this.mode === 'ENDLESS') {
            // Fin inmediato en estos modos
            setTimeout(() => this.finishGame(true), 1500);
        } else {
            this.times.push(1000); 
            try { window.app.showToast("FALLO", "+1000ms Penalización", "danger"); } catch(e){}
            setTimeout(() => {
                if (this.round < this.maxRounds) this.prepareRound();
                else this.finishGame();
            }, 1500);
        }
    }

    // --- CORRECCIÓN CRÍTICA ---
    pause() {
        if(this._paused) return;
        this._paused = true;
        clearTimeout(this.timeoutId);
    }
    resume() {
        if(!this._paused) return;
        this._paused = false;
        if(this.state === 'WAITING') this.prepareRound();
    }

    cleanup() {
        if(this.timeoutId) { clearTimeout(this.timeoutId); this.timeoutId = null; }
        if(this._blitzInterval) { clearInterval(this._blitzInterval); this._blitzInterval = null; }
        this._blitzActive = false;
        if(this._blitzResizeFn) window.removeEventListener('resize', this._blitzResizeFn);
        if(this._blitzApp) {
            try { this._blitzApp.destroy(true, { children: true, texture: true }); } catch(e){}
            this._blitzApp = null;
        }
        this._blitzTargets = [];
        this._blitzParticles = [];
        this._blitzFloaters  = [];
        try { window.app.audio.setTension(false); } catch(e) {}
        try { window.app.combo?.end(); } catch(e) {}
        document.body.classList.remove('shake-screen');
    }

    triggerTension() { try{window.app.audio.setTension(true);}catch(e){} }

    finishGame(failed = false) {
        let score = 0;
        
        if (!failed && this.times.length > 0) {
            const sum = this.times.reduce((a, b) => a + b, 0);
            const avg = Math.floor(sum / this.times.length);
            
            // Puntuación inversa: Menos tiempo = más puntos
            // Base 1000 - promedio
            score = Math.max(0, 1000 - avg);
            if (this.mode === 'HARDCORE') score *= 2;
            if (this.mode === 'FAKEOUT')  score *= 2;
            if (this.mode === 'ENDLESS')  score = this.round * 10 + score;

            // Bonus por fake-survival en modo FAKEOUT
            if (this.mode === 'FAKEOUT' && this.fakeSurvived > 0) {
                score += this.fakeSurvived * 50;
            }

            // Guardar récord de milisegundos para logros
            if (window.app) {
                const bestPrev = (window.app.stats?.bestReflex) || 99999;
                if (avg < bestPrev) {
                    try { window.app.showToast('¡NUEVO RÉCORD!', `${avg}ms (prev: ${bestPrev===99999?'—':bestPrev}ms)`, 'success'); } catch(e) {}
                }
                window.app.saveStat?.('bestReflex', avg);
            }

            let creditsEarned = Math.floor(score / 10);
            window.app.credits += creditsEarned;
            try { window.app.addScore(score, creditsEarned); } catch(e){}
        }

        // Llamada Inteligente: Le pasamos el Score calculado
        if(this.onQuit) this.onQuit(score);
    }
}