// Tutorial System
// Guides first-time players through the game basics

import { triggerMessage } from '../hud/message-ui.js';
import { resetMessageSystem } from '../utils/message-system.js';

export const tutorial = (() => {
  const STORAGE_KEY = 'spaceInvadersTutorialComplete';

  // Tutorial steps
  const STEPS = {
    CONTROLS: 0,    // Movement tutorial
    FIRING: 1,      // Click to fire tutorial
    MINING: 2,      // Destroy asteroids
    RESOURCES: 3,   // Go to planet
    PLANET: 4,      // Planet under attack
    COMBAT: 5,      // Destroy enemies
    COMPLETE: 6
  };

  const STEP_MESSAGES = {
    [STEPS.CONTROLS]: {
      title: 'FLIGHT CONTROLS',
      message: 'Hold W to fly forward. Move MOUSE to steer.',
      hint: 'W = Accelerate | S = Brake | Mouse = Steer'
    },
    [STEPS.FIRING]: {
      title: 'FIRE YOUR LASERS',
      message: 'Click Mouse to fire your lasers!',
      hint: 'Click = Fire | Hold = Rapid fire'
    },
    [STEPS.MINING]: {
      title: 'DESTROY ASTEROIDS',
      message: 'Destroy all 8 asteroids to proceed.',
      hint: 'Blue marker = Asteroids'
    },
    [STEPS.RESOURCES]: {
      title: 'ASTEROIDS CLEARED',
      message: 'Fly toward the cyan marker - Earth needs help!',
      hint: 'Cyan marker = Planet'
    },
    [STEPS.PLANET]: {
      title: 'PLANET UNDER ATTACK',
      message: 'Enemy ships detected! Protect the planet!',
      hint: 'Red markers = Enemies'
    },
    [STEPS.COMBAT]: {
      title: 'ENGAGE HOSTILES',
      message: 'Destroy all enemies to save the planet!',
      hint: 'Click rapidly to fire'
    },
    [STEPS.COMPLETE]: {
      title: 'TUTORIAL COMPLETE',
      message: 'Press ESC for upgrades and new ships!',
      hint: 'ESC = Menu'
    }
  };

  // State
  let state = {
    isFirstTime: true,
    currentStep: STEPS.CONTROLS,
    tutorialComplete: false,
    tutorialActive: false,
    stepStartTime: 0,
    hasMovedForward: false,
    hasDestroyedAsteroid: false,
    hasReachedPlanet: false,
    hasKilledEnemy: false,
    tutorialAsteroidsTotal: 0,
    tutorialAsteroidsDestroyed: 0
  };

  // UI Elements
  let promptElement = null;
  let skipButton = null;

  // Callback for when asteroids are cleared (to spawn planet)
  let onAsteroidsClearedCallback = null;

  // Check if this is a first-time player
  const isFirstTimePlayer = () => {
    const completed = localStorage.getItem(STORAGE_KEY);
    return completed !== 'true';
  };

  // Initialize tutorial system
  // Tutorial always resets and runs on game start (user can skip if they want)
  const init = () => {
    // Reset all tutorial state on game start
    state.isFirstTime = true;
    state.currentStep = STEPS.CONTROLS;
    state.tutorialComplete = false;
    state.tutorialActive = true;
    state.stepStartTime = performance.now();
    state.hasMovedForward = false;
    state.hasDestroyedAsteroid = false;
    state.hasReachedPlanet = false;
    state.hasKilledEnemy = false;
    state.tutorialAsteroidsTotal = 0;
    state.tutorialAsteroidsDestroyed = 0;

    // Clear the completion flag so tutorial always runs fresh
    localStorage.removeItem(STORAGE_KEY);

    // Reset message system so tutorial messages can show again
    resetMessageSystem();

    // Create UI elements
    createUI();

    console.log('[TUTORIAL] Tutorial reset and starting fresh');
    showPrompt();

    return state.tutorialActive;
  };

  // Create tutorial UI elements (skip button only - messages use message UI)
  const createUI = () => {
    // Check if skip button already exists
    if (document.getElementById('tutorial-skip')) {
      skipButton = document.getElementById('tutorial-skip');
      skipButton.style.display = 'block'; // Make sure it's visible on restart
      return;
    }

    // Create skip button only
    skipButton = document.createElement('button');
    skipButton.id = 'tutorial-skip';
    skipButton.textContent = 'Skip Tutorial';
    skipButton.addEventListener('click', skipTutorial);
    document.body.appendChild(skipButton);
  };

  // Map steps to message IDs
  const STEP_MESSAGE_IDS = {
    [STEPS.CONTROLS]: 'tutorialControls',
    [STEPS.FIRING]: 'tutorialFiring',
    [STEPS.MINING]: 'tutorialMining',
    [STEPS.RESOURCES]: 'tutorialPlanet',
    [STEPS.PLANET]: 'tutorialUnderAttack',
    [STEPS.COMBAT]: 'tutorialCombat',
    [STEPS.COMPLETE]: 'tutorialComplete'
  };

  // Show tutorial prompt using message UI
  const showPrompt = () => {
    const messageId = STEP_MESSAGE_IDS[state.currentStep];
    if (messageId) {
      triggerMessage(messageId);
    }

    // Show skip button if not complete
    if (skipButton && state.currentStep !== STEPS.COMPLETE) {
      skipButton.style.display = 'block';
    } else if (skipButton) {
      skipButton.style.display = 'none';
    }
  };

  // Hide tutorial prompt (skip button only, messages handled by message UI)
  const hidePrompt = () => {
    if (skipButton) {
      skipButton.style.display = 'none';
    }
    // Hide message alert if visible
    const messageAlert = document.getElementById('message-alert');
    if (messageAlert) {
      messageAlert.style.display = 'none';
    }
  };

  // Advance to next step
  const advanceStep = () => {
    if (!state.tutorialActive) return;

    state.currentStep++;
    state.stepStartTime = performance.now();

    console.log(`[TUTORIAL] Advanced to step ${state.currentStep}: ${STEP_MESSAGES[state.currentStep]?.title}`);

    if (state.currentStep >= STEPS.COMPLETE) {
      console.log("STEP: ", state.currentStep)
      completeTutorial();
    } else {
      showPrompt();
    }
  };

  // Complete the tutorial
  const completeTutorial = () => {
    state.tutorialComplete = true;
    state.tutorialActive = false;
    state.currentStep = STEPS.COMPLETE;

    // Show completion message
    showPrompt();

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, 'true');

    console.log('[TUTORIAL] Tutorial completed and saved');

    // Hide after delay and show first mission
    setTimeout(() => {
      hidePrompt();
      // Show the first mission message after tutorial
      triggerMessage('tutorialComplete');
    }, 5000);
  };

  // Skip tutorial
  const skipTutorial = () => {
    console.log('[TUTORIAL] Tutorial skipped by user');
    state.tutorialComplete = true;
    state.tutorialActive = false;

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, 'true');

    hidePrompt();

    // Show first mission message even when skipping
    triggerMessage('tutorialComplete');
  };

  // Update tutorial state based on game events
  const update = (gameState) => {
    if (!state.tutorialActive) return;

    const timeSinceStep = performance.now() - state.stepStartTime;

    switch (state.currentStep) {
      case STEPS.CONTROLS:
        // Check if player has moved forward
        if (gameState.playerVelocity > 0.3 && timeSinceStep > 1000) {
          state.hasMovedForward = true;
          advanceStep();
        }
        break;

      case STEPS.FIRING:
        // Check if player fired a laser
        if (gameState.laserFired) {
          advanceStep();
        }
        break;

      case STEPS.MINING:
        // Check if all asteroids destroyed
        if (gameState.asteroidDestroyed) {
          state.hasDestroyedAsteroid = true;
          advanceStep();
        }
        break;

      case STEPS.RESOURCES:
        // Check if player is near planet
        if (gameState.nearPlanet && timeSinceStep > 2000) {
          state.hasReachedPlanet = true;
          advanceStep();
        }
        break;

      case STEPS.PLANET:
        // Check if enemies spawned
        if (gameState.enemiesActive) {
          advanceStep();
        }
        break;

      case STEPS.COMBAT:
        // Check if all enemies destroyed
        if (gameState.planetSaved) {
          advanceStep();
        }
        break;
    }
  };

  // Set the total number of tutorial asteroids
  const setTutorialAsteroidCount = (count) => {
    state.tutorialAsteroidsTotal = count;
    state.tutorialAsteroidsDestroyed = 0;
    console.log(`[TUTORIAL] Tutorial asteroid count set to ${count}`);
  };

  // Notify that an asteroid was destroyed
  const onAsteroidDestroyed = () => {
    if (state.tutorialActive && state.currentStep === STEPS.MINING) {
      state.tutorialAsteroidsDestroyed++;
      const remaining = state.tutorialAsteroidsTotal - state.tutorialAsteroidsDestroyed;
      console.log(`[TUTORIAL] Asteroid destroyed: ${state.tutorialAsteroidsDestroyed}/${state.tutorialAsteroidsTotal} (${remaining} remaining)`);

      // Update the alert to show remaining count
      const alertTitle = document.querySelector('.alert-title');
      const alertText = document.querySelector('.alert-text');

      if (remaining > 0) {
        if (alertTitle) {
          alertTitle.textContent = `${remaining} ASTEROIDS LEFT`;
        }
        if (alertText) {
          alertText.textContent = `Destroy ${remaining} more!`;
        }
      }

      // Only advance when ALL asteroids are destroyed
      if (state.tutorialAsteroidsDestroyed >= state.tutorialAsteroidsTotal) {
        // Trigger callback to spawn planet before advancing
        if (onAsteroidsClearedCallback) {
          onAsteroidsClearedCallback();
        }
        update({ asteroidDestroyed: true });
      }
    }
  };

  // Set callback for when asteroids are cleared
  const setOnAsteroidsClearedCallback = (callback) => {
    onAsteroidsClearedCallback = callback;
  };

  // Notify that player is near a planet
  const onNearPlanet = () => {
    if (state.tutorialActive && state.currentStep === STEPS.RESOURCES) {
      update({ nearPlanet: true });
    }
  };

  // Notify that player fired a laser (advances from firing to mining)
  const onLaserFired = () => {
    if (state.tutorialActive && state.currentStep === STEPS.FIRING) {
      update({ laserFired: true });
    }
  };

  // Notify that enemies have spawned
  const onEnemiesSpawned = () => {
    if (state.tutorialActive && state.currentStep === STEPS.PLANET) {
      update({ enemiesActive: true });
    }
  };

  // Notify that planet was saved
  const onPlanetSaved = () => {
    if (state.tutorialActive && state.currentStep === STEPS.COMBAT) {
      update({ planetSaved: true });
    }
  };

  // Check if tutorial is active
  const isActive = () => state.tutorialActive;

  // Check if tutorial is complete
  const isComplete = () => state.tutorialComplete;

  // Get current step
  const getCurrentStep = () => state.currentStep;

  // Get tutorial positions for spawning
  const getTutorialPositions = () => {
    if (!state.tutorialActive) return null;

    // Player faces -Z direction, so negative Z is "in front"
    return {
      asteroid: { x: 0, y: 0, z: -1000 },    // Directly ahead, close
      planet: { x: 0, y: 0, z: -3600 }      // Further ahead, well spaced
    };
  };

  // Reset tutorial (for testing)
  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    state = {
      isFirstTime: true,
      currentStep: STEPS.CONTROLS,
      tutorialComplete: false,
      tutorialActive: true,
      stepStartTime: performance.now(),
      hasMovedForward: false,
      hasDestroyedAsteroid: false,
      hasReachedPlanet: false,
      hasKilledEnemy: false
    };
    console.log('[TUTORIAL] Tutorial reset');
  };

  return {
    STEPS,
    init,
    update,
    advanceStep,
    setTutorialAsteroidCount,
    setOnAsteroidsClearedCallback,
    onAsteroidDestroyed,
    onLaserFired,
    onNearPlanet,
    onEnemiesSpawned,
    onPlanetSaved,
    isActive,
    isComplete,
    getCurrentStep,
    getTutorialPositions,
    skipTutorial,
    reset,
    hidePrompt,
    showPrompt
  };
})();
