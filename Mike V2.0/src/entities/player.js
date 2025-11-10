export class Player {
  constructor(
    x,
    y,
    {
      scale = 0.25,
      sheetColumns = null,
      sheetRows = null,
      verticalOffset = 80,
    } = {},
  ) {
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

    this.scale = scale;
    this.sprite = null;
    this.sheet = {
      columns: 1,
      rows: 1,
      frameWidth: this.width,
      frameHeight: this.height,
    };
    this.overrideSheet = {
      columns: sheetColumns,
      rows: sheetRows,
    };
    this.frameIndex = 0;
    this.frameTimer = 0;
    this.frameDuration = 0.1;
    this.verticalOffset = verticalOffset;
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

  ensureSprite(image) {
    if (!image || this.sprite === image) {
      return;
    }

    const { columns, rows } = this.getGrid(image);
    const frameWidth = image.width / columns;
    const frameHeight = image.height / rows;

    this.sprite = image;
    this.sheet.columns = columns;
    this.sheet.rows = rows;
    this.sheet.frameWidth = frameWidth;
    this.sheet.frameHeight = frameHeight;
    this.frameIndex = 0;
    this.frameTimer = 0;
  }

  getGrid(image) {
    const { columns: overrideColumns, rows: overrideRows } = this.overrideSheet;
    if (
      Number.isInteger(overrideColumns) &&
      overrideColumns > 0 &&
      image.width % overrideColumns === 0 &&
      Number.isInteger(overrideRows) &&
      overrideRows > 0 &&
      image.height % overrideRows === 0
    ) {
      return { columns: overrideColumns, rows: overrideRows };
    }

    const widthFactors = this.getFactors(image.width);
    const heightFactors = this.getFactors(image.height);

    let best = { columns: 1, rows: 1, score: Number.POSITIVE_INFINITY };
    for (const columns of widthFactors) {
      for (const rows of heightFactors) {
        const frameWidth = image.width / columns;
        const frameHeight = image.height / rows;
        const aspect = frameWidth / frameHeight;
        const aspectScore = Math.abs(1 - aspect);
        const sizeScore = Math.abs(frameWidth - 128) + Math.abs(frameHeight - 128);
        const totalScore = aspectScore * 4 + sizeScore / 128;
        if (totalScore < best.score) {
          best = { columns, rows, score: totalScore };
        }
      }
    }

    return { columns: best.columns, rows: best.rows };
  }

  getFactors(value) {
    const factors = new Set([1]);
    for (let i = 2; i <= Math.min(16, value); i += 1) {
      if (value % i === 0) {
        factors.add(i);
      }
    }
    factors.add(value);
    return Array.from(factors).sort((a, b) => a - b);
  }

  updateAnimation(dt) {
    if (!this.sprite) {
      return;
    }

    const moving = Math.abs(this.velocity.x) > 5;
    if (!moving) {
      this.frameIndex = 0;
      this.frameTimer = 0;
      return;
    }

    this.frameTimer += dt;
    if (this.frameTimer >= this.frameDuration) {
      this.frameTimer -= this.frameDuration;
      const framesInRow = this.sheet.columns;
      this.frameIndex = (this.frameIndex + 1) % framesInRow;
    }
  }

  draw(ctx) {
    if (!this.sprite) {
      ctx.fillStyle = '#f0c987';
      ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
      ctx.fillStyle = '#1f2a44';
      ctx.fillRect(
        this.position.x,
        this.position.y + this.height - 12,
        this.width,
        12,
      );
      ctx.fillStyle = '#fff';
      const eyeSize = 4;
      const eyeOffsetX = this.facing === 1 ? 10 : this.width - 14;
      ctx.fillRect(
        this.position.x + eyeOffsetX,
        this.position.y + 10,
        eyeSize,
        eyeSize,
      );
      return;
    }

    const frameWidth = this.sheet.frameWidth;
    const frameHeight = this.sheet.frameHeight;
    const column = this.frameIndex;
    const sx = column * frameWidth;
    const sy = 0;
    const scaledW = frameWidth * this.scale;
    const scaledH = frameHeight * this.scale;
    const offset = this.verticalOffset * this.scale;
    const destX = this.position.x + this.width / 2 - scaledW / 2;
    const destY = this.position.y + this.height - scaledH;

    ctx.save();
    if (this.facing === -1) {
      ctx.translate(destX + scaledW, destY - offset);
      ctx.scale(-1, 1);
      ctx.drawImage(
        this.sprite,
        sx,
        sy,
        frameWidth,
        frameHeight,
        0,
        0,
        scaledW,
        scaledH,
      );
    } else {
      ctx.drawImage(
        this.sprite,
        sx,
        sy,
        frameWidth,
        frameHeight,
        destX,
        destY - offset,
        scaledW,
        scaledH,
      );
    }
    ctx.restore();
  }
}
