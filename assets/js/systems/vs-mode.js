// systems/vs-mode.js
// Modo 2 jugadores local: turnos alternados, mayor puntuacion gana.
// Extraido de main.js.
//
// Contrato: recibe la instancia `app` con:
//   app.vsMode          (state: gameId, player1, player2, turn)
//   app.gameClasses     (registro de clases de minijuegos)
//   app.agentName
//   app.stats           (vsWins, vsGames, vsStreak)
//   app.audio.playWin(n)
//   app.changeState(stateId)
//   app.launch(gameId)
//   app._vsOnGameOver  (callback set por vsPlayTurn para capturar el score)
//
// BUG FIX aplicado: el onclick inline de showVsIntro tenia `\"vs-intro\"`
// dentro de un string single-quoted, lo que en el HTML final rompia
// el atributo porque las comillas dobles internas cerraban el onclick.
// La version extraida usa addEventListener con referencia directa.

import { CONFIG } from '../config.js';

// -------------------------------------------------------------
// START: inicializar vsMode y mostrar intro
// -------------------------------------------------------------
export function start(app, gameId) {
    if(!app.gameClasses[gameId]) return;
    app.vsMode = {
        gameId,
        player1: { name: app.agentName || 'AGENTE', score: 0, done: false },
        player2: { name: 'JUGADOR 2',               score: 0, done: false },
        turn: 1,
    };
    showIntro(app);
}

// -------------------------------------------------------------
// INTRO: pantalla con los dos jugadores + boton empezar
// -------------------------------------------------------------
export function showIntro(app) {
    const vs    = app.vsMode;
    const game  = CONFIG.GAMES_LIST.find(g => g.id === vs.gameId);
    const color = CONFIG.COLORS[game?.color] || 'var(--primary)';

    const modal = document.createElement('div');
    modal.id = 'vs-intro';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:99997;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);';

    modal.innerHTML =
        '<div style="text-align:center;padding:40px;">' +
            '<div style="font-size:0.6rem;color:#334155;font-family:monospace;letter-spacing:4px;margin-bottom:12px;">MODO VS</div>' +
            '<div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:6px;">' + (game?.name || vs.gameId) + '</div>' +
            '<div style="display:flex;align-items:center;justify-content:center;gap:24px;margin:24px 0;">' +
                '<div style="text-align:center;"><div style="font-family:var(--font-display);font-size:1.1rem;color:' + color + ';">' + vs.player1.name + '</div><div style="font-size:0.55rem;color:#334155;font-family:monospace;">JUGADOR 1</div></div>' +
                '<div style="font-family:var(--font-display);font-size:1.8rem;color:#334155;">VS</div>' +
                '<div style="text-align:center;"><div style="font-family:var(--font-display);font-size:1.1rem;color:#ef4444;">' + vs.player2.name + '</div><div style="font-size:0.55rem;color:#334155;font-family:monospace;">JUGADOR 2</div></div>' +
            '</div>' +
            '<div style="font-size:0.7rem;color:#475569;margin-bottom:24px;">Turnos alternados · Mayor puntuación gana</div>' +
            '<button type="button" data-vs-start style="background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.4);color:#60a5fa;border-radius:10px;padding:12px 32px;font-family:var(--font-display);font-size:0.8rem;letter-spacing:3px;cursor:pointer;">EMPEZAR — ' + vs.player1.name.toUpperCase() + ' PRIMERO</button>' +
        '</div>';

    // Handler por referencia directa (antes era onclick inline con quoting roto)
    const startBtn = modal.querySelector('[data-vs-start]');
    if(startBtn) {
        startBtn.addEventListener('click', () => {
            modal.remove();
            playTurn(app, 1);
        });
    }

    document.body.appendChild(modal);
}

// -------------------------------------------------------------
// PLAY TURN: mostrar aviso de turno + lanzar el juego
// -------------------------------------------------------------
export function playTurn(app, playerNum) {
    const vs  = app.vsMode;
    if(!vs) return;
    vs.turn = playerNum;

    const p   = playerNum === 1 ? vs.player1 : vs.player2;
    const col = playerNum === 1 ? 'var(--primary)' : '#ef4444';

    const notice = document.createElement('div');
    notice.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:99997;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
    notice.innerHTML =
        '<div style="text-align:center;">' +
            '<div style="font-size:0.6rem;color:#334155;font-family:monospace;letter-spacing:4px;margin-bottom:8px;">TURNO ' + playerNum + '</div>' +
            '<div style="font-family:var(--font-display);font-size:2rem;color:' + col + ';letter-spacing:4px;">' + p.name + '</div>' +
            '<div style="font-size:0.65rem;color:#475569;margin:12px 0 24px;">¡Es tu turno! Prepárate...</div>' +
            '<button type="button" data-vs-go style="background:' + col.replace('var(--primary)', 'rgba(59,130,246,0.15)') + ';border:1px solid ' + col + ';color:' + col + ';border-radius:10px;padding:12px 32px;font-family:var(--font-display);font-size:0.8rem;letter-spacing:3px;cursor:pointer;">¡A JUGAR!</button>' +
        '</div>';

    document.body.appendChild(notice);

    const goBtn = notice.querySelector('[data-vs-go]');
    if(goBtn) {
        goBtn.addEventListener('click', () => {
            notice.remove();
            app._vsOnGameOver = (score) => recordScore(app, playerNum, score);
            app.launch(vs.gameId);
        });
    }
}

