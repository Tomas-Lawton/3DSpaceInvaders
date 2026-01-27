import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { getRandomDeepColor } from "../utils/utils.js";
import { updateCloestPlanet, updateDirectionalIndicators, updatePlanetDefenseStatus, hidePlanetDefenseStatus, updateMiniMap, addXP } from "../components/dom.js";
import { enemy } from "../components/enemy.js";
import { tutorial } from "../tutorial/tutorial.js";

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

      // Store GLTF for future use
      this.gltfModel = gltf;

      for (let i = 0; i < count; i++) {
        const planetGroup = this.createPlanetGroup(gltf);
        this.scene.add(planetGroup);
        this.planets.push(planetGroup);
      }
    }

    // Tutorial mode: create a single planet at a specific position
    async initialiseTutorialPlanet(position) {
      const gltf = await this.planetLoader
        .setPath(this.path)
        .loadAsync("scene.gltf");
      if (!gltf || !gltf.scene) {
        throw new Error(`Failed to load planet model`);
      }

      this.gltfModel = gltf;

      const planetGroup = new THREE.Group();
      const scale = 400; // Fixed size for tutorial (medium)
      const model = this.createPlanetModel(gltf, scale);

      // Use a distinct cyan color for tutorial planet
      const tutorialColor = 0x00ffee;
      const fogSphere = this.createFog(model.position, tutorialColor, scale * 0.9);

      planetGroup.add(model);
      planetGroup.add(fogSphere);

      // Set fixed position from tutorial config
      planetGroup.position.set(position.x, position.y, position.z);

      planetGroup.health = 1500; // Slightly lower health for tutorial
      planetGroup.maxHealth = 1500;
      planetGroup.planetSize = scale * -1;
      planetGroup.hasEnemies = false;
      planetGroup.isTutorialPlanet = true; // Mark for tutorial tracking

      this.scene.add(planetGroup);
      this.planets.push(planetGroup);

      console.log('[PLANETS] Tutorial planet created at', position);
      return planetGroup;
    }

    // Creates a group of planet objects, including model and fog sphere
    createPlanetGroup(gltf, playerPosition = null) {
      const planetGroup = new THREE.Group();
      const scale = 300 + Math.random() * 300; // Range: 300-600 (increased minimum size)
      const model = this.createPlanetModel(gltf, scale);

      const randomColor = getRandomDeepColor();
      const fogSphere = this.createFog(model.position, randomColor, scale*.9);

      planetGroup.add(model);
      planetGroup.add(fogSphere);

      // If player position provided, spawn planet away from player
      if (playerPosition) {
        // Random direction away from player
        const angle1 = Math.random() * Math.PI * 2;
        const angle2 = Math.acos(2 * Math.random() - 1);
        const direction = new THREE.Vector3(
          Math.sin(angle2) * Math.cos(angle1),
          Math.sin(angle2) * Math.sin(angle1),
          Math.cos(angle2)
        );

        // Spawn 1800-2800 units away from player (reduced for faster exploration)
        const spawnDistance = 1800 + Math.random() * 1000;
        planetGroup.position.set(
          playerPosition.x + direction.x * spawnDistance,
          playerPosition.y + direction.y * spawnDistance * 0.2, // Less vertical spread
          playerPosition.z + direction.z * spawnDistance
        );
      } else {
        // Initial spawn (no player position yet)
        let x, y, z;
        do {
          x = (Math.random() - 0.5) * 2000;  // X-axis - increased range
          y = (Math.random() - 0.5) * 200;   // Y-axis - increased range
          z = (Math.random() - 0.5) * 2000;  // Z-axis - increased range
        } while (Math.sqrt(x*x + y*y + z*z) < 300); // Ensure at least 300 units from origin

        planetGroup.position.set(x, y, z);

        // Ensure the first planet spawns far from player (at least 2000 units away)
        const distance = planetGroup.position.length();
        if (distance < 2000) {
          const factor = 2000 / distance;
          planetGroup.position.multiplyScalar(factor);
        }
      }

      planetGroup.health = this.defaultHealth;
      planetGroup.maxHealth = this.defaultHealth;
      planetGroup.planetSize = scale * -1;
      planetGroup.hasEnemies = false; // Track if enemies are spawned for this planet

      this.scene.add(planetGroup);
      this.planets.push(planetGroup);

      return planetGroup;
    }

    // Spawn a new planet procedurally near the player
    spawnNewPlanet(playerPosition) {
      if (!this.gltfModel) {
        console.warn('Cannot spawn new planet - GLTF model not loaded');
        return;
      }

      console.log('🌍 Spawning new planet procedurally...');
      const newPlanet = this.createPlanetGroup(this.gltfModel, playerPosition);
      return newPlanet;
    }

    createPlanetModel(gltf, scale) {
      const model = gltf.scene.clone();
      model.scale.set(scale, scale, scale);

      // Disable frustum culling on planet model to prevent visibility glitches at far distances
      model.traverse((child) => {
        if (child.isMesh) {
          child.frustumCulled = false;
        }
      });

      return model;
    }

    // Creates a fog sphere around the planet model
    createFog(position, color, scale) {
      const fogGeometry = new THREE.SphereGeometry(scale * 1.3, 32, 32); // Optimized segments for performance
      const fogMaterial = new THREE.MeshBasicMaterial({
        color: color,
        opacity: 0.25, // Lighter opacity for better performance and visibility
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide, // Only render from outside for better atmosphere
      });

      const fogSphere = new THREE.Mesh(fogGeometry, fogMaterial);
      fogSphere.position.copy(position);

      // Disable frustum culling to prevent visibility glitches at far distances
      fogSphere.frustumCulled = false;

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
        const light = new THREE.PointLight(color, 8, 600);
        light.position.set(
          (pos.x * scale) / 2 + position.x,
          (pos.y * scale) / 2 + position.y,
          (pos.z * scale) / 2 + position.z
        );
        return light;
      });
    }



    animatePlanets(playerCurrentPosition, reposition, playerForwardDirection = null, playerShip = null, audioManager = null, asteroidLoader = null, starLoader = null) {
      if (this.enemyLoader) {
        this.enemyLoader.animateEnemies(playerCurrentPosition);
        // Check for enemy laser collisions with planets
        this.checkEnemyLaserPlanetCollisions();

        // Update planet defense status HUD
        if (this.currentPlanet && this.currentPlanet.hasEnemies) {
          updatePlanetDefenseStatus(this.currentPlanet, this.enemyLoader.enemies.length);
        }

        // Check if all enemies are cleared while planet still exists
        // CRITICAL: Don't check if currently spawning (async callbacks haven't completed yet!)
        const canCheckPlanetSaved = this.currentPlanet && this.currentPlanet.hasEnemies &&
                                    this.enemyLoader && this.enemyLoader.enemies.length === 0 &&
                                    !this.currentlySpawning; // FIXED: Block check during spawn

        if (canCheckPlanetSaved) {
          console.log(`[PLANET] 🌍 All enemies defeated! Planet saved!`);

          // Stop dogfight music
          if (audioManager) {
            audioManager.stopDogfightMusic();
          }

          if (playerShip) {
            playerShip.health = Math.min(playerShip.health + 50, playerShip.maxHealth);

            // Track planets saved
            playerShip.planetsSaved++;

            // Award bonus XP for saving the planet
            addXP(100);
            playerShip.showNotification('🌍 Planet Saved! +100 XP +50 HP', 'success');
            playerShip.updatePauseStats();
          }

          // Mark planet as permanently cleared - enemies will NEVER respawn here
          this.currentPlanet.hasEnemies = false;
          this.currentPlanet.cleared = true; // NEW: Permanent flag
          this.currentPlanet.spawnTriggeredThisSession = false;
          this.currentPlanet = null;
          // DO NOT null enemyLoader - reuse it for next planet
          this.enemiesSpawned = false;
          this.currentlySpawning = false; // Reset spawn lock

          console.log(`[PLANET] 🛡️ Planet permanently cleared - enemies will NEVER respawn here`);

          // Notify tutorial system
          if (tutorial.isActive()) {
            tutorial.onPlanetSaved();
          }

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
          // Throttle planet rotation - only update every 3rd frame
          if (Math.random() < 0.33) {
            planet.children[0].rotation.y += 0.0003; // Compensate with 3x rotation speed
          }

          // Check if planet health is depleted
          if (planet.health <= 0) {
            // If enemies exist for this planet, make them chase the player
            if (planet.hasEnemies && this.enemyLoader) {
              // Set target to null so enemies chase player
              this.enemyLoader.target = null;

              // Stop dogfight music since planet is gone (enemies still chase player)
              if (audioManager) {
                audioManager.stopDogfightMusic();
              }
            }

            // Show planet destroyed notification and trigger Game Over
            if (playerShip) {
              playerShip.showNotification('💥 Planet Destroyed!', 'danger');
              // Trigger Game Over after short delay
              setTimeout(() => {
                playerShip.gameOver();
              }, 1000);
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
            // Mark planet for removal (too far away)
            planet.markedForRemoval = true;
          }

          if (playerDistance < 1500) { //  closer than 1500: spawn enemy group
            // Notify tutorial that player is near a planet (only once per planet)
            if (tutorial.isActive() && !planet.tutorialNearNotified) {
              planet.tutorialNearNotified = true;
              tutorial.onNearPlanet();
            }

            // ROBUST CHECK: Only spawn if no enemies exist AND not currently spawning
            const hasActiveEnemies = this.enemyLoader && this.enemyLoader.enemies && this.enemyLoader.enemies.length > 0;

            // CRITICAL: Check if this EXACT planet already triggered a spawn this frame
            if (!planet.spawnTriggeredThisSession) {
              planet.spawnTriggeredThisSession = false; // Initialize flag
            }

            // Initialize cleared flag if not set
            if (planet.cleared === undefined) {
              planet.cleared = false;
            }

            // Check if we're switching to a DIFFERENT planet while in combat
            const isSwitchingPlanets = hasActiveEnemies && this.currentPlanet && this.currentPlanet !== planet && !planet.cleared;

            if (isSwitchingPlanets && !this.currentlySpawning) {
              console.log(`[PLANET] 🔄 Switching from old planet to new planet - cleaning up old dogfight`);

              // Clean up the old dogfight
              this.cleanupEnemies();

              // Reset the old planet's state (but don't mark as cleared - player fled)
              if (this.currentPlanet) {
                this.currentPlanet.hasEnemies = false;
                this.currentPlanet.spawnTriggeredThisSession = false;
              }

              // Stop dogfight music (will restart when new enemies spawn)
              if (audioManager) {
                audioManager.stopDogfightMusic();
              }

              // Reset state
              this.currentPlanet = null;
              this.enemiesSpawned = false;
            }

            // Recalculate after potential cleanup
            const hasActiveEnemiesNow = this.enemyLoader && this.enemyLoader.enemies && this.enemyLoader.enemies.length > 0;

            // Don't spawn if planet has been cleared
            if (!planet.cleared && !planet.hasEnemies && !hasActiveEnemiesNow && !this.currentlySpawning && !planet.spawnTriggeredThisSession) {
                console.log(`[PLANET] ✅ Player within 1500. Spawning enemies... (hasEnemies: ${planet.hasEnemies}, activeEnemies: ${hasActiveEnemiesNow}, spawning: ${this.currentlySpawning})`);

                // Set ALL flags IMMEDIATELY to prevent ANY re-entry
                planet.hasEnemies = true;
                planet.spawnTriggeredThisSession = true; // Mark this planet as having spawned
                this.enemiesSpawned = true;
                this.currentPlanet = planet;
                this.currentlySpawning = true; // Spawn lock

                const enemyCount = 5; // Reduced from 7 to 5 for better balance

                // Create loader if it doesn't exist
                if (!this.enemyLoader) {
                  console.log(`[PLANET] Creating NEW enemy loader`);
                  this.enemyLoader = new enemy.EnemyLoader(this.scene);
                } else {
                  console.log(`[PLANET] Reusing existing enemy loader`);
                }

                // ALWAYS cleanup before spawning to ensure clean state
                this.cleanupEnemies();

                // Now spawn enemies
                console.log(`[PLANET] Calling initaliseEnemies(${enemyCount})`);
                // Pass planet size (stored as negative, so use absolute value)
                const planetRadius = Math.abs(planet.planetSize);
                this.enemyLoader.initaliseEnemies(enemyCount, planet.position, planetRadius);

                // Start dogfight music
                if (audioManager) {
                  audioManager.playDogfightMusic();
                }

                // Show warning notification
                if (playerShip) {
                  playerShip.showNotification('⚠️ Planet Under Attack! Destroy All Enemies!', 'danger');
                }

                // Notify tutorial system that enemies spawned
                if (tutorial.isActive()) {
                  // Slight delay to allow enemies to initialize
                  setTimeout(() => {
                    tutorial.onEnemiesSpawned();
                  }, 500);
                }

                // Release spawn lock after async callbacks complete
                // Increased to 2000ms to ensure GLTF loading callbacks have time to fire
                setTimeout(() => {
                  this.currentlySpawning = false;
                  console.log(`[PLANET] Spawn lock released (enemies should be in scene now)`);
                }, 2000);
            } else if (planet.cleared) {
              // Planet is cleared - do nothing (silent, no log spam)
            } else {
              // Log why spawn was blocked (only once per second to avoid spam)
              if (!this._lastBlockLog || Date.now() - this._lastBlockLog > 1000) {
                console.log(`[PLANET] ⛔ Spawn BLOCKED - hasEnemies: ${planet.hasEnemies}, activeEnemies: ${hasActiveEnemiesNow}, spawning: ${this.currentlySpawning}, cleared: ${planet.cleared}`);
                this._lastBlockLog = Date.now();
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

        // Check if player is far from combat - end dogfight completely
        if (this.enemyLoader && this.enemyLoader.enemies.length > 0 && this.currentPlanet) {
          const combatDistance = 2500; // Distance threshold to end combat
          const nearestEnemyDistance = Math.min(...this.enemyLoader.enemies.map(e => {
            const dx = e.position.x - playerCurrentPosition.x;
            const dy = e.position.y - playerCurrentPosition.y;
            const dz = e.position.z - playerCurrentPosition.z;
            return Math.sqrt(dx * dx + dy * dy + dz * dz);
          }));

          if (nearestEnemyDistance > combatDistance) {
            console.log(`[COMBAT] Player fled combat (${nearestEnemyDistance.toFixed(0)}u away) - ending dogfight`);

            // Reset the planet state so enemies can respawn if player returns
            // (Don't mark as cleared - player fled, didn't win)
            if (this.currentPlanet) {
              this.currentPlanet.hasEnemies = false;
              this.currentPlanet.spawnTriggeredThisSession = false;
              console.log(`[COMBAT] Reset planet state - enemies will respawn if player returns`);
            }

            // Clean up enemies
            this.cleanupEnemies();

            // Reset combat state
            this.currentPlanet = null;
            this.enemiesSpawned = false;
            this.currentlySpawning = false;

            // Stop dogfight music
            if (audioManager) {
              audioManager.stopDogfightMusic();
            }

            // Hide planet defense status
            hidePlanetDefenseStatus();
          }
        }

        // Remove planets that are too far away
        const planetsToRemove = this.planets.filter(p => p.markedForRemoval);
        planetsToRemove.forEach(planet => {
          console.log(`[PLANET] Removing planet that's too far away`);

          // Clean up enemies if this was the current planet
          if (this.currentPlanet === planet) {
            this.cleanupEnemies();
            this.currentPlanet = null;
            this.enemiesSpawned = false;
            this.currentlySpawning = false;

            // Stop dogfight music
            if (audioManager) {
              audioManager.stopDogfightMusic();
            }
          }

          this.scene.remove(planet);
          const index = this.planets.indexOf(planet);
          if (index > -1) {
            this.planets.splice(index, 1);
          }
        });

        // Spawn new planet if all planets are far away (max 3 planets at a time)
        const MAX_PLANETS = 3;
        if (this.planets.length < MAX_PLANETS) {
          // Check if closest planet is far away
          if (!clostestPlanet || closestDistance > 4000) {
            console.log(`[PLANET] All planets far away (${closestDistance?.toFixed(0)} units) - spawning new planet`);
            this.spawnNewPlanet(playerCurrentPosition);
          }
        }

        // Update closest planet UI (only once per frame, after checking all planets)
        // if (clostestPlanet) {
        //   updateCloestPlanet(clostestPlanet.position);
        // }

        // Update directional indicators ALWAYS (outside the forEach loop)
        // Pass all planets, enemies, and asteroid fields to the indicator system
        if (playerForwardDirection) {
          const enemyArray = (this.enemyLoader && this.enemyLoader.enemies) ? this.enemyLoader.enemies : [];
          const asteroidArray = asteroidLoader && asteroidLoader.asteroidSystem ? asteroidLoader.asteroidSystem : [];
          const starArray = starLoader && starLoader.stars ? starLoader.stars : [];
          updateDirectionalIndicators(
            playerCurrentPosition,
            playerForwardDirection,
            this.planets,
            enemyArray,
            asteroidArray,
            starArray
          );

          // Update mini-map (need player rotation and asteroid fields)
          // Player rotation can be calculated from forward direction
          const playerRotation = playerForwardDirection ?
            Math.atan2(playerForwardDirection.x, playerForwardDirection.z) : 0;

          updateMiniMap(
            playerCurrentPosition,
            this.planets,
            enemyArray,
            playerRotation,
            asteroidLoader && asteroidLoader.asteroidSystem ? asteroidLoader.asteroidSystem : [],
            this.currentPlanet,
            starLoader && starLoader.stars ? starLoader.stars : []
          );
        }
      }
    }

    cleanupEnemies() {
      if (this.enemyLoader) {
        console.log(`[CLEANUP] Starting cleanup. Current enemies: ${this.enemyLoader.enemies ? this.enemyLoader.enemies.length : 0}`);

        // Remove all enemies from scene
        if (this.enemyLoader.enemies && this.enemyLoader.enemies.length > 0) {
          this.enemyLoader.enemies.forEach((enemy, index) => {
            console.log(`[CLEANUP] Removing enemy ${index + 1}/${this.enemyLoader.enemies.length}`);
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
          // CRITICAL: Clear the enemies array!
          this.enemyLoader.enemies = [];
          console.log(`[CLEANUP] ✅ Enemies array cleared. New length: ${this.enemyLoader.enemies.length}`);
        }

        // Remove all lasers from scene
        if (this.enemyLoader.activeLasers && this.enemyLoader.activeLasers.length > 0) {
          console.log(`[CLEANUP] Removing ${this.enemyLoader.activeLasers.length} lasers`);
          this.enemyLoader.activeLasers.forEach((laserData) => {
            this.scene.remove(laserData.laserBeam);
            if (laserData.laserBeam.geometry) laserData.laserBeam.geometry.dispose();
            if (laserData.laserBeam.material) laserData.laserBeam.material.dispose();
          });
          // CRITICAL: Clear the lasers array!
          this.enemyLoader.activeLasers = [];
        }

        // DO NOT null out enemyLoader - we reuse it!
        console.log(`[CLEANUP] ✅ Cleanup complete`);
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
            const damage = 7; // Increased from 5 to 10 (planet has 2000 HP = 200 hits to destroy)
            planet.health -= damage;

            // Log planet damage for debugging
            console.log(`🎯 Planet hit! -${damage} HP. Planet health: ${Math.floor(planet.health)}/${planet.maxHealth} (${Math.floor((planet.health/planet.maxHealth)*100)}%)`);

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
