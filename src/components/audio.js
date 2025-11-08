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

    this.dogfightMusic = null;
    this.dogfightSource = null;
    this.isDogfightPlaying = false;

    this.bleepSound = null;
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

  async loadDogfightMusic(path) {
    try {
      this.dogfightMusic = new Audio(path);
      this.dogfightMusic.loop = true;
      this.dogfightMusic.volume = 0.4; // Moderate volume for combat music

      // Test if file exists by attempting to load
      this.dogfightMusic.addEventListener('error', () => {
        console.warn('Dogfight music file not found - continuing without combat music');
        this.dogfightMusic = null;
      });
    } catch (error) {
      console.warn('Failed to load dogfight music:', error);
      this.dogfightMusic = null;
    }
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

  pauseSpaceshipSound() {
    if (this.spaceshipSound && !this.spaceshipSound.paused) {
      this.spaceshipSound.pause();
    }
  }

  resumeSpaceshipSound() {
    if (this.spaceshipSound && this.spaceshipSound.paused) {
      this.spaceshipSound.play();
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

  async playDogfightMusic() {
    if (!this.dogfightMusic || this.isDogfightPlaying) return;

    try {
      await this.audioContext.resume();

      if (!this.dogfightSource) {
        this.dogfightSource = this.audioContext.createMediaElementSource(this.dogfightMusic);
        this.dogfightSource.connect(this.audioContext.destination);
      }

      // Start with volume at 0 for fade-in
      this.dogfightMusic.volume = 0;
      await this.dogfightMusic.play();
      this.isDogfightPlaying = true;

      // Fade in over 2 seconds
      const fadeInDuration = 2000; // 2 seconds
      const targetVolume = 0.4;
      const fadeSteps = 40;
      const stepDuration = fadeInDuration / fadeSteps;
      const volumeIncrement = targetVolume / fadeSteps;

      let currentStep = 0;
      const fadeInterval = setInterval(() => {
        if (currentStep < fadeSteps && this.dogfightMusic) {
          this.dogfightMusic.volume = Math.min(volumeIncrement * currentStep, targetVolume);
          currentStep++;
        } else {
          clearInterval(fadeInterval);
        }
      }, stepDuration);

      console.log('🎵 Dogfight music started (fading in)');
    } catch (error) {
      console.warn('Failed to play dogfight music:', error);
    }
  }

  pauseDogfightMusic() {
    if (this.dogfightMusic && this.isDogfightPlaying) {
      this.dogfightMusic.pause();
      console.log('🎵 Dogfight music paused');
    }
  }

  resumeDogfightMusic() {
    if (this.dogfightMusic && this.isDogfightPlaying) {
      this.dogfightMusic.play().catch(err => console.warn('Failed to resume dogfight music:', err));
      console.log('🎵 Dogfight music resumed');
    }
  }

  stopDogfightMusic() {
    if (this.dogfightMusic && this.isDogfightPlaying) {
      this.dogfightMusic.pause();
      this.dogfightMusic.currentTime = 0;
      this.isDogfightPlaying = false;
      console.log('🎵 Dogfight music stopped');
    }
  }

  async loadBleepSound(path) {
    try {
      this.bleepSound = new Audio(path);
      this.bleepSound.volume = 0.3;
    } catch (error) {
      console.warn('Failed to load bleep sound:', error);
      this.bleepSound = null;
    }
  }

  playBleepSound() {
    if (this.bleepSound) {
      this.bleepSound.currentTime = 0;
      this.bleepSound.play().catch(err => console.warn('Failed to play bleep:', err));
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
