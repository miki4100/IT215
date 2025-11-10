export class Coin {
  constructor(x, y, radius = 8) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.value = 10;
    this.collected = false;
  }

  get left() {
    return this.x - this.radius;
  }

  get right() {
    return this.x + this.radius;
  }

  get top() {
    return this.y - this.radius;
  }

  get bottom() {
    return this.y + this.radius;
  }

  intersects(aabb) {
    return (
      aabb.right > this.left &&
      aabb.left < this.right &&
      aabb.bottom > this.top &&
      aabb.top < this.bottom
    );
  }
}
