// games/neon-maze.js
// Neon Maze — laberinto procedural generado con DFS backtracking.
// El jugador va del inicio (verde) a la salida (dorado).
// Modos: NORMAL (15x15), SPEED (tiempo limitado 60s), DARK (visión reducida).

export class NeonMaze {
    constructor(canvas, audio, onGameOver) {
        this.canvas    = canvas;
        this.audio     = audio;
        this.onEnd     = onGameOver;
        this.container = document.getElementById('game-ui-overlay');
        this.mode      = 'NORMAL';
        this.score     = 0;
        this.moves     = 0;
        this.running   = false;
        this._timerInt = null;
        this._keyFn    = null;
        this._startTime = 0;
        this._mazesSolved = 0;
    }

    init() {
        this._showModeSelect();
    }

    _showModeSelect() {
        const modes = [
            { id:'nm-normal', mc:'#06b6d4', icon:'fa-route',       name:'NORMAL', desc:'15x15 · ritmo libre' },
            { id:'nm-speed',  mc:'#f97316', icon:'fa-gauge-high',  name:'SPEED',  desc:'60s · múltiples laberintos' },
            { id:'nm-dark',   mc:'#a855f7', icon:'fa-moon',        name:'DARK',   desc:'Visión reducida 3 celdas' },
        ];
        this.container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;">NEON MAZE</div>
                <div style="font-size:0.65rem;color:#06b6d4;letter-spacing:3px;font-family:monospace;">LABERINTO PROCEDURAL</div>
                <div style="width:120px;height:1px;background:#06b6d4;margin:10px auto 0;opacity:0.5;"></div>
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
            <button class="btn btn-secondary" id="nm-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;
        document.getElementById('nm-normal').onclick = () => this._startWithMode('NORMAL');
        document.getElementById('nm-speed').onclick  = () => this._startWithMode('SPEED');
        document.getElementById('nm-dark').onclick   = () => this._startWithMode('DARK');
        document.getElementById('nm-back').onclick   = () => { if(this.onEnd) this.onEnd(0); };
    }

    _startWithMode(mode) {
        this.mode = mode;
        this.COLS = mode === 'SPEED' ? 13 : 15;
        this.ROWS = this.COLS;
        this.CELL = 0;
        this.maze   = [];
        this.player = { x: 0, y: 0 };
        this.playerRender = { x: 0, y: 0 };   // Posición interpolada para animación
        this.playerAnim   = { from: {x:0,y:0}, to: {x:0,y:0}, t: 1, duration: 140 };
        this.trail        = [];               // Breadcrumb del path
        this.particles    = [];               // Partículas al moverse
        this.stars        = [];               // Fondo estrellado parallax
        this.exit   = { x: this.COLS - 1, y: this.ROWS - 1 };
        this.score  = 0;
        this.moves  = 0;
        this.timeLeft = mode === 'SPEED' ? 60 : null;
        this._t0    = performance.now();
        try { this.canvas.setMood('DEFAULT'); } catch(e){}
        this._build();
    }

    _computeSize() {
        const getDim = (el, prop) => (el && el[prop] > 0) ? el[prop] : 0;
        // Descontamos padding del wrap (20 cada lado = 40)
        const maxW = (getDim(this._wrap, 'clientWidth')
                  || getDim(this._root, 'clientWidth')
                  || window.innerWidth) - 40;
        const maxH = (getDim(this._wrap, 'clientHeight')
                  || (getDim(this._root, 'clientHeight') - 80)
                  || (window.innerHeight - 140)) - 40;
        const dim  = Math.max(300, Math.min(maxW, maxH, 900));
        this.CELL  = Math.max(14, Math.floor(dim / this.COLS));
        this.BOARD = this.CELL * this.COLS;

        // Aplicar dimensiones explícitas al host (el flex de wrap lo centra)
        if(this._pixiHost) {
            this._pixiHost.style.width  = this.BOARD + 'px';
            this._pixiHost.style.height = this.BOARD + 'px';
        }
    }

