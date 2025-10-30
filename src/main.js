import { Game } from './world/game.js';

const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
context.imageSmoothingEnabled = false;

const hud = {
  score: document.getElementById('score'),
  coins: document.getElementById('coins'),
  highScore: document.getElementById('highScore'),
  bestCoins: document.getElementById('bestCoins'),
};

const resizeCanvas = () => {
  const aspect = 16 / 9;
  const baseWidth = 960;
  const baseHeight = 540;
  const maxScale = 1.5;
  const horizontalPadding = 64;
  const verticalPadding = 160;
  const maxWidth = 1440;
  const maxHeight = 900;

  const viewportWidth = Math.max(window.innerWidth - horizontalPadding, 360);
  const viewportHeight = Math.max(window.innerHeight - verticalPadding, 240);

  const rawScale =
    Math.min(viewportWidth / baseWidth, viewportHeight / baseHeight) || 1;

  let scale = Math.min(rawScale, maxScale, maxWidth / baseWidth);
  if (rawScale < 1) {
    scale = rawScale;
  }
  if (!Number.isFinite(scale) || scale <= 0) {
    scale = 1;
  }

  let width = Math.round(baseWidth * scale);
  let height = Math.round(baseHeight * scale);

  if (width > viewportWidth) {
    width = Math.floor(viewportWidth);
    height = Math.round(width / aspect);
  }

  if (height > viewportHeight) {
    height = Math.floor(viewportHeight);
    width = Math.round(height * aspect);
  }

  if (width > maxWidth) {
    width = maxWidth;
    height = Math.round(width / aspect);
  }

  if (height > maxHeight) {
    height = maxHeight;
    width = Math.round(height * aspect);
  }

  if (width < baseWidth && viewportWidth >= baseWidth) {
    width = baseWidth;
    height = Math.round(width / aspect);
  }

  if (height < baseHeight && viewportHeight >= baseHeight) {
    height = baseHeight;
    width = Math.round(height * aspect);
  }

  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  return { width, height };
};

const { width, height } = resizeCanvas();

const game = new Game(canvas, context, hud);
game.resize(width, height);
game.start();

window.addEventListener('resize', () => {
  const { width: newWidth, height: newHeight } = resizeCanvas();
  game.resize(newWidth, newHeight);
});
