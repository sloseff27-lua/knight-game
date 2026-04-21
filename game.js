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
const DEV_IMMORTAL = false; // [dev] set true to disable death during testing

// ============================================================
// ASSETS
// ============================================================
const roomBackground = new Image();
roomBackground.src = "RoomImages/DungeonRoom1.png";

const roomCleared = new Image();
roomCleared.src = "RoomImages/ClearedDungeonRoom1.png";

const healthBarEmpty = new Image();
healthBarEmpty.src = "UserInterface/EmptyHealthBar.png";

const healthBarFull = new Image();
healthBarFull.src = "UserInterface/FullHealthBar.png";

const shopImage = new Image();
shopImage.src = "UserInterface/MerchantTable.png";

const deathScreen = new Image();
deathScreen.src = "UserInterface/DeathScreen.png";

const menuScreen = new Image();
menuScreen.src = "UserInterface/MenuScreen.png";

const shopPanel = new Image();
shopPanel.src = "UserInterface/ShopPanel.png";

// ============================================================
// GAME STATE
// ============================================================
let gameState = "menu"; // "menu" | "playing" | "dead"
let deathScreenTimer = 0;
let roomNumber = 1;
let roomIsCleared = false;
let fadeAlpha = 0;
let fading = false;
let fadeDirection = "out";
let isShopRoom = false;
let isBossRoom = false;
let shopOpen = false;
let shopHealMessage = "";

// [projectiles] — enemy ranged shots
const projectiles = [];

// [boss 2 projectiles]
const boss2Projectiles = [];

// ============================================================
// PLAYER BASE STATS
// ============================================================
const playerBase = {
  damage: 30,
  maxHealth: 100,
  speed: 4
};

// ============================================================
// PLAYER OBJECT
// ============================================================
const player = {
  x: canvas.width / 2.08,
  y: canvas.height / 1.35,
  width: 50,
  height: 50,
  speed: 4,             // [player speed]
  maxSpeed: 13,         // [player speed cap]
  color: "slategray",
  health: 100,
  maxHealth: 100,
  facing: "right",
  attackTimer: 0,
  attackCooldown: 0,
  attackHits: [],
  damage: 30            // [player damage]
};

// ============================================================
// COIN SYSTEM
// ============================================================
const coins = [];
let coinCount = 0;

// ============================================================
// SHOP SYSTEM
// ============================================================
const shopBox = {
  x: canvas.width / 2 - 25,
  y: canvas.height / 2 - 25,
  width: 50,
  height: 50
};
const shopProximity = 150;

function getShopPrices() {
  const shopNumber = Math.floor(roomNumber / 5);
  const multiplier = 1 + (shopNumber * 0.5);
  return {
    damagePrice: Math.floor(8 * multiplier),
    healthPrice: Math.floor(12 * multiplier),
    speedPrice:  Math.floor(8 * multiplier)
  };
}

// ============================================================
// BOSS 1 SYSTEM
// ============================================================
let boss = null;
let bossMinionsSpawned75 = false;
let bossMinionsSpawned50 = false;

let bossChargeState = "idle";
let bossChargeTimer = 0;
let bossChargeCooldown = 0;
let bossChargeTargetX = 0;
let bossChargeTargetY = 0;
let bossTelegraphFlash = 0;
let bossChargeDamageDealt = false;

let bossAoeState = "idle";
let bossAoeRadius = 0;
let bossAoeMaxRadius = 300;  // [boss1 aoe size]
let bossAoeCenterX = 0;
let bossAoeCenterY = 0;
let bossAoeDamageDealt = false;

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
    health: Math.floor(280 + roomNumber * 20),    // [boss1 health]
    maxHealth: Math.floor(280 + roomNumber * 20),
    damage: 1.5,        // [boss1 contact damage per frame]
    dashDamage: 0.4,    // [boss1 dash damage] % of player max HP
    aoeDamage: 0.25,    // [boss1 aoe damage] % of player max HP
    coinDrop: 20 + roomNumber,
    type: "boss1"
  };
}

function spawnBossMinions() {
  const minionCount = Math.floor(Math.random() * 5) + 5;
  const minionSpeed = (1.5 + (roomNumber * 0.1)) * 0.5;
  const minionHealth = 20 + roomNumber * 3;

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
      x: ex, y: ey,
      width: 25, height: 25,
      speed: minionSpeed,
      color: "#cc4400",
      health: minionHealth,
      type: "common"
    });
  }
}

