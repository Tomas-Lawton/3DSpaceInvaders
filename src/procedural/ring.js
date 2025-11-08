import * as THREE from "three";

export class Ring {
  constructor(scene) {
    this.scene = scene;
    this.radius = Math.random() * 50 + 10;
    this.ring = this.createRing();
    this.speed = {};
    this.speed = this.generateRandomSpeed();
    this.isColliding = false;

    this.invisibleMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.1, side: THREE.DoubleSide });
    this.invisibleCircle = this.createInvisibleCircle();

    this.clock = new THREE.Clock();
    this.elapsedTime = 0;
    this.transitionDuration = 1;

    // Bind methods to the instance
    this.animate = this.animate.bind(this);
    this.update = this.update.bind(this);
  }

  createRing() {
    const tubeRadius = 0.1;
    const radialSegments = 32;
    const tubularSegments = 32;
    const materialColor = Math.random() * 0xffffff;

    const glowMaterial = new THREE.MeshStandardMaterial({
      emissive: materialColor,
      emissiveIntensity: 60,
      color: materialColor,
      roughness: 0.5,
      metalness: 0.5,
    });

    const ringGeometry = new THREE.TorusGeometry(this.radius, tubeRadius, radialSegments, tubularSegments);
    const ring = new THREE.Mesh(ringGeometry, glowMaterial);

    ring.position.set(0, Math.random() * 100, Math.random() * -2000 -100);

    this.scene.add(ring);
    return ring;
  }

  createInvisibleCircle() {
    const invisibleCircleGeometry = new THREE.CircleGeometry(this.radius, 32);
    const invisibleCircle = new THREE.Mesh(invisibleCircleGeometry, this.invisibleMaterial);
    invisibleCircle.position.copy(this.ring.position);
    this.scene.add(invisibleCircle);
    return invisibleCircle;
  }

  generateRandomSpeed() {
    return {
      x: Math.random() * 0.005,
      y: Math.random() * 0.005,
      z: Math.random() * 0.005,
    };
  }

  animate() {
    this.ring.rotation.z += this.speed.z;
    this.ring.rotation.y += this.speed.y;
    // this.ring.rotation.x += this.speed.x;
    this.invisibleCircle.rotation.copy(this.ring.rotation);
  }

  setRingColor() {
    const targetColor = this.isColliding ? new THREE.Color(0x00ff00) : new THREE.Color(Math.random() * 0xffffff);
    
    // Calculate a smooth transition using the elapsedTime
    const smoothProgress = Math.min(this.elapsedTime / this.transitionDuration, 1);
    const smoothStep = smoothProgress * smoothProgress * (3 - 2 * smoothProgress);
    const currentColor = new THREE.Color().lerpColors(this.ring.material.color, targetColor, smoothStep);
    
    if (!this.ring.material.emissive.equals(currentColor)) {
      this.ring.material.emissive.copy(currentColor);
      this.ring.material.color.copy(currentColor);
    }
  }

  handleCollision() {
    this.isColliding = true;
    this.invisibleMaterial.opacity = 0;
    this.setRingColor();
    this.elapsedTime = 0; // Reset elapsed time after collision
  }
  
  handleNonCollision() {
    // this.isColliding = false;
    this.invisibleMaterial.opacity = 0;
    this.setRingColor();
    this.elapsedTime = 0; // Reset elapsed time after non-collision
  }

  // checkCollisionWithRing(playerPos) {
  //   if (!playerPos) return false;
  
  //   const objectPosition = playerPos.clone();
  //   const ringInverseMatrix = new THREE.Matrix4();
  //   ringInverseMatrix.getInverse(this.ring.matrixWorld); 
  //   objectPosition.applyMatrix4(ringInverseMatrix); 
  //   objectPosition.y = 0;
  //   const distanceToCenter = new THREE.Vector2(objectPosition.x, objectPosition.z).length();
  
  //   if (distanceToCenter < this.radius && !this.isColliding) {
  //     this.handleCollision();
  //     return true;
  //   }
  
  //   return false;
  // }

  update() {
    this.elapsedTime += this.clock.getDelta();
    this.animate();
  }
}