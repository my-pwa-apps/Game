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

class Player {
    constructor() {
        this.width = PLAYER_WIDTH;
        this.height = PLAYER_HEIGHT;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 10;
        this.speed = 5;
        this.bullets = [];
    }

    draw() {
        ctx.fillStyle = '#0f0';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        this.bullets.forEach(bullet => bullet.draw());
    }

    move(direction) {
        this.x = Math.max(0, Math.min(canvas.width - this.width, this.x + direction * this.speed));
    }

    shoot() {
        this.bullets.push(new Bullet(this.x + this.width / 2, this.y));
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
    }

    draw() {
        ctx.fillStyle = '#f00';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    move(direction) {
        this.x += direction * this.speed;
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

// Start game
initEnemies();
update();
