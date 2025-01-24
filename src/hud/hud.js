import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";


let scene, camera, renderer, currentModel, controls;
const models = {};

const canvas = document.getElementById("ship-hanger");

export const modelPaths = [
  { path: "public/ships/ship_0/", rotation: { x: 0, y: 0, z: 0 } },
  { path: "public/ships/ship_1/", rotation: { x: 0, y: Math.PI / 2, z: 0 } },
  { path: "public/ships/ship_2/", rotation: { x: 0, y: Math.PI / 2, z: 0 } },
  { path: "public/ships/ship_5/", rotation: { x: 0, y: Math.PI / 2, z: 0 } },
  { path: "public/ships/ship_6/", rotation: { x: 0, y: Math.PI / 2, z: 0 } },
  { path: "public/ships/ship_7/", rotation: { x: 0, y: 2 * Math.PI, z: 0 } },
];

export function initHUD() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.set(0, 10, 100);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(500, 500);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x87ceeb, 0); // Make the background transparent

  const ambientLight = new THREE.AmbientLight(0xffffff);
  // // (0, 255, 238, 0.55)
  // const ambientLight = new THREE.AmbientLight(
  //   new THREE.Color(0x00ffec), // RGB (0, 255, 238) as a hex value
  //   0.55 // Intensity (brightness)
  // );
  new THREE.Color(0x00ffec), // RGB (0, 255, 238) as a hex value
    0.55;

  const light = new THREE.DirectionalLight(0xffffff, 10);
  light.position.set(5, 10, 7.5);
  scene.add(light);
  scene.add(ambientLight);

  const light2 = new THREE.DirectionalLight(new THREE.Color(0x00ffec), 0.55);
  light2.position.set(-5, 10, -7.5);
  scene.add(light2);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // Smooth orbiting
  controls.dampingFactor = 0.45;
  controls.screenSpacePanning = false;
  controls.maxPolarAngle = Math.PI / 2; // Restrict vertical camera movement
  controls.autoRotate = true;

  loadShipModels().then(() => {
    switchModel("ship-1"); // Display the default model (ship_0)
  });

  animate();
}

function animate() {
  requestAnimationFrame(animate);
  controls.update(); // Update the controls for smooth orbit
  renderer.render(scene, camera);
}

async function loadShipModels() {
  const loader = new GLTFLoader();

  // FACE FORWARD
  // { path: 'public/ships/ship_0/', rotation: { x: 0, y: (0) + 1.5 * Math.PI, z: 0 } },
  // { path: 'public/ships/ship_1/', rotation: { x: 0, y: (Math.PI / 2) + 1.5 * Math.PI, z: 0 } },
  // { path: 'public/ships/ship_2/', rotation: { x: 0, y:( Math.PI / 2) + 1.5 * Math.PI, z: 0 } },
  // { path: 'public/ships/ship_3/', rotation: { x: 0, y: (-Math.PI / 2) + 1.5 * Math.PI, z: 0 } },
  // { path: 'public/ships/ship_4/', rotation: { x: 0, y: (0) + 1.5 * Math.PI, z: 0 } },
  // { path: 'public/ships/ship_5/', rotation: { x: 0, y: (Math.PI / 2) + 1.5 * Math.PI, z: 0 } },
  // { path: 'public/ships/ship_6/', rotation: { x: 0, y: (Math.PI / 2) + 1.5 * Math.PI, z: 0 } },
  // { path: 'public/ships/ship_7/', rotation: { x: 0, y: (2 * Math.PI), z: 0 } },

  try {
    const modelPromises = modelPaths.map(async (modelData, index) => {
      const gltf = await loader.setPath(modelData.path).loadAsync("scene.gltf");
      const model = gltf.scene.clone();
      models[`ship-${index + 1}`] = { model, rotation: modelData.rotation };
    });

    await Promise.all(modelPromises);
  } catch (error) {
    console.error("Error loading models:", error);
  }
}

document.getElementById("ships-bar").addEventListener("click", (e) => {
  // console.log("Click detected on: ", e.target); // Log the clicked element
  if (e.target.classList.contains("ship-option")) {
    const shipId = e.target.id;
    console.log("Switching to model: ", shipId); // Log the shipId being clicked
    document.getElementById("select-ship").dataset.shipId = shipId;
    switchModel(shipId);
  }
});

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
    currentModel.isNormalized = true; // Mark this model as normalized
  }
  currentModel.model.rotation.set(
    currentModel.rotation.x,
    currentModel.rotation.y,
    currentModel.rotation.z
  );
  scene.add(currentModel.model);

  previousModelId = shipId;
}

export function normalizeModelSize(model, targetSize = 1) {
  const bbox = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const maxDimension = Math.max(size.x, size.y, size.z);
  const scaleFactor = targetSize / maxDimension;

  // Only scale if the current scale is not already the target scale
  if (
    Math.abs(model.scale.x - scaleFactor) > 0.01 ||
    Math.abs(model.scale.y - scaleFactor) > 0.01 ||
    Math.abs(model.scale.z - scaleFactor) > 0.01
  ) {
    model.scale.set(scaleFactor, scaleFactor, scaleFactor);
  }
}

// export function normalizeModelPosition(model) {
//   const bbox = new THREE.Box3().setFromObject(model);
//   const center = bbox.getCenter(new THREE.Vector3());
//   // Translate the model to ensure its center is at the origin (0, 0, 0)
//   model.position.sub(center);
//   model.position.y = -15;
// }

export function normalizeModelPosition(model) {
  const box = new THREE.Box3().setFromObject(model); // Compute bounding box
  const center = new THREE.Vector3();
  box.getCenter(center); // Get the center of the bounding box

  // Adjust the model's position so its center aligns with the origin
  model.position.sub(center);

  // Align the model's bottom to y = 0
  const size = new THREE.Vector3();
  box.getSize(size);
  // model.position.y += size.y / 2; // Move up by half the height to align the bottom


  const offsetY = box.min.y; // Get the minimum y value of the bounding box
  model.position.y -= offsetY; // Adjust the model's position to align the bottom with y = 0

}

function addGround() {
  const geometry = new THREE.PlaneGeometry(500, 500);
  const material = new THREE.MeshLambertMaterial({ color: 0x808080 });
  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -15;
  scene.add(ground);
}

function addBackground() {
  const geometry = new THREE.BoxGeometry(1000, 1000, 1000);
  const material = new THREE.MeshBasicMaterial({
    color: 0x87ceeb,
    side: THREE.BackSide,
  });
  const background = new THREE.Mesh(geometry, material);
  scene.add(background);
}
