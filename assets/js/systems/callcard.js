// systems/callcard.js
// Efectos visuales de fondo para el overlay de fin-de-partida (callcard).
// Extraido de main.js. Cada estilo renderiza un RAF en el canvas `cc-canvas`.
//
// Contrato: se llama `startEffect(style)` cuando el canvas `cc-canvas`
// ya existe en el DOM. El RAF se auto-detiene cuando el canvas se
// elimina (via MutationObserver sobre `game-ui-overlay`).
//
// BUG FIX aplicado: el objeto `effects` en main.js tenia 4 entradas
// DUPLICADAS — `minecraft`, `celeste`, `halflife`, `portal` aparecian
// dos veces. En JS, la segunda definicion pisa silenciosamente la
// primera, convirtiendo los ~80 lineas iniciales en codigo muerto.
// La version extraida mantiene solo la implementacion viva (segunda).

const COLOR_SETS = {
    default:   ['#3b82f6', '#6366f1'],
    bsod:      ['#0078d7', '#003399', '#1e90ff'],
    matrix:    ['#00ff41', '#00cc33', '#00ff88'],
    fallout:   ['#95b800', '#6b8500', '#c8d400'],
    vcity:     ['#ff6ec7', '#ff2d78', '#ffd700', '#00cfff'],
    doom:      ['#ef4444', '#dc2626', '#7f1d1d', '#f97316'],
    minecraft: ['#4aab2a', '#7ec850', '#c97c4f', '#5b8dd9'],
    tron:      ['#00f5ff', '#0099cc', '#00ccff'],
    discord:   ['#5865f2', '#7289da', '#99aab5'],
    hacker:    ['#00ff41', '#00cc33'],
    retro:     ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#ff00ff'],
    gold:      ['#ffd700', '#ffa500', '#ffec8b', '#ff8c00'],
    // V3 (2026-Q4)
    dos622:    ['#c0c0c0', '#ffff55', '#55ff55', '#ffffff'],
    ipod:      ['#a8a8a8', '#1d6fff', '#f0f0f0', '#e0e0e0'],
    n64:       ['#7a52a0', '#ff6b35', '#ffcc33', '#50c878'],
};

