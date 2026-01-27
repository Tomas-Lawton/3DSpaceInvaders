import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export const enemy = (() => {
  // Shared model cache to avoid loading the same model multiple times
  let cachedEnemyModel = null;
  let isLoadingModel = false;
  const loadingCallbacks = [];

  class EnemyLoader {
    constructor(scene, camera, health = 80) {
      this.scene = scene;
      this.camera = camera;
      this.health = health;
      this.mesh = null;
      this.forwardVelocity = 0;
      this.upwardVelocity = 0;
      this.enemies = [];
      this.loader = new GLTFLoader().setPath("public/ships/ship_5/");
      this.activeLasers = [];
      this.shootCooldown = 300; // Increased from 80 to 300ms for better balance (3.3 shots/sec)
      this.lightSound = new Audio("public/audio/enemy_pew.mp3");
      this.firingDistance = 100;
      this.updateCounter = 0; // For LOD optimization
    }

    // Initialise enemies without promises, using callback in the loader
    initaliseEnemies(numEnemies, aroundPoint, planetRadius = 300) {
      // HARD CAP: Never allow more than 5 enemies total
      const maxEnemies = 5;
      const currentEnemyCount = this.enemies.length;

      console.log(`[ENEMY SPAWN] Called with ${numEnemies} requested. Current count: ${currentEnemyCount}. Planet radius: ${planetRadius}`);

      if (currentEnemyCount >= maxEnemies) {
        console.error(`[ENEMY SPAWN] ❌ BLOCKED! Already at cap: ${currentEnemyCount}/${maxEnemies}`);
        return; // Don't spawn any more enemies
      }

      // Calculate how many we can actually spawn
      const enemiesToSpawn = Math.min(numEnemies, maxEnemies - currentEnemyCount);
      console.log(`[ENEMY SPAWN] ✅ Spawning ${enemiesToSpawn} enemies (Current: ${currentEnemyCount}, Requested: ${numEnemies})`);

      this.target = aroundPoint;
      this.currentPlanetRadius = planetRadius; // Store for use in createEnemy
      for (let i = 0; i < enemiesToSpawn; i++) {
        this.createEnemy(aroundPoint, planetRadius, (enemyObject) => {
          // CRITICAL: Double-check cap before adding (async callback protection)
          if (this.enemies.length < maxEnemies) {
            enemyObject.lastShotTime = 0;
            this.scene.add(enemyObject);
            this.enemies.push(enemyObject);
            console.log(`[ENEMY SPAWN] Enemy ${this.enemies.length}/${maxEnemies} added to scene`);
          } else {
            console.error(`[ENEMY SPAWN] ❌ ASYNC CAP BLOCK! Tried to add enemy when at ${this.enemies.length}/${maxEnemies}`);
            this.scene.remove(enemyObject);
            // Dispose of the excess enemy
            if (enemyObject.geometry) enemyObject.geometry.dispose();
            if (enemyObject.material) enemyObject.material.dispose();
          }
        });
      }
    }

    createEnemy(aroundPoint, planetRadius, callback) {
      // Function to create enemy from cached or newly loaded model
      const createEnemyFromModel = (gltf) => {
        const enemyObject = new THREE.Group();

        const angle = Math.random() * Math.PI * 2;
        const distance = 120; // Reduced from 200 to 120 for easier catching
        const x = aroundPoint.x + Math.cos(angle) * distance;
        const z = aroundPoint.z + Math.sin(angle) * distance;
        const y = aroundPoint.y;
        enemyObject.position.set(x, y, z);

        // Add position variation within the group itself for smaller offsets
        enemyObject.position.add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 30, // Reduced from 50 to 30
            (Math.random() - 0.5) * 30,
            (Math.random() - 0.5) * 30
          )
        );

        const loadedModel = gltf.scene.clone(); // Clone the cached model
        loadedModel.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = child.receiveShadow = true;

            // Visible red tint for easier spotting
            if (child.material) {
              child.material = child.material.clone();
              child.material.emissive = new THREE.Color(0x550000); // Brighter red emissive
              child.material.emissiveIntensity = 0.25; // Increased for better visibility
              child.material.color = new THREE.Color(0xcccccc); // Brighter gray base
              child.material.metalness = 0.6;
              child.material.roughness = 0.3;
            }
          }
        });
        loadedModel.rotation.y = 2 * (Math.PI / 2) + Math.PI;
        loadedModel.scale.set(0.3, 0.3, 0.3); // Reduced from 0.5 for smaller enemies
        enemyObject.add(loadedModel);

        // Optimized red light for better performance
        const enemyLight = new THREE.PointLight(0xff2200, 12, 40);
        enemyLight.position.set(0, 2, 0);
        enemyLight.castShadow = false;
        enemyObject.add(enemyLight);

        // Add red triangle marker above enemy for visibility during dogfights
        const markerCanvas = document.createElement('canvas');
        markerCanvas.width = 32;
        markerCanvas.height = 32;
        const ctx = markerCanvas.getContext('2d');
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        // Draw downward-pointing triangle
        ctx.moveTo(16, 28); // Bottom center
        ctx.lineTo(4, 8);   // Top left
        ctx.lineTo(28, 8);  // Top right
        ctx.closePath();
        ctx.fill();

        const markerTexture = new THREE.CanvasTexture(markerCanvas);
        const markerMaterial = new THREE.SpriteMaterial({
          map: markerTexture,
          sizeAttenuation: false,
          transparent: true,
          opacity: 0.9
        });
        const markerSprite = new THREE.Sprite(markerMaterial);
        markerSprite.scale.set(0.015, 0.015, 1);
        markerSprite.position.set(0, 10, 0);
        enemyObject.add(markerSprite);
        enemyObject.marker = markerSprite;

        // Add variance to enemy properties
        enemyObject.speedMultiplier = 0.8 + Math.random() * 0.4; // 0.8 to 1.2x speed variance (reduced for better chase gameplay)
        enemyObject.turnSpeed = 0.012 + Math.random() * 0.008; // Increased from 0.008-0.013 to 0.012-0.020 for more aggressive tracking

        // Store planet center for collision avoidance
        enemyObject.planetCenter = aroundPoint.clone();
        // Calculate safe distance based on actual planet size + generous margin
        enemyObject.planetRadius = planetRadius;
        enemyObject.minSafeDistance = planetRadius + 150; // Planet radius + safety margin

        // Assign random behavior pattern with more variety
        const behaviors = ['patrol', 'chase', 'orbit', 'attack_planet', 'arc', 'dive'];
        enemyObject.behavior = behaviors[Math.floor(Math.random() * behaviors.length)];

        // SAFETY: Minimum distance from planet center based on actual planet size
        const minSafeDistance = planetRadius + 150; // Planet radius + generous safety margin

        // Set initial patrol target for patrol behavior
        if (enemyObject.behavior === 'patrol') {
          const patrolAngle = Math.random() * Math.PI * 2;
          const patrolDistance = minSafeDistance + Math.random() * 150; // 380-530 units from planet
          enemyObject.patrolTarget = new THREE.Vector3(
            aroundPoint.x + Math.cos(patrolAngle) * patrolDistance,
            aroundPoint.y + (Math.random() - 0.5) * 50,
            aroundPoint.z + Math.sin(patrolAngle) * patrolDistance
          );
        }

        // For orbit behavior, store orbit center and angle
        if (enemyObject.behavior === 'orbit') {
          enemyObject.orbitCenter = aroundPoint.clone();
          enemyObject.orbitAngle = Math.random() * Math.PI * 2;
          enemyObject.orbitRadius = minSafeDistance + Math.random() * 100; // 380-480 units from planet
          enemyObject.orbitSpeed = 0.01 + Math.random() * 0.015;
        }

        // For attack_planet behavior
        if (enemyObject.behavior === 'attack_planet') {
          enemyObject.planetTarget = aroundPoint.clone();
          enemyObject.attackDistance = minSafeDistance + 50; // Stay just outside planet
          enemyObject.lastPlanetShotTime = 0;
        }

        // For arc behavior - wide arcing approaches
        if (enemyObject.behavior === 'arc') {
          enemyObject.arcCenter = aroundPoint.clone();
          enemyObject.arcAngle = Math.random() * Math.PI * 2;
          enemyObject.arcRadius = minSafeDistance + 200 + Math.random() * 200; // 580-780 from planet
          enemyObject.arcSpeed = 0.015 + Math.random() * 0.01;
          enemyObject.arcHeight = 50 + Math.random() * 100;
        }

        // For dive behavior - fly in and out
        if (enemyObject.behavior === 'dive') {
          enemyObject.diveCenter = aroundPoint.clone();
          enemyObject.divePhase = 'out'; // Start flying out
          enemyObject.diveDistance = minSafeDistance;
          enemyObject.maxDiveDistance = minSafeDistance + 400;
        }

        // Make enemy face a random direction initially (not always at planet)
        const randomAngle = Math.random() * Math.PI * 2;
        const randomTarget = new THREE.Vector3(
          enemyObject.position.x + Math.cos(randomAngle) * 100,
          enemyObject.position.y,
          enemyObject.position.z + Math.sin(randomAngle) * 100
        );
        enemyObject.lookAt(randomTarget);

        enemyObject.health = this.health;
        enemyObject.maxHealth = this.health; // Store max health for health bar calculation
        enemyObject.lastShotTime = 0; // Initialize firing timer

        if (callback) {
          callback(enemyObject);
        }
      };

      // Use cached model if available
      if (cachedEnemyModel) {
        createEnemyFromModel(cachedEnemyModel);
      } else if (isLoadingModel) {
        // Model is being loaded, queue this callback
        loadingCallbacks.push(() => createEnemyFromModel(cachedEnemyModel));
      } else {
        // Load model for the first time
        isLoadingModel = true;
        this.loader.load(
          "scene.gltf",
          (gltf) => {
            cachedEnemyModel = gltf;
            isLoadingModel = false;
            createEnemyFromModel(gltf);

            // Process queued callbacks
            while (loadingCallbacks.length > 0) {
              const queuedCallback = loadingCallbacks.shift();
              queuedCallback();
            }
          },
          undefined,
          (error) => {
            console.error("Error loading enemy model:", error);
            isLoadingModel = false;
          }
        );
      }
    }

    animateEnemies(playerCurrentPosition) {
      this.updateCounter++;

      // Log enemy count every 60 frames (once per second at 60fps)
      if (this.updateCounter % 60 === 0) {
        console.log(`[ENEMY ANIMATE] Currently animating ${this.enemies.length} enemies`);
      }

      this.enemies.forEach((enemy, index) => {
        // Always update and move all enemies (removed LOD for better movement)
        this.phaseTowardsTarget(enemy, playerCurrentPosition);
        this.animateForwardMovement(enemy);
        this.checkFiringPosition(enemy, playerCurrentPosition);
      });

      // Update lasers every frame
      this.updateLasers(playerCurrentPosition);
    }

    // phaseTowardsPlayer(enemy, playerCurrentPosition) {
    // // Update to aim at whichever is closer, player position or this.target

    //   if (enemy) {
    //     const phaseSpeed = 0.004; // Adjust for smoothness

    //     // Calculate the direction to the player
    //     const directionToPlayer = new THREE.Vector3();
    //     directionToPlayer
    //       .subVectors(playerCurrentPosition, enemy.position)
    //       .normalize();

    //     // Create a quaternion for the rotation towards the player
    //     const targetQuaternion = new THREE.Quaternion();
    //     targetQuaternion.setFromUnitVectors(
    //       new THREE.Vector3(0, 0, 1), // Default forward direction of the enemy
    //       directionToPlayer // Target direction to the player
    //     );

    //     // Spherically interpolate (slerp) towards the target orientation
    //     enemy.quaternion.slerp(targetQuaternion, phaseSpeed);
    //   }
    // }

    // phaseTowardsTarget(enemy, playerCurrentPosition, alternateTarget = null) {

    //   if (enemy) {
    //     if (this.target) {
    //       alternateTarget = this.target
    //     }
    //     const phaseSpeed = 0.007; // Adjust for smoothness
    //     // const phaseSpeed = 0.001; // Adjust for smoothness

    //     // Determine which target to aim at (player or alternate target)
    //     const playerDistance = enemy.position.distanceTo(playerCurrentPosition);
    //     const targetDistance = alternateTarget
    //       ? enemy.position.distanceTo(alternateTarget)
    //       : Infinity;

    //     // Choose the closer target
    //     const chosenTargetPosition =
    //       playerDistance < targetDistance
    //         ? playerCurrentPosition
    //         : alternateTarget;

    //     // Calculate the direction to the chosen target
    //     const directionToTarget = new THREE.Vector3();
    //     directionToTarget
    //       .subVectors(chosenTargetPosition, enemy.position)
    //       .normalize();

    //     // Create a quaternion for the rotation towards the target
    //     const targetQuaternion = new THREE.Quaternion();
    //     targetQuaternion.setFromUnitVectors(
    //       new THREE.Vector3(0, 0, 1), // Default forward direction of the enemy
    //       directionToTarget // Target direction
    //     );

    //     // Spherically interpolate (slerp) towards the target orientation
    //     enemy.quaternion.slerp(targetQuaternion, phaseSpeed);
    //   }
    // }

    phaseTowardsTarget(
      enemy,
      playerCurrentPosition,
      alternateTarget = null,
      inRangeDistance = 350, // Increased from 200 - enemies attack player more aggressively
      maxPlanetDistance = 1500
    ) {
      if (enemy) {
        if (this.target) {
          alternateTarget = this.target;
        }

        const phaseSpeed = enemy.turnSpeed || 0.018; // Use individual turn speed
        const playerDistance = enemy.position.distanceTo(playerCurrentPosition);
        const planetDistance = alternateTarget
          ? enemy.position.distanceTo(alternateTarget)
          : Infinity;

        let chosenTargetPosition;

        // Behavior-based target selection with reduced detection range (200 units)
        if (enemy.behavior === 'patrol') {
          // Attack player when close (200 units)
          if (playerDistance < 800) {
            chosenTargetPosition = playerCurrentPosition;
          } else {
            // Check if reached patrol target
            if (enemy.patrolTarget && enemy.position.distanceTo(enemy.patrolTarget) < 50) {
              // Set new patrol target with safe distance from planet
              const minSafeDistance = enemy.minSafeDistance || (enemy.planetRadius + 150); // Use stored safe distance
              const patrolAngle = Math.random() * Math.PI * 2;
              const patrolDistance = minSafeDistance + Math.random() * 150;
              const center = alternateTarget || enemy.position;
              enemy.patrolTarget = new THREE.Vector3(
                center.x + Math.cos(patrolAngle) * patrolDistance,
                center.y + (Math.random() - 0.5) * 50,
                center.z + Math.sin(patrolAngle) * patrolDistance
              );
            }
            chosenTargetPosition = enemy.patrolTarget;
          }
        } else if (enemy.behavior === 'orbit') {
          // Attack player when close (200 units)
          if (playerDistance < 200) {
            chosenTargetPosition = playerCurrentPosition;
          } else if (alternateTarget) {
            // Calculate orbit position
            enemy.orbitAngle += enemy.orbitSpeed;
            chosenTargetPosition = new THREE.Vector3(
              enemy.orbitCenter.x + Math.cos(enemy.orbitAngle) * enemy.orbitRadius,
              enemy.orbitCenter.y + Math.sin(enemy.orbitAngle * 0.5) * 30,
              enemy.orbitCenter.z + Math.sin(enemy.orbitAngle) * enemy.orbitRadius
            );
          } else {
            chosenTargetPosition = playerCurrentPosition;
          }
        } else if (enemy.behavior === 'attack_planet') {
          // Attack player when close (200 units), otherwise attack planet
          if (playerDistance < 200) {
            chosenTargetPosition = playerCurrentPosition;
          } else if (alternateTarget) {
            // Circle around planet at attack distance, shooting at it
            if (!enemy.planetAttackAngle) enemy.planetAttackAngle = Math.random() * Math.PI * 2;
            enemy.planetAttackAngle += 0.008;
            chosenTargetPosition = new THREE.Vector3(
              enemy.planetTarget.x + Math.cos(enemy.planetAttackAngle) * enemy.attackDistance,
              enemy.planetTarget.y,
              enemy.planetTarget.z + Math.sin(enemy.planetAttackAngle) * enemy.attackDistance
            );
            // Shoot at planet periodically
            this.shootAtPlanet(enemy);
          } else {
            chosenTargetPosition = playerCurrentPosition;
          }
        } else if (enemy.behavior === 'arc') {
          // Attack player when close (200 units)
          if (playerDistance < 200) {
            chosenTargetPosition = playerCurrentPosition;
          } else {
            // Wide arcing flight pattern
            enemy.arcAngle += enemy.arcSpeed;
            chosenTargetPosition = new THREE.Vector3(
              enemy.arcCenter.x + Math.cos(enemy.arcAngle) * enemy.arcRadius,
              enemy.arcCenter.y + Math.sin(enemy.arcAngle * 0.3) * enemy.arcHeight,
              enemy.arcCenter.z + Math.sin(enemy.arcAngle) * enemy.arcRadius
            );
          }
        } else if (enemy.behavior === 'dive') {
          // Attack player when close (200 units)
          if (playerDistance < 200) {
            chosenTargetPosition = playerCurrentPosition;
          } else if (alternateTarget) {
            // Dive in and out from planet
            const currentDistance = enemy.position.distanceTo(enemy.diveCenter);
            if (enemy.divePhase === 'out' && currentDistance > enemy.maxDiveDistance) {
              enemy.divePhase = 'in';
            } else if (enemy.divePhase === 'in' && currentDistance < enemy.diveDistance) {
              enemy.divePhase = 'out';
            }

            // Set target based on dive phase
            const targetDistance = enemy.divePhase === 'out' ? enemy.maxDiveDistance : enemy.diveDistance;
            const direction = enemy.position.clone().sub(enemy.diveCenter).normalize();
            chosenTargetPosition = enemy.diveCenter.clone().add(direction.multiplyScalar(targetDistance));
          } else {
            chosenTargetPosition = playerCurrentPosition;
          }
        } else {
          // Chase behavior - original logic
          chosenTargetPosition =
            !alternateTarget || (playerDistance < inRangeDistance && planetDistance < maxPlanetDistance)
              ? playerCurrentPosition
              : alternateTarget;
        }

        const directionToTarget = new THREE.Vector3();
        directionToTarget
          .subVectors(chosenTargetPosition, enemy.position)
          .normalize();

        const targetQuaternion = new THREE.Quaternion();
        targetQuaternion.setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          directionToTarget
        );

        enemy.quaternion.slerp(targetQuaternion, phaseSpeed);
      }
    }

    animateForwardMovement(enemy) {
      if (enemy) {
        const baseSpeed = 0.8; // Increased from 0.5 for more challenging combat
        const speedMultiplier = enemy.speedMultiplier || 1.0;
        let speed = baseSpeed * speedMultiplier; // Apply individual speed variance
        let direction = new THREE.Vector3();
        enemy.getWorldDirection(direction); // Get the direction the ship is facing
        direction.multiplyScalar(speed);

        // PLANET COLLISION AVOIDANCE with orbital movement - NEVER fly through planet
        if (enemy.planetCenter && enemy.minSafeDistance) {
          const currentDistanceToPlanet = enemy.position.distanceTo(enemy.planetCenter);
          const planetRadius = enemy.planetRadius || 300; // Get actual planet radius

          // CRITICAL: If we're inside the planet sphere, push out immediately!
          if (currentDistanceToPlanet < planetRadius) {
            const awayFromPlanet = new THREE.Vector3()
              .subVectors(enemy.position, enemy.planetCenter)
              .normalize()
              .multiplyScalar(speed * 2); // Strong push away
            enemy.position.add(awayFromPlanet);
            console.warn(`🚨 Enemy penetrated planet! Pushing out. Distance: ${currentDistanceToPlanet.toFixed(0)}/${planetRadius}`);
            return;
          }

          // Check if movement would take us too close
          const newPosition = enemy.position.clone().add(direction);
          const distanceToPlanet = newPosition.distanceTo(enemy.planetCenter);

          // If too close to safe distance or planet surface, orbit around it
          if (distanceToPlanet < enemy.minSafeDistance || currentDistanceToPlanet < enemy.minSafeDistance) {
            // Calculate perpendicular direction for orbiting
            const toPlanet = new THREE.Vector3()
              .subVectors(enemy.planetCenter, enemy.position)
              .normalize();

            // Cross product with up vector to get tangent direction (orbit)
            const orbitDirection = new THREE.Vector3()
              .crossVectors(toPlanet, new THREE.Vector3(0, 1, 0))
              .normalize()
              .multiplyScalar(speed);

            // Push away from planet to maintain safe distance
            const awayFromPlanet = new THREE.Vector3()
              .subVectors(enemy.position, enemy.planetCenter)
              .normalize()
              .multiplyScalar(speed * 0.5); // Increased push force

            enemy.position.add(orbitDirection).add(awayFromPlanet);
            return;
          }
        }

        enemy.position.add(direction);
      }
    }

    // checkFiringPosition(enemy, playerCurrentPosition) {
    //   const currentTime = performance.now(); //laser cooldown

    //   const distanceThreshold = this.firingDistance; // Distance threshold for firing
    //   const angleThreshold = Math.PI / 6; // 5 degrees in radians
    //   const distanceToPlayer = enemy.position.distanceTo(playerCurrentPosition);

    //   if (distanceToPlayer < distanceThreshold) {
    //     const enemyDirection = new THREE.Vector3();
    //     enemy.getWorldDirection(enemyDirection); // Get the direction the enemy is facing

    //     const directionToPlayer = new THREE.Vector3();
    //     directionToPlayer
    //       .subVectors(playerCurrentPosition, enemy.position)
    //       .normalize(); // Calculate direction to the player

    //     const angleToPlayer = enemyDirection.angleTo(directionToPlayer); // Angle between enemy's direction and direction to player

    //     if (
    //       angleToPlayer < angleThreshold &&
    //       currentTime - enemy.lastShotTime > this.shootCooldown
    //     ) {
    //       this.fireLaser(enemy);
    //       enemy.lastShotTime = currentTime; // Update last shot time
    //     }
    //   }
    // }

    checkFiringPosition(enemy, playerCurrentPosition, alternateTarget = null, inRangeDistance = 200) {
      if (this.target) {
        alternateTarget = this.target;
      }

      const currentTime = performance.now(); // For laser cooldown

      const playerDistanceThreshold = 200; // Distance for shooting at player
      const planetDistanceThreshold = 800; // Much larger distance for shooting at planet (enemies orbit far away)
      const angleThreshold = Math.PI / 3; // Increased from PI/4 to PI/3 (60 degrees) for easier shooting

      // Get the current facing direction of the enemy
      const enemyDirection = new THREE.Vector3();
      enemy.getWorldDirection(enemyDirection);

      const distanceToPlayer = enemy.position.distanceTo(playerCurrentPosition);

      // PRIORITIZE PLANET ATTACK: Enemies ALWAYS attack planet if it exists (regardless of player distance)
      if (alternateTarget) {
        // Planet exists - attack it primarily
        const directionToTarget = new THREE.Vector3();
        directionToTarget
          .subVectors(alternateTarget, enemy.position)
          .normalize();

        const distanceToTarget = enemy.position.distanceTo(alternateTarget);
        const angleToTarget = enemyDirection.angleTo(directionToTarget);

        // Shoot at planet if within range and facing it (ALWAYS prioritize planet over player)
        if (
          distanceToTarget < planetDistanceThreshold &&
          angleToTarget < angleThreshold &&
          currentTime - enemy.lastShotTime > this.shootCooldown
        ) {
          this.fireLaser(enemy, true); // Pass true to indicate planet damage
          enemy.lastShotTime = currentTime;
          return; // Planet attack takes absolute priority - don't check player
        }
      }

      // ONLY shoot at player if NO planet exists (player is only fallback target)
      if (!alternateTarget) {
        const directionToPlayer = new THREE.Vector3();
        directionToPlayer
          .subVectors(playerCurrentPosition, enemy.position)
          .normalize();

        const angleToPlayer = enemyDirection.angleTo(directionToPlayer);

        if (
          distanceToPlayer < playerDistanceThreshold &&
          angleToPlayer < angleThreshold &&
          currentTime - enemy.lastShotTime > this.shootCooldown
        ) {
          this.fireLaser(enemy);
          enemy.lastShotTime = currentTime;
        }
      }
    }

    shootAtPlanet(enemy) {
      const currentTime = performance.now();
      const planetShootCooldown = 500; // Reduced from 1500 to 500 for much more aggressive planet attacks

      if (currentTime - (enemy.lastPlanetShotTime || 0) > planetShootCooldown) {
        // Check if facing roughly toward planet
        const enemyDirection = new THREE.Vector3();
        enemy.getWorldDirection(enemyDirection);

        const directionToPlanet = new THREE.Vector3();
        directionToPlanet
          .subVectors(enemy.planetTarget, enemy.position)
          .normalize();

        const angleToPlanet = enemyDirection.angleTo(directionToPlanet);

        // Shoot if roughly facing planet (within 45 degrees)
        if (angleToPlanet < Math.PI / 4) {
          this.fireLaser(enemy, true); // Pass true to indicate planet damage
          enemy.lastPlanetShotTime = currentTime;
        }
      }
    }

    fireLaser(enemy, targetingPlanet = false) {
      const direction = new THREE.Vector3();
      enemy.getWorldDirection(direction);

      // Validate direction vector - if zero length, skip firing
      const dirLength = direction.length();
      if (dirLength < 0.001 || !isFinite(dirLength)) {
        console.warn("[ENEMY] Invalid laser direction, skipping fire");
        return;
      }

      // Use lower-poly geometry for laser projectiles
      const laserBeam = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 8), // Reduced from 20x20
        new THREE.MeshStandardMaterial({
          emissive: 0xff0000,
          emissiveIntensity: 18,
          color: 0xff0000,
        })
      );

      laserBeam.position.copy(enemy.position);
      laserBeam.lookAt(laserBeam.position.clone().add(direction));
      this.scene.add(laserBeam);

      // Clone direction before modifying to create velocity (prevents shared reference bug)
      const velocity = direction.clone().normalize().multiplyScalar(20);
      const spawnTime = performance.now(); // Track creation time
      this.activeLasers.push({ laserBeam, velocity, direction: direction.clone(), targetingPlanet, spawnTime });

      if (this.lightSound) {
        this.lightSound.currentTime = 0;
        this.lightSound.volume = 0.15;
        this.lightSound.play();
      }
    }

    updateLasers(playerCurrentPosition) {
      const currentTime = performance.now();
      const maxLaserLifetime = 5000; // 5 seconds max lifetime

      // Iterate backwards to safely remove items during iteration
      for (let i = this.activeLasers.length - 1; i >= 0; i--) {
        const laserData = this.activeLasers[i];
        const { laserBeam, velocity, spawnTime } = laserData;

        laserBeam.position.add(velocity);

        const distanceToPlayer = laserBeam.position.distanceTo(playerCurrentPosition);
        const age = currentTime - (spawnTime || 0);

        // Remove lasers that are too far OR too old
        if (distanceToPlayer > 400 || age > maxLaserLifetime) {
          this.scene.remove(laserBeam);
          // Dispose geometry and material to free memory
          if (laserBeam.geometry) laserBeam.geometry.dispose();
          if (laserBeam.material) laserBeam.material.dispose();
          this.activeLasers.splice(i, 1);
        }
      }
    }
  }
  return {
    EnemyLoader: EnemyLoader,
  };
})();
