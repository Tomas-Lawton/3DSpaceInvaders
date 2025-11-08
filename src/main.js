import * as THREE from "three";

// Modules
import { Audio_Manager } from "./components/audio.js";
import { gameworld } from "./scene/world.js";
import { spaceship } from "./components/player/spaceship.js";
// import { setupGUI } from "./components/gui.js";
import { entity } from "./utils/entity.js";
import { initRenderer, initComposer, updateWarpEffect } from "./scene/renderer.js";
import {
  updateVelocityBar,
  updateHealthBar,
  progressContainer,
  toggleHUD,
  updatePlayerPositionUI,
} from "./components/dom.js";
import { player_input } from "./components/player/player-input.js";
import { PHYSICS_CONSTANTS } from "./utils/constants.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { initHUD } from "./hud/hud.js";
import { getTotalBonuses, loadUpgradeState } from "./utils/upgrade-system.js";

class Game {
  constructor() {
    this.isPaused = false;
    this.gameStarted = false; // Track if game has started (intro dismissed)
    this.initScene();
    this.initEntities();
    this.initialize();
    this.previousTime = 0; // animation loop
    this.setupPauseListener();
    this.setupIntroListener();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    this.renderer = initRenderer();
    this.composer = initComposer(this.renderer, this.scene, this.camera);

    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = true;
    controls.minDistance = 5;
    controls.maxDistance = 20;
    controls.minPolarAngle = 0.5;
    controls.maxPolarAngle = 1.5;
    controls.autoRotate = false;
    controls.target = new THREE.Vector3(0, 0, 1);
    controls.update();

    initHUD();
  }

  initEntities() {
    this.world = new gameworld.World({ scene: this.scene });

    // load user ship
    this.playerEntity = new entity.Entity();
    this.playerShip = new spaceship.Spaceship(this.scene, this.camera, 100);
  }

  async initialize() {
    // Load upgrade state from localStorage
    loadUpgradeState();

    await this.setupAudio();
    this.world.addElements();

    if (this.playerEntity !== undefined && this.playerShip !== undefined) {
      this.playerShip.setSpaceshipModel(0); // default ship 'ship-1'
      this.playerEntity.AddComponent(new player_input.PlayerInput());
      this.playerEntity.InitEntity();
    } else {
      progressContainer.style.display = "none";
    }

    // setupGUI({ audioManager: this.audioManager });

    this.animate();
  }

  setupPauseListener() {
    window.addEventListener("keydown", (event) => {
      if ((event.key === "e" || event.key === "E") && this.gameStarted) {
        this.isPaused = !this.isPaused; // Toggle the pause state

        // Play bleep sound on toggle
        if (this.audioManager) {
          this.audioManager.playBleepSound();
        }

        if (this.isPaused) {
          console.log("Game Paused");
          // Pause all audio
          if (this.audioManager) {
            this.audioManager.pauseSpaceshipSound();
            this.audioManager.stopDogfightMusic();
          }
        } else {
          console.log("Game Resumed");
          // Resume rocket booster audio
          if (this.audioManager) {
            this.audioManager.resumeSpaceshipSound();
          }
        }
        toggleHUD();
      }
    });
  }

  setupIntroListener() {
    const startGame = () => {
      const introScreen = document.getElementById('intro-screen');
      if (introScreen && introScreen.style.display !== 'none') {
        introScreen.style.display = 'none';
        this.gameStarted = true;
        console.log('🚀 Game started! Good luck, pilot!');
      }
    };

    // Button click
    const startButton = document.getElementById('start-game-btn');
    if (startButton) {
      startButton.addEventListener('click', startGame);
    }

    // Enter or Space key press
    const keyHandler = (event) => {
      if (!this.gameStarted && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault(); // Prevent default space/enter behavior
        startGame();
        // Remove listener after first use
        window.removeEventListener('keydown', keyHandler);
      }
    };
    window.addEventListener('keydown', keyHandler);
  }

