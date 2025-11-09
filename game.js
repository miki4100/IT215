import { Player } from "../entities/player.js";
import { WorldGenerator } from "./generator.js";
import { InputManager } from "../utils/input.js";
import { Coin } from "../entities/coin.js";
import { Platform } from "../entities/platform.js";

function deepMerge(base, override = {}) {
  const out = { ...base };
  for (const k of Object.keys(override)) {
    if (
      override[k] &&
      typeof override[k] === "object" &&
      !Array.isArray(override[k])
    ) {
      out[k] = deepMerge(base[k] || {}, override[k]);
    } else {
      out[k] = override[k];
    }
  }
  return out;
}

export class Game {
  constructor(canvas, context, hud, levelDef) {
    this.canvas = canvas;
    this.context = context;
    this.hud = hud;
    this.levelDef = levelDef || {};
    this.input = new InputManager();

    this.baseSeed = this.levelDef.seed ?? 1;
    this.assets = { coin: this.loadImage("./COIN.png") };

    // ⚙️ Player physics
    const defaultPlayerConfig = {
      gravity: 1600,
      maxRunSpeed: 280,
      moveAcceleration: 2800,
      groundFriction: 12,
      airFriction: 3,
      jumpVelocity: 3600,
      maxFallSpeed: 1300,
      coyoteTime: 0.15,
      jumpBufferTime: 0.18,
      wallSlideSpeed: 220,
      wallJumpVelocityX: 520,
      wallJumpVelocityY: 2800,
    };

    // 🧱 Shorter level + slimmer platforms
    const defaultGeneratorConfig = {
      startHeight: this.canvas.height - 120,
      platformHeight: 8,        // thinner platforms (was 12)
      minGap: 160,
      maxGap: 260,
      minWidth: 110,            // shorter horizontally
      maxWidth: 200,
      coinChance: 0.3,
      spikeChance: 0.15,
      levelHeight: 7500,        // quarter length (~7.5 k px climb)
    };

    const defaultVisual = {
      themeColorStart: "rgb(25,35,70)",
      themeColorEnd: "rgb(255,60,80)",
    };

    this.playerConfig = deepMerge(defaultPlayerConfig, this.levelDef.config || {});
    this.generatorConfig = deepMerge(defaultGeneratorConfig, this.levelDef.generator || {});
    this.theme = deepMerge(defaultVisual, this.levelDef.visual || {});

    this.running = false;
    this.seedWorld();
    this.resetState();
  }

