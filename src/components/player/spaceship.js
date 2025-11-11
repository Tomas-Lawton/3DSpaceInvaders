import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { third_person_camera } from "../../scene/camera.js";
import { mapValue } from "../../utils/utils.js"; // Assuming you have a utility function for mapping values
import { progressContainer, progressText } from "../dom.js";
import { PHYSICS_CONSTANTS } from "../../utils/constants.js";
import { incrementOre, addXP } from "../dom.js";
import {
  modelPaths,
  normalizeModelSize,
  normalizeModelPosition,
} from "../../hud/hud.js";

export const spaceship = (() => {
  // Static model cache shared across all ship instances
  const modelCache = {};

  // Preload all ship models
  const preloadAllModels = () => {
    return new Promise((resolve) => {
      const loader = new GLTFLoader();
      let loadedCount = 0;
      const totalModels = modelPaths.length;

      console.log(`[PRELOAD] Starting preload of ${totalModels} ship models...`);

      modelPaths.forEach((modelData, index) => {
        loader.setPath(modelData.path).load(
          "scene.gltf",
          (gltf) => {
            const loadedModel = gltf.scene.clone();

            // Apply rotation
            loadedModel.rotation.set(
              modelData.rotation.x,
              modelData.rotation.y - Math.PI / 2,
              modelData.rotation.z
            );

            // Normalize model
            normalizeModelSize(loadedModel, 55);
            normalizeModelPosition(loadedModel);
            modelData.isNormalized = true;

            // Cache the model
            modelCache[index] = loadedModel;
            loadedCount++;

            console.log(`[PRELOAD] Loaded ${index}: ${modelData.name} (${loadedCount}/${totalModels})`);

            if (loadedCount === totalModels) {
              console.log('[PRELOAD] All ship models loaded!');
              resolve();
            }
          },
          undefined,
          (error) => {
            console.error(`[PRELOAD] Error loading model ${index}:`, error);
            loadedCount++;
            if (loadedCount === totalModels) {
              resolve();
            }
          }
        );
      });
    });
  };

  class Spaceship {
    constructor(scene, camera, health = 100) {
      this.scene = scene;
      this.camera = camera;
      this.spaceshipParams = {
        positionX: 0,
        positionY: 0.7,
        positionZ: 0,
        scale: 0.08,
      };

      this.loader = new GLTFLoader().setPath("public/ships/ship_0/");

      this.mesh = null; // 3d
      this.thirdPersonCamera = null; // follow cam

      this.shipGroup = null;
      this.modelCache = modelCache; // Reference to static cache

      // this.boosterFlame = new THREE.Mesh(
      //   new THREE.BoxGeometry(0.15, 0.15, 0.15),
      //   new THREE.MeshStandardMaterial({
      //     emissiveIntensity: 2.5,
      //     emissive: 0xc87dff,
      //     color: 0xc87dff,
      //     // color: 0x00ffee,
      //     // emissive: 0x00ffee,
      //     side: THREE.DoubleSide,
      //   })
      // );

      this.boosterFlame = new THREE.Mesh(
        new THREE.ConeGeometry(2, 5, 8),
        new THREE.MeshStandardMaterial({
          emissiveIntensity: 2.5,
          emissive: 0x00ffff, // 0xc87dff
          color: 0x00ffff,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide,
        })
      );

      this.lightSound = new Audio("public/audio/pew.mp3");
      this.boomSound = new Audio("public/audio/boom.mp3");
      this.softBoom = new Audio("public/audio/soft_boom.mp3");
      this.alarmSound = new Audio("public/audio/alarm.mp3");
      this.deadSound = new Audio("public/audio/cool1.mp3");

      this.forwardVelocity = 0;
      this.upwardVelocity = 0;

      // Cool
      this.activeLasers = [];
      this.engineParticles = [];
      this.maxParticles = 50; // Reduced from 200 for better performance
      this.wingTrails = {
        left: [],
        right: [],
      };

      this.setHealth(health, true);
      this.damageAmount = 26;

      // Combo system
      this.comboCount = 0;
      this.comboTimer = null;
      this.comboTimeout = 3000; // 3 seconds to continue combo
      this.lastKillTime = 0;

      // Stats tracking
      this.totalKills = 0;
      this.planetsSaved = 0;

      // Track if this is the initial model load
      this.isInitialLoad = true;

      // Initialize default ship colors (will be updated when ship loads)
      this.currentShipId = 0;
      this.boosterColor = 0xc87dff;
      this.laserColor = 0xc87dff;
      this.laserGlow = 0x9400ff;

      let selectShip = document.getElementById("select-ship");
      selectShip.addEventListener("click", () => {
        // Map ship IDs to modelPaths indices
        // ship-1 -> 0, ship-2 -> 1, ship-3 -> 2, ship-4 -> 3, ship-6 -> 4
        const shipIdMapping = {
          'ship-1': 0,
          'ship-2': 1,
          'ship-3': 2,
          'ship-4': 3,
          'ship-6': 4
        };
        const shipId = selectShip.dataset.shipId;
        const updatedShipId = shipIdMapping[shipId];
        console.log("Updating, ", updatedShipId);
        this.setSpaceshipModel(updatedShipId);
      });

      return this;
    }

    damageShip(damage) {
      this.health -= damage;

      if (this.health <= 0) {
        if (this.deadSound) {
          this.deadSound.currentTime = 0;
          this.deadSound.volume = 0.5;
          this.deadSound.play();
        }
        console.log("You Died");
      }
    }

    setHealth(health, init = false) {
      this.health = health;
      if (init) {
        this.maxHealth = health;
      }
    }

    healShip(amount) {
      // Heal the ship, but don't exceed max health
      this.health = Math.min(this.health + amount, this.maxHealth);
    }

    setSpaceshipModel(shipId) {
      console.log("Loading Spaceship: ", shipId);
      if (!modelPaths[shipId]) return;

      const selectedModel = modelPaths[shipId];
      console.log(selectedModel);

      // Store ship colors and booster offset for lasers and booster
      this.currentShipId = shipId;
      this.boosterColor = selectedModel.boosterColor || 0xc87dff;
      this.laserColor = selectedModel.laserColor || 0xc87dff;
      this.laserGlow = selectedModel.laserGlow || 0x9400ff;
      this.boosterOffset = selectedModel.boosterOffset || { x: 0, y: 2, z: -5 };

      // Remove previous model if it exists
      if (this.mesh) {
        this.scene.remove(this.mesh);
        this.mesh.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
        this.mesh.clear();
      }

      // Check if model is cached
      if (this.modelCache[shipId]) {
        console.log(`Using cached model for ship ${shipId}`);
        this.applyModel(this.modelCache[shipId].clone(), selectedModel);
        return;
      }

      // Load model and cache it
      this.loader.setPath(selectedModel.path).load(
        "scene.gltf",
        (gltf) => {
          // Cache the loaded model for future use
          this.modelCache[shipId] = gltf.scene.clone();
          console.log(`Cached model for ship ${shipId}`);
          this.applyModel(gltf.scene, selectedModel);
        },
        (xhr) => {
          let progressAmount = (xhr.loaded / xhr.total) * 100;
          progressText.innerHTML = `LOADING ${progressAmount.toFixed(2)}/100`;
        },
        (error) => console.error("Error loading model:", error)
      );
    }

    applyModel(loadedModel, selectedModel) {
      this.mesh = new THREE.Group();
      const tempObjectGroup = new THREE.Group();
      this.shipGroup = tempObjectGroup;

      loadedModel.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Rotation needs to be applied from cache since cloning resets rotation
      // But only if not already normalized (normalized models have rotation baked in)
      if (!selectedModel.isNormalized) {
        loadedModel.rotation.set(
          selectedModel.rotation.x,
          selectedModel.rotation.y - Math.PI / 2,
          selectedModel.rotation.z
        );
        normalizeModelSize(loadedModel, 55);
        normalizeModelPosition(loadedModel);
        selectedModel.isNormalized = true;
      }

      tempObjectGroup.add(loadedModel);

      // Add ambient light for better ship visibility
      const ambientLight = new THREE.AmbientLight(selectedModel.boosterColor || 0xc87dff, 1);
      ambientLight.position.set(0, 10, 15)
      tempObjectGroup.add(ambientLight);
      this.ambientLight = ambientLight;

      // Add single red light with increased brightness
      const shipLight = new THREE.PointLight(0xff0000, 8, 40);
      shipLight.position.set(0, 5, 0);
      tempObjectGroup.add(shipLight);
      this.shipLight = shipLight;

      // Update booster flame color for this ship
      this.boosterFlame.material.emissive.setHex(this.boosterColor);
      this.boosterFlame.material.color.setHex(this.boosterColor);

      tempObjectGroup.add(this.boosterFlame);

      this.mesh.add(tempObjectGroup);
      this.mesh.rotation.y = Math.PI;

      this.scene.add(this.mesh);

      this.thirdPersonCamera = new third_person_camera.ThirdPersonCamera({
        camera: this.camera,
        target: this.mesh,
      });

      this.updateSpaceshipPosition();

      // Hide loading screen and show intro only on initial load
      if (this.isInitialLoad) {
        progressContainer.style.display = "none";

        // Show intro screen only on first model load
        const introScreen = document.getElementById('intro-screen');
        if (introScreen) {
          introScreen.style.display = 'flex';
        }
        this.isInitialLoad = false;
      }
    }
    updateSpaceshipPosition() {
      if (this.mesh) {
        this.mesh.position.set(
          this.spaceshipParams.positionX,
          this.spaceshipParams.positionY,
          this.spaceshipParams.positionZ
        );
        this.mesh.scale.set(
          this.spaceshipParams.scale,
          this.spaceshipParams.scale,
          this.spaceshipParams.scale
        );
        // console.log(this.spaceshipParams)
      }
    }

    fireLaser() {
      if (!this.mesh || !this.mesh.children[0]) {
        console.warn("Ship not fully loaded yet");
        return;
      }

      const direction = new THREE.Vector3();
      this.mesh.children[0].getWorldDirection(direction);
      const laserPosition = this.mesh.position.clone();

      // Create laser group for better visual quality
      const laserGroup = new THREE.Group();

      // Use ship-specific colors or fallback to default purple
      const laserColor = this.laserColor || 0xc87dff;
      const laserGlow = this.laserGlow || 0x9400ff;

      // Main laser beam (slightly larger)
      const laserBeam = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 10, 10), // Increased size and segments
        new THREE.MeshStandardMaterial({
          emissive: laserColor,
          emissiveIntensity: 5, // Increased glow
          color: laserGlow,
        })
      );
      laserGroup.add(laserBeam);

      // Add subtle glow effect
      const glowBeam = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 8, 8),
        new THREE.MeshStandardMaterial({
          emissive: laserColor,
          emissiveIntensity: 2,
          color: laserColor,
          transparent: true,
          opacity: 0.3,
        })
      );
      laserGroup.add(glowBeam);

      laserGroup.position.copy(laserPosition);
      laserGroup.lookAt(laserPosition.clone().add(direction));
      this.scene.add(laserGroup);

      const velocity = direction.normalize().multiplyScalar(30);
      const spawnTime = performance.now(); // Track creation time for max lifetime

      if (this.lightSound) {
        this.lightSound.currentTime = 0;
        this.lightSound.volume = 0.25;
        this.lightSound.play();
      }

      this.activeLasers.push({
        laserBeam: laserGroup,
        velocity,
        direction,
        spawnTime,
      });
    }

    // updateboosterFlame(currentVelocity, maxVelocity) {
    //   const rectangleLength = mapValue(currentVelocity, 0, maxVelocity, 0, -80);
    //   this.boosterFlame.geometry.dispose(); // Dispose of the old geometry
    //   this.boosterFlame.geometry = new THREE.BoxGeometry(
    //     3,
    //     3,
    //     rectangleLength
    //   ); // Adjust width and height as needed
    //   this.boosterFlame.position.z = rectangleLength / 2 - 60;
    //   this.boosterFlame.position.y = 10;
    // }

    updateBoosterFlame(currentVelocity, maxVelocity) {
      const flameLength = mapValue(currentVelocity, 0, maxVelocity, 5, 150);

      this.boosterFlame.geometry.dispose();

      this.boosterFlame.geometry = new THREE.ConeGeometry(
        2, // radius at base
        flameLength, // height/length of cone
        8 // segments (8 is good for performance)
      );

      // Use ship-specific booster offset
      const offset = this.boosterOffset || { x: 0, y: 2, z: -5 };
      this.boosterFlame.position.set(
        offset.x,
        offset.y,
        -flameLength / 2 + offset.z
      );

      this.boosterFlame.rotation.x = -Math.PI / 2;

      this.boosterFlame.visible = currentVelocity > 0.1;

      const intensity = mapValue(currentVelocity, 0, maxVelocity, 1, 4);
      this.boosterFlame.material.emissiveIntensity = intensity;

      const opacity = 0.6 + Math.sin(Date.now() * 0.01) * 0.05;
      this.boosterFlame.material.opacity = opacity;
    }

    createWingTrail() {
      // Left wing trail
      const leftTrail = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.08, 2),
        new THREE.MeshStandardMaterial({
          emissive: 0xffffff,
          emissiveIntensity: 0.5,
          color: 0xffffff,
          transparent: true,
          opacity: 0.3,
        })
      );

      // Use the inner ship group's rotation
      const shipGroup = this.mesh.children[0];
      const leftOffset = new THREE.Vector3(-2, 0, 0);
      leftOffset.applyQuaternion(shipGroup.quaternion);
      leftOffset.applyQuaternion(this.mesh.quaternion); // Apply outer rotation too

      leftTrail.position.copy(this.mesh.position).add(leftOffset);
      leftTrail.quaternion
        .copy(this.mesh.quaternion)
        .multiply(shipGroup.quaternion);
      leftTrail.life = 1.0;

      this.scene.add(leftTrail);
      this.wingTrails.left.push(leftTrail);

      // Right wing trail
      const rightTrail = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.08, 2),
        new THREE.MeshStandardMaterial({
          emissive: 0xffffff,
          emissiveIntensity: 0.5,
          color: 0xffffff,
          transparent: true,
          opacity: 0.1,
        })
      );

      const rightOffset = new THREE.Vector3(2, 0, 0);
      rightOffset.applyQuaternion(shipGroup.quaternion);
      rightOffset.applyQuaternion(this.mesh.quaternion);

      rightTrail.position.copy(this.mesh.position).add(rightOffset);
      rightTrail.quaternion
        .copy(this.mesh.quaternion)
        .multiply(shipGroup.quaternion);
      rightTrail.life = 1.0;

      this.scene.add(rightTrail);
      this.wingTrails.right.push(rightTrail);

      // Reduced max trails from 20 to 10 for better performance
      if (this.wingTrails.left.length > 10) {
        const old = this.wingTrails.left.shift();
        this.scene.remove(old);
        old.geometry.dispose();
        old.material.dispose();

        const oldRight = this.wingTrails.right.shift();
        this.scene.remove(oldRight);
        oldRight.geometry.dispose();
        oldRight.material.dispose();
      }
    }
    updateWingTrails() {
      // Faster fade rate to reduce total trail count
      [...this.wingTrails.left, ...this.wingTrails.right].forEach((trail) => {
        trail.life -= 0.05; // Increased from 0.03 for faster fade
        trail.material.opacity = trail.life * 0.3;

        if (trail.life <= 0) {
          this.scene.remove(trail);
          trail.geometry.dispose();
          trail.material.dispose();
        }
      });
    }

    checkCollision(mainObj, colisionObj) {
      const laserBox = new THREE.Box3().setFromObject(mainObj);
      const colisionBox = new THREE.Box3().setFromObject(colisionObj);
      if (laserBox.intersectsBox(colisionBox)) {
        console.log("Collision");
        return true; // Collision detected
      }
      return false; // No collision detected
    }

    handleLaserMovement(asteroidLoader, enemyLoader) {
      if (this.activeLasers) {
        const currentTime = performance.now();
        const maxLaserLifetime = 3000; // 3 seconds max lifetime to prevent accidental long-range hits

        // Iterate backwards for safe removal during iteration
        for (let index = this.activeLasers.length - 1; index >= 0; index--) {
          const beam = this.activeLasers[index];
          const { laserBeam, velocity, spawnTime } = beam;
          laserBeam.position.add(velocity.clone().multiplyScalar(0.2));

          const age = currentTime - (spawnTime || 0);

          // Check distance OR lifetime - remove if too far OR too old
          if (
            laserBeam.position.distanceTo(this.mesh.position) > 300 ||
            age > maxLaserLifetime
          ) {
            this.scene.remove(laserBeam);
            // Properly dispose of group and all children
            laserBeam.traverse((child) => {
              if (child.geometry) child.geometry.dispose();
              if (child.material) child.material.dispose();
            });
            this.activeLasers.splice(index, 1);
            continue;
          }

          // check asteroid collisions
          if (asteroidLoader) {
            if (asteroidLoader.asteroidSystem) {
              for (const system of asteroidLoader.asteroidSystem) {
                system.children.forEach((asteroid) => {
                  if (asteroid instanceof THREE.Light) {
                    return;
                  }
                  if (this.checkCollision(laserBeam, asteroid)) {
                    this.scene.remove(laserBeam);
                    // Properly dispose of group and all children
                    laserBeam.traverse((child) => {
                      if (child.geometry) child.geometry.dispose();
                      if (child.material) child.material.dispose();
                    });
                    this.activeLasers.splice(index, 1);
                    asteroid.health -= this.damageAmount;
                    if (this.softBoom) {
                      this.softBoom.currentTime = 0;
                      this.softBoom.volume = 0.5;
                      this.softBoom.play();
                    }
                    this.startRumbleEffect(asteroid);
                    asteroid.velocity.add(
                      velocity.clone().multiplyScalar(0.002)
                    ); //smack it away a bit

                    // Only show health bar if asteroid has been damaged
                    if (asteroid.health < 100) {
                      this.showHealthBar(asteroid);
                    }

                    if (asteroid.health <= 0) {
                      this.removeHealthBar(asteroid);
                      asteroid.parent.remove(asteroid);
                      this.playSound();
                      incrementOre(asteroid.type);
                    }
                    return;
                  }
                });
              }
            }
          }

          // check enemy collisions
          if (
            enemyLoader &&
            enemyLoader.enemies &&
            enemyLoader.enemies.length > 0
          ) {
            for (
              let enemyIndex = enemyLoader.enemies.length - 1;
              enemyIndex >= 0;
              enemyIndex--
            ) {
              const enemy = enemyLoader.enemies[enemyIndex];
              if (this.checkCollision(laserBeam, enemy)) {
                console.log(
                  `[LASER] Hit enemy! Health: ${enemy.health} -> ${
                    enemy.health - this.damageAmount
                  }`
                );

                this.scene.remove(laserBeam);
                // Properly dispose of group and all children
                laserBeam.traverse((child) => {
                  if (child.geometry) child.geometry.dispose();
                  if (child.material) child.material.dispose();
                });
                this.activeLasers.splice(index, 1);

                enemy.health -= this.damageAmount;

                if (this.softBoom) {
                  this.softBoom.currentTime = 0;
                  this.softBoom.volume = 0.5;
                  this.softBoom.play();
                }
                this.startRumbleEffect(enemy);
                this.showHealthBar(enemy);

                if (enemy.health <= 0) {
                  console.log(`[LASER] Enemy destroyed!`);
                  this.removeHealthBar(enemy);
                  this.scene.remove(enemy);
                  enemyLoader.enemies.splice(enemyIndex, 1);
                  this.playSound();

                  // Track kill and combo
                  this.addKill();

                  // Award XP with combo bonus
                  const baseXP = 20;
                  const comboBonus = this.getComboBonus();
                  const totalXP = Math.floor(baseXP * comboBonus);
                  addXP(totalXP);

                  // Show notification with combo info
                  if (this.comboCount >= 2) {
                    this.showNotification(
                      `${this.comboCount}X COMBO! +${totalXP} XP`,
                      "success"
                    );
                  } else {
                    this.showNotification(
                      `Enemy Destroyed! +${totalXP} XP`,
                      "success"
                    );
                  }
                }
                break; // Exit loop after hit
              }
            }
          }
        }
      }
    }
    // showHealthBar(meshObj) {
    //   if (!meshObj.healthBar) {
    //     const healthBar = document.createElement("div");
    //     healthBar.className = "health-bar";
    //     healthBar.style.position = "absolute";
    //     healthBar.style.height = "5px";
    //     healthBar.style.width = "100px";
    //     document.body.appendChild(healthBar);

    //     meshObj.healthBar = { element: healthBar };

    //     // Start an interval to update the health bar position
    //     meshObj.healthBar.interval = setInterval(() => {
    //       this.updateHealthBarPosition(meshObj);
    //     }, 50); // Update every 100 milliseconds
    //   }

    //   const healthPercentage = meshObj.health / 100;
    //   meshObj.healthBar.element.style.width = `${healthPercentage * 100}px`;
    //   meshObj.healthBar.element.style.backgroundColor = `rgb(${
    //     255 * (1 - healthPercentage)
    //   }, ${255 * healthPercentage}, 0)`;
    // }

    showHealthBar(meshObj) {
      if (!meshObj.healthBar) {
        const healthBar = document.createElement("div");
        healthBar.className = "health-bar";
        healthBar.style.position = "absolute";
        healthBar.style.height = "5px";
        healthBar.style.width = "100px";
        healthBar.style.background =
          "linear-gradient(to right, #00ff00, #ffff00, #ff0000)";
        healthBar.style.border = "1px solid rgba(0, 255, 238, 0.6)";
        healthBar.style.borderRadius = "3px";
        healthBar.style.boxShadow = "0 0 8px rgba(0, 255, 238, 0.4)";
        healthBar.style.zIndex = "1000";
        document.body.appendChild(healthBar);

        meshObj.healthBar = { element: healthBar };

        // Reduced update frequency from 50ms to 100ms for better performance
        meshObj.healthBar.interval = setInterval(() => {
          this.updateHealthBarPosition(meshObj);
        }, 100);
      }

      const healthPercentage = Math.max(0, Math.min(1, meshObj.health / 100));
      meshObj.healthBar.element.style.width = `${healthPercentage * 100}px`;

      const red = Math.floor(255 * (1 - healthPercentage));
      const green = Math.floor(255 * healthPercentage);
      meshObj.healthBar.element.style.background = `rgb(${red}, ${green}, 0)`;
    }

    // updateHealthBarPosition(asteroid) {
    //     const localPosition = asteroid.position.clone();
    //     const groupPosition = asteroid.parent.position.clone();
    //     const actualPosition = localPosition.add(groupPosition);
    //     this.camera.updateMatrixWorld();

    // 		// this.camera.updateMatrixWorld();
    // 		// const screenPosition = localPosition.project( this.camera )
    //     // const x = screenPosition.x
    //     // const y = screenPosition.y

    //     const screenPosition = actualPosition.project(this.camera);
    //     const x = (screenPosition.x * 0.5 + 0.5) * window.innerWidth;
    //     const y = (screenPosition.y * -0.5 + 0.5) * window.innerHeight;
    //     const distanceToAsteroid = this.camera.position.distanceTo(actualPosition);
    //     const visibilityThreshold = 1000;

    //     if (distanceToAsteroid < visibilityThreshold) {
    //         if (screenPosition.z > 0) { // In front of the camera
    //             asteroid.healthBar.element.style.left = `${x}px`;
    //             asteroid.healthBar.element.style.top = `${y - 10}px`;
    //             asteroid.healthBar.element.style.display = 'block';
    //         } else { // Off screen or facing away
    //             asteroid.healthBar.element.style.display = 'none';
    //         }
    //     } else { // Too far
    //         this.removeHealthBar(asteroid);
    //     }
    // }

    updateHealthBarPosition(asteroid) {
      // Use temporary vectors to avoid frequent cloning
      const actualPosition = new THREE.Vector3();
      actualPosition.copy(asteroid.position).add(asteroid.parent.position);

      // Early exit if too far
      const distanceToAsteroid =
        this.camera.position.distanceTo(actualPosition);
      const visibilityThreshold = 1000;
      if (distanceToAsteroid >= visibilityThreshold) {
        this.removeHealthBar(asteroid);
        return;
      }

      // Get the direction from the camera to the asteroid
      const directionToAsteroid = new THREE.Vector3();
      directionToAsteroid
        .subVectors(actualPosition, this.camera.position)
        .normalize();

      // Get the camera's forward direction (already normalized)
      const cameraForward = new THREE.Vector3();
      this.camera.getWorldDirection(cameraForward);

      // Check if the asteroid is in front of the camera using the dot product
      if (directionToAsteroid.dot(cameraForward) > 0) {
        // Project asteroid position onto screen space
        const screenPosition = actualPosition.project(this.camera);
        const x = (screenPosition.x * 0.5 + 0.5) * window.innerWidth;
        const y = (screenPosition.y * -0.5 + 0.5) * window.innerHeight;

        // Update health bar position
        asteroid.healthBar.element.style.left = `${x}px`;
        asteroid.healthBar.element.style.top = `${y - 10}px`;
        asteroid.healthBar.element.style.display = "block";
      } else {
        // Asteroid is behind the camera, hide the health bar
        asteroid.healthBar.element.style.display = "none";
      }
    }

    removeHealthBar(asteroid) {
      if (asteroid.healthBar) {
        document.body.removeChild(asteroid.healthBar.element);
        // delete asteroid.healthBar;
        clearInterval(asteroid.healthBar.interval); // Clear the interval
      }
    }
    playSound() {
      if (this.boomSound) {
        this.boomSound.currentTime = 0;
        this.boomSound.volume = 0.5;
        this.boomSound.play();
      }
    }

    showNotification(message, type = "info") {
      const notification = document.createElement("div");
      notification.className = `game-notification ${type}`;
      notification.textContent = message;

      const color = type === 'success' ? '#00ff00' : type === 'danger' ? '#ff0000' : '#00ffee';
      const shadowColor = type === 'success' ? 'rgba(0,255,0,0.5)' : type === 'danger' ? 'rgba(255,0,0,0.5)' : 'rgba(0,255,238,0.5)';

      notification.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        padding: 12px 30px;
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%);
        border: 2px solid ${color};
        border-radius: 8px;
        color: ${color};
        font-size: 18px;
        font-weight: bold;
        text-align: center;
        z-index: 10000;
        box-shadow: 0 0 30px ${shadowColor}, 0 5px 15px rgba(0,0,0,0.5);
        pointer-events: none;
        animation: slideUpFade 2s ease-out forwards;
      `;

      document.body.appendChild(notification);

      setTimeout(() => {
        notification.remove();
      }, 2000);
    }

    addKill() {
      const currentTime = performance.now();
      this.totalKills++;

      // Update combo
      if (currentTime - this.lastKillTime < this.comboTimeout) {
        this.comboCount++;
      } else {
        this.comboCount = 1;
      }

      this.lastKillTime = currentTime;

      // Clear existing timer
      if (this.comboTimer) {
        clearTimeout(this.comboTimer);
        this.comboTimer = null;
      }

      // Show combo if 2 or more
      if (this.comboCount >= 2) {
        this.showCombo();

        // Set timer to hide combo
        this.comboTimer = setTimeout(() => {
          this.hideCombo();
          this.comboCount = 0;
          this.comboTimer = null;
        }, this.comboTimeout);
      }

      // Update stats in pause menu (safe - checks if elements exist)
      this.updatePauseStats();
    }

    showCombo() {
      const comboElement = document.getElementById("combo-counter");
      const multiplierElement = document.getElementById("combo-multiplier");

      if (comboElement && multiplierElement) {
        multiplierElement.textContent = `${this.comboCount}X`;
        comboElement.style.display = "block";

        // Trigger animation
        comboElement.style.animation = "none";
        setTimeout(() => {
          comboElement.style.animation = "comboPopIn 0.3s ease-out";
        }, 10);
      }
    }

    hideCombo() {
      const comboElement = document.getElementById("combo-counter");
      if (comboElement) {
        comboElement.style.display = "none";
      }
    }

    getComboBonus() {
      // Bonus XP multiplier based on combo
      if (this.comboCount >= 5) return 3;
      if (this.comboCount >= 3) return 2;
      if (this.comboCount >= 2) return 1.5;
      return 1;
    }

    screenShake(duration = 500) {
      const canvas = document.getElementById("three-canvas");
      if (canvas) {
        canvas.classList.add("screen-shake");
        setTimeout(() => {
          canvas.classList.remove("screen-shake");
        }, duration);
      }
    }

    updatePauseStats() {
      // Update stats in pause menu
      const healthElement = document.getElementById("header-health");
      const killsElement = document.getElementById("enemies-killed");
      const savedElement = document.getElementById("planets-saved");

      if (healthElement) healthElement.textContent = Math.floor(this.health);
      if (killsElement) killsElement.textContent = this.totalKills;
      if (savedElement) savedElement.textContent = this.planetsSaved;
    }

    startRumbleEffect(obj) {
      const shakeDuration = 1000; // Duration of the shake in milliseconds
      const shakeIntensity = 0.2; // Maximum shake offset
      const endTimestamp = performance.now() + shakeDuration;

      const rumble = () => {
        const currentTimestamp = performance.now();

        if (currentTimestamp < endTimestamp) {
          const offsetX = (Math.random() - 0.5) * shakeIntensity;
          const offsetY = (Math.random() - 0.5) * shakeIntensity;
          const offsetZ = (Math.random() - 0.5) * shakeIntensity;

          // Apply offset to the mesh's current position
          obj.position.x += offsetX;
          obj.position.y += offsetY;
          obj.position.z += offsetZ;

          requestAnimationFrame(rumble);
        }
      };

      requestAnimationFrame(rumble);
    }

    checkAsteroidCollisions(asteroidLoader) {
      const currentTimestamp = performance.now();

      if (this.lastAsteroidCollisionCheck === undefined) {
        this.lastAsteroidCollisionCheck = currentTimestamp;
      }

      // Check less frequently (500ms instead of 1000ms) but with cooldown after hit
      if (currentTimestamp - this.lastAsteroidCollisionCheck < 500) {
        return;
      }

      if (asteroidLoader && asteroidLoader.asteroidSystem) {
        for (const system of asteroidLoader.asteroidSystem) {
          // Calculate distance to system first for early exit
          const distanceToSystem = this.mesh.position.distanceTo(
            system.position
          );
          if (distanceToSystem > 200) continue; // Skip distant asteroid systems

          for (const asteroid of system.children) {
            if (asteroid instanceof THREE.Light) continue;

            if (this.checkCollision(this.mesh, asteroid)) {
              this.userHit(40);
              this.lastAsteroidCollisionCheck = currentTimestamp + 500; // Add cooldown after hit
              return;
            }
          }
        }
      }
    }

    checkPlanetCollisions(planetLoader) {
      if (!planetLoader || !planetLoader.planets) return;

      for (const planetGroup of planetLoader.planets) {
        const distanceToPlanet = this.mesh.position.distanceTo(planetGroup.position);

        // Get actual planet radius (planetSize is stored as negative)
        const planetRadius = Math.abs(planetGroup.planetSize || 300);

        // Kill player if they hit the planet surface (within planet radius)
        if (distanceToPlanet < planetRadius) {
          console.log(`💥 CRASHED INTO PLANET! Distance: ${distanceToPlanet.toFixed(0)} < Radius: ${planetRadius.toFixed(0)} - GAME OVER`);
          this.gameOver();
          return;
        }
      }
    }

    gameOver() {
      // Set health to 0
      this.health = 0;

      // Play death sound
      if (this.deadSound) {
        this.deadSound.currentTime = 0;
        this.deadSound.volume = 0.5;
        this.deadSound.play();
      }

      // Show intro screen after short delay
      setTimeout(() => {
        const introScreen = document.getElementById('intro-screen');
        if (introScreen) {
          introScreen.style.display = 'flex';
        }

        // Reload the page to restart game
        window.location.reload();
      }, 2000);
    }

    userHit(damage) {
      console.log("HIT USER");
      this.damageShip(damage);

      // Screen shake based on damage
      this.screenShake(damage > 40 ? 800 : 500);

      if (this.boomSound) {
        this.boomSound.currentTime = 0;
        this.boomSound.volume = 0.5;
        this.boomSound.play();
      }
      if (this.alarmSound) {
        this.alarmSound.currentTime = 0;
        this.alarmSound.volume = 0.5;
        this.alarmSound.play();
      }
      this.startRumbleEffect(this.mesh);
      this.updatePauseStats(); // Update health display
    }

    checkEnemyLaserCollisions(enemyLoader) {
      const currentTimestamp = performance.now();

      if (this.lastEnemyLaserCollisionCheck === undefined) {
        this.lastEnemyLaserCollisionCheck = currentTimestamp;
      }

      // Check more frequently for enemy lasers (200ms) as they're fast
      if (currentTimestamp - this.lastEnemyLaserCollisionCheck < 200) {
        return;
      }

      if (enemyLoader && enemyLoader.activeLasers) {
        for (const laserData of enemyLoader.activeLasers) {
          const { laserBeam } = laserData;
          if (this.checkCollision(this.mesh, laserBeam)) {
            this.userHit(35); // Increased from 23 to 35 for more challenging combat
            this.lastEnemyLaserCollisionCheck = currentTimestamp + 300; // Add cooldown after hit
            return;
          }
        }
      }
    }

    Update(
      forwardAcceleration,
      upwardAcceleration,
      timeElapsed,
      audioManager,
      asteroidLoader,
      enemyLoader,
      planetLoader
    ) {
      this.calculateRotation();
      this.calculateVelocity(
        forwardAcceleration,
        upwardAcceleration,
        timeElapsed
      );
      this.moveSpaceship();
      this.handleLaserMovement(asteroidLoader, enemyLoader);
      this.updateBoosterFlame(
        this.forwardVelocity,
        PHYSICS_CONSTANTS.maxVelocity
      );
      this.checkAsteroidCollisions(asteroidLoader);
      this.checkEnemyLaserCollisions(enemyLoader);
      this.checkPlanetCollisions(planetLoader);

      // Particle effects - spawn when moving at any speed
      // if (this.forwardVelocity > 0.1) {
      //   if (!this.particleCounter) this.particleCounter = 0;
      //   this.particleCounter++;

      //   if (this.particleCounter % 2 === 0) {
      //     // Every other frame
      //     this.createEngineParticle();
      //   }
      // }
      // this.updateEngineParticles();

      // Wing trails - create less frequently for better performance
      if (this.forwardVelocity > 0.3 && Math.random() > 0.98) {
        // Changed from 0.97 to 0.98 for less frequent spawning
        this.createWingTrail();
      }
      this.updateWingTrails();

      // Removed cockpit glow pulse for better performance

      this.thirdPersonCamera.Update(timeElapsed);
      audioManager.updateSpaceshipVolume(this.forwardVelocity);
    }
    calculateRotation() {
      if (this.forwardVelocity > 0 || this.upwardVelocity > 0) {
        const continuousRotation = -(mouseX * 0.0001);
        this.mesh.rotation.y += continuousRotation;
        const targetX = this.mesh.children[0].rotation.x + mouseY * 0.0002;
        const mappedTargetX = mapValue(
          targetX,
          -Math.PI,
          Math.PI,
          -Math.PI * 0.93,
          Math.PI * 0.93
        );
        this.mesh.children[0].rotation.x = THREE.MathUtils.lerp(
          this.mesh.children[0].rotation.x,
          mappedTargetX,
          0.8
        );

        // YAW
        const maxRotation = Math.PI / 2;
        const midX = window.innerWidth / 2;
        this.mesh.children[0].rotation.z = mapValue(
          mouseX,
          -midX,
          midX,
          -maxRotation,
          maxRotation
        );
      }
    }

    calculateVelocity(forwardAcceleration, upwardAcceleration, timeElapsed) {
      this.updateUpwardVelocity(upwardAcceleration, timeElapsed); // update this.upwardVelocity
      this.updateForwardVelocity(forwardAcceleration, timeElapsed); // update this.forwardVelocty
    }

    updateUpwardVelocity(upwardAcceleration, timeElapsed) {
      if (upwardAcceleration > 0) {
        this.upwardVelocity +=
          PHYSICS_CONSTANTS.verticalAcceleration * timeElapsed;
        this.upwardVelocity = Math.min(
          this.upwardVelocity,
          PHYSICS_CONSTANTS.maxVelocity
        );
      } else if (upwardAcceleration < 0) {
        this.upwardVelocity -=
          PHYSICS_CONSTANTS.verticalAcceleration * timeElapsed;
        this.upwardVelocity = Math.max(
          this.upwardVelocity,
          -PHYSICS_CONSTANTS.maxVelocity
        );
      } else {
        const easingFactor = 0.05; // Increase this value to make the easing more noticeable
        this.upwardVelocity -=
          Math.sign(this.upwardVelocity) * easingFactor * timeElapsed; // Ease towards zero
      }
    }

    updateForwardVelocity(forwardAcceleration, timeElapsed) {
      if (forwardAcceleration > 0) {
        this.forwardVelocity = Math.min(
          this.forwardVelocity + PHYSICS_CONSTANTS.acceleration * timeElapsed,
          PHYSICS_CONSTANTS.maxVelocity
        );
      }
      if (forwardAcceleration < 0) {
        this.forwardVelocity -= PHYSICS_CONSTANTS.deceleration * timeElapsed;
        this.forwardVelocity = Math.max(this.forwardVelocity, 0);
      }
    }

    moveSpaceship() {
      let moveVector = new THREE.Vector3();
      let sinY = Math.sin(this.mesh.rotation.y); // Calculate sine of Y rotation for movement along the Y axis
      let cosY = Math.cos(this.mesh.rotation.y); // Calculate cosine of Y rotation for movement along the Z axis
      let cosX = Math.cos(this.mesh.children[0].rotation.x); // Calculate cosine of X rotation for vertical movement

      moveVector.set(
        sinY * cosX * this.forwardVelocity, // Horizontal movement based on forward velocity and Y rotation
        -Math.sin(this.mesh.children[0].rotation.x) * this.forwardVelocity +
          this.upwardVelocity, // Vertical movement based on upward velocity and pitch
        cosY * cosX * this.forwardVelocity // Horizontal movement along the Z axis based on forward velocity and Y rotation
      );

      this.mesh.position.add(moveVector); // Update the spaceship's position based on the calculated move vector
    }
  }

  return {
    Spaceship: Spaceship,
    preloadAllModels: preloadAllModels,
  };
})();

const centerX = window.innerWidth / 2;
const centerY = window.innerHeight / 2;
let mouseX = 0;
let mouseY = 0;

var cursorBig = document.querySelector(".big");
var cursorSmall = document.querySelector(".small");
window.addEventListener("mousemove", (event) => {
  mouseX = event.clientX - centerX;
  mouseY = event.clientY - centerY;
  // console.log(mouseX, mouseY);

  cursorBig.style.transform = `translate3d(calc(${event.clientX}px - 50%), calc(${event.clientY}px - 50%), 0)`;
  // cursor.style.left = event.pageX + "px";
  // cursor.style.top = event.pageY + "px";

  cursorSmall.style.left = event.pageX + "px";
  cursorSmall.style.top = event.pageY + "px";
  // cursorBig.style.transform = `translate3d(calc(${mouseY}px), calc(${mouseY}px), 0)`;
});
