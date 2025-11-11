// Upgrade System for Space Invaders
// Manages ship upgrades and unlocks

// ========================================
// TESTING TOGGLE - Set to true to unlock all ships for free
// ========================================
export const FREE_SHIPS_MODE = true;

export const UPGRADE_SYSTEM = {
  // Ship unlock costs (XP and resources required)
  ships: {
    'ship-1': {
      name: 'STARTER',
      unlocked: true,
      cost: { iron: 0, gold: 0, crystal: 0, xp: 0 },
      stats: { speed: 1.0, health: 1.0, fireRate: 1.0 }
    },
    'ship-2': {
      name: 'SCOUT',
      unlocked: false,
      cost: { iron: 2, gold: 1, crystal: 1, xp: 20 }, // TESTING: reduced from 50/20/5/500
      stats: { speed: 1.3, health: 0.9, fireRate: 1.1 }
    },
    'ship-3': {
      name: 'FIGHTER',
      unlocked: false,
      cost: { iron: 3, gold: 2, crystal: 1, xp: 40 }, // TESTING: reduced from 100/50/15/1500
      stats: { speed: 1.1, health: 1.3, fireRate: 1.4 }
    },
    'ship-4': {
      name: 'HEAVY',
      unlocked: false,
      cost: { iron: 4, gold: 3, crystal: 2, xp: 60 }, // TESTING: reduced from 150/80/30/3000
      stats: { speed: 0.8, health: 1.8, fireRate: 1.2 }
    },
    'ship-5': {
      name: 'INTERCEPTOR',
      unlocked: false,
      cost: { iron: 5, gold: 4, crystal: 2, xp: 80 }, // TESTING: reduced from 200/120/50/5000
      stats: { speed: 1.5, health: 1.0, fireRate: 1.6 }
    },
    'ship-6': {
      name: 'CAPITAL',
      unlocked: false,
      cost: { iron: 6, gold: 5, crystal: 3, xp: 100 }, // TESTING: reduced from 300/200/100/10000
      stats: { speed: 0.9, health: 2.0, fireRate: 1.8 }
    }
  },

  // Upgrade categories and their levels
  upgrades: {
    speed: {
      name: 'Engine Boost',
      description: 'Increase max velocity',
      maxLevel: 5,
      currentLevel: 0,
      costs: [
        { iron: 20, gold: 10, crystal: 5, xp: 200 },
        { iron: 40, gold: 20, crystal: 10, xp: 500 },
        { iron: 80, gold: 40, crystal: 20, xp: 1000 },
        { iron: 120, gold: 60, crystal: 30, xp: 2000 },
        { iron: 200, gold: 100, crystal: 50, xp: 4000 }
      ],
      bonusPerLevel: 0.15 // 15% increase per level
    },
    health: {
      name: 'Hull Reinforcement',
      description: 'Increase max health',
      maxLevel: 5,
      currentLevel: 0,
      costs: [
        { iron: 30, gold: 15, crystal: 5, xp: 300 },
        { iron: 60, gold: 30, crystal: 10, xp: 600 },
        { iron: 100, gold: 50, crystal: 20, xp: 1200 },
        { iron: 150, gold: 75, crystal: 35, xp: 2500 },
        { iron: 250, gold: 125, crystal: 60, xp: 5000 }
      ],
      bonusPerLevel: 20 // +20 HP per level
    },
    fireRate: {
      name: 'Weapon System',
      description: 'Faster laser fire rate',
      maxLevel: 5,
      currentLevel: 0,
      costs: [
        { iron: 15, gold: 20, crystal: 10, xp: 250 },
        { iron: 30, gold: 40, crystal: 20, xp: 600 },
        { iron: 60, gold: 80, crystal: 40, xp: 1300 },
        { iron: 100, gold: 120, crystal: 60, xp: 2800 },
        { iron: 180, gold: 200, crystal: 100, xp: 6000 }
      ],
      bonusPerLevel: 0.1 // 10% faster per level
    },
    shields: {
      name: 'Shield Generator',
      description: 'Damage reduction system',
      maxLevel: 3,
      currentLevel: 0,
      costs: [
        { iron: 50, gold: 50, crystal: 25, xp: 800 },
        { iron: 100, gold: 100, crystal: 50, xp: 2000 },
        { iron: 200, gold: 200, crystal: 100, xp: 5000 }
      ],
      bonusPerLevel: 0.15 // 15% damage reduction per level
    }
  }
};

