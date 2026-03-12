import { state, saveHighScore } from './state.js';
import { cat, showPop } from './utils.js';
import { spawn, removeFloat, softBurst, typeBurst } from './game.js';
import { unlockCard, updateStats } from './deck.js';

const els = {
  play: document.getElementById("playArea"),
  combo: document.getElementById("combo"),
  stats: document.getElementById("stats"),
  deckBtn: document.getElementById("deckBtn"),
  deckPanel: document.getElementById("deckPanel"),
  cardGrid: document.getElementById("cardGrid"),
  cardReveal: document.getElementById("cardReveal"),
  blue: document.getElementById("blue"),
  popSound: document.getElementById("popSound")
};

import { state, saveHighScore } from './state.js';
import { cat, showPop, updateScoreDisplay } from './utils.js';
import { spawn, removeFloat, softBurst, typeBurst } from './game.js';
import { unlockCard, updateStats } from './deck.js';
import { calculateScore, addScore, showFloatingScore, isRareFloatie } from './scoring.js';

const els = {
  play: document.getElementById("playArea"),
  combo: document.getElementById("combo"),
  stats: document.getElementById("stats"),
  deckBtn: document.getElementById("deckBtn"),
  deckPanel: document.getElementById("deckPanel"),
  cardGrid: document.getElementById("cardGrid"),
  cardReveal: document.getElementById("cardReveal"),
  blue: document.getElementById("blue"),
  popSound: document.getElementById("popSound")
};

import { state, saveHighScore, resetSession } from './state.js';
import { cat, showPop, updateScoreDisplay } from './utils.js';
import { spawn, removeFloat, softBurst, typeBurst, spawnFromBoard } from './game.js';
import { unlockCard, updateStats } from './deck.js';
import { calculateScore, addScore, showFloatingScore, isRareFloatie } from './scoring.js';
import { updateSurvivalSpawn, checkGameOver, formatTime, resetSurvivalMode } from './survival.js';
import { downloadShareCard, shareToClipboard, shareToSocial } from './share.js';
import { runManager } from './runManager.js';
import { cardInventory, applyCardModifiers, getModifiedComboThresholds, getModifiedScore, getModifiedPopCount } from './cardSystem.js';
import { difficultyScaler } from './difficultyScaler.js';
import { generateBoard } from './boardGenerator.js';
import { synergySystem } from './synergySystem.js';
import { bossSystem } from './bossSystem.js';
import { playerProgression } from './playerProgression.js';
import { musicManager } from './musicManager.js';
import { performanceOptimizer, optimizedGameEngine } from './performanceOptimizer.js';

const els = {
  play: document.getElementById("playArea"),
  combo: document.getElementById("combo"),
  stats: document.getElementById("stats"),
  timer: document.getElementById("timer"),
  runInfo: document.getElementById("runInfo"),
  modeBtn: document.getElementById("modeBtn"),
  runBtn: document.getElementById("runBtn"),
  progressBtn: document.getElementById("progressBtn"),
  perfBtn: document.getElementById("perfBtn"),
  shareBtn: document.getElementById("shareBtn"),
  deckBtn: document.getElementById("deckBtn"),
  deckPanel: document.getElementById("deckPanel"),
  cardGrid: document.getElementById("cardGrid"),
  cardReveal: document.getElementById("cardReveal"),
  blue: document.getElementById("blue"),
  popSound: document.getElementById("popSound")
};

let gameStartTime = 0;

function popFloat(o) {
  if (state.gameOver) return;
  
  els.popSound.currentTime = 0;
  els.popSound.play().catch(() => {});
  const c = cat(o.type);
  
  // Get modified combo thresholds from cards and synergies
  const thresholds = synergySystem.getModifiedComboThresholds();
  
  state.itemChain = (o.type === state.lastItem) ? state.itemChain + 1 : 1;
  state.typeChain = (c === state.lastType) ? state.typeChain + 1 : 1;
  state.lastItem = o.type; state.lastType = c;
  
  // Apply synergy pop count effects
  const popCount = synergySystem.getModifiedPopCount();
  state.combo += popCount;
  
  // Calculate score with bonuses, card modifiers, and synergies
  const isClusterPop = state.itemChain === thresholds.itemChainThreshold || state.typeChain === thresholds.typeChainThreshold;
  const isCardChain = state.combo % 50 === 0;
  const isRareBonus = o.isRare || isRareFloatie(o.type);
  const isRainbow = o.isRainbow || false;
  
  let points = calculateScore(o.type, isClusterPop, isCardChain);
  
  // Apply synergy score modifiers
  const isBonus = isClusterPop || isRareBonus || isCardChain;
  points = synergySystem.getModifiedScore(points, isBonus, isRareBonus, isRainbow);
  
  addScore(points);
  
  // Show floating score with bonus indication
  showFloatingScore(o.x, o.y, points, els.play, isBonus || isRainbow);
  
  if (state.score > state.highScore) {
    saveHighScore();
  }
  
  showPop(o.x, o.y, els.play);
  removeFloat(o);
  
  // Use modified thresholds for bursts
  if (state.itemChain === thresholds.itemChainThreshold) softBurst(o.type, removeFloat);
  if (state.typeChain === thresholds.typeChainThreshold) { typeBurst(c, removeFloat); }
  if (state.combo % 50 === 0) unlockCard(els.cardReveal);
  
  if (state.gameMode === "classic") {
    const targetDensity = runManager.isRunActive() ? (state.difficultyBoardDensity || 27) : 27;
    while (state.floats.length < targetDensity) spawn(els.play, popFloat);
  }
  
  updateGlow();
  updateScoreDisplay(document.getElementById("score"), els.combo);
  updateStats(els.combo, els.stats);
}

