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

// [shop image]
const shopImage = new Image();
shopImage.src = "UserInterface/MerchantTable.png";

// ============================================================
// GAME STATE
// ============================================================
// [game state vars]
let roomNumber = 1;
let roomIsCleared = false;
let fadeAlpha = 0;
let fading = false;
let fadeDirection = "out";
let isShopRoom = false;
let isBossRoom = false;
let shopOpen = false;
let shopHealMessage = "";

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
  maxSpeed: 13,             // [player speed cap]
  color: "slategray",
  health: 100,              // [player health]
  maxHealth: 100,
  facing: "right",
  attackTimer: 0,
  attackCooldown: 0,
  attackHits: [],
  damage: 25                // [player damage]
};

// ============================================================
// COIN SYSTEM
// ============================================================
// [coin config]
const coins = [];
let coinCount = 0;

// ============================================================
// SHOP SYSTEM
// ============================================================
// [shop config]
const shopBox = {
  x: canvas.width / 2 - 25,
  y: canvas.height / 2 - 25,
  width: 50,
  height: 50
};
const shopProximity = 150;

// [shop prices]
function getShopPrices() {
  const shopNumber = Math.floor(roomNumber / 5);
  const multiplier = 1 + (shopNumber * 0.5);
  return {
    damagePrice: Math.floor(10 * multiplier),
    healthPrice: Math.floor(15 * multiplier),
    speedPrice:  Math.floor(10 * multiplier)
  };
}

// ============================================================
// BOSS SYSTEM
// ============================================================
// [boss config]
let boss = null;
let bossMinionsSpawned = false;

function createBoss() {
  return {
    x: canvas.width / 2 - 60,
    y: canvas.height / 2 - 200,
    width: 120,                               // [boss size]
    height: 120,
    speed: 0.8,                               // [boss speed] slow and threatening
    color: "#8B0000",
    health: 300 + (roomNumber * 20),          // [boss health] scales with room
    maxHealth: 300 + (roomNumber * 20),
    damage: 1.5,                              // [boss damage per tick]
    coinDrop: 20 + roomNumber                 // [boss coin drop] scales with room
  };
}

// Spawn weaker minions at 50% boss health
function spawnBossMinions() {
  const minionCount = 3;
  const minionSpeed = (1.5 + (roomNumber * 0.1)) * 0.5;  // [minion speed] 50% of normal
  const minionHealth = (60 + (roomNumber * 10)) * 0.5;   // [minion health] 50% of normal

  for (let i = 0; i < minionCount; i++) {
    let ex, ey, attempts = 0;
    do {
      ex = Math.random() * (canvas.width - 550) + 275;
      ey = Math.random() * (canvas.height - 340) + 180;
      attempts++;
    } while (
      Math.sqrt((ex - player.x) ** 2 + (ey - player.y) ** 2) < 150
      && attempts < 20
    );

    enemies.push({
      x: ex,
      y: ey,
      width: 25,                              // [minion size] smaller than normal
      height: 25,
      speed: minionSpeed,
      color: "#cc4400",                       // slightly different color from boss
      health: minionHealth
    });
  }
}

// ============================================================
// ENEMY SYSTEM
// ============================================================
// [enemy config]
const enemies = [];

