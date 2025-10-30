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

export function deductXP(amount) {
  xp = Math.max(0, xp - amount);
  updateResourceDisplay();
  console.log(`-${amount} XP. Remaining: ${xp}`);
}

export function getXP() {
  return xp;
}

// Make addXP globally available for testing
if (typeof window !== 'undefined') {
  window.addXP = addXP;
}

export function toggleHUD() {
  const hud = document.getElementById("control-ui");
  if (hud.style.display === 'none' || hud.style.display === '') {
    hud.style.display = 'flex';
    canvas.style.filter = 'blur(10px)';
    // Update upgrade UI when opening pause menu
    import('../hud/upgrade-ui.js').then(module => {
      module.onPauseMenuOpen();
    }).catch(err => console.error('Failed to load upgrade UI:', err));
    // Update message UI when opening pause menu
    import('../hud/message-ui.js').then(module => {
      module.onPauseMenuOpenMessage();
    }).catch(err => console.error('Failed to load message UI:', err));
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
    // In Three.js, the default forward is -Z axis
    const forward = {
      x: playerForwardDirection.x,
      y: playerForwardDirection.y,
      z: playerForwardDirection.z
    };

    // Calculate right vector using cross product: right = forward × up
    // World up vector
    const worldUp = { x: 0, y: 1, z: 0 };
    let right = {
      x: forward.y * worldUp.z - forward.z * worldUp.y,
      y: forward.z * worldUp.x - forward.x * worldUp.z,
      z: forward.x * worldUp.y - forward.y * worldUp.x
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

    // Calculate up vector using cross product: up = right × forward
    const up = {
      x: right.y * forward.z - right.z * forward.y,
      y: right.z * forward.x - right.x * forward.z,
      z: right.x * forward.y - right.y * forward.x
    };

    // Project target direction onto player's local coordinate system
    const localRight = normalizedDir.x * right.x + normalizedDir.y * right.y + normalizedDir.z * right.z;
    const localUp = normalizedDir.x * up.x + normalizedDir.y * up.y + normalizedDir.z * up.z;
    const localForward = normalizedDir.x * forward.x + normalizedDir.y * forward.y + normalizedDir.z * forward.z;

    // Calculate angle in the horizontal plane
    // atan2(x, z) gives us the angle where:
    // - 0° is straight ahead
    // - 90° is to the right
    // - -90° is to the left
    // - 180° is behind
    const horizontalAngle = Math.atan2(localRight, localForward);

    // Position indicator on the circle
    // We need to rotate by 90° to align with screen coordinates
    // where positive X is right and positive Y is down
    const screenX = Math.sin(horizontalAngle) * circleRadius;
    const screenY = -Math.cos(horizontalAngle) * circleRadius; // Negative because screen Y goes down

    // Calculate final screen position
    const indicatorX = centerX + screenX;
    const indicatorY = centerY + screenY;

    // Calculate arrow rotation to point toward the target
    // Convert to degrees and adjust for screen coordinates
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