  makeRandom(seed) {
    return function () {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  seedWorld() {
    this.random = this.makeRandom(this.baseSeed);
    this.generator = new WorldGenerator({
      ...this.generatorConfig,
      random: this.random,
    });

    this.worldPlatforms = [];
    this.worldCoins = [];
    this.worldSpikes = [];
    this.generator.reset();

    // Starting platform
    const startWidth = 200;
    const startY = this.canvas.height - 60;
    const startX = this.canvas.width / 2 - startWidth / 2;
    this.worldPlatforms.push(new Platform(startX, startY, startWidth, this.generatorConfig.platformHeight));

    // Generate upwards
    let currentY = startY - this.generatorConfig.minGap;
    const topLimit = -this.generatorConfig.levelHeight;

    while (currentY > topLimit) {
      const width = this.lerp(
        this.generatorConfig.minWidth,
        this.generatorConfig.maxWidth,
        this.random()
      );
      const x = this.random() * (this.canvas.width - width);
      const y = currentY;
      this.worldPlatforms.push(new Platform(x, y, width, this.generatorConfig.platformHeight));

      // Coins
      if (this.random() < this.generatorConfig.coinChance) {
        const coinX = x + width / 2;
        const coinY = y - 35;
        this.worldCoins.push(new Coin(coinX, coinY, 10, 1));
      }

      // Spikes
      if (this.random() < this.generatorConfig.spikeChance) {
        const sW = 20, sH = 20;
        const sX = x + this.random() * (width - sW);
        const sY = y - sH;
        this.worldSpikes.push({ x: sX, y: sY, width: sW, height: sH });
      }

      const gap = this.lerp(this.generatorConfig.minGap, this.generatorConfig.maxGap, this.random());
      currentY -= gap;
    }

    // Goal
    const goalWidth = 220;
    const goalY = topLimit - 80;
    const goalX = this.canvas.width / 2 - goalWidth / 2;
    this.goalPlatform = new Platform(goalX, goalY, goalWidth, this.generatorConfig.platformHeight);
    this.worldPlatforms.push(this.goalPlatform);

    this.deathBarrierY = this.canvas.height + 120;
  }

  resetState() {
    this.platforms = this.worldPlatforms.map(
      (p) => new Platform(p.x, p.y, p.width, p.height)
    );
    this.coins = this.worldCoins.map((c) => new Coin(c.x, c.y, c.radius, c.value));
    this.spikes = this.worldSpikes.map((s) => ({ ...s }));

    const startPlatform = this.worldPlatforms[0];
    const startX = startPlatform.x + startPlatform.width / 2 - 16;
    const startY = startPlatform.y - 32;

    this.player = new Player(startX, startY);
    this.player.previousPosition = { ...this.player.position };
    this.player.velocity = { x: 0, y: 0 };
    this.player.grounded = true;

    this.cameraY = 0;

    this.state = {
      score: 0,
      coins: 0,
      highScore: this.loadNumber("px2d_high_score", 0),
      bestCoins: this.loadNumber("px2d_best_coins", 0),
    };

    this.updateHud();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();

    const loop = (time) => {
      if (!this.running) return;
      const delta = (time - this.lastTime) / 1000;
      this.lastTime = time;
      const dt = Math.min(delta, 1 / 30);
      this.update(dt);
      this.render();
      this.input.beginFrame();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop() { this.running = false; }

  update(dt) {
    this.player.beginUpdate(dt, this.playerConfig);
    this.player.applyInput(this.input, dt, this.playerConfig);
    if (this.player.touchingWall && this.input.jumpPressed) {
      this.player.wallJump(this.playerConfig);
    }

    this.player.applyPhysics(dt, this.playerConfig);
    this.resolvePlatformCollisions();
    this.checkSpikeCollision();
    this.checkDeathBarrier();
    this.checkGoalReached();
    this.collectCoins();
    this.updateCamera(dt);
    this.updateHud();
  }

  resolvePlatformCollisions() {
    const prevBottom = this.player.previousPosition.y + this.player.height;
    let left = false, right = false;

    for (const p of this.platforms) {
      if (
        this.player.right > p.x &&
        this.player.left < p.x + p.width &&
        this.player.bottom > p.y &&
        this.player.top < p.y + p.height
      ) {
        if (this.player.velocity.x > 0 && this.player.right - p.x < 10) {
          this.player.position.x = p.x - this.player.width; right = true; this.player.velocity.x = 0;
        }
        if (this.player.velocity.x < 0 && p.x + p.width - this.player.left < 10) {
          this.player.position.x = p.x + p.width; left = true; this.player.velocity.x = 0;
        }
      }

      if (
        this.player.velocity.y >= 0 &&
        this.player.right > p.x &&
        this.player.left < p.x + p.width &&
        prevBottom <= p.y &&
        this.player.bottom >= p.y
      ) {
        this.player.position.y = p.y - this.player.height;
        this.player.velocity.y = 0;
        this.player.grounded = true;
      }
    }
    this.player.touchingLeftWall = left;
    this.player.touchingRightWall = right;
    this.player.touchingWall = left || right;
  }

  checkSpikeCollision() {
    for (const s of this.spikes) {
      if (
        this.player.right > s.x &&
        this.player.left < s.x + s.width &&
        this.player.bottom > s.y &&
        this.player.top < s.y + s.height
      ) { this.respawn(); break; }
    }
  }

  checkDeathBarrier() {
    if (this.player.bottom > this.deathBarrierY) this.respawn();
  }

  checkGoalReached() {
    if (this.player.top <= this.goalPlatform.y - 30) {
      this.stop();
      alert("🏆 You reached the top!");
    }
  }

  respawn() { this.resetState(); }

  collectCoins() {
    for (const c of this.coins) {
      if (!c.collected && c.intersects(this.player)) {
        c.collected = true;
        this.state.coins += c.value;
      }
    }
  }

  updateCamera(dt) {
    const targetY = this.player.centerY - this.canvas.height / 2;
    const lerpFactor = 1 - Math.pow(0.0005, dt);
    this.cameraY += (targetY - this.cameraY) * lerpFactor;
  }

  updateHud() {
    if (!this.hud) return;
    this.hud.score.textContent = this.state.score;
    this.hud.coins.textContent = this.state.coins;
    this.hud.highScore.textContent = this.state.highScore;
    this.hud.bestCoins.textContent = this.state.bestCoins;
  }

  render() {
    const ctx = this.context;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Progress bar calc
    const progress = Math.min(
      Math.max(-this.player.position.y / this.generatorConfig.levelHeight, 0),
      1
    );

    // Gradient background
    const sc = this.theme.themeColorStart.match(/\d+/g).map(Number);
    const ec = this.theme.themeColorEnd.match(/\d+/g).map(Number);
    const r = Math.floor(sc[0] + (ec[0] - sc[0]) * progress);
    const g = Math.floor(sc[1] + (ec[1] - sc[1]) * progress);
    const b = Math.floor(sc[2] + (ec[2] - sc[2]) * progress);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(0, -this.cameraY);

    // Platforms
    ctx.fillStyle = "#111";
    for (const p of this.platforms) ctx.fillRect(p.x, p.y, p.width, p.height);

    // Goal
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(this.goalPlatform.x, this.goalPlatform.y, this.goalPlatform.width, this.goalPlatform.height);

    // Spikes
    ctx.fillStyle = "#d9534f";
    for (const s of this.spikes) {
      ctx.beginPath();
      ctx.moveTo(s.x, s.y + s.height);
      ctx.lineTo(s.x + s.width / 2, s.y);
      ctx.lineTo(s.x + s.width, s.y + s.height);
      ctx.closePath();
      ctx.fill();
    }

    // Coins
    ctx.fillStyle = "#FFD700";
    for (const c of this.coins)
      if (!c.collected) {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
        ctx.fill();
      }

    // Player
    const px = this.player.position.x, py = this.player.position.y;
    ctx.fillStyle = "#000";
    ctx.fillRect(px, py, this.player.width, this.player.height);
    ctx.fillStyle = "#fff";
    ctx.fillRect(px + 8, py + 8, 4, 4);
    ctx.fillRect(px + 20, py + 8, 4, 4);

    ctx.restore();

    // ✅ Progress bar (right side)
    const barX = this.canvas.width - 30;
    const barY = 20;
    const barWidth = 10;
    const barHeight = this.canvas.height - 40;
    ctx.fillStyle = "#333";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = "#0f0";
    const fillHeight = barHeight * progress;
    ctx.fillRect(barX, barY + barHeight - fillHeight, barWidth, fillHeight);
  }

  lerp(a,b,t){return a+(b-a)*t;}
  loadImage(path){const i=new Image();i.src=path;return i;}
  loadNumber(key,fallback){const v=Number(localStorage.getItem(key));return Number.isFinite(v)?v:fallback;}
}
