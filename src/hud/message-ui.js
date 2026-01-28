// Message UI Controller
// Handles displaying messages, quests, and alerts in the HUD

import {
  loadMessageState,
  getCurrentMessage,
  getUnreadCount,
  showMessage,
  markCurrentMessageRead,
  markAllMessagesRead,
  MESSAGE_SYSTEM,
  getActiveQuests,
  startQuest
} from '../utils/message-system.js';

let currentMessageIndex = 0;

// Initialize message UI
export function initializeMessageUI() {
  loadMessageState();

  // Set up event listeners
  const prevBtn = document.getElementById('prev-message');
  const nextBtn = document.getElementById('next-message');
  const alertBox = document.getElementById('message-alert');

  if (prevBtn) {
    prevBtn.addEventListener('click', showPreviousMessage);
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', showNextMessage);
  }

  if (alertBox) {
    alertBox.addEventListener('click', () => {
      // Pause game and open pause menu when clicking alert
      if (window.toggleGamePause) {
        window.toggleGamePause(true); // Force pause
      }
      import('../components/dom.js').then(module => {
        module.toggleHUD();
        // Mark messages as read and hide alert
        markAllMessagesRead();
        updateAlertDisplay();
      });
    });
  }

  // Initialize with first message
  updateMessageDisplay();
  updateAlertDisplay();
  updateQuestDisplay();

  console.log('Message UI initialized');
}

// Update message display in info box
function updateMessageDisplay() {
  const messageBody = document.getElementById('message-body');
  const messageIcon = document.querySelector('.message-icon');
  const messageTitle = document.querySelector('.message-title');
  const messageCounter = document.getElementById('message-counter');
  const prevBtn = document.getElementById('prev-message');
  const nextBtn = document.getElementById('next-message');

  if (!messageBody) return;

  // Get messages
  const messages = MESSAGE_SYSTEM.messages;
  if (messages.length === 0) {
    // Show welcome message if no messages
    const welcomeMsg = getCurrentMessage();
    displayMessage(welcomeMsg);
    return;
  }

  // Ensure index is valid
  currentMessageIndex = Math.max(0, Math.min(currentMessageIndex, messages.length - 1));

  const currentMsg = messages[currentMessageIndex];
  displayMessage(currentMsg);

  // Update counter
  if (messageCounter) {
    messageCounter.textContent = `${currentMessageIndex + 1} / ${messages.length}`;
  }

  // Update navigation buttons
  if (prevBtn) {
    prevBtn.disabled = currentMessageIndex === 0;
  }
  if (nextBtn) {
    nextBtn.disabled = currentMessageIndex >= messages.length - 1;
  }
}

// Display a specific message
function displayMessage(message) {
  const messageBody = document.getElementById('message-body');
  const messageIcon = document.querySelector('.message-icon');
  const messageTitle = document.querySelector('.message-title');

  if (!messageBody || !message) return;

  // Update header
  if (messageIcon) {
    messageIcon.textContent = message.icon || '📬';
  }

  if (messageTitle) {
    messageTitle.textContent = message.title || 'Message';
  }

  // Update body
  messageBody.innerHTML = '';
  if (message.lines) {
    message.lines.forEach(line => {
      const p = document.createElement('p');
      if (line.startsWith('→') || line.startsWith('•') || line.startsWith('⚔️') || line.startsWith('🎯') || line.startsWith('❤️')) {
        p.className = 'info-text-highlight';
      } else {
        p.className = 'info-text';
      }
      p.textContent = line;
      messageBody.appendChild(p);
    });
  }

  // Mark as read when displayed in pause menu
  if (!message.read) {
    message.read = true;
    MESSAGE_SYSTEM.unreadCount = Math.max(0, MESSAGE_SYSTEM.unreadCount - 1);
    updateAlertDisplay();
  }
}

// Show previous message
function showPreviousMessage() {
  if (currentMessageIndex > 0) {
    currentMessageIndex--;
    updateMessageDisplay();
  }
}

