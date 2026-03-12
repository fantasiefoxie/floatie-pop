import { state } from './state.js';

// Music intensity levels configuration
const MUSIC_CONFIG = {
  intensityLevels: {
    calm: {
      name: 'Calm',
      comboRange: [0, 2],
      volume: 0.3,
      playbackRate: 0.9,
      description: 'Relaxed background music'
    },
    medium: {
      name: 'Medium',
      comboRange: [3, 6],
      volume: 0.5,
      playbackRate: 1.0,
      description: 'Moderate intensity music'
    },
    high: {
      name: 'High',
      comboRange: [7, Infinity],
      volume: 0.7,
      playbackRate: 1.1,
      description: 'High energy music'
    }
  },
  
  // Default tracks for each intensity
  defaultTracks: {
    calm: 'dQw4w9WgXcQ', // Rick Astley - Never Gonna Give You Up (calm version)
    medium: 'kJQP7kiw5Fk', // Despacito
    high: 'fJ9rUzIMcZQ' // Queen - Bohemian Rhapsody
  },
  
  // Transition settings
  transition: {
    fadeTime: 1000, // 1 second fade
    updateInterval: 500 // Check combo every 500ms
  }
};

export class MusicManager {
  constructor() {
    this.currentIntensity = 'calm';
    this.players = {}; // YouTube players for each intensity
    this.isInitialized = false;
    this.isMuted = false;
    this.masterVolume = 0.5;
    this.customTracks = this.loadCustomTracks();
    this.updateTimer = null;
    this.isTransitioning = false;
    
    // Bind methods to preserve context
    this.onPlayerReady = this.onPlayerReady.bind(this);
    this.onPlayerStateChange = this.onPlayerStateChange.bind(this);
  }

