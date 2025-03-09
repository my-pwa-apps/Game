const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 30;
const ENEMY_WIDTH = 40;
const ENEMY_HEIGHT = 30;
const BULLET_WIDTH = 3;
const BULLET_HEIGHT = 15;

// Add bonus ship constants
const BONUS_SHIP_WIDTH = 60;
const BONUS_SHIP_HEIGHT = 20;

// Add new bonus types enum to existing code
const BonusType = {
    RAPID_FIRE: 'rapidFire',
    MULTI_SHOT: 'multiShot',
    BULLET_SHIELD: 'bulletShield'
};

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
    ],
    bonusShipChance: 0.001,  // Chance per frame of bonus ship appearing
    bonusDuration: 10000     // Duration of bonus effect in ms
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

    playAlienMove() {
        if (this.isMuted) return;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(150 + Math.random() * 30, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.05, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
    }

    playPlayerHit() {
        if (this.isMuted) return;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }

    playBulletCollision() {
        if (this.isMuted) return;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(220, this.audioContext.currentTime + 0.05);
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.05);
    }

    playBonusShip() {
        if (this.isMuted) return;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(660, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(440, this.audioContext.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }

    playPowerupCollect() {
        if (this.isMuted) return;
        
        // Play ascending notes for powerup
        this._playOscillator('sine', 440, 880, 0.2, 0.1);
        
        setTimeout(() => {
            this._playOscillator('sine', 660, 990, 0.2, 0.1);
        }, 100);
        
        setTimeout(() => {
            this._playOscillator('sine', 880, 1320, 0.2, 0.1);
        }, 200);
    }
    
    _playOscillator(type, freqStart, freqEnd, gain, duration) {
        if (this.isMuted) return;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(freqStart, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(freqEnd, this.audioContext.currentTime + duration);
        
        gainNode.gain.setValueAtTime(gain, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
    }
}

// Add game state constants for better state management
const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver',
    LEVEL_COMPLETE: 'levelComplete'
};

// Add object pooling for explosions to improve performance
class ObjectPool {
    constructor(objectType, initialSize = 20) {
        this.objectType = objectType;
        this.pool = [];
        this.grow(initialSize);
    }
    
    grow(size) {
        for (let i = 0; i < size; i++) {
            this.pool.push(new this.objectType());
        }
    }
    
    get(params = {}) {
        if (this.pool.length === 0) {
            this.grow(5);
        }
        
        const object = this.pool.pop();
        object.reset(params);
        return object;
    }
    
    release(object) {
        this.pool.push(object);
    }
}

// Improved explosion class with object pooling support
class Explosion {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.size = 30;
        this.color = '#ff0';
        this.lifetime = 30;
        this.age = 0;
        this.particles = [];
        this.active = false;
    }
    
    reset({x, y, color = '#ff0', size = 30}) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = color;
        this.age = 0;
        this.active = true;
        this.particles = [];
        this.createParticles();
        return this;
    }
    
    createParticles() {
        const particleCount = 20;
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 2;
            this.particles.push({
                x: 0,
                y: 0,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 1 + Math.random() * 3,
                alpha: 1
            });
        }
    }
    
    update() {
        this.age++;
        
        for (const particle of this.particles) {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.alpha = 1 - (this.age / this.lifetime);
        }
        
        if (this.age >= this.lifetime) {
            this.active = false;
        }
        
        return this.active;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        for (const particle of this.particles) {
            ctx.globalAlpha = particle.alpha;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Fix and add missing methods to Game class
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
            maxLevel: GAME_CONFIG.levels.length,
            gameState: GameState.MENU
        };
        
        this.soundManager = new SoundManager();
        
        // Create singleton reference for global access
        window.gameInstance = this;
        
        // Create offscreen canvas for background rendering
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = GAME_CONFIG.width;
        this.offscreenCanvas.height = GAME_CONFIG.height;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        
        // Create object pools for bullets to reduce garbage collection
        this.bulletPool = new ObjectPool(Bullet, 30);
        this.explosionPool = new ObjectPool(Explosion, 10);
        
        this.lastAlienSound = 0;
        this.alienSoundInterval = 800; // ms between alien movement sounds
        this.debug = false; // Set to true for debugging

        this.explosions = [];
        this.playerInvulnerable = false;
        this.playerInvulnerableTime = 0;
        this.playerInvulnerableDuration = 1500; // 1.5 seconds of invulnerability

        // Audio context initialization flag
        this.audioInitialized = false;
        
        // Add touch area for mobile controls
        this.touchZones = {
            left: { x: 0, width: GAME_CONFIG.width / 3 },
            middle: { x: GAME_CONFIG.width / 3, width: GAME_CONFIG.width / 3 },
            right: { x: GAME_CONFIG.width * 2 / 3, width: GAME_CONFIG.width / 3 }
        };
        
        // Speed up movement and animations based on frame rate
        this.deltaMultiplier = 1;

        this.bonusShip = null;
        this.bonusShipTimer = 0;

        this.init();
    }

    init() {
        this.setupCanvas();
        this.bindEvents();
        this.player = new Player();
        this.entities = new Set();
        this.entities.add(this.player); // Add player to entities
        this.initEnemies();
        this.prepareBackgroundStars();
        this.bindKeys();
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
    
    // Separate method for keyboard handling to improve event management
    bindKeys() {
        const keyState = {};
        
        window.addEventListener('keydown', (e) => {
            keyState[e.key] = true;
            if (e.key === ' ' && this.state.gameState === GameState.PLAYING) {
                this.player.shoot();
            } else if (e.key === 'p') {
                this.togglePause();
            } else if (e.key === 'm') {
                this.soundManager.toggleMute();
            } else if (e.key === 'Enter' && this.state.gameState === GameState.MENU) {
                this.startGame();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            keyState[e.key] = false;
        });
        
        // Handle continuous movement
        this.playerMovementInterval = setInterval(() => {
            if (this.state.gameState !== GameState.PLAYING) return;
            
            if (keyState['ArrowLeft']) this.player.move(-1);
            if (keyState['ArrowRight']) this.player.move(1);
        }, 16);
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
        this.initAudio(); // Initialize audio on first touch
        
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const touchX = (touch.clientX - rect.left) * (GAME_CONFIG.width / rect.width);
        
        // Map touch to screen zones
        if (touchX < this.touchZones.left.x + this.touchZones.left.width) {
            this.player.move(-1);
        } else if (touchX > this.touchZones.right.x) {
            this.player.move(1);
        } else {
            this.player.shoot();
        }
        
        this.state.touches.set(touch.identifier, { x: touchX, y: touch.clientY });
    }

    handleTouchEnd(e) {
        e.preventDefault();
        this.state.touches.clear();
        this.player.shoot();
    }

    // Ensure audio context is initialized with user interaction
    initAudio() {
        if (!this.audioInitialized && this.soundManager.audioContext.state === 'suspended') {
            this.soundManager.audioContext.resume();
            this.audioInitialized = true;
        }
    }

    update(deltaTime) {
        if (this.state.gameState !== GameState.PLAYING) return;
        
        // Calculate frame rate compensation multiplier
        this.deltaMultiplier = deltaTime / (1000/60); // Target 60 FPS
        
        // Update player invulnerability
        if (this.playerInvulnerable) {
            this.playerInvulnerableTime += deltaTime;
            if (this.playerInvulnerableTime >= this.playerInvulnerableDuration) {
                this.playerInvulnerable = false;
            }
        }
        
        // Update explosions with proper memory management
        this.explosions = this.explosions.filter(explosion => {
            const active = explosion.update();
            if (!active) {
                this.explosionPool.release(explosion);
            }
            return active;
        });

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

        // Update and potentially spawn bonus ship
        this.updateBonusShip(deltaTime);
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
        
        // Play alien movement sound at intervals
        const now = Date.now();
        if (now - this.lastAlienSound > this.alienSoundInterval) {
            this.soundManager.playAlienMove();
            this.lastAlienSound = now;
        }
        
        // Change direction and move down if hit wall
        if (hitWall) {
            for (const enemy of enemies) {
                enemy.direction *= -1;
                enemy.y += 20;
                
                // Check if enemy reached player level - game over
                if (enemy.y + enemy.height >= this.player.y) {
                    this.gameOver("Aliens reached your ship!");
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
        
        // Early return if no enemies or bullets
        if (enemies.length === 0) {
            this.handleGameEvent('levelComplete');
            return;
        }
        
        // Player bullets hitting enemies
        for (let i = playerBullets.length - 1; i >= 0; i--) {
            if (i >= playerBullets.length) continue; // Safety check
            const bullet = playerBullets[i];
            
            // Check player bullets hitting bonus ship
            if (this.bonusShip && this.checkCollision(bullet, this.bonusShip)) {
                this.bonusShip.hit();
                this.bulletPool.release(playerBullets[i]);
                playerBullets.splice(i, 1);
                continue;
            }
            
            // Check player bullets hitting enemies
            let hitEnemy = false;
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                
                if (this.checkCollision(bullet, enemy)) {
                    this.handleGameEvent('enemyDestroyed', {
                        enemy: enemy,
                        x: enemy.x + enemy.width/2,
                        y: enemy.y + enemy.height/2
                    });
                    
                    this.bulletPool.release(playerBullets[i]);
                    playerBullets.splice(i, 1);
                    hitEnemy = true;
                    break;
                }
            }
            
            // Skip further checks if we already hit an enemy
            if (hitEnemy) continue;
            
            // Check for bullets hitting enemy bullets (bullet defense)
            let bulletHit = false;
            enemyLoop: for (const enemy of enemies) {
                for (let j = enemy.bullets.length - 1; j >= 0; j--) {
                    const enemyBullet = enemy.bullets[j];
                    
                    if (this.checkBulletCollision(bullet, enemyBullet)) {
                        // Create small explosion where bullets collided
                        this.explosions.push(
                            this.explosionPool.get({
                                x: (bullet.x + enemyBullet.x) / 2,
                                y: (bullet.y + enemyBullet.y) / 2,
                                color: '#fff',
                                size: 15
                            })
                        );
                        
                        // Play sound effect
                        this.soundManager.playBulletCollision();
                        
                        // Remove both bullets
                        this.bulletPool.release(playerBullets[i]);
                        playerBullets.splice(i, 1);
                        this.bulletPool.release(enemyBullet);
                        enemy.bullets.splice(j, 1);
                        
                        bulletHit = true;
                        break enemyLoop;
                    }
                }
            }
            
            if (bulletHit) continue;
        }
        
        // Enemy bullets hitting player - only if player is not invulnerable or shield active
        if (!this.playerInvulnerable && 
            !(this.player.hasBonus && this.player.bonusType === BonusType.BULLET_SHIELD)) {
            for (const enemy of enemies) {
                for (let i = enemy.bullets.length - 1; i >= 0; i--) {
                    const bullet = enemy.bullets[i];
                    
                    if (this.checkCollision(bullet, this.player)) {
                        // Return bullet to pool
                        this.bulletPool.release(bullet);
                        enemy.bullets.splice(i, 1);
                        
                        this.handleGameEvent('playerHit', {
                            x: bullet.x, 
                            y: bullet.y
                        });
                        break;
                    }
                }
            }
        }
    }

    checkCollision(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj2.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj2.height > obj2.y;
    }

    checkBulletCollision(bullet1, bullet2) {
        // Check for collision between two bullets using distance calculation
        // This is more accurate for round enemy bullets
        const dx = bullet1.x - bullet2.x;
        const dy = bullet1.y - bullet2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Use combined radius as collision threshold
        const collisionRadius = bullet1.width + bullet2.width * 2;
        return distance < collisionRadius;
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
        // Cancel player movement interval to prevent memory leaks
        clearInterval(this.playerMovementInterval);
    }

    startGame() {
        this.state.gameState = GameState.PLAYING;
        this.state.score = 0;
        this.state.lives = 3;
        this.state.level = 1;
        this.updateScore();
        this.updateLives();
        
        // Reset entities and initialize
        this.entities = new Set();
        this.entities.add(this.player);
        this.initEnemies();
        
        this.start();
    }
    
    togglePause() {
        if (this.state.gameState === GameState.PLAYING) {
            this.state.gameState = GameState.PAUSED;
        } else if (this.state.gameState === GameState.PAUSED) {
            this.state.gameState = GameState.PLAYING;
        }
    }

    nextLevel() {
        // Award extra life when a level is completed
        this.awardExtraLife();
        
        this.state.level++;
        if (this.state.level <= this.state.maxLevel) {
            // Clear all enemy bullets between levels
            this.entities.forEach(entity => {
                if (entity instanceof Enemy) {
                    entity.bullets.forEach(bullet => this.bulletPool.release(bullet));
                    entity.bullets = [];
                }
            });
            
            // Initialize next level
            setTimeout(() => this.initEnemies(), 2000);
        } else {
            this.victory();
        }
    }

    victory() {
        this.state.gameState = GameState.GAME_OVER;
        
        // Show victory screen
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);
        
        this.ctx.fillStyle = '#0f0';
        this.ctx.font = '40px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('VICTORY!', GAME_CONFIG.width/2, GAME_CONFIG.height/3);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`You completed all ${this.state.maxLevel} levels!`, GAME_CONFIG.width/2, GAME_CONFIG.height*0.45);
        this.ctx.fillText(`Final Score: ${this.state.score}`, GAME_CONFIG.width/2, GAME_CONFIG.height/2);
        this.ctx.fillText('Press ENTER to play again', GAME_CONFIG.width/2, GAME_CONFIG.height * 0.6);
        
        this.stop();
        
        // Setup event listener for restart
        const restartHandler = (e) => {
            if (e.key === 'Enter') {
                window.removeEventListener('keydown', restartHandler);
                this.startGame();
            }
        };
        
        window.addEventListener('keydown', restartHandler);
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
    
    // Create a reusable bullet to reduce object creation
    createBullet(x, y, isEnemy = false) {
        // Check bullet pool first
        let bullet;
        if (this.bulletPool.length > 0) {
            bullet = this.bulletPool.pop();
            bullet.x = x;
            bullet.y = y;
            bullet.speed = isEnemy ? -7 : 7;
        } else {
            bullet = new Bullet(x, y);
            if (isEnemy) bullet.speed = -bullet.speed;
        }
        return bullet;
    }
    
    // Return bullet to pool when no longer needed
    recycleBullet(bullet) {
        // Reset bullet state
        this.bulletPool.push(bullet);
    }

    // Optimize handling of game events
    handleGameEvent(eventType, data = {}) {
        switch(eventType) {
            case 'playerHit':
                this.explosions.push(
                    this.explosionPool.get({
                        x: data.x,
                        y: data.y,
                        color: '#0f8',
                        size: 20
                    })
                );
                this.state.lives--;
                this.updateLives();
                this.soundManager.playPlayerHit();
                
                // Make player invulnerable briefly
                this.playerInvulnerable = true;
                this.playerInvulnerableTime = 0;
                
                if (this.state.lives <= 0) {
                    this.handleGameEvent('gameOver', {reason: "You ran out of lives!"});
                }
                break;
                
            case 'enemyDestroyed':
                this.explosions.push(
                    this.explosionPool.get({
                        x: data.x, 
                        y: data.y,
                        color: '#f88',
                        size: 30
                    })
                );
                this.entities.delete(data.enemy);
                this.state.score += 10;
                this.soundManager.playExplosion();
                this.updateScore();
                break;
                
            case 'gameOver':
                // Final explosion
                this.explosions.push(
                    this.explosionPool.get({
                        x: this.player.x + this.player.width/2,
                        y: this.player.y + this.player.height/2,
                        color: '#0f0',
                        size: 60
                    })
                );
                this.gameOver(data.reason);
                break;
                
            case 'levelComplete':
                this.nextLevel();
                break;
        }
    }

    updateBonusShip(deltaTime) {
        // Update existing bonus ship if present
        if (this.bonusShip) {
            if (!this.bonusShip.update(deltaTime)) {
                this.bonusShip = null;
            }
            return;
        }

        // Random chance to spawn a bonus ship
        if (Math.random() < GAME_CONFIG.bonusShipChance && this.state.gameState === GameState.PLAYING) {
            this.bonusShip = new BonusShip();
            this.soundManager.playBonusShip();
        }
    }

    awardExtraLife() {
        this.state.lives++;
        this.updateLives();
        
        // Display a message
        const messageEl = document.createElement('div');
        messageEl.className = 'level-message';
        messageEl.innerHTML = `LEVEL ${this.state.level} COMPLETE!<br>+1 LIFE`;
        document.getElementById('game-container').appendChild(messageEl);
        
        // Remove after animation
        setTimeout(() => {
            messageEl.classList.add('fade-out');
            setTimeout(() => messageEl.remove(), 1000);
        }, 2000);
    }

    /**
     * Updates the lives display in the DOM
     */
    updateLives() {
        document.getElementById('lives').textContent = `Lives: ${this.state.lives}`;
    }

    render() {
        // Clear the canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this.drawBackground();
        
        if (this.state.gameState === GameState.MENU) {
            this.renderMenu();
            return;
        }
        
        if (this.state.gameState === GameState.PAUSED) {
            this.renderPauseScreen();
            return;
        }
        
        // Draw player with blinking effect when invulnerable
        if (!this.playerInvulnerable || Math.floor(Date.now() / 100) % 2) {
            this.player.draw(this.ctx);
        }
        
        // Draw entities (enemies and their bullets)
        this.entities.forEach(entity => {
            if (entity instanceof Enemy) {
                entity.draw(this.ctx);
                // Draw enemy bullets
                entity.bullets.forEach(bullet => bullet.draw(this.ctx));
            }
        });
        
        // Draw bonus ship if active
        if (this.bonusShip) {
            this.bonusShip.draw(this.ctx);
        }

        // Draw explosions over everything else
        this.explosions.forEach(explosion => explosion.draw(this.ctx));
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

    renderMenu() {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '40px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('SPACE INVADERS', GAME_CONFIG.width/2, GAME_CONFIG.height/3);
        
        this.ctx.font = '20px Arial';
        this.ctx.fillText('Press ENTER to start', GAME_CONFIG.width/2, GAME_CONFIG.height/2);
        
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Controls: Arrows to move, Space to shoot', GAME_CONFIG.width/2, GAME_CONFIG.height * 0.6);
        this.ctx.fillText('P to pause, M to mute', GAME_CONFIG.width/2, GAME_CONFIG.height * 0.65);
        
        // Draw a small player ship for visual appeal
        this.ctx.save();
        this.ctx.translate(GAME_CONFIG.width/2, GAME_CONFIG.height * 0.8);
        this.ctx.fillStyle = '#0f0';
        this.ctx.beginPath();
        this.ctx.moveTo(0, -15);
        this.ctx.lineTo(25, 15);
        this.ctx.lineTo(-25, 15);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
    }
    
    renderPauseScreen() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '40px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PAUSED', GAME_CONFIG.width/2, GAME_CONFIG.height/2);
        
        this.ctx.font = '20px Arial';
        this.ctx.fillText('Press P to resume', GAME_CONFIG.width/2, GAME_CONFIG.height * 0.6);
    }

    /**
     * Prepare the background stars texture on the offscreen canvas.
     * This method initializes the starfield to avoid regenerating it on every frame.
     */
    prepareBackgroundStars() {
        // Clear the offscreen canvas
        this.offscreenCtx.fillStyle = '#000';
        this.offscreenCtx.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);
        
        // Generate a fixed starfield pattern
        this.stars = [];
        for (let i = 0; i < 100; i++) {
            const star = {
                x: Math.random() * GAME_CONFIG.width,
                y: Math.random() * GAME_CONFIG.height,
                size: 0.5 + Math.random() * 1.5, // Different star sizes
                brightness: 0.5 + Math.random() * 0.5 // Different brightness
            };
            this.stars.push(star);
            
            // Draw each star on the offscreen canvas
            this.offscreenCtx.fillStyle = `rgba(255,255,255,${star.brightness})`;
            this.offscreenCtx.beginPath();
            this.offscreenCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.offscreenCtx.fill();
        }
        
        // Add some larger brighter stars
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * GAME_CONFIG.width;
            const y = Math.random() * GAME_CONFIG.height;
            const size = 1.5 + Math.random() * 1;
            
            // Create a gradient for the star
            const gradient = this.offscreenCtx.createRadialGradient(x, y, 0, x, y, size * 2);
            gradient.addColorStop(0, 'rgba(255,255,255,0.8)');
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            
            this.offscreenCtx.fillStyle = gradient;
            this.offscreenCtx.beginPath();
            this.offscreenCtx.arc(x, y, size * 2, 0, Math.PI * 2);
            this.offscreenCtx.fill();
        }
    }

    drawBackground() {
        // Simply copy the pre-rendered background
        this.ctx.drawImage(this.offscreenCanvas, 0, 0);
    }
}