// Get current saved state from localStorage
export function loadUpgradeState() {
  const saved = localStorage.getItem('spaceInvadersUpgrades');
  if (saved) {
    const state = JSON.parse(saved);
    // Merge saved state with default structure
    Object.keys(state.ships || {}).forEach(shipId => {
      if (UPGRADE_SYSTEM.ships[shipId]) {
        UPGRADE_SYSTEM.ships[shipId].unlocked = state.ships[shipId].unlocked;
      }
    });
    Object.keys(state.upgrades || {}).forEach(upgradeKey => {
      if (UPGRADE_SYSTEM.upgrades[upgradeKey]) {
        UPGRADE_SYSTEM.upgrades[upgradeKey].currentLevel = state.upgrades[upgradeKey].currentLevel;
      }
    });
  }
}

// Save current state to localStorage
export function saveUpgradeState() {
  const state = {
    ships: {},
    upgrades: {}
  };

  Object.keys(UPGRADE_SYSTEM.ships).forEach(shipId => {
    state.ships[shipId] = { unlocked: UPGRADE_SYSTEM.ships[shipId].unlocked };
  });

  Object.keys(UPGRADE_SYSTEM.upgrades).forEach(upgradeKey => {
    state.upgrades[upgradeKey] = { currentLevel: UPGRADE_SYSTEM.upgrades[upgradeKey].currentLevel };
  });

  localStorage.setItem('spaceInvadersUpgrades', JSON.stringify(state));
}

// Check if player can afford an upgrade
export function canAfford(cost, resources, xp) {
  // In FREE_SHIPS_MODE, all costs are considered free
  if (FREE_SHIPS_MODE) {
    return true;
  }

  return cost.iron <= resources.iron &&
         cost.gold <= resources.gold &&
         cost.crystal <= resources.crystal &&
         cost.xp <= xp;
}

// Purchase an upgrade
export function purchaseUpgrade(upgradeKey, resources, xp) {
  const upgrade = UPGRADE_SYSTEM.upgrades[upgradeKey];
  if (!upgrade) return { success: false, message: 'Invalid upgrade' };

  if (upgrade.currentLevel >= upgrade.maxLevel) {
    return { success: false, message: 'Max level reached' };
  }

  const cost = upgrade.costs[upgrade.currentLevel];
  if (!canAfford(cost, resources, xp)) {
    return { success: false, message: 'Insufficient resources' };
  }

  upgrade.currentLevel++;
  saveUpgradeState();

  return {
    success: true,
    newLevel: upgrade.currentLevel,
    cost: cost
  };
}

// Unlock a ship
export function unlockShip(shipId, resources, xp) {
  const ship = UPGRADE_SYSTEM.ships[shipId];
  if (!ship) return { success: false, message: 'Invalid ship' };

  if (ship.unlocked) {
    return { success: false, message: 'Already unlocked' };
  }

  if (!canAfford(ship.cost, resources, xp)) {
    return { success: false, message: 'Insufficient resources' };
  }

  ship.unlocked = true;
  saveUpgradeState();

  // In FREE_SHIPS_MODE, return zero cost so no resources are deducted
  const actualCost = FREE_SHIPS_MODE
    ? { iron: 0, gold: 0, crystal: 0, xp: 0 }
    : ship.cost;

  return {
    success: true,
    cost: actualCost
  };
}

// Get total stat bonuses from upgrades
export function getTotalBonuses() {
  return {
    speedMultiplier: 1 + (UPGRADE_SYSTEM.upgrades.speed.currentLevel * UPGRADE_SYSTEM.upgrades.speed.bonusPerLevel),
    healthBonus: UPGRADE_SYSTEM.upgrades.health.currentLevel * UPGRADE_SYSTEM.upgrades.health.bonusPerLevel,
    fireRateMultiplier: 1 + (UPGRADE_SYSTEM.upgrades.fireRate.currentLevel * UPGRADE_SYSTEM.upgrades.fireRate.bonusPerLevel),
    damageReduction: UPGRADE_SYSTEM.upgrades.shields.currentLevel * UPGRADE_SYSTEM.upgrades.shields.bonusPerLevel
  };
}
