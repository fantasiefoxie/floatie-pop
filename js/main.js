import { spawn, removeFloatData, updatePhysics, getBurstItems } from './game.js';
import { unlockCard, updateStats } from './deck.js';
import { bus } from './events.js';
import { getSeededRandom, showPop, showScoreText, cat } from './utils.js';
import { initTray } from './tray.js';

const els = {
  play: document.getElementById("playArea"),
  combo: document.getElementById("combo"),
  stats: document.getElementById("stats"),
  cardReveal: document.getElementById("cardReveal"),
  popSound: document.getElementById("popSound")
};

const domMap = new Map(); // id -> HTMLElement
let seededRand = null;
const ACTION_TYPES = ["shuffleRow", "spawnFamily", "clearCluster", "magnetizeFamily"];

function updateGame() {
  if (gameState.paused) return;
  updatePhysics(els.play.clientWidth, els.play.clientHeight);
  while (gameState.floaties.length < 27) {
    const f = createFloatData(els.play.clientWidth, els.play.clientHeight);
    gameState.floaties.push(f);
    bus.emit("floatieSpawned", f);
  }

  // Parasite infection logic
  gameState.floaties.forEach(f => {
    if (f.behavior === "parasite") {
      f.timer -= 16.67; // Approx 60fps
      if (f.timer <= 0) {
        f.timer = 5000; // Reset timer
        const neighbors = gameState.floaties.filter(n => n.id !== f.id && Math.hypot(n.x - f.x, n.y - f.y) < 60);
        neighbors.forEach(n => {
          n.type = f.type;
          n.behavior = "parasite";
          n.rarity = "parasite";
          n.timer = 5000;
        });
      }
    }
  });
}

function renderGame() {
  // Sync DOM elements with state
  gameState.floaties.forEach(f => {
    let el = domMap.get(f.id);
    if (f.isNew || !el) {
      el = document.createElement("div");
      el.className = "float";
      el.textContent = f.type;
      el.onclick = () => handlePop(f);
      els.play.appendChild(el);
      domMap.set(f.id, el);
      f.isNew = false;
    }
    el.className = `float rarity-${f.rarity}`;
    el.style.transform = `translate(${f.x}px, ${f.y}px)`;
    updateGlow(el, f.type, f.rarity);
  });
  
  // Cleanup removed elements
  for (let [id, el] of domMap) {
    if (!gameState.floaties.find(f => f.id === id)) {
      el.remove();
      domMap.delete(id);
    }
  }
  updateStats(els.combo, els.stats);
}

function updateGlow(el, type, rarity) {
  el.classList.remove("active", "passive");
  if (rarity === "rainbow" || cat(type) === gameState.lastFamily) el.classList.add("active");
  else el.classList.add("passive");
}

