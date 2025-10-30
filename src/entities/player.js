export class Player {
  constructor(x, y) {
    this.position = { x, y };
    this.previousPosition = { x, y };
    this.velocity = { x: 0, y: 0 };
    this.width = 32;
    this.height = 32;

    this.grounded = false;
    this.wasGrounded = false;
    this.coyoteTimer = 0;
    this.jumpBuffer = 0;
    this.facing = 1;
  }

  get left() {
    return this.position.x;
  }

  get right() {
    return this.position.x + this.width;
  }

  get top() {
    return this.position.y;
  }

  get bottom() {
    return this.position.y + this.height;
  }

  get centerX() {
    return this.position.x + this.width / 2;
  }

  get centerY() {
    return this.position.y + this.height / 2;
  }

  beginUpdate(dt, config) {
    this.previousPosition.x = this.position.x;
    this.previousPosition.y = this.position.y;

    this.wasGrounded = this.grounded;
    this.grounded = false;

    if (this.wasGrounded) {
      this.coyoteTimer = config.coyoteTime;
      this.jumpBuffer = 0;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
  }

  applyInput(input, dt, config) {
    const left = input.isDown('left');
    const right = input.isDown('right');

    if (right && !left) {
      this.velocity.x = Math.min(
        this.velocity.x + config.moveAcceleration * dt,
        config.maxRunSpeed,
      );
      this.facing = 1;
    } else if (left && !right) {
      this.velocity.x = Math.max(
        this.velocity.x - config.moveAcceleration * dt,
        -config.maxRunSpeed,
      );
      this.facing = -1;
    } else {
      const friction = this.wasGrounded
        ? config.groundFriction
        : config.airFriction;
      this.velocity.x *= 1 - Math.min(friction * dt, 1);
      if (Math.abs(this.velocity.x) < 2) {
        this.velocity.x = 0;
      }
    }

    if (input.consumePressed('jump')) {
      this.jumpBuffer = config.jumpBufferTime;
    }

    if (input.wasReleased('jump') && this.velocity.y < 0) {
      this.velocity.y *= 0.65;
    }
  }

  tryJump(config) {
    if (this.grounded || this.coyoteTimer > 0 || this.jumpBuffer > 0) {
      this.velocity.y = -config.jumpVelocity;
      this.grounded = false;
      this.coyoteTimer = 0;
      this.jumpBuffer = 0;
      return true;
    }
    return false;
  }

  applyPhysics(dt, config) {
    this.velocity.y = Math.min(
      this.velocity.y + config.gravity * dt,
      config.maxFallSpeed,
    );

    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
  }

  clampHorizontal(minX) {
    if (this.position.x < minX) {
      this.position.x = minX;
      this.velocity.x = Math.max(0, this.velocity.x);
    }
  }
}
