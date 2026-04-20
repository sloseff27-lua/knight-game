// ============================================================
// CANVAS SETUP
// ============================================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ============================================================
// ASSETS — load images
// ============================================================
const roomBackground = new Image();
roomBackground.src = "RoomImages/DungeonRoom1.png";

const roomCleared = new Image();
roomCleared.src = "RoomImages/ClearedDungeonRoom1.png";

const healthBarEmpty = new Image();
healthBarEmpty.src = "UserInterface/EmptyHealthBar.png";

const healthBarFull = new Image();
healthBarFull.src = "UserInterface/FullHealthBar.png";

// ============================================================
// GAME STATE
// ============================================================
// [game state vars]
let roomNumber = 1;
let roomIsCleared = false;
let fadeAlpha = 0;
let fading = false;
let fadeDirection = "out";

// ============================================================
// PLAYER OBJECT
// ============================================================
// [player config]
const player = {
  x: canvas.width / 2.08,
  y: canvas.height / 1.35,
  width: 50,
  height: 50,
  speed: 4,                 // [player speed]
  color: "slategray",
  health: 100,              // [player health]
  maxHealth: 100,
  facing: "right",
  attackTimer: 0,
  attackCooldown: 0,
  attackHits: [],
  damage: 2500                // [player damage]
};

// ============================================================
// COIN SYSTEM
// ============================================================
// [coin config]
const coins = [];
let coinCount = 0;

// ============================================================
// ENEMY SYSTEM
// ============================================================
// [enemy config]
const enemies = [];

function spawnEnemies() {
  const minDistFromPlayer = 200;

  // [enemy count]
  const enemyCount = 3 + roomNumber;
  // [enemy speed]
  const enemySpeed = 1.5 + (roomNumber * 0.1);
  // [enemy health]
  const enemyHealth = 60 + (roomNumber * 10);
  for (let i = 0; i < enemyCount; i++) {
    let ex, ey, attempts = 0;

    do {
      ex = Math.random() * (canvas.width - 550) + 275;
      ey = Math.random() * (canvas.height - 340) + 180;
      attempts++;
    } while (
      Math.sqrt((ex - player.x) ** 2 + (ey - player.y) ** 2) < minDistFromPlayer
      && attempts < 20
    );

    enemies.push({
      x: ex,
      y: ey,
      width: 40,
      height: 40,
      speed: enemySpeed,
      color: "crimson",
      health: enemyHealth
    });
  }
}

spawnEnemies();

// ============================================================
// DOOR DETECTION ZONE
// ============================================================
// [exit door config]
const exitDoor = {
  x: canvas.width / 2 - 60,
  y: 150,
  width: 120,
  height: 40
};

// ============================================================
// ROOM TRANSITION
// ============================================================
// [advance room]
function advanceRoom() {
  roomNumber++;
  roomIsCleared = false;

  // Reset player position
  player.x = canvas.width / 2.08;
  player.y = canvas.height / 1.35;

  // Clear enemies, coins and spawn new enemies
  enemies.length = 0;
  coins.length = 0;         // [clear coins]
  spawnEnemies();
}

// ============================================================
// INPUT HANDLING
// ============================================================
// [input]
const keys = {};

window.addEventListener("keydown", (e) => {
  keys[e.key] = true;
});

window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

window.addEventListener("mousedown", (e) => {
  if (e.button === 0) keys["click"] = true;
});

window.addEventListener("mouseup", (e) => {
  if (e.button === 0) keys["click"] = false;
});

