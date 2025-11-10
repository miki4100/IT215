import { Player } from '../entities/player.js';
import { WorldGenerator } from './generator.js';
import { InputManager } from '../utils/input.js';

const STORAGE_KEYS = {
  highScore: 'px2d_high_score',
  bestCoins: 'px2d_best_coins',
};

const MAP_STORAGE_KEY = 'px2d_selected_map';
const PLAYER_STORAGE_KEY = 'px2d_selected_player';

const MAP_BACKGROUNDS = {
  fall: './maps/Fall.png',
  winter: './maps/Winter.png',
  summer: './maps/Summer.png',
  city: './maps/City.jpg',
  city2: './maps/City 2.png',
  crystal: './maps/Crystal.png',
  forest: './maps/Forest.png',
  night: './maps/Night.png',
  temple: './maps/Temple.png',
};

const DEFAULT_BACKGROUNDS = ['./B1.jpg', './B2.jpg', './B3.jpg'];
const BACKGROUND_DISTANCE_FACTORS = [0, 5, 11.25];

const PLAYER_OPTIONS = {
  player1: {
    key: 'player1',
    type: 'frames',
    frames: {
      prefix: './png/Run__',
      count: 10,
      columns: 5,
      rows: 2,
    },
    scale: 0.25,
    verticalOffset: -20,
  },
  player2: {
    key: 'player2',
    type: 'sheet',
    sheet: {
      path: './PLAYER2.png',
      columns: 1,
      rows: 1,
    },
    // Adjust scale/columns/rows once PLAYER2.png layout is finalized.
    scale: 0.05,
    verticalOffset: -24,
  },
};

const BASE_PLAYER_CONFIG = {
  gravity: 1600,
  maxRunSpeed: 220,
  moveAcceleration: 2200,
  groundFriction: 12,
  airFriction: 3,
  jumpVelocity: 560,
  maxFallSpeed: 900,
  coyoteTime: 0.1,
  jumpBufferTime: 0.15,
  spriteScale: 0.25,
  spriteColumns: 5,
  spriteRows: 2,
  spriteVerticalOffset: -20,
};

export class Game {
  constructor(canvas, context) {
    this.canvas = canvas;
    this.context = context;

    this.input = new InputManager();

    this.assets = {
      playerSheet: null,
      playerFrames: null,
      coin: this.loadImage('./COIN.png'),
      backgrounds: this.loadBackgroundAssets(),
      wasted: this.loadImage('./WASTED.png'),
    };
    this.backgroundStops = this.createBackgroundStops(this.canvas.width);
    this.deathState = {
      active: false,
      timer: 0,
      duration: 2.5,
    };

    this.playerConfig = { ...BASE_PLAYER_CONFIG };
    this.playerOption = null;
    this.setPlayerOption(this.getStoredPlayerKey());

    this.generator = new WorldGenerator(
      this.createGeneratorConfig(this.canvas.width, this.canvas.height),
    );

    this.spikeHeight = 48;
    this.spikeY = this.canvas.height - this.spikeHeight + 12;

    this.resetState();
    this.running = false;
    this.lastTime = performance.now();
  }

  resetState() {
    if (this.deathState) {
      this.deathState.active = false;
      this.deathState.timer = 0;
    }

    this.player = new Player(32, this.generator.config.startHeight - 32, {
      scale: this.playerConfig.spriteScale,
      sheetColumns: this.playerConfig.spriteColumns,
      sheetRows: this.playerConfig.spriteRows,
      verticalOffset: this.playerConfig.spriteVerticalOffset,
    });
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
  }

  createGeneratorConfig(width, height) {
    return {
      startHeight: height - 160,
      platformHeight: 12,
      minGap: 80,
      maxGap: 160,
      minWidth: 120,
      maxWidth: 240,
      minHeight: 120,
      maxHeight: height - 140,
      maxRise: 80,
      maxDrop: 110,
      coinChance: 0.55,
      spawnBuffer: width * 2.5,
    };
  }

