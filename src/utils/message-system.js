// Message and Quest System
// Manages hints, quests, and notifications for the player

export const MESSAGE_SYSTEM = {
  messages: [],
  currentMessage: null,
  unreadCount: 0,
  quests: []
};

// Message types
export const MessageType = {
  HINT: 'hint',
  QUEST: 'quest',
  WARNING: 'warning',
  SUCCESS: 'success',
  INFO: 'info'
};

// Quest status
export const QuestStatus = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// Predefined messages and quests
export const MESSAGES = {
  welcome: {
    id: 'welcome',
    type: MessageType.INFO,
    title: 'MISSION INFO',
    lines: [
      'Welcome to the Space Defense Force.',
      'Your mission: Save planets from invasion.',
      '',
      '→ Fly to nearby planets (< 1500km)',
      '→ Destroy enemy ships attacking them',
      '→ Collect resources and XP',
      '',
      'Press ESC to view upgrades and ships.'
    ],
    icon: '🚀',
    read: false,
    timestamp: Date.now()
  },

  tutorialComplete: {
    id: 'tutorialComplete',
    type: MessageType.QUEST,
    title: 'MISSION: DEFEND THE SECTOR',
    lines: [
      'Training complete! Your orders:',
      '',
      '→ Save 3 planets from enemy attack',
      '→ Collect 10 iron from asteroids',
      '→ Reach 100 XP to unlock upgrades',
      '',
      'CYAN markers = Planets in danger',
      'BLUE markers = Asteroid fields',
      '',
      'Press ESC for upgrades & new ships.'
    ],
    icon: '🎯',
    read: false,
    timestamp: Date.now()
  },

  firstPlanet: {
    id: 'firstPlanet',
    type: MessageType.HINT,
    title: 'Planet Detected',
    lines: [
      'PLANET UNDER ATTACK!',
      '',
      'Enemy forces detected near planet.',
      'Get within 1500km to engage.',
      '',
      'TIP: Check direction indicators',
      'around your screen edge for guidance.'
    ],
    icon: '🌍',
    read: false,
    timestamp: Date.now()
  },

  firstEnemy: {
    id: 'firstEnemy',
    type: MessageType.WARNING,
    title: 'Combat Engaged',
    lines: [
      'ENEMIES DETECTED!',
      '',
      'Enemies prioritize attacking the planet.',
      'Shoot them down before planet HP depletes.',
      '',
      '⚔️ SPACEBAR to fire lasers',
      '🎯 Eliminate all enemies to save planet',
      '❤️ Reward: +50 HP if planet survives'
    ],
    icon: '⚠️',
    read: false,
    timestamp: Date.now()
  },

  planetSaved: {
    id: 'planetSaved',
    type: MessageType.SUCCESS,
    title: 'Planet Saved!',
    lines: [
      'EXCELLENT WORK, PILOT!',
      '',
      'You cleared all enemies.',
      'The planet is safe.',
      '',
      '+50 HP Reward',
      '',
      'Continue to other planets in need!'
    ],
    icon: '✓',
    read: false,
    timestamp: Date.now()
  },

  planetDestroyed: {
    id: 'planetDestroyed',
    type: MessageType.WARNING,
    title: 'Planet Lost',
    lines: [
      'PLANET DESTROYED',
      '',
      'The planet could not be saved.',
      'Enemies are now targeting YOU!',
      '',
      'Stay alert and keep fighting.',
      'More planets need your help.'
    ],
    icon: '💥',
    read: false,
    timestamp: Date.now()
  },

  lowHealth: {
    id: 'lowHealth',
    type: MessageType.WARNING,
    title: 'Critical Damage',
    lines: [
      'WARNING: HULL INTEGRITY LOW',
      '',
      'Your ship has taken heavy damage.',
      '',
      '→ Avoid enemy fire',
      '→ Save planets for +50 HP',
      '→ Consider upgrading Hull Reinforcement'
    ],
    icon: '🚨',
    read: false,
    timestamp: Date.now()
  },

  upgradeAvailable: {
    id: 'upgradeAvailable',
    type: MessageType.HINT,
    title: 'Upgrades Available',
    lines: [
      'YOU HAVE ENOUGH RESOURCES!',
      '',
      'Press ESC to open upgrade menu.',
      '',
      'Available upgrades:',
      '⚡ Engine Boost - Faster speed',
      '🛡️ Hull Reinforcement - More HP',
      '🔫 Weapon System - Faster fire rate'
    ],
    icon: '⬆️',
    read: false,
    timestamp: Date.now()
  },

  shipUnlockable: {
    id: 'shipUnlockable',
    type: MessageType.HINT,
    title: 'New Ship Available',
    lines: [
      'NEW SHIP UNLOCKABLE!',
      '',
      'You have enough resources to',
      'unlock a new ship model.',
      '',
      'Press ESC → Select locked ship',
      '→ Click UNLOCK SHIP button',
      '',
      'Each ship has unique stats!'
    ],
    icon: '🛸',
    read: false,
    timestamp: Date.now()
  },

  resourcesFull: {
    id: 'resourcesFull',
    type: MessageType.SUCCESS,
    title: 'Resources Collected',
    lines: [
      'RESOURCE HAUL COMPLETE',
      '',
      'Iron, Gold, and Crystal collected.',
      '',
      'Use these to:',
      '→ Unlock new ships',
      '→ Purchase upgrades',
      '→ Enhance your combat ability'
    ],
    icon: '💎',
    read: false,
    timestamp: Date.now()
  },

  warpSpeed: {
    id: 'warpSpeed',
    type: MessageType.INFO,
    title: 'Warp Drive Active',
    lines: [
      'MAXIMUM VELOCITY REACHED',
      '',
      'Your ship is moving at high speed.',
      'Notice the warp effect on screen.',
      '',
      'TIP: Hold W to maintain speed',
      'Release to slow down'
    ],
    icon: '💫',
    read: false,
    timestamp: Date.now()
  }
};

