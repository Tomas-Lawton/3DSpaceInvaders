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
import { mobileInput } from "./components/player/mobile-input.js";
import { PHYSICS_CONSTANTS } from "./utils/constants.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { initHUD } from "./hud/hud.js";
import { getTotalBonuses, loadUpgradeState } from "./utils/upgrade-system.js";
import { tutorial } from "./tutorial/tutorial.js";

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

    // Initialize tutorial system (checks if first-time player)
    const isTutorialMode = tutorial.init();
    this.tutorialActive = isTutorialMode;
    console.log(`[GAME] Tutorial mode: ${isTutorialMode ? 'ACTIVE' : 'SKIPPED'}`);

    // Preload all ship models before starting
    console.log('[GAME] Preloading all ship models...');
    await spaceship.preloadAllModels();
    console.log('[GAME] All ship models preloaded successfully!');

    await this.setupAudio();

    // Pass tutorial mode to world for controlled spawning
    this.world.addElements(isTutorialMode);

    if (this.playerEntity !== undefined && this.playerShip !== undefined) {
      this.playerShip.setSpaceshipModel(0); // default ship 'SOLAR PHANTOM'
      this.playerEntity.AddComponent(new player_input.PlayerInput());
      this.playerEntity.InitEntity();
    } else {
      progressContainer.style.display = "none";
    }

    // Mark game as ready and update intro button
    this.markGameReady();

    // Initialize mobile controls if on mobile device
    this.initMobileControls();

    // setupGUI({ audioManager: this.audioManager });

    this.animate();
  }

  markGameReady() {
    // Update the start button to show it's ready
    const startButton = document.getElementById('start-game-btn');
    const buttonText = startButton.querySelector('.button-text');

    if (buttonText) {
      buttonText.textContent = 'NEXT';
      buttonText.classList.add('ready');
    }

    // Enable the button
    startButton.disabled = false;
    startButton.classList.add('ready');
  }

  initMobileControls() {
    // Initialize mobile input with references to player entity and fire callback
    const isMobile = mobileInput.init(
      this.playerEntity,
      () => {
        // Fire callback - same logic as desktop mousedown
        if (this.playerShip && !this.isPaused && this.gameStarted) {
          this.playerShip.fireLaser();
        }
      },
      this // Pass game reference for pause/start state checks
    );

    if (isMobile) {
      console.log('[GAME] Mobile controls initialized');
      this.isMobile = true;
    } else {
      this.isMobile = false;
    }
  }

  setupPauseListener() {
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.gameStarted) {
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
            this.audioManager.pauseDogfightMusic();
          }
        } else {
          console.log("Game Resumed");
          // Resume all audio
          if (this.audioManager) {
            this.audioManager.resumeSpaceshipSound();
            this.audioManager.resumeDogfightMusic();
          }
        }
        toggleHUD();
      }
    });
  }

  setupIntroListener() {
    const tabs = ['mission', 'controls', 'about'];
    let currentTabIndex = 0;

    const startGame = () => {
      const introScreen = document.getElementById('intro-screen');
      if (introScreen && introScreen.style.display !== 'none') {
        introScreen.style.display = 'none';
        this.gameStarted = true;
        console.log('🚀 Game started! Good luck, pilot!');

        // Show tutorial prompts if tutorial is active
        if (this.tutorialActive && tutorial.isActive()) {
          tutorial.showPrompt();
        }

        // On mobile, try to lock to landscape after user interaction
        if (this.isMobile) {
          mobileInput.requestLandscape();
        }
      }
    };

    const switchTab = (tabName) => {
      // Update tab buttons
      document.querySelectorAll('.intro-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
          tab.classList.add('active');
        }
      });

      // Update tab panels
      document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
      });
      const targetPanel = document.getElementById(`${tabName}-panel`);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }

      // Update current tab index
      currentTabIndex = tabs.indexOf(tabName);

      // Update navigation hint and button text
      const navHint = document.querySelector('.nav-hint-text');
      const startButton = document.getElementById('start-game-btn');

      if (currentTabIndex === tabs.length - 1) {
        // Last tab - show start game message
        if (navHint) {
          navHint.innerHTML = 'Press <span class="orange-text">ENTER</span> or <span class="orange-text">SPACE</span> to start';
        }
        if (startButton) {
          const buttonText = startButton.querySelector('.button-text');
          if (buttonText) {
            buttonText.textContent = 'START GAME';
          }
        }
      } else {
        // Not last tab - show continue message
        if (navHint) {
          navHint.innerHTML = 'Press <span class="orange-text">ENTER</span> or <span class="orange-text">SPACE</span> to continue';
        }
      }
    };

    // Setup tab click listeners
    document.querySelectorAll('.intro-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        switchTab(tab.dataset.tab);
      });
    });

    // Setup start button click listener
    const startButton = document.getElementById('start-game-btn');
    if (startButton) {
      startButton.addEventListener('click', () => {
        if (!startButton.disabled) {
          if (currentTabIndex === tabs.length - 1) {
            startGame();
          } else {
            // Go to next tab
            const nextTab = tabs[currentTabIndex + 1];
            if (nextTab) {
              switchTab(nextTab);
            }
          }
        }
      });
    }

    // Setup restart button with confirmation
    const restartButton = document.getElementById('restart-game-btn');
    if (restartButton) {
      restartButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to restart the game and clear all settings? This cannot be undone.')) {
          console.log('🔄 Restarting game and clearing settings...');
          localStorage.clear();
          window.location.reload();
        }
      });
    }

    // Enter or Space key press for tab navigation and starting game
    const keyHandler = (event) => {
      const introScreen = document.getElementById('intro-screen');
      const startButton = document.getElementById('start-game-btn');

      // Only handle if intro screen is visible and game hasn't started
      if (!this.gameStarted && introScreen && introScreen.style.display !== 'none') {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault(); // Prevent default space/enter behavior

          // Check if button is disabled (ships still loading)
          if (startButton && startButton.disabled) {
            return;
          }

          // If on last tab, start game
          if (currentTabIndex === tabs.length - 1) {
            startGame();
            // Remove listener after game starts
            window.removeEventListener('keydown', keyHandler);
          } else {
            // Otherwise, go to next tab
            const nextTab = tabs[currentTabIndex + 1];
            if (nextTab) {
              switchTab(nextTab);
            }
          }
        }
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
            this.world.planetLoader.enemyLoader,
            this.world.planetLoader
          );
          // update hud
          updateVelocityBar(
            this.playerShip.forwardVelocity,
            PHYSICS_CONSTANTS.maxVelocity
          );
          updateHealthBar(this.playerShip.health, this.playerShip.maxHealth);
          updatePlayerPositionUI(this.playerShip.mesh.position);

          // Update tutorial state based on player velocity
          if (this.tutorialActive && tutorial.isActive()) {
            tutorial.update({ playerVelocity: this.playerShip.forwardVelocity });
          }

          // Check if tutorial just completed and enable normal world spawning
          if (this.tutorialActive && tutorial.isComplete() && !this.tutorialCompletionHandled) {
            this.tutorialCompletionHandled = true;
            this.tutorialActive = false;
            console.log('[GAME] Tutorial completed - enabling normal world spawning');
            if (this.world) {
              this.world.enableNormalSpawning();
            }
          }
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

window.addEventListener("mousedown", (event) => {
  // Skip on mobile - touch events are handled by mobile-input.js
  if (game.isMobile) return;

  // Only allow firing if game has started and is not paused
  if (!game.isPaused && game.gameStarted) {
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

    if (cursorBig) cursorBig.classList.add("click");
    if (cursorSmall) cursorSmall.classList.add("hover__small");
  }
});

window.addEventListener("mouseup", () => {
  clearInterval(shootingInterval);
  if (cursorBig) cursorBig.classList.remove("click");
  if (cursorSmall) cursorSmall.classList.remove("hover__small");
});