  createBackgroundStops(width) {
    return BACKGROUND_DISTANCE_FACTORS.map((factor) =>
      Math.round(factor * width),
    );
  }

  loadBackgroundAssets() {
    const selectedMap = this.getStoredMapKey();
    if (selectedMap && MAP_BACKGROUNDS[selectedMap]) {
      const imagePath = MAP_BACKGROUNDS[selectedMap];
      const image = this.loadImage(imagePath);
      return [image, image, image];
    }
    return DEFAULT_BACKGROUNDS.map((path) => this.loadImage(path));
  }

  getStoredMapKey() {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    try {
      const stored = window.localStorage.getItem(MAP_STORAGE_KEY);
      if (!stored) {
        return null;
      }
      const normalized = stored.toLowerCase();
      if (MAP_BACKGROUNDS[normalized]) {
        return normalized;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  getStoredPlayerKey() {
    if (typeof window === 'undefined' || !window.localStorage) {
      return PLAYER_OPTIONS.player1.key;
    }
    try {
      const stored = window.localStorage.getItem(PLAYER_STORAGE_KEY);
      if (!stored) {
        return PLAYER_OPTIONS.player1.key;
      }
      const normalized = stored.toLowerCase();
      if (PLAYER_OPTIONS[normalized]) {
        return normalized;
      }
      return PLAYER_OPTIONS.player1.key;
    } catch (error) {
      return PLAYER_OPTIONS.player1.key;
    }
  }

  setPlayerOption(playerKey) {
    const option = PLAYER_OPTIONS[playerKey] || PLAYER_OPTIONS.player1;
    this.playerOption = option;
    this.selectedPlayerKey = option.key;

    this.playerConfig.spriteScale =
      option.scale ?? BASE_PLAYER_CONFIG.spriteScale;
    this.playerConfig.spriteColumns = this.getOptionColumns(option);
    this.playerConfig.spriteRows = this.getOptionRows(option);
    this.playerConfig.spriteVerticalOffset =
      option.verticalOffset ?? BASE_PLAYER_CONFIG.spriteVerticalOffset;

    if (option.type === 'frames' && option.frames) {
      this.assets.playerFrames = this.loadAnimationFrames(
        option.frames.prefix,
        option.frames.count,
      );
      this.assets.playerSheet = null;
    } else if (option.type === 'sheet' && option.sheet) {
      this.assets.playerFrames = null;
      this.assets.playerSheet = {
        image: this.loadImage(option.sheet.path),
        columns: this.getOptionColumns(option),
        rows: this.getOptionRows(option),
        frameWidth: null,
        frameHeight: null,
      };
    } else {
      this.assets.playerFrames = null;
      this.assets.playerSheet = null;
    }
  }

  getOptionColumns(option) {
    if (option.type === 'frames' && option.frames?.columns) {
      return option.frames.columns;
    }
    if (option.type === 'sheet' && option.sheet?.columns) {
      return option.sheet.columns;
    }
    return BASE_PLAYER_CONFIG.spriteColumns;
  }

  getOptionRows(option) {
    if (option.type === 'frames' && option.frames?.rows) {
      return option.frames.rows;
    }
    if (option.type === 'sheet' && option.sheet?.rows) {
      return option.sheet.rows;
    }
    return BASE_PLAYER_CONFIG.spriteRows;
  }

  resize(width, height) {
    const targetWidth = Math.max(1, Math.floor(width));
    const targetHeight = Math.max(1, Math.floor(height));
    const widthChanged = targetWidth !== this.canvas.width;
    const heightChanged = targetHeight !== this.canvas.height;

    if (!widthChanged && !heightChanged) {
      return;
    }

    this.canvas.width = targetWidth;
    this.canvas.height = targetHeight;
    this.context.imageSmoothingEnabled = false;

    Object.assign(
      this.generator.config,
      this.createGeneratorConfig(targetWidth, targetHeight),
    );

    this.backgroundStops = this.createBackgroundStops(targetWidth);
    this.spikeY = this.canvas.height - this.spikeHeight + 12;

    const maxPlatformY = this.generator.config.maxHeight;
    const coinMaxY = Math.max(maxPlatformY - 24, 12);

    if (Array.isArray(this.platforms)) {
      if (this.platforms.length > 0) {
        this.platforms[0].y = this.generator.config.startHeight;
      }
      for (const platform of this.platforms) {
        if (platform.y > maxPlatformY) {
          platform.y = maxPlatformY;
        }
      }
    }

    if (Array.isArray(this.coins)) {
      for (const coin of this.coins) {
        if (coin.y > coinMaxY) {
          coin.y = coinMaxY;
        }
      }
    }

    if (this.player) {
      const maxPlayerY = this.spikeY - this.player.height;
      if (this.player.position.y > maxPlayerY) {
        this.player.position.y = maxPlayerY;
      }
      if (this.player.previousPosition.y > maxPlayerY) {
        this.player.previousPosition.y = maxPlayerY;
      }
    }
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
    if (this.deathState && this.deathState.active) {
      this.updateDeath(dt);
      return;
    }

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
    this.player.updateAnimation(dt);

    this.generator.ensureContent(this.player.centerX, this.platforms, this.coins);
    this.pruneEntities();
    this.collectCoins();
    this.updateCamera(dt);
    this.checkDeath();
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
    if (
      this.player.bottom >= this.spikeY &&
      (!this.deathState || !this.deathState.active)
    ) {
      this.player.position.y = this.spikeY - this.player.height;
      this.triggerDeath();
    }
  }

  triggerDeath() {
    if (this.deathState && this.deathState.active) {
      return;
    }

    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      this.saveNumber(STORAGE_KEYS.highScore, this.state.highScore);
    }

    if (this.state.coins > this.state.bestCoins) {
      this.state.bestCoins = this.state.coins;
      this.saveNumber(STORAGE_KEYS.bestCoins, this.state.bestCoins);
    }

    if (!this.deathState) {
      this.deathState = {
        active: false,
        timer: 0,
        duration: 2.5,
      };
    }

    this.deathState.active = true;
    this.deathState.timer = 0;
    this.deathState.duration = 2.5;

    if (this.player) {
      this.player.velocity.x = 0;
      this.player.velocity.y = 0;
      this.player.grounded = true;
    }
  }

  updateDeath(dt) {
    if (!this.deathState || !this.deathState.active) {
      return;
    }

    this.deathState.timer += dt;

    if (this.deathState.timer >= this.deathState.duration) {
      this.resetState();

      if (this.input) {
        if (this.input.state && typeof this.input.state.clear === 'function') {
          this.input.state.clear();
        }
        if (this.input.pressed && typeof this.input.pressed.clear === 'function') {
          this.input.pressed.clear();
        }
        if (this.input.released && typeof this.input.released.clear === 'function') {
          this.input.released.clear();
        }
      }
    }
  }

  addScore(amount) {
    this.state.score += amount;
    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      this.saveNumber(STORAGE_KEYS.highScore, this.state.highScore);
    }
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
    this.drawHud(ctx);
    this.drawDeathOverlay(ctx);
  }

  drawHud(ctx) {
    ctx.save();
    ctx.font = '24px "YouMurdererBB", serif';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#b30000';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    const paddingX = 24;
    let y = 24;
    const lineHeight = 28;
    const lines = [
      `Score: ${this.state.score}`,
      `Coins: ${this.state.coins}`,
      `Best Score: ${this.state.highScore}`,
      `Best Coins: ${this.state.bestCoins}`,
    ];

    for (const line of lines) {
      ctx.fillText(line, paddingX, y);
      y += lineHeight;
    }

    ctx.restore();
  }

  drawDeathOverlay(ctx) {
    if (!this.deathState || !this.deathState.active) {
      return;
    }

    const fadeProgress = Math.max(Math.min(this.deathState.timer / 0.4, 1), 0);

    ctx.save();
    ctx.globalAlpha = 0.65 * fadeProgress;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();

    const wasted = this.assets ? this.assets.wasted : null;
    if (!this.isImageReady(wasted)) {
      return;
    }

    const overlayDelay = Math.max(this.deathState.timer - 0.2, 0);
    const overlayProgress = Math.max(Math.min(overlayDelay / 0.6, 1), 0);
    const maxWidth = this.canvas.width * 0.7;
    const maxHeight = this.canvas.height * 0.35;
    const scale = Math.min(
      maxWidth / wasted.naturalWidth,
      maxHeight / wasted.naturalHeight,
    );

    const width = wasted.naturalWidth * scale;
    const height = wasted.naturalHeight * scale;
    const x = (this.canvas.width - width) / 2;
    const y = (this.canvas.height - height) / 2;

    ctx.save();
    ctx.globalAlpha = overlayProgress;
    ctx.drawImage(wasted, x, y, width, height);
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
      ctx.fillStyle = '#3b0d0d';
      ctx.fillRect(x, spikeBaseY, spikeWidth, this.spikeHeight);

      ctx.fillStyle = '#8b0000';
      ctx.beginPath();
      ctx.moveTo(x, spikeBaseY);
      ctx.lineTo(x + spikeWidth / 2, spikeBaseY - this.spikeHeight + 12);
      ctx.lineTo(x + spikeWidth, spikeBaseY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#5a0000';
      ctx.fillRect(x, spikeBaseY, spikeWidth, 4);
    }
  }

  drawPlatforms(ctx) {
    for (const platform of this.platforms) {
      ctx.fillStyle = '#cd9064ff';
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

    const sheet = this.ensurePlayerSheet();
    if (sheet && this.isImageReady(sheet.image)) {
      player.ensureSprite(sheet.image);
    }

    player.draw(ctx);
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

  loadAnimationFrames(prefix, count) {
    const frames = [];
    for (let i = 0; i < count; i += 1) {
      const padded = String(i).padStart(3, '0');
      frames.push(this.loadImage(`${prefix}${padded}.png`));
    }
    return frames;
  }

  ensurePlayerSheet() {
    const sheetAsset = this.assets.playerSheet;
    if (sheetAsset) {
      const { image } = sheetAsset;
      if (image && this.isImageReady(image)) {
        const columns =
          sheetAsset.columns || this.playerConfig.spriteColumns || 1;
        const rows = sheetAsset.rows || this.playerConfig.spriteRows || 1;
        sheetAsset.columns = columns;
        sheetAsset.rows = rows;
        if (!sheetAsset.frameWidth || !sheetAsset.frameHeight) {
          sheetAsset.frameWidth = image.naturalWidth / columns;
          sheetAsset.frameHeight = image.naturalHeight / rows;
        }
      }
      return sheetAsset;
    }

    const frames = this.assets.playerFrames;
    if (!Array.isArray(frames) || frames.length === 0) {
      return null;
    }

    const ready = frames.every((frame) => this.isImageReady(frame));
    if (!ready) {
      return null;
    }

    const columns = this.playerConfig.spriteColumns;
    const rows = this.playerConfig.spriteRows;
    const frameWidth = frames[0].naturalWidth;
    const frameHeight = frames[0].naturalHeight;

    const canvas = document.createElement('canvas');
    canvas.width = frameWidth * columns;
    canvas.height = frameHeight * rows;
    const ctx = canvas.getContext('2d');

    for (let index = 0; index < frames.length; index += 1) {
      const frame = frames[index];
      const col = index % columns;
      const row = Math.floor(index / columns);
      ctx.drawImage(frame, col * frameWidth, row * frameHeight);
    }

    const sheetImage = new Image();
    sheetImage.decoding = 'async';
    sheetImage.loading = 'eager';
    sheetImage.src = canvas.toDataURL('image/png');

    this.assets.playerSheet = {
      image: sheetImage,
      frameWidth,
      frameHeight,
      columns,
      rows,
    };

    return this.assets.playerSheet;
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
