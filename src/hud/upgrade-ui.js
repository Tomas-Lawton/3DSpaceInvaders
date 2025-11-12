// Upgrade UI Manager
// Handles all interaction with the upgrade system in the pause menu

import {
  UPGRADE_SYSTEM,
  loadUpgradeState,
  canAfford,
  purchaseUpgrade,
  unlockShip,
  FREE_SHIPS_MODE
} from '../utils/upgrade-system.js';
import { getOres, getXP, setOres, deductXP } from '../components/dom.js';
import { switchModel, refreshDiagnostics } from './hud.js';

let currentlySelectedShip = 'ship-1';
let lastConfirmedShip = null; // Track the last ship that was actually confirmed for gameplay

// Initialize upgrade UI when page loads
export function initializeUpgradeUI() {
  loadUpgradeState();

  // Set up event listeners for upgrade buttons
  document.querySelectorAll('.upgrade-button').forEach(button => {
    button.addEventListener('click', handleUpgradeClick);
  });

  // Set up event listeners for ship selection
  document.querySelectorAll('.ship-option').forEach(shipEl => {
    shipEl.addEventListener('click', handleShipClick);
  });

  // Set up unlock ship button
  const unlockButton = document.getElementById('unlock-ship');
  if (unlockButton) {
    unlockButton.addEventListener('click', handleUnlockShip);
  }

  // Set up select ship button
  const selectButton = document.getElementById('select-ship');
  if (selectButton) {
    selectButton.addEventListener('click', handleSelectShip);
  }

  // Set up confirmation dialog buttons
  const confirmYes = document.getElementById('confirm-yes');
  const confirmNo = document.getElementById('confirm-no');
  const confirmDialog = document.getElementById('ship-confirm-dialog');

  if (confirmYes) {
    confirmYes.addEventListener('click', () => {
      const selectButton = document.getElementById('select-ship');
      const shipId = selectButton?.dataset.shipId || 'ship-1';
      console.log(`Ship ${shipId} selected for gameplay!`);
      // Update last confirmed ship
      lastConfirmedShip = shipId;
      // Hide dialog
      if (confirmDialog) confirmDialog.style.display = 'none';
      // This will be handled by the existing ship selection logic in hud.js
    });
  }

  if (confirmNo) {
    confirmNo.addEventListener('click', () => {
      // Just close the dialog
      if (confirmDialog) confirmDialog.style.display = 'none';
    });
  }

  // Set up keyboard navigation for ship selection and confirmation dialog
  document.addEventListener('keydown', handleShipNavigationKeys);
  document.addEventListener('keydown', handleConfirmDialogKeys);

  // Initial update
  updateAllUI();

  console.log('Upgrade UI initialized');
}

// Update all UI elements with current state
export function updateAllUI() {
  updateUpgradeButtons();
  updateShipStates();
  updateResourceDisplay();
}

// Update upgrade buttons based on current resources and levels
function updateUpgradeButtons() {
  const resources = getOres();
  const xp = getXP();

  Object.keys(UPGRADE_SYSTEM.upgrades).forEach(upgradeKey => {
    const upgrade = UPGRADE_SYSTEM.upgrades[upgradeKey];
    const upgradeEl = document.querySelector(`.upgrade-item[data-upgrade="${upgradeKey}"]`);

    if (!upgradeEl) return;

    const button = upgradeEl.querySelector('.upgrade-button');
    const currentLevelEl = upgradeEl.querySelector('.current-level');
    const progressBar = upgradeEl.querySelector('.level-progress');

    // Update level display
    if (currentLevelEl) {
      currentLevelEl.textContent = upgrade.currentLevel;
    }

    // Update progress bar
    if (progressBar) {
      const percentage = (upgrade.currentLevel / upgrade.maxLevel) * 100;
      progressBar.style.width = `${percentage}%`;
    }

    // Check if max level
    if (upgrade.currentLevel >= upgrade.maxLevel) {
      button.disabled = true;
      button.classList.add('max-level');
      return;
    } else {
      button.classList.remove('max-level');
    }

    // Update cost display for current level
    const cost = upgrade.costs[upgrade.currentLevel];
    const ironCost = upgradeEl.querySelector('.iron-cost');
    const goldCost = upgradeEl.querySelector('.gold-cost');
    const crystalCost = upgradeEl.querySelector('.crystal-cost');
    const xpCost = upgradeEl.querySelector('.xp-cost');

    if (ironCost) ironCost.textContent = cost.iron;
    if (goldCost) goldCost.textContent = cost.gold;
    if (crystalCost) crystalCost.textContent = cost.crystal;
    if (xpCost) xpCost.textContent = `XP: ${cost.xp}`;

    // Check if player can afford
    const affordable = canAfford(cost, resources, xp);
    button.disabled = !affordable;

    if (affordable) {
      button.style.borderColor = 'rgba(0, 255, 238, 0.5)';
    } else {
      button.style.borderColor = 'rgba(255, 100, 100, 0.5)';
    }
  });
}