// Quest definitions
export const QUESTS = {
  tutorial: {
    id: 'tutorial',
    title: 'Tutorial: First Steps',
    description: 'Learn the basics of space combat',
    objectives: [
      { id: 'fly', text: 'Fly your ship (WASD)', completed: false },
      { id: 'shoot', text: 'Fire your weapons (SPACEBAR)', completed: false },
      { id: 'planet', text: 'Approach a planet', completed: false }
    ],
    rewards: {
      xp: 100,
      iron: 20,
      gold: 10,
      crystal: 5
    },
    status: QuestStatus.ACTIVE
  },

  savePlanet: {
    id: 'savePlanet',
    title: 'Planetary Defense',
    description: 'Save a planet from enemy attack',
    objectives: [
      { id: 'engage', text: 'Engage enemy forces', completed: false },
      { id: 'destroy', text: 'Destroy 5 enemy ships', completed: false, progress: 0, target: 5 },
      { id: 'survive', text: 'Keep planet alive', completed: false }
    ],
    rewards: {
      xp: 500,
      iron: 50,
      gold: 25,
      crystal: 10
    },
    status: QuestStatus.ACTIVE
  }
};

// Load state from localStorage
export function loadMessageState() {
  const saved = localStorage.getItem('spaceInvadersMessages');
  if (saved) {
    try {
      const state = JSON.parse(saved);
      MESSAGE_SYSTEM.messages = state.messages || [];
      MESSAGE_SYSTEM.unreadCount = state.unreadCount || 0;
      MESSAGE_SYSTEM.quests = state.quests || [];

      // Update current message if it exists
      if (state.currentMessage) {
        MESSAGE_SYSTEM.currentMessage = MESSAGES[state.currentMessage];
      }
    } catch (e) {
      console.error('Failed to load message state:', e);
    }
  } else {
    // First time - show welcome message
    showMessage('welcome');
  }
}

