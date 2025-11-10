const STORAGE_KEY = 'px2d_selected_player';

const PLAYER_OPTIONS = {
  player1: {
    label: 'Player 1',
    preview: './PLAYER.png',
  },
  player2: {
    label: 'Player 2',
    preview: './PLAYER2.png',
  },
};

const previewContainer = document.getElementById('characterPreview');
const previewImage = document.getElementById('characterPreviewImage');
const optionButtons = Array.from(
  document.querySelectorAll('.characters__option'),
);
const backButton = document.getElementById('charactersBack');

const getStoredCharacter = () => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const normalized = stored.toLowerCase();
    if (PLAYER_OPTIONS[normalized]) {
      return normalized;
    }
    return null;
  } catch (error) {
    return null;
  }
};

const setStoredCharacter = (characterKey) => {
  if (!characterKey || !PLAYER_OPTIONS[characterKey]) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, characterKey);
};

const applySelection = (characterKey) => {
  const validKey = PLAYER_OPTIONS[characterKey] ? characterKey : null;

  for (const button of optionButtons) {
    const isActive = button.dataset.character === validKey;
    if (isActive) {
      button.classList.add('is-active');
      button.setAttribute('aria-pressed', 'true');
    } else {
      button.classList.remove('is-active');
      button.setAttribute('aria-pressed', 'false');
    }
  }

  if (previewImage) {
    if (validKey) {
      const { label, preview } = PLAYER_OPTIONS[validKey];
      previewImage.src = preview;
      previewImage.alt = `${label} preview`;
      if (previewContainer) {
        previewContainer.setAttribute('aria-label', `${label} preview`);
      }
    } else {
      previewImage.src = './PLAYER.png';
      previewImage.alt = 'Default character preview';
      if (previewContainer) {
        previewContainer.setAttribute('aria-label', 'Default character preview');
      }
    }
  }
};

for (const button of optionButtons) {
  const characterKey = button.dataset.character;

  button.addEventListener('click', () => {
    if (!PLAYER_OPTIONS[characterKey]) {
      return;
    }
    setStoredCharacter(characterKey);
    applySelection(characterKey);
  });
}

if (backButton) {
  backButton.addEventListener('click', () => {
    window.location.href = './index.html';
  });
}

const initialCharacter = getStoredCharacter() || 'player1';
applySelection(initialCharacter);
setStoredCharacter(initialCharacter);
