import { ALL } from './constants.js';
import { state } from './state.js';
import { cat, rv, showPop } from './utils.js';

import { ALL } from './constants.js';
import { state } from './state.js';
import { cat, rv } from './utils.js';
import { runManager } from './runManager.js';
import { cardInventory, applyMovementModifiers, shouldBeRareFloatie } from './cardSystem.js';
import { boardGenerator } from './boardGenerator.js';
import { playerProgression } from './playerProgression.js';

export function spawn(playArea, handler) {
  // Get available floaties from player progression
  const availableFloaties = runManager.isRunActive() 
    ? playerProgression.getAvailableFloaties()
    : ALL;
    
  // Use run manager's seeded random if run is active
  const floatieType = runManager.isRunActive() 
    ? runManager.getRandomFloatieType(availableFloaties)
    : availableFloaties[Math.floor(Math.random() * availableFloaties.length)];
    
  const el = document.createElement("div");
  el.className = "float";
  
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
  const baseSpeed = rv(active);
  
  // Apply speed reduction from cards and difficulty
  const speedReduction = cardInventory.getModifier('speedReduction');
  const difficultySpeed = state.difficultyMovementSpeed || 1.0;
  
  const o = {
    el,
    type: floatieType,
    isRare,
    x: Math.random() * (playArea.clientWidth - 40),
    y: Math.random() * (playArea.clientHeight - 40),
    vx: baseSpeed * state.speedMultiplier * speedReduction * difficultySpeed,
    vy: baseSpeed * state.speedMultiplier * speedReduction * difficultySpeed
  };
  
  el.onclick = () => !state.paused && handler(o);
  state.floats.push(o);
}

export function removeFloat(o) {
  o.el.remove();
  state.floats = state.floats.filter(f => f !== o);
}

export function spawnFromBoard(playArea, handler, boardFloaties) {
  // Clear existing floaties
  state.floats.forEach(f => f.el && f.el.remove());
  state.floats = [];
  
  // Spawn floaties from generated board
  boardFloaties.forEach(boardFloatie => {
    const el = document.createElement("div");
    el.className = "float";
    
    if (boardFloatie.isRare) {
      el.classList.add('rare');
    }
    
    if (boardFloatie.isClusterMember) {
      el.classList.add('cluster-member');
    }
    
    if (boardFloatie.isSpecialFormation) {
      el.classList.add('special-formation');
    }
    
    el.textContent = boardFloatie.type;
    el.style.transform = `translate(${boardFloatie.x}px, ${boardFloatie.y}px)`;
    playArea.appendChild(el);
    
    const floatie = {
      el,
      type: boardFloatie.type,
      isRare: boardFloatie.isRare,
      x: boardFloatie.x,
      y: boardFloatie.y,
      vx: boardFloatie.vx,
      vy: boardFloatie.vy,
      clusterId: boardFloatie.clusterId,
      family: boardFloatie.family,
      isClusterMember: boardFloatie.isClusterMember
    };
    
    el.onclick = () => !state.paused && handler(floatie);
    state.floats.push(floatie);
  });
}

export function softBurst(t, removeFn) {
  state.floats.filter(f => f.type === t).slice(0, 2).forEach(f => {
    showPop(f.x, f.y, f.el.parentElement);
    removeFn(f);
  });
}

export function typeBurst(c, removeFn) {
  state.floats.filter(f => cat(f.type) === c).forEach(f => {
    showPop(f.x, f.y, f.el.parentElement);
    removeFn(f);
  });
}
