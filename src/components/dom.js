import { mapValue } from "../utils/utils.js";

export const progressContainer = document.getElementById("progress-container");
export const progressText = document.getElementById("progress");
export const canvas = document.getElementById('three-canvas');

let iron = 0;
let gold = 0;
let crystal = 0;
let xp = 0;

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
    xpDisplay.textContent = `XP: ${xp}`;
  }
}

export function addXP(amount) {
  xp += amount;
  updateResourceDisplay();
  console.log(`+${amount} XP! Total: ${xp}`);
}

export function getXP() {
  return xp;
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

export function updateDirectionalIndicators(playerPosition, playerForwardDirection, planets, enemies) {
  const container = document.getElementById('indicators-container');
  if (!container || !playerForwardDirection) return;

  // Clear all existing indicators
  container.innerHTML = '';

  // Circle radius from center of screen
  const circleRadius = 180;
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  // Helper function to create and position an indicator
  const createIndicator = (targetPosition, type) => {
    // Calculate direction vector from player to target in world space
    const dirToTarget = {
      x: targetPosition.x - playerPosition.x,
      y: targetPosition.y - playerPosition.y,
      z: targetPosition.z - playerPosition.z
    };

    // Get 3D distance
    const distance3D = Math.sqrt(
      dirToTarget.x * dirToTarget.x +
      dirToTarget.y * dirToTarget.y +
      dirToTarget.z * dirToTarget.z
    );

    if (distance3D === 0) return; // Skip if same position

    // Normalize the direction vector
    const normalizedDir = {
      x: dirToTarget.x / distance3D,
      y: dirToTarget.y / distance3D,
      z: dirToTarget.z / distance3D
    };

    // Player's forward direction (already normalized from getWorldDirection)
    const forward = {
      x: playerForwardDirection.x,
      y: playerForwardDirection.y,
      z: playerForwardDirection.z
    };

    // Calculate right vector (perpendicular to forward, in the horizontal plane)
    // Using world up (0, 1, 0) to keep right vector horizontal
    const worldUp = { x: 0, y: 1, z: 0 };
    let right = {
      x: worldUp.y * forward.z - worldUp.z * forward.y,
      y: worldUp.z * forward.x - worldUp.x * forward.z,
      z: worldUp.x * forward.y - worldUp.y * forward.x
    };

    // Normalize right vector
    const rightLength = Math.sqrt(right.x * right.x + right.y * right.y + right.z * right.z);
    if (rightLength > 0.001) {
      right.x /= rightLength;
      right.y /= rightLength;
      right.z /= rightLength;
    } else {
      // Fallback if forward is straight up/down
      right = { x: 1, y: 0, z: 0 };
    }

    // Calculate up vector (perpendicular to both forward and right)
    const up = {
      x: forward.y * right.z - forward.z * right.y,
      y: forward.z * right.x - forward.x * right.z,
      z: forward.x * right.y - forward.y * right.x
    };

    // Project target direction onto player's local coordinate system using dot product
    const localRight = normalizedDir.x * right.x + normalizedDir.y * right.y + normalizedDir.z * right.z; // right/left
    const localUp = normalizedDir.x * up.x + normalizedDir.y * up.y + normalizedDir.z * up.z; // up/down
    const localForward = normalizedDir.x * forward.x + normalizedDir.y * forward.y + normalizedDir.z * forward.z; // front/back

    // HORIZONTAL PLANE: Use only forward and right for the circle position
    // This shows "where to turn" on a compass
    let horizontalX = localRight;
    let horizontalZ = localForward;

    // Calculate angle on horizontal plane
    let horizontalAngle = Math.atan2(horizontalX, horizontalZ); // atan2(right, forward)

    // Position on circle based on horizontal angle
    let screenX = Math.sin(horizontalAngle) * circleRadius;
    let screenY = -Math.cos(horizontalAngle) * circleRadius; // Negative because screen Y is inverted

    // Calculate final screen position
    const indicatorX = centerX + screenX;
    const indicatorY = centerY + screenY;

    // Calculate arrow rotation - tangent to the circle, pointing along the bearing
    const arrowAngle = (horizontalAngle * 180 / Math.PI);

    // Determine arrow symbol based on vertical position
    let arrowSymbol;
    const verticalThreshold = 0.3; // Threshold for "level"

    if (localUp > verticalThreshold) {
      arrowSymbol = '▲'; // Target is above - climb
    } else if (localUp < -verticalThreshold) {
      arrowSymbol = '▼'; // Target is below - dive
    } else {
      arrowSymbol = '▶'; // Target is level - turn only
    }

    // Create indicator element
    const indicator = document.createElement('div');
    indicator.className = `direction-arrow ${type}`;
    indicator.style.left = `${indicatorX}px`;
    indicator.style.top = `${indicatorY}px`;

    // Add vertical offset class for styling
    if (localUp > verticalThreshold) {
      indicator.classList.add('above');
    } else if (localUp < -verticalThreshold) {
      indicator.classList.add('below');
    }

    // Create arrow icon
    const arrow = document.createElement('div');
    arrow.className = 'arrow-icon';
    arrow.textContent = arrowSymbol;
    // Rotate arrow to point along the bearing direction
    arrow.style.transform = `rotate(${arrowAngle}deg)`;

    indicator.appendChild(arrow);
    container.appendChild(indicator);
  };

  // Create indicators for all planets
  if (planets && planets.length > 0) {
    planets.forEach(planet => {
      createIndicator(planet.position, 'planet');
    });
  }

  // Create indicators for all enemies
  if (enemies && enemies.length > 0) {
    enemies.forEach(enemy => {
      createIndicator(enemy.position, 'enemy');
    });
  }
}