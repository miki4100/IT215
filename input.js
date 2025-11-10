export class InputManager {
  constructor() {
    this.left = false;
    this.right = false;
    this.jump = false;
    this.jumpPressed = false;

    this.keys = new Set();

    // Attach listeners
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  onKeyDown(e) {
    const key = e.code;

    // prevent arrow keys from scrolling the page
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(key)) {
      e.preventDefault();
    }

    if (key === "ArrowLeft" || key === "KeyA") {
      this.left = true;
    }
    if (key === "ArrowRight" || key === "KeyD") {
      this.right = true;
    }
    if (key === "ArrowUp" || key === "Space" || key === "KeyW") {
      // Jump is pressed once per frame
      if (!this.jump) this.jumpPressed = true;
      this.jump = true;
    }

    this.keys.add(key);
  }

  onKeyUp(e) {
    const key = e.code;
    if (key === "ArrowLeft" || key === "KeyA") {
      this.left = false;
    }
    if (key === "ArrowRight" || key === "KeyD") {
      this.right = false;
    }
    if (key === "ArrowUp" || key === "Space" || key === "KeyW") {
      this.jump = false;
    }

    this.keys.delete(key);
  }

  beginFrame() {
    // Reset one-frame triggers
    this.jumpPressed = false;
  }
}
