// Upgrade UI Manager
// Handles all interaction with the upgrade system in the pause menu

import {
  UPGRADE_SYSTEM,
  loadUpgradeState,
  saveUpgradeState,
  canAfford,
  purchaseUpgrade,
  unlockShip
} from '../utils/upgrade-system.js';
import { getOres, getXP, setOres, deductXP } from '../components/dom.js';

let currentlySelectedShip = 'ship-1';

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

  // Update unlock button visibility
  const selectedShip = UPGRADE_SYSTEM.ships[currentlySelectedShip];
  const unlockButton = document.getElementById('unlock-ship');

  if (unlockButton && selectedShip) {
    if (selectedShip.unlocked) {
      unlockButton.style.display = 'none';
    } else {
      unlockButton.style.display = 'block';
      const resources = getOres();
      const xp = getXP();
      const affordable = canAfford(selectedShip.cost, resources, xp);
      unlockButton.disabled = !affordable;

      if (affordable) {
        unlockButton.textContent = `UNLOCK - ${selectedShip.cost.iron}🔩 ${selectedShip.cost.gold}🏆 ${selectedShip.cost.crystal}💎`;
      } else {
        unlockButton.textContent = 'INSUFFICIENT RESOURCES';
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

  // Only allow selection of unlocked ships
  const ship = UPGRADE_SYSTEM.ships[shipId];
  if (!ship || !ship.unlocked) {
    // If locked, select it to show unlock button
    currentlySelectedShip = shipId;

    // Update active state
    document.querySelectorAll('.ship-option').forEach(el => el.classList.remove('active'));
    shipEl.classList.add('active');

    updateShipStates();
    return;
  }

  // Select the ship
  currentlySelectedShip = shipId;

  // Update active state
  document.querySelectorAll('.ship-option').forEach(el => el.classList.remove('active'));
  shipEl.classList.add('active');

  // Update select button dataset
  const selectButton = document.getElementById('select-ship');
  if (selectButton) {
    selectButton.dataset.shipId = shipId;
  }

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
    console.log('Cannot select locked ship');
    return;
  }

  console.log(`Ship ${shipId} selected for gameplay!`);
  // This will be handled by the existing ship selection logic in hud.js
}

// Function to be called when pause menu opens
export function onPauseMenuOpen() {
  updateAllUI();
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
