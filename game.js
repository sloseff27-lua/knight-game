// ============================================================
// CANVAS SETUP
// ============================================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ============================================================
// DEV FLAGS
// ============================================================
// [dev] set to true to disable death during testing
const DEV_IMMORTAL = false;

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

// [death screen image]
const deathScreen = new Image();
deathScreen.src = "UserInterface/DeathScreen.png";

// [menu screen image]
const menuScreen = new Image();
menuScreen.src = "UserInterface/MenuScreen.png";

// [shop panel image]
const shopPanel = new Image();
shopPanel.src = "UserInterface/ShopPanel.png";

// ============================================================
// GAME STATE
// ============================================================
// [game state vars]
let gameState = "menu"; // [game state] "menu" | "playing" | "dead"
let deathScreenTimer = 0;  // [death screen cooldown] blocks restart input
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
// PLAYER BASE STATS
// ============================================================
// [player base stats]
const playerBase = {
  damage: 50,
  maxHealth: 100,
  speed: 4
};

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
let bossMinionsSpawned75 = false;
let bossMinionsSpawned50 = false;

// [boss charge state]
let bossChargeState = "idle";
let bossChargeTimer = 0;
let bossChargeCooldown = 0;
let bossChargeTargetX = 0;
let bossChargeTargetY = 0;
let bossTelegraphFlash = 0;
let bossChargeDamageDealt = false;

// [boss aoe state]
let bossAoeState = "idle";
let bossAoeRadius = 0;
let bossAoeMaxRadius = 300;   // [aoe size]
let bossAoeCenterX = 0;
let bossAoeCenterY = 0;
let bossAoeDamageDealt = false;

