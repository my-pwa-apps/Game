const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 30;
const ENEMY_WIDTH = 40;
const ENEMY_HEIGHT = 30;
const BULLET_WIDTH = 3;
const BULLET_HEIGHT = 15;

const GAME_CONFIG = {
    width: 800,
    height: 600,
    fps: 60,
    scale: window.devicePixelRatio || 1,
    levels: [
        {
            enemyRows: 3,
            enemySpeed: 1,
            enemyType: 'basic'
        },
        {
            enemyRows: 4,
            enemySpeed: 1.2,
            enemyType: 'advanced'
        },
        {
            enemyRows: 5,
            enemySpeed: 1.5,
            enemyType: 'boss'
        }
    ]
};

// Fix circular reference by using a global audio context
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

class SoundManager {
    constructor() {
        this.audioContext = audioContext;
        this.isMuted = false;
    }

    playShoot() {
        if (this.isMuted) return;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(110, this.audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }

    playExplosion() {
        if (this.isMuted) return;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1, this.audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.2);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
    }
}

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
            touches: new Map(),
            level: 1,
            maxLevel: GAME_CONFIG.levels.length
        };
        
        this.soundManager = new SoundManager();
        
        // Create singleton reference for global access
        window.gameInstance = this;
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.bindEvents();
        this.player = new Player();
        this.entities = new Set();
        this.entities.add(this.player); // Add player to entities
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

    handleKeyboard(e) {
        switch(e.key) {
            case 'ArrowLeft':
                this.player.move(-1);
                break;
            case 'ArrowRight':
                this.player.move(1);
                break;
            case ' ':
                this.player.shoot();
                break;
        }
    }

    handleTouch(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
        this.state.touches.set(touch.identifier, { x, y: touch.clientY });
        this.player.move(x > this.player.x ? 1 : -1);
    }

    handleTouchEnd(e) {
        e.preventDefault();
        this.state.touches.clear();
        this.player.shoot();
    }

    update(deltaTime) {
        // Update player first
        this.player.update(deltaTime);
        
        // Update enemies and movement
        this.updateEnemyMovement(deltaTime);
        
        // Update other entities
        this.entities.forEach(entity => {
            if (!(entity instanceof Player)) {
                entity.update(deltaTime);
            }
        });
        
        this.checkCollisions();
        this.updateFPS(deltaTime);
    }
    
    updateEnemyMovement(deltaTime) {
        const enemies = [...this.entities].filter(e => e instanceof Enemy);
        if (enemies.length === 0) return;
        
        // Check if any enemy will hit the wall
        let hitWall = false;
        for (const enemy of enemies) {
            if ((enemy.x <= 0 && enemy.direction < 0) || 
                (enemy.x + enemy.width >= GAME_CONFIG.width && enemy.direction > 0)) {
                hitWall = true;
                break;
            }
        }
        
        // Change direction and move down if hit wall
        if (hitWall) {
            for (const enemy of enemies) {
                enemy.direction *= -1;
                enemy.y += 20;
                
                // Check if enemy reached player level - game over
                if (enemy.y + enemy.height >= this.player.y) {
                    this.gameOver();
                    return;
                }
            }
        }
        
        // Move all enemies horizontally
        for (const enemy of enemies) {
            enemy.move(enemy.direction);
        }
    }

    checkCollisions() {
        const playerBullets = this.player.bullets;
        const enemies = [...this.entities].filter(e => e instanceof Enemy);
        
        // Player bullets hitting enemies
        for (let i = playerBullets.length - 1; i >= 0; i--) {
            const bullet = playerBullets[i];
            
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                
                if (this.checkCollision(bullet, enemy)) {
                    this.handleCollision(bullet, enemy);
                    playerBullets.splice(i, 1);
                    break;
                }
            }
        }
        
        // Enemy bullets hitting player
        for (const enemy of enemies) {
            for (let i = enemy.bullets.length - 1; i >= 0; i--) {
                const bullet = enemy.bullets[i];
                
                if (this.checkCollision(bullet, this.player)) {
                    enemy.bullets.splice(i, 1);
                    this.state.lives--;
                    this.updateLives();
                    
                    if (this.state.lives <= 0) {
                        this.gameOver();
                    }
                    break;
                }
            }
        }
        
        if (enemies.length === 0) {
            this.nextLevel();
        }
    }
    
    // Add the missing checkCollision method
    checkCollision(a, b) {
        return !(a.x + a.width < b.x || 
                a.x > b.x + b.width || 
                a.y + a.height < b.y || 
                a.y > b.y + b.height);
    }

    handleCollision(bullet, enemy) {
        this.entities.delete(enemy);
        this.state.score += 10;
        this.soundManager.playExplosion();
        this.updateScore();
    }
    
    gameOver() {
        alert(`Game Over! Your final score: ${this.state.score}`);
        this.stop();
    }
    
    updateLives() {
        document.getElementById('lives').textContent = `Lives: ${this.state.lives}`;
    }

    render() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw stars (background)
        this.drawBackground();
        
        // Draw player
        this.player.draw(this.ctx);
        
        // Draw entities (enemies, bullets)
        this.entities.forEach(entity => {
            if (!(entity instanceof Player)) {
                entity.draw(this.ctx);
            }
        });
    }
    
    // Fix random background stars so they don't flicker
    drawBackground() {
        if (!this.stars) {
            // Generate stars once
            this.stars = Array.from({length: 100}, () => ({
                x: Math.random() * GAME_CONFIG.width,
                y: Math.random() * GAME_CONFIG.height,
                size: Math.random() * 2
            }));
        }
        
        // Draw the stars
        this.ctx.fillStyle = '#FFF';
        for (const star of this.stars) {
            this.ctx.fillRect(star.x, star.y, star.size, star.size);
        }
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

    nextLevel() {
        this.state.level++;
        if (this.state.level <= this.state.maxLevel) {
            this.initEnemies();
        } else {
            this.victory();
        }
    }

    victory() {
        alert(`Congratulations! You completed all ${this.state.maxLevel} levels!`);
        this.stop();
    }

    initEnemies() {
        const currentLevel = GAME_CONFIG.levels[this.state.level - 1];
        const rows = currentLevel.enemyRows;
        const cols = 8;
        
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const enemy = new Enemy(
                    j * (ENEMY_WIDTH + 20) + 50,
                    i * (ENEMY_HEIGHT + 20) + 50,
                    currentLevel.enemyType
                );
                this.entities.add(enemy);
            }
        }
    }

    updateScore() {
        document.getElementById('score').textContent = `Score: ${this.state.score}`;
    }
}

