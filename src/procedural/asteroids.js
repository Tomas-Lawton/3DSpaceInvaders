import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export const asteroids = (() => {
  class AsteroidLoader {
    constructor(scene, paths) {
      this.scene = scene;
      this.paths = paths;
      this.loader = new GLTFLoader();
      this.loadedModels = [];
      this.asteroidSystem = [];
      this.asteroidFrameCounter = 0; // For throttling animations
    }

    async initialiseSystem(systems) {
      try {
        // Load Asteroid Models
        const modelPromises = this.paths.map(async (path) => {
          const gltf = await this.loader.setPath(path).loadAsync("scene.gltf");
          const model = gltf.scene.clone(); 
          model.traverse((node) => {
            if (node.isMesh) {
              node.material.side = THREE.DoubleSide;
            }
          });
          return model; 
        });
        this.loadedModels = await Promise.all(modelPromises);

        // Now load the systems
        for (let i = 0; i < systems; i++) {
          const group = await this.loadAsteroids(); 
          this.asteroidSystem.push(group); 
        }
      } catch (error) {
        console.error("Error loading models:", error);
      }
    }

    async loadAsteroids() {
      try {
        let asteroidGroup = new THREE.Group();

        // Ensure asteroid field spawns at least 300 units away from player (0,0,0)
        let x, y, z;
        do {
          x = (Math.random() - 0.5) * 5000;
          y = (Math.random() - 0.5) * 2000; // Reduced y-axis range for better discoverability
          z = (Math.random() - 0.5) * 5000;
        } while (Math.sqrt(x*x + y*y + z*z) < 300);

        asteroidGroup.position.set(x, y, z);
        this.scene.add(asteroidGroup);
        // Reduced to fewer asteroids for better gameplay
        const numberOfAsteroids = Math.floor(Math.random() * 15) + 10; // 10-25 asteroids per system
        let entropyCoefficient = (Math.random() - 0.5);
    
        // Choose a formation type: 'circle', 'spiral', 'cluster'
        const formationType = [
          'circle', 
          'spiral', 
          'cluster'
        ][Math.floor(Math.random() * 3)];
    
        for (let i = 0; i < numberOfAsteroids; i++) {
            let selectedModel = Math.floor(Math.random() * this.loadedModels.length);
            const asteroidClone = this.loadedModels[selectedModel].clone();
    
            let x, y, z;
            if (formationType === 'circle') {
                const angle = (i / numberOfAsteroids) * Math.PI * 2; // Full circle
                const radius = 100; // Fixed radius for clarity
                x = Math.cos(angle) * radius * entropyCoefficient;
                y = Math.sin(angle) * radius * entropyCoefficient;
                z = (Math.random() - 0.5) * 20 * entropyCoefficient; // Slight height variation
            } else if (formationType === 'spiral') {
              const angleIncrement = Math.PI / 12; // Angle increment for more spacing
              const angle = angleIncrement * i; // Incremental angle for each asteroid
              const radius = 16 * i; // Gradually increasing radius with a larger growth factor
      
              x = Math.cos(angle) * radius * entropyCoefficient; // Position based on angle and radius
              y = Math.sin(angle) * radius * entropyCoefficient; // Position based on angle and radius
              z = (Math.random() - 0.5) * 20 * entropyCoefficient; 
            } else { // 'cluster'
                const clusterSize = 15; // Size of the cluster
                x = (Math.random() - 0.5) * clusterSize * entropyCoefficient;
                y = (Math.random() - 0.5) * clusterSize * entropyCoefficient;
                z = (Math.random() - 0.5) * clusterSize * entropyCoefficient;
            }
    
            asteroidClone.position.set(x, y, z);
    
            asteroidClone.rotation.set(
                Math.random() * Math.PI * 3,
                Math.random() * Math.PI * 3,
                Math.random() * Math.PI * 3
            );
    
            asteroidClone.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.03,
                (Math.random() - 0.5) * 0.03,
                (Math.random() - 0.5) * 0.03
            );
    
            asteroidClone.type = selectedModel;
            asteroidClone.health = 100;
            asteroidClone.maxHealth = 100; // Store max health for health bar calculation
            asteroidClone.healthBar = null;
            const scale = Math.random() * 4 + 1; // Scale factor between 1 and 5
            asteroidClone.scale.set(scale, scale, scale);
            asteroidClone.frustumCulled = true; // Enable frustum culling for performance
            asteroidGroup.add(asteroidClone);
        }


        // let asteroidGroup = new THREE.Group();
        // asteroidGroup.position.set(
        //   (Math.random() - 0.5) * 1000, 
        //   (Math.random() - 0.5) * 1000,
        //   (Math.random() - 0.5) * 1000
        //   );
        // this.scene.add(asteroidGroup);
        // const numberOfAsteroids = Math.floor(Math.random() * 90);
        // let entropyCoefficient = (Math.random() -.5) * 3;


        // for (let i = 0; i < numberOfAsteroids; i++) {
        //   let selectedModel = Math.floor(Math.random() * this.loadedModels.length)
        //   const asteroidClone = this.loadedModels[selectedModel].clone(); // weighted selection
    
        //   asteroidClone.position.set(
        //     (Math.random() - 0.5) * 50 * entropyCoefficient,
        //     (Math.random() - 0.5) * 50 * entropyCoefficient,
        //     (Math.random() - 0.5) * 50 * entropyCoefficient
        //  );

        //   asteroidClone.rotation.set(
        //     Math.random() * Math.PI  * entropyCoefficient,
        //     Math.random() * Math.PI  * entropyCoefficient,
        //     Math.random() * Math.PI  * entropyCoefficient
        //   );
    
        //   asteroidClone.velocity = new THREE.Vector3(
        //     (Math.random() - 0.5) * 0.05  * entropyCoefficient,
        //     (Math.random() - 0.5) * 0.05  * entropyCoefficient,
        //     (Math.random() - 0.5) * 0.05  * entropyCoefficient
        //   );
    
        //   asteroidClone.type = selectedModel
        //   asteroidClone.health = 100; // Set health
        //   asteroidClone.healthBar = null
        //   const scale = Math.random() * 4 + 1; // Scale factor between 1 and 5
        //   asteroidClone.scale.set(scale, scale, scale); 
        //   asteroidGroup.add(asteroidClone); 
        // }


        // LIGHT THE GROUP - reduced intensity for better performance
        const pointLight = new THREE.PointLight(0xCC5500, 200, 200);
        pointLight.position.set(0, 0, 0);
        asteroidGroup.add(pointLight);

        return asteroidGroup;
      } catch (error) {
        console.error("Error loading asteroids:", error);
      }
    }

    // destroyAsteroid(asteroid) {
    //   this.asteroidGroup.remove(asteroid); // Remove from the group
    //   console.log('Asteroid destroyed:', asteroid);
    // }

    animateAsteroids(playerCurrentPosition, reposition) {
      this.asteroidFrameCounter++;

      // Only animate asteroids every 2 frames for better performance
      const shouldAnimate = this.asteroidFrameCounter % 2 === 0;

      if (this.asteroidSystem) {
        this.asteroidSystem.forEach(system => {

          //animate individual asteroid (throttled)
          if (shouldAnimate) {
            system.children.forEach((asteroid) => {
              if (asteroid instanceof THREE.Light) {
                return
              }
              asteroid.position.add(asteroid.velocity);
            });
          }

          // check group distance - increased threshold to reduce frequent respawning
          const distance = playerCurrentPosition.distanceTo(system.position);
          if (distance > 6000) {
            reposition(system.position, playerCurrentPosition);
          }
        })
      }

    }
  }

  return {
    AsteroidLoader: AsteroidLoader,
  };
})();
