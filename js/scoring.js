import { state } from './state.js';
import { HUMAN, ANIMALS } from './constants.js';

const BASE_SCORE = 10;

export function calculateScore(floatType, isClusterPop = false, isCardChain = false) {
  const comboMultiplier = Math.max(1, Math.floor(state.combo / 10) + 1);
  let score = BASE_SCORE * comboMultiplier;
  
  // Bonus events
  if (isClusterPop) score += 50;
  if (isRareFloatie(floatType)) score += 100;
  if (isCardChain) score += 200;
  
  return score;
}

export function isRareFloatie(floatType) {
  return HUMAN.includes(floatType) || ANIMALS.includes(floatType);
}

export function addScore(points) {
  state.score += points;
  if (state.score > state.highScore) {
    state.highScore = state.score;
  }
}

export function showFloatingScore(x, y, points, parent, isBonus = false) {
  const scoreEl = document.createElement("div");
  scoreEl.className = isBonus ? "floating-score bonus" : "floating-score";
  scoreEl.textContent = `+${points}`;
  scoreEl.style.left = x + "px";
  scoreEl.style.top = y + "px";
  parent.appendChild(scoreEl);
  setTimeout(() => scoreEl.remove(), 1000);
}