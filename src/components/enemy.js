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
      this.shootCooldown = 200;
      this.lightSound = new Audio("public/audio/enemy_pew.mp3");
      this.firingDistance = 100;
      this.updateCounter = 0; // For LOD optimization
    }

    // Initialise enemies without promises, using callback in the loader
    initaliseEnemies(numEnemies, aroundPoint) {
      this.target = aroundPoint;
      for (let i = 0; i < numEnemies; i++) {
        this.createEnemy(aroundPoint, (enemyObject) => {
          enemyObject.lastShotTime = 0;
          this.scene.add(enemyObject);
          this.enemies.push(enemyObject);
        });
      }
    }

    createEnemy(aroundPoint, callback) {
      // Function to create enemy from cached or newly loaded model
      const createEnemyFromModel = (gltf) => {
        const enemyObject = new THREE.Group();

        const angle = Math.random() * Math.PI * 2;
        const distance = 200;
        const x = aroundPoint.x + Math.cos(angle) * distance;
        const z = aroundPoint.z + Math.sin(angle) * distance;
        const y = aroundPoint.y;
        enemyObject.position.set(x, y, z);

        // Add position variation within the group itself for smaller offsets
        enemyObject.position.add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 50,
            (Math.random() - 0.5) * 50,
            (Math.random() - 0.5) * 50
          )
        );

        const loadedModel = gltf.scene.clone(); // Clone the cached model
        loadedModel.traverse(
          (child) =>
            child.isMesh && (child.castShadow = child.receiveShadow = true)
        );
        loadedModel.rotation.y = 2 * (Math.PI / 2) + Math.PI;
        loadedModel.scale.set(0.5, 0.5, 0.5);
        enemyObject.add(loadedModel);

        // Use lower-poly geometry for glow effect
        const glowGeometry = new THREE.SphereGeometry(0.3, 6, 6); // Reduced from 8x8
        const glowMaterial = new THREE.MeshStandardMaterial({
          emissive: 0xff4500,
          emissiveIntensity: 10,
          color: 0xff4500,
        });

        const glowPoint = new THREE.Mesh(glowGeometry, glowMaterial);
        glowPoint.position.set(0, 0, -5);
        enemyObject.add(glowPoint);

        // Reduce light intensity and distance for better performance
        const redLight = new THREE.PointLight(0xff0000, 15, 50); // Further reduced for performance
        redLight.position.set(0, 1, 0);
        enemyObject.add(redLight);

        enemyObject.rotation.y = Math.PI;
        enemyObject.health = this.health;

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
      const LOD_UPDATE_INTERVAL = 3; // Update distant enemies every 3 frames

      this.enemies.forEach((enemy, index) => {
        const distanceToPlayer = enemy.position.distanceTo(playerCurrentPosition);

        // Always move enemies
        this.animateForwardMovement(enemy);

        // LOD: Only update distant enemy AI every few frames
        const isDistant = distanceToPlayer > 300;
        const shouldUpdate = !isDistant || (this.updateCounter % LOD_UPDATE_INTERVAL === index % LOD_UPDATE_INTERVAL);

        if (shouldUpdate) {
          this.phaseTowardsTarget(enemy, playerCurrentPosition);
          this.checkFiringPosition(enemy, playerCurrentPosition);
        }
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
      inRangeDistance = 300, // Reduced from 800 to 300 - enemies only engage when player is close
      maxPlanetDistance = 1500
    ) {
      if (enemy) {
        if (this.target) {
          alternateTarget = this.target;
        }
        const phaseSpeed = 0.025; // Increased from 0.014 for more responsive turning
        const playerDistance = enemy.position.distanceTo(playerCurrentPosition);
        const planetDistance = alternateTarget
          ? enemy.position.distanceTo(alternateTarget)
          : Infinity;

        // PRIORITIZE PLANET: Only engage player if very close AND planet still exists
        // If no planet (alternateTarget is null), always chase player
        const chosenTargetPosition =
          !alternateTarget || (playerDistance < inRangeDistance && planetDistance < maxPlanetDistance)
            ? playerCurrentPosition
            : alternateTarget;

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
        let speed = 0.6; // Increased from 0.4 for more aggressive pursuit
        let direction = new THREE.Vector3();
        enemy.getWorldDirection(direction); // Get the direction the ship is facing
        direction.multiplyScalar(speed);
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

    checkFiringPosition(enemy, playerCurrentPosition, alternateTarget = null, inRangeDistance = 300) {
      if (this.target) {
        alternateTarget = this.target;
      }

      const currentTime = performance.now(); // For laser cooldown

      const distanceThreshold = 200; // Increased firing range from 100 to 200
      const angleThreshold = Math.PI / 4; // Widened from PI/6 to PI/4 for easier shooting

      // Get the current facing direction of the enemy
      const enemyDirection = new THREE.Vector3();
      enemy.getWorldDirection(enemyDirection);

      const distanceToPlayer = enemy.position.distanceTo(playerCurrentPosition);

      // PRIORITIZE PLANET ATTACK: Only shoot player if very close AND planet exists
      if (alternateTarget) {
        // Planet exists - attack it primarily
        const directionToTarget = new THREE.Vector3();
        directionToTarget
          .subVectors(alternateTarget, enemy.position)
          .normalize();

        const distanceToTarget = enemy.position.distanceTo(alternateTarget);
        const angleToTarget = enemyDirection.angleTo(directionToTarget);

        if (
          distanceToTarget < distanceThreshold &&
          angleToTarget < angleThreshold &&
          currentTime - enemy.lastShotTime > this.shootCooldown
        ) {
          this.fireLaser(enemy, true); // Pass true to indicate planet damage
          enemy.lastShotTime = currentTime;
          return; // Planet attack takes priority
        }
      }

      // Only shoot at player if planet doesn't exist OR player is very close
      if (!alternateTarget || distanceToPlayer < inRangeDistance) {
        const directionToPlayer = new THREE.Vector3();
        directionToPlayer
          .subVectors(playerCurrentPosition, enemy.position)
          .normalize();

        const angleToPlayer = enemyDirection.angleTo(directionToPlayer);

        if (
          distanceToPlayer < distanceThreshold &&
          angleToPlayer < angleThreshold &&
          currentTime - enemy.lastShotTime > this.shootCooldown
        ) {
          this.fireLaser(enemy);
          enemy.lastShotTime = currentTime;
        }
      }
    }

    fireLaser(enemy, targetingPlanet = false) {
      const direction = new THREE.Vector3();
      enemy.getWorldDirection(direction);

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

      const velocity = direction.multiplyScalar(1); // higher is slower
      this.activeLasers.push({ laserBeam, velocity, direction, targetingPlanet });

      if (this.lightSound) {
        this.lightSound.currentTime = 0;
        this.lightSound.volume = 0.15;
        this.lightSound.play();
      }
    }

    updateLasers(playerCurrentPosition) {
      // Iterate backwards to safely remove items during iteration
      for (let i = this.activeLasers.length - 1; i >= 0; i--) {
        const laserData = this.activeLasers[i];
        const { laserBeam, velocity } = laserData;

        laserBeam.position.add(velocity);

        const distanceToPlayer = laserBeam.position.distanceTo(playerCurrentPosition);

        // Increased distance threshold for better cleanup
        if (distanceToPlayer > 500) {
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
