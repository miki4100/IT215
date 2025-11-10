const STORAGE_KEY = 'px2d_selected_map';

const MAP_OPTIONS = {
  fall: {
    label: 'Fall',
    path: './maps/Fall.png',
  },
  winter: {
    label: 'Winter',
    path: './maps/Winter.png',
  },
  summer: {
    label: 'Summer',
    path: './maps/Summer.png',
  },
  city: {
    label: 'City',
    path: './maps/City.jpg',
  },
  city2: {
    label: 'City 2',
    path: './maps/City 2.png',
  },
  crystal: {
    label: 'Crystal',
    path: './maps/Crystal.png',
  },
  forest: {
    label: 'Forest',
    path: './maps/Forest.png',
  },
  night: {
    label: 'Night',
    path: './maps/Night.png',
  },
  temple: {
    label: 'Temple',
    path: './maps/Temple.png',
  },
};

const preview = document.getElementById('mapPreview');
const optionButtons = Array.from(document.querySelectorAll('.maps__option'));
const backButton = document.getElementById('mapsBack');

const getStoredMap = () => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const normalized = stored.toLowerCase();
    if (MAP_OPTIONS[normalized]) {
      return normalized;
    }
    return null;
  } catch (error) {
    return null;
  }
};

const setStoredMap = (mapKey) => {
  if (!mapKey || !MAP_OPTIONS[mapKey]) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, mapKey);
};

const applySelection = (mapKey) => {
  const validKey = MAP_OPTIONS[mapKey] ? mapKey : null;

  for (const button of optionButtons) {
    const isActive = button.dataset.map === validKey;
    if (isActive) {
      button.classList.add('is-active');
      button.setAttribute('aria-pressed', 'true');
    } else {
      button.classList.remove('is-active');
      button.setAttribute('aria-pressed', 'false');
    }
  }

  if (preview) {
    if (validKey) {
      const { label, path } = MAP_OPTIONS[validKey];
      preview.style.backgroundImage = `url("${path}")`;
      preview.setAttribute('aria-label', `${label} map preview`);
    } else {
      preview.style.backgroundImage = 'url("./homepage.jpg")';
      preview.setAttribute('aria-label', 'Default map preview');
    }
  }
};

for (const button of optionButtons) {
  const mapKey = button.dataset.map;
  const thumb = button.querySelector('.maps__option-thumb');
  if (thumb && MAP_OPTIONS[mapKey]) {
    thumb.style.backgroundImage = `url("${MAP_OPTIONS[mapKey].path}")`;
  }

  button.addEventListener('click', () => {
    if (!MAP_OPTIONS[mapKey]) {
      return;
    }
    setStoredMap(mapKey);
    applySelection(mapKey);
  });
}

if (backButton) {
  backButton.addEventListener('click', () => {
    window.location.href = './index.html';
  });
}

applySelection(getStoredMap());
