import { mapValue } from "../utils/utils.js";

export const progressContainer = document.getElementById("progress-container");
export const progressText = document.getElementById("progress");
export const canvas = document.getElementById('three-canvas');

let iron = 0;
let gold = 0;
let crystal = 0;

export function incrementOre(type) {
  if (type === 1) {
    iron += 1;
  } else if (type === 2) {
    gold += 1;
  } else if (type === 3) {
    crystal += 1;
  }
  updateResourceDisplay();
}

function updateResourceDisplay() {
  const oresContainer = document.getElementById('ores');
  if (oresContainer) {
    const oreElements = oresContainer.querySelectorAll('p');
    if (oreElements.length >= 3) {
      oreElements[0].textContent = `Iron ${iron}`;
      oreElements[1].textContent = `Gold ${gold}`;
      oreElements[2].textContent = `Crystal ${crystal}`;
    }
  }
  
  const resourceDisplay = document.querySelector('.resource-display');
  if (resourceDisplay) {
    resourceDisplay.textContent = `${(iron + gold + crystal).toFixed(2)}`;
  }
  
  const xpDisplay = document.querySelector('.xp-display');
  if (xpDisplay) {
    const total = iron + gold + crystal;
    xpDisplay.textContent = `${total}/1450122`;
  }
}

export function toggleHUD() {
  const hud = document.getElementById("control-ui");
  if (hud.style.display === 'none' || hud.style.display === '') {
    hud.style.display = 'flex';
    canvas.style.filter = 'blur(10px)';
  } else {
    hud.style.display = 'none';
    canvas.style.filter = 'none';
  }
}

export function getOres() {
  return { iron, gold, crystal };
}

export function resetOres() {
  iron = 0;
  gold = 0;
  crystal = 0;
  updateResourceDisplay();
}

export function setOres(ironCount, goldCount, crystalCount) {
  iron = ironCount;
  gold = goldCount;
  crystal = crystalCount;
  updateResourceDisplay();
}

export function updatePlayerPositionUI(xyz) {
  const userPosition = document.getElementById('user-position');
  if (userPosition) {
    userPosition.textContent = `POS:\nX:${xyz.x.toFixed(1)}\nY:${xyz.y.toFixed(1)}\nZ:${xyz.z.toFixed(1)}`;
  }
}

export function updateCloestPlanet(xyz) {
  const nearestPlanet = document.getElementById('nearest-planet');
  if (nearestPlanet) {
    nearestPlanet.textContent = `NEAREST PLANET:\n------------\nX:${xyz.x.toFixed(1)}\nY:${xyz.y.toFixed(1)}\nZ:${xyz.z.toFixed(1)}`;
  }
  
  const locationDisplay = document.querySelector('.location-display');
  if (locationDisplay) {
    const distance = Math.sqrt(xyz.x ** 2 + xyz.y ** 2 + xyz.z ** 2);
    locationDisplay.textContent = `${distance.toFixed(0)}km`;
  }
}

export function updateVelocityBar(vel, maxVelocity) {
  const velocityBar = document.getElementById('velocity-bar');
  if (velocityBar) {
    let maxHeight = 300;
    let h = mapValue(vel, 0, maxVelocity, 0, maxHeight);
    velocityBar.style.height = `${h}px`;
  }
}

export function updateHealthBar(health, maxHealth) {
  const healthBar = document.getElementById('health-bar');
  if (healthBar) {
    let maxHeight = 300;
    let h = mapValue(health, 0, maxHealth, 0, maxHeight);
    healthBar.style.height = `${h}px`;
  }
}