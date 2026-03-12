import { ALL } from './constants.js';
import { state } from './state.js';
import { cat, rv } from './utils.js';

let lastSpawnTime = 0;
let spawnInterval = 2000; // Start with 2 second intervals

import { ALL } from './constants.js';
import { state } from './state.js';
import { cat, rv } from './utils.js';
import { runManager } from './runManager.js';
import { cardInventory, shouldBeRareFloatie } from './cardSystem.js';

let lastSpawnTime = 0;
let spawnInterval = 2000; // Start with 2 second intervals

export function spawnFromBottom(playArea, handler) {
  // Use run manager's seeded random if run is active
  const floatieType = runManager.isRunActive() 
    ? runManager.getRandomFloatieType(ALL)
    : ALL[Math.floor(Math.random() * ALL.length)];
    
  const el = document.createElement("div");
  el.className = "float survival";
  
  // Check if should be rare based on card effects
  const isRare = runManager.isRunActive() 
    ? shouldBeRareFloatie(floatieType, () => runManager.random())
    : false;
    
  if (isRare) {
    el.classList.add('rare');
  }
  
  el.textContent = floatieType;
  playArea.appendChild(el);
  
  const active = cat(floatieType) === state.lastType;
  const baseSpeedMultiplier = 0.5 + (state.survivalTime / 60000) * 0.3;
  
  // Apply speed reduction from cards and difficulty
  const speedReduction = cardInventory.getModifier('speedReduction');
  const difficultySpeed = state.difficultyMovementSpeed || 1.0;
  
  const o = {
    el,
    type: floatieType,
    isRare,
    x: Math.random() * (playArea.clientWidth - 40),
    y: playArea.clientHeight - 40, // Start at bottom
    vx: rv(active) * 0.3 * state.speedMultiplier * speedReduction * difficultySpeed, // Slower horizontal movement
    vy: (-baseSpeedMultiplier) * state.speedMultiplier * speedReduction * difficultySpeed // Move up, speed increases over time
  };
  
  el.onclick = () => !state.paused && !state.gameOver && handler(o);
  state.floats.push(o);
}

export function updateSurvivalSpawn(playArea, handler) {
  if (state.gameOver || state.paused) return;
  
  const now = Date.now();
  
  // Decrease spawn interval over time (faster spawning)
  // Apply spawn rate multipliers from run system, cards, and difficulty
  const baseInterval = Math.max(500, 2000 - (state.survivalTime / 1000) * 20);
  const spawnRateReduction = cardInventory.getModifier('spawnRateReduction');
  const difficultySpawnRate = state.difficultySpawnRate || 1.0;
  
  spawnInterval = (baseInterval / (state.spawnRateMultiplier * difficultySpawnRate)) * spawnRateReduction;
  
  if (now - lastSpawnTime > spawnInterval) {
    spawnFromBottom(playArea, handler);
    lastSpawnTime = now;
  }
}

export function checkGameOver(playArea) {
  if (state.gameOver) return true;
  
  // Check if any floatie reached the top
  const gameOver = state.floats.some(f => f.y <= 0);
  
  if (gameOver) {
    state.gameOver = true;
    state.paused = true;
    showGameOver(playArea);
  }
  
  return gameOver;
}

function showGameOver(playArea) {
  const gameOverEl = document.createElement("div");
  gameOverEl.className = "game-over";
  gameOverEl.innerHTML = `
    <h2>Game Over!</h2>
    <p>Survival Time: ${formatTime(state.survivalTime)}</p>
    <p>Final Score: ${state.score.toLocaleString()}</p>
    <p>Best Combo: ${state.combo}</p>
    <div class="share-buttons">
      <button onclick="window.downloadShare()">📥 Download</button>
      <button onclick="window.shareClipboard()">📋 Copy</button>
      <button onclick="window.shareScore()">📱 Share</button>
    </div>
    <button class="play-again" onclick="location.reload()">Play Again</button>
  `;
  playArea.appendChild(gameOverEl);
}

// Global functions for share buttons
window.downloadShare = () => import('./share.js').then(m => m.downloadShareCard());
window.shareClipboard = () => import('./share.js').then(m => m.shareToClipboard());
window.shareScore = () => import('./share.js').then(m => m.shareToSocial());

export function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function resetSurvivalMode() {
  lastSpawnTime = 0;
  spawnInterval = 2000;
}