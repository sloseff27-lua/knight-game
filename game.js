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

// ============================================================
// PLAYER OBJECT
// ============================================================
const player = {
  x: canvas.width / 2.08,
  y: canvas.height / 1.35,
  width: 50,
  height: 50,
  speed: 4,
  color: "blue",
  health: 100,
  maxHealth: 100,
  facing: "right",
  attackTimer: 0,
  attackCooldown: 0,
  attackHits: [],
  damage: 25
};

// ============================================================
// GAME STATE
// ============================================================
let roomIsCleared = false;  // tracks if all enemies are defeated

// ============================================================
// ENEMY SYSTEM
// ============================================================
const enemies = [];

function spawnEnemies() {
  const minDistFromPlayer = 200; // minimum spawn distance from player

  for (let i = 0; i < 1; i++) {
    let ex, ey, attempts = 0;

    // Keep trying random positions until far enough from player
    do {
      ex = Math.random() * (canvas.width - 350) + 200;
      ey = Math.random() * (canvas.height - 340) + 160;
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
      speed: 1.5,
      color: "crimson",
      health: 5
    });
  }
}

spawnEnemies();

// ============================================================
// INPUT HANDLING
// ============================================================
const keys = {};

window.addEventListener("keydown", (e) => {
  keys[e.key] = true;
});

window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

// --- Mouse Click Attack ---
window.addEventListener("mousedown", (e) => {
  if (e.button === 0) keys["click"] = true;
});

window.addEventListener("mouseup", (e) => {
  if (e.button === 0) keys["click"] = false;
});

// ============================================================
// COLLISION DETECTION
// ============================================================
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

  // --- Player Movement (WASD + Arrow Keys) ---
  if (keys["w"] || keys["ArrowUp"])    player.y -= player.speed;
  if (keys["s"] || keys["ArrowDown"])  player.y += player.speed;
  if (keys["a"] || keys["ArrowLeft"])  player.x -= player.speed;
  if (keys["d"] || keys["ArrowRight"]) player.x += player.speed;

  // Keep player inside room walls
  player.x = Math.max(250, Math.min(canvas.width - player.width - 250, player.x));
  player.y = Math.max(160, Math.min(canvas.height - player.height - 130, player.y));

  // --- Enemy AI: Move toward player ---
  enemies.forEach(enemy => {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    enemy.x += (dx / dist) * enemy.speed;
    enemy.y += (dy / dist) * enemy.speed;
  });

  // --- Enemy Collision: Push back + deal damage ---
  enemies.forEach(enemy => {
    if (rectsOverlap(player, enemy)) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      enemy.x += (dx / dist) * 2;
      enemy.y += (dy / dist) * 2;
      player.health -= 0.3;
    }
  });

  // Prevent health going below 0
  player.health = Math.max(0, player.health);

  // --- Track player facing direction ---
  if (keys["w"] || keys["ArrowUp"])    player.facing = "up";
  if (keys["s"] || keys["ArrowDown"])  player.facing = "down";
  if (keys["a"] || keys["ArrowLeft"])  player.facing = "left";
  if (keys["d"] || keys["ArrowRight"]) player.facing = "right";

  // --- Attack Input (Spacebar or Left Click) ---
  if ((keys[" "] || keys["click"]) && player.attackCooldown <= 0) {
    player.attackTimer = 20;
    player.attackCooldown = 30;
    player.attackHits = [];
  }

  // --- Tick down timers ---
  if (player.attackTimer > 0)    player.attackTimer--;
  if (player.attackCooldown > 0) player.attackCooldown--;

  // --- Calculate attack hitbox position based on facing ---
  if (player.attackTimer > 0) {
    let hx = player.x, hy = player.y, hw = 60, hh = 60;

    if (player.facing === "right") { hx = player.x + player.width;  hy = player.y - 5; }
    if (player.facing === "left")  { hx = player.x - hw;            hy = player.y - 5; }
    if (player.facing === "down")  { hx = player.x - 5;             hy = player.y + player.height; }
    if (player.facing === "up")    { hx = player.x - 5;             hy = player.y - hh; }

    const attackBox = { x: hx, y: hy, width: hw, height: hh };

    // --- Check attack hitbox against enemies (once per swing) ---
    enemies.forEach((enemy, index) => {
      if (rectsOverlap(attackBox, enemy) && !player.attackHits.includes(index)) {
        enemy.health -= player.damage;
        player.attackHits.push(index);
      }
    });

    // --- Remove dead enemies ---
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].health <= 0) {
        enemies.splice(i, 1);
      }
    }
  }

  // --- Check if room is cleared ---
  if (enemies.length === 0 && !roomIsCleared) {
    roomIsCleared = true;
  }
}

// ============================================================
// RENDER LOOP
// ============================================================
function render() {
  // --- Draw room background (cleared or normal) ---
  if (roomIsCleared) {
    ctx.drawImage(roomCleared, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.drawImage(roomBackground, 0, 0, canvas.width, canvas.height);
  }

  // --- Draw Player ---
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // --- Draw Enemies ---
  enemies.forEach(enemy => {
    ctx.fillStyle = enemy.color;
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
  });

  // --- Draw Health Bar ---
  ctx.fillStyle = "red";
  ctx.fillRect(10, 10, 200, 20);
  ctx.fillStyle = "#24C72F";
  ctx.fillRect(10, 10, 200 * (player.health / player.maxHealth), 20);

  // --- Draw Health Text ---
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "14px Arial";
  ctx.fillText("HP: " + Math.ceil(player.health) + " / " + player.maxHealth, 10, 50);

  // --- Draw Attack Hitbox (yellow flash) ---
  if (player.attackTimer > 0) {
    let hx = player.x, hy = player.y, hw = 60, hh = 60;

    if (player.facing === "right") { hx = player.x + player.width;  hy = player.y - 5; }
    if (player.facing === "left")  { hx = player.x - hw;            hy = player.y - 5; }
    if (player.facing === "down")  { hx = player.x - 5;             hy = player.y + player.height; }
    if (player.facing === "up")    { hx = player.x - 5;             hy = player.y - hh; }

    ctx.fillStyle = "rgba(255, 220, 0, 0.4)";
    ctx.fillRect(hx, hy, hw, hh);
  }

  // --- Draw Room Cleared Message ---
  if (roomIsCleared) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.font = "bold 36px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("Room Cleared!", canvas.width / 2, canvas.height / 2);
    ctx.font = "25px Courier New";
    ctx.fillText("Go through the open door to advance.", canvas.width / 2, canvas.height / 2 + 40);
    ctx.textAlign = "left"; // reset alignment
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

// Wait for both images to load before starting
Promise.all([
  new Promise(res => roomBackground.onload = res),
  new Promise(res => roomCleared.onload = res)
]).then(() => {
  gameLoop();
});