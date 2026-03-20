/**
 * RENDER SYSTEM - Handles all visual output using canvas rendering
 * 
 * Features:
 * - Canvas-based rendering for floaties
 * - Score and combo UI display
 * - Card hand rendering
 * - Floating score text animation
 * - Particle effects
 * - Mobile portrait layout scaling
 * - Smooth floatie movement animation
 * 
 * Lifecycle:
 * - init: Set up canvas, detect screen size, scale for mobile
 * - update: Update animation timers, fade particles, animate floating text
 * - render: Draw all game elements
 * 
 * Listens to:
 * - score:spawnText (from ScoreSystem)
 * 
 * Does NOT modify gameState
 */

export class RenderSystem {
  constructor(systemManager) {
    this.systemManager = systemManager;
    this.canvas = null;
    this.ctx = null;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.time = 0;

    // Unified design tokens (mirrored from index.css)
    this.tokens = {
      accentPrimary: 'hsl(330, 100%, 65%)',
      accentSecondary: 'hsl(150, 100%, 50%)',
      accentTertiary: 'hsl(45, 100%, 55%)',
      accentInfo: 'hsl(200, 100%, 60%)'
    };

    // Family color schemes
    this.familySchemes = {
      jelly: { primary: '#ff69b4', secondary: '#ff1493' },      // Pink
      coral: { primary: '#ff8c00', secondary: '#ff4500' },      // Orange
      pearl: { primary: '#f0f8ff', secondary: '#add8e6' },      // Light Blue
      star: { primary: '#ffd700', secondary: '#ffa500' },       // Gold
      rainbow: { primary: '#ffffff', secondary: '#ff00ff' },    // Special
      bomb: { primary: '#333333', secondary: '#000000' }        // Dark
    };

    // Card type colors
    this.cardColors = {
      shuffleRow: '#6366f1',
      spawnFamily: '#10b981',
      clearCluster: '#ef4444',
      magnetizeFamily: '#f59e0b',
      doubleNextCombo: '#8b5cf6'
    };
  }

  /**
   * Initialize render system
   * @param {Object} gameState - Centralized game state
   */
  init(gameState) {
    // Get or create canvas
    this.canvas = document.getElementById('gameCanvas');
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'gameCanvas';
      const playArea = document.getElementById('playArea');
      if (playArea) {
        playArea.appendChild(this.canvas);
      } else {
        document.body.appendChild(this.canvas);
      }
    }

    this.ctx = this.canvas.getContext('2d');

    // Initialize render state
    if (!gameState.render) {
      gameState.render = {
        particles: [],
        floatingText: [],
        animations: []
      };
    }

    // Set up canvas
    this.setupCanvas();

    // Listen for events
    this.systemManager.on('score:spawnText', (data) => {
      this.handleSpawnScoreText(data, gameState);
    });

    this.systemManager.on('spawnParticles', (data) => {
      this.handleSpawnParticles(data, gameState);
    });

