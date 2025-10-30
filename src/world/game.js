import { Player } from '../entities/player.js';
import { WorldGenerator } from './generator.js';
import { InputManager } from '../utils/input.js';

const STORAGE_KEYS = {
  highScore: 'px2d_high_score',
  bestCoins: 'px2d_best_coins',
};

export class Game {
  constructor(canvas, context, hud) {
    this.canvas = canvas;
    this.context = context;
    this.hud = hud;

    this.input = new InputManager();

    this.assets = {
      player: this.loadImage('./PLAYER.png'),
      coin: this.loadImage('./COIN.png'),
      backgrounds: [
        this.loadImage('./B1.png'),
        this.loadImage('./B2.png'),
        this.loadImage('./B3.png'),
      ],
    };
    this.backgroundStops = [0, 4000, 9000];

    this.playerConfig = {
      gravity: 1600,
      maxRunSpeed: 220,
      moveAcceleration: 2200,
      groundFriction: 12,
      airFriction: 3,
      jumpVelocity: 560,
      maxFallSpeed: 900,
      coyoteTime: 0.1,
      jumpBufferTime: 0.15,
    };

    this.generator = new WorldGenerator({
      startHeight: this.canvas.height - 160,
      platformHeight: 12,
      minGap: 80,
      maxGap: 160,
      minWidth: 120,
      maxWidth: 240,
      minHeight: 120,
      maxHeight: this.canvas.height - 140,
      maxRise: 80,
      maxDrop: 110,
      coinChance: 0.55,
      spawnBuffer: this.canvas.width * 2.5,
    });

    this.spikeHeight = 48;
    this.spikeY = this.canvas.height - this.spikeHeight + 12;

    this.resetState();
    this.running = false;
    this.lastTime = performance.now();
  }

  resetState() {
    this.player = new Player(32, this.generator.config.startHeight - 32);
    this.platforms = [];
    this.coins = [];

    this.generator.seed(this.platforms, this.coins);

    this.player.position.x = this.platforms[0].x + 64;
    this.player.position.y = this.platforms[0].y - this.player.height;
    this.player.previousPosition.x = this.player.position.x;
    this.player.previousPosition.y = this.player.position.y;
    this.player.velocity.x = 0;
    this.player.velocity.y = 0;
    this.player.grounded = true;
    this.player.wasGrounded = true;

    this.cameraX = 0;

    this.state = {
      score: 0,
      coins: 0,
      highScore: this.loadNumber(STORAGE_KEYS.highScore, 0),
      bestCoins: this.loadNumber(STORAGE_KEYS.bestCoins, 0),
    };

    this.updateHud();
  }

  start() {
    if (this.running) {
      return;
    }

    this.running = true;
    this.lastTime = performance.now();

    const loop = (time) => {
      if (!this.running) {
        return;
      }

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

  update(dt) {
    this.player.beginUpdate(dt, this.playerConfig);
    this.player.applyInput(this.input, dt, this.playerConfig);

    if (
      this.player.jumpBuffer > 0 &&
      (this.player.wasGrounded || this.player.coyoteTimer > 0)
    ) {
      this.player.tryJump(this.playerConfig);
    }

    this.player.applyPhysics(dt, this.playerConfig);
    const wasGrounded = this.player.wasGrounded;

    const landed = this.resolvePlatformCollisions();
    if (!wasGrounded && landed) {
      this.addScore(50);
    }

    if (this.player.jumpBuffer > 0 && this.player.grounded) {
      this.player.tryJump(this.playerConfig);
    }

    this.player.clampHorizontal(this.cameraX - this.canvas.width * 0.4);

    this.generator.ensureContent(this.player.centerX, this.platforms, this.coins);
    this.pruneEntities();
    this.collectCoins();
    this.updateCamera(dt);
    this.checkDeath();
    this.updateHud();
  }

  resolvePlatformCollisions() {
    let landed = false;
    const previousBottom = this.player.previousPosition.y + this.player.height;

    for (const platform of this.platforms) {
      if (this.player.velocity.y < 0) {
        continue;
      }

      if (!platform.intersectsHorizontally(this.player)) {
        continue;
      }

      if (previousBottom > platform.top) {
        continue;
      }

      if (this.player.bottom >= platform.top) {
        this.player.position.y = platform.top - this.player.height;
        this.player.velocity.y = 0;
        this.player.grounded = true;
        landed = true;
      }
    }

    return landed;
  }

  pruneEntities() {
    const leftBound = this.cameraX - this.canvas.width * 1.5;

    this.platforms = this.platforms.filter(
      (platform) => platform.right > leftBound,
    );

    this.coins = this.coins.filter(
      (coin) => !coin.collected && coin.right > leftBound,
    );
  }

  collectCoins() {
    for (const coin of this.coins) {
      if (coin.collected) {
        continue;
      }

      if (coin.intersects(this.player)) {
        coin.collected = true;
        this.state.coins += coin.value;
        if (this.state.coins > this.state.bestCoins) {
          this.state.bestCoins = this.state.coins;
          this.saveNumber(STORAGE_KEYS.bestCoins, this.state.bestCoins);
        }
      }
    }
  }

  updateCamera(dt) {
    const target = Math.max(
      this.player.centerX - this.canvas.width * 0.35,
      0,
    );
    const lerpFactor = 1 - Math.pow(0.001, dt);
    this.cameraX += (target - this.cameraX) * lerpFactor;
  }

  checkDeath() {
    if (this.player.bottom >= this.spikeY) {
      this.player.position.y = this.spikeY - this.player.height;
      this.handleDeath();
    }
  }

  handleDeath() {
    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      this.saveNumber(STORAGE_KEYS.highScore, this.state.highScore);
    }

    if (this.state.coins > this.state.bestCoins) {
      this.state.bestCoins = this.state.coins;
      this.saveNumber(STORAGE_KEYS.bestCoins, this.state.bestCoins);
    }

    this.resetState();
  }

  addScore(amount) {
    this.state.score += amount;
    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      this.saveNumber(STORAGE_KEYS.highScore, this.state.highScore);
    }
  }