// Save state to localStorage
export function saveMessageState() {
  const state = {
    messages: MESSAGE_SYSTEM.messages,
    unreadCount: MESSAGE_SYSTEM.unreadCount,
    currentMessage: MESSAGE_SYSTEM.currentMessage?.id,
    quests: MESSAGE_SYSTEM.quests
  };
  localStorage.setItem('spaceInvadersMessages', JSON.stringify(state));
}

// Show a message to the player
export function showMessage(messageId) {
  const message = MESSAGES[messageId];
  if (!message) {
    console.warn(`Message ${messageId} not found`);
    return;
  }

  // Don't show if already in recent messages
  const existing = MESSAGE_SYSTEM.messages.find(m => m.id === messageId);
  if (existing && Date.now() - existing.timestamp < 60000) {
    // Same message within 1 minute, skip
    return;
  }

  // Create new message instance
  const newMessage = {
    ...message,
    timestamp: Date.now(),
    read: false
  };

  MESSAGE_SYSTEM.messages.unshift(newMessage);
  MESSAGE_SYSTEM.currentMessage = newMessage;
  MESSAGE_SYSTEM.unreadCount++;

  // Keep only last 10 messages
  if (MESSAGE_SYSTEM.messages.length > 10) {
    MESSAGE_SYSTEM.messages = MESSAGE_SYSTEM.messages.slice(0, 10);
  }

  saveMessageState();

  console.log(`📬 New message: ${message.title}`);
  return newMessage;
}

// Mark current message as read
export function markCurrentMessageRead() {
  if (MESSAGE_SYSTEM.currentMessage && !MESSAGE_SYSTEM.currentMessage.read) {
    MESSAGE_SYSTEM.currentMessage.read = true;
    MESSAGE_SYSTEM.unreadCount = Math.max(0, MESSAGE_SYSTEM.unreadCount - 1);
    saveMessageState();
  }
}

// Mark all messages as read
export function markAllMessagesRead() {
  MESSAGE_SYSTEM.messages.forEach(m => m.read = true);
  MESSAGE_SYSTEM.unreadCount = 0;
  saveMessageState();
}

// Get current message
export function getCurrentMessage() {
  return MESSAGE_SYSTEM.currentMessage || MESSAGES.welcome;
}

// Get unread count
export function getUnreadCount() {
  return MESSAGE_SYSTEM.unreadCount;
}

// Quest management
export function updateQuestProgress(questId, objectiveId, progress) {
  const quest = MESSAGE_SYSTEM.quests.find(q => q.id === questId);
  if (!quest) return;

  const objective = quest.objectives.find(o => o.id === objectiveId);
  if (!objective) return;

  if (objective.target) {
    objective.progress = Math.min(progress, objective.target);
    objective.completed = objective.progress >= objective.target;
  } else {
    objective.completed = true;
  }

  // Check if all objectives completed
  const allCompleted = quest.objectives.every(o => o.completed);
  if (allCompleted && quest.status === QuestStatus.ACTIVE) {
    completeQuest(questId);
  }

  saveMessageState();
}

export function completeQuest(questId) {
  const quest = MESSAGE_SYSTEM.quests.find(q => q.id === questId);
  if (!quest) return;

  quest.status = QuestStatus.COMPLETED;

  console.log(`✓ Quest completed: ${quest.title}`);
  console.log(`Rewards: ${quest.rewards.xp} XP, ${quest.rewards.iron} Iron, ${quest.rewards.gold} Gold, ${quest.rewards.crystal} Crystal`);

  // Give rewards (will need to import from dom.js)
  saveMessageState();

  return quest.rewards;
}

// Initialize a quest
export function startQuest(questId) {
  const questTemplate = QUESTS[questId];
  if (!questTemplate) return;

  // Don't start if already active
  const existing = MESSAGE_SYSTEM.quests.find(q => q.id === questId);
  if (existing) return;

  MESSAGE_SYSTEM.quests.push({ ...questTemplate });
  saveMessageState();

  console.log(`📋 New quest: ${questTemplate.title}`);
}

// Get active quests
export function getActiveQuests() {
  return MESSAGE_SYSTEM.quests.filter(q => q.status === QuestStatus.ACTIVE);
}
