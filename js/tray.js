import { bus } from './events.js';
import { gameState } from './state.js';

const trayEl = document.getElementById("cardTray");

const ICON_MAP = {
  shuffleRow: "🎲",
  spawnFamily: "✨",
  clearCluster: "💥",
  magnetizeFamily: "🧲"
};

export function initTray() {
  bus.on("cardGenerated", (card) => {
    if (card.isAction) renderTray();
  });
}

function renderTray() {
  trayEl.innerHTML = "";
  gameState.cards.filter(c => c.isAction).forEach(card => {
    const el = document.createElement("div");
    el.className = "tray-card";
    el.innerHTML = `
      <div class="icon">${ICON_MAP[card.type] || "🃏"}</div>
      <div>${card.name}</div>
    `;
    el.onclick = () => useCard(card);
    trayEl.appendChild(el);
  });
}

function useCard(card) {
  console.log("Using card:", card.type);
  // Effect implementation pending
  gameState.cards = gameState.cards.filter(c => c.id !== card.id);
  renderTray();
}