    async _initPixi() {
        this._pixiApp = new PIXI.Application();
        await this._pixiApp.init({
            width: this.BOARD,
            height: this.BOARD,
            backgroundAlpha: 0,
            antialias: true,
            resolution: Math.min(window.devicePixelRatio || 1, 2),
            autoDensity: true,
        });
        const canvas = this._pixiApp.canvas;
        // Remover de cualquier parent inesperado y fijar al host
        if(canvas.parentNode && canvas.parentNode !== this._pixiHost) {
            canvas.parentNode.removeChild(canvas);
        }
        // Estilos explícitos para garantizar que el canvas no escape
        canvas.style.cssText = 'display:block;position:relative;width:100%;height:100%;';
        this._pixiHost.appendChild(canvas);
    }

    _makeGlow(color, dist = 10, strength = 2) {
        if(window.PIXI?.filters?.GlowFilter) {
            return new PIXI.filters.GlowFilter({
                distance: dist, outerStrength: strength, innerStrength: 0.3,
                color, quality: 0.25
            });
        }
        return new PIXI.BlurFilter({ strength: 3 });
    }

    _makeBloom() {
        if(window.PIXI?.filters?.AdvancedBloomFilter) {
            return new PIXI.filters.AdvancedBloomFilter({
                threshold: 0.55,      // solo lo muy brillante bloomea
                bloomScale: 0.8,      // intensidad moderada
                brightness: 1.0,
                blur: 4,
                quality: 4,
            });
        }
        return null;
    }

    _buildSceneGraph() {
        const app = this._pixiApp;
        const stage = app.stage;

        // --- Contenedores por capa ---
        this._bgLayer        = new PIXI.Container();
        this._gridLayer      = new PIXI.Container();
        this._starsLayer     = new PIXI.Container();
        this._trailLayer     = new PIXI.Container();
        this._wallsContainer = new PIXI.Container();
        this._exitLayer      = new PIXI.Container();
        this._particleLayer  = new PIXI.Container();
        this._playerLayer    = new PIXI.Container();
        this._vignetteLayer  = new PIXI.Container();

        stage.addChild(this._bgLayer, this._gridLayer, this._starsLayer,
            this._trailLayer, this._wallsContainer, this._exitLayer,
            this._particleLayer, this._playerLayer, this._vignetteLayer);

        this._drawBackground();
        this._spawnStars();
        this._drawGrid();
        this._drawWalls();
        this._drawExit();
        this._drawPlayer();
        this._drawVignette();

        // Apply bloom al stage entero si está disponible
        const bloom = this._makeBloom();
        if(bloom) stage.filters = [bloom];

        this._particles = [];
        this._trailSprites = [];
    }

    _drawBackground() {
        const g = new PIXI.Graphics();
        const W = this.BOARD;
        // Gradient radial fake con múltiples círculos concéntricos
        for(let i = 10; i >= 0; i--) {
            const r = (W * 0.75) * (i / 10);
            const c = i === 10 ? 0x030610 : i > 6 ? 0x060a18 : 0x0a1428;
            g.circle(W/2, W/2, r).fill({ color: c, alpha: 1 });
        }
        this._bgLayer.addChild(g);
    }

    _spawnStars() {
        const W = this.BOARD;
        const n = Math.floor((W * W) / 5500);
        this._stars = [];
        for(let i = 0; i < n; i++) {
            const s = new PIXI.Graphics();
            const r = 0.4 + Math.random() * 1.4;
            s.circle(0, 0, r).fill({ color: 0xb4d2ff, alpha: 0.6 });
            s.x = Math.random() * W;
            s.y = Math.random() * W;
            s._phase = Math.random() * Math.PI * 2;
            s._speed = 0.6 + Math.random() * 1.4;
            this._starsLayer.addChild(s);
            this._stars.push(s);
        }
    }

    _drawGrid() {
        const g = new PIXI.Graphics();
        const C = this.CELL;
        for(let i = 0; i <= this.COLS; i++) {
            g.moveTo(i*C, 0).lineTo(i*C, this.BOARD).stroke({ color: 0x3b82f6, width: 1, alpha: 0.04 });
        }
        for(let j = 0; j <= this.ROWS; j++) {
            g.moveTo(0, j*C).lineTo(this.BOARD, j*C).stroke({ color: 0x3b82f6, width: 1, alpha: 0.04 });
        }
        this._gridLayer.addChild(g);
    }