// Update ship states (locked/unlocked)
function updateShipStates() {
  Object.keys(UPGRADE_SYSTEM.ships).forEach(shipId => {
    const ship = UPGRADE_SYSTEM.ships[shipId];
    const shipEl = document.getElementById(shipId);

    if (!shipEl) return;

    if (ship.unlocked) {
      shipEl.classList.remove('locked');
      shipEl.classList.add('unlocked');
      const lockIcon = shipEl.querySelector('.ship-lock-icon');
      if (lockIcon) lockIcon.textContent = '✓';
      const costLabel = shipEl.querySelector('.ship-cost-label');
      if (costLabel) costLabel.style.display = 'none';
    } else {
      shipEl.classList.add('locked');
      shipEl.classList.remove('unlocked');
    }
  });

  // Update select/unlock button visibility based on selected ship
  const selectedShip = UPGRADE_SYSTEM.ships[currentlySelectedShip];
  const unlockButton = document.getElementById('unlock-ship');
  const selectButton = document.getElementById('select-ship');

  if (selectedShip) {
    if (selectedShip.unlocked) {
      // Show select button, hide unlock button
      if (unlockButton) unlockButton.style.display = 'none';
      if (selectButton) selectButton.style.display = 'block';
    } else {
      // Show unlock button, hide select button
      if (selectButton) selectButton.style.display = 'none';
      if (unlockButton) {
        unlockButton.style.display = 'block';
        const resources = getOres();
        const xp = getXP();
        const affordable = canAfford(selectedShip.cost, resources, xp);
        unlockButton.disabled = !affordable;

        if (FREE_SHIPS_MODE) {
          unlockButton.textContent = 'UNLOCK - FREE';
        } else if (affordable) {
          unlockButton.textContent = `UNLOCK - ${selectedShip.cost.iron}🔩 ${selectedShip.cost.gold}🏆 ${selectedShip.cost.crystal}💎`;
        } else {
          unlockButton.textContent = 'INSUFFICIENT RESOURCES';
        }
      }
    }
  }
}

// Update resource display
function updateResourceDisplay() {
  const resources = getOres();
  const xp = getXP();

  // This is already handled by dom.js, but we can add additional displays if needed
  console.log(`Resources: Iron ${resources.iron}, Gold ${resources.gold}, Crystal ${resources.crystal}, XP ${xp}`);
}

// Handle upgrade button click
function handleUpgradeClick(event) {
  const button = event.currentTarget;
  const upgradeKey = button.dataset.upgrade;

  if (!upgradeKey || button.disabled) return;

  const resources = getOres();
  const xp = getXP();

  const result = purchaseUpgrade(upgradeKey, resources, xp);

  if (result.success) {
    // Deduct resources
    const newResources = {
      iron: resources.iron - result.cost.iron,
      gold: resources.gold - result.cost.gold,
      crystal: resources.crystal - result.cost.crystal
    };
    setOres(newResources.iron, newResources.gold, newResources.crystal);

    // Deduct XP
    deductXP(result.cost.xp);

    console.log(`Upgraded ${upgradeKey} to level ${result.newLevel}!`);

    // Visual feedback
    button.style.transform = 'scale(1.2)';
    button.style.boxShadow = '0 0 30px rgba(0, 255, 238, 0.8)';
    setTimeout(() => {
      button.style.transform = '';
      button.style.boxShadow = '';
      updateAllUI();
      // Refresh ship diagnostics to show new upgrade bonuses
      refreshDiagnostics();
    }, 300);
  } else {
    // Show error feedback
    button.style.borderColor = 'rgba(255, 0, 0, 0.8)';
    button.style.boxShadow = '0 0 20px rgba(255, 0, 0, 0.6)';
    setTimeout(() => {
      button.style.borderColor = '';
      button.style.boxShadow = '';
    }, 500);
    console.log(`Failed to upgrade: ${result.message}`);
  }
}

