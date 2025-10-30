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

const game = new Game(canvas, context, hud);
game.start();
