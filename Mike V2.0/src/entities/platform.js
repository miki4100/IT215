export class Platform {
  constructor(x, y, width, height = 12) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  get left() {
    return this.x;
  }

  get right() {
    return this.x + this.width;
  }

  get top() {
    return this.y;
  }

  get bottom() {
    return this.y + this.height;
  }

  intersectsHorizontally(aabb) {
    return aabb.right > this.left && aabb.left < this.right;
  }
}
