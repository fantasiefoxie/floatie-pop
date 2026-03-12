import { ALL, SPAWN_RATES, RAINBOW, MAGNET, BOMB, CORAL, JELLY, PARASITE, ANCHOR } from './constants.js';
import { gameState } from './state.js';
import { cat, rv } from './utils.js';

// Strictly logic: creates the data representation of a floatie
export function createFloatData(playWidth, playHeight, isSpecial = false) {
  const rand = Math.random();
  let type = ALL[Math.floor(Math.random() * ALL.length)];
  let rarity = "normal";
  let effect = null;

  if (isSpecial) {
    type = "🦄";
    rarity = "special";
  } else if (rand < SPAWN_RATES.BOMB) {
    type = BOMB[0]; rarity = "bomb"; effect = "radius_clear";
  } else if (rand < SPAWN_RATES.BOMB + SPAWN_RATES.MAGNET) {
    type = MAGNET[0]; rarity = "magnet"; effect = "pull_family";
  } else if (rand < SPAWN_RATES.BOMB + SPAWN_RATES.MAGNET + SPAWN_RATES.RAINBOW) {
    type = RAINBOW[0]; rarity = "rainbow"; effect = "wildcard";
  } else if (rand < SPAWN_RATES.BOMB + SPAWN_RATES.MAGNET + SPAWN_RATES.RAINBOW + SPAWN_RATES.PARASITE) {
    type = PARASITE[0]; rarity = "parasite"; effect = "infect";
  } else if (rand < SPAWN_RATES.BOMB + SPAWN_RATES.MAGNET + SPAWN_RATES.RAINBOW + SPAWN_RATES.PARASITE + SPAWN_RATES.ANCHOR) {
    type = ANCHOR[0]; rarity = "anchor"; effect = "block";
  }

  const behavior = (type === CORAL[0]) ? "coral" : 
                   (type === JELLY[0]) ? "jelly" : 
                   (type === PARASITE[0]) ? "parasite" : 
                   (type === ANCHOR[0]) ? "anchor" : null;

  const active = (rarity === "rainbow") || (cat(type) === gameState.lastFamily);
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    type, rarity, effect, behavior,
    timer: behavior === "parasite" ? 5000 : 0,
    x: Math.random() * (playWidth - 40),
    y: Math.random() * (playHeight - 40),
    vx: rv(active),
    vy: rv(active),
    isNew: true,
    isSpecial: isSpecial || rarity !== "normal"
  };
}

export function updatePhysics(playWidth, playHeight) {
  gameState.floaties.forEach(f => {
    if (f.behavior === "anchor") return; // Anchors cannot move
    
    if (f.behavior === "jelly") f.vy -= 0.02; // Slow upward drift
    
    if (f.behavior === "coral") { // Slowly cluster with neighbors
      const neighbors = gameState.floaties.filter(n => n.id !== f.id && Math.hypot(n.x - f.x, n.y - f.y) < 80);
      if (neighbors.length > 0) {
        const avgX = neighbors.reduce((acc, n) => acc + n.x, 0) / neighbors.length;
        const avgY = neighbors.reduce((acc, n) => acc + n.y, 0) / neighbors.length;
        f.vx += (avgX - f.x) * 0.001;
        f.vy += (avgY - f.y) * 0.001;
      }
    }

    f.x += f.vx; f.y += f.vy;
    if (f.x < 0 || f.x > playWidth - 40) f.vx *= -1;
    if (f.y < 0 || f.y > playHeight - 40) f.vy *= -1;
  });
}

export function removeFloatData(id) {
  gameState.floaties = gameState.floaties.filter(f => f.id !== id);
}

export function getBurstItems(type, category) {
  const byType = gameState.floaties.filter(f => f.type === type).slice(0, 2);
  const byCat = gameState.floaties.filter(f => cat(f.type) === category);
  return { byType, byCat };
}