function updateGlow() {
  state.floats.forEach(f => {
    f.el.classList.remove("active", "passive");
    if (cat(f.type) === state.lastType) f.el.classList.add("active");
    else f.el.classList.add("passive");
  });
}

// Optimized animation loop using performance optimizer
function animate() {
  if (!state.paused && !state.gameOver) {
    // Update run manager
    if (runManager.isRunActive()) {
      runManager.updateRun();
      updateRunDisplay();
      
      // Check and apply synergies (throttled)
      if (performance.now() % 200 < 16) { // Every ~200ms
        synergySystem.checkSynergies();
        synergySystem.applySynergyEffects();
      }
      
      // Update boss system (throttled)
      if (performance.now() % 100 < 16) { // Every ~100ms
        bossSystem.updateBoss();
      }
    }
    
    // Update survival timer
    if (state.gameMode === "survival") {
      state.survivalTime = Date.now() - gameStartTime;
      if (els.timer) {
        const timeText = `Time: ${formatTime(state.survivalTime)}`;
        if (els.timer.textContent !== timeText) {
          els.timer.textContent = timeText;
          performanceOptimizer.recordDOMUpdate();
        }
      }
      
      updateSurvivalSpawn(els.play, popFloat);
      checkGameOver(els.play);
    }
    
    // Batch floatie updates
    const playAreaBounds = {
      left: 0,
      top: 0,
      right: els.play.clientWidth - 40,
      bottom: els.play.clientHeight - 40
    };
    
    // Use batched transform updates
    const transformUpdates = [];
    
    state.floats.forEach(f => {
      f.x += f.vx; 
      f.y += f.vy;
      
      if (f.x < playAreaBounds.left || f.x > playAreaBounds.right) f.vx *= -1;
      if (f.y < playAreaBounds.top || f.y > playAreaBounds.bottom) f.vy *= -1;
      
      // Batch transform update instead of immediate DOM update
      transformUpdates.push({ element: f.el, x: f.x, y: f.y });
      
      // Apply movement modifiers from cards (throttled)
      if (runManager.isRunActive() && Math.random() < 0.1) {
        applyMovementModifiers(f);
      }
    });
    
    // Apply all transform updates in batch
    transformUpdates.forEach(update => {
      if (update.element) {
        update.element.style.transform = `translate(${update.x}px, ${update.y}px)`;
        performanceOptimizer.recordDOMUpdate();
      }
    });
  }
  
  // Use optimized RAF scheduling
  performanceOptimizer.scheduleRAF(animate);
}

function updateRunDisplay() {
  if (els.runInfo && runManager.isRunActive()) {
    const runState = runManager.getCurrentRun();
    const activeCards = cardInventory.getActiveCards();
    const activeSynergies = synergySystem.getActiveSynergies();
    const difficulty = difficultyScaler.getCurrentDifficulty();
    const difficultyDesc = difficultyScaler.getDifficultyDescription(difficulty);
    const difficultyColor = difficultyScaler.getDifficultyColor(difficulty);
    
    els.runInfo.innerHTML = `
      <div>Run ${runState.runSeed}</div>
      <div>Level ${runState.level}</div>
      <div style="color: ${difficultyColor}">${difficultyDesc}</div>
      <div>Cards: ${runState.cardsOwned.length}</div>
      ${activeSynergies.length > 0 ? `<div class="synergies-display">${activeSynergies.slice(0, 2).map(s => `${s.icon} ${s.name}`).join('<br>')}</div>` : ''}
      ${activeCards.length > 0 ? `<div class="active-cards">${activeCards.slice(-2).map(card => `🎴 ${card.name}`).join('<br>')}</div>` : ''}
    `;
    els.runInfo.style.display = 'block';
  } else if (els.runInfo) {
    els.runInfo.style.display = 'none';
  }
}

