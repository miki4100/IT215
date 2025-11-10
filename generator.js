import { Platform } from '../entities/platform.js';
import { Coin } from '../entities/coin.js';

export class WorldGenerator {
  constructor(config) {
    this.config = config;
    this.random = config.random || Math.random;
  }

  reset() {
    // No special state yet — placeholder for future biome logic
  }

  // 🚀 Dense vertical climb generator
  seedVertical(platforms, coins, spikes, totalHeight, canvasWidth) {
    const {
      minGap,
      maxGap,
      minWidth,
      maxWidth,
      platformHeight,
      coinChance,
      spikeChance,
      startHeight,
    } = this.config;

    // Adjust density dynamically so we get more platforms for taller levels
    const verticalDensityFactor = Math.max(1, totalHeight / 6000);

    let currentY = startHeight;
    const topLimit = -totalHeight;

    while (currentY > topLimit) {
      // Slight random width and position
      const width = this.lerp(minWidth, maxWidth, this.random());
      const x = this.random() * (canvasWidth - width);
      const y = currentY;

      // Create the platform
      platforms.push(new Platform(x, y, width, platformHeight));

      // Add coins occasionally above platforms
      if (this.random() < coinChance * 1.2) {
        const coinX = x + width / 2;
        const coinY = y - 35;
        coins.push(new Coin(coinX, coinY, 10, 1));
      }

      // Add spikes occasionally
      if (this.random() < spikeChance * 0.8) {
        const spikeWidth = 20;
        const spikeHeight = 20;
        const spikeX = x + this.random() * (width - spikeWidth);
        const spikeY = y - spikeHeight;
        spikes.push({ x: spikeX, y: spikeY, width: spikeWidth, height: spikeHeight });
      }

      // Move upward for next platform
      // 🧮 Reduce the gap so we get *many* more platforms
      const baseGap = this.lerp(minGap, maxGap, this.random());
      const gap = baseGap / verticalDensityFactor / 2; // denser for tall levels
      currentY -= gap;
    }

    // 🧱 Add a small "cap" platform at the top (goal area)
    const goalWidth = 200;
    const goalY = topLimit - 80;
    platforms.push(new Platform(canvasWidth / 2 - goalWidth / 2, goalY, goalWidth, platformHeight));
  }

  // Linear interpolation helper
  lerp(a, b, t) {
    return a + (b - a) * t;
  }
}
