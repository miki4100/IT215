import { Game } from './world/game.js';
import { level1 } from './world/level1.js';
import { level2 } from './world/level2.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// HUD references
const hud = {
  score: document.getElementById('score'),
  coins: document.getElementById('coins'),
  highScore: document.getElementById('highScore'),
  bestCoins: document.getElementById('bestCoins'),
};

// UI references
const homeScreen = document.getElementById('home-screen');
const levelSelect = document.getElementById('level-select');
const hudContainer = document.getElementById('hud');
const btnPlay = document.getElementById('btn-play');
const btnBack = document.getElementById('btn-back');
const btnLevel1 = document.getElementById('btn-level1');
const btnLevel2 = document.getElementById('btn-level2');

function show(el) {
  el.classList.remove('hidden');
}
function hide(el) {
  el.classList.add('hidden');
}

let game = null;

function startLevel(levelDef) {
  console.log("Starting level:", levelDef?.name);

  // ✅ Hide menus and show HUD
  hide(homeScreen);
  hide(levelSelect);
  show(hudContainer);

  // Stop any previous game
  if (game && game.stop) {
    game.stop();
    game = null;
  }

  // Start new game
  try {
    game = new Game(canvas, ctx, hud, levelDef);
    game.start();
    console.log("Game started successfully!");
  } catch (err) {
    console.error("Error starting game:", err);
  }
}

// ✅ Event handlers
btnPlay.addEventListener('click', () => {
  console.log("Play clicked");
  hide(homeScreen);
  show(levelSelect);
});

btnBack.addEventListener('click', () => {
  console.log("Back clicked");
  hide(levelSelect);
  show(homeScreen);
});

btnLevel1.addEventListener('click', () => {
  console.log("Level 1 clicked");
  startLevel(level1);
});

btnLevel2.addEventListener('click', () => {
  console.log("Level 2 clicked");
  startLevel(level2);
});

// ✅ Initial screen
show(homeScreen);
hide(levelSelect);
hide(hudContainer);
