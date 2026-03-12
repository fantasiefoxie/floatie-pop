import { CARD_POOL } from './constants.js';
import { gameState, persistData } from './state.js';

export function unlockCard(cardRevealEl) {
  const c = CARD_POOL[Math.floor(Math.random() * CARD_POOL.length)];
  if (gameState.cards.find(d => d.name === c.name)) return;
  gameState.cards.push(c);
  persistData();
  
  cardRevealEl.innerHTML = `✨ <b>${c.name}</b><br><i>${c.quote}</i>`;
  cardRevealEl.classList.remove("show");
  void cardRevealEl.offsetWidth;
  cardRevealEl.classList.add("show");
  setTimeout(() => cardRevealEl.classList.remove("show"), 2600);
}

export function renderDeck(cardGridEl) {
  cardGridEl.innerHTML = "";
  gameState.cards.filter(c => !c.isAction).forEach(c => {
    const d = document.createElement("div");
    d.className = "card";
    d.innerHTML = `<div class="stamp">★ COLLECTIBLE</div>
    <b>${c.name}</b><br>${c.arcana}<br>
    ❤ ${c.charm} ⚡ ${c.power}<br><i>${c.quote}</i><br>${c.flavor}`;
    cardGridEl.appendChild(d);
  });
}

export function updateStats(comboEl, statsEl) {
  comboEl.textContent = `Combo ${gameState.combo} | Item ${gameState.itemChain} | Type ${gameState.typeChain}`;
  statsEl.textContent = `Highest Score ${gameState.highScore}`;
}