// ============================================================
// BOSS 2 SYSTEM
// ============================================================
let boss2ShootTimer = 0;
let boss2ShootCooldown = 80;     // [boss2 shoot cooldown] frames between shots
let boss2RainTimer = 0;
let boss2RainCooldown = 240;     // [boss2 rain cooldown] 4 seconds at 60fps
let boss2RainWarnings = [];
let boss2BeamState = "idle";     // "idle" | "windup" | "firing" | "stunned"
let boss2BeamTimer = 0;
let boss2BeamCooldown = 0;
let boss2BeamX = 0;
let boss2BeamY = 0;
let boss2BeamDamageDealt = false;
const BOSS2_RAIN_RADIUS = 100;   // [magic rain radius]

function createBoss2() {
  return {
    x: canvas.width / 2 - 60,
    y: canvas.height / 2 - 200,
    width: 120,
    height: 120,
    speed: 1.2,
    baseSpeed: 1.2,
    color: "#4400aa",
    health: Math.floor(300 * Math.pow(2.8, roomNumber / 10)),   // [boss2 health]
    maxHealth: Math.floor(300 * Math.pow(2.8, roomNumber / 10)),
    damage: 1.2,           // [boss2 contact damage per frame]
    projectileDamage: 8,   // [boss2 projectile base damage]
    rainDamage: 0.5,       // [boss2 rain damage per frame inside circle]
    beamDamage: 0.8,       // [boss2 beam damage] % of player max HP
    coinDrop: 25 + roomNumber,
    type: "boss2"          // [boss 2 name]
  };
}

function spawnBoss2Minions() {
  const minionCount = Math.floor(Math.random() * 4) + 4;
  const minionSpeed = (1.5 + (roomNumber * 0.1)) * 0.5;
  const minionHealth = (60 + (roomNumber * 10)) * 0.4;

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
      x: ex, y: ey,
      width: 30, height: 30,
      speed: minionSpeed,
      color: "#aa44ff",
      health: minionHealth,
      type: "ranged",
      shootTimer: 0,
      shootCooldown: 140
    });
  }
}

// ============================================================
// ENEMY SYSTEM
// ============================================================
const enemies = [];

function spawnEnemies() {
  if (isShopRoom || isBossRoom) return;

  const minDistFromPlayer = 200;
  const totalCap = 10;

  const enemySpeed  = 1.5 + (roomNumber * 0.1);
  const enemyHealth = 20 + (roomNumber * 5);

  // [enemy counts per type]
  const commonCount  = Math.min(3 + Math.floor(roomNumber * 0.4), 4);
  const tankCount    = Math.min(Math.floor(roomNumber / 4), 3);
  const speederCount = Math.min(Math.floor(roomNumber / 3), 3);
  const rangedCount  = Math.min(Math.floor(roomNumber / 4), 3);

  const spawnList = [];
  for (let i = 0; i < commonCount; i++)  spawnList.push("common");
  for (let i = 0; i < tankCount; i++)    spawnList.push("tank");
  for (let i = 0; i < speederCount; i++) spawnList.push("speeder");
  for (let i = 0; i < rangedCount; i++)  spawnList.push("ranged");

  // [shuffle so ranged aren't starved by slice]
  const finalList = spawnList.sort(() => Math.random() - 0.5).slice(0, totalCap);

  finalList.forEach(type => {
    let ex, ey, attempts = 0;
    do {
      ex = Math.random() * (canvas.width - 550) + 275;
      ey = Math.random() * (canvas.height - 340) + 180;
      attempts++;
    } while (
      Math.sqrt((ex - player.x) ** 2 + (ey - player.y) ** 2) < minDistFromPlayer
      && attempts < 20
    );

    if (type === "common") {
      enemies.push({
        x: ex, y: ey, width: 40, height: 40,
        speed: enemySpeed,
        color: "crimson",
        health: enemyHealth,
        type: "common"
      });
    } else if (type === "tank") {
      // [tank config]
      enemies.push({
        x: ex, y: ey, width: 55, height: 55,
        speed: enemySpeed * 0.5,
        color: "#8B0000",
        health: enemyHealth * 3,
        type: "tank"
      });
    } else if (type === "speeder") {
      // [speeder config]
      enemies.push({
        x: ex, y: ey, width: 25, height: 25,
        speed: enemySpeed * 2,
        color: "#ff8800",
        health: enemyHealth * 0.3,
        type: "speeder"
      });
    } else if (type === "ranged") {
      // [ranged config]
      enemies.push({
        x: ex, y: ey, width: 35, height: 35,
        speed: enemySpeed * 0.8,
        color: "#66ccff",
        health: enemyHealth * 0.9,
        type: "ranged",
        shootTimer: 0,
        shootCooldown: 150   // [ranged shoot cooldown]
      });
    }
  });
}

