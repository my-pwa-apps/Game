// Constants - grouped at top for better minification
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 30;
const ENEMY_WIDTH = 40;
const ENEMY_HEIGHT = 30;
const BULLET_WIDTH = 3;
const BULLET_HEIGHT = 15;
const BONUS_SHIP_WIDTH = 60;
const BONUS_SHIP_HEIGHT = 20;

// Define game state constants for better state management
const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver',
    LEVEL_COMPLETE: 'levelComplete'
};

// Add new bonus types enum to existing code
const BonusType = {
    RAPID_FIRE: 'rapidFire',
    MULTI_SHOT: 'multiShot',
    BULLET_SHIELD: 'bulletShield',
    EXTRA_LIFE: 'extraLife',      // New power-up
    SPEED_BOOST: 'speedBoost'     // New power-up
};

// Add game statistics tracking
const GameStats = {
    shotsFired: 0,
    shotsHit: 0,
    enemiesDestroyed: 0,
    powerupsCollected: 0,
    timePlayed: 0,
    
    reset() {
        this.shotsFired = 0;
        this.shotsHit = 0;
        this.enemiesDestroyed = 0;
        this.powerupsCollected = 0;
        this.timePlayed = 0;
    },
    
    getAccuracy() {
        return this.shotsFired > 0 ? Math.floor((this.shotsHit / this.shotsFired) * 100) : 0;
    }
};

// Define GAME_CONFIG first to avoid reference errors
const GAME_CONFIG = {
    width: 800,
    height: 600,
    fps: 60,
    scale: window.devicePixelRatio || 1,
    levels: [
        {
            enemyRows: 3,
            enemySpeed: 1,
            enemyType: 'basic',
            enemyPoints: 10,
            enemyShootFrequency: 0.0002
        },
        {
            enemyRows: 4,
            enemySpeed: 1.2,
            enemyType: 'advanced',
            enemyPoints: 20,
            enemyShootFrequency: 0.0004
        },
        {
            enemyRows: 5,
            enemySpeed: 1.5,
            enemyType: 'boss',
            enemyPoints: 30,
            enemyShootFrequency: 0.0006
        }
    ],
    bonusShipChance: 0.001,  // Chance per frame of bonus ship appearing
    bonusDuration: 10000,     // Duration of bonus effect in ms
    highScores: [] // Will store high scores
};

// Fix circular reference by using a global audio context
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Use requestIdleCallback for non-critical operations
const scheduleIdleTask = window.requestIdleCallback || 
    ((callback) => setTimeout(callback, 1));

// Optimize collision detection with spatial partitioning
class SpatialGrid {
    constructor(width, height, cellSize) {
        this.cellSize = cellSize;
        this.cols = Math.ceil(width / cellSize);
        this.rows = Math.ceil(height / cellSize);
        this.grid = new Array(this.cols * this.rows).fill().map(() => []);
    }
    
    clear() {
        for (let i = 0; i < this.grid.length; i++) {
            this.grid[i].length = 0;
        }
    }
    
    getIndex(x, y) {
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return -1;
        return row * this.cols + col;
    }
    
    insert(entity) {
        const index = this.getIndex(entity.x + entity.width/2, entity.y + entity.height/2);
        if (index !== -1) {
            this.grid[index].push(entity);
        }
    }
    
    getPotentialCollisions(entity) {
        // Get indices of surrounding cells
        const x = entity.x + entity.width/2;
        const y = entity.y + entity.height/2;
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        const result = [];
        
        for (let r = Math.max(0, row - 1); r <= Math.min(this.rows - 1, row + 1); r++) {
            for (let c = Math.max(0, col - 1); c <= Math.min(this.cols - 1, c + 1); c++) {
                const index = r * this.cols + c;
                result.push(...this.grid[index]);
            }
        }
        
        return result;
    }
}

// Add the missing SoundManager class before the Game class

// After audioContext definition, add the SoundManager class
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
    
    toggleMute() {
        this.isMuted = !this.isMuted;
    }
}

// Also add the Explosion and ParticleSystem classes before the Game class
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

