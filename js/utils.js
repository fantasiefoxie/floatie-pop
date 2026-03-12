import { FOOD, FLOWERS, HUMAN } from './constants.js';

export const cat = (x) => 
  FOOD.includes(x) ? "food" : 
  FLOWERS.includes(x) ? "flower" : 
  HUMAN.includes(x) ? "human" : "animal";

export function rv(active) {
  const b = (Math.random() - .5) * 1.4 || .6;
  return active ? b * 0.8 : b * 1.3;
}

export function showPop(x, y, parent) {
  const d = document.createElement("div");
  d.className = "candy";
  d.textContent = "POP!";
  d.style.left = x + "px";
  d.style.top = y + "px";
  parent.appendChild(d);
  setTimeout(() => d.remove(), 600);
}

export function updateScoreDisplay(scoreEl, comboEl) {
  if (scoreEl) scoreEl.textContent = `Score: ${state.score}`;
  if (comboEl) comboEl.textContent = `Combo: ${state.combo}`;
}
