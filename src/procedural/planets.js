import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { getRandomDeepColor } from "../utils/utils.js";
import { updateCloestPlanet, updateDirectionalIndicators, updatePlanetDefenseStatus, hidePlanetDefenseStatus, updateMiniMap, addXP } from "../components/dom.js";
import { enemy } from "../components/enemy.js";

export const planets = (() => {
  class PlanetLoader {
    constructor(scene) {
      this.scene = scene;
      this.planets = [];
      this.planetLoader = new GLTFLoader();
      this.path = "public/planet/";
      this.defaultHealth = 2000; // Balanced from 5000 to 2000 for better gameplay
      this.enemiesSpawned = false; // redundant can use loader only
      this.enemyLoader = null;
      this.currentPlanet = null; // Track which planet enemies are assigned to
    }

    // Method to load planets asynchronously
    async initialisePlanets(count) {
      const gltf = await this.planetLoader
        .setPath(this.path)
        .loadAsync("scene.gltf");
      if (!gltf || !gltf.scene) {
        throw new Error(`Failed to load model from path: ${this.path}`);
      }

      for (let i = 0; i < count; i++) {
        const planetGroup = this.createPlanetGroup(gltf);
        this.scene.add(planetGroup);
        this.planets.push(planetGroup);
      }
    }

    // Creates a group of planet objects, including model and fog sphere
    createPlanetGroup(gltf) {
      const planetGroup = new THREE.Group();
      const scale = (Math.random() - 0.5) * 600;
      const model = this.createPlanetModel(gltf, scale);

      const randomColor = getRandomDeepColor();
      const fogSphere = this.createFog(model.position, randomColor, scale);

      planetGroup.add(model);
      planetGroup.add(fogSphere);


      planetGroup.position.set(
        (Math.random() - 0.5) * 1000,  // X-axis
        (Math.random() - 0.5) * 100,  // Y-axis smol
        (Math.random() - 0.5) * 1000   // Z-axis
      );
      
      // Ensure the distance from the origin (0, 0, 0) is at least 3000
      const distance = planetGroup.position.length();
      if (distance < 500) {
        const factor = 1000 / distance;
        planetGroup.position.multiplyScalar(factor);
      }


      planetGroup.health = this.defaultHealth;
      planetGroup.maxHealth = this.defaultHealth;
      planetGroup.planetSize = scale * -1;
      planetGroup.hasEnemies = false; // Track if enemies are spawned for this planet

      this.scene.add(planetGroup);
      this.planets.push(planetGroup);

      return planetGroup;
    }

    createPlanetModel(gltf, scale) {
      const model = gltf.scene.clone();
      model.scale.set(scale, scale, scale);
      return model;
    }

    // Creates a fog sphere around the planet model
    createFog(position, color, scale) {
      const fogGeometry = new THREE.SphereGeometry(scale * 1.3, 32, 32);
      const fogMaterial = new THREE.MeshPhysicalMaterial({
        color: color,
        opacity: 0.8,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        metalness: 0.5,
        roughness: 0.01,
      });

      const fogSphere = new THREE.Mesh(fogGeometry, fogMaterial);
      fogSphere.position.copy(position);
      return fogSphere;
    }

    // Optional: Creates lights around the planet (currently not used)
    createLights(position, color, scale) {
      const lightPositions = [
        { x: 30, y: 30, z: 30 },
        { x: -30, y: -30, z: 30 },
        { x: 50, y: 0, z: 0 },
      ];

      return lightPositions.map((pos) => {
        const light = new THREE.PointLight(color, 10, 1000);
        light.position.set(
          (pos.x * scale) / 2 + position.x,
          (pos.y * scale) / 2 + position.y,
          (pos.z * scale) / 2 + position.z
        );
        return light;
      });
    }



    animatePlanets(playerCurrentPosition, reposition, playerForwardDirection = null, playerShip = null) {
      if (this.enemyLoader) {
        this.enemyLoader.animateEnemies(playerCurrentPosition);
        // Check for enemy laser collisions with planets
        this.checkEnemyLaserPlanetCollisions();

        // Update planet defense status HUD
        if (this.currentPlanet && this.currentPlanet.hasEnemies) {
          updatePlanetDefenseStatus(this.currentPlanet, this.enemyLoader.enemies.length);
        }

        // Check if all enemies are cleared while planet still exists
        if (this.currentPlanet && this.currentPlanet.hasEnemies && this.enemyLoader.enemies.length === 0) {
          if (playerShip) {
            playerShip.health = Math.min(playerShip.health + 50, playerShip.maxHealth);

            // Track planets saved
            playerShip.planetsSaved++;

            // Award bonus XP for saving the planet
            addXP(100);
            playerShip.showNotification('🌍 Planet Saved! +100 XP +50 HP', 'success');
            playerShip.updatePauseStats();
          }
          // Reset the flags
          this.currentPlanet.hasEnemies = false;
          this.currentPlanet = null;
          this.enemyLoader = null;
          this.enemiesSpawned = false;

          // Hide planet defense status
          hidePlanetDefenseStatus();
        }
      } else {
        // No active defense mission, hide the status
        hidePlanetDefenseStatus();
      }

      if (this.planets) {
        let clostestPlanet = null;
        let closestDistance = null

        this.planets.forEach((planet, index) => {
          planet.children[0].rotation.y += 0.0001;

          // Check if planet health is depleted
          if (planet.health <= 0) {
            // If enemies exist for this planet, make them chase the player
            if (planet.hasEnemies && this.enemyLoader) {
              // Set target to null so enemies chase player
              this.enemyLoader.target = null;
            }

            // Show planet destroyed notification
            if (playerShip) {
              playerShip.showNotification('💥 Planet Destroyed!', 'danger');
            }

            this.scene.remove(planet);
            this.planets.splice(index, 1);
            return; // Skip further processing for this planet
          }

          const playerDistance = playerCurrentPosition.distanceTo(
            planet.position
          );
        //   console.log(playerDistance)
        //     console.log(planet.planetSize)
          if (!closestDistance) {
            closestDistance = playerDistance;
            clostestPlanet = planet
          } else {
            if (playerDistance < closestDistance) {
                closestDistance = playerDistance;
                clostestPlanet = planet
            }
          }

          if (playerDistance > 6000) {
            // Clean up old enemies before repositioning planet
            this.cleanupEnemies();
            reposition(planet.position, playerCurrentPosition);
            // Reset enemies spawned flag so new enemies can spawn at new location
            this.enemiesSpawned = false;
            planet.hasEnemies = false;
          }

          if (playerDistance < 1500) { //  closer than 1500: spawn enemy group
            if (!planet.hasEnemies) {
                planet.hasEnemies = true;
                this.enemiesSpawned = true;
                this.currentPlanet = planet;
                const enemyCount = 5; // Max 5 enemies per planet
                // Only create new loader if we don't have one already
                if (!this.enemyLoader) {
                  this.enemyLoader = new enemy.EnemyLoader(this.scene);
                }
                this.enemyLoader.initaliseEnemies(enemyCount, planet.position);

                // Show warning notification
                if (playerShip) {
                  playerShip.showNotification('⚠️ Planet Under Attack! Destroy All Enemies!', 'danger');
                }
            }
          }
          if (playerDistance <= planet.planetSize) {
            // Check cooldown to prevent multiple hits
            const currentTime = performance.now();
            if (!planet.lastCollisionTime || currentTime - planet.lastCollisionTime > 2000) {
              planet.lastCollisionTime = currentTime;
              if (playerShip) {
                playerShip.userHit(50); // Heavy damage for planet collision
                playerShip.showNotification('💥 PLANET COLLISION! -50 HP', 'danger');
              }
            }
          }
        });

        // Update closest planet UI (only once per frame, after checking all planets)
        if (clostestPlanet) {
          updateCloestPlanet(clostestPlanet.position);
        }

        // Update directional indicators ALWAYS (outside the forEach loop)
        // Pass all planets and all enemies to the indicator system
        if (playerForwardDirection) {
          const enemyArray = (this.enemyLoader && this.enemyLoader.enemies) ? this.enemyLoader.enemies : [];
          updateDirectionalIndicators(
            playerCurrentPosition,
            playerForwardDirection,
            this.planets,
            enemyArray
          );

          // Update mini-map
          updateMiniMap(
            playerCurrentPosition,
            this.planets,
            enemyArray
          );
        }
      }
    }

    cleanupEnemies() {
      if (this.enemyLoader) {
        // Remove all enemies from scene
        if (this.enemyLoader.enemies) {
          this.enemyLoader.enemies.forEach((enemy) => {
            this.scene.remove(enemy);
            // Dispose of geometries and materials
            enemy.traverse((child) => {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach((mat) => mat.dispose());
                } else {
                  child.material.dispose();
                }
              }
            });
          });
        }

        // Remove all lasers from scene
        if (this.enemyLoader.activeLasers) {
          this.enemyLoader.activeLasers.forEach((laserData) => {
            this.scene.remove(laserData.laserBeam);
            if (laserData.laserBeam.geometry) laserData.laserBeam.geometry.dispose();
            if (laserData.laserBeam.material) laserData.laserBeam.material.dispose();
          });
        }

        // Clear the enemy loader reference
        this.enemyLoader = null;
      }
    }

    checkEnemyLaserPlanetCollisions() {
      if (!this.enemyLoader || !this.enemyLoader.activeLasers) return;

      this.enemyLoader.activeLasers.forEach((laserData, laserIndex) => {
        const { laserBeam, targetingPlanet } = laserData;

        // Only check lasers that are targeting planets
        if (!targetingPlanet) return;

        this.planets.forEach((planet) => {
          const laserBox = new THREE.Box3().setFromObject(laserBeam);
          const planetBox = new THREE.Box3().setFromObject(planet);

          if (laserBox.intersectsBox(planetBox)) {
            // Damage the planet
            planet.health -= 5; // Reduced from 10 to 5 since planet health is now 5000

            // Remove the laser and dispose resources
            this.scene.remove(laserBeam);
            if (laserBeam.geometry) laserBeam.geometry.dispose();
            if (laserBeam.material) laserBeam.material.dispose();
            this.enemyLoader.activeLasers.splice(laserIndex, 1);
          }
        });
      });
    }
  }

  return {
    PlanetLoader: PlanetLoader,
  };
})();