function handlePop(f) {
  if (gameState.paused) return;
  els.popSound.currentTime = 0;
  els.popSound.play().catch(() => {});
  
  const c = (f.rarity === "rainbow") ? gameState.lastFamily : cat(f.type);
  
  // Family-based combo logic (Rainbow sustains current family)
  if (f.rarity === "rainbow" || c === gameState.lastFamily) {
    gameState.combo++;
  } else {
    gameState.combo = 1;
    gameState.lastFamily = c;
    gameState.multiplier = 1;
  }

  // Effect execution
  if (f.effect === "radius_clear") {
    gameState.floaties.filter(other => {
      const dist = Math.hypot(other.x - f.x, other.y - f.y);
      return dist < 150 && other.id !== f.id;
    }).forEach(other => { bus.emit("floatiePopped", other); removeFloatData(other.id); });
  }

  if (f.effect === "pull_family") {
    gameState.floaties.filter(other => cat(other.type) === gameState.lastFamily).forEach(other => {
      other.vx = (f.x - other.x) * 0.05;
      other.vy = (f.y - other.y) * 0.05;
    });
  }

  // Multiplier logic
  if (gameState.combo >= 3) {
    gameState.multiplier = 2;
  }

  gameState.itemChain = (f.type === gameState.lastItem) ? gameState.itemChain + 1 : 1;
  gameState.typeChain = (c === gameState.lastType) ? gameState.typeChain + 1 : 1;
  gameState.lastItem = f.type; gameState.lastType = c;
  
  gameState.popCount++;
  
  let gain = 10 * gameState.multiplier;
  
  // Rare Floaties Bonus
  if (f.rarity !== "normal") gain += 100;

  if (gameState.combo > gameState.highScore) {
    gameState.highScore = gameState.combo;
    persistData();
  }
  
  // Transition to event-driven side effects
  bus.emit("floatiePopped", f);
  bus.emit("comboUpdated", { combo: gameState.combo, highScore: gameState.highScore });
  
  if (gameState.itemChain === 3) {
    const bursts = getBurstItems(f.type, "");
    bursts.byType.forEach(b => { 
      bus.emit("floatiePopped", b); 
      removeFloatData(b.id); 
    });
  }
  
  if (gameState.typeChain === 6) {
    const bursts = getBurstItems("", c);
    bursts.byCat.forEach(b => { 
      bus.emit("floatiePopped", b); 
      removeFloatData(b.id); 
    });
  }
  
  if (gameState.popCount % 5 === 0) {
    if (!seededRand) seededRand = getSeededRandom(gameState.spawnSeed);
    const type = ACTION_TYPES[Math.floor(seededRand() * ACTION_TYPES.length)];
    const newCard = {
      name: type.charAt(0).toUpperCase() + type.slice(1),
      type: type,
      isAction: true,
      id: "card-" + Math.random().toString(36).substr(2, 5)
    };
    gameState.cards.push(newCard);
    bus.emit("cardGenerated", newCard);
    gain += 200; // Card Chain Bonus
  }
  
  if (gameState.popCount % 50 === 0) {
    const collectible = { isAction: false }; 
    bus.emit("cardGenerated", collectible);
  }

  // Cluster Bonuses
  if (gameState.itemChain === 3) {
    const bursts = getBurstItems(f.type, "");
    bursts.byType.forEach(b => { 
      bus.emit("floatiePopped", b); 
      removeFloatData(b.id); 
    });
    gain += 50;
  }
  
  if (gameState.typeChain === 6) {
    const bursts = getBurstItems("", c);
    bursts.byCat.forEach(b => { 
      bus.emit("floatiePopped", b); 
      removeFloatData(b.id); 
    });
    gain += 50;
  }

  // Apply final score and feedback
  gameState.score += gain;
  showScoreText(f.x, f.y, gain, els.play);

  // Combo Milestones
  if (gameState.combo === 5) {
    bus.emit("comboSpecialTriggered", { type: "SPAWN_SPECIAL" });
  }
  if (gameState.combo === 7) {
    bus.emit("comboSpecialTriggered", { type: "SCREEN_RIPPLE" });
  }
  
  removeFloatData(f.id);
}

function loop() {
  updateGame();
  renderGame();
  requestAnimationFrame(loop);
}

window.addEventListener('load', () => {
  // Define Event Listeners for side effects
  bus.on("floatiePopped", (f) => {
    els.popSound.currentTime = 0;
    els.popSound.play().catch(() => {});
    showPop(f.x, f.y, els.play);
  });

  bus.on("comboUpdated", () => {
    updateStats(els.combo, els.stats);
  });

  bus.on("cardGenerated", (card) => {
    if (!card.isAction) unlockCard(els.cardReveal);
  });

  bus.on("comboSpecialTriggered", (data) => {
    if (data.type === "SPAWN_SPECIAL") {
      const spec = createFloatData(els.play.clientWidth, els.play.clientHeight, true);
      gameState.floaties.push(spec);
      bus.emit("floatieSpawned", spec);
    }
    if (data.type === "SCREEN_RIPPLE") {
      els.play.classList.add("ripple-active");
      setTimeout(() => els.play.classList.remove("ripple-active"), 1000);
    }
  });

  gameState.paused = false;
  initTray();
  loop();
});

document.addEventListener('pointerdown', () => {
  const blue = document.getElementById("blue");
  if (blue.paused) blue.play().catch(() => {});
}, { once: true });

document.getElementById("deckBtn").onclick = () => {
  document.getElementById("deckPanel").style.display = "flex";
  import('./deck.js').then(m => m.renderDeck(document.getElementById("cardGrid")));
};
document.getElementById("deckBack").onclick = () => document.getElementById("deckPanel").style.display = "none";