  async setupAudio() {
    const audioContext = new AudioContext();
    this.audioManager = new Audio_Manager(audioContext);

    try {
      await Promise.all([
        this.audioManager.loadSounds("./public/audio/sounds"),
        this.audioManager.loadSoundtrack("./public/audio/soundtrack.wav"),
        this.audioManager.loadSpaceshipSound("./public/audio/ship_rumble.wav"),
        this.audioManager.loadDogfightMusic("./public/audio/dogfight.mp3"),
        this.audioManager.loadBleepSound("./public/audio/bleep.mp3"),
      ]);
      this.audioManager.playSpaceshipSound();
    } catch (error) {
      console.error("Failed to initialize audio:", error);
    }
  }

  animate(currentTime) {
    requestAnimationFrame((time) => this.animate(time));
    const timeElapsed = (currentTime - this.previousTime) / 1000;
    this.previousTime = currentTime;
    if (this.playerShip !== undefined && this.playerShip.mesh === null) return; // wait to load

    if (!this.isPaused && this.gameStarted) {
      // Only update if the game is not paused and has started
      this.Update(timeElapsed);
    }
  }

  Update(timeElapsed) {
    // get current inputs
    if (this.playerEntity && this.playerEntity.GetComponent("PlayerInput")) {
      this.playerEntity.Update();
      let input = this.playerEntity.Attributes.InputCurrent;
      if (input) {
        // update ship
        if (this.playerShip && this.world && this.audioManager) {
          this.playerShip.Update(
            input.forwardAcceleration,
            input.upwardAcceleration,
            timeElapsed,
            this.audioManager,
            this.world.asteroidLoader,
            this.world.planetLoader.enemyLoader
          );
          // update hud
          updateVelocityBar(
            this.playerShip.forwardVelocity,
            PHYSICS_CONSTANTS.maxVelocity
          );
          updateHealthBar(this.playerShip.health, this.playerShip.maxHealth);
          updatePlayerPositionUI(this.playerShip.mesh.position);
        }
      }
    }

    // update world
    if (this.world && this.audioManager) {
      let playerCurrentPosition;
      let playerForwardDirection;
      if (this.playerShip === undefined) {
        playerCurrentPosition = new THREE.Vector3(0, 0, 0); // Just assign the vector itself
        playerForwardDirection = new THREE.Vector3(0, 0, 1);
      } else {
        playerCurrentPosition = this.playerShip.mesh.position; // Access the position of the ship's mesh
        // Get the player's forward direction
        playerForwardDirection = new THREE.Vector3();
        this.playerShip.mesh.getWorldDirection(playerForwardDirection);
      }
      this.world.Update(playerCurrentPosition, this.audioManager, playerForwardDirection, this.playerShip); // depends on user and sound
    }

    // Update warp effect based on ship velocity
    if (this.playerShip && this.composer) {
      updateWarpEffect(
        this.composer,
        this.playerShip.forwardVelocity,
        PHYSICS_CONSTANTS.maxVelocity
      );
    }

    this.composer.render();
  }
}

const game = new Game();
let shootingInterval;



const cursorBig = document.querySelector('.big');
const cursorSmall = document.querySelector('.small');

window.addEventListener("mousedown", () => {
  if (!game.isPaused) {
    if (game.playerShip) {
      game.playerShip.fireLaser();

      // Get fire rate multiplier from upgrades
      const bonuses = getTotalBonuses();
      const baseFireRate = 150; // Base fire rate in milliseconds
      const adjustedFireRate = baseFireRate / bonuses.fireRateMultiplier;

      shootingInterval = setInterval(() => {
        game.playerShip.fireLaser();
      }, adjustedFireRate);
    }

    cursorBig.classList.add("click");
    cursorSmall.classList.add("hover__small");
  }
});

window.addEventListener("mouseup", () => {
  clearInterval(shootingInterval);
  cursorBig.classList.remove("click");
  cursorSmall.classList.remove("hover__small");
});
