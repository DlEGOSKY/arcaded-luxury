// games/speed-tap.js
// Speed Tap (v36+) — Migrado a PixiJS con GlowFilter + Bloom.
// Targets como sprites Pixi con glow real, partículas burst al hit,
// screen-shake en fallos y confetti en big combos.
// Modos: NORMAL (30s), BLITZ (20s rápido), ENDURANCE (3 vidas, ilimitado).

import {
    createGameShell, hudStat, hudLogo, hudMode,
    initPixiApp, makeGlow, makeBloom,
    winFlash, screenShake, burstConfetti,
    spawnParticles, updateParticles,
    spawnStarfield, updateStarfield,
    computeRectSize,
} from '../systems/pixi-stage.js';

export class SpeedTap {
    constructor(canvas, audio, onGameOver) {
        this.canvas    = canvas;
        this.audio     = audio;
        this.onEnd     = onGameOver;
        this.container = document.getElementById('game-ui-overlay');
        this.mode      = 'NORMAL';

        this.score    = 0;
        this.combo    = 0;
        this.bestCombo = 0;
        this.misses   = 0;
        this.running  = false;
        this.targets  = [];
        this._raf     = null;
        this._timerInt = null;
        this._spawnTO  = null;
    }

    init() {
        this._showModeSelect();
    }

