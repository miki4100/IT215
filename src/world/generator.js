import { Platform } from '../entities/platform.js';
import { Coin } from '../entities/coin.js';

const randomRange = (min, max) => Math.random() * (max - min) + min;
const randomInt = (min, max) => Math.floor(randomRange(min, max + 1));

export class WorldGenerator {
  constructor(config) {
    this.config = config;
    this.spawnX = 0;
    this.lastPlatform = null;
  }

  reset() {
    this.spawnX = 0;
    this.lastPlatform = null;
  }

  seed(platforms, coins) {
    this.reset();
    const startPlatform = new Platform(-120, this.config.startHeight, 320);
    platforms.push(startPlatform);
    this.lastPlatform = startPlatform;
    this.spawnX = startPlatform.x + startPlatform.width;

    for (let i = 0; i < 8; i += 1) {
      this.spawnNext(platforms, coins);
    }
  }

  ensureContent(playerX, platforms, coins) {
    while (this.spawnX < playerX + this.config.spawnBuffer) {
      this.spawnNext(platforms, coins);
    }
  }

  spawnNext(platforms, coins) {
    const {
      minGap,
      maxGap,
      minWidth,
      maxWidth,
      minHeight,
      maxHeight,
      maxRise,
      maxDrop,
      platformHeight,
      coinChance,
    } = this.config;

    const gap = randomRange(minGap, maxGap);
    const width = randomRange(minWidth, maxWidth);

    const previousY = this.lastPlatform?.y ?? this.config.startHeight;
    const offset = randomRange(-maxRise, maxDrop);
    const unclampedY = previousY + offset;
    const y = Math.max(minHeight, Math.min(maxHeight, unclampedY));
    const platformX = this.spawnX + gap;

    const platform = new Platform(platformX, y, width, platformHeight);
    platforms.push(platform);

    if (Math.random() < coinChance) {
      const coinX = platform.x + platform.width / 2;
      const coinY = platform.y - 24;
      coins.push(new Coin(coinX, coinY));
    }

    if (Math.random() < coinChance * 0.5) {
      const coinX = platform.x + platform.width * 0.1 + randomRange(0, platform.width * 0.8);
      const coinY = platform.y - 20 - randomInt(0, 3) * 6;
      coins.push(new Coin(coinX, coinY));
    }

    this.spawnX = platform.x + platform.width;
    this.lastPlatform = platform;
  }
}
