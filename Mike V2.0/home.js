const playButton = document.getElementById('menuPlay');
const mapsButton = document.getElementById('menuMaps');
const charactersButton = document.getElementById('menuCharacters');
const optionsButton = document.getElementById('menuOptions');
const exitButton = document.getElementById('menuExit');

if (playButton) {
  playButton.addEventListener('click', () => {
    window.location.href = './game.html';
  });
}

if (mapsButton) {
  mapsButton.addEventListener('click', () => {
    window.location.href = './maps.html';
  });
}

if (charactersButton) {
  charactersButton.addEventListener('click', () => {
    window.location.href = './characters.html';
  });
}

if (optionsButton) {
  optionsButton.addEventListener('click', () => {
    optionsButton.blur();
  });
}

if (exitButton) {
  exitButton.addEventListener('click', () => {
    window.close();
  });
}
