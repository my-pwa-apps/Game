const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 30;
const ENEMY_ROWS = 5;
const ENEMY_COLS = 8;
const ENEMY_WIDTH = 40;
const ENEMY_HEIGHT = 30;
const BULLET_WIDTH = 3;
const BULLET_HEIGHT = 15;

let score = 0;
let lives = 3;
let touchX = null;

// Update canvas size based on window
function resizeCanvas() {
    const container = document.getElementById('game-container');
    const scale = Math.min(window.innerWidth / 800, window.innerHeight / 600);
    canvas.width = 800 * scale;
    canvas.height = 600 * scale;
    ctx.scale(scale, scale);
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

    draw() {
        ctx.fillStyle = '#0f0';
        // Draw player ship as triangle
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        this.bullets.forEach(bullet => bullet.draw());
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

    update() {
        this.bullets = this.bullets.filter(bullet => {
            bullet.update();
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

    draw() {
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

    draw() {
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
    }

    update() {
        this.y -= this.speed;
    }
}

const player = new Player();
let enemies = [];
let gameLoop;
let moveDirection = 1;

function initEnemies() {
    for (let i = 0; i < ENEMY_ROWS; i++) {
        for (let j = 0; j < ENEMY_COLS; j++) {
            enemies.push(new Enemy(j * (ENEMY_WIDTH + 20) + 50, i * (ENEMY_HEIGHT + 20) + 50));
        }
    }
}

function checkCollisions() {
    player.bullets.forEach((bullet, bulletIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y) {
                player.bullets.splice(bulletIndex, 1);
                enemies.splice(enemyIndex, 1);
                score += 10;
            }
        });
    });

    enemies.forEach(enemy => {
        enemy.bullets.forEach((bullet, bulletIndex) => {
            if (bullet.x < player.x + player.width &&
                bullet.x + bullet.width > player.x &&
                bullet.y < player.y + player.height &&
                bullet.y > player.y) {
                enemy.bullets.splice(bulletIndex, 1);
                lives--;
                if (lives <= 0) {
                    alert('Game Over! Final Score: ' + score);
                    cancelAnimationFrame(gameLoop);
                }
            }
        });
    });
}

function update() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    player.update();
    player.draw();

    let shouldChangeDirection = false;
    enemies.forEach(enemy => {
        enemy.move(moveDirection);
        if (enemy.x <= 0 || enemy.x + enemy.width >= canvas.width) {
            shouldChangeDirection = true;
        }
        enemy.draw();
    });

    if (shouldChangeDirection) {
        moveDirection *= -1;
        enemies.forEach(enemy => enemy.y += 20);
    }

    checkCollisions();

    if (enemies.length === 0) {
        alert('You win!');
        cancelAnimationFrame(gameLoop);
        return;
    }

    if (enemies.some(enemy => enemy.y + enemy.height >= player.y)) {
        alert('Game Over!');
        cancelAnimationFrame(gameLoop);
        return;
    }

    document.getElementById('score').textContent = `Score: ${score}`;
    document.getElementById('lives').textContent = `Lives: ${lives}`;

    gameLoop = requestAnimationFrame(update);
}

// Controls
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') player.move(-1);
    if (e.key === 'ArrowRight') player.move(1);
    if (e.key === ' ') player.shoot();
});

// Mobile controls
document.getElementById('leftBtn').addEventListener('touchstart', () => player.move(-1));
document.getElementById('rightBtn').addEventListener('touchstart', () => player.move(1));
document.getElementById('fireBtn').addEventListener('touchstart', () => player.shoot());

// Touch controls
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchX = e.touches[0].clientX;
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (touchX === null) return;
    
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - touchX;
    player.move(Math.sign(deltaX));
    touchX = currentX;
});

canvas.addEventListener('touchend', () => {
    touchX = null;
    player.shoot();
});

// Initialize
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Start game
initEnemies();
update();