// ============================================================
// DOOR DETECTION ZONE
// ============================================================
const exitDoor = {
  x: canvas.width / 2 - 60,
  y: 150,
  width: 120,
  height: 40
};

// ============================================================
// ROOM TRANSITION
// ============================================================
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

  if (isShopRoom) {
    roomIsCleared = true;
    const healAmount = player.maxHealth * 0.5;
    player.health = Math.min(player.maxHealth, player.health + healAmount);
    shopHealMessage = "You were healed for " + Math.floor(healAmount) + " HP!";
  }

  if (isBossRoom) {
    // [boss rotation] 0=boss1 Warden, 1=boss2 Archmage, repeats
    const bossType = Math.floor(roomNumber / 10) % 2;
    boss = bossType === 1 ? createBoss2() : createBoss();
    bossChargeCooldown = 60;
    boss2ShootTimer = 0;
    boss2RainTimer = 0;
    boss2RainWarnings = [];
    boss2BeamState = "idle";
    boss2BeamTimer = 0;
    boss2BeamCooldown = 180;
    boss2BeamDamageDealt = false;
    boss2Projectiles.length = 0;
  }

  player.x = canvas.width / 2.08;
  player.y = canvas.height / 1.35;

  enemies.length = 0;
  coins.length = 0;
  projectiles.length = 0;
  boss2Projectiles.length = 0;
  boss2RainWarnings = [];
  spawnEnemies();
}

// ============================================================
// RESTART
// ============================================================
function restartGame() {
  player.x = canvas.width / 2.08;
  player.y = canvas.height / 1.35;
  player.health = 100;
  player.maxHealth = 100;
  player.damage = 30;      // [player starting damage]
  player.speed = 4;        // [player starting speed]
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
  projectiles.length = 0;
  boss2Projectiles.length = 0;
  boss2RainWarnings = [];
  boss2BeamState = "idle";
  boss2BeamTimer = 0;
  boss2ShootTimer = 0;
  boss2RainTimer = 0;

  spawnEnemies();
  gameState = "playing";
}

// ============================================================
// INPUT HANDLING
// ============================================================
const keys = {};
window.addEventListener("keydown", (e) => { keys[e.key] = true; });
window.addEventListener("keyup",   (e) => { keys[e.key] = false; });
window.addEventListener("mousedown", (e) => { if (e.button === 0) keys["click"] = true; });
window.addEventListener("mouseup",   (e) => { if (e.button === 0) keys["click"] = false; });

// [menu + restart handler]
window.addEventListener("keydown", (e) => {
  if (gameState === "menu") {
    restartGame();
  } else if (gameState === "dead" && deathScreenTimer <= 0) {
    restartGame();
  }
});

