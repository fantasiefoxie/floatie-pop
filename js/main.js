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

function popFloat(o) {
  els.popSound.currentTime = 0;
  els.popSound.play().catch(() => {});
  const c = cat(o.type);
  state.itemChain = (o.type === state.lastItem) ? state.itemChain + 1 : 1;
  state.typeChain = (c === state.lastType) ? state.typeChain + 1 : 1;
  state.lastItem = o.type; state.lastType = c;
  state.combo++;
  if (state.combo > state.highScore) {
    state.highScore = state.combo;
    saveHighScore();
  }
  showPop(o.x, o.y, els.play);
  removeFloat(o);
  if (state.itemChain === 3) softBurst(o.type, removeFloat);
  if (state.typeChain === 6) { typeBurst(c, removeFloat); }
  if (state.combo % 50 === 0) unlockCard(els.cardReveal);
  while (state.floats.length < 27) spawn(els.play, popFloat);
  updateGlow();
  updateStats(els.combo, els.stats);
}

function updateGlow() {
  state.floats.forEach(f => {
    f.el.classList.remove("active", "passive");
    if (cat(f.type) === state.lastType) f.el.classList.add("active");
    else f.el.classList.add("passive");
  });
}

function animate() {
  if (!state.paused) {
    state.floats.forEach(f => {
      f.x += f.vx; f.y += f.vy;
      if (f.x < 0 || f.x > els.play.clientWidth - 40) f.vx *= -1;
      if (f.y < 0 || f.y > els.play.clientHeight - 40) f.vy *= -1;
      f.el.style.transform = `translate(${f.x}px, ${f.y}px)`;
    });
  }
  requestAnimationFrame(animate);
}

window.addEventListener('load', () => {
  els.play.innerHTML = "";
  state.floats = [];
  for (let i = 0; i < 27; i++) spawn(els.play, popFloat);
  state.paused = false;
  updateStats(els.combo, els.stats);
  setTimeout(() => { els.stats.style.opacity = 1; }, 3000);
  animate();
});

document.addEventListener('pointerdown', () => {
  if (els.blue.paused) els.blue.play().catch(() => {});
}, { once: true });

els.deckBtn.onclick = () => {
  els.deckPanel.style.display = "flex";
  import('./deck.js').then(m => m.renderDeck(els.cardGrid));
};
document.getElementById("deckBack").onclick = () => els.deckPanel.style.display = "none";
