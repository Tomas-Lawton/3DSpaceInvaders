// Mobile Input Handler
// Provides touch controls and device motion support for mobile devices

import { getTotalBonuses } from "../../utils/upgrade-system.js";

export const mobileInput = (() => {
  let isMobile = false;
  let motionEnabled = false;
  let joystickEnabled = false;

  // Store references for external access
  let inputRef = null;
  let fireCallback = null;
  let gameRef = null;

  // Joystick state
  let joystickActive = false;
  let joystickStartX = 0;
  let joystickStartY = 0;

  // Motion calibration
  let calibrationBeta = 0;
  let calibrationGamma = 0;
  let isCalibrated = false;

  // Detect mobile device
  const detectMobile = () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 1024;
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

    isMobile = (isTouchDevice && isSmallScreen) || isCoarsePointer ||
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());

    return isMobile;
  };

  // Try to lock orientation to landscape
  const requestLandscape = () => {
    // Try Screen Orientation API (works on Android Chrome, some others)
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').then(() => {
        console.log('[MOBILE] Orientation locked to landscape');
      }).catch((err) => {
        console.log('[MOBILE] Could not lock orientation:', err.message);
      });
    }
  };

  // Initialize mobile controls
  const init = (playerInput, onFire, game) => {
    if (!detectMobile()) {
      console.log('[MOBILE] Desktop detected, skipping mobile controls');
      return false;
    }

    console.log('[MOBILE] Mobile device detected, initializing controls');
    inputRef = playerInput;
    fireCallback = onFire;
    gameRef = game;

    // Attempt to lock to landscape mode
    requestLandscape();

    // Show mobile controls
    const mobileControls = document.getElementById('mobile-controls');
    if (mobileControls) {
      mobileControls.style.display = 'block';
    }

    // Hide desktop cursors
    document.querySelectorAll('.cursor').forEach(el => {
      el.style.display = 'none';
    });

    // Check if device motion is available
    if (window.DeviceOrientationEvent) {
      showMotionPrompt();
    } else {
      enableJoystick();
    }

    // Setup button handlers
    setupButtonHandlers();

    // Setup touch firing on canvas
    setupTouchFiring();

    return true;
  };

  // Show motion permission prompt
  const showMotionPrompt = () => {
    const prompt = document.getElementById('mobile-motion-prompt');
    if (prompt) {
      prompt.style.display = 'block';

      const enableBtn = document.getElementById('enable-motion-btn');
      const skipBtn = document.getElementById('skip-motion-btn');

      enableBtn.addEventListener('click', () => {
        prompt.style.display = 'none';
        requestMotionPermission();
      });

      skipBtn.addEventListener('click', () => {
        prompt.style.display = 'none';
        enableJoystick();
      });
    }
  };

  // Request device motion permission (required on iOS 13+)
  const requestMotionPermission = async () => {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      // iOS 13+ requires explicit permission
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          enableMotion();
        } else {
          console.log('[MOBILE] Motion permission denied, using joystick');
          enableJoystick();
        }
      } catch (error) {
        console.error('[MOBILE] Motion permission error:', error);
        enableJoystick();
      }
    } else {
      // Non-iOS or older iOS - motion events available without permission
      enableMotion();
    }
  };

  // Enable device motion controls
  const enableMotion = () => {
    motionEnabled = true;
    console.log('[MOBILE] Motion controls enabled');

    // Hide joystick when motion is enabled
    const joystickZone = document.getElementById('mobile-joystick-zone');
    if (joystickZone) {
      joystickZone.style.display = 'none';
    }

    // Calibrate on first reading
    isCalibrated = false;

    window.addEventListener('deviceorientation', handleDeviceOrientation, true);
  };

  // Enable virtual joystick controls
  const enableJoystick = () => {
    joystickEnabled = true;
    console.log('[MOBILE] Joystick controls enabled');

    const joystickZone = document.getElementById('mobile-joystick-zone');
    if (joystickZone) {
      joystickZone.style.display = 'block';
      setupJoystick(joystickZone);
    }
  };

  // Handle device orientation for steering
  const handleDeviceOrientation = (event) => {
    if (!motionEnabled || !gameRef || gameRef.isPaused || !gameRef.gameStarted) return;

    let { beta, gamma } = event;

    // beta: front-back tilt (-180 to 180), gamma: left-right tilt (-90 to 90)
    if (beta === null || gamma === null) return;

    // Calibrate on first valid reading (assume user is holding device in neutral position)
    if (!isCalibrated) {
      calibrationBeta = beta;
      calibrationGamma = gamma;
      isCalibrated = true;
      console.log(`[MOBILE] Calibrated: beta=${beta.toFixed(1)}, gamma=${gamma.toFixed(1)}`);
      return;
    }

    // Apply calibration offset
    const adjustedBeta = beta - calibrationBeta;
    const adjustedGamma = gamma - calibrationGamma;

    // Map device tilt to mouseX/mouseY equivalent
    // Clamp values to reasonable range
    const maxTilt = 30; // degrees

    // Gamma (left-right tilt) -> horizontal steering (mouseX)
    const normalizedGamma = Math.max(-maxTilt, Math.min(maxTilt, adjustedGamma)) / maxTilt;

    // Beta (front-back tilt) -> vertical steering (mouseY)
    const normalizedBeta = Math.max(-maxTilt, Math.min(maxTilt, adjustedBeta)) / maxTilt;

    // Convert to mouseX/mouseY scale (centered at 0, extends to half screen width/height)
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Update the global mouse position variables used by spaceship.js
    // These need to be set on the window or accessed differently
    window.mobileMouseX = normalizedGamma * centerX;
    window.mobileMouseY = normalizedBeta * centerY;
  };

  // Setup virtual joystick
  const setupJoystick = (zone) => {
    const knob = document.getElementById('mobile-joystick-knob');
    const joystick = document.getElementById('mobile-joystick');

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = joystick.getBoundingClientRect();
      joystickStartX = rect.left + rect.width / 2;
      joystickStartY = rect.top + rect.height / 2;
      joystickActive = true;
    }, { passive: false });

    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!joystickActive) return;

      const touch = e.touches[0];
      const rect = joystick.getBoundingClientRect();
      const maxDistance = rect.width / 2 - 25; // Knob radius

      let deltaX = touch.clientX - joystickStartX;
      let deltaY = touch.clientY - joystickStartY;

      // Clamp to circle
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (distance > maxDistance) {
        deltaX = (deltaX / distance) * maxDistance;
        deltaY = (deltaY / distance) * maxDistance;
      }

      // Move knob
      knob.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;

      // Convert to mouse coordinates
      const normalizedX = deltaX / maxDistance;
      const normalizedY = deltaY / maxDistance;

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      window.mobileMouseX = normalizedX * centerX;
      window.mobileMouseY = normalizedY * centerY;
    }, { passive: false });

    zone.addEventListener('touchend', (e) => {
      e.preventDefault();
      joystickActive = false;
      knob.style.transform = 'translate(-50%, -50%)';
      window.mobileMouseX = 0;
      window.mobileMouseY = 0;
    }, { passive: false });
  };

  // Setup acceleration button handlers
  const setupButtonHandlers = () => {
    const boostBtn = document.getElementById('mobile-boost-btn');
    const brakeBtn = document.getElementById('mobile-brake-btn');

    if (boostBtn) {
      boostBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (inputRef && inputRef.Attributes && inputRef.Attributes.InputCurrent) {
          inputRef.Attributes.InputCurrent.forwardAcceleration = 1.0;
        }
      }, { passive: false });

      boostBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (inputRef && inputRef.Attributes && inputRef.Attributes.InputCurrent) {
          inputRef.Attributes.InputCurrent.forwardAcceleration = 0;
        }
      }, { passive: false });
    }

    if (brakeBtn) {
      brakeBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (inputRef && inputRef.Attributes && inputRef.Attributes.InputCurrent) {
          inputRef.Attributes.InputCurrent.forwardAcceleration = -1.0;
        }
      }, { passive: false });

      brakeBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (inputRef && inputRef.Attributes && inputRef.Attributes.InputCurrent) {
          inputRef.Attributes.InputCurrent.forwardAcceleration = 0;
        }
      }, { passive: false });
    }
  };

  // Setup touch firing
  const setupTouchFiring = () => {
    const fireBtn = document.getElementById('mobile-fire-btn');
    const canvas = document.getElementById('three-canvas');
    let fireInterval = null;

    const startFiring = () => {
      if (fireCallback && gameRef && !gameRef.isPaused && gameRef.gameStarted) {
        fireCallback();

        // Use the same fire rate logic as desktop
        const bonuses = getTotalBonuses();
        const baseFireRate = 150;
        const adjustedFireRate = baseFireRate / bonuses.fireRateMultiplier;

        fireInterval = setInterval(() => {
          if (gameRef && !gameRef.isPaused && gameRef.gameStarted) {
            fireCallback();
          }
        }, adjustedFireRate);
      }
    };

    const stopFiring = () => {
      if (fireInterval) {
        clearInterval(fireInterval);
        fireInterval = null;
      }
    };

    if (fireBtn) {
      fireBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startFiring();
      }, { passive: false });

      fireBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopFiring();
      }, { passive: false });
    }

    // Also fire when tapping the canvas (not on control buttons)
    if (canvas) {
      canvas.addEventListener('touchstart', (e) => {
        // Only fire if not touching a control button
        const target = e.target;
        if (target.id === 'three-canvas') {
          e.preventDefault();
          startFiring();
        }
      }, { passive: false });

      canvas.addEventListener('touchend', (e) => {
        stopFiring();
      }, { passive: false });
    }
  };

  // Recalibrate motion controls
  const recalibrate = () => {
    if (motionEnabled) {
      isCalibrated = false;
      console.log('[MOBILE] Motion controls will recalibrate on next reading');
    }
  };

  // Check if mobile controls are active
  const isActive = () => isMobile;
  const isMotionActive = () => motionEnabled;
  const isJoystickActive = () => joystickEnabled;

  return {
    init,
    detectMobile,
    recalibrate,
    requestLandscape,
    isActive,
    isMotionActive,
    isJoystickActive
  };
})();