function startNewRun() {
  // End current run if active
  if (runManager.isRunActive()) {
    runManager.endRun();
  }
  
  // Start new run
  runManager.startRun();
  
  // Reset game to run mode
  state.gameMode = "classic"; // Runs use classic mode mechanics
  els.play.innerHTML = "";
  state.floats = [];
  
  // Generate procedural board for this level
  const runState = runManager.getCurrentRun();
  const board = generateBoard(runState.runSeed, runState.level, els.play);
  
  // Spawn floaties from generated board
  spawnFromBoard(els.play, popFloat, board.floaties);
  
  state.paused = false;
  updateScoreDisplay(document.getElementById("score"), els.combo);
  updateRunDisplay();
  
  // Update button text
  if (els.runBtn) els.runBtn.textContent = "End Run";
}
function toggleGameMode() {
  // Don't allow mode switching during active run
  if (runManager.isRunActive()) {
    runManager.showNotification("End current run to switch modes", "warning");
    return;
  }
  
  state.gameMode = state.gameMode === "classic" ? "survival" : "classic";
  els.modeBtn.textContent = state.gameMode === "survival" ? "Classic Mode" : "Survival Mode";
  
  // Show/hide share button based on mode
  if (els.shareBtn) {
    els.shareBtn.style.display = state.gameMode === "classic" ? "block" : "none";
  }
  
  // Reset game
  els.play.innerHTML = "";
  state.floats = [];
  resetSession();
  resetSurvivalMode();
  
  if (state.gameMode === "classic") {
    els.timer.style.display = "none";
    for (let i = 0; i < 27; i++) spawn(els.play, popFloat);
  } else {
    els.timer.style.display = "block";
    gameStartTime = Date.now();
  }
  
  state.paused = false;
  updateScoreDisplay(document.getElementById("score"), els.combo);
}

function toggleRun() {
  if (runManager.isRunActive()) {
    runManager.endRun();
    els.runBtn.textContent = "Start Run";
    updateRunDisplay();
    
    // Return to normal classic mode
    state.gameMode = "classic";
    toggleGameMode(); // Reset to normal mode
  } else {
    startNewRun();
  }
}

window.addEventListener('load', () => {
  els.play.innerHTML = "";
  state.floats = [];
  gameStartTime = Date.now();
  
  // Set global popFloat handler
  window.popFloatHandler = popFloat;
  
  // Initialize music manager
  musicManager.initialize().catch(console.error);
  
  // Start performance monitoring
  console.log('🔍 Starting performance monitoring...');
  performanceOptimizer.startMonitoring();
  
  if (state.gameMode === "classic") {
    for (let i = 0; i < 27; i++) spawn(els.play, popFloat);
  }
  
  state.paused = false;
  updateScoreDisplay(document.getElementById("score"), els.combo);
  updateStats(els.combo, els.stats);
  setTimeout(() => { els.stats.style.opacity = 1; }, 3000);
  
  // Start optimized animation loop
  animate();
  
  // Generate performance report after 10 seconds
  setTimeout(() => {
    const report = performanceOptimizer.generateReport();
    console.log('📊 Initial Performance Report:');
    console.table(report);
  }, 10000);
});

if (els.modeBtn) els.modeBtn.onclick = toggleGameMode;
if (els.runBtn) els.runBtn.onclick = toggleRun;
if (els.progressBtn) els.progressBtn.onclick = () => playerProgression.showProgressionPanel();
if (els.perfBtn) els.perfBtn.onclick = () => performanceOptimizer.showPerformancePanel();
if (els.shareBtn) els.shareBtn.onclick = () => triggerGameOver();

// Global functions for share buttons
window.downloadShare = () => downloadShareCard();
window.shareClipboard = () => shareToClipboard();
window.shareScore = () => shareToSocial();

// Make popFloat available globally for board generation
window.popFloatHandler = null;

function showGameOverScreen() {
  const gameOverEl = document.createElement("div");
  gameOverEl.className = "game-over";
  
  let content = `<h2>Game Over!</h2>`;
  
  if (state.gameMode === 'survival') {
    content += `<p>Survival Time: ${formatTime(state.survivalTime)}</p>`;
  }
  
  content += `
    <p>Final Score: ${state.score.toLocaleString()}</p>
    <p>Best Combo: ${state.combo}</p>
    <div class="share-buttons">
      <button onclick="window.downloadShare()">📥 Download</button>
      <button onclick="window.shareClipboard()">📋 Copy</button>
      <button onclick="window.shareScore()">📱 Share</button>
    </div>
    <button class="play-again" onclick="location.reload()">Play Again</button>
  `;
  
  gameOverEl.innerHTML = content;
  els.play.appendChild(gameOverEl);
}

// Add manual game over trigger for classic mode
function triggerGameOver() {
  state.gameOver = true;
  state.paused = true;
  showGameOverScreen();
}

// Add keyboard shortcut to end game and share (for classic mode)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.shiftKey && state.gameMode === 'classic' && !state.gameOver) {
    triggerGameOver();
  }
});

document.addEventListener('pointerdown', () => {
  if (els.blue.paused) els.blue.play().catch(() => {});
}, { once: true });

els.deckBtn.onclick = () => {
  els.deckPanel.style.display = "flex";
  import('./deck.js').then(m => m.renderDeck(els.cardGrid));
};
document.getElementById("deckBack").onclick = () => els.deckPanel.style.display = "none";
