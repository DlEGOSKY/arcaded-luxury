export class CyberPongGame {
    constructor(canvasManager, audioController, onGameOver) {
        this.ctx = canvasManager.ctx;
        this.canvas = canvasManager.canvas;
        this.audio = audioController;
        this.onGameOver = onGameOver;
        this.animationId = null;
        
        // Configuración
        this.paddleHeight = 80;
        this.paddleWidth = 12;
        this.ballSize = 8;
        
        // Estado
        this.playerY = 0;
        this.aiY = 0;
        this.ball = { x: 0, y: 0, dx: 0, dy: 0, speed: 0 };
        this.score = 0; 
        this.lives = 3; 
        this.isPlaying = false;
        this.difficulty = 1;

        // Control de Teclado
        this.keys = { up: false, down: false };
    }

    init() {
        this.playerY = this.canvas.height / 2 - this.paddleHeight / 2;
        this.aiY = this.canvas.height / 2 - this.paddleHeight / 2;
        this.resetBall();
        this.lives = 3;
        this.score = 0;
        this.difficulty = 1;
        this.isPlaying = true;

        // Pausar el fondo animado para que Pong controle el canvas
        if (window.app && window.app.canvas) window.app.canvas.pauseBackground();

        // Eventos Mouse
        this.moveHandler = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const root = document.documentElement;
            const mouseY = e.clientY - rect.top - root.scrollTop;
            this.playerY = mouseY - this.paddleHeight / 2;
        };

        // Eventos Teclado
        this.keyDownHandler = (e) => {
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.keys.up = true;
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.keys.down = true;
        };
        this.keyUpHandler = (e) => {
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.keys.up = false;
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.keys.down = false;
        };

        // Eventos Touch
        this.touchHandler = (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touchY = e.touches[0].clientY - rect.top;
            this.playerY = touchY - this.paddleHeight / 2;
        };

        this.canvas.addEventListener('mousemove', this.moveHandler);
        this.canvas.addEventListener('touchmove', this.touchHandler, { passive: false });
        window.addEventListener('keydown', this.keyDownHandler);
        window.addEventListener('keyup', this.keyUpHandler);

        this.loop();
    }

    resetBall() {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height / 2;
        this.ball.speed = 6 + (this.score * 0.5); 
        this.ball.dx = (Math.random() > 0.5 ? 1 : -1) * this.ball.speed;
        this.ball.dy = (Math.random() * 2 - 1) * this.ball.speed;
    }

    update() {
        if(!this.isPlaying) return;

        // Lógica Teclado
        if (this.keys.up) this.playerY -= 10;
        if (this.keys.down) this.playerY += 10;

        // Límites Jugador
        if(this.playerY < 0) this.playerY = 0;
        if(this.playerY > this.canvas.height - this.paddleHeight) this.playerY = this.canvas.height - this.paddleHeight;

        // Mover bola
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;

        // Rebote paredes
        if(this.ball.y < 0 || this.ball.y > this.canvas.height) {
            this.ball.dy *= -1;
            this.audio.playTone(200, 'square', 0.05);
        }

        // IA
        const centerPaddle = this.aiY + this.paddleHeight / 2;
        if(centerPaddle < this.ball.y - 35) this.aiY += (5 + this.difficulty);
        else if(centerPaddle > this.ball.y + 35) this.aiY -= (5 + this.difficulty);
        
        if(this.aiY < 0) this.aiY = 0;
        if(this.aiY > this.canvas.height - this.paddleHeight) this.aiY = this.canvas.height - this.paddleHeight;

        // Colisión Jugador
        if(this.ball.x < 20 + this.paddleWidth) {
            if(this.ball.y > this.playerY && this.ball.y < this.playerY + this.paddleHeight) {
                this.ball.dx *= -1.1; 
                this.ball.x = 20 + this.paddleWidth; 
                this.audio.playTone(400, 'square', 0.1);
                if(window.app && window.app.canvas) window.app.canvas.explode(this.ball.x, this.ball.y, '#00ff00');
            } else if (this.ball.x < 0) {
                this.lives--;
                this.audio.playLose();
                // ELIMINADO EL FLASH QUE CAUSABA EL CRASH
                if(this.lives <= 0) {
                    this.end();
                } else {
                    this.resetBall();
                }
            }
        }

        // Colisión IA
        if(this.ball.x > this.canvas.width - 20 - this.paddleWidth) {
            if(this.ball.y > this.aiY && this.ball.y < this.aiY + this.paddleHeight) {
                this.ball.dx *= -1.1;
                this.ball.x = this.canvas.width - 20 - this.paddleWidth;
                this.audio.playTone(300, 'square', 0.1);
            } else if (this.ball.x > this.canvas.width) {
                this.score++;
                this.difficulty += 0.3;
                this.audio.playWin(5);
                if(window.app && window.app.canvas) window.app.canvas.explode(this.ball.x, this.ball.y, '#fbbf24');
                this.resetBall();
            }
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.beginPath();
        this.ctx.setLineDash([10, 15]);
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        this.ctx.fillStyle = '#00ff00'; 
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#00ff00';
        this.ctx.fillRect(20, this.playerY, this.paddleWidth, this.paddleHeight);

        this.ctx.fillStyle = '#ef4444'; 
        this.ctx.shadowColor = '#ef4444';
        this.ctx.fillRect(this.canvas.width - 20 - this.paddleWidth, this.aiY, this.paddleWidth, this.paddleHeight);

        this.ctx.beginPath();
        this.ctx.fillStyle = '#fff';
        this.ctx.shadowColor = '#fff';
        this.ctx.arc(this.ball.x, this.ball.y, this.ballSize, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = "rgba(255,255,255,0.8)";
        this.ctx.font = "bold 40px 'Courier New'";
        this.ctx.textAlign = "center";
        this.ctx.shadowBlur = 0;
        this.ctx.fillText(this.score, this.canvas.width / 2, 50);
        
        let hearts = "";
        for(let i=0; i<this.lives; i++) hearts += "❤ ";
        this.ctx.font = "20px Arial";
        this.ctx.fillStyle = "#ef4444";
        this.ctx.fillText(hearts, this.canvas.width / 2, 80);
    }

    loop() {
        if(!this.isPlaying) return;
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(() => this.loop());
    }

    end() {
        this.isPlaying = false;
        this.cleanup();
        // Ahora esto invocará la tarjeta automáticamente gracias al cambio en main.js
        if(this.onGameOver) this.onGameOver(this.score);
    }

    cleanup() {
        this.canvas.removeEventListener('mousemove', this.moveHandler);
        this.canvas.removeEventListener('touchmove', this.touchHandler);
        window.removeEventListener('keydown', this.keyDownHandler);
        window.removeEventListener('keyup', this.keyUpHandler);
        cancelAnimationFrame(this.animationId);
        // Reanudar el fondo animado del CanvasManager
        if (window.app && window.app.canvas) window.app.canvas.resumeBackground();
    }
}