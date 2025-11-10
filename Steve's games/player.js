export class Player {
  constructor(x, y) {
    this.position = { x, y };
    this.previousPosition = { x, y };
    this.velocity = { x: 0, y: 0 };

    this.width = 32;
    this.height = 32;

    this.grounded = false;

    // Wall contact states
    this.touchingLeftWall = false;
    this.touchingRightWall = false;
    this.touchingWall = false;

    // Jump buffers
    this.jumpBuffer = 0;
    this.coyoteTimer = 0;

    // Extra jump control
    this.jumpActive = false;
  }

  get left()   { return this.position.x; }
  get right()  { return this.position.x + this.width; }
  get top()    { return this.position.y; }
  get bottom() { return this.position.y + this.height; }
  get centerX(){ return this.position.x + this.width / 2; }
  get centerY(){ return this.position.y + this.height / 2; }

  beginUpdate(dt, config) {
    this.previousPosition.x = this.position.x;
    this.previousPosition.y = this.position.y;

    if (this.grounded) {
      this.coyoteTimer = config.coyoteTime;
    } else {
      this.coyoteTimer -= dt;
    }

    if (this.jumpBuffer > 0) this.jumpBuffer -= dt;
  }

  applyInput(input, dt, config) {
    const accel = config.moveAcceleration * dt;
    const maxSpeed = config.maxRunSpeed;

    // Horizontal movement
    if (input.left)  this.velocity.x -= accel;
    if (input.right) this.velocity.x += accel;

    // Friction / damping
    if (!input.left && !input.right) {
      const friction = this.grounded ? config.groundFriction : config.airFriction;
      this.velocity.x *= Math.pow(1 - friction * dt, 60 * dt);
    }

    // Clamp horizontal velocity
    this.velocity.x = Math.max(Math.min(this.velocity.x, maxSpeed), -maxSpeed);

    // Jump pressed
    if (input.jumpPressed) {
      this.jumpBuffer = config.jumpBufferTime;
    }

    // ===== NORMAL JUMP =====
    if (
      this.jumpBuffer > 0 &&
      (this.grounded || this.coyoteTimer > 0)
    ) {
      // Slightly higher jump boost 🧗‍♂️
      this.velocity.y = -config.jumpVelocity * 0.9;  // 90% of rocket version
      this.grounded = false;
      this.jumpBuffer = 0;
      this.jumpActive = true;
    }

    // ===== WALL JUMP =====
    if (this.touchingWall && !this.grounded && input.jumpPressed) {
      this.wallJump(config);
      this.jumpBuffer = 0;
      this.jumpActive = true;
    }
  }

  applyPhysics(dt, config) {
    // Gravity — balanced feel between floaty rise and fast fall
    if (!this.grounded) {
      // Slightly reduced gravity while rising for smoother apex
      if (this.velocity.y < 0) {
        this.velocity.y += (config.gravity * 0.32) * dt; // 32% gravity when going up
      } else {
        this.velocity.y += config.gravity * dt; // full gravity when falling
      }

      // Wall sliding (only while falling)
      if (this.touchingWall && this.velocity.y > 0) {
        if (this.velocity.y > config.wallSlideSpeed) {
          this.velocity.y = config.wallSlideSpeed;
        }
      }
    }

    // Limit fall speed (downward only)
    if (this.velocity.y > config.maxFallSpeed) {
      this.velocity.y = config.maxFallSpeed;
    }

    // Integrate position
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
  }

  wallJump(config) {
    // Jump off wall in opposite direction with strong vertical lift
    const dir = this.touchingLeftWall ? 1 : -1;
    this.velocity.x = dir * config.wallJumpVelocityX;
    this.velocity.y = -config.wallJumpVelocityY * 1.05; // slightly more height
    this.touchingLeftWall = false;
    this.touchingRightWall = false;
    this.touchingWall = false;
    this.grounded = false;
  }
}
