# 🚀 3D Space Invaders

A fast-paced 3D space combat game built with Three.js where you defend planets from enemy invasions, collect resources, and upgrade your ship.

![Game Preview](https://img.shields.io/badge/Status-In%20Development-yellow)
![Three.js](https://img.shields.io/badge/Three.js-v0.169.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 🎮 Game Overview

You are a Space Defense Force pilot tasked with protecting the galaxy from hostile invaders. Navigate through procedurally generated space, locate planets under attack, destroy enemy forces, and collect resources to upgrade your ship and unlock new vessels.

## ✨ Features

### Core Gameplay
- 🌌 **Procedurally Generated Space** - Infinite exploration with dynamic planets, asteroids, and rings
- 🛸 **6 Unique Ships** - Each with different stats (speed, health, fire rate)
- ⚔️ **Space Combat** - Engage enemy fighters attacking planets
- 🌍 **Planet Defense** - Save planets before they're destroyed to earn rewards
- 💎 **Resource Collection** - Gather Iron, Gold, and Crystal from asteroids
- 🎯 **Direction Indicators** - On-screen compass showing planets and enemies

### Progression Systems
- 📈 **XP System** - Earn experience by saving planets and destroying enemies
- ⚡ **4 Upgrade Categories**:
  - Engine Boost (speed +15% per level)
  - Hull Reinforcement (health +20 HP per level)
  - Weapon System (fire rate +10% per level)
  - Shield Generator (damage reduction +15% per level)
- 🔓 **Ship Unlocking** - Purchase new ships with resources and XP
- 💾 **Persistent Progress** - All upgrades and unlocks saved locally

### Advanced Features
- 🌀 **Warp Speed Effect** - Visual distortion at high velocities
- 📬 **Message System** - Receive hints, quests, and mission updates
- 📋 **Quest Tracking** - Complete objectives for rewards
- 🎨 **Cyberpunk HUD** - Futuristic interface with real-time stats
- 🎵 **Dynamic Audio** - Spatial audio effects

## 🎯 Controls

### Movement
- `W` - Accelerate forward
- `S` - Decelerate / Reverse
- `A` - Turn left
- `D` - Turn right
- `SPACE` - Pitch up (hold to look up)
- `SHIFT` - Pitch down (hold to look down)

### Combat
- `SPACEBAR` - Fire lasers (hold for continuous fire)

### Interface
- `ESC` - Pause menu (upgrades, ship selection, messages)
- `Mouse` - Look around and aim

## 🚀 How to Play

### Getting Started
1. **Launch the game** - Wait for assets to load
2. **Read the intro** - Learn basic controls
3. **Start flying** - Use WASD to navigate

### Gameplay Loop
1. **Find Planets** 🌍
   - Check direction indicators around screen edges
   - Fly within 1500km to trigger enemy spawn
   - Look for cyan indicators for planets

2. **Engage Enemies** ⚔️
   - Enemies spawn when you approach planets
   - They attack the planet first (you're secondary target)
   - Destroy all enemies before planet HP reaches 0

3. **Collect Resources** 💎
   - Mine asteroids for resources
   - Collect Iron, Gold, and Crystal
   - Resources appear in top-left HUD

4. **Upgrade & Progress** 📈
   - Press ESC to open upgrade menu
   - Spend resources on upgrades
   - Unlock new ships
   - Complete quests for bonuses

### Tips & Strategies
- ⚡ **Speed is survival** - Upgrade engine boost to reach planets faster
- 🛡️ **Save planets for HP** - Successfully defending grants +50 HP
- 🎯 **Engage at 300km** - Enemies only chase you within 300km
- 💥 **Planet destroyed?** - Enemies will hunt YOU next
- 🌀 **Use warp speed** - Hold W at max velocity for visual effect
- 📬 **Check messages** - Press ESC when alert appears

## 🏗️ Project Structure

```
3DSpaceInvaders/
├── public/
│   ├── audio/              # Sound effects
│   ├── planet/             # Planet 3D model
│   ├── ships/              # Ship 3D models (ship_0 to ship_7)
│   └── index.css           # Main stylesheet
├── src/
│   ├── components/
│   │   ├── audio.js        # Audio manager
│   │   ├── dom.js          # DOM/HUD management
│   │   ├── enemy.js        # Enemy AI and behavior
│   │   └── player/
│   │       ├── player-input.js   # Input handling
│   │       └── spaceship.js      # Player ship logic
│   ├── hud/
│   │   ├── hud.js          # Pause menu 3D viewer
│   │   ├── message-ui.js   # Message/quest UI
│   │   └── upgrade-ui.js   # Upgrade system UI
│   ├── procedural/
│   │   ├── asteroids.js    # Asteroid generation
│   │   ├── particle.js     # Particle effects
│   │   ├── planets.js      # Planet generation & logic
│   │   └── ring.js         # Space rings
│   ├── scene/
│   │   ├── camera.js       # Third-person camera
│   │   ├── renderer.js     # WebGL renderer + post-processing
│   │   └── world.js        # World manager
│   ├── utils/
│   │   ├── constants.js    # Physics constants
│   │   ├── entity.js       # Entity base class
│   │   ├── math.js         # Math utilities
│   │   ├── message-system.js    # Message/quest data
│   │   ├── upgrade-system.js    # Upgrade data & logic
│   │   └── utils.js        # General utilities
│   └── main.js             # Game entry point
├── index.html              # Main HTML
└── README.md              # This file
```

## 🛠️ Technical Details

### Technologies Used
- **Three.js** v0.169.0 - 3D graphics engine
- **WebGL** - Hardware-accelerated rendering
- **GLTF Loader** - 3D model loading
- **Post-processing** - Bloom and warp effects
- **LocalStorage** - Persistent save data

### Performance Features
- Procedural generation for infinite space
- Object pooling for particles
- LOD (Level of Detail) for distant objects
- Efficient collision detection
- Optimized render pipeline

### Save System
Game progress is automatically saved to browser localStorage:
- Ship unlocks
- Upgrade levels
- Message history
- Quest progress
- Resources and XP

**To reset progress:** Open browser console and run:
```javascript
localStorage.clear()
location.reload()
```

## 🧪 Developer Tools

### Testing Commands (Browser Console)

**Give Test Resources:**
```javascript
giveTestResources()  // 500 Iron, 300 Gold, 150 Crystal
addXP(10000)        // Add 10,000 XP
```

**Trigger Messages:**
```javascript
messageUI.showMessage('firstPlanet')
messageUI.showMessage('lowHealth')
messageUI.showMessage('planetSaved')
```

**Start Quests:**
```javascript
messageUI.startQuest('tutorial')
messageUI.startQuest('savePlanet')
```

## 🚧 Next Steps to Complete the Game

### High Priority
- [ ] **Enemy balancing** - Tune enemy damage, fire rate, accuracy
- [ ] **Planet health scaling** - Increase HP with difficulty progression
- [ ] **Boss encounters** - Special enemy types at key milestones
- [ ] **Save/load UI** - Manual save slots with import/export
- [ ] **Sound effects** - Complete audio for all actions
- [ ] **Music system** - Background music tracks

### Gameplay Enhancements
- [ ] **More ship types** - Add remaining ships (3-4 more models)
- [ ] **Weapon variety** - Different laser types, missiles, bombs
- [ ] **Power-ups** - Temporary boosts during combat
- [ ] **Enemy variety** - Multiple enemy types with different behaviors
- [ ] **Wave system** - Escalating difficulty waves
- [ ] **Leaderboard** - High score tracking

### Polish & UX
- [ ] **Tutorial system** - Interactive step-by-step guide
- [ ] **Better damage feedback** - Screen shake, red flash
- [ ] **Explosion effects** - Particle explosions on destruction
- [ ] **Minimap** - Top-down radar view
- [ ] **Better collision** - More precise hitboxes
- [ ] **Settings menu** - Graphics quality, audio levels

### Content
- [ ] **Story mode** - Campaign with missions
- [ ] **Achievements** - 20+ achievements to unlock
- [ ] **Challenge modes** - Time attack, survival, no upgrades
- [ ] **Multiple galaxies** - Different themed sectors
- [ ] **Station/hub** - Safe zone for shopping/upgrades

### Technical Improvements
- [ ] **Multiplayer** - Co-op or competitive modes
- [ ] **Mobile support** - Touch controls and optimization
- [ ] **Better lighting** - Dynamic shadows and advanced shaders
- [ ] **Skybox variety** - Multiple space backgrounds
- [ ] **Loading optimization** - Progressive loading, smaller assets

### Known Issues
- ⚠️ Direction indicators need tuning (FIXED)
- ⚠️ Enemy engagement range too far (FIXED - now 300km)
- ⚠️ Planets need more HP (FIXED - increased to 5000)
- ⚠️ No player HP reward for saving planets (FIXED - +50 HP)
- ⚠️ Need warp speed visual effect (FIXED - radial blur added)
- ⚠️ Message system needed (FIXED - comprehensive system added)

## 📦 Installation & Setup

### Prerequisites
- Modern web browser (Chrome, Firefox, Edge)
- Local web server (for CORS and module loading)

### Option 1: Python Server
```bash
# Navigate to project directory
cd 3DSpaceInvaders

# Start server (Python 3)
python -m http.server 8000

# Open browser
# Navigate to: http://localhost:8000
```

### Option 2: Node.js Server
```bash
# Install http-server globally
npm install -g http-server

# Navigate to project directory
cd 3DSpaceInvaders

# Start server
http-server -p 8000

# Open browser
# Navigate to: http://localhost:8000
```

### Option 3: VS Code Live Server
1. Install "Live Server" extension
2. Right-click `index.html`
3. Select "Open with Live Server"

## 🎨 Customization

### Adding New Ships
1. Place GLTF model in `public/ships/ship_X/`
2. Add to `modelPaths` in `src/hud/hud.js`
3. Add ship data to `UPGRADE_SYSTEM.ships` in `src/utils/upgrade-system.js`
4. Update HTML ship selector in `index.html`

### Creating New Messages
1. Add message data to `MESSAGES` in `src/utils/message-system.js`
2. Trigger with `triggerMessage('messageId')` in game code

### Adjusting Difficulty
Edit `src/utils/constants.js`:
```javascript
export const PHYSICS_CONSTANTS = {
  maxVelocity: 1,      // Ship speed
  acceleration: 0.4,   // Acceleration rate
  deceleration: 0.4,   // Deceleration rate
  verticalAcceleration: 0.05  // Pitch speed
};
```

## 🤝 Contributing

This is a personal project, but feel free to:
- Report bugs via Issues
- Suggest features
- Fork and experiment
- Share your gameplay videos

## 📄 License

MIT License - Feel free to use and modify for your own projects.

## 🙏 Credits

### Assets
- Ship models: Various free GLTF models
- Planet model: Procedurally textured sphere
- Sounds: Free sound effects libraries

### Libraries
- Three.js - 3D rendering
- GLTFLoader - Model loading
- PostProcessing - Visual effects

## 📞 Contact

For questions or feedback, please open an issue on GitHub.

---

**Have fun defending the galaxy! 🌌**