function spawnEnemies() {
  if (isShopRoom || isBossRoom) return;

  const minDistFromPlayer = 200;

  // [enemy count] capped at 13
  const enemyCount = Math.min(3 + roomNumber, 13);
  // [enemy speed]
  const enemySpeed = 1.5 + (roomNumber * 0.1);
  // [enemy health]wd
  const enemyHealth = 30 + (roomNumber * 10);

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
  shopOpen = false;
  shopHealMessage = "";
  boss = null;
  bossMinionsSpawned = false;

  // Detect room type
  isBossRoom = (roomNumber % 10 === 0);
  isShopRoom = (roomNumber % 5 === 0) && !isBossRoom;

  // [auto heal on shop entry]
  if (isShopRoom) {
    roomIsCleared = true;
    const healAmount = player.maxHealth * 0.5;
    player.health = Math.min(player.maxHealth, player.health + healAmount);
    shopHealMessage = "You were healed for " + Math.floor(healAmount) + " HP!";
  }

  // [spawn boss on boss room entry]
  if (isBossRoom) {
    boss = createBoss();
  }

  // Reset player position
  player.x = canvas.width / 2.08;
  player.y = canvas.height / 1.35;

  // Clear enemies and coins
  enemies.length = 0;
  coins.length = 0;
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

// [shop purchase handler]
window.addEventListener("keydown", (e) => {
  if (!shopOpen) return;
  const prices = getShopPrices();

  if (e.key === "1") {
    if (coinCount >= prices.damagePrice) {
      coinCount -= prices.damagePrice;
      player.damage = Math.floor(player.damage * 1.2);
    }
  }
  if (e.key === "2") {
    if (coinCount >= prices.healthPrice) {
      coinCount -= prices.healthPrice;
      player.maxHealth = Math.floor(player.maxHealth * 1.2);
      player.health = Math.min(player.health + player.maxHealth * 0.1, player.maxHealth);
    }
  }
  if (e.key === "3") {
    if (coinCount >= prices.speedPrice) {
      coinCount -= prices.speedPrice;
      player.speed = Math.min(parseFloat((player.speed * 1.2).toFixed(2)), player.maxSpeed);
    }
  }
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

    if (!isShopRoom) {

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
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const pushForce = enemy.speed + 3;
          enemy.x += (dx / dist) * pushForce;
          enemy.y += (dy / dist) * pushForce;
          const rawDamage = 0.3 + (roomNumber * 0.02);
          player.health -= Math.min(rawDamage, 0.7);
        }
      });

      // [boss movement]
      if (boss) {
        const dx = player.x - boss.x;
        const dy = player.y - boss.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        boss.x += (dx / dist) * boss.speed;
        boss.y += (dy / dist) * boss.speed;

        // [boss damage to player]
        if (rectsOverlap(player, boss)) {
          const dx = boss.x - player.x;
          const dy = boss.y - player.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const pushForce = boss.speed + 4;
          boss.x += (dx / dist) * pushForce;
          boss.y += (dy / dist) * pushForce;
          player.health -= boss.damage;       // [boss damage per tick]
        }

        // [boss minion spawn at 50% health]
        if (!bossMinionsSpawned && boss.health <= boss.maxHealth * 0.5) {
          spawnBossMinions();
          bossMinionsSpawned = true;
        }

        // [boss death]
        if (boss.health <= 0) {
          // Drop lots of coins
          for (let i = 0; i < boss.coinDrop; i++) {
            coins.push({
              x: boss.x + Math.random() * boss.width,
              y: boss.y + Math.random() * boss.height,
              width: 10,
              height: 10
            });
          }
          // Full heal on boss death
          player.health = player.maxHealth;
          boss = null;
          roomIsCleared = true;
        }
      }

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

        // [attack hits boss]
        if (boss && rectsOverlap(attackBox, boss)) {
          if (!player.attackHits.includes("boss")) {
            boss.health -= player.damage;
            player.attackHits.push("boss");
          }
        }

        // [enemy removal + coin drop]
        for (let i = enemies.length - 1; i >= 0; i--) {
          if (enemies[i].health <= 0) {
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
      const pickupRadius = 60;
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

      // [room clear check] only for non boss rooms
      if (!isBossRoom && enemies.length === 0 && !roomIsCleared) {
        roomIsCleared = true;
      }
    }

    // [shop proximity check]
    if (isShopRoom) {
      const px = player.x + player.width / 2;
      const py = player.y + player.height / 2;
      const sx = shopBox.x + shopBox.width / 2;
      const sy = shopBox.y + shopBox.height / 2;
      const dist = Math.sqrt((px - sx) ** 2 + (py - sy) ** 2);
      shopOpen = dist < shopProximity;
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

  // [draw boss]
  if (boss) {
    ctx.fillStyle = boss.color;
    ctx.fillRect(boss.x, boss.y, boss.width, boss.height);

    // Boss glow effect
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 3;
    ctx.strokeRect(boss.x, boss.y, boss.width, boss.height);
  }

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

  // [draw boss health bar] — bottom center above door
  if (boss) {
    const bBarW = 400;
    const bBarH = 30;
    const bBarX = canvas.width / 2 - bBarW / 2;
    const bBarY = canvas.height - 80;

    // Background
    ctx.fillStyle = "#1a0000";
    ctx.fillRect(bBarX, bBarY, bBarW, bBarH);

    // Health fill — turns orange at 50%, yellow at 25%
    const bossHpRatio = boss.health / boss.maxHealth;
    if (bossHpRatio > 0.5) {
      ctx.fillStyle = "#cc0000";
    } else if (bossHpRatio > 0.25) {
      ctx.fillStyle = "#cc6600";
    } else {
      ctx.fillStyle = "#cccc00";
    }
    ctx.fillRect(bBarX, bBarY, bBarW * bossHpRatio, bBarH);

    // Border
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 2;
    ctx.strokeRect(bBarX, bBarY, bBarW, bBarH);

    // Boss label
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 14px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("BOSS  " + Math.ceil(boss.health) + " / " + boss.maxHealth, canvas.width / 2, bBarY + bBarH - 8);
    ctx.textAlign = "left";
  }

  // [draw room cleared message]
  if (roomIsCleared && !isShopRoom) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.font = "bold 36px Courier New";
    ctx.textAlign = "center";
    ctx.fillText(isBossRoom ? "Boss Defeated!" : "Room Cleared!", canvas.width / 2, canvas.height / 2);
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

  // [draw shop box]
  if (isShopRoom) {
    ctx.drawImage(shopImage, shopBox.x - 100, shopBox.y - 50, 250, 200);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 20px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("SHOP", shopBox.x + shopBox.width / 2, shopBox.y - 55);
    ctx.textAlign = "left";
  }

  // [draw shop UI] — always on top
  if (shopOpen) {
    const prices = getShopPrices();
    const panelX = canvas.width / 2 - 220;
    const panelY = canvas.height / 2 - 200;
    const panelW = 440;
    const panelH = 320;

    ctx.fillStyle = "rgba(0, 0, 0, 0.88)";
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 24px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("SHOP", canvas.width / 2, panelY + 38);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "14px Courier New";
    ctx.fillText("Coins: " + coinCount, canvas.width / 2, panelY + 62);

    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 20, panelY + 72);
    ctx.lineTo(panelX + panelW - 20, panelY + 72);
    ctx.stroke();

    const canAffordDamage = coinCount >= prices.damagePrice;
    ctx.fillStyle = canAffordDamage ? "#ff6644" : "#666666";
    ctx.font = "bold 16px Courier New";
    ctx.fillText("[1] +20% Damage — " + prices.damagePrice + " coins", canvas.width / 2, panelY + 108);

    const canAffordHealth = coinCount >= prices.healthPrice;
    ctx.fillStyle = canAffordHealth ? "#4488ff" : "#666666";
    ctx.fillText("[2] +20% Max HP — " + prices.healthPrice + " coins", canvas.width / 2, panelY + 150);

    const canAffordSpeed = coinCount >= prices.speedPrice;
    const speedCapped = player.speed >= player.maxSpeed;
    ctx.fillStyle = canAffordSpeed && !speedCapped ? "#00ff88" : "#666666";
    ctx.fillText(
      speedCapped ? "[3] Speed MAX" : "[3] +20% Speed — " + prices.speedPrice + " coins",
      canvas.width / 2, panelY + 192
    );

    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 20, panelY + 210);
    ctx.lineTo(panelX + panelW - 20, panelY + 210);
    ctx.stroke();

    ctx.fillStyle = "#aaffaa";
    ctx.font = "14px Courier New";
    ctx.fillText(shopHealMessage, canvas.width / 2, panelY + 240);

    ctx.fillStyle = "#888888";
    ctx.font = "13px Courier New";
    ctx.fillText("Press 1, 2 or 3 to buy. Walk away to close.", canvas.width / 2, panelY + 290);
    ctx.textAlign = "left";
  }

  // [draw fade overlay] — always last
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
  new Promise(res => healthBarFull.onload = res),
  new Promise(res => shopImage.onload = res)
]).then(() => {
  gameLoop();
});
