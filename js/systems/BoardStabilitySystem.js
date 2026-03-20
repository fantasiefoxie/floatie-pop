/**
 * BOARD STABILITY SYSTEM - Manages floatie spacing and gentle movement
 * 
 * Features:
 * - Prevents floatie overlapping with separation forces
 * - Applies gentle random drift for board liveliness
 * - Enforces boundary containment
 * - Encourages family clusters through attraction
 * - Efficient neighbor checking using spatial partitioning
 * 
 * Lifecycle:
 * - init: Initialize board parameters
 * - update: Apply separation, drift, boundaries, clustering
 * - onEvent: Handle game state changes
 * 
 * Listens to:
 * - game:start (reset board state)
 * 
 * Emits events:
 * - floatie:moved (floatieId, position)
 * 
 * Physics:
 * - Separation: Repelling force when floaties too close
 * - Drift: Random velocity perturbation each frame
 * - Boundaries: Push floaties back toward center
 * - Clustering: Gentle attraction between same family
 */

export class BoardStabilitySystem {
  constructor(systemManager) {
    this.systemManager = systemManager;
    this.spatialGrid = null;
    this.gridSize = 100; // Grid cell size for spatial partitioning
    this.separationStrength = 0.5;
    this.clusterAttraction = 0.05;
    this.boundaryRepulsion = 0.3;
  }

  /**
   * Initialize board stability system
   * @param {Object} gameState - Centralized game state
   */
  init(gameState) {
    if (!gameState.board) {
      gameState.board = {
        minSpacing: 60,
        driftStrength: 0.1,
        boundaryPadding: 20
      };
    }

    this.initializeSpatialGrid(gameState);

    console.log('✅ BoardStabilitySystem initialized');
  }

  /**
   * Initialize spatial grid for efficient neighbor checking
   * @param {Object} gameState - Centralized game state
   */
  initializeSpatialGrid(gameState) {
    const playArea = document.getElementById('playArea');
    if (!playArea) return;

    const width = playArea.clientWidth;
    const height = playArea.clientHeight;

    const gridWidth = Math.ceil(width / this.gridSize);
    const gridHeight = Math.ceil(height / this.gridSize);

    this.spatialGrid = {
      width: gridWidth,
      height: gridHeight,
      cells: new Map(),
      lastWidth: width,
      lastHeight: height
    };

    console.log(`📊 Spatial grid initialized: ${gridWidth}x${gridHeight} cells`);

    // Listen for window resize to reinitialize grid
    if (!this.resizeHandler) {
      this.resizeHandler = () => this.handleResize(gameState);
      window.addEventListener('resize', this.resizeHandler);
    }
  }

  /**
   * Handle window resize - reinitialize spatial grid
   * @param {Object} gameState - Centralized game state
   */
  handleResize(gameState) {
    const playArea = document.getElementById('playArea');
    if (!playArea) return;

    const width = playArea.clientWidth;
    const height = playArea.clientHeight;

    // Only reinitialize if dimensions changed significantly
    if (!this.spatialGrid || 
        Math.abs(width - this.spatialGrid.lastWidth) > 50 || 
        Math.abs(height - this.spatialGrid.lastHeight) > 50) {
      this.initializeSpatialGrid(gameState);
      console.log(`📐 Spatial grid reinitialized on resize: ${width}x${height}`);
    }
  }

  /**
   * Update board stability system
   * @param {number} deltaTime - Time since last frame (ms)
   * @param {Object} gameState - Centralized game state
   */
  update(deltaTime, gameState) {
    if (!gameState.floats || gameState.floats.length === 0) return;

    // Rebuild spatial grid
    this.rebuildSpatialGrid(gameState);

    // Apply physics to each floatie
    for (const floatie of gameState.floats) {
      if (!floatie.isActive) continue;

      // Apply separation force
      this.applySeparation(floatie, gameState);

      // Apply gentle drift
      this.applyDrift(floatie, gameState);

      // Apply cluster attraction
      this.applyClusterAttraction(floatie, gameState);

      // Apply boundary containment
      this.applyBoundaryContainment(floatie, gameState);

      // Update position
      floatie.x += floatie.vx;
      floatie.y += floatie.vy;

      // Dampen velocity
      floatie.vx *= 0.95;
      floatie.vy *= 0.95;

      // Update DOM element if exists
      if (floatie.el) {
        floatie.el.style.left = `${floatie.x}px`;
        floatie.el.style.top = `${floatie.y}px`;
      }
    }
  }

