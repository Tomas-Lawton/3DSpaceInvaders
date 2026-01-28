// Mobile Input Handler
// Detects mobile devices and shows a message that the game requires a larger device

export const mobileInput = (() => {
  let isMobile = false;

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

  // Show unsupported device message
  const showUnsupportedMessage = () => {
    // Hide all game UI
    const progressContainer = document.getElementById('progress-container');
    const introScreen = document.getElementById('intro-screen');
    if (progressContainer) progressContainer.style.display = 'none';
    if (introScreen) introScreen.style.display = 'none';

    // Show the unsupported device screen
    const unsupportedScreen = document.getElementById('unsupported-device-screen');
    if (unsupportedScreen) {
      unsupportedScreen.style.display = 'flex';
    }
  };

  // Initialize - just detect and show message if mobile
  const init = (playerInput, onFire, game) => {
    if (!detectMobile()) {
      console.log('[MOBILE] Desktop detected, game can proceed');
      return false;
    }

    console.log('[MOBILE] Mobile/small device detected - game not supported');
    showUnsupportedMessage();
    return true; // Return true to indicate mobile was detected
  };

  // Stub functions for compatibility
  const requestLandscape = () => {};
  const recalibrate = () => {};
  const isActive = () => isMobile;
  const isMotionActive = () => false;
  const isJoystickActive = () => false;

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
