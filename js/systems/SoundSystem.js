/**
 * SOUND SYSTEM - Manages game audio
 *
 * Features:
 * - Pop sounds
 * - Combo sounds
 * - Card sounds
 * - Background music (bg.mp3 plays continuously)
 * - Volume control
 */

export class SoundSystem {
  constructor(systemManager) {
    this.systemManager = systemManager;
    this.sounds = {};
    this.sfx = {};
    this.volume = 0.3;
    this.enabled = true;
    this.bgMusicPlaying = false;
  }

  /**
   * Initialize sound system
   */
  init(gameState) {
    // Background music (loops continuously)
    this.sounds = {
      bg: new Audio('bg.mp3')
    };
    this.sounds.bg.loop = true;
    this.sounds.bg.volume = this.volume * 0.5;

    // Sound effects (one-shot)
    this.sfx = {
      pop: new Audio('pop.mp3'),
      blue: new Audio('blue.mp3'),
      maw: new Audio('maw.mp3')
    };

    // Set SFX volumes
    for (const sound of Object.values(this.sfx)) {
      sound.volume = this.volume;
      sound.loop = false;
    }

    // Listen for game events
    this.systemManager.on('floatie:popped', () => this.playPop());
    this.systemManager.on('combo:updated', (data) => this.playCombo(data.multiplier));
    this.systemManager.on('combo:milestoneSmall', () => this.playMilestone('small'));
    this.systemManager.on('combo:milestoneLarge', () => this.playMilestone('large'));
    this.systemManager.on('card:generated', () => this.playCardDraw());
    this.systemManager.on('card:activated', () => this.playCardUse());
    this.systemManager.on('game:started', () => this.startMusic());
    this.systemManager.on('game:over', () => this.stopMusic());

    console.log('✅ SoundSystem initialized');
    console.log('🎵 Background music: bg.mp3 (continuous loop)');
  }

  /**
   * Update sound system
   */
  update(deltaTime, gameState) {
    // Audio is event-driven
  }

  /**
   * Handle events
   */
  onEvent(eventName, data) {
    // Events are handled via systemManager.on()
  }

  /**
   * Play pop sound
   */
  playPop() {
    if (!this.enabled) return;
    const sound = this.sfx.pop;
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  }

  /**
   * Play combo sound based on multiplier
   */
  playCombo(multiplier) {
    if (!this.enabled) return;

    if (multiplier >= 4) {
      this.playSFX('maw');
    } else if (multiplier >= 2) {
      this.playSFX('blue');
    }
  }

  /**
   * Play milestone sound
   */
  playMilestone(type) {
    if (!this.enabled) return;

    if (type === 'large') {
      this.playSFX('maw');
    } else {
      this.playSFX('blue');
    }
  }

  /**
   * Play card draw sound
   */
  playCardDraw() {
    if (!this.enabled) return;
    this.playSFX('blue');
  }

  /**
   * Play card use sound
   */
  playCardUse() {
    if (!this.enabled) return;
    this.playSFX('pop');
  }

  /**
   * Play a sound effect by name (doesn't interrupt BG music)
   */
  playSFX(name) {
    const sound = this.sfx[name];
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  }

  /**
   * Start background music (plays continuously)
   */
  startMusic() {
    if (!this.enabled || this.bgMusicPlaying) return;
    
    const bg = this.sounds.bg;
    if (bg) {
      bg.volume = this.volume * 0.5;
      bg.play().then(() => {
        this.bgMusicPlaying = true;
        console.log('🎵 Background music started');
      }).catch((e) => {
        console.log('🔇 Autoplay blocked, music will start on first interaction');
      });
    }
  }

  /**
   * Stop background music
   */
  stopMusic() {
    const bg = this.sounds.bg;
    if (bg) {
      bg.pause();
      // Don't reset currentTime - let it resume from current position
      this.bgMusicPlaying = false;
    }
  }

  /**
   * Toggle sound
   */
  toggleSound(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
  }

  /**
   * Set volume
   */
  setVolume(level) {
    this.volume = Math.max(0, Math.min(1, level));
    for (const sound of Object.values(this.sounds)) {
      sound.volume = this.volume;
    }
  }
}
