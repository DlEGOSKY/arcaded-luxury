import { CONFIG } from '../config.js';

export class HigherLowerGame {
    // NOTA: 'onQuit' ahora recibe la función inteligente 'onGameOverSmart' del main.js
    constructor(canvas, audio, onQuit) {
        this.canvas = canvas;
        this.audio = audio;
        this.onQuit = onQuit; 
        
        // ESTADO
        this.deck = [];
        this.currentCard = null;
        this.score = 0;
        this.streak = 0;
        this.history = [];
        this.difficulty = 'NORMAL'; 
        
        // MECÁNICAS DE TIEMPO
        this.lastMoveTime = 0;
        this.comboCounter = 0;
        this.isFrenzy = false;
        
        // TIMERS
        this.virusTimer = null;
        this.animationTimer = null;
        this.blitzTimerInterval = null;
        this.blitzTimeLeft = 60; 
        
        // HABILIDADES
        this.shieldActive = false;
        this.peekedCard = null;
        
        this.uiContainer = document.getElementById('game-ui-overlay');
        
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('hl-styles')) return;
        const style = document.createElement('style');
        style.id = 'hl-styles';
        // ... (ESTILOS IGUALES QUE YA TIENES - NO CAMBIAN) ...
        style.innerHTML = `
            .mode-select-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 15px; width: 100%; max-width: 600px; padding: 10px; }
            .cyber-mode-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 15px 5px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all 0.2s; height: 140px; position: relative; overflow: hidden; }
            .cyber-mode-card:hover { transform: translateY(-3px); background: rgba(255,255,255,0.08); }
            .cyber-mode-card i { font-size: 2.2rem; margin-bottom: 5px; transition: transform 0.2s; }
            .cyber-mode-card:hover i { transform: scale(1.2); }
            .cyber-mode-card span { font-family: var(--font-display); font-size: 0.9rem; letter-spacing: 1px; }
            .cyber-mode-card small { font-size: 0.6rem; color: #64748b; text-transform: uppercase; }
            .mode-hl-std { border-color: #3b82f6; color: #3b82f6; } .mode-hl-std:hover { box-shadow: 0 0 15px rgba(59, 130, 246, 0.2); }
            .mode-hl-lethal { border-color: #ef4444; color: #ef4444; } .mode-hl-lethal:hover { box-shadow: 0 0 15px rgba(239, 68, 68, 0.3); }
            .mode-hl-blitz { border-color: #fbbf24; color: #fbbf24; } .mode-hl-blitz:hover { box-shadow: 0 0 15px rgba(251, 191, 36, 0.2); }
            .cyber-card { width: 100%; height: 100%; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border: 2px solid rgba(255,255,255,0.1); border-radius: 12px; display: flex; flex-direction: column; justify-content: space-between; padding: 10px; font-weight: bold; font-family: monospace; position: relative; }
            .cyber-card[data-suit="H"], .cyber-card[data-suit="D"] { color: #ef4444; border-color: #ef4444; box-shadow: inset 0 0 20px rgba(239, 68, 68, 0.1); }
            .cyber-card[data-suit="C"], .cyber-card[data-suit="S"] { color: #3b82f6; border-color: #3b82f6; box-shadow: inset 0 0 20px rgba(59, 130, 246, 0.1); }
            .card-corner { display: flex; flex-direction: column; align-items: center; line-height: 1; font-size: 1.2rem; }
            .card-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 4rem; opacity: 0.8; text-shadow: 0 0 10px currentColor; }
            .card-wall { width:100%; height:100%; background: repeating-linear-gradient(45deg, #1f2937, #1f2937 10px, #374151 10px, #374151 20px); border: 4px solid #fbbf24; border-radius: 12px; color: #fbbf24; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; }
            .card-glitch-bg { width:100%; height:100%; background: repeating-linear-gradient(45deg, #000, #000 10px, #22c55e 10px, #22c55e 20px); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
            .cyber-action-pad { width: 80px; height: 80px; border-radius: 50%; border: 2px solid; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 2rem; cursor: pointer; transition: 0.1s; }
            .cyber-action-pad:active { transform: scale(0.95); }
            .skill-dock { display: flex; gap: 10px; margin-top: 15px; padding: 10px; background: rgba(0,0,0,0.5); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); }
            .skill-module { width: 50px; height: 50px; border: 1px solid #334155; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; background: rgba(255,255,255,0.05); }
            .skill-module:hover:not(.disabled) { border-color: white; transform: translateY(-2px); }
            .skill-module.disabled { opacity: 0.4; cursor: not-allowed; filter: grayscale(1); }
            .cyber-hud { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 5px; margin-bottom: 20px; }
            .cyber-stat-box { background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255,255,255,0.1); padding: 5px 15px; border-radius: 4px; display: flex; gap: 10px; align-items: center; min-width: 100px; justify-content: space-between; }
            .cs-label { font-size: 0.7rem; color: #94a3b8; }
            .cs-value { font-family: var(--font-display); font-size: 1.2rem; color: white; }
            .cyber-history-container { display: flex; gap: 5px; margin-top: 10px; height: 40px; align-items: center; }
            .cyber-mini-chip { width: 25px; height: 35px; border: 1px solid #555; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; background: #0f172a; }
            .btn-info { position: absolute; top: 20px; right: 20px; background: transparent; border: 1px solid rgba(255,255,255,0.3); color: rgba(255,255,255,0.7); border-radius: 50%; width: 30px; height: 30px; cursor: pointer; z-index: 100; display: flex; align-items: center; justify-content: center; }
            .info-modal { position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.95); backdrop-filter: blur(5px); z-index: 2000; display: none; flex-direction: column; align-items: center; justify-content: center; padding: 20px; }
            .info-modal.active { display: flex; }
            .info-row { display: flex; gap: 15px; margin-bottom: 15px; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; width: 100%; }
        `;
        document.head.appendChild(style);
    }

    // ... (CREATE DECK, SHUFFLE, DRAW CARD, GET CARD HTML - IGUALES) ...
    createDeck() {
        const suits = ['H', 'D', 'C', 'S']; 
        const definitions = [{ r: '2', v: 2 }, { r: '3', v: 3 }, { r: '4', v: 4 }, { r: '5', v: 5 }, { r: '6', v: 6 }, { r: '7', v: 7 }, { r: '8', v: 8 }, { r: '9', v: 9 }, { r: '10', v: 10 }, { r: 'J', v: 11 }, { r: 'Q', v: 12 }, { r: 'K', v: 13 }, { r: 'A', v: 14 }];
        let deck = [];
        for (let s of suits) { for (let def of definitions) { deck.push({ type: 'NORMAL', suit: s, rank: def.r, value: def.v }); } }
        deck.push({ type: 'JOKER', value: 99 });
        deck.push({ type: 'WALL', value: 50, hp: 5 }); 
        deck.push({ type: 'CACHE', value: 10, suit: 'D', rank: '💎' }); 
        deck.push({ type: 'VIRUS', value: 7, suit: 'S', rank: '☠️' }); 
        deck.push({ type: 'PROXY', value: Math.floor(Math.random()*13)+2, suit: 'C', rank: '?' }); 
        deck.push({ type: 'EMP', value: 8, suit: 'S', rank: '⚡' }); 
        return this.shuffle(deck);
    }
    shuffle(array) { let c = array.length, r; while (c != 0) { r = Math.floor(Math.random() * c); c--; [array[c], array[r]] = [array[r], array[c]]; } return array; }
    drawCard() { if (!this.deck || this.deck.length === 0) this.deck = this.createDeck(); let card = this.deck.pop(); if (!card) return { type: 'NORMAL', suit: 'S', rank: 'A', value: 14 }; return card; }
    
    getCardHTML(card, isMini = false) {
        if (!card) return isMini ? '' : '<div class="cyber-card">ERR</div>';
        if (isMini) {
            let color = '#fff', char = card.rank || '?', border = '#555';
            if(card.type === 'JOKER') { color = '#22c55e'; char = '👾'; border='#22c55e'; }
            else if(card.type === 'WALL') { color = '#fbbf24'; char = '🔒'; border='#fbbf24'; }
            else if(card.type === 'VIRUS') { color = '#ef4444'; char = '☠️'; border='#ef4444'; }
            else if(card.type === 'CACHE') { color = '#eab308'; char = '💎'; border='#eab308'; }
            else if(card.type === 'PROXY') { color = '#a855f7'; char = '?'; border='#a855f7'; }
            else if(card.type === 'EMP') { color = '#06b6d4'; char = '⚡'; border='#06b6d4'; }
            else if(card.suit === 'H' || card.suit === 'D') color = '#ef4444';
            else color = '#3b82f6';
            return `<div class="cyber-mini-chip" style="border-color:${border}; color:${color};">${char}</div>`;
        }
        if (card.type === 'JOKER') return `<div class="card-glitch-bg"><i class="fa-solid fa-bug card-glitch-icon" style="font-size:4rem; color:#22c55e;"></i></div>`;
        if (card.type === 'WALL') return `<div class="card-wall" onclick="window.app.game.hitWall()"><div><div style="font-size:0.8rem; margin-bottom:5px; font-weight:bold;">FIREWALL</div><i class="fa-solid fa-lock" style="font-size:3rem; margin:10px 0;"></i><div style="background:#fbbf24; color:black; padding:2px 10px; border-radius:4px; font-weight:bold;">HP: ${card.hp}</div><div style="font-size:0.6rem; margin-top:5px;">CLICK PARA ROMPER</div></div></div>`;
        
        let suitIcon = '★', suitClass = '';
        if (card.suit === 'H') { suitIcon = '♥'; suitClass='data-suit="H"'; } else if (card.suit === 'D') { suitIcon = '♦'; suitClass='data-suit="D"'; } else if (card.suit === 'C') { suitIcon = '♣'; suitClass='data-suit="C"'; } else if (card.suit === 'S') { suitIcon = '♠'; suitClass='data-suit="S"'; }
        
        if (card.type === 'PROXY') return `<div class="cyber-card" style="align-items:center; justify-content:center; border-color:#a855f7; color:#a855f7;"><div style="font-size:0.8rem; margin-bottom:10px;">ENCRIPTADO</div><div style="font-size:4rem;">?</div><div style="font-size:0.6rem; margin-top:10px;">ADIVINA EL VALOR</div></div>`;
        if (card.type === 'EMP') return `<div class="cyber-card" style="align-items:center; justify-content:center; border-color:#06b6d4; color:#06b6d4;"><div style="font-size:0.8rem; margin-bottom:10px; z-index:2;">INTERFERENCIA</div><i class="fa-solid fa-bolt" style="font-size:4rem; z-index:2;"></i><div style="font-size:0.6rem; margin-top:10px; z-index:2;">HUD ERROR</div></div>`;
        if (card.type === 'VIRUS') return `<div class="cyber-card" style="align-items:center; justify-content:center; border-color:#ef4444; color:#ef4444;"><i class="fa-solid fa-biohazard" style="font-size:5rem;"></i><div style="margin-top:10px; font-weight:bold;">¡ACTÚA RÁPIDO!</div></div>`;
        if (card.type === 'CACHE') return `<div class="cyber-card" style="border-color:#eab308; color:#eab308;"><div class="card-corner" style="align-self:flex-start">${card.rank} ${suitIcon}</div><div class="card-center"><i class="fa-solid fa-database"></i></div><div class="card-corner" style="align-self:flex-end; transform:rotate(180deg);">${card.rank} ${suitIcon}</div></div>`;
        
        return `<div class="cyber-card" ${suitClass}><div class="card-corner" style="align-self:flex-start"><span>${card.rank}</span><span>${suitIcon}</span></div><div class="card-center">${suitIcon}</div><div class="card-corner" style="align-self:flex-end; transform:rotate(180deg);"><span>${card.rank}</span><span>${suitIcon}</span></div></div>`;
    }

    // --- GAMEPLAY (hitWall, triggerVirusFail, startBlitzTimer IGUALES) ---
    hitWall() {
        if (!this.currentCard || this.currentCard.type !== 'WALL') return;
        this.currentCard.hp--;
        try { this.audio.playClick(); } catch(e) {}
        const cardEl = document.getElementById('main-card-container');
        if(cardEl) { cardEl.style.transform = `translate(${Math.random()*10-5}px, ${Math.random()*10-5}px)`; setTimeout(() => { if(cardEl) cardEl.style.transform = 'translate(0,0)'; }, 50); }
        if (this.currentCard.hp <= 0) {
            try { window.app.showToast("FIREWALL DESTRUIDO", "Acceso recuperado", "gold"); } catch(e) {}
            this.currentCard = this.drawCard();
            this.renderTable();
        } else { this.renderTable(); }
    }

    triggerVirusFail() {
        if(!this.virusTimer) return;
        try { window.app.showToast("¡VIRUS EJECUTADO!", "Sistema purgado", "danger"); } catch(e) {}
        try { this.audio.playLose(); } catch(e) {}
        this.endGameLogic();
    }

    startBlitzTimer() {
        this.blitzTimeLeft = 60;
        if(this.blitzTimerInterval) clearInterval(this.blitzTimerInterval);
        this.blitzTimerInterval = setInterval(() => {
            this.blitzTimeLeft--;
            const timerEl = document.getElementById('hl-timer');
            if(timerEl) timerEl.innerText = this.blitzTimeLeft;
            if(this.blitzTimeLeft <= 0) { clearInterval(this.blitzTimerInterval); this.endGameLogic(); }
        }, 1000);
    }

    init() { 
        window.app.game = this; 
        if(window.app.credits < 15) {
            try { window.app.showToast("FONDOS INSUFICIENTES", "Costo: $15", "danger"); } catch(e) {}
            // Salida segura sin puntaje
            if(this.onQuit) this.onQuit(0); 
            return;
        }
        this.showDifficultySelect(); 
    }

    showDifficultySelect() {
        // ... (HTML DEL MENÚ IGUAL) ...
        this.uiContainer.innerHTML = `
            <div style="text-align:center; animation: fadeIn 0.5s; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; width:100%;">
                <button class="btn-info" id="btn-show-info"><i class="fa-solid fa-info"></i></button>
                <div style="margin-bottom:30px; border-bottom:1px solid var(--primary); padding-bottom:10px; width:80%; max-width:400px;">
                    <h2 style="color: #fff; text-shadow: 0 0 15px var(--primary); margin:0; font-size:1.8rem; letter-spacing:3px;">PROTOCOLO</h2>
                    <small style="color:var(--primary); letter-spacing:2px;">SELECCIONA NIVEL DE ACCESO</small>
                </div>
                <div class="mode-select-grid">
                    <div class="cyber-mode-card mode-hl-std" id="mode-normal"><i class="fa-solid fa-layer-group"></i><span>ESTÁNDAR</span><small>Racha Infinita</small></div>
                    <div class="cyber-mode-card mode-hl-lethal" id="mode-hardcore"><i class="fa-solid fa-skull-crossbones"></i><span>LETAL</span><small>1 Fallo = Fin</small></div>
                    <div class="cyber-mode-card mode-hl-blitz" id="mode-blitz"><i class="fa-solid fa-bolt"></i><span>BLITZ</span><small>60 Segundos</small></div>
                </div>
                <button class="btn btn-secondary" id="btn-hl-back" style="margin-top:30px; width: 200px;">VOLVER AL LOBBY</button>
            </div>
            <div class="info-modal" id="info-modal-overlay">
                <div class="info-content">
                    <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                        <h3 style="color:#3b82f6; margin:0;">REGLAS DE PREDICCIÓN</h3>
                        <button id="close-info" style="background:none; border:none; color:white; cursor:pointer; font-size:1.2rem;">✕</button>
                    </div>
                    <div class="info-row"><div class="info-icon" style="color:#3b82f6"><i class="fa-solid fa-layer-group"></i></div><div class="info-text"><h4>ESTÁNDAR</h4><p>Adivina si la siguiente carta es mayor o menor.</p></div></div>
                    <div class="info-row"><div class="info-icon" style="color:#ef4444"><i class="fa-solid fa-skull-crossbones"></i></div><div class="info-text"><h4>LETAL</h4><p>Modo Hardcore. Un solo error y se acaba.</p></div></div>
                    <div class="info-row"><div class="info-icon" style="color:#fbbf24"><i class="fa-solid fa-bolt"></i></div><div class="info-text"><h4>BLITZ</h4><p>60 segundos para conseguir puntos.</p></div></div>
                </div>
            </div>
        `;
        
        document.getElementById('mode-normal').onclick = () => { this.payAndStart('NORMAL'); };
        document.getElementById('mode-hardcore').onclick = () => { this.payAndStart('HARDCORE'); };
        document.getElementById('mode-blitz').onclick = () => { this.payAndStart('BLITZ'); };
        
        // --- CAMBIO IMPORTANTE: Callback seguro para volver al menú ---
        document.getElementById('btn-hl-back').onclick = () => { if(this.onQuit) this.onQuit(0); };

        const modal = document.getElementById('info-modal-overlay');
        document.getElementById('btn-show-info').onclick = () => modal.classList.add('active');
        document.getElementById('close-info').onclick = () => modal.classList.remove('active');
        modal.onclick = (e) => { if(e.target === modal) modal.classList.remove('active'); };
    }

    // ... (payAndStart, startGameLoop, resetRoundState, renderTable, activateSkill, makeMove, resolve IGUALES) ...
    payAndStart(mode) {
        window.app.credits -= 15;
        document.getElementById('val-credits').innerText = window.app.credits;
        try { this.audio.playBuy(); } catch(e) {}
        this.difficulty = mode;
        this.startGameLoop();
    }

    startGameLoop() {
        this.deck = this.createDeck();
        this.resetRoundState();
        this.currentCard = this.drawCard();
        while(this.currentCard.type !== 'NORMAL') { this.currentCard = this.drawCard(); }
        if(this.difficulty === 'BLITZ') { this.startBlitzTimer(); }
        this.renderTable();
    }

    resetRoundState() {
        this.score = 0; this.streak = 0; this.history = []; this.shieldActive = false; this.peekedCard = null; this.isFrenzy = false; this.comboCounter = 0;
        if(this.virusTimer) { clearTimeout(this.virusTimer); this.virusTimer = null; }
        if(this.animationTimer) { clearTimeout(this.animationTimer); this.animationTimer = null; }
        if(this.blitzTimerInterval) { clearInterval(this.blitzTimerInterval); this.blitzTimerInterval = null; }
        document.body.classList.remove('frenzy-mode');
    }

    renderTable() {
        // ... (CÓDIGO DE RENDER EXACTAMENTE IGUAL AL TUYO) ...
        try {
            if(this.virusTimer) { clearTimeout(this.virusTimer); this.virusTimer = null; }
            if(this.animationTimer) { clearTimeout(this.animationTimer); this.animationTimer = null; }
            if (!this.currentCard) this.currentCard = this.drawCard();
            const isSpecial = this.currentCard.type !== 'NORMAL' && this.currentCard.type !== 'CACHE' && this.currentCard.type !== 'VIRUS';
            const isEmp = this.currentCard.type === 'EMP';
            if (this.currentCard.type === 'VIRUS') {
                try { this.audio.playTone(600, 'sawtooth', 0.5); } catch(e) {}
                this.virusTimer = setTimeout(() => this.triggerVirusFail(), 4000); 
            }
            const val = this.currentCard.value || 0;
            const probHigher = (isSpecial || isEmp) ? 0 : Math.max(5, Math.min(100, ((14 - val) / 13) * 100));
            const probLower = (isSpecial || isEmp) ? 0 : Math.max(5, Math.min(100, ((val - 2) / 13) * 100));
            const canBuySwap = window.app.credits >= 35;
            const canBuyOracle = window.app.credits >= 75 && !this.peekedCard && !isEmp;
            const canBuyShield = window.app.credits >= 150 && !this.shieldActive;
            const isWall = this.currentCard.type === 'WALL';
            let timerHTML = '';
            if(this.difficulty === 'BLITZ') { timerHTML = `<div style="width:100%; max-width:300px; height:6px; background:#333; border-radius:3px; overflow:hidden; margin-top:5px;"><div id="blitz-bar" style="width:100%; height:100%; background:#fbbf24; transition:width 1s linear;"></div></div>`; }

            this.uiContainer.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:space-between; height:100%; padding: 20px 0; width:100%;">
                    <div class="cyber-hud">
                        <div style="display:flex; justify-content:space-between; width:100%; max-width:350px;">
                            <div class="cyber-stat-box"><span class="cs-label">PTS</span><span class="cs-value">${this.score}</span></div>
                            <div class="cyber-stat-box"><span class="cs-label">${this.isFrenzy ? '¡FRENESÍ!' : 'RACHA'}</span><span class="cs-value" style="color:${this.isFrenzy ? '#ef4444' : '#f97316'}">${this.streak} <i class="fa-solid fa-fire" style="font-size:1rem;"></i></span></div>
                        </div>
                        ${timerHTML}
                    </div>
                    <div class="card-stage ${this.shieldActive ? 'shielded' : ''}" id="card-stage" style="position:relative; flex-grow:1; display:flex; align-items:center; justify-content:center; width:100%;">
                        <div id="main-card-container" style="width:180px; height:260px; transition: transform 0.3s; z-index:2; position:relative; opacity:1; transform:none;">${this.getCardHTML(this.currentCard)}</div>
                        ${this.shieldActive ? `<div style="position:absolute; top:20px; background:rgba(16, 185, 129, 0.9); color:black; font-size:0.8rem; padding:5px 15px; border-radius:4px; font-weight:bold;">🛡️ ESCUDO</div>` : ''}
                    </div>
                    <div style="width:100%; max-width:500px; display:flex; flex-direction:column; gap:20px; align-items:center;">
                        <div style="display:flex; gap:40px; align-items:center; opacity: ${isWall ? 0.2 : 1}; pointer-events: ${isWall ? 'none' : 'auto'};">
                            <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                                <div class="cyber-action-pad" id="btn-low" style="border-color:#ef4444; color:#ef4444; width:80px; height:80px; border-radius:50%; border:2px solid; display:flex; align-items:center; justify-content:center; font-size:2rem; cursor:pointer;"><i class="fa-solid fa-arrow-down"></i></div>
                                ${(!isSpecial && !isEmp) ? `<small style="color:#ef4444; font-family:monospace;">${Math.round(probLower)}%</small>` : ''}
                            </div>
                            <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                                <div class="cyber-action-pad" id="btn-high" style="border-color:#22c55e; color:#22c55e; width:80px; height:80px; border-radius:50%; border:2px solid; display:flex; align-items:center; justify-content:center; font-size:2rem; cursor:pointer;"><i class="fa-solid fa-arrow-up"></i></div>
                                ${(!isSpecial && !isEmp) ? `<small style="color:#22c55e; font-family:monospace;">${Math.round(probHigher)}%</small>` : ''}
                            </div>
                        </div>
                        <div class="skill-dock">
                            <div class="skill-module ${!canBuySwap ? 'disabled' : ''}" id="skill-swap"><i class="fa-solid fa-shuffle" style="color:#a855f7;"></i><div style="font-size:0.6rem;">$35</div></div>
                            <div class="skill-module ${!canBuyOracle || isEmp ? 'disabled' : ''}" id="skill-oracle"><i class="fa-solid fa-eye" style="color:#3b82f6;"></i><div style="font-size:0.6rem;">$75</div></div>
                            <div class="skill-module ${!canBuyShield ? 'disabled' : ''}" id="skill-shield"><i class="fa-solid fa-shield-halved" style="color:${this.shieldActive?'#10b981':'#f97316'}"></i><div style="font-size:0.6rem;">$150</div></div>
                        </div>
                        <div class="cyber-history-container">${this.history.map(c => this.getCardHTML(c, true)).join('')}</div>
                    </div>
                </div>`;
            if (!isWall) {
                const btnLow = document.getElementById('btn-low');
                const btnHigh = document.getElementById('btn-high');
                if(btnLow) btnLow.onclick = () => this.makeMove('LOWER');
                if(btnHigh) btnHigh.onclick = () => this.makeMove('HIGHER');
            } else { document.getElementById('main-card-container').onclick = () => this.hitWall(); }
            document.getElementById('skill-swap').onclick = () => { if(canBuySwap) this.activateSkill('SWAP', 35); };
            document.getElementById('skill-oracle').onclick = () => { if(canBuyOracle && !isEmp) this.activateSkill('ORACLE', 75); };
            document.getElementById('skill-shield').onclick = () => { if(canBuyShield) this.activateSkill('SHIELD', 150); };
        } catch (e) { console.error("Render Crash:", e); this.startGameLoop(); }
    }

    activateSkill(type, cost) {
        window.app.credits -= cost;
        try { this.audio.playBuy(); } catch(e) {}
        if (type === 'SHIELD') { this.shieldActive = true; try { window.app.showToast("BLINDAJE", "Activo", "success"); } catch(e){} }
        else if (type === 'SWAP') { if(this.virusTimer) clearTimeout(this.virusTimer); this.currentCard = this.drawCard(); this.peekedCard = null; try { window.app.showToast("REROLL", "Nueva variable", "purple"); } catch(e){} } 
        else if (type === 'ORACLE') {
            if (!this.peekedCard) this.peekedCard = this.drawCard();
            let hint = "???";
            if(this.peekedCard.type === 'NORMAL' && this.currentCard.type === 'NORMAL') { hint = this.peekedCard.value > this.currentCard.value ? "MAYOR (▲)" : "MENOR (▼)"; } 
            else if (this.peekedCard.type === 'JOKER') hint = "GLITCH (WIN)";
            else if (this.peekedCard.type === 'WALL') hint = "BLOQUEO";
            else hint = "PELIGRO";
            try { window.app.showToast(`ORÁCULO`, `Predicción: ${hint}`, "purple"); } catch(e){}
        }
        this.renderTable();
    }

    makeMove(guess) {
        if(this.virusTimer) { clearTimeout(this.virusTimer); this.virusTimer = null; }
        const now = Date.now();
        if (now - this.lastMoveTime < 2000) {
            this.comboCounter++;
            if(this.comboCounter >= 3 && !this.isFrenzy) { this.isFrenzy = true; try { window.app.showToast("¡FRENESÍ!", "Puntos x2", "danger"); } catch(e){} document.body.classList.add('frenzy-mode'); }
        } else { this.comboCounter = 0; this.isFrenzy = false; document.body.classList.remove('frenzy-mode'); }
        this.lastMoveTime = now;
        const btnLow = document.getElementById('btn-low');
        const btnHigh = document.getElementById('btn-high');
        if(btnLow) btnLow.style.pointerEvents = 'none';
        if(btnHigh) btnHigh.style.pointerEvents = 'none';
        try { this.audio.playClick(); } catch(e) {}
        let nextCard;
        if (this.peekedCard) { nextCard = this.peekedCard; this.peekedCard = null; } 
        else { nextCard = this.drawCard(); }
        const container = document.getElementById('main-card-container');
        if(container) { container.style.transform = "translateX(-50px) rotate(-10deg)"; container.style.opacity = "0"; }
        this.animationTimer = setTimeout(() => { this.resolve(guess, nextCard); }, 200); 
    }

    resolve(guess, nextCard) {
        if (!this.currentCard) this.currentCard = { value: 0 };
        if (!nextCard) nextCard = this.drawCard();
        const curVal = this.currentCard.value || 0;
        const nextVal = nextCard.value || 0;
        const isCurrentJoker = this.currentCard.type === 'JOKER';
        const isNextJoker = nextCard.type === 'JOKER';
        const isNextWall = nextCard.type === 'WALL';
        let outcome = 'LOSE';
        let isCritical = false;
        if (isCurrentJoker || isNextJoker) { outcome = 'WIN'; try { window.app.showToast("JOKER", "Acceso concedido", "gold"); } catch(e){} } 
        else if (isNextWall) { outcome = 'WIN'; } 
        else {
            if (curVal === nextVal) outcome = 'TIE';
            else if ((guess === 'HIGHER' && nextVal > curVal) || (guess === 'LOWER' && nextVal < curVal)) {
                outcome = 'WIN';
                let prob = (guess === 'HIGHER') ? ((14 - curVal) / 13) : ((curVal - 2) / 13);
                if (prob < 0.25) isCritical = true;
            }
        }
        if(this.currentCard) { this.history.push(this.currentCard); if(this.history.length > 8) this.history.shift(); }
        this.currentCard = nextCard;
        this.renderTable(); 
        const newEl = document.getElementById('main-card-container');
        if(newEl) {
            newEl.style.transform = "translateX(50px) rotate(10deg) scale(0.8)";
            newEl.style.opacity = "0";
            void newEl.offsetWidth;
            newEl.style.transition = "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
            newEl.style.transform = "translateX(0) rotate(0) scale(1)";
            newEl.style.opacity = "1";
        }
        if (outcome === 'WIN') {
            if(this.currentCard.type === 'WALL') {
                try { this.audio.playLose(); window.app.showToast("FIREWALL", "Bloqueo detectado", "danger"); } catch(e){}
            } else {
                this.streak++;
                let points = 10;
                if(this.difficulty === 'HARDCORE') points *= 2;
                if(this.isFrenzy) points *= 2;
                if(isCritical) points *= 3;
                this.score += points;
                try { window.app.addScore(points, Math.floor(points/2)); } catch(e){}
                if(this.currentCard.type === 'CACHE') { window.app.credits += 25; try { window.app.showToast("DATA CACHE", "+$25", "gold"); } catch(e){} }
                if(isCritical) { try { this.audio.playWin(10); } catch(e){} } else { try { this.audio.playWin(this.streak > 3 ? 5 : 1); } catch(e){} }
            }
        } else if (outcome === 'TIE') {
            try { window.app.showToast("EMPATE", "Salvado", "default"); } catch(e){}
            try { this.audio.playTone(300, 'square', 0.1); } catch(e){}
        } else {
            if (this.shieldActive) {
                this.shieldActive = false;
                try { this.audio.playShieldBreak(); window.app.showToast("ESCUDO ROTO", "Salvado", "success"); } catch(e){}
                document.body.classList.add('shake-screen');
                setTimeout(() => document.body.classList.remove('shake-screen'), 500);
                this.renderTable();
            } else {
                try { this.audio.playLose(); } catch(e){}
                document.body.classList.add('shake-screen');
                setTimeout(() => document.body.classList.remove('shake-screen'), 500);
                this.isFrenzy = false;
                document.body.classList.remove('frenzy-mode');
                if(this.difficulty === 'BLITZ') {
                    this.streak = 0;
                    this.blitzTimeLeft = Math.max(0, this.blitzTimeLeft - 5);
                    try { window.app.showToast("PENALIZACIÓN", "-5 Segundos", "danger"); } catch(e){}
                    this.renderTable();
                } 
                else if(this.difficulty === 'HARDCORE') { this.endGameLogic(); } 
                else {
                    try { window.app.showToast("FALLO", "Racha 0", "danger"); } catch(e){}
                    this.streak = 0;
                    this.renderTable();
                }
            }
        }
    }

    // --- CORRECCIÓN CRÍTICA: Lógica de Fin de Juego ---
    endGameLogic() {
        if(this.virusTimer) clearTimeout(this.virusTimer);
        if(this.blitzTimerInterval) clearInterval(this.blitzTimerInterval);
        
        // Delegamos todo al main pasando el puntaje final
        if (this.onQuit) this.onQuit(this.score);
    }
}