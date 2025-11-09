import * as THREE from "three";

export const stars = (() => {
  class StarLoader {
    constructor(scene) {
      this.scene = scene;
      this.stars = [];
    }

    // Initialize stars (1-3 stars)
    async initialiseStars(count) {
      for (let i = 0; i < count; i++) {
        const star = this.createStar();
        this.scene.add(star);
        this.stars.push(star);
      }
    }

    createStar(playerPosition = null) {
      const starGroup = new THREE.Group();

      const colors = [
        0x4285816, // color 1
        0x4285816, // color 2
        0x2838071, // color 3
        0x5393519, // color 4
        0x1664338, // color 5
        0x4939547, // color 6
        0x7563035, // color 7
        0x5518369, // color 8
        0x7561737  // color 9 (classic sun)
      ];

      // Randomly select one color from the array
      const col = colors[Math.floor(Math.random() * colors.length)];
      const sphereRadius = 13;
      const sphereSegments = 32;

      const transparentMaterial = new THREE.MeshStandardMaterial({
        color: col,
        metalness: 0.8,
        emissive: col,
        emissiveIntensity: 50,
        roughness: 0.5,
        opacity: 0.5,
        transparent: true,
        side: THREE.BackSide,
      });

      const sphereGeometry = new THREE.SphereGeometry(
        sphereRadius,
        sphereSegments,
        sphereSegments
      );
      const sphereMesh = new THREE.Mesh(sphereGeometry, transparentMaterial);
      sphereMesh.rotation.x = -Math.PI / 2;
      starGroup.add(sphereMesh);

      // Add glow rings around the star
      const glowGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
      const glowMaterial = new THREE.MeshStandardMaterial({
        emissive: col,
        emissiveIntensity: 50,
        color: col,
      });

      const generateRingPoints = (radius, pointCount) => {
        for (let i = 0; i < pointCount; i++) {
          const angle = (Math.PI * 2 * i) / pointCount;
          const x = radius * Math.cos(angle);
          const y = radius * Math.sin(angle);
          const glowPoint = new THREE.Mesh(glowGeometry, glowMaterial);
          glowPoint.position.set(x, 0, y);
          starGroup.add(glowPoint);
        }
      };

      let numRings = 6;
      let r = 10;
      for (let i = 0; i < numRings; i++) {
        generateRingPoints(i * r, i * 30, i);
      }

      // Position the star
      if (playerPosition) {
        // Spawn away from player
        const angle1 = Math.random() * Math.PI * 2;
        const angle2 = Math.acos(2 * Math.random() - 1);
        const direction = new THREE.Vector3(
          Math.sin(angle2) * Math.cos(angle1),
          Math.sin(angle2) * Math.sin(angle1),
          Math.cos(angle2)
        );

        const spawnDistance = 2000 + Math.random() * 1000;
        starGroup.position.set(
          playerPosition.x + direction.x * spawnDistance,
          playerPosition.y + direction.y * spawnDistance * 0.2,
          playerPosition.z + direction.z * spawnDistance
        );
      } else {
        // Initial spawn
        starGroup.position.set(
          (Math.random() - 0.5) * 2000,
          (Math.random() - 0.5) * 200,
          (Math.random() - 0.5) * 2000
        );

        // Ensure minimum distance from origin
        const distance = starGroup.position.length();
        if (distance < 2000) {
          const factor = 2000 / distance;
          starGroup.position.multiplyScalar(factor);
        }
      }

      // Store healing radius
      starGroup.healingRadius = 150; // Heal when within 150 units

      return starGroup;
    }

    animateStars(playerCurrentPosition, repositionObj, playerShip) {
      if (!this.stars || this.stars.length === 0) return;

      this.stars.forEach((star, index) => {
        // Rotate the star slowly
        star.rotation.y += 0.001;

        // Check if player is near star for healing
        if (playerShip && star.position) {
          const distanceToStar = playerCurrentPosition.distanceTo(star.position);

          // Heal player when near star
          if (distanceToStar < star.healingRadius) {
            const healAmount = 0.5; // Heal 0.5 HP per frame (about 30 HP per second at 60fps)
            playerShip.healShip(healAmount);
          }

          // Respawn star if too far away (8000 units)
          if (distanceToStar > 8000) {
            this.scene.remove(star);
            const newStar = this.createStar(playerCurrentPosition);
            this.scene.add(newStar);
            this.stars[index] = newStar;
          }
        }
      });
    }
  }

  return {
    StarLoader: StarLoader,
  };
})();
