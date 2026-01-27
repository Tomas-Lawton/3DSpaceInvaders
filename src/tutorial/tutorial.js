// Tutorial System
// Guides first-time players through the game basics

export const tutorial = (() => {
  const STORAGE_KEY = 'spaceInvadersTutorialComplete';

  // Tutorial steps
  const STEPS = {
    CONTROLS: 0,
    MINING: 1,
    RESOURCES: 2,
    PLANET: 3,
    COMBAT: 4,
    COMPLETE: 5
  };

  const STEP_MESSAGES = {
    [STEPS.CONTROLS]: {
      title: 'FLIGHT CONTROLS',
      message: 'Use W to accelerate and MOUSE to steer. Try moving forward!',
      hint: 'Hold W to fly'
    },
    [STEPS.MINING]: {
      title: 'MINING',
      message: 'Fly to the asteroids ahead and destroy them ALL for resources.',
      hint: 'Follow the blue marker'
    },
    [STEPS.RESOURCES]: {
      title: 'ASTEROID FIELD CLEARED',
      message: 'Excellent work! Now fly to the planet ahead. It needs defending!',
      hint: 'Follow the cyan marker'
    },
    [STEPS.PLANET]: {
      title: 'PLANET DEFENSE',
      message: 'This planet is under attack! Destroy the enemies to save it.',
      hint: 'Enemies marked in red'
    },
    [STEPS.COMBAT]: {
      title: 'COMBAT',
      message: 'Keep firing! Destroy all enemies to save the planet.',
      hint: 'Click to fire lasers'
    },
    [STEPS.COMPLETE]: {
      title: 'TUTORIAL COMPLETE',
      message: 'Well done, pilot! Press ESC to access upgrades and new ships.',
      hint: 'Explore the galaxy!'
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

  // Check if this is a first-time player
  const isFirstTimePlayer = () => {
    const completed = localStorage.getItem(STORAGE_KEY);
    return completed !== 'true';
  };

  // Initialize tutorial system
  const init = () => {
    state.isFirstTime = isFirstTimePlayer();
    state.tutorialComplete = !state.isFirstTime;
    state.tutorialActive = state.isFirstTime;
    state.currentStep = STEPS.CONTROLS;
    state.stepStartTime = performance.now();

    // Create UI elements
    createUI();

    if (state.tutorialActive) {
      console.log('[TUTORIAL] Starting tutorial for first-time player');
      showPrompt();
    } else {
      console.log('[TUTORIAL] Tutorial already completed, skipping');
      hidePrompt();
    }

    return state.tutorialActive;
  };

  // Create tutorial UI elements
  const createUI = () => {
    // Check if already exists
    if (document.getElementById('tutorial-prompt')) {
      promptElement = document.getElementById('tutorial-prompt');
      skipButton = document.getElementById('tutorial-skip');
      return;
    }

    // Create prompt container
    promptElement = document.createElement('div');
    promptElement.id = 'tutorial-prompt';
    promptElement.innerHTML = `
      <div class="tutorial-content">
        <div class="tutorial-title" id="tutorial-title">FLIGHT CONTROLS</div>
        <div class="tutorial-message" id="tutorial-message">Use W to accelerate and MOUSE to steer</div>
        <div class="tutorial-hint" id="tutorial-hint">Hold W to fly</div>
      </div>
    `;
    document.body.appendChild(promptElement);

    // Create skip button
    skipButton = document.createElement('button');
    skipButton.id = 'tutorial-skip';
    skipButton.textContent = 'Skip Tutorial';
    skipButton.addEventListener('click', skipTutorial);
    document.body.appendChild(skipButton);
  };

  // Show tutorial prompt
  const showPrompt = () => {
    if (!promptElement) return;

    const stepData = STEP_MESSAGES[state.currentStep];
    if (!stepData) return;

    const titleEl = document.getElementById('tutorial-title');
    const messageEl = document.getElementById('tutorial-message');
    const hintEl = document.getElementById('tutorial-hint');

    if (titleEl) titleEl.textContent = stepData.title;
    if (messageEl) messageEl.textContent = stepData.message;
    if (hintEl) hintEl.textContent = stepData.hint;

    promptElement.style.display = 'block';
    promptElement.classList.add('visible');

    if (skipButton && state.currentStep !== STEPS.COMPLETE) {
      skipButton.style.display = 'block';
    } else if (skipButton) {
      skipButton.style.display = 'none';
    }
  };

  // Hide tutorial prompt
  const hidePrompt = () => {
    if (promptElement) {
      promptElement.style.display = 'none';
      promptElement.classList.remove('visible');
    }
    if (skipButton) {
      skipButton.style.display = 'none';
    }
  };

  // Advance to next step
  const advanceStep = () => {
    if (!state.tutorialActive) return;

    state.currentStep++;
    state.stepStartTime = performance.now();

    console.log(`[TUTORIAL] Advanced to step ${state.currentStep}: ${STEP_MESSAGES[state.currentStep]?.title}`);

    if (state.currentStep >= STEPS.COMPLETE) {
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

    // Hide after delay
    setTimeout(() => {
      hidePrompt();
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
  };

  // Update tutorial state based on game events
  const update = (gameState) => {
    if (!state.tutorialActive) return;

    const timeSinceStep = performance.now() - state.stepStartTime;

    switch (state.currentStep) {
      case STEPS.CONTROLS:
        // Check if player has moved forward
        if (gameState.playerVelocity > 0.5 && timeSinceStep > 2000) {
          state.hasMovedForward = true;
          advanceStep();
        }
        break;

      case STEPS.MINING:
        // Check if player destroyed an asteroid
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
      console.log(`[TUTORIAL] Asteroid destroyed: ${state.tutorialAsteroidsDestroyed}/${state.tutorialAsteroidsTotal}`);

      // Update the prompt to show progress
      const messageEl = document.getElementById('tutorial-message');
      if (messageEl && state.tutorialAsteroidsTotal > 0) {
        const remaining = state.tutorialAsteroidsTotal - state.tutorialAsteroidsDestroyed;
        if (remaining > 0) {
          messageEl.textContent = `Destroy all asteroids! ${remaining} remaining.`;
        }
      }

      // Only advance when ALL asteroids are destroyed
      if (state.tutorialAsteroidsDestroyed >= state.tutorialAsteroidsTotal) {
        update({ asteroidDestroyed: true });
      }
    }
  };

  // Notify that player is near a planet
  const onNearPlanet = () => {
    if (state.tutorialActive && state.currentStep === STEPS.RESOURCES) {
      update({ nearPlanet: true });
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
      asteroid: { x: 0, y: 0, z: -1200 },    // Directly ahead, close
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
    onAsteroidDestroyed,
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