    _drawWalls() {
        this._wallsContainer.removeChildren();
        const C = this.CELL;

        // Helper que añade todos los segmentos a una Graphics
        const addSegments = (g) => {
            for(let y = 0; y < this.ROWS; y++) {
                for(let x = 0; x < this.COLS; x++) {
                    const cell = this.maze[y][x];
                    const px = x * C, py = y * C;
                    if(cell.walls[0]) g.moveTo(px, py).lineTo(px + C, py);
                    if(cell.walls[1]) g.moveTo(px + C, py).lineTo(px + C, py + C);
                    if(cell.walls[2]) g.moveTo(px, py + C).lineTo(px + C, py + C);
                    if(cell.walls[3]) g.moveTo(px, py).lineTo(px, py + C);
                }
            }
        };

        // Layer 1: glow ancho y sutil (azul oscuro)
        const wallsGlow = new PIXI.Graphics();
        addSegments(wallsGlow);
        wallsGlow.stroke({ color: 0x3b82f6, width: 4, alpha: 0.35, cap: 'round', join: 'round' });
        wallsGlow.filters = [ this._makeGlow(0x3b82f6, 14, 2.2) ];

        // Layer 2: core nítido brillante (blanco-azulado)
        const wallsCore = new PIXI.Graphics();
        addSegments(wallsCore);
        wallsCore.stroke({ color: 0xdbe7ff, width: 1.5, alpha: 1, cap: 'round', join: 'round' });

        // Layer 3: acentos en intersecciones (puntos brillantes)
        const nodes = new PIXI.Graphics();
        for(let y = 0; y <= this.ROWS; y++) {
            for(let x = 0; x <= this.COLS; x++) {
                nodes.circle(x * C, y * C, 0.8).fill({ color: 0x60a5fa, alpha: 0.55 });
            }
        }

        this._wallsContainer.addChild(wallsGlow, wallsCore, nodes);
    }

    _drawExit() {
        this._exitLayer.removeChildren();
        const C = this.CELL;
        const cx = this.exit.x * C + C/2;
        const cy = this.exit.y * C + C/2;

        // Halo externo
        const halo = new PIXI.Graphics();
        halo.circle(0, 0, C * 0.8).fill({ color: 0xfbbf24, alpha: 0.25 });
        halo.x = cx; halo.y = cy;
        halo._isHalo = true;
        this._exitLayer.addChild(halo);
        this._exitHalo = halo;

        // Rayos
        const rays = new PIXI.Graphics();
        for(let i = 0; i < 4; i++) {
            const a = (Math.PI * 2 / 4) * i;
            const x0 = Math.cos(a) * C * 0.5;
            const y0 = Math.sin(a) * C * 0.5;
            const x1 = Math.cos(a) * C * 0.95;
            const y1 = Math.sin(a) * C * 0.95;
            rays.moveTo(x0, y0).lineTo(x1, y1);
        }
        rays.stroke({ color: 0xfbbf24, width: 1.5, alpha: 0.6, cap: 'round' });
        rays.x = cx; rays.y = cy;
        this._exitLayer.addChild(rays);
        this._exitRays = rays;

        // Rombo principal
        const diamond = new PIXI.Graphics();
        const r = C * 0.38;
        diamond.moveTo(0, -r).lineTo(r, 0).lineTo(0, r).lineTo(-r, 0).closePath();
        diamond.fill({ color: 0xfbbf24, alpha: 1 });
        diamond.stroke({ color: 0xfffbe8, width: 1.5 });
        diamond.x = cx; diamond.y = cy;
        diamond.filters = [ this._makeGlow(0xfbbf24, 18, 4) ];
        this._exitLayer.addChild(diamond);
        this._exitDiamond = diamond;

        // Core brillante
        const core = new PIXI.Graphics();
        core.circle(0, 0, r * 0.22).fill({ color: 0xffffff });
        core.x = cx; core.y = cy;
        this._exitLayer.addChild(core);
        this._exitCore = core;
    }

