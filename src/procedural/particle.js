import * as THREE from "three";

export class Particle {
  constructor(scene, position) {
    this.scene = scene;
    this.particle = this.createParticle(position);
    this.animateParticle();
  }

  createParticle(position) {
    const particleGeometry = new THREE.SphereGeometry(0.03, 6, 6);

    const particleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x00aaff,
      emissive: 0x00aaff,
      emissiveIntensity: 3,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.2,
    });

    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    particle.position.copy(position);
    this.scene.add(particle);
    return particle;
  }

  animateParticle() {
    const animationSpeed = 0.0006;
    const initialPosition = this.particle.position.clone();
    this.particle.userData.animationOffset = Math.random() * Math.PI * 2;

    this.particle.onBeforeRender = () => {
      const time =
        performance.now() * animationSpeed +
        this.particle.userData.animationOffset;
      this.particle.position.x = initialPosition.x + Math.sin(time) * 1;
      this.particle.position.y = initialPosition.y + Math.sin(time * 2) * 0.5;
      this.particle.position.z = initialPosition.z + Math.sin(time * 3) * 1;
    };

    this.animateFlicker(this.particle.material);
  }

  animateFlicker(material) {
    const animationSpeed = 0.002;
    let time = 0;

    function animate() {
      time += animationSpeed;

      if (material.emissive) {
        material.emissive.setScalar(Math.abs(Math.sin(time)));
      }

      requestAnimationFrame(animate);
    }
    animate();
  }
}