// Handle ship selection click
function handleShipClick(event) {
  const shipEl = event.currentTarget;
  const shipId = shipEl.id;

  selectShipById(shipId);
}

// Select ship by ID (can be called from keyboard or click)
function selectShipById(shipId) {
  const ship = UPGRADE_SYSTEM.ships[shipId];
  if (!ship) return;

  const shipEl = document.getElementById(shipId);
  if (!shipEl) return;

  // Allow selecting any ship to view it in the hangar
  currentlySelectedShip = shipId;

  // Update active state
  document.querySelectorAll('.ship-option').forEach(el => el.classList.remove('active'));
  shipEl.classList.add('active');

  // Update select button dataset
  const selectButton = document.getElementById('select-ship');
  if (selectButton) {
    selectButton.dataset.shipId = shipId;
  }

  // Switch the 3D model in the hangar
  console.log(`Switching to model: ${shipId}`);
  switchModel(shipId);

  updateShipStates();

  console.log(`Selected ship: ${shipId}`);
}

// Handle unlock ship button click
function handleUnlockShip() {
  const shipId = currentlySelectedShip;
  const resources = getOres();
  const xp = getXP();

  const result = unlockShip(shipId, resources, xp);

  if (result.success) {
    // Deduct resources
    const newResources = {
      iron: resources.iron - result.cost.iron,
      gold: resources.gold - result.cost.gold,
      crystal: resources.crystal - result.cost.crystal
    };
    setOres(newResources.iron, newResources.gold, newResources.crystal);

    // Deduct XP
    deductXP(result.cost.xp);

    console.log(`Unlocked ${shipId}!`);

    // Visual feedback
    const shipEl = document.getElementById(shipId);
    if (shipEl) {
      shipEl.style.transform = 'scale(1.3)';
      shipEl.style.boxShadow = '0 0 40px rgba(0, 255, 100, 1)';
      setTimeout(() => {
        shipEl.style.transform = '';
        shipEl.style.boxShadow = '';
        updateAllUI();
      }, 500);
    }
  } else {
    console.log(`Failed to unlock: ${result.message}`);
  }
}

// Handle select ship button (for actually equipping the ship in-game)
function handleSelectShip() {
  const selectButton = document.getElementById('select-ship');
  const shipId = selectButton?.dataset.shipId || 'ship-1';

  const ship = UPGRADE_SYSTEM.ships[shipId];

  if (!ship || !ship.unlocked) {
    // Show insufficient resources message
    const dialog = document.getElementById('ship-confirm-dialog');
    const confirmMessage = document.getElementById('confirm-message');

    confirmMessage.innerHTML = `
      <strong style="color: #ff4444;">SHIP LOCKED!</strong><br><br>
      This ship must be unlocked first.<br>
      Resources needed: ${ship?.cost.iron || 0}🔩 ${ship?.cost.gold || 0}🏆 ${ship?.cost.crystal || 0}💎<br>
      XP needed: ${ship?.cost.xp || 0}⭐
    `;

    if (dialog) {
      dialog.style.display = 'flex';
      // Hide yes button, only show no button
      document.getElementById('confirm-yes').style.display = 'none';
      document.getElementById('confirm-no').textContent = 'OK';
    }

    console.log('Cannot select locked ship - unlock it first!');
    return;
  }

  // Skip confirmation for ship-1 only if it's the initial selection or already using ship-1
  if (shipId === 'ship-1' && (lastConfirmedShip === null || lastConfirmedShip === 'ship-1')) {
    console.log(`Ship ${shipId} selected for gameplay! (initial selection or reselecting)`);
    lastConfirmedShip = 'ship-1';
    // This will be handled by the existing ship selection logic in hud.js
    return;
  }

  // Show confirmation dialog for all ship changes
  const dialog = document.getElementById('ship-confirm-dialog');
  const confirmMessage = document.getElementById('confirm-message');

  confirmMessage.innerHTML = `
    Select <strong style="color: #00ffee;">${ship.name}</strong> as your active ship?
  `;

  if (dialog) {
    dialog.style.display = 'flex';
    // Show both buttons
    const confirmYes = document.getElementById('confirm-yes');
    const confirmNo = document.getElementById('confirm-no');
    confirmYes.style.display = 'inline-block';
    confirmNo.textContent = 'NO';

    // Reset focus to Yes button
    confirmDialogFocusIndex = 0;
    confirmYes.classList.add('focused');
    confirmNo.classList.remove('focused');
  }
}

