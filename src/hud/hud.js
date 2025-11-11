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
  },
  {
    path: "public/ships/ship_1/",
    rotation: { x: 0, y: Math.PI / 2, z: 0 },
    isNormalized: false,
    name: "NOVA STRIKER",
    boosterColor: 0x00ffee, // Cyan
    laserColor: 0x00ffee,
    laserGlow: 0x00ccbb,
  },
  {
    path: "public/ships/ship_0/",
    rotation: { x: 0, y: 0, z: 0 },
    isNormalized: false,
    name: "VOID REAPER",
    boosterColor: 0xc87dff, // Purple
    laserColor: 0xc87dff,
    laserGlow: 0x9400ff,
  },
  {
    path: "public/ships/ship_6/",
    rotation: { x: 0, y: Math.PI / 2, z: 0 },
    isNormalized: false,
    name: "EMERALD FURY",
    boosterColor: 0x00ff66, // Green
    laserColor: 0x00ff66,
    laserGlow: 0x00cc44,
  },
  {
    path: "public/ships/ship_7/",
    rotation: { x: 0, y: 2 * Math.PI, z: 0 },
    isNormalized: false,
    name: "GHOST BLADE",
    boosterColor: 0x6699ff, // Light Blue
    laserColor: 0x6699ff,
    laserGlow: 0x3366cc,
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
    const modelPromises = modelPaths.map(async (modelData, index) => {
      const gltf = await loader.setPath(modelData.path).loadAsync("scene.gltf");
      const model = gltf.scene.clone();
      models[`ship-${index + 1}`] = {
        model,
        rotation: modelData.rotation,
        isNormalized: false,
        name: modelData.name,
        boosterColor: modelData.boosterColor,
        laserColor: modelData.laserColor,
        laserGlow: modelData.laserGlow,
      };
    });

    await Promise.all(modelPromises);
  } catch (error) {
    console.error("Error loading models:", error);
  }
}

const shipsBar = document.getElementById("bottom-ships-bar");
if (shipsBar) {
  shipsBar.addEventListener("click", (e) => {
    if (e.target.classList.contains("ship-option")) {
      // Remove active class from all ships
      document
        .querySelectorAll(".ship-option")
        .forEach((el) => el.classList.remove("active"));
      // Add active class to clicked ship
      e.target.classList.add("active");

      const shipId = e.target.id;
      console.log("Switching to model: ", shipId);
      document.getElementById("select-ship").dataset.shipId = shipId;
      switchModel(shipId);
    }
  });
} else {
  console.warn(
    "Ship selector bar not found - ships-bar element missing from DOM"
  );
}

let previousModelId = null;

function switchModel(shipId) {
  if (!models[shipId]) return;
  if (previousModelId === shipId) return;

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

  previousModelId = shipId;
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