  /**
   * Handle system events
   */
  onEvent(eventName, data) {
    const gameState = this.systemManager.gameState;
    if (!gameState) return;

    if (eventName === 'game:start') {
      this.initializeSpatialGrid(gameState);
    } else if (eventName === 'game:reset') {
      // Clean up old resize listener
      if (this.resizeHandler) {
        window.removeEventListener('resize', this.resizeHandler);
        this.resizeHandler = null;
      }
      this.initializeSpatialGrid(gameState);
    }
  }

  /**
   * Rebuild spatial grid with current floatie positions
   * @param {Object} gameState - Centralized game state
   */
  rebuildSpatialGrid(gameState) {
    if (!this.spatialGrid) return;

    // Clear grid
    this.spatialGrid.cells.clear();

    // Add floaties to grid
    for (const floatie of gameState.floats) {
      if (!floatie.isActive) continue;

      const cellX = Math.floor(floatie.x / this.gridSize);
      const cellY = Math.floor(floatie.y / this.gridSize);
      const cellKey = `${cellX},${cellY}`;

      if (!this.spatialGrid.cells.has(cellKey)) {
        this.spatialGrid.cells.set(cellKey, []);
      }

      this.spatialGrid.cells.get(cellKey).push(floatie);
    }
  }

  /**
   * Get nearby floaties using spatial grid
   * @param {Object} floatie - Floatie to check
   * @param {number} radius - Search radius
   * @returns {Array} Nearby floaties
   */
  getNearbyFloaties(floatie, radius) {
    if (!this.spatialGrid) return [];

    const nearby = [];
    const cellRadius = Math.ceil(radius / this.gridSize);
    const cellX = Math.floor(floatie.x / this.gridSize);
    const cellY = Math.floor(floatie.y / this.gridSize);

    // Check nearby cells
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const cx = cellX + dx;
        const cy = cellY + dy;
        const cellKey = `${cx},${cy}`;

        const cell = this.spatialGrid.cells.get(cellKey);
        if (cell) {
          for (const other of cell) {
            if (other.id !== floatie.id) {
              nearby.push(other);
            }
          }
        }
      }
    }

    return nearby;
  }

  /**
   * Apply separation force to prevent overlapping
   * @param {Object} floatie - Floatie to update
   * @param {Object} gameState - Centralized game state
   */
  applySeparation(floatie, gameState) {
    const minSpacing = gameState.board.minSpacing;
    const nearby = this.getNearbyFloaties(floatie, minSpacing * 1.5);

    let separationX = 0;
    let separationY = 0;

    for (const other of nearby) {
      const dx = floatie.x - other.x;
      const dy = floatie.y - other.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minSpacing && distance > 0) {
        // Calculate repelling force
        const force = (minSpacing - distance) / minSpacing;
        const angle = Math.atan2(dy, dx);

        separationX += Math.cos(angle) * force * this.separationStrength;
        separationY += Math.sin(angle) * force * this.separationStrength;
      }
    }

    floatie.vx += separationX;
    floatie.vy += separationY;
  }

  /**
   * Apply gentle random drift
   * @param {Object} floatie - Floatie to update
   * @param {Object} gameState - Centralized game state
   */
  applyDrift(floatie, gameState) {
    const driftStrength = gameState.board.driftStrength;

    // Add random drift to velocity
    floatie.vx += (Math.random() - 0.5) * driftStrength * 2;
    floatie.vy += (Math.random() - 0.5) * driftStrength * 2;

    // Limit drift magnitude
    const driftMagnitude = Math.sqrt(floatie.vx * floatie.vx + floatie.vy * floatie.vy);
    if (driftMagnitude > 2) {
      floatie.vx = (floatie.vx / driftMagnitude) * 2;
      floatie.vy = (floatie.vy / driftMagnitude) * 2;
    }
  }

  /**
   * Apply cluster attraction for same family floaties
   * @param {Object} floatie - Floatie to update
   * @param {Object} gameState - Centralized game state
   */
  applyClusterAttraction(floatie, gameState) {
    const nearby = this.getNearbyFloaties(floatie, gameState.board.minSpacing * 2);

    let attractionX = 0;
    let attractionY = 0;
    let sameFamily = 0;

    for (const other of nearby) {
      if (other.family === floatie.family) {
        const dx = other.x - floatie.x;
        const dy = other.y - floatie.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
          // Gentle attraction toward same family
          const force = 1 - (distance / (gameState.board.minSpacing * 2));
          attractionX += (dx / distance) * force * this.clusterAttraction;
          attractionY += (dy / distance) * force * this.clusterAttraction;
          sameFamily++;
        }
      }
    }

    if (sameFamily > 0) {
      floatie.vx += attractionX;
      floatie.vy += attractionY;
    }
  }

  /**
   * Apply boundary containment
   * @param {Object} floatie - Floatie to update
   * @param {Object} gameState - Centralized game state
   */
  applyBoundaryContainment(floatie, gameState) {
    const playArea = document.getElementById('playArea');
    if (!playArea) return;

    const width = playArea.clientWidth;
    const height = playArea.clientHeight;
    const padding = gameState.board.boundaryPadding;
    const radius = floatie.radius || 20;

    // Check boundaries
    if (floatie.x - radius < padding) {
      floatie.vx += this.boundaryRepulsion;
      floatie.x = padding + radius;
    }

    if (floatie.x + radius > width - padding) {
      floatie.vx -= this.boundaryRepulsion;
      floatie.x = width - padding - radius;
    }

    if (floatie.y - radius < padding) {
      floatie.vy += this.boundaryRepulsion;
      floatie.y = padding + radius;
    }

    if (floatie.y + radius > height - padding) {
      floatie.vy -= this.boundaryRepulsion;
      floatie.y = height - padding - radius;
    }
  }

  /**
   * Get board statistics
   * @param {Object} gameState - Centralized game state
   * @returns {Object} Statistics
   */
  getBoardStats(gameState) {
    if (!gameState.floats) {
      return {
        floatieCount: 0,
        avgSpacing: 0,
        clusterCount: 0
      };
    }

    let totalDistance = 0;
    let pairCount = 0;
    const clusters = new Map();

    // Calculate average spacing
    for (let i = 0; i < gameState.floats.length; i++) {
      for (let j = i + 1; j < Math.min(i + 5, gameState.floats.length); j++) {
        const f1 = gameState.floats[i];
        const f2 = gameState.floats[j];

        if (f1.isActive && f2.isActive) {
          const dx = f1.x - f2.x;
          const dy = f1.y - f2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          totalDistance += distance;
          pairCount++;
        }
      }
    }

    // Count clusters
    for (const floatie of gameState.floats) {
      if (!floatie.isActive) continue;

      const key = floatie.family;
      clusters.set(key, (clusters.get(key) || 0) + 1);
    }

    return {
      floatieCount: gameState.floats.filter(f => f.isActive).length,
      avgSpacing: pairCount > 0 ? totalDistance / pairCount : 0,
      clusterCount: clusters.size,
      clusters: Object.fromEntries(clusters)
    };
  }

  /**
   * Adjust board parameters
   * @param {Object} gameState - Centralized game state
   * @param {Object} params - Parameters to adjust
   */
  adjustBoardParams(gameState, params) {
    if (params.minSpacing !== undefined) {
      gameState.board.minSpacing = params.minSpacing;
    }
    if (params.driftStrength !== undefined) {
      gameState.board.driftStrength = params.driftStrength;
    }
    if (params.boundaryPadding !== undefined) {
      gameState.board.boundaryPadding = params.boundaryPadding;
    }

    console.log('📊 Board parameters adjusted:', gameState.board);
  }

  /**
   * Get spatial grid info
   * @returns {Object} Grid info
   */
  getGridInfo() {
    if (!this.spatialGrid) {
      return { status: 'not initialized' };
    }

    return {
      gridSize: this.gridSize,
      width: this.spatialGrid.width,
      height: this.spatialGrid.height,
      cellCount: this.spatialGrid.cells.size,
      avgFloatiesPerCell: this.spatialGrid.cells.size > 0
        ? Array.from(this.spatialGrid.cells.values()).reduce((sum, cell) => sum + cell.length, 0) / this.spatialGrid.cells.size
        : 0
    };
  }
}