// [shop purchase handler]
window.addEventListener("keydown", (e) => {
  if (!shopOpen) return;
  const prices = getShopPrices();
  if (e.key === "1" && coinCount >= prices.damagePrice) {
    coinCount -= prices.damagePrice;
    player.damage = Math.floor(player.damage * 1.25); // [shop damage multiplier]
  }
  if (e.key === "2" && coinCount >= prices.healthPrice) {
    coinCount -= prices.healthPrice;
    player.maxHealth = Math.floor(player.maxHealth * 1.25); // [shop health multiplier]
    player.health = player.maxHealth;
  }
  if (e.key === "3" && coinCount >= prices.speedPrice) {
    coinCount -= prices.speedPrice;
    player.speed = Math.min(parseFloat((player.speed * 1.25).toFixed(2)), player.maxSpeed); // [shop speed multiplier]
  }
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

  if (gameState === "menu") return;

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
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        if (enemy.type === "ranged") {
          const preferredDist = 300;  // [ranged preferred distance]
          if (dist > preferredDist + 40) {
            enemy.x += (dx / dist) * enemy.speed;
            enemy.y += (dy / dist) * enemy.speed;
          } else if (dist < preferredDist - 40) {
            enemy.x -= (dx / dist) * enemy.speed;
            enemy.y -= (dy / dist) * enemy.speed;
            enemy.x = Math.max(260, Math.min(canvas.width - enemy.width - 260, enemy.x));
            enemy.y = Math.max(170, Math.min(canvas.height - enemy.height - 140, enemy.y));
          }

          // [ranged shoot]
          enemy.shootTimer--;
          if (enemy.shootTimer <= 0) {
            enemy.shootTimer = enemy.shootCooldown;
            projectiles.push({
              x: enemy.x + enemy.width / 2,
              y: enemy.y + enemy.height / 2,
              vx: (dx / dist) * 4,  // [ranged projectile speed]
              vy: (dy / dist) * 4,
              width: 10, height: 10
            });
          }
        } else {
          enemy.x += (dx / dist) * enemy.speed;
          enemy.y += (dy / dist) * enemy.speed;
        }
      });

      // [enemy damage to player]
      enemies.forEach(enemy => {
        if (enemy.type === "ranged") return;
        if (rectsOverlap(player, enemy)) {
          const dx = enemy.x - player.x;
          const dy = enemy.y - player.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          enemy.x += (dx / dist) * (enemy.speed + 3);
          enemy.y += (dy / dist) * (enemy.speed + 3);

          let rawDamage;
          if (enemy.type === "tank") {
            rawDamage = 1.5 + (roomNumber * 0.2);   // [tank damage]
          } else if (enemy.type === "speeder") {
            rawDamage = 0.2 + (roomNumber * 0.05);  // [speeder damage]
          } else {
            rawDamage = 0.5 + (roomNumber * 0.1);   // [common damage]
          }
          player.health -= rawDamage;
        }
      });

      // [projectile movement + player hit]
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
          projectiles.splice(i, 1);
          continue;
        }
        if (rectsOverlap(p, player)) {
          player.health -= 8 + (roomNumber * 0.4);  // [ranged projectile damage]
          projectiles.splice(i, 1);
        }
      }

      // --------------------------------------------------------
      // BOSS 1 LOGIC
      // --------------------------------------------------------
      if (boss && boss.type === "boss1") {
        const isEnraged = boss.health <= boss.maxHealth * 0.5;

        if (isEnraged) {
          boss.speed = boss.baseSpeed * 4;
          boss.damage = 3;         // [boss1 enraged contact damage]
          boss.color = "#ff0000";
        }

        // ---- ATTACK DECISION ----
        if (bossChargeState === "idle" && bossAoeState === "idle") {
          bossChargeCooldown--;
          if (bossChargeCooldown <= 0) {
            const pdx = player.x + player.width / 2 - (boss.x + boss.width / 2);
            const pdy = player.y + player.height / 2 - (boss.y + boss.height / 2);
            const distToPlayer = Math.sqrt(pdx * pdx + pdy * pdy) || 1;

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
          boss.x += (dx / dist) * 60;  // [boss1 dash speed]
          boss.y += (dy / dist) * 60;

          if (!bossChargeDamageDealt && rectsOverlap(player, boss)) {
            player.health -= player.maxHealth * boss.dashDamage;  // [boss1 dash damage]
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
          if (bossChargeTimer <= 0) bossChargeState = "idle";
        }

        if (bossAoeState === "expanding") {
          bossAoeRadius += 4;  // [boss1 aoe expansion speed]
          if (!bossAoeDamageDealt) {
            const px = player.x + player.width / 2;
            const py = player.y + player.height / 2;
            const distToCenter = Math.sqrt(
              (px - bossAoeCenterX) ** 2 + (py - bossAoeCenterY) ** 2
            );
            if (bossAoeRadius >= distToCenter - 20 && bossAoeRadius <= distToCenter + 20) {
              player.health -= player.maxHealth * boss.aoeDamage;  // [boss1 aoe damage]
              bossAoeDamageDealt = true;
            }
          }
          if (bossAoeRadius >= bossAoeMaxRadius) {
            bossAoeState = "idle";
            bossAoeRadius = 0;
            bossChargeCooldown = getChargeCooldown();
          }
        }

        // [boss1 normal movement]
        if (bossChargeState === "idle" || bossChargeState === "cooldown") {
          if (bossAoeState === "idle") {
            const dx = player.x - boss.x;
            const dy = player.y - boss.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            boss.x += (dx / dist) * boss.speed;
            boss.y += (dy / dist) * boss.speed;
          }
        }

        // [boss1 contact damage]
        if (bossChargeState !== "dashing" && rectsOverlap(player, boss)) {
          const dx = boss.x - player.x;
          const dy = boss.y - player.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          boss.x += (dx / dist) * (boss.speed + 4);
          boss.y += (dy / dist) * (boss.speed + 4);
          player.health -= boss.damage;
        }

        // [boss1 minion spawns] — checked BEFORE death so they always fire
        if (!bossMinionsSpawned75 && boss.health > 0 && boss.health <= boss.maxHealth * 0.75) {
          spawnBossMinions();
          bossMinionsSpawned75 = true;
        }
        if (!bossMinionsSpawned50 && boss.health > 0 && boss.health <= boss.maxHealth * 0.50) {
          spawnBossMinions();
          bossMinionsSpawned50 = true;
        }

        // [boss1 death] — always AFTER minion checks
        if (boss.health <= 0) {
          for (let i = 0; i < boss.coinDrop; i++) {
            coins.push({
              x: boss.x + Math.random() * boss.width,
              y: boss.y + Math.random() * boss.height,
              width: 10, height: 10
            });
          }
          player.health = player.maxHealth;
          boss = null;
          bossAoeState = "idle";
          bossChargeState = "idle";
          roomIsCleared = true;
        }
      }

      // --------------------------------------------------------
      // BOSS 2 LOGIC
      // --------------------------------------------------------
      if (boss && boss.type === "boss2") {
        const isEnraged = boss.health <= boss.maxHealth * 0.5;

        if (isEnraged) {
          boss.speed = boss.baseSpeed * 2;
          boss.damage = 2.5;       // [boss2 enraged contact damage]
          boss.color = "#7700ff";
        }

        // [boss2 movement] stay 300px from player
        const b2dx = player.x + player.width / 2 - (boss.x + boss.width / 2);
        const b2dy = player.y + player.height / 2 - (boss.y + boss.height / 2);
        const b2dist = Math.sqrt(b2dx * b2dx + b2dy * b2dy) || 1;
        const boss2PreferredDist = 300;  // [boss2 preferred distance]

        if (boss2BeamState === "idle" || boss2BeamState === "stunned") {
          if (b2dist > boss2PreferredDist + 50) {
            boss.x += (b2dx / b2dist) * boss.speed;
            boss.y += (b2dy / b2dist) * boss.speed;
          } else if (b2dist < boss2PreferredDist - 50) {
            boss.x -= (b2dx / b2dist) * boss.speed;
            boss.y -= (b2dy / b2dist) * boss.speed;
          }
          boss.x = Math.max(260, Math.min(canvas.width - boss.width - 260, boss.x));
          boss.y = Math.max(170, Math.min(canvas.height - boss.height - 140, boss.y));
        }

        // [boss2 contact damage]
        if (rectsOverlap(player, boss)) {
          const cdx = boss.x - player.x;
          const cdy = boss.y - player.y;
          const cdist = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
          boss.x += (cdx / cdist) * (boss.speed + 4);
          boss.y += (cdy / cdist) * (boss.speed + 4);
          player.health -= boss.damage;
        }

        // [boss2 normal shoot] 3 projectiles spread
        if (boss2BeamState !== "firing" && boss2BeamState !== "windup") {
          boss2ShootTimer--;
          if (boss2ShootTimer <= 0) {
            boss2ShootTimer = boss2ShootCooldown;
            const angles = [-0.2, 0, 0.2];  // [boss2 spread angles]
            angles.forEach(offset => {
              const angle = Math.atan2(b2dy, b2dx) + offset;
              boss2Projectiles.push({
                x: boss.x + boss.width / 2,
                y: boss.y + boss.height / 2,
                vx: Math.cos(angle) * 5,    // [boss2 projectile speed]
                vy: Math.sin(angle) * 5,
                width: 22, height: 22,
                type: "normal"
              });
            });
          }
        }

        // [magic rain trigger]
        boss2RainTimer--;
        if (boss2RainTimer <= 0) {
          boss2RainTimer = boss2RainCooldown;
          const rainCount = 5 + Math.floor(roomNumber / 10);  // [magic rain count]
          for (let i = 0; i < rainCount; i++) {
            boss2RainWarnings.push({
              x: Math.random() * (canvas.width - 550) + 275,
              y: Math.random() * (canvas.height - 340) + 180,
              timer: 30,   // [magic rain warning duration] 0.5 sec
              radius: BOSS2_RAIN_RADIUS
            });
          }
        }

        // [magic rain warnings tick + land]
        for (let i = boss2RainWarnings.length - 1; i >= 0; i--) {
          boss2RainWarnings[i].timer--;
          if (boss2RainWarnings[i].timer <= 0) {
            const w = boss2RainWarnings[i];
            boss2Projectiles.push({
              x: w.x, y: w.y,
              vx: 0, vy: 0,
              width: w.radius * 2,
              height: w.radius * 2,
              type: "rain",
              linger: 40   // [magic rain linger duration] frames
            });
            boss2RainWarnings.splice(i, 1);
          }
        }

        // [beam cooldown / trigger]
        if (boss2BeamState === "idle") {
          boss2BeamCooldown--;
          if (boss2BeamCooldown <= 0) {
            boss2BeamState = "windup";
            boss2BeamTimer = 45;   // [beam windup duration] frames
            boss2BeamX = player.x + player.width / 2;
            boss2BeamY = player.y + player.height / 2;
            boss2BeamDamageDealt = false;
          }
        }

        if (boss2BeamState === "windup") {
          boss2BeamTimer--;
          if (boss2BeamTimer <= 0) {
            boss2BeamState = "firing";
            boss2BeamTimer = 20;   // [beam fire duration] frames
          }
        }

        if (boss2BeamState === "firing") {
          boss2BeamTimer--;
          if (!boss2BeamDamageDealt) {
            const beamW = boss.width * 1.5;  // [beam width]
            const beamCenterX = boss.x + boss.width / 2;
            const beamCenterY = boss.y + boss.height / 2;
            const angle = Math.atan2(boss2BeamY - beamCenterY, boss2BeamX - beamCenterX);
            const px = player.x + player.width / 2;
            const py = player.y + player.height / 2;
            const dx = px - beamCenterX;
            const dy = py - beamCenterY;
            const proj = dx * Math.cos(angle) + dy * Math.sin(angle);
            const perp = Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle));
            if (proj > 0 && perp < beamW / 2) {
              player.health -= player.maxHealth * boss.beamDamage;  // [boss2 beam damage]
              boss2BeamDamageDealt = true;
            }
          }
          if (boss2BeamTimer <= 0) {
            boss2BeamState = "stunned";
            boss2BeamTimer = 180;  // [beam stun duration] 3 seconds
            boss2BeamCooldown = isEnraged ? 300 : 480;  // [beam cooldown]
          }
        }

        if (boss2BeamState === "stunned") {
          boss2BeamTimer--;
          if (boss2BeamTimer <= 0) boss2BeamState = "idle";
        }

        // [boss2 projectile movement + damage]
        for (let i = boss2Projectiles.length - 1; i >= 0; i--) {
          const p = boss2Projectiles[i];

          if (p.type === "rain") {
            p.linger--;
            const px = player.x + player.width / 2;
            const py = player.y + player.height / 2;
            const distToRain = Math.sqrt((px - p.x) ** 2 + (py - p.y) ** 2);
            if (distToRain < BOSS2_RAIN_RADIUS + 25) {
              player.health -= boss.rainDamage + (roomNumber * 0.05);  // [boss2 rain damage]
            }
            if (p.linger <= 0) boss2Projectiles.splice(i, 1);
            continue;
          }

          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
            boss2Projectiles.splice(i, 1);
            continue;
          }
          if (rectsOverlap(p, player)) {
            player.health -= boss.projectileDamage + (roomNumber * 0.3);  // [boss2 projectile damage]
            boss2Projectiles.splice(i, 1);
          }
        }

        // [boss2 minion spawns] — checked BEFORE death so they always fire
        if (!bossMinionsSpawned75 && boss.health > 0 && boss.health <= boss.maxHealth * 0.75) {
          spawnBoss2Minions();
          bossMinionsSpawned75 = true;
        }
        if (!bossMinionsSpawned50 && boss.health > 0 && boss.health <= boss.maxHealth * 0.50) {
          spawnBoss2Minions();
          bossMinionsSpawned50 = true;
        }

        // [boss2 death] — always AFTER minion checks
        if (boss.health <= 0) {
          for (let i = 0; i < boss.coinDrop; i++) {
            coins.push({
              x: boss.x + Math.random() * boss.width,
              y: boss.y + Math.random() * boss.height,
              width: 10, height: 10
            });
          }
          player.health = player.maxHealth;
          boss = null;
          boss2Projectiles.length = 0;
          boss2RainWarnings = [];
          boss2BeamState = "idle";
          roomIsCleared = true;
        }
      }

      // [health clamp]
      if (DEV_IMMORTAL) {
        player.health = Math.max(1, player.health);
      } else {
        player.health = Math.max(0, player.health);
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
        player.attackTimer = 8;      // [attack duration]
        player.attackCooldown = 18;  // [attack cooldown]
        player.attackHits = [];
      }

      if (player.attackTimer > 0)    player.attackTimer--;
      if (player.attackCooldown > 0) player.attackCooldown--;

      // [attack hitbox]
      if (player.attackTimer > 0) {
        let hx = player.x, hy = player.y, hw = 60, hh = 60;
        if (player.facing === "right") { hx = player.x + player.width; hy = player.y - 5; }
        if (player.facing === "left")  { hx = player.x - hw;           hy = player.y - 5; }
        if (player.facing === "down")  { hx = player.x - 5;            hy = player.y + player.height; }
        if (player.facing === "up")    { hx = player.x - 5;            hy = player.y - hh; }

        const attackBox = { x: hx, y: hy, width: hw, height: hh };

        // [attack hits enemies]
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
            const dropCount = enemies[i].type === "tank" ? 3
                            : enemies[i].type === "ranged" ? 2
                            : 1;
            for (let c = 0; c < dropCount; c++) {
              coins.push({
                x: enemies[i].x + Math.random() * enemies[i].width,
                y: enemies[i].y + Math.random() * enemies[i].height,
                width: 10, height: 10
              });
            }
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

  // [draw menu screen]
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
  ctx.drawImage(roomIsCleared ? roomCleared : roomBackground, 0, 0, canvas.width, canvas.height);

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

    // [boss1 telegraph]
    if (boss.type === "boss1" && bossChargeState === "telegraphing") {
      const flashOn = Math.floor(bossTelegraphFlash / 3) % 2 === 0;
      if (flashOn) {
        ctx.fillStyle = "rgba(255, 0, 0, 0.25)";
        ctx.fillRect(bossChargeTargetX - 30, bossChargeTargetY - 30, player.width + 60, player.height + 60);
        ctx.strokeStyle = "rgba(255, 0, 0, 0.9)";
        ctx.lineWidth = 2;
        ctx.strokeRect(bossChargeTargetX - 30, bossChargeTargetY - 30, player.width + 60, player.height + 60);
      }
    }

    // [boss1 aoe ring]
    if (boss.type === "boss1" && bossAoeState === "expanding" && bossAoeCenterX && bossAoeCenterY) {
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

    // [boss2 visuals]
    if (boss.type === "boss2") {

      // rain warnings
      boss2RainWarnings.forEach(w => {
        const alpha = 0.3 + (1 - w.timer / 30) * 0.5;
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 100, 0, 0.8)";
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // boss2 projectiles
      boss2Projectiles.forEach(p => {
        ctx.beginPath();
        if (p.type === "rain") {
          ctx.arc(p.x, p.y, BOSS2_RAIN_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(0, 150, 255, 0.5)";
          ctx.fill();
          ctx.strokeStyle = "#66ccff";
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);  // [boss2 projectile render size]
          ctx.fillStyle = "#cc88ff";
          ctx.fill();
        }
      });

      // beam windup
      if (boss2BeamState === "windup") {
        const flash = Math.floor(Date.now() / 80) % 2 === 0;
        if (flash) {
          ctx.beginPath();
          ctx.moveTo(boss.x + boss.width / 2, boss.y + boss.height / 2);
          ctx.lineTo(boss2BeamX, boss2BeamY);
          ctx.strokeStyle = "rgba(200, 100, 255, 0.5)";
          ctx.lineWidth = 4;
          ctx.stroke();
        }
      }

      // beam firing
      if (boss2BeamState === "firing") {
        const beamCenterX = boss.x + boss.width / 2;
        const beamCenterY = boss.y + boss.height / 2;
        const angle = Math.atan2(boss2BeamY - beamCenterY, boss2BeamX - beamCenterX);
        const beamLength = 2000;
        const beamW = boss.width * 1.5;  // [beam render width]

        ctx.save();
        ctx.translate(beamCenterX, beamCenterY);
        ctx.rotate(angle);
        ctx.fillStyle = "rgba(180, 80, 255, 0.3)";
        ctx.fillRect(0, -beamW, beamLength, beamW * 2);
        ctx.fillStyle = "rgba(220, 150, 255, 0.9)";
        ctx.fillRect(0, -beamW / 3, beamLength, (beamW / 3) * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.fillRect(0, -beamW / 8, beamLength, (beamW / 8) * 2);
        ctx.restore();
      }

      // stun indicator
      if (boss2BeamState === "stunned") {
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.font = "bold 16px Courier New";
        ctx.textAlign = "center";
        ctx.fillText("STUNNED", boss.x + boss.width / 2, boss.y - 10);
        ctx.textAlign = "left";
      }
    }
  }

  // [draw coins]
  ctx.fillStyle = "#FFD700";
  coins.forEach(coin => ctx.fillRect(coin.x, coin.y, coin.width, coin.height));

  // [draw enemy projectiles]
  ctx.fillStyle = "#66ccff";
  projectiles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  // [draw health bar]
  const barX = 20, barY = 20, barW = 250, barH = 28;
  ctx.fillStyle = "#1a0000";
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = "#cc0000";
  ctx.fillRect(barX, barY, barW * (player.health / player.maxHealth), barH);
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barW, barH);
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

  // [draw boss health bar]
  if (boss) {
    const bBarW = 400, bBarH = 30;
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
    const bossLabel = boss.type === "boss2" ? "ARCHMAGE" : "WARDEN";  // [boss names]
    ctx.fillText(
      (bossHpRatio <= 0.25 ? "⚠ ENRAGED ⚠  " : bossLabel + "  ") +
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
    if (player.facing === "right") { hx = player.x + player.width; hy = player.y - 5; }
    if (player.facing === "left")  { hx = player.x - hw;           hy = player.y - 5; }
    if (player.facing === "down")  { hx = player.x - 5;            hy = player.y + player.height; }
    if (player.facing === "up")    { hx = player.x - 5;            hy = player.y - hh; }
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

  // [draw shop UI]
  if (shopOpen) {
    const prices = getShopPrices();
    const panelW = 420, panelH = 520;
    const panelX = canvas.width / 2 - panelW / 2;
    const panelY = canvas.height / 2 - panelH / 2;
    ctx.drawImage(shopPanel, panelX, panelY, panelW, panelH);
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 16px Courier New";
    ctx.fillText("Coins: " + coinCount, canvas.width / 2, panelY + 130);
    const canAffordDamage = coinCount >= prices.damagePrice;
    ctx.fillStyle = canAffordDamage ? "#ff6644" : "#666666";
    ctx.fillText("[1] +25% Damage — " + prices.damagePrice + " coins", canvas.width / 2, panelY + 190);
    const canAffordHealth = coinCount >= prices.healthPrice;
    ctx.fillStyle = canAffordHealth ? "#4488ff" : "#666666";
    ctx.fillText("[2] +25% Max HP — " + prices.healthPrice + " coins", canvas.width / 2, panelY + 250);
    const canAffordSpeed = coinCount >= prices.speedPrice;
    const speedCapped = player.speed >= player.maxSpeed;
    ctx.fillStyle = canAffordSpeed && !speedCapped ? "#00ff88" : "#666666";
    ctx.fillText(
      speedCapped ? "[3] Speed MAX" : "[3] +25% Speed — " + prices.speedPrice + " coins",
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
