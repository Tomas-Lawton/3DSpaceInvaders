import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { canvas } from "../components/dom.js"

// Radial blur shader for warp effect
const RadialBlurShader = {
  uniforms: {
    tDiffuse: { value: null },
    center: { value: new THREE.Vector2(0.5, 0.5) },
    strength: { value: 0.0 },
    samples: { value: 8 } // Reduced from 16 for better performance
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 center;
    uniform float strength;
    uniform int samples;
    varying vec2 vUv;

    void main() {
      vec2 direction = vUv - center;
      float distance = length(direction);
      direction = normalize(direction);

      vec4 color = vec4(0.0);
      float total = 0.0;

      // Sample along the radial direction
      for(int i = 0; i < 8; i++) { // Match reduced sample count
        if(i >= samples) break;

        float t = float(i) / float(samples);
        float offset = strength * t * distance;
        vec2 samplePos = vUv - direction * offset;

        // Weight samples closer to original position more heavily
        float weight = 1.0 - t * 0.5;
        color += texture2D(tDiffuse, samplePos) * weight;
        total += weight;
      }

      color /= total;

      // Add slight chromatic aberration at high speeds
      if(strength > 0.01) {
        vec2 offset = direction * strength * 0.5;
        float r = texture2D(tDiffuse, vUv - offset * 1.2).r;
        float b = texture2D(tDiffuse, vUv + offset * 1.2).b;
        color.r = mix(color.r, r, strength * 0.3);
        color.b = mix(color.b, b, strength * 0.3);
      }

      gl_FragColor = color;
    }
  `
};

export function initRenderer() {
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      powerPreference: "high-performance" // Use dedicated GPU if available
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000);
    // Cap pixel ratio at 2 to avoid rendering too many pixels on high-DPI displays
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap; // Faster than PCFSoftShadowMap
    return renderer;
  }

  export function initComposer(renderer, scene, camera) {
    const renderScene = new RenderPass(scene, camera);
    // Reduce bloom resolution by 25% for better performance
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth * 0.75, window.innerHeight * 0.75),
      1.5, 1, 1 // Reduced intensity from 1.8
    );

    // Create radial blur pass for warp effect
    const radialBlurPass = new ShaderPass(RadialBlurShader);
    radialBlurPass.renderToScreen = false;

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(radialBlurPass);
    composer.addPass(bloomPass);

    // Store reference to the warp pass for external control
    composer.warpPass = radialBlurPass;

    return composer;
  }

  // Update warp effect based on velocity
  export function updateWarpEffect(composer, velocity, maxVelocity) {
    if (!composer.warpPass) return;

    // Calculate warp strength based on velocity (0 to 1)
    const velocityRatio = Math.min(velocity / maxVelocity, 1.0);

    // Only activate warp at high speeds (above 70% max velocity)
    const threshold = 0.7;
    let warpStrength = 0;

    if (velocityRatio > threshold) {
      // Smoothly ramp up from threshold to max
      warpStrength = (velocityRatio - threshold) / (1.0 - threshold);
      // Apply easing for smoother effect
      warpStrength = Math.pow(warpStrength, 2.0);
      // Scale to desired blur amount (0.0 to 0.015) - reduced from 0.03
      warpStrength *= 0.015;
    }

    composer.warpPass.uniforms.strength.value = warpStrength;
  }