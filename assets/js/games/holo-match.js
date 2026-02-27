import { CONFIG } from '../config.js';

export class HoloMatchGame {
    // NOTA: 'onQuit' ahora es inteligente
    constructor(canvas, audio, onQuit) {
        this.audio = audio;
        this.onQuit = onQuit;
        
        this.cols = 4;
        this.rows = 3;
        this.cards = [];
        this.emojis = ['⚡', '💎', '🧬', '🔮', '🚀', '🔥', '🧿', '💠', '🪐', '🤖'];
        
        this.firstCard = null;
        this.secondCard = null;
        this.isProcessing = false;
        this.matchesFound = 0;
        this.totalPairs = 6;
        
        this.timeLeft = 40.0;
        this.maxTime = 40.0;
        this.isRunning = false;
        this.gameLoopId = null;
        this.lastTime = 0;
        
        this.mode = 'STANDARD';
        this.combo = 0;
        this.score = 0;

        this.uiContainer = document.getElementById('game-ui-overlay');
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('hm-styles')) return;
        const style = document.createElement('style');
        style.id = 'hm-styles';
        // ... (ESTILOS IGUALES, SIN CAMBIOS) ...
        style.innerHTML = `
            .hm-hud-container { position: absolute; top: 20px; width: 100%; max-width: 600px; display: flex; justify-content: space-between; padding: 0 20px; z-index: 20; pointer-events: none; }
            .hm-stat-capsule { background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(59, 130, 246, 0.5); backdrop-filter: blur(5px); padding: 10px 20px; border-radius: 30px; display: flex; flex-direction: column; align-items: center; min-width: 100px; box-shadow: 0 0 15px rgba(0,0,0,0.5); }
            .hm-label { font-size: 0.6rem; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase; }
            .hm-value { font-family: var(--font-display); font-size: 1.5rem; color: white; text-shadow: 0 0 10px currentColor; }
            .holo-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; width: 100%; max-width: 480px; padding: 10px; perspective: 1000px; margin-top: 60px; }
            .holo-card-container { width: 100%; aspect-ratio: 3/4; position: relative; cursor: pointer; transform-style: preserve-3d; transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
            .holo-card-container.flipped { transform: rotateY(180deg); }
            .holo-card-container.matched { opacity: 0; pointer-events: none; transform: rotateY(180deg) scale(1.5); transition: opacity 0.3s, transform 0.3s; }
            .holo-card-container.virus .holo-front { background: rgba(239, 68, 68, 0.2); border-color: #ef4444; box-shadow: inset 0 0 20px #ef4444; }
            .holo-face { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
            .holo-back { background-color: #0f172a; background-image: linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px); background-size: 10px 10px; border: 2px solid #334155; box-shadow: inset 0 0 15px rgba(0,0,0,0.8); }
            .holo-card-container:hover .holo-back { border-color: #3b82f6; box-shadow: 0 0 15px rgba(59, 130, 246, 0.4); }
            .holo-back::after { content: ''; width: 30px; height: 30px; border: 2px solid rgba(59, 130, 246, 0.5); transform: rotate(45deg); background: rgba(59, 130, 246, 0.1); box-shadow: 0 0 10px rgba(59, 130, 246, 0.3); }
            .holo-front { background: rgba(59, 130, 246, 0.15); border: 2px solid #3b82f6; transform: rotateY(180deg); font-size: 2.5rem; text-shadow: 0 0 20px white; backdrop-filter: blur(5px); }
            .combo-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 3rem; color: #fbbf24; font-weight: bold; text-shadow: 0 0 20px #fbbf24; animation: popCombo 0.5s forwards; pointer-events: none; z-index: 100; font-family: var(--font-display); }
            @keyframes popCombo { 0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; } 50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; } 100% { transform: translate(-50%, -150%) scale(1); opacity: 0; } }
            .hm-menu-container { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; animation: fadeIn 0.5s; }
            .mode-select-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 15px; width: 100%; max-width: 600px; padding: 10px; }
            .cyber-mode-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 15px 5px; height: 130px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; }
            .cyber-mode-card:hover { transform: translateY(-3px); background: rgba(255,255,255,0.08); }
            .cyber-mode-card i { font-size: 2.2rem; margin-bottom: 5px; transition: transform 0.2s; }
            .mode-std { border-color: #3b82f6; color: #3b82f6; }
            .mode-virus { border-color: #ef4444; color: #ef4444; }
            .mode-rush { border-color: #eab308; color: #eab308; }
        `;
        document.head.appendChild(style);
    }

    init() {
        if(window.app.credits < 15) {
            try { window.app.showToast("FONDOS INSUFICIENTES", "Costo: $15", "danger"); } catch(e) {}
            // Salida segura
            if(this.onQuit) this.onQuit(0); 
            return;
        }

        this.uiContainer.innerHTML = `
            <div class="hm-menu-container">
                <h2 style="color: #fff; text-shadow: 0 0 15px #3b82f6; margin-bottom:10px; font-size:2rem;">HOLO MATCH</h2>
                <p style="color:#94a3b8; font-size:0.8rem; margin-bottom:30px;">RECUPERACIÓN DE DATOS</p>
                <div class="mode-select-grid">
                    <div class="cyber-mode-card mode-std" id="mode-std"><i class="fa-solid fa-clone"></i><span>ESTÁNDAR</span><small>Clásico 4x3</small></div>
                    <div class="cyber-mode-card mode-virus" id="mode-virus"><i class="fa-solid fa-biohazard"></i><span>VIRUS</span><small>Evita las trampas</small></div>
                    <div class="cyber-mode-card mode-rush" id="mode-rush"><i class="fa-solid fa-stopwatch"></i><span>RUSH</span><small>Gana tiempo</small></div>
                </div>
                <button class="btn btn-secondary" id="btn-hm-back" style="margin-top:30px; width: 200px;">VOLVER</button>
            </div>
        `;

        document.getElementById('mode-std').onclick = () => this.payAndStart('STANDARD');
        document.getElementById('mode-virus').onclick = () => this.payAndStart('VIRUS');
        document.getElementById('mode-rush').onclick = () => this.payAndStart('RUSH');
        // Salida segura desde el menú
        document.getElementById('btn-hm-back').onclick = () => { if(this.onQuit) this.onQuit(0); };
    }

    // ... (payAndStart, start, generateCards, renderGame, handleCardClick, triggerVirus, shuffleBoard, checkMatch, updateComboUI, loop IGUALES) ...
    payAndStart(mode) {
        window.app.credits -= 15;
        document.getElementById('val-credits').innerText = window.app.credits;
        try { this.audio.playBuy(); } catch(e) {}
        this.mode = mode;
        this.start();
    }

    start() {
        this.isRunning = true;
        this.matchesFound = 0;
        this.score = 0;
        this.combo = 0;
        this.firstCard = null;
        this.secondCard = null;
        this.isProcessing = false;
        
        if (this.mode === 'STANDARD') { this.cols = 4; this.rows = 3; this.totalPairs = 6; this.timeLeft = 40.0; } 
        else if (this.mode === 'VIRUS') { this.cols = 4; this.rows = 4; this.totalPairs = 7; this.timeLeft = 60.0; } 
        else if (this.mode === 'RUSH') { this.cols = 4; this.rows = 4; this.totalPairs = 8; this.timeLeft = 15.0; }
        
        const globalScore = document.getElementById('ui-score');
        if(globalScore) globalScore.innerText = '0';

        this.generateCards();
        this.renderGame();
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    generateCards() {
        this.cards = [];
        const deckSize = this.totalPairs;
        const selected = [...this.emojis].sort(() => 0.5 - Math.random()).slice(0, deckSize);
        let deck = [...selected, ...selected];
        if (this.mode === 'VIRUS') { deck.push('VIRUS'); deck.push('VIRUS'); }
        deck.sort(() => 0.5 - Math.random());
        this.cards = deck.map((val, i) => ({ id: i, val: val, isFlipped: false, isMatched: false, isVirus: val === 'VIRUS' }));
    }

    renderGame() {
        let gridHTML = `<div class="holo-grid" style="grid-template-columns: repeat(${this.cols}, 1fr);">`;
        this.cards.forEach((card) => {
            const content = card.isVirus ? '<i class="fa-solid fa-virus" style="color:#ef4444"></i>' : card.val;
            const virusClass = card.isVirus ? 'virus' : '';
            gridHTML += `<div class="holo-card-container ${virusClass}" id="card-${card.id}" onclick="window.app.game.handleCardClick(${card.id})"><div class="holo-face holo-back"></div><div class="holo-face holo-front">${content}</div></div>`;
        });
        gridHTML += '</div>';
        const timeColor = this.mode === 'RUSH' ? '#eab308' : '#3b82f6';
        this.uiContainer.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; width:100%; height:100%; justify-content:center;">
                <div class="hm-hud-container">
                    <div class="hm-stat-capsule" style="border-color:${timeColor}"><span class="hm-label">TIEMPO</span><span class="hm-value" id="hm-time" style="color:${timeColor}">${this.timeLeft.toFixed(1)}</span></div>
                    <div class="hm-stat-capsule" style="border-color:#fbbf24"><span class="hm-label">COMBO</span><span class="hm-value" id="hm-combo" style="color:#fbbf24">x1</span></div>
                </div>
                ${gridHTML}
            </div>`;
    }

    handleCardClick(id) {
        if (!this.isRunning || this.isProcessing) return;
        const card = this.cards[id];
        const el = document.getElementById(`card-${id}`);
        if (card.isFlipped || card.isMatched) return;
        this.audio.playClick();
        card.isFlipped = true;
        el.classList.add('flipped');
        if (card.isVirus) { this.triggerVirus(el); return; }
        if (!this.firstCard) { this.firstCard = { data: card, el: el }; } 
        else { this.secondCard = { data: card, el: el }; this.checkMatch(); }
    }

    async triggerVirus(el) {
        this.isProcessing = true;
        this.audio.playLose(); 
        this.combo = 0; 
        this.updateComboUI();
        window.app.showToast("¡VIRUS DETECTADO!", "-10 Segundos + Shuffle", "danger");
        this.timeLeft = Math.max(0, this.timeLeft - 10);
        el.style.boxShadow = "0 0 50px red";
        document.body.classList.add('shake-screen');
        await new Promise(r => setTimeout(r, 1000));
        document.body.classList.remove('shake-screen');
        const cardData = this.cards.find(c => c.id === parseInt(el.id.split('-')[1]));
        cardData.isFlipped = false;
        el.classList.remove('flipped');
        el.style.boxShadow = "";
        if (this.timeLeft > 0) { this.shuffleBoard(); }
        this.firstCard = null; 
        this.isProcessing = false;
    }

    async shuffleBoard() {
        const container = document.querySelector('.holo-grid');
        container.style.opacity = '0';
        await new Promise(r => setTimeout(r, 200));
        const cardsElements = Array.from(container.children);
        for (let i = cardsElements.length; i >= 0; i--) { container.appendChild(cardsElements[Math.random() * i | 0]); }
        container.style.opacity = '1';
    }

    async checkMatch() {
        this.isProcessing = true;
        const card1 = this.firstCard;
        const card2 = this.secondCard;
        if (card1.data.val === card2.data.val) {
            this.audio.playWin(1);
            this.combo++;
            this.updateComboUI();
            const points = 10 * this.combo;
            this.score += points;
            const globalScore = document.getElementById('ui-score');
            if(globalScore) globalScore.innerText = this.score;
            if (this.mode === 'RUSH') { this.timeLeft += 3; window.app.showToast("+3s", "Time Extension", "success"); }
            await new Promise(r => setTimeout(r, 300));
            card1.el.classList.add('matched');
            card2.el.classList.add('matched');
            card1.data.isMatched = true;
            card2.data.isMatched = true;
            this.matchesFound++;
            if (this.matchesFound === this.totalPairs) this.win();
        } else {
            this.audio.playTone(150, 'sawtooth', 0.1);
            this.combo = 0; 
            this.updateComboUI();
            await new Promise(r => setTimeout(r, 800));
            card1.data.isFlipped = false;
            card2.data.isFlipped = false;
            card1.el.classList.remove('flipped');
            card2.el.classList.remove('flipped');
        }
        this.firstCard = null;
        this.secondCard = null;
        this.isProcessing = false;
    }

    updateComboUI() {
        const el = document.getElementById('hm-combo');
        if(el) {
            el.innerText = `x${Math.max(1, this.combo)}`;
            if (this.combo > 1) {
                const float = document.createElement('div');
                float.className = 'combo-text';
                float.innerText = `${this.combo}X COMBO!`;
                this.uiContainer.appendChild(float);
                setTimeout(() => float.remove(), 600);
            }
        }
    }

    loop(timestamp) {
        if(!this.isRunning) return;
        if (!this.lastTime) this.lastTime = timestamp;
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        if (dt > 0.1) { this.gameLoopId = requestAnimationFrame((t) => this.loop(t)); return; }
        this.timeLeft -= dt;
        const timeEl = document.getElementById('hm-time');
        if(timeEl) {
            timeEl.innerText = Math.max(0, this.timeLeft).toFixed(1);
            if (this.timeLeft < 10) timeEl.style.color = '#ef4444';
        }
        if (this.timeLeft <= 0) { this.gameOver(); return; }
        this.gameLoopId = requestAnimationFrame((t) => this.loop(t));
    }

    // --- CORRECCIÓN CRÍTICA ---
    win() {
        this.isRunning = false;
        if(this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
        
        const timeBonus = Math.floor(this.timeLeft * 5);
        this.score += timeBonus;
        
        // Llamada Inteligente
        if(this.onQuit) this.onQuit(this.score);
    }

    gameOver() {
        if(!this.isRunning) return;
        this.isRunning = false;
        if(this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
        
        try { this.audio.playLose(); } catch(e){}
        
        // Llamada Inteligente
        if(this.onQuit) this.onQuit(this.score);
    }
}