// -------------------------------------------------------------
// PUBLIC API
// -------------------------------------------------------------
export function startEffect(style /*, rankColor */) {
    const canvas = document.getElementById('cc-canvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width  = canvas.parentElement?.offsetWidth  || window.innerWidth;
    canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight;

    const W = canvas.width, H = canvas.height;
    const t0 = Date.now();
    const T  = () => (Date.now() - t0) / 1000;

    const pick = (s) => {
        const c = COLOR_SETS[s] || COLOR_SETS.default;
        return c[Math.floor(Math.random() * c.length)];
    };

    // Particulas genericas compartidas
    const P = Array.from({ length: 100 }, () => ({
        x:     Math.random() * W,
        y:     Math.random() * H,
        vx:    (Math.random() - 0.5) * 1.5,
        vy:    (Math.random() - 0.5) * 1.5,
        size:  Math.random() * 3 + 0.5,
        alpha: Math.random() * 0.7 + 0.1,
        color: pick(style),
    }));

    const effects = buildEffects(ctx, canvas, W, H, T, P, pick);
    const fn = effects[style] || effects.default;

    let raf;
    const loop = () => { fn(); raf = requestAnimationFrame(loop); };
    loop();

    // Auto-stop: cuando `cc-canvas` desaparece del DOM
    const observer = new MutationObserver(() => {
        if(!document.getElementById('cc-canvas')) {
            cancelAnimationFrame(raf);
            observer.disconnect();
        }
    });
    const ui = document.getElementById('game-ui-overlay');
    if(ui) observer.observe(ui, { childList: true });
}

// -------------------------------------------------------------
// EFFECT REGISTRY
// -------------------------------------------------------------
function buildEffects(ctx, canvas, W, H, T, P, pick) {
    return {

        // DEFAULT — particulas suaves
        default() {
            ctx.fillStyle = 'rgba(5,8,18,0.88)'; ctx.fillRect(0, 0, W, H);
            P.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if(p.x < 0 || p.x > W) p.vx *= -1;
                if(p.y < 0 || p.y > H) p.vy *= -1;
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle   = p.color;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
            });
            ctx.globalAlpha = 1;
        },

        // WINDOWS BSOD — pantalla azul con scanline y blink
        bsod() {
            ctx.fillStyle = '#0078d7'; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(W * 0.1, H * 0.1, 60, 60);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 18px monospace';
            const blink = Math.floor(T() * 2) % 2 === 0;
            if(blink) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, 0, W, H); }
            const sy = (T() * 30) % H;
            ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(0, sy, W, 3);
            ctx.globalAlpha = 1;
        },

        // MATRIX — columnas de katakana/binario
        matrix() {
            ctx.fillStyle = 'rgba(0,5,0,0.13)'; ctx.fillRect(0, 0, W, H);
            const cw = 16;
            const chars = '01ﾊﾋﾖｶｸｼﾐﾓﾔｺﾍﾎｱｲｳｴｵｶｷ';
            ctx.font = `${cw - 2}px monospace`;
            P.forEach(p => {
                p.y += 2.5 + p.size;
                if(p.y > H) { p.y = 0; p.x = Math.round(Math.random() * W / cw) * cw; }
                const c = chars[Math.floor(Math.random() * chars.length)];
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle   = p.alpha > 0.5 ? '#88ff88' : p.color;
                ctx.fillText(c, p.x, p.y);
            });
            ctx.globalAlpha = 1;
        },

        // FALLOUT — Pip-Boy verde + CRT + glitch horizontal
        fallout() {
            ctx.fillStyle = 'rgba(5,12,0,0.15)'; ctx.fillRect(0, 0, W, H);
            for(let y = 0; y < H; y += 3) {
                ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, y, W, 1);
            }
            P.forEach(p => {
                p.x += p.vx * 0.4; p.y += p.vy * 0.4;
                if(p.x < 0 || p.x > W) p.vx *= -1;
                if(p.y < 0 || p.y > H) p.vy *= -1;
                ctx.globalAlpha = p.alpha * 0.5;
                ctx.fillStyle   = p.color;
                ctx.fillRect(p.x, p.y, p.size, 1);
            });
            if(Math.random() < 0.06) {
                const gy = Math.random() * H;
                ctx.drawImage(canvas, Math.random() * 10 - 5, gy, W, 4, 0, gy, W, 4);
            }
            const vg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
            vg.addColorStop(0, 'transparent'); vg.addColorStop(1, 'rgba(0,30,0,0.6)');
            ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
        },

        // VICE CITY — neon rosa/amarillo
        vcity() {
            ctx.fillStyle = 'rgba(10,0,20,0.14)'; ctx.fillRect(0, 0, W, H);
            const gg = ctx.createLinearGradient(0, H * 0.7, 0, H);
            gg.addColorStop(0, 'rgba(255,45,120,0.05)');
            gg.addColorStop(1, 'rgba(0,207,255,0.05)');
            ctx.fillStyle = gg; ctx.fillRect(0, H * 0.7, W, H * 0.3);
            P.forEach(p => {
                p.y += 1.2; p.x += Math.sin(T() + p.vx) * 0.4;
                if(p.y > H) { p.y = -5; p.x = Math.random() * W; p.color = pick('vcity'); }
                ctx.globalAlpha = p.alpha;
                ctx.shadowBlur = 8; ctx.shadowColor = p.color;
                ctx.fillStyle  = p.color;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;
            });
            ctx.globalAlpha = 1;
        },

        // DOOM — chispas que suben + lava
        doom() {
            ctx.fillStyle = 'rgba(20,0,0,0.18)'; ctx.fillRect(0, 0, W, H);
            const lg = ctx.createLinearGradient(0, H * 0.7, 0, H);
            lg.addColorStop(0, 'rgba(239,68,68,0)');
            lg.addColorStop(0.5, 'rgba(249,115,22,0.12)');
            lg.addColorStop(1, 'rgba(239,68,68,0.25)');
            ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
            P.forEach(p => {
                p.y -= 1.5 + p.size * 0.6;
                p.x += Math.sin(T() * 2 + p.vx * 5) * 0.8;
                p.alpha -= 0.003;
                if(p.y < 0 || p.alpha < 0.05) {
                    p.y = H + 5; p.x = Math.random() * W;
                    p.alpha = Math.random() * 0.7 + 0.2; p.color = pick('doom');
                }
                ctx.globalAlpha = p.alpha;
                ctx.shadowBlur = 6; ctx.shadowColor = p.color;
                ctx.fillStyle  = p.color;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;
            });
            ctx.globalAlpha = 1;
        },

        // MINECRAFT — bloques pixelados cayendo (version que ganaba en el original)
        minecraft() {
            ctx.fillStyle = 'rgba(2,8,2,0.2)'; ctx.fillRect(0, 0, W, H);
            const COLORS = ['#5da832', '#8B6914', '#7c7c7c', '#6bb5ff', '#ff6600'];
            P.forEach(p => {
                if(!p.col) p.col = COLORS[Math.floor(Math.random() * COLORS.length)];
                p.y += 1 + p.size * 0.3;
                if(p.y > H) { p.y = -12; p.x = Math.floor(Math.random() * (W / 12)) * 12; }
                const gx = Math.floor(p.x / 12) * 12, gy = Math.floor(p.y / 12) * 12;
                ctx.globalAlpha = p.alpha * 0.6;
                ctx.fillStyle   = p.col;
                ctx.fillRect(gx, gy, 10, 10);
                ctx.fillStyle   = 'rgba(255,255,255,0.3)';
                ctx.fillRect(gx, gy, 10, 2); ctx.fillRect(gx, gy, 2, 10);
            });
            ctx.globalAlpha = 1;
        },

        // TRON — grid + trazas de light cycles
        tron() {
            ctx.fillStyle = 'rgba(0,10,20,0.2)'; ctx.fillRect(0, 0, W, H);
            ctx.strokeStyle = 'rgba(0,245,255,0.05)'; ctx.lineWidth = 0.5;
            for(let x = 0; x < W; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
            for(let y = 0; y < H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
            P.slice(0, 40).forEach(p => {
                if(!p.dir) p.dir = Math.random() > 0.5 ? 'H' : 'V';
                if(p.dir === 'H') { p.x += 3 + p.size; if(p.x > W) { p.x = 0; p.y = Math.round(Math.random() * H / 50) * 50; } }
                else              { p.y += 3 + p.size; if(p.y > H) { p.y = 0; p.x = Math.round(Math.random() * W / 50) * 50; } }
                ctx.globalAlpha = p.alpha;
                ctx.shadowBlur = 10; ctx.shadowColor = '#00f5ff';
                ctx.strokeStyle = '#00f5ff'; ctx.lineWidth = 1.5;
                ctx.beginPath();
                if(p.dir === 'H') { ctx.moveTo(p.x - 30, p.y); ctx.lineTo(p.x, p.y); }
                else              { ctx.moveTo(p.x, p.y - 30); ctx.lineTo(p.x, p.y); }
                ctx.stroke(); ctx.shadowBlur = 0;
            });
            ctx.globalAlpha = 1;
        },

        // DISCORD — burbujas de notificacion
        discord() {
            ctx.fillStyle = 'rgba(30,33,58,0.18)'; ctx.fillRect(0, 0, W, H);
            P.forEach(p => {
                p.y -= 0.6 + p.size * 0.2;
                p.x += Math.sin(T() * 0.8 + p.vx * 3) * 0.5;
                if(p.y < -20) { p.y = H + 20; p.x = Math.random() * W; p.size = Math.random() * 18 + 4; }
                ctx.globalAlpha = p.alpha * 0.5;
                ctx.shadowBlur = p.size > 10 ? 12 : 4; ctx.shadowColor = p.color;
                ctx.strokeStyle = p.color; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.stroke();
                if(p.size > 12) {
                    ctx.fillStyle = '#ed4245'; ctx.beginPath();
                    ctx.arc(p.x + p.size * 0.7, p.y - p.size * 0.7, 4, 0, Math.PI * 2); ctx.fill();
                }
                ctx.shadowBlur = 0;
            });
            ctx.globalAlpha = 1;
        },

        // HACKER / MR.ROBOT — terminal verde
        hacker() {
            ctx.fillStyle = 'rgba(0,8,0,0.2)'; ctx.fillRect(0, 0, W, H);
            const code = [
                'if(sys.bypass()){', '  root.access=true;', '} else { die(); }',
                '> whoami', '> rm -rf /', 'EXPLOIT LOADED', 'CVE-2024-XXXX',
                '[+] root shell', '#!/bin/bash', 'nc -lvp 4444',
                'wget payload.sh', 'chmod +x run.sh', './run.sh &',
            ];
            ctx.font = '12px monospace';
            P.slice(0, 30).forEach((p, i) => {
                if(!p.code) { p.code = code[i % code.length]; p.alpha = Math.random() * 0.6 + 0.1; }
                p.y += 0.8;
                if(p.y > H) { p.y = -15; p.x = Math.random() * (W - 200); p.code = code[Math.floor(Math.random() * code.length)]; }
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle   = p.alpha > 0.5 ? '#00ff88' : '#00aa44';
                ctx.fillText(p.code, p.x, p.y);
            });
            if(Math.floor(T() * 2) % 2 === 0) {
                ctx.globalAlpha = 0.8; ctx.fillStyle = '#00ff41'; ctx.fillRect(W * 0.1, H * 0.85, 8, 14);
            }
            ctx.globalAlpha = 1;
        },

        // ARCADE RETRO — invaders + estrellas
        retro() {
            ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, W, H);
            const invader = [[0, 1, 0, 0, 1, 0], [0, 0, 1, 1, 0, 0], [0, 1, 1, 1, 1, 0], [1, 0, 1, 1, 0, 1], [1, 0, 0, 0, 0, 1]];
            const ps = 5;
            P.slice(0, 20).forEach((p, i) => {
                if(!p.init) { p.col = pick('retro'); p.init = true; }
                p.x += Math.sin(T() * 0.5 + i * 0.3) * 0.5;
                p.y += 0.5 + p.size * 0.1;
                if(p.y > H) { p.y = -40; p.x = Math.random() * W; }
                ctx.globalAlpha = p.alpha * 0.7;
                ctx.fillStyle   = p.col;
                invader.forEach((row, ry) => row.forEach((bit, rx) => {
                    if(bit) ctx.fillRect(p.x + (rx - 3) * (ps + 1), p.y + (ry - 2) * (ps + 1), ps, ps);
                }));
            });
            P.slice(20).forEach(p => {
                p.y += 0.3; if(p.y > H) p.y = 0;
                ctx.globalAlpha = p.alpha * 0.4; ctx.fillStyle = '#fff';
                ctx.fillRect(p.x, p.y, 1, 1);
            });
            ctx.globalAlpha = 1;
        },

        // GOLD / BATTLE ROYALE — monedas y coronas
        gold() {
            ctx.fillStyle = 'rgba(15,10,0,0.12)'; ctx.fillRect(0, 0, W, H);
            const gg = ctx.createRadialGradient(W / 2, H, 0, W / 2, H, Math.max(W, H) * 0.6);
            gg.addColorStop(0, 'rgba(255,165,0,0.08)'); gg.addColorStop(1, 'transparent');
            ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H);
            const syms = ['$', '¢', '♛', '💰', '★'];
            ctx.font = 'bold 20px Arial';
            P.forEach(p => {
                if(!p.sym) p.sym = syms[Math.floor(Math.random() * syms.length)];
                p.y += 2.5 + p.size;
                p.x += Math.sin(p.y * 0.04 + p.vx) * 0.8;
                if(p.y > H) { p.y = -10; p.x = Math.random() * W; p.color = pick('gold'); }
                ctx.globalAlpha = p.alpha;
                ctx.shadowBlur = 6; ctx.shadowColor = '#ffd700';
                ctx.fillStyle  = p.color;
                ctx.fillText(p.sym, p.x, p.y);
                ctx.shadowBlur = 0;
            });
            ctx.globalAlpha = 1;
        },

        // PORTAL — portales orbitando (version que ganaba en el original)
        portal() {
            ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(0, 0, W, H);
            const t = Date.now() * 0.001;
            const cx = W / 2, cy = H * 0.44;
            const ox = cx + Math.cos(t * 0.5) * 80, oy = cy + Math.sin(t * 0.5) * 40;
            const gO = ctx.createRadialGradient(ox, oy, 2, ox, oy, 28);
            gO.addColorStop(0, 'rgba(255,120,0,0.9)'); gO.addColorStop(1, 'rgba(255,60,0,0)');
            ctx.fillStyle = gO; ctx.beginPath(); ctx.ellipse(ox, oy, 28, 40, t * 0.2, 0, Math.PI * 2); ctx.fill();
            const bx = cx - Math.cos(t * 0.5) * 80, by = cy - Math.sin(t * 0.5) * 40;
            const gB = ctx.createRadialGradient(bx, by, 2, bx, by, 28);
            gB.addColorStop(0, 'rgba(0,120,255,0.9)'); gB.addColorStop(1, 'rgba(0,60,255,0)');
            ctx.fillStyle = gB; ctx.beginPath(); ctx.ellipse(bx, by, 28, 40, -t * 0.2, 0, Math.PI * 2); ctx.fill();
            P.forEach(p => {
                if(!p.phase) p.phase = Math.random() * Math.PI * 2;
                p.phase += 0.02 + p.size * 0.01;
                const progress = (Math.sin(p.phase) + 1) / 2;
                p.x = ox + (bx - ox) * progress + Math.sin(p.phase * 3) * 10;
                p.y = oy + (by - oy) * progress + Math.cos(p.phase * 3) * 10;
                ctx.globalAlpha = p.alpha * Math.sin(p.phase);
                ctx.fillStyle   = progress < 0.5 ? '#ff7800' : '#0078ff';
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2); ctx.fill();
            });
            ctx.globalAlpha = 1;
        },

        // CELESTE — cristales y estrellas (version que ganaba en el original)
        celeste() {
            ctx.fillStyle = 'rgba(2,8,22,0.18)'; ctx.fillRect(0, 0, W, H);
            const t = Date.now() * 0.001;
            P.forEach(p => {
                p.y -= 0.4 + p.size * 0.1;
                p.x += Math.sin(t * 0.6 + p.vx) * 0.4;
                if(p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
                const flicker = 0.4 + Math.sin(t * 2 + p.vx * 3) * 0.3;
                ctx.globalAlpha = p.alpha * flicker;
                ctx.strokeStyle = Math.random() < 0.5 ? '#4fc3f7' : '#ffffff';
                ctx.lineWidth   = 1;
                const s = p.size * 2;
                ctx.beginPath(); ctx.moveTo(p.x - s, p.y); ctx.lineTo(p.x + s, p.y); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(p.x, p.y - s); ctx.lineTo(p.x, p.y + s); ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(p.x - s * 0.7, p.y - s * 0.7);
                ctx.lineTo(p.x + s * 0.7, p.y + s * 0.7);
                ctx.stroke();
            });
            ctx.globalAlpha = 1;
        },

        // HALF-LIFE — simbolo lambda + radiacion (version que ganaba en el original)
        halflife() {
            ctx.fillStyle = 'rgba(0,10,0,0.18)'; ctx.fillRect(0, 0, W, H);
            const t = Date.now() * 0.001;
            ctx.save(); ctx.translate(W / 2, H * 0.42);
            ctx.globalAlpha = 0.06 + Math.sin(t * 0.5) * 0.03;
            ctx.font = 'bold 120px monospace'; ctx.fillStyle = '#00aa33';
            ctx.textAlign = 'center'; ctx.fillText('λ', 0, 0);
            ctx.restore(); ctx.textAlign = 'left';
            P.forEach(p => {
                p.y += 0.6 + p.size * 0.2;
                p.x += Math.sin(t * 0.8 + p.vx) * 0.8;
                if(p.y > H) { p.y = -10; p.x = Math.random() * W; }
                ctx.globalAlpha = p.alpha * 0.5;
                const col = Math.random() < 0.7 ? '#00ff41' : '#ffff00';
                ctx.fillStyle = col;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2); ctx.fill();
            });
            ctx.globalAlpha = 1;
        },

        // CYBERPUNK / NIGHT CITY
        cyberpunk() {
            ctx.fillStyle = 'rgba(2,0,10,0.18)'; ctx.fillRect(0, 0, W, H);
            const chars = '01ﾊﾐﾋｱｳｦｲｸｺｷｵｴｹｸｦ';
            ctx.font = '12px monospace';
            P.forEach(p => {
                if(!p.char || Math.random() < 0.02) p.char = chars[Math.floor(Math.random() * chars.length)];
                p.y += p.size + 1.5;
                if(p.y > H) { p.y = -20; p.x = Math.random() * W; p.color = Math.random() < 0.5 ? '#00ffff' : '#ff00aa'; }
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle   = p.color || '#00ffff';
                ctx.shadowBlur  = 6; ctx.shadowColor = p.color || '#00ffff';
                ctx.fillText(p.char, p.x, p.y);
                ctx.shadowBlur = 0;
            });
            ctx.globalAlpha = 1;
        },

        // AMONG US
        amongus() {
            ctx.fillStyle = 'rgba(3,6,20,0.15)'; ctx.fillRect(0, 0, W, H);
            const t = Date.now() * 0.001;
            const colors = ['#c8181b', '#1d3de8', '#1c9e33', '#f07c1b', '#9b2dca', '#71491e', '#38ffdd'];
            P.forEach(p => {
                if(!p.col) { p.col = colors[Math.floor(Math.random() * colors.length)]; p.dead = Math.random() < 0.15; }
                p.y += 0.4 + p.size * 0.1;
                p.x += Math.sin(t + p.vx) * 0.3;
                if(p.y > H) { p.y = -20; p.x = Math.random() * W; }
                ctx.save(); ctx.translate(p.x, p.y);
                if(p.dead) ctx.rotate(Math.PI / 2);
                ctx.fillStyle = p.col; ctx.globalAlpha = p.alpha;
                ctx.beginPath(); ctx.ellipse(0, 3, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(150,220,255,0.85)';
                ctx.beginPath(); ctx.ellipse(-1, -2, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = p.col; ctx.fillRect(5, 0, 4, 7);
                ctx.restore();
            });
            ctx.globalAlpha = 1;
        },

        // UNDERTALE — corazon rojo palpitante
        undertale() {
            ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, 0, W, H);
            const t = Date.now() * 0.001;
            const pulse = 1 + Math.sin(t * 2) * 0.06;
            const hx = W / 2, hy = H * 0.45;
            ctx.save(); ctx.translate(hx, hy); ctx.scale(pulse, pulse);
            ctx.fillStyle = '#ff0038'; ctx.shadowBlur = 20; ctx.shadowColor = '#ff0038';
            ctx.beginPath();
            ctx.moveTo(0, 6);
            ctx.bezierCurveTo(-16, -8, -28, 8, -14, 20);
            ctx.lineTo(0, 34); ctx.lineTo(14, 20);
            ctx.bezierCurveTo(28, 8, 16, -8, 0, 6); ctx.fill();
            ctx.restore(); ctx.shadowBlur = 0;
            P.forEach(p => {
                const angle = Math.atan2(p.y - hy, p.x - hx);
                p.x += Math.cos(angle + Math.PI) * 1.5;
                p.y += Math.sin(angle + Math.PI) * 1.5;
                if(Math.hypot(p.x - hx, p.y - hy) > Math.min(W, H) * 0.5) {
                    p.x = hx + (Math.random() - 0.5) * 40;
                    p.y = hy + (Math.random() - 0.5) * 40;
                }
                ctx.globalAlpha = p.alpha * 0.6;
                ctx.fillStyle   = Math.random() < 0.5 ? '#ff0038' : '#fff';
                ctx.font = (8 + p.size) + 'px monospace';
                ctx.fillText('*', p.x, p.y);
            });
            ctx.globalAlpha = 1;
        },

        // HOLLOW KNIGHT — motas etereas
        hollow() {
            ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(0, 0, W, H);
            const t = Date.now() * 0.001;
            P.forEach(p => {
                p.y -= 0.5 + p.size * 0.15;
                p.x += Math.sin(t * 0.5 + p.vx) * 0.5;
                if(p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
                const flicker = 0.3 + Math.sin(t * 3 + p.vx) * 0.3;
                ctx.globalAlpha = p.alpha * flicker;
                ctx.fillStyle   = Math.random() < 0.1 ? '#b8a0d8' : '#ffffff';
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2); ctx.fill();
            });
            ctx.globalAlpha = 1;
        },

        // STARDEW — estrellas y cosecha
        stardew() {
            ctx.fillStyle = 'rgba(4,8,4,0.15)'; ctx.fillRect(0, 0, W, H);
            const t = Date.now() * 0.001;
            const syms = ['\u2605', '\u273f', '\u266a', '\u25c6', '\u2726'];
            const cols = ['#ffd700', '#ff69b4', '#90ee90', '#87ceeb', '#ffa500'];
            P.forEach(p => {
                if(!p.sym) { p.sym = syms[Math.floor(Math.random() * syms.length)]; p.col = cols[Math.floor(Math.random() * cols.length)]; }
                p.y += 0.8 + p.size * 0.2;
                p.x += Math.sin(t * 0.8 + p.vx) * 0.6;
                if(p.y > H) { p.y = -10; p.x = Math.random() * W; }
                ctx.globalAlpha = p.alpha * 0.8; ctx.fillStyle = p.col;
                ctx.font = (10 + p.size * 2) + 'px monospace'; ctx.textAlign = 'center';
                ctx.fillText(p.sym, p.x, p.y);
            });
            ctx.globalAlpha = 1; ctx.textAlign = 'left';
        },

        // MS-DOS 6.22 — CRT fósforo + líneas BIOS cayendo + prompt C:\> parpadeante
        dos622() {
            ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(0, 0, W, H);
            // Scanlines
            for(let y = 0; y < H; y += 3) {
                ctx.fillStyle = 'rgba(192,192,192,0.03)'; ctx.fillRect(0, y, W, 1);
            }
            // Líneas de BIOS scrollando
            const lines = [
                'IBM PC DOS 6.22', 'Memory: 640KB OK',
                'C:\\> dir', 'C:\\> autoexec.bat',
                'HIMEM loaded', 'EMM386 loaded',
                'Starting MS-DOS...', '32MB extended',
                'VGA adapter detected', 'Loading config.sys',
                'C:\\> _', 'A:\\> format c:',
            ];
            ctx.font = '11px "Courier New", monospace';
            P.slice(0, 25).forEach((p, i) => {
                if(!p.code) { p.code = lines[i % lines.length]; p.alpha = Math.random() * 0.6 + 0.2; }
                p.y += 0.7;
                if(p.y > H) { p.y = -15; p.x = Math.random() * (W - 180); p.code = lines[Math.floor(Math.random() * lines.length)]; }
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.alpha > 0.5 ? '#55ff55' : '#c0c0c0';
                ctx.fillText(p.code, p.x, p.y);
            });
            // Cursor parpadeante
            const blink = Math.floor(T() * 1.5) % 2 === 0;
            if(blink) {
                ctx.globalAlpha = 0.8;
                ctx.fillStyle = '#55ff55';
                ctx.fillRect(W * 0.12, H * 0.88, 8, 13);
            }
            ctx.globalAlpha = 1;
        },

        // iPOD CLASSIC — click wheel girando + notas musicales
        ipod() {
            ctx.fillStyle = 'rgba(15,15,20,0.18)'; ctx.fillRect(0, 0, W, H);
            const t = T();
            const cx = W / 2, cy = H * 0.45;
            // Click wheel background glow
            const gl = ctx.createRadialGradient(cx, cy, 20, cx, cy, 110);
            gl.addColorStop(0, 'rgba(29,111,255,0.08)');
            gl.addColorStop(1, 'transparent');
            ctx.fillStyle = gl;
            ctx.beginPath(); ctx.arc(cx, cy, 110, 0, Math.PI * 2); ctx.fill();
            // Click wheel ring
            ctx.strokeStyle = 'rgba(200,200,200,0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(cx, cy, 80, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = 'rgba(200,200,200,0.2)';
            ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.stroke();
            // Indicador rotando
            const angle = t * 1.2;
            ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
            ctx.fillStyle = 'rgba(29,111,255,0.7)';
            ctx.shadowBlur = 12; ctx.shadowColor = '#1d6fff';
            ctx.beginPath(); ctx.arc(55, 0, 6, 0, Math.PI * 2); ctx.fill();
            ctx.restore(); ctx.shadowBlur = 0;
            // Notas musicales flotando hacia arriba
            const notes = ['\u266a', '\u266b', '\u266c', '\u2669'];
            ctx.font = 'bold 18px sans-serif';
            ctx.textAlign = 'center';
            P.forEach(p => {
                if(!p.sym) { p.sym = notes[Math.floor(Math.random() * notes.length)]; }
                p.y -= 0.6 + p.size * 0.15;
                p.x += Math.sin(t * 0.7 + p.vx * 2) * 0.5;
                if(p.y < -20) { p.y = H + 20; p.x = Math.random() * W; p.sym = notes[Math.floor(Math.random() * notes.length)]; }
                ctx.globalAlpha = p.alpha * 0.55;
                ctx.fillStyle = Math.random() < 0.3 ? '#1d6fff' : '#e8e8e8';
                ctx.fillText(p.sym, p.x, p.y);
            });
            ctx.globalAlpha = 1; ctx.textAlign = 'left';
        },

        // N64 — bloques chunky 3D cayendo (morado/naranja/amarillo/verde)
        n64() {
            ctx.fillStyle = 'rgba(15,5,25,0.18)'; ctx.fillRect(0, 0, W, H);
            const COLORS = ['#7a52a0', '#ff6b35', '#ffcc33', '#50c878'];
            P.forEach(p => {
                if(!p.col) { p.col = COLORS[Math.floor(Math.random() * COLORS.length)]; p.spin = Math.random() * Math.PI * 2; p.spinV = (Math.random() - 0.5) * 0.05; }
                p.y += 1.2 + p.size * 0.25;
                p.spin += p.spinV;
                if(p.y > H + 20) { p.y = -20; p.x = Math.random() * W; p.col = COLORS[Math.floor(Math.random() * COLORS.length)]; }
                const s = 14 + p.size * 3;
                ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin);
                // Cubo chunky con sombreado 3D
                ctx.globalAlpha = p.alpha * 0.8;
                ctx.fillStyle = p.col;
                ctx.fillRect(-s/2, -s/2, s, s);
                // Highlight superior (3D effect)
                ctx.fillStyle = 'rgba(255,255,255,0.35)';
                ctx.fillRect(-s/2, -s/2, s, 3);
                ctx.fillRect(-s/2, -s/2, 3, s);
                // Shadow inferior
                ctx.fillStyle = 'rgba(0,0,0,0.35)';
                ctx.fillRect(-s/2, s/2 - 3, s, 3);
                ctx.fillRect(s/2 - 3, -s/2, 3, s);
                ctx.restore();
            });
            ctx.globalAlpha = 1;
        },
    };
}
