import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { initializeUpgradeUI, onPauseMenuOpen } from "./upgrade-ui.js";
import { initializeMessageUI, onPauseMenuOpenMessage } from "./message-ui.js";

let scene, camera, renderer, currentModel, controls;
const models = {};

const canvas = document.getElementById("ship-hanger");

export const modelPaths = [
  {
    path: "public/ships/ship_5/",
    rotation: { x: 0, y: Math.PI / 2, z: 0 },
    isNormalized: false,
    name: "SOLAR PHANTOM",
    boosterColor: 0xffaa00, // Orange
    laserColor: 0xffaa00,
    laserGlow: 0xff8800,
    boosterOffset: { x: 0, y: 2, z: -5 }, // Default position
    baseStats: {
      speed: 65,        // Base speed rating (0-100)
      armor: 50,        // Base armor rating (0-100)
      firepower: 55,    // Base firepower rating (0-100)
      agility: 70       // Base agility rating (0-100)
    }
  },
  {
    path: "public/ships/ship_2/",
    rotation: { x: 0, y: Math.PI / 2, z: 0 },
    isNormalized: false,
    name: "STORM SCOUT",
    boosterColor: 0xff6600, // Red-Orange
    laserColor: 0xff6600,
    laserGlow: 0xff3300,
    boosterOffset: { x: 0, y: 6, z: -5 }, // Default position
    baseStats: {
      speed: 80,        // Fast scout
      armor: 40,        // Light armor
      firepower: 50,    // Moderate firepower
      agility: 85       // Very agile
    }
  },
  {
    path: "public/ships/ship_0/",
    rotation: { x: 0, y: 0, z: 0 },
    isNormalized: false,
    name: "VOID REAPER",
    boosterColor: 0xc87dff, // Purple
    laserColor: 0xc87dff,
    laserGlow: 0x9400ff,
    boosterOffset: { x: 0, y: 8, z: -5 }, // Fighter - raised booster
    baseStats: {
      speed: 70,        // Good speed
      armor: 65,        // Heavy armor
      firepower: 80,    // High firepower
      agility: 60       // Moderate agility
    }
  },
  {
    path: "public/ships/ship_6/",
    rotation: { x: 0, y: Math.PI / 2, z: 0 },
    isNormalized: false,
    name: "EMERALD FURY",
    boosterColor: 0x00ff66, // Green
    laserColor: 0x00ff66,
    laserGlow: 0x00cc44,
    boosterOffset: { x: 0, y: 2, z: -5 }, // Default position
    baseStats: {
      speed: 55,        // Slower
      armor: 85,        // Very heavy armor
      firepower: 75,    // Strong firepower
      agility: 45       // Less agile
    }
  },
  {
    path: "public/ships/ship_7/",
    rotation: { x: 0, y: 2 * Math.PI, z: 0 },
    isNormalized: false,
    name: "GHOST INTERCEPTOR",
    boosterColor: 0x6699ff, // Light Blue
    laserColor: 0x6699ff,
    laserGlow: 0x3366cc,
    boosterOffset: { x: 0, y: 4, z: -5 }, // Default position
    baseStats: {
      speed: 90,        // Very fast
      armor: 45,        // Light armor
      firepower: 70,    // Good firepower
      agility: 95       // Extremely agile
    }
  },
];

export function initHUD() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.set(0, 10, 100);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(700, 700);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000, 0);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
 
  const light = new THREE.DirectionalLight(0xffffff, 10);
  light.position.set(5, 10, 7.5);
  scene.add(light);

  const light2 = new THREE.DirectionalLight(0x00ffec, 0.55);
  light2.position.set(-5, 10, -7.5);
  scene.add(light2);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.45;
  controls.screenSpacePanning = false;
  controls.maxPolarAngle = Math.PI / 2;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 2.0;

  loadShipModels().then(() => {
    switchModel("ship-1");
  });

  animate();
  initializeUpgradeUI(); // Initialize upgrade system UI
  initializeMessageUI(); // Initialize message system UI
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

