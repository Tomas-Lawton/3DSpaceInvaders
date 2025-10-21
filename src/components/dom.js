import { mapValue } from "../utils/utils.js";

// Canvas and progress elements
export const progressContainer = document.getElementById("progress-container");
export const progressText = document.getElementById("progress");
export const canvas = document.getElementById('three-canvas');

// Ore tracking
let iron = 0;
let gold = 0;
let crystal = 0;

// Increment ore collection
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

// Update resource display in HUD
function updateResourceDisplay() {
  const resourceDisplay = document.querySelector('.resource-display');
  if (resourceDisplay) {
    resourceDisplay.textContent = `${(iron + gold + crystal).toFixed(2)}`;
  }
  
  // Update XP display with total resources
  const xpDisplay = document.querySelector('.xp-display');
  if (xpDisplay) {
    const total = iron + gold + crystal;
    xpDisplay.textContent = `${total}/1450122`;
  }
}

// Toggle HUD menu (for ship selection screen)
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

// Get current ore counts
export function getOres() {
  return { iron, gold, crystal };
}

// Reset ores (if needed for game restart)
export function resetOres() {
  iron = 0;
  gold = 0;
  crystal = 0;
  updateResourceDisplay();
}

// Set ores directly (for loading saved game)
export function setOres(ironCount, goldCount, crystalCount) {
  iron = ironCount;
  gold = goldCount;
  crystal = crystalCount;
  updateResourceDisplay();
}

// Update player position UI (legacy support or can integrate into new HUD)
export function updatePlayerPositionUI(xyz) {
  // Option 1: Update in info box if you have a position display area
  const infoBox = document.getElementById('info-box');
  if (infoBox) {
    const positionText = infoBox.querySelector('.position-info');
    if (positionText) {
      positionText.textContent = `POS: X:${xyz.x.toFixed(1)} Y:${xyz.y.toFixed(1)} Z:${xyz.z.toFixed(1)}`;
    }
  }
  
  // Option 2: Console log (for debugging)
  // console.log(`Player Position - X:${xyz.x.toFixed(1)} Y:${xyz.y.toFixed(1)} Z:${xyz.z.toFixed(1)}`);
}

// Update closest planet display (legacy support or can integrate into new HUD)
export function updateCloestPlanet(xyz) {
  // Option 1: Update in radar section or info box
  const infoBox = document.getElementById('info-box');
  if (infoBox) {
    const planetText = infoBox.querySelector('.planet-info');
    if (planetText) {
      planetText.textContent = `NEAREST PLANET: X:${xyz.x.toFixed(1)} Y:${xyz.y.toFixed(1)} Z:${xyz.z.toFixed(1)}`;
    }
  }
  
  // Option 2: Update location display in new HUD
  const locationDisplay = document.querySelector('.location-display');
  if (locationDisplay) {
    const distance = Math.sqrt(xyz.x ** 2 + xyz.y ** 2 + xyz.z ** 2);
    locationDisplay.textContent = `${distance.toFixed(0)}km`;
  }
}

// Update velocity bar (legacy - now handled by updateHUDStats in hud.js)
export function updateVelocityBar(vel, maxVelocity) {
  // Can map to new HUD stats if needed
  const velocityStat = document.getElementById('velocity-stat');
  if (velocityStat) {
    const percentage = (vel / maxVelocity) * 100;
    velocityStat.style.width = `${Math.min(percentage, 100)}%`;
  }
}

// Update health bar (legacy - now handled by updateShipHealth in hud.js)
export function updateHealthBar(health, maxHealth) {
  // Can integrate with status checklist in new HUD
  const healthPercentage = health / maxHealth;
  
  // Update thermal shield status based on health
  const thermalShield = document.querySelector('.status-item:first-child');
  if (thermalShield) {
    const subtitle = thermalShield.querySelector('.status-subtitle');
    if (healthPercentage < 0.3) {
      thermalShield.classList.remove('status-complete');
      thermalShield.classList.add('status-pending');
      subtitle.textContent = 'Critical';
    } else if (healthPercentage < 0.6) {
      subtitle.textContent = 'Damaged';
    } else {
      thermalShield.classList.add('status-complete');
      thermalShield.classList.remove('status-pending');
      subtitle.textContent = 'Applied';
    }
  }
}