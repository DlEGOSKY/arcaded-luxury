import { CONFIG } from './config.js';

export class SeededRandom {
    constructor(seed) { this.seed = seed; }
    next() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
}

export class CanvasManager {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: true });
        this.fxParticles = []; 
        this.bgParticles = []; 
        
        // Configuración por defecto
        this.themeColor = { r: 59, g: 130, b: 246 }; 
        this.activeMood = null;
        
        this.resize();
        this.initBackground(); 
        window.addEventListener('resize', () => { this.resize(); this.initBackground(); });
        this.loop();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    // Convertir Hex a RGB para efectos de transparencia
    hexToRgb(hex) {
        if (!hex) return { r: 59, g: 130, b: 246 };
        // Si entra un nombre de color o variable, devolvemos un default seguro
        if (!hex.startsWith('#')) return { r: 59, g: 130, b: 246 };
        
        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? { 
            r: parseInt(result[1], 16), 
            g: parseInt(result[2], 16), 
            b: parseInt(result[3], 16) 
        } : { r: 59, g: 130, b: 246 };
    }

    setMood(styleId) {
        // Mapeo tema → mood visual del fondo
        const THEME_MOODS = {
            't_hack':       { c:[0,255,65],    mood:'MATRIX'       },
            't_matrix':     { c:[0,255,65],    mood:'MATRIX'       },
            't_gameby':     { c:[132,204,22],  mood:'RETRO'        },
            't_retro':      { c:[132,204,22],  mood:'RETRO'        },
            't_starcraft':  { c:[59,130,246],  mood:'STARS'        },
            't_vhs':        { c:[255,0,128],   mood:'SCANLINES'    },
            't_outrun':     { c:[255,0,255],   mood:'GRID'         },
            't_diablo':     { c:[185,28,28],   mood:'EMBERS'       },
            't_xperror':    { c:[21,96,189],   mood:'STATIC'       },
            't_blueprint':  { c:[255,255,255], mood:'TECH'         },
            't_crimson':    { c:[239,68,68],   mood:'DANGER'       },
            't_gold':       { c:[255,215,0],   mood:'GOLD'         },
            't_hot':        { c:[255,0,255],   mood:'HOT'          },
            't_void':       { c:[100,100,255], mood:'VOID'         },
            't_doom':       { c:[220,38,38],   mood:'EMBERS'       },
            't_cs16':       { c:[74,124,89],   mood:'RETRO'        },
            't_quake':      { c:[217,119,6],   mood:'EMBERS'       },
        };

        if(styleId && styleId.startsWith('#')) {
            this.themeColor = this.hexToRgb(styleId);
            this.activeMood = null;
        } else if(THEME_MOODS[styleId]) {
            const m = THEME_MOODS[styleId];
            this.themeColor = { r:m.c[0], g:m.c[1], b:m.c[2] };
            this.activeMood = m.mood;
        } else {
            this.themeColor = { r:59, g:130, b:246 };
            this.activeMood = null;
        }
        this.initBackground();
    }

    initBackground() {
        this.bgParticles = [];
        // Reducir partículas: 18000 en lugar de 12000 — mucho más liviano
        const count = Math.min(40, Math.floor((this.canvas.width * this.canvas.height) / 22000));
        for (let i = 0; i < count; i++) {
            this.bgParticles.push({
                x: Math.random() * this.canvas.width, 
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.4, 
                vy: (Math.random() - 0.5) * 0.4,
                size: Math.random() * 1.5 + 0.5,
                char: Math.random() > 0.5 ? '1' : '0'
            });
        }
    }

    explode(x, y, color) {
        if (window.app && window.app.settings && !window.app.settings.performance) return;

        const count = 20;
        const rect = this.canvas.getBoundingClientRect(); 
        const finalX = x || rect.width / 2;
        const finalY = y || rect.height / 2;
        
        for (let i = 0; i < count; i++) {
            this.fxParticles.push({
                x: finalX, y: finalY, 
                vx: (Math.random() - 0.5) * 15, 
                vy: (Math.random() - 0.5) * 15,
                life: 1.0, 
                color: color || `rgb(${this.themeColor.r},${this.themeColor.g},${this.themeColor.b})`,
                size: Math.random() * 5 + 2,
                char: Math.random() > 0.5 ? '1' : '0'
            });
        }
    }

    // DIBUJADO GENÉRICO (Sirve para Fondo y Explosiones)
    // DIBUJADO GENÉRICO (ACTUALIZADO)
    drawParticle(ctx, p, colorOverride = null) {
        let type = 'circle';
        if (window.app && window.app.shop && window.app.shop.equipped && window.app.shop.equipped.particle) {
            const pId = window.app.shop.equipped.particle;
            if      (pId.includes('square')) type = 'square';
            else if (pId.includes('star'))   type = 'star';
            else if (pId.includes('code'))   type = 'code';
            else if (pId.includes('bio'))    type = 'bio';
            else if (pId.includes('money'))  type = 'money';
            else if (pId.includes('heart'))  type = 'heart';
            else if (pId.includes('pizza'))  type = 'pizza';
            else if (pId.includes('matrix')) type = 'matrix';
            else if (pId.includes('stars') || pId.includes('star')) type = 'star';
            else if (pId.includes('bubble')) type = 'bubble';
            else if (pId.includes('note'))   type = 'note';
            else if (pId.includes('diamond'))type = 'diamond';
            else if (pId.includes('cross'))  type = 'cross';
            else if (pId.includes('ring'))   type = 'ring';
        }

        const color = colorOverride || ctx.fillStyle;
        ctx.fillStyle = color;

        if (type === 'square') {
            ctx.fillRect(p.x - p.size, p.y - p.size, p.size*2, p.size*2);
        } else if (type === 'star') {
            this.drawStar(ctx, p.x, p.y, 5, p.size*2, p.size);
        } else if (type === 'diamond') {
            const s = p.size * 1.4;
            ctx.beginPath(); ctx.moveTo(p.x, p.y-s); ctx.lineTo(p.x+s, p.y);
            ctx.lineTo(p.x, p.y+s); ctx.lineTo(p.x-s, p.y); ctx.closePath(); ctx.fill();
        } else if (type === 'code' || type === 'matrix') {
            ctx.font = Math.round(p.size*3.5)+'px monospace';
            ctx.fillStyle = type === 'matrix' ? '#00ff41' : color;
            ctx.fillText(p.char || String.fromCharCode(48+Math.floor(Math.random()*74)), p.x, p.y);
        } else if (type === 'bio') {
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size*0.6, 0, Math.PI*2);
            ctx.fillStyle = '#10b981'; ctx.fill();
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
            ctx.strokeStyle = '#10b981'; ctx.lineWidth = 1; ctx.stroke();
        } else if (type === 'money') {
            ctx.font = 'bold '+Math.round(p.size*3)+'px monospace';
            ctx.fillStyle = '#85bb65'; ctx.fillText('$', p.x, p.y);
        } else if (type === 'heart') {
            const s = p.size;
            ctx.beginPath(); ctx.moveTo(p.x, p.y+s*0.5);
            ctx.bezierCurveTo(p.x-s*1.5,p.y-s*0.8,p.x-s*2.5,p.y+s*0.8,p.x,p.y+s*2);
            ctx.bezierCurveTo(p.x+s*2.5,p.y+s*0.8,p.x+s*1.5,p.y-s*0.8,p.x,p.y+s*0.5);
            ctx.fillStyle = '#ef4444'; ctx.fill();
        } else if (type === 'pizza') {
            const s = p.size*1.5;
            ctx.beginPath(); ctx.moveTo(p.x,p.y-s); ctx.lineTo(p.x+s,p.y+s); ctx.lineTo(p.x-s,p.y+s); ctx.closePath();
            ctx.fillStyle='#f97316'; ctx.fill();
            ctx.beginPath(); ctx.arc(p.x,p.y,s*0.3,0,Math.PI*2); ctx.fillStyle='#ef4444'; ctx.fill();
        } else if (type === 'note') {
            ctx.font='bold '+Math.round(p.size*3.5)+'px monospace'; ctx.fillStyle=color;
            ctx.fillText(p.size>3?'♪':'♫',p.x,p.y);
        } else if (type === 'cross') {
            const s=p.size;
            ctx.fillRect(p.x-s*0.3,p.y-s,s*0.6,s*2); ctx.fillRect(p.x-s,p.y-s*0.3,s*2,s*0.6);
        } else if (type === 'ring') {
            ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
            ctx.strokeStyle=color; ctx.lineWidth=2; ctx.stroke();
        } else if (type === 'bubble') {
            ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
            ctx.strokeStyle=color; ctx.lineWidth=1.5; ctx.stroke();
            ctx.beginPath(); ctx.arc(p.x-p.size*0.3,p.y-p.size*0.3,p.size*0.25,0,Math.PI*2);
            ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.fill();
        } else {
            ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
        }
    }

    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        let step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    }

    pauseBackground() { this._paused = true; }
    resumeBackground() { 
        this._paused = false;
        this.fxParticles = [];
    }

    loop() {
        if (this._paused) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            requestAnimationFrame(() => this.loop());
            return;
        }
        // Limpiar
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. DIBUJAR FONDO adaptativo según mood
        const c = this.themeColor;
        const mood = this.activeMood;
        const W = this.canvas.width, H = this.canvas.height;
        const t = Date.now() * 0.001;

        if(mood === 'MATRIX') {
            // Matrix rain — columnas de caracteres verdes cayendo
            this.ctx.font = '12px monospace';
            this.ctx.fillStyle = 'rgba(0,255,65,0.7)';
            for(let i = 0; i < this.bgParticles.length; i++) {
                let p = this.bgParticles[i];
                p.y += 1.5 + p.size;
                if(p.y > H) { p.y = -20; p.x = Math.random() * W; }
                this.ctx.globalAlpha = 0.15 + Math.random() * 0.25;
                this.ctx.fillText(Math.random() > 0.5 ? '1' : '0', p.x, p.y);
            }
            this.ctx.globalAlpha = 1;

        } else if(mood === 'STARS') {
            // Constelaciones — puntos conectados estilo StarCraft
            const DIST_SQ = 14000;
            for(let i = 0; i < this.bgParticles.length; i++) {
                let p = this.bgParticles[i];
                p.x += p.vx * 0.3; p.y += p.vy * 0.3;
                if(p.x < 0 || p.x > W) p.vx *= -1;
                if(p.y < 0 || p.y > H) p.vy *= -1;
                const twinkle = 0.3 + Math.sin(t * 2 + i) * 0.2;
                this.ctx.globalAlpha = twinkle;
                this.ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},1)`;
                this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI*2); this.ctx.fill();
                for(let j = i+1; j < this.bgParticles.length; j++) {
                    let p2 = this.bgParticles[j];
                    const dx = p.x-p2.x, dy = p.y-p2.y;
                    const dSq = dx*dx+dy*dy;
                    if(dSq < DIST_SQ) {
                        this.ctx.beginPath();
                        this.ctx.globalAlpha = (1-dSq/DIST_SQ)*0.2;
                        this.ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},1)`;
                        this.ctx.lineWidth = 0.5;
                        this.ctx.moveTo(p.x,p.y); this.ctx.lineTo(p2.x,p2.y); this.ctx.stroke();
                    }
                }
            }
            this.ctx.globalAlpha = 1;

        } else if(mood === 'RETRO') {
            // Píxeles estilo Game Boy — cuadrados verdes sobre fondo oscuro
            for(let i = 0; i < this.bgParticles.length; i++) {
                let p = this.bgParticles[i];
                p.x += p.vx * 0.5; p.y += p.vy * 0.5;
                if(p.x < 0 || p.x > W) p.vx *= -1;
                if(p.y < 0 || p.y > H) p.vy *= -1;
                // Snap a grid de 4px
                const gx = Math.round(p.x / 4) * 4;
                const gy = Math.round(p.y / 4) * 4;
                this.ctx.globalAlpha = 0.3;
                this.ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},1)`;
                this.ctx.fillRect(gx, gy, 3, 3);
            }
            this.ctx.globalAlpha = 1;

        } else if(mood === 'EMBERS') {
            // Brasas — partículas pequeñas subiendo y parpadeando
            for(let i = 0; i < this.bgParticles.length; i++) {
                let p = this.bgParticles[i];
                p.y -= 0.8 + p.size * 0.5;
                p.x += Math.sin(t + p.vx) * 0.5;
                if(p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
                const flicker = 0.1 + Math.sin(t*4 + i) * 0.15;
                this.ctx.globalAlpha = flicker;
                this.ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},1)`;
                this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI*2); this.ctx.fill();
            }
            this.ctx.globalAlpha = 1;

        } else if(mood === 'STATIC') {
            // Estático estilo XP Error — ruido aleatorio
            if(!this._staticFrame || Math.random() < 0.3) {
                this._staticFrame = true;
                for(let i = 0; i < this.bgParticles.length * 2; i++) {
                    const sx = Math.random() * W;
                    const sy = Math.random() * H;
                    const sw = Math.random() * 4 + 1;
                    this.ctx.globalAlpha = Math.random() * 0.08;
                    this.ctx.fillStyle = Math.random() > 0.5 ? 'white' : `rgba(${c.r},${c.g},${c.b},1)`;
                    this.ctx.fillRect(sx, sy, sw, 2);
                }
            }
            this.ctx.globalAlpha = 1;

        } else if(mood === 'GRID') {
            // Cuadrícula perspectiva OutRun
            this.ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},0.15)`;
            this.ctx.lineWidth = 1;
            const cols = 12, rows = 8;
            const vanX = W/2, vanY = H*0.4;
            for(let col = 0; col <= cols; col++) {
                const bx = (col/cols) * W;
                this.ctx.globalAlpha = 0.15;
                this.ctx.beginPath(); this.ctx.moveTo(vanX, vanY); this.ctx.lineTo(bx, H); this.ctx.stroke();
            }
            for(let row = 1; row <= rows; row++) {
                const ry = vanY + (H - vanY) * (row/rows);
                const spread = (ry - vanY) / (H - vanY);
                this.ctx.globalAlpha = 0.1 * (row/rows);
                this.ctx.beginPath(); this.ctx.moveTo(vanX - spread*W*0.5, ry); this.ctx.lineTo(vanX + spread*W*0.5, ry); this.ctx.stroke();
            }
            for(let i = 0; i < this.bgParticles.length; i++) {
                let p = this.bgParticles[i];
                p.x += p.vx; p.y += p.vy;
                if(p.x < 0 || p.x > W) p.vx *= -1;
                if(p.y < 0 || p.y > H) p.vy *= -1;
                this.ctx.globalAlpha = 0.2;
                this.ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},1)`;
                this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); this.ctx.fill();
            }
            this.ctx.globalAlpha = 1;

        } else {
            // Default — red neuronal conectada
            const DIST_SQ = 9000;
            this.ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},0.4)`;
            this.ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},0.1)`;
            this.ctx.lineWidth = 1;
            for(let i = 0; i < this.bgParticles.length; i++) {
                let p = this.bgParticles[i];
                p.x += p.vx; p.y += p.vy;
                if(p.x < 0 || p.x > W) p.vx *= -1;
                if(p.y < 0 || p.y > H) p.vy *= -1;
                this.ctx.globalAlpha = 0.4;
                this.drawParticle(this.ctx, p);
                for(let j = i+1; j < this.bgParticles.length; j++) {
                    let p2 = this.bgParticles[j];
                    const dx = p.x-p2.x, dy = p.y-p2.y;
                    const dSq = dx*dx+dy*dy;
                    if(dSq < DIST_SQ) {
                        this.ctx.beginPath();
                        this.ctx.globalAlpha = (1-dSq/DIST_SQ)*0.3;
                        this.ctx.moveTo(p.x,p.y); this.ctx.lineTo(p2.x,p2.y); this.ctx.stroke();
                    }
                }
            }
            this.ctx.globalAlpha = 1;
        }

        // 2. DIBUJAR EXPLOSIONES (FX)
        for (let i = this.fxParticles.length - 1; i >= 0; i--) {
            let p = this.fxParticles[i];
            p.x += p.vx; 
            p.y += p.vy; 
            p.life -= 0.02;
            
            if (p.life <= 0) { 
                this.fxParticles.splice(i, 1); 
            } else {
                this.ctx.globalAlpha = p.life; 
                this.drawParticle(this.ctx, p, p.color);
            }
        }
        this.ctx.globalAlpha = 1;

        requestAnimationFrame(() => this.loop());
    }
}

/**
 * Algoritmo de Decodificación (Fuerza Bruta JS) [cite: 65, 68]
 * Sustituye caracteres aleatoriamente por glifos "Cyber" hasta fijar el valor final.
 */
export function resolveText(element, targetString, duration = 800) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/?#$!@%&*";
    let iterations = 0;
    const maxIterations = 15;
    
    const interval = setInterval(() => {
        element.innerText = targetString
            .split("")
            .map((char, index) => {
                // La probabilidad de fijar el carácter aumenta con cada iteración [cite: 70]
                if (index < iterations) return targetString[index];
                return chars[Math.floor(Math.random() * chars.length)];
            })
            .join("");

        if (iterations >= targetString.length) clearInterval(interval);
        iterations += targetString.length / maxIterations;
    }, duration / maxIterations);
}