    _showModeSelect() {
        const modes = [
            { id:'st-normal',    mc:'#3b82f6', icon:'fa-bolt',              name:'NORMAL',    desc:'30s · ritmo estándar' },
            { id:'st-blitz',     mc:'#f97316', icon:'fa-fire-flame-curved', name:'BLITZ',     desc:'20s · targets rápidos' },
            { id:'st-endurance', mc:'#ef4444', icon:'fa-heart-pulse',       name:'ENDURANCE', desc:'3 vidas · sin tiempo' },
        ];
        this.container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;">SPEED TAP</div>
                <div style="font-size:0.65rem;color:#3b82f6;letter-spacing:3px;font-family:monospace;">PROTOCOLO TÁCTIL</div>
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
                    <div style="font-family:var(--font-display);font-size:0.78rem;letter-spacing:2px;color:${m.mc};">${m.name}</div>
                    <div style="font-size:0.6rem;color:#475569;font-family:monospace;text-align:center;line-height:1.5;">${m.desc}</div>
                </div>`).join('')}
            </div>
            <button class="btn btn-secondary" id="st-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;
        document.getElementById('st-normal').onclick    = () => this._startWithMode('NORMAL');
        document.getElementById('st-blitz').onclick     = () => this._startWithMode('BLITZ');
        document.getElementById('st-endurance').onclick = () => this._startWithMode('ENDURANCE');
        document.getElementById('st-back').onclick      = () => { if(this.onEnd) this.onEnd(0); };
    }

    _startWithMode(mode) {
        this.mode      = mode;
        this.maxMisses = mode === 'ENDURANCE' ? 3 : Infinity;
        this.timeLeft  = mode === 'BLITZ' ? 20 : mode === 'NORMAL' ? 30 : Infinity;
        this._spawnDelay = mode === 'BLITZ' ? 600 : 900;
        this._targetLife = mode === 'BLITZ' ? 1200 : 1800;
        try { this.canvas.setMood('REFLEX'); } catch(e){}
        this._build();
    }

    _build() {
        const modeColor = this.mode === 'BLITZ' ? '#f97316' : this.mode === 'ENDURANCE' ? '#ef4444' : '#60a5fa';
        const hudHTML = `
            <div style="display:flex;gap:20px;align-items:center;">
                ${hudLogo({ title: 'SPEED', subtitle: 'TAP' })}
                ${hudStat({ label: 'PUNTOS', id: 'st-score', color: '#60a5fa', value: '0', minWidth: 80 })}
                ${hudStat({ label: 'COMBO',  id: 'st-combo', color: '#10b981', value: '0', minWidth: 70 })}
                ${hudStat({
                    label: this.mode === 'ENDURANCE' ? 'VIDAS' : 'TIEMPO',
                    id: 'st-timer',
                    color: this.mode === 'ENDURANCE' ? '#ef4444' : '#fbbf24',
                    value: this.mode === 'ENDURANCE' ? '3' : this.timeLeft,
                    minWidth: 70,
                })}
            </div>
            ${hudMode({ mode: this.mode, modeColor, hint: 'VERDE=TAP · ROJO=EVITAR' })}
        `;
        const shell = createGameShell({
            container: this.container,
            hudHTML,
            frameColor: `${modeColor}66`,
            cornerColor: '#fbbf24',
        });
        this._root     = shell.root;
        this._hud      = shell.hud;
        this._wrap     = shell.wrap;
        this._pixiHost = shell.pixiHost;
        this._frame    = shell.pixiHost;

        // Dimensionar + init Pixi en rAF (tras layout)
        requestAnimationFrame(async () => {
            const { w, h } = computeRectSize(this._wrap, { padding: 40, maxW: 1200, maxH: 720, minW: 400, minH: 360 });
            this.BOARD_W = w; this.BOARD_H = h;
            this._pixiHost.style.width  = w + 'px';
            this._pixiHost.style.height = h + 'px';

            this._pixiApp = await initPixiApp(this._pixiHost, { width: w, height: h });
            this._buildScene();
            this._pixiApp.ticker.add((t) => this._tick(t));

            // Mostrar hint + arrancar
            this._showHint();
        });

        this._resizeFn = () => this._handleResize();
        window.addEventListener('resize', this._resizeFn);
    }

    _buildScene() {
        const stage = this._pixiApp.stage;
        this._bgLayer       = new PIXI.Container();
        this._starsLayer    = new PIXI.Container();
        this._targetsLayer  = new PIXI.Container();
        this._particleLayer = new PIXI.Container();
        this._fxLayer       = new PIXI.Container();  // floaters de puntos
        stage.addChild(this._bgLayer, this._starsLayer, this._targetsLayer, this._particleLayer, this._fxLayer);

        // Fondo radial
        const bg = new PIXI.Graphics();
        const W = this.BOARD_W, H = this.BOARD_H;
        const cx = W/2, cy = H/2;
        for(let i = 10; i >= 0; i--) {
            const r = Math.max(W, H) * 0.8 * (i / 10);
            const c = i === 10 ? 0x030610 : i > 6 ? 0x060a18 : 0x0a1428;
            bg.circle(cx, cy, r).fill({ color: c, alpha: 1 });
        }
        this._bgLayer.addChild(bg);

        // Grid sutil
        const grid = new PIXI.Graphics();
        const step = 50;
        for(let x = 0; x <= W; x += step) {
            grid.moveTo(x, 0).lineTo(x, H).stroke({ color: 0x3b82f6, width: 1, alpha: 0.04 });
        }
        for(let y = 0; y <= H; y += step) {
            grid.moveTo(0, y).lineTo(W, y).stroke({ color: 0x3b82f6, width: 1, alpha: 0.04 });
        }
        this._bgLayer.addChild(grid);

        // Estrellas
        this._stars = spawnStarfield(this._starsLayer, W, H, 7000);

        // Bloom suave al stage
        const bloom = makeBloom({ threshold: 0.55, bloomScale: 0.7, blur: 4 });
        if(bloom) stage.filters = [bloom];

        this._particles = [];
        this._floaters  = [];
        this._t0 = performance.now();
    }

    _showHint() {
        const hint = document.createElement('div');
        hint.style.cssText = `
            position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
            text-align:center;z-index:5;pointer-events:none;
        `;
        hint.innerHTML = `
            <div style="font-family:'Orbitron',monospace;font-size:0.7rem;color:#64748b;letter-spacing:4px;margin-bottom:12px;">TOCA VERDES · EVITA ROJOS</div>
            <div style="font-family:'Orbitron',monospace;font-size:2.4rem;color:#60a5fa;letter-spacing:8px;font-weight:800;text-shadow:0 0 30px #60a5fa;">LISTO</div>
        `;
        this._pixiHost.appendChild(hint);
        setTimeout(() => {
            hint.style.transition = 'opacity 0.4s';
            hint.style.opacity = '0';
            setTimeout(() => { hint.remove(); this._start(); }, 400);
        }, 900);
    }

    _start() {
        this.running = true;
        if(this.mode !== 'ENDURANCE') {
            this._timerInt = setInterval(() => {
                this.timeLeft--;
                const el = document.getElementById('st-timer');
                if(el) {
                    el.textContent = this.timeLeft;
                    if(this.timeLeft <= 5) {
                        el.style.color = '#ef4444';
                        el.style.textShadow = '0 0 18px #ef4444';
                    }
                }
                if(this.timeLeft <= 0) this._end();
            }, 1000);
        }
        this._scheduleSpawn();
    }

    _scheduleSpawn() {
        if(!this.running) return;
        this._spawnTO = setTimeout(() => {
            this._spawnTarget();
            this._scheduleSpawn();
        }, this._spawnDelay + Math.random() * 400);
    }

    _spawnTarget() {
        const margin = 50;
        const W = this.BOARD_W, H = this.BOARD_H;
        const isGood = Math.random() > 0.3; // 70% verdes
        const size   = 38 + Math.floor(Math.random() * 26);
        const x = margin + Math.random() * (W - margin * 2);
        const y = margin + Math.random() * (H - margin * 2);
        const life = this._targetLife + Math.random() * 400;

        const color    = isGood ? 0x10b981 : 0xef4444;
        const colorHex = isGood ? '#10b981' : '#ef4444';

        // Container target
        const target = new PIXI.Container();
        target.x = x; target.y = y;
        target.eventMode = 'static';
        target.cursor = 'pointer';

        // Halo externo
        const halo = new PIXI.Graphics();
        halo.circle(0, 0, size * 0.9).fill({ color, alpha: 0.18 });
        target.addChild(halo);

        // Ring timer (se encoge)
        const ring = new PIXI.Graphics();
        ring.circle(0, 0, size * 0.85).stroke({ color, width: 2, alpha: 0.6 });
        target.addChild(ring);
        target._ring = ring;

        // Core circulo con glow
        const core = new PIXI.Graphics();
        core.circle(0, 0, size * 0.55).fill({ color: 0x050810, alpha: 0.9 });
        core.circle(0, 0, size * 0.55).stroke({ color, width: 2.5, alpha: 1 });
        core.filters = [ makeGlow(color, 14, 3) ];
        target.addChild(core);

        // Icono simple: check o cross con Graphics (no Font Awesome en Pixi)
        const icon = new PIXI.Graphics();
        const iR = size * 0.28;
        if(isGood) {
            // check
            icon.moveTo(-iR, 0).lineTo(-iR * 0.25, iR * 0.55).lineTo(iR, -iR * 0.5)
                .stroke({ color, width: 3.5, cap: 'round', join: 'round' });
        } else {
            // x
            icon.moveTo(-iR, -iR).lineTo(iR, iR).stroke({ color, width: 3.5, cap: 'round' });
            icon.moveTo(iR, -iR).lineTo(-iR, iR).stroke({ color, width: 3.5, cap: 'round' });
        }
        icon.filters = [ makeGlow(color, 8, 1.5) ];
        target.addChild(icon);

        // Animación entrada
        target.scale.set(0.2);
        target.alpha = 0;
        if(window.gsap) {
            window.gsap.to(target.scale, { x: 1, y: 1, duration: 0.18, ease: 'back.out(2)' });
            window.gsap.to(target, { alpha: 1, duration: 0.15 });
        } else {
            target.scale.set(1); target.alpha = 1;
        }

        // Tick de lifetime
        target._born     = performance.now();
        target._lifespan = life;
        target._size     = size;
        target._isGood   = isGood;
        target._color    = color;
        target._colorHex = colorHex;

        target.on('pointerdown', (e) => {
            e.stopPropagation?.();
            this._hit(target);
        });

        this._targetsLayer.addChild(target);
        this.targets.push(target);

        // Expira auto después de life
        target._expireAt = target._born + life;
    }

    _hit(target) {
        if(!target.parent) return;
        const cx = target.x, cy = target.y;
        const isGood = target._isGood;
        const color  = target._color;

        // Burst partículas
        spawnParticles(this._particleLayer, this._particles, cx, cy, color, 14, {
            maxSpeed: 4, minRadius: 2, maxRadius: 4.5, minDecay: 0.02, maxDecay: 0.05,
        });
        this._removeTarget(target);

        if(isGood) {
            this.combo++;
            if(this.combo > this.bestCombo) this.bestCombo = this.combo;
            const mult = this.combo >= 10 ? 3 : this.combo >= 5 ? 2 : 1;
            const pts = 10 * mult;
            this.score += pts;
            this._spawnFloater(cx, cy, 0x10b981, `+${pts}`);
            try { this.audio?.playTone(500 + Math.min(this.combo * 40, 800), 'sine', 0.06); } catch(e){}

            // Hitos de combo
            if(this.combo === 5 || this.combo === 10 || this.combo % 15 === 0) {
                this._spawnFloater(cx, cy - 30, 0xfbbf24, `${this.combo}X COMBO!`);
                winFlash(this._frame, { color: '#fbbf24', duration: 300 });
                if(this.combo >= 10) {
                    burstConfetti(this._frame, { count: 40, colors: ['#10b981', '#fbbf24', '#ffffff'] });
                }
            }
        } else {
            // Tocó rojo = penalización
            this.combo = 0;
            this.misses++;
            this.score = Math.max(0, this.score - 5);
            this._spawnFloater(cx, cy, 0xef4444, '-5');
            try { this.audio?.playTone(180, 'sawtooth', 0.08); } catch(e){}
            screenShake(this._frame, { strength: 8, count: 5 });
            winFlash(this._frame, { color: '#ef4444', duration: 300 });

            if(this.mode === 'ENDURANCE') {
                const lives = Math.max(0, this.maxMisses - this.misses);
                const el = document.getElementById('st-timer');
                if(el) el.textContent = lives;
                if(this.misses >= this.maxMisses) {
                    setTimeout(() => this._end(), 350);
                    return;
                }
            }
        }
        this._updateHUD();
    }

    _spawnFloater(x, y, color, text) {
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
        this._fxLayer.addChild(f);
        this._floaters.push(f);
    }

    _removeTarget(target) {
        this.targets = this.targets.filter(t => t !== target);
        if(target.parent) target.parent.removeChild(target);
        try { target.destroy({ children: true }); } catch(e) {}
    }

    _missGoodTarget(target) {
        const cx = target.x, cy = target.y;
        this._removeTarget(target);
        this.combo = 0;
        this._spawnFloater(cx, cy, 0xf97316, 'MISS');
        this._updateHUD();
    }

    _tick(ticker) {
        if(!this.running || !this._pixiApp) return;
        const t = (performance.now() - this._t0) * 0.001;
        const now = performance.now();

        // Estrellas
        updateStarfield(this._stars, t);

        // Targets: animar ring timer y pulso, expirar
        for(let i = this.targets.length - 1; i >= 0; i--) {
            const target = this.targets[i];
            const elapsed = now - target._born;
            const prog = Math.min(1, elapsed / target._lifespan);
            if(prog >= 1) {
                if(target._isGood) this._missGoodTarget(target);
                else {
                    // rojo expiró (correcto ignorarlo)
                    const cx = target.x, cy = target.y;
                    this._removeTarget(target);
                }
                continue;
            }
            // Actualizar ring: se encoge
            if(target._ring) {
                target._ring.clear();
                const radius = target._size * 0.85 * (1 - prog * 0.8);
                target._ring.circle(0, 0, radius)
                    .stroke({ color: target._color, width: 2, alpha: 0.5 + (1 - prog) * 0.4 });
            }
            // Pulso sutil
            const pulse = 1 + Math.sin(t * 6 + target._born * 0.001) * 0.05;
            target.scale.set(pulse);
        }

        // Partículas
        updateParticles(this._particles);

        // Floaters: suben y se desvanecen
        for(let i = this._floaters.length - 1; i >= 0; i--) {
            const f = this._floaters[i];
            const age = now - f._born;
            const p   = age / f._ttl;
            if(p >= 1) {
                f.destroy();
                this._floaters.splice(i, 1);
                continue;
            }
            f.y -= 0.6;
            f.alpha = 1 - p;
            f.scale.set(1 + p * 0.2);
        }
    }

    _handleResize() {
        if(!this._pixiApp) return;
        const { w, h } = computeRectSize(this._wrap, { padding: 40, maxW: 1200, maxH: 720, minW: 400, minH: 360 });
        this.BOARD_W = w; this.BOARD_H = h;
        this._pixiHost.style.width  = w + 'px';
        this._pixiHost.style.height = h + 'px';
        this._pixiApp.renderer.resize(w, h);
    }

    _updateHUD() {
        const scoreEl = document.getElementById('st-score');
        const comboEl = document.getElementById('st-combo');
        if(scoreEl) scoreEl.textContent = this.score;
        if(comboEl) {
            comboEl.textContent = this.combo;
            comboEl.style.color = this.combo >= 10 ? '#ef4444'
                               : this.combo >= 5  ? '#fbbf24'
                               : '#10b981';
            comboEl.style.textShadow = `0 0 14px ${comboEl.style.color}`;
        }
    }

    _end() {
        if(!this.running) return;
        this.running = false;
        clearInterval(this._timerInt);
        clearTimeout(this._spawnTO);
        // Limpiar targets
        for(const t of [...this.targets]) this._removeTarget(t);
        this.targets = [];
        try { window.app.addScore(this.score, Math.floor(this.score / 10)); } catch(e){}
        if(this.onEnd) this.onEnd(this.score);
    }

    getScore() { return this.score; }

    pause() {
        this.running = false;
        clearInterval(this._timerInt);
        clearTimeout(this._spawnTO);
        if(this._pixiApp?.ticker) this._pixiApp.ticker.stop();
    }

    resume() {
        if(this.running) return;
        this.running = true;
        if(this._pixiApp?.ticker) this._pixiApp.ticker.start();
        if(this.mode !== 'ENDURANCE') {
            this._timerInt = setInterval(() => {
                this.timeLeft--;
                const el = document.getElementById('st-timer');
                if(el) el.textContent = this.timeLeft;
                if(this.timeLeft <= 0) this._end();
            }, 1000);
        }
        this._scheduleSpawn();
    }

    cleanup() {
        this.running = false;
        clearInterval(this._timerInt);
        clearTimeout(this._spawnTO);
        if(this._resizeFn) window.removeEventListener('resize', this._resizeFn);
        if(this._pixiApp) {
            try { this._pixiApp.destroy(true, { children: true, texture: true }); } catch(e){}
            this._pixiApp = null;
        }
        this.targets = [];
        this._particles = [];
        this._floaters  = [];
    }
}
