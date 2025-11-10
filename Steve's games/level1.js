// Level 1 — Green Plains
// Beginner level: wide platforms, easy jumps, fewer spikes, bright environment.

export const level1 = {
  name: "Green Plains",
  seed: 12345, // ensures same layout every time
  config: {
    gravity: 1600,
    maxRunSpeed: 220,
    moveAcceleration: 2200,
    groundFriction: 12,
    airFriction: 3,
    jumpVelocity: 560,
    maxFallSpeed: 900,
    coyoteTime: 0.1,
    jumpBufferTime: 0.15,
  },
  generator: {
    startHeight: 340,
    platformHeight: 12,
    minGap: 80,
    maxGap: 180,
    minWidth: 200,
    maxWidth: 320,
    minHeight: 150,
    maxHeight: 360,
    maxRise: 50,
    maxDrop: 80,
    coinChance: 0.5,
    spawnBuffer: 6000,
  },
  visual: {
    themeColorStart: "rgb(60, 180, 75)",   // greenish
    themeColorEnd: "rgb(255, 230, 80)",    // yellowish
    backgroundName: "Green Plains",
  },
};
