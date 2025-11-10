export class Coin {
  constructor(x, y, radius = 10, value = 1) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.value = value;
    this.collected = false;
  }

  // ✅ Used by Game.collectCoins()
  intersects(player) {
    const dx = player.centerX - this.x;
    const dy = player.centerY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < this.radius + player.width / 2;
  }
}
