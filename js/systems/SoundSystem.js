/**
 * SOUND SYSTEM - Manages game audio
 *
 * Features:
 * - Pop sounds
 * - Combo sounds
 * - Card sounds
 * - Background music
 * - Volume control
 */

export class SoundSystem {
  constructor(systemManager) {
    this.systemManager = systemManager;
    this.sounds = {};
    this.volume = 0.3;
    this.enabled = true;
  }

  /**
   * Initialize sound system
   */
  init(gameState) {
    // Create audio elements
    this.sounds = {
      pop: new Audio('pop.mp3'),
      bg: new Audio('bg.mp3'),
      blue: new Audio('blue.mp3'),
      maw: new Audio('maw.mp3')
    };

    // Set volumes
    for (const sound of Object.values(this.sounds)) {
      sound.volume = this.volume;
      sound.loop = sound === this.sounds.bg || sound === this.sounds.blue;
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
    const sound = this.sounds.pop;
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {}); // Ignore autoplay errors
    }
  }

  /**
   * Play combo sound based on multiplier
   */
  playCombo(multiplier) {
    if (!this.enabled) return;
    
    if (multiplier >= 4) {
      this.playSound('maw');
    } else if (multiplier >= 2) {
      this.playSound('blue');
    }
  }

  /**
   * Play milestone sound
   */
  playMilestone(type) {
    if (!this.enabled) return;
    
    if (type === 'large') {
      this.playSound('maw');
    } else {
      this.playSound('blue');
    }
  }

  /**
   * Play card draw sound
   */
  playCardDraw() {
    if (!this.enabled) return;
    this.playSound('blue');
  }

  /**
   * Play card use sound
   */
  playCardUse() {
    if (!this.enabled) return;
    this.playSound('pop');
  }

  /**
   * Play a sound by name
   */
  playSound(name) {
    const sound = this.sounds[name];
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  }

  /**
   * Start background music
   */
  startMusic() {
    if (!this.enabled) return;
    const bg = this.sounds.bg;
    if (bg) {
      bg.volume = this.volume * 0.5; // Lower volume for BG
      bg.play().catch(() => {}); // Ignore autoplay errors
    }
  }

  /**
   * Stop background music
   */
  stopMusic() {
    const bg = this.sounds.bg;
    if (bg) {
      bg.pause();
      bg.currentTime = 0;
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