// Add the BonusShip class
class BonusShip {
    constructor() {
        this.width = BONUS_SHIP_WIDTH;
        this.height = BONUS_SHIP_HEIGHT;
        // Randomize direction
        this.direction = Math.random() > 0.5 ? 1 : -1;
        // Start off-screen
        this.x = this.direction > 0 ? -this.width : GAME_CONFIG.width;
        // Random height in top area of screen
        this.y = 30 + Math.random() * 80;
        // Random speed
        this.speed = 2 + Math.random() * 2;
        // Random bonus type
        this.bonusType = this._getRandomBonusType();
        this.active = true;
    }
    
    _getRandomBonusType() {
        const types = Object.values(BonusType);
        return types[Math.floor(Math.random() * types.length)];
    }
    
    draw(ctx) {
        // Get color based on bonus type
        let color;
        switch (this.bonusType) {
            case BonusType.RAPID_FIRE:
                color = '#ff0'; // Yellow
                break;
            case BonusType.MULTI_SHOT:
                color = '#f0f'; // Purple
                break;
            case BonusType.BULLET_SHIELD:
                color = '#0ff'; // Cyan
                break;
            default:
                color = '#fff';
        }
        
        // Draw bonus ship
        ctx.fillStyle = color;
        
        // Draw saucer body
        ctx.beginPath();
        ctx.ellipse(
            this.x + this.width/2, 
            this.y + this.height*0.6, 
            this.width*0.5, 
            this.height*0.3, 
            0, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Draw dome
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(
            this.x + this.width/2, 
            this.y + this.height*0.3, 
            this.width*0.3, 
            Math.PI, 0
        );
        ctx.fill();
        
        // Draw lights that blink
        if (Math.floor(Date.now() / 200) % 2) {
            ctx.fillStyle = color;
            ctx.beginPath();
            
            // Three blinking lights under the ship
            for (let i = 0; i < 3; i++) {
                ctx.rect(
                    this.x + this.width * (0.25 + i * 0.25) - 5,
                    this.y + this.height * 0.8,
                    10,
                    5
                );
            }
            ctx.fill();
        }
    }
    
    update(deltaTime) {
        // Calculate movement based on deltaTime for consistent speed
        const multiplier = window.gameInstance.deltaMultiplier;
        this.x += this.direction * this.speed * multiplier;
        
        // Check if ship has left the screen
        if ((this.direction > 0 && this.x > GAME_CONFIG.width) || 
            (this.direction < 0 && this.x < -this.width)) {
            this.active = false;
        }
        
        return this.active;
    }
    
    hit() {
        // When hit by player, apply bonus and create explosion
        window.gameInstance.player.applyBonus(this.bonusType);
        window.gameInstance.explosions.push(
            window.gameInstance.explosionPool.get({
                x: this.x + this.width/2,
                y: this.y + this.height/2,
                color: '#fff',
                size: 40
            })
        );
        window.gameInstance.soundManager.playPowerupCollect();
        this.active = false;
    }
}

// Enhance Player class with bonus functionality
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
        
