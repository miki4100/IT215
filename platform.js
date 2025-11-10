export class Platform {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  get top() {
    return this.y;
  }

  get bottom() {
    return this.y + this.height;
  }

  // ✅ Used by Game.resolvePlatformCollisions()
  intersectsHorizontally(player) {
    return (
      player.right > this.x &&
      player.left < this.x + this.width
    );
  }
}