// Show next message
function showNextMessage() {
  if (currentMessageIndex < MESSAGE_SYSTEM.messages.length - 1) {
    currentMessageIndex++;
    updateMessageDisplay();
  }
}

// Update alert notification (in-game)
export function updateAlertDisplay() {
  const alertBox = document.getElementById('message-alert');
  const alertBadge = document.querySelector('.alert-badge');
  const alertTitle = document.querySelector('.alert-title');
  const alertText = document.querySelector('.alert-text');

  if (!alertBox) return;

  const unreadCount = getUnreadCount();

  if (unreadCount > 0) {
    alertBox.style.display = 'flex';
    if (alertBadge) {
      alertBadge.textContent = unreadCount;
    }
    // Update alert with latest message title and content
    const latestMessage = MESSAGE_SYSTEM.messages[0];
    if (latestMessage) {
      if (alertTitle) {
        alertTitle.textContent = latestMessage.title || 'NEW MESSAGE';
      }
      if (alertText && latestMessage.lines) {
        // Show first non-empty line as preview
        const preview = latestMessage.lines.find(line => line && line.trim()) || '';
        alertText.textContent = preview;
      }
    }
  } else {
    alertBox.style.display = 'none';
  }
}

// Update quest tracker display
function updateQuestDisplay() {
  const questTracker = document.getElementById('quest-tracker');
  const questList = document.getElementById('quest-list');

  if (!questTracker || !questList) return;

  const activeQuests = getActiveQuests();

  if (activeQuests.length === 0) {
    questTracker.style.display = 'none';
    return;
  }

  questTracker.style.display = 'block';
  questList.innerHTML = '';

  activeQuests.forEach(quest => {
    const questItem = document.createElement('div');
    questItem.className = 'quest-item';

    const questTitle = document.createElement('div');
    questTitle.className = 'quest-item-title';
    questTitle.textContent = quest.title;
    questItem.appendChild(questTitle);

    quest.objectives.forEach(objective => {
      const objDiv = document.createElement('div');
      objDiv.className = `quest-objective ${objective.completed ? 'completed' : ''}`;

      const icon = document.createElement('span');
      icon.className = 'quest-objective-icon';
      icon.textContent = objective.completed ? '✓' : '○';
      objDiv.appendChild(icon);

      const text = document.createElement('span');
      if (objective.target) {
        text.textContent = `${objective.text} (${objective.progress || 0}/${objective.target})`;
      } else {
        text.textContent = objective.text;
      }
      objDiv.appendChild(text);

      questItem.appendChild(objDiv);

      // Add progress bar if has target
      if (objective.target) {
        const progressBar = document.createElement('div');
        progressBar.className = 'quest-progress-bar';
        const progressFill = document.createElement('div');
        progressFill.className = 'quest-progress-fill';
        const percentage = ((objective.progress || 0) / objective.target) * 100;
        progressFill.style.width = `${percentage}%`;
        progressBar.appendChild(progressFill);
        questItem.appendChild(progressBar);
      }
    });

    questList.appendChild(questItem);
  });
}

// Public function to show a new message
export function triggerMessage(messageId) {
  const message = showMessage(messageId);
  if (message) {
    // Reset to show newest message
    currentMessageIndex = 0;
    // Show alert first - don't call updateMessageDisplay() here as it marks messages as read
    // The pause menu will call updateMessageDisplay() when opened
    updateAlertDisplay();
  }
}

// Public function to update when pause menu opens
export function onPauseMenuOpenMessage() {
  updateMessageDisplay();
  updateQuestDisplay();
  markAllMessagesRead();
  updateAlertDisplay();
}

// Public functions to update quest progress
export function updateQuestUI() {
  updateQuestDisplay();
}

// Make available globally for testing
if (typeof window !== 'undefined') {
  window.messageUI = {
    triggerMessage,
    updateMessageDisplay,
    updateQuestDisplay,
    showMessage: (id) => triggerMessage(id),
    startQuest
  };
}