// Handle keyboard navigation for ship selection
function handleShipNavigationKeys(event) {
  // Don't handle if confirm dialog is visible
  const confirmDialog = document.getElementById('ship-confirm-dialog');
  if (confirmDialog && confirmDialog.style.display !== 'none') {
    return;
  }

  // Only handle keys when pause menu is visible
  const controlUI = document.getElementById('control-ui');
  if (!controlUI || controlUI.style.display === 'none') {
    return;
  }

  // Get all ship options
  const shipOptions = Array.from(document.querySelectorAll('.ship-option'));
  if (shipOptions.length === 0) return;

  const currentIndex = shipOptions.findIndex(el => el.classList.contains('active'));

  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    // Move to previous ship
    if (currentIndex > 0) {
      const prevShip = shipOptions[currentIndex - 1];
      selectShipById(prevShip.id);
    }
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    // Move to next ship
    if (currentIndex < shipOptions.length - 1) {
      const nextShip = shipOptions[currentIndex + 1];
      selectShipById(nextShip.id);
    }
  } else if (event.key === 'Enter') {
    event.preventDefault();
    // Trigger select or unlock button based on ship state
    const selectedShip = UPGRADE_SYSTEM.ships[currentlySelectedShip];
    if (selectedShip) {
      if (selectedShip.unlocked) {
        handleSelectShip();
      } else {
        handleUnlockShip();
      }
    }
  }
}

// Track which button is currently focused in the confirmation dialog
let confirmDialogFocusIndex = 0; // 0 for Yes, 1 for No

// Handle keyboard navigation for confirmation dialog
function handleConfirmDialogKeys(event) {
  const confirmDialog = document.getElementById('ship-confirm-dialog');

  // Only handle if dialog is visible
  if (!confirmDialog || confirmDialog.style.display === 'none') {
    return;
  }

  const confirmYes = document.getElementById('confirm-yes');
  const confirmNo = document.getElementById('confirm-no');

  // Check if both buttons are visible (not in "locked ship" mode)
  const bothButtonsVisible = confirmYes && confirmNo &&
    confirmYes.style.display !== 'none' &&
    confirmNo.textContent === 'NO';

  if (!bothButtonsVisible) {
    // Only "OK" button visible - just handle Enter/Escape
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
      event.preventDefault();
      if (confirmNo) confirmNo.click();
    }
    return;
  }

  // Handle arrow keys to switch focus
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    confirmDialogFocusIndex = confirmDialogFocusIndex === 0 ? 1 : 0;

    // Update visual focus
    if (confirmDialogFocusIndex === 0) {
      confirmYes.classList.add('focused');
      confirmNo.classList.remove('focused');
    } else {
      confirmYes.classList.remove('focused');
      confirmNo.classList.add('focused');
    }
  }
  // Handle Enter to select
  else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    if (confirmDialogFocusIndex === 0) {
      confirmYes.click();
    } else {
      confirmNo.click();
    }
    // Reset focus index
    confirmDialogFocusIndex = 0;
  }
  // Handle Escape to cancel
  else if (event.key === 'Escape') {
    event.preventDefault();
    confirmNo.click();
    // Reset focus index
    confirmDialogFocusIndex = 0;
  }
}

// Function to be called when pause menu opens
export function onPauseMenuOpen() {
  updateAllUI();
  // Refresh diagnostics to show current ship + upgrades
  refreshDiagnostics();
}

// Export for testing/debugging
export function giveTestResources() {
  setOres(500, 300, 150);
  // Set XP directly (we might need to add setXP function)
  console.log('Test resources granted: 500 Iron, 300 Gold, 150 Crystal');
  console.log('Use addXP(amount) to add XP for testing');
  updateAllUI();
}

// Make it globally available for testing
if (typeof window !== 'undefined') {
  window.giveTestResources = giveTestResources;
  window.upgradeUI = {
    updateAllUI,
    onPauseMenuOpen,
    giveTestResources
  };
}
