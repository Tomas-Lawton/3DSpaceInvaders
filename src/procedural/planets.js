import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { getRandomDeepColor } from "../utils/utils.js";
import { updateCloestPlanet } from "../components/dom.js";
import { enemy } from "../components/enemy.js";

export const planets = (() => {
  class PlanetLoader {
    constructor(scene) {
      this.scene = scene;
      this.planets = [];
      this.planetLoader = new GLTFLoader();
      this.path = "public/planet/";
      this.defaultHealth = 1000;
      this.enemiesSpawned = false; // redundant can use loader only
      this.enemyLoader = null;
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
      planetGroup.planetSize = scale * -1;

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



    animatePlanets(playerCurrentPosition, reposition) {
      if (this.enemyLoader) {
        this.enemyLoader.animateEnemies(playerCurrentPosition);
      }

      if (this.planets) {
        let clostestPlanet = null;
        let closestDistance = null

        this.planets.forEach((planet) => {
          planet.children[0].rotation.y += 0.0001;

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
          updateCloestPlanet(clostestPlanet.position)

          if (playerDistance > 6000) {
            reposition(planet.position, playerCurrentPosition);
          }

          if (playerDistance < 500) { //  closer than 1000: spawn enemy group
            if (!this.enemiesSpawned) { 
                this.enemiesSpawned = true;
                const enemyCount = 5
                const enemyLoader = new enemy.EnemyLoader(this.scene);
                enemyLoader.initaliseEnemies(enemyCount, planet.position);
                this.enemyLoader = enemyLoader;

                console.log("DOGFIGHT")
            }
          }
          if (playerDistance <= planet.planetSize) {
            alert("IMPACT");
            // only damage the user and set a timeout
          }
        });
      }
    }
  }

  return {
    PlanetLoader: PlanetLoader,
  };
})();