// Add a ParticleSystem class for enhanced visual effects
class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 500;
        this.screenShake = {
            intensity: 0,
            duration: 0,
            startTime: 0,
            active: false,
            
            start(intensity, duration) {
                this.intensity = intensity;
                this.duration = duration;
                this.startTime = Date.now();
                this.active = true;
            },
            
            getOffset() {
                if (!this.active) return {x: 0, y: 0};
                
                const elapsed = (Date.now() - this.startTime) / 1000;
                if (elapsed > this.duration) {
                    this.active = false;
                    return {x: 0, y: 0};
                }
                
                const intensity = this.intensity * Math.pow(0.5, elapsed / (this.duration / 5));
                return {
                    x: (Math.random() * 2 - 1) * intensity,
                    y: (Math.random() * 2 - 1) * intensity
                };
            }
        };
    }
    
    addParticle(x, y, color, velocityX, velocityY, size, lifespan) {
        if (this.particles.length >= this.maxParticles) return;
        
        this.particles.push({
            x, y, color, size,
            vx: velocityX,
            vy: velocityY,
            age: 0,
            lifespan
        });
    }
    
    addExplosion(x, y, type) {
        const count = type === 'boss' ? 40 : 20;
        const color = type === 'boss' ? '#f00' : type === 'advanced' ? '#f0f' : '#f88';
        const size = type === 'boss' ? 3 : 2;
        const lifespan = type === 'boss' ? 60 : 40;
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 2;
            this.addParticle(
                x, y, color,
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                size, lifespan
            );
        }
        
        // Add screen shake for larger explosions
        if (type === 'boss') {
            this.addScreenShake(8, 0.5);
        }
    }
    
    addPowerupCollect(x, y, color) {
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 3;
            this.addParticle(
                x, y, color,
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                2, 50
            );
        }
    }
    
    addScreenShake(intensity, duration) {
        this.screenShake.start(intensity, duration);
    }
    
    update(deltaMultiplier) {
        this.particles = this.particles.filter(p => {
            p.x += p.vx * deltaMultiplier;
            p.y += p.vy * deltaMultiplier;
            p.age += deltaMultiplier;
            return p.age < p.lifespan;
        });
    }
    
    draw(ctx) {
        this.particles.forEach(p => {
            const alpha = 1 - (p.age / p.lifespan);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.globalAlpha = 1;
    }
    
    clear() {
        this.particles = [];
    }
    
    drawStarfield(ctx) {
        const now = Date.now() / 10000;
        
        // Draw animated stars in background
        for (let i = 0; i < 100; i++) {
            const x = (i * 17 + Math.sin(now + i * 0.5) * 5) % GAME_CONFIG.width;
            const y = (i * 13 + Math.cos(now + i * 0.3) * 5) % GAME_CONFIG.height;
            const size = (Math.sin(now * 2 + i) + 1) * 1.5 + 0.5;
            const brightness = 0.6 + Math.sin(now * 3 + i * 2) * 0.4;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Optimize object pool for better memory management
class ObjectPool {
    constructor(objectType, initialSize = 20) {
        this.objectType = objectType;
        this.pool = [];
        this.activeObjects = new Set(); // Track active objects
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
        this.activeObjects.add(object); // Track object as active
        return object;
    }
    
    release(object) {
        this.activeObjects.delete(object); // Remove from active tracking
        this.pool.push(object);
    }
    
    // New method to release all objects (useful for cleanup)
    releaseAll() {
        this.activeObjects.forEach(obj => this.pool.push(obj));
        this.activeObjects.clear();
    }
}

// Optimize game class with performance improvements
class Game {
    constructor() {
        // Cache DOM elements for better performance
        this.domCache = {
            canvas: document.getElementById('gameCanvas'),
            gameContainer: document.getElementById('game-container'),
            fps: document.getElementById('fps'),
            score: document.getElementById('score'),
            lives: document.getElementById('lives'),
            startButton: document.getElementById('start-button'),
            muteButton: document.getElementById('mute-button'),
            restartButton: document.getElementById('restart-button')
        };

        this.canvas = this.domCache.canvas;
        this.ctx = this.canvas.getContext('2d', { 
            alpha: false, // Optimization: disable alpha for better performance
            desynchronized: true // Reduce latency if supported
        });
        
        // Initialize particle system before using it (this was missing)
        this.particleSystem = new ParticleSystem();
        
        // Create spatial grid for collision detection optimization
        this.spatialGrid = new SpatialGrid(GAME_CONFIG.width, GAME_CONFIG.height, 80);
        
        // Use layered canvases for better performance
        this.setupLayeredCanvas();
        
        // Pre-render common game elements
        this.preRenderGameElements();
        
        // Create adaptive quality settings
        this.qualitySettings = this.detectOptimalQuality();
        
        // Throttle frame-intensive functions
        this.updateFPS = this.throttle(this.updateFPS.bind(this), 500);
        
        // Set up performance monitor
        this.setupPerformanceMonitor();
        
        // ...remaining constructor code...
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

        // Add a flag to track level transitions
        this.isTransitioningLevel = false;

        // Add performance monitoring
        this.lastFpsUpdate = 0;
        this.framesThisSecond = 0;
        
        // Prevent zombie intervals/timeouts
        this.activeTimeouts = new Set();

        // Add touch control properties
        this.touchStartX = 0;
        this.touchStartTime = 0;
        this.playerVelocity = 0;
        this.maxVelocity = 15;
        this.velocityDecay = 0.95;
        this.swipeThreshold = 5; // Minimum swipe distance to trigger movement

        // Optimize touch control properties
        this.touch = {
            startX: 0,
            startTime: 0,
            lastX: 0,
            lastTime: 0,
            velocity: 0,
            maxVelocity: 20,
            velocityDecay: 0.92,
            minSwipeDistance: 5,
            isTouching: false
        };

        // Initialize the game but defer enemy creation until after method definitions
        this.init();
    }
    
    setupLayeredCanvas() {
        // Create separate canvases for different layers
        this.backgroundCanvas = document.createElement('canvas');
        this.backgroundCanvas.width = GAME_CONFIG.width;
        this.backgroundCanvas.height = GAME_CONFIG.height;
        this.bgCtx = this.backgroundCanvas.getContext('2d', { alpha: false });
        
        // Pre-render common game elements for reuse
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = GAME_CONFIG.width;
        this.offscreenCanvas.height = GAME_CONFIG.height;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    }
    
    preRenderGameElements() {
        // Pre-render player ship for reuse
        this.playerShipCanvas = document.createElement('canvas');
        this.playerShipCanvas.width = PLAYER_WIDTH * 1.5;
        this.playerShipCanvas.height = PLAYER_HEIGHT * 1.5;
        const shipCtx = this.playerShipCanvas.getContext('2d');
        
        // Draw player ship on offscreen canvas
        shipCtx.fillStyle = '#0f0';
        shipCtx.beginPath();
        shipCtx.moveTo(PLAYER_WIDTH/2, 0);
        shipCtx.lineTo(PLAYER_WIDTH, PLAYER_HEIGHT);
        shipCtx.lineTo(0, PLAYER_HEIGHT);
        shipCtx.closePath();
        shipCtx.fill();
        
        // Draw cockpit
        shipCtx.fillStyle = '#00f';
        shipCtx.beginPath();
        shipCtx.arc(PLAYER_WIDTH/2, PLAYER_HEIGHT * 0.4, PLAYER_WIDTH * 0.15, 0, Math.PI * 2);
        shipCtx.fill();
        
        // Similar pre-renders for enemy types, bullets, etc.
        // ...
    }
    
    // Optimize collision detection with spatial partitioning
    checkCollisions() {
        const playerBullets = this.player.bullets;
        const enemies = [...this.entities].filter(e => e instanceof Enemy);
        
        // Check if all enemies are destroyed
        if (enemies.length === 0 && !this.isTransitioningLevel) {
            console.log("Level complete!");
            this.isTransitioningLevel = true;
            
            // Important: Need to clean up any remaining player bullets
            playerBullets.forEach(bullet => this.bulletPool.release(bullet));
            this.player.bullets = [];
            
            console.log("Current level:", this.state.level, "Max level:", this.state.maxLevel);
            
            // Check if this was the final level
            if (this.state.level >= this.state.maxLevel) {
                console.log("Triggering victory!");
                this.victory(); // Call victory directly for more reliable execution
            } else {
                console.log("Moving to next level");
                this.handleGameEvent('levelComplete');
            }
            return;
        }
        
        // Use spatial partitioning for collision detection
        this.spatialGrid.clear();
        
        // Insert entities into spatial grid
        enemies.forEach(enemy => this.spatialGrid.insert(enemy));
        playerBullets.forEach(bullet => this.spatialGrid.insert(bullet));
        
        // Check player bullets with potential collisions
        for (let i = playerBullets.length - 1; i >= 0; i--) {
            const bullet = playerBullets[i];
            
            // Check bonus ship collision
            if (this.bonusShip && this.checkCollision(bullet, this.bonusShip)) {
                this.bonusShip.hit();
                this.bulletPool.release(bullet);
                playerBullets.splice(i, 1);
                continue;
            }
            
            // Get potential collision candidates for this bullet
            const potentialCollisions = this.spatialGrid.getPotentialCollisions(bullet);
            let hitEnemy = false;
            
            // Check for actual collisions with candidates
            for (const entity of potentialCollisions) {
                if (entity instanceof Enemy && this.checkCollision(bullet, entity)) {
                    GameStats.shotsHit++;
                    GameStats.enemiesDestroyed++;
                    
                    this.handleGameEvent('enemyDestroyed', {
                        enemy: entity,
                        x: entity.x + entity.width/2,
                        y: entity.y + entity.height/2
                    });
                    
                    this.bulletPool.release(bullet);
                    playerBullets.splice(i, 1);
                    hitEnemy = true;
                    
                    // Potential powerup
                    if (Math.random() < 0.05) {
                        this.spawnPowerUpDrop(entity.x + entity.width/2, entity.y + entity.height/2);
                    }
                    break;
                }
            }
            
            if (hitEnemy) continue;
            
            // Handle bullet-bullet collisions and other logic
            // ...existing bullet collision code...
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

            // Track shots fired
            GameStats.shotsFired++;
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

        // Check collisions with power-up drops
        const powerUps = [...this.entities].filter(e => e instanceof PowerUpDrop);
        for (let i = powerUps.length - 1; i >= 0; i--) {
            const powerUp = powerUps[i];
            if (this.checkCollision(this.player, powerUp)) {
                powerUp.collect();
                this.entities.delete(powerUp);
            }
        }
    }
    
    // Throttle function for rate-limiting expensive operations
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // Optimize render method
    render() {
        // Skip rendering if game is not visible
        if (document.hidden) {
            requestAnimationFrame(this.gameLoop.bind(this));
            return;
        }
        
        // Clear the canvas completely before drawing anything new
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply screen shake if active
        let shakeX = 0, shakeY = 0;
        if (this.particleSystem.screenShake.active) {
            const {x, y} = this.particleSystem.screenShake.getOffset();
            shakeX = x;
            shakeY = y;
            this.ctx.translate(x, y);
        }
        
        // Handle specific game states
        if (this.state.gameState === GameState.MENU) {
            this.renderMenu();
            // Restore translation if needed
            if (shakeX !== 0 || shakeY !== 0) {
                this.ctx.translate(-shakeX, -shakeY);
            }
            return;
        }
        
        if (this.state.gameState === GameState.PAUSED) {
            this.renderPauseScreen();
            return;
        }
        
        // Draw the stars background for the playing state
        this.particleSystem.drawStarfield(this.ctx);
        
        // Draw player with blinking effect when invulnerable, but always use beautiful ship design
        if (!this.playerInvulnerable || Math.floor(Date.now() / 100) % 2) {
            // Always draw player with full details and gradient
            this.player.draw(this.ctx);
        }
        
        // Batch similar draw operations for better performance
        
        // Draw all bullets in one batch
        this.ctx.fillStyle = '#fff';
        this.player.bullets.forEach(bullet => {
            if (!bullet.enemyBullet) {
                bullet.draw(this.ctx);
            }
        });
        
        // Draw enemy bullets in one batch
        this.ctx.fillStyle = '#ff0';
        for (const entity of this.entities) {
            if (entity instanceof Enemy) {
                entity.bullets.forEach(bullet => bullet.draw(this.ctx));
            }
        }
        
        // Draw all enemies (batched by type if possible)
        this.entities.forEach(entity => {
            if (entity instanceof Enemy) {
                entity.draw(this.ctx);
            } else if (!(entity instanceof Player)) {
                entity.draw(this.ctx);
            }
        });
        
        // Draw bonus ship if active
        if (this.bonusShip) {
            this.bonusShip.draw(this.ctx);
        }
        
        // Draw explosions and particles with batching
        if (this.explosions.length > 0 || this.particleSystem.particles.length > 0) {
            // Sort particles by color for batch rendering
            const particlesByColor = {};
            
            this.particleSystem.particles.forEach(p => {
                if (!particlesByColor[p.color]) {
                    particlesByColor[p.color] = [];
                }
                particlesByColor[p.color].push(p);
            });
            
            // Draw particles in batches by color
            Object.entries(particlesByColor).forEach(([color, particles]) => {
                this.ctx.fillStyle = color;
                particles.forEach(p => {
                    this.ctx.globalAlpha = 1 - (p.age / p.lifespan);
                    this.ctx.beginPath();
                    this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    this.ctx.fill();
                });
            });
            
            // Reset global alpha
            this.ctx.globalAlpha = 1;
            
            // Draw explosions
            this.explosions.forEach(explosion => explosion.draw(this.ctx));
        }
        
        // Restore any transformations
        if (shakeX !== 0 || shakeY !== 0) {
            this.ctx.translate(-shakeX, -shakeY);
        }
    }
    
    // Optimize game loop with better time management
    gameLoop(timestamp) {
        if (!this.state.isRunning) return;
        
        // Calculate frame delta and cap it
        const deltaTime = Math.min(timestamp - this.lastTime, 100);
        this.lastTime = timestamp;
        
        // Skip updates if tab is not visible (battery saving)
        if (!document.hidden) {
            this.accumulator += deltaTime;
            
            // Process fixed time step updates
            let updateCount = 0;
            const MAX_UPDATES = 5;
            
            while (this.accumulator >= this.timeStep && updateCount < MAX_UPDATES) {
                this.update(this.timeStep);
                this.accumulator -= this.timeStep;
                updateCount++;
            }
            
            // Reset accumulator if too much time passed
            if (updateCount >= MAX_UPDATES) {
                this.accumulator = 0;
            }
            
            // Render the frame
            this.render();
            this.framesThisSecond++;
        }
        
        // Continue the loop
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    // Detect optimal quality settings based on device capabilities
    detectOptimalQuality() {
        const isPowerfulDevice = (() => {
            // Check for high-end device indicators
            const hasHighEndGPU = (
                window.navigator.userAgent.indexOf('Chrome') > -1 &&
                window.navigator.hardwareConcurrency > 4
            );
            const isHighDensityScreen = window.devicePixelRatio > 1;
            const isLargeScreen = window.screen.width > 1024;
            
            return hasHighEndGPU && isHighDensityScreen && isLargeScreen;
        })();
        
        return {
            maxParticles: isPowerfulDevice ? 500 : 200,
            useShaders: isPowerfulDevice,
            drawShadows: isPowerfulDevice,
            particleDetail: isPowerfulDevice ? 'high' : 'low'
        };
    }
    
    // Set up a performance monitor
    setupPerformanceMonitor() {
        if (!window.performance || !window.performance.memory) return;
        
        this.performanceStats = {
            lastCheck: performance.now(),
            frameTime: 0,
            memoryUsed: 0,
            frameTimeHistory: []
        };
        
        // Sample performance data periodically
        setInterval(() => {
            const now = performance.now();
            const frameTime = now - this.performanceStats.lastCheck;
            this.performanceStats.lastCheck = now;
            
            this.performanceStats.frameTime = frameTime;
            this.performanceStats.frameTimeHistory.push(frameTime);
            
            // Limit history array size
            if (this.performanceStats.frameTimeHistory.length > 60) {
                this.performanceStats.frameTimeHistory.shift();
            }
            
            // Calculate average frame time
            const avgFrameTime = this.performanceStats.frameTimeHistory.reduce((a, b) => a + b, 0) / 
                this.performanceStats.frameTimeHistory.length;
            
            // Memory usage (only in Chrome)
            if (window.performance.memory) {
                this.performanceStats.memoryUsed = window.performance.memory.usedJSHeapSize / (1024 * 1024);
            }
            
            // Automatically adjust quality if performance is poor
            if (avgFrameTime > 33) { // Less than 30 FPS
                this.qualitySettings.maxParticles = Math.max(50, this.qualitySettings.maxParticles - 50);
                this.qualitySettings.drawShadows = false;
            }
            
        }, 1000);
    }
    
    // Additional optimized methods...
    // ...
    init() {
        this.setupCanvas();
        this.bindEvents();
        this.player = new Player();
        this.entities = new Set();
        this.entities.add(this.player); // Add player to entities
        this.prepareBackgroundStars();
        this.bindKeys();
        this.bindSwipeControls();
        this.bindMenuControls(); // Add this line
        this.bindTouchControls(); // Add this line to enable mobile controls
        this.lastTimeUpdate = Date.now(); // Initialize this value
        
        this.createInitialEnemies();
    }

    setupLayeredCanvas() {
        // Create separate canvases for different layers
        this.backgroundCanvas = document.createElement('canvas');
        this.backgroundCanvas.width = GAME_CONFIG.width;
        this.backgroundCanvas.height = GAME_CONFIG.height;
        this.bgCtx = this.backgroundCanvas.getContext('2d', { alpha: false });
        
        // Pre-render common game elements for reuse
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = GAME_CONFIG.width;
        this.offscreenCanvas.height = GAME_CONFIG.height;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    }

    bindMenuControls() {
        const startBtn = document.getElementById('start-button');
        const muteBtn = document.getElementById('mute-button');
        const restartBtn = document.getElementById('restart-button');
        
        if (startBtn) {
            ['touchstart', 'click'].forEach(eventType => {
                startBtn.addEventListener(eventType, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.initAudio();
                    
                    if (this.state.gameState === GameState.MENU || 
                        this.state.gameState === GameState.GAME_OVER) {
                        this.startGame();
                        startBtn.classList.add('hidden');
                        restartBtn.classList.remove('hidden');
                    }
                });
            });
        }

        if (muteBtn) {
            ['touchstart', 'click'].forEach(eventType => {
                muteBtn.addEventListener(eventType, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.initAudio();
                    this.soundManager.toggleMute();
                    muteBtn.textContent = this.soundManager.isMuted ? "UNMUTE" : "MUTE";
                });
            });
        }

        if (restartBtn) {
            ['touchstart', 'click'].forEach(eventType => {
                restartBtn.addEventListener(eventType, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.initAudio();
                    
                    if (this.state.gameState === GameState.GAME_OVER) {
                        this.startGame();
                    }
                });
            });
        }
    }

    // Add touch controls bindings
    bindTouchControls() {
        // Mobile control buttons
        const leftBtn = document.getElementById('left-button');
        const rightBtn = document.getElementById('right-button');
        const shootBtn = document.getElementById('shoot-button');
        const startBtn = document.getElementById('start-button');
        const muteBtn = document.getElementById('mute-button');
        const restartBtn = document.getElementById('restart-button');
        
        // Set up touch event listeners with continuous movement
        if (leftBtn && rightBtn && shootBtn) {
            let moveInterval;
            let direction = 0;
            
            // Left button: continuous movement while pressed
            leftBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.initAudio();
                direction = -1;
                
                // Clear any existing interval
                clearInterval(moveInterval);
                
                // Move once immediately
                if (this.state.gameState === GameState.PLAYING) {
                    this.player.move(direction);
                }
                
                // Then set up interval for continuous movement
                moveInterval = setInterval(() => {
                    if (this.state.gameState === GameState.PLAYING) {
                        this.player.move(direction);
                    }
                }, 16);
            });
            
            // Right button: continuous movement while pressed
            rightBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.initAudio();
                direction = 1;
                
                // Clear any existing interval
                clearInterval(moveInterval);
                
                // Move once immediately
                if (this.state.gameState === GameState.PLAYING) {
                    this.player.move(direction);
                }
                
                // Then set up interval for continuous movement
                moveInterval = setInterval(() => {
                    if (this.state.gameState === GameState.PLAYING) {
                        this.player.move(direction);
                    }
                }, 16);
            });
            
            // Stop movement when touch ends
            const stopMoving = (e) => {
                e.preventDefault();
                clearInterval(moveInterval);
            };
            
            leftBtn.addEventListener('touchend', stopMoving);
            rightBtn.addEventListener('touchend', stopMoving);
            leftBtn.addEventListener('touchcancel', stopMoving);
            rightBtn.addEventListener('touchcancel', stopMoving);
            
            // Fire button
            shootBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.initAudio();
                if (this.state.gameState === GameState.PLAYING) {
                    this.player.shoot();
                }
            });
        }
        
        // Menu control buttons
        if (startBtn) {
            startBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.initAudio();
                
                if (this.state.gameState === GameState.MENU || this.state.gameState === GameState.GAME_OVER) {
                    this.startGame();
                    // Update UI for in-game
                    startBtn.classList.add('hidden');
                    restartBtn.classList.remove('hidden');
                }
            });
        }
        
        if (muteBtn) {
            muteBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.initAudio();
                this.soundManager.toggleMute();
                muteBtn.textContent = this.soundManager.isMuted ? "UNMUTE" : "MUTE";
            });
        }
        
        if (restartBtn) {
            restartBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.initAudio();
                
                if (this.state.gameState === GameState.GAME_OVER) {
                    this.startGame();
                }
            });
        }
    }

    // Add this method to safely call initEnemies after all methods are defined
    createInitialEnemies() {
        // This ensures we don't try to call methods that aren't defined yet
        setTimeout(() => this.initEnemies(), 0);
    }

    initEnemies() {
        // Add safety check to prevent accessing non-existent levels
        if (this.state.level < 1 || this.state.level > GAME_CONFIG.levels.length) {
            console.error(`Invalid level index: ${this.state.level}`);
            // Default to first level if the requested level doesn't exist
            this.state.level = Math.min(Math.max(1, this.state.level), GAME_CONFIG.levels.length);
        }

        const currentLevel = GAME_CONFIG.levels[this.state.level - 1];
        const rows = currentLevel.enemyRows;
        const cols = 8;
        
        // Clear any existing enemies (just in case)
        [...this.entities].forEach(entity => {
            if (entity instanceof Enemy) {
                this.entities.delete(entity);
            }
        });
        
        // Add new enemies
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const enemy = new Enemy(
                    j * (ENEMY_WIDTH + 20) + 50,
                    i * (ENEMY_HEIGHT + 20) + 50,
                    currentLevel.enemyType
                );
                
                // Use current level speed
                enemy.speed = currentLevel.enemySpeed;
                
                this.entities.add(enemy);
            }
        }
    }

    setupCanvas() {
        const isMobile = window.innerWidth <= 768 || !window.matchMedia('(hover: hover)').matches;
        const { width, height, scale } = GAME_CONFIG;
        
        // Calculate available height considering menu controls on mobile
        const availableHeight = isMobile ? 
            window.innerHeight - 100 : // 100px for controls
            window.innerHeight;
        
        // Calculate scale while maintaining aspect ratio
        const screenRatio = window.innerWidth / availableHeight;
        const gameRatio = width / height;
        
        let finalScale = scale;
        let finalWidth = width;
        let finalHeight = height;
        
        if (screenRatio < gameRatio) {
            // Width limited
            finalWidth = window.innerWidth;
            finalHeight = finalWidth / gameRatio;
        } else {
            // Height limited
            finalHeight = availableHeight;
            finalWidth = finalHeight * gameRatio;
        }
        
        // Set canvas size
        this.canvas.width = width * scale;
        this.canvas.height = height * scale;
        this.canvas.style.width = `${finalWidth}px`;
        this.canvas.style.height = `${finalHeight}px`;
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
        this.initAudio();
        
        // If we're using explicit touch controls, don't need this generic handler
        if (window.innerWidth <= 768 || !window.matchMedia('(hover: hover)').matches) {
            return;
        }
        
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
        
        // Update game timer for statistics
        const now = Date.now();
        if (now - this.lastTimeUpdate >= 1000) {
            GameStats.timePlayed += Math.floor((now - this.lastTimeUpdate) / 1000);
            this.lastTimeUpdate = now;
        }
        
        // Calculate frame rate compensation multiplier
        this.deltaMultiplier = Math.min(Math.max(deltaTime / (1000/60), 0.5), 2.0);
        
        // Update particle effects
        this.particleSystem.update(this.deltaMultiplier);
        
        // Update player invulnerability
        if (this.playerInvulnerable) {
            this.playerInvulnerableTime += deltaTime;
            if (this.playerInvulnerableTime >= this.playerInvulnerableDuration) {
                this.playerInvulnerable = false;
            }
        }
        
        // Optimize explosion updates by using for loop instead of filter
        const remainingExplosions = [];
        for (let i = 0; i < this.explosions.length; i++) {
            const explosion = this.explosions[i];
            const active = explosion.update();
            if (active) {
                remainingExplosions.push(explosion);
            } else {
                this.explosionPool.release(explosion);
            }
        }
        this.explosions = remainingExplosions;

        // Update player first
        this.player.update(deltaTime);
        
        // Apply player velocity with momentum
        if (this.playerVelocity !== 0) {
            this.player.move(this.playerVelocity * this.deltaMultiplier);
            this.playerVelocity *= this.velocityDecay;
            
            // Stop very small movements
            if (Math.abs(this.playerVelocity) < 0.1) {
                this.playerVelocity = 0;
            }
        }
        
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

        // Update player movement with momentum
        if (this.touch.velocity !== 0) {
            this.player.move(this.touch.velocity * this.deltaMultiplier);
            
            // Apply velocity decay only when not touching
            if (!this.touch.isTouching) {
                this.touch.velocity *= this.touch.velocityDecay;
                
                // Stop very small movements
                if (Math.abs(this.touch.velocity) < 0.1) {
                    this.touch.velocity = 0;
                }
            }
        }

        // Update player speed boost if active
        if (this.player.speedBoost && now > this.player.speedBoostEndTime) {
            this.player.speedBoost = false;
            this.player.speed = 5; // Reset to default speed
        }
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
                
                // Increase speed as enemies move down
                enemy.speed += 0.1;
                
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
        this.framesThisSecond++;
        
        const now = performance.now();
        if (now - this.lastFpsUpdate >= 1000) { // Update once per second
            const fps = this.framesThisSecond;
            document.getElementById('fps').textContent = `FPS: ${fps}`;
            
            this.framesThisSecond = 0;
            this.lastFpsUpdate = now;
        }
    }

    start() {
        this.state.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    stop() {
        this.state.isRunning = false;
        
        // Cleanup all resources
        clearInterval(this.playerMovementInterval);
        this.clearAllTimeouts();
        
        // Make sure any bonus ship is removed
        this.bonusShip = null;
    }

    startGame() {
        console.log("startGame called");
        
        // Clear any pending timeouts first
        this.clearAllTimeouts();
        
        // Reset state
        this.state.gameState = GameState.PLAYING;
        this.state.score = 0;
        this.state.lives = 3;
        this.state.level = 1;
        this.isTransitioningLevel = false;
        
        // Update UI
        this.updateScore();
        this.updateLives();
        
        // Clear explosion array
        this.explosions.forEach(explosion => this.explosionPool.release(explosion));
        this.explosions = [];
        
        // Reset entities and initialize
        this.entities = new Set();
        this.player = new Player();
        this.entities.add(this.player);
        this.initEnemies();
        
        // Update menu visibility
        const startBtn = document.getElementById('start-button');
        const restartBtn = document.getElementById('restart-button');
        
        if (startBtn) startBtn.classList.add('hidden');
        if (restartBtn) restartBtn.classList.remove('hidden');
        
        // Reset game statistics
        GameStats.reset();
        this.lastTimeUpdate = Date.now();
        
        // Clear particles and refresh background
        this.particleSystem.clear();
        this.prepareBackgroundStars();
        
        // Start the game loop again
        this.state.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.gameLoop.bind(this));
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
        
        // Double check we're not exceeding max level
        if (this.state.level > this.state.maxLevel) {
            this.victory();
            return;
        }
        
        // Show a level transition message
        const levelMessage = document.createElement('div');
        levelMessage.className = 'level-message';
        levelMessage.innerHTML = `PREPARE FOR LEVEL ${this.state.level}`;
        document.getElementById('game-container').appendChild(levelMessage);
        
        // Clear all entities except player
        this.cleanupEntities();
        
        // Initialize next level after a delay
        this.setTrackedTimeout(() => {
            // Remove the level message
            levelMessage.classList.add('fade-out');
            this.setTrackedTimeout(() => levelMessage.remove(), 1000);
            
            // Make sure we're still playing
            if (this.state.gameState === GameState.PLAYING) {
                this.initEnemies();
                this.isTransitioningLevel = false; // Reset transition flag
            }
        }, 3000);
    }

    victory() {
        console.log("Victory method called");
        
        // Cancel any pending level transition first
        this.isTransitioningLevel = false;
        
        // Stop the game loop but don't prevent all interaction
        this.state.isRunning = false;
        
        // Clean up any remaining entities and effects
        this.cleanupEntities();
        this.bonusShip = null;
        
        // Save high score and check ranking
        const scoreRank = this.saveHighScore(this.state.score);
        
        // Clear any existing messages
        const existingMessages = document.querySelectorAll('.level-message, .bonus-message');
        existingMessages.forEach(msg => msg.remove());
        
        // Create victory effects first so they start appearing immediately
        this.createVictoryExplosions();
        
        // Show victory screen - ensure canvas is properly cleared first
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);
        
        // Draw congratulations text with glow effect
        this.ctx.shadowColor = '#0f0';
        this.ctx.shadowBlur = 15;
        this.ctx.fillStyle = '#0f0';
        this.ctx.font = 'bold 60px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('VICTORY!', GAME_CONFIG.width/2, GAME_CONFIG.height/3 - 40);
        
        // Reset shadow for other text
        this.ctx.shadowBlur = 0;
        
        this.ctx.font = '30px Arial';
        this.ctx.fillText('Earth is saved from the aliens!', GAME_CONFIG.width/2, GAME_CONFIG.height/3 + 20);
        
        // Show high score achievement
        if (scoreRank <= 5) {
            this.ctx.fillStyle = '#ff0';
            this.ctx.fillText(`NEW HIGH SCORE: RANK #${scoreRank}!`, GAME_CONFIG.width/2, GAME_CONFIG.height/3 + 60);
        }
        
        // Show enhanced game statistics
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`Levels Completed: ${this.state.maxLevel}`, GAME_CONFIG.width/2, GAME_CONFIG.height/2);
        this.ctx.fillText(`Final Score: ${this.state.score}`, GAME_CONFIG.width/2, GAME_CONFIG.height/2 + 40);
        this.ctx.fillText(`Enemies Destroyed: ${GameStats.enemiesDestroyed}`, GAME_CONFIG.width/2, GAME_CONFIG.height/2 + 80);
        this.ctx.fillText(`Accuracy: ${GameStats.getAccuracy()}%`, GAME_CONFIG.width/2, GAME_CONFIG.height/2 + 120);
        this.ctx.fillText(`Time Played: ${this.formatTime(GameStats.timePlayed)}`, GAME_CONFIG.width/2, GAME_CONFIG.height/2 + 160);

        // Set up a rendering loop to keep drawing explosions during victory screen
        const victoryRenderLoop = () => {
            // Only draw background and explosions, keeping text visible
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; // Semi-transparent to create trails
            this.ctx.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);
            
            // Draw explosions and particles
            for (let i = 0; i < this.explosions.length; i++) {
                this.explosions[i].update();
                this.explosions[i].draw(this.ctx);
            }
            
            // Continue render loop if explosions are still present
            if (this.explosions.length > 0) {
                requestAnimationFrame(victoryRenderLoop);
            }
        };
        
        // Start the victory render loop
        requestAnimationFrame(victoryRenderLoop);
        
        // Important: Update the DOM elements before continuing
        setTimeout(() => {
            // Update UI visibility for all device types
            const startBtn = document.getElementById('start-button');
            const restartBtn = document.getElementById('restart-button');
            const muteBtn = document.getElementById('mute-button');
            
            // Make sure buttons are properly visible/hidden
            if (startBtn) {
                startBtn.classList.add('hidden');
                console.log("Start button hidden");
            }
            
            if (restartBtn) {
                restartBtn.classList.remove('hidden');
                console.log("Restart button shown");
                
                // Re-bind the event listener to ensure it works
                restartBtn.onclick = () => {
                    console.log("Restart button clicked");
                    this.startGame();
                };
            }
            
            // Show device-appropriate restart instructions
            if (window.innerWidth <= 768 || !window.matchMedia('(hover: hover)').matches) {
                this.ctx.font = '24px Arial';
                this.ctx.fillStyle = '#fff';
                this.ctx.fillText('Tap RESTART to play again', GAME_CONFIG.width/2, GAME_CONFIG.height * 0.65);
            } else {
                this.ctx.font = '24px Arial';
                this.ctx.fillStyle = '#fff';
                this.ctx.fillText('Press ENTER to play again', GAME_CONFIG.width/2, GAME_CONFIG.height * 0.65);
            }
            
            // Setup event listener for keyboard restart
            const restartHandler = (e) => {
                if (e.key === 'Enter') {
                    console.log("Enter key pressed for restart");
                    window.removeEventListener('keydown', restartHandler);
                    this.startGame();
                }
            };
            
            window.addEventListener('keydown', restartHandler);
            
        }, 500); // Small delay to ensure DOM updates properly
    }
    
    // Add a celebratory effect for victory
    createVictoryExplosions() {
        console.log("Creating victory explosions"); // Debug log
        // Create multiple colorful explosions at random positions
        const colors = ['#0f0', '#00f', '#f0f', '#ff0', '#0ff'];
        
        const createRandomExplosion = (index) => {
            this.setTrackedTimeout(() => {
                const x = Math.random() * GAME_CONFIG.width;
                const y = Math.random() * (GAME_CONFIG.height * 0.7);
                const color = colors[Math.floor(Math.random() * colors.length)];
                
                this.explosions.push(
                    this.explosionPool.get({
                        x, y, color,
                        size: 20 + Math.random() * 40
                    })
                );
                console.log(`Explosion ${index} created at (${x}, ${y}) with color ${color}`); // Debug log
                
                if (index < 20) { // Create 20 explosions
                    createRandomExplosion(index + 1);
                }
            }, 200 + Math.random() * 300); // Random delay between explosions
        };
        
        createRandomExplosion(0);
    }

    // Optimize handling of game events
    handleGameEvent(eventType, data = {}) {
        switch(eventType) {
            case 'playerHit':
                // Add screen shake effect
                this.particleSystem.addScreenShake(10, 0.3);
                
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
                // Add particle effects for enemy explosions
                this.particleSystem.addExplosion(data.x, data.y, data.enemy.type);
                
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
                
            case 'gameVictory':
                this.victory();
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
        this.setTrackedTimeout(() => {
            messageEl.classList.add('fade-out');
            this.setTrackedTimeout(() => messageEl.remove(), 1000);
        }, 2000);
    }

    /**
     * Updates the lives display in the DOM
     */
    updateLives() {
        document.getElementById('lives').textContent = `Lives: ${this.state.lives}`;
    }

    /**
     * Updates the score display in the DOM
     */
    updateScore() {
        document.getElementById('score').textContent = `Score: ${this.state.score}`;
    }

    renderMenu() {
        // Draw animated stars instead of static background
        this.particleSystem.drawStarfield(this.ctx);
        
        // Add animated title with pulsing effect
        const pulseAmount = Math.sin(Date.now() / 500) * 0.1 + 1;
        
        this.ctx.shadowColor = '#0f0';
        this.ctx.shadowBlur = 15;
        this.ctx.fillStyle = '#0f0';
        this.ctx.font = 'bold 60px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.save();
        this.ctx.translate(GAME_CONFIG.width/2, GAME_CONFIG.height/4);
        this.ctx.scale(pulseAmount, pulseAmount);
        this.ctx.fillText('SPACE INVADERS', 0, 0);
        this.ctx.restore();
        
        // Draw high scores
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('HIGH SCORES', GAME_CONFIG.width/2, GAME_CONFIG.height/2 + 70);
        
        let yPos = GAME_CONFIG.height/2 + 110;
        if (GAME_CONFIG.highScores.length === 0) {
            this.ctx.fillText('No scores yet!', GAME_CONFIG.width/2, yPos);
        } else {
            GAME_CONFIG.highScores.slice(0, 5).forEach((score, index) => {
                this.ctx.fillText(`${index + 1}. ${score.score} pts - ${score.date}`, GAME_CONFIG.width/2, yPos);
                yPos += 30;
            });
        }
        
        // Draw device-specific instructions
        this.ctx.font = '20px Arial';
        if (window.innerWidth <= 768 || !window.matchMedia('(hover: hover)').matches) {
            this.ctx.fillText('Slide to move, tap to shoot', GAME_CONFIG.width/2, GAME_CONFIG.height * 0.9);
        } else {
            this.ctx.fillText('Press ENTER to start', GAME_CONFIG.width/2, GAME_CONFIG.height * 0.9);
            this.ctx.font = '16px Arial';
            this.ctx.fillText('Controls: Arrows to move, Space to shoot', GAME_CONFIG.width/2, GAME_CONFIG.height * 0.95);
            this.ctx.fillText('P to pause, M to mute', GAME_CONFIG.width/2, GAME_CONFIG.height * 0.98);
        }
        
        // Update menu button visibility
        document.getElementById('start-button').classList.remove('hidden');
        document.getElementById('restart-button').classList.add('hidden');
        
        // Draw player ship with gradients as seen in-game
        const shipX = GAME_CONFIG.width/2;
        const shipY = GAME_CONFIG.height * 0.85;
        const width = PLAYER_WIDTH * 1.5;
        const height = PLAYER_HEIGHT * 1.5;
        
        // Draw thrust flame animation
        const thrustSize = Math.sin(Date.now() / 100) * 5 + 10;
        this.ctx.fillStyle = '#f80';
        this.ctx.beginPath();
        this.ctx.moveTo(shipX, shipY + height * 0.4);
        this.ctx.lineTo(shipX - 8, shipY + height * 0.4 + thrustSize);
        this.ctx.lineTo(shipX + 8, shipY + height * 0.4 + thrustSize);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Draw spaceship body with gradient - same as in-game ship
        const gradient = this.ctx.createLinearGradient(shipX - width/2, shipY - height/2, shipX - width/2, shipY + height/2);
        gradient.addColorStop(0, '#0f0');
        gradient.addColorStop(1, '#080');
        this.ctx.fillStyle = gradient;
        
        this.ctx.beginPath();
        this.ctx.moveTo(shipX, shipY - height/2);
        this.ctx.lineTo(shipX + width/2, shipY + height/2);
        this.ctx.lineTo(shipX + width * 0.3, shipY + height * 0.3);
        this.ctx.lineTo(shipX + width * 0.1, shipY + height/2);
        this.ctx.lineTo(shipX - width * 0.1, shipY + height/2);
        this.ctx.lineTo(shipX - width * 0.3, shipY + height * 0.3);
        this.ctx.lineTo(shipX - width/2, shipY + height/2);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Draw cockpit with gradient
        const cockpitGradient = this.ctx.createRadialGradient(
            shipX, shipY - height * 0.1, 0, 
            shipX, shipY - height * 0.1, width * 0.15
        );
        cockpitGradient.addColorStop(0, '#00f');
        cockpitGradient.addColorStop(1, '#004');
        this.ctx.fillStyle = cockpitGradient;
        this.ctx.beginPath();
        this.ctx.arc(shipX, shipY - height * 0.1, width * 0.15, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Display alien types
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('ENEMY TYPES', GAME_CONFIG.width/2, GAME_CONFIG.height/2 - 80);
        
        // Create temporary enemies to show their designs
        const tempEnemyWidth = 40;
        const tempEnemyHeight = 30;
        const centerX = GAME_CONFIG.width/2;
        const enemyY = GAME_CONFIG.height/2 - 40;
        const spacing = 120;
        
        // Draw Level 1 Enemy (Basic)
        // Green alien with oval head
        const x1 = centerX - spacing;
        const y1 = enemyY;
        
        const headGradient = this.ctx.createLinearGradient(x1, y1, x1, y1 + tempEnemyHeight);
        headGradient.addColorStop(0, '#5f0');
        headGradient.addColorStop(1, '#080');
        this.ctx.fillStyle = headGradient;
        
        this.ctx.beginPath();
        this.ctx.ellipse(x1 + tempEnemyWidth/2, y1 + tempEnemyHeight/2, 
                    tempEnemyWidth * 0.4, tempEnemyHeight * 0.45, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Eyes
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.save();
        this.ctx.translate(x1 + tempEnemyWidth * 0.3, y1 + tempEnemyHeight * 0.4);
        this.ctx.scale(1, 0.6);
        this.ctx.arc(0, 0, tempEnemyWidth * 0.15, 0, Math.PI * 2);
        this.ctx.restore();
        
        this.ctx.save();
        this.ctx.translate(x1 + tempEnemyWidth * 0.7, y1 + tempEnemyHeight * 0.4);
        this.ctx.scale(1, 0.6);
        this.ctx.arc(0, 0, tempEnemyWidth * 0.15, 0, Math.PI * 2);
        this.ctx.restore();
        this.ctx.fill();
        
        // Draw Level 2 Enemy (Advanced/Purple)
        const x2 = centerX;
        const y2 = enemyY;
        
        this.ctx.fillStyle = '#f0f';
        this.ctx.beginPath();
        this.ctx.ellipse(x2 + tempEnemyWidth/2, y2 + tempEnemyHeight/2, 
                    tempEnemyWidth*0.45, tempEnemyHeight*0.4, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Eyes
        this.ctx.fillStyle = '#0ff';
        this.ctx.beginPath();
        this.ctx.arc(x2 + tempEnemyWidth*0.25, y2 + tempEnemyHeight*0.35, tempEnemyWidth*0.1, 0, Math.PI * 2);
        this.ctx.arc(x2 + tempEnemyWidth*0.5, y2 + tempEnemyHeight*0.3, tempEnemyWidth*0.12, 0, Math.PI * 2);
        this.ctx.arc(x2 + tempEnemyWidth*0.75, y2 + tempEnemyHeight*0.35, tempEnemyWidth*0.1, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw Level 3 Enemy (Boss/Red)
        const x3 = centerX + spacing;
        const y3 = enemyY;
        
        const bossGradient = this.ctx.createLinearGradient(x3, y3, x3, y3 + tempEnemyHeight);
        bossGradient.addColorStop(0, '#f55');
        bossGradient.addColorStop(0.5, '#900');
        bossGradient.addColorStop(1, '#600');
        
        this.ctx.fillStyle = bossGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(x3 + tempEnemyWidth * 0.5, y3 + tempEnemyHeight * 0.15);
        this.ctx.lineTo(x3 + tempEnemyWidth * 0.8, y3 + tempEnemyHeight * 0.3);
        this.ctx.lineTo(x3 + tempEnemyWidth * 0.9, y3 + tempEnemyHeight * 0.7);
        this.ctx.lineTo(x3 + tempEnemyWidth * 0.5, y3 + tempEnemyHeight * 0.9);
        this.ctx.lineTo(x3 + tempEnemyWidth * 0.1, y3 + tempEnemyHeight * 0.7);
        this.ctx.lineTo(x3 + tempEnemyWidth * 0.2, y3 + tempEnemyHeight * 0.3);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Eyes
        this.ctx.fillStyle = '#f00';
        this.ctx.beginPath();
        this.ctx.arc(x3 + tempEnemyWidth * 0.35, y3 + tempEnemyHeight * 0.3, tempEnemyWidth * 0.12, 0, Math.PI * 2);
        this.ctx.arc(x3 + tempEnemyWidth * 0.65, y3 + tempEnemyHeight * 0.3, tempEnemyWidth * 0.12, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Points text
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '14px Arial';
        this.ctx.fillText('10 pts', x1, y1 + 45);
        this.ctx.fillText('20 pts', x2, y2 + 45);
        this.ctx.fillText('30 pts', x3, y3 + 45);
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

    gameOver(reason = "Game Over") {
        // Cancel any pending level transition
        this.isTransitioningLevel = false;
        
        this.state.gameState = GameState.GAME_OVER;
        
        // Clear any level transition messages
        const existingMessages = document.querySelectorAll('.level-message');
        existingMessages.forEach(msg => msg.remove());
        
        // Show game over screen
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);
        
        this.ctx.fillStyle = '#f00';
        this.ctx.font = '40px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(reason, GAME_CONFIG.width/2, GAME_CONFIG.height/3);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Final Score: ${this.state.score}`, GAME_CONFIG.width/2, GAME_CONFIG.height/2);
        
        // Show different restart instructions based on device
        if (window.innerWidth <= 768 || !window.matchMedia('(hover: hover)').matches) {
            document.getElementById('restart-button').classList.remove('hidden');
            document.getElementById('start-button').classList.add('hidden');
        } else {
            this.ctx.fillText('Press ENTER to play again', GAME_CONFIG.width/2, GAME_CONFIG.height * 0.6);
        }
        
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

    // Replace setTimeout with tracked version
    setTrackedTimeout(callback, delay) {
        const timeoutId = setTimeout(() => {
            this.activeTimeouts.delete(timeoutId);
            callback();
        }, delay);
        
        this.activeTimeouts.add(timeoutId);
        return timeoutId;
    }
    
    // Clear all active timeouts
    clearAllTimeouts() {
        this.activeTimeouts.forEach(id => clearTimeout(id));
        this.activeTimeouts.clear();
    }

    // Add a new method to clean up entities between levels
    cleanupEntities() {
        // Keep only the player
        const player = [...this.entities].find(e => e instanceof Player);
        this.entities.clear();
        
        if (player) {
            this.entities.add(player);
        }
        
        // Clean up all bullet pools
        this.bulletPool.releaseAll();
    }

    bindSwipeControls() {
        if (!this.canvas) return;

        const touchStart = (e) => {
            e.preventDefault();
            this.initAudio();
            
            const touch = e.touches[0];
            this.touch.startX = touch.clientX;
            this.touch.lastX = touch.clientX;
            this.touch.startTime = Date.now();
            this.touch.lastTime = Date.now();
            this.touch.velocity = 0;
            this.touch.isTouching = true;
        };

        const touchMove = (e) => {
            if (!this.touch.isTouching || this.state.gameState !== GameState.PLAYING) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            const now = Date.now();
            const deltaTime = now - this.touch.lastTime;
            if (deltaTime === 0) return;

            const deltaX = touch.clientX - this.touch.lastX;
            
            // Calculate new velocity based on movement speed
            const newVelocity = (deltaX / deltaTime) * 2;
            
            // Smooth velocity transitions
            this.touch.velocity = 0.6 * this.touch.velocity + 0.4 * newVelocity;
            this.touch.velocity = Math.max(-this.touch.maxVelocity, 
                                        Math.min(this.touch.maxVelocity, this.touch.velocity));
            
            this.touch.lastX = touch.clientX;
            this.touch.lastTime = now;
        };

        const touchEnd = (e) => {
            e.preventDefault();
            
            // Check for tap (quick touch with minimal movement)
            const touchDuration = Date.now() - this.touch.startTime;
            const touch = e.changedTouches[0];
            const moveDistance = Math.abs(touch.clientX - this.touch.startX);
            
            if (touchDuration < 200 && moveDistance < 10) {
                if (this.state.gameState === GameState.PLAYING) {
                    this.player.shoot();
                }
            }
            
            this.touch.isTouching = false;
        };

        this.canvas.addEventListener('touchstart', touchStart, { passive: false });
        this.canvas.addEventListener('touchmove', touchMove, { passive: false });
        this.canvas.addEventListener('touchend', touchEnd, { passive: false });
    }

    // High score management
    loadHighScores() {
        const savedScores = localStorage.getItem('spaceInvadersHighScores');
        if (savedScores) {
            GAME_CONFIG.highScores = JSON.parse(savedScores);
        }
    }
    
    saveHighScore(score) {
        // Check if score qualifies for high scores
        const lowestScore = GAME_CONFIG.highScores.length >= 5 ? 
            GAME_CONFIG.highScores[GAME_CONFIG.highScores.length - 1].score : 0;
            
        const isHighScore = GAME_CONFIG.highScores.length < 5 || score > lowestScore;
            
        if (!isHighScore && GAME_CONFIG.highScores.length >= 5) {
            // Not a high score and we already have 5 scores
            return false;
        }
        
        GAME_CONFIG.highScores.push({
            score,
            date: new Date().toLocaleDateString(),
            level: this.state.level,
            accuracy: GameStats.getAccuracy()
        });
        
        // Sort and keep only top 5
        GAME_CONFIG.highScores.sort((a, b) => b.score - a.score);
        if (GAME_CONFIG.highScores.length > 5) {
            GAME_CONFIG.highScores = GAME_CONFIG.highScores.slice(0, 5);
        }
        
        // Save to localStorage
        localStorage.setItem('spaceInvadersHighScores', JSON.stringify(GAME_CONFIG.highScores));
        
        // Return rank (position in high scores)
        return GAME_CONFIG.highScores.findIndex(s => s.score === score) + 1;
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}m ${secs}s`;
    }

    // Spawn power-up drops from destroyed enemies
    spawnPowerUpDrop(x, y) {
        const powerUp = new PowerUpDrop(x, y);
        this.entities.add(powerUp);
    }
}

// Add the BonusShip class (single declaration)
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
        // We need to check which bonus type we got and ensure it's passed correctly
        const bonusType = this.bonusType;
        
        // Create explosion 
        window.gameInstance.explosions.push(
            window.gameInstance.explosionPool.get({
                x: this.x + this.width/2,
                y: this.y + this.height/2,
                color: '#fff',
                size: 40
            })
        );
        
        // Play sound first
        window.gameInstance.soundManager.playPowerupCollect();
        
        // Apply the bonus with a slight delay to ensure the game state is ready
        setTimeout(() => {
            if (window.gameInstance && window.gameInstance.player) {
                // Apply the bonus to the player
                if (bonusType === BonusType.EXTRA_LIFE) {
                    window.gameInstance.state.lives++;
                    window.gameInstance.updateLives();
                    // Show message
                    const messageEl = document.createElement('div');
                    messageEl.className = 'bonus-message';
                    messageEl.textContent = "EXTRA LIFE!";
                    document.getElementById('game-container').appendChild(messageEl);
                    setTimeout(() => {
                        messageEl.classList.add('fade-out');
                        setTimeout(() => messageEl.remove(), 1000);
                    }, 2000);
                } else if (bonusType === BonusType.SPEED_BOOST) {
                    window.gameInstance.player.speedBoost = true;
                    window.gameInstance.player.speed = 8;
                    window.gameInstance.player.speedBoostEndTime = Date.now() + GAME_CONFIG.bonusDuration;
                    // Show message
                    const messageEl = document.createElement('div');
                    messageEl.className = 'bonus-message';
                    messageEl.textContent = "SPEED BOOST!";
                    document.getElementById('game-container').appendChild(messageEl);
                    setTimeout(() => {
                        messageEl.classList.add('fade-out');
                        setTimeout(() => messageEl.remove(), 1000);
                    }, 2000);
                } else {
                    // Standard bonuses
                    window.gameInstance.player.applyBonus(bonusType);
                }
                
                // Log bonus application for debugging
                console.log("Applied bonus:", bonusType);
                
                // Update game stats
                GameStats.powerupsCollected++;
            }
        }, 10);
        
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

        // Add support for speed boost powerup
        this.speedBoost = false;
        this.speedBoostEndTime = 0;
    }
    
    draw(ctx) {
        // Change ship color based on active bonus
        ctx.fillStyle = this.hasBonus ? this._getBonusColor() : '#0f0';
        
        // Draw spaceship body with gradient
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        gradient.addColorStop(0, '#0f0');
        gradient.addColorStop(1, '#080');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x + this.width * 0.8, this.y + this.height * 0.8);
        ctx.lineTo(this.x + this.width * 0.6, this.y + this.height);
        ctx.lineTo(this.x + this.width * 0.4, this.y + this.height);
        ctx.lineTo(this.x + this.width * 0.2, this.y + this.height * 0.8);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.fill();

        // Draw cockpit with gradient
        const cockpitGradient = ctx.createRadialGradient(this.x + this.width / 2, this.y + this.height * 0.4, 0, this.x + this.width / 2, this.y + this.height * 0.4, this.width * 0.15);
        cockpitGradient.addColorStop(0, '#00f');
        cockpitGradient.addColorStop(1, '#004');
        ctx.fillStyle = cockpitGradient;
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
            // Track shots fired when shooting, not when checking collisions
            GameStats.shotsFired++;
            
            // Normal shot or multi-shot based on bonus
            if (this.hasBonus && this.bonusType === BonusType.MULTI_SHOT) {
                // Create 3 bullets for multi-shot - each counts as one shot
                GameStats.shotsFired += 2; // 2 additional shots
                
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
        const now = Date.now();
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

        // Check for bonus expiration
        if ((this.hasBonus && now > this.bonusEndTime) ||
            (this.speedBoost && now > this.speedBoostEndTime)) {
            
            if (this.hasBonus && now > this.bonusEndTime) {
                this.hasBonus = false;
                this.bonusType = null;
            }
            
            if (this.speedBoost && now > this.speedBoostEndTime) {
                this.speedBoost = false;
                this.speed = 5; // Reset to default speed
            }
        }
    }
}

// Optimize Enemy class performance
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
        // Redesigned level 1 alien - more detailed and interesting
        
        // Draw an oval-shaped head with green gradient
        const headGradient = ctx.createLinearGradient(
            this.x, this.y, 
            this.x, this.y + this.height
        );
        headGradient.addColorStop(0, '#5f0');
        headGradient.addColorStop(1, '#080');
        ctx.fillStyle = headGradient;
        
        // Draw alien head
        ctx.beginPath();
        ctx.ellipse(
            this.x + this.width/2, 
            this.y + this.height/2, 
            this.width * 0.4, 
            this.height * 0.45, 
            0, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Draw large black eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        
        // Left eye - almond shaped
        ctx.save();
        ctx.translate(this.x + this.width * 0.3, this.y + this.height * 0.4);
        ctx.scale(1, 0.6);
        ctx.arc(0, 0, this.width * 0.15, 0, Math.PI * 2);
        ctx.restore();
        
        // Right eye - almond shaped 
        ctx.save();
        ctx.translate(this.x + this.width * 0.7, this.y + this.height * 0.4);
        ctx.scale(1, 0.6);
        ctx.arc(0, 0, this.width * 0.15, 0, Math.PI * 2);
        ctx.restore();
        ctx.fill();
        
        // Draw reflective highlights in eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x + this.width * 0.25, this.y + this.height * 0.38, this.width * 0.05, 0, Math.PI * 2);
        ctx.arc(this.x + this.width * 0.65, this.y + this.height * 0.38, this.width * 0.05, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw small mouth
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width * 0.4, this.y + this.height * 0.7);
        ctx.lineTo(this.x + this.width * 0.6, this.y + this.height * 0.7);
        ctx.stroke();
        
        // Draw antenna
        ctx.strokeStyle = '#5f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width/2, this.y + this.height * 0.1);
        ctx.lineTo(this.x + this.width/2, this.y - this.height * 0.1);
        
        // Antenna top
        ctx.arc(this.x + this.width/2, this.y - this.height * 0.1, this.width * 0.08, 0, Math.PI * 2);
        ctx.stroke();
    }

    drawAdvancedAlien(ctx) {
        // Draw advanced alien creature with more details
        
        // Main body - different color for this alien type
        ctx.fillStyle = '#f0f'; // Purple alien
        
        // Draw oval body
        ctx.beginPath();
        ctx.ellipse(this.x + this.width/2, this.y + this.height/2, this.width*0.45, this.height*0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw multiple eyes (3 eyes for advanced alien)
        ctx.fillStyle = '#0ff'; // Cyan eyes
        ctx.beginPath();
        // Left eye
        ctx.arc(this.x + this.width*0.25, this.y + this.height*0.35, this.width*0.1, 0, Math.PI * 2);
        // Middle eye (slightly bigger)
        ctx.arc(this.x + this.width*0.5, this.y + this.height*0.3, this.width*0.12, 0, Math.PI * 2);
        // Right eye
        ctx.arc(this.x + this.width*0.75, this.y + this.height*0.35, this.width*0.1, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw pupils
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.x + this.width*0.25, this.y + this.height*0.35, this.width*0.04, 0, Math.PI * 2);
        ctx.arc(this.x + this.width*0.5, this.y + this.height*0.3, this.width*0.05, 0, Math.PI * 2);
        ctx.arc(this.x + this.width*0.75, this.y + this.height*0.35, this.width*0.04, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw tentacles at bottom
        ctx.strokeStyle = '#f0f';
        ctx.lineWidth = 3;
        const baseY = this.y + this.height*0.7;
        for (let i = 0; i < 4; i++) {
            const startX = this.x + this.width * (0.3 + i * 0.15);
            ctx.beginPath();
            ctx.moveTo(startX, baseY);
            // Create wavy tentacle
            ctx.quadraticCurveTo(
                startX + (i % 2 ? 5 : -5), 
                baseY + this.height*0.2, 
                startX + (i % 2 ? 10 : -10), 
                baseY + this.height*0.35
            );
            ctx.stroke();
        }
        
        // Draw mouth
        ctx.fillStyle = '#400';
        ctx.beginPath();
        ctx.ellipse(this.x + this.width/2, this.y + this.height*0.6, this.width*0.2, this.height*0.1, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    drawBossAlien(ctx) {
        // Create an intimidating alien overlord with crown-like features
        
        // Create a metallic gradient for the boss alien
        const bodyGradient = ctx.createLinearGradient(
            this.x, this.y,
            this.x, this.y + this.height
        );
        bodyGradient.addColorStop(0, '#f55'); // Light red
        bodyGradient.addColorStop(0.5, '#900'); // Mid-dark red
        bodyGradient.addColorStop(1, '#600'); // Dark red
        
        // Draw main body - larger and more imposing
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width * 0.5, this.y + this.height * 0.15); // Top center
        ctx.lineTo(this.x + this.width * 0.8, this.y + this.height * 0.3); // Upper right
        ctx.lineTo(this.x + this.width * 0.9, this.y + this.height * 0.7); // Lower right
        ctx.lineTo(this.x + this.width * 0.5, this.y + this.height * 0.9); // Bottom center
        ctx.lineTo(this.x + this.width * 0.1, this.y + this.height * 0.7); // Lower left
        ctx.lineTo(this.x + this.width * 0.2, this.y + this.height * 0.3); // Upper left
        ctx.closePath();
        ctx.fill();
        
        // Add armor plating details
        ctx.strokeStyle = '#ff0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width * 0.2, this.y + this.height * 0.4);
        ctx.lineTo(this.x + this.width * 0.8, this.y + this.height * 0.4);
        ctx.moveTo(this.x + this.width * 0.3, this.y + this.height * 0.6);
        ctx.lineTo(this.x + this.width * 0.7, this.y + this.height * 0.6);
        ctx.stroke();
        
        // Draw crown/spikes on top
        ctx.fillStyle = '#ff0'; // Gold crown
        ctx.beginPath();
        // Left spike
        ctx.moveTo(this.x + this.width * 0.2, this.y + this.height * 0.2);
        ctx.lineTo(this.x + this.width * 0.25, this.y - this.height * 0.1);
        ctx.lineTo(this.x + this.width * 0.35, this.y + this.height * 0.15);
        // Middle spike (taller)
        ctx.moveTo(this.x + this.width * 0.4, this.y + this.height * 0.1);
        ctx.lineTo(this.x + this.width * 0.5, this.y - this.height * 0.2);
        ctx.lineTo(this.x + this.width * 0.6, this.y + this.height * 0.1);
        // Right spike
        ctx.moveTo(this.x + this.width * 0.65, this.y + this.height * 0.15);
        ctx.lineTo(this.x + this.width * 0.75, this.y - this.height * 0.1);
        ctx.lineTo(this.x + this.width * 0.8, this.y + this.height * 0.2);
        ctx.fill();
        
        // Draw glowing eyes
        const eyeGlow = ctx.createRadialGradient(
            this.x + this.width * 0.35, this.y + this.height * 0.3, 0,
            this.x + this.width * 0.35, this.y + this.height * 0.3, this.width * 0.12
        );
        eyeGlow.addColorStop(0, '#f00');
        eyeGlow.addColorStop(0.7, '#f00');
        eyeGlow.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        ctx.fillStyle = eyeGlow;
        ctx.beginPath();
        ctx.arc(this.x + this.width * 0.35, this.y + this.height * 0.3, this.width * 0.12, 0, Math.PI * 2);
        ctx.fill();
        
        const eyeGlow2 = ctx.createRadialGradient(
            this.x + this.width * 0.65, this.y + this.height * 0.3, 0,
            this.x + this.width * 0.65, this.y + this.height * 0.3, this.width * 0.12
        );
        eyeGlow2.addColorStop(0, '#f00');
        eyeGlow2.addColorStop(0.7, '#f00');
        eyeGlow2.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        ctx.fillStyle = eyeGlow2;
        ctx.beginPath();
        ctx.arc(this.x + this.width * 0.65, this.y + this.height * 0.3, this.width * 0.12, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw solid eye centers (pupils)
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.x + this.width * 0.35, this.y + this.height * 0.3, this.width * 0.05, 0, Math.PI * 2);
        ctx.arc(this.x + this.width * 0.65, this.y + this.height * 0.3, this.width * 0.05, 0, Math.PI * 2);
        ctx.fill();
        
        // Add evil mouth with sharp teeth
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.x + this.width * 0.5, this.y + this.height * 0.65, this.width * 0.25, 0, Math.PI, false);
        ctx.fill();
        
        // Add teeth
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const toothWidth = this.width * 0.06;
            const startX = this.x + this.width * 0.3 + (i * toothWidth);
            
            // Triangle teeth
            ctx.moveTo(startX, this.y + this.height * 0.65);
            ctx.lineTo(startX + toothWidth/2, this.y + this.height * 0.75);
            ctx.lineTo(startX + toothWidth, this.y + this.height * 0.65);
        }
        ctx.fill();
        
        // Add pulsing effect for the boss (using current time to oscillate)
        const pulseAmount = Math.sin(Date.now() / 200) * 0.1 + 0.9;
        if (pulseAmount > 0.95) {
            // Add occasional flare/glow around the boss
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)'; // Semi-transparent to create trails
            ctx.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);
            
            // Draw explosions and particles
            for (let i = 0; i < this.explosions.length; i++) {
                this.explosions[i].update();
                this.explosions[i].draw(this.ctx);
            }
            
            // Continue render loop if explosions are still present
            if (this.explosions.length > 0) {
                requestAnimationFrame(victoryRenderLoop);
            }
        };
        
        // Start the victory render loop
        requestAnimationFrame(victoryRenderLoop);
        
        // Important: Update the DOM elements before continuing
        setTimeout(() => {
            // Update UI visibility for all device types
            const startBtn = document.getElementById('start-button');
            const restartBtn = document.getElementById('restart-button');
            const muteBtn = document.getElementById('mute-button');
            
            // Make sure buttons are properly visible/hidden
            if (startBtn) {
                startBtn.classList.add('hidden');
                console.log("Start button hidden");
            }
            
            if (restartBtn) {
                restartBtn.classList.remove('hidden');
                console.log("Restart button shown");
                
                // Re-bind the event listener to ensure it works
                restartBtn.onclick = () => {
                    console.log("Restart button clicked");
                    this.startGame();
                };
            }
            
            // Show device-appropriate restart instructions
            if (window.innerWidth <= 768 || !window.matchMedia('(hover: hover)').matches) {
                this.ctx.font = '24px Arial';
                this.ctx.fillStyle = '#fff';
                this.ctx.fillText('Tap RESTART to play again', GAME_CONFIG.width/2, GAME_CONFIG.height * 0.65);
            } else {
                this.ctx.font = '24px Arial';
                this.ctx.fillStyle = '#fff';
                this.ctx.fillText('Press ENTER to play again', GAME_CONFIG.width/2, GAME_CONFIG.height * 0.65);
            }
            
            // Setup event listener for keyboard restart
            const restartHandler = (e) => {
                if (e.key === 'Enter') {
                    console.log("Enter key pressed for restart");
                    window.removeEventListener('keydown', restartHandler);
                    this.startGame();
                }
            };
            
            window.addEventListener('keydown', restartHandler);
            
        }, 500); // Small delay to ensure DOM updates properly
    }
    
    // Add a celebratory effect for victory
    createVictoryExplosions() {
        console.log("Creating victory explosions"); // Debug log
        // Create multiple colorful explosions at random positions
        const colors = ['#0f0', '#00f', '#f0f', '#ff0', '#0ff'];
        
        const createRandomExplosion = (index) => {
            this.setTrackedTimeout(() => {
                const x = Math.random() * GAME_CONFIG.width;
                const y = Math.random() * (GAME_CONFIG.height * 0.7);
                const color = colors[Math.floor(Math.random() * colors.length)];
                
                this.explosions.push(
                    this.explosionPool.get({
                        x, y, color,
                        size: 20 + Math.random() * 40
                    })
                );
                console.log(`Explosion ${index} created at (${x}, ${y}) with color ${color}`); // Debug log
                
                if (index < 20) { // Create 20 explosions
                    createRandomExplosion(index + 1);
                }
            }, 200 + Math.random() * 300); // Random delay between explosions
        };
        
        createRandomExplosion(0);
    }

    // Optimize handling of game events
    handleGameEvent(eventType, data = {}) {
        switch(eventType) {
            case 'playerHit':
                // Add screen shake effect
                this.particleSystem.addScreenShake(10, 0.3);
                
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
                // Add particle effects for enemy explosions
                this.particleSystem.addExplosion(data.x, data.y, data.enemy.type);
                
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
                
            case 'gameVictory':
                this.victory();
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
        this.setTrackedTimeout(() => {
            messageEl.classList.add('fade-out');
            this.setTrackedTimeout(() => messageEl.remove(), 1000);
        }, 2000);
    }

    /**
     * Updates the lives display in the DOM
     */
    updateLives() {
        document.getElementById('lives').textContent = `Lives: ${this.state.lives}`;
    }

    /**
     * Updates the score display in the DOM
     */
    updateScore() {
        document.getElementById('score').textContent = `Score: ${this.state.score}`;
    }

    renderMenu() {
        // Draw animated stars instead of static background
        this.particleSystem.drawStarfield(this.ctx);
        
        // Add animated title with pulsing effect
        const pulseAmount = Math.sin(Date.now() / 500) * 0.1 + 1;
        
        this.ctx.shadowColor = '#0f0';
        this.ctx.shadowBlur = 15;
        this.ctx.fillStyle = '#0f0';
        this.ctx.font = 'bold 60px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.save();
        this.ctx.translate(GAME_CONFIG.width/2, GAME_CONFIG.height/4);
        this.ctx.scale(pulseAmount, pulseAmount);
        this.ctx.fillText('SPACE INVADERS', 0, 0);
        this.ctx.restore();
        
        // Draw high scores
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('HIGH SCORES', GAME_CONFIG.width/2, GAME_CONFIG.height/2 + 70);
        
        let yPos = GAME_CONFIG.height/2 + 110;
        if (GAME_CONFIG.highScores.length === 0) {
            this.ctx.fillText('No scores yet!', GAME_CONFIG.width/2, yPos);
        } else {
            GAME_CONFIG.highScores.slice(0, 5).forEach((score, index) => {
                this.ctx.fillText(`${index + 1}. ${score.score} pts - ${score.date}`, GAME_CONFIG.width/2, yPos);
                yPos += 30;
            });
        }
        
        // Draw device-specific instructions
        this.ctx.font = '20px Arial';
        if (window.innerWidth <= 768 || !window.matchMedia('(hover: hover)').matches) {
            this.ctx.fillText('Slide to move, tap to shoot', GAME_CONFIG.width/2, GAME_CONFIG.height * 0.9);
        } else {
            this.ctx.fillText('Press ENTER to start', GAME_CONFIG.width/2, GAME_CONFIG.height * 0.9);
            this.ctx.font = '16px Arial';
            this.ctx.fillText('Controls: Arrows to move, Space to shoot', GAME_CONFIG.width/2, GAME_CONFIG.height * 0.95);
            this.ctx.fillText('P to pause, M to mute', GAME_CONFIG.width/2, GAME_CONFIG.height * 0.98);
        }
        
        // Update menu button visibility
        document.getElementById('start-button').classList.remove('hidden');
        document.getElementById('restart-button').classList.add('hidden');
        
        // Draw player ship with gradients as seen in-game
        const shipX = GAME_CONFIG.width/2;
        const shipY = GAME_CONFIG.height * 0.85;
        const width = PLAYER_WIDTH * 1.5;
        const height = PLAYER_HEIGHT * 1.5;
        
        // Draw thrust flame animation
        const thrustSize = Math.sin(Date.now() / 100) * 5 + 10;
        this.ctx.fillStyle = '#f80';
        this.ctx.beginPath();
        this.ctx.moveTo(shipX, shipY + height * 0.4);
        this.ctx.lineTo(shipX - 8, shipY + height * 0.4 + thrustSize);
        this.ctx.lineTo(shipX + 8, shipY + height * 0.4 + thrustSize);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Draw spaceship body with gradient - same as in-game ship
        const gradient = this.ctx.createLinearGradient(shipX - width/2, shipY - height/2, shipX - width/2, shipY + height/2);
        gradient.addColorStop(0, '#0f0');
        gradient.addColorStop(1, '#080');
        this.ctx.fillStyle = gradient;
        
        this.ctx.beginPath();
        this.ctx.moveTo(shipX, shipY - height/2);
        this.ctx.lineTo(shipX + width/2, shipY + height/2);
        this.ctx.lineTo(shipX + width * 0.3, shipY + height * 0.3);
        this.ctx.lineTo(shipX + width * 0.1, shipY + height/2);
        this.ctx.lineTo(shipX - width * 0.1, shipY + height/2);
        this.ctx.lineTo(shipX - width * 0.3, shipY + height * 0.3);
        this.ctx.lineTo(shipX - width/2, shipY + height/2);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Draw cockpit with gradient
        const cockpitGradient = this.ctx.createRadialGradient(
            shipX, shipY - height * 0.1, 0, 
            shipX, shipY - height * 0.1, width * 0.15
        );
        cockpitGradient.addColorStop(0, '#00f');
        cockpitGradient.addColorStop(1, '#004');
        this.ctx.fillStyle = cockpitGradient;
        this.ctx.beginPath();
        this.ctx.arc(shipX, shipY - height * 0.1, width * 0.15, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Display alien types
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('ENEMY TYPES', GAME_CONFIG.width/2, GAME_CONFIG.height/2 - 80);
        
        // Create temporary enemies to show their designs
        const tempEnemyWidth = 40;
        const tempEnemyHeight = 30;
        const centerX = GAME_CONFIG.width/2;
        const enemyY = GAME_CONFIG.height/2 - 40;
        const spacing = 120;
        
        // Draw Level 1 Enemy (Basic)
        // Green alien with oval head
        const x1 = centerX - spacing;
        const y1 = enemyY;
        
        const headGradient = this.ctx.createLinearGradient(x1, y1, x1, y1 + tempEnemyHeight);
        headGradient.addColorStop(0, '#5f0');
        headGradient.addColorStop(1, '#080');
        this.ctx.fillStyle = headGradient;
        
        this.ctx.beginPath();
        this.ctx.ellipse(x1 + tempEnemyWidth/2, y1 + tempEnemyHeight/2, 
                    tempEnemyWidth * 0.4, tempEnemyHeight * 0.45, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Eyes
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.save();
        this.ctx.translate(x1 + tempEnemyWidth * 0.3, y1 + tempEnemyHeight * 0.4);
        this.ctx.scale(1, 0.6);
        this.ctx.arc(0, 0, tempEnemyWidth * 0.15, 0, Math.PI * 2);
        this.ctx.restore();
        
        this.ctx.save();
        this.ctx.translate(x1 + tempEnemyWidth * 0.7, y1 + tempEnemyHeight * 0.4);
        this.ctx.scale(1, 0.6);
        this.ctx.arc(0, 0, tempEnemyWidth * 0.15, 0, Math.PI * 2);
        this.ctx.restore();
        this.ctx.fill();
        
        // Draw Level 2 Enemy (Advanced/Purple)
        const x2 = centerX;
        const y2 = enemyY;
        
        this.ctx.fillStyle = '#f0f';
        this.ctx.beginPath();
        this.ctx.ellipse(x2 + tempEnemyWidth/2, y2 + tempEnemyHeight/2, 
                    tempEnemyWidth*0.45, tempEnemyHeight*0.4, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Eyes
        this.ctx.fillStyle = '#0ff';
        this.ctx.beginPath();
        this.ctx.arc(x2 + tempEnemyWidth*0.25, y2 + tempEnemyHeight*0.35, tempEnemyWidth*0.1, 0, Math.PI * 2);
        this.ctx.arc(x2 + tempEnemyWidth*0.5, y2 + tempEnemyHeight*0.3, tempEnemyWidth*0.12, 0, Math.PI * 2);
        this.ctx.arc(x2 + tempEnemyWidth*0.75, y2 + tempEnemyHeight*0.35, tempEnemyWidth*0.1, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw Level 3 Enemy (Boss/Red)
        const x3 = centerX + spacing;
        const y3 = enemyY;
        
        const bossGradient = this.ctx.createLinearGradient(x3, y3, x3, y3 + tempEnemyHeight);
        bossGradient.addColorStop(0, '#f55');
        bossGradient.addColorStop(0.5, '#900');
        bossGradient.addColorStop(1, '#600');
        
        this.ctx.fillStyle = bossGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(x3 + tempEnemyWidth * 0.5, y3 + tempEnemyHeight * 0.15);
        this.ctx.lineTo(x3 + tempEnemyWidth * 0.8, y3 + tempEnemyHeight * 0.3);
        this.ctx.lineTo(x3 + tempEnemyWidth * 0.9, y3 + tempEnemyHeight * 0.7);
        this.ctx.lineTo(x3 + tempEnemyWidth * 0.5, y3 + tempEnemyHeight * 0.9);
        this.ctx.lineTo(x3 + tempEnemyWidth * 0.1, y3 + tempEnemyHeight * 0.7);
        this.ctx.lineTo(x3 + tempEnemyWidth * 0.2, y3 + tempEnemyHeight * 0.3);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Eyes
        this.ctx.fillStyle = '#f00';
        this.ctx.beginPath();
        this.ctx.arc(x3 + tempEnemyWidth * 0.35, y3 + tempEnemyHeight * 0.3, tempEnemyWidth * 0.12, 0, Math.PI * 2);
        this.ctx.arc(x3 + tempEnemyWidth * 0.65, y3 + tempEnemyHeight * 0.3, tempEnemyWidth * 0.12, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Points text
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '14px Arial';
        this.ctx.fillText('10 pts', x1, y1 + 45);
        this.ctx.fillText('20 pts', x2, y2 + 45);
        this.ctx.fillText('30 pts', x3, y3 + 45);
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

    gameOver(reason = "Game Over") {
        // Cancel any pending level transition
        this.isTransitioningLevel = false;
        
        this.state.gameState = GameState.GAME_OVER;
        
        // Clear any level transition messages
        const existingMessages = document.querySelectorAll('.level-message');
        existingMessages.forEach(msg => msg.remove());
        
        // Show game over screen
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);
        
        this.ctx.fillStyle = '#f00';
        this.ctx.font = '40px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(reason, GAME_CONFIG.width/2, GAME_CONFIG.height/3);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Final Score: ${this.state.score}`, GAME_CONFIG.width/2, GAME_CONFIG.height/2);
        
        // Show different restart instructions based on device
        if (window.innerWidth <= 768 || !window.matchMedia('(hover: hover)').matches) {
            document.getElementById('restart-button').classList.remove('hidden');
            document.getElementById('start-button').classList.add('hidden');
        } else {
            this.ctx.fillText('Press ENTER to play again', GAME_CONFIG.width/2, GAME_CONFIG.height * 0.6);
        }
        
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

    // Replace setTimeout with tracked version
    setTrackedTimeout(callback, delay) {
        const timeoutId = setTimeout(() => {
            this.activeTimeouts.delete(timeoutId);
            callback();
        }, delay);
        
        this.activeTimeouts.add(timeoutId);
        return timeoutId;
    }
    
    // Clear all active timeouts
    clearAllTimeouts() {
        this.activeTimeouts.forEach(id => clearTimeout(id));
        this.activeTimeouts.clear();
    }

    // Add a new method to clean up entities between levels
    cleanupEntities() {
        // Keep only the player
        const player = [...this.entities].find(e => e instanceof Player);
        this.entities.clear();
        
        if (player) {
            this.entities.add(player);
        }
        
        // Clean up all bullet pools
        this.bulletPool.releaseAll();
    }

    bindSwipeControls() {
        if (!this.canvas) return;

        const touchStart = (e) => {
            e.preventDefault();
            this.initAudio();
            
            const touch = e.touches[0];
            this.touch.startX = touch.clientX;
            this.touch.lastX = touch.clientX;
            this.touch.startTime = Date.now();
            this.touch.lastTime = Date.now();
            this.touch.velocity = 0;
            this.touch.isTouching = true;
        };

        const touchMove = (e) => {
            if (!this.touch.isTouching || this.state.gameState !== GameState.PLAYING) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            const now = Date.now();
            const deltaTime = now - this.touch.lastTime;
            if (deltaTime === 0) return;

            const deltaX = touch.clientX - this.touch.lastX;
            
            // Calculate new velocity based on movement speed
            const newVelocity = (deltaX / deltaTime) * 2;
            
            // Smooth velocity transitions
            this.touch.velocity = 0.6 * this.touch.velocity + 0.4 * newVelocity;
            this.touch.velocity = Math.max(-this.touch.maxVelocity, 
                                        Math.min(this.touch.maxVelocity, this.touch.velocity));
            
            this.touch.lastX = touch.clientX;
            this.touch.lastTime = now;
        };

        const touchEnd = (e) => {
            e.preventDefault();
            
            // Check for tap (quick touch with minimal movement)
            const touchDuration = Date.now() - this.touch.startTime;
            const touch = e.changedTouches[0];
            const moveDistance = Math.abs(touch.clientX - this.touch.startX);
            
            if (touchDuration < 200 && moveDistance < 10) {
                if (this.state.gameState === GameState.PLAYING) {
                    this.player.shoot();
                }
            }
            
            this.touch.isTouching = false;
        };

        this.canvas.addEventListener('touchstart', touchStart, { passive: false });
        this.canvas.addEventListener('touchmove', touchMove, { passive: false });
        this.canvas.addEventListener('touchend', touchEnd, { passive: false });
    }

    // High score management
    loadHighScores() {
        const savedScores = localStorage.getItem('spaceInvadersHighScores');
        if (savedScores) {
            GAME_CONFIG.highScores = JSON.parse(savedScores);
        }
    }
    
    saveHighScore(score) {
        // Check if score qualifies for high scores
        const lowestScore = GAME_CONFIG.highScores.length >= 5 ? 
            GAME_CONFIG.highScores[GAME_CONFIG.highScores.length - 1].score : 0;
            
        const isHighScore = GAME_CONFIG.highScores.length < 5 || score > lowestScore;
            
        if (!isHighScore && GAME_CONFIG.highScores.length >= 5) {
            // Not a high score and we already have 5 scores
            return false;
        }
        
        GAME_CONFIG.highScores.push({
            score,
            date: new Date().toLocaleDateString(),
            level: this.state.level,
            accuracy: GameStats.getAccuracy()
        });
        
        // Sort and keep only top 5
        GAME_CONFIG.highScores.sort((a, b) => b.score - a.score);
        if (GAME_CONFIG.highScores.length > 5) {
            GAME_CONFIG.highScores = GAME_CONFIG.highScores.slice(0, 5);
        }
        
        // Save to localStorage
        localStorage.setItem('spaceInvadersHighScores', JSON.stringify(GAME_CONFIG.highScores));
        
        // Return rank (position in high scores)
        return GAME_CONFIG.highScores.findIndex(s => s.score === score) + 1;
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}m ${secs}s`;
    }

    // Spawn power-up drops from destroyed enemies
    spawnPowerUpDrop(x, y) {
        const powerUp = new PowerUpDrop(x, y);
        this.entities.add(powerUp);
    }
}