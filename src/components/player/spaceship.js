import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { third_person_camera } from "../../scene/camera.js";
import { mapValue } from "../../utils/utils.js"; // Assuming you have a utility function for mapping values
import { progressContainer, progressText } from "../dom.js";
import { PHYSICS_CONSTANTS } from "../../utils/constants.js";
import { incrementOre } from "../dom.js";
import {
  modelPaths,
  normalizeModelSize,
  normalizeModelPosition,
} from "../../hud/hud.js";

export const spaceship = (() => {
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

      // this.velocityRectangle = new THREE.Mesh(
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

      this.lightSound = new Audio("public/audio/pew.mp3");
      this.boomSound = new Audio("public/audio/boom.mp3");
      this.softBoom = new Audio("public/audio/soft_boom.mp3");
      this.alarmSound = new Audio("public/audio/alarm.mp3");
      this.deadSound = new Audio("public/audio/cool1.mp3");

      this.forwardVelocity = 0;
      this.upwardVelocity = 0;

      this.activeLasers = [];

      this.setHealth(health, true);
      this.damageAmount = 26;

      let selectShip = document.getElementById("select-ship");
      selectShip.addEventListener("click", () => {
        const updatedShipId =
          parseInt(selectShip.dataset.shipId.replace("ship-", ""), 10) - 1;
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

    // normalizeModelPosition(model) {
    //   const box = new THREE.Box3().setFromObject(model); // Compute bounding box
    //   const center = new THREE.Vector3();
    //   box.getCenter(center); // Get the center of the bounding box

    //   // Adjust the model's position so its center aligns with the origin
    //   model.position.sub(center);

    //   // Optionally, align the model's bottom to the ground
    //   const size = new THREE.Vector3();
    //   box.getSize(size);
    //   model.position.y -= size.y / 2;
    // }

    setSpaceshipModel(shipId) {
      console.log("Loading Spaceship: ", shipId);
      if (!modelPaths[shipId]) return;

      const selectedModel = modelPaths[shipId];
      console.log(selectedModel);

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

      this.loader.setPath(selectedModel.path).load(
        "scene.gltf",
        (gltf) => {
          this.mesh = new THREE.Group();
          const tempObjectGroup = new THREE.Group();
          const loadedModel = gltf.scene;

          loadedModel.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          loadedModel.rotation.set(
            selectedModel.rotation.x,
            selectedModel.rotation.y - Math.PI / 2,
            selectedModel.rotation.z
          );

          // Normalize model if needed
          if (!selectedModel.isNormalized) {
            // normalizeModelSize(loadedModel, 55);
            normalizeModelPosition(loadedModel);
            selectedModel.isNormalized = true;
          }

          tempObjectGroup.add(loadedModel);

          const ambientLight = new THREE.PointLight(0x660099, 1, 50);
          ambientLight.position.set(0, 5, 0);
          tempObjectGroup.add(ambientLight);

          const spotLight = new THREE.SpotLight(
            0xff6600,
            3,
            5,
            Math.PI * 1.1,
            0.2
          );
          spotLight.position.copy(tempObjectGroup.position);
          tempObjectGroup.add(spotLight);
          // tempObjectGroup.add(this.velocityRectangle);

          this.mesh.add(tempObjectGroup);
          this.mesh.rotation.y = Math.PI;

          this.scene.add(this.mesh);

          this.thirdPersonCamera = new third_person_camera.ThirdPersonCamera({
            camera: this.camera,
            target: this.mesh,
          });

          this.updateSpaceshipPosition();

          // Hide loading screen
          progressContainer.style.display = "none";
        },
        (xhr) => {
          let progressAmount = (xhr.loaded / xhr.total) * 100;
          progressText.innerHTML = `LOADING ${progressAmount.toFixed(2)}/100`;
        },
        (error) => console.error("Error loading model:", error)
      );
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
      const direction = new THREE.Vector3();
      this.mesh.children[0].getWorldDirection(direction);
      const laserPosition = this.mesh.position.clone();
      const laserBeam = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 16, 16),
        new THREE.MeshStandardMaterial({
          emissive: 0xc87dff,
          emissiveIntensity: 3,
          color: 0x9400ff,
        })
      );

      laserBeam.position.copy(laserPosition);
      laserBeam.lookAt(laserPosition.add(direction));
      this.scene.add(laserBeam);

      const velocity = direction.normalize().multiplyScalar(30);
      if (this.lightSound) {
        this.lightSound.currentTime = 0;
        this.lightSound.volume = 0.25;
        this.lightSound.play();
      }

      this.activeLasers.push({ laserBeam, velocity, direction });
    }

    // updateVelocityRectangle(currentVelocity, maxVelocity) {
    //   const rectangleLength = mapValue(currentVelocity, 0, maxVelocity, 0, -80);
    //   this.velocityRectangle.geometry.dispose(); // Dispose of the old geometry
    //   this.velocityRectangle.geometry = new THREE.BoxGeometry(
    //     3,
    //     3,
    //     rectangleLength
    //   ); // Adjust width and height as needed
    //   this.velocityRectangle.position.z = rectangleLength / 2 - 60;
    //   this.velocityRectangle.position.y = 10
    // }

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
        this.activeLasers.forEach((beam, index) => {
          const { laserBeam, velocity } = beam;
          laserBeam.position.add(velocity.clone().multiplyScalar(0.2));

          // first check distance
          if (laserBeam.position.distanceTo(this.mesh.position) > 250) {
            this.scene.remove(laserBeam);
            this.activeLasers.splice(index, 1);
            return;
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

                    this.showHealthBar(asteroid);

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
          // console.log(enemyLoader);
          if (enemyLoader && enemyLoader.enemies) {
            enemyLoader.enemies.forEach((enemy) => {
              if (this.checkCollision(laserBeam, enemy)) {
                console.log("hit");
                this.scene.remove(laserBeam);
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
                  this.removeHealthBar(enemy);
                  enemy.parent.remove(enemy);
                  this.playSound();
                }
                return;
              }
            });
          }
        });
      }
    }
    showHealthBar(meshObj) {
      if (!meshObj.healthBar) {
        const healthBar = document.createElement("div");
        healthBar.className = "health-bar";
        healthBar.style.position = "absolute";
        healthBar.style.height = "5px";
        healthBar.style.width = "100px";
        document.body.appendChild(healthBar);

        meshObj.healthBar = { element: healthBar };

        // Start an interval to update the health bar position
        meshObj.healthBar.interval = setInterval(() => {
          this.updateHealthBarPosition(meshObj);
        }, 50); // Update every 100 milliseconds
      }

      const healthPercentage = meshObj.health / 100;
      meshObj.healthBar.element.style.width = `${healthPercentage * 100}px`;
      meshObj.healthBar.element.style.backgroundColor = `rgb(${
        255 * (1 - healthPercentage)
      }, ${255 * healthPercentage}, 0)`;
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

      if (this.lastCollisionCheck === undefined) {
        this.lastCollisionCheck = currentTimestamp;
      }

      if (currentTimestamp - this.lastCollisionCheck < 1000) {
        return;
      }
      if (asteroidLoader) {
        if (asteroidLoader.asteroidSystem) {
          for (const system of asteroidLoader.asteroidSystem) {
            system.children.forEach((asteroid) => {
              if (asteroid instanceof THREE.Light) {
                return;
              }
              if (this.checkCollision(this.mesh, asteroid)) {
                this.userHit(40);
                this.lastCollisionCheck = currentTimestamp;
                return;
              }
            });
          }
        }
      }
    }

    userHit(damage) {
      console.log("HIT USER");
      this.damageShip(damage);
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
    }

    checkEnemyLaserCollisions(enemyLoader) {
      const currentTimestamp = performance.now();

      if (this.lastCollisionCheck === undefined) {
        this.lastCollisionCheck = currentTimestamp;
      }

      if (currentTimestamp - this.lastCollisionCheck < 300) {
        return;
      }

      if (enemyLoader && enemyLoader.activeLasers) {
        enemyLoader.activeLasers.forEach((laserData) => {
          const { laserBeam, _ } = laserData;
          if (this.checkCollision(this.mesh, laserBeam)) {
            this.userHit(23);
            this.lastCollisionCheck = currentTimestamp;
            return;
          }
        });
      }
    }

    Update(
      forwardAcceleration,
      upwardAcceleration,
      timeElapsed,
      audioManager,
      asteroidLoader,
      enemyLoader
    ) {
      this.calculateRotation();
      this.calculateVelocity(
        forwardAcceleration,
        upwardAcceleration,
        timeElapsed
      );
      this.moveSpaceship();
      this.handleLaserMovement(asteroidLoader, enemyLoader);
      // this.updateVelocityRectangle(
      //   this.forwardVelocity,
      //   PHYSICS_CONSTANTS.maxVelocity
      // );
      this.checkAsteroidCollisions(asteroidLoader);
      this.checkEnemyLaserCollisions(enemyLoader);

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
