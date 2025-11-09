// Level 2 — Spike Rush
// Advanced level: tighter jumps, more spikes, smaller platforms, darker colors.

export const level2 = {
  name: "Spike Rush",
  seed: 67890, // ensures same layout every time
  config: {
    gravity: 1650,
    maxRunSpeed: 250,
    moveAcceleration: 2400,
    groundFriction: 12,
    airFriction: 3,
    jumpVelocity: 580,
    maxFallSpeed: 950,
    coyoteTime: 0.08,
    jumpBufferTime: 0.15,
  },
  generator: {
    startHeight: 360,
    platformHeight: 12,
    minGap: 120,
    maxGap: 220,
    minWidth: 140,
    maxWidth: 260,
    minHeight: 140,
    maxHeight: 380,
    maxRise: 70,
    maxDrop: 100,
    coinChance: 0.35,
    spawnBuffer: 6000,
  },
  visual: {
    themeColorStart: "rgb(255, 80, 80)",   // red
    themeColorEnd: "rgb(80, 0, 0)",        // dark maroon
    backgroundName: "Spike Rush",
  },
};
