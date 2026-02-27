import { CONFIG } from '../config.js';

export class GuessCardGame {
    constructor(canvas, audio, onQuit) {
        this.canvas = canvas;
        this.audio = audio;
        this.onQuit = onQuit; // Función inteligente del main
        
        this.deck = [];
        this.currentCard = null;
        this.isRevealed = false;
        this.score = 0; // Contaremos aciertos consecutivos o totales para el HighScore
        
        this.uiContainer = document.getElementById('game-ui-overlay');
        
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('oracle-styles')) return;
        const style = document.createElement('style');
        style.id = 'oracle-styles';
        // ... (ESTILOS IGUALES QUE YA TENÍAS) ...
        style.innerHTML = `
            .cyber-card { width: 100%; height: 100%; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border: 2px solid rgba(255,255,255,0.1); border-radius: 12px; display: flex; flex-direction: column; justify-content: space-between; padding: 10px; font-weight: bold; font-family: monospace; box-shadow: 0 0 20px rgba(0,0,0,0.3); }
            .cyber-card[data-suit="H"], .cyber-card[data-suit="D"] { color: #ef4444; border-color: #ef4444; text-shadow: 0 0 10px #ef4444; }
            .cyber-card[data-suit="C"], .cyber-card[data-suit="S"] { color: #3b82f6; border-color: #3b82f6; text-shadow: 0 0 10px #3b82f6; }
            .card-proxy { background: repeating-linear-gradient(135deg, #2e1065, #2e1065 10px, #4c1d95 10px, #4c1d95 20px); border: 2px solid #a855f7; color: #a855f7; box-shadow: 0 0 30px rgba(168, 85, 247, 0.5); display: flex; align-items: center; justify-content: center; font-size: 5rem; text-shadow: 0 0 20px currentColor; animation: pulse-mystery 2s infinite; }
            @keyframes pulse-mystery { 0%, 100% { box-shadow: 0 0 30px rgba(168, 85, 247, 0.5); } 50% { box-shadow: 0 0 50px rgba(168, 85, 247, 0.8); border-color: #d8b4fe; } }
            .betting-panel { background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 20px; width: 100%; max-width: 500px; backdrop-filter: blur(10px); display: flex; flex-direction: column; gap: 15px; }
            .bet-row-colors { display: flex; gap: 15px; width: 100%; }
            .bet-shard { flex: 1; height: 80px; border: 2px solid; background: rgba(0,0,0,0.3); display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s; clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px); position: relative; overflow: hidden; }
            .bet-shard.red { border-color: #ef4444; color: #ef4444; }
            .bet-shard.black { border-color: #3b82f6; color: #3b82f6; }
            .bet-shard:hover { transform: translateY(-5px); background: rgba(255,255,255,0.05); }
            .bet-shard.red:hover { box-shadow: 0 0 20px rgba(239, 68, 68, 0.4); }
            .bet-shard.black:hover { box-shadow: 0 0 20px rgba(59, 130, 246, 0.4); }
            .shard-label { font-size: 1.2rem; font-weight: bold; }
            .shard-multi { font-size: 0.7rem; opacity: 0.8; font-family: monospace; }
            .bet-row-suits { display: flex; gap: 10px; justify-content: center; }
            .hex-rune { width: 60px; height: 60px; background: rgba(0,0,0,0.4); border: 2px solid; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; cursor: pointer; transition: all 0.2s; clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); }
            .hex-rune.red { border-color: #ef4444; color: #ef4444; }
            .hex-rune.blue { border-color: #3b82f6; color: #3b82f6; }
            .hex-rune:hover { transform: scale(1.1) rotate(5deg); box-shadow: 0 0 15px currentColor; background: rgba(255,255,255,0.05); }
            .payout-info { text-align: center; font-size: 0.7rem; color: #94a3b8; letter-spacing: 1px; margin-top: 5px; }
            .btn-next-cyber { width: 100%; padding: 15px; background: var(--purple); border: none; color: white; font-family: var(--font-display); font-size: 1.2rem; clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px); cursor: pointer; transition: 0.3s; letter-spacing: 2px; }
            .btn-next-cyber:hover { background: #c084fc; box-shadow: 0 0 20px var(--purple); }
        `;
        document.head.appendChild(style);
    }

    // --- MOTOR LOCAL (Igual) ---
    createDeck() {
        const suits = ['H', 'D', 'C', 'S']; 
        const definitions = [
            { r: '2', v: 2 }, { r: '3', v: 3 }, { r: '4', v: 4 }, { r: '5', v: 5 },
            { r: '6', v: 6 }, { r: '7', v: 7 }, { r: '8', v: 8 }, { r: '9', v: 9 },
            { r: '10', v: 10 }, { r: 'J', v: 11 }, { r: 'Q', v: 12 }, { r: 'K', v: 13 }, { r: 'A', v: 14 }
        ];
        let deck = [];
        for (let s of suits) {
            for (let def of definitions) {
                deck.push({ type: 'NORMAL', suit: s, rank: def.r, value: def.v });
            }
        }
        return this.shuffle(deck);
    }

    shuffle(array) {
        let currentIndex = array.length, randomIndex;
        while (currentIndex != 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    }

    drawCard() {
        if (!this.deck || this.deck.length === 0) this.deck = this.createDeck();
        return this.deck.pop();
    }

    getCardHTML(card, hidden = false) {
        if (hidden) {
            return `
                <div class="cyber-card card-proxy" style="width:100%; height:100%;">
                    <div style="animation: float 3s infinite ease-in-out;"><i class="fa-solid fa-question"></i></div>
                </div>
            `;
        }

        let suitIcon = '';
        let suitClass = '';
        if (card.suit === 'H') { suitIcon = '♥'; suitClass='data-suit="H"'; }
        else if (card.suit === 'D') { suitIcon = '♦'; suitClass='data-suit="D"'; }
        else if (card.suit === 'C') { suitIcon = '♣'; suitClass='data-suit="C"'; }
        else if (card.suit === 'S') { suitIcon = '♠'; suitClass='data-suit="S"'; }

        return `
            <div class="cyber-card" ${suitClass}>
                <div class="card-corner top" style="display:flex; flex-direction:column; align-items:center;"><span>${card.rank}</span><span>${suitIcon}</span></div>
                <div class="card-center" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:5rem; opacity:0.2;">${suitIcon}</div>
                <div class="card-corner bottom" style="display:flex; flex-direction:column; align-items:center; position:absolute; bottom:10px; right:10px; transform:rotate(180deg);"><span>${card.rank}</span><span>${suitIcon}</span></div>
            </div>`;
    }

    init() {
        this.canvas.setMood('MYSTERY');
        this.score = 0;
        this.deck = this.createDeck();
        
        // Reset score global
        const globalScore = document.getElementById('ui-score');
        if(globalScore) globalScore.innerText = '0';
        
        this.nextRound();
    }

    nextRound() {
        this.isRevealed = false;
        this.currentCard = this.drawCard();
        this.renderTable();
    }

    renderTable() {
        const cardHTML = this.isRevealed ? this.getCardHTML(this.currentCard) : this.getCardHTML(null, true);
        
        let controlsHTML = '';
        if (this.isRevealed) {
             controlsHTML = `
                <div class="betting-panel" style="align-items:center;">
                    <h3 style="color:var(--purple); margin-bottom:10px;">DESTINO REVELADO</h3>
                    <button class="btn-next-cyber" id="btn-next">INICIAR NUEVA LECTURA</button>
                </div>`;
        } else {
            controlsHTML = `
                <div class="betting-panel">
                    <div style="text-align:center; color:white; font-family:var(--font-display); margin-bottom:5px;">SELECCIONA FLUJO DE DATOS</div>
                    <div class="bet-row-colors">
                        <div class="bet-shard red" id="bet-red">
                            <span class="shard-label">RED</span>
                            <span class="shard-multi">WIN x2</span>
                        </div>
                        <div class="bet-shard black" id="bet-black">
                            <span class="shard-label">BLACK</span>
                            <span class="shard-multi">WIN x2</span>
                        </div>
                    </div>
                    <div class="bet-row-suits">
                        <div class="hex-rune red" id="bet-h">♥</div>
                        <div class="hex-rune red" id="bet-d">♦</div>
                        <div class="hex-rune blue" id="bet-c">♣</div>
                        <div class="hex-rune blue" id="bet-s">♠</div>
                    </div>
                    <div class="payout-info">PALO EXACTO PAGA x4 • COSTE: 10 CRÉDITOS</div>
                </div>`;
        }

        this.uiContainer.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; width:100%; gap: 30px;">
                <div style="position:relative; width:200px; height:280px;">
                    <div class="holo-base-emitter" style="bottom:-30px; width:160px; height:50px; background:radial-gradient(ellipse at center, rgba(168, 85, 247, 0.6) 0%, rgba(0,0,0,0) 70%); box-shadow: 0 -10px 20px rgba(168, 85, 247, 0.4);"></div>
                    <div id="oracle-card-container" style="width:100%; height:100%; transition: transform 0.5s cubic-bezier(0.23, 1, 0.32, 1); position:relative; z-index:2;">
                        ${cardHTML}
                    </div>
                </div>
                ${controlsHTML}
            </div>
        `;
        
        if (!this.isRevealed) {
            document.getElementById('bet-red').onclick = () => this.handleBet('COLOR', 'RED');
            document.getElementById('bet-black').onclick = () => this.handleBet('COLOR', 'BLACK');
            document.getElementById('bet-h').onclick = () => this.handleBet('SUIT', 'H');
            document.getElementById('bet-d').onclick = () => this.handleBet('SUIT', 'D');
            document.getElementById('bet-c').onclick = () => this.handleBet('SUIT', 'C');
            document.getElementById('bet-s').onclick = () => this.handleBet('SUIT', 'S');
        } else {
            document.getElementById('btn-next').onclick = () => this.nextRound();
        }
    }

    handleBet(type, prediction) {
        if (window.app.credits < 10) { 
            this.audio.playLose(); 
            window.app.showToast("SIN CRÉDITOS", "Recarga requerida", "danger"); 
            return; 
        }
        
        window.app.credits -= 10;
        const globalCredits = document.getElementById('val-credits');
        if(globalCredits) globalCredits.innerText = window.app.credits;
        
        this.audio.playBuy();

        const container = document.getElementById('oracle-card-container');
        container.style.filter = "hue-rotate(90deg) blur(2px)";
        container.style.transform = "scale(0.95) rotateY(90deg)";
        
        setTimeout(() => {
            this.isRevealed = true; 
            this.renderTable(); 
            
            const newContainer = document.getElementById('oracle-card-container');
            newContainer.style.filter = "none";
            newContainer.style.transform = "scale(0.95) rotateY(90deg)"; 
            void newContainer.offsetWidth; 
            newContainer.style.transform = "scale(1) rotateY(0deg)"; 
            
            this.resolveBet(type, prediction);
            
        }, 300);
    }

    resolveBet(type, prediction) {
        const actualSuit = this.currentCard.suit;
        const actualColor = (actualSuit === 'H' || actualSuit === 'D') ? 'RED' : 'BLACK';
        
        let win = false; 
        let payout = 0;

        if (type === 'COLOR' && prediction === actualColor) { win = true; payout = 20; }
        else if (type === 'SUIT' && prediction === actualSuit) { win = true; payout = 40; }

        if (win) {
            window.app.credits += payout;
            this.score++; 
            // Actualizar Score HUD
            const globalScore = document.getElementById('ui-score');
            if(globalScore) globalScore.innerText = this.score;

            window.app.showToast(`SINCRONIZACIÓN EXITOSA`, `+$${payout} Créditos`, "success");
            this.audio.playWin(5);
            if(this.canvas) this.canvas.explode(window.innerWidth/2, window.innerHeight/2, '#a855f7'); // Purple constant
        } else { 
            window.app.showToast("ERROR DE PREDICCIÓN", "Datos corruptos", "danger"); 
            this.audio.playLose(); 
            document.body.classList.add('shake-screen');
            setTimeout(() => document.body.classList.remove('shake-screen'), 300);
        }
        
        const globalCredits = document.getElementById('val-credits');
        if(globalCredits) globalCredits.innerText = window.app.credits;
        window.app.save();
    }
}