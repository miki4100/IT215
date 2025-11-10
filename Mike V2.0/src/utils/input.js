const KEY_BINDINGS = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'jump',
  KeyW: 'jump',
  Space: 'jump',
};

export class InputManager {
  constructor() {
    this.state = new Map();
    this.pressed = new Set();
    this.released = new Set();

    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleKeyUp = this._handleKeyUp.bind(this);

    window.addEventListener('keydown', this._handleKeyDown);
    window.addEventListener('keyup', this._handleKeyUp);
  }

  beginFrame() {
    this.pressed.clear();
    this.released.clear();
  }

  destroy() {
    window.removeEventListener('keydown', this._handleKeyDown);
    window.removeEventListener('keyup', this._handleKeyUp);
  }

  isDown(action) {
    return this.state.get(action) ?? false;
  }

  wasPressed(action) {
    return this.pressed.has(action);
  }

  wasReleased(action) {
    return this.released.has(action);
  }

  consumePressed(action) {
    if (this.pressed.has(action)) {
      this.pressed.delete(action);
      return true;
    }
    return false;
  }

  _handleKeyDown(event) {
    const action = KEY_BINDINGS[event.code];
    if (!action) {
      return;
    }

    if (!this.state.get(action)) {
      this.pressed.add(action);
    }

    this.state.set(action, true);
    event.preventDefault();
  }

  _handleKeyUp(event) {
    const action = KEY_BINDINGS[event.code];
    if (!action) {
      return;
    }

    this.state.set(action, false);
    this.released.add(action);
    event.preventDefault();
  }
}
