import { mapValue } from "../utils/utils.js";
import { PHYSICS_CONSTANTS } from "../utils/constants.js"

export class Audio_Manager {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.sounds = [];
    this.currentIndex = 0;
    this.soundtrack = null;
    this.soundtrackSource = null;
    this.lastSoundPlayTime = 0;
    this.soundCooldown = 100;
    this.shipVolume = 0;

    this.spaceshipSound = null;
    this.spaceshipSource = null;
  }

  async loadSounds(path) {
    const soundCount = 3;
    for (let i = 1; i <= soundCount; i++) {
      const sound = new Audio();
      sound.src = `${path}/${i}.wav`;
      this.sounds.push(sound);
    }
  }

  async loadSoundtrack(path) {
    this.soundtrack = new Audio(path);
    this.soundtrack.loop = true;
  }

  async loadSpaceshipSound(path) {
    this.spaceshipSound = new Audio(path);
    this.spaceshipSound.loop = true;
  }

  async playSpaceshipSound() {
    if (!this.spaceshipSound) {
      console.warn('Spaceship sound is not loaded');
      return;
    }
    await this.audioContext.resume();
    if (!this.spaceshipSource) {
      this.spaceshipSource = this.audioContext.createMediaElementSource(this.spaceshipSound);
      this.spaceshipSource.connect(this.audioContext.destination);
    }
  
    this.spaceshipSound.addEventListener('ended', () => {
      this.spaceshipSound.currentTime = 0;
    });
    this.setSpaceshipVolume(0)
    this.spaceshipSound.play();
    }
  setSpaceshipVolume(newVolume) {
    if (newVolume >= 0 && newVolume <= 1.0) {
      this.shipVolume = newVolume;
      // console.log(`Spaceship volume set to: ${newVolume}`);
      
      if (this.spaceshipSound) {
        this.spaceshipSound.volume = newVolume;
      }
    } else {
      console.error('Invalid volume value. Please provide a value between 0 and 1.0');
    }
  }

  async playRandomSound() {
    const randomIndex = Math.floor(Math.random() * this.sounds.length);
    await this.playSoundAtIndex(randomIndex);
  }

  async playNextSound() {
    this.currentIndex = (this.currentIndex + 1) % this.sounds.length;
    await this.playSoundAtIndex(this.currentIndex);
  }

  async playSoundtrack() {
    console.log('Playing...');
    if (!this.soundtrack) {
      console.warn('Soundtrack is not loaded');
      return;
    }
  
    try {
      await this.audioContext.resume();
      console.log('AudioContext is now unlocked and ready to play audio');
  
      if (!this.soundtrackSource) {
        this.soundtrackSource = this.audioContext.createMediaElementSource(this.soundtrack);
        this.soundtrackSource.connect(this.audioContext.destination);
      }
  
      const randomStartTime = Math.random() * this.soundtrack.duration;
      this.soundtrack.currentTime = isFinite(randomStartTime) ? randomStartTime : 0;
      
      // TURN ON SOUNDTRACK HERE
      // this.soundtrack.play();
      console.log('Started Soundtrack');
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
    }
  }
  pauseSoundtrack() {
    if (this.soundtrack && !this.soundtrack.paused) {
      this.soundtrack.pause();
      console.log('Paused Soundtrack');
    }
  }

  updateSpaceshipVolume(vel) {
    const spaceshipVolumeLevel = mapValue(vel, 0, PHYSICS_CONSTANTS.maxVelocity, 0, 1);
    this.setSpaceshipVolume(spaceshipVolumeLevel);
  }
  async playSoundAtIndex(index) {
    console.log('play sound');
    const selectedSound = new Audio(this.sounds[index].src);
    const currentTime = Date.now();

    if (currentTime - this.lastSoundPlayTime < this.soundCooldown) return;

    const soundSource = this.audioContext.createMediaElementSource(selectedSound);
    soundSource.connect(this.audioContext.destination);

    selectedSound.addEventListener('ended', () => {
      this.lastSoundPlayTime = Date.now();
      soundSource.disconnect();
    });

    await selectedSound.play().catch(error => console.error("Error playing sound:", error));
  }
}