// ============================================================
// COLLISION DETECTION
// ============================================================
// [collision]
function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// ============================================================
// UPDATE LOOP
// ============================================================
function update() {

  if (!fading) {

    // [player movement]
    if (keys["w"] || keys["ArrowUp"])    player.y -= player.speed;
    if (keys["s"] || keys["ArrowDown"])  player.y += player.speed;
    if (keys["a"] || keys["ArrowLeft"])  player.x -= player.speed;
    if (keys["d"] || keys["ArrowRight"]) player.x += player.speed;

    // [wall bounds]
    player.x = Math.max(250, Math.min(canvas.width - player.width - 250, player.x));
    player.y = Math.max(160, Math.min(canvas.height - player.height - 130, player.y));

    // [enemy movement]
    enemies.forEach(enemy => {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      enemy.x += (dx / dist) * enemy.speed;
      enemy.y += (dy / dist) * enemy.speed;
    });

    // [enemy damage to player]
    enemies.forEach(enemy => {
      if (rectsOverlap(player, enemy)) {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        enemy.x += (dx / dist) * 2;
        enemy.y += (dy / dist) * 2;
        player.health -= 0.3;         // [enemy damage per tick]
      }
    });

    // [health clamp]
    player.health = Math.max(0, player.health);

    // [player facing]
    if (keys["w"] || keys["ArrowUp"])    player.facing = "up";
    if (keys["s"] || keys["ArrowDown"])  player.facing = "down";
    if (keys["a"] || keys["ArrowLeft"])  player.facing = "left";
    if (keys["d"] || keys["ArrowRight"]) player.facing = "right";

    // [attack input]
    if ((keys[" "] || keys["click"]) && player.attackCooldown <= 0) {
      player.attackTimer = 20;
      player.attackCooldown = 30;
      player.attackHits = [];
    }

    // [attack timers]
    if (player.attackTimer > 0)    player.attackTimer--;
    if (player.attackCooldown > 0) player.attackCooldown--;

    // [attack hitbox]
    if (player.attackTimer > 0) {
      let hx = player.x, hy = player.y, hw = 60, hh = 60;

      if (player.facing === "right") { hx = player.x + player.width;  hy = player.y - 5; }
      if (player.facing === "left")  { hx = player.x - hw;            hy = player.y - 5; }
      if (player.facing === "down")  { hx = player.x - 5;             hy = player.y + player.height; }
      if (player.facing === "up")    { hx = player.x - 5;             hy = player.y - hh; }

      const attackBox = { x: hx, y: hy, width: hw, height: hh };

      // [attack hits enemy]
      enemies.forEach((enemy, index) => {
        if (rectsOverlap(attackBox, enemy) && !player.attackHits.includes(index)) {
          enemy.health -= player.damage;
          player.attackHits.push(index);
        }
      });

      // [enemy removal + coin drop]
      for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].health <= 0) {
          // Drop coin at enemy's center
          coins.push({
            x: enemies[i].x + enemies[i].width / 2 - 5,
            y: enemies[i].y + enemies[i].height / 2 - 5,
            width: 10,
            height: 10
          });
          enemies.splice(i, 1);
        }
      }
    }

    // [coin collection]
    const pickupRadius = 60; // larger than player for smooth pickup
    for (let i = coins.length - 1; i >= 0; i--) {
      const cx = coins[i].x + 5;
      const cy = coins[i].y + 5;
      const px = player.x + player.width / 2;
      const py = player.y + player.height / 2;
      const dist = Math.sqrt((cx - px) ** 2 + (cy - py) ** 2);
      if (dist < pickupRadius) {
        coinCount++;
        coins.splice(i, 1);
      }
    }
    // [room clear check]
    if (enemies.length === 0 && !roomIsCleared) {
      roomIsCleared = true;
    }

    // [exit door check]
    if (roomIsCleared && rectsOverlap(player, exitDoor)) {
      fading = true;
      fadeDirection = "out";
    }
  }

  // [fade transition]
  if (fading) {
    if (fadeDirection === "out") {
      fadeAlpha += 0.05;
      if (fadeAlpha >= 1) {
        fadeAlpha = 1;
        advanceRoom();
        fadeDirection = "in";
      }
    } else {
      fadeAlpha -= 0.05;
      if (fadeAlpha <= 0) {
        fadeAlpha = 0;
        fading = false;
      }
    }
  }
}

// ============================================================
// RENDER LOOP
// ============================================================
function render() {

  // [draw background]
  if (roomIsCleared) {
    ctx.drawImage(roomCleared, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.drawImage(roomBackground, 0, 0, canvas.width, canvas.height);
  }

  // [draw player]
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // [draw enemies]
  enemies.forEach(enemy => {
    ctx.fillStyle = enemy.color;
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
  });

  // [draw coins]
  ctx.fillStyle = "#FFD700";
  coins.forEach(coin => {
    ctx.fillRect(coin.x, coin.y, coin.width, coin.height);
  });

  // [draw health bar]
  const barX = 20;
  const barY = 20;
  const barW = 250;
  const barH = 28;

  ctx.fillStyle = "#1a0000";
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = "#cc0000";
  ctx.fillRect(barX, barY, barW * (player.health / player.maxHealth), barH);
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barW, barH);

  // [draw health text]
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText(Math.ceil(player.health) + " / " + player.maxHealth, barX + barW / 2, barY + barH - 8);
  ctx.textAlign = "left";

  // [draw room number]
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 18px Courier New";
  ctx.fillText("Room: " + roomNumber, 20, barY + barH + 25);

  // [draw coin count]
  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 16px Courier New";
  ctx.fillText("Coins: " + coinCount, 20, barY + barH + 50);

  // [draw room cleared message]
  if (roomIsCleared) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.font = "bold 36px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("Room Cleared!", canvas.width / 2, canvas.height / 2);
    ctx.font = "20px Courier New";
    ctx.fillText("Walk through the door to advance.", canvas.width / 2, canvas.height / 2 + 40);
    ctx.textAlign = "left";
  }

  // [draw attack hitbox]
  if (player.attackTimer > 0) {
    let hx = player.x, hy = player.y, hw = 60, hh = 60;

    if (player.facing === "right") { hx = player.x + player.width;  hy = player.y - 5; }
    if (player.facing === "left")  { hx = player.x - hw;            hy = player.y - 5; }
    if (player.facing === "down")  { hx = player.x - 5;             hy = player.y + player.height; }
    if (player.facing === "up")    { hx = player.x - 5;             hy = player.y - hh; }

    ctx.fillStyle = "rgba(255, 220, 0, 0.4)";
    ctx.fillRect(hx, hy, hw, hh);
  }

  // [draw fade overlay]
  if (fadeAlpha > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

// ============================================================
// GAME LOOP
// ============================================================
function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

// [start game — wait for images]
Promise.all([
  new Promise(res => roomBackground.onload = res),
  new Promise(res => roomCleared.onload = res),
  new Promise(res => healthBarEmpty.onload = res),
  new Promise(res => healthBarFull.onload = res)
]).then(() => {
  gameLoop();
});
