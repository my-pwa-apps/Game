const GAME_CONFIG = {
    width: 800,
    height: 600,
    fps: 60,
    scale: window.devicePixelRatio || 1
};

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.frameCount = 0;
        this.lastTime = 0;
        this.accumulator = 0;
        this.timeStep = 1000 / GAME_CONFIG.fps;
        
        this.state = {
            score: 0,
            lives: 3,
            isRunning: false,
            touches: new Map()
        };
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.bindEvents();
        this.player = new Player();
        this.entities = new Set();
        this.initEnemies();
    }

    setupCanvas() {
        const { width, height, scale } = GAME_CONFIG;
        this.canvas.width = width * scale;
        this.canvas.height = height * scale;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        this.ctx.scale(scale, scale);
    }

    bindEvents() {
        const handlers = {
            'keydown': e => this.handleKeyboard(e),
            'touchstart': e => this.handleTouch(e),
            'touchmove': e => this.handleTouch(e),
            'touchend': e => this.handleTouchEnd(e),
            'resize': () => this.setupCanvas()
        };

        Object.entries(handlers).forEach(([event, handler]) => {
            window.addEventListener(event, handler.bind(this), { passive: false });
        });
    }

    handleTouch(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
        this.state.touches.set(touch.identifier, { x, y: touch.clientY });
        this.player.move(x > this.player.x ? 1 : -1);
    }

    update(deltaTime) {
        this.entities.forEach(entity => entity.update(deltaTime));
        this.checkCollisions();
        this.updateFPS(deltaTime);
    }

    checkCollisions() {
        const bullets = [...this.entities].filter(e => e instanceof Bullet);
        const enemies = [...this.entities].filter(e => e instanceof Enemy);
        
        for (const bullet of bullets) {
            for (const enemy of enemies) {
                if (this.checkCollision(bullet, enemy)) {
                    this.handleCollision(bullet, enemy);
                    break;
                }
            }
        }
    }

    checkCollision(a, b) {
        return !(a.x + a.width < b.x || 
                a.x > b.x + b.width || 
                a.y + a.height < b.y || 
                a.y > b.y + b.height);
    }

    handleCollision(bullet, enemy) {
        this.entities.delete(bullet);
        this.entities.delete(enemy);
        this.state.score += 10;
        this.updateScore();
    }

    render() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.entities.forEach(entity => entity.draw(this.ctx));
    }

    gameLoop(timestamp) {
        if (!this.state.isRunning) return;

        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.accumulator += deltaTime;
        
        while (this.accumulator >= this.timeStep) {
            this.update(this.timeStep);
            this.accumulator -= this.timeStep;
        }

        this.render();
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    updateFPS(deltaTime) {
        if (++this.frameCount % 30 === 0) {
            const fps = Math.round(1000 / deltaTime);
            document.getElementById('fps').textContent = `FPS: ${fps}`;
        }
    }

    start() {
        this.state.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    stop() {
        this.state.isRunning = false;
    }
}

class Player {
    constructor() {
        this.width = PLAYER_WIDTH;
        this.height = PLAYER_HEIGHT;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 10;
        this.speed = 5;
        this.bullets = [];
        this.lastShot = 0;
        this.shootDelay = 250; // Minimum time between shots
    }

    draw(ctx) {
        ctx.fillStyle = '#0f0';
        // Draw player ship as triangle
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        this.bullets.forEach(bullet => bullet.draw(ctx));
    }

    move(direction) {
        this.x = Math.max(0, Math.min(canvas.width - this.width, this.x + direction * this.speed));
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShot >= this.shootDelay) {
            this.bullets.push(new Bullet(this.x + this.width / 2, this.y));
            this.lastShot = now;
            document.getElementById('shootSound').cloneNode().play();
        }
    }

    update(deltaTime) {
        this.bullets = this.bullets.filter(bullet => {
            bullet.update(deltaTime);
            return bullet.y > 0;
        });
    }
}

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = ENEMY_WIDTH;
        this.height = ENEMY_HEIGHT;
        this.speed = 1;
        this.bullets = [];
        this.lastShot = 0;
    }

    draw(ctx) {
        ctx.fillStyle = '#f00';
        // Draw enemy as invader-like shape
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x + this.width / 4, this.y);
        ctx.lineTo(this.x + this.width * 3/4, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height / 2);
        ctx.lineTo(this.x + this.width * 3/4, this.y + this.height);
        ctx.lineTo(this.x + this.width / 4, this.y + this.height);
        ctx.closePath();
        ctx.fill();
    }

    move(direction) {
        this.x += direction * this.speed;
    }

    shoot() {
        if (Math.random() < 0.001) {
            this.bullets.push(new Bullet(this.x + this.width / 2, this.y + this.height));
        }
    }
}

class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = BULLET_WIDTH;
        this.height = BULLET_HEIGHT;
        this.speed = 7;
    }

    draw(ctx) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
    }

    update(deltaTime) {
        this.y -= this.speed;
    }
}

const game = new Game();
game.start();