  updateHud() {
    if (!this.hud) {
      return;
    }

    this.hud.score.textContent = this.state.score.toString();
    this.hud.coins.textContent = this.state.coins.toString();
    this.hud.highScore.textContent = this.state.highScore.toString();
    this.hud.bestCoins.textContent = this.state.bestCoins.toString();
  }

  render() {
    const ctx = this.context;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawBackground(ctx);

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    this.drawSpikes(ctx);
    this.drawPlatforms(ctx);
    this.drawCoins(ctx);
    this.drawPlayer(ctx);

    ctx.restore();
  }

  drawBackground(ctx) {
    ctx.fillStyle = '#0b0c1d';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const backgrounds = this.assets.backgrounds;
    if (!backgrounds || backgrounds.length === 0 || !this.player) {
      return;
    }

    const distance = Math.max(this.player.centerX, 0);
    const stops = this.backgroundStops;

    let baseIndex = 0;
    let blendIndex = 0;
    let blendAmount = 0;

    if (distance < stops[1]) {
      baseIndex = 0;
      blendIndex = 1;
      blendAmount = this.getBlend(distance, stops[0], stops[1]);
    } else if (distance < stops[2]) {
      baseIndex = 1;
      blendIndex = 2;
      blendAmount = this.getBlend(distance, stops[1], stops[2]);
    } else {
      baseIndex = 2;
      blendIndex = 2;
      blendAmount = 0;
    }

    this.drawBackgroundImage(ctx, backgrounds[baseIndex]);

    if (blendIndex !== baseIndex) {
      ctx.globalAlpha = blendAmount;
      this.drawBackgroundImage(ctx, backgrounds[blendIndex]);
    }
    ctx.globalAlpha = 1;
  }

  drawSpikes(ctx) {
    const spikeWidth = 32;
    const spikeBaseY = this.canvas.height - this.spikeHeight + 12;
    const start = Math.floor((this.cameraX - this.canvas.width) / spikeWidth) * spikeWidth;
    const end = this.cameraX + this.canvas.width * 1.5;

    for (let x = start; x < end; x += spikeWidth) {
      ctx.fillStyle = '#1f2933';
      ctx.fillRect(x, spikeBaseY, spikeWidth, this.spikeHeight);

      ctx.fillStyle = '#d9534f';
      ctx.beginPath();
      ctx.moveTo(x, spikeBaseY);
      ctx.lineTo(x + spikeWidth / 2, spikeBaseY - this.spikeHeight + 12);
      ctx.lineTo(x + spikeWidth, spikeBaseY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#9b1c1c';
      ctx.fillRect(x, spikeBaseY, spikeWidth, 4);
    }
  }

  drawPlatforms(ctx) {
    for (const platform of this.platforms) {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

      ctx.fillStyle = '#000000';
      ctx.fillRect(
        platform.x,
        platform.y + platform.height - 4,
        platform.width,
        4,
      );
    }
  }

  drawCoins(ctx) {
    for (const coin of this.coins) {
      if (coin.collected) {
        continue;
      }

      if (this.isImageReady(this.assets.coin)) {
        const size = coin.radius * 2;
        ctx.drawImage(
          this.assets.coin,
          coin.x - size / 2,
          coin.y - size / 2,
          size,
          size,
        );
      } else {
        ctx.fillStyle = '#f7d35c';
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#f9f1b5';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, coin.radius * 0.5, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();
      }
    }
  }

  drawPlayer(ctx) {
    const player = this.player;

    if (this.isImageReady(this.assets.player)) {
      ctx.save();
      ctx.translate(
        player.position.x + (player.facing === -1 ? player.width : 0),
        player.position.y,
      );
      ctx.scale(player.facing, 1);
      ctx.drawImage(this.assets.player, 0, 0, player.width, player.height);
      ctx.restore();
    } else {
      ctx.fillStyle = '#f0c987';
      ctx.fillRect(player.position.x, player.position.y, player.width, player.height);

      ctx.fillStyle = '#1f2a44';
      ctx.fillRect(
        player.position.x,
        player.position.y + player.height - 12,
        player.width,
        12,
      );

      ctx.fillStyle = '#fff';
      const eyeSize = 4;
      const eyeOffsetX = player.facing === 1 ? 10 : player.width - 14;
      ctx.fillRect(
        player.position.x + eyeOffsetX,
        player.position.y + 10,
        eyeSize,
        eyeSize,
      );
    }
  }

  drawBackgroundImage(ctx, image) {
    if (!this.isImageReady(image)) {
      return;
    }

    ctx.drawImage(image, 0, 0, this.canvas.width, this.canvas.height);
  }

  getBlend(distance, start, end) {
    if (end <= start) {
      return distance >= end ? 1 : 0;
    }
    return this.clamp((distance - start) / (end - start), 0, 1);
  }

  clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  isImageReady(image) {
    return Boolean(
      image &&
        image.complete &&
        image.naturalWidth > 0 &&
        image.naturalHeight > 0,
    );
  }

  loadImage(path) {
    const image = new Image();
    image.decoding = 'async';
    image.loading = 'eager';
    image.src = path;
    return image;
  }

  loadNumber(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) {
        return fallback;
      }
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  saveNumber(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      // Storage may be unavailable (private mode), ignore.
    }
  }
}