    _drawPlayer() {
        this._playerLayer.removeChildren();
        const C = this.CELL;
        const cx = this.player.x * C + C/2;
        const cy = this.player.y * C + C/2;

        // Halo
        const halo = new PIXI.Graphics();
        halo.circle(0, 0, C * 0.9).fill({ color: 0x3b82f6, alpha: 0.25 });
        halo.x = cx; halo.y = cy;
        this._playerLayer.addChild(halo);
        this._playerHalo = halo;

        // Ring rotatorio
        const ring = new PIXI.Graphics();
        const pr = C * 0.3;
        for(let i = 0; i < 3; i++) {
            const a0 = (Math.PI * 2 / 3) * i;
            ring.arc(0, 0, pr * 1.6, a0, a0 + Math.PI / 4)
                .stroke({ color: 0x93c5fd, width: 1.8, alpha: 0.75 });
        }
        ring.x = cx; ring.y = cy;
        this._playerLayer.addChild(ring);
        this._playerRing = ring;

        // Orbe (gradient fake con 3 círculos)
        const orb = new PIXI.Graphics();
        orb.circle(0, 0, pr).fill({ color: 0x1e40af });
        orb.circle(-pr * 0.15, -pr * 0.15, pr * 0.78).fill({ color: 0x3b82f6 });
        orb.circle(-pr * 0.3, -pr * 0.3, pr * 0.4).fill({ color: 0xe0ecff });
        orb.x = cx; orb.y = cy;
        orb.filters = [ this._makeGlow(0x3b82f6, 14, 3.5) ];
        this._playerLayer.addChild(orb);
        this._playerOrb = orb;
    }

    _drawVignette() {
        const W = this.BOARD;
        // Vignette con 4 rects en cada borde + esquinas (gradient fake)
        const steps = 12;
        const band = W * 0.25;
        for(let i = 0; i < steps; i++) {
            const alpha = 0.05 + (i / steps) * 0.04;
            const thick = (band / steps);
            const g = new PIXI.Graphics();
            const y0 = i * thick;
            // top band
            g.rect(0, y0, W, thick).fill({ color: 0x000000, alpha });
            // bottom band
            g.rect(0, W - y0 - thick, W, thick).fill({ color: 0x000000, alpha });
            // left band
            g.rect(y0, 0, thick, W).fill({ color: 0x000000, alpha: alpha * 0.7 });
            // right band
            g.rect(W - y0 - thick, 0, thick, W).fill({ color: 0x000000, alpha: alpha * 0.7 });
            this._vignetteLayer.addChild(g);
        }
    }

    _addParticles(cx, cy, color, count = 10) {
        for(let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 1 + Math.random() * 2.5;
            const g = new PIXI.Graphics();
            const r = 1.8 + Math.random() * 2.5;
            g.circle(0, 0, r).fill({ color, alpha: 1 });
            g.x = cx; g.y = cy;
            g._vx = Math.cos(a) * s;
            g._vy = Math.sin(a) * s;
            g._life = 1;
            g._decay = 0.015 + Math.random() * 0.025;
            g._r = r;
            this._particleLayer.addChild(g);
            this._particles.push(g);
        }
    }