// -------------------------------------------------------------
// RECORD SCORE: capturar score + encadenar siguiente turno o resultado
// -------------------------------------------------------------
export function recordScore(app, playerNum, score) {
    const vs = app.vsMode;
    if(!vs) return;

    if(playerNum === 1) {
        vs.player1.score = score;
        vs.player1.done  = true;
        setTimeout(() => playTurn(app, 2), 500);
    } else {
        vs.player2.score = score;
        vs.player2.done  = true;
        setTimeout(() => showResult(app), 500);
    }
}

// -------------------------------------------------------------
// SHOW RESULT: pantalla final + stats de VS
// -------------------------------------------------------------
export function showResult(app) {
    const vs     = app.vsMode;
    if(!vs) return;
    const winner = vs.player1.score >= vs.player2.score ? vs.player1 : vs.player2;
    const isDraw = vs.player1.score === vs.player2.score;
    const winCol = winner === vs.player1 ? 'var(--primary)' : '#ef4444';

    const modal = document.createElement('div');
    modal.id = 'vs-result';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:99997;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);';

    const title    = isDraw ? '¡EMPATE!' : '¡' + winner.name + ' GANA!';
    const titleCol = isDraw ? '#fbbf24' : winCol;

    const div = document.createElement('div');
    div.style.cssText = 'text-align:center;padding:40px;max-width:340px;';
    div.innerHTML =
        '<div style="font-size:0.6rem;color:#334155;font-family:monospace;letter-spacing:4px;margin-bottom:12px;">RESULTADO FINAL</div>' +
        '<div style="font-family:var(--font-display);font-size:1.8rem;color:' + titleCol + ';letter-spacing:3px;margin-bottom:6px;">' + title + '</div>' +
        '<div style="display:flex;justify-content:center;gap:32px;margin:20px 0;">' +
            '<div><div style="font-family:var(--font-display);font-size:1.4rem;color:var(--primary);">' + vs.player1.score.toLocaleString() + '</div>' +
            '<div style="font-size:0.55rem;color:#334155;font-family:monospace;">' + vs.player1.name + '</div></div>' +
            '<div style="font-size:1.4rem;color:#1e293b;font-family:var(--font-display);">VS</div>' +
            '<div><div style="font-family:var(--font-display);font-size:1.4rem;color:#ef4444;">' + vs.player2.score.toLocaleString() + '</div>' +
            '<div style="font-size:0.55rem;color:#334155;font-family:monospace;">' + vs.player2.name + '</div></div>' +
        '</div>';

    const actDiv = document.createElement('div');
    actDiv.style.cssText = 'display:flex;gap:10px;justify-content:center;margin-top:20px;';

    const btnExit = document.createElement('button');
    btnExit.type        = 'button';
    btnExit.textContent = 'SALIR';
    btnExit.style.cssText = 'background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#64748b;border-radius:8px;padding:10px 20px;font-family:var(--font-display);font-size:0.7rem;cursor:pointer;';
    btnExit.addEventListener('click', () => {
        app.vsMode = null;
        modal.remove();
        app.changeState('menu');
    });

    const btnRematch = document.createElement('button');
    btnRematch.type        = 'button';
    btnRematch.textContent = 'REVANCHA';
    btnRematch.style.cssText = 'background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.4);color:#60a5fa;border-radius:8px;padding:10px 20px;font-family:var(--font-display);font-size:0.7rem;cursor:pointer;';
    btnRematch.addEventListener('click', () => {
        const gid = vs.gameId;
        modal.remove();
        start(app, gid);
    });

    actDiv.appendChild(btnExit);
    actDiv.appendChild(btnRematch);
    div.appendChild(actDiv);
    modal.appendChild(div);
    document.body.appendChild(modal);

    // Tracking VS stats
    const vsWinner = vs.player1.score >= vs.player2.score ? 1 : 2;
    app.stats.vsWins  = (app.stats.vsWins  || 0) + (vsWinner === 1 ? 1 : 0);
    app.stats.vsGames = (app.stats.vsGames || 0) + 1;
    app.stats.vsStreak = vsWinner === 1 ? (app.stats.vsStreak || 0) + 1 : 0;

    app.vsMode = null;
    try { app.audio.playWin(10); } catch(e) {}
}