        // Add bonus properties
        this.hasBonus = false;
        this.bonusType = null;
        this.bonusEndTime = 0;
    }
    
    draw(ctx) {
        // Change ship color based on active bonus
        ctx.fillStyle = this.hasBonus ? this._getBonusColor() : '#0f0';
        
        // ...existing drawing code...
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
        
        // Draw shield if bullet shield bonus is active
        if (this.hasBonus && this.bonusType === BonusType.BULLET_SHIELD) {
            ctx.strokeStyle = '#0ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width * 0.8, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw bullets
        this.bullets.forEach(bullet => bullet.draw(ctx));
    }
    
    _getBonusColor() {
        switch (this.bonusType) {
            case BonusType.RAPID_FIRE:
                return '#ff0'; // Yellow for rapid fire
            case BonusType.MULTI_SHOT:
                return '#f0f'; // Purple for multi-shot
            case BonusType.BULLET_SHIELD:
                return '#0ff'; // Cyan for bullet shield
            default:
                return '#0f0';
        }
    }
    
    move(direction) {
        this.x = Math.max(0, Math.min(GAME_CONFIG.width - this.width, this.x + direction * this.speed));
    }

    shoot() {
        const now = Date.now();
        // Get current shoot delay (reduced if rapid fire bonus is active)
        const currentDelay = this.hasBonus && this.bonusType === BonusType.RAPID_FIRE ? 
                           this.shootDelay / 3 : this.shootDelay;
        
        if (now - this.lastShot >= currentDelay) {
            // Normal shot or multi-shot based on bonus
            if (this.hasBonus && this.bonusType === BonusType.MULTI_SHOT) {
                // Create 3 bullets for multi-shot
                this.bullets.push(window.gameInstance.bulletPool.get({
                    x: this.x + this.width / 2, 
                    y: this.y
                }));
                this.bullets.push(window.gameInstance.bulletPool.get({
                    x: this.x + this.width / 4, 
                    y: this.y + this.height / 3
                }));
                this.bullets.push(window.gameInstance.bulletPool.get({
                    x: this.x + 3 * this.width / 4, 
                    y: this.y + this.height / 3
                }));
            } else {
                // Normal single shot
                this.bullets.push(window.gameInstance.bulletPool.get({
                    x: this.x + this.width / 2, 
                    y: this.y
                }));
            }
            
            this.lastShot = now;
            window.gameInstance.soundManager.playShoot();
        }
    }
    
    applyBonus(type) {
        this.hasBonus = true;
        this.bonusType = type;
        this.bonusEndTime = Date.now() + GAME_CONFIG.bonusDuration;
        
        // Show message for bonus
        this._showBonusMessage();
    }
    
    _showBonusMessage() {
        let message;
        switch (this.bonusType) {
            case BonusType.RAPID_FIRE:
                message = "RAPID FIRE!";
                break;
            case BonusType.MULTI_SHOT:
                message = "MULTI-SHOT!";
                break;
            case BonusType.BULLET_SHIELD:
                message = "BULLET SHIELD!";
                break;
        }
        
        const messageEl = document.createElement('div');
        messageEl.className = 'bonus-message';
        messageEl.textContent = message;
        document.getElementById('game-container').appendChild(messageEl);
        
        setTimeout(() => {
            messageEl.classList.add('fade-out');
            setTimeout(() => messageEl.remove(), 1000);
        }, 2000);
    }
    
    update(deltaTime) {
        // Check if bonus has expired
        if (this.hasBonus && Date.now() > this.bonusEndTime) {
            this.hasBonus = false;
            this.bonusType = null;
        }
        
        // Update bullets with efficient memory management
        this.bullets = this.bullets.filter(bullet => {
            bullet.update(deltaTime);
            
            if (bullet.y <= 0) {
                window.gameInstance.bulletPool.release(bullet);
                return false;
            }
            return true;
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
        this.shootDelay = 2000 + Math.random() * 6000; // Increase delay between shots
        this.lastShot = Date.now() + Math.random() * 3000; // Greater offset for initial shooting
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
        // Only allow a certain number of bullets on screen per level
        const maxEnemyBullets = Math.min(3 + window.gameInstance.state.level, 20);
        let totalEnemyBullets = 0;
        
        // Count existing enemy bullets
        const enemies = [...window.gameInstance.entities].filter(e => e instanceof Enemy);
        for (const enemy of enemies) {
            totalEnemyBullets += enemy.bullets.length;
        }
        
        // Don't shoot if there are already too many bullets
        if (totalEnemyBullets >= maxEnemyBullets) {
            return;
        }
        
        const now = Date.now();
        // Adjust difficulty based on level - much easier in first level
        const levelFactor = window.gameInstance.state.level === 1 ? 0.0002 : 0.0005 * window.gameInstance.state.level;
        
        // Random check based on level difficulty
        if (now - this.lastShot >= this.shootDelay && Math.random() < levelFactor) {
            // Get bullet from pool instead of creating new one
            const bullet = window.gameInstance.bulletPool.get({
                x: this.x + this.width / 2,
                y: this.y + this.height,
                speed: -7,
                enemyBullet: true
            });
            
            this.bullets.push(bullet);
            this.lastShot = now;
            this.shootDelay = 2000 + Math.random() * (8000 - window.gameInstance.state.level * 500); // More delay in early levels
        }
    }

    update(deltaTime) {
        // Apply frame rate compensation
        const speedMultiplier = window.gameInstance.deltaMultiplier;
        
        // Update existing bullets with proper object pooling
        this.bullets = this.bullets.filter(bullet => {
            bullet.update(deltaTime);
            if (bullet.y <= 0 || bullet.y >= GAME_CONFIG.height) {
                window.gameInstance.bulletPool.release(bullet);
                return false;
            }
            return true;
        });
        
        // Try to shoot
        this.shoot();
    }
}

class Bullet {
    constructor() {
        this.reset();
    }
    
    reset({x = 0, y = 0, speed = 7, enemyBullet = false} = {}) {
        this.x = x;
        this.y = y;
        this.width = BULLET_WIDTH;
        this.height = BULLET_HEIGHT;
        this.speed = speed;
        this.enemyBullet = enemyBullet;
        return this;
    }
    
    draw(ctx) {
        if (this.enemyBullet) {
            // Enemy bullets are red
            ctx.fillStyle = '#ff0'; // Yellow for enemy bullets
            // Draw enemy bullet as a different shape
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width * 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Player bullets stay white laser bolts
            ctx.fillStyle = '#fff';
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
    }
    
    update(deltaTime) {
        // Frame rate independent movement
        const speedMultiplier = window.gameInstance.deltaMultiplier;
        this.y -= this.speed * speedMultiplier;
    }
}

// Clean up event handling for DOM content loaded
window.addEventListener('DOMContentLoaded', () => {
    if (window.gameInstance) return;
    
    const game = new Game();
    
    // Try to unlock audio on first user interaction
    const unlockAudio = () => {
        game.initAudio();
        ['click', 'touchstart', 'keydown'].forEach(event => {
            document.removeEventListener(event, unlockAudio);
        });
    };
    
    ['click', 'touchstart', 'keydown'].forEach(event => {
        document.addEventListener(event, unlockAudio, { once: true });
    });
    
    game.start();
});