    _tick(ticker) {
        if(!this.running) return;
        const dt = ticker.deltaMS / 1000;
        const t = (performance.now() - this._t0) * 0.001;
        const C = this.CELL;

        // --- Estrellas: twinkle ---
        for(const s of this._stars) {
            s.alpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * s._speed + s._phase));
        }

        // --- Trail breadcrumb ---
        // Limpiar sprites sobrantes
        while(this._trailSprites.length > this.trail.length) {
            const sp = this._trailSprites.shift();
            sp.destroy();
        }
        // Crear/actualizar sprites
        for(let i = 0; i < this.trail.length; i++) {
            let sp = this._trailSprites[i];
            if(!sp) {
                sp = new PIXI.Graphics();
                this._trailLayer.addChild(sp);
                this._trailSprites[i] = sp;
            }
            const age = (i + 1) / this.trail.length;
            const tr = this.trail[i];
            sp.clear();
            sp.circle(0, 0, C * (0.1 + age * 0.08))
              .fill({ color: 0x10b981, alpha: 0.12 + age * 0.3 });
            sp.x = tr.x * C + C/2;
            sp.y = tr.y * C + C/2;
            sp.filters = sp.filters || [ this._makeGlow(0x10b981, 8, 1.5) ];
        }

        // --- Player: interpolar + animar ---
        const anim = this.playerAnim;
        if(anim.t < 1) {
            anim.t = Math.min(1, anim.t + ticker.deltaMS / anim.duration);
            const k = this._easeOutCubic(anim.t);
            this.playerRender.x = anim.from.x + (anim.to.x - anim.from.x) * k;
            this.playerRender.y = anim.from.y + (anim.to.y - anim.from.y) * k;
        } else {
            this.playerRender.x = this.player.x;
            this.playerRender.y = this.player.y;
        }
        const pcx = this.playerRender.x * C + C/2;
        const pcy = this.playerRender.y * C + C/2;
        const pulse = 1 + Math.sin(t * 5) * 0.12;
        [this._playerHalo, this._playerRing, this._playerOrb].forEach(s => {
            if(!s) return; s.x = pcx; s.y = pcy;
        });
        if(this._playerOrb)  this._playerOrb.scale.set(pulse);
        if(this._playerHalo) {
            this._playerHalo.scale.set(0.95 + Math.sin(t * 2) * 0.1);
            this._playerHalo.alpha = 0.7 + Math.sin(t * 3) * 0.2;
        }
        if(this._playerRing) this._playerRing.rotation = t * 2;

        // --- Exit: rotación y pulso ---
        if(this._exitDiamond) {
            this._exitDiamond.rotation = t * 1.2;
            const p = 1 + Math.sin(t * 3) * 0.08;
            this._exitDiamond.scale.set(p);
        }
        if(this._exitRays)  this._exitRays.rotation  = t * 0.6;
        if(this._exitHalo) {
            this._exitHalo.scale.set(1 + Math.sin(t * 2) * 0.18);
            this._exitHalo.alpha = 0.6 + Math.sin(t * 2.5) * 0.3;
        }
        if(this._exitCore) {
            this._exitCore.alpha = 0.7 + Math.sin(t * 6) * 0.3;
        }

        // --- Partículas ---
        for(let i = this._particles.length - 1; i >= 0; i--) {
            const p = this._particles[i];
            p.x += p._vx;
            p.y += p._vy;
            p._vx *= 0.92;
            p._vy *= 0.92;
            p._life -= p._decay;
            if(p._life <= 0) {
                p.destroy();
                this._particles.splice(i, 1);
                continue;
            }
            p.alpha = p._life;
            p.scale.set(p._life);
        }

        // --- Dark mode: ocultar lejanías ---
        if(this.mode === 'DARK') {
            // TODO: aplicar mask o radial alpha. Por ahora confiamos en el bloom + vignette
        }
    }

    _handleResize() {
        if(!this._pixiApp) return;
        this._computeSize();
        this._pixiApp.renderer.resize(this.BOARD, this.BOARD);
        // Reconstruir la escena
        this._pixiApp.stage.removeChildren();
        this._buildSceneGraph();
    }

    _build() {
        this.container.innerHTML = '';

        // Wrapper propio — NO tocamos el cssText del #game-ui-overlay.
        // IMPORTANTE: el overlay tiene padding-top:56px (HUD global de créditos),
        // pero inset:0 ignora ese padding. Posicionamos explícitamente desde top:56px.
        this._root = document.createElement('div');
        this._root.style.cssText = 'position:absolute;top:56px;left:0;right:0;bottom:0;display:flex;flex-direction:column;background:rgba(5,8,16,0.92);pointer-events:auto;overflow:hidden;';
        this.container.appendChild(this._root);

        // HUD premium
        this._hud = document.createElement('div');
        this._hud.style.cssText = `
            padding:14px 28px;
            background:linear-gradient(180deg, rgba(5,8,20,0.98) 0%, rgba(5,8,20,0.88) 100%);
            border-bottom:1px solid rgba(59,130,246,0.25);
            box-shadow:0 2px 20px rgba(59,130,246,0.08);
            display:flex;justify-content:space-between;align-items:center;
            font-family:'Orbitron',monospace;flex-shrink:0;z-index:2;
        `;
        const stat = (label, id, color, value) => `
            <div style="display:flex;flex-direction:column;gap:4px;min-width:90px;">
                <div style="font-size:0.52rem;color:#64748b;letter-spacing:3px;font-weight:600;">${label}</div>
                <div style="display:flex;align-items:baseline;gap:6px;">
                    <div id="${id}" style="font-size:1.5rem;color:${color};letter-spacing:3px;font-weight:700;text-shadow:0 0 12px ${color}aa;">${value}</div>
                </div>
            </div>`;
        this._hud.innerHTML = `
            <div style="display:flex;gap:28px;align-items:center;">
                <div style="display:flex;flex-direction:column;gap:2px;padding-right:24px;border-right:1px solid rgba(59,130,246,0.2);">
                    <div style="font-size:0.55rem;color:#3b82f6;letter-spacing:4px;font-weight:700;">NEON</div>
                    <div style="font-size:0.75rem;color:#fbbf24;letter-spacing:3px;font-weight:800;">MAZE</div>
                </div>
                ${stat('PUNTOS', 'nm-score', '#fbbf24', '0')}
                ${stat('MOVIMIENTOS', 'nm-moves', '#60a5fa', '0')}
                ${this.mode === 'SPEED' ? stat('TIEMPO', 'nm-timer', '#10b981', '60') : ''}
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
                <div style="font-size:0.55rem;color:#64748b;letter-spacing:3px;">MODO</div>
                <div style="font-size:0.85rem;color:${this.mode==='DARK'?'#a855f7':this.mode==='SPEED'?'#10b981':'#60a5fa'};letter-spacing:4px;font-weight:800;text-shadow:0 0 10px currentColor;">${this.mode}</div>
                <div style="font-size:0.48rem;color:#475569;letter-spacing:2px;margin-top:2px;">WASD / FLECHAS</div>
            </div>
        `;
        this._root.appendChild(this._hud);

        // Canvas wrapper — flex centering tanto horizontal como vertical
        this._wrap = document.createElement('div');
        this._wrap.style.cssText = 'flex:1 1 0;display:flex;align-items:center;justify-content:center;padding:20px;min-height:0;min-width:0;width:100%;box-sizing:border-box;';
        this._root.appendChild(this._wrap);

        // Host para el canvas de PixiJS — este ES el frame visible.
        // Se le aplicará size explícito después de _computeSize y contiene
        // tanto el canvas como las esquinas decorativas.
        this._pixiHost = document.createElement('div');
        this._pixiHost.style.cssText = `
            position:relative;
            border:1px solid rgba(59,130,246,0.4);
            border-radius:4px;
            background:#030610;
            box-shadow:
                0 0 60px rgba(59,130,246,0.25),
                0 0 140px rgba(59,130,246,0.1),
                inset 0 0 30px rgba(0,0,0,0.5);
            line-height:0;
            overflow:visible;
            flex:0 0 auto;
        `;
        this._wrap.appendChild(this._pixiHost);

        // Esquinas decoradas (cyber-UI) — posicionadas FUERA del border via negative offsets
        const cornerSVG = (rot) => `<svg viewBox="0 0 24 24" style="width:20px;height:20px;transform:rotate(${rot}deg);display:block;">
            <path d="M2 2 L2 11 M2 2 L11 2" stroke="#fbbf24" stroke-width="2.2" fill="none" stroke-linecap="round"/>
            <circle cx="2" cy="2" r="1.6" fill="#fbbf24"/>
        </svg>`;
        const mkCorner = (pos, rot) => {
            const d = document.createElement('div');
            d.style.cssText = `position:absolute;${pos};pointer-events:none;z-index:3;`;
            d.innerHTML = cornerSVG(rot);
            return d;
        };
        this._pixiHost.appendChild(mkCorner('top:-6px;left:-6px', 0));
        this._pixiHost.appendChild(mkCorner('top:-6px;right:-6px', 90));
        this._pixiHost.appendChild(mkCorner('bottom:-6px;left:-6px', -90));
        this._pixiHost.appendChild(mkCorner('bottom:-6px;right:-6px', 180));
        // Alias para compatibilidad con código que referencia _frame
        this._frame = this._pixiHost;

        this._generateMaze();
        this._bindKeys();

        // Esperar layout antes de dimensionar + arrancar Pixi
        requestAnimationFrame(async () => {
            this._computeSize();
            await this._initPixi();
            this._buildSceneGraph();
            this._pixiApp.ticker.add((ticker) => this._tick(ticker));
        });

        // Re-fit ante resize de ventana
        this._resizeFn = () => this._handleResize();
        window.addEventListener('resize', this._resizeFn);

        this.running    = true;
        this._startTime = Date.now();

        if(this.mode === 'SPEED') {
            this._timerInt = setInterval(() => {
                this.timeLeft--;
                const el = document.getElementById('nm-timer');
                if(el) {
                    el.textContent = this.timeLeft;
                    if(this.timeLeft <= 10) el.style.color = '#ef4444';
                }
                if(this.timeLeft <= 0) this._end(false);
            }, 1000);
        }
    }

    _easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    _generateMaze() {
        // DFS backtracking
        const C = this.COLS, R = this.ROWS;
        // Each cell: { walls: [N,E,S,W], visited }
        this.maze = Array.from({ length: R }, (_, y) =>
            Array.from({ length: C }, (_, x) => ({ walls: [1,1,1,1], visited: false, x, y }))
        );

        const stack = [this.maze[0][0]];
        this.maze[0][0].visited = true;
        const dirs = [
            { dx: 0, dy: -1, wi: 0, wo: 2 }, // N
            { dx: 1, dy:  0, wi: 1, wo: 3 }, // E
            { dx: 0, dy:  1, wi: 2, wo: 0 }, // S
            { dx:-1, dy:  0, wi: 3, wo: 1 }, // W
        ];

        while(stack.length) {
            const cur = stack[stack.length - 1];
            const unvisited = dirs
                .filter(d => {
                    const nx = cur.x + d.dx, ny = cur.y + d.dy;
                    return nx >= 0 && nx < C && ny >= 0 && ny < R && !this.maze[ny][nx].visited;
                });
            if(!unvisited.length) { stack.pop(); continue; }
            const d = unvisited[Math.floor(Math.random() * unvisited.length)];
            const nx = cur.x + d.dx, ny = cur.y + d.dy;
            cur.walls[d.wi] = 0;
            this.maze[ny][nx].walls[d.wo] = 0;
            this.maze[ny][nx].visited = true;
            stack.push(this.maze[ny][nx]);
        }
    }

    _bindKeys() {
        const dirs = {
            'ArrowUp': {dx:0,dy:-1}, 'w': {dx:0,dy:-1}, 'W': {dx:0,dy:-1},
            'ArrowDown': {dx:0,dy:1}, 's': {dx:0,dy:1}, 'S': {dx:0,dy:1},
            'ArrowLeft': {dx:-1,dy:0}, 'a': {dx:-1,dy:0}, 'A': {dx:-1,dy:0},
            'ArrowRight': {dx:1,dy:0}, 'd': {dx:1,dy:0}, 'D': {dx:1,dy:0},
        };
        const wallDir = { '0,-1':0, '1,0':1, '0,1':2, '-1,0':3 };

        this._keyFn = (e) => {
            if(!this.running) return;
            const d = dirs[e.key];
            if(!d) return;
            e.preventDefault();

            const nx = this.player.x + d.dx;
            const ny = this.player.y + d.dy;
            if(nx < 0 || nx >= this.COLS || ny < 0 || ny >= this.ROWS) return;

            const wallIdx = wallDir[`${d.dx},${d.dy}`];
            if(this.maze[this.player.y][this.player.x].walls[wallIdx]) return; // hay pared

            // Agregar celda previa al trail (breadcrumb)
            this.trail.push({ x: this.player.x, y: this.player.y });
            if(this.trail.length > 18) this.trail.shift();

            // Animar transición interpolada
            this.playerAnim = {
                from: { x: this.player.x, y: this.player.y },
                to:   { x: nx, y: ny },
                t: 0,
                duration: 140
            };

            // Partículas de "paso"
            const C = this.CELL;
            const cx = this.player.x * C + C/2;
            const cy = this.player.y * C + C/2;
            this._addParticles(cx, cy, 0x60a5fa, 8);

            this.player.x = nx;
            this.player.y = ny;
            this.moves++;
            const movesEl = document.getElementById('nm-moves');
            if(movesEl) movesEl.textContent = this.moves;
            try { this.audio?.playTone(600 + Math.random() * 100, 'sine', 0.03); } catch(e){}

            if(this.player.x === this.exit.x && this.player.y === this.exit.y) {
                // Partículas de victoria en exit
                const ex = this.exit.x * C + C/2;
                const ey = this.exit.y * C + C/2;
                this._addParticles(ex, ey, 0xfbbf24, 60);
                this._addParticles(ex, ey, 0xffffff, 20);
                this._solved();
            }
        };
        window.addEventListener('keydown', this._keyFn);

        // Touch swipe
        let tx = 0, ty = 0;
        const touchTarget = this._pixiApp?.canvas || this._pixiHost;
        if(!touchTarget) return;
        touchTarget.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
        touchTarget.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].clientX - tx;
            const dy = e.changedTouches[0].clientY - ty;
            if(Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
            let key;
            if(Math.abs(dx) > Math.abs(dy)) key = dx > 0 ? 'ArrowRight' : 'ArrowLeft';
            else                            key = dy > 0 ? 'ArrowDown'  : 'ArrowUp';
            this._keyFn({ key, preventDefault: ()=>{} });
        }, { passive: true });
    }

    _solved() {
        this._mazesSolved++;
        const elapsed = (Date.now() - this._startTime) / 1000;
        const timeBonus = Math.max(0, Math.round((60 - elapsed) * 5));
        const moveBonus = Math.max(0, Math.round((this.COLS * this.ROWS * 0.5 - this.moves) * 2));
        const pts = 500 + timeBonus + moveBonus;
        this.score += pts;

        const el = document.getElementById('nm-score');
        if(el) el.textContent = this.score;

        // Flash verde en el frame
        if(this._frame) {
            const origShadow = this._frame.style.boxShadow;
            this._frame.style.boxShadow = '0 0 80px #10b981, 0 0 160px rgba(16,185,129,0.5), inset 0 0 60px rgba(16,185,129,0.35)';
            this._frame.style.borderColor = '#10b981';
            setTimeout(() => {
                if(!this._frame) return;
                this._frame.style.boxShadow = origShadow;
                this._frame.style.borderColor = 'rgba(59,130,246,0.35)';
            }, 700);
        }

        // Screen shake con GSAP
        if(window.gsap && this._frame) {
            const tl = window.gsap.timeline();
            tl.to(this._frame, { x: -6, duration: 0.04 })
              .to(this._frame, { x: 6,  duration: 0.04 })
              .to(this._frame, { x: -4, duration: 0.04 })
              .to(this._frame, { x: 4,  duration: 0.04 })
              .to(this._frame, { x: 0,  duration: 0.05 });
        }

        // Confetti burst
        if(window.confetti) {
            try {
                const rect = this._frame?.getBoundingClientRect();
                const origin = rect ? {
                    x: (rect.left + rect.width / 2) / window.innerWidth,
                    y: (rect.top + rect.height / 2) / window.innerHeight,
                } : { x: 0.5, y: 0.5 };
                window.confetti({
                    particleCount: 80,
                    spread: 75,
                    origin,
                    colors: ['#fbbf24', '#10b981', '#60a5fa', '#ffffff'],
                    scalar: 0.9,
                    ticks: 120,
                });
            } catch(e) {}
        }

        if(this.mode === 'NORMAL' || this.mode === 'DARK') {
            // Un solo laberinto
            setTimeout(() => this._end(true), 900);
        } else {
            // SPEED: genera otro laberinto
            this.player       = { x: 0, y: 0 };
            this.playerRender = { x: 0, y: 0 };
            this.playerAnim.t = 1;
            this.trail        = [];
            this.moves        = 0;
            this._startTime   = Date.now();
            this._generateMaze();
            // Redibujar paredes con nuevo maze (player y exit ya están en sus posiciones)
            this._drawWalls();
        }
    }

    _end(won = true) {
        if(!this.running) return;
        this.running = false;
        clearInterval(this._timerInt);
        try { window.app.addScore(this.score, Math.floor(this.score / 20)); } catch(e){}
        if(this.onEnd) this.onEnd(this.score);
    }

    getScore() { return this.score; }

    pause() {
        this.running = false;
        if(this._pixiApp?.ticker) this._pixiApp.ticker.stop();
        clearInterval(this._timerInt);
        if(this._keyFn) window.removeEventListener('keydown', this._keyFn);
    }

    resume() {
        this.running = true;
        this._bindKeys();
        if(this._pixiApp?.ticker) this._pixiApp.ticker.start();
        if(this.mode === 'SPEED' && this.timeLeft > 0) {
            this._timerInt = setInterval(() => {
                this.timeLeft--;
                const el = document.getElementById('nm-timer');
                if(el) el.textContent = this.timeLeft;
                if(this.timeLeft <= 0) this._end(false);
            }, 1000);
        }
    }

    cleanup() {
        this.running = false;
        clearInterval(this._timerInt);
        if(this._keyFn) window.removeEventListener('keydown', this._keyFn);
        if(this._resizeFn) window.removeEventListener('resize', this._resizeFn);
        if(this._pixiApp) {
            try { this._pixiApp.destroy(true, { children: true, texture: true }); } catch(e) {}
            this._pixiApp = null;
        }
        this._particles = [];
        this._trailSprites = [];
        this.trail = [];
    }
}