    console.log('✅ RenderSystem initialized');
  }

  /**
   * Set up canvas with proper sizing and scaling
   */
  setupCanvas() {
    const playArea = document.getElementById('playArea');
    if (!playArea) {
      console.warn('⚠️ PlayArea not found');
      return;
    }

    // Get viewport dimensions
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Set canvas size
    this.canvas.width = width;
    this.canvas.height = height;

    // Apply CSS for proper display
    this.canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10;
      display: block;
      pointer-events: none;
      background: transparent;
    `;

    // Calculate scale for mobile portrait
    const isPortrait = height > width;
    if (isPortrait) {
      this.scale = Math.min(width / 400, height / 600);
    } else {
      this.scale = Math.min(width / 600, height / 400);
    }

    this.offsetX = 0;
    this.offsetY = 0;

    console.log(`📐 Canvas: ${width}x${height}, Scale: ${this.scale.toFixed(2)}`);
  }

  /**
   * Update render system - animations and particles
   * @param {number} deltaTime - Time since last frame (ms)
   * @param {Object} gameState - Centralized game state
   */
  update(deltaTime, gameState) {
    if (!gameState.render) return;

    this.time += deltaTime;

    // Update floating text
    this.updateFloatingText(deltaTime, gameState);

    // Update particles
    this.updateParticles(deltaTime, gameState);

    // Update animations
    this.updateAnimations(deltaTime, gameState);
  }

  /**
   * Update floating text animations
   */
  updateFloatingText(deltaTime, gameState) {
    const floatingText = gameState.render.floatingText;

    for (let i = floatingText.length - 1; i >= 0; i--) {
      const text = floatingText[i];
      text.life -= deltaTime;
      text.y -= 1; // Move upward
      text.alpha = Math.max(0, text.life / 1000); // Fade out

      if (text.life <= 0) {
        floatingText.splice(i, 1);
      }
    }
  }

  /**
   * Update particles
   */
  updateParticles(deltaTime, gameState) {
    const particles = gameState.render.particles;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= deltaTime;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1; // Gravity
      p.alpha = Math.max(0, p.life / 500);

      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  /**
   * Update animations
   */
  updateAnimations(deltaTime, gameState) {
    const animations = gameState.render.animations;

    for (let i = animations.length - 1; i >= 0; i--) {
      const anim = animations[i];
      anim.elapsed += deltaTime;

      if (anim.elapsed >= anim.duration) {
        animations.splice(i, 1);
      }
    }
  }

  /**
   * Main render function
   * @param {Object} gameState - Centralized game state
   */
  render(gameState) {
    if (!this.ctx || !this.canvas) return;

    // Clear canvas for dynamic elements only
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw particles (dynamic effects)
    this.drawParticles(gameState);

    // Draw floating text (dynamic UI)
    this.drawFloatingText(gameState);

    // Draw combo animation
    this.drawComboEffect(gameState);

    // Sync DOM UI elements
    this.drawUI(gameState);

    // Draw cards in hand
    this.drawCards(gameState);
  }

  /**
   * Draw particles
   */
  drawParticles(gameState) {
    if (!gameState.render.particles) return;

    for (const p of gameState.render.particles) {
      // Add glow effect
      this.ctx.shadowColor = `rgba(${p.r}, ${p.g}, ${p.b}, 0.8)`;
      this.ctx.shadowBlur = 10;
      this.ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }
  }

  /**
   * Draw floating score text
   */
  drawFloatingText(gameState) {
    if (!gameState.render.floatingText) return;

    for (const text of gameState.render.floatingText) {
      // Animate scale
      const scale = 0.8 + (1 - text.alpha) * 0.4;
      
      this.ctx.save();
      this.ctx.translate(text.x, text.y);
      this.ctx.scale(scale, scale);
      
      this.ctx.font = 'bold 28px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      
      // Glow effect
      this.ctx.shadowColor = 'rgba(0, 255, 136, 0.8)';
      this.ctx.shadowBlur = 15;
      this.ctx.fillStyle = `rgba(0, 255, 136, ${text.alpha})`;
      
      // Draw text with outline
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.lineWidth = 3;
      this.ctx.strokeText(`+${text.value}`, 0, 0);
      this.ctx.fillText(`+${text.value}`, 0, 0);
      
      this.ctx.restore();
      this.ctx.shadowBlur = 0;
    }
  }

  /**
   * Draw combo indicator animation
   */
  drawComboEffect(gameState) {
    if (!gameState.combo || gameState.combo.current < 3) return;

    // Pulse effect around combo display
    const pulse = Math.sin(this.time * 0.01) * 0.3 + 0.7;
    const comboEl = document.getElementById('combo-display');
    if (comboEl) {
      comboEl.style.transform = `scale(${pulse})`;
      comboEl.style.textShadow = `0 0 ${20 * pulse}px rgba(255, 215, 0, ${pulse})`;
    }
  }

  /**
   * Sync UI elements with gameState
   */
  drawUI(gameState) {
    const scoreEl = document.getElementById('score-display');
    const comboEl = document.getElementById('combo-display');

    if (scoreEl) {
      scoreEl.textContent = gameState.score.total.toLocaleString();
    }

    if (comboEl) {
      comboEl.textContent = `${gameState.combo.multiplier.toFixed(1)}x`;
    }

    // Sync Game Over Overlay
    if (gameState.flow?.state === 'gameover') {
      const overlay = document.getElementById('game-over-overlay');
      const finalScoreEl = document.getElementById('final-score');
      if (overlay) {
        overlay.style.display = 'flex';
        overlay.classList.add('active');
        if (finalScoreEl) finalScoreEl.textContent = gameState.score.total.toLocaleString();
      }
    } else {
      const overlay = document.getElementById('game-over-overlay');
      if (overlay) {
        overlay.style.display = 'none';
        overlay.classList.remove('active');
      }
    }

    // Sync Menu Overlay
    const menuOverlay = document.getElementById('menu-overlay');
    if (menuOverlay) {
      if (gameState.flow?.state === 'menu') {
        menuOverlay.classList.add('active');
      } else {
        menuOverlay.classList.remove('active');
      }
    }
  }

  /**
   * Draw cards in hand
   */
  drawCards(gameState) {
    if (!gameState.cards || !gameState.cards.hand || gameState.cards.hand.length === 0) {
      return;
    }

    const cards = gameState.cards.hand;
    const cardWidth = 80;
    const cardHeight = 110;
    const spacing = 12;
    const totalWidth = cards.length * (cardWidth + spacing) - spacing;
    const startX = (this.canvas.width - totalWidth) / 2;
    const startY = this.canvas.height - cardHeight - 30;

    // Draw card backplate glow
    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
    this.ctx.shadowBlur = 20;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const x = startX + i * (cardWidth + spacing);
      const y = startY;

      this.drawCard(card, x, y, cardWidth, cardHeight, i);
    }

    this.ctx.shadowBlur = 0;
  }

  /**
   * Draw a single card
   */
  drawCard(card, x, y, width, height, index) {
    const cardData = this.getCardDescription(card.type);
    const color = this.cardColors[card.type] || '#666';

    // Card background with gradient
    const gradient = this.ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, this.lightenColor(color, 0.3));
    gradient.addColorStop(1, color);

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width, height, 8);
    this.ctx.fill();

    // Card border
    this.ctx.strokeStyle = this.lightenColor(color, 0.6);
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width, height, 8);
    this.ctx.stroke();

    // Rarity indicator (top bar)
    const rarityColor = {
      common: '#888',
      rare: '#4169e1',
      legendary: '#ffd700'
    };
    this.ctx.fillStyle = rarityColor[card.rarity] || '#888';
    this.ctx.beginPath();
    this.ctx.roundRect(x + 3, y + 3, width - 6, 6, 3);
    this.ctx.fill();

    // Card icon (emoji based on type)
    const icons = {
      shuffleRow: '🔀',
      spawnFamily: '✨',
      clearCluster: '💥',
      magnetizeFamily: '🧲',
      doubleNextCombo: '⚡'
    };
    this.ctx.font = '24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText(icons[card.type] || '🎴', x + width / 2, y + height / 2 - 10);

    // Card name (shortened)
    this.ctx.font = 'bold 9px Arial';
    this.ctx.fillStyle = '#fff';
    const nameShort = cardData.name.substring(0, 10);
    this.ctx.fillText(nameShort, x + width / 2, y + height - 15);

    // Click hint
    this.ctx.font = '8px Arial';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.fillText('TAP', x + width / 2, y + height - 5);
  }

  /**
   * Get card description
   */
  getCardDescription(type) {
    const descriptions = {
      shuffleRow: { name: 'Shuffle Row', desc: 'Shuffle a row' },
      spawnFamily: { name: 'Spawn Family', desc: 'Spawn 5 floaties' },
      clearCluster: { name: 'Clear Cluster', desc: 'Clear area' },
      magnetizeFamily: { name: 'Magnetize', desc: 'Pull together' },
      doubleNextCombo: { name: 'Double Combo', desc: '2x next combo' }
    };
    return descriptions[type] || { name: type, desc: 'Unknown' };
  }

  /**
   * Handle spawn score text event
   */
  handleSpawnScoreText(data, gameState) {
    const { value, position } = data;

    gameState.render.floatingText.push({
      x: position.x,
      y: position.y,
      value,
      life: 1000, // 1 second
      alpha: 1
    });
  }

  /**
   * Handle spawn particles event
   */
  handleSpawnParticles(data, gameState) {
    const { x, y, type, count, color, isRare } = data;

    if (!gameState.render.particles) return;

    const [r, g, b] = this.hexToRgb(color || '#ffffff');

    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const speed = Math.random() * 4 + 2;

      gameState.render.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 600,
        alpha: 1,
        size: isRare ? Math.random() * 5 + 4 : Math.random() * 3 + 2,
        r,
        g,
        b
      });
    }
  }

  /**
   * Spawn particles for effects
   */
  spawnParticles(x, y, count, color, gameState) {
    if (!gameState.render.particles) return;

    const [r, g, b] = this.hexToRgb(color);

    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const speed = Math.random() * 3 + 1;

      gameState.render.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 500,
        alpha: 1,
        size: Math.random() * 3 + 2,
        r,
        g,
        b
      });
    }
  }

  /**
   * Lighten a color
   */
  lightenColor(color, amount) {
    const [r, g, b] = this.hexToRgb(color);
    const factor = 1 + amount;

    return `rgb(${Math.min(255, r * factor)}, ${Math.min(255, g * factor)}, ${Math.min(255, b * factor)})`;
  }

  /**
   * Convert hex color to RGBA
   */
  hexToRgba(hex, alpha = 1) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(255, 255, 255, ${alpha})`;
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Handle window resize
   */
  handleResize() {
    this.setupCanvas();
  }
}