  // Initialize YouTube API and players
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      await this.loadYouTubeAPI();
      this.createPlayerContainers();
      this.createPlayers();
      this.createMusicUI();
      this.startComboMonitoring();
      this.isInitialized = true;
      console.log('🎵 Music Manager initialized');
    } catch (error) {
      console.error('Failed to initialize Music Manager:', error);
    }
  }

  // Load YouTube IFrame API
  loadYouTubeAPI() {
    return new Promise((resolve, reject) => {
      // Check if API is already loaded
      if (window.YT && window.YT.Player) {
        resolve();
        return;
      }

      // Load the API
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.onload = () => {
        // Wait for API to be ready
        window.onYouTubeIframeAPIReady = () => {
          resolve();
        };
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Create hidden containers for YouTube players
  createPlayerContainers() {
    const container = document.createElement('div');
    container.id = 'music-players';
    container.style.cssText = `
      position: fixed;
      top: -1000px;
      left: -1000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
      pointer-events: none;
    `;
    
    Object.keys(MUSIC_CONFIG.intensityLevels).forEach(intensity => {
      const playerDiv = document.createElement('div');
      playerDiv.id = `player-${intensity}`;
      container.appendChild(playerDiv);
    });
    
    document.body.appendChild(container);
  }

  // Create YouTube players for each intensity level
  createPlayers() {
    Object.keys(MUSIC_CONFIG.intensityLevels).forEach(intensity => {
      const config = MUSIC_CONFIG.intensityLevels[intensity];
      const videoId = this.customTracks[intensity] || MUSIC_CONFIG.defaultTracks[intensity];
      
      this.players[intensity] = new YT.Player(`player-${intensity}`, {
        height: '1',
        width: '1',
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          showinfo: 0,
          loop: 1,
          playlist: videoId
        },
        events: {
          onReady: this.onPlayerReady,
          onStateChange: this.onPlayerStateChange
        }
      });
    });
  }

  // Handle player ready event
  onPlayerReady(event) {
    const player = event.target;
    const intensity = this.getIntensityFromPlayer(player);
    
    if (intensity) {
      const config = MUSIC_CONFIG.intensityLevels[intensity];
      player.setVolume(config.volume * this.masterVolume * 100);
      player.setPlaybackRate(config.playbackRate);
      
      // Start playing the calm track initially
      if (intensity === 'calm') {
        player.playVideo();
        this.currentIntensity = 'calm';
      }
    }
  }

  // Handle player state changes
  onPlayerStateChange(event) {
    // Handle any state changes if needed
    if (event.data === YT.PlayerState.ENDED) {
      // Restart the video for looping
      event.target.playVideo();
    }
  }

  // Get intensity level from player instance
  getIntensityFromPlayer(player) {
    const iframe = player.getIframe();
    if (iframe && iframe.id) {
      return iframe.id.replace('player-', '');
    }
    return null;
  }

  // Start monitoring combo levels
  startComboMonitoring() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    
    this.updateTimer = setInterval(() => {
      this.updateMusicIntensity();
    }, MUSIC_CONFIG.transition.updateInterval);
  }

  // Update music intensity based on current combo
  updateMusicIntensity() {
    if (!this.isInitialized || this.isTransitioning) return;
    
    const currentCombo = state.combo || 0;
    const targetIntensity = this.getIntensityForCombo(currentCombo);
    
    if (targetIntensity !== this.currentIntensity) {
      this.transitionToIntensity(targetIntensity);
    }
  }

  // Get appropriate intensity level for combo count
  getIntensityForCombo(combo) {
    for (const [intensity, config] of Object.entries(MUSIC_CONFIG.intensityLevels)) {
      const [min, max] = config.comboRange;
      if (combo >= min && combo <= max) {
        return intensity;
      }
    }
    return 'calm'; // Default fallback
  }

  // Transition between intensity levels
  async transitionToIntensity(targetIntensity) {
    if (this.isTransitioning || targetIntensity === this.currentIntensity) return;
    
    this.isTransitioning = true;
    const currentPlayer = this.players[this.currentIntensity];
    const targetPlayer = this.players[targetIntensity];
    
    if (!currentPlayer || !targetPlayer) {
      this.isTransitioning = false;
      return;
    }

    try {
      // Start target player
      targetPlayer.playVideo();
      
      // Cross-fade between players
      await this.crossFade(currentPlayer, targetPlayer, targetIntensity);
      
      // Pause the old player
      currentPlayer.pauseVideo();
      
      this.currentIntensity = targetIntensity;
      this.updateMusicUI();
      
      console.log(`🎵 Music intensity changed to: ${targetIntensity} (combo: ${state.combo})`);
    } catch (error) {
      console.error('Error transitioning music:', error);
    } finally {
      this.isTransitioning = false;
    }
  }

  // Cross-fade between two players
  crossFade(fromPlayer, toPlayer, toIntensity) {
    return new Promise((resolve) => {
      const config = MUSIC_CONFIG.intensityLevels[toIntensity];
      const fadeSteps = 20;
      const stepTime = MUSIC_CONFIG.transition.fadeTime / fadeSteps;
      let step = 0;
      
      const fadeInterval = setInterval(() => {
        step++;
        const progress = step / fadeSteps;
        
        // Fade out current player
        const fromVolume = (1 - progress) * this.masterVolume * 100;
        fromPlayer.setVolume(Math.max(0, fromVolume));
        
        // Fade in target player
        const toVolume = progress * config.volume * this.masterVolume * 100;
        toPlayer.setVolume(Math.min(100, toVolume));
        toPlayer.setPlaybackRate(config.playbackRate);
        
        if (step >= fadeSteps) {
          clearInterval(fadeInterval);
          resolve();
        }
      }, stepTime);
    });
  }

  // Create music control UI
  createMusicUI() {
    const musicPanel = document.createElement('div');
    musicPanel.id = 'music-panel';
    musicPanel.className = 'music-panel';
    musicPanel.innerHTML = `
      <div class="music-header">
        <span class="music-icon">🎵</span>
        <span class="music-title">Music</span>
        <button class="music-toggle" id="music-toggle">🔊</button>
      </div>
      
      <div class="music-content" id="music-content" style="display: none;">
        <div class="intensity-display">
          <span>Intensity: </span>
          <span id="current-intensity" class="intensity-level">Calm</span>
        </div>
        
        <div class="volume-control">
          <label>Volume:</label>
          <input type="range" id="volume-slider" min="0" max="100" value="50">
          <span id="volume-display">50%</span>
        </div>
        
        <div class="track-inputs">
          <h4>Custom Tracks (YouTube URLs):</h4>
          <div class="track-input-group">
            <label>Calm:</label>
            <input type="text" id="calm-track" placeholder="YouTube URL" value="${this.getYouTubeURL('calm')}">
          </div>
          <div class="track-input-group">
            <label>Medium:</label>
            <input type="text" id="medium-track" placeholder="YouTube URL" value="${this.getYouTubeURL('medium')}">
          </div>
          <div class="track-input-group">
            <label>High:</label>
            <input type="text" id="high-track" placeholder="YouTube URL" value="${this.getYouTubeURL('high')}">
          </div>
          <button id="update-tracks">Update Tracks</button>
        </div>
        
        <div class="music-info">
          <p>Music intensity automatically adjusts based on your combo:</p>
          <ul>
            <li>0-2 combo: Calm music</li>
            <li>3-6 combo: Medium intensity</li>
            <li>7+ combo: High intensity</li>
          </ul>
        </div>
      </div>
    `;
    
    document.body.appendChild(musicPanel);
    this.attachMusicEventListeners();
  }

  // Attach event listeners to music UI
  attachMusicEventListeners() {
    // Toggle panel visibility
    document.getElementById('music-toggle').addEventListener('click', () => {
      this.toggleMusicPanel();
    });

    // Volume control
    const volumeSlider = document.getElementById('volume-slider');
    const volumeDisplay = document.getElementById('volume-display');
    
    volumeSlider.addEventListener('input', (e) => {
      const volume = parseInt(e.target.value) / 100;
      this.setMasterVolume(volume);
      volumeDisplay.textContent = `${e.target.value}%`;
    });

    // Update tracks button
    document.getElementById('update-tracks').addEventListener('click', () => {
      this.updateCustomTracks();
    });

    // Mute toggle (click on music icon)
    document.querySelector('.music-icon').addEventListener('click', () => {
      this.toggleMute();
    });
  }

  // Toggle music panel visibility
  toggleMusicPanel() {
    const content = document.getElementById('music-content');
    const isVisible = content.style.display !== 'none';
    content.style.display = isVisible ? 'none' : 'block';
  }

  // Set master volume
  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    
    // Update all players
    Object.entries(this.players).forEach(([intensity, player]) => {
      if (player && player.setVolume) {
        const config = MUSIC_CONFIG.intensityLevels[intensity];
        const adjustedVolume = config.volume * this.masterVolume * 100;
        player.setVolume(adjustedVolume);
      }
    });
    
    this.saveMusicSettings();
  }

  // Toggle mute
  toggleMute() {
    this.isMuted = !this.isMuted;
    const muteButton = document.getElementById('music-toggle');
    
    if (this.isMuted) {
      this.setMasterVolume(0);
      muteButton.textContent = '🔇';
    } else {
      this.setMasterVolume(0.5);
      muteButton.textContent = '🔊';
      document.getElementById('volume-slider').value = 50;
      document.getElementById('volume-display').textContent = '50%';
    }
  }

  // Update custom tracks from user input
  updateCustomTracks() {
    const calmTrack = document.getElementById('calm-track').value;
    const mediumTrack = document.getElementById('medium-track').value;
    const highTrack = document.getElementById('high-track').value;
    
    const newTracks = {};
    
    if (calmTrack) {
      const videoId = this.extractVideoId(calmTrack);
      if (videoId) newTracks.calm = videoId;
    }
    
    if (mediumTrack) {
      const videoId = this.extractVideoId(mediumTrack);
      if (videoId) newTracks.medium = videoId;
    }
    
    if (highTrack) {
      const videoId = this.extractVideoId(highTrack);
      if (videoId) newTracks.high = videoId;
    }
    
    // Update tracks and recreate players
    this.customTracks = { ...this.customTracks, ...newTracks };
    this.saveCustomTracks();
    this.recreatePlayers();
    
    this.showMusicNotification('Tracks updated! Changes will take effect shortly.');
  }

  // Extract YouTube video ID from URL
  extractVideoId(url) {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  // Get YouTube URL from video ID
  getYouTubeURL(intensity) {
    const videoId = this.customTracks[intensity] || MUSIC_CONFIG.defaultTracks[intensity];
    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : '';
  }

  // Recreate players with new tracks
  recreatePlayers() {
    // Destroy existing players
    Object.values(this.players).forEach(player => {
      if (player && player.destroy) {
        player.destroy();
      }
    });
    
    this.players = {};
    
    // Recreate players
    setTimeout(() => {
      this.createPlayers();
    }, 1000);
  }

  // Update music UI display
  updateMusicUI() {
    const intensityDisplay = document.getElementById('current-intensity');
    if (intensityDisplay) {
      const config = MUSIC_CONFIG.intensityLevels[this.currentIntensity];
      intensityDisplay.textContent = config.name;
      intensityDisplay.className = `intensity-level ${this.currentIntensity}`;
    }
  }

  // Show music notification
  showMusicNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'music-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Load custom tracks from localStorage
  loadCustomTracks() {
    const saved = localStorage.getItem('musicCustomTracks');
    return saved ? JSON.parse(saved) : {};
  }

  // Save custom tracks to localStorage
  saveCustomTracks() {
    localStorage.setItem('musicCustomTracks', JSON.stringify(this.customTracks));
  }

  // Load music settings from localStorage
  loadMusicSettings() {
    const saved = localStorage.getItem('musicSettings');
    if (saved) {
      const settings = JSON.parse(saved);
      this.masterVolume = settings.masterVolume || 0.5;
      this.isMuted = settings.isMuted || false;
    }
  }

  // Save music settings to localStorage
  saveMusicSettings() {
    const settings = {
      masterVolume: this.masterVolume,
      isMuted: this.isMuted
    };
    localStorage.setItem('musicSettings', JSON.stringify(settings));
  }

  // Stop music manager
  stop() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
    Object.values(this.players).forEach(player => {
      if (player && player.pauseVideo) {
        player.pauseVideo();
      }
    });
  }

  // Get current status
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      currentIntensity: this.currentIntensity,
      masterVolume: this.masterVolume,
      isMuted: this.isMuted,
      combo: state.combo
    };
  }
}

// Global music manager instance
export const musicManager = new MusicManager();