// [boss dash cooldown] returns frames to wait
function getChargeCooldown() {
  const isEnraged = boss && boss.health <= boss.maxHealth * 0.25;
  const min = isEnraged ? 140 : 220;
  const max = isEnraged ? 40 : 80;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createBoss() {
  return {
    x: canvas.width / 2 - 60,
    y: canvas.height / 2 - 200,
    width: 120,
    height: 120,
    speed: 0.8,
    baseSpeed: 0.8,
    color: "#8B0000",
    health: 300 + (roomNumber * 20),
    maxHealth: 300 + (roomNumber * 20),
    damage: 1.5,
    coinDrop: 20 + roomNumber
  };
}

// [spawn boss minions]
function spawnBossMinions() {
  const minionCount = Math.floor(Math.random() * 8) + 8; // [minion count] 8-15
  const minionSpeed = (1.5 + (roomNumber * 0.1)) * 0.5;
  const minionHealth = (60 + (roomNumber * 10)) * 0.5;

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
      width: 25,
      height: 25,
      speed: minionSpeed,
      color: "#cc4400",
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
  // [enemy health]
  const enemyHealth = 15 + (roomNumber * 10);

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
  bossMinionsSpawned75 = false;
  bossMinionsSpawned50 = false;
  bossChargeState = "idle";
  bossChargeTimer = 0;
  bossAoeState = "idle";
  bossAoeRadius = 0;
  bossAoeDamageDealt = false;
  bossChargeDamageDealt = false;

  // [boss frequency] [shop frequency]
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
    bossChargeCooldown = 60;
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
// RESTART
// ============================================================
// [restart game]
function restartGame() {
  player.x = canvas.width / 2.08;
  player.y = canvas.height / 1.35;
  player.health = 100;
  player.maxHealth = 100;
  player.damage = 25;
  player.speed = 4;
  player.attackTimer = 0;
  player.attackCooldown = 0;
  player.attackHits = [];

  roomNumber = 1;
  roomIsCleared = false;
  isShopRoom = false;
  isBossRoom = false;
  shopOpen = false;
  shopHealMessage = "";
  coinCount = 0;
  boss = null;
  bossMinionsSpawned75 = false;
  bossMinionsSpawned50 = false;
  bossChargeState = "idle";
  bossChargeTimer = 0;
  bossChargeCooldown = 0;
  bossAoeState = "idle";
  bossAoeRadius = 0;
  bossAoeDamageDealt = false;
  bossChargeDamageDealt = false;
  fading = false;
  fadeAlpha = 0;

  enemies.length = 0;
  coins.length = 0;
  spawnEnemies();

  gameState = "playing";
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

// [menu + restart handler]
window.addEventListener("keydown", (e) => {
  if (gameState === "menu") {
    gameState = "playing";
  } else if (gameState === "dead" && deathScreenTimer <= 0) {
    restartGame();
  }
});

// [shop purchase handler]
window.addEventListener("keydown", (e) => {
  if (!shopOpen) return;
  const prices = getShopPrices();

  // [shop multiplier damage]
  if (e.key === "1") {
    if (coinCount >= prices.damagePrice) {
      coinCount -= prices.damagePrice;
      player.damage = Math.floor(player.damage * 1.5);
    }
  }
  // [shop multiplier health]
  if (e.key === "2") {
    if (coinCount >= prices.healthPrice) {
      coinCount -= prices.healthPrice;
      player.maxHealth = Math.floor(player.maxHealth * 1.5);
      player.health = Math.min(player.health + player.maxHealth * 0.1, player.maxHealth);
    }
  }
  // [shop multiplier speed]
  if (e.key === "3") {
    if (coinCount >= prices.speedPrice) {
      coinCount -= prices.speedPrice;
      player.speed = Math.min(parseFloat((player.speed * 1.3).toFixed(2)), player.maxSpeed);
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

  // [menu gate]
  if (gameState === "menu") return;

  // [death gate] freeze all logic when dead
  if (gameState === "dead") {
    if (deathScreenTimer > 0) deathScreenTimer--;
    return;
  }

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

      // --------------------------------------------------------
      // BOSS LOGIC
      // --------------------------------------------------------
      if (boss) {
        const isEnraged = boss.health <= boss.maxHealth * 0.5;

        // [boss enrage]
        if (isEnraged) {
          boss.speed = boss.baseSpeed * 4;
          boss.damage = 3;
          boss.color = "#ff0000";
        }

        // ---- ATTACK DECISION ----
        if (bossChargeState === "idle" && bossAoeState === "idle") {
          bossChargeCooldown--;
          if (bossChargeCooldown <= 0) {
            const pdx = player.x + player.width / 2 - (boss.x + boss.width / 2);
            const pdy = player.y + player.height / 2 - (boss.y + boss.height / 2);
            const distToPlayer = Math.sqrt(pdx * pdx + pdy * pdy);

            if (distToPlayer < 200) {
              bossAoeState = "expanding";
              bossAoeRadius = 0;
              bossAoeCenterX = boss.x + boss.width / 2;
              bossAoeCenterY = boss.y + boss.height / 2;
              bossAoeDamageDealt = false;
              bossChargeCooldown = getChargeCooldown();
            } else {
              bossChargeTargetX = player.x;
              bossChargeTargetY = player.y;
              bossChargeState = "telegraphing";
              bossChargeTimer = 28;
              bossTelegraphFlash = 0;
              bossChargeDamageDealt = false;
              bossChargeCooldown = getChargeCooldown();
            }
          }
        }

        // ---- CHARGE STATES ----
        if (bossChargeState === "telegraphing") {
          bossChargeTimer--;
          bossTelegraphFlash++;
          if (bossChargeTimer <= 0) {
            bossChargeState = "dashing";
            bossChargeTimer = 30;
          }
        }

        if (bossChargeState === "dashing") {
          bossChargeTimer--;
          const dx = bossChargeTargetX - boss.x;
          const dy = bossChargeTargetY - boss.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          boss.x += (dx / dist) * 60;
          boss.y += (dy / dist) * 60;

          if (!bossChargeDamageDealt && rectsOverlap(player, boss)) {
            player.health -= player.maxHealth * 0.4;
            bossChargeDamageDealt = true;
            bossChargeState = "cooldown";
            bossChargeTimer = 40;
          }

          if (bossChargeTimer <= 0) {
            bossChargeState = "cooldown";
            bossChargeTimer = 40;
          }
        }

        if (bossChargeState === "cooldown") {
          bossChargeTimer--;
          if (bossChargeTimer <= 0) {
            bossChargeState = "idle";
          }
        }

        // ---- AOE STATES ----
        if (bossAoeState === "expanding") {
          bossAoeRadius += 4;

          if (!bossAoeDamageDealt) {
            const px = player.x + player.width / 2;
            const py = player.y + player.height / 2;
            const distToCenter = Math.sqrt(
              (px - bossAoeCenterX) ** 2 +
              (py - bossAoeCenterY) ** 2
            );
            if (bossAoeRadius >= distToCenter - 20 && bossAoeRadius <= distToCenter + 20) {
              player.health -= player.maxHealth * 0.25;
              bossAoeDamageDealt = true;
            }
          }

          if (bossAoeRadius >= bossAoeMaxRadius) {
            bossAoeState = "idle";
            bossAoeRadius = 0;
            bossChargeCooldown = getChargeCooldown();
          }
        }

        // [boss normal movement]
        if (bossChargeState === "idle" || bossChargeState === "cooldown") {
          if (bossAoeState === "idle") {
            const dx = player.x - boss.x;
            const dy = player.y - boss.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            boss.x += (dx / dist) * boss.speed;
            boss.y += (dy / dist) * boss.speed;
          }
        }

        // [boss contact damage]
        if (bossChargeState !== "dashing" && rectsOverlap(player, boss)) {
          const dx = boss.x - player.x;
          const dy = boss.y - player.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          boss.x += (dx / dist) * (boss.speed + 4);
          boss.y += (dy / dist) * (boss.speed + 4);
          player.health -= boss.damage;
        }

        // [boss minion spawn at 75%]
        if (!bossMinionsSpawned75 && boss.health <= boss.maxHealth * 0.75) {
          spawnBossMinions();
          bossMinionsSpawned75 = true;
        }

        // [boss minion spawn at 50%]
        if (!bossMinionsSpawned50 && boss.health <= boss.maxHealth * 0.50) {
          spawnBossMinions();
          bossMinionsSpawned50 = true;
        }

        // [boss death]
        if (boss.health <= 0) {
          for (let i = 0; i < boss.coinDrop; i++) {
            coins.push({
              x: boss.x + Math.random() * boss.width,
              y: boss.y + Math.random() * boss.height,
              width: 10,
              height: 10
            });
          }
          player.health = player.maxHealth;
          boss = null;
          bossAoeState = "idle";
          bossChargeState = "idle";
          roomIsCleared = true;
        }
      }

      // [health clamp]
      if (DEV_IMMORTAL) {
        player.health = Math.max(1, player.health);
      } else {
        player.health = Math.max(0, player.health);
        // [death check]
        if (player.health <= 0) {
          gameState = "dead";
          deathScreenTimer = 120;
          return;
        }
      }

      // [player facing]
      if (keys["w"] || keys["ArrowUp"])    player.facing = "up";
      if (keys["s"] || keys["ArrowDown"])  player.facing = "down";
      if (keys["a"] || keys["ArrowLeft"])  player.facing = "left";
      if (keys["d"] || keys["ArrowRight"]) player.facing = "right";

      // [attack input]
      if ((keys[" "] || keys["click"]) && player.attackCooldown <= 0) {
        player.attackTimer = 8;
        player.attackCooldown = 25;
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

      // [room clear check]
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

  // [draw menu screen] — first so return skips everything else
  if (gameState === "menu") {
    ctx.drawImage(menuScreen, 0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, canvas.height - 80, canvas.width, 80);

    const pulse = 0.6 + Math.sin(Date.now() / 500) * 0.4;
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(255, 220, 100, ${pulse})`;
    ctx.font = "bold 26px Courier New";
    ctx.fillText("Press any key to Play", canvas.width / 2, canvas.height - 30);
    ctx.textAlign = "left";
    return;
  }

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
    const isEnraged = boss.health <= boss.maxHealth * 0.25;

    ctx.fillStyle = boss.color;
    ctx.fillRect(boss.x, boss.y, boss.width, boss.height);

    ctx.strokeStyle = isEnraged ? "#ffff00" : "#ff0000";
    ctx.lineWidth = isEnraged ? 5 : 3;
    ctx.strokeRect(boss.x, boss.y, boss.width, boss.height);

    // [telegraph outline]
    if (bossChargeState === "telegraphing") {
      const flashOn = Math.floor(bossTelegraphFlash / 3) % 2 === 0;
      if (flashOn) {
        ctx.fillStyle = "rgba(255, 0, 0, 0.25)";
        ctx.fillRect(bossChargeTargetX - 30, bossChargeTargetY - 30, player.width + 60, player.height + 60);
        ctx.strokeStyle = "rgba(255, 0, 0, 0.9)";
        ctx.lineWidth = 2;
        ctx.strokeRect(bossChargeTargetX - 30, bossChargeTargetY - 30, player.width + 60, player.height + 60);
      }
    }

    // [draw aoe ring]
    if (bossAoeState === "expanding" && bossAoeCenterX && bossAoeCenterY) {
      const alpha = Math.max(0, 1 - (bossAoeRadius / bossAoeMaxRadius));

      ctx.save();
      ctx.beginPath();
      ctx.arc(bossAoeCenterX, bossAoeCenterY, Math.max(1, bossAoeRadius), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 80, 0, ${alpha})`;
      ctx.lineWidth = 8;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(bossAoeCenterX, bossAoeCenterY, Math.max(1, bossAoeRadius - 6), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 200, 0, ${alpha * 0.5})`;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }

    // DEBUG: show attack info
    const pdx = player.x + player.width / 2 - (boss.x + boss.width / 2);
    const pdy = player.y + player.height / 2 - (boss.y + boss.height / 2);
    const distToPlayer = Math.sqrt(pdx * pdx + pdy * pdy);
    ctx.fillStyle = "#ffffff";
    ctx.font = "14px Arial";
    ctx.fillText("Boss dist: " + Math.floor(distToPlayer), 20, canvas.height - 120);
    ctx.fillText("Charge state: " + bossChargeState, 20, canvas.height - 100);
    ctx.fillText("AOE state: " + bossAoeState, 20, canvas.height - 80);
    ctx.fillText("Cooldown: " + bossChargeCooldown, 20, canvas.height - 60);
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

  // [draw stats display] top right
  const dmgPct = Math.round(((player.damage - playerBase.damage) / playerBase.damage) * 100);
  const hpPct  = Math.round(((player.maxHealth - playerBase.maxHealth) / playerBase.maxHealth) * 100);
  const spdPct = Math.round(((player.speed - playerBase.speed) / playerBase.speed) * 100);

  const statsX = canvas.width - 220;
  const statsY = 20;

  ctx.font = "bold 15px Courier New";
  ctx.fillStyle = "#ff6644";
  ctx.fillText("ATK: " + player.damage + (dmgPct > 0 ? " (+" + dmgPct + "%)" : ""), statsX, statsY + 20);
  ctx.fillStyle = "#4488ff";
  ctx.fillText("HP:  " + player.maxHealth + (hpPct > 0 ? " (+" + hpPct + "%)" : ""), statsX, statsY + 45);
  ctx.fillStyle = "#00ff88";
  ctx.fillText("SPD: " + player.speed.toFixed(1) + (spdPct > 0 ? " (+" + spdPct + "%)" : ""), statsX, statsY + 70);

  // [draw boss health bar] bottom center
  if (boss) {
    const bBarW = 400;
    const bBarH = 30;
    const bBarX = canvas.width / 2 - bBarW / 2;
    const bBarY = canvas.height - 80;

    ctx.fillStyle = "#1a0000";
    ctx.fillRect(bBarX, bBarY, bBarW, bBarH);

    const bossHpRatio = boss.health / boss.maxHealth;
    ctx.fillStyle = bossHpRatio > 0.5 ? "#cc0000" : bossHpRatio > 0.25 ? "#cc6600" : "#ffff00";
    ctx.fillRect(bBarX, bBarY, bBarW * bossHpRatio, bBarH);

    ctx.strokeStyle = bossHpRatio <= 0.25 ? "#ffff00" : "#ff0000";
    ctx.lineWidth = 2;
    ctx.strokeRect(bBarX, bBarY, bBarW, bBarH);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 14px Courier New";
    ctx.textAlign = "center";
    ctx.fillText(
      (bossHpRatio <= 0.25 ? "⚠ ENRAGED ⚠  " : "BOSS  ") +
      Math.ceil(boss.health) + " / " + boss.maxHealth,
      canvas.width / 2, bBarY + bBarH - 8
    );
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

  // [draw shop UI] always on top
  if (shopOpen) {
    const prices = getShopPrices();

    const panelW = 420;
    const panelH = 520;
    const panelX = canvas.width / 2 - panelW / 2;
    const panelY = canvas.height / 2 - panelH / 2;

    ctx.drawImage(shopPanel, panelX, panelY, panelW, panelH);

    ctx.textAlign = "center";

    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 16px Courier New";
    ctx.fillText("Coins: " + coinCount, canvas.width / 2, panelY + 130);

    const canAffordDamage = coinCount >= prices.damagePrice;
    ctx.fillStyle = canAffordDamage ? "#ff6644" : "#666666";
    ctx.font = "bold 16px Courier New";
    ctx.fillText("[1] +50% Damage — " + prices.damagePrice + " coins", canvas.width / 2, panelY + 190);

    const canAffordHealth = coinCount >= prices.healthPrice;
    ctx.fillStyle = canAffordHealth ? "#4488ff" : "#666666";
    ctx.fillText("[2] +50% Max HP — " + prices.healthPrice + " coins", canvas.width / 2, panelY + 250);

    const canAffordSpeed = coinCount >= prices.speedPrice;
    const speedCapped = player.speed >= player.maxSpeed;
    ctx.fillStyle = canAffordSpeed && !speedCapped ? "#00ff88" : "#666666";
    ctx.fillText(
      speedCapped ? "[3] Speed MAX" : "[3] +30% Speed — " + prices.speedPrice + " coins",
      canvas.width / 2, panelY + 310
    );

    ctx.fillStyle = "#aaffaa";
    ctx.font = "14px Courier New";
    ctx.fillText(shopHealMessage, canvas.width / 2, panelY + 390);

    ctx.fillStyle = "#888888";
    ctx.font = "13px Courier New";
    ctx.fillText("Press 1, 2 or 3 to buy. Walk away to close.", canvas.width / 2, panelY + 460);

    ctx.textAlign = "left";
  }

  // [draw death screen]
  if (gameState === "dead") {
    ctx.drawImage(deathScreen, 0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, canvas.height - 70, canvas.width, 70);

    ctx.textAlign = "center";
    ctx.fillStyle = "#888888";
    ctx.font = "18px Courier New";
    ctx.fillText("Reached Room " + roomNumber + "   |   Press any key to Restart", canvas.width / 2, canvas.height - 28);
    ctx.textAlign = "left";
  }

  // [draw fade overlay] always last
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
  new Promise(res => shopImage.onload = res),
  new Promise(res => deathScreen.onload = res),
  new Promise(res => menuScreen.onload = res),
  new Promise(res => shopPanel.onload = res)
]).then(() => {
  gameLoop();
});
