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
        // ...existing level data...
    ],
    bonusShipChance: 0.001,
    bonusDuration: 10000,
    highScores: []
};

// Fix circular reference by using a global audio context
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Use requestIdleCallback for non-critical operations
const scheduleIdleTask = window.requestIdleCallback || 
    ((callback) => setTimeout(callback, 1));

// Optimize collision detection with spatial partitioning
class SpatialGrid {
    // ...existing code...
}

// SoundManager class
class SoundManager {
    // ...existing code...
}

// Explosion class
class Explosion {
    // ...existing code...
}

// ParticleSystem class
class ParticleSystem {
    // ...existing code...
}

// ObjectPool class
class ObjectPool {
    // ...existing code...
}

// Bullet class with the previously fixed code
class Bullet {
    constructor() {
        this.width = BULLET_WIDTH;
        this.height = BULLET_HEIGHT;
        this.x = 0;
        this.y = 0;
        this.speed = 8;
        this.active = false;
        this.enemyBullet = false;
    }

    reset(params = {}) {
        this.x = params.x || 0;
        this.y = params.y || 0;
        this.active = true;
        this.enemyBullet = params.enemyBullet || false;
        return this;
    }

    update(deltaTime) {
        if (this.enemyBullet) {
            this.y += this.speed;
        } else {
            this.y -= this.speed;
        }
        return this.active;
    }

    draw(ctx) {
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// Class for power-up drops
class PowerUpDrop {
    // ...existing code...
}

// Main Game class
class Game {
    // ...existing code...
}

// BonusShip class - SINGLE DECLARATION
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
        // ...existing code...
    }
    
    update(deltaTime) {
        // ...existing code...
    }
    
    hit() {
        // ...existing code...
    }
}

// Player class - SINGLE DECLARATION
class Player {
    // ...existing code...
}

// Enemy class - SINGLE DECLARATION
class Enemy {
    // ...existing code...
}

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        const game = new Game();
        game.init();
        game.prepareBackgroundStars();
        game.state.gameState = GameState.MENU;
        game.start();
    } catch (error) {
        console.error('Failed to initialize game:', error);
    }
});