async function loadShipModels() {
  const loader = new GLTFLoader();

  try {
    // Map modelPaths array to correct ship IDs
    // Available ships in folder: 0, 2, 5, 6, 7
    // HTML has: ship-1, ship-2, ship-3, ship-4, ship-6
    const shipMapping = [
      'ship-1', // index 0: ship_5 folder -> ship-1 (SOLAR PHANTOM - STARTER)
      'ship-2', // index 1: ship_2 folder -> ship-2 (STORM SCOUT)
      'ship-3', // index 2: ship_0 folder -> ship-3 (VOID REAPER)
      'ship-4', // index 3: ship_6 folder -> ship-4 (EMERALD FURY)
      'ship-6'  // index 4: ship_7 folder -> ship-6 (GHOST INTERCEPTOR)
    ];

    const modelPromises = modelPaths.map(async (modelData, index) => {
      const gltf = await loader.setPath(modelData.path).loadAsync("scene.gltf");
      const model = gltf.scene.clone();
      const shipId = shipMapping[index];
      models[shipId] = {
        model,
        rotation: modelData.rotation,
        isNormalized: false,
        name: modelData.name,
        boosterColor: modelData.boosterColor,
        laserColor: modelData.laserColor,
        laserGlow: modelData.laserGlow,
        boosterOffset: modelData.boosterOffset,
        baseStats: modelData.baseStats,
      };
      console.log(`Loaded ${modelData.path} as ${shipId} (${modelData.name})`);
    });

    await Promise.all(modelPromises);
    console.log('All ship models loaded:', Object.keys(models));
  } catch (error) {
    console.error("Error loading models:", error);
  }
}

// Ship selection is now handled by upgrade-ui.js
// Export switchModel so it can be called from upgrade-ui.js
export { switchModel };

let previousModelId = null;

// Function to refresh diagnostics for current ship (used when upgrades change)
export function refreshDiagnostics() {
  if (currentModel && currentModel.baseStats) {
    updateShipDiagnostics(currentModel.baseStats);
  }
}

function switchModel(shipId) {
  console.log(`switchModel called with: ${shipId}`);
  console.log(`Available models:`, Object.keys(models));

  if (!models[shipId]) {
    console.warn(`Model not found for ${shipId}`);
    return;
  }

  if (previousModelId === shipId) {
    console.log(`Already showing ${shipId}`);
    return;
  }

  if (currentModel) {
    scene.remove(currentModel.model);
  }

  currentModel = models[shipId];

  if (!currentModel.isNormalized) {
    normalizeModelSize(currentModel.model, 55);
    normalizeModelPosition(currentModel.model);
    currentModel.isNormalized = true;
  }

  currentModel.model.rotation.set(
    currentModel.rotation.x,
    currentModel.rotation.y,
    currentModel.rotation.z
  );

  scene.add(currentModel.model);

  // Update ship name display
  const shipNameElem = document.querySelector(".ship-name");
  if (shipNameElem && currentModel.name) {
    shipNameElem.textContent = currentModel.name;
  }

  // Update ship diagnostics with base stats
  if (currentModel.baseStats) {
    updateShipDiagnostics(currentModel.baseStats);
  }

  previousModelId = shipId;
  console.log(`Successfully switched to ${shipId}`);
}

// Animate ship diagnostics when switching ships
function updateShipDiagnostics(baseStats) {
  const speedBar = document.getElementById("velocity-stat");
  const armorBar = document.getElementById("altitude-stat");
  const firepowerBar = document.getElementById("apogee-stat");
  const agilityBar = document.getElementById("perigee-stat");

  const speedValue = document.getElementById("velocity-value");
  const armorValue = document.getElementById("altitude-value");
  const firepowerValue = document.getElementById("apogee-value");
  const agilityValue = document.getElementById("perigee-value");

  // Import upgrade system to get bonuses
  import('../utils/upgrade-system.js').then(({ getTotalBonuses }) => {
    const bonuses = getTotalBonuses();

    // Calculate final stats: base stats + upgrade bonuses
    // Speed upgrade adds percentage boost
    const finalSpeed = Math.min(100, Math.round(baseStats.speed * bonuses.speedMultiplier));
    // Health upgrade adds flat bonus (convert to rating scale)
    const finalArmor = Math.min(100, Math.round(baseStats.armor + (bonuses.healthBonus * 0.5)));
    // Fire rate upgrade adds percentage boost
    const finalFirepower = Math.min(100, Math.round(baseStats.firepower * bonuses.fireRateMultiplier));
    // Agility isn't affected by upgrades directly, but we could add shields as bonus
    const finalAgility = Math.min(100, Math.round(baseStats.agility + (bonuses.damageReduction * 20)));

    // Animate bars from current to target values
    animateStatBar(speedBar, finalSpeed);
    animateStatBar(armorBar, finalArmor);
    animateStatBar(firepowerBar, finalFirepower);
    animateStatBar(agilityBar, finalAgility);

    // Update text values showing base + bonus
    if (speedValue) {
      const bonus = finalSpeed - baseStats.speed;
      speedValue.textContent = bonus > 0 ? `${finalSpeed} (+${bonus})` : `${finalSpeed}`;
    }
    if (armorValue) {
      const bonus = finalArmor - baseStats.armor;
      armorValue.textContent = bonus > 0 ? `${finalArmor} (+${Math.round(bonus)})` : `${finalArmor}`;
    }
    if (firepowerValue) {
      const bonus = finalFirepower - baseStats.firepower;
      firepowerValue.textContent = bonus > 0 ? `${finalFirepower} (+${bonus})` : `${finalFirepower}`;
    }
    if (agilityValue) {
      const bonus = finalAgility - baseStats.agility;
      agilityValue.textContent = bonus > 0 ? `${finalAgility} (+${Math.round(bonus)})` : `${finalAgility}`;
    }
  });
}

