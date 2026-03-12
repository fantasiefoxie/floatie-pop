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

export function showScoreText(x, y, val, parent) {
  const d = document.createElement("div");
  d.className = "score-text";
  d.textContent = `+${val}`;
  d.style.left = x + "px";
  d.style.top = (y - 20) + "px";
  parent.appendChild(d);
  setTimeout(() => d.remove(), 800);
}

export function getSeededRandom(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