class Player {
    constructor() {
        this.width = PLAYER_WIDTH;
        this.height = PLAYER_HEIGHT;
        this.x = GAME_CONFIG.width / 2 - this.width / 2;
        this.y = GAME_CONFIG.height - this.height - 10;
        this.speed = 5;
        this.bullets = [];
        this.lastShot = 0;
        this.shootDelay = 250; // Minimum time between shots
    }

    draw(ctx) {
        ctx.fillStyle = '#0f0';
        ctx.beginPath();
        // Draw spaceship body
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x + this.width * 0.8, this.y + this.height * 0.8);
        ctx.lineTo(this.x + this.width * 0.6, this.y + this.height);
        ctx.lineTo(this.x + this.width * 0.4, this.y + this.height);
        ctx.lineTo(this.x + this.width * 0.2, this.y + this.height * 0.8);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.fill();

        // Draw cockpit
        ctx.fillStyle = '#00f';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height * 0.4, this.width * 0.15, 0, Math.PI * 2);
        ctx.fill();

        this.bullets.forEach(bullet => bullet.draw(ctx));
    }

    move(direction) {
        this.x = Math.max(0, Math.min(GAME_CONFIG.width - this.width, this.x + direction * this.speed));
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShot >= this.shootDelay) {
            this.bullets.push(new Bullet(this.x + this.width / 2, this.y));
            this.lastShot = now;
            // Fix circular reference by using window.gameInstance
            window.gameInstance.soundManager.playShoot();
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
    constructor(x, y, type = 'basic') {
        this.x = x;
        this.y = y;
        this.width = ENEMY_WIDTH;
        this.height = ENEMY_HEIGHT;
        this.speed = GAME_CONFIG.levels[0].enemySpeed; // Start with first level speed
        this.bullets = [];
        this.lastShot = 0;
        this.type = type;
        this.direction = 1; // Add direction property
    }

    draw(ctx) {
        switch(this.type) {
            case 'basic':
                this.drawBasicAlien(ctx);
                break;
            case 'advanced':
                this.drawAdvancedAlien(ctx);
                break;
            case 'boss':
                this.drawBossAlien(ctx);
                break;
        }
    }

    drawBasicAlien(ctx) {
        ctx.fillStyle = '#f00';
        // Draw alien head
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y + this.height*0.4, this.width*0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x + this.width*0.35, this.y + this.height*0.35, this.width*0.08, 0, Math.PI * 2);
        ctx.arc(this.x + this.width*0.65, this.y + this.height*0.35, this.width*0.08, 0, Math.PI * 2);
        ctx.fill();
    }

    drawAdvancedAlien(ctx) {
        ctx.fillStyle = '#f0f';
        // Draw UFO body
        ctx.beginPath();
        ctx.ellipse(this.x + this.width/2, this.y + this.height*0.6, this.width*0.5, this.height*0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw dome
        ctx.fillStyle = '#ff0';
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y + this.height*0.4, this.width*0.25, Math.PI, 0);
        ctx.fill();
    }

    drawBossAlien(ctx) {
        ctx.fillStyle = '#f00';
        // Draw mothership
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height*0.5);
        ctx.lineTo(this.x + this.width*0.2, this.y + this.height*0.3);
        ctx.lineTo(this.x + this.width*0.8, this.y + this.height*0.3);
        ctx.lineTo(this.x + this.width, this.y + this.height*0.5);
        ctx.lineTo(this.x + this.width*0.8, this.y + this.height*0.7);
        ctx.lineTo(this.x + this.width*0.2, this.y + this.height*0.7);
        ctx.closePath();
        ctx.fill();

        // Draw weapon ports
        ctx.fillStyle = '#ff0';
        ctx.beginPath();
        ctx.rect(this.x + this.width*0.3, this.y + this.height*0.6, this.width*0.1, this.height*0.1);
        ctx.rect(this.x + this.width*0.6, this.y + this.height*0.6, this.width*0.1, this.height*0.1);
        ctx.fill();
    }

    move(direction) {
        this.x += direction * this.speed;
    }

    shoot() {
        // Adjust probability based on level
        const shootingChance = 0.001 * window.gameInstance.state.level;
        
        if (Math.random() < shootingChance) {
            const bullet = new Bullet(this.x + this.width / 2, this.y + this.height);
            bullet.speed = -bullet.speed; // Reverse direction for enemy bullets
            this.bullets.push(bullet);
        }
    }

    update(deltaTime) {
        // Add enemy update logic
        this.bullets = this.bullets.filter(bullet => {
            bullet.update(deltaTime);
            return bullet.y < GAME_CONFIG.height;
        });
        this.shoot();
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
        // Draw laser bolt
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - this.width, this.y + this.height*0.3);
        ctx.lineTo(this.x - this.width, this.y + this.height*0.7);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.lineTo(this.x + this.width, this.y + this.height*0.7);
        ctx.lineTo(this.x + this.width, this.y + this.height*0.3);
        ctx.closePath();
        ctx.fill();
    }

    update(deltaTime) {
        this.y -= this.speed * (deltaTime / 16); // Make speed frame-rate independent
    }
}

// Initialize game when document is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.start();
});