// Helper function to animate stat bars smoothly
function animateStatBar(barElement, targetPercentage) {
  if (!barElement) return;

  const currentWidth = parseFloat(barElement.style.width) || 0;
  const duration = 500; // Animation duration in ms
  const startTime = performance.now();

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease out cubic
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const newWidth = currentWidth + (targetPercentage - currentWidth) * easeProgress;

    barElement.style.width = `${newWidth}%`;

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

export function normalizeModelSize(model, targetSize = 1) {
  const bbox = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const maxDimension = Math.max(size.x, size.y, size.z);
  const scaleFactor = targetSize / maxDimension;

  if (
    Math.abs(model.scale.x - scaleFactor) > 0.01 ||
    Math.abs(model.scale.y - scaleFactor) > 0.01 ||
    Math.abs(model.scale.z - scaleFactor) > 0.01
  ) {
    model.scale.set(scaleFactor, scaleFactor, scaleFactor);
  }
}

export function normalizeModelPosition(model) {
  const box = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  box.getCenter(center);

  model.position.sub(center);

  const offsetY = box.min.y;
  model.position.y -= offsetY;
}

// Export function to update stats from game
export function updateHUDStats(stats) {
  const { velocity, altitude, apogee, perigee } = stats;

  // Update stat values
  const velocityValue = document.getElementById("velocity-value");
  const altitudeValue = document.getElementById("altitude-value");
  const apogeeValue = document.getElementById("apogee-value");
  const perigeeValue = document.getElementById("perigee-value");

  if (velocityValue) velocityValue.textContent = `${velocity.toFixed(2)} km/s`;
  if (altitudeValue) altitudeValue.textContent = `${altitude.toFixed(1)} km`;
  if (apogeeValue) apogeeValue.textContent = `${apogee.toFixed(1)} km`;
  if (perigeeValue) perigeeValue.textContent = `${perigee.toFixed(1)} km`;

  // Update progress bars (0-100%)
  const velocityStat = document.getElementById("velocity-stat");
  const altitudeStat = document.getElementById("altitude-stat");
  const apogeeStat = document.getElementById("apogee-stat");
  const perigeeStat = document.getElementById("perigee-stat");

  if (velocityStat)
    velocityStat.style.width = `${Math.min(velocity * 10, 100)}%`;
  if (altitudeStat)
    altitudeStat.style.width = `${Math.min(altitude / 10, 100)}%`;
  if (apogeeStat) apogeeStat.style.width = `${Math.min(apogee / 10, 100)}%`;
  if (perigeeStat) perigeeStat.style.width = `${Math.min(perigee / 10, 100)}%`;
}

// Update ship health status in HUD
export function updateShipHealth(health, maxHealth) {
  const healthPercentage = (health / maxHealth) * 100;

  // Update status items based on health
  const statusItems = document.querySelectorAll(".status-item");

  if (healthPercentage < 30) {
    // Critical health - show warnings
    statusItems.forEach((item, index) => {
      if (index === 0) {
        // Thermal Shield
        item.classList.remove("status-complete");
        item.classList.add("status-pending");
        item.querySelector(".status-subtitle").textContent = "Critical";
      }
    });
  } else if (healthPercentage < 60) {
    // Medium health - show caution
    statusItems.forEach((item, index) => {
      if (index === 0) {
        item.querySelector(".status-subtitle").textContent = "Damaged";
      }
    });
  } else {
    // Healthy
    statusItems.forEach((item, index) => {
      if (index === 0) {
        item.classList.add("status-complete");
        item.classList.remove("status-pending");
        item.querySelector(".status-subtitle").textContent = "Applied";
      }
    });
  }
}

// Update location display
export function updateLocation(locationName) {
  const locationDisplay = document.querySelector(".location-display");
  if (locationDisplay) {
    locationDisplay.textContent = locationName.toUpperCase();
  }
}

// Update ship name display
export function updateShipName(shipName, availability = "AVAILABLE") {
  const shipNameElem = document.querySelector(".ship-name");
  const shipStatusElem = document.querySelector(".ship-status");

  if (shipNameElem) shipNameElem.textContent = shipName.toUpperCase();
  if (shipStatusElem) {
    shipStatusElem.textContent = availability.toUpperCase();
    shipStatusElem.style.color =
      availability === "AVAILABLE" ? "#00ff00" : "#ff0000";
  